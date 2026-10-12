import json
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
C = json.load(open(O / 'changes.json'))
M = json.load(open(O / 'ledger-map.json'))
L = json.load(open(O / 'ledger-all.json'))
L = L if isinstance(L, dict) else {e['id']: e for e in L}
calls = []

def cli(script, args, data):
    subprocess.run(['date'], stdout=subprocess.DEVNULL, check=True)
    p = subprocess.run(['nice', '-n', '19', 'python3', str(ROOT / 'learner' / script), *args], input=json.dumps(data, ensure_ascii=False), text=True, capture_output=True)
    calls.append(dict(script=script, args=args, data=data, stdout=p.stdout, stderr=p.stderr, exit=p.returncode))
    (O / 'registration-cli.json').write_text(json.dumps(calls, ensure_ascii=False, indent=2) + '\n')
    assert p.returncode == 0, p.stderr
    return p.stdout.strip()

for ident in dict.fromkeys(i for ids in M.values() for i in ids):
    es = [c for c in C if ident in M[c['id']]]
    evidence = []
    for c in es:
        old = c['before']['evidence'] if c['before'] else []
        for run in c['after']['evidence']:
            if run not in old and not any(e['run'] == run for e in L[ident]['evidence'] + evidence):
                evidence.append(dict(run=run, role='support', note='第138次经验更新按本角色原帧核验；' + c['after']['lesson'].split('典型案例：')[1][:350]))
    data = dict(id=ident, by='learner:experience-update', where=dict(experience=[c['id'] for c in es]), note='第138次经验提案预关联；保留旧claim、first_run、prior及状态历史。1258条新局原始偏移/SHA核验、175局基线复算全等，提交后登记proposed。')
    if evidence:
        data['evidence'] = evidence
    cli('ledger.py', ['update'], data)

