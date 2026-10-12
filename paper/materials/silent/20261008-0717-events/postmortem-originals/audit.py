import json,collections,datetime
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-064304-postmortem')
def rows(name):
 out=[]
 for l in (P/name).read_text().splitlines():
  n,x=l.split(':',1);v=json.loads(x);v['_line']=int(n);out.append(v)
 return out
D=rows('decisions.raw');S=rows('states.raw');R=json.loads((P/'GXNKW8X1XYJP-resources.json').read_text())
start,end=D[0]['ts'],D[-1]['ts']
for name,size in [('brain',50000000),('deepseek-reasoning',1000000)]:
 path=Path('/home/dw/Projects/agent-sts2/logs')/(name+'.jsonl');out=[];first=last=None
 with path.open('rb') as f:
  offset=max(0,path.stat().st_size-size);f.seek(offset)
  if offset:f.readline()
  for l in f:
   pos=f.tell()-len(l)
   try:v=json.loads(l)
   except ValueError:continue
   ts=v.get('ts') or v.get('timestamp');first=first or ts;last=ts
   if ts and start<=ts<=end:out.append({'_offset':pos,**v})
 (P/(name+'.selected.jsonl')).write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in out))
 print(name,'tail window',first,last,'selected',len(out))
print('decisions',D[0]['_line'],D[-1]['_line'],'states',S[0]['_line'],S[-1]['_line'],'elapsed_s',(datetime.datetime.fromisoformat(end)-datetime.datetime.fromisoformat(start)).total_seconds())
print('counts',dict(collections.Counter(d['decider'] for d in D)))
J=[d for d in D if d['decider']=='jev'];plans=[d for d in J if d['label'].startswith('combat/plan-choice')];rank1=sum('code rank 1' in d['rationale'] for d in plans)
print('jev',len(J),'low',sum(d.get('confidence') is not None and d['confidence']<.35 for d in J),'plan',len(plans),'rank1',rank1,'rollout',dict(collections.Counter(d.get('rollout_best_chosen') for d in plans)))
for d in D:
 if 'guard' in d.get('rationale','').lower() or '护栏' in str(d) or (d['floor']>=40 and d['decider']=='codex'):
  print('DEC',d['_line'],d['floor'],d['turn'],d['label'],d.get('chosen'),d.get('rationale'))
for c in R['combats']:
 lo=c['entry']['line'];hi=(c['exit'] or c['last'])['line'];frames=[x for x in S if lo<=x['_line']<=hi];turns={}
 for x in frames:
  st=x['state'];t=st.get('turn');co=st.get('combat') or {};pl=co.get('player') or {}
  if st.get('in_combat') and co.get('enemies') and (pl.get('hand') or st.get('hand')):turns.setdefault(t,x)
 # State layout may store player differently; also preserve first combat state by turn.
 if not turns:
  for x in frames:
   if x['state'].get('in_combat'):turns.setdefault(x['state'].get('turn'),x)
 ts=[]
 for t,x in sorted(turns.items(),key=lambda q:q[0] or 0):
  st=x['state'];en=st['combat']['enemies'];ts.append({'turn':t,'line':x['_line'],'ts':x['ts'],'hp':st['run']['current_hp'],'need':sum(e.get('current_hp',0) for e in en if e.get('is_alive')),'enemies':[{k:e.get(k) for k in ['index','enemy_id','name','current_hp','block','is_alive','powers','intents']} for e in en],'player':st['combat'].get('player')})
 c['manual_turns']=ts
 print('COMBAT',c['sequence'],c['floor'],[(x['turn'],x['line'],x['hp'],x['need']) for x in ts])
(P/'resources-audit.json').write_text(json.dumps(R,ensure_ascii=False,indent=2)+'\n')
for s in S[:2]:print('state structure',s['_line'],list(s['state']),list((s['state'].get('combat') or {})))
