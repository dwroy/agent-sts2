import json,collections
BASE='learner/runs/20261007-004301-postmortem/'
ds=[json.loads(l) for l in open(BASE+'decisions.jsonl')]
ss=[json.loads(l) for l in open(BASE+'states.jsonl')]
ss=[s for s in ss if s['state'].get('run_id')=='VPW8YH7A4QFM']
def floor(s):return (s['state'].get('run') or {}).get('floor')
def stable(s):
 c=s['state'].get('combat') or {};a=c.get('action_readiness') or {}
 return s['state'].get('in_combat') and a.get('actions_settled') and a.get('local_turn_ready') and c.get('hand') and s['screen']=='COMBAT'
def compact(s):
 x=s['state'];c=x['combat'];p=c['player']
 return dict(ts=s['ts'],screen=s['screen'],hp=p['current_hp'],block=p['block'],energy=p['energy'],powers=[(q.get('id',q.get('power_id')),q['amount']) for q in p['powers']],enemies=[(e['enemy_id'],e['current_hp'],e['block'],[(q.get('id',q.get('power_id')),q['amount']) for q in e['powers']],e['intents']) for e in c['enemies']],hand=[(z['card_id'],z.get('resolved_rules_text')) for z in c['hand']])
if __name__=='__main__':
 for f in [17,25,33,35,38,39]:
  rows=[s for s in ss if floor(s)==f and stable(s)];print('FLOOR',f)
  for t in sorted(set(s['state']['turn'] for s in rows)):
   rr=[s for s in rows if s['state']['turn']==t];a,b=compact(rr[0]),compact(rr[-1]);print('TURN',t,'FIRST',json.dumps(a,ensure_ascii=False),'LAST',json.dumps({k:v for k,v in b.items() if k!='hand'},ensure_ascii=False))
 print('GUARDS')
 for d in ds:
  if 'guard' in d.get('rationale','').lower():print(d['floor'],d['turn'],d['rationale'])
 print('COUNTS',collections.Counter(d['decider'] for d in ds),collections.Counter(d['label'] for d in ds if d['decider']=='code'))
 print('CHOICE_EXTRA',json.dumps({k:v for k,v in next(d for d in ds if d['label'].startswith('combat/plan-choice')).items() if k not in ['questions','fingerprint','answers']},ensure_ascii=False))
