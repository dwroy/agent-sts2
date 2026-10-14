import hashlib
import json
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parent
manifest = json.loads((OUT / 'evidence-manifest.json').read_text())
verified = 0
for name, source in manifest['sources'].items():
    with Path(source['path']).open('rb') as original, (OUT / (name + '.jsonl')).open('rb') as frozen:
        for ref in source['rows']:
            original.seek(ref['offset'])
            raw = original.read(ref['length'])
            assert raw == frozen.readline()
            assert hashlib.sha256(raw).hexdigest() == ref['sha256']
            verified += 1
        assert frozen.read() == b''
for filename, ref in manifest['frozen_files'].items():
    raw = (OUT / filename).read_bytes()
    assert len(raw) == ref['bytes'] and hashlib.sha256(raw).hexdigest() == ref['sha256']

inputs = {run: json.loads((OUT / (run + '.input.json')).read_text()) for run in manifest['runs']}
facts = {'verified_raw_rows': verified, 'checks': [], 'first_turns': {}, 'rests': {}, 'mechanism_windows': {}}

def check(name, actual, expected):
    assert actual == expected, (name, actual, expected)
    facts['checks'].append({'name': name, 'actual': actual, 'expected': expected})

def frame_for(run, decision):
    matches = [s for s in inputs[run]['states'] if s['observed_ts'] == decision['observed_ts'] and s['fingerprint'] == decision['fingerprint']]
    assert len(matches) == 1
    return matches[0]

def brief(row):
    state = row['state']; combat = state.get('combat') or {}; player = combat.get('player') or {}
    return {'line': row['_line'], 'screen': state['screen'], 'turn': state['turn'],
            'hp': player.get('current_hp', state['run'].get('current_hp')), 'block': player.get('block'),
            'enemies': [{'id': e['enemy_id'], 'hp': e['current_hp'], 'block': e['block'],
                         'powers': {p['power_id']: p['amount'] for p in e.get('powers', [])}, 'intents': e['intents']}
                        for e in combat.get('enemies', [])]}

for run, expected in [('NHA2KW0RB7VP', [(1, 14, 1, 8), (6, 8, 7, 24)]),
                      ('RC61MFQM63Y6', [(1, 16, 4, 30), (6, 12, 8, 23)])]:
    turns = []
    for attempt, block, hp_loss, enemy_loss in expected:
        decisions = [d for d in inputs[run]['decisions'] if d['floor'] == 33 and d['turn'] == 1 and d.get('sl_attempt') == attempt]
        start = frame_for(run, decisions[0]); end_d = next(d for d in decisions if d['chosen']['action'] == 'end_turn')
        end = frame_for(run, end_d)
        after = next(s for s in inputs[run]['states'] if s['_line'] > end['_line'] and s['state']['turn'] == 2)
        start_b, end_b, after_b = brief(start), brief(end), brief(after)
        check(run + ':T1 block:' + str(attempt), end_b['block'], block)
        check(run + ':T1 net HP:' + str(attempt), start_b['hp'] - after_b['hp'], hp_loss)
        assert [e['id'] for e in start_b['enemies']] == [e['id'] for e in after_b['enemies']]
        check(run + ':T1 net enemy HP:' + str(attempt), sum(e['hp'] for e in start_b['enemies']) - sum(e['hp'] for e in after_b['enemies']), enemy_loss)
        turns.append({'attempt': attempt, 'before': start_b, 'end_request': end_b, 'next_turn': after_b,
                      'decisions': decisions, 'limitation': '整轮观测差值；多次重问和弃牌，不能归因一条原候选或外推整战胜率。'})
    check(run + ':initial fingerprint', turns[0]['decisions'][0]['fingerprint'], turns[1]['decisions'][0]['fingerprint'])
    facts['first_turns'][run] = turns

run = 'P74C04AEPL1F'
decision = next(d for d in inputs[run]['decisions'] if d['_line'] == 278543)
selection = frame_for(run, decision)
check('P74:selection resources', [selection['state']['combat']['player'][k] for k in ['current_hp', 'block', 'energy']], [1, 16, 2])
check('P74:legal candidates', [c['card_id'] for c in selection['state']['selection']['cards']], ['STRANGLE', 'NOXIOUS_FUMES', 'PRECISE_CUT', 'GREED'])
check('P74:actual discard', decision['chosen']['option_index'], 2)
frames = {s['_line']: s for s in inputs[run]['states']}
check('P74:F22 T2 net loss', frames[284739]['state']['combat']['player']['current_hp'] - frames[284744]['state']['combat']['player']['current_hp'], 20)
check('P74:F22 T4 net loss', frames[284749]['state']['combat']['player']['current_hp'] - frames[284754]['state']['combat']['player']['current_hp'], 24)
check('P74:F17 fire net HP', frames[284630]['state']['combat']['enemies'][0]['current_hp'] - frames[284631]['state']['combat']['enemies'][0]['current_hp'], 1)
facts['mechanism_windows'][run] = [brief(frames[line]) for line in [284630, 284631, 284739, 284744, 284749, 284754, 284760, 284816, 284817, 284818, 284821]]

