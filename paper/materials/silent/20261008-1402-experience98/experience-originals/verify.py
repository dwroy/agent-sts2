import bisect, collections, hashlib, json
from pathlib import Path

O = Path(__file__).parent
N = 'G8NHLL09DLBX'
A = json.load(open(O/'audit.json'))
R = {r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
B = json.load(open(O/'experience-before.json'))
cards = [r for r in A['cards'] if r['card'] in ['FOOTWORK','BOUNCING_FLASK','DEADLY_POISON','POISONED_STAB','PIERCING_WAIL','SUCKER_PUNCH','TOOLS_OF_THE_TRADE','BACKFLIP','SURVIVOR','DEFLECT']]
(O/'mechanism-actions.json').write_text(json.dumps(cards,ensure_ascii=False,indent=2)+'\n')
potions = []
newpoints = []
for run in A['runs']:
    S = [json.loads(l) for l in (O/run/'states.jsonl').open()]
    D = [json.loads(l) for l in (O/run/'decisions.jsonl').open()]
    assert all(s['state']['run']['character_id'].lower() == 'silent' for s in S)
    times = [s['ts'] for s in S]
    for d in D:
        action = (d.get('chosen') or {}).get('action')
        if action != 'use_potion' and not (run == N and d['screen'] == 'COMBAT'): continue
        if action == 'use_potion' and not str(d.get('result','')).startswith('completed'): continue
        i = bisect.bisect_left(times,d['ts']); assert times[i] == d['ts']
        b,z = S[i]['state'],S[min(i+1,len(S)-1)]['state']
        def pw(s): return {p['power_id']:p['amount'] for p in (s.get('combat') or {}).get('player',{}).get('powers',[])}
        if action == 'use_potion':
            potions.append(dict(run=run,asc=R[run]['ascension'],floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,ts=d['ts'],potion=d['expect']['potion']['id'],before=pw(b),after=pw(z)))
        if run == N: newpoints.append(dict(decision=d,before=S[i],after=S[min(i+1,len(S)-1)]))
speed = [p for p in potions if p['potion'] == 'SPEED_POTION']
assert all(p['after'].get('DEXTERITY_POWER',0)-p['before'].get('DEXTERITY_POWER',0) == 5 for p in speed)
assert all(p['after'].get('SPEED_POTION_POWER',0)-p['before'].get('SPEED_POTION_POWER',0) == 5 for p in speed)
(O/'historical-potions.json').write_text(json.dumps(potions,ensure_ascii=False,indent=2)+'\n')
(O/'new-checkpoints.json').write_text(json.dumps(newpoints,ensure_ascii=False,indent=2)+'\n')
new = [f for f in A['fights'] if f['run'] == N]
expected = [(2,56,56),(4,56,56),(6,49,48),(8,69,58),(11,64,58),(12,58,58),(14,58,47),(15,47,44),(17,76,1),(19,61,54),(20,54,52),(23,52,22),(24,22,0)]
assert [(f['floor'],f['hp'],f['last_hp']) for f in new] == expected
assert len(new) == 13 and sum(f['death'] for f in new) == 1
assert all(f['type'] != 'unclassified' for f in new)
S = [json.loads(l) for l in (O/N/'states.jsonl').open()]
D = [json.loads(l) for l in (O/N/'decisions.jsonl').open()]
assert len(S) == 747 and len(D) == 726
for p in newpoints:
    d=p['decision'];card=(d.get('expect') or {}).get('card',{}).get('id')
    if card != 'SURVIVOR' or (d.get('chosen') or {}).get('action') != 'play_card':continue
    def brief(s):
        combat=s.get('combat') or {};pl=combat.get('player') or {}
        return dict(hp=s['run']['current_hp'],block=pl.get('block'),powers={q['power_id']:q['amount'] for q in pl.get('powers',[])})
    cards.append(dict(run=N,floor=d['floor'],attempt=d.get('sl_attempt') or 1,turn=d['turn'],card=card,before=brief(p['before']['state']),after=brief(p['after']['state']),selection_result=d['result']))
(O/'mechanism-actions.json').write_text(json.dumps(cards,ensure_ascii=False,indent=2)+'\n')
def row(f,a,t,c): return next(r for r in cards if (r['run'],r['floor'],r['attempt'],r['turn'],r['card']) == (N,f,a,t,c))
fw = row(24,1,1,'FOOTWORK')
assert fw['after']['powers']['DEXTERITY_POWER'] == 2
bf,su = row(24,1,2,'BACKFLIP'),row(24,1,2,'SURVIVOR')
assert bf['after']['block']-bf['before']['block'] == 7
assert su['after']['block']-su['before']['block'] == 10
assert not any(r['card'] == 'FOOTWORK' for r in cards if (r['run'],r['floor'],r['attempt']) == (N,24,2))
wa = row(24,2,3,'PIERCING_WAIL')
def incoming(b): return sum(i.get('total_damage') or 0 for e in b['enemies'] for i in e['intents'])
assert incoming(wa['before']) == 23 and incoming(wa['after']) == 2
assert all(e['powers'].get('STRENGTH_POWER') == -6 for e in wa['after']['enemies'])
nextwa = next(r for r in cards if (r['run'],r['floor'],r['attempt'],r['turn']) == (N,24,2,4))
assert all(e['powers'].get('STRENGTH_POWER',0) >= 0 for e in nextwa['before']['enemies'])
fl = row(24,2,5,'BOUNCING_FLASK')
mother = lambda b: next(e for e in b['enemies'] if e['id'] == 'OVICOPTER')
assert mother(fl['before'])['hp'] == mother(fl['after'])['hp'] == 29
assert mother(fl['before'])['powers']['POISON_POWER'] == mother(fl['after'])['powers']['POISON_POWER'] == 20
assert [e['powers'].get('POISON_POWER',0) for e in fl['before']['enemies'][:3]] == [0,7,0]
assert [e['powers'].get('POISON_POWER',0) for e in fl['after']['enemies'][:3]] == [3,10,3]
terminal = S[-1]['state']
assert terminal['run']['current_hp'] == 0
assert next(e for e in terminal['combat']['enemies'] if e['enemy_id'] == 'OVICOPTER')['current_hp'] == 9
speed23 = next(r for r in newpoints if r['decision']['floor'] == 23 and r['decision']['chosen']['action'] == 'use_potion' and r['decision']['turn'] == 2)
assert speed23['before']['state']['run']['current_hp'] == speed23['after']['state']['run']['current_hp'] == 47
deflect = row(23,1,2,'DEFLECT')
assert deflect['after']['block']-deflect['before']['block'] == 9
stab = row(23,1,2,'POISONED_STAB')
assert stab['before']['hp']-stab['after']['hp'] == 5
sucker = row(17,4,15,'SUCKER_PUNCH')
assert incoming(sucker['before']) == 56 and incoming(sucker['after']) == 42
end = next(r for r in A['ends'] if (r['run'],r['floor'],r['attempt'],r['turn']) == (N,17,4,15))
assert (end['before']['hp'],end['before']['block'],end['after']['hp']) == (34,9,1)
SL = [r for r in A['attempts'] if r['run'] == N]
assert [(r['floor'],r['attempt'],r['result']) for r in SL] == [(17,1,'predicted_death'),(17,2,'predicted_death'),(17,3,'predicted_death'),(17,4,'won'),(24,1,'predicted_death'),(24,2,'died')]
explore = [d for d in D if d.get('sl_explore')]
counts = collections.Counter(d['sl_explore'].get('kind') for d in explore)
(O/'sl-explore.json').write_text(json.dumps(explore,ensure_ascii=False,indent=2)+'\n')
other = []
for p in sorted(Path('knowledge/characters/silent').glob('*.json')):
    if p.name == 'experience.json':continue
    x=json.load(open(p));other.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x)[:15],metadata={k:x[k] for k in ['character','generated','generated_at','ascension','limitation'] if k in x}))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
summary = dict(new_fights=len(new),speed_runs=len({p['run'] for p in speed}),speed_drinks=len(speed),sl_explore=len(explore),sl_fields=dict(counts),card_counts={c:dict(runs=len({r['run'] for r in cards if r['card']==c}),actions=sum(r['card']==c for r in cards)) for c in sorted({r['card'] for r in cards})})
(O/'mechanism-counts.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
