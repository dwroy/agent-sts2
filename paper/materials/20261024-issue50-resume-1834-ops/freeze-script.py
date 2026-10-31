from pathlib import Path
import json,hashlib,subprocess,collections
R=Path.cwd();A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue50-resume-1834-ops';ids=['BP9C8K9NSRZ0','P4ZBYNW92PPK','4CR2N26QAJAV'];sha=lambda b:hashlib.sha256(b).hexdigest();raw=lambda j:(json.dumps(j,ensure_ascii=False,indent=2)+'\n').encode()
def put(p,j):p.write_bytes(j if isinstance(j,bytes) else raw(j))
index=json.loads((A/'brain-index.json').read_bytes());assert not index['truncated'] and index['row_count']==143;refs={k:[] for k in ids};stream=R/'logs/brain.jsonl';cut=stream.stat().st_size;allraw=[];off=0
with stream.open('rb') as f:
 for row in index['rows']:
  pos,size,run,*_=row;assert pos+size<=cut;f.seek(pos);b=f.read(size);j=json.loads(b);assert j['run_id']==run
  refs[run].append({'path':'logs/brain.jsonl','offset':pos,'bytes':size,'sha256':sha(b),'cut_bytes':cut});allraw.append(b)
put(A/'brain.jsonl',b''.join(allraw));put(M/'brain-index.json',(A/'brain-index.json').read_bytes());smallrefs={};smallraw={}
for name,field in [('run-plans','run'),('run-config','run_id'),('runs','run_id')]:
 p=R/'logs'/f'{name}.jsonl';size=p.stat().st_size;selected=[];items=[];pos=0
 with p.open('rb') as f:
  while pos<size:
   b=f.readline();j=json.loads(b)
   # run-config historically uses run_id or run; the exact original binding is retained.
   run=j.get(field) or j.get('run_id') or j.get('run')
   if run in ids:
    selected.append(b);items.append({'run':run,'path':str(p.relative_to(R)),'offset':pos,'bytes':len(b),'sha256':sha(b),'cut_bytes':size})
   pos+=len(b)
 put(A/(name+'.jsonl'),b''.join(selected));smallrefs[name]=items
put(M/'raw-refs.json',{'brain':refs,**smallrefs});rows=[json.loads(b) for b in allraw];cfg=[json.loads(x) for x in (A/'run-config.jsonl').read_bytes().splitlines()];plans=[json.loads(x) for x in (A/'run-plans.jsonl').read_bytes().splitlines()]
meta={'at':subprocess.check_output(['date','-Is'],text=True).strip(),'selected_runs':ids,'brain_rows':len(rows),'raw_brain_bytes_read':sum(len(x) for x in allraw),'brain_source_cut':cut,'small_stream_rows':{k:len(v) for k,v in smallrefs.items()},'logdb_no_sync':True,'no_whole_brain_or_state_scan':True,'no_new_model_game_full':0};put(M/'freeze.json',meta)
print(json.dumps(meta,ensure_ascii=False));print('brain_shape',{'keys':list(rows[0]),'payload_keys':list(rows[0].get('payload',{})),'qid':rows[0].get('question_id'),'label':rows[0].get('label')});print('config_shapes',[{'run':c.get('run_id') or c.get('run'),'keys':list(c),'code':c.get('code')} for c in cfg])
