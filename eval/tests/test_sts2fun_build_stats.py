"""Synthetic SQLite/privacy, reconstruction, matching and reproducibility fixtures."""
import copy
import importlib.util
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import sts2fun_build_projection as projection
import sts2fun_build_stats as stats
import sts2fun_boss_semantics as boss
import verify_sts2fun_build_stats as verifier
import sts2fun_build_view as view


def node(n,act=1,hp=30,kind='monster'):
    return {'node':n,'act':act,'point':n-(act-1)*4,'hp':hp,'max_hp':80,'damage':2,'healed':0,'gold_spent':0,
            'rooms':[{'kind':kind,'id':'BOSS' if kind=='boss' else 'MONSTER','turns':3}],
            'choices':[],'gained':[],'removed':[],'upgraded':[],'transformed':[],'relic_picks':[],'bought_relics':[],'removed_relics':[]}


def synthetic(i,win=True,version='v0.111',serial=0):
    nodes=[node(n,(n-1)//4+1,hp=30,kind='boss' if n%4==0 else 'monster') for n in range(1,13)]
    nodes[1]['choices']=[{'id':'CORE_'+str(i),'picked':True}];nodes[1]['gained']=['CORE_'+str(i)]
    nodes[2]['gained']=['AUX_'+str(i)];nodes[-1]['hp']=30 if win else 0
    r={'version':version,'build':version+'.0','win':int(win),'deck':[{'id':'START','added':0}]*2+[{'id':'CORE_'+str(i),'added':2},{'id':'AUX_'+str(i),'added':3}],
       'relics':[],'nodes':nodes,'content_sha256':f'{i:02}{int(win)}{serial:03}'+('a'*58)}
    return r


class BuildStats(unittest.TestCase):
    def test_cli_cache_regenerates_identical_outputs_and_rejects_changed_cache(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);db=root/'source.db';con=sqlite3.connect(db)
            con.execute('CREATE TABLE runs(patch_major TEXT,win INTEGER,raw_json TEXT,character TEXT,ascension INTEGER,n_players INTEGER,is_valid INTEGER,was_abandoned INTEGER,has_modifiers INTEGER)')
            for i in range(6):
                for win in (False,True):
                    for serial in range(4):
                        r=synthetic(i,win,serial=serial);acts=[[],[],[]]
                        for node_ in r['nodes']:
                            acts[node_['act']-1].append({'rooms':[{'room_type':x['kind'],'model_id':x['id'],'turns_taken':x['turns']} for x in node_['rooms']],
                                'player_stats':[{'current_hp':node_['hp'],'max_hp':80,'card_choices':[{'card':{'id':x['id']},'was_picked':x['picked']} for x in node_['choices']],
                                                 'cards_gained':[{'id':x} for x in node_['gained']]}]})
                        raw={'build_id':'v0.111.0','players':[{'deck':[{'id':c['id'],'floor_added_to_deck':c['added']} for c in r['deck']],'relics':[]}],'map_point_history':acts}
                        con.execute('INSERT INTO runs VALUES(?,?,?,?,?,?,?,?,?)',('v0.111',int(win),json.dumps(raw),'SILENT',10,1,1,0,0))
            con.commit();con.close()
            catalog=root/'catalog.json';catalog.write_text(json.dumps({'collections':{'cards':[{'id':x,'block':1} for x in ['START']+['CORE_'+str(i) for i in range(6)]+['AUX_'+str(i) for i in range(6)]]}}))
            provenance=root/'provenance.json';provenance.write_text(json.dumps({'provenance':{'database_sha256':projection.sha(db.read_bytes()),'url':'https://sts2.fun/static/sts2_public.db.zst','downloaded_at':'2026-01-01'}}))
            argv=['--db',str(db),'--catalog',str(catalog),'--provenance',str(provenance),'--cache',str(root/'cache'),'--output',str(root/'out'),'--clusters','6','--min-support','2']
            self.assertEqual(stats.main(argv),0)
            checked=verifier.verify(root/'cache',root/'out',db)
            self.assertTrue(checked['all_passed']);self.assertEqual(checked['games'],48)
            original={p.name:p.read_bytes() for p in (root/'out').iterdir()}
            shown=json.loads(view.page(root/'out','representative-timelines','v0.111',0))
            self.assertEqual(len(shown['rows'][0]['examples']),2)
            self.assertEqual(len(shown['rows'][0]['examples'][0]['timeline']),12)
            with self.assertRaisesRegex(ValueError,'byte limit'):view.page(root/'out','representative-timelines','v0.111',0,max_bytes=1024)
            (root/'out/archetypes.json').write_bytes(original['archetypes.json']+b'changed')
            with self.assertRaisesRegex(ValueError,'frozen'):view.page(root/'out','archetypes','v0.111',0)
            (root/'out/archetypes.json').write_bytes(original['archetypes.json'])
            self.assertEqual(stats.main(argv+['--check']),0)
            self.assertEqual(original,{p.name:p.read_bytes() for p in (root/'out').iterdir()})
            cache=root/'cache/runs.json.gz';cache.write_bytes(cache.read_bytes()+b'changed')
            with self.assertRaisesRegex(ValueError,'cache'):stats.main(argv+['--check'])

    def test_projection_excludes_sensitive_fields_before_python(self):
        with tempfile.TemporaryDirectory() as d:
            db=Path(d)/'fixture.db';con=sqlite3.connect(db)
            con.executescript('CREATE TABLE runs(patch_major TEXT,win INTEGER,raw_json TEXT,character TEXT,ascension INTEGER,n_players INTEGER,is_valid INTEGER,was_abandoned INTEGER,has_modifiers INTEGER,player_id TEXT,seed TEXT);CREATE TABLE players(username TEXT);')
            raw={'build_id':'v0.111.0','seed':'secret-seed','players':[{'player_id':'secret-player','name':'secret-name','deck':[{'id':'CARD.A','floor_added_to_deck':0,'secret':'secret-card-field'}],'relics':[]}],
                 'map_point_history':[[{'rooms':[{'room_type':'boss','model_id':'BOSS','turns_taken':4,'secret':'secret-room-field'}],
                    'player_stats':[{'player_id':'secret-stat-player','current_hp':20,'card_choices':[{'card':{'id':'CARD.B','secret':'secret-choice'},'was_picked':True}]}]}]]}
            con.execute('INSERT INTO runs VALUES(?,?,?,?,?,?,?,?,?,?,?)',('v0.111',1,json.dumps(raw),'SILENT',10,1,1,0,0,'secret-column-player','secret-column-seed'))
            con.commit();con.close()
            runs,audit=projection.project(db);text=projection.canonical(runs).decode()
            self.assertNotIn('secret',text);self.assertNotIn('player_id',text)
            self.assertEqual(runs[0]['deck'],[{'id':'A','added':0}]);self.assertEqual(audit['included'],1)
            con=projection.connect(db)
            for query in ('SELECT player_id FROM runs','SELECT seed FROM runs','SELECT username FROM players','DELETE FROM runs'):
                with self.assertRaises(sqlite3.DatabaseError):con.execute(query).fetchall()
            con.close()

    def test_starting_date_is_inferred_and_zero_count_unknown_cards_do_not_break_checkpoints(self):
        rows=[synthetic(0,serial=i) for i in range(3)]
        for r in rows:
            for c in r['deck']:
                if c['added']==0:c['added']=1
        baseline=stats.mode_initial(rows)['v0.111']
        self.assertEqual(baseline['start_node'],1)
        self.assertEqual(baseline['cards'],{'START':2})
        r=rows[0];r['cards']=stats.C.Counter(c['id'] for c in r['deck']);r['nodes'][0]['removed']=['GHOST']
        q=stats.reconstruct(r,{'cards':{'START':2,'GHOST':1}},{});self.assertTrue(q['strict_terminal_consistent'])
        result=stats.timeline_rows({('v0.111',0):[r]},{'centers':[{'CORE_0':1.}]},[],{'v0.111':baseline},{'START':False,'CORE_0':True,'AUX_0':False})
        self.assertEqual(result[0]['act_end_checkpoints'][0]['positive_recorded_block_card_copies_proxy']['mean'],1)

    def test_picks_gains_transforms_and_removals_are_not_double_counted(self):
        r=synthetic(0);r['nodes']=[node(1),node(2),node(3)]
        r['nodes'][0].update(choices=[{'id':'A','picked':True}],gained=['A'])
        r['nodes'][1].update(transformed=[{'old':'START','new':'B'}],gained=['B'])
        r['nodes'][2].update(removed=['A'],upgraded=['B'])
        r['cards']=stats.C.Counter({'START':1,'B':1})
        q=stats.reconstruct(r,{'cards':{'START':2}},{'START':False,'B':True})
        self.assertTrue(q['strict_terminal_consistent']);self.assertEqual(r['snapshots'][0]['A'],1)
        self.assertEqual(r['snapshots'][-1]['B'],1)
        r['nodes'][0]['removed']=['MISSING']
        self.assertFalse(stats.reconstruct(r,{'cards':{'START':2}},{})['strict_terminal_consistent'])

    def test_geometry_and_full_outputs_are_deterministic_and_do_not_use_outcomes(self):
        rows=[synthetic(i,w,serial=j) for i in range(6) for w in (False,True) for j in range(4)]
        a=stats.build(copy.deepcopy(rows),6,{'START':False,**{'CORE_'+str(i):True for i in range(6)},**{'AUX_'+str(i):False for i in range(6)}},2)
        b=stats.build(copy.deepcopy(list(reversed(rows))),6,{'START':False,**{'CORE_'+str(i):True for i in range(6)},**{'AUX_'+str(i):False for i in range(6)}},2)
        self.assertEqual(projection.canonical(a),projection.canonical(b))
        flipped=copy.deepcopy(rows)
        for r in flipped:r['win']=1-r['win'];r['cards']=stats.C.Counter(c['id'] for c in r['deck'])
        model=stats.geometry(flipped,6)
        self.assertEqual(model,a['archetypes']['model'])
        self.assertEqual(sum(x['n'] for x in a['archetypes']['rows']),48)
        self.assertEqual(len({x['cluster'] for x in a['archetypes']['rows']}),6)
        for row in a['timeline']['rows']:
            self.assertEqual(row['quality']['strict_terminal_consistent'],row['n'])
            self.assertEqual(row['act_end_checkpoints'][0]['later_act_observed'],row['winner_n'])

    def test_depth_matching_is_version_scoped_and_never_reuses_losses(self):
        w=synthetic(1);loss=synthetic(1,False);far=synthetic(1,False,serial=1);far['nodes']=far['nodes'][:4]
        pairs=stats.depth_pairs([w,copy.deepcopy(w),loss,far])
        self.assertEqual(len(pairs),1)
        self.assertLessEqual(abs(len(pairs[0][0]['nodes'])-len(pairs[0][1]['nodes'])),3)

    def test_exact_paired_enrichment_and_bh_keep_all_tested_recipes(self):
        rows=[]
        for j in range(12):
            w,l=synthetic(0,True,serial=j),synthetic(0,False,serial=j)
            w['cards']=stats.C.Counter({'C':1,'X':1});l['cards']=stats.C.Counter({'C':1})
            rows.extend([w,l])
        recipes,coverage=stats.combinations({('v0.111',0):rows},2)
        row=next(x for x in recipes if x['items']==['card:C','card:X'])
        self.assertEqual(row['winner_present'],12);self.assertEqual(row['loser_present'],0)
        self.assertTrue(row['enriched_q05']);self.assertEqual(coverage[0]['pairs'],12)
        self.assertEqual(stats.paired_p(0,0),1)
        family=[{'p_one_sided':.01},{'p_one_sided':.03},{'p_one_sided':1.}];stats.bh(family)
        self.assertAlmostEqual(family[0]['q_bh'],.03);self.assertAlmostEqual(family[1]['q_bh'],.045)

    def test_multi_combat_boss_outcomes_unknown_and_hp_only_previous_proxy(self):
        r=synthetic(0);r['nodes']=[node(1,hp=17),node(2,hp=9,kind='boss')]
        r['nodes'][1]['rooms'].append({'kind':'boss','id':'SECOND_BOSS','turns':5})
        rows=stats.boss_rows({('v0.111',0):[r]})
        self.assertEqual(len(rows),2)
        for row in rows:
            self.assertEqual(row['outcome_known'],0);self.assertIsNone(row['win_rate_proxy'])
            self.assertEqual(row['hp_previous_node_end_proxy']['n'],0)
            self.assertEqual(row['previous_point_context_hp']['mean'],17)

    def test_boss_label_conflicts_denominators_overlap_and_observed_order(self):
        r=synthetic(0,False);r['nodes']=[node(47,3),node(48,3,0,'boss'),node(49,3,12,'boss')]
        r['nodes'][-1]['rooms'][0]['id']='OTHER_BOSS'
        rows,packet=boss.aggregate({('v0.111',0):[r]})
        first=next(x for x in rows if x['boss']=='BOSS')
        self.assertEqual(first['outcome_cross_counts'][0]['outcome_label'],'unknown_nonpositive_hp_conflict')
        self.assertEqual(first['outcome_known'],0)
        self.assertEqual(first['overlap_with'][0]['distinct_uploaded_runs'],1)
        second=next(x for x in rows if x['boss']=='OTHER_BOSS')
        self.assertEqual(second['outcome_known'],0)  # Positive terminal HP plus global loss is unresolved.
        path=packet['rows'][0];self.assertEqual(path['observed_boss_path'],['BOSS','OTHER_BOSS'])
        self.assertEqual([p['boss_position'] for p in path['positions']],[1,2])
        self.assertEqual(first['position_counts'][0]['record_ordinal'],48)
        self.assertIsNone(first['position_counts'][0]['verified_floor'])
        r['nodes'][-1]['rooms'][0]['id']='BOSS';r['nodes'][-1]['hp']=0
        repeated=stats.boss_rows({('v0.111',0):[r]})[0]
        self.assertEqual((repeated['boss_record_n'],repeated['distinct_uploaded_runs'],repeated['duplicate_boss_visits_n']),(2,1,1))
        self.assertEqual(repeated['outcome_known'],1);self.assertEqual(repeated['wins_proxy'],0)
        r['win']=1
        self.assertEqual(stats.boss_rows({('v0.111',0):[r]})[0]['outcome_known'],0)
        r['nodes'][-1]['hp']=30
        self.assertEqual(stats.boss_rows({('v0.111',0):[r]})[0]['wins_proxy'],1)
        self.assertEqual({x['id'] for x in packet['availability']}, {'result-semantics','independent-denominators','pre-boss-snapshot','cost-semantics','mechanisms','snapshot-validity','privacy-and-license','issue50-fourth-requirement'})
        self.assertEqual(first['snapshot']['true_entry_snapshot_missing_n'],1)
        r['nodes'][-1]['rooms'].append({'kind':'boss','id':'THIRD','turns':3})
        multi=stats.boss_rows({('v0.111',0):[r]})
        self.assertTrue(all(x['costs']['gross_damage']['n']==0 for x in multi if x['boss']!='BOSS'))

    def test_act_end_counts_exclude_deaths_before_next_act_and_unknown_defense(self):
        r=synthetic(0);r['cards']=stats.C.Counter(c['id'] for c in r['deck'])
        r['nodes']=r['nodes'][:4]
        stats.reconstruct(r,{'cards':{'START':2}},{})
        row=stats.timeline_rows({('v0.111',0):[r]},{'centers':[{'CORE_0':1.}]},[],{'v0.111':{}},{})[0]
        self.assertEqual(row['act_end_checkpoints'][0]['later_act_observed'],0)
        self.assertEqual(row['act_end_checkpoints'][0]['positive_recorded_block_card_copies_proxy']['n'],0)


if __name__=='__main__':unittest.main()
