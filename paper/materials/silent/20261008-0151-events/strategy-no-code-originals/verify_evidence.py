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

frames = {run: [] for run in runs}
by_line = {}
digests = {run: hashlib.sha256() for run in runs}
for line in (HERE / 'states.numbered.jsonl').open():
    number, raw = line.split(':', 1)
    row = json.loads(raw)
    state = row['state']
    assert state['run_id'] in runs
    assert state['run']['character_id'] == 'SILENT' and state['run']['ascension'] == 10
    frames[state['run_id']].append((int(number), row))
    by_line[int(number)] = row
    digests[state['run_id']].update(raw.encode())

decisions = {}
for line in (HERE / 'decisions.numbered.jsonl').open():
    number, raw = line.split(':', 1)
    row = json.loads(raw)
    assert row['run_id'] in runs
    decisions[int(number)] = row

previous = json.loads((HERE.parent / '20261008-004303-strategy-proposal/evidence-manifest.json').read_text())
manifest = {}
for run, rows in frames.items():
    manifest[run] = {'frames': len(rows), 'first_line': rows[0][0], 'last_line': rows[-1][0],
                     'sha256': digests[run].hexdigest()}
    assert manifest[run]['sha256'] == previous[run]['sha256'], run

def state(number):
    return by_line[number]['state']

def values(number, ident):
    card = next(c for c in state(number)['combat']['hand'] if c['card_id'] == ident)
    return {v['name']: v['current_value'] for v in card['dynamic_values']}

assert state(275679)['combat']['player']['energy'] == 7
assert state(275680)['combat']['player']['energy'] == 5
assert values(275679, 'SUCKER_PUNCH') == {'Damage': 9, 'WeakPower': 1}
assert values(275680, 'SUCKER_PUNCH') == {'Damage': 11, 'WeakPower': 2}
assert values(275679, 'FASTEN')['ExtraBlock'] == 4
assert values(275680, 'FASTEN')['ExtraBlock'] == 6
assert values(275679, 'PIERCING_WAIL')['StrengthLoss'] == 6
assert values(275680, 'PIERCING_WAIL')['StrengthLoss'] == 8
assert state(275679)['run']['deck'] == state(275680)['run']['deck']
assert decisions[270216]['fingerprint'] == decisions[270282]['fingerprint']
assert state(273506)['combat']['player']['block'] == 3
assert state(273507)['combat']['player']['block'] == 6
assert any(p['power_id'] == 'DEXTERITY_POWER' and p['amount'] == -2
           for p in state(273507)['combat']['player']['powers'])
before = frames['5PM6JAQG6FNQ'][641][1]['state']['combat']
after = frames['5PM6JAQG6FNQ'][642][1]['state']['combat']
assert before['player']['energy'] == 5 and after['player']['energy'] == 4
assert before['player']['current_hp'] == after['player']['current_hp'] == 29
assert before['enemies'] == after['enemies']
assert sum(c['card_id'] == 'BUBBLE_BUBBLE' for c in before['hand']) == sum(c['card_id'] == 'BUBBLE_BUBBLE' for c in after['hand']) + 1
assert state(275018)['combat']['enemies'][0]['intents'][0]['damage'] == 22
assert state(275023)['combat']['player']['current_hp'] == 0

views = [((r['state'].get('agent_view') or {}).get('combat') or {})
         for _, r in frames['VLZ6CCT8AQ0A']]
pile_audit = {
    'frames': len(views),
    'frames_with_draw': sum('draw' in v for v in views),
    'draw_entries': sum(len(v.get('draw') or []) for v in views),
    'draw_entries_with_dynamic_values': sum('dynamic_values' in e for v in views for e in v.get('draw') or []),
    'draw_entry_keys': sorted({k for v in views for e in v.get('draw') or [] for k in e}),
    'conclusion': '牌堆聚合文本存在；未保存逐卡动态值。神化实测手牌转换成立，未知升级与跨抽弃模型传播未完成。',
}
selected_numbers = {275564, 275565, 275679, 275680, 275687, 275688, 275722, 275731, 275732,
                    275752, 275754, 273506, 273507, 273594, 273595, 275013, 275018, 275023}
selected = {n: row for n, row in by_line.items() if n in selected_numbers}
summary = {'runs': {r: m['frames'] for r, m in manifest.items()},
           'states': len(by_line), 'decisions': len(decisions),
           'all_six_raw_hashes_match_previous': True, 'evidence_assertions': '通过',
           'pile_audit': pile_audit}
for name, data in [('run-metadata.json', metadata), ('evidence-manifest.json', manifest),
                   ('selected-states.json', selected), ('evidence-verification.json', summary),
                   ('selected-decisions.json', {n: decisions[n] for n in [269706, 269707, 269748, 269754, 269770, 270216, 270264, 270282]})]:
    (HERE / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False))
