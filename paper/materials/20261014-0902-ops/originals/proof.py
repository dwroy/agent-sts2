import hashlib
import json
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')

def load(name):
    rows = [json.loads(x) for x in (OUT / (name + '.jsonl')).open()]
    locs = [json.loads(x) for x in (OUT / (name + '-locators.jsonl')).open()]
    assert len(rows) == len(locs)
    with (ROOT / 'logs' / (name + '.jsonl')).open('rb') as raw_source:
        for row, loc in zip(rows, locs):
            raw_source.seek(loc['offset'])
            raw = raw_source.read(loc['bytes'])
            assert hashlib.sha256(raw).hexdigest() == loc['sha256']
            assert json.loads(raw) == row
            row['_line'] = loc['line']
            row['_offset'] = loc['offset']
            row['_sha256'] = loc['sha256']
    return rows

def powers(entity):
    return {p['power_id']: p['amount'] for p in entity.get('powers', [])}

def card(card):
    return {k: card.get(k) for k in ['index', 'card_id', 'name', 'energy_cost', 'upgraded',
                                    'resolved_rules_text', 'dynamic_values']}

def frame(row):
    raw = row['state']
    combat = raw.get('combat') or {}
    player = combat.get('player') or {}
    return {'line': row['_line'], 'observed_ts': row.get('observed_ts'),
            'fingerprint': row.get('fingerprint'), 'run': raw['run_id'],
            'floor': raw['run']['floor'], 'turn': raw.get('turn'),
            'screen': raw.get('screen'), 'hp': player.get('current_hp', raw['run'].get('current_hp')),
            'energy': player.get('energy'), 'block': player.get('block'), 'powers': powers(player),
            'hand': [card(c) for c in combat.get('hand', [])],
            'enemies': [{'index': e.get('index'), 'id': e.get('enemy_id'), 'hp': e.get('current_hp'),
                         'block': e.get('block'), 'powers': powers(e), 'intents': e.get('intents')}
                        for e in combat.get('enemies', [])]}

data = {name: load(name) for name in ['runs', 'run-config', 'states', 'decisions', 'sl-attempts']}
decisions = data['decisions']
states = data['states']
index = {(r.get('observed_ts'), r.get('fingerprint')): [] for r in states}
for row in states:
    index[(row.get('observed_ts'), row.get('fingerprint'))].append(row)

facts = {'source_verified_rows': {name: len(rows) for name, rows in data.items()},
         'runs': data['runs'], 'missing_decision_identity': [], 'key_decisions': [],
         'key_states': [], 'observed_apotheosis_dispatches': [], 'turn_openings': []}
keys = {269598, 269706, 269707, 269748, 269754, 269755, 269770,
        270216, 270282, 270264, 269993, 270307}
key_frames = {275564, 275565, 275679, 275680, 275687, 275722, 275731, 275732,
              276255, 276259, 276429, 276433, 276434}
for row in decisions:
    if not row.get('decision_id'):
        facts['missing_decision_identity'].append({k: row.get(k) for k in
            ['run_id', '_line', 'observed_ts', 'screen', 'floor', 'turn', 'label']})
    matches = index.get((row.get('observed_ts'), row.get('fingerprint')), [])
    if row['_line'] in keys:
        facts['key_decisions'].append(row)
    chosen = row.get('chosen') or {}
    if chosen.get('action') == 'play_card' and len(matches) == 1:
        hand = (matches[0]['state'].get('combat') or {}).get('hand', [])
        picked = [c for c in hand if c.get('index') == chosen.get('card_index')]
        if len(picked) == 1 and picked[0].get('card_id') == 'APOTHEOSIS':
            facts['observed_apotheosis_dispatches'].append({
                'decision_line': row['_line'], 'state_line': matches[0]['_line'],
                'run': row['run_id'], 'floor': row['floor'], 'turn': row['turn'],
                'dispatch_result': row.get('result'), 'before': frame(matches[0]),
                'scope': 'identified_logged_dispatch_not_persistent_live_cast_tracking'})

wanted = {'VLZ6CCT8AQ0A': {35, 43, 45}, '8JRE1C4H4Z2W': {17, 33},
          'CA5KE8GFJ9X2': {13}, '5PM6JAQG6FNQ': {33, 39},
          '61E2QS63Y9WU': {17, 23}, 'DUZUBAJ3A8GP': {30}}
seen = set()
for row in states:
    raw = row['state']; run = raw['run_id']; floor = raw['run']['floor']
    if row['_line'] in key_frames:
        facts['key_states'].append(frame(row))
    key = (run, floor, raw.get('turn'))
    if floor in wanted[run] and raw.get('screen') == 'COMBAT' and key not in seen:
        seen.add(key)
        facts['turn_openings'].append(frame(row))

(OUT / 'facts.json').write_text(json.dumps(facts, ensure_ascii=False, indent=2) + '\n')
for run in wanted:
    ds = [r for r in decisions if r['run_id'] == run]
    ss = [r for r in states if r['state']['run_id'] == run]
    missing = [r for r in ds if not r.get('decision_id')]
    # Metadata without an actual decision identity cannot enter the existing audit consumer.
    consumer = {'run': next(r for r in data['runs'] if r['run_id'] == run),
                'decisions': [r for r in ds if r.get('decision_id')], 'states': ss}
    (OUT / (run + '-consumer-input.json')).write_text(json.dumps(consumer, ensure_ascii=False) + '\n')
    print(json.dumps({'run': run, 'states': len(ss), 'decisions': len(ds),
                      'excluded_missing_decision_id': len(missing)}, ensure_ascii=False))
print(json.dumps({'source_verified_rows': facts['source_verified_rows'],
                  'apotheosis_dispatches': [(r['run'], r['floor'], r['turn'], r['decision_line'])
                                           for r in facts['observed_apotheosis_dispatches']],
                  'key_states': len(facts['key_states']), 'turn_openings': len(facts['turn_openings'])},
                 ensure_ascii=False))
