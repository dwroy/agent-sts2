# 静默猎手本批策略提案逐项核验

记录时间：2026-10-13T21:53:56+08:00。任务 strategy-proposal；character=silent；batch=20261013-213855-strategy-proposal。

初始HEAD：d41808c1099d74d6291711e86f4da93843e7a718。普通任务按说明合并main，快进无冲突；报告base：230e35846dd6aa44757759e0c086a6cd7faf3a66。本批只处理派发的10个原CLI提案，不新建id，不处理其他队列。没有research_request或implementation_request，未转入专题。

本批10项均waiting；没有新增源码、经验库修改、提交、live合入或发布编号。报告完成不关闭量化父要求或原学习入库要求；不把原账本已shipped的子事实当整个提案已实现。

## 已核证据与实现边界

派发10局及原提案额外5局均由根logs/runs.jsonl核为SILENT，A1/A7/A9/A10分列。初次从6局原档选取316帧，按原offset或时间定位logs/states.jsonl核对完整JSON，全部匹配；另补TX T6两后继帧。42次狡诈动作来自9局，完整重新核对logs/decisions.jsonl及每次前/后状态，手位差37×3、2×2、3×0，槽位各减1、HP/能量保持。KEN 7次动作原记录及清槽后继重新核实；其中3次pending后继实际清槽，不能只凭派发称已执行。

本批未重算原提案的105/109局统计，也没有运行全历史研究；上述局部材料不能推断完整候选最优归属、整战通关收益或胜率。现有生产候选诊断明确scope=current_turn_prediction/candidate_forecast、execution=unverified、actual_turn_result=null；候选预测不等于实际整线执行。计划妥当的主动选留不能用Stable Serum的retainTurns替代。

以下只核已有子项来源，不用于关闭原宽提案：

- cunning：`6403fdcdadc803a092beb5165a068e22bf51c412`，实际live祖先已核（exit 0）。
- opening：`e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a`，实际live祖先已核（exit 0）。
- strangle：`5c7105ff0294466da8319f2934beda05c6040794`，实际live祖先已核（exit 0）。
- precise_cut：`75a27fb2c230dc552761b2ad9da4be8a9a35dec3`，实际live祖先已核（exit 0）。
- sl_resource：`5604982e13890e0e2bc8bf8246272e8267321c0b`，实际live祖先已核（exit 0）。
- sl_candidate：`c769739b97389fdc978b6515b83a38e3cd900f67`，实际live祖先已核（exit 0）。
- crusher_facing：`f2c7cc1a7288893bceae0f0b20304a2b1fae5f57`，实际live祖先已核（exit 0）。

当次核验live：`7d5b95142bbb89ed71279791786f40d312eed61c`。两份早期分支候选15ea09ad/fc7042d1不是实际live祖先，已保存于existing-source-verification.json的rejected_commit_candidates，未用它们登记实现；采用实际祖先6403fdcd/e8b4bb32。

## 逐项处置

<a id="silent-proposal-08eaa60bcc449852"></a>

## silent-proposal-08eaa60bcc449852：赢战耗药与真实回复

