# 本批十项策略提案复核

记录时间：2026-10-13T08:45:19+08:00。角色：silent；观察范围：六个派发局，均A10。
批次：20261013-083432-strategy-proposal；普通队列，task=strategy-proposal，reason=proposal。无research_request/implementation_request/proposal_repair。绑定工作树与本题一致，只处理原十个proposal_ids。原deck-size专题绑定另一批，故本批未进入专题。
完整base：`a004ba332951bac7e846d78293fd359771550238`；开工status干净，按任务git merge --no-edit main结果Already up to date。
十份原Markdown已按队列SHA核实并保存.original.md；官方fold保存queue-fold.json，16项本角色账本保存ledger-before.json。已有id沿用，不另建重复提案或改原提案。
证据：复用旧offset索引仅作定位，独立回读根logs原字节；8293条SHA均通过，来源行/offset/bytes/sha256保存在各*-index.jsonl。实际分析为六局的有界提案证据，不声称全历史研究。
## 已有实现与覆盖限制

14份相关源码按完整base与实际live HEAD保存原字节.txt；源码祖先、SHA与工作树是否匹配见source-manifest.json。六份源码差异仅41处Roy→Dai注释归属，source-difference-classification.json逐行核实；实际执行逻辑等价。

持牌失血/未知弃牌、药水holdHp=null/全战无药参考、SL原/换即时资源和B2配对、原答/护栏/SL快照、首次派发回执、巨兽阶段及残壳用药实盘说明均已有。候选的actual_turn和actual_turn_result仍null；单步state_effect_verified=false、whole_plan_executed=null；巨兽enemyHpLeft/anchorRank仍用原始显示HP作同轮tie-break。预测、单步返回、实际整轮及受控整战是不同证据，现有子项不关闭整条提案。

已有源码祖先（均核为实际live祖先，完整映射见source-manifest.json）：

- `agent/src/reflex/silent-held-loss.ts`：`05cd292c6f01bb31e406473d3a9843e659d62b93`。
- `agent/src/reflex/silent-potion-reference.ts`：`04921bd785ac6838066522f91ea0bb6ab95cb6a1`。
- `agent/src/reflex/silent-giant-potion.ts`：`d5e20aa4dd44168ce30944dfcce74f8322144953`。
- `agent/src/reflex/silent-selection-audit.ts`：`05cd292c6f01bb31e406473d3a9843e659d62b93`。
- `agent/src/reflex/silent-selection-dispatch.ts`：`bade647f9fe4c9103b40e2f26b26296692ad24b7`。
- `agent/src/reflex/silent-sl-comparison.ts`：`a8b1f8be153fe4f3a34146117546c2178f2e446b`。
- `agent/src/reflex/silent-sl-resource-comparison.ts`：`a8b1f8be153fe4f3a34146117546c2178f2e446b`。
- `agent/src/sl/attempts.ts`：`0d092f6b928a6221eabf3516abad25c48ceaac9c`。

## silent-proposal-366288801d9150d9

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md。来源任务：postmortem；实现任务：strategy-proposal；领域：sl, combat。账本：silent-0079, silent-0176。

证据局/层/回合：751FN9QM9MHQ，F17 T2/T7；decisions 272434/272575、272531/272652。

支持：同指纹换线实净损13→18、多5；13→23、多10；本体净扣9→18、12→18。T7未决弃牌的保守多计6不改变配对10血差。

反例与未知：KEN T5省血但延迟能力建立；不能只依当轮最小损血排序。两条751线后续动作、抽序也改变。

处置：waiting。已有SL资源预测、B2差/误差、候选审计和单步回执；完整actual_turn仍null。缺抽弃续问后的实际整轮归属，以及保持后继一致的整战对照，不能制定额外失血准入门槛。

预期行为：本批保留当前选择及排序。补齐后允许按Roy-2026-10-07-learning修改已授权规则；授权不是机制、权重或收益证据。

验证方法：按同盘原/换线冻结后续重放，分别核持牌、自损、格挡、B2及实际执行；更早独立局调参，后期独立局验证，不把六试拆成六个样本。

## silent-proposal-85929bdfc8a3fc1b

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md。来源任务：postmortem；实现任务：strategy-proposal；领域：combat, potion。账本：silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176。

证据局/层/回合：751FN9QM9MHQ，F13 T3；decision 272361；题面state 278402。F17 T7为持牌边界。

支持：plan2饮肌肉药：预测损8/伤26、8/8结束；plan5全战无药：损8/伤16、8/8结束，结束时点均值2.3/2.9。plan3只是本轮不用、后续7/8样本仍喝，不能替代plan5。实际先防御再喝，只有用药分支。

反例与未知：题面缺表成本0不证明持有价值0；未执行plan5或留药boss分支。实际弃掉一张呼唤后模型保守上界不等于实际失血。

处置：waiting。已有持牌保守损血和未知持有价值/整战无药参考。缺实际无药、留药的完整分支及续问后的收益归属，不能拟持有价值或固定留药规则。

