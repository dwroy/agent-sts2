import bisect
import collections
import json
from pathlib import Path

OUT = Path(__file__).parent


def load(name):
    return json.loads((OUT / name).read_text())


def dump(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


FRAMES = {r: load(r + '.frames.json') for r in load('evidence-extraction-summary.json') if r != 'cunning'}
DECISIONS = {r: load(r + '.decisions.json') for r in FRAMES}
SL = load('sl-attempts.json')


def turn(run, floor, attempt, number):
    record = next(x['row'] for x in SL if x['row']['run_id'] == run and
                  x['row']['floor'] == floor and x['row']['attempt'] == attempt)
    frames = [f for f in FRAMES[run] if f['floor'] == floor and
              record['started_at'] <= f['source']['ts'] <= record['ended_at']]
    start = next(f for f in frames if f['turn'] == number and f['ready'] is True)
    end = next(f for f in frames if f['turn'] == number + 1 and f['ready'] is True)
    decisions = [x for x in DECISIONS[run] if x['row'].get('floor') == floor and
                 x['row'].get('turn') == number and x['row'].get('sl_attempt', 1) == attempt]
    assert any(x['row']['chosen'].get('action') == 'end_turn' for x in decisions)
    end_action = next(x for x in reversed(decisions) if x['row']['chosen'].get('action') == 'end_turn')
    end_board = next(f for f in frames if f['source']['ts'] == end_action['row']['ts'])
    def sandpit(board):
        return next((e['powers']['SANDPIT_POWER'] for e in board['enemies'] if 'SANDPIT_POWER' in e['powers']), None)
    return {'run': run, 'floor': floor, 'turn': number, 'attempt': attempt,
            'hp_start': start['hp'], 'hp_next_turn': end['hp'], 'hp_loss': start['hp'] - end['hp'],
            'enemy_hp_start': sum(e['hp'] for e in start['enemies']),
            'enemy_hp_next_turn': sum(e['hp'] for e in end['enemies']),
            'enemy_net_hp_reduction': sum(e['hp'] for e in start['enemies']) - sum(e['hp'] for e in end['enemies']),
            'alive_next_turn': [e['id'] for e in end['enemies'] if e['alive']],
            'sandpit_start': sandpit(start),
            'sandpit_before_end_turn': sandpit(end_board),
            'sandpit_next_turn': sandpit(end),
            'start': start, 'end': end,
            'overrides': [{k: d['row'].get(k) for k in ['ts', 'label', 'sl_explore', 'guard_override']}
                          for d in decisions if d['row'].get('sl_explore') or d['row'].get('guard_override')],
            'decision_sources': [d['source'] for d in decisions]}


pairs = [turn('TXZ6RVMQA09D', 48, a, 6) for a in [2, 3]]
pairs += [turn('WQZVENQ7DTRP', 33, a, 9) for a in [2, 3]]
pairs += [turn('WQZVENQ7DTRP', 33, a, 7) for a in [2, 6]]
pairs += [turn('NHA2KW0RB7VP', 33, a, 1) for a in [1, 5, 6]]
expected = [(3, 36), (0, 27), (13, 24), (22, 39), (0, 24), (4, 24), (1, 8), (7, 24), (7, 24)]
for row, (hp_loss, enemy_net) in zip(pairs, expected):
    assert (row['hp_loss'], row['enemy_net_hp_reduction']) == (hp_loss, enemy_net), row
assert pairs[2]['start']['fingerprint'] == pairs[3]['start']['fingerprint']
assert pairs[0]['hp_start'] == pairs[1]['hp_start'] == 48
assert pairs[0]['enemy_hp_start'] == pairs[1]['enemy_hp_start'] == 460
assert pairs[6]['hp_start'] == pairs[7]['hp_start'] == pairs[8]['hp_start'] == 30
dump('paired-turn-observations.json', pairs)

resources = {}
for run, floors in {'KEN58SH9SLZ6': [2, 3, 4, 5, 11, 12, 15, 16, 17],
                    'TXZ6RVMQA09D': [43, 45, 46, 48, 49],
                    '1913SE84AXQF': [17, 18, 19, 23, 24, 28, 29, 30, 31],
                    'Q6M2Y34MWKRE': [2, 3, 5, 6, 7, 8, 9]}.items():
    rows = []
    for floor in floors:
        frames = [f for f in FRAMES[run] if f['floor'] == floor]
        if not frames:
            continue
        combat = [f for f in frames if f['screen'] == 'COMBAT']
        rows.append({'floor': floor, 'entry_hp': frames[0]['hp'], 'exit_hp': frames[-1]['hp'],
                     'first_combat_hp': combat[0]['hp'] if combat else None,
                     'entry_max_hp': frames[0]['max_hp'], 'exit_max_hp': frames[-1]['max_hp'],
                     'first_source': frames[0]['source'], 'last_source': frames[-1]['source'],
                     'first_combat_source': combat[0]['source'] if combat else None})
    resources[run] = rows
ken_wins = [r for r in resources['KEN58SH9SLZ6'] if r['floor'] in [2, 3, 4, 5, 11, 15]]
assert [r['first_combat_hp'] - r['exit_hp'] for r in ken_wins] == [0, 3, 0, 37, 6, 0]
for floor, hp in [(12, (26, 53)), (16, (46, 75))]:
    row = next(r for r in resources['KEN58SH9SLZ6'] if r['floor'] == floor)
    assert (row['entry_hp'], row['exit_hp']) == hp
assert next(r for r in resources['Q6M2Y34MWKRE'] if r['floor'] == 8)['exit_hp'] == 2
assert next(r for r in resources['1913SE84AXQF'] if r['floor'] == 31)['first_combat_hp'] == 46
dump('resource-chains.json', resources)

drinks = []
ken_by_ts = {f['source']['ts']: f for f in FRAMES['KEN58SH9SLZ6']}
for x in DECISIONS['KEN58SH9SLZ6']:
    d = x['row']
    if d.get('chosen', {}).get('action') != 'use_potion':
        continue
    f = ken_by_ts[d['ts']]
    drinks.append({'floor': d['floor'], 'turn': d['turn'], 'potion':
                   next(p['id'] for p in f['potions'] if p['index'] == d['chosen']['option_index']),
                   'source': x['source'], 'frame_source': f['source']})
assert len(drinks) == 7
dump('ken-drinks.json', drinks)

lamp_frames = [f for f in FRAMES['NHA2KW0RB7VP'] if f['lamp']]
lamp_serialized = {json.dumps(f['lamp'], sort_keys=True) for f in lamp_frames}
assert len(lamp_serialized) == 1
lamp = {'observed_frames': len(lamp_frames), 'unique_relic_field_values': len(lamp_serialized),
        'relic': lamp_frames[0]['lamp'],
        'limitation': '遗物字段未区分本战首次施用是否已经消耗；不能据这一字段跨动作/SL维护确定状态。'}
dump('lamp-field-observation.json', lamp)
print(json.dumps({'paired_turns': [{k: v for k, v in r.items() if k not in
                    ['start', 'end', 'decision_sources', 'overrides']} for r in pairs],
                  'resources': {k: [{a:b for a,b in v.items() if not a.endswith('source')} for v in vs]
                                for k,vs in resources.items()},
                  'ken_drinks': [{k:v for k,v in d.items() if 'source' not in k} for d in drinks],
                  'lamp': lamp}, ensure_ascii=False, indent=2))
