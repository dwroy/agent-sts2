import json, pathlib, collections, re
p=pathlib.Path('learner/runs/20261008-184301-postmortem')
def rows(name):
 for line in (p/(name+'-lines.jsonl')).open():
  n,s=line.split(':',1); o=json.loads(s); o['_line']=int(n); yield o
D=list(rows('decisions')); S=list(rows('states'))
with (p/'decision-summary.txt').open('w') as f:
 for d in D:
  if d['decider']=='codex' or d['floor'] in [24,31,33]:
   f.write(json.dumps({k:d.get(k) for k in ['_line','ts','floor','turn','sl_attempt','label','decider','chosen','rationale','confidence','result']},ensure_ascii=False)+'\n')
with (p/'state-summary.txt').open('w') as f:
 for s in S:
  st=s['state']; c=st.get('combat') or {}; r=st.get('run') or {}
  if r.get('floor') in [17,24,31,33]:
   f.write(json.dumps({'line':s['_line'],'ts':s['ts'],'floor':r.get('floor'),'turn':st.get('turn'),'screen':st.get('screen'),'hp':r.get('current_hp'),'player':c.get('player'),'enemies':c.get('enemies'),'hand':c.get('hand')},ensure_ascii=False)+'\n')
print('decisions',len(D),'states',len(S),'window',D[0]['ts'],D[-1]['ts'])
print('deciders',collections.Counter(d['decider'] for d in D))
print('labels',collections.Counter((d['label'],d['decider']) for d in D))
print('low',sum(d['decider']=='jev' and (d.get('confidence') or 0)<.35 for d in D))
for d in D:
 if d['decider']=='codex': print(d['_line'],d['floor'],d['label'],d['chosen'],d['rationale'])
print('state-schema',list(S[3]['state']), 'combat',list(S[3]['state'].get('combat') or {}))
