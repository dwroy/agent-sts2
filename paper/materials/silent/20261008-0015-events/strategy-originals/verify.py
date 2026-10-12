import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
batch = json.loads((HERE / 'batch.json').read_text())
runs = set(batch['runs'])
metadata = {}
for line in (ROOT / 'logs/runs.jsonl').open():
    row = json.loads(line)
    if row.get('run_id') in runs:
        assert row['character'] == 'SILENT' and row['ascension'] == 10
        metadata[row['run_id']] = row
assert set(metadata) == runs
(HERE / 'run-metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')

frames = {r: [] for r in runs}
by_line = {}
handles = {r: (HERE / (r + '-states.jsonl')).open('w') for r in runs}
for line in (HERE / 'states.numbered.jsonl').open():
    number, raw = line.split(':', 1)
    row = json.loads(raw)
    state = row['state']
    run = state.get('run_id')
    if run not in runs:
        continue
    assert state['run']['character_id'] == 'SILENT'
    assert state['run']['ascension'] == 10
    handles[run].write(raw)
    frames[run].append((int(number), row))
    by_line[int(number)] = row
for handle in handles.values():
    handle.close()

decisions = {}
for line in (HERE / 'decisions.numbered.jsonl').open():
    number, raw = line.split(':', 1)
    row = json.loads(raw)
    if row.get('run_id') in runs:
        decisions[int(number)] = row

manifest = {}
for run, rows in frames.items():
    path = HERE / (run + '-states.jsonl')
    manifest[run] = {'frames': len(rows), 'first_line': rows[0][0], 'last_line': rows[-1][0],
                     'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
old_manifest = json.loads((HERE.parent / '20261007-223545-strategy-proposal/evidence-manifest.json').read_text())
for run, old in old_manifest.items():
    assert manifest[run]['sha256'] == old['sha256'], run

def summary(number):
    row = by_line[number]
    state = row['state']
    combat = state.get('combat') or {}
    return {'line': number, 'run': state['run_id'], 'floor': state['run']['floor'],
            'turn': state['turn'], 'observed_ts': row['observed_ts'],
            'player': combat.get('player'), 'hand': combat.get('hand'), 'enemies': combat.get('enemies'),
            'draw': ((state.get('agent_view') or {}).get('combat') or {}).get('draw')}

def hand(number):
    return by_line[number]['state']['combat']['hand']

def power_values(card):
    return {v['name']: v['current_value'] for v in card.get('dynamic_values', [])}

def card(number, ident):
    return next(c for c in hand(number) if c['card_id'] == ident)

assert by_line[275679]['state']['combat']['player']['energy'] - by_line[275680]['state']['combat']['player']['energy'] == 2
assert power_values(card(275679, 'SUCKER_PUNCH'))['Damage'] == 9
assert power_values(card(275680, 'SUCKER_PUNCH'))['Damage'] == 11
assert power_values(card(275679, 'PIERCING_WAIL'))['StrengthLoss'] == 6
assert power_values(card(275680, 'PIERCING_WAIL'))['StrengthLoss'] == 8
assert power_values(card(275679, 'FASTEN'))['ExtraBlock'] == 4
assert power_values(card(275680, 'FASTEN'))['ExtraBlock'] == 6
assert by_line[275679]['state']['run']['deck'] == by_line[275680]['state']['run']['deck']
assert decisions[270216]['fingerprint'] == decisions[270282]['fingerprint']
before = frames['5PM6JAQG6FNQ'][641][1]['state']['combat']
after = frames['5PM6JAQG6FNQ'][642][1]['state']['combat']
assert before['player']['energy'] == 5 and after['player']['energy'] == 4
assert before['player']['current_hp'] == after['player']['current_hp'] == 29
assert before['enemies'] == after['enemies']
assert sum(c['card_id'] == 'BUBBLE_BUBBLE' for c in before['hand']) == sum(c['card_id'] == 'BUBBLE_BUBBLE' for c in after['hand']) + 1

vlz = frames['VLZ6CCT8AQ0A']
views = [((r['state'].get('agent_view') or {}).get('combat') or {}) for _, r in vlz]
pile_audit = {
    'frames': len(vlz),
    'frames_with_agent_view_combat_draw': sum('draw' in v for v in views),
    'draw_entries': sum(len(v.get('draw') or []) for v in views),
    'draw_entries_with_dynamic_values': sum('dynamic_values' in e for v in views for e in v.get('draw') or []),
    'draw_entry_keys': sorted({k for v in views for e in v.get('draw') or [] for k in e}),
    'actual_path': 'state.agent_view.combat.draw/discard/exhaust',
    'correction': '牌堆聚合文本存在；不能沿用完全没有牌堆的旧waiting理由。缺口应限于逐卡dynamic_values/实例与未知升级交互的完整复合输入。',
}

selected = []
for number in [275564, 275565, 275679, 275680, 275687, 275688, 275722, 275731, 275732, 275752, 275754]:
    selected.append(summary(number))
for run, floor, turns in [('CA5KE8GFJ9X2', 13, {1, 3, 5}), ('5PM6JAQG6FNQ', 39, {2}),
                           ('61E2QS63Y9WU', 17, {5, 6}), ('61E2QS63Y9WU', 23, {4, 5}),
                           ('DUZUBAJ3A8GP', 30, {5, 6}), ('8JRE1C4H4Z2W', 33, {2, 5, 11})]:
    for number, row in frames[run]:
        state = row['state']
        if state['run']['floor'] == floor and state['turn'] in turns and state.get('combat'):
            selected.append(summary(number))
(HERE / 'selected-state-facts.json').write_text(json.dumps(selected, ensure_ascii=False, indent=2) + '\n')
(HERE / 'selected-decisions.json').write_text(json.dumps({n: decisions[n] for n in [269706, 269707, 269748, 269754, 269770, 270216, 270264, 270282]}, ensure_ascii=False, indent=2) + '\n')
(HERE / 'evidence-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
(HERE / 'pile-audit.json').write_text(json.dumps(pile_audit, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'runs': {r: v['frames'] for r, v in manifest.items()}, 'pile_audit': pile_audit,
                  'source_line_facts': 'pass', 'same_SL_fingerprint': True,
                  'old_four_run_hashes_match': True}, ensure_ascii=False))
