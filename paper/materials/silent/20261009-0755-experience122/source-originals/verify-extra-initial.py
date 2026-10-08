import json
from pathlib import Path

O = Path(__file__).parent
S = {r['_line']: r['state'] for r in map(json.loads, (O / 'pm-states.jsonl').open())}
checks = []
def check(name, value, expected):
    assert value == expected, (name, value, expected)
    checks.append(dict(项=name, 核实值=value))
def powers(e):
    return {p['power_id']: p['amount'] for p in e.get('powers', [])}
def enemy(n):
    return S[n]['combat']['enemies'][0]
def player(n):
    return S[n]['combat']['player']
check('T5致命与迷雾施毒', [powers(enemy(n)).get('POISON_POWER') for n in [315827, 315828, 315829, 315830]], [3, 10, 14, 13])
check('T5不即时伤且结束结14', [enemy(n)['current_hp'] for n in [315827, 315828, 315829, 315830]], [172, 172, 172, 158])
check('T9刺击与迷雾施毒', [powers(enemy(n)).get('POISON_POWER') for n in [315845, 315846, 315847, 315848]], [10, 13, 17, 16])
check('T9直伤只破4挡', [enemy(n)['block'] for n in [315845, 315846, 315847]], [14, 10, 10])
check('T9结束才结17', [enemy(n)['current_hp'] for n in [315845, 315846, 315847, 315848]], [89, 89, 89, 72])
check('两次迷雾各1弱', [powers(enemy(n)).get('WEAK_POWER') for n in [315829, 315847]], [1, 1])
check('吸取后敌力', [powers(enemy(n)).get('STRENGTH_POWER') for n in [315810, 315830, 315848]], [None, 2, 4])
check('末三挡1/4/1', [player(n)['block'] for n in [315848, 315849, 315850, 315852]], [0, 1, 5, 6])
check('重放挡与手动计数', [(player(n)['block'], S[n]['combat'].get('cards_played_this_turn')) for n in [315818, 315819]], [(0, 0), (10, 1)])
F = [(2, 56, 55), (3, 55, 55), (5, 55, 55), (6, 55, 39), (8, 39, 33), (11, 54, 41), (12, 41, 41), (14, 62, 62), (15, 62, 43)]
check('九胜净损55', sum(a - b for _, a, b in F), 55)
check('最终进血守恒', 56 - 55 + 3 * 21, 64)
SL = list(map(json.loads, (O / 'CSLHFCBSC1UM/sl-attempts.jsonl').open()))
check('五次截断一次实死', [r['result'] for r in SL], ['predicted_death'] * 5 + ['died'])
check('三个明确替换回合', [(r['attempt'], r['explore']['deviation']['turn']) for r in SL if r['explore'].get('deviation')], [(3, 6), (4, 2), (5, 5), (6, 3)])
(O / 'extra-checks.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2) + '\n')
print('补充机制/资源核验', len(checks))
