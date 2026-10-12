import json,pathlib,collections,re,datetime
p=pathlib.Path('learner/runs/20261008-184301-postmortem')
def rows(name):
 for line in (p/(name+'-lines.jsonl')).open():
  n,s=line.split(':',1);o=json.loads(s);o['_line']=int(n);yield o
D=list(rows('decisions'));S=list(rows('states'));C=json.load(open(p/'QHK1XQ928TTM-resources.json'))
for d in D:
 if re.search(r'HP guard|hp guard|护栏',d.get('rationale','')):print('GUARD',d['_line'],d['floor'],d['turn'],d['rationale'])
P=[d for d in D if d['decider']=='jev' and d['label'].startswith('combat/plan-choice')]
R=[d for d in P if re.search(r'code rank \d',d['rationale'])]
print('PLAN',len(P),'rankable',len(R),'rank1',sum('code rank 1' in d['rationale'] for d in R))
for d in [P[0],next(d for d in P if d['_line']==295821)]:
 print('Q',d['_line'],list(d['questions']))
 for q,v in d['questions'].items():
  print(q, 'criteria',list(v.get('criteria',{})),'extra',[(k,str(x)[:80]) for k,x in v.items() if k not in ['criteria','instructions']])
  for k,x in v.get('criteria',{}).items():print(k,str(x)[:1800])
print('NONCOMBAT RESOURCE')
for x in C['resource_changes']:
 if x['combat_sequence'] is None:print(x)
print('COMBAT TURNS')
for c in C['combats']:
 if c['floor'] not in [17,20,24,27,31,33]:continue
 print('C',c['sequence'],'F',c['floor'])
 for t in c['enemy_hp_audit']['turns']:
  print('T',t['turn'],'需',t['live_enemy_hp_start'],'进度',t.get('net_live_enemy_hp_loss'),'下界',t['visible_enemy_hp_loss_lower_bound'],'补',t['observed_hp_added'],'缺',t['gaps'])
print('COMBAT CODE',collections.Counter(d['label'] for d in D if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue'))
print('CODE TURNS',len({(d['floor'],d.get('sl_attempt'),d['turn']) for d in D if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue'}))
print('LOW COMBAT',sum(d['decider']=='jev' and d['label'].startswith('combat/') and d.get('confidence',1)<.35 for d in D))
