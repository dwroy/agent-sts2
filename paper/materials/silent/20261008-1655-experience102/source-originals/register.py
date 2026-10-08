import json
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
N = '9DAS5L8YM1CN'
mapping = {
    'silent-strength-weak-observation': ['silent-0012'],
    'silent-abrasive-thorns-dexterity': ['silent-0044'],
    'silent-piercing-wail-temporary-strength': ['silent-0046'],
    'silent-hunter-tender-card-attributes': ['silent-0232'],
    'silent-speed-potion-temporary-dexterity': ['silent-0253'],
    'silent-cunning-potion-shiv-capacity': ['silent-0258'],
    'silent-strangle-following-card-hp-loss': ['silent-0261'],
    'silent-infection-end-turn-block': ['silent-0286'],
    'silent-ceremonial-beast-threshold-growth-sl': ['silent-0133'],
    'silent-letter-opener-third-skill': ['silent-0055'],
    'silent-bubble-bubble-condition': ['silent-0009'],
    'silent-snakebite-retained-poison': ['silent-0220'],
    'silent-act-transition-missing-hp-heal': ['silent-0243'],
    'silent-rest-buffer-observation': ['silent-0020'],
    'silent-route-hp-observation': ['silent-0019'],
    'silent-deck-burst-observation': ['silent-0021'],
}
locations = {
    'silent-0012': (3, 5), 'silent-0044': (22, 6), 'silent-0046': (22, 3),
    'silent-0232': (23, 2), 'silent-0253': (23, 2), 'silent-0258': (22, 3),
    'silent-0261': (21, 1), 'silent-0286': (3, 3), 'silent-0133': (17, 5),
    'silent-0055': (22, 3), 'silent-0009': (22, 3), 'silent-0220': (22, 2),
    'silent-0243': (18, None), 'silent-0020': (16, None),
    'silent-0019': (23, 2), 'silent-0021': (22, 5),
}
groups = {}
for eid, ids in mapping.items():
    for ident in ids:
        groups.setdefault(ident, []).append(eid)

def cli(tool, command, data):
    subprocess.run(['date'], stdout=subprocess.DEVNULL, check=True)
    args = ['nice', '-n', '19', 'python3', str(ROOT / 'learner' / tool), command]
    if tool == 'code_proposals.py':
        args.extend(['--character', 'silent'])
    p = subprocess.run(args, input=json.dumps(data, ensure_ascii=False), text=True, capture_output=True)
    with (O / (tool + '.' + command + '.log')).open('a') as h:
        h.write(p.stdout + p.stderr)
    assert p.returncode == 0, p.stdout + p.stderr
    return p.stdout.strip()

if sys.argv[1] == 'prepare':
    L = {e['id']: e for e in json.load((O / 'ledger-fold.json').open())}
    for ident, eids in groups.items():
        item = dict(id=ident, by='learner:experience-update', where=dict(experience=eids), note='第102批实帧补证关联；首证/prior/claim与原support/repeat和旧上线历史保留，提交后登记proposed。')
        if N not in {e['run'] for e in L[ident]['evidence']}:
            f, t = locations[ident]
            ev = dict(run=N, floor=f, role='support', note='9DAS5L8YM1CN独立实帧支持' + ','.join(eids) + '；完整数字及反事实限制见20261008-160331报告，不以局部收益冒称整场胜因。')
            if t is not None:
                ev['turn'] = t
            item['evidence'] = [ev]
        cli('ledger.py', 'update', item)
    (O / 'ledger-map.json').write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + '\n')
    (O / 'ledger-added.json').write_text('[]\n')
    print('账本预关联', len(groups))
