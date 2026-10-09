import hashlib
import json
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
RUNS = set(json.loads((OUT / 'batch.json').read_text())['runs'])
registered = {r['run_id']: r for r in map(json.loads, (ROOT / 'logs/runs.jsonl').open()) if r['run_id'] in RUNS}
assert set(registered) == RUNS
assert all(r['character'] == 'SILENT' and r['ascension'] == 10 for r in registered.values())
(OUT / 'runs-verified.json').write_text(json.dumps(registered, ensure_ascii=False, indent=2) + '\n')

proof = []
vlz = {}
with (ROOT / 'logs/states.jsonl').open('rb') as raw:
    preserved = ROOT / 'learner/runs/20261007-154302-postmortem/states.jsonl'
    for line in preserved.open():
        row = json.loads(line)
        raw.seek(row['_offset'])
        original_bytes = raw.readline()
        original = json.loads(original_bytes)
        assert original == {k: v for k, v in row.items() if k not in ('_line', '_offset')}
        state = original['state']
        assert state['run_id'] == 'VLZ6CCT8AQ0A'
        assert state['run']['character_id'] == 'SILENT' and state['run']['ascension'] == 10
        vlz[row['_line']] = original
        proof.append(dict(source='states.jsonl', run=state['run_id'], line=row['_line'], offset=row['_offset'],
                          sha256=hashlib.sha256(original_bytes).hexdigest()))
    preserved = ROOT / '.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/verified-evidence.jsonl'
    for line in preserved.open():
        entry = json.loads(line)
        assert entry['run'] in RUNS
        raw.seek(entry['offset'])
        original_bytes = raw.readline()
        assert hashlib.sha256(original_bytes).hexdigest() == entry['sha256']
        original = json.loads(original_bytes)
        assert original == entry['row']
        assert original['state']['run']['character_id'] == 'SILENT'
        proof.append(dict(source='states.jsonl', run=entry['run'], offset=entry['offset'], sha256=entry['sha256']))

decision_rows = {}
with (ROOT / 'logs/decisions.jsonl').open('rb') as raw:
    for directory, filename in [('20261007-154302-postmortem', 'decisions.jsonl'),
                                ('20261007-164302-postmortem', '8JRE1C4H4Z2W-decisions.jsonl')]:
        for line in (ROOT / 'learner/runs' / directory / filename).open():
            row = json.loads(line)
            if '_offset' not in row:
                continue
            raw.seek(row['_offset'])
            original_bytes = raw.readline()
            original = json.loads(original_bytes)
            assert original == {k: v for k, v in row.items() if k not in ('_line', '_offset')}
            decision_rows[row['_line']] = original
            proof.append(dict(source='decisions.jsonl', line=row['_line'], offset=row['_offset'],
                              sha256=hashlib.sha256(original_bytes).hexdigest()))

def state(n):
    return vlz[n]['state']

for source, filename, prefixed in [('states.jsonl', '8JRE1C4H4Z2W-states-lines.jsonl', True),
                                    ('decisions.jsonl', '8JRE1C4H4Z2W-decisions.jsonl', False)]:
    preserved = {}
    for line in (ROOT / 'learner/runs/20261007-164302-postmortem' / filename).open():
        if prefixed:
            number, payload = line.split(':', 1)
            row = json.loads(payload)
        else:
            row = json.loads(line)
            number = row.pop('_line')
        preserved[int(number)] = row
    start = max((p for p in proof if p['source'] == source and p.get('line')), key=lambda p: p['line'])
    matched = 0
    with (ROOT / 'logs' / source).open('rb') as raw:
        raw.seek(start['offset'])
        for number in range(start['line'], max(preserved) + 1):
            offset = raw.tell()
            original_bytes = raw.readline()
            if number not in preserved:
                continue
            original = json.loads(original_bytes)
            assert original == preserved[number]
            if source == 'states.jsonl':
                assert original['state']['run_id'] == '8JRE1C4H4Z2W'
                assert original['state']['run']['character_id'] == 'SILENT'
            matched += 1
            proof.append(dict(source=source, run='8JRE1C4H4Z2W', line=number, offset=offset,
                              sha256=hashlib.sha256(original_bytes).hexdigest()))
    assert matched == len(preserved)

def hand(n, card_id):
    return next(c for c in state(n)['combat']['hand'] if c['card_id'] == card_id)

def amount(n, owner, power):
    entity = state(n)['combat']['player'] if owner == 'player' else state(n)['combat']['enemies'][0]
    return next((p['amount'] for p in entity['powers'] if p['power_id'] == power), 0)

plain = hand(275750, 'ACCELERANT')
upgraded = hand(275698, 'ACCELERANT')
assert not plain['upgraded'] and upgraded['upgraded']
assert plain['energy_cost'] == upgraded['energy_cost'] == 1
assert plain['dynamic_values'][0]['base_value'] == 1 and upgraded['dynamic_values'][0]['base_value'] == 2
assert amount(275698, 'player', 'ACCELERANT_POWER') == 0
assert amount(275699, 'player', 'ACCELERANT_POWER') == 2
assert state(275698)['combat']['player']['energy'] - state(275699)['combat']['player']['energy'] == 1
assert amount(275699, 'enemy', 'POISON_POWER') == 12
assert state(275699)['combat']['enemies'][0]['current_hp'] - state(275700)['combat']['enemies'][0]['current_hp'] == 33
assert amount(275705, 'enemy', 'POISON_POWER') == 16
assert state(275705)['combat']['enemies'][0]['current_hp'] - state(275706)['combat']['enemies'][0]['current_hp'] == 45
assert all(not c['upgraded'] for c in state(275679)['run']['deck'] if c['card_id'] == 'ACCELERANT')
fixture = dict(run='VLZ6CCT8AQ0A', ascension=10, ledger=['silent-0237', 'silent-0238', 'silent-0027'],
               source_lines={'plain': 275750, 'upgraded': 275698, 'established': 275699,
                             'after33': 275700, 'before45': 275705, 'after45': 275706},
               plain=plain, upgraded=upgraded,
               turns=[dict(poison=12, hp=177, after=144, damage=33), dict(poison=16, hp=121, after=76, damage=45)])
(OUT / 'accelerant-evidence.json').write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + '\n')
(OUT / 'verified-source-manifest.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'verified_rows': len(proof), 'runs': sorted(RUNS), 'accelerant_pair': [1, 2], 'poison_damage': [33, 45]}, ensure_ascii=False))
