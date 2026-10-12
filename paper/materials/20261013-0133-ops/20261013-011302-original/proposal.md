# 本批十项策略提案复核

时间：2026-10-13T01:26:02+08:00。batch：20261013-011302-strategy-proposal；角色：silent；普通领取任务，非纯研究、非implementation_request。
基线：`fbc02e018011d28cd6ef74664878ff4369358cc9`。`git merge --no-edit main`返回Already up to date；无新源码或知识改动。只处理本批十个CLI id，不另建重复提案。
## 共用范围与方法

只用本批六局的原始记录、原复盘、原提案和silent账本；六局均A10。每次SL属于原局，不能当独立样本。机制端点为发现/回归证据，未作盲测。本批不拟合收益常数、血价、护栏、药水持有、终局或SL门槛。授权Roy-2026-10-07-learning不提供游戏事实。
## silent-proposal-89354805ee4d7e77：神化升级传播及施放状态

原来源任务：postmortem；实现任务：strategy-proposal / 20261013-011302-strategy-proposal。账本：silent-0237, silent-0238。原Markdown：`/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md`，SHA256 `ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d`，已与原字节核对。

证据局号/层/回合：VLZ6CCT8AQ0A F35 T1、F43 T1/T2、F45 T1；states 275564→275565、275679→275680/275687、275728→275732；decisions 269706/269707、269754/269755。

本轮结论及已有行为：F35实付2能量并升级剩余已观测牌；F43原候选43伤/14损，施放后51伤/13损，与整轮端点一致。F45持有神化但最后弃掉，未获得该升级。普通升级、后续抽牌传播和参考字段已有实际live源码。

反例与未知：F43施放后仍整场损57；F45未施放而败，两场起点不同，不能证明必打或转胜。

处置waiting及缺数据：普通升级子项已有live实现；仍缺跨重规划、SL、重启的实际施放生命周期绑定及未知升级、自动动作和属性组合的交互证据，整项不能记duplicate。

预期行为：保留已有观察范围内的升级传播及unknown标记；实际施放状态目前不由持有或候选代替。不得增加必打神化规则。

验证/时间切分：后续冻结同一场的实际施放与重规划/SL/重启链，逐牌核验未覆盖升级和属性组合；恢复与重开必须分清。已有发现帧仅回归，不能当独立盲测。

旧/新规则：本批沿用现有规则，无新规则和阈值。预期影响仅为补齐可追溯处置及证据限制，不宣称胜率或自然消费者采用。回退：没有新源码可回退；原失败、账本和提案历史保留，未来实际实现按其独立源码commit回退。

## silent-proposal-f2bfceddb1898dca：随机药水预算和全败候选

原来源任务：postmortem；实现任务：strategy-proposal / 20261013-011302-strategy-proposal。账本：silent-0106, silent-0019, silent-0201。原Markdown：`/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md`，SHA256 `fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26`，已与原字节核对。

证据局号/层/回合：VLZ6CCT8AQ0A F43终态、F44休息、F45 T1/T4/T5；decisions 269748、269754、269770；states 275728→275729、末轮端点见turn-observed-endpoints.json。

本轮结论及已有行为：T1首题CURE_ALL为707ms、1/12，rollout为horizon1/samples1/best=null；后题12/12但盘面已改变。实喝只见HP67不变、能量1→2、手牌1→3。T4少损线实际13损/24伤；31损/32伤线未实打。

反例与未知：1/12和12/12不是同状态、同模型覆盖、同随机输入的配对试验；全败或best=null也不等于确定实盘必死。

处置waiting及缺数据：缺同状态、同模型覆盖、同随机输入和同总预算的配对收益曲线；707ms与异盘1/12、12/12不足校准预算、留药、护栏或目标规则。

预期行为：已有成熟度/退化/并列/药水样本事实展示保留；本批不硬设预算常量，不改变留药或目标顺序。

验证/时间切分：同一固定输入、完整模型覆盖、固定种子和同总预算下比较阶段分配，保留原始用时、候选稳定性与样本曲线；再以时间后移静默局验证。

旧/新规则：本批沿用现有规则，无新规则和阈值。预期影响仅为补齐可追溯处置及证据限制，不宣称胜率或自然消费者采用。回退：没有新源码可回退；原失败、账本和提案历史保留，未来实际实现按其独立源码commit回退。

## silent-proposal-283a164780d11e69：神化经验的同源实现补链