预期行为：本批保留当前选择及排序。补齐后允许按Roy-2026-10-07-learning修改已授权规则；授权不是机制、权重或收益证据。

验证方法：核原题plan2/3/5用药范围、原chosen及真实药槽变化；新增同角色后续战的使用/未使用支线，单列随机效果与重规划，保留原排序及所有选项。

## silent-proposal-efd9f83ee9e1a6dc

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md。来源任务：experience-update；实现任务：strategy-proposal；领域：sl, combat。账本：silent-0079, silent-0176。

证据局/层/回合：751FN9QM9MHQ，F17 T2/T7；同上四条配对decision，六次boss入口均63/76空栏。

支持：四条同盘决策复核与原经验提案一致；六次相关SL全部失败，原/换线实际资源代价不是六个独立验证局。

反例与未知：早期历史胜次是不同局且后续抽序/动作同变；本批没有同后继受控胜线。

处置：waiting。既有候选预测和单步派发不覆盖完整actual_turn；缺同后继整战、独立时间留出验证，不拟统一血价。经验与复盘两条原id均保留，不合并或重建id。

预期行为：本批保留当前选择及排序。补齐后允许按Roy-2026-10-07-learning修改已授权规则；授权不是机制、权重或收益证据。

验证方法：使用同一底板、同一随机输入重放两线，报告整战损血/存活/输出窗口及未建能力；按独立局时间切分，不把同局六试混入训练和验证。

## silent-proposal-131042659448ae74

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md。来源任务：experience-update；实现任务：strategy-proposal；领域：combat, potion。账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176。

证据局/层/回合：751FN9QM9MHQ，F13 T3、F17 T7/T17；账本机制与原经验关联保留。

支持：F13有药/全战无药模型并列、实际只有用药；F17已有持牌损失与未决弃牌拆项。原提案的敏捷、力量、毒、荆棘、临时减力是不同来源。

反例与未知：敏捷建立不等于手上无格挡牌时自动获得格挡；末轮敌仍活不证明毒或荆棘公式错误。分项证据不构成整套规则收益验证。

处置：waiting。各分项诊断已存在；没有实际无药/留药完整对照及抽弃重问后联合收益归属，不能据子项关闭整项或调整药水/出牌权重。

预期行为：本批保留当前选择及排序。补齐后允许按Roy-2026-10-07-learning修改已授权规则；授权不是机制、权重或收益证据。

验证方法：对现有账本各机制分别固定核验，不合并有效样本数；补全过程动作与来源事件、独立后期局，再验证联合排序。

## silent-proposal-990f054036609447

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md。来源任务：experience-update；实现任务：strategy-proposal；领域：combat, sl。账本：silent-0102, silent-0019, silent-0020。

证据局/层/回合：KV0JHNJCKXLS，F33 T5：273400/273450，第4/5试；T1：273242/273474，第1/6试。

支持：两组各同指纹。删毒后当轮净扣36→29且两线零损；删究极打击净扣28→14也都零损。记录是到下一轮的净血差，敌回血/毒需分账。

反例与未知：没有省血收益不能称删输出是保血；后轮动作亦变，不能单归这步导致整战失败。F28改线后的旧路线预测未执行。

处置：waiting。即时候选成本已有；缺敌回血/毒/攻击完整事件归属与保持后继一致的整战对照，也缺实际路线反事实，保留探索/路线规则。

预期行为：本批保留当前选择及排序。补齐后允许按Roy-2026-10-07-learning修改已授权规则；授权不是机制、权重或收益证据。

验证方法：固定同盘T1/T5，毛伤、回血、下一轮毒/成长分别核；保持后续一致的重放作为模型对照，新增独立实盘再验证，不预支被SL截断的轮次。

## silent-proposal-e18d3f18e6cac2a0

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md。来源任务：postmortem；实现任务：strategy-proposal；领域：combat, potion, sl, terminal。账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046。

证据局/层/回合：YQL8RZ8BWN1E，F17六试；T10 states 280160/280161。L9SGRBB5R698 F17 sl681；PU80F84P6HPN F17 sl717。

支持：YQL六次自爆来袭50/50/47/50/50/41。末试毒2→8，血26、挡13、来袭41不变。原sl681/717及960的explore.target.anchor明确记录近十亿占位血；PU同T17以999999981/999999989参与排名。

反例与未知：本体结束仍须承受自爆；直接统一残血为0会改同轮平局路径，未核缺口和后继不能称改善。最长存活优先是另一规则。

处置：waiting。已有阶段与占位解释、残壳药水实盘说明；同轮参考仍按原始占位血排序。缺改变排序的完整受控后继及独立验证，不能把展示子项记整项duplicate。

预期行为：本批保留当前选择及排序。补齐后允许按Roy-2026-10-07-learning修改已授权规则；授权不是机制、权重或收益证据。

验证方法：保存原summary及旧选择，分别核本体结束、自爆来袭、最终血挡/未知修饰；补旧/新参考完整后继对照，保持未观察角色/等级等价。

## silent-proposal-9733bb80f445aeae

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md。来源任务：experience-update；实现任务：strategy-proposal；领域：combat, potion, sl, terminal。账本：silent-0017, silent-0019, silent-0020, silent-0250。