来源：experience-update → strategy-proposal；原账本：silent-0019, silent-0020。
原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-resources.md`；SHA256 `4d080ad9b9f1c93bff7bf169d59add7d863db358ca7e05ba10d95cdfb6b31016`。本批原字节副本为 `silent-proposal-08eaa60bcc449852.original.md`。

证据局/层/回合：KEN58SH9SLZ6 A10：F3 T2攻击药、F4 T1稳定、F5 T2速度、F11 T1虚弱/T2攻击、F15 T1发光/技能，共7次槽位实际清空。3次动作返回pending，后继原状态核实清槽，不将pending直接当完成。F12 26/76→53/81实回27；F16 46/81→75/86实回29。

反例与限制：零损战斗仍可耗药，SL恢复不是新奖励或营火回复；本批不重做原105局统计。缺不饮、早饮和留药到boss的受控整战。

本次处置：waiting。缺同入口、同牌组及固定后继的不饮/早饮/留至boss整战对照；7次实饮及两次回复只能验证资源事实，不能校准持药价值。

旧规则/本次行为：保持现有生产规则。已有源码子项不重新发布，原宽提案不以子项源码冒称整体implemented/duplicate。

预期行为及验证：冻结赢战退出HP与药栏，连真实事件/休息到后场；用同起点完整后继比较用药方案，按run和开始时间留出独立验证。

拟合与切分：本批只做原证据与算术核验，不拟参数；同局SL不拆独立样本，整战比较按run分组并留后续新局验证。其他角色及未观察进阶保持现状。

预期影响/回退：本批只补追溯记录，无新生产行为或源码可回退。后续实际实现须有单独源码提交、撤码失败/恢复通过、沙箱检查及live祖先，保留原失败历史。

<a id="silent-proposal-92920295a648b540"></a>

## silent-proposal-92920295a648b540：SL首战改善与连续结局

来源：postmortem → strategy-proposal；原账本：silent-0228, silent-0255。
原文：`/home/dw/Projects/agent-sts2/learner/runs/20261007-214301-postmortem/proposal-sl-continuation-validation.md`；SHA256 `f9d04951c404f2d568d492c633e8baeb7ca5b4bee6826e20e9d5c2348c739bbf`。本批原字节副本为 `silent-proposal-92920295a648b540.original.md`。

证据局/层/回合：TXZ6RVMQA09D A10 F48第二/三试T6同为48血、敌460血：第二试到T7为45血/敌424，损3/扣36；第三试为48血/敌433，损0/扣27。states281479—281484、281535—281539。第三试F48 T10退出4血（281563），F49 T1出牌0时4→0（281565—281566）。

反例与限制：少损3同时少扣9；两试后续生成与抽牌发生变化，不能用首胜当连战改进，也不能从未校准全败模拟放宽SL。

本次处置：waiting。缺固定后继的两战通关对照，以及弃牌/生成/重问后完整方案实际执行归属；省3血且少9伤不能确定SL偏好或终局权重。

旧规则/本次行为：保持现有生产规则。已有源码子项不重新发布，原宽提案不以子项源码冒称整体implemented/duplicate。

预期行为及验证：分别记录每试首战退出与第二战可操作前HP/药栏/复活；成对比较当前血价与伤害，完整后继受控后再改行为。

拟合与切分：本批只做原证据与算术核验，不拟参数；同局SL不拆独立样本，整战比较按run分组并留后续新局验证。其他角色及未观察进阶保持现状。

预期影响/回退：本批只补追溯记录，无新生产行为或源码可回退。后续实际实现须有单独源码提交、撤码失败/恢复通过、沙箱检查及live祖先，保留原失败历史。

<a id="silent-proposal-a327449c331efbc1"></a>

## silent-proposal-a327449c331efbc1：沙虫全败探索的双向血价

来源：postmortem → strategy-proposal；原账本：silent-0079, silent-0018。
原文：`/home/dw/Projects/agent-sts2/learner/runs/20261007-221303-postmortem/sl-tradeoff-proposal.md`；SHA256 `e52c156a500b9e5f9d35e7b7e6922a91ee893b16576bc7d11f14e179c2e6a925`。本批原字节副本为 `silent-proposal-a327449c331efbc1.original.md`。

证据局/层/回合：WQZVENQ7DTRP A10 F33第二/三试T9 states282075/282144原观测fingerprint完全相同，26血、敌184；到T10首帧分别13血/敌160（282079）与4血/敌145（282148），损13/22、扣24/39。末试T7 26→22血，敌245→221、沙坑当轮增加到5，下一轮4（282330—282336）。

反例与限制：多15伤付9血；末试另有支付4血换沙坑延时的反例，不允许统一强制保血。两种T9线均无独立胜局。

本次处置：waiting。缺同后继整战对照和独立存活验证；9血换15伤与4血换一沙坑轮不能拟成统一交换阈值，也不证明两线同安全。

旧规则/本次行为：保持现有生产规则。已有源码子项不重新发布，原宽提案不以子项源码冒称整体implemented/duplicate。

预期行为及验证：在同盘面同时核即时HP损失、实扣、已结毒与沙坑；保留抽序与后继变化，等待完整受控线及后移独立局。

拟合与切分：本批只做原证据与算术核验，不拟参数；同局SL不拆独立样本，整战比较按run分组并留后续新局验证。其他角色及未观察进阶保持现状。

预期影响/回退：本批只补追溯记录，无新生产行为或源码可回退。后续实际实现须有单独源码提交、撤码失败/恢复通过、沙箱检查及live祖先，保留原失败历史。

<a id="silent-proposal-a099e89437e942bb"></a>

## silent-proposal-a099e89437e942bb：狡诈生成与计划妥当容量

来源：experience-update → strategy-proposal；原账本：silent-0030, silent-0257, silent-0258。
原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-cunning-capacity.md`；SHA256 `e02b6c6c93defbea23d60a515bf17be3c1c6ac3d3b47dd0e6da647cea92910c2`。本批原字节副本为 `silent-proposal-a099e89437e942bb.original.md`。

