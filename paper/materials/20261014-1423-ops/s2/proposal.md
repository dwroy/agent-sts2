# 本批十个原提案逐项证据与处置

记录时间：2026-10-14T13:55:19+08:00。任务strategy-proposal；角色silent；批次20261014-134208-s2-strategy-proposal。
完整base：5f520228aa83ac54b4c5a8ade586851d61204f47。learn.json核定reason=proposal、工作树/角色/六个runs一致，领取十个proposal_ids；无research_request、implementation_request或proposal_repair。普通专题请求绑定其他批次，不适用本批。git merge --no-edit main返回Already up to date。

所有原Markdown SHA已核；原提案/旧父请求/队列状态不改。本批不新建重复提案ID，不领取其他队列。只依据本角色冻结实盘，局部事实充分与策略整项完成分别验收。

## 证据、反例和缺数据

### silent-proposal-366288801d9150d9

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md
原SHA256：0ba601d50f1341977ec60627d24994e0755ef1cf396a60832000400c5805c524
来源任务：postmortem；实现任务：strategy-proposal；已观察范围：silent A10。
账本：silent-0079、silent-0176。
证据：751FN9QM9MHQ F17 T2/T7/T13，decisions 272434/272575、272531/272652；sl-attempts 945—950。
核实结果：同盘T2净损13→18、敌净扣9→18；T7净损13→23、敌净扣12→18；T13净损8→2、敵净扣17→11。T7预测损19/29各含未决弃牌保守项，实际差额仍10。
**处置：waiting。** 当前预测资源拆项及B2原/替比较已有；缺跨抽弃和续问的完整执行归属、同后继整战对照与独立后期校准，不能拟额外失血阈值。
预期行为：保留现行排序、选项、HP护栏、药水费用及探索；已上线的限定诊断继续使用，不把未知填成0。
验证入口：冻结原行号/offset/length/SHA与既有消费者输出见本目录；下一次接续须补上述具体缺口，并区分实盘、模型回放及未执行反事实。

### silent-proposal-85929bdfc8a3fc1b

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md
原SHA256：d42d3f29d0d36b262352160a104dd8b97831ef9d8ecbbd4bce3dba367f9c8d68
来源任务：postmortem；实现任务：strategy-proposal；已观察范围：silent A10。
账本：silent-0019、silent-0021、silent-0005、silent-0007、silent-0129、silent-0176。
证据：751FN9QM9MHQ F13 T3 decisions 272361/272362；F17 T7/T13/T17。
核实结果：F13有药/无药题面参考存在，成本0的来源是缺表而非已证零持有价。F17未决弃牌与呼唤失血须按实际续步核；格挡、毒、荆棘分别归源。
**处置：waiting。** 持牌保守项和持有价值未知已有展示；缺F13不喝或留到F17的完整支线，以及重问后毒/荆棘实际归属，不能校准药价或改变弃牌规则。
预期行为：保留现行排序、选项、HP护栏、药水费用及探索；已上线的限定诊断继续使用，不把未知填成0。
验证入口：冻结原行号/offset/length/SHA与既有消费者输出见本目录；下一次接续须补上述具体缺口，并区分实盘、模型回放及未执行反事实。

### silent-proposal-efd9f83ee9e1a6dc

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md
原SHA256：0065ae0291ac4675d0a895128c71c68b35602c3eb6b5887b92fca11891c29006
来源任务：experience-update；实现任务：strategy-proposal；已观察范围：silent A10。
账本：silent-0079、silent-0176。
证据：751FN9QM9MHQ F17 T2/T7/T13；原经验silent-fysh-resource-sl-observation、silent-beckon-held-end-turn-loss。
核实结果：复核原经验提案引用的三组局部资源差；本局六次均败，只是一局相关尝试。
**处置：waiting。** 局部成本充分且预测诊断已有；缺完整实际资源归属、受控整战及独立验证，不能以子诊断关闭原经验提案。
预期行为：保留现行排序、选项、HP护栏、药水费用及探索；已上线的限定诊断继续使用，不把未知填成0。
验证入口：冻结原行号/offset/length/SHA与既有消费者输出见本目录；下一次接续须补上述具体缺口，并区分实盘、模型回放及未执行反事实。

### silent-proposal-131042659448ae74

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md
原SHA256：b1ff1ca1e5d3da182f25af9b0040780e288a77e627b08c2fee262a17f8f49951
来源任务：experience-update；实现任务：strategy-proposal；已观察范围：silent A10。
账本：silent-0019、silent-0020、silent-0021、silent-0005、silent-0006、silent-0007、silent-0046、silent-0129、silent-0176。
证据：751FN9QM9MHQ F13 T3及F17 T3/T5/T7/T13/T17；账本对应原能力、毒、荆棘、路线与休息分账。
核实结果：已建能力不等已得格挡；手持呼唤与实际弃牌另核；本批仅核冻结原局，不搬用当前经验条目的历史样本数。
**处置：waiting。** 资源与能力预测字段已有；跨重问完整执行、逐轮能力兑现和无药/留药跨战支线未联合验证，整项仍未完成。
预期行为：保留现行排序、选项、HP护栏、药水费用及探索；已上线的限定诊断继续使用，不把未知填成0。
验证入口：冻结原行号/offset/length/SHA与既有消费者输出见本目录；下一次接续须补上述具体缺口，并区分实盘、模型回放及未执行反事实。

