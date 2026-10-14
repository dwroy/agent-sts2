# 本批十项策略提案

记录时间：2026-10-14 07:57:22 CST。batch=20261014-074306-s2-strategy-proposal；角色silent；base=7348f447707b5dcac716b0b36825a28b2943f3b6。

本批只消费已领取十个原ID，全部waiting；没有新源码/规则或新代码提案ID。支持、反例、未知和验证要求逐项保留。已上线诊断子项不当宽提案完成，原账本状态不降级。

不拟合新血价/药水/SL/终局系数。本批六局及其相关SL仅作冻结核验，不能拆同一局到训练与独立验证。后续拟合须按独立run开始时间先用更早本角色数据校准，留之后新局验证；本批没有受控整战，不能宣称原选择本可赢、泛化收益或已入库/大脑采用。

预期影响：本次仅补本批证据和消费者读回链接。后续有足够证据可沿Roy-2026-10-07-learning授权修改规则，按固定测试/live/双通知流程；本次无源码可回退，保留所有原件/失败/未知和原ID。不得以本报告关闭学习入库或量化父要求。

## 1. 异鱼SL配对血价

- 原ID：silent-proposal-366288801d9150d9；来源任务：postmortem；实现任务：strategy-proposal。
- 账本：silent-0079, silent-0176；领域：sl, combat；适用本批SILENT/A10，不外推其他角色/进阶。
- 原稿：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md；SHA256=0ba601d50f1341977ec60627d24994e0755ef1cf396a60832000400c5805c524，原字节另存original-01.txt。
- 支持：751FN9QM9MHQ F17 T2/T7/T13；decisions272434/272575、272531/272652、272483/272820指纹各相同。T2实损13→18、净扣9→18；T7实损13→23、净扣12→18；T13实损8→2、净扣17→11。
- 反例与未知：T13省6血同时少6净输出；六试全败且后继动作改变，不以局部差分证明整场胜因。
- 旧行为/已有覆盖：SL候选/B2预测、持牌事实与单动作回执已有；跨续问完整候选actual结果仍未知。
- 预期行为：保留原答、护栏后、SL后、派发与重问后的实际端点；预测差不能写成已付血价。
- 验证方法：固定T2/T7/T13校验指纹及逐动作后继；完整收益需要同输入同预算受控整战，并留后期独立局验证。
- 处置waiting：血价/B2预测及整轮端点已核；缺跨续问完整候选归属、同输入同预算受控整战和独立后期验证，不能拟额外失血门槛。

## 2. 未决弃牌与药水持有价值

- 原ID：silent-proposal-85929bdfc8a3fc1b；来源任务：postmortem；实现任务：strategy-proposal。
- 账本：silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176；领域：combat, potion；适用本批SILENT/A10，不外推其他角色/进阶。
- 原稿：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md；SHA256=d42d3f29d0d36b262352160a104dd8b97831ef9d8ecbbd4bce3dba367f9c8d68，原字节另存original-02.txt。
- 支持：751FN9QM9MHQ F13 T3，decision272361：有药plan2与整战无药plan5均报损8、五轮8/8胜，牌伤26/16；plan3本轮不喝但后续7/8样本仍喝。F17 T7/T13实际呼唤血价另核。
- 反例与未知：成本0且表未加载不是持有價0；只打了饮用分支。未决弃牌的保守多计6不等于实际多付6。
- 旧行为/已有覆盖：silentHeldLossFacts单列未决持牌，silentPotionReference单列未知持有价和整战无药参考，完整因果仍未知。
- 预期行为：既有保守边界与所有选项保留；弃牌后按实际手牌核算，持有價null保持未知。
- 验证方法：固定F13有药/整战无药候选和F17弃牌后继；校准需无药完整同资源支线及留药到boss的受控结果。
- 处置waiting：未决持牌和未知药价诊断已有；缺弃牌续问后完整执行归属以及F13无药/留药到F17的受控完整结果，不能校准持有价。

## 3. 经验来源异鱼SL血价

- 原ID：silent-proposal-efd9f83ee9e1a6dc；来源任务：experience-update；实现任务：strategy-proposal。
- 账本：silent-0079, silent-0176；领域：sl, combat；适用本批SILENT/A10，不外推其他角色/进阶。
- 原稿：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md；SHA256=0065ae0291ac4675d0a895128c71c68b35602c3eb6b5887b92fca11891c29006，原字节另存original-03.txt。
- 支持：经验silent-fysh-resource-sl-observation、silent-beckon-held-end-turn-loss；751FN9QM9MHQ F17 T2/T7/T13及上述同指纹端点。原经验来源任务experience-update，未另建重复ID。
- 反例与未知：省血与输出取舍方向相反，且同存档相关六试不当六个独立验证样本。
- 旧行为/已有覆盖：原经验为active、关联账本已有上线状态；局部诊断上线不能关闭来源任务宽提案。
- 预期行为：沿原ID保留经验/账本/完整候选审计链，补足完整后继后才评估策略参数。
- 验证方法：同上固定端点核验；完整模型重放须与真实反事实区分，留未来独立run做泛化验证。
- 处置waiting：原经验及T2/T7/T13端点已核；完整执行分账与独立整战验证不足，不能以诊断子实现关闭来源提案或拟统一血价。