证据局/层/回合：9局42次狡诈实际动作均completed，前后状态与槽位已重新从logs核回：37次添3、2次添2、3次添0；新增SHIV升级、基础6的原证据保留。WQZVENQ7DTRP A10 F33第5试T11手8→10→10→10（添2/0/0），第6试5→8→10→10（添3/2/0），满手仍耗瓶，HP/能量不变。02HB F2T2、4D4 F17T1/T3、F4Q A9F33T1/T2、JLN F33T1、LS F33T1、NB F31T5、S9 F33T1及SADL A7F8T1为有空位支持。

反例与限制：确定生成与腾位穿插已有源码；当前跨轮keep路径明确基于Stable Serum retainTurns，不能以它替代计划妥当的主动选留。原整场穿插胜线未观察。

本次处置：waiting。确定生成/手位/出刀穿插已有live子项；缺计划妥当跨轮主动选留及复合触发、重问、SL恢复后的完整消费者验收，不能关闭整个提案。

旧规则/本次行为：保持现有生产规则。已有源码子项不重新发布，原宽提案不以子项源码冒称整体implemented/duplicate。

预期行为及验证：固定3/2/0及两串饮药序列；将实际选留、生成、后继手牌与生产调用逐步对齐，覆盖中断/重问/存档恢复后再验整项。

拟合与切分：本批只做原证据与算术核验，不拟参数；同局SL不拆独立样本，整战比较按run分组并留后续新局验证。其他角色及未观察进阶保持现状。

预期影响/回退：本批只补追溯记录，无新生产行为或源码可回退。后续实际实现须有单独源码提交、撤码失败/恢复通过、沙箱检查及live祖先，保留原失败历史。

<a id="silent-proposal-47910f82a1fdd98f"></a>

## silent-proposal-47910f82a1fdd98f：连战开场资源和SL复合提案

