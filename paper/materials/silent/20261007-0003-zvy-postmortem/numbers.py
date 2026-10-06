import json,collections,datetime
from pathlib import Path
P=Path(__file__).parent
D=[json.loads(l) for l in (P/'decisions.jsonl').open()]; S=[json.loads(l) for l in (P/'states.jsonl').open()]; E=json.load((P/'episodes.json').open())
def pp(x):return {v['power_id']:v['amount'] for v in x}
def ready(x):return x['state']['combat']['action_readiness']['can_use_combat_actions']
def eh(c):
 out=collections.defaultdict(int)
 for e in c['enemies']:out[(e['enemy_id'],e['max_hp'])]+=e['current_hp']
 return dict(out)
def hp(x):return (x['state'].get('run') or {}).get('current_hp')
byts={x['ts']:i for i,x in enumerate(S)}
rows=[]
for num,e in enumerate(E):
 by=collections.defaultdict(list)
 for x in e['states']:by[x['state']['turn']].append(x)
 starts=[]
 for t,ss in by.items():starts.append((t,next((x for x in ss if ready(x)),ss[0])))
 row={'episode':num+1,'floor':e['floor'],'need':[],'damage':[],'loss':[],'turn_hp':[],'final':None}
 for j,(t,x) in enumerate(starts):
  ac=x['state']['combat']; ah=eh(ac)
  if j+1<len(starts):y=starts[j+1][1]
  else:
   idx=byts[e['states'][-1]['ts']];nxt=S[idx+1] if idx+1<len(S) else None
   y=nxt if nxt and nxt['screen']!='COMBAT' else e['states'][-1]
  bc=y['state'].get('combat');bh=eh(bc) if bc else {}
  dmg=0
  for key,v in ah.items():
   dmg+=max(0,v-bh.get(key,0))
  if not bc:
   last=e['states'][-1]['state']['combat']
   if any(en['current_hp']>0 for en in last['enemies']):dmg=sum(max(0,v-eh(last).get(k,0)) for k,v in ah.items())
  row['need'].append(sum(ah.values()));row['damage'].append(dmg);row['loss'].append(hp(x)-hp(y));row['turn_hp'].append(hp(x))
  row['final']={'hp':hp(y),'screen':y['screen'],'enemy':[(en['enemy_id'],en['current_hp'],en['max_hp']) for en in (bc or e['states'][-1]['state']['combat'])['enemies']]}
 rows.append(row)
json.dump(rows,(P/'numbers.json').open('w'),ensure_ascii=False,indent=2)
for r in rows:
 if r['floor'] in [8,17,22,33,44,48,49]:print(r)
raise SystemExit
print('药水动作')
for x in D:
 if x['chosen']['action'] in ['use_potion','discard_potion','buy_potion','claim_reward']:
  if x['chosen']['action']=='claim_reward' and '药水' not in x['journal']['choice']:continue
  print(x['ts'],x['floor'],x['turn'],x.get('sl_attempt'),x['chosen'],x.get('expect'),x['journal']['choice'])
print('药水新入栏')
last={}
for x in S:
 pots={v['index']:v for v in (x['state'].get('run') or {}).get('potions',[]) if v.get('occupied')}
 for i,v in pots.items():
  if last.get(i,{}).get('potion_id')!=v['potion_id']:print(x['ts'],x['state']['run']['floor'],i,v['potion_id'],v['name'])
 last=pots
print('自主')
for scope,ds in [('全局',D),('F49',[x for x in D if x['floor']==49])]:
 c=[x for x in ds if x['screen']=='COMBAT' and x['decider']=='code' and x['label']!='combat/plan-continue']; ce=[x for x in c if x['result'].startswith('completed')];action=[x for x in ce if x['chosen']['action'] not in ['end_turn','save_and_quit']]
 key=lambda x:(x['floor'],x.get('sl_attempt'),x['turn'])
 print(scope,'code自主条',len(c),'轮',len(set(map(key,c))),'成功条',len(ce),'轮',len(set(map(key,ce))),'非结束条',len(action),'轮',len(set(map(key,action))))
 cb=[x for x in ds if x['screen']=='COMBAT'];turns=set(map(key,cb));jt=set(map(key,[x for x in cb if x['decider']=='jev']))
 print('战斗决策轮',len(turns),'无Jev轮',len(turns-jt),'原deciders',collections.Counter(x['decider'] for x in ds),'续步',collections.Counter(x['rationale'].startswith('continuing the Jev') for x in ds if x['label']=='combat/plan-continue'))
 print('Jev战斗题',sum(x['decider']=='jev' and x['label'].startswith('combat/') for x in ds),'低',sum(x['decider']=='jev' and x['label'].startswith('combat/') and (x['confidence'] or 0)<.35 for x in ds))
print('focus')
for scope,ds in [('全局',D),('F49',[x for x in D if x['floor']==49])]:
 offered=0;chosen=[]
 for x in ds:
  cr=x.get('questions',{}).get('plan',{}).get('criteria',{});focus={}
  for k,v in cr.items():
   try: v=json.loads(v)
   except:continue
   if v.get('focus'):focus[k]=v['focus']
  if focus:offered+=1
  ch=(x.get('answers',{}).get('plan') or {}).get('choice')
  if ch in focus:chosen.append(focus[ch])
 print(scope,'提供',offered,'选',len(chosen),collections.Counter(map(str,chosen)))
print('用时',(datetime.datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(D[0]['ts'].replace('Z','+00:00'))).total_seconds())
for k in ['input_tokens','output_tokens','cache_hit_tokens']:
 print(k,'Jev',sum(x.get('usage',{}).get(k,0) for x in D if x['decider']=='jev'),'brain_decision',sum(x.get('usage',{}).get(k,0) for x in D if x['decider']=='codex'))
