import json
import re
from pathlib import Path

scratch = Path(__file__).parent
source = Path('/home/dw/Projects/agent-sts2/logs/states.jsonl')
start, end = '2026-10-06T18:04:20.000Z', '2026-10-06T19:08:30.000Z'
rows = []
with source.open('rb') as handle:
    low, high = 0, source.stat().st_size
    while high - low > 200000:
        middle = (low + high) // 2
        handle.seek(middle)
        handle.readline()
        line = handle.readline()
        match = re.search(rb'"ts"\s*:\s*"([^"]+)"', line[:500])
        assert match
        if match[1].decode() < start:
            low = middle
        else:
            high = middle
    handle.seek(low)
    if low:
        handle.readline()
    while True:
        offset = handle.tell()
        line = handle.readline()
        if not line:
            break
        match = re.search(rb'"ts"\s*:\s*"([^"]+)"', line[:500])
        if not match:
            continue
        ts = match[1].decode()
        if ts > end:
            break
        if ts < start:
            continue
        row = json.loads(line)
        if row.get('state', {}).get('run_id') != 'UMVLWER4CD98':
            continue
        assert row['state']['run']['character_id'] == 'SILENT'
        rows.append((offset, row))

print('本局状态数', len(rows), '记录字段', list(rows[0][1]))
print('首帧状态字段', {k: list(v)[:18] for k, v in rows[0][1].items() if isinstance(v, dict)})
scratch.joinpath('umvl-rest-window.json').write_text(json.dumps([
    {'offset': offset, **row} for offset, row in rows
    if 'REST' in str(row.get('screen', '')) or 'REST' in str(row.get('state', {}).get('screen', ''))
], ensure_ascii=False, indent=2) + '\n')
observations = []
boards = {}
for index, (offset, row) in enumerate(rows):
    state = row['state']
    if row['screen'] != 'REST' or not state.get('rest', {}).get('options'):
        continue
    run = state['run']
    floor = run['floor']
    if floor in boards:
        continue
    board = {key: state[key] for key in ['state_version', 'run_id', 'screen', 'session', 'available_actions', 'rest', 'run']}
    # Preserve the rest board and one original card; no historic whole-fight simulation is claimed.
    board['run'] = dict(run)
    board['run']['deck'] = run['deck'][:1]
    boards[floor] = board
    later = next(((at, r) for at, r in rows[index + 1:]
                  if r['state']['run']['current_hp'] != run['current_hp']
                  or r['state']['run']['max_hp'] != run['max_hp']
                  or r['state']['run']['floor'] != floor), None)
    observations.append({'floor': floor, 'turn': None, 'offset': offset, 'ts': row['ts'],
                         'hp_before': run['current_hp'], 'max_before': run['max_hp'],
                         'rest_options': state['rest']['options'],
                         'next': None if later is None else {'offset': later[0], 'ts': later[1]['ts'],
                             'floor': later[1]['state']['run']['floor'],
                             'hp': later[1]['state']['run']['current_hp'],
                             'max': later[1]['state']['run']['max_hp']}})
fixture = {'source': 'UMVLWER4CD98 SILENT A10；silent-0204/0020；营火无战斗回合',
           'observations': observations, 'boards': {str(f): boards[f] for f in [7, 9, 16, 44, 47]}}
scratch.joinpath('rest-evidence.json').write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + '\n')
for item in observations:
    print(json.dumps({k: v for k, v in item.items() if k != 'rest_options'}, ensure_ascii=False))
print('F44回血描述', boards[44]['rest']['options'][0]['description'])