来源：experience-update → strategy-proposal；原账本：silent-0018, silent-0019, silent-0020, silent-0021, silent-0025, silent-0079, silent-0198, silent-0228, silent-0255。
原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-continuation-sl.md`；SHA256 `d4ff2c80c60bdac273fbce918109b0a4634484006ec7e3b6b4516b9afede51bd`。本批原字节副本为 `silent-proposal-47910f82a1fdd98f.original.md`。

证据局/层/回合：TXZ6RVMQA09D A10 F48 T1 states281399—281400为60→56，F49 T1 281565—281566为4→0且出牌0；F48退出4、空奖励/空药栏原帧保留。TX T6的损3/36伤与损0/27伤、WQ F33 T9的13/24与22/39一并核实。

反例与限制：当前限定遗物组合的4血新战开场实现存在；旧小血瓶组合净2不能拆单件，也不能推广未知回复或复活顺序。局部SL差额不是全线改善。

本次处置：waiting。开场4血及连战子项已有live；仍缺留药整战对照、重问后的SL完整后继，以及未知回血/复活组合的相位证据。

旧规则/本次行为：保持现有生产规则。已有源码子项不重新发布，原宽提案不以子项源码冒称整体implemented/duplicate。

预期行为及验证：按实际遗物/药栏保留新战与SL恢复边界；联验进入后场前可操作资源，未知组合留未知，不重复扣开场成本。

拟合与切分：本批只做原证据与算术核验，不拟参数；同局SL不拆独立样本，整战比较按run分组并留后续新局验证。其他角色及未观察进阶保持现状。

预期影响/回退：本批只补追溯记录，无新生产行为或源码可回退。后续实际实现须有单独源码提交、撤码失败/恢复通过、沙箱检查及live祖先，保留原失败历史。

<a id="silent-proposal-f1374df72d8e6a25"></a>

## silent-proposal-f1374df72d8e6a25：胜战退出资源与药水候选价值

来源：postmortem → strategy-proposal；原账本：silent-0019, silent-0020, silent-0050, silent-0253。
原文：`/home/dw/Projects/agent-sts2/learner/runs/20261007-224302-postmortem/proposal-resource-value.md`；SHA256 `df1e14ed2c6b4b31c1dcbd1bd373702cff34a58332d4aab60f7e31dc44b395a0`。本批原字节副本为 `silent-proposal-f1374df72d8e6a25.original.md`。

证据局/层/回合：1913SE84AXQF A10 F17最终14血（states282632—282637）；F31 T3结束25→20，T4建立毒雾3后当轮死亡（282777—282783）。Q6M2Y34MWKRE A10 F8 T7 33血/5挡，T8仅2血；F8毒杀退出2血，F9 T2 2血/10挡对12攻归0（282900—282921）。

反例与限制：1913原路线后来实际锻造改变了预计回复条件；Q6已经休息且最终喝药，零损赢战留药与精英赢后死分账。原候选早饮未有完整实打。

本次处置：waiting。缺同入口及固定后继的早饮/不饮/持药整战对照；1913实际路线条件改变，两条失败链不足以修改药价或HP护栏。

旧规则/本次行为：保持现有生产规则。已有源码子项不重新发布，原宽提案不以子项源码冒称整体implemented/duplicate。

预期行为及验证：把实际锻造/休息、临时与持续药效、事件血价、胜战退出HP与后场需求分账；受控完整后继及时间留出后再定参数。

拟合与切分：本批只做原证据与算术核验，不拟参数；同局SL不拆独立样本，整战比较按run分组并留后续新局验证。其他角色及未观察进阶保持现状。

预期影响/回退：本批只补追溯记录，无新生产行为或源码可回退。后续实际实现须有单独源码提交、撤码失败/恢复通过、沙箱检查及live祖先，保留原失败历史。

<a id="silent-proposal-38a49e6c97f31eea"></a>

## silent-proposal-38a49e6c97f31eea：第83批复合机制消费者

来源：experience-update → strategy-proposal；原账本：silent-0006, silent-0011, silent-0025, silent-0044, silent-0050, silent-0064, silent-0133, silent-0253, silent-0259, silent-0261, silent-0262。
原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-mechanisms.md`；SHA256 `6a07471e9049744900d49529a939a7014fb686810a0d7983e6c35eb65b5e8cb0`。本批原字节副本为 `silent-proposal-38a49e6c97f31eea.original.md`。

证据局/层/回合：Q6M2Y34MWKRE A10 F8 T4敌103→95→85→83→80（states282887—282892）：紧勒8、后攻8+2、弃牌完成再2、结3毒。1913SE84AXQF A10 F17再生5→4→3→2→1后消失；F31 T2弃磨蚀能量3保持，建敏1/荆棘4（282767—282768），T3双挡12仍25→20；中段T3为0、T4重接25且无旧毒/力量（282771、282777），T4三段攻击后死亡。

反例与限制：普通紧勒限定公式已上线，升级/叠层/重放/有挡明确保持未验证；再生、荆棘、重接与阈值的局部支持不能证明整个复合包及SL收益。

本次处置：waiting。普通紧勒限定公式已有live；其余再生/荆棘/重接/阈值与SL联合后继没有本包完整消费者验收及受控胜负，不能整包关闭。

旧规则/本次行为：保持现有生产规则。已有源码子项不重新发布，原宽提案不以子项源码冒称整体implemented/duplicate。

