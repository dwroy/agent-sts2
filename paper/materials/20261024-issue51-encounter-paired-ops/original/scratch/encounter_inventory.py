import json,pathlib,duckdb,collections
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2');OUT=pathlib.Path(__file__).resolve().parent
s=json.loads((ROOT/'paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json').read_text());meta={x['run_id']:x for x in s['runs']};c=duckdb.connect(':memory:');c.execute('SET threads=2');c.execute('CREATE TABLE allowed(run_id VARCHAR)');c.executemany('INSERT INTO allowed VALUES (?)',[(x,) for x in meta]);paths=[str(ROOT/x['path']) for x in s['verified_read_only_shards'] if x['table']=='frames'];c.execute('CREATE TEMP TABLE frames AS SELECT p.* FROM read_parquet(?) p JOIN allowed USING(run_id) WHERE off+len<=?',[paths,s['raw_stream_cutoffs']['states']['max_bytes']])
cur=c.execute('SELECT run_id,floor,first(act ORDER BY off) act,first(hp ORDER BY off) hp,first(max_hp ORDER BY off) max_hp,first(enemies ORDER BY off) enemies,min(off) first_off,max(off) last_off,min(player_hp) min_observed_player_hp,count(*) frames FROM frames WHERE in_combat AND observed GROUP BY run_id,floor ORDER BY run_id,floor');fights=[dict(zip([x[0] for x in cur.description],v)) for v in cur.fetchall()]
want={'bygone':'BYGONE_EFFIGY','vantom':'VANTOM','kin':'KIN_PRIEST','demon':'KNOWLEDGE_DEMON','millipede':'DECIMILLIPEDE_SEGMENT_FRONT','crab':'CRUSHER'};res=[]
for name,enemy in want.items():
 matched=[]
 for f in fights:
  if enemy in [x['id'] for x in (f['enemies'] or [])]:
   m=meta[f['run_id']];matched.append({**f,'ascension':m['ascension'],'attempt_scope':m['attempt_scope'],'game_version':'unknown','final_run_victory':m['victory'],'later_floor_recorded':c.execute('SELECT count(*)>0 FROM frames WHERE run_id=? AND floor>?',[f['run_id'],f['floor']]).fetchone()[0]})
 strata=[]
 for key in sorted({(x['ascension'],x['attempt_scope']) for x in matched}):
  xs=[x for x in matched if (x['ascension'],x['attempt_scope'])==key];strata.append({'ascension':key[0],'attempt_scope':key[1],'independent_runs':len({x['run_id'] for x in xs}),'encounter_floor_opportunities':len(xs),'later_floor_passage_proxy_n':sum(x['later_floor_recorded'] for x in xs),'observed_hp_zero_n':sum(x['min_observed_player_hp']==0 for x in xs),'no_later_floor_or_hpzero_unknown_n':sum(not x['later_floor_recorded'] and x['min_observed_player_hp']!=0 for x in xs),'final_run_wins':sum(x['final_run_victory'] for x in xs)})
 res.append({'context':name,'actual_enemy_id':enemy,'strata':strata,'opportunities':matched})
(OUT/'own-encounter-inventory.json').write_text(json.dumps({'eligible_runs':506,'game_version':'unknown','source':'self:agent-sts2','definition':'Distinct run/floor containing actual enemy; retries at same floor merge, never independent attempts. Later floor is a passage proxy. HP zero is observed frame, not predicted death. First-frame HP is not atomic entry. No action effect inferred from inventory.','contexts':res},ensure_ascii=False,indent=2,default=str)+'\n')
for r in res:print(r['context'],r['strata'])
