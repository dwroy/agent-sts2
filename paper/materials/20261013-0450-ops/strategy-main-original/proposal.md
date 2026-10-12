# 本批十项策略提案核验

批次：20261013-041242-strategy-proposal；角色：silent；基线：6a4a4e1f171df830903d5fe60b6511ff11983e3b。
本批是普通专用队列消费，不承接根目录其他专题。十份原Markdown已逐字保存并核队列SHA256；不新增、领取或关闭其他提案。
本文件是本批核验补充，不替换原提案；未实现新的源码或游戏参数。

## silent-proposal-366288801d9150d9

来源任务：postmortem；实现任务：strategy-proposal。角色silent，仅本批已观察A10。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md；SHA256：0ba601d50f1341977ec60627d24994e0755ef1cf396a60832000400c5805c524。
证据局：751FN9QM9MHQ；既有账本：silent-0079, silent-0176。
原提案摘要：异鱼SL同盘换线多9伤付5血、多6伤付10血；补配对B2差与手持惩罚的成本审计，缺完整胜线不拟固定门槛。
处置：waiting。T2/T7/T13同盘血价已核；现有字段是预测与首次派发，缺续问后实际整轮归属、未执行原线和一致后继整战，不能定探索门槛。
验证：同盘六组差分见same-board-pairs.json；药水逐槽与紧随状态见potion-observations.json；巨兽阶段与复合回血分别见giant-stage-facts.json/demon-healing-facts.json；实际live子项祖先见source-ancestry.json。
反例/限制：同局SL尝试相关，后续抽牌和动作会变；预测、首次派发、整轮执行及整战因果分开。不得由缺值拟成0、由判死补未结算结果、由少损或多伤独自推出更优。
预期行为：本批保留当前已上线行为；后续若完整归属及对照充分，沿本角色授权独立实现。固定验证入口不提供新增阈值。
验证方法：冻结原状态与题目，按独立局时间切分；候选若改变排序或留药，需记录旧/新完整后继、抽序/用药/能力建立及其限制，再做固定源码撤除失败/恢复通过和沙箱检查。
回退：本批无提交或上线，无需代码回退；保留原件和失败记录，未来实现只撤对应独立提交。

## silent-proposal-85929bdfc8a3fc1b

来源任务：postmortem；实现任务：strategy-proposal。角色silent，仅本批已观察A10。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md；SHA256：d42d3f29d0d36b262352160a104dd8b97831ef9d8ecbbd4bce3dba367f9c8d68。
证据局：751FN9QM9MHQ；既有账本：silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176。
原提案摘要：分列未决弃呼唤的保守损血来源及肌肉药水持有价值未知，保留同题无药整战对照；本局不足制定留药或改变弃牌的固定规则。
处置：waiting。未决呼唤和持药未知已有live诊断；F13 plan5仅模型无药支线，缺实际无药、留药后继与抽弃重问后的联合兑现。
验证：同盘六组差分见same-board-pairs.json；药水逐槽与紧随状态见potion-observations.json；巨兽阶段与复合回血分别见giant-stage-facts.json/demon-healing-facts.json；实际live子项祖先见source-ancestry.json。
反例/限制：同局SL尝试相关，后续抽牌和动作会变；预测、首次派发、整轮执行及整战因果分开。不得由缺值拟成0、由判死补未结算结果、由少损或多伤独自推出更优。
预期行为：本批保留当前已上线行为；后续若完整归属及对照充分，沿本角色授权独立实现。固定验证入口不提供新增阈值。
验证方法：冻结原状态与题目，按独立局时间切分；候选若改变排序或留药，需记录旧/新完整后继、抽序/用药/能力建立及其限制，再做固定源码撤除失败/恢复通过和沙箱检查。
回退：本批无提交或上线，无需代码回退；保留原件和失败记录，未来实现只撤对应独立提交。

## silent-proposal-efd9f83ee9e1a6dc