预期行为及验证：冻结逐牌、弃牌完成、敌攻击/反伤、再生封顶、死段重接和阈值移动；在同一完整消费者调用中隔离各效应，SL收益另需受控后继。

拟合与切分：本批只做原证据与算术核验，不拟参数；同局SL不拆独立样本，整战比较按run分组并留后续新局验证。其他角色及未观察进阶保持现状。

预期影响/回退：本批只补追溯记录，无新生产行为或源码可回退。后续实际实现须有单独源码提交、撤码失败/恢复通过、沙箱检查及live祖先，保留原失败历史。

<a id="silent-proposal-ef0e38a5dbd3bc07"></a>

## silent-proposal-ef0e38a5dbd3bc07：精英胜后血价与能力兑现

来源：experience-update → strategy-proposal；原账本：silent-0019, silent-0020, silent-0021。
原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-resources.md`；SHA256 `d37416e85fd4f9331fc5f652f5838eae9b528a76fe45b9c10aac07acfd572da5`。本批原字节副本为 `silent-proposal-ef0e38a5dbd3bc07.original.md`。

证据局/层/回合：1913SE84AXQF A10 F17胜后14、F18幕间58原资源链；F31 T4毒雾3已建立，却在轮末0血没有下一轮补毒（282777—282783）。Q6M2Y34MWKRE A10 F8 T8赢后2，F9 T2死亡（282907—282921）；实际建能力与计划取得组件分开。

反例与限制：未抵达的未来营火不能记已回HP；休息/走廊案例敌人、构筑与间隔不同，没有受控换线。原汇总统计本批没有重做，不冒称全历史覆盖。

本次处置：waiting。缺受控换线/休息/用药的完整后继及能力收益归属；不同构筑的两条失败资源链不能拟统一血价或启动权重。

旧规则/本次行为：保持现有生产规则。已有源码子项不重新发布，原宽提案不以子项源码冒称整体implemented/duplicate。

预期行为及验证：按实际节点动作重建入口/退出HP与能力建立时点；明确未到账回复和未兑现能力，固定完整路线后再比较价值。

拟合与切分：本批只做原证据与算术核验，不拟参数；同局SL不拆独立样本，整战比较按run分组并留后续新局验证。其他角色及未观察进阶保持现状。

预期影响/回退：本批只补追溯记录，无新生产行为或源码可回退。后续实际实现须有单独源码提交、撤码失败/恢复通过、沙箱检查及live祖先，保留原失败历史。

<a id="silent-proposal-7f820c02d39bfaea"></a>

## silent-proposal-7f820c02d39bfaea：饱和SL候选与实际执行

来源：postmortem → strategy-proposal；原账本：silent-0079。
原文：`/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/proposal-saturated-sl.md`；SHA256 `bee54fe85711a177349f927c21f184b7112308ead5c74708b8f3b0b183ecf105`。本批原字节副本为 `silent-proposal-7f820c02d39bfaea.original.md`。

证据局/层/回合：NHA2KW0RB7VP A10 F33首试T1可操作30血，14挡，轮间变29血/总敌HP400（283391—283397）；第5/6试T1 8挡，轮間变23血/总敌HP384（283479—283483、283502—283507）。起始敌HP合408：原净扣8、替线24，多16伤且多损6。

反例与限制：两边都未击杀；抱抱先生次轮两侧各2的自动扣血与卡牌伤分源，第5/6是同局重放，不是独立成功。当前候选诊断明确actual_turn_result=null、execution=unverified。

本次处置：waiting。已有live候选诊断仅给预测并明确执行未验证；缺跨弃牌/重问完整执行归属、固定后继及独立存活验证，不改饱和SL筛选门槛。

旧规则/本次行为：保持现有生产规则。已有源码子项不重新发布，原宽提案不以子项源码冒称整体implemented/duplicate。

预期行为及验证：连接原答、替换、实际派发与后继状态；每次重规划重新起算，成对分列卡牌/自动伤及血价，完整后继验证后再约束排序。

拟合与切分：本批只做原证据与算术核验，不拟参数；同局SL不拆独立样本，整战比较按run分组并留后续新局验证。其他角色及未观察进阶保持现状。

预期影响/回退：本批只补追溯记录，无新生产行为或源码可回退。后续实际实现须有单独源码提交、撤码失败/恢复通过、沙箱检查及live祖先，保留原失败历史。

<a id="silent-proposal-04b6b430759815ed"></a>

## silent-proposal-04b6b430759815ed：油灯、手数、朝向与兑现

来源：experience-update → strategy-proposal；原账本：silent-0005, silent-0006, silent-0021, silent-0011, silent-0065, silent-0264, silent-0079, silent-0133, silent-0169, silent-0189, silent-0013, silent-0053, silent-0162, silent-0265。
原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-004303-experience-update/proposal-mechanisms.md`；SHA256 `188d4daee0970bba6b59aa7c3498d9da76ef31aac4a42c69be2a86192cadab58`。本批原字节副本为 `silent-proposal-04b6b430759815ed.original.md`。

