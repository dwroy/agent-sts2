import bisect
import hashlib
import json
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).parent
OLD = OUT.parent / '20261007-203654-strategy-proposal'
HISTORY = ROOT / '.worktrees/exp/learner/runs/20261007-164302-experience-update'
POSTMORTEM = ROOT / 'learner/runs/20261007-154302-postmortem'


def save(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


phase = []
with (ROOT / 'logs/states.jsonl').open('rb') as raw:
    for run, line, offset in [
        ('JMH5C51RLN4E', 243532, 7443348142),
        ('9TG1RP5LFAAK', 244372, 7473583198),
    ]:
        raw.seek(offset)
        for step in range(3):
            start = raw.tell()
            row = json.loads(raw.readline())
            state = row['state']
            assert state['run_id'] == run
            assert state['run']['character_id'] == 'SILENT'
            assert state['run']['ascension'] == 10
            saved = json.loads((OLD / f'state-L{line + step}.json').read_text())
            assert row == saved
            phase.append({'line': line + step, 'offset': start, 'record': row})
save('phase-original-frames.json', phase)

vlz = []
with (ROOT / 'logs/states.jsonl').open('rb') as raw:
    for line in (POSTMORTEM / 'states.jsonl').open():
        saved = json.loads(line)
        assert saved['state']['run_id'] == 'VLZ6CCT8AQ0A'
        raw.seek(saved['_offset'])
        actual = json.loads(raw.readline())
        assert actual == {k: v for k, v in saved.items() if k not in ('_line', '_offset')}
        assert actual['state']['run']['character_id'] == 'SILENT'
        vlz.append(saved)
assert len(vlz) == 729
assert all('piles' not in x['state'] and 'piles' not in (x['state'].get('combat') or {}) for x in vlz)
selected = [x for x in vlz if x['_line'] in {275564, 275565, 275679, 275680, 275687, 275722, 275732}]
save('apotheosis-original-frames.json', selected)
by_line = {x['_line']: x['state'] for x in selected}
before, after = by_line[275679], by_line[275680]
assert before['combat']['player']['energy'] - after['combat']['player']['energy'] == 2
assert before['run']['deck'] == after['run']['deck']
changes = []
for old, new in zip(before['combat']['hand'][1:], after['combat']['hand']):
    assert old['card_id'] == new['card_id']
    if old['card_id'] == 'ASCENDERS_BANE':
        continue
    assert not old['upgraded'] and new['upgraded']
    changes.append({'card': old['card_id'], 'before': old['dynamic_values'], 'after': new['dynamic_values']})
save('apotheosis-verification.json', {'run': 'VLZ6CCT8AQ0A', 'state_frames_verified_against_raw': len(vlz),
    'piles_fields_present': 0, 'energy_spent': 2, 'permanent_deck_unchanged': True, 'changes': changes})

history = json.loads((OLD / 'cure-history.json').read_text())
assert len(history) == 14 and len({x['run'] for x in history}) == 8
uses = []
for run in dict.fromkeys(x['run'] for x in history):
    states = [json.loads(line) for line in (HISTORY / run / 'states.jsonl').open()]
    assert all(x['state']['run_id'] == run and x['state']['run']['character_id'] == 'SILENT' for x in states)
    times = [x['ts'] for x in states]
    by_ts = {x['ts']: x for x in states}
    decisions = [json.loads(line) for line in (HISTORY / run / 'decisions.jsonl').open() if 'CURE_ALL' in line]
    for expected in [x for x in history if x['run'] == run]:
        decision = next(x for x in decisions if x['ts'] == expected['ts'] and
            (x.get('expect') or {}).get('potion', {}).get('id') == 'CURE_ALL' and
            x.get('chosen', {}).get('action') == 'use_potion' and str(x.get('result', '')).startswith('completed'))
        a = by_ts[decision['ts']]
        b = states[bisect.bisect_right(times, decision['ts'])]
        player_a, player_b = a['state']['combat']['player'], b['state']['combat']['player']
        hp = b['state']['run']['current_hp'] - a['state']['run']['current_hp']
        energy = player_b['energy'] - player_a['energy']
        cards = len(b['state']['combat']['hand']) - len(a['state']['combat']['hand'])
        assert (hp, energy, cards) == (0, 1, 2)
        uses.append({'run': run, 'floor': decision['floor'], 'turn': decision['turn'], 'ts': decision['ts'],
            'hp_gain': hp, 'energy_gain': energy, 'draw': cards,
            'before_ts': a['ts'], 'after_ts': b['ts']})
save('cure-history-verified.json', uses)

manifest = []
for path in [OLD / 'cure-history.json', POSTMORTEM / 'states.jsonl']:
    manifest.append({'path': str(path), 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
save('verification-sources.json', manifest)
print(json.dumps({'phase_raw_frames': len(phase), 'vlz_raw_frames': len(vlz), 'vlz_piles_fields': 0,
    'cure_uses': len(uses), 'cure_runs': len({x['run'] for x in uses})}, ensure_ascii=False))