来源任务：experience-update；实现任务：strategy-proposal。角色silent，仅本批已观察A10。
原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md；SHA256：0065ae0291ac4675d0a895128c71c68b35602c3eb6b5887b92fca11891c29006。
证据局：751FN9QM9MHQ；既有账本：silent-0079, silent-0176。
原提案摘要：静默A10异鱼SL配对血价与真实输出审计，保留未知整战胜因
处置：waiting。已有SL候选血价子项，但实际整轮结果仍空；751六试均败，缺同盘完整归属、受控胜线与独立后期验证。
验证：同盘六组差分见same-board-pairs.json；药水逐槽与紧随状态见potion-observations.json；巨兽阶段与复合回血分别见giant-stage-facts.json/demon-healing-facts.json；实际live子项祖先见source-ancestry.json。
反例/限制：同局SL尝试相关，后续抽牌和动作会变；预测、首次派发、整轮执行及整战因果分开。不得由缺值拟成0、由判死补未结算结果、由少损或多伤独自推出更优。
预期行为：本批保留当前已上线行为；后续若完整归属及对照充分，沿本角色授权独立实现。固定验证入口不提供新增阈值。
验证方法：冻结原状态与题目，按独立局时间切分；候选若改变排序或留药，需记录旧/新完整后继、抽序/用药/能力建立及其限制，再做固定源码撤除失败/恢复通过和沙箱检查。
回退：本批无提交或上线，无需代码回退；保留原件和失败记录，未来实现只撤对应独立提交。

## silent-proposal-131042659448ae74

来源任务：experience-update；实现任务：strategy-proposal。角色silent，仅本批已观察A10。
原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md；SHA256：b1ff1ca1e5d3da182f25af9b0040780e288a77e627b08c2fee262a17f8f49951。
证据局：751FN9QM9MHQ；既有账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176。
原提案摘要：静默A10逐张敏捷、毒/荆棘限伤、呼唤失血及药水持有价值未知的结构分账
处置：waiting。力量/敏捷/毒/荆棘/呼唤分项支持不等联合因果；缺实际无药、留药整战及跨续问的药水与能力收益归属。
验证：同盘六组差分见same-board-pairs.json；药水逐槽与紧随状态见potion-observations.json；巨兽阶段与复合回血分别见giant-stage-facts.json/demon-healing-facts.json；实际live子项祖先见source-ancestry.json。
反例/限制：同局SL尝试相关，后续抽牌和动作会变；预测、首次派发、整轮执行及整战因果分开。不得由缺值拟成0、由判死补未结算结果、由少损或多伤独自推出更优。
预期行为：本批保留当前已上线行为；后续若完整归属及对照充分，沿本角色授权独立实现。固定验证入口不提供新增阈值。
验证方法：冻结原状态与题目，按独立局时间切分；候选若改变排序或留药，需记录旧/新完整后继、抽序/用药/能力建立及其限制，再做固定源码撤除失败/恢复通过和沙箱检查。
回退：本批无提交或上线，无需代码回退；保留原件和失败记录，未来实现只撤对应独立提交。

## silent-proposal-990f054036609447

来源任务：experience-update；实现任务：strategy-proposal。角色silent，仅本批已观察A10。
原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md；SHA256：c7fa0a97eea334f338e208a6bae8e709dce021cd3157dd32cb3ca1a45900e053。
证据局：KV0JHNJCKXLS；既有账本：silent-0102, silent-0019, silent-0020。
原提案摘要：SL同盘输出血价、敌回血毛/净伤害与路线休息实际资源分账；缺整战对照不设门槛
处置：waiting。F33 T5删毒净削36→29而两线均零损；回血与毒同帧结算，缺完整实测分账归属及保持后继一致的整战对照。
验证：同盘六组差分见same-board-pairs.json；药水逐槽与紧随状态见potion-observations.json；巨兽阶段与复合回血分别见giant-stage-facts.json/demon-healing-facts.json；实际live子项祖先见source-ancestry.json。
反例/限制：同局SL尝试相关，后续抽牌和动作会变；预测、首次派发、整轮执行及整战因果分开。不得由缺值拟成0、由判死补未结算结果、由少损或多伤独自推出更优。
预期行为：本批保留当前已上线行为；后续若完整归属及对照充分，沿本角色授权独立实现。固定验证入口不提供新增阈值。
验证方法：冻结原状态与题目，按独立局时间切分；候选若改变排序或留药，需记录旧/新完整后继、抽序/用药/能力建立及其限制，再做固定源码撤除失败/恢复通过和沙箱检查。
回退：本批无提交或上线，无需代码回退；保留原件和失败记录，未来实现只撤对应独立提交。

