"""Fixed own/external source separation, decision privacy, and exact source accounting."""
import copy
import gzip
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import own_build_stats as own
import build_stats_view as view
from sts2fun_build_projection import sha
import sts2fun_decision_fields as decisions
import sts2fun_build_stats as external
from sts2fun_build_projection import canonical
from test_sts2fun_build_stats import synthetic


def own_data():
    data={k:[] for k in ('runs','snapshots','fights','questions','plans','sl','configs')}
    for i in range(6):
        run='RUN_'+str(i)
        data['runs'].append({'run_id':run,'ascension':10,'victory':i%2==0,'floor':12,'ended':'2026-01-02','code':'test','death_fight':[]})
        for n,act in [(1,1),(2,1),(5,2),(9,3),(12,3)]:
            cards=['START','START']+(['CORE_'+str(i)] if n>=2 else [])+(['AUX_'+str(i)] if n>=5 else [])
            data['snapshots'].append({'run_id':run,'off':n,'len':10,'ts':'2026-01-01','act':act,'floor':n,'screen':'GAME_OVER' if n==12 else 'MAP','deck':cards,
                'relics':[],'hp':30,'max_hp':80,'gold':10,'potions':[],'boss_id':'BOSS','go_victory':None})
        data['fights'].append({'run_id':run,'first_off':9,'last_off':10,'entry_len':10,'fight_no':1,'act':3,'floor':9,'scheduled_boss_id':'BOSS','encounter':'ENEMY',
            'entry_hp':30,'max_hp':80,'last_hp':20,'post_hp':22,'turns':3,'room':'boss','outcome':'won','hp_loss':10,'net_hp_loss':8,'first_ts':'2026-01-01','last_ts':'2026-01-01',
            'entry_deck':['CORE_'+str(i)],'entry_relics':[],'potions_in':[],'potions_used':[],'monsters':['ENEMY']})
        data['questions'].append({'run_id':run,'off':20,'floor':2,'label':'reward/card','options':['A','B'],'choice':'A','rationale':'fixed test'})
        data['plans'].append({'run_id':run,'off':30,'floor':1,'summary':'fixed plan'})
    return data


