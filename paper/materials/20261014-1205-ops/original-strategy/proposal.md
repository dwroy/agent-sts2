# 本批十个原策略提案的逐项复核


角色：silent。批次：20261014-114302-s2-strategy-proposal。基线：`8ae20b998c2bdbebefae82a72dbcd0883d457312`。普通已领取队列任务，无research_request/implementation_request。

仅消费下列十个原id；原Markdown的SHA逐项一致，未覆盖原文、另建重复id或重复复盘。所有新材料仅在本批scratch。


## silent-proposal-366288801d9150d9


原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md

原SHA256：`0ba601d50f1341977ec60627d24994e0755ef1cf396a60832000400c5805c524`。来源任务：postmortem → strategy-proposal。账本：silent-0079、silent-0176。

证据局/层/回合：751FN9QM9MHQ F17 T2/T7/T13。

支持：同指纹换线：T2多5净损、多9敌净扣；T7多10净损、多6敌净扣；T13少6净损、少6敌净扣。三组B2/执行端点分别核实。

现有实现与反例：更差线全未试时现行SL仍可探索；预测resource_comparison及候选/派发日志已有。

本次结论：**waiting**。751 F17三组局部血价充分；缺跨抽弃/续问的完整候选归属、保持后继一致的整战及独立后期校准，不能拟额外失血门槛。

预期行为：保留原答、护栏后原线、SL替线、B2配对差/误差及实际后继分账；不增加5/10血准入阈值。

验证：先冻结上述状态、原题、原答、SL替线和真实后继；完成跨选择/抽牌/重问的候选归属，再用同输入/同预算的整战对照。规则参数须按独立局和真实时间切分，不能把同局SL拆成训练/验证独立局。当前只核日志和有限消费者，不声称完整胜线或泛化收益。

实施/回退：本批保留当前源码、排序、药水/HP护栏/SL规则，没有源码提交或发布号。已有子项不当本原id的完整duplicate；未来实现须独立固定验证、实际live祖先与双通知，回退只撤对应实现提交，原日志/经验/失败保持。


## silent-proposal-85929bdfc8a3fc1b


原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md

原SHA256：`d42d3f29d0d36b262352160a104dd8b97831ef9d8ecbbd4bce3dba367f9c8d68`。来源任务：postmortem → strategy-proposal。账本：silent-0019、silent-0021、silent-0005、silent-0007、silent-0129、silent-0176。

证据局/层/回合：751FN9QM9MHQ F13 T3、F17 T7/T13/T17。

支持：F13有药/无药模型均损8且8/8结束，只有用药分支实际执行；F17弃牌选择使保守持牌值与实损有差，首/末T7实际45→39。

现有实现与反例：held_loss_prediction区分未决弃牌与预测；potion_value_reference保持hold_hp=null和无药模型参考。

本次结论：**waiting**。751持牌未决和药水未知展示已有；缺F13无药或留到F17的完整支线，以及毒/荆棘/重问后归属，不能校准药价或弃牌规则。

预期行为：预测与实际分列，未知持有值保持null；保留无药候选、合法药水和原排序。

验证：先冻结上述状态、原题、原答、SL替线和真实后继；完成跨选择/抽牌/重问的候选归属，再用同输入/同预算的整战对照。规则参数须按独立局和真实时间切分，不能把同局SL拆成训练/验证独立局。当前只核日志和有限消费者，不声称完整胜线或泛化收益。

实施/回退：本批保留当前源码、排序、药水/HP护栏/SL规则，没有源码提交或发布号。已有子项不当本原id的完整duplicate；未来实现须独立固定验证、实际live祖先与双通知，回退只撤对应实现提交，原日志/经验/失败保持。


## silent-proposal-efd9f83ee9e1a6dc


原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md

原SHA256：`0065ae0291ac4675d0a895128c71c68b35602c3eb6b5887b92fca11891c29006`。来源任务：experience-update → strategy-proposal。账本：silent-0079、silent-0176。

证据局/层/回合：751FN9QM9MHQ F17 T2/T7/T13。