证据局/层/回合：YQL8RZ8BWN1E，F17 T10 states 280160/280161；同上L9/PU来源。

支持：实喝毒药只新增6毒层，现场HP/挡/来袭都不变；本体进度0与未赢战分开。六次是同一局，不是六个药水验证局。

反例与未知：没有更早喝药、不喝或留药整战分支；不能由晚喝局部无减伤倒推必须早喝或药水持有价值0。

处置：waiting。阶段/残壳收益说明已有；缺提前喝、全战不喝、留药以及阶段排序改动的整战对照，不拟药水/终局权重。

预期行为：本批保留当前选择及排序。补齐后允许按Roy-2026-10-07-learning修改已授权规则；授权不是机制、权重或收益证据。

验证方法：固定末T10原帧核事实；补同角色、同入口独立支线及阶段排序旧/新执行，模型与实盘分栏，不把新增毒层计作已兑现伤害。

## silent-proposal-c51468c5e8ba6668

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md。来源任务：postmortem；实现任务：strategy-proposal；领域：potion。账本：silent-0019。

证据局/层/回合：KEN58SH9SLZ6，F3 T2、F4 T1、F5 T2、F11 T1/T2、F15 T1；states 280206/207、280232/233、280262/263、280313/314、280315/316、280348/349、280354/355。

支持：七次真实药槽减少均复核；六次F17入口都75/86空栏。F15发光水与技能药是不同动作窗口，随机选牌及续问与整轮收益需另核。

反例与未知：F15实际零损且喝两药，不等于不喝仍零损；没有任一保留到boss的受控结果。SL恢复不是取得或饮用。

处置：waiting。已有药水候选/单步执行诊断；随机选牌、发光水重问后的整轮兑现没有完整结构化归属，缺F15不喝或留到boss完整支线，保留跨战预算。

预期行为：本批保留当前选择及排序。补齐后允许按Roy-2026-10-07-learning修改已授权规则；授权不是机制、权重或收益证据。

验证方法：对七次用药前后槽位、HP、增益、生成牌和后续重问逐事件串联；新独立局补使用/不用与后续战结果，不拟固定留药门槛。

## silent-proposal-86a7db08d1a31976

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md。来源任务：postmortem；实现任务：strategy-proposal；领域：combat, sl。账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176。

证据局/层/回合：KEN58SH9SLZ6，F17 T10决策274505/274568；T5决策274484/274601。

支持：T10同盘原/换实净损15/21、实净扣2/4，B2原/换及配对差另保存在paired-evidence。T5同盘实际净损7/5、扣1/2；末试T8尚无敏捷，T9后段才建2、T10轮初保留。

反例与未知：T5少损2却延迟步法，反驳只保血；追加小刀后的1伤不是原候选模型误差。T10后的动作/抽序不一致，不单归整战早死。

处置：waiting。局部血价/能力窗口已核；缺受控能力后继与独立后期局验证，不设6血/2伤统一准入值或关闭所有更差线探索。

预期行为：本批保留当前选择及排序。补齐后允许按Roy-2026-10-07-learning修改已授权规则；授权不是机制、权重或收益证据。

验证方法：固定T10两线和T5建立能力时点，保留原答/替换/追加小刀；补保持其余后继一致的完整对照，并对后期独立局验证探索准入。

## silent-proposal-e282a9131b99129a

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md。来源任务：experience-update；实现任务：strategy-proposal；领域：combat, sl。账本：silent-0021, silent-0079, silent-0125, silent-0176。

证据局/层/回合：KEN58SH9SLZ6，F17 T10/T5/T2；原experience-update提案与账本关联保留。

支持：本批同盘成本与能力延迟复核支持原经验的双向取舍；完整actual_turn/actual_turn_result在已部署审计仍null。

反例与未知：HP护栏T2省血增加即时伤但取消原迷雾毒，原线未完整实打；不能把保血一概当更优或否定能力组件。

处置：waiting。已有持牌、候选和首次派发诊断；缺续问执行链、同后继整战与独立后期验证，现有子项不足整项duplicate/implemented。

预期行为：本批保留当前选择及排序。补齐后允许按Roy-2026-10-07-learning修改已授权规则；授权不是机制、权重或收益证据。

验证方法：串联原答、护栏、SL、每次重问及执行后的实际帧；对未执行支线保留未知，时间切分按独立局而非尝试。

## 拟合、预期影响与回退

本批不拟合阈值/权重、不以相关SL试次代独立样本。下一次研究仍需同角色完整可回放后继及独立后期局；模拟反事实与实际分支分别记录。药水holdHp=null、缺帧、未执行路线/留药、阶段修饰未知均保持未知。

本次产出用于明示原十项缺口与后续验证，不宣称实际收益、入库、大脑采用或父要求完成。未修改任何生产源码、生成器、策略数据或其他角色。没有源码提交可撤，没有live合入或新版本；后续独立实现的回退应只撤对应实际源码提交及发布，保留原日志/失败/账本。