class OwnStats(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ext_runs=[synthetic(i,w,serial=j) for i in range(6) for w in (False,True) for j in range(4)]
        cls.ext=external.build(copy.deepcopy(cls.ext_runs),6,{},2)

    def test_fixed_external_model_and_separate_ascension_sl_denominators(self):
        data=own_data();data['runs'][0]['ascension']=9
        data['sl']=[{'run_id':'RUN_2','off':100,'floor':9,'result':'predicted_death','reload_ok':True,'attempt':1,'ended_at':'2026-01-01','ts':'2026-01-01'}]
        frozen=canonical(self.ext['archetypes']['model'])
        prepared=own.prepare(data,self.ext['archetypes']['model'])
        r=next(x for x in prepared if x['run_id']=='RUN_2')
        self.assertEqual(r['attempt_scope'],'retry_or_predicted_death')
        self.assertFalse(r['first_attempt_end']['victory_proxy']);self.assertEqual(r['win'],1)
        self.assertIsNone(r['fights'][0]['net_hp_loss']);self.assertEqual(r['fights'][0]['net_hp_loss_recorded_view'],8)
        tables,comparison,packets,index=own.build(data,self.ext,copy.deepcopy(self.ext_runs),{})
        self.assertEqual(canonical(self.ext['archetypes']['model']),frozen)
        self.assertEqual(sum(r['n'] for r in tables['archetypes']['rows']),6)
        self.assertEqual(comparison['self_primary_n'],4)
        self.assertFalse(comparison['source_denominators_pooled'])
        self.assertEqual(sum(r['self']['n'] for r in comparison['archetypes']),4)
        self.assertEqual(sum(r['external_winners']['n'] for r in comparison['archetypes']),24)
        self.assertTrue(all(r['game_version']=='unknown' for r in tables['archetypes']['rows']))
        self.assertEqual(len(index),6);self.assertEqual(len(packets),6)

    def test_actual_snapshot_formation_unknown_defense_and_no_floor_delta(self):
        data=own_data();model=copy.deepcopy(self.ext['archetypes']['model'])
        prepared=own.prepare(data,model);r=prepared[0]
        p=own.formation(r,['CORE_0','AUX_0'])
        self.assertEqual((p['act'],p['recorded_floor']),(2,5))
        q=own.checkpoint(r,1,['CORE_0'],{'START':False})
        self.assertIsNone(q['positive_block_copies_proxy']);self.assertEqual(q['unmapped_copies'],1)
        self.assertIsNone(own.checkpoint(r,3,['CORE_0'],{}))
        self.assertIsNone(own.assign({'UNMAPPED':1},model)[0])
        self.assertEqual(own.inventory(['CARD.CORE_0+','CORE_0']),{'CORE_0':2})
        packet=own.game_packet(r,model,{})
        for name in ('snapshots','fights','questions','plans'):
            self.assertEqual(sum(len(x[name]) for x in packet['rows'])+len(packet['unplaced'][name]),len(r[name]))
        self.assertEqual(packet['key_hp_loss_fights'][0]['net_hp_loss'],8)
        self.assertEqual(packet['rows'][1]['questions'][0]['rationale'],'fixed test')

    def test_external_decision_projection_preserves_localization_keys_and_never_private_values(self):
        with tempfile.TemporaryDirectory() as d:
            db=Path(d)/'source.db';con=sqlite3.connect(db)
            con.execute('CREATE TABLE runs(patch_major TEXT,win INTEGER,raw_json TEXT,character TEXT,ascension INTEGER,n_players INTEGER,is_valid INTEGER,was_abandoned INTEGER,has_modifiers INTEGER,player_id TEXT)')
            fields={'current_hp':30,'current_gold':5,'player_id':'secret-stat-id',
                'ancient_choice':[{'TextKey':'A','title':{'key':'A.title','table':'relics','private':'secret-title'},'was_chosen':True,'private':'secret-option'}],
                'event_choices':[{'title':{'key':'E.options.X.title','table':'events','private':'secret-event'},'variables':{'private':'secret-variable'}}],
                'potion_used':['POTION.X',12,None],'rest_site_choices':[],'cards_removed':None}
            raw={'seed':'secret-seed','players':[{'id':'secret-player','potions':['POTION.X']}], 'build_id':'v0.111.0',
                 'map_point_history':[[{'rooms':[{'room_type':'event','model_id':'EVENT.E'}],'player_stats':[fields]}]]}
            con.execute('INSERT INTO runs VALUES(?,?,?,?,?,?,?,?,?,?)',('v0.111',0,json.dumps(raw),'SILENT',10,1,1,0,0,'secret-column'))
            con.commit();con.close()
            projected=decisions.project(db)
            self.assertNotIn('secret',canonical(projected).decode())
            rows=decisions.aggregate(projected)
            event=next(r for r in rows['rows'] if r['field']=='event_choices')
            self.assertEqual(event['value']['title'],{'key':'E.options.X.title','table':'events'})
            self.assertEqual(event['distinct_uploaded_runs'],1)
            potion=next(r for r in rows['field_availability'] if r['field']=='potion_used')
            self.assertEqual((potion['present_array'],potion['invalid_items'],potion['item_n']),(1,2,1))
            empty=next(r for r in rows['field_availability'] if r['field']=='rest_site_choices')
            missing=next(r for r in rows['field_availability'] if r['field']=='bought_cards')
            self.assertEqual(empty['empty_array'],1);self.assertEqual(missing['missing_or_null'],1)
            self.assertEqual(rows['terminal_potions'][0]['recorded_potion_slots'],1)

    def test_bounded_own_game_and_external_decision_pages_and_integrity(self):
        tables,comparison,packets,index=own.build(own_data(),self.ext,copy.deepcopy(self.ext_runs),{})
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/'games').mkdir()
            packet=packets['RUN_0'];raw=canonical(packet);(root/'games/RUN_0.json').write_bytes(raw)
            stats=canonical({'source':'external:sts2fun','rows':[{'version':'v0.111','field':'potion_used','value':'POTION.X'}],
                             'categories':{},'field_availability':[],'decision_unit_readiness':[]})
            (root/'statistics.json').write_bytes(stats)
            (root/'manifest.json').write_bytes(canonical({'files':{name:{'bytes':len(value),'sha256':sha(value)} for name,value in [('games/RUN_0.json',raw),('statistics.json',stats)]}}))
            shown=json.loads(view.page(root,'game',run_id='RUN_0',section='questions',limit=1))
            self.assertEqual(shown['total'],1);self.assertEqual(shown['rows'][0]['rationale'],'fixed test')
            self.assertEqual(json.loads(view.page(root,'decisions',field='potion_used'))['rows'][0]['value'],'POTION.X')
            with self.assertRaisesRegex(ValueError,'byte limit'):view.page(root,'game',run_id='RUN_0',max_bytes=1024)
            with self.assertRaisesRegex(ValueError,'invalid game'):view.page(root,'game',run_id='../escape')
            (root/'games/RUN_0.json').write_bytes(raw+b'changed')
            with self.assertRaisesRegex(ValueError,'frozen'):view.page(root,'game',run_id='RUN_0')

    def test_non_solo_and_malformed_choice_values_are_retained_as_unavailable_counts(self):
        node={'act':1,'point':1,'stats_n':2,'hp':None,'gold':None,'rooms':[]}
        for f in decisions.FIELDS:node[f]={'type':None,'items':[],'raw_item_n':None,'invalid_items':0}
        r={'version':'v0.111','build':'v0.111.0','win':0,'terminal_potions':{'type':None,'items':[],'raw_item_n':None,'invalid_items':0},'nodes':[node]}
        result=decisions.aggregate([r])
        self.assertEqual(result['rows'],[])
        self.assertTrue(all(x['non_solo_excluded']==1 for x in result['field_availability']))
        values,invalid=decisions.normalize_items('potion_used',[17,'POTION.X'])
        self.assertEqual((values,invalid),(['POTION.X'],1))


if __name__=='__main__':unittest.main()
