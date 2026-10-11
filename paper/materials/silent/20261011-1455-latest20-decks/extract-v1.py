"""Freeze recent completed Silent A10 decks and recorded plans using read-only indexed offsets."""
import collections,datetime,hashlib,json,sys
from pathlib import Path
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[3]
sys.path[:0]=[str(ROOT/'agent/tools/logdb'),str(ROOT/'eval')]
import query,sync,brain_source

def sha(b):return hashlib.sha256(b).hexdigest()
def save(name,obj):(OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
runsraw=(ROOT/'logs/runs.jsonl').read_bytes()
ends={r['run_id']:r for l in runsraw.splitlines() if (r:=json.loads(l)).get('character')=='SILENT' and r.get('ascension')==10}
recent=sorted(ends.values(),key=lambda r:r['ended'],reverse=True)[:25]
ids=[r['run_id'] for r in recent]
with sync.read_lock(str(ROOT/'data/logdb'),wait=False) as got:
 assert got,'Read lock busy'
 manifest=(ROOT/'data/logdb/manifest.json').read_bytes();(OUT/'logdb-manifest.json').write_bytes(manifest)
 con=query.connect(str(ROOT/'data/logdb'),threads=2)
 def q(sql):
  c=con.execute(sql,[ids]);names=[x[0] for x in c.description]
  return [{k:query.plain(v) for k,v in zip(names,row)} for row in c.fetchall()]
 bo=q("SELECT run_id,off,len FROM llm_calls_raw WHERE src='brain' AND list_contains(?,run_id) ORDER BY off")
 fo=q("SELECT run_id,off,len,ts,screen,floor,deck_size FROM frames WHERE list_contains(?,run_id) AND deck_size>0 QUALIFY row_number() OVER (PARTITION BY run_id ORDER BY off DESC)=1")
 acts=q("SELECT run_id,max(act) AS max_act FROM frames WHERE list_contains(?,run_id) GROUP BY run_id")
 po=q("SELECT run_id,off,len FROM run_plans WHERE list_contains(?,run_id) ORDER BY off")
 so=q("SELECT run_id,off,len FROM sl_attempts WHERE list_contains(?,run_id) ORDER BY off")
 con.close()
proof=[]
def readrefs(file,refs):
 result=collections.defaultdict(list)
 with (ROOT/'logs'/file).open('rb') as f:
  for ref in refs:
   f.seek(ref['off']);b=f.read(ref['len']);r=json.loads(b)
   rid=r['state']['run_id'] if file=='states.jsonl' else r['run_id']
   assert rid==ref['run_id']
   proof.append({'file':file,'run_id':rid,'off':ref['off'],'len':ref['len'],'sha256':sha(b)})
   result[rid].append(r)
 return result
brains=readrefs('brain.jsonl',bo)
states=readrefs('states.jsonl',fo)
plans=readrefs('run-plans.jsonl',po)
sl=readrefs('sl-attempts.jsonl',so)
rows=[]
for end in recent:
 rid=end['run_id'];s=states[rid][-1]['state'];deck=s['run']['deck'];assert s['run']['floor']==end['floor'],rid
 terminal=s['screen']=='GAME_OVER';assert terminal,(rid,s['screen'])
 assert s['game_over']['is_victory']==end['victory'],rid
 source=brain_source.classify(brains[rid]);ps=[p for p in plans[rid] if not p.get('error') and p.get('archetype')]
 row={**end,'source':source,'final_frame':next(r for r in proof if r['file']=='states.jsonl' and r['run_id']==rid),'deck_size':len(deck),'deck':[{'id':c['card_id'],'name':c['name'],'upgraded':c.get('upgraded',False)} for c in deck],'relics':s['run']['relics'],'last_plan':ps[-1] if ps else None,'max_act':next(r['max_act'] for r in acts if r['run_id']==rid),'sl_reloads':sum(bool(x.get('reload_ok')) for x in sl[rid]),'sl_first_death':next((x for x in sl[rid] if x.get('result')=='predicted_death'),None)}
 rows.append(row)
selected=[r for r in rows if r['source']['eligible']][:20];assert len(selected)==20
save('snapshot.json',{'recorded_at':datetime.datetime.now().astimezone().isoformat(),'runs_source_sha256':sha(runsraw),'db_manifest_sha256':sha(manifest),'sync_performed':False,'eligible_latest20_ids':[r['run_id'] for r in selected],'raw_latest20_ids':ids[:20],'rows':rows,'raw_provenance':proof})
for r in rows:
 if r in selected or r['run_id'] in ids[:20]:
  print(json.dumps({'run_id':r['run_id'],'end':r['ended'],'floor':r['floor'],'victory':r['victory'],'source':r['source']['source'],'unresolved':r['source']['unresolved_questions'],'size':r['deck_size'],'sl_reloads':r['sl_reloads'],'archetype':r['last_plan'].get('archetype') if r['last_plan'] else None,'summary':r['last_plan'].get('summary') if r['last_plan'] else None,'cards':dict(collections.Counter(c['name']+('+' if c['upgraded'] else '') for c in r['deck']))},ensure_ascii=False))