原来源任务：experience-update；实现任务：strategy-proposal / 20261013-011302-strategy-proposal。账本：silent-0237, silent-0238。原Markdown：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md`，SHA256 `78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637`，已与原字节核对。

证据局号/层/回合：与89354805ee4d7e77同源的VLZ6CCT8AQ0A F35/F43/F45；经验silent-apotheosis-combat-upgrades，账本silent-0237/0238。

本轮结论及已有行为：原经验提案的Markdown SHA已核；与postmortem神化提案共享同一观察，不另算独立样本、不另建提案id。

反例与未知：经验已经有代码链接或部分升级实现，不证明施放生命周期及未知组合全部实现。

处置waiting及缺数据：同源普通升级子项已有live实现；施放生命周期、未知费用、跨轮副效应和自动动作组合仍缺证据，不把同源关系当整个提案duplicate。

预期行为：沿原提案与经验链接继续，保留未知范围，无新优先级、收益常数或重复实现。

验证/时间切分：与神化主提案共用固定回归及后续独立实盘；逐项交付剩余范围后才可提交完整implemented/duplicate证明。

旧/新规则：本批沿用现有规则，无新规则和阈值。预期影响仅为补齐可追溯处置及证据限制，不宣称胜率或自然消费者采用。回退：没有新源码可回退；原失败、账本和提案历史保留，未来实际实现按其独立源码commit回退。

## silent-proposal-ebbfe3b97548756d：攻防、毒和资源机制的整包验证

原来源任务：experience-update；实现任务：strategy-proposal / 20261013-011302-strategy-proposal。账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。原Markdown：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md`，SHA256 `08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2`，已与原字节核对。

证据局号/层/回合：VLZ6CCT8AQ0A F43 T1—T5、F45 T1/T3/T4/T5；包括神化、步法、勒紧、口红、现场覆甲、临时减力、触媒与休息资源。原15条经验及14个账本id见原提案。

本轮结论及已有行为：F45 T4已核13损/24伤；T5末前32HP/20挡、已减力后的攻击14+11+34=59，显示攻击减挡39而HP端点最多损32，三敌结算后仍未死。现场期限与已结算/未来毒应分列；已有事实与观测消费者不能代替整个机制包验收。

反例与未知：单轮相符或持有能力不代表整场持续收益；零血截断的净损不是未截断伤害。该包跨进阶历史分母不能当作一次联合机制实验。

处置waiting及缺数据：本批仅核了原来源局端点和已有源码子项；口红、覆甲、临时减力恢复与未来毒的跨轮联合调用、全部15条经验的逐项消费者证明仍不完整，不能关闭整包。

预期行为：按当前状态分源显示已有事实；不把临时减力视为永久价值，不将未建立能力或尚未结算毒预支为收益，不改变路线、休息、focus或SL。

验证/时间切分：按原经验分别冻结实际输入、期限、当前进阶敌人数据与完整消费者调用；回归已观察复合局面，缺失部分等新局，不据整包支持数拟合统一权重。

旧/新规则：本批沿用现有规则，无新规则和阈值。预期影响仅为补齐可追溯处置及证据限制，不宣称胜率或自然消费者采用。回退：没有新源码可回退；原失败、账本和提案历史保留，未来实际实现按其独立源码commit回退。

## silent-proposal-e5b87be50f28f311：SL、HP护栏及重规划的实付代价审计

原来源任务：postmortem；实现任务：strategy-proposal / 20261013-011302-strategy-proposal。账本：silent-0079, silent-0021, silent-0125, silent-0018。原Markdown：`/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md`，SHA256 `5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709`，已与原字节核对。

证据局号/层/回合：8JRE1C4H4Z2W F33首试/第三次T2（decisions270216/270282，同fingerprint）、第二次T5（270264）、末试T11；另F17 T6。

本轮结论及已有行为：T2两线实损3/15、扣10/17，确证多12血价、多7当轮伤；第三次SL替换并非Jev原答。T5原候选16损/43伤、护栏后4损/25伤。末试T11为5HP/22挡对37攻，实损端点封顶5而显示攻击减挡15。当前消费者已有候选、派发、相邻观测、终局子项。

反例与未知：首试与第三次都在T7判死；末试多保血延到T11仍败，不能认定所有防御换线错误，也无原线完整获胜反事实。

处置waiting及缺数据：已有消费者能读预测、派发与观测端点；仍缺逐次重规划的机械原因、完整候选执行和能力分源后继，且缺同盘获胜反事实，不能校准HP护栏、SL或终局阈值。

