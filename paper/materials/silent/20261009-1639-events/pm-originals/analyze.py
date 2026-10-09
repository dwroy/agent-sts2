import json,collections,datetime
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2'); O=P/'learner/runs/20261009-161301-postmortem'
D=[]
for line in (O/'decisions.numbered.jsonl').open():
 n,t=line.split(':',1); x=json.loads(t); x['_line']=int(n); D.append(x)
S=[]
for line in (O/'states.selected.jsonl').open():
 x=json.loads(line); x['data']['_line']=x['line']; S.append(x['data'])
R=json.loads((O/'C6Z8ATNBNHZ7-resources.json').read_text())
def showstate(x,hand=False):
 s=x['state']; run=s['run']; c=s.get('combat') or {}; p=c.get('player') or {}
 out={'s':x['_line'],'ts':x['ts'],'f':run['floor'],'t':s.get('turn'),'screen':s['screen'],'hp':run['current_hp'],'max':run['max_hp'],'player':p,'enemies':c.get('enemies')}
 if hand: out['hand']=c.get('hand') or s.get('hand')
 return out
rounds=[]
for c in R['combats']:
 ss=[s for s in S if c['entry']['line']<=s['_line']<=(c['exit'] or c['last'])['line']]
 groups=[]
 for s in ss:
  if s['state']['screen']!='COMBAT': continue
  if not groups or groups[-1][0]['state']['turn']!=s['state']['turn']:groups.append([])
  groups[-1].append(s)
 tab=[]
 for i,g in enumerate(groups):
  start,last=g[0],g[-1]; after=groups[i+1][0] if i+1<len(groups) else (ss[-1] if c['exit'] else None)
  def eh(x):return [(e['name'],e['enemy_id'],e['current_hp'],e['max_hp'],e.get('powers'),e.get('intents')) for e in x['state']['combat']['enemies']]
  tab.append({'turn':start['state']['turn'],'start':showstate(start),'last':showstate(last),'after':showstate(after) if after else None})
 rounds.append({'seq':c['sequence'],'floor':c['floor'],'rounds':tab})
(O/'rounds.json').write_text(json.dumps(rounds,ensure_ascii=False,indent=2))
print('STATE SHAPE',S[10]['state'].keys(), S[10]['state'].get('combat',{}).keys())
print('LABELS',collections.Counter((d['label'],d['decider']) for d in D))
low=[d for d in D if d['decider']=='jev' and isinstance(d.get('confidence'),(float,int)) and d['confidence']<.35]
print('LOW',len(low),collections.Counter(d['floor'] for d in low))
print('BEST FIELDS',collections.Counter(k for d in D for k in d if any(q in k.lower() for q in ['best','roll','guard'])))
for floor in [17,19,22,23]:
 for r in rounds:
  if r['floor']!=floor:continue
  print('ROUND',r['seq'])
  for row in r['rounds']:
   a,l,b=row['start'],row['last'],row['after']; ee=a['enemies']; player=l['player'];
   print('T',row['turn'],'HP',a['hp'],b['hp'] if b else '?','EN',[(e.get('index'),e.get('name'),e['current_hp'],e.get('powers'),e.get('intents')) for e in ee],'LAST',player,'AFTEREN',[(e.get('name'),e['current_hp']) for e in (b['enemies'] or [])] if b else '?','s',a['s'],l['s'],b['s'] if b else '?')
for d in D:
 if 'guard' in str(d).lower():print('GUARD',d['_line'],d['floor'],d['turn'],d['rationale'], {k:v for k,v in d.items() if 'guard' in k.lower()})
print('USAGE')
for by in ['jev','codex']:
 dd=[d for d in D if d['decider']==by]; print(by,{k:sum((d.get('usage') or {}).get(k,0) for d in dd) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
print('CONF FOCUS')
for d in D:
 if d['decider']=='jev' and d['label'].startswith('combat') and d.get('questions'):
  sample={k:d.get(k) for k in ['_line','label','chosen','rationale','jev','rollout','rollout_best_chosen','hp_guard'] if k in d}
  (O/'question-sample.json').write_text(json.dumps({'sample':sample,'questions':d['questions']},ensure_ascii=False,indent=2));break
for d in D:
 if d['decider']=='codex':
  (O/f"brain-decision-{d['_line']}.json").write_text(json.dumps(d,ensure_ascii=False,indent=2))
