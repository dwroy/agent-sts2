# 本批静默猎手十项已领取提案逐项处置

记录时间：2026-10-13T02:24:15+08:00；批次：20261013-021302-s2-strategy-proposal；base：`17111a11e2870392a7cb11f57d64fb5865ddf9bf`。

本批普通队列，只处理dispatch.json的十个CLI id；无专题/implementation_request。六局唯一runs记录均SILENT/A10，游戏判断只使用这六局已执行记录。十项完整需求仍waiting；已有诊断子项不冒报完整实现。以下同时保存证据、账本、反例、预期行为和验证范围。

### silent-proposal-366288801d9150d9

来源：postmortem → strategy-proposal；角色silent/A10；领域：sl, combat。

账本：silent-0079, silent-0176。证据：751FN9QM9MHQ F17 T2/T7/T13；decisions272434/272575、272531/272652；sl945—950。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md`；SHA256：`0ba601d50f1341977ec60627d24994e0755ef1cf396a60832000400c5805c524`，原文完整保存在本批*.original.md。

处置：**waiting**。751 F17 T2/T7/T13实损13→18、13→23、8→2与敌净削9→18、12→18、17→11已复算。已有候选资源/B2诊断，实际整轮字段仍空；缺确定弃牌后全轮分账、SL覆盖与续问归属及保持后继不变的整战验证，不能拟额外血价门槛。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-85929bdfc8a3fc1b

来源：postmortem → strategy-proposal；角色silent/A10；领域：combat, potion。

账本：silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176。证据：751FN9QM9MHQ F13 T3、F17 T7/T13/T17；decision272361；states278403/278404、278500—278505。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md`；SHA256：`d42d3f29d0d36b262352160a104dd8b97831ef9d8ecbbd4bce3dba367f9c8d68`，原文完整保存在本批*.original.md。

处置：**waiting**。751 F13 T3有药plan2与严格无药plan5均模型8/8赢、损8，但没有实际无药整战或留药boss支线；plan3后继7/8喝药。未知持有价和持牌来源已有展示，缺实际分支及弃牌后毒/荆棘/药水的联合兑现核验，不能给持有价填0。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-efd9f83ee9e1a6dc

来源：experience-update → strategy-proposal；角色silent/A10；领域：sl, combat。

账本：silent-0079, silent-0176。证据：751FN9QM9MHQ F17 T2/T7/T13；sl945—950；同上配对题。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md`；SHA256：`0065ae0291ac4675d0a895128c71c68b35602c3eb6b5887b92fca11891c29006`，原文完整保存在本批*.original.md。

处置：**waiting**。751已有live祖先66283dd9982bdd7f480da7a4d9bfefea0572a9ac的SL预测分账及9d8278702dbc581b5015ba7ec9a70dc0fb94cccb的持牌/pending子项。未覆盖原提案要求的整轮实际结果与确定弃牌后分账；六次相关SL没有完整受控胜线，不能登记整项duplicate或改探索门槛。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-131042659448ae74

来源：experience-update → strategy-proposal；角色silent/A10；领域：combat, potion。

账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176。证据：751FN9QM9MHQ F13 T3、F17 T7；states278403/278404、278500—278505。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md`；SHA256：`b1ff1ca1e5d3da182f25af9b0040780e288a77e627b08c2fee262a17f8f49951`，原文完整保存在本批*.original.md。

处置：**waiting**。751 F13肌肉药实际建立5力量、F17 T7全挡后持一呼唤仍损6已核；敏捷/毒/荆棘/呼唤/药价各自预测不能替代联合实际结果。缺同题无药实战、选择与重问完整归属，保留饮药、护栏与弃牌规则。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-990f054036609447

来源：experience-update → strategy-proposal；角色silent/A10；领域：combat, sl。

