import json,collections,bisect,hashlib
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');NEW=['02HB4L0C3C67','T3FW7R2R2306']
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
E=json.load(open(O/'experience-before.json'));eb={e['id']:e for e in E['entries']}
checks=[];frames=[];quotes=[]
def brief(s):
 c=s.get('combat') or {};p=c.get('player') or {}
 return dict(hp=s['run']['current_hp'],block=p.get('block'),energy=p.get('energy'),powers={x['power_id']:x['amount'] for x in p.get('powers',[])},enemies=[dict(id=e['enemy_id'],hp=e['current_hp'],block=e['block'],move=e.get('move_id'),powers={x['power_id']:x['amount'] for x in e['powers']},intents=e['intents']) for e in c.get('enemies',[])])
for n in NEW:
 S=[json.loads(l) for l in (O/n/'states.jsonl').open()];D=[json.loads(l) for l in (O/n/'decisions.jsonl').open()];stamps={s['observed_ts']:s for s in S}
 assert all(d['observed_ts'] in stamps and d['fingerprint']==stamps[d['observed_ts']]['fingerprint'] for d in D)
 assert all(s['state']['run']['character_id'].lower()=='silent' for s in S)
 floors=[5,12] if n==NEW[0] else [5,8];starts={}
 for i,x in enumerate(S):
  s=x['state'];c=s.get('combat')
  if c and s['screen']=='COMBAT' and s['run']['floor'] in floors:starts.setdefault((s['run']['floor'],s['turn']),brief(s))
 for (f,t),s in starts.items():frames.append(dict(run=n,floor=f,turn=t,phase='轮初',state=s))
 for d in D:
  if d.get('journal') and d['screen'] in ['MAP','REST','EVENT','REWARD']:quotes.append(dict(run=n,floor=d['floor'],screen=d['screen'],ts=d['ts'],journal=d['journal']))
  if d.get('chosen',{}).get('action')=='end_turn' and d['floor'] in floors:frames.append(dict(run=n,floor=d['floor'],turn=d['turn'],phase='结束前',state=brief(stamps[d['observed_ts']]['state'])))
 last=S[-1]['state'];assert last['run']['current_hp']==0
 if n==NEW[0]:
  assert [(starts[(5,t)]['enemies'][0]['powers'].get('STRENGTH_POWER',0),starts[(5,t)]['enemies'][0]['intents'][0]['total_damage']) for t in [1,4,7]]==[(0,16),(2,20),(4,24)]
  assert starts[(12,6)]['enemies'][0]['hp']==96 and starts[(12,7)]['enemies'][0]['hp']==72
  stunned=[x for x in S if x['state']['run']['floor']==12 and x['state'].get('turn')==6 and (x['state'].get('combat') or {}).get('enemies') and x['state']['combat']['enemies'][0].get('move_id')=='STUNNED']
  assert stunned
  frames.append(dict(run=n,floor=12,turn=6,phase='眩晕',state=brief(stunned[-1]['state'])))
  end=next(x['state'] for x in S if x['observed_ts']==next(d['observed_ts'] for d in D if d['floor']==12 and d['turn']==8 and d.get('chosen',{}).get('action')=='end_turn'))
  assert end['run']['current_hp']==6 and end['combat']['player']['block']==15 and end['combat']['enemies'][0]['current_hp']==36
  assert any(p['power_id']=='VULNERABLE_POWER' and p['amount']==99 for p in end['combat']['player']['powers'])
 else:
  assert [starts[(8,t)]['enemies'][0]['powers'].get('STRENGTH_POWER',0) for t in range(1,7)]==list(range(6))
  assert [starts[(8,t)]['enemies'][0]['powers'].get('POISON_POWER',0) for t in range(2,7)]==list(range(2,7))
  assert last['combat']['enemies'][0]['current_hp']==13
  assert next(p['amount'] for p in last['combat']['enemies'][0]['powers'] if p['power_id']=='POISON_POWER')==5
  assert sum(range(2,7))==20
 checks.append(dict(run=n,states=len(S),decisions=len(D),fingerprints=True,first_decision=D[0]['ts'],end=R[n]['ended'],sl_lines=sum(1 for _ in (O/n/'sl-attempts.jsonl').open())))
for name,data in [('state-role-check',checks),('new-mechanism-frames',frames),('journal-quotes',quotes)]: (O/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
ds=[]
for n in NEW:
 start=next(x['first_decision'] for x in checks if x['run']==n);ds.append(dict(run=n,start=start,end=R[n]['ended'],seek=376968438,count=0))
 with (ROOT/'logs/deepseek-reasoning.jsonl').open('rb') as f:
  f.seek(376968438)
  for l in f:
   x=json.loads(l)
   if start<=x['ts']<=R[n]['ended']:ds[-1]['count']+=1
   if x['ts']>R[n]['ended']:break
(O/'deepseek-window-check.json').write_text(json.dumps(ds,indent=2)+'\n')
other=[]
for f in (ROOT/'.worktrees/exp/knowledge/characters/silent').glob('*'):
 if f.name=='experience.json' or not f.is_file():continue
 data=json.load(open(f));other.append(dict(file=f.name,sha256=hashlib.sha256(f.read_bytes()).hexdigest(),meta=data.get('meta'),generated=data.get('generated'),baselines={k:v.get('baseline') for k,v in data.get('by_ascension',{}).items()}))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
print(checks);print(ds)
