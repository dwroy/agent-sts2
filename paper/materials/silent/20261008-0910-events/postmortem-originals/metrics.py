import json,pathlib,collections,datetime,re
P=pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-084303-postmortem');D=json.loads((P/'decisions.json').read_text());S=json.loads((P/'states.json').read_text());R=json.loads((P/'ZTRGYYMLR8SC-resources.json').read_text())
print('用时秒',(datetime.datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(D[0]['ts'].replace('Z','+00:00'))).total_seconds())
print('usage',collections.Counter({k:sum((d.get('usage') or {}).get(k,0) or 0 for d in D) for k in ['input_tokens','output_tokens','cache_hit_tokens','reasoning_tokens']}))
print('deepseekkeys',next(d['deepseek'] for d in D if d.get('deepseek')))
print('实际code决策',sum(d['decider']=='code' and not(d['label']=='combat/plan-continue' and 'Jev-chosen' in d['rationale']) for d in D))
print('code labels',collections.Counter(d['label'] for d in D if d['decider']=='code' and d['label'].startswith('combat')))
ps=[d for d in D if d['label'] in ['combat/plan-choice','combat/plan-choice+potion']]
rank=[d for d in ps if re.search(r'code rank (\d+)',d['rationale'])]
print('plan choices',len(ps),'ranked',len(rank),'rank1',sum('code rank 1' in d['rationale'] for d in rank))
best=valid=tie=0;focus=collections.Counter(); fg=[]
for d in ps:
 qs=(d.get('questions') or {}).get('plan') or {};cs=qs.get('criteria') or {}
 parsed={}
 for k,v in cs.items():
  try: parsed[k]=json.loads(v)
  except (ValueError,TypeError): pass
 m=re.search(r'Jev chose plan (\d+)/',d['rationale'])
 if m:
  picked='plan'+m.group(1)
  if any(v.get('rollout_best') or v.get('rollout_tied') for v in parsed.values()):
   valid+=1
   if parsed.get(picked,{}).get('rollout_best'):best+=1
   if parsed.get(picked,{}).get('rollout_tied'):tie+=1
  if any('focus' in v for v in parsed.values()):
   focus[parsed.get(picked,{}).get('focus','无focus')]+=1
   fg.append([d['_line'],d['floor'],d['turn'],d.get('sl_attempt'),picked,{k:v.get('focus') for k,v in parsed.items() if 'focus' in v},d['rationale']])
print('显示推演最优分母',valid,'唯一best选择',best,'并列选择',tie)
print('focus',focus,'例',fg[:7])
print('每次实盘资源/伤害')
for c in R['combats']:
 rows=[s for s in S if c['entry']['line']<=s['_line']<=c['last']['line']]
 bt=collections.defaultdict(list)
 for s in rows:bt[s['state']['turn']].append(s)
 start=[];end=[]
 for t,rs in bt.items():
  st=rs[0]['state'];hp=st['run']['current_hp'];ehp=sum(e['current_hp'] for e in (st.get('combat') or {}).get('enemies',[]))
  # First ready turn frame, not an after-action frame; early unready frames are harmless here.
  start.append([t,hp,ehp,rs[0]['_line']]);en=(rs[-1]['state'].get('combat') or {}).get('enemies',[])
  end.append([t,sum(e['current_hp'] for e in en),rs[-1]['_line']])
 losses=[];damage=[]
 for i,(t,hp,ehp,line) in enumerate(start):
  nh=start[i+1][1] if i+1<len(start) else c['exit']['hp'] if c['exit'] else None
  ne=start[i+1][2] if i+1<len(start) else 0 if c['exit'] and c['exit']['screen']=='REWARD' else end[i][1]
  losses.append(None if nh is None else hp-nh);damage.append(ehp-ne)
 print('序',c['sequence'],'F',c['floor'],'损血',losses,'逐轮敌HP净扣',damage,'合计',sum(damage),'剩',end[-1][1])
 # Code-led round = at least one autonomous lead label, continuing an existing Jev plan does not count.
 ds=[d for d in D if rows[0]['ts']<=d['ts']<=(c['exit'] or c['last'])['ts'] and d['floor']==c['floor']]
 lead=[d for d in ds if d['decider']=='code' and d['label'] in ['combat/plan','combat/lethal','combat/least-loss','combat/end_turn']]
 print('代码主导轮',sorted(set(d['turn'] for d in lead)),'初始决定',collections.Counter(d['label'] for d in lead))
print('route/clock检索')
def walk(o,path=''):
 if isinstance(o,dict):
  for k,v in o.items():
   np=path+'.'+k
   if k in ['act_boss_clock','route_forecast','routes','route_projections','route_plan','brain','deepseek','facts','hp_projection','route'] and path.count('.')<5:
    if k in ['facts','brain','deepseek']:print(np,str(v)[:200])
    else:print(np,json.dumps(v,ensure_ascii=False)[:6000])
   walk(v,np)
 elif isinstance(o,list):
  for i,v in enumerate(o):walk(v,path+'.'+str(i))
for n in [285163,285357]:
 d=next(x for x in D if x['_line']==n);print('决策',n);walk(d)