### silent-proposal-990f054036609447

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md
原SHA256：c7fa0a97eea334f338e208a6bae8e709dce021cd3157dd32cb3ca1a45900e053
来源任务：experience-update；实现任务：strategy-proposal；已观察范围：silent A10。
账本：silent-0102、silent-0019、silent-0020。
证据：KV0JHNJCKXLS F33第4/5试T5、首/末T1，decisions 273450/273474；sl-attempts 952—957。
核实结果：T5同盘删毒药净扣36→29且两线都零损；T1删究极打击净扣28→14且都零损。敌回血使净HP差不能替毛伤。后轮动作也改变。
**处置：waiting。** 两组同盘净资源充分；缺敌回血/毛伤的完整来源、候选末端认证、受控完整后继及路线/休息反事实，不能拟SL或回血门槛。
预期行为：保留现行排序、选项、HP护栏、药水费用及探索；已上线的限定诊断继续使用，不把未知填成0。
验证入口：冻结原行号/offset/length/SHA与既有消费者输出见本目录；下一次接续须补上述具体缺口，并区分实盘、模型回放及未执行反事实。

### silent-proposal-e18d3f18e6cac2a0

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md
原SHA256：3cc66ab0b4fb05a0d6d4e62b514b13caf9e157eba4d781f5a60f76276047c821
来源任务：postmortem；实现任务：strategy-proposal；已观察范围：silent A10。
账本：silent-0017、silent-0250、silent-0011、silent-0027、silent-0046。
证据：YQL8RZ8BWN1E F17六试与末T10，decision 274087、states 280160/280161；L9SGRBB5R698 F17 T14、PU80F84P6HPN F17 T17。
核实结果：残壳饮毒2→8，HP26、挡13、自爆41未变；本体结束不等获胜。占位血与本体0的阶段展示已在live；anchorRank仍沿原始末态敌血同轮比较。
**处置：waiting。** 巨兽阶段、占位血说明和饮毒局部事实已有；修改参考排序仍缺受控完整后继、最终资源适用校准与独立验证，不能将展示子项当整项duplicate。
预期行为：保留现行排序、选项、HP护栏、药水费用及探索；已上线的限定诊断继续使用，不把未知填成0。
验证入口：冻结原行号/offset/length/SHA与既有消费者输出见本目录；下一次接续须补上述具体缺口，并区分实盘、模型回放及未执行反事实。

### silent-proposal-9733bb80f445aeae

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md
原SHA256：c0da0af7803a73b361bb98e358c2a5c12b8056a68c28614a592138e7cdd88382
来源任务：experience-update；实现任务：strategy-proposal；已观察范围：silent A10。
账本：silent-0017、silent-0019、silent-0020、silent-0250。
证据：YQL8RZ8BWN1E F17末试T10 states 280160/280161，原经验silent-giant-explosion-window；L9/PU原阶段证据。
核实结果：本体结束后的新增6毒未变当前血挡或自爆。26+13−41=−2只属已列局面算术，死亡页0不等完整入伤。PU旧胜线不验证新排序或留药规则。
**处置：waiting。** 残壳收益限制已有展示；缺提前喝/不喝/留药及新参考排序的整战对照，不能认证跨战药值或策略收益。
预期行为：保留现行排序、选项、HP护栏、药水费用及探索；已上线的限定诊断继续使用，不把未知填成0。
验证入口：冻结原行号/offset/length/SHA与既有消费者输出见本目录；下一次接续须补上述具体缺口，并区分实盘、模型回放及未执行反事实。

### silent-proposal-c51468c5e8ba6668

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md
原SHA256：168cc03750525c56cace3915f22ef4dd1cf768f87b17e70f5228964a168c8469
来源任务：postmortem；实现任务：strategy-proposal；已观察范围：silent A10。
账本：silent-0019。
证据：KEN58SH9SLZ6 F3T2/F4T1/F5T2/F11T1、T2/F15T1，decisions 274131/274156/274185/274235/274237/274267/274272。
核实结果：七次use_potion均有相应槽位从指定药水变空的原帧；随机选牌、发光水续问与后续整线必须分开。六次boss入口空药栏不证明留药必胜。
**处置：waiting。** 七次耗药充分；随机选牌/重问后的完整候选净收益、F15不喝及留药到boss的受控支线不足，不能校准跨战预算。
预期行为：保留现行排序、选项、HP护栏、药水费用及探索；已上线的限定诊断继续使用，不把未知填成0。
验证入口：冻结原行号/offset/length/SHA与既有消费者输出见本目录；下一次接续须补上述具体缺口，并区分实盘、模型回放及未执行反事实。

