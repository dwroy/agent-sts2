import pathlib,json,collections,re
p=pathlib.Path(__file__).resolve().parent
D=[];S=[];B=[]
for name,bag in [('decisions',D),('states',S),('brain',B)]:
 for x in (p/(name+'-selected.txt')).open():
  n,v=x.split(':',1);d=json.loads(v);d['line']=int(n);bag.append(d)
for run in ['UZ1T7AH49WMB','7BNC8QX746YP']:
 lines=[]
 def o(*x):lines.append(' '.join(map(str,x)))
 ds=[d for d in D if d['run_id']==run];ss=[s for s in S if s['state']['run_id']==run];bs=[b for b in B if b['run_id']==run]
 for b in bs:
  # Keep condition projections and clocks, omit large common knowledge.
  payload=b.get('payload') or {};q=b.get('question');memory=b.get('memory')
  o('BRAIN',b['line'],b['label'],'questiontype',type(q).__name__,'payload keys',list(payload) if isinstance(payload,dict) else 'text','memorytype',type(memory).__name__)
  for k,v in payload.items() if isinstance(payload,dict) else []:
   if k in ['facts','memory','run_plan','state']:
    o(k,json.dumps(v,ensure_ascii=False)[:16000])
 for d in ds:
  if d['decider']=='jev' and d['label'].startswith('combat/'):
   o('d',d['line'],'F',d['floor'],'T',d['turn'],'attempt',d.get('sl_attempt'),'R',d['rationale'])
   for key,q in d.get('questions',{}).items():
    for opt,value in (q.get('criteria') or {}).items():
     try:v=json.loads(value)
     except (ValueError,TypeError):continue
     o(opt,{k:v.get(k) for k in ['plays','focus','hp_lost','hp_after','damage_dealt','block_gained','rollout_best','rollout_tied','rollout_turns','potion_cost','potions_used'] if k in v})
 for s in ss:
  st=s['state'];runraw=st['run'];c=st.get('combat') or {}
  if c.get('enemies'):
   o('s',s['line'],'F',runraw['floor'],'T',st['turn'],'HP',runraw['current_hp'],'P',c['player'],'E',[{k:e.get(k) for k in ['index','enemy_id','name','current_hp','max_hp','block','is_alive','powers','move_id','intents']} for e in c['enemies']])
 (p/(run+'-details.txt')).write_text('\n'.join(lines)+'\n')
print('saved details')
