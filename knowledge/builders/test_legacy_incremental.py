"""Fixed-data parity for disposable legacy per-run intermediates."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import subprocess
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import legacy_incremental as cache


def load(name):
    spec=importlib.util.spec_from_file_location(name.replace('-','_'),HERE/(name+'.py'))
    module=importlib.util.module_from_spec(spec)
    sys.modules[spec.name]=module
    spec.loader.exec_module(module)
    return module


class IncrementalTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        self.logs=self.root/'logs'; self.logs.mkdir()
        self.env=patch.dict(os.environ,{'STS2_REFRESH_CACHE_DIR':str(self.root/'cache')})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        for item in cache._CONTEXTS.values(): item.close()
        cache._CONTEXTS.clear()
        self.temp.cleanup()

    def write(self,stream,rows):
        path=self.logs/(stream+'.jsonl')
        path.write_text(''.join(json.dumps(row,separators=(',',':'))+'\n' for row in rows))
        return path

    def fresh(self):
        for item in cache._CONTEXTS.values(): item.close()
        cache._CONTEXTS.clear()

    def test_step_receipt_preserves_failure_and_records_actual_priority_and_resources(self):
        receipt=self.root/'step.jsonl'
        result=subprocess.run(['nice','-n','19',sys.executable,str(HERE/'refresh-step.py'),
                               str(receipt),'fixed-failure',sys.executable,'-c','raise SystemExit(5)'])
        self.assertEqual(result.returncode,5)
        row=json.loads(receipt.read_text())
        self.assertEqual(row['exit_code'],5)
        self.assertEqual(row['nice'],19)
        self.assertGreater(row['peak_child_rss_kib'],0)
        self.assertGreaterEqual(row['cpu_user_seconds'],0)
        self.assertGreaterEqual(row['cpu_system_seconds'],0)
        self.assertNotIn('argv',row)

    def test_typed_codec_preserves_counter_order_tuple_keys_and_factories(self):
        from collections import Counter,defaultdict
        value=defaultdict(lambda:defaultdict(Counter))
        value[('r',1)][2].update([3,4,3])
        restored=cache.unpack(cache.pack(value))
        self.assertEqual(restored,value)
        restored[('new',2)][3].update([5])
        self.assertEqual(restored[('new',2)][3].most_common(),[(5,1)])

    def test_monster_all_mechanics_cold_warm_and_interleaved_parity(self):
        mod=load('build-monster-db')
        ends=[]; lines=list(mod._synthetic_lines(ends))
        states=self.logs/'states.jsonl'; states.write_text('\n'.join(lines)+'\n')
        decisions=self.write('decisions',[{'ts':ts,'run_id':rid,'chosen':{'action':'end_turn'}} for rid,ts in ends])
        with patch.dict(os.environ,{'STS2_REFRESH_CACHE_DIR':''}): expected=mod.build(str(states),None,None,str(decisions))
        cold=mod.build(str(states),None,None,str(decisions))
        self.assertEqual(cold,expected)
        self.fresh()
        warm=mod.build(str(states),None,None,str(decisions))
        self.assertEqual(warm,expected)
        ctx=cache.context(states)
        self.assertEqual(ctx.index.stats['decoded_rows'],0)
        self.assertGreater(ctx.index.stats['cache_hits'],0)
        self.assertEqual(ctx.index.stats['cache_misses'],0)

    def test_pending_other_runs_are_not_serialized_in_every_segment(self):
        mod=load('build-monster-db')
        frame=next(json.loads(line) for line in mod._synthetic_lines() if json.loads(line)['screen']=='COMBAT')
        rows=[]
        for i in range(24):
            row=json.loads(json.dumps(frame));row['state']['run_id']='PENDING'+str(i)
            rows.append(row)
        # Revisit an earlier pending run and then close it through a map. Its
        # position among pending runs must follow the original reducer exactly.
        revisit=json.loads(json.dumps(rows[0]));revisit['screen']='MAP'
        revisit['state'].update(screen='MAP',in_combat=False,combat=None)
        rows.append(revisit)
        path=self.write('states',rows)
        with patch.dict(os.environ,{'STS2_REFRESH_CACHE_DIR':''}): expected=mod.build(str(path),None,None,None)
        ctx=cache.context(path);original=ctx.index.cached;sizes=[]
        def observe(namespace,key,produce):
            if namespace=='legacy:fights':
                _open,pending=cache.unpack(key[3]['carry'],mod.Fight)
                sizes.append(len(pending))
            return original(namespace,key,produce)
        with patch.object(ctx.index,'cached',side_effect=observe):
            self.assertEqual(mod.build(str(path),None,None,None),expected)
        self.assertLessEqual(max(sizes),2)
        self.fresh()
        self.assertEqual(mod.build(str(path),None,None,None),expected)

    def test_room_interleaving_first_last_and_append_rewrite(self):
        mod=load('build-room-costs')
        def row(rid,hp,ts):
            return {'ts':ts,'state':{'run_id':rid,'screen':'MAP','run':{'floor':1,'current_hp':hp,'ascension':10},'map':{}}}
        rows=[row('A',50,'z'),row('B',40,'a'),row('A',30,'c')]
        path=self.write('states',rows)
        with patch.dict(os.environ,{'STS2_REFRESH_CACHE_DIR':''}): expected=mod.scan(path)
        self.assertEqual(mod.scan(path),expected)
        self.fresh();self.assertEqual(mod.scan(path),expected)
        self.write('states',rows+[row('C',20,'d')]);self.fresh()
        mod.scan(path);ctx=cache.context(path)
        self.assertEqual(ctx.index.stats['decoded_rows'],1)
        self.assertEqual(ctx.index.stats['cache_misses'],1)
        self.write('states',[row('A',10,'x')]);self.fresh()
        self.assertEqual(mod.scan(path)[0]['A'][1]['last'],10)
        self.assertEqual(cache.context(path).index.stats['rebuilt_streams'],['states'])

    def test_card_full_witness_counts_mode_faces_and_original_sha(self):
        mod=load('build-card-upgrades')
        fixture=HERE.parents[1]/'agent/tests/card-upgrade-data/logged-faces.jsonl'
        rows=[json.loads(line) for line in fixture.read_text().splitlines()]
        rows+=rows[:3]
        path=self.write('states',rows)
        with patch.dict(os.environ,{'STS2_REFRESH_CACHE_DIR':''}): expected=mod.build(path)
        self.assertEqual(mod.build(path),expected)
        self.fresh();self.assertEqual(mod.build(path),expected)
        rows=[{'state':{'run_id':rid,'in_combat':False,'run':{'deck':[{'card_id':'FIX','upgraded':up,'energy_cost':cost,'dynamic_values':[]}]}}} for rid,up,cost in [('A',False,1),('B',False,2),('A',True,0)]]
        path=self.write('states',rows);self.fresh()
        with patch.dict(os.environ,{'STS2_REFRESH_CACHE_DIR':''}): expected=mod.build(path)
        self.assertEqual(mod.build(path),expected)

    def test_outcome_name_ties_and_choices_match_original(self):
        mod=load('build-outcome-stats')
        states=[]
        for rid,name in [('A','first'),('B','second'),('A','later')]:
            states.append({'state':{'run_id':rid,'screen':'REWARD','run':{'floor':1,'act_id':0,'deck':[{'card_id':'X','name':name}]},'reward':{'card_options':[]}}})
        path=self.write('states',states)
        runs={rid:{'ascension':10,'floor':2,'victory':False} for rid in ('A','B')}
        dec=self.write('decisions',[{'ts':'a','mode':'play','fingerprint':json.dumps({'run':'A','hp':20}),'floor':1,'label':'rest','chosen':{'option_index':1}}])
        with patch.dict(os.environ,{'STS2_REFRESH_CACHE_DIR':''}):
            expected=mod.read_states(path,runs,lambda rid:10);expected_d=mod.read_decisions(dec,runs)
        self.assertEqual(mod.read_states(path,runs,lambda rid:10),expected)
        self.assertEqual(mod.read_decisions(dec,runs),expected_d)
        self.fresh()
        self.assertEqual(mod.read_states(path,runs,lambda rid:10),expected)
        self.assertEqual(mod.read_decisions(dec,runs),expected_d)

    def test_boss_final_attempt_and_interleaved_runs(self):
        mod=load('build-boss-damage')
        rows=[]
        for rid,turn,hp in [('A',1,50),('B',1,40),('A',2,30),('A',1,45)]:
            rows.append({'state':{'run_id':rid,'screen':'COMBAT','in_combat':True,'turn':turn,
                         'run':{'floor':17,'current_hp':hp,'max_hp':70,'character_id':'SILENT'},
                         'combat':{'player':{'current_hp':hp,'max_hp':70},'enemies':[{'enemy_id':'KIN_PRIEST','current_hp':30,'max_hp':50,'index':0}]}}})
        path=self.write('states',rows)
        raw=path.read_bytes().splitlines(keepends=True)
        expected=mod.extract_rows(raw,'silent')
        self.assertEqual(expected['fights'][('A',17)],{1:(45,0)})
        ctx=cache.context(path)
        self.assertEqual(ctx.boss_rows(path,'silent',mod.extract_rows,mod.BOSS_OF),expected)
        self.fresh()
        self.assertEqual(cache.context(path).boss_rows(path,'silent',mod.extract_rows,mod.BOSS_OF),expected)

    def test_construction_offer_dedup_and_full_source_digest(self):
        mod=load('build-construction-opportunities')
        (self.root/'data').mkdir()
        (self.root/'data/game-data.json').write_text(json.dumps({'collections':{'cards':[{'id':'FIX','name':'Fixed'}]}}))
        self.write('runs',[{'run_id':r,'character':'SILENT','ascension':10} for r in ('A','B')])
        self.write('states',[])
        def row(rid,ts,label):
            return dict(run_id=rid,ts=ts,label=label,engine='codex',accepted=True,
                        payload={'facts':{'act':1,'floor':2}},options={'buy_card0':{'card':'Fixed','price':33,'upgraded':False}})
        self.write('brain',[row('A','a','shop/plan'),row('B','b','shop/buy'),row('A','c','shop/buy')])
        with patch.object(mod,'state_lookup',return_value={}):
            with patch.dict(os.environ,{'STS2_REFRESH_CACHE_DIR':''}): expected=mod.extract(self.root,self.logs,'silent')
            result=mod.extract(self.root,self.logs,'silent');self.fresh()
            warm=mod.extract(self.root,self.logs,'silent')
        for item in (expected,result,warm): item.pop('generated')
        self.assertEqual(result,expected);self.assertEqual(warm,expected)
        self.assertEqual(result['excluded']['repeat_shop_visit'],1)

    def test_verified_batch_products_skip_only_unchanged_inputs_and_outputs(self):
        path=self.write('decisions',[]);ctx=cache.context(path)
        out=self.root/'model.json';calls=[]
        def fit(): calls.append(1);out.write_text(str(len(calls)))
        self.assertTrue(ctx.products('model',[1],[out],fit))
        self.assertFalse(ctx.products('model',[1],[out],fit))
        out.write_text('corrupt')
        self.assertTrue(ctx.products('model',[1],[out],fit))
        self.assertTrue(ctx.products('model',[2],[out],fit))
        self.assertEqual(len(calls),3)

        mod=load('build-fight-value')
        rows=self.write('training',[dict(asc=10,kind='boss',t=1,ts0='a',ts1='c',
                                        E={'hp':10},S={'hp':20})])
        before=mod.training_choices_identity(rows,path)
        self.assertEqual(before,[[False],[]])
        # A new non-training choice must not refit the existing estimator.
        self.write('decisions',[dict(label='combat/plan-choice',ts='z',turn=1,decider='jev')])
        self.fresh()
        self.assertEqual(mod.training_choices_identity(rows,path),before)
        self.assertFalse(cache.context(path).products('model',[2],[out],fit))
        # A choice inside a training turn changes the fit's evidence identity.
        self.write('decisions',[dict(label='combat/plan-choice',ts='b',turn=1,decider='jev')])
        self.fresh()
        after=mod.training_choices_identity(rows,path)
        self.assertEqual(after,[[True],[('jev',1)]])
        self.assertTrue(cache.context(path).products('model',[after],[out],fit))
        self.assertEqual(len(calls),4)

    def test_partial_tail_and_corrupt_cache_rebuild(self):
        mod=load('build-room-costs')
        path=self.write('states',[{'state':{'run_id':'A','screen':'MAP','run':{'floor':1,'current_hp':20},'map':{}}}])
        with path.open('ab') as out: out.write(b'{"unfinished":')
        result=mod.scan(path)
        self.fresh()
        for obj in (self.root/'cache').rglob('*.gz'): obj.write_bytes(b'damaged')
        self.assertEqual(mod.scan(path),result)
        self.assertEqual(cache.context(path).index.stats['cache_misses'],1)

if __name__=='__main__': unittest.main()