## 4. 多机制与资源联合分账

- 原ID：silent-proposal-131042659448ae74；来源任务：experience-update；实现任务：strategy-proposal。
- 账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176；领域：combat, potion；适用本批SILENT/A10，不外推其他角色/进阶。
- 原稿：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md；SHA256=b1ff1ca1e5d3da182f25af9b0040780e288a77e627b08c2fee262a17f8f49951，原字节另存original-04.txt。
- 支持：751FN9QM9MHQ F13 T3药水、F17 T3步法、T5无实体、T7/T13呼唤、T17死亡；原经验与9个账本来源已逐项保留。
- 反例与未知：实际剩毒/能力层数不等已兑现伤挡；无挡牌时敏捷没有挡量兑现。无药/留药整战支线未实打。
- 旧行为/已有覆盖：各子机制和候选事实已有；联合读回仍缺跨重问完整整线归属及能力逐轮累计贡献。
- 预期行为：力量、敏捷、毒、反伤、持牌、回血/SL恢复分列；不把各子字段出现当综合执行验收。
- 验证方法：以冻结全局输入连逐动作、选择、重问和整轮结算；分机制验核后，再做同资源无药/留药联合支线。
- 处置waiting：各机制与候选事实已有；跨重问整线归属、能力逐轮兑现及无药/留药组合支线未联合验收，不能把局部诊断判整项实现。

## 5. 恶魔输出与资源分账

- 原ID：silent-proposal-990f054036609447；来源任务：experience-update；实现任务：strategy-proposal。
- 账本：silent-0102, silent-0019, silent-0020；领域：combat, sl；适用本批SILENT/A10，不外推其他角色/进阶。
- 原稿：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md；SHA256=c7fa0a97eea334f338e208a6bae8e709dce021cd3157dd32cb3ca1a45900e053，原字节另存original-05.txt。
- 支持：KV0JHNJCKXLS F33第4/5试T5同盘：人工端点均30血，敌净扣36/29；消费者两窗口均turn_end_unverified。末试T4已见15毒结算后回30。路线F28/F32实际回血与改线分账见原提案。
- 反例与未知：删毒少7净扣没有当轮保血收益；净扣不等毛伤。结束后的诅咒选择/超时链未完整认证，后轮动作也变。
- 旧行为/已有覆盖：当前消费者可分相邻观测和完整整轮；这两窗口仍明确未知，现有路线事实不提供未走路线反事实。
- 预期行为：净扣、已结毒、敌回血、实际回血和SL恢复各列，未知后继不补作已执行。
- 验证方法：认证结束/诅咒选择完整链，核敌毛伤和30回血；再做保持后继/预算一致的整战与路线休息对照。
- 处置waiting：KV T5人工端点同零损且净扣36/29；消费者结束/诅咒链未认证，缺毛伤/回血完整归属、受控整战及路线休息反事实。

## 6. 巨兽阶段与SL残血

- 原ID：silent-proposal-e18d3f18e6cac2a0；来源任务：postmortem；实现任务：strategy-proposal。
- 账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046；领域：combat, potion, sl, terminal；适用本批SILENT/A10，不外推其他角色/进阶。
- 原稿：/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md；SHA256=3cc66ab0b4fb05a0d6d4e62b514b13caf9e157eba4d781f5a60f76276047c821，原字节另存original-06.txt。
- 支持：YQL8RZ8BWN1E F17六试本体T12/T12/T11/T12/T12/T9结束；末T10 states280160→280161毒2→8、HP26/挡13/自爆41均不变。L9SGRBB5R698 F17 T14和PU80F84P6HPN F17 T17的SL anchor含近十亿占位血。
- 反例与未知：PU旧巨兽末试实胜是反例，但后继多处改变；直接将同轮占位血归零会改变参考线，尚无新排序受控胜负。
- 旧行为/已有覆盖：本体/自爆、当前血挡与毒药事实已有；enemyHpLeft/anchorRank仍按raw占位血作旧同轮次级排序。
- 预期行为：本体剩血0与自爆未结束分开；占位扣血不称本体进度。缺新排序后继时保持当前参考规则。
- 验证方法：冻结三局phase/summary/anchor和毒药前后；改序须报告旧新参考、完整自爆/血挡/药水后继，并独立验证。
- 处置waiting：巨兽阶段与残壳毒水事实充分且有live诊断；同轮排序仍用raw占位血，缺改序完整受控后继与最终资源校准，不能直接归零改序。

## 7. 经验来源巨兽分阶段估值

