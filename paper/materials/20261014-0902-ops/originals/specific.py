import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
data = {}
for name in ['states', 'decisions']:
    rows = [json.loads(x) for x in (OUT / (name + '.jsonl')).open()]
    locs = [json.loads(x) for x in (OUT / (name + '-locators.jsonl')).open()]
    for row, loc in zip(rows, locs):
        row['_line'] = loc['line']
    data[name] = rows
index = {}
for row in data['states']:
    index.setdefault((row.get('observed_ts'), row.get('fingerprint')), []).append(row)

def brief(row):
    raw = row['state']; combat = raw.get('combat') or {}; player = combat.get('player') or {}
    powers = lambda obj: {p['power_id']: p['amount'] for p in obj.get('powers', [])}
    return {'state_line': row['_line'], 'hp': player.get('current_hp'), 'block': player.get('block'),
            'energy': player.get('energy'), 'powers': powers(player),
            'enemies': [{'id': e.get('enemy_id'), 'hp': e.get('current_hp'),
                         'block': e.get('block'), 'powers': powers(e),
                         'attack': sum((a.get('damage') or 0) * (a.get('hits') or 1)
                                       for a in e.get('intents', []))}
                        for e in combat.get('enemies', [])]}

out = []
for d in data['decisions']:
    matching = index.get((d.get('observed_ts'), d.get('fingerprint')), [])
    if len(matching) != 1:
        continue
    s = matching[0]; raw = s['state']; combat = raw.get('combat') or {}
    chosen = d.get('chosen') or {}
    cards = [c for c in combat.get('hand', []) if c.get('index') == chosen.get('card_index')]
    cid = cards[0].get('card_id') if chosen.get('action') == 'play_card' and len(cards) == 1 else None
    run = d['run_id']; floor = d.get('floor'); turn = d.get('turn')
    selected = (
        run == 'CA5KE8GFJ9X2' and floor == 13 and chosen.get('action') == 'end_turn'
        or run == '61E2QS63Y9WU' and floor == 17 and turn in [5, 6] and chosen.get('action') == 'end_turn'
        or run == '61E2QS63Y9WU' and floor == 23 and turn in [4, 5] and chosen.get('action') == 'end_turn'
        or run == '5PM6JAQG6FNQ' and floor == 39 and cid == 'BUBBLE_BUBBLE'
        or run == 'DUZUBAJ3A8GP' and floor == 30 and turn in [4, 5, 6] and chosen.get('action') == 'end_turn'
        or run == 'VLZ6CCT8AQ0A' and floor == 45 and turn == 5 and chosen.get('action') == 'end_turn'
        or run == '8JRE1C4H4Z2W' and floor == 33 and turn == 2 and d.get('sl_attempt') in [1, 3]
           and chosen.get('action') == 'end_turn')
    if not selected:
        continue
    # This is only a next observed frame, not an assumed complete action result or a counterfactual.
    later = [x for x in data['states'] if x['state']['run_id'] == run and x['_line'] == s['_line'] + 1]
    out.append({'run': run, 'floor': floor, 'turn': turn, 'attempt': d.get('sl_attempt'),
                'decision_line': d['_line'], 'card': cid, 'chosen': chosen,
                'before': brief(s), 'next_observed_frame': brief(later[0]) if len(later) == 1 else None})
(OUT / 'proposal-specific-facts.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
for x in out:
    b = x['before']; a = x['next_observed_frame'] or {}
    print(json.dumps({'run': x['run'], 'floor': x['floor'], 'turn': x['turn'], 'attempt': x['attempt'],
                      'decision': x['decision_line'], 'card': x['card'], 'state': b['state_line'],
                      'hp': [b['hp'], a.get('hp')], 'energy': [b['energy'], a.get('energy')],
                      'powers': b['powers'], 'enemies': b['enemies']}, ensure_ascii=False))
