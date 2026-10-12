import hashlib
import json
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
batch = json.loads((OUT / 'batch.json').read_text())
selected = set(batch['runs'])
manifest = json.loads(Path('learner/runs/20261007-170245-strategy-proposal/evidence-manifest.json').read_text())
floors = {
    'CA5KE8GFJ9X2': {13}, '61E2QS63Y9WU': {17, 23},
    '5PM6JAQG6FNQ': {33, 39}, 'DUZUBAJ3A8GP': {30},
    'VLZ6CCT8AQ0A': {35, 43, 45}, '8JRE1C4H4Z2W': {17, 33},
}
receipts = {}
frames = {}
with (ROOT / 'logs/states.jsonl').open('rb') as source, (OUT / 'verified-states.jsonl').open('w') as target:
    for run, spec in manifest.items():
        assert run in selected
        source.seek(spec['first'])
        digest = hashlib.sha256()
        rows = []
        while source.tell() <= spec['last']:
            offset = source.tell()
            raw = source.readline()
            row = json.loads(raw)
            state = row['state']
            if state.get('run_id') != run:
                continue
            digest.update(raw)
            rows.append(row)
            if state.get('run', {}).get('floor') in floors[run] or state.get('run', {}).get('current_floor') in floors[run]:
                target.write(json.dumps({'run': run, 'offset': offset, 'sha256': hashlib.sha256(raw).hexdigest(), 'row': row}, ensure_ascii=False) + '\n')
        assert len(rows) == spec['frames'], (run, len(rows))
        assert digest.hexdigest() == spec['sha256'], (run, digest.hexdigest())
        frames[run] = rows
        receipts[run] = {'frames': len(rows), 'sha256': digest.hexdigest(), 'matches_preserved_source': True}

    preserved = ROOT / 'learner/runs/20261007-154302-postmortem'
    vlz = [json.loads(line) for line in (preserved / 'states.jsonl').open()]
    for row in vlz:
        source.seek(row['_offset'])
        raw = source.readline()
        original = json.loads(raw)
        assert original == {k: v for k, v in row.items() if k not in ('_line', '_offset')}
        assert original['state']['run_id'] == 'VLZ6CCT8AQ0A'
        if original['state']['run'].get('floor') in floors['VLZ6CCT8AQ0A']:
            target.write(json.dumps({'run': 'VLZ6CCT8AQ0A', 'line': row['_line'], 'offset': row['_offset'], 'sha256': hashlib.sha256(raw).hexdigest(), 'row': original}, ensure_ascii=False) + '\n')
    frames['VLZ6CCT8AQ0A'] = vlz
    receipts['VLZ6CCT8AQ0A'] = {'frames': len(vlz), 'matches_preserved_source': True}

    eight = ROOT / 'learner/runs/20261007-164302-postmortem'
    expected = {}
    for line in (eight / '8JRE1C4H4Z2W-states-lines.jsonl').open():
        index, raw = line.split(':', 1)
        expected[int(index)] = json.loads(raw)
    source.seek(vlz[-1]['_offset'])
    index = vlz[-1]['_line'] - 1
    rows = []
    while index < max(expected):
        offset = source.tell()
        raw = source.readline()
        index += 1
        if index not in expected:
            continue
        row = json.loads(raw)
        assert row == expected[index], index
        assert row['state']['run_id'] == '8JRE1C4H4Z2W'
        rows.append(row)
        if row['state']['run'].get('floor') in floors['8JRE1C4H4Z2W']:
            target.write(json.dumps({'run': '8JRE1C4H4Z2W', 'line': index, 'offset': offset, 'sha256': hashlib.sha256(raw).hexdigest(), 'row': row}, ensure_ascii=False) + '\n')
    assert len(rows) == len(expected)
    frames['8JRE1C4H4Z2W'] = rows
    receipts['8JRE1C4H4Z2W'] = {'frames': len(rows), 'matches_preserved_source': True}

def powers(entity):
    return {p['power_id']: p['amount'] for p in entity.get('powers', [])}

vlz = {row['_line']: row['state'] for row in frames['VLZ6CCT8AQ0A']}
def energy(state):
    return state['combat']['player']['energy']

assert (energy(vlz[275564]), energy(vlz[275565])) == (7, 5)
for before, after in [(275564, 275565), (275679, 275680)]:
    a = vlz[before]['combat']['hand']
    b = vlz[after]['combat']['hand']
    print('神化逐卡差值', before, after)
    for x in a:
        if x['card_id'] == 'APOTHEOSIS':
            continue
        y = next((c for c in b if c.get('instance_id') == x.get('instance_id') and c['card_id'] == x['card_id']), None)
        if y is None:
            y = next((c for c in b if c['card_id'] == x['card_id']), None)
        if y:
            vars_a = {v['name']: v.get('base_value') for v in x.get('dynamic_values', [])}
            vars_b = {v['name']: v.get('base_value') for v in y.get('dynamic_values', [])}
            print(x['card_id'], x.get('upgraded'), y.get('upgraded'), x.get('energy_cost'), y.get('energy_cost'), vars_a, vars_b)

end = vlz[275755]
assert [e['current_hp'] for e in end['combat']['enemies']] == [21, 80, 77]
assert sum(c['upgraded'] for c in end['run']['deck']) == 4
current = vlz[275754]
attack = sum(i.get('total_damage') or 0 for e in current['combat']['enemies'] for i in e['intents'])
assert (current['run']['current_hp'], current['combat']['player']['block'], attack) == (32, 20, 59)

