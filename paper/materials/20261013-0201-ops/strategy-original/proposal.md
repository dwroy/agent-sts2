# 本批十项策略提案处置

记录时间：2026-10-13T01:56:21+08:00；批次20261013-014201-s2-strategy-proposal；角色silent/A10；来源及实现任务strategy-proposal。

本批只处理派发十项，不新建重复提案。结论：各原提案已具局部成本证据及部分已有源码，但原完整验证范围仍缺数据，全部waiting。无代码、规则、知识或live变化，不拟固定血价/药价/排序参数。各项反例、旧行为、已有源码与未完成范围见同目录report.md。

### silent-proposal-366288801d9150d9

来源：postmortem → strategy-proposal；领域：sl, combat；账本：silent-0079, silent-0176；证据局：751FN9QM9MHQ。

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md`；SHA256：`0ba601d50f1341977ec60627d24994e0755ef1cf396a60832000400c5805c524`。

处置：**waiting**。751 F17 T2/T7/T13同指纹实损13→18、13→23、8→2及净削9→18、12→18、17→11已核。live已有候选资源/B2/首次派发子项，但actual_turn仍空；T7生存者进入pending后才选弃牌，缺确定弃牌后的全轮收益归属和保持后继/随机输入一致的整战验证，不拟额外血价门槛。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-85929bdfc8a3fc1b

来源：postmortem → strategy-proposal；领域：combat, potion；账本：silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176；证据局：751FN9QM9MHQ。

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md`；SHA256：`d42d3f29d0d36b262352160a104dd8b97831ef9d8ecbbd4bce3dba367f9c8d68`。

处置：**waiting**。751 F13 T3有药plan2和严格整战无药plan5均模型8/8赢、损8，终结均值2.3/2.9轮；plan3后续7/8仍喝药。未知持有价值及持牌保守来源已展示，缺实际无药/留药后继与确定弃牌后毒、荆棘、持牌/药价的联合执行验证，不能把缺表0拟成留药价值。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-efd9f83ee9e1a6dc

来源：experience-update → strategy-proposal；领域：sl, combat；账本：silent-0079, silent-0176；证据局：751FN9QM9MHQ。

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md`；SHA256：`0065ae0291ac4675d0a895128c71c68b35602c3eb6b5887b92fca11891c29006`。

处置：**waiting**。751的SL成本预测已有live祖先66283dd9982bdd7f480da7a4d9bfefea0572a9ac，持牌pending拆项已有9d8278702dbc581b5015ba7ec9a70dc0fb94cccb；两者不能补出确定弃牌后的全轮分账与更差B2线的受控后继，六次SL仅一独立局，原完整提案仍waiting。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-131042659448ae74

来源：experience-update → strategy-proposal；领域：combat, potion；账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176；证据局：751FN9QM9MHQ。

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md`；SHA256：`b1ff1ca1e5d3da182f25af9b0040780e288a77e627b08c2fee262a17f8f49951`。

处置：**waiting**。751 F17 T7实际一呼唤失6、全挡仍损6及F13肌肉药建5力量已核；已有持牌/药价参考不是敏捷、毒、荆棘、呼唤和药水的联合实际收益核验。缺同题实际无药整战及完整续问归属，不调整饮药/护栏/弃牌排序。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-990f054036609447

来源：experience-update → strategy-proposal；领域：combat, sl；账本：silent-0102, silent-0019, silent-0020；证据局：KV0JHNJCKXLS。

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md`；SHA256：`c7fa0a97eea334f338e208a6bae8e709dce021cd3157dd32cb3ca1a45900e053`。

处置：**waiting**。KV F33 T5首次题273400/273450同指纹，删致命毒药后净削36→29、两线均零损，273451续问阻止补毒且T6改线；缺跨问毒/回血毛净伤归属与保持后继一致的整战，不把删输出称保血收益，也不拟SL门槛。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-e18d3f18e6cac2a0

来源：postmortem → strategy-proposal；领域：combat, potion, sl, terminal；账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046；证据局：YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN。

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md`；SHA256：`3cc66ab0b4fb05a0d6d4e62b514b13caf9e157eba4d781f5a60f76276047c821`。

