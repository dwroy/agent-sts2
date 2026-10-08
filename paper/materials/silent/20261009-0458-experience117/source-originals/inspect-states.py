import json,bisect,collections
from pathlib import Path
O=Path(__file__).parent
rows=[]
for run in ['FU8ZUQHBHNV9','456MRNGCPD8E']:
 S=[json.loads(x) for x in (O/run/'states.jsonl').open()]
 D=[json.loads(x) for x in (O/run/'decisions.jsonl').open()]
 stamps=[x['ts'] for x in S]; sm={x['ts']:x['state'] for x in S}
 assert all(s['state']['run']['character_id'].lower()=='silent' and s['state']['run_id']==run for s in S)
 def brief(s):
  c=s.get('combat') or {}; p=c.get('player') or {}
  return dict(hp=s['run']['current_hp'],max=s['run']['max_hp'],block=p.get('block'),powers={p['power_id']:p['amount'] for p in p.get('powers',[])},enemies=[dict(id=e['enemy_id'],hp=e['current_hp'],move=e.get('move_id'),powers={p['power_id']:p['amount'] for p in e.get('powers',[])},intents=e.get('intents')) for e in c.get('enemies',[])])
 for d in D:
  if not d.get('chosen') or d['ts'] not in sm:continue
  a=sm[d['ts']];z=S[min(bisect.bisect_right(stamps,d['ts']),len(S)-1)]['state']
  card=(d.get('expect') or {}).get('card') or {}; potion=(d.get('expect') or {}).get('potion') or {}
  if card.get('id') in ['FOOTWORK','NOXIOUS_FUMES','SHADOWMELD','ACCELERANT','PIERCING_WAIL'] or d['chosen']['action']=='use_potion' or (d['chosen']['action']=='end_turn' and d['floor'] in ([8] if run.startswith('FU') else [17,29,30,31])):
   rows.append(dict(run=run,floor=d['floor'],turn=d['turn'],action=d['chosen'],card=card,potion=potion,before=brief(a),after=brief(z),rationale=d.get('rationale')))
 print(run,len(D),len(S),'brain',len((O/run/'brain.jsonl').read_text().splitlines()),'SL',len((O/run/'sl-attempts.jsonl').read_text().splitlines()))
(O/'new-state-facts.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
for r in rows:
 if r['run']=='456MRNGCPD8E' and r['floor']==31 and r['turn']==6:print(json.dumps(r,ensure_ascii=False))
