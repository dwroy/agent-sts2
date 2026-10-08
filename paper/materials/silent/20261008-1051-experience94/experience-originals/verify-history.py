import bisect, collections, hashlib, json
from pathlib import Path

O = Path(__file__).parent
N = 'K2JAGKVJAWZJ'
R = {r['run_id']: r for r in json.load(open(O/'run-metadata.json'))}
ROWS = []
ROD = []
CARDS = {'MIRAGE', 'BURST', 'PIERCING_WAIL', 'BACKFLIP', 'NOXIOUS_FUMES', 'SHADOWMELD'}

def powers(e):
    return {p['power_id']: p['amount'] for p in e.get('powers', [])}

def brief(s):
    c = s.get('combat') or {}
    p = c.get('player') or {}
    return dict(hp=s['run']['current_hp'], block=p.get('block'), powers=powers(p),
                enemies=[dict(id=e['enemy_id'], hp=e['current_hp'], alive=e['is_alive'],
                              powers=powers(e), intents=e['intents']) for e in c.get('enemies', [])])

for run in json.load(open(O/'runs.json')):
    S = [json.loads(s) for s in (O/run/'states.jsonl').open()]
    M = {s['ts']: s['state'] for s in S}
    times = [s['ts'] for s in S]
    for line in (O/run/'decisions.jsonl').open():
        d = json.loads(line)
        if not str(d.get('result', '')).startswith('completed'):
            continue
        s = M[d['ts']]
        z = S[min(bisect.bisect_right(times, d['ts']), len(S)-1)]['state']
        c = d.get('chosen') or {}
        card = (d.get('expect') or {}).get('card', {}).get('id')
        relics = {r['relic_id'] for r in s['run'].get('relics', [])}
        row = dict(run=run, asc=R[run]['ascension'], floor=d['floor'], turn=d['turn'],
                   attempt=d.get('sl_attempt') or 1, ts=d['ts'], action=c.get('action'),
                   card=card, relics=sorted(relics), before=brief(s), after=brief(z))
        if c.get('action') == 'play_card' and (card in CARDS or 'VAMBRACE' in relics):
            played = next((h for h in s['combat']['hand'] if h['card_id'] == card), {})
            row['played'] = played
            ROWS.append(row)
        if c.get('action') == 'end_turn' and 'TUNGSTEN_ROD' in relics:
            ROD.append(row)

(O/'historical-mechanisms.json').write_text(json.dumps(ROWS, ensure_ascii=False, indent=2)+'\n')
(O/'historical-rod.json').write_text(json.dumps(ROD, ensure_ascii=False, indent=2)+'\n')
for card in sorted(CARDS):
    rr = [r for r in ROWS if r['card'] == card]
    print(card, '独立局/动作', len({r['run'] for r in rr}), len(rr))
print('钨合金棍持有结束回合', len({r['run'] for r in ROD}), len(ROD))

F = json.load(open(O/N/'facts.json'))
last = next(r for r in F if (r['floor'], r['turn'], r['action']) == (46, 9, 'end_turn'))
assert (last['before']['hp'], last['before']['block'], last['after']['hp']) == (13, 20, 0)
assert [(e['id'], e['hp']) for e in last['before']['enemies']] == [('FLAIL_KNIGHT', 43), ('SPECTRAL_KNIGHT', 84)]
last.update(full_attack=36, full_loss=14, strict_extra_hp=2,
            calculation='12×2+12−20=16；钨合金棍两次穿透伤各减1，需损14；13血严格存活至少再需2血。末击截断，只实扣剩13。')
(O/'terminal-facts.json').write_text(json.dumps(last, ensure_ascii=False, indent=2)+'\n')
new = [r for r in ROWS if r['run'] == N]
mirage = [r for r in new if r['floor'] == 46 and r['card'] == 'MIRAGE']
assert [(r['turn'], r['before']['block'], r['after']['block']) for r in mirage] == [(1,16,16),(6,10,20)]
assert mirage[1]['before']['powers']['DEXTERITY_POWER'] == 2
assert sum(e['powers'].get('POISON_POWER',0) for e in mirage[1]['before']['enemies'] if e['alive']) == 8
states = [json.loads(s)['state'] for s in (O/N/'states.jsonl').open()]
deck = states[-1]['run']['deck']
(O/'final-deck-count.json').write_text(json.dumps(dict(cards=len(deck), upgraded=sum(bool(c.get('upgraded')) for c in deck), upgrade_fields=sorted({k for c in deck for k in c if 'upgrad' in k})), ensure_ascii=False)+'\n')
other = []
for path in sorted(Path('knowledge/characters/silent').glob('*')):
    if path.name == 'experience.json' or not path.is_file():
        continue
    x = json.load(open(path)) if path.suffix == '.json' else {}
    other.append(dict(file=path.name, sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                      metadata={k:x[k] for k in ['character','generated','generated_at','limitation','ascension'] if k in x}, keys=list(x)[:20]))
(O/'other-knowledge.json').write_text(json.dumps(other, ensure_ascii=False, indent=2)+'\n')
print('本局蜃景、末轮和其他知识核验通过',len(other))