账本：silent-0102, silent-0019, silent-0020。证据：KV0JHNJCKXLS F33 T5/T6；decisions273400/273450/273451；sl955/956。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md`；SHA256：`c7fa0a97eea334f338e208a6bae8e709dce021cd3157dd32cb3ca1a45900e053`，原文完整保存在本批*.original.md。

处置：**waiting**。KV F33 T5首次题273400/273450同指纹，删毒药后两线均零损、敌净削36→29；T6动作也变。缺跨续问的毒/敌回血毛净伤分账及相同后继的整战，不能将少输出称为保血收益或定SL阈值。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-e18d3f18e6cac2a0

来源：postmortem → strategy-proposal；角色silent/A10；领域：combat, potion, sl, terminal。

账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046。证据：L9SGRBB5R698 F17 T14、PU80F84P6HPN F17 T17、YQL8RZ8BWN1E F17 T10/T13；sl679/682、715/716、958—963；anchor引用另列。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md`；SHA256：`3cc66ab0b4fb05a0d6d4e62b514b13caf9e157eba4d781f5a60f76276047c821`，原文完整保存在本批*.original.md。

处置：**waiting**。L9 F17 T14、PU F17 T17、YQL F17 T13的SL占位血原行已核；巨兽阶段/末态资源展示已有live实现。anchorRank仍用原始占位血作同轮排序，归零会改变旧平局选择；缺新参考路径完整受控后继与独立验证，PU第五试胜不证明新排序有效。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-9733bb80f445aeae

来源：experience-update → strategy-proposal；角色silent/A10；领域：combat, potion, sl, terminal。

账本：silent-0017, silent-0019, silent-0020, silent-0250。证据：YQL8RZ8BWN1E F17 T10；L9/PU F17；states280160/280161；decision274087。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md`；SHA256：`c0da0af7803a73b361bb98e358c2a5c12b8056a68c28614a592138e7cdd88382`，原文完整保存在本批*.original.md。

处置：**waiting**。YQL F17 T10 states280160→280161只有毒2→8，HP26、挡13、来袭41不变；已有40168f4a903ae1d8c48bd03006f8fea19fd3aa3c展示此实录。缺提前用药/不喝/留药的整战及改参考排序的受控验证，不能把新增6毒当减伤或持有价值。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-c51468c5e8ba6668

来源：postmortem → strategy-proposal；角色silent/A10；领域：potion。

账本：silent-0019。证据：KEN58SH9SLZ6 F3 T2、F4 T1、F5 T2、F11 T1/T2、F15 T1；states280206/207、280232/233、280262/263、280313/314、280315/316、280348/349、280354/355。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md`；SHA256：`168cc03750525c56cace3915f22ef4dd1cf768f87b17e70f5228964a168c8469`，原文完整保存在本批*.original.md。

处置：**waiting**。KEN七次实际饮药逐槽位已核；攻击/技能药进入选择，发光水后重问，原候选中位例不保证实际选牌。缺逐候选与整轮实际效果归属、F15不喝及任一药留到boss的完整对照，保留持有价值与跨战预算。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-86a7db08d1a31976

来源：postmortem → strategy-proposal；角色silent/A10；领域：combat, sl。

账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176。证据：KEN58SH9SLZ6 F17 T5/T9/T10；decisions274484/274601、274505/274568；states280701/280702；sl967—969。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md`；SHA256：`10de295b469f48281050aeb04a8ad6ccb2906e007d48386a6c8f769cc7600ac6`，原文完整保存在本批*.original.md。

处置：**waiting**。KEN F17 T10第4/5试同指纹多损6仅多净削2；T5第4/6试省2血却将步法T5延至T9，且续问追加小刀。缺能力后继受控收益及独立时间留出验证，不能拟统一6血/2伤门槛或只保血排序。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-e282a9131b99129a

来源：experience-update → strategy-proposal；角色silent/A10；领域：combat, sl。

账本：silent-0021, silent-0079, silent-0125, silent-0176。证据：KEN58SH9SLZ6 F17 T5/T9/T10；同上一项配对题、sl与能力建立原帧。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md`；SHA256：`a88a2a95875b8fa04d80376a10a3ed59ede080db13ccb2a7e14c3ebfc1c34872`，原文完整保存在本批*.original.md。

处置：**waiting**。KEN已有持牌、SL候选及首次派发诊断，actual_turn/actual_turn_result仍空。T5能力延迟与T10持牌血价均属一局相关SL，缺完整动作/选择归属、固定其他后继的整战与后期独立局，不能把已有子项报完整implemented/duplicate。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。