## silent-proposal-e18d3f18e6cac2a0

来源任务：postmortem；实现任务：strategy-proposal。角色silent，仅本批已观察A10。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md；SHA256：3cc66ab0b4fb05a0d6d4e62b514b13caf9e157eba4d781f5a60f76276047c821。
证据局：YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN；既有账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046。
原提案摘要：瀑布巨兽本体／自爆分阶段，纠正SL残血包含不可击杀占位血的指标，并展示自爆阶段毒药水的已观察收益限制；排序改动缺受控后续时保留原行为。
处置：waiting。本体/占位/自爆已有live展示，旧占位血仍用于同轮排序；缺替代排序的受控完整后继与独立验证，不能直接抹零后称改善。
验证：同盘六组差分见same-board-pairs.json；药水逐槽与紧随状态见potion-observations.json；巨兽阶段与复合回血分别见giant-stage-facts.json/demon-healing-facts.json；实际live子项祖先见source-ancestry.json。
反例/限制：同局SL尝试相关，后续抽牌和动作会变；预测、首次派发、整轮执行及整战因果分开。不得由缺值拟成0、由判死补未结算结果、由少损或多伤独自推出更优。
预期行为：本批保留当前已上线行为；后续若完整归属及对照充分，沿本角色授权独立实现。固定验证入口不提供新增阈值。
验证方法：冻结原状态与题目，按独立局时间切分；候选若改变排序或留药，需记录旧/新完整后继、抽序/用药/能力建立及其限制，再做固定源码撤除失败/恢复通过和沙箱检查。
回退：本批无提交或上线，无需代码回退；保留原件和失败记录，未来实现只撤对应独立提交。

## silent-proposal-9733bb80f445aeae

来源任务：experience-update；实现任务：strategy-proposal。角色silent，仅本批已观察A10。
原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md；SHA256：c0da0af7803a73b361bb98e358c2a5c12b8056a68c28614a592138e7cdd88382。
证据局：YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN；既有账本：silent-0017, silent-0019, silent-0020, silent-0250。
原提案摘要：巨兽本体与自爆分阶段估值；残壳施毒和SL残血不当本体进度。
处置：waiting。末试毒2→8而血26/挡13/来袭41不变已核；缺提前喝、不喝、留药和阶段参考改序的完整对照。
验证：同盘六组差分见same-board-pairs.json；药水逐槽与紧随状态见potion-observations.json；巨兽阶段与复合回血分别见giant-stage-facts.json/demon-healing-facts.json；实际live子项祖先见source-ancestry.json。
反例/限制：同局SL尝试相关，后续抽牌和动作会变；预测、首次派发、整轮执行及整战因果分开。不得由缺值拟成0、由判死补未结算结果、由少损或多伤独自推出更优。
预期行为：本批保留当前已上线行为；后续若完整归属及对照充分，沿本角色授权独立实现。固定验证入口不提供新增阈值。
验证方法：冻结原状态与题目，按独立局时间切分；候选若改变排序或留药，需记录旧/新完整后继、抽序/用药/能力建立及其限制，再做固定源码撤除失败/恢复通过和沙箱检查。
回退：本批无提交或上线，无需代码回退；保留原件和失败记录，未来实现只撤对应独立提交。

## silent-proposal-c51468c5e8ba6668