with (ROOT / 'logs/decisions.jsonl').open('rb') as source:
    decisions = {}
    for row in [json.loads(line) for line in (preserved / 'decisions.jsonl').open()]:
        if row['_line'] not in {269706, 269707, 269748, 269754, 269770}:
            continue
        source.seek(row['_offset'])
        original = json.loads(source.readline())
        assert original == {k: v for k, v in row.items() if k not in ('_line', '_offset')}
        decisions[row['_line']] = original
    (OUT / 'verified-decisions.json').write_text(json.dumps(decisions, ensure_ascii=False, indent=2) + '\n')
first = json.loads(decisions[269706]['questions']['plan']['criteria']['plan1'])
second = json.loads(decisions[269707]['questions']['plan']['criteria']['plan1'])
assert (first['damage_dealt'], first['hp_lost'], second['damage_dealt'], second['hp_lost']) == (43, 14, 51, 13)
assert first['plays'].removeprefix('神化, then ').replace('+', '') == second['plays'].replace('+', '')
print('神化同后续牌序', first['plays'], second['plays'], '43/14 -> 51/13')

for run in ['CA5KE8GFJ9X2', '61E2QS63Y9WU', 'DUZUBAJ3A8GP']:
    seen = set()
    for row in frames[run]:
        state = row['state']
        if state.get('screen') != 'COMBAT' or state.get('run', {}).get('floor') not in floors[run]:
            continue
        combat = state.get('combat') or {}
        signature = (state.get('run', {}).get('floor'), state.get('turn'), json.dumps(combat.get('enemies', []), sort_keys=True))
        if signature in seen:
            continue
        seen.add(signature)
        entities = combat.get('enemies', [])
        print(run, 'F', state['run']['floor'], 'T', state['turn'], 'HP', state['run']['current_hp'], '玩家能力', powers(combat.get('player', {})),
              '敌方', [(e['enemy_id'], e['current_hp'], e.get('move_id'), powers(e), e.get('intents')) for e in entities])

(OUT / 'evidence-verification.json').write_text(json.dumps(receipts, ensure_ascii=False, indent=2) + '\n')
print('六局原始状态核验通过', sum(r['frames'] for r in receipts.values()), '帧')

ca = [r['state'] for r in frames['CA5KE8GFJ9X2'] if r['state'].get('screen') == 'COMBAT' and r['state'].get('run', {}).get('floor') == 13]
for turn, strength, damage in [(1, 0, 11), (3, 4, 15), (5, 8, 19)]:
    current = next(s for s in ca if s['turn'] == turn and not powers(s['combat']['enemies'][0]).get('WEAK_POWER'))
    enemy = current['combat']['enemies'][0]
    assert powers(enemy).get('STRENGTH_POWER', 0) == strength
    assert enemy['intents'][0]['total_damage'] == damage
weakened = next(s for s in ca if s['turn'] == 5 and powers(s['combat']['enemies'][0]).get('WEAK_POWER'))
assert weakened['combat']['enemies'][0]['intents'][0]['total_damage'] == 14
assert any(s['turn'] == 5 and s['run']['current_hp'] == 2 and s['combat']['player']['block'] == 10 for s in ca)

eight_decisions = [json.loads(line) for line in (eight / '8JRE1C4H4Z2W-decisions.jsonl').open()]
vlz_decisions = [json.loads(line) for line in (preserved / 'decisions.jsonl').open()]
eight_expected = {row['_line']: row for row in eight_decisions}
eight_verified = {}
with (ROOT / 'logs/decisions.jsonl').open('rb') as source:
    source.seek(vlz_decisions[-1]['_offset'])
    index = vlz_decisions[-1]['_line'] - 1
    while index < max(eight_expected):
        offset = source.tell()
        raw = source.readline()
        index += 1
        if index not in eight_expected:
            continue
        row = json.loads(raw)
        assert row == {k: v for k, v in eight_expected[index].items() if k != '_line'}, index
        if index in {270216, 270264, 270282, 270394}:
            eight_verified[index] = {'offset': offset, 'sha256': hashlib.sha256(raw).hexdigest(), 'row': row}
assert eight_verified[270216]['row']['fingerprint'] == eight_verified[270282]['row']['fingerprint']
(OUT / 'verified-eight-decisions.json').write_text(json.dumps(eight_verified, ensure_ascii=False, indent=2) + '\n')
resources = json.loads((eight / '8JRE1C4H4Z2W-resources.json').read_text())['combats']
losses = []
dealt = []
for sequence in [13, 15]:
    combat = next(c for c in resources if c['sequence'] == sequence)
    rows = [r for r in frames['8JRE1C4H4Z2W'] if combat['entry']['ts'] <= r['ts'] <= (combat['exit'] or combat['last'])['ts']]
    by_obs = {r['observed_ts']: r for r in rows}
    starts = {}
    for d in eight_decisions:
        if combat['entry']['ts'] <= d['ts'] <= (combat['exit'] or combat['last'])['ts'] and d['label'].startswith('combat/'):
            starts.setdefault(d['turn'], by_obs[d['observed_ts']]['state'])
    a, b = starts[2], starts[3]
    losses.append(a['run']['current_hp'] - b['run']['current_hp'])
    remaining = lambda s: sum(e['current_hp'] for e in s['combat']['enemies'] if e['is_alive'])
    dealt.append(remaining(a) - remaining(b))
assert losses == [3, 15] and dealt == [10, 17]
print('8JRE同盘首/第三试T2', '净损', losses, '净扣', dealt, '六百五十九条原决策相等')
