import json
import subprocess
from pathlib import Path

scratch = Path(__file__).resolve().parent
worktree = scratch.parents[2]
bundle = json.loads((scratch / 'dispatch-and-proposals.json').read_text())
batch = bundle['dispatch']
base = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=worktree, text=True).strip()
timestamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
facts = json.loads((scratch / 'fact-check.json').read_text())
assert (scratch / 'fact-check.exit').read_text().strip() == '0'
sources = json.loads((scratch / 'live-source-verification.json').read_text())
specs = [
    ('异鱼SL配对血价',
     '751FN9QM9MHQ F17 T2/T7/T13；decisions272434/272575、272531/272652、272483/272820指纹各相同。T2实损13→18、净扣9→18；T7实损13→23、净扣12→18；T13实损8→2、净扣17→11。',
     'T13省6血同时少6净输出；六试全败且后继动作改变，不以局部差分证明整场胜因。',
     'SL候选/B2预测、持牌事实与单动作回执已有；跨续问完整候选actual结果仍未知。',
     '保留原答、护栏后、SL后、派发与重问后的实际端点；预测差不能写成已付血价。',
     '固定T2/T7/T13校验指纹及逐动作后继；完整收益需要同输入同预算受控整战，并留后期独立局验证。',
     '血价/B2预测及整轮端点已核；缺跨续问完整候选归属、同输入同预算受控整战和独立后期验证，不能拟额外失血门槛。'),
    ('未决弃牌与药水持有价值',
     '751FN9QM9MHQ F13 T3，decision272361：有药plan2与整战无药plan5均报损8、五轮8/8胜，牌伤26/16；plan3本轮不喝但后续7/8样本仍喝。F17 T7/T13实际呼唤血价另核。',
     '成本0且表未加载不是持有價0；只打了饮用分支。未决弃牌的保守多计6不等于实际多付6。',
     'silentHeldLossFacts单列未决持牌，silentPotionReference单列未知持有价和整战无药参考，完整因果仍未知。',
     '既有保守边界与所有选项保留；弃牌后按实际手牌核算，持有價null保持未知。',
     '固定F13有药/整战无药候选和F17弃牌后继；校准需无药完整同资源支线及留药到boss的受控结果。',
     '未决持牌和未知药价诊断已有；缺弃牌续问后完整执行归属以及F13无药/留药到F17的受控完整结果，不能校准持有价。'),
    ('经验来源异鱼SL血价',
     '经验silent-fysh-resource-sl-observation、silent-beckon-held-end-turn-loss；751FN9QM9MHQ F17 T2/T7/T13及上述同指纹端点。原经验来源任务experience-update，未另建重复ID。',
     '省血与输出取舍方向相反，且同存档相关六试不当六个独立验证样本。',
     '原经验为active、关联账本已有上线状态；局部诊断上线不能关闭来源任务宽提案。',
     '沿原ID保留经验/账本/完整候选审计链，补足完整后继后才评估策略参数。',
     '同上固定端点核验；完整模型重放须与真实反事实区分，留未来独立run做泛化验证。',
     '原经验及T2/T7/T13端点已核；完整执行分账与独立整战验证不足，不能以诊断子实现关闭来源提案或拟统一血价。'),
    ('多机制与资源联合分账',
     '751FN9QM9MHQ F13 T3药水、F17 T3步法、T5无实体、T7/T13呼唤、T17死亡；原经验与9个账本来源已逐项保留。',
     '实际剩毒/能力层数不等已兑现伤挡；无挡牌时敏捷没有挡量兑现。无药/留药整战支线未实打。',
     '各子机制和候选事实已有；联合读回仍缺跨重问完整整线归属及能力逐轮累计贡献。',
     '力量、敏捷、毒、反伤、持牌、回血/SL恢复分列；不把各子字段出现当综合执行验收。',
     '以冻结全局输入连逐动作、选择、重问和整轮结算；分机制验核后，再做同资源无药/留药联合支线。',
     '各机制与候选事实已有；跨重问整线归属、能力逐轮兑现及无药/留药组合支线未联合验收，不能把局部诊断判整项实现。'),
    ('恶魔输出与资源分账',
     'KV0JHNJCKXLS F33第4/5试T5同盘：人工端点均30血，敌净扣36/29；消费者两窗口均turn_end_unverified。末试T4已见15毒结算后回30。路线F28/F32实际回血与改线分账见原提案。',
     '删毒少7净扣没有当轮保血收益；净扣不等毛伤。结束后的诅咒选择/超时链未完整认证，后轮动作也变。',
     '当前消费者可分相邻观测和完整整轮；这两窗口仍明确未知，现有路线事实不提供未走路线反事实。',
     '净扣、已结毒、敌回血、实际回血和SL恢复各列，未知后继不补作已执行。',
     '认证结束/诅咒选择完整链，核敌毛伤和30回血；再做保持后继/预算一致的整战与路线休息对照。',
     'KV T5人工端点同零损且净扣36/29；消费者结束/诅咒链未认证，缺毛伤/回血完整归属、受控整战及路线休息反事实。'),
    ('巨兽阶段与SL残血',
     'YQL8RZ8BWN1E F17六试本体T12/T12/T11/T12/T12/T9结束；末T10 states280160→280161毒2→8、HP26/挡13/自爆41均不变。L9SGRBB5R698 F17 T14和PU80F84P6HPN F17 T17的SL anchor含近十亿占位血。',
     'PU旧巨兽末试实胜是反例，但后继多处改变；直接将同轮占位血归零会改变参考线，尚无新排序受控胜负。',
     '本体/自爆、当前血挡与毒药事实已有；enemyHpLeft/anchorRank仍按raw占位血作旧同轮次级排序。',
     '本体剩血0与自爆未结束分开；占位扣血不称本体进度。缺新排序后继时保持当前参考规则。',
     '冻结三局phase/summary/anchor和毒药前后；改序须报告旧新参考、完整自爆/血挡/药水后继，并独立验证。',
     '巨兽阶段与残壳毒水事实充分且有live诊断；同轮排序仍用raw占位血，缺改序完整受控后继与最终资源校准，不能直接归零改序。'),
    ('经验来源巨兽分阶段估值',
     '经验silent-giant-explosion-window及route/rest条目；YQL8RZ8BWN1E F17末T10残壳施毒，L9 F17 T14、PU F17 T17同轮占位排序证据。',
     '末轮毒药的局部无收益不证明提前喝必胜；PU旧胜线不验证新参考排序。',
     '阶段/药水说明已有实际live祖先；原经验active及账本上线状态保留，整战资源/新策略收益仍未知。',
     '沿原ID区分本体进度、自爆生存和实际资源；不写提前喝/固定留药或休息阈值。',
     '固定相同占位summary与完整毒药帧；策略收益须同输入/预算新排名后继及提前用/留药整战对照。',
     '阶段/毒水说明已有live祖先；缺新排名完整受控后继和提前喝/留药整战结果，PU旧胜线不能验证新策略收益。'),
    ('七次耗药与跨战预算',
     'KEN58SH9SLZ6：F3 T2攻击、F4 T1稳定、F5 T2速度、F11 T1虚弱/T2攻击、F15 T1发光/技能，共7次请求与槽位耗用；六次F17 T1均75/86空栏。',
     '三条用药回执pending但后继槽位确实清空；pending不单独证明生效或整线。F15零净损不说明不喝同样零损。',
     '单动作、相邻状态与整轮端点消费者已有；随机选牌/重问后完整候选收益仍未认证。',
     '按槽位及药ID分列取得/使用/弃药/SL恢复，随机选择与重算后的事实另列；持有价保持原规则。',
     '核七个请求身份及前后槽位，再认证选牌/重问完整收益；校准需F15不喝或保存到boss的完整受控支线。',
     '七次耗药槽位及请求身份已核；随机选牌/重问后的完整候选收益未认证，缺F15不喝或留药到boss的受控整战支线。'),
    ('呼唤、无实体与能力兑现',
     'KEN58SH9SLZ6 F17第4/5试T10同指纹：损15→21、净扣2→4，B2差−0.2583/SE0.0132。第4/6试T5同指纹省2血、步法T5延T9；末T8双防御各5，274604的小刀属于后继重问。',
     '既反驳只看新增伤害，也反驳只看最低损血。后轮动作不同、六试全败，不能拟统一6血/2伤门槛。',
     'SL预测血价与持牌事实已有；永久能力是否建立/当轮挡量可核，完整累计收益和候选因果仍未知。',
     '同时保留当轮血价、无实体实扣、能力建立时点及B2配对误差；原探索/护栏未改。',
     '固定T10两端及T5/T8/T9能力后继；新规则须保持其余后轮/抽序/预算一致的完整对照与独立后期局。',
     'T10多损6只多2净扣与T5省2但延迟步法均复核；缺完整能力收益归属、后继保持一致的整战对照及独立验证，不能拟统一门槛。'),
    ('经验来源异鱼SL能力窗口',
     '经验silent-fysh-resource-sl-observation、silent-deck-burst-observation、silent-beckon-held-end-turn-loss；KEN F17 T5/T10及实际末T6/T10/T12呼唤来源。',
     '同存档六试相关且后继同时改变；原经验的历史支持总数不是本批独立验证数。',
     '原经验及局部SL/持牌/能力事实已有；完整候选actual/causal结果仍null。',
     '沿原ID保存双向机会成本及能力窗口，未知整战不填胜率收益，不重复建ID或倒记shipped。',
     '同盘确定性公式用本批冻结帧验核；需要独立后期完整整战/完整候选归属才拟探索参数。',
     '原经验与局部血价已有；六試相关且后继同变，完整候选因果仍未知，缺受控整战与独立后期样本，不能以子诊断关闭原提案。'),
]
assert len(specs) == len(batch['proposal_ids'])
results = []
sections = []
for number, (ident, spec) in enumerate(zip(batch['proposal_ids'], specs), 1):
    title, evidence, counter, old, expected, validation, reason = spec
    original = bundle['proposals'][ident]
    results.append({'id': ident, 'state': 'waiting', 'reason': reason})
    sections.append(f'''## {number}. {title}

- 原ID：{ident}；来源任务：{original['source_task']}；实现任务：strategy-proposal。
- 账本：{', '.join(original['ledger'])}；领域：{', '.join(original['domains'])}；适用本批SILENT/A10，不外推其他角色/进阶。
- 原稿：{original['proposal']}；SHA256={original['proposal_sha256']}，原字节另存original-{number:02d}.txt。
- 支持：{evidence}
- 反例与未知：{counter}
- 旧行为/已有覆盖：{old}
- 预期行为：{expected}
- 验证方法：{validation}
- 处置waiting：{reason}
''')
common = f'''# 本批十项策略提案

记录时间：{timestamp}。batch=20261014-074306-s2-strategy-proposal；角色silent；base={base}。

本批只消费已领取十个原ID，全部waiting；没有新源码/规则或新代码提案ID。支持、反例、未知和验证要求逐项保留。已上线诊断子项不当宽提案完成，原账本状态不降级。

不拟合新血价/药水/SL/终局系数。本批六局及其相关SL仅作冻结核验，不能拆同一局到训练与独立验证。后续拟合须按独立run开始时间先用更早本角色数据校准，留之后新局验证；本批没有受控整战，不能宣称原选择本可赢、泛化收益或已入库/大脑采用。

预期影响：本次仅补本批证据和消费者读回链接。后续有足够证据可沿Roy-2026-10-07-learning授权修改规则，按固定测试/live/双通知流程；本次无源码可回退，保留所有原件/失败/未知和原ID。不得以本报告关闭学习入库或量化父要求。

'''
proposal = scratch / 'proposal.md'
report = scratch / 'report.md'
proposal.write_text(common + '\n'.join(sections))
result = {'task': 'strategy-proposal', 'character': 'silent', 'batch': '20261014-074306-s2-strategy-proposal',
          'base': base, 'runs': batch['runs'], 'fixes': [], 'skipped': [], 'merged': None,
          'tests': {'tsc': None, 'vitest': None, 'cases': None}, 'code_proposals': batch['proposal_ids'],
          'implementation_domains': [], 'proposal_results': results, 'report': str(report)}