来源任务：postmortem；实现任务：strategy-proposal。角色silent，仅本批已观察A10。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md；SHA256：168cc03750525c56cace3915f22ef4dd1cf768f87b17e70f5228964a168c8469。
证据局：KEN58SH9SLZ6；既有账本：silent-0019。
原提案摘要：核对本局七次实际耗药及75/86空栏boss入口；冻结逐槽位收益验证，缺少未饮用/留药整场对照，保留现行药水规则。
处置：waiting。七次饮用及六次75血空栏入口已核；缺随机选牌和续问的整轮收益归属、F15不喝与留药到boss的整战分支。
验证：同盘六组差分见same-board-pairs.json；药水逐槽与紧随状态见potion-observations.json；巨兽阶段与复合回血分别见giant-stage-facts.json/demon-healing-facts.json；实际live子项祖先见source-ancestry.json。
反例/限制：同局SL尝试相关，后续抽牌和动作会变；预测、首次派发、整轮执行及整战因果分开。不得由缺值拟成0、由判死补未结算结果、由少损或多伤独自推出更优。
预期行为：本批保留当前已上线行为；后续若完整归属及对照充分，沿本角色授权独立实现。固定验证入口不提供新增阈值。
验证方法：冻结原状态与题目，按独立局时间切分；候选若改变排序或留药，需记录旧/新完整后继、抽序/用药/能力建立及其限制，再做固定源码撤除失败/恢复通过和沙箱检查。
回退：本批无提交或上线，无需代码回退；保留原件和失败记录，未来实现只撤对应独立提交。

## silent-proposal-86a7db08d1a31976

来源任务：postmortem；实现任务：strategy-proposal。角色silent，仅本批已观察A10。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md；SHA256：10de295b469f48281050aeb04a8ad6ccb2906e007d48386a6c8f769cc7600ac6。
证据局：KEN58SH9SLZ6；既有账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176。
原提案摘要：验证SL无实体上留呼唤多损6仅增2伤与步法延迟的兑现成本；冻结同指纹对照，补血价/能力拆项，完整后续与新局证据不足时保留现行排序及护栏。
处置：waiting。T10多6血仅多2伤、T5省2血却步法延至T9；缺受控能力后继及新独立局验证，不拟统一血价或关闭探索。
验证：同盘六组差分见same-board-pairs.json；药水逐槽与紧随状态见potion-observations.json；巨兽阶段与复合回血分别见giant-stage-facts.json/demon-healing-facts.json；实际live子项祖先见source-ancestry.json。
反例/限制：同局SL尝试相关，后续抽牌和动作会变；预测、首次派发、整轮执行及整战因果分开。不得由缺值拟成0、由判死补未结算结果、由少损或多伤独自推出更优。
预期行为：本批保留当前已上线行为；后续若完整归属及对照充分，沿本角色授权独立实现。固定验证入口不提供新增阈值。
验证方法：冻结原状态与题目，按独立局时间切分；候选若改变排序或留药，需记录旧/新完整后继、抽序/用药/能力建立及其限制，再做固定源码撤除失败/恢复通过和沙箱检查。
回退：本批无提交或上线，无需代码回退；保留原件和失败记录，未来实现只撤对应独立提交。

## silent-proposal-e282a9131b99129a

来源任务：experience-update；实现任务：strategy-proposal。角色silent，仅本批已观察A10。
原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md；SHA256：a88a2a95875b8fa04d80376a10a3ed59ede080db13ccb2a7e14c3ebfc1c34872。
证据局：KEN58SH9SLZ6；既有账本：silent-0021, silent-0079, silent-0125, silent-0176。
原提案摘要：异鱼同指纹SL并核持牌血价、无实体实伤与步法建立窗口；完整反事实不足保留探索规则
处置：waiting。候选/持牌/首次派发已有live子项；缺续问完整执行归属、同后继整战和时间靠后的独立验证，不能将子项记成整项完成。
验证：同盘六组差分见same-board-pairs.json；药水逐槽与紧随状态见potion-observations.json；巨兽阶段与复合回血分别见giant-stage-facts.json/demon-healing-facts.json；实际live子项祖先见source-ancestry.json。
反例/限制：同局SL尝试相关，后续抽牌和动作会变；预测、首次派发、整轮执行及整战因果分开。不得由缺值拟成0、由判死补未结算结果、由少损或多伤独自推出更优。
预期行为：本批保留当前已上线行为；后续若完整归属及对照充分，沿本角色授权独立实现。固定验证入口不提供新增阈值。
验证方法：冻结原状态与题目，按独立局时间切分；候选若改变排序或留药，需记录旧/新完整后继、抽序/用药/能力建立及其限制，再做固定源码撤除失败/恢复通过和沙箱检查。
回退：本批无提交或上线，无需代码回退；保留原件和失败记录，未来实现只撤对应独立提交。

