from pathlib import Path
import json,hashlib,datetime
R=Path.cwd();A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue50-resume-2047-ops';P=R/'paper/materials/20261024-issue50-resume-1834-ops';sha=lambda b:hashlib.sha256(b).hexdigest();raw=lambda v:(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()
ids=[v['run_id'] for v in json.loads((A/'ends-all.json').read_bytes())];assert len(ids)==2;cutoff=json.loads((P/'freeze.json').read_bytes())['brain_source_cut'];p=R/'logs/brain.jsonl';limit=p.stat().st_size;assert limit-cutoff<128*1024*1024;refs={run:[] for run in ids};selected=[];seen=0;bad=[]
with p.open('rb') as f:
 f.seek(cutoff)
 while f.tell()<limit:
  off=f.tell();b=f.readline(min(limit-off,16*1024*1024))
  if not b.endswith(b'\n'):bad.append({'offset':off,'bytes':len(b),'reason':'partial at frozen cut'});break
  seen+=1
  try:v=json.loads(b)
  except ValueError:bad.append({'offset':off,'bytes':len(b),'reason':'invalid JSON'});continue
  run=v.get('run_id')
  if run in ids:refs[run].append({'path':'logs/brain.jsonl','offset':off,'bytes':len(b),'sha256':sha(b),'cut_bytes':limit});selected.append(b)
(A/'brain.jsonl').write_bytes(b''.join(selected));out={'brain':refs};small={}
for name in ['run-plans','run-config','runs']:
 p=R/'logs'/f'{name}.jsonl';size=p.stat().st_size;pos=0;rows=[];items=[]
 with p.open('rb') as f:
  while pos<size:
   b=f.readline(size-pos)
   if not b.endswith(b'\n'):break
   v=json.loads(b);run=v.get('run_id') or v.get('run')
   if run in ids:rows.append(b);items.append({'run':run,'path':str(p.relative_to(R)),'offset':pos,'bytes':len(b),'sha256':sha(b),'cut_bytes':size})
   pos+=len(b)
 (A/(name+'.jsonl')).write_bytes(b''.join(rows));out[name]=items;small[name]=len(rows)
# Read only the suffix after the predecessor SL frozen cut.
prev=json.loads((P/'SL-readback.json').read_bytes());oldcut=max(v['ref']['cut_bytes'] for v in prev['rows']);p=R/'logs/sl-attempts.jsonl';size=p.stat().st_size;sl=[];slrefs=[]
with p.open('rb') as f:
 f.seek(oldcut)
 while f.tell()<size:
  pos=f.tell();b=f.readline(size-pos)
  if not b.endswith(b'\n'):break
  v=json.loads(b);run=v.get('run_id') or v.get('run')
  if run in ids:sl.append(b);slrefs.append({'run':run,'path':'logs/sl-attempts.jsonl','offset':pos,'bytes':len(b),'sha256':sha(b),'cut_bytes':size})
(A/'sl-attempts.jsonl').write_bytes(b''.join(sl));out['sl-attempts']=slrefs;(M/'raw-refs.json').write_bytes(raw(out));meta={'at':datetime.datetime.now().astimezone().isoformat(timespec='seconds'),'selected_ended_runs':ids,'brain_suffix_start':cutoff,'brain_suffix_end':limit,'source_suffix_bytes':limit-cutoff,'brain_source_rows_scanned':seen,'selected_brain_rows':len(selected),'selected_brain_bytes':sum(map(len,selected)),'partial_or_bad_suffix_rows':bad,'small_stream_rows':small,'sl_suffix_start':oldcut,'sl_suffix_end':size,'selected_sl_rows':len(sl),'raw_source_no_sync':True,'no_full_brain_or_state_scan':True,'current_unended_CH2_excluded_from_closed_run_metrics':True,'new_models_full_games':0};(M/'freeze.json').write_bytes(raw(meta));print(json.dumps(meta,ensure_ascii=False))
