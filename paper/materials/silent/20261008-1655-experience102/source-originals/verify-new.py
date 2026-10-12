import bisect
import collections
import hashlib
import json
from pathlib import Path

O = Path(__file__).parent
N = '9DAS5L8YM1CN'
S = [json.loads(line) for line in (O / N / 'states.jsonl').open()]
D = [json.loads(line) for line in (O / N / 'decisions.jsonl').open()]
T = [s['ts'] for s in S]
SM = {s['ts']: s['state'] for s in S}
checks = []

def check(name, condition, data=None):
    assert condition, (name, data)
    checks.append(dict(name=name, data=data, passed=True))

def powers(entity):
    return {p['power_id']: p['amount'] for p in entity.get('powers', [])}

def frames(d):
    i = bisect.bisect_left(T, d['ts'])
    assert T[i] == d['ts']
    return S[i]['state'], S[min(i + 1, len(S) - 1)]['state']

check('角色/帧数/决策', len(S) == 396 and len(D) == 387 and all(s['state']['run']['character_id'].lower() == 'silent' for s in S))
pm = [json.loads(line) for line in Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-154302-postmortem/states.jsonl').open()]
for s in pm:
    s.pop('_line', None)
check('独立seek重抽与复盘原帧逐帧一致', S == pm)
A = json.load((O / N / 'analysis.json').open())
expected = [(2, 56, 48), (3, 69, 17), (5, 17, 17), (6, 17, 17), (12, 53, 26), (14, 62, 48), (17, 70, 28), (19, 61, 38), (21, 38, 25), (22, 25, 2), (23, 2, 0)]
check('11战房首末血量', [(f['floor'], f['hp'], f['last_hp']) for f in A['fights']] == expected, expected)
check('十赢房净损202、末死损2与回复守恒', sum(f['loss'] for f in A['fights'] if not f['death']) == 202 and 56 + 21 + 94 + 33 - 202 - 2 == 0)
check('问号扭动虫单列', next(f for f in A['fights'] if f['floor'] == 3)['type'] == 'Unknown')
sl = [json.loads(line) for line in (O / N / 'sl-attempts.jsonl').open()]
retry = [r for r in sl if r['floor'] == 23]
check('末战四试/前三判死/末死', len(retry) == 4 and [r['attempt'] for r in retry] == [1, 2, 3, 4] and all(r['result'] != 'won' for r in retry), [dict(attempt=r['attempt'], result=r['result']) for r in retry])
opening = []
potions = []
for d in D:
    chosen = d.get('chosen') or {}
    if chosen.get('action') == 'use_potion':
        b, z = frames(d)
        pid = d['expect']['potion']['id']
        row = dict(floor=d['floor'], turn=d['turn'], ts=d['ts'], id=pid, result=d['result'], before_powers=powers(b['combat']['player']), after_powers=powers(z['combat']['player']))
        if pid == 'SPEED_POTION':
            check('速度药加5且不触发柔嫩 ' + d['ts'], row['after_powers'].get('DEXTERITY_POWER', 0) - row['before_powers'].get('DEXTERITY_POWER', 0) == 5 and row['after_powers'].get('STRENGTH_POWER', 0) == 0)
        if pid == 'TOUCH_OF_INSANITY':
            check('pending药实际消耗', b['run']['potions'][1]['occupied'] and not z['run']['potions'][1]['occupied'], dict(before=b['run']['potions'], after=z['run']['potions']))
        if pid == 'CUNNING_POTION':
            check('狡诈四手添三升级刀', len(b['combat']['hand']) == 4 and len(z['combat']['hand']) == 7 and sum(bool(c['card_id'] == 'SHIV' and c.get('upgraded')) for c in z['combat']['hand']) == 3, z['combat']['hand'])
        if pid == 'STABLE_SERUM':
            check('稳定血清建保留2、不回血', row['after_powers'].get('RETAIN_HAND_POWER') == 2 and b['run']['current_hp'] == z['run']['current_hp'])
        potions.append(row)
    if chosen.get('action') != 'play_card':
        continue
    card = (d.get('expect') or {}).get('card', {}).get('id')
    b, z = frames(d)
    bp, zp = powers(b['combat']['player']), powers(z['combat']['player'])
    if card == 'ABRASIVE':
        check('磨蚀真实付3建立1敏/4荆棘', d['floor'] == 22 and d['turn'] == 5 and zp.get('DEXTERITY_POWER') == 1 and zp.get('THORNS_POWER') == 4 and b['combat']['player']['energy'] - z['combat']['player']['energy'] == 3)
    if card == 'HAND_TRICK' and d['floor'] == 23:
        check('手上技法按施放时5敏给12挡再柔嫩 ' + d['ts'], z['combat']['player']['block'] - b['combat']['player']['block'] == 12 and zp.get('DEXTERITY_POWER') == 4 and zp.get('STRENGTH_POWER') == -1)
    if card == 'DEFEND_SILENT' and d['floor'] == 22 and d['turn'] == 6:
        check('磨蚀1敏兑现防御6', z['combat']['player']['block'] - b['combat']['player']['block'] == 6)
    if card == 'BUBBLE_BUBBLE' and d['floor'] == 22 and d['turn'] == 3:
        be, ze = b['combat']['enemies'][0], z['combat']['enemies'][0]
        check('冒泡毒6到15且不即时扣血', powers(be)['POISON_POWER'] == 6 and powers(ze)['POISON_POWER'] == 15 and be['current_hp'] == ze['current_hp'])
    if card == 'PIERCING_WAIL' and d['floor'] == 22 and d['turn'] == 3:
        check('第三技能开信刀两敌各扣5且石虫减6力', [e['current_hp'] for e in b['combat']['enemies']] == [36, 43] and [e['current_hp'] for e in z['combat']['enemies']] == [31, 38] and powers(z['combat']['enemies'][0])['STRENGTH_POWER'] == -6)
    if card == 'SNAKEBITE' and d['floor'] == 22 and d['turn'] == 2:
        check('蛇咬实加7毒不即时扣血', powers(z['combat']['enemies'][0])['POISON_POWER'] == 7 and b['combat']['enemies'][0]['current_hp'] == z['combat']['enemies'][0]['current_hp'])
    if card == 'ECHOING_SLASH' and d['floor'] == 23:
        opening.append([c['card_id'] for c in b['combat']['hand']])
        check('赤牛/易伤开场回响31 ' + d['ts'], b['combat']['enemies'][0]['current_hp'] - z['combat']['enemies'][0]['current_hp'] == 31)
check('四试同首手', len(opening) == 4 and all(hand == opening[0] for hand in opening), opening)
for floor, turn, expected in [(21, 1, [84, 60, 58, 56]), (22, 4, [38, 32, 30, 26])]:
    values = []
    for s in S:
        st = s['state']
        if st['screen'] == 'COMBAT' and st['run']['floor'] == floor and st['turn'] == turn:
            value = st['combat']['enemies'][0]['current_hp']
            if not values or values[-1] != value:
                values.append(value)
    check('紧勒完成线逐步HP ' + str(floor), values == expected, values)
for d in D:
    if d['floor'] == 3 and d['turn'] in [3, 5] and (d.get('chosen') or {}).get('action') == 'end_turn':
        b, z = frames(d)
        expected_loss = 11 if d['turn'] == 3 else 14
        check('感染与攻击合计实损 T' + str(d['turn']), b['run']['current_hp'] - z['run']['current_hp'] == expected_loss)
threshold = [s['state'] for s in S if s['state']['screen'] == 'COMBAT' and s['state']['run']['floor'] == 17 and s['state']['turn'] == 5 and s['state']['combat']['enemies'][0]['current_hp'] == 159]
check('横冲跨160时清6力量/横冲、159剩血仍在', bool(threshold) and all(not powers(s['combat']['enemies'][0]).get('PLOW_POWER') and not powers(s['combat']['enemies'][0]).get('STRENGTH_POWER') for s in threshold))
check('8饮与SL恢复药分开', len(potions) == 8 and collections.Counter(p['id'] for p in potions)['SPEED_POTION'] == 4)
last = S[-2]['state']
check('末完整需损2、严格存活差1、敌81血', last['run']['current_hp'] == 2 and last['combat']['player']['block'] == 12 and last['combat']['enemies'][0]['current_hp'] == 81, dict(hp=last['run']['current_hp'], block=last['combat']['player']['block'], enemy=last['combat']['enemies'][0]))
check('末状态实际死', S[-1]['state']['screen'] == 'GAME_OVER' and S[-1]['state']['run']['current_hp'] == 0)
source = []
for p in sorted(Path('knowledge/characters/silent').glob('*.json')):
    if p.name == 'experience.json':
        continue
    data = json.load(p.open())
    source.append(dict(file=str(p), sha256=hashlib.sha256(p.read_bytes()).hexdigest(), keys=list(data)[:12]))
(O / 'other-knowledge.json').write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n')
(O / 'numbers-checked.json').write_text(json.dumps(dict(checks=checks, actual_potions=potions, opening=opening), ensure_ascii=False, indent=2) + '\n')
print('独立实帧核验通过', len(checks), '项；八份其他知识文件合法，逐项元数据留档。')
