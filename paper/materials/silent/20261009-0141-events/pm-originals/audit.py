import re
from analyze import *
from datetime import datetime
R=json.load(open(P/'HEMND3SMQYB8-resources.json'))
byline={s['_line']:s for s in S}
parsed={}
for d in D:
 cs={}
 for k,v in d.get('questions',{}).get('plan',{}).get('criteria',{}).items():
  try: cs[k]=json.loads(v) if isinstance(v,str) else v
  except ValueError:pass
 parsed[d['_line']]=cs
planDs=[d for d in D if d['decider']=='jev' and d['label'].startswith('combat/plan-choice')]
ranked=[d for d in planDs if re.search(r'code rank \d+',d['rationale'])]
focusDs=[d for d in planDs if any('focus' in o for o in parsed[d['_line']].values())]
print('counts',len(planDs),'besttrue',sum(d.get('rollout_best_chosen') is True for d in planDs),'bestfalse',sum(d.get('rollout_best_chosen') is False for d in planDs),'unrecorded',sum(d.get('rollout_best_chosen') is None for d in planDs),'ranked',len(ranked),'rank1',sum('code rank 1' in d['rationale'] and not re.search(r'code rank 1\d',d['rationale']) for d in ranked),'focus',len(focusDs))
for f in [17,33,48,49]:
 ds=[d for d in planDs if d['floor']==f];print('bestFloor',f,len(ds),collections.Counter(d.get('rollout_best_chosen') for d in ds))
print('turns')
for c in R['combats']:
 e=c['entry']; end=c['exit'] or c['last']; frames=[s for s in S if e['line']<=s['_line']<=end['line']]
 firsts=[]
 for s in frames:
  t=s['state'].get('turn');
  if not firsts or t!=firsts[-1]['state'].get('turn'):firsts.append(s)
 startLines=[s['_line'] for s in firsts]; ends=firsts[1:]+[frames[-1]]
 need=[];delta=[];hp=[];bounds=[]
 for a,b in zip(firsts,ends):
  def eh(s):return sum(e['current_hp'] for e in (s['state'].get('combat') or {}).get('enemies',[]) if e['is_alive'])
  need.append(eh(a));delta.append(eh(a)-eh(b));hp.append(b['state']['run']['current_hp']-a['state']['run']['current_hp']);bounds.append([a['_line'],b['_line']])
 ds=[d for d in D if e['ts']<=d['ts']<=end['ts'] and d['floor']==c['floor']]
 ownStarts=[d for d in ds if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue']
 jevTurns={d['turn'] for d in ds if d['decider']=='jev'}
 print('C',c['sequence'],'F',c['floor'],'need',need,'netEnemy',delta,'netHP',hp,'lines',bounds,'ownTurns',sorted({d['turn'] for d in ownStarts}),'noJevTurns',sorted({s['state']['turn'] for s in firsts}-jevTurns))
print('resourceChanges')
for c in R['resource_changes']:
 a,b=c['from'],c['to']
 if c['combat_sequence'] is None or a['potions']!=b['potions']:
  print('s',a['line'],'->',b['line'],'F',b['floor'],'T',b['turn'],'HP',a['hp'],'->',b['hp'],'pots',a['potions'],'->',b['potions'],'restart',c['restart_boundary'])
print('ownDecisions',sum(d['decider']=='code' and not d['rationale'].startswith('continuing the Jev-chosen plan:') for d in D),'jevplan',sum(d['rationale'].startswith('continuing the Jev-chosen plan:') for d in D))
allTurns=allOwn=allNoJev=ownStartsN=0
for c in R['combats']:
 e=c['entry']; end=c['exit'] or c['last']; ds=[d for d in D if e['ts']<=d['ts']<=end['ts'] and d['floor']==c['floor']]
 ts={s['state']['turn'] for s in S if e['line']<=s['_line']<=end['line']}
 os=[d for d in ds if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue']
 jt={d['turn'] for d in ds if d['decider']=='jev'}
 allTurns+=len(ts);allOwn+=len({d['turn'] for d in os});allNoJev+=len(ts-jt);ownStartsN+=len(os)
print('totTurns',allTurns,'ownTurns',allOwn,'allNoJev',allNoJev,'ownStarts',ownStartsN)
print('rest deck last',[(c['card_id'],c['upgraded']) for c in S[-1]['state']['run']['deck']]);print('lastrelics',[(c['relic_id'],c['name']) for c in S[-1]['state']['run']['relics']])
print('duration',(datetime.fromisoformat(D[-1]['ts'])-datetime.fromisoformat(D[0]['ts'])).total_seconds(),'observed',PL[0].get('observed_ts'))
