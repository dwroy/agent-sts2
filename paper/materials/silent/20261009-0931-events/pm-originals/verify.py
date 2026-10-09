import json,hashlib,collections,re
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-091302-postmortem');root=p.parents[2]
checks=[]
for r in ['VAC6Z1PZ1QJG','NG1FBJTSRLHS']:
 counts={}
 for name in ['decisions','states','run-plans','sl-attempts']:
  count=0
  with (root/f'logs/{name}.jsonl').open('rb') as original:
   for l in (p/f'{r}-{name}.jsonl').open():
    x=json.loads(l);offset=x.pop('_offset');line=x.pop('_line');original.seek(offset);actual=json.loads(original.readline());assert actual==x,(r,name,line);count+=1
  counts[name]=count
 checks.append({'run':r,'原始字节偏移逐条核对':counts})
ss={r:{x['_line']:x for x in map(json.loads,(p/f'{r}-states.jsonl').open())} for r in ['VAC6Z1PZ1QJG','NG1FBJTSRLHS']}
def state(r,n,hp,block,enemy):
 x=ss[r][n]['state'];assert x['run']['current_hp']==hp;assert x['combat']['player']['block']==block
 assert [e['current_hp'] for e in x['combat']['enemies']]==enemy
for args in [('VAC6Z1PZ1QJG',317941,8,14,[182]),('VAC6Z1PZ1QJG',317942,0,0,[152]),('NG1FBJTSRLHS',318072,12,10,[32]),('NG1FBJTSRLHS',318073,0,0,[28])]:state(*args)
x=ss['NG1FBJTSRLHS'];assert x[318004]['state']['combat']['player']['energy']==3;assert x[318005]['state']['combat']['player']['energy']==4;assert len(x[318004]['state']['combat']['hand'])==7;assert len(x[318005]['state']['combat']['hand'])==9
assert x[318055]['state']['combat']['enemies'][0]['current_hp']-x[318056]['state']['combat']['enemies'][0]['current_hp']==10
assert 1921032+6786329+12547==8719908;assert 54412+1200298+2739==1257449
for r in ss:
 ds=list(map(json.loads,(p/f'{r}-decisions.jsonl').open()));je=[x for x in ds if x['decider']=='jev' and x['label'].startswith('combat/')];va=[x for x in je if isinstance(x.get('rollout_best_chosen'),bool)]
 checks.append({'run':r,'选线':[len(je),len(va),sum(x['rollout_best_chosen'] for x in va)],'HP护栏':sum('HP guard:' in x.get('rationale','') for x in ds),'低信心':sum(isinstance(x.get('confidence'),(int,float)) and x['confidence']<.35 and x['decider']=='jev' for x in ds),'草稿SHA':hashlib.sha256((p/f'{r}-draft-v2.md').read_bytes()).hexdigest()})
 for c in json.loads((p/f'{r}-resources.json').read_text())['combats']:
  for key in ['entry','last','exit']:
   if c.get(key):
    a=c[key];s=ss[r][a['line']]['state'];assert a['hp']==s['run']['current_hp'];assert a['max_hp']==s['run']['max_hp'];assert a['ts']==ss[r][a['line']]['ts']
(p/'verification-before-append.json').write_text(json.dumps({'通过':True,'核验':checks},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'通过':True,'核验':checks},ensure_ascii=False))
