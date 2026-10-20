"""Fixed in-memory LogDB evidence; no production database or game knowledge writes."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import legacy_incremental as cache
import duckdb

spec=importlib.util.spec_from_file_location('potion_builder',HERE/'build-potion-equivalents.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)


class PotionIncrementalTest(unittest.TestCase):
    def test_scoped_sql_raw_checks_and_shop_parity_append_and_warm(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); logs=root/'logs';logs.mkdir()
            con=duckdb.connect(':memory:',config={'threads':1})
            con.execute('CREATE TABLE frames(run_id VARCHAR,off BIGINT,character VARCHAR,potions VARCHAR[],potion_slots INTEGER)')
            con.execute('CREATE TABLE turns(run_id VARCHAR,fight_no INTEGER,room VARCHAR,ascension INTEGER,act INTEGER,turn INTEGER,last_turn BOOLEAN,enemy_hp INTEGER,enemy_turn_hp_lost INTEGER,intent_damage INTEGER,end_block INTEGER,start_energy INTEGER,cards_played VARCHAR[],cards_n INTEGER,potions_used VARCHAR[])')
            con.execute('CREATE TABLE fights(run_id VARCHAR,floor INTEGER,room VARCHAR,ascension INTEGER,act INTEGER,fight_no INTEGER,turns INTEGER,max_hp INTEGER,deck_size INTEGER,outcome VARCHAR,last_ts VARCHAR)')
            con.execute('CREATE TABLE decisions(run_id VARCHAR,off BIGINT,floor INTEGER,turn INTEGER,label VARCHAR,action VARCHAR,potion_id VARCHAR)')
            con.execute('CREATE TABLE state_index(run_id VARCHAR,floor INTEGER,act INTEGER,off BIGINT,len INTEGER,screen VARCHAR)')
            con.execute('CREATE TABLE runs(run_id VARCHAR,ascension INTEGER)')
            states=logs/'states.jsonl'; decisions=logs/'decisions.jsonl'
            states.write_bytes(b'');decisions.write_bytes(b'');(logs/'runs.jsonl').write_bytes(b'')
            def add(rid,character,number):
                row={'state':{'run_id':rid,'shop':{'potions':[{'potion_id':'FIXED','price':number,'rarity':'Common'}]}}}
                raw=(json.dumps(row)+'\n').encode();off=states.stat().st_size
                with states.open('ab') as out:out.write(raw)
                q={'run_id':rid,'potions':{'random':[{'potion':'FIXED','hp_saved_mean':number,'dmg_gained_mean':2}]}}
                qoff=decisions.stat().st_size
                with decisions.open('a') as out:out.write(json.dumps(q)+'\n')
                con.execute('INSERT INTO frames VALUES (?, ?, ?, ?, 3)',[rid,off,character,['ENTROPIC_BREW','FIXED']])
                con.execute("INSERT INTO fights VALUES (?,17,'boss',10,1,1,2,70,20,'won','2026-10-01')",[rid])
                for turn,hp in ((1,30),(2,10)):
                    con.execute("INSERT INTO turns VALUES (?,1,'boss',10,1,?, ?, ?,3,7,4,3,[],0,['FIXED'])",[rid,turn,turn==2,hp])
                con.execute("INSERT INTO decisions VALUES (?,?,17,1,'combat/plan-choice','plan',NULL)",[rid,qoff])
                con.execute("INSERT INTO state_index VALUES (?,17,1,?,?,'SHOP')",[rid,off,len(raw)])
                con.execute('INSERT INTO runs VALUES (?,10)',[rid])
            add('B','SILENT',20);add('A','SILENT',10);add('I','IRONCLAD',50)
            def normalized(value):
                if isinstance(value,dict):return {k:normalized(v) for k,v in value.items()}
                if isinstance(value,list):return sorted((normalized(v) for v in value),key=repr)
                return value
            def compare():
                with patch.dict(os.environ,{'STS2_REFRESH_CACHE_DIR':''}):
                    expected=mod.load_logs(con,[10],'silent')
                    with states.open('rb') as state_handle:
                        offers=mod.load_shop_offers(con,state_handle,8,'silent')
                    with decisions.open('rb') as handle:
                        mc=mod.mc_summaries(expected['questions'],handle)
                ctx=cache.context(states)
                actual=mod.load_logs(con,[10],'silent',cache=ctx)
                self.assertEqual(normalized(actual),normalized(expected))
                with states.open('rb') as handle:self.assertEqual(normalized(mod.load_shop_offers(con,handle,8,'silent')),normalized(offers))
                with decisions.open('rb') as handle:
                    actual_mc,checks=ctx.potion_checks(actual,handle,{},mod.mc_summaries,mod.check_column)
                self.assertEqual(actual_mc,mc);self.assertEqual(checks,{})
                return ctx
            with patch.dict(os.environ,{'STS2_REFRESH_CACHE_DIR':str(root/'cache')}):
                compare()
                for item in cache._CONTEXTS.values():item.close()
                cache._CONTEXTS.clear()
                warm=compare();self.assertEqual(warm.index.stats['cache_misses'],0)
                for item in cache._CONTEXTS.values():item.close()
                cache._CONTEXTS.clear()
                add('C','SILENT',30)
                newer=compare();self.assertEqual(newer.extractions['potion-logs']['misses'],1)
                for item in cache._CONTEXTS.values():item.close()
                cache._CONTEXTS.clear()
            add('D','DEFECT',40);add('H',None,60);add(None,None,70)
            # Legacy ownership includes rows without frames and NULL run ids;
            # all-character queries retain every partition.
            con.execute("INSERT INTO decisions VALUES ('UNFRAMED',-1,1,1,'other','use_potion','FIXED')")
            for character in ('ironclad','defect',None):
                with self.subTest(character=character):
                    with patch.dict(os.environ,{'STS2_REFRESH_CACHE_DIR':''}):
                        expected=mod.load_logs(con,[10],character)
                        with states.open('rb') as handle:
                            offers=mod.load_shop_offers(con,handle,8,character)
                    with patch.dict(os.environ,{'STS2_REFRESH_CACHE_DIR':str(root/'cache')}):
                        ctx=cache.context(states)
                        actual=mod.load_logs(con,[10],character,cache=ctx)
                        self.assertEqual(normalized(actual),normalized(expected))
                        with states.open('rb') as handle:
                            self.assertEqual(normalized(mod.load_shop_offers(con,handle,8,character)),normalized(offers))
                        for item in cache._CONTEXTS.values():item.close()
                        cache._CONTEXTS.clear()
            con.close()


if __name__=='__main__':unittest.main()