run = 'BTSRF7JL1W1Y'
frames = {s['_line']: s for s in inputs[run]['states']}
check('BTS:T4 entry HP', frames[286170]['state']['combat']['player']['current_hp'], 14)
check('BTS:actual final HP', frames[286174]['state']['combat']['player']['current_hp'], 0)
final = next(d for d in inputs[run]['decisions'] if d['_line'] == 279854)
criteria = {k: json.loads(v) for k, v in final['questions']['plan']['criteria'].items()}
check('BTS:final forecast already includes death', 'dead within 5 turns in 1/4' in criteria['plan2']['rollout'], True)
facts['mechanism_windows'][run] = {'states': [brief(frames[line]) for line in [286163, 286164, 286165, 286166, 286170, 286173, 286174]],
                                  'final_decision': final, 'limitation': '3/4是原模拟样本，非三场实胜；完整逐样本轨迹及同起点替代实战未记录。'}

for run in ['NHA2KW0RB7VP', 'G33HU22H2543', 'RC61MFQM63Y6']:
    rests = []
    for d in inputs[run]['decisions']:
        if d['screen'] != 'REST' or d['chosen']['action'] != 'choose_rest_option':
            continue
        before = frame_for(run, d)
        after_d = next(x for x in inputs[run]['decisions'] if x['_line'] > d['_line'] and x['floor'] == d['floor'])
        after = frame_for(run, after_d)
        rests.append({'floor': d['floor'], 'decision': d['_line'], 'choice': d.get('journal'),
                      'before_line': before['_line'], 'after_line': after['_line'],
                      'hp_before': before['state']['run']['current_hp'], 'hp_after': after['state']['run']['current_hp'],
                      'max_hp_before': before['state']['run']['max_hp'], 'max_hp_after': after['state']['run']['max_hp']})
    facts['rests'][run] = rests
check('RC61:five actual rests', sum('休息:' in str(r['choice']) for r in facts['rests']['RC61MFQM63Y6']), 5)
check('RC61:actual rest HP total', sum(r['hp_after'] - r['hp_before'] for r in facts['rests']['RC61MFQM63Y6']), 105)

for run, floor, expected_lower, expected_added in [('G33HU22H2543', 31, 298, 150), ('P74C04AEPL1F', 22, 156, 42)]:
    resources = json.loads((OUT / (run + '.resources.json')).read_text())
    window = next(w for w in resources['combats'] if w['floor'] == floor)
    audit = window['enemy_hp_audit']
    check(run + ':visible loss lower bound', sum(t['visible_enemy_hp_loss_lower_bound'] for t in audit['turns']), expected_lower)
    check(run + ':observed added HP', sum(t['observed_hp_added'] for t in audit['turns']), expected_added)
    facts['mechanism_windows'][run + ':F' + str(floor)] = {
        'entry': window['entry'], 'exit': window['exit'],
        'visible_loss_lower_bound': expected_lower, 'added_hp': expected_added,
        'gaps': sorted({g for t in audit['turns'] for g in t['gaps']}), 'damage_total': None}

totals = Counter()
for name in ['NHA2KW0RB7VP', 'P74C04AEPL1F-bounded', 'G33HU22H2543', 'RC61MFQM63Y6', 'BTSRF7JL1W1Y']:
    a = json.loads((OUT / (name + '.audit.json')).read_text())
    totals.update(actions=len(a['observed_actions']), segments=len(a['segments']), turns=len(a['observed_turns']))
    totals.update(Counter(x['status'] for x in a['observed_turns']))
facts['consumer_totals'] = dict(totals)
facts['material_checks'] = len(facts['checks'])
(OUT / 'evidence-facts.json').write_text(json.dumps(facts, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'verified_raw_rows': verified, 'material_checks': len(facts['checks']), 'consumer_totals': dict(totals)}, ensure_ascii=False))
