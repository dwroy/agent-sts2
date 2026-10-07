import collections,hashlib,json,subprocess
from pathlib import Path
p=Path('learner/runs/20261007-074302-postmortem')
base=json.loads((p/'append-baseline.json').read_text());b=Path('notes/lessons.md').read_bytes()
assert hashlib.sha256(b[:base['size']]).hexdigest()==base['sha256']
section=b[base['size']:].decode();assert section.count('## P5HT1272P5SB')==1
assert sum(l.startswith('- [') for l in section.splitlines())==4
ss=[json.loads(l) for l in (p/'states.jsonl').open()];ds=[json.loads(l) for l in (p/'decisions.jsonl').open()]
expected={8:([90,74,56,20],[16,18,36,20],[1,5,15,0]),17:([324,300,261,233,186,172,151,144,113,113,100,96,79,66,38,32,7],[24,39,28,47,14,21,7,31,0,13,4,17,13,28,6,25,7],[0,10,0,7,4,1,0,0,0,0,11,0,2,4,12,0,0]),23:([134,78,30],[56,48,30],[0,12,0]),25:([129,129,115,96,83,75,69,69,52],[21,14,40,34,8,6,0,38,14],[0,3,0,5,0,14,0,15,3])}
for floor,want in expected.items():
 xs=[x['state'] for x in ss if x['state'].get('run',{}).get('floor')==floor and x['state'].get('combat')]
 need=[];dmg=[];loss=[]
 for t in sorted(set(x['turn'] for x in xs)):
  a=next(x for x in xs if x['turn']==t);z=next((x for x in xs if x['turn']==t+1),xs[-1]);n=sum(e['current_hp'] for e in a['combat']['enemies']);m=sum(e['current_hp'] for e in z['combat']['enemies']);extra=21 if floor==25 and t in [1,3,4,8] else 0
  need.append(n);dmg.append(n-m+extra);loss.append(a['combat']['player']['current_hp']-z['combat']['player']['current_hp'])
 assert (need,dmg,loss)==want,(floor,need,dmg,loss)
 for label,arr in zip(['需','扣','损'],[need,dmg,loss]):assert label+json.dumps(arr,separators=(',',':')) in section
 print('重核',floor,'进血',xs[0]['combat']['player']['current_hp'],'出血',xs[-1]['combat']['player']['current_hp'],'回合',len(need),'实伤',sum(dmg),'失血',sum(loss))
pattern='23:21:42.296Z|23:23:35.878Z|23:23:38.170Z'
raw=subprocess.check_output(['nice','-n','10','rg',pattern,str(p/'states.jsonl')],text=True)
for l in raw.splitlines():
 x=json.loads(l);s=x['state'];c=s['combat'];print('重新grep关键状态',x['ts'],'层',s['run']['floor'],'轮',s['turn'],'血',c['player']['current_hp'],'挡',c['player']['block'],'敌',[(e['enemy_id'],e['current_hp']) for e in c['enemies']])
print('F23末轮原始行动与退场')
for d in ds:
 if d['floor']==23 and d['turn']==3:print(d['label'],d['chosen'],d['rationale'])
for x in ss:
 s=x['state'];c=s.get('combat')
 if s.get('run',{}).get('floor')==23 and s.get('turn')==3 and c:print(x['ts'],[(e['index'],e['current_hp'],e['max_hp']) for e in c['enemies']])
print('原文前缀保持，四行记录格式通过')