elif sys.argv[1] == 'proposals':
    C = json.load((O / 'changes.json').open())['entries']
    specs = [
        ('modifiers', ['combat', 'potion', 'sl'], [e for e in mapping if e in ['silent-strength-weak-observation', 'silent-abrasive-thorns-dexterity', 'silent-piercing-wail-temporary-strength', 'silent-hunter-tender-card-attributes', 'silent-speed-potion-temporary-dexterity', 'silent-infection-end-turn-block', 'silent-ceremonial-beast-threshold-growth-sl']], '核实力敏/柔嫩、临时敏捷、磨蚀实建与换战撤销、感染持牌血价、横冲160阈值；同线四败不当四独立局或新的SL胜线。'),
        ('cunning', ['combat', 'potion'], ['silent-cunning-potion-shiv-capacity'], '只按已核静默狡诈药水的确定生成与手位容量建模，保留未见组合，不从本局拟提前喝药门槛。'),
        ('card-triggers', ['combat'], ['silent-strangle-following-card-hp-loss', 'silent-letter-opener-third-skill', 'silent-bubble-bubble-condition', 'silent-snakebite-retained-poison'], '核普通紧勒逐牌扣2与轮末清除，开信刀第三技能5群伤、冒泡/蛇咬真实毒与实结分源；只修已观察输出缺口，不承诺挽救末战。'),
        ('resources', ['combat', 'potion', 'sl', 'terminal'], ['silent-act-transition-missing-hp-heal', 'silent-rest-buffer-observation', 'silent-route-hp-observation', 'silent-deck-burst-observation'], '按真实连续战出口血药和增益重建核到营火前的资源，不预支未来营火/未建磨蚀；缺受控整场对照时保留药水持有价、SL和终局权重。'),
    ]
    common = '''来源任务：experience-update / 20261008-160331；实现任务：独立strategy-proposal。角色silent，新局A10；历史各进阶按changes.json及update-summary.json，不以低阶观察充当A10独立策略验证。Roy-2026-10-07-learning提供改规则授权，不提供游戏事实。其他角色、未观察进阶及未知交互保持原行为；本任务只更新经验，不改打法源码，不登记implemented/shipped。

旧行为与已核缺口：运行7f0c04dd+dirty完整源码未保存，当前源码不能冒认实际dirty树。复盘对只读live 2b1a5f6d的定位显示CUNNING_POTION在modelPotion缺效果返回null、只呈现未模拟的直接饮用项；普通STRANGLE_POWER2未进入敌输入及逐牌收尾。F21完整紧勒→生存者→尖啸报24而实28、F22完整紧勒→生存者→中和报8而实12，两次差额均两次额外2；纯bug账本0256/0260旧repeat，不另登记新错。实现前核最新live接线，已有真实祖先实现只记duplicate，不冒造implemented。

证据：9DAS5L8YM1CN A10 F23败，387决策/396实帧/22实际Codex请求/6SL记录，DeepSeek窗0。F3扭动虫问号战69→17，力4/6/8使单击11/13/15；T3两9攻＋一感染3−10挡损11、T5一11攻＋感染3损14。首題短程3轮后0/4完成而估胜约99%，实T8才赢且损52；后轮抽弃/重规划混杂，尾估胜率不是血药保证。

F17仪式兽70→28/T11赢，T5敌169→159跨现场PLOW_POWER160、6力量/横冲撤且当轮眩晕，仍剩159血，低阶150不套本局。F22 T2蛇咬/突然一拳线13伤损22兑现，防御线未实打，不把题面少损5说成通关。T3先防御再饮狡诈，四手添三升级刀，各实打6共18；冒泡6→15毒、尖啸第三技能开信刀各敌5，石虫最后13血被15毒结束，零损过轮。尖啸石虫0→−6力、16→10攻，但攻击者先退出，当轮不把维持HP全部归减力。

F22 T5磨蚀实际付3能量才建1敏/4荆棘；T6防御5+1=6挡丝虫3×2零损，丝虫末14血/7毒并有4荆棘，胜利中间末击缺帧，精确毒/反伤贡献未知。先前拿牌理由称杂技/生存者弃牌免费建磨蚀，但本局没有对应弃磨蚀执行，不能预支联动收益。新战撤能力增益。

F23四试均同2/70及同瓶速度药、同首手；T1回响斩击+配赤牛8活力/弹珠袋易伤实31到95，T2药建5敏而不触发柔嫩，手上技法给12挡后力−1/敏4；两打击5/4、突然一拳5，末力−4/敏1，敌81。19攻击虚弱后14，完整需损14−12=2、严格存活至少差1血，不能叫整场胜利差。前三次判死后读档没有完整退出损血，最后实死；实际3次SL，仅恢复药3次、HP2→2；无赢的那次、无异线完整对照，不能归运气。柔嫩已被正确判死，不报忘记或漏模。

资源：10赢战净损202，初血56＋事件21＋三营火94＋跨幕33−202−末死2=0。F11/13/16各回复36/36/22，F7/9锻造不回血；F17胜28→跨幕61为floor(42×0.8)=33。独立获得5瓶、实际8饮、无购药/弃药；速度药3次SL恢复不计新瓶。癫狂之触动作pending但相邻帧槽1确实消耗，按实饮另计。稳定血清建保留2而非即时回血/格挡。F19后改无精英，投影F21/22/23入口38/28/18，实38/25/2；连续损13/23后末战死，F24枕头回血未到。F16模拟回血70胜率10.81%，实仪式兽赢损42，不把低模拟胜率等同必败。时钟校准为空，不借别的角色补值。

样本/拟合：旧132局是时间前置，本局作冻结后验核验，按局/战分组，多试不当独立局；旧七数组/血档/节点后战/休息/SL复算一致。历史静默复盘及日志用作机制交叉核验，出现或持有不等整条结论支持。能力/药水单项整场因果、早喝狡诈、换弃牌/改路线与完整通关反事实都未记录。没有自由参数拟合；若未来改终局或持有价，先做按局时间留出和同盘完整结局对照，当前不足则保留旧参数并写waiting。

验证：固定实帧逐动作核力敏、柔嫩、药敏不追补、感染耗挡、横冲阶段撤、磨蚀实建/换战撤、确定三刀和容量、普通紧勒两次2、第三技能遗物5与施毒/实结分源。紧勒无后续牌的F12 T1为37伤原预测/实际一致，防止自触发。先核完整弃牌完成时点与轮末清除；未知升级/叠层/重放/挡交互保持未知。通过原沙箱入口、gitleaks、锁内合入后才登记真实实现，不宣称局部模型变准便救回本局。

反例/缺数据：经验原contradicting名单保留，支持/反例分阶在update-summary；末战败不反驳已核局部机制。缺dirty完整源码、前三次末轮完整结算、丝虫毒/反伤末击中间帧、未来营火结果、药水持有价/换线受控整战结局及本角色boss时钟校准。不能用预训练知识补齐。

预期影响：准确呈现已观察机制与血药接续，避免预支未来增益、毒或营火；不承诺胜率。回退：独立策略任务仅逆向其实际源码提交，保留经验/账本/原日志与提案历史。实际改规则上线后先date，按协议双通知Roy旧规则/新行为/证据账本/任务/预期边界/回退；本经验数据提交不冒称策略规则已实现。
'''
    ids = []
    for name, domains, eids, summary in specs:
        ledgers = list(dict.fromkeys(i for eid in eids for i in mapping[eid]))
        if name == 'cunning':
            ledgers.append('silent-0256')
        if name == 'card-triggers':
            ledgers.append('silent-0260')
        path = O / ('proposal-' + name + '.md')
        text = '# 静默猎手经验代码提案：' + summary + '\n\n' + common + '\n新行为及边界：' + summary + '\n\n账本：' + ','.join(ledgers) + '；经验：' + ','.join(eids) + '。\n'
        text += ''.join('\n- ' + c['id'] + '；适用' + str(c['after']['asc']) + '；支持/反例' + str(c['after']['n_support']) + '/' + str(c['after']['n_contradict']) + '；' + c['after']['lesson'] for c in C if c['id'] in eids)
        path.write_text(text + '\n')
        item = dict(character='silent', ledger=ledgers, runs=[N], source_task='experience-update', target_task='strategy-proposal', domains=domains, summary=summary, proposal=str(path.resolve()), experience=eids, rule_changes=True, authorization='Roy-2026-10-07-learning')
        (O / ('proposal-' + name + '.json')).write_text(json.dumps(item, ensure_ascii=False, indent=2) + '\n')
        ids.append(cli('code_proposals.py', 'add', item))
    assert set(mapping) == {eid for _, _, eids, _ in specs for eid in eids}
    (O / 'code-proposal-ids.json').write_text(json.dumps(ids, ensure_ascii=False, indent=2) + '\n')
    print('提案', ids)
elif sys.argv[1] == 'finalize':
    commit = (O / 'source-commit.txt').read_text().strip()
    title = (O / 'changelog-title.txt').read_text().strip()
    for ident, eids in groups.items():
        cli('ledger.py', 'update', dict(id=ident, by='learner:experience-update', status='proposed', where=dict(experience=eids, commits=[commit], changelog=[title]), note='第102批经验提交完成；首证/prior/claim及原证据和旧版本历史保持，实际shipped交运维核live，数据发布不等策略源码实现。'))
    (O / 'ledger-proposed.json').write_text(json.dumps(list(groups), ensure_ascii=False, indent=2) + '\n')
    print('proposed', len(groups))