处置：**waiting**。巨兽阶段及最终资源展示已有live祖先源码；L9 F17 T14、PU T17、YQL T13占位HP原行已核。当前anchorRank仍以原始占位血作同轮比较，改为本体0会改变旧平局选择；缺改序后的完整后继及独立验证，PU末试胜不能归因于新排序，不能把阶段展示当整项完成。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-9733bb80f445aeae

来源：experience-update → strategy-proposal；领域：combat, potion, sl, terminal；账本：silent-0017, silent-0019, silent-0020, silent-0250；证据局：YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN。

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md`；SHA256：`c0da0af7803a73b361bb98e358c2a5c12b8056a68c28614a592138e7cdd88382`。

处置：**waiting**。YQL F17 T10 states280160→280161仅毒2→8，HP26/挡13/自爆41不变，当前巨兽药水观察展示已有40168f4a903ae1d8c48bd03006f8fea19fd3aa3c。缺提前喝/不喝/留药及改SL参考排序的受控整战，不把6毒当减伤或新药价。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-c51468c5e8ba6668

来源：postmortem → strategy-proposal；领域：potion；账本：silent-0019；证据局：KEN58SH9SLZ6。

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md`；SHA256：`168cc03750525c56cace3915f22ef4dd1cf768f87b17e70f5228964a168c8469`。

处置：**waiting**。KEN七次实际耗药槽位均由原状态核实；攻击/技能药进入选牌，发光水后另问，F15技能药的中位例取逃脱计划而实际后续另选，原候选不等完整执行。缺逐候选整轮收益归属、F15不喝及任一药留到boss的对照，暂保留持有价值规则。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-86a7db08d1a31976

来源：postmortem → strategy-proposal；领域：combat, sl；账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176；证据局：KEN58SH9SLZ6。

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md`；SHA256：`10de295b469f48281050aeb04a8ad6ccb2906e007d48386a6c8f769cc7600ac6`。

处置：**waiting**。KEN F17 T10第4/5试同指纹多损6仅多净削2；T5第4/6试省2血、追加小刀后多净削1，却把步法T5延至T9（states280701→280702才建2敏）。缺能力后续完整收益及同后继/独立验证，不从无实体局部6血/2伤写统一探索阈值。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-e282a9131b99129a

来源：experience-update → strategy-proposal；领域：combat, sl；账本：silent-0021, silent-0079, silent-0125, silent-0176；证据局：KEN58SH9SLZ6。

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md`；SHA256：`a88a2a95875b8fa04d80376a10a3ed59ede080db13ccb2a7e14c3ebfc1c34872`。

处置：**waiting**。KEN持牌预测/候选比较及首次派发子项已有实际live祖先，实际整轮字段仍空；T5省血同时延迟能力、T10多血价只加2实伤说明双向成本，但六次重打非独立样本，缺保持后继不变的换线因果与后期独立验证，不能登记完整implemented/duplicate。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

## 共同边界、验证及回退

当前SL在未强制notWorseOnly时保留更差未试线探索，巨兽参考排序保留原始占位HP，药水未知持有价值不当0经验；原有HP护栏与必死/SL判定保持。这里只核实证据，未删除合法选项或借其他角色数据。

拟议行为是补原答/护栏后/SL后/确定选牌后/实际回合的同链分账，再依据本角色可验证后继决定是否改规则。6组同指纹资源差与7次槽位消耗已从原行核验，模型无药/留药分支不是实盘；其他角色和未观察进阶没有改变。

不把同局六次SL作六个独立样本；若拟合参数用早局训练与真实时间后期独立验证，保留未观察和被SL截断部分为未知。新的规则实现须做固定撤源码失败/恢复通过、自测及实际live流程，之后才通知与登记，不以此报告冒称已实现。当前无提交无需回退；未来仅撤回对应独立实现提交，保留本材料、旧记录、失败与账本。
