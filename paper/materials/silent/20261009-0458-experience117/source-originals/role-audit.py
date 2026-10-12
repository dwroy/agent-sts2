import json
from pathlib import Path
O=Path(__file__).parent
counts={}
for run in json.load(open(O/'runs.json')):
 n=0
 for line in (O/run/'states.jsonl').open():
  x=json.loads(line);s=x['state'];assert s['run']['character_id'].lower()=='silent' and s['run_id']==run,(run,x['ts'],s.get('run_id'),s['run'].get('character_id'));n+=1
 counts[run]=n
(O/'role-audit.json').write_text(json.dumps(dict(runs=len(counts),frames=sum(counts.values()),foreign=0,counts=counts),ensure_ascii=False,indent=2)+'\n')
print('逐帧角色/局号核验',len(counts),'局',sum(counts.values()),'帧，foreign=0')
