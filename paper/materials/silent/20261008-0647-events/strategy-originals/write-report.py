import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
batch = json.loads((OUT / 'batch.json').read_text())
proposals = json.loads((OUT / 'dispatched-proposals.json').read_text())
ledger = json.loads((OUT / 'ledger-selected.json').read_text())
base = 'd27b421b26f134f8a83336d0cf7964c6f0fcc0cd'
when = 'Thu Oct  8 06:21:27 CST 2026'

details = [
    ('89354805ee4d7e77', 'VLZ6CCT8AQ0A F35 T1、F43 T1/T2、F45 T1/T5',
     '普通神化的已观察数值变化成立；缺弱/缩小/费用附魔下的升级传播配对、其余牌的可升级/不可升级真值和后续抽牌完整覆盖验证。当前通用升级实测漏传勒紧与尖啸字段，不能将加固定分或只改upgraded标记登记为整项实现。',
     'F35已升级毒雾保持3毒、进阶之灾未升级；F43施放后仍损57，F45持有但未施放。',
     '冻结已观察普通/升级配对，逐项传递费用、伤害、减益、毒与勒紧；未知保持标记。验同方案、已知及未知抽牌、重复升级、场外牌组不变和角色隔离。'),
    ('f2bfceddb1898dca', 'VLZ6CCT8AQ0A F45 T1/T4/T5',
     '成熟度展示子项已有45161a51实际live祖先；完整预算提案仍缺同盘同总预算/固定种子MC先行与分阶段MC的样本收益曲线和候选稳定性对照，且神化未覆盖。缺另一focus、留药完整实打结果，不能据707ms设新常量。',
     'T4少损线13损/24伤实打；31损/32伤攻击线未实打，全败并列不证明其更好。',
     '维持预算、留药与目标选择；同进程、同总预算对照并记录覆盖缺口及样本数，明确无比较和并列的区别。'),
    ('283a164780d11e69', 'VLZ6CCT8AQ0A F35 T1、F43 T1/T2、F45 T1/T5',
     '与89354805ee4d7e77共享神化缺口，本项补经验链接不构成live源码实现。缺升级后续抽牌及未知牌/修正组合覆盖验证；升级勒紧6的局部实现不能证明神化已传播，保留同一原问题等待补证。',
     '同源一局四次施放不是四个独立样本；未施放的末战不能证明强制施放可赢。',
     '沿神化专项一起核验，不重复修复、写复盘或拟合必打规则。'),
    ('ebbfe3b97548756d', 'VLZ6CCT8AQ0A F43 T1/T2/T3/T4/T5、F45 T3/T4/T5',
     '既有力量/敏捷/毒/勒紧子模型有固定验证，但复合请求还缺升级与持续资源的完整冻结调用链、减层时点和各实体贡献对照。无另一个focus、火堆或未施放能力的同盘整场结果，不能将子模型通过等同整项资源/排序实现。',
     'F45两雾未建立、另两敌无毒；减力后仍59攻击，全部敌未退场，资源已有回复仍败。',
     '分列已持有、已建立与未来投影；逐源冻结F43/F45状态及当前进阶数据，再验复合输出，不拟路线/保血硬阈值。'),
    ('e5b87be50f28f311', '8JRE1C4H4Z2W F33首/三试T2、第二试T5、F17 T6、末试T11',
     '同盘0/24与5/24、HP差12/伤差7已核；原记录有文本numbers、原答和替换，缺实际候选完整执行/重规划边界的统一机器追踪和原dirty树。六试均败，缺原线完整胜局及独立时间后移验证，不改变SL血价/成长/HP护栏阈值。',
     '末试T2防御省3血少10伤、延至T11仍败，反对将全部防御替换一概定错；末轮完整损15而实际HP截断5。',
     '先补候选与派发/重规划的审计闭环，按run_id分组；另规则比较用同起点完整离线线路及后续独立静默局。'),
    ('49632bc4878fb597', 'CA5KE8GFJ9X2 F13 T1/T3/T5',
     '当前蚌力量0/4/8与喷水11/15/19已核，弱后值见原复盘；缺力量、敏捷、弱、独立成长全部路径的冻结实际调用输入及逐步源码对照。步法测试只覆盖子项，不能据其commit关闭整条复合提案，也没有统一保血/输出权重的受控结果。',
     '虚弱不取消后续加压；此场玩家没有建立计划中的步法。',
     '用本场属性和手牌冻结逐击修正；分别验成长、虚弱及负/新敏捷，保持未观察范围等价。'),
    ('66532328a585941f', '5PM6JAQG6FNQ F33、F39第二试T2',
     'F39无毒目标上的冒泡零效果与F33成长已建立均为已知事实；缺同初始血量/构筑/抽序、不同启动顺序的完整胜负及收益函数，不能从持有组件或跨房间胜负拟合能力启动优先级。',
     'F33建雾3/触媒1/群蛇4而赢；F39敌人、属性与资源不同，不能作为单组件因果对照。',
     '维持当前策略；完整兑现链与受控整场验证齐全后再评价启动/构筑权重。'),
    ('43a76a31ba7bdcfa', '61E2QS63Y9WU F17 T5/T6/T7',
     '原帧确认吸取令玩家力2→0、敏0→−2、敌力0→2；已有负敏捷/毒子模型不替代SL范围/换线验证。缺同血量、构筑、完整已知抽序的另一可救活SL线路，不能据本局首试胜利调整SL阈值。',
     '本局首试60HP七轮获胜，不与其他局不同进场条件的失败作同盘比较。',
     '冻结吸取、两张各3挡及17+16毒的分项调用；SL偏好须完整同盘、按局分组验证。'),
    ('5264153a4a4b0e5c', '61E2QS63Y9WU F23 T1/T4/T5',
     '原帧确认两实体航行后力量3→6、幻象T4后仍2HP；旧召唤输入固定测试通过，仍缺本次A10航行/召唤的完整冻结调用链和另一目标序的后续实打。不能用旧召唤commit证明新增成长和目标排序收益。',
     'focus幻象的39伤/零损候选未实打；本体线47伤/15损实打，但幻象仍活着。',
     '分别验当前进阶召唤第一样本、两实体成长、实际退场与相同推演值并列；保留全部目标选项。'),
    ('bddfa690a84e03d0', 'DUZUBAJ3A8GP F30 T1/T4/T5/T6，各SL尝试分列',
     '原帧确认睡眠、醒来、2/4力量与20/22攻击；本次固定抽取为首试T5/T6的3HP，未冒充末试1HP。缺醒来/眩晕接续的完整冻结输入和同抽另一完整获胜线路，四次同局失败不能拟合全死排序血价或固定杀序。',
     '末试T4较首试多扣3敌血也多损2玩家血；不能只按敌剩血定更好。',
     '逐尝试冻结睡眠、眩晕、成长和当前进阶数据；规则验证必须保留完整双方损血及后继。'),
]