预期行为：保留已有审计子项及null边界，候选代价不冒称实际收益；不把原答、护栏后、SL后及重问方案混在一起，不改选择规则。

验证/时间切分：本批冻结六局输入调用既有离线消费者；后续需有实际重规划原因及能力建立时点链，若改规则再按run_id分组、固定盘配对并时间后移验证。

旧/新规则：本批沿用现有规则，无新规则和阈值。预期影响仅为补齐可追溯处置及证据限制，不宣称胜率或自然消费者采用。回退：没有新源码可回退；原失败、账本和提案历史保留，未来实际实现按其独立源码commit回退。

## silent-proposal-49632bc4878fb597：力量、敏捷、虚弱与成长分项

原来源任务：experience-update；实现任务：strategy-proposal / 20261013-011302-strategy-proposal。账本：silent-0005, silent-0231。原Markdown：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md`，SHA256 `aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2`，已与原字节核对。

证据局号/层/回合：CA5KE8GFJ9X2 F13 T1—T5，核心T5；末轮2HP/10挡对14攻击，终态0HP。原账本silent-0005/0231。

本轮结论及已有行为：来源局观察两次加压后的力量0→4→8，喷水11→15→19；虚弱后11/14仍保留成长。计划中的步法没有取得，不能补正敏捷。

反例与未知：当前虚弱不取消独立成长；末轮10挡与14攻之间的4是显示需求，端点实际只损2。

处置waiting及缺数据：来源局没有正敏捷联合样本；缺力量、敏捷、虚弱和跨轮成长四路径的完整共同调用验证，不据当轮吻合添加统一保血或输出权重。

预期行为：保留当前属性与成长分项，不增加虚构的正敏捷或跨角色参数。

验证/时间切分：冻结四条路径实际共同出现的静默局输入与源码调用；不同来源局不可拼成未观测联合实盘，阈值另需受控收益验证。

旧/新规则：本批沿用现有规则，无新规则和阈值。预期影响仅为补齐可追溯处置及证据限制，不宣称胜率或自然消费者采用。回退：没有新源码可回退；原失败、账本和提案历史保留，未来实际实现按其独立源码commit回退。

## silent-proposal-66532328a585941f：持有、计划和已建立的启动条件

原来源任务：experience-update；实现任务：strategy-proposal / 20261013-011302-strategy-proposal。账本：silent-0021, silent-0009。原Markdown：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md`，SHA256 `56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831`，已与原字节核对。

证据局号/层/回合：5PM6JAQG6FNQ F39末试T2；decision268455、states274379→274380；反例F33胜场。

本轮结论及已有行为：未建立毒雾且目标无毒时，咕嘟冒泡实付1能（5→4）、玩家HP29不变、敌方端点不变。拥有组件不能记成已建立输出。

反例与未知：同局F33已建立雾3/触媒1/群蛇4并赢，但敌人、资源和生存条件也改变；不是同盘启动顺序对照。

处置waiting及缺数据：缺同入口HP、构筑和完整抽序下不同启动顺序的整场对照及可复现收益函数；无毒空打不足拟合启动阈值。

预期行为：继续持有/计划/已建立分账，不规定能力必打或构筑权重。

验证/时间切分：实际施放时点与状态链固定核验；若提启动权重需同盘完整对照、完整抽序和后移独立局收益验证。

旧/新规则：本批沿用现有规则，无新规则和阈值。预期影响仅为补齐可追溯处置及证据限制，不宣称胜率或自然消费者采用。回退：没有新源码可回退；原失败、账本和提案历史保留，未来实际实现按其独立源码commit回退。

## silent-proposal-43a76a31ba7bdcfa：吸取、负敏捷、毒及SL范围