- 原ID：silent-proposal-9733bb80f445aeae；来源任务：experience-update；实现任务：strategy-proposal。
- 账本：silent-0017, silent-0019, silent-0020, silent-0250；领域：combat, potion, sl, terminal；适用本批SILENT/A10，不外推其他角色/进阶。
- 原稿：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md；SHA256=c0da0af7803a73b361bb98e358c2a5c12b8056a68c28614a592138e7cdd88382，原字节另存original-07.txt。
- 支持：经验silent-giant-explosion-window及route/rest条目；YQL8RZ8BWN1E F17末T10残壳施毒，L9 F17 T14、PU F17 T17同轮占位排序证据。
- 反例与未知：末轮毒药的局部无收益不证明提前喝必胜；PU旧胜线不验证新参考排序。
- 旧行为/已有覆盖：阶段/药水说明已有实际live祖先；原经验active及账本上线状态保留，整战资源/新策略收益仍未知。
- 预期行为：沿原ID区分本体进度、自爆生存和实际资源；不写提前喝/固定留药或休息阈值。
- 验证方法：固定相同占位summary与完整毒药帧；策略收益须同输入/预算新排名后继及提前用/留药整战对照。
- 处置waiting：阶段/毒水说明已有live祖先；缺新排名完整受控后继和提前喝/留药整战结果，PU旧胜线不能验证新策略收益。

## 8. 七次耗药与跨战预算

- 原ID：silent-proposal-c51468c5e8ba6668；来源任务：postmortem；实现任务：strategy-proposal。
- 账本：silent-0019；领域：potion；适用本批SILENT/A10，不外推其他角色/进阶。
- 原稿：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md；SHA256=168cc03750525c56cace3915f22ef4dd1cf768f87b17e70f5228964a168c8469，原字节另存original-08.txt。
- 支持：KEN58SH9SLZ6：F3 T2攻击、F4 T1稳定、F5 T2速度、F11 T1虚弱/T2攻击、F15 T1发光/技能，共7次请求与槽位耗用；六次F17 T1均75/86空栏。
- 反例与未知：三条用药回执pending但后继槽位确实清空；pending不单独证明生效或整线。F15零净损不说明不喝同样零损。
- 旧行为/已有覆盖：单动作、相邻状态与整轮端点消费者已有；随机选牌/重问后完整候选收益仍未认证。
- 预期行为：按槽位及药ID分列取得/使用/弃药/SL恢复，随机选择与重算后的事实另列；持有价保持原规则。
- 验证方法：核七个请求身份及前后槽位，再认证选牌/重问完整收益；校准需F15不喝或保存到boss的完整受控支线。
- 处置waiting：七次耗药槽位及请求身份已核；随机选牌/重问后的完整候选收益未认证，缺F15不喝或留药到boss的受控整战支线。

## 9. 呼唤、无实体与能力兑现

- 原ID：silent-proposal-86a7db08d1a31976；来源任务：postmortem；实现任务：strategy-proposal。
- 账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176；领域：combat, sl；适用本批SILENT/A10，不外推其他角色/进阶。
- 原稿：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md；SHA256=10de295b469f48281050aeb04a8ad6ccb2906e007d48386a6c8f769cc7600ac6，原字节另存original-09.txt。
- 支持：KEN58SH9SLZ6 F17第4/5试T10同指纹：损15→21、净扣2→4，B2差−0.2583/SE0.0132。第4/6试T5同指纹省2血、步法T5延T9；末T8双防御各5，274604的小刀属于后继重问。
- 反例与未知：既反驳只看新增伤害，也反驳只看最低损血。后轮动作不同、六试全败，不能拟统一6血/2伤门槛。
- 旧行为/已有覆盖：SL预测血价与持牌事实已有；永久能力是否建立/当轮挡量可核，完整累计收益和候选因果仍未知。
- 预期行为：同时保留当轮血价、无实体实扣、能力建立时点及B2配对误差；原探索/护栏未改。
- 验证方法：固定T10两端及T5/T8/T9能力后继；新规则须保持其余后轮/抽序/预算一致的完整对照与独立后期局。
- 处置waiting：T10多损6只多2净扣与T5省2但延迟步法均复核；缺完整能力收益归属、后继保持一致的整战对照及独立验证，不能拟统一门槛。

## 10. 经验来源异鱼SL能力窗口

- 原ID：silent-proposal-e282a9131b99129a；来源任务：experience-update；实现任务：strategy-proposal。
- 账本：silent-0021, silent-0079, silent-0125, silent-0176；领域：combat, sl；适用本批SILENT/A10，不外推其他角色/进阶。
- 原稿：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md；SHA256=a88a2a95875b8fa04d80376a10a3ed59ede080db13ccb2a7e14c3ebfc1c34872，原字节另存original-10.txt。
- 支持：经验silent-fysh-resource-sl-observation、silent-deck-burst-observation、silent-beckon-held-end-turn-loss；KEN F17 T5/T10及实际末T6/T10/T12呼唤来源。
- 反例与未知：同存档六试相关且后继同时改变；原经验的历史支持总数不是本批独立验证数。
- 旧行为/已有覆盖：原经验及局部SL/持牌/能力事实已有；完整候选actual/causal结果仍null。
- 预期行为：沿原ID保存双向机会成本及能力窗口，未知整战不填胜率收益，不重复建ID或倒记shipped。
- 验证方法：同盘确定性公式用本批冻结帧验核；需要独立后期完整整战/完整候选归属才拟探索参数。
- 处置waiting：原经验与局部血价已有；六試相关且后继同变，完整候选因果仍未知，缺受控整战与独立后期样本，不能以子诊断关闭原提案。
