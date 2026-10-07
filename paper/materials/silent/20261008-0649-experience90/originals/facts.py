import bisect,collections,hashlib,json
from pathlib import Path
O=Path(__file__).parent;K=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge')
def powers(x):return {p['power_id']:p['amount'] for p in x.get('powers',[])}
def brief(s):
 c=s.get('combat') or {};p=c.get('player') or {}
 return dict(hp=s['run']['current_hp'],max_hp=s['run']['max_hp'],block=p.get('block'),energy=p.get('energy'),powers=powers(p),hand=[dict(id=c['card_id'],text=c.get('resolved_rules_text'),dynamic=c.get('dynamic_values'),blocked=c.get('unplayable_reason')) for c in c.get('hand',[])],enemies=[dict(id=e['enemy_id'],hp=e['current_hp'],alive=e['is_alive'],powers=powers(e),move=e.get('move_id'),intents=e['intents']) for e in c.get('enemies',[])])
for N in ['KFRDELW2TH2P']:
 S=[json.loads(x) for x in (O/N/'states.jsonl').open()];D=[json.loads(x) for x in (O/N/'decisions.jsonl').open()];SM={x['ts']:x['state'] for x in S};times=[x['ts'] for x in S]
 assert all(d['ts'] in SM for d in D)
 assert all(s['state']['run']['character_id'].lower()=='silent' for s in S)
 rows=[]
 for d in D:
  if not d.get('chosen') or d['screen']!='COMBAT':continue
  before=SM[d['ts']];after=S[min(bisect.bisect_right(times,d['ts']),len(S)-1)]['state']
  rows.append(dict(ts=d['ts'],run=N,floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,card=d.get('expect',{}).get('card',{}).get('id'),action=d['chosen']['action'],result=d.get('result'),before=brief(before),after=brief(after)))
 (O/N/'facts.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
 quotes=[dict(ts=d['ts'],floor=d['floor'],label=d['label'],journal=d.get('journal'),rationale=d.get('rationale')) for d in D if d.get('journal')]
 (O/N/'journal-quotes.json').write_text(json.dumps(quotes,ensure_ascii=False,indent=2)+'\n')
 print(N,'逐帧匹配',len(D),len(S),'SL覆盖',collections.Counter(str((x.get('sl_explore') or {}).get('kind')) for x in D if x.get('sl_explore')))
