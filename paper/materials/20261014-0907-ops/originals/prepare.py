import collections
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
dispatch = json.loads((OUT / 'dispatch.json').read_text())
identities = {v['row']['run_id']: v['row'] for v in json.loads((OUT / 'run-identities.json').read_text())}
rows = {}
indices = {}
for name in ['decisions', 'states']:
    rows[name] = [json.loads(line) for line in (OUT / (name + '.jsonl')).open()]
    indices[name] = json.loads((OUT / (name + '.jsonl.index.json')).read_text())
anchor_decision = next(row for row, index in zip(rows['decisions'], indices['decisions']) if index['line'] == 271309)
anchors = [index for row, index in zip(rows['states'], indices['states'])
           if row.get('observed_ts') == anchor_decision['observed_ts'] and row.get('fingerprint') == anchor_decision['fingerprint']]
assert len(anchors) == 1
line_start = 277327 - anchors[0]['relative_line']
for name in rows:
    for row, index in zip(rows[name], indices[name]):
        row['_line'] = index['line'] if name == 'decisions' else line_start + index['relative_line']
        index['line'] = row['_line']
    (OUT / (name + '.jsonl.index.json')).write_text(json.dumps(indices[name], ensure_ascii=False, indent=2) + '\n')
floors = {'DUZUBAJ3A8GP': [27], '5PM6JAQG6FNQ': [38, 39], 'CA5KE8GFJ9X2': [13],
          '8JRE1C4H4Z2W': [17, 33], 'YF0LXT1QSTGG': [33, 48], 'XP2SL33HT0D9': [33]}
missing = {}
for run in dispatch['runs']:
    decisions = [row for row in rows['decisions'] if row['run_id'] == run]
    states = [row for row in rows['states'] if row['state']['run_id'] == run]
    missing[run] = [{'line': row['_line'], 'floor': row.get('floor'), 'turn': row.get('turn'),
                     'label': row.get('label'), 'result': row.get('result')}
                    for row in decisions if not row.get('decision_id')]
    full = {'run': identities[run], 'decisions': decisions, 'states': states}
    (OUT / (run + '-full.json')).write_text(json.dumps(full, ensure_ascii=False) + '\n')
    scoped = {'run': identities[run],
              'decisions': [row for row in decisions if row.get('floor') in floors[run] and row.get('decision_id')],
              'states': [row for row in states if row['state'].get('run', {}).get('floor') in floors[run]]}
    (OUT / (run + '-scoped.json')).write_text(json.dumps(scoped, ensure_ascii=False) + '\n')
    print(run, 'missing ids', missing[run], 'scoped decisions/states', len(scoped['decisions']), len(scoped['states']))
(OUT / 'missing-identities.json').write_text(json.dumps(missing, ensure_ascii=False, indent=2) + '\n')
(OUT / 'input-scope.json').write_text(json.dumps({'floors': floors, 'state_line_anchor': {
    'decision_line': 271309, 'state_line': 277327, 'timestamp': anchor_decision['observed_ts'],
    'offset': anchors[0]['offset'], 'sha256': anchors[0]['sha256'], 'start_line_offset': line_start},
    'limitations': ['状态全局行号以原提案277327及同观测时间/指纹锚定；独立身份由原日志byte offset/length/SHA256提供。',
                    'scoped只取原提案关联楼层且decision_id有效的决策，移除处原行号有断点，消费者不会跨缺行联接。',
                    'full原样保留缺失decision_id，不伪造ID。']}, ensure_ascii=False, indent=2) + '\n')


def power(entity):
    return {p['power_id']: p['amount'] for p in entity.get('powers', [])}


def compact(row):
    state = row['state']; combat = state.get('combat') or {}; player = combat.get('player') or {}
    return {'line': row['_line'], 'ts': row.get('observed_ts'), 'floor': state.get('run', {}).get('floor'),
            'turn': state.get('turn'), 'screen': state.get('screen'), 'hp': player.get('current_hp'),
            'block': player.get('block'), 'played': player.get('cards_played_this_turn'),
            'player_powers': power(player),
            'enemies': [{'index': e.get('index'), 'id': e.get('enemy_id'), 'hp': e.get('current_hp'),
                         'max_hp': e.get('max_hp'), 'block': e.get('block'), 'powers': power(e),
                         'move': e.get('move_id'), 'intents': e.get('intents'),
                         'identity_fields': [k for k in e if any(x in k for x in ['instance', 'uuid', 'guid'])]}
                        for e in combat.get('enemies', [])]}


facts = {run: [compact(row) for row in rows['states'] if row['state']['run_id'] == run
               and row['state'].get('run', {}).get('floor') in floors[run] and row['state'].get('combat')]
         for run in dispatch['runs']}
(OUT / 'state-facts.json').write_text(json.dumps(facts, ensure_ascii=False, indent=2) + '\n')
dec = {row['_line']: row for row in rows['decisions']}
pairs = [(270216, 270282), (271309, 271348), (271992, 272040), (271982, 272195)]
checks = []
for a, b in pairs:
    assert dec[a]['fingerprint'] == dec[b]['fingerprint']
    checks.append({'decisions': [a, b], 'run_id': dec[a]['run_id'], 'floor': dec[a]['floor'],
                   'turn': dec[a]['turn'], 'same_fingerprint': True,
                   'attempts': [dec[a].get('sl_attempt'), dec[b].get('sl_attempt')],
                   'answers': [dec[a].get('answers'), dec[b].get('answers')],
                   'choices': [dec[a].get('chosen'), dec[b].get('chosen')]})
(OUT / 'fingerprint-pairs.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2) + '\n')
print('fingerprint pairs', json.dumps(checks, ensure_ascii=False))