resources = ['silent-route-hp-observation', 'silent-rest-buffer-observation', 'silent-deck-burst-observation']
bosses = ['silent-ceremonial-beast-threshold-growth-sl', 'silent-ceremonial-beast-ringing-one-card', 'silent-byrdonis-strength-multihit-observation', 'silent-bygone-effigy-wake-strength', 'silent-jaxfruit-strength-vulnerable-observation']
mechanisms = [c['id'] for c in C if c['id'] not in resources + bosses]
groups = {
    'resources': (resources, ['combat', 'potion', 'terminal', 'structure'], '赢战血药成本、随机能力与未来路线资源的跨战一致性',
        '旧行为：地图执行既有route-follow；run_plan的avoid不是已发生换线，随机能力药/技能药被实饮后退出不成为常驻卡组。新行为提案：独立strategy-proposal固定节点输入，分别核实际与预测血药、药产本场能力和下一场常驻牌组；路线投影不预支未来营火或尚未建立能力。N8A2W8LH39N0 F7/9/11实回20/21/21，雕像70→1、异鸟43→2；F13买两药，F14实饮并建立毒雾，零净损胜却耗完药，F15仍2血空药死。HXCY44VD9QWU F8/F15赢耗49/32，两HEAL各21，boss入口29血空药六败。没有替线、保药、另一随机选项或升级整战胜果，不据本批拟新药水门槛/终局权重或声称原路线必错。'),
    'boss-sl': (bosses, ['combat', 'sl', 'terminal'], '仪式兽阈值与昏眩、敌增力及有限重打边界',
        '旧行为：判官结合现场意图/毒阈值，昏眩已有单牌上限；必死才SL，未知抽牌保持未知。新行为提案：独立strategy-proposal以相同入口/同抽前缀对照真实执行及explore/sl_explore覆盖，核跨阈值、力量清除、昏眩首牌后的剩血和剩毒；不把有限全败当全空间必死。HXCY44VD9QWU F17末T6直伤24与9毒共33跨160至157，清8力/横冲、玩家1血不变；T8生存者8挡后余3能量三牌被阻，旧7毒后敌116，17攻需损9，存活至少差9血。六试均29/70空药，前五判死、末实死；完整洗牌后序和另一首牌勝果未控，不定固定首牌。异鸟逐击加力与弱、雕像苏醒十力斩击、果增2力与玩家易伤并存逐源验收，不把每轮意图涨幅全归力或指定未经实盘验证的击杀顺序。'),
    'mechanisms': (mechanisms, ['combat', 'potion', 'structure'], '坚韧两次延迟挡、毒雾轮初与力弱/被动挡的模型验收',
        '旧行为：坚韧之环即时挡进入通用牌模型，但当前card-model/rollout没有TORIC_TOUGHNESS_POWER两次额度接线；普通nextTurnBlock只消耗一次。新行为提案：独立strategy-proposal用N8A2W8LH39N0 F12T7普通牌实5挡、建2次，T8/T9轮初各5、额度1→消失为固定夹具，补已核施放额度与两次轮初消费，载入已建能力状态；先核临时敏捷/脆弱与跨轮额度，未知升级/重放/叠层保持等价，不能用缺挡直接宣称F15可赢。关联原机制silent-0289与纯模型缺口silent-0344，本任务不实现。毒雾F14T2药产建2，T3补2且结2令12→10，T4补到3再蛇咬至10；F15没有此能力。船夹板F15T2轮初14挡不跨入T3；震荡波HX末T3给3弱/3易伤令22→16，T4切割6变9；升级毒药实加7、限牌后被阻不预支施毒。分别核局部前后帧和场末资源，不调未经受控验证的药时/出牌权重。')
}
results = []
for key, (ids, domains, title, body) in groups.items():
    ledger = list(dict.fromkeys(i for ident in ids for i in M[ident]))
    if key == 'mechanisms':
        ledger.append('silent-0344')
    lines = ['# ' + title, '', '角色：silent；新局A10；历史支持/反例及进阶见mechanism-evidence.json。',
        '来源任务：experience-update/20261009-200936；实现任务：独立strategy-proposal。', '账本：' + ','.join(ledger) + '。', '', body, '',
        '| 条目 | 支持/反例 | 适用进阶 | 结论与真实案例 |', '| --- | --- | --- | --- |']
    for c in C:
        if c['id'] in ids:
            e = c['after']; lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]} | {e["asc"]} | {e["lesson"]} |')
    lines += ['', '## 拟合、样本与时间切分', '',
        '全引擎silent学习观察截至2026-10-09T11:32:24.602Z，177完局；旧175局七数组、血档、下一战、营火与SL复算全等。旧局只进数字和历史机制验证，不是纯Codex爬塔战绩。主题证据局不冒作每句公式独立样本；未拟新阈值或权重。后续新完局作为时间外验证。', '',
        '## 验证、预期影响与限制', '',
        '1258条原始偏移/SHA核实，固定原帧验证阈值清力/一牌上限/两次延迟挡/施毒与跨战能力；按原沙箱入口tsc+vitest，不运行boss模拟池。预期使候选预测和真实执行资源一致，不保证旧局翻胜。',
        '缺完整运行dirty源码、SL前五出口、部分末击/过量、洗牌后的同抽顺序、未选药时/路线/构筑/休息/首牌的整场受控反事实；缺证保留原行为，不用预训练知识补机制。', '',
        '## 回退与授权', '',
        '本任务只保存经验和提案，全部pending，未标implemented/shipped；独立实现只改silent已观察条件，无关角色/未观察进阶保持等价。实现后必须以实际live祖先源码commit验收，规则上线先date、decision-log/eval唯一版本及Roy双通知。回退独立源码commit或本经验commit，保留并行知识刷新和失败历史。Roy-2026-10-07-learning授权仅允许据证学习，不提供游戏事实。']
    path = O / ('proposal-' + key + '.md'); path.write_text('\n'.join(lines) + '\n')
    data = dict(character='silent', ledger=ledger, runs=['HXCY44VD9QWU', 'N8A2W8LH39N0'], source_task='experience-update', target_task='strategy-proposal', domains=domains, summary=title, proposal=str(path), experience=ids, rule_changes=True, authorization='Roy-2026-10-07-learning')
    (O / ('proposal-' + key + '.json')).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    results.append(cli('code_proposals.py', ['add', '--character', 'silent'], data))
(O / 'code-proposals-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
print('三份提案', results)