支持：与366288801d9150d9共享实盘支持，但本项另关联两条经验；六次SL全败仍只是一局。

现有实现与反例：已有预测/单动作子诊断并非来源经验要求的整轮实际血价审计。

本次结论：**waiting**。751经验提案局部成本已核；完整实际资源归属、受控整战与独立后期验证不足，已有子诊断不能关闭原经验提案。

预期行为：沿原经验和原id补追溯，不重复创建提案；等待完整归属及后期独立局。

验证：先冻结上述状态、原题、原答、SL替线和真实后继；完成跨选择/抽牌/重问的候选归属，再用同输入/同预算的整战对照。规则参数须按独立局和真实时间切分，不能把同局SL拆成训练/验证独立局。当前只核日志和有限消费者，不声称完整胜线或泛化收益。

实施/回退：本批保留当前源码、排序、药水/HP护栏/SL规则，没有源码提交或发布号。已有子项不当本原id的完整duplicate；未来实现须独立固定验证、实际live祖先与双通知，回退只撤对应实现提交，原日志/经验/失败保持。


## silent-proposal-131042659448ae74


原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md

原SHA256：`b1ff1ca1e5d3da182f25af9b0040780e288a77e627b08c2fee262a17f8f49951`。来源任务：experience-update → strategy-proposal。账本：silent-0019、silent-0020、silent-0021、silent-0005、silent-0006、silent-0007、silent-0046、silent-0129、silent-0176。

证据局/层/回合：751FN9QM9MHQ F13 T3、F17 T3/T5/T7/T17。

支持：步法建立2敏捷；无格挡牌时不能预支格挡。毒、荆棘和持牌失血分项来源已保留，F13无药仍只是模型。

现有实现与反例：预测能力/持牌/药水结构已有；selection_audit.actual_turn仍null，单动作回执也不认证整轮。

本次结论：**waiting**。751能力与资源结构展示已有；跨重问完整执行、逐轮能力兑现和无药/留药跨战支线未联合验证，不能登记整项duplicate。

预期行为：联合检查真实出牌/弃牌、能力建立窗口和各损伤来源；不把长期能力分数当当轮格挡。

验证：先冻结上述状态、原题、原答、SL替线和真实后继；完成跨选择/抽牌/重问的候选归属，再用同输入/同预算的整战对照。规则参数须按独立局和真实时间切分，不能把同局SL拆成训练/验证独立局。当前只核日志和有限消费者，不声称完整胜线或泛化收益。

实施/回退：本批保留当前源码、排序、药水/HP护栏/SL规则，没有源码提交或发布号。已有子项不当本原id的完整duplicate；未来实现须独立固定验证、实际live祖先与双通知，回退只撤对应实现提交，原日志/经验/失败保持。


## silent-proposal-990f054036609447


原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md

原SHA256：`c7fa0a97eea334f338e208a6bae8e709dce021cd3157dd32cb3ca1a45900e053`。来源任务：experience-update → strategy-proposal。账本：silent-0102、silent-0019、silent-0020。

证据局/层/回合：KV0JHNJCKXLS F33 T1/T4/T5。

支持：T5第4/5试同指纹，均零净损，敌净扣36→29；T1首/末同指纹敌净扣28→14仍无保血差。T4敌回血与毛/净扣必须另分。

现有实现与反例：候选预测和单动作回执不能推导完整毛伤害、敌回血或路线因果；原探索规则保留。

本次结论：**waiting**。KV F33两组同盘净资源已核；缺敌回血/毛伤的完整归属、候选末端认证、受控完整后继及路线/休息反事实。

预期行为：分别记录即时净损、敌毛伤、回血和下一轮成长；真实回血与SL恢复不混算。

验证：先冻结上述状态、原题、原答、SL替线和真实后继；完成跨选择/抽牌/重问的候选归属，再用同输入/同预算的整战对照。规则参数须按独立局和真实时间切分，不能把同局SL拆成训练/验证独立局。当前只核日志和有限消费者，不声称完整胜线或泛化收益。

