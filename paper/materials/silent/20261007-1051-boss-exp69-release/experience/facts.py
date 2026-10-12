import bisect,collections,hashlib,json
from pathlib import Path
O=Path(__file__).parent;N='7ZUC4VPMDS41';ROOT=Path('/home/dw/Projects/agent-sts2');K=ROOT/'.worktrees/exp/knowledge'
S=[json.loads(x) for x in (O/N/'states.jsonl').open()];D=[json.loads(x) for x in (O/N/'decisions.jsonl').open()];SM={x['ts']:x['state'] for x in S};times=[x['ts'] for x in S]
def powers(x):return {p['power_id']:p['amount'] for p in x.get('powers',[])}
def brief(s):
 c=s.get('combat') or {};p=c.get('player') or {}
 return dict(hp=s['run']['current_hp'],max_hp=s['run']['max_hp'],block=p.get('block'),energy=p.get('energy'),played=p.get('cards_played_this_turn'),powers=powers(p),hand=[dict(id=c['card_id'],blocked=c.get('unplayable_reason'),text=c.get('resolved_rules_text')) for c in c.get('hand',[])],enemies=[dict(id=e['enemy_id'],hp=e['current_hp'],powers=powers(e),move=e.get('move_id'),intents=e['intents']) for e in c.get('enemies',[])])
assert len(S)==565 and len(D)==550
assert all(d['ts'] in SM and d['observed_ts']==next(s['observed_ts'] for s in S if s['ts']==d['ts']) for d in D)
assert all(s['state']['run']['character_id'].lower()=='silent' for s in S)
rows=[]
for d in D:
 if not d.get('chosen') or d['screen']!='COMBAT':continue
 before=SM[d['ts']];after=S[min(bisect.bisect_right(times,d['ts']),len(S)-1)]['state']
 rows.append(dict(ts=d['ts'],floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,card=d.get('expect',{}).get('card',{}).get('id'),action=d['chosen']['action'],result=d.get('result'),before=brief(before),after=brief(after)))
(O/'new-facts.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
quotes=[dict(ts=d['ts'],floor=d['floor'],label=d['label'],journal=d.get('journal'),rationale=d.get('rationale')) for d in D if d.get('journal')]
(O/'journal-quotes.json').write_text(json.dumps(quotes,ensure_ascii=False,indent=2)+'\n')
actual_pending=[x for x in rows if str(x['result']).startswith('pending (unstable)') and (x['before']['hp']!=x['after']['hp'] or x['before']['block']!=x['after']['block'] or x['before']['energy']!=x['after']['energy'] or x['before']['enemies']!=x['after']['enemies'])]
(O/'pending-confirmed.json').write_text(json.dumps(actual_pending,ensure_ascii=False,indent=2)+'\n')
ring_history={}
for run in json.load(open(O/'runs.json')):
 frames=[]
 for l in (O/run/'states.jsonl').open():
  x=json.loads(l);s=x['state'];c=s.get('combat') or {};p=c.get('player') or {}
  if powers(p).get('RINGING_POWER')==1 and p.get('cards_played_this_turn')==1:
   h=c.get('hand',[])
   if h and any(z.get('unplayable_reason')=='blocked_by_hook' for z in h):frames.append(dict(ts=x['ts'],floor=s['run']['floor'],turn=s['turn'],state=brief(s)))
 if frames:ring_history[run]=frames
(O/'ringing-history.json').write_text(json.dumps(ring_history,ensure_ascii=False,indent=2)+'\n')
for run in ['LRN0HPZ0FZS1',N]:assert run in ring_history
assert any(x['turn']==8 for x in ring_history['LRN0HPZ0FZS1'])
assert any(x['turn']==11 and any(c['id']=='SHIV' and c['blocked']=='blocked_by_hook' for c in x['state']['hand']) for x in ring_history['LRN0HPZ0FZS1'])
last=next(x for x in rows if x['attempt']==6 and x['turn']==14 and x['action']=='end_turn')
assert last['before']['played']==1 and last['before']['energy']==2 and all(x['blocked']=='blocked_by_hook' for x in last['before']['hand'])
assert last['before']['block']==5 and last['before']['hp']==8
common=json.load(open(K/'common/monster-db.json'))['monsters'];(O/'common-facts-check.json').write_text(json.dumps({'CEREMONIAL_BEAST':common['CEREMONIAL_BEAST']},ensure_ascii=False,indent=2)+'\n')
others={}
for p in (K/'characters/silent').glob('*'):
 if p.name=='experience.json' or not p.is_file():continue
 x=json.load(p.open()) if p.suffix=='.json' else None
 others[p.name]=dict(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),meta=x.get('meta') if x else None,generated=x.get('generated') if x else None,about=x.get('_about') if x else None,note=x.get('note') if x else None,keys=list(x) if x else None)
(O/'other-knowledge.json').write_text(json.dumps(others,ensure_ascii=False,indent=2)+'\n')
print('新局逐帧匹配',len(D),len(S),'已确认pending',len(actual_pending),'昏眩历史',len(ring_history),'局',sum(map(len,ring_history.values())),'帧')
