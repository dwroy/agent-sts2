import json,re,collections
from pathlib import Path
p=Path(__file__).parent
D=[json.loads(x) for x in (p/'decisions.jsonl').open()]; S=[json.loads(x) for x in (p/'states.jsonl').open()]; R=json.loads((p/'9DAS5L8YM1CN-resources.json').read_text())
def powers(o):return {x['power_id']:x['amount'] for x in o.get('powers',[])}
def short(s):
 st=s['state']; c=st.get('combat') or {}; pl=c.get('player') or {}
 return {'s':s['_line'],'ts':s['ts'],'f':st['run']['floor'],'t':st['turn'],'hp':st['run']['current_hp'],'block':pl.get('block'),'energy':pl.get('energy'),'p':powers(pl),'e':[(e['index'],e['name'],e['enemy_id'],e['current_hp'],e['block'],powers(e),[(i.get('damage'),i.get('hits')) for i in e.get('intents',[])]) for e in c.get('enemies',[])],'hand':[(x['index'],x['card_id'],x.get('upgraded'),x.get('energy_cost')) for x in c.get('hand',[])]}
with (p/'states-summary.jsonl').open('w') as f:
 for s in S:f.write(json.dumps(short(s),ensure_ascii=False)+'\n')
with (p/'decision-summary.jsonl').open('w') as f:
 for d in D:
  r={k:d.get(k) for k in ['_line','floor','turn','label','decider','rationale','chosen','expect','sl_attempt','result']}
  q=d.get('questions',{}).get('plan',{}).get('criteria',{}); r['plans']={k:json.loads(v) if v.startswith('{') else v for k,v in q.items()}; r['answer']=d.get('answers',{}).get('plan',{}).get('choice'); r['rollout']=d.get('rollout'); f.write(json.dumps(r,ensure_ascii=False)+'\n')
print('TOKENS', {k:sum(d.get('usage',{}).get(k,0) or 0 for d in D if d['decider']=='jev') for k in ['input_tokens','output_tokens']},{k:sum(d.get('usage',{}).get(k,0) or 0 for d in D if d['decider']=='codex') for k in ['input_tokens','output_tokens','cache_hit_tokens']})
J=[d for d in D if d['decider']=='jev']; Q=[d for d in J if 'plan' in d.get('questions',{})]; raw=[d for d in Q if d.get('answers',{}).get('plan',{}).get('choice','').startswith('plan')]
print('JEV',len(J),'low',sum(d.get('confidence',1)<.35 for d in J),'PLAN',len(Q),'RAWPLAN',len(raw),'RANK1',sum('code rank 1' in d['rationale'] for d in raw),'BEST',sum(json.loads(d['questions']['plan']['criteria'][d['answers']['plan']['choice']]).get('rollout_best') is True for d in raw))
C=[d for d in D if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue'];print('CODE MAIN',len(C),collections.Counter(d['label'] for d in C),'TURNS',len(set((d['floor'],d.get('sl_attempt') or 1,d['turn']) for d in C)))
print('FOCUS')
for d in Q:
 for k,v in d['questions']['plan']['criteria'].items():
  if 'focus' in v.lower():
   z=json.loads(v) if v.startswith('{') else {}; print(d['_line'],d['floor'],d['turn'],k,'chosen' if d.get('answers',{}).get('plan',{}).get('choice')==k else '',z.get('focus'),z.get('plays'))
print('RESOURCE CHANGES')
for x in R['resource_changes']:
 a,b=x['from'],x['to'];print('s',a['line'],b['line'],'F',a['floor'],b['floor'],'T',a['turn'],b['turn'],'HP',a['hp'],b['hp'],'P',a['potions'],b['potions'],'SEQ',x['combat_sequence'],'RESTART',x['restart_boundary'])
print('FIRST/LAST')
for c in R['combats']:
 print('F',c['floor'],'seq',c['sequence'])
 rows=[s for s in S if c['entry']['line']<=s['_line']<=(c['exit'] or c['last'])['line']]
 groups=[]
 for s in rows:
  t=s['state']['turn']
  if not groups or groups[-1][0]!=t:groups.append([t,[]])
  groups[-1][1].append(s)
 for t,g in groups:
  print(short(g[0]))
  if len(g)>1:print('END',short(g[-1]))
