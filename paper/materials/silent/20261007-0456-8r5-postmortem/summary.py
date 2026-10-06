import sys,json,collections,datetime
sys.path.insert(0,'learner/runs/20261007-044301-postmortem')
from analyse import ds,ss,powers
attempts=collections.defaultdict(lambda:1);prevturn={};groups=collections.OrderedDict()
for x in ss:
 s=x['state'];f=s['run']['floor'];c=s.get('combat') or {};t=s.get('turn')
 if s['screen'] not in ['COMBAT','CARD_SELECTION','GAME_OVER','COMBAT_REWARD'] or not c.get('enemies') or not t:continue
 if s['screen']=='COMBAT' and t<prevturn.get(f,0):attempts[f]+=1
 if s['screen']=='COMBAT':prevturn[f]=t
 key=(f,attempts[f],t);groups.setdefault(key,[]).append(x)
def ready(x):
 c=x['state'].get('combat') or {};return c.get('hand') and c.get('action_readiness',{}).get('can_use_combat_actions') and not (x['state'].get('selection') or {}).get('is_pending')
def hp(x):return x['state']['run']['current_hp']
def ehp(x):return sum(e['current_hp'] for e in (x['state'].get('combat') or {}).get('enemies',[]) if e['current_hp']<1000000)
for f in [8,17,25,33,35]:
 for a in sorted({k[1] for k in groups if k[0]==f}):
  gs=[(k,v) for k,v in groups.items() if k[:2]==(f,a)]
  need=[];net=[];loss=[];end=[]
  for i,(k,v) in enumerate(gs):
   first=next((x for x in v if ready(x)),v[0]);last=v[-1]
   if i+1<len(gs):last=next((x for x in gs[i+1][1] if ready(x)),gs[i+1][1][0])
   elif a==max(k[1] for k in groups if k[0]==f):
    terminal=[x for x in ss if x['state']['run']['floor']==f and x['state']['screen'] in ['REWARD','MAP','GAME_OVER']]
    if terminal and terminal[-1]['ts']>last['ts']:last=terminal[-1]
   need.append(ehp(first));net.append(ehp(first)-ehp(last));loss.append(hp(first)-hp(last));end.append((hp(last),ehp(last)))
  print('战斗',f,a,'轮',len(gs),'需',need,'净扣',net,'净损',loss,'末',end[-1])
  if f in [33,35]:
   for k,v in gs:
    first=next((x for x in v if ready(x)),v[0]);last=v[-1];c=last['state']['combat'];print('轮详情',k,'hp',hp(first),'末hp',hp(last),'末挡',c['player']['block'],'敌末',[(e['current_hp'],powers(e['powers'])) for e in c['enemies']])
prev={};ac=[]
for x in ss:
 s=x['state'];now={z['index']:z for z in s['run'].get('potions',[]) if z.get('occupied')}
 for idx,z in now.items():
  if idx not in prev or z['potion_id']!=prev[idx]['potion_id']:ac.append((s['run']['floor'],s.get('turn'),z['name'],z['potion_id'],x['ts']))
 prev=now
print('药水进入栏',ac)
for x in ds:
 if x.get('chosen',{}).get('action')=='use_potion':print('喝药',x['floor'],x['turn'],x['rationale'])
for x in ds:
 if x.get('label')=='rest/plan':
  fp=json.loads(x['fingerprint']);after=next((s for s in ss if s['ts']>x['ts']),None)
  print('休息',x['floor'],x.get('deepseek',{}).get('choice'),fp['hp'],'下一状态',after['state']['run']['current_hp'] if after else None)
keys=set();jk=set();ck=set();attackck=set()
for x in ds:
 if not x['label'].startswith('combat/'):continue
 k=(x['floor'],x.get('sl_attempt'),x['turn']);keys.add(k)
 if x['label'].startswith('combat/plan-choice'):jk.add(k)
 if x['decider']=='code' and x['label']!='combat/plan-continue':
  ck.add(k)
  if x.get('chosen',{}).get('action')!='end_turn':attackck.add(k)
print('轮统计','全部',len(keys),'有Jev',len(jk),'无Jev',len(keys-jk),'自主代码',len(ck),'非结束自主代码',len(attackck))
print('执行最优',sum(x.get('rollout_best_chosen') is True and 'HP guard' not in x['rationale'] for x in ds if x['label'].startswith('combat/plan-choice')))
print('时长',(datetime.datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))).total_seconds())
print('缓存率',2810368/4389164*100)
print('护栏题简')
for x in ds:
 if 'HP guard' in x['rationale']:
  for k,v in x['questions']['plan']['criteria'].items():
   o=json.loads(v);print(x['floor'],x['turn'],k,{z:o.get(z) for z in ['plays','hp_lost','damage_dealt','enemies_after','block_gained','rollout']})
