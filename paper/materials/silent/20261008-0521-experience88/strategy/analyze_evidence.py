import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
frames = [json.loads(l) for l in (OUT / 'verified-states.jsonl').open()]
decisions = {v['line']: v['row'] for v in json.loads((OUT / 'verified-decisions.json').read_text())}

def hits(frame):
    return sum((i.get('damage') or 0) * (i.get('hits') or 1)
               for e in frame['enemies'] if e['alive']
               for i in e['intents'] if i.get('intent_type') == 'Attack')

def vector(frame):
    return {'hp': frame['hp'], 'block': frame['block'], 'powers': frame['powers'],
            'enemies': [{k: e[k] for k in ('index', 'id', 'hp', 'max_hp', 'block', 'powers', 'move')}
                        | {'intents': e['intents']} for e in frame['enemies']]}

findings = {'pairs': [], 'mechanism_turn_starts': [], 'checks': []}
for a, b in [(270216, 270282), (271309, 271348), (271992, 272040), (271982, 272195)]:
    da, db = decisions[a], decisions[b]
    assert da['fingerprint'] == db['fingerprint']
    pair = {'decisions': [a, b], 'run': da['run_id'], 'floor': da['floor'], 'turn': da['turn'], 'same_fingerprint': True, 'sides': []}
    for d in (da, db):
        at = next(i for i, f in enumerate(frames)
                  if f['run'] == d['run_id'] and f['observed_ts'] == d['observed_ts'] and f['fingerprint'] == d['fingerprint'])
        start = frames[at]
        end = next(f for f in frames[at + 1:]
                   if f['run'] == start['run'] and f['floor'] == start['floor'] and f['turn'] != start['turn'])
        alive_hp = lambda f: sum(e['hp'] for e in f['enemies'] if e['alive'])
        pair['sides'].append({'observed_ts': d['observed_ts'], 'state_offset': start['offset'],
                              'hp': [start['hp'], end['hp']], 'actual_hp_loss': start['hp'] - end['hp'],
                              'actual_enemy_hp_progress': alive_hp(start) - alive_hp(end),
                              'powers_after': end['powers'], 'sl_explore': d.get('sl_explore'),
                              'rationale': d['rationale'], 'chosen': d.get('chosen'), 'result': d['result']})
    findings['pairs'].append(pair)
    print('配对', json.dumps({k: v for k, v in pair.items() if k != 'sides'}, ensure_ascii=False))
    for side in pair['sides']:
        print('实际', json.dumps({k: side[k] for k in ('hp', 'actual_hp_loss', 'actual_enemy_hp_progress', 'powers_after', 'sl_explore')}, ensure_ascii=False))
assert [[s['actual_hp_loss'] for s in p['sides']] for p in findings['pairs']] == [[3, 15], [0, 9], [9, 14], [2, 10]]
assert [[s['actual_enemy_hp_progress'] for s in p['sides']] for p in findings['pairs']] == [[10, 17], [45, 38], [24, 27], [25, 34]]
findings['checks'].append('四组指纹、实际血价与本体净扣逐项复算一致')

targets = [('DUZUBAJ3A8GP', 27), ('5PM6JAQG6FNQ', 38), ('5PM6JAQG6FNQ', 39), ('CA5KE8GFJ9X2', 9), ('CA5KE8GFJ9X2', 13)]
for run, floor in targets:
    last_turn = None
    for f in frames:
        if f['run'] != run or f['floor'] != floor or f['screen'] != 'COMBAT':
            continue
        if f['turn'] == last_turn:
            continue
        last_turn = f['turn']
        item = {'run': run, 'floor': floor, 'turn': f['turn'], 'offset': f['offset'], **vector(f)}
        findings['mechanism_turn_starts'].append(item)
        print('轮初', json.dumps(item, ensure_ascii=False))

for run, floor, turns in [('DUZUBAJ3A8GP', 27, {4, 5}), ('5PM6JAQG6FNQ', 39, {4}), ('CA5KE8GFJ9X2', 9, {1, 2, 4})]:
    last = None
    for f in frames:
        if f['run'] != run or f['floor'] != floor or f['turn'] not in turns:
            continue
        v = vector(f)
        if v == last:
            continue
        last = v
        print('机制逐步', json.dumps({'run': run, 'floor': floor, 'turn': f['turn'], 'offset': f['offset'], **v}, ensure_ascii=False))

(OUT / 'evidence-findings.json').write_text(json.dumps(findings, ensure_ascii=False, indent=2) + '\n')
print('核验通过：四组成对血价与逐步机制状态保存；不拟合规则系数。')