### silent-proposal-86a7db08d1a31976

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md
原SHA256：10de295b469f48281050aeb04a8ad6ccb2906e007d48386a6c8f769cc7600ac6
来源任务：postmortem；实现任务：strategy-proposal；已观察范围：silent A10。
账本：silent-0079、silent-0021、silent-0125、silent-0005、silent-0176。
证据：KEN58SH9SLZ6 F17第4/5试T10、第4/6试T5，decisions 274505/274568、274484/274601；第2试T2及末试T6/T10/T12/T13。
核实结果：T10同盘损15→21、扣敌2→4，B2 .385→.127、diff−.2583/se.0132；T5净损7→5但步法被延后，额外小刀后的净扣1→2不能归原候选预测。
**处置：waiting。** T10血价和T5能力延迟充分；缺完整伤源/能力归属、同后继整战及独立校准，不能收窄更差B2探索或调整HP护栏。
预期行为：保留现行排序、选项、HP护栏、药水费用及探索；已上线的限定诊断继续使用，不把未知填成0。
验证入口：冻结原行号/offset/length/SHA与既有消费者输出见本目录；下一次接续须补上述具体缺口，并区分实盘、模型回放及未执行反事实。

### silent-proposal-e282a9131b99129a

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md
原SHA256：a88a2a95875b8fa04d80376a10a3ed59ede080db13ccb2a7e14c3ebfc1c34872
来源任务：experience-update；实现任务：strategy-proposal；已观察范围：silent A10。
账本：silent-0021、silent-0079、silent-0125、silent-0176。
证据：KEN58SH9SLZ6 F17 T5/T10及相关六试；原经验silent-fysh-resource-sl-observation、silent-deck-burst-observation、silent-beckon-held-end-turn-loss。
核实结果：既见多花血只换少量输出，也见当轮省血却延迟能力建立；两种方向排除单一“最少损血恒优”解释，未证明某新规则整战更优。
**处置：waiting。** 双向取舍充分但六试相关；缺完整后继反事实与独立后期校准，不能由子诊断关闭原经验提案或拟统一血价。
预期行为：保留现行排序、选项、HP护栏、药水费用及探索；已上线的限定诊断继续使用，不把未知填成0。
验证入口：冻结原行号/offset/length/SHA与既有消费者输出见本目录；下一次接续须补上述具体缺口，并区分实盘、模型回放及未执行反事实。

## 既有实现及验证边界

本次只读核验live HEAD 4d55ff9b4e2d6ed9cb701712ab63dba76ac67dac。9个已列源码提交均为该live实际祖先，详source-audit.json。
已有子项：5604982e13890e0e2bc8bf8246272e8267321c0b（SL当轮预测资源对照）；c769739b97389fdc978b6515b83a38e3cd900f67（SL候选预测）；be69855995737d6f381adb10bf248964832da24b（选择阶段预测）；fdaf787a372880b0438e73bcac7e6d2168b038ed（单动作回执）；c4670f4f416c7d93e192e889c5080e7e4e0e733f（药水持有值未知及无药参考）；05cd292c6f01bb31e406473d3a9843e659d62b93（持牌失血诊断）；a83d9ab675560a177249aa638e99df40bcfb5553（巨兽阶段）；d5e20aa4dd44168ce30944dfcce74f8322144953（巨兽药水事实）；0d092f6b928a6221eabf3516abad25c48ceaac9c（有界最终资源）。
13个所列生产/离线叶中10个base/live blob相同、3个不同；不同叶为explore.ts、combat-plan.ts、turn-solver.ts。只证限定字段和实际祖先，不泛称整条执行等价。live anchorRank仍使用enemyHpLeft原始末血作为同轮tie-break，本体/自爆解释与排序变更分开。
selection_audit.actual_turn、candidate_comparison.actual_turn_result、单动作回执的whole_plan_executed均保持未知。离线消费者关联端点也不认证完整候选或单卡收益。

## 方法、时间切分和回退

六局只作本次冻结核验；同局读档不是独立训练/留出局。本批不拟合参数，不借当前经验条目的宽历史样本数作为本批新证据。若后续改规则，先保存更早独立局调参清单、按真实开始时间留后期新局验证，再做同预算、同种子且保持后继受控的原/新线对照；模型结果不能冒作未执行实盘。
新增6毒、能力分数、净HP差、更多存活轮数和“原线已失败”均不足单独认证胜线。缺完整毛伤、死亡截断前值、实体身份或执行后继时继续未知。
本批没有源码改动，撤源码失败/恢复通过不适用；没有新提交、live合入、游戏版本、shipped或测试成功。没有待回退的新行为；保留全部旧规则、原稿、原失败和本批工件。
