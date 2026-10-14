import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
result = {'kv_pairs': [], 'kv_heal_path': [], 'ken_dexterity': [], 'giant_sl_anchors': []}
for run in ['KV0JHNJCKXLS', 'KEN58SH9SLZ6']:
    inp = json.loads((OUT / (run + '-input.json')).read_text())
    ds = inp['decisions']
    states = inp['states']
    index = {(x['observed_ts'], x['fingerprint']): x for x in states}
    byline = {x['_line']: x for x in states}
    def match(d):
        return index[(d['observed_ts'], d['fingerprint'])]
    def snapshot(x):
        state = x['state']
        player = state['combat']['player']
        return {'state_line': x['_line'], 'turn': state['turn'], 'hp': player['current_hp'],
                'powers': player['powers'], 'enemies': [{k: e.get(k) for k in (
                    'enemy_id', 'current_hp', 'max_hp', 'powers', 'intents')} for e in state['combat']['enemies']]}
    if run == 'KV0JHNJCKXLS':
        for attempt in [4, 5]:
            rows = [x for x in ds if x.get('sl_attempt') == attempt and x['floor'] == 33]
            first = next(x for x in rows if x['turn'] == 5)
            after = next(x for x in rows if x['turn'] == 6)
            a, b = match(first), match(after)
            result['kv_pairs'].append({'attempt': attempt, 'before': snapshot(a), 'after': snapshot(b),
                'source_decisions': [x['_line'] for x in rows if x['turn'] == 5],
                'scope': 'manual_observed_turn_endpoints_not_candidate_attribution',
                'consumer_turn_window': 'unknown:turn_end_unverified'})
        a = next(x for x in ds if x['floor'] == 33 and x.get('sl_attempt') == 6 and x['turn'] == 4)
        b = next(x for x in ds if x['floor'] == 33 and x.get('sl_attempt') == 6 and x['turn'] == 5)
        lo, hi = match(a)['_line'], match(b)['_line']
        result['kv_heal_path'] = [snapshot(byline[n]) for n in range(lo, hi + 1)]
    else:
        for attempt in [4, 6]:
            rows = [x for x in ds if x['floor'] == 17 and x.get('sl_attempt') == attempt]
            found = []
            for d in rows:
                state = match(d)
                dex = next((p['amount'] for p in state['state']['combat']['player']['powers']
                            if p['power_id'] == 'DEXTERITY_POWER'), None)
                if dex is not None:
                    found.append({'attempt': attempt, 'decision_line': d['_line'], 'snapshot': snapshot(state)})
                    break
            result['ken_dexterity'].extend(found)
        d = next(x for x in ds if x['floor'] == 17 and x.get('sl_attempt') == 6 and x['turn'] == 8)
        state = match(d)
        result['ken_t8_defends'] = {'decision_line': d['_line'], 'state_line': state['_line'],
            'cards': [{k: c.get(k) for k in ['card_id', 'resolved_rules_text', 'dynamic_values']}
                for c in state['state']['combat']['hand'] if c['card_id'] == 'DEFEND_SILENT']}
lines = [x for x in json.loads((OUT / 'source-lines.json').read_text()) if x['file'].endswith('/sl-attempts.jsonl')]
raw = (OUT / 'frozen-sl-attempts.jsonl').read_text().splitlines()
assert len(lines) == len(raw)
for provenance, text in zip(lines, raw):
    if provenance['line'] not in [681, 717, 960, 961, 962, 963]:
        continue
    row = json.loads(text)
    result['giant_sl_anchors'].append({'source_line': provenance['line'], 'run_id': row['run_id'],
        'floor': row['floor'], 'attempt': row['attempt'], 'turns': row['turns'],
        'anchor': row.get('explore', {}).get('target', {}).get('anchor')})
(OUT / 'evidence-supplement.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
for row in result['kv_pairs']:
    a, b = row['before'], row['after']
    print('KV T5', row['attempt'], 'state lines', a['state_line'], b['state_line'],
          'HP', a['hp'], b['hp'], 'enemy', a['enemies'][0]['current_hp'], b['enemies'][0]['current_hp'])
print('KV T4 path', [(x['state_line'], x['enemies'][0]['current_hp']) for x in result['kv_heal_path']])
print('KEN dex', [(x['attempt'], x['decision_line'], x['snapshot']['state_line'], x['snapshot']['turn']) for x in result['ken_dexterity']])
print('KEN T8 defends', result['ken_t8_defends'])
print('giant anchors', result['giant_sl_anchors'])