(scratch / 'report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
(scratch / 'proposal-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
source_lines = '\n'.join(f"- {row['path']}：{row['source_commit']}（实际live祖先，源码/提交/live字节一致；本树等live={row['task_equals_live']}）" for row in sources)
table = '\n'.join(f"| {item['id']} | {', '.join(bundle['proposals'][item['id']]['ledger'])} | waiting |" for item in results)
report.write_text(f'''# 本批策略学习回报

记录时间：{timestamp}。十个原提案全部waiting；依据已核六局证据和当前消费者，没有完整可隔离的新策略实现或可验证的新权重。本批无源码提交、合入、版本、shipped或策略收益声明。

## 身份与基线

初始git status干净，初始及最终计划base为{base}。只读learn本批行核task=strategy-proposal、character=silent、reason=proposal、十proposal_ids及指定worktree；没有proposal_repair/research_request/implementation_request。根notes/strategy-research-silent.json绑定其他旧批，专题条件不成立；没有读取其work_spec/manifest或其他专题请求，没有改learn/根请求。按普通任务git merge --no-edit main返回Already up to date，HEAD保持base。

无源码改动时第4节无可合入内容，未发起live merge、知识刷新提交、eval编号或规则双通知。fixes=[]、merged=null，三个生产测试值均null；工作树保持干净。本批处置不关闭量化、学习入库或宽提案父要求。

## 原始证据

派发六局：{', '.join(batch['runs'])}。逐runs.jsonl核SILENT/A10，六个全局victory=false；PU的F17巨兽旧胜线仍保留，不能把全局失败当所有战斗失败。原run code均带dirty，当前源码不等历史完整运行树。只读本角色日志、对应复盘/提案与knowledge/characters/silent关联条目；未读其他角色私有知识。

十份原Markdown SHA全部吻合队列，原角色/来源任务/账本已核，原字节存original-01.txt至original-10.txt。16个原账本折叠值存ledger-before.json；13个关联经验当前条目存associated-experience.json，原claim/status/version与历史保留，不把经验当前总分母当本批六局独立样本。

用旧同角色定位索引逐offset/length重新读取根logs：4071决策、4167状态、43 SL、6 run-config，共8287原行，全部SHA吻合；每条状态均核本批run/角色/进阶。六条路线元数据无decision_id，明确排除，不伪造身份；六份本批冻结输入含4065有效决策与4167状态，内容SHA同原冻结输入。source-verification.json及四source-index.json保存原位置/指纹，不扫描整份大日志、不修改logs。

## 当前消费者读回与关键反例

六次现有learner/audit-selection.ts对本批冻结输入均真实退出0。共777整轮窗口，415可核观测端点、362未知；actual_full_candidate_result与causal_candidate_result仍null。{facts['checks']}项本批事实检查通过，保存fact-check.json/log/exit；这些是旧源码消费者和材料核验，不是新源码tsc/vitest或策略受控整战。

- 751 F17 T2/T7/T13三组同指纹：损13/18、13/23、8/2；净扣9/18、12/18、17/11。T7多10血换多6净扣；T13省6也少6输出。保守弃牌上界与实际差分分列。
- 751 F13 T3：有药与整战无药均预测损8、五轮8/8胜，牌伤26/16；本轮无药plan3后继7/8仍喝。实际无药/留药整战未观察，成本缺表为0不证明持有价值0。
- KEN F17 T10原/换损15/21、净扣2/4，B2差−0.2583、SE0.0132；T5省2却把步法延T9，T8两防御各5。274604追加小刀属于后继重问，不能算原线完整收益或固定模型误差。五个能力/挡/小刀端点还核派发前手牌身份和完成回执。
- KV F33第4/5试T5人工端点同零损、净扣36/29；消费者因结束/诅咒链仍turn_end_unverified。毛伤/回血和路线未走分支不从净差补造。
- YQL F17末T10残壳毒2→8、血26/挡13/自爆41不变；L9/PU/YQL原SL含近十亿占位血。当前阶段/毒药事实已存在，raw占位血仍是旧同轮排序项。PU旧胜线不验证改序收益，直接归零将改变参考选择，完整受控后继未证。
- KEN七次用药逐请求、药ID、槽位及后继占用状态核实；三条pending回执单独保留，不能只用pending证明整线生效。F15无药/留药到boss完整支线仍缺。

## 逐项处置

| 原ID | 账本 | 结果 |
| --- | --- | --- |
{table}

每项完整局/层/回合、反例、旧/预期行为、等待原因、验证与回退见{proposal}和proposal-results.json。code_proposals保留十原CLI ID；无新add，不直接改提案队列，不将子源码commit填作宽项implemented/duplicate。

## 实际live覆盖

只读快照live HEAD={sources[0]['live_head']}。14个相关源码叶的实际live祖先、源码提交blob、live提交blob及工作树字节已核；本树13叶相同，explore.ts仅三处Roy/Dai历史注释差异，算法相同；完整补丁见live-source-differences.patch。都是已有子实现，不是本批提交，也不证明宽提案完成。

{source_lines}

## 失败、测试和记录

首个tsx CLI调用因沙箱IPC listen EPERM退出1，原stderr/exit/空输出存751FN9QM9MHQ.audit.first-failure.*。改用同安装tsx加载器的node --import直接运行同一离线入口，六局均退出0；权限及消费者源码未改，不联网/调LLM/运行play。

本批事实核验初稿误读expect.card_id（真实为expect.card.id），加强槽位核验时又误读potion_index（真实请求为option_index），两次KeyError及当时脚本原字节均保存first/second-failure文件；按原schema修正后通过，原帧/生产源码/断言目标未改。此为材料脚本错误，不是生产门禁或撤源码负对照。

无生产源码改动，未撤生产源码或声称恢复测试，tsc/vitest/cases均null；没有提交/gitleaks提交门禁/live合后测试/版本/shipped。本批材料扫描与最终机械核验另外落盘。本批只经根ledger.py update追加16个原账本的本批proposal/report链接与waiting备注，不改原claim/status/version/first_run或追加重复旧证据；不把已上线知识降回proposed。实际CLI回执和读回保存ledger-*及completion-validation.json。

proposal：{proposal}
report：{report}
最终JSON：{scratch / 'report.json'}
''')
ledger = json.loads((scratch / 'ledger-before.json').read_text())
updates = []
for ident in sorted(ledger):
    related = [p for p in batch['proposal_ids'] if ident in bundle['proposals'][p]['ledger']]
    updates.append({'id': ident, 'by': 'learner:strategy-proposal',
                    'where': {'proposal': [str(proposal), str(report)]},
                    'note': '20261014-074306-s2-strategy-proposal：沿原提案' + ','.join(related)
                            + '保存本批证据和消费者读回；全部waiting，8287原行SHA核实、六离线消费者0、415端点/362未知。'
                            + '完整候选因果/受控整战与独立验证仍缺；无源码/合入/版本，保留原状态与claim，不重加旧证据。'})
(scratch / 'ledger-updates.jsonl').write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in updates))
print(json.dumps({'base': base, 'proposal_results': results, 'ledger_updates': len(updates), 'report': str(report)}, ensure_ascii=False))