实施/回退：本批保留当前源码、排序、药水/HP护栏/SL规则，没有源码提交或发布号。已有子项不当本原id的完整duplicate；未来实现须独立固定验证、实际live祖先与双通知，回退只撤对应实现提交，原日志/经验/失败保持。


## silent-proposal-e18d3f18e6cac2a0


原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md

原SHA256：`3cc66ab0b4fb05a0d6d4e62b514b13caf9e157eba4d781f5a60f76276047c821`。来源任务：postmortem → strategy-proposal。账本：silent-0017、silent-0250、silent-0011、silent-0027、silent-0046。

证据局/层/回合：YQL8RZ8BWN1E F17 T10/T13；L9SGRBB5R698 F17 T14；PU80F84P6HPN F17 T17。

支持：三局summary含近十亿占位HP；YQL用毒药前后26血/13挡/来袭41不变。当前enemyHpLeft/anchorRank仍读取原占位HP。

现有实现与反例：本体/自爆阶段解释已在live；统一残血归0会改变同轮平局，属于排序行为改变。

本次结论：**waiting**。三局巨兽阶段事实充分且展示已有；anchorRank仍比较原占位血，缺新排名的受控完整后继、最终资源适用校准和独立验证。

预期行为：保留原summary，分列本体0/自爆待结算/原占位HP；排序改变等待受控验证。

验证：先冻结上述状态、原题、原答、SL替线和真实后继；完成跨选择/抽牌/重问的候选归属，再用同输入/同预算的整战对照。规则参数须按独立局和真实时间切分，不能把同局SL拆成训练/验证独立局。当前只核日志和有限消费者，不声称完整胜线或泛化收益。

实施/回退：本批保留当前源码、排序、药水/HP护栏/SL规则，没有源码提交或发布号。已有子项不当本原id的完整duplicate；未来实现须独立固定验证、实际live祖先与双通知，回退只撤对应实现提交，原日志/经验/失败保持。


## silent-proposal-9733bb80f445aeae


原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md

原SHA256：`c0da0af7803a73b361bb98e358c2a5c12b8056a68c28614a592138e7cdd88382`。来源任务：experience-update → strategy-proposal。账本：silent-0017、silent-0019、silent-0020、silent-0250。

证据局/层/回合：YQL8RZ8BWN1E F17 T10；L9SGRBB5R698 F17 T14；PU80F84P6HPN F17 T15/T17。

支持：YQL毒2→8不是本体进度或减伤6；26+13−41=−2与死亡截断0区分。PU旧胜线不验证新排序或提前喝药。

现有实现与反例：giant_blast_current包含当前快照与单次观察，不提供提前喝、留药、终局权重的收益结论。

本次结论：**waiting**。YQL残壳增毒而HP/格挡/自爆不变已核；缺提前喝/不喝/留药与新参考排序的整战对照，PU旧胜线不能认证新策略。

预期行为：不将毒层当已兑现伤害，不删除药水选项；药水时机/终局权重维持现状。

验证：先冻结上述状态、原题、原答、SL替线和真实后继；完成跨选择/抽牌/重问的候选归属，再用同输入/同预算的整战对照。规则参数须按独立局和真实时间切分，不能把同局SL拆成训练/验证独立局。当前只核日志和有限消费者，不声称完整胜线或泛化收益。

实施/回退：本批保留当前源码、排序、药水/HP护栏/SL规则，没有源码提交或发布号。已有子项不当本原id的完整duplicate；未来实现须独立固定验证、实际live祖先与双通知，回退只撤对应实现提交，原日志/经验/失败保持。


## silent-proposal-c51468c5e8ba6668


原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md

原SHA256：`168cc03750525c56cace3915f22ef4dd1cf768f87b17e70f5228964a168c8469`。来源任务：postmortem → strategy-proposal。账本：silent-0019。

证据局/层/回合：KEN58SH9SLZ6 F3 T2/F4 T1/F5 T2/F11 T1,T2/F15 T1。

支持：七次真实饮用分别核对决策及前后槽位；三次回执pending但后帧槽位为空、进入CARD_SELECTION。六次boss入口75血且空药。

