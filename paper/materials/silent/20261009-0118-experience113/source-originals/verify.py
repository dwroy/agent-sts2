import bisect
import collections
import json
from pathlib import Path

O = Path(__file__).parent
RUN = 'LY83ZMTFVKJH'
R = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
S = [json.loads(l) for l in (O / RUN / 'states.jsonl').open()]
D = [json.loads(l) for l in (O / RUN / 'decisions.jsonl').open()]
SM = {s['ts']: s['state'] for s in S}
times = [s['ts'] for s in S]
checks = []

def check(label, value, expected):
    assert value == expected, (label, value, expected)
    checks.append(dict(label=label, actual=value, expected=expected))

def powers(e):
    return {p['power_id']: p['amount'] for p in e.get('powers', [])}

def after(d):
    return S[min(bisect.bisect_right(times, d['ts']), len(S) - 1)]['state']

check('角色/进阶', (R[RUN]['character'].lower(), R[RUN]['ascension']), ('silent', 10))
check('状态/决策帧数', (len(S), len(D)), (556, 538))
for s in S:
    check('状态角色', (s['state']['run_id'], s['state']['run']['character_id'].lower()), (RUN, 'silent'))
a = json.load(open(O / RUN / 'analysis.json'))
check('独立房数', len(a['fights']), 11)
check('F21入血/末血/死亡', [(f['hp'], f['last_hp'], f['death']) for f in a['fights'] if f['floor'] == 21], [(61, 0, True)])
terminal = [s['state'] for s in S if s['state']['run']['floor'] == 21 and s['state'].get('combat')]
last_action = next(d for d in reversed(D) if d.get('chosen', {}).get('action') == 'end_turn' and d['floor'] == 21)
t = SM[last_action['ts']]
check('末轮HP/挡/敌本体', (t['run']['current_hp'], t['combat']['player']['block'], t['combat']['enemies'][0]['current_hp']), (1, 9, 4))
check('末轮意图', t['combat']['enemies'][0]['intents'][0]['damage'], 33)
check('末轮完整需损/存活差额', (33 - 9, 33 - 9 + 1 - 1), (24, 24))
for turn, expected in [(7, [8, 2]), (10, [8, 14, 2])]:
    plays = [d for d in D if d.get('chosen', {}).get('action') == 'play_card' and d['floor'] == 21 and d['turn'] == turn]
    plays = plays[next(i for i, d in enumerate(plays) if d['expect']['card']['id'] == 'STRANGLE'):]
    deltas = [SM[d['ts']]['combat']['enemies'][0]['current_hp'] - after(d)['combat']['enemies'][0]['current_hp'] for d in plays]
    check('紧勒T' + str(turn), deltas, expected)
    plan = next(d for d in plays if d['expect']['card']['id'] == 'STRANGLE')
    (O / ('strangle-plan-t' + str(turn) + '.json')).write_text(json.dumps(plan, ensure_ascii=False, indent=2) + '\n')
wail = next(d for d in D if d.get('expect', {}).get('card', {}).get('id') == 'PIERCING_WAIL' and d['floor'] == 21)
wb, wa = SM[wail['ts']]['combat']['enemies'][0], after(wail)['combat']['enemies'][0]
check('尖啸前后力/意图', (powers(wb)['STRENGTH_POWER'], powers(wa)['STRENGTH_POWER'], wb['intents'][0]['damage'], wa['intents'][0]['damage']), (14, 8, 22, 18))
new_turn = next(s['state'] for s in S if s['state']['run']['floor'] == 21 and s['state']['turn'] == 7)
check('次轮恢复力', powers(new_turn['combat']['enemies'][0])['STRENGTH_POWER'], 14)
check('末牌组无手斧/能力', any(c['card_id'] == 'THRUMMING_HATCHET' or c.get('type') == 'Power' for c in S[-1]['state']['run']['deck']), False)
regen = next(d for d in D if d.get('expect', {}).get('potion', {}).get('id') == 'REGEN_POTION')
check('再生实建立', powers(after(regen)['combat']['player'])['REGEN_POWER'], 5)
check('跨幕实回', next(s['state']['run']['current_hp'] for s in S if s['state']['run']['floor'] == 18), 63)

history = []
for run in R:
    d = O / run
    analysis = json.load(open(d / 'analysis.json'))
    floors = [f['floor'] for f in analysis['fights'] if 'LOUSE_PROGENITOR' in f['enemies']]
    if not floors:
        continue
    frames = [json.loads(l)['state'] for l in (d / 'states.jsonl').open()]
    found = []
    for floor in floors:
        ss = [s for s in frames if s['run']['floor'] == floor and s.get('combat')]
        starts = {}
        for s in ss:
            if s['turn'] not in starts:
                e = next((e for e in s['combat']['enemies'] if e['enemy_id'] == 'LOUSE_PROGENITOR'), None)
                if e:
                    starts[s['turn']] = dict(turn=s['turn'], strength=powers(e).get('STRENGTH_POWER', 0), block=e['block'], powers=powers(e), move=e.get('move_id'))
        for turn in [3, 6, 9, 12]:
            if turn not in starts:
                continue
            row = starts[turn]
            expected = (7 if R[run]['ascension'] == 10 else 5) * (turn // 3)
            check(run + '成长T' + str(turn), row['strength'], expected)
            found.append(dict(floor=floor, **row))
    history.append(dict(run=run, asc=R[run]['ascension'], observations=found))
assert all(h['observations'] for h in history)
(O / 'louse-history.json').write_text(json.dumps(history, ensure_ascii=False, indent=2) + '\n')

stolen = []
for run, card, returned in [('PU80F84P6HPN', 'FOOTWORK', False), ('NB8KCF6HRGVF', 'BOUNCING_FLASK', True), (RUN, 'THRUMMING_HATCHET', False)]:
    ss = [json.loads(l)['state'] for l in (O / run / 'states.jsonl').open()]
    combat = [s for s in ss if s.get('combat') and any(e['enemy_id'] == 'THIEVING_HOPPER' for e in s['combat']['enemies'])]
    floor = combat[0]['run']['floor']
    counts = [sum(c['card_id'] == card for c in s['run']['deck']) for s in combat]
    after_fight = [s for s in ss if s['run']['floor'] == floor and not s['in_combat'] and (s['turn'] or 0) >= combat[-1]['turn']][-1]
    restored = sum(c['card_id'] == card for c in after_fight['run']['deck']) == counts[0]
    check(run + '顺走后缺牌', min(counts) < counts[0], True)
    check(run + '战后返还', restored, returned)
    stolen.append(dict(run=run, card=card, floor=floor, before=counts[0], during=min(counts), after=sum(c['card_id'] == card for c in after_fight['run']['deck']), returned=restored))
(O / 'stolen-history.json').write_text(json.dumps(stolen, ensure_ascii=False, indent=2) + '\n')
(O / 'numbers-checked.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2) + '\n')
print('逐帧核验', len(checks), '项；虱虫成长', len(history), '支持局；顺走返还', len(stolen), '支持局')