rows = []
for short, evidence, reason, counter, expected in details:
    ident = 'silent-proposal-' + short
    p = proposals[ident]
    rows.append({'id': ident, 'state': 'waiting', 'reason': reason})
    assert Path(p['proposal']).is_file()
assert {r['id'] for r in rows} == set(batch['proposal_ids'])

intro = f'''# 静默猎手十项派发提案复核

记录时间：{when}。任务scratch：{OUT}。
来源batch：20261008-061302-strategy-proposal（启动器scratch为061303）；proposal_repair未派发。
main同步后的完整基线：{base}。开工前工作树干净，git merge --no-edit main无冲突；本任务没有源码改动。

本次只消费以上batch的十个id。六个来源局从runs.jsonl核实均为SILENT/A10。十份原Markdown逐一读取且SHA与专用队列一致，26个账本角色/局号关系已核；原件与专用提案JSON保存在本目录。没有重写历史复盘或新增游戏结论。

神化普通施放的局部升级数值已有直接证据；预算、SL、成长和目标收益部分仍缺完整比较。确定的子项与完整提案分别核验。原神化仍known=false；按当前通用升级字段计算F43配对，勒紧仍4而实见6，尖啸仍6而实见8。不可只把未知改成已知、把普通牌标成升级或加固定分来关闭提案。

Roy-2026-10-07-learning提供规则修改权限。证据限制与既有人定规则的身份无关；本次没有因人定规则而转审批，也没有新增架构调整。

拟合与时间切分：六局都是已分析的A10发现/复核样本，没有新独立验证局。SL尝试不扩独立局分母。没有同起点整场对照时不拟合预算常量、SL/HP护栏、能力优先级、focus顺序、药水持有或终局权重。机制数值核验与整场因果/策略验收分开。
'''
parts = [intro]
for short, evidence, reason, counter, expected in details:
    ident = 'silent-proposal-' + short
    p = proposals[ident]
    parts.append(f'''## {ident}

处置：waiting；已有学习账本：{'、'.join(p['ledger'])}；领域：{'/'.join(p['domains'])}。
证据局号/层/回合：{evidence}。
来源任务：{p['source_task']} → strategy-proposal；原文：{p['proposal']}。
反例/限制：{counter}
旧规则及缺数据：{reason}
预期行为及验证方法：{expected}
预期影响未知，不承诺整战转胜；本次保持现行为。回退：本批无生产源码可回退，保留原提案、账本、失败/缺数据和此处固定证据。后续实现独立提交与红绿测试，再按live流程上线。
''')
proposal = '\n'.join(parts)
(OUT / 'proposal.md').write_text(proposal)