证据局/层/回合：NHA2KW0RB7VP A10 F17 T1精确切击七/六/五手显示1/3/5，实际扣5（283142—283145）；普通致命毒药5实建10（283146—283147）。F33 T1普通X1萎靡实建−2力量/2弱（283395、283506）。T2保持−2力/弱1，爪正面1→背面2、火箭30→20，15挡实损7（283398—283400）。

反例与限制：精确切击七手与蟹限定朝向取整已有实际live源码。油灯其他负面、制品吸收、此前首次是否已消耗以及重问/SL恢复缺可靠可传递状态；不能仅凭持有遗物或目标无负面判首次。能力持有不当已触发。

本次处置：waiting。精确切击与蟹朝向子项已有live；油灯缺可靠首次使用状态和制品吸收/前序负面/重问/SL恢复的联合消费者验证，未知不能当首次。

旧规则/本次行为：保持现有生产规则。已有源码子项不重新发布，原宽提案不以子项源码冒称整体implemented/duplicate。

预期行为及验证：固定首次负面前后并跟踪战斗/目标身份、制品与恢复边界；联合核手数、现场力量/弱/朝向与能力建立，保留未证组合。

拟合与切分：本批只做原证据与算术核验，不拟参数；同局SL不拆独立样本，整战比较按run分组并留后续新局验证。其他角色及未观察进阶保持现状。

预期影响/回退：本批只补追溯记录，无新生产行为或源码可回退。后续实际实现须有单独源码提交、撤码失败/恢复通过、沙箱检查及live祖先，保留原失败历史。

## 验证、记录与交付

本次没有生产源码改动：撤源码失败/恢复通过不适用；tsc、vitest、cases均为null，未冒报测试成功。数据原始行/指纹/算术核验与生产测试分账。无新提交或合入，不分配eval版本，不记shipped，不运行play或推送。两次初始抽取分别遇到带行号前缀JSON和非战斗combat=null形状错误，修正解析后已完成原字节核对；它们不是生产代码测试失败，原会话输出保留。

只经根learner/ledger.py update补原账本的本批proposal/report链接及具体限制，不重复历史复盘、证据支持行、claim、first_run、status或version，不另造提案id。CLI回执在ledger-cli-result.json中；机械追溯验收在final-verification.json中。

材料：proposal.md（逐项提案）、proposal-results-detail.json、10个原文副本及其SHA、batch/proposals/ledger/runs输入；verified-states.jsonl/verified-state-summary.json/evidence-input-manifest.json；tx-turn-six-successors*.json*；cunning-original-rows.jsonl/cunning-original-validation.json/cunning-calculation-validation.json；ken-potion-validation.json；existing-source-verification.json。

工作树维持base且tracked工作树干净，scratch按任务位于本树learner/runs内；根账本追加由运维沿既有完成事件归档。剩余验证需受控后继或完整消费者证据后再派原id，不能因本批报告结束将父要求关闭。

本批31条原账本追溯CLI全部exit 0；原claim/first_run/asc/status/version与证据条数核对保持。新增小刀升级与基础6已从42次饮用后的原状态核回，见cunning-base-damage-validation.json。
