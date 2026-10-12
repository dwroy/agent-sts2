import bisect
import collections
import json
import random
import statistics
from pathlib import Path

OUT = Path(__file__).parent
RUN = 'RC61MFQM63Y6'
S = [json.loads(x) for x in (OUT / 'states.jsonl').open()]
D = [r for x in (OUT / 'decisions.jsonl').open() if (r := json.loads(x)).get('chosen')]
B = [json.loads(x) for x in (OUT / 'brain.jsonl').open()]
SL = [json.loads(x) for x in (OUT / 'sl-attempts.jsonl').open()]
times = [x['observed_ts'] for x in S]

def st(d):
    return S[max(0, bisect.bisect_right(times, d['observed_ts']) - 1)]['state']

def after(d):
    i = bisect.bisect_right(times, d['observed_ts'])
    return S[min(i, len(S) - 1)]['state']

def hp(s):
    return (s.get('combat') or {}).get('player', {}).get('current_hp', s['run']['current_hp'])

def band(ratio):
    return '<25%' if ratio < .25 else '25–40%' if ratio < .4 else '40–60%' if ratio < .6 else '≥60%'

def powers(p):
    return {x['power_id']: x['amount'] for x in p.get('powers', [])}

def brief(s):
    c = s.get('combat') or {}
    p = c.get('player') or {}
    return {'hp': hp(s), 'block': p.get('block'), 'energy': p.get('energy'), 'powers': powers(p),
            'enemies': [{'id': e['enemy_id'], 'hp': e['current_hp'], 'block': e['block'], 'move': e.get('move_id'), 'powers': powers(e), 'intents': e['intents']} for e in c.get('enemies', [])]}

floors = collections.defaultdict(list)
for r in S:
    floors[r['state']['run']['floor']].append(r['state'])
types = {1: 'Ancient', 18: 'Ancient'}
for d in D:
    if d['chosen'].get('action') == 'choose_map_node':
        types[d['floor'] + 1] = d['expect']['node']['type']
fights = []
for f, ss in floors.items():
    combat = [s for s in ss if s['screen'] == 'COMBAT' and s.get('combat')]
    if not combat:
        continue
    a, z = combat[0], combat[-1]
    dead = any((s.get('game_over') or {}).get('is_victory') is not True and (s['run']['current_hp'] == 0 or (s.get('game_over') or {}).get('is_victory') is False) for s in ss if s['screen'] == 'GAME_OVER')
    terminal = next((s for s in ss[ss.index(z) + 1:] if not s['in_combat']), z)
    exit_hp = hp(terminal)
    if terminal['screen']=='GAME_OVER' and (terminal.get('game_over') or {}).get('is_victory') is True:
        exit_hp = hp(z)
    fights.append({'floor': f, 'act': int(a['run']['act_id']) + 1, 'asc': a['run']['ascension'], 'type': types.get(f, 'unclassified'),
                   'hp': hp(a), 'max_hp': a['run']['max_hp'], 'band': band(hp(a) / a['run']['max_hp']), 'last_hp': exit_hp,
                   'loss': hp(a) - exit_hp, 'death': dead, 'turns_final': z['turn'],
                   'enemies': [e['enemy_id'] for e in a['combat']['enemies']]})

bands = []
for act in [1, 2, 3]:
    for room in ['Monster', 'Elite', 'Unknown', 'Boss']:
        for b in ['<25%', '25–40%', '40–60%', '≥60%']:
            rr = [r for r in fights if r['act'] == act and r['type'] == room and r['band'] == b]
            live = [r['loss'] for r in rr if not r['death']]
            bands.append({'act': act, 'room': room, 'band': b, 'n': len(rr), 'deaths': sum(r['death'] for r in rr),
                          'median_loss_win': statistics.median(live) if live else None, 'losses': [r['loss'] for r in rr], 'floors': [r['floor'] for r in rr]})