现有实现与反例：消费事实与随机选牌、发光水重问、完整候选收益分别记录；零损胜战不等于无药零损。

本次结论：**waiting**。KEN七次耗药充分；随机选牌/重问后的完整候选净收益及F15不喝、留药到boss的受控支线不足，不能校准跨战预算。

预期行为：保留逐槽位 consumption 证据，待完整效果与未饮用/留药支线再评估持有价。

验证：先冻结上述状态、原题、原答、SL替线和真实后继；完成跨选择/抽牌/重问的候选归属，再用同输入/同预算的整战对照。规则参数须按独立局和真实时间切分，不能把同局SL拆成训练/验证独立局。当前只核日志和有限消费者，不声称完整胜线或泛化收益。

实施/回退：本批保留当前源码、排序、药水/HP护栏/SL规则，没有源码提交或发布号。已有子项不当本原id的完整duplicate；未来实现须独立固定验证、实际live祖先与双通知，回退只撤对应实现提交，原日志/经验/失败保持。


## silent-proposal-86a7db08d1a31976


原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md

原SHA256：`10de295b469f48281050aeb04a8ad6ccb2906e007d48386a6c8f769cc7600ac6`。来源任务：postmortem → strategy-proposal。账本：silent-0079、silent-0021、silent-0125、silent-0005、silent-0176。

证据局/层/回合：KEN58SH9SLZ6 F17 T2/T5/T6/T8/T9/T10/T12/T13。

支持：T10第4/5试同指纹，敌净扣2→4、净损15→21；T5省2血却将步法T5延到T9。原HP护栏取消4毒的长期代价未知。

现有实现与反例：模型持牌分项、候选差及能力分数已有；少失血和未试线都不能独立视为整战更优。

本次结论：**waiting**。KEN T10血价与T5能力延迟已核；缺完整伤源/能力归属、保持后继一致的整战及独立校准，保留HP护栏与探索规则。

预期行为：同时核持牌失血、无实体实伤及能力兑现窗口，不写死6血/2伤通用阈值。

验证：先冻结上述状态、原题、原答、SL替线和真实后继；完成跨选择/抽牌/重问的候选归属，再用同输入/同预算的整战对照。规则参数须按独立局和真实时间切分，不能把同局SL拆成训练/验证独立局。当前只核日志和有限消费者，不声称完整胜线或泛化收益。

实施/回退：本批保留当前源码、排序、药水/HP护栏/SL规则，没有源码提交或发布号。已有子项不当本原id的完整duplicate；未来实现须独立固定验证、实际live祖先与双通知，回退只撤对应实现提交，原日志/经验/失败保持。


## silent-proposal-e282a9131b99129a


原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md

原SHA256：`a88a2a95875b8fa04d80376a10a3ed59ede080db13ccb2a7e14c3ebfc1c34872`。来源任务：experience-update → strategy-proposal。账本：silent-0021、silent-0079、silent-0125、silent-0176。

证据局/层/回合：KEN58SH9SLZ6 F17 T2/T5/T10，经验关联项。

支持：沿86a7同指纹支持和相反取舍复核；六试只是一组相关牌序，末试仍实际阵亡。

现有实现与反例：经验库文字和既有子诊断已存在，但原宽经验提案仍需完整反事实/后期验证。

本次结论：**waiting**。KEN双向取舍充分；六试相关，缺完整后继反事实和独立后期校准，不能由子诊断关闭原经验提案或拟统一血价。

预期行为：保留来源经验、原id和失败；更早独立局可作调参，本局及之后局留后期验证。

验证：先冻结上述状态、原题、原答、SL替线和真实后继；完成跨选择/抽牌/重问的候选归属，再用同输入/同预算的整战对照。规则参数须按独立局和真实时间切分，不能把同局SL拆成训练/验证独立局。当前只核日志和有限消费者，不声称完整胜线或泛化收益。

实施/回退：本批保留当前源码、排序、药水/HP护栏/SL规则，没有源码提交或发布号。已有子项不当本原id的完整duplicate；未来实现须独立固定验证、实际live祖先与双通知，回退只撤对应实现提交，原日志/经验/失败保持。

