import bisect
import collections
import hashlib
import json
from pathlib import Path

O = Path(__file__).parent
R = {r['run_id']: r for r in json.load((O / 'run-metadata.json').open())}
facts = {'rainbow': [], 'effigy': [], 'offering': [], 'corrupt_body_slam': [], 'poison_potion': []}
quotes = []

def powers(p):
    return {x['power_id']: x['amount'] for x in p.get('powers', [])}

for run in R:
    P = O / run
    S = [json.loads(l) for l in (P / 'states.jsonl').open()]
    stamps = [s['ts'] for s in S]
    SM = {s['ts']: s['state'] for s in S}
    by_floor = collections.defaultdict(list)
    for frame in S:
        s = frame['state']
        assert s['run']['character_id'].lower() == 'silent'
        for e in (s.get('combat') or {}).get('enemies', []):
            if e['enemy_id'] == 'BYGONE_EFFIGY':
                by_floor[s['run']['floor']].append(dict(ts=frame['ts'], turn=s['turn'], move=e.get('move_id'), powers=powers(e), intents=e['intents'], hp=e['current_hp']))
    for floor, frames in by_floor.items():
        asleep = [s for s in frames if s['move'] == 'SLEEP_MOVE']
        wake = [s for s in frames if s['move'] == 'WAKE_MOVE']
        ten = [s for s in frames if s['powers'].get('STRENGTH_POWER') == 10 and s['move'] == 'SLASHES_MOVE']
        facts['effigy'].append(dict(run=run, asc=R[run]['ascension'], floor=floor, supported=bool(asleep and wake and ten), sleep=asleep[:1], wake=wake[:1], strength10=ten[:1], observed_turns=sorted({s['turn'] for s in frames})))
    for line in (P / 'decisions.jsonl').open():
        d = json.loads(line)
        if not d.get('chosen') or not str(d.get('result', '')).startswith('completed'):
            continue
        before = SM[d['ts']]
        after = S[min(bisect.bisect_right(stamps, d['ts']), len(S) - 1)]['state']
        b = (before.get('combat') or {}).get('player') or {}
        a = (after.get('combat') or {}).get('player') or {}
        meta = dict(run=run, asc=R[run]['ascension'], floor=d['floor'], turn=d['turn'], attempt=d.get('sl_attempt') or 1, ts=d['ts'])
        card = (d.get('expect') or {}).get('card', {}).get('id')
        played = next((c for c in (before.get('combat') or {}).get('hand', []) if c['card_id'] == card), {})
        if d['chosen']['action'] == 'play_card':
            bp, ap = powers(b), powers(a)
            relics = {r['relic_id'] for r in before['run'].get('relics', [])}
            if 'RAINBOW_RING' in relics and ap.get('STRENGTH_POWER', 0) - bp.get('STRENGTH_POWER', 0) == 1 and ap.get('DEXTERITY_POWER', 0) - bp.get('DEXTERITY_POWER', 0) == 1:
                facts['rainbow'].append(dict(meta, card=card, before=bp, after=ap, relics=sorted(relics), description=next(r['description'] for r in before['run']['relics'] if r['relic_id'] == 'RAINBOW_RING')))
            if card == 'OFFERING' or (card == 'BODY_SLAM' and '失去' in played.get('resolved_rules_text', '')):
                key = 'offering' if card == 'OFFERING' else 'corrupt_body_slam'
                facts[key].append(dict(meta, card=card, text=played.get('resolved_rules_text'), before_hp=before['run']['current_hp'], after_hp=after['run']['current_hp'], before_block=b.get('block'), after_block=a.get('block'), before_energy=b.get('energy'), after_energy=a.get('energy')))
        if d['chosen']['action'] == 'use_potion' and (d.get('expect') or {}).get('potion', {}).get('id') == 'POISON_POTION':
            target = d['chosen']['target_index']
            be = next(e for e in before['combat']['enemies'] if e['index'] == target)
            ae = next(e for e in after['combat']['enemies'] if e['index'] == target)
            bp, ap = powers(be), powers(ae)
            delta = ap.get('POISON_POWER', 0) - bp.get('POISON_POWER', 0)
            artifact = bp.get('ARTIFACT_POWER', 0) - ap.get('ARTIFACT_POWER', 0)
            skull = any(r['relic_id'] == 'SNECKO_SKULL' for r in before['run'].get('relics', []))
            assert be['current_hp'] == ae['current_hp'], meta
            assert (delta == 0 and artifact == 1) or delta == (7 if skull else 6), (meta, delta, artifact, skull)
            facts['poison_potion'].append(dict(meta, delta=delta, artifact_consumed=artifact, skull=skull, immediate_hp_change=0))
    if run in ['QHK1XQ928TTM', 'UZ1T7AH49WMB', '7BNC8QX746YP']:
        for line in (P / 'brain.jsonl').open():
            d = json.loads(line)
            assert d['engine'] == 'codex'
            quotes.append(dict(run=run, ts=d['ts'], label=d['label'], knowledge=d.get('knowledge'), answer=d.get('answer')))

for key in facts:
    (O / ('history-' + key + '.json')).write_text(json.dumps(facts[key], ensure_ascii=False, indent=2) + '\n')
(O / 'brain-answers.json').write_text(json.dumps(quotes, ensure_ascii=False, indent=2) + '\n')
other = []
for p in Path('knowledge/characters/silent').glob('*'):
    if p.name == 'experience.json' or not p.is_file():
        continue
    data = json.load(p.open())
    other.append(dict(file=str(p), sha256=hashlib.sha256(p.read_bytes()).hexdigest(), keys=list(data), generated=data.get('generated') or data.get('generated_at'), bytes=p.stat().st_size))
(O / 'other-knowledge.json').write_text(json.dumps(other, ensure_ascii=False, indent=2) + '\n')
print('历史机制：', {k: dict(rows=len(v), runs=len({r['run'] for r in v})) for k, v in facts.items()})