report = {
    'task': 'strategy-proposal', 'base': base, 'runs': batch['runs'], 'fixes': [],
    'skipped': batch['proposal_ids'], 'merged': None,
    'tests': {'tsc': None, 'vitest': 0, 'cases': 29, 'scope': 'existing-fixed-only', 'sandbox': None},
    'code_proposals': batch['proposal_ids'], 'implementation_domains': [],
    'proposal_results': rows, 'report': str(OUT / 'report.md'),
}
(OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
extra = '''
## 验证、提交与合入

verify-evidence.py从原日志按字节偏移回读32个对象（含全部六局来源），119项身份/原对象/SHA/数值检查通过。固定状态、决策和原字节索引在fixed-states.json、fixed-decisions.json、evidence-manifest.json；运行结果evidence-verification.log/json。

升级缺口探针只读生产源码、使用本次固定手牌及牌类型，未读刷新知识JSON。第一次tsx CLI因沙箱Unix IPC listen EPERM失败，原upgrade-probe.log保留；改用node --import tsx loader入口后exit0，upgrade-probe-loader.log/rc与upgrade-probe.json保存实际结果。这不是生产代码修复或策略红绿测试。

六个既有固定测试文件、29例通过，vitest exit0（existing-fixed-cases.log/rc）：步法、余像、毒、普通勒紧、升级勒紧、胧光怪召唤。测试使用固定夹具；未调用LLM、网络或play。只证明这些已有子项。本任务没有提交源码，tsc和完整bash tools/test-sandbox.sh未运行；tests.tsc/sandbox为null。无新源码，撤源码失败/恢复通过不适用，未冒报红绿或完整套件成功；没有高负载超时。

partial-live-proof.json核实45161a51c2c6b7e4a499b13cf749c4108193bbf5（推演成熟度事实）、1912b5e0c2c9d87622f6915d8a299f0ef6222588（普通勒紧）、d8a2b0090ba8145c0b6d20bcae700006f01e2c79（步法）、f6c5504a73b2ee3702812a5217dfcda8b14e18aa（毒）为实际live祖先；仅属完整提案的子项，未据此标整项duplicate/implemented。没有新增代码提案id；复用原CLI登记的十项，完整源Markdown与SHA保持。

本次只有scratch记录和CLI提案链接，没有源码/知识数据提交；main同步后HEAD作为base保持。merged=null/version=null，无live合入、eval版本、shipped登记或规则上线双通知。未进入live刷新提交/合入锁步骤，不触动正在对局的检出。无实际涉及的实现领域，implementation_domains=[]。

本批五个仍proposed的账本条目（0018、0125、0209、0231、0237）经根目录ledger.py update追加本提案链接与处置说明、status=proposed/by=learner:strategy-proposal；其他已有shipped数据历史与版本状态保持，不把waiting任务当新support/repeat。CLI回执保存在ledger-update.stdout/stderr。专用提案队列状态由调度器按本报告逐项resolve，保留待后续新局重派，本任务未直接改队列。

交运维：本目录proposal.md与report.md；十项都是waiting，有具体缺数据理由，不登记shipped。gitleaks、工作树与机械no_change最终检查结果见final-verification.json，原失败日志保留。
'''
(OUT / 'report.md').write_text(proposal.replace('# 静默猎手十项派发提案复核', '# 静默猎手策略任务回报', 1) + extra + '\n```json\n' + json.dumps(report, ensure_ascii=False, indent=2) + '\n```\n')

updates = []
for ident, item in ledger.items():
    if item['status'] != 'proposed':
        continue
    linked = [r for r in rows if ident in proposals[r['id']]['ledger']]
    updates.append({'id': ident, 'status': 'proposed', 'by': 'learner:strategy-proposal',
                    'where': {'proposal': [str(OUT / 'proposal.md'), str(OUT / 'report.md')]},
                    'note': '20261008-061302策略复核：' + '；'.join(r['id'] + ' waiting：' + r['reason'] for r in linked) + '；无新源码/合入，不增加support/repeat。'})
(OUT / 'ledger-updates.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in updates))
print(json.dumps({'base': base, 'proposal_results': len(rows), 'ledger_updates': len(updates)}, ensure_ascii=False))
