import json
from pathlib import Path

O = Path(__file__).parent
P = O / 'PBUBM0LRTEDD'
S = [json.loads(l) for l in (P / 'states.jsonl').open()]
D = [json.loads(l) for l in (P / 'decisions.jsonl').open()]
checks = []

def ck(label, value):
    assert value, label
    checks.append(label)

def s(n): return S[n - 310396]['state']
def hp(n): return s(n)['run']['current_hp']
def co(n): return s(n)['combat']
def pw(e): return {p['power_id']: p['amount'] for p in e.get('powers', [])}
def hand(n, ident): return next(c for c in co(n)['hand'] if c['card_id'] == ident)
def dv(n, ident, name): return next(x for x in hand(n, ident)['dynamic_values'] if x['name'] == name)
def attack(n): return sum(i.get('total_damage') or 0 for e in co(n)['enemies'] if e['is_alive'] for i in e['intents'])

ck('角色/963帧/934决策', len(S) == 963 and len(D) == 934 and all(x['state']['run_id'] == 'PBUBM0LRTEDD' and x['state']['run']['character_id'].lower() == 'silent' for x in S))
ck('双王实际血交接', [hp(n) for n in [311264, 311265, 311266, 311267]] == [26, 26, 26, 22])
ck('双王实际空药', all(not any(p['occupied'] for p in s(n)['run']['potions']) for n in [311264, 311266, 311267, 311342]))
ck('神化升级版实费1', co(311342)['player']['energy'] - co(311343)['player']['energy'] == 1)
ck('神化升级暗影费1到0', hand(311342, 'SHADOWMELD')['energy_cost'] == 1 and hand(311343, 'SHADOWMELD')['energy_cost'] == 0)
ck('神化升级步法2到3', dv(311342, 'FOOTWORK', 'DexterityPower')['base_value'] == 2 and dv(311343, 'FOOTWORK', 'DexterityPower')['base_value'] == 3)
ck('神化升级后空翻基础5到8', dv(311342, 'BACKFLIP', 'Block')['base_value'] == 5 and dv(311343, 'BACKFLIP', 'Block')['base_value'] == 8)
ck('暗影免费且不补旧挡', co(311343)['player']['energy'] == co(311344)['player']['energy'] == 3 and co(311344)['player']['block'] == 0)
ck('步法建立3敏不补旧挡', pw(co(311345)['player'])['DEXTERITY_POWER'] == 3 and co(311345)['player']['block'] == 0)
ck('技能激怒逐张3力能力不加', [pw(co(n)['enemies'][0]).get('STRENGTH_POWER', 0) for n in range(311342, 311347)] == [0, 3, 6, 6, 9])
ck('弱下意图16/18/21/21/23', [attack(n) for n in range(311342, 311347)] == [16, 18, 21, 21, 23])
ck('后空翻升级敏捷翻倍22挡', co(311346)['player']['block'] == (8 + 3) * 2 == 22)
ck('同线14与22差8而实际只损1', (8 + 3) * 2 - (5 + 2) * 2 == 8 and hp(311346) - hp(311347) == 1)
ck('下一轮暗影撤而敏捷仍3', 'SHADOWMELD_POWER' not in pw(co(311347)['player']) and pw(co(311347)['player'])['DEXTERITY_POWER'] == 3)
ck('九力碎颅弱前25弱后18', attack(311347) == 25 and attack(311348) == 18 and hp(311351) - hp(311352) == 18)
ck('毒雾两能力不加敌力不即时施毒', pw(co(311353)['player'])['NOXIOUS_FUMES_POWER'] == 3 and pw(co(311355)['player'])['NOXIOUS_FUMES_POWER'] == 6 and pw(co(311355)['enemies'][0])['STRENGTH_POWER'] == 9 and 'POISON_POWER' not in pw(co(311353)['enemies'][0]))
ck('带毒刺击基础4加头骨到5毒', dv(311353, 'POISONED_STAB', 'PoisonPower')['base_value'] == 4 and pw(co(311354)['enemies'][0])['POISON_POWER'] == 5)
ck('防御加激怒9到12并34到38攻', pw(co(311357)['enemies'][0])['STRENGTH_POWER'] == 12 and attack(311356) == 34 and attack(311357) == 38)
ck('末次真实完整血价27缺25血存活', hp(311357) == 3 and co(311357)['player']['block'] == 11 and attack(311357) - 11 == 27 and 28 - 3 == 25 and hp(311358) == 0)
ck('末次毒结5残4第一阶段余57', co(311357)['enemies'][0]['current_hp'] - co(311358)['enemies'][0]['current_hp'] == 5 and pw(co(311358)['enemies'][0])['POISON_POWER'] == 4 and co(311358)['enemies'][0]['current_hp'] == 57)
ck('SL第四试少挡完整T1损18', hp(311317) == 22 and hp(311324) == 4)
ck('SL第三试T1损1并清9', hp(311300) == 22 and hp(311306) == 21 and co(311306)['enemies'][0]['current_hp'] == 102)
for a, b in [(311282, 311283), (311299, 311300), (311316, 311317), (311324, 311325), (311341, 311342)]:
    ck('实验体恢复原22空药 ' + str(a), hp(b) == 22 and not any(p['occupied'] for p in s(b)['run']['potions']))
for a, b in [(311201, 311202), (311227, 311228)]:
    ck('女王恢复原110两药 ' + str(a), hp(b) == 110 and sum(p['occupied'] for p in s(b)['run']['potions']) == 2)
ck('营火满血回血也增5上限', hp(311108) == 109 and s(311108)['run']['max_hp'] == 109 and hp(311169) == 114 and s(311169)['run']['max_hp'] == 114)
ck('全脑48记录Codex且推理0', len(list((P / 'brain.jsonl').open())) == 48 and all(json.loads(l)['engine'] == 'codex' for l in (P / 'brain.jsonl').open()) and (P / 'deepseek-reasoning.jsonl').stat().st_size == 0)
ck('探索原话被替换成仅步法及强制结束', 'playing 灵动步法+ instead of' in D[303505 - 302612]['rationale'] and 'playing end turn instead of' in D[303506 - 302612]['rationale'])
(O / 'verified.json').write_text(json.dumps(dict(checks=len(checks), passed=checks), ensure_ascii=False, indent=2) + '\n')
print('原始实帧核验通过', len(checks))
