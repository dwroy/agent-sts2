import hashlib,json
from pathlib import Path
O=Path(__file__).parent.resolve();R=json.load(open(O/'run-metadata.json'));rows=[];total=0
for r in R:
 run=r['run_id'];p=O/run/'states.jsonl';count=0;digest=hashlib.sha256();first=last=None
 with p.open('rb') as h:
  for raw in h:
   digest.update(raw);x=json.loads(raw);s=x['state'];assert s['run']['character_id'].lower()=='silent' and s['run_id']==run;assert x['ts']<=r['ended'];count+=1;first=first or x['ts'];last=x['ts']
 total+=count;rows.append(dict(run=run,asc=r['ascension'],frames=count,first=first,last=last,states_sha256=digest.hexdigest(),source=str(p.resolve())))
artifact=[]
for name in ['experience-before.json','changes.json','audit.json','historical-potions.json','historical-power-deltas.json','mechanism-evidence.json','sample-manifest.json','baseline-check.json']:
 p=O/name;digest=hashlib.sha256()
 with p.open('rb') as h:
  while block:=h.read(1024*1024):digest.update(block)
 artifact.append(dict(file=name,bytes=p.stat().st_size,sha256=digest.hexdigest()))
(O/'data-manifest.json').write_text(json.dumps(dict(character='silent',runs=len(R),frames=total,role_check=0,rows=rows,artifacts=artifact),ensure_ascii=False,indent=2)+'\n');print('逐帧角色/局号/截止点校验通过',len(R),'局',total,'帧')