原来源任务：experience-update；实现任务：strategy-proposal / 20261013-011302-strategy-proposal。账本：silent-0030, silent-0027。原Markdown：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md`，SHA256 `f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c`，已与原字节核对。

证据局号/层/回合：61E2QS63Y9WU F17 T5/T6；states273502→273504→273508；T6防御decisions267612/267614、states273504→273505及273506→273507。

本轮结论及已有行为：吸取后玩家力量2消失、敏捷−2，敌力量2；T6两防御各3挡（0→3、3→6），毒17+16使敌67→34。该战首试60HP进场、七轮赢，不能套其他局失败。

反例与未知：已观察毒不依赖当前负敏捷这一端点事实，不证明任一SL重打可救活或扩大名单必有收益。

处置waiting及缺数据：缺吸取跨轮联合模型验证及同入口HP、构筑、完整抽序下可救活的SL替线；不能据首试胜利修改SL范围。

预期行为：保留已观察负敏捷与毒事实及现有SL范围；不拟合换线偏好。

验证/时间切分：冻结吸取前后完整调用与抽序；任何SL范围或阈值变更都需同盘完整替线及后续独立静默验证。

旧/新规则：本批沿用现有规则，无新规则和阈值。预期影响仅为补齐可追溯处置及证据限制，不宣称胜率或自然消费者采用。回退：没有新源码可回退；原失败、账本和提案历史保留，未来实际实现按其独立源码commit回退。

## silent-proposal-5264153a4a4b0e5c：墨影召唤、实体成长和目标选项

原来源任务：experience-update；实现任务：strategy-proposal / 20261013-011302-strategy-proposal。账本：silent-0039, silent-0209。原Markdown：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md`，SHA256 `b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02`，已与原字节核对。

证据局号/层/回合：61E2QS63Y9WU F23 T3/T4/T5；核心states273593→273596，T4本体76→41、幻象14→2，玩家净损15。

本轮结论及已有行为：两次航行后力量0→3→6；T4当轮合扣47而幻象仍剩2并攻击，直到T5才退场。当前净扣不能直接等同敌方退场。

反例与未知：focus幻象39伤/零损候选没有完整实打后继，不能据其当轮值宣称整战更好。

处置waiting及缺数据：缺A10召唤、航行、再起和索引变化的完整跨轮调用链及另一focus的整场后继；旧召唤实现不能证明新增成长或固定杀序收益。

预期行为：保留所有合法目标与并列；无新固定首杀或目标权重。

验证/时间切分：逐实体冻结当前进阶招式、召唤、力量、再起、退出与索引重排链，区分enemy_id类型和实例；目标策略需同盘完整后继。

旧/新规则：本批沿用现有规则，无新规则和阈值。预期影响仅为补齐可追溯处置及证据限制，不宣称胜率或自然消费者采用。回退：没有新源码可回退；原失败、账本和提案历史保留，未来实际实现按其独立源码commit回退。

## silent-proposal-bddfa690a84e03d0：熟睡甲虫自然醒、眩晕及成长

原来源任务：experience-update；实现任务：strategy-proposal / 20261013-011302-strategy-proposal。账本：silent-0128, silent-0079。原Markdown：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md`，SHA256 `b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780`，已与原字节核对。

证据局号/层/回合：DUZUBAJ3A8GP F30 T1—T6，四次尝试；核心末试T6为1HP/16挡对22攻击、终态0HP，SL原记录914—917。

本轮结论及已有行为：睡3/2/1后T4自然醒，后续力量2→4、攻击22；四次均败。原冻结输入与消费者都保留，不用四次尝试扩大独立局分母。

反例与未知：末试T4较首试多扣3敌HP却多损2玩家HP，不能单按敌血替换全败排序。自然醒不构成提前唤醒眩晕链的对照。

处置waiting及缺数据：缺提前唤醒后眩晕接续的配对及同抽序完整获胜替线；自然醒、成长与16挡对22攻不足校准输出血价或杀序。

预期行为：按已观察当前进阶睡眠、眩晕、成长分别保留事实；不增加全败权重或固定排序。

验证/时间切分：冻结提前唤醒/眩晕与自然醒两条完整同盘输入，核成长与恢复顺序；输出/血价修改需完整获胜替线及后移验证。

旧/新规则：本批沿用现有规则，无新规则和阈值。预期影响仅为补齐可追溯处置及证据限制，不宣称胜率或自然消费者采用。回退：没有新源码可回退；原失败、账本和提案历史保留，未来实际实现按其独立源码commit回退。

## 已有源码与验收边界

原神化普通升级772b839f8ada31664cb764ea9ad3bdb03da27f64、触媒升级f516592fff557ef02c8ece43433706358c3f7fe6、萎靡限定升级a11dd870b09f3f1b67fcb5d6c08af6573fd809e0、参考3aa6c03a83c5cdcdea29c43e3caa130bcce9bd17，以及审计/派发/观测/终局源码祖先见source-proof.json。这些为真实live祖先子项，均不满足本批整个原提案完成范围。故十项不登记implemented或duplicate，不标shipped。