next_fights = []
for f, ss in floors.items():
    first = ss[0]
    if first['screen'] not in ['REST', 'SHOP', 'EVENT']:
        continue
    target = next((r for r in fights if r['floor'] > f), None)
    if not target:
        continue
    next_fights.append({'floor': f, 'act': int(first['run']['act_id']) + 1, 'origin': types.get(f), 'screen': first['screen'],
                        'entry_hp': hp(first), 'exit_hp': ss[-1]['run']['current_hp'], 'band': band(hp(first) / first['run']['max_hp']),
                        'next_floor': target['floor'], 'next_type': target['type'], 'next_loss': target['loss'], 'next_death': target['death']})

attempts = []
turn_data = {}
for sl in SL:
    floor, att = sl['floor'], sl['attempt']
    rr = [r for r in D if r['floor'] == floor and r['screen'] == 'COMBAT' and (r.get('sl_attempt') or 1) == att]
    groups = collections.defaultdict(list)
    for r in rr:
        groups[r['turn']].append(r)
    direct = []
    for t, dd in groups.items():
        a, z = st(dd[0]), st(dd[-1])
        if dd[-1]['chosen']['action'] != 'end_turn' and dd[-1]['label'] != 'combat/least-loss':
            candidate = after(dd[-1])
            if candidate['run']['floor'] == floor and candidate['turn'] == t:
                z = candidate
        eh = lambda s: sum(e['current_hp'] for e in (s.get('combat') or {}).get('enemies', []) if e['current_hp'] < 1000000)
        direct.append(eh(a) - eh(z))
        turn_data[f'{floor}/{att}/{t}'] = {'start': brief(a), 'end': brief(z), 'direct': direct[-1],
                                         'plays': [r['expect'].get('card', {}).get('id') for r in dd if r['chosen']['action'] == 'play_card']}
    z = st(rr[-1]) if rr else next(s for s in floors[floor] if s.get('combat')) if rr else next(s for s in floors[floor] if s.get('combat')) if rr else next(s for s in floors[floor] if s.get('combat')) if rr else next(s for s in floors[floor] if s.get('combat'))
    explore = sl.get('explore') or {}
    attempts.append({'floor': floor, 'attempt': att, 'result': sl['result'], 'turns': sl.get('turns'), 'direct_damage': direct,
                     'terminal': brief(z), 'reload': sl.get('reload'), 'explore': explore, 'draws': sl.get('draws')})

mechanisms = []
for d in D:
    card = d.get('expect', {}).get('card', {}).get('id')
    if d['chosen']['action'] != 'play_card' or card not in ['FOOTWORK', 'KNIFE_TRAP', 'FINISHER', 'BOUNCING_FLASK', 'SHOCKWAVE', 'FRANTIC_ESCAPE']:
        continue
    a, z = st(d), after(d)
    hand = (a.get('combat') or {}).get('hand', [])
    played = next((c for c in hand if c['card_id'] == card), {})
    mechanisms.append({'floor': d['floor'], 'attempt': d.get('sl_attempt') or 1, 'turn': d['turn'], 'card': card,
                       'text': played.get('resolved_rules_text'), 'dynamic': played.get('dynamic_values'),
                       'before': brief(a), 'after': brief(z)})

data = {'fights': fights, 'bands': bands, 'next_fights': next_fights, 'attempts': attempts, 'mechanisms': mechanisms, 'turns': turn_data,
        'brain': {'count': len(B), 'engines': dict(collections.Counter(r['engine'] for r in B)),
                  'knowledge': [r.get('knowledge') for r in B]},
        'map_moves': [{'floor': r['floor'], 'hp': hp(st(r)), 'choice': r['expect'].get('node'), 'rationale': r['rationale']}
                      for r in D if r['chosen']['action'] == 'choose_map_node']}
(OUT / 'analysis.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print('战斗', json.dumps(fights, ensure_ascii=False))
print('非空血档', json.dumps([r for r in bands if r['n']], ensure_ascii=False))
print('非战斗节点后下一战', json.dumps(next_fights, ensure_ascii=False))
print('SL概况', json.dumps([{k:v for k,v in r.items() if k not in ['explore','draws']} for r in attempts], ensure_ascii=False))
print('大脑', data['brain'])

