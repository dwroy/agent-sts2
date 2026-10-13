# 本批十项静默策略提案逐项复验

批次：20261014-001304-s2-strategy-proposal。来源任务为各原提案所列任务；实现任务为本批strategy-proposal。基线：`8c4d23c1813c531944131bbf28c8177d2c44f933`。


本批只消费派来的十个原ID，不新建重复ID，不修改原Markdown或队列。每项维持waiting；已上线子项只记录覆盖，不将宽提案关闭。授权Roy-2026-10-07-learning不提供游戏事实。


## 1. silent-proposal-08eaa60bcc449852


角色：silent；范围仅原提案已观察进阶。领域：potion。

原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-resources.md`；SHA256：`4d080ad9b9f1c93bff7bf169d59add7d863db358ca7e05ba10d95cdfb6b31016`（读回一致）。

账本：silent-0019, silent-0020。原任务：experience-update。

证据与反例：KEN58SH9SLZ6 A10：F3 T2攻击药、F4 T1稳定、F5 T2速度、F11 T1虚弱/T2攻击、F15 T1发光/技能，七次药栏消耗；攻击/技能药后进入CARD_SELECTION，不能只筛COMBAT后帧。F5 53→16；F12 26→53、F16 46→75；F15赢后仍46且实际花药。

现有子项：没有足以关闭本项的live源码提交。列出的提交均核为实际live祖先，未登记本项implemented/duplicate。

旧规则/预期行为：原提案要求“核赢战耗药与真实回复到boss入口的资源结转；缺未饮用/留药整战对照保留现价值规则”。本批维持现有出牌、药水、SL和终局规则；实际资源、候选预测、完整执行与因果收益分列。

处置与缺数据：waiting。KEN七次实饮、两次真实回复已核；缺同入口同后继的不饮/早饮/留至boss整战对照，不能校准持药价值。

验证：读取本角色原日志及原冻结提案；固定数值核验、既有离线消费者读回见report.md和各消费者输出。局部正确不替代完整消费者验证。

方法/切分：不拟新参数，不把SL尝试或状态帧当独立局；后续需按run分组、用更早局训练和后移新局验证，完整反事实保持相同入口、后继和预算。

预期影响/回退：本批没有行为改动或胜率承诺，无需源码回退；保留原失败、反例、缺数据与原ID，后续实现只能撤回独立实现提交。


## 2. silent-proposal-92920295a648b540


角色：silent；范围仅原提案已观察进阶。领域：combat, sl, terminal。

原文：`/home/dw/Projects/agent-sts2/learner/runs/20261007-214301-postmortem/proposal-sl-continuation-validation.md`；SHA256：`f9d04951c404f2d568d492c633e8baeb7ca5b4bee6826e20e9d5c2348c739bbf`（读回一致）。

账本：silent-0228, silent-0255。原任务：postmortem。

证据与反例：TXZ6RVMQA09D A10 F48第2/3试T6：开场均48HP、敌460HP；下一轮分别45/敌424与48/敌433，整轮净损3/0、敌净扣36/27。消费者两窗口均observed_turn_endpoints、连续原状态路径；第二试包含重问，actual_full_candidate_result=null。第三试首战末4HP，F49出牌前4→0，出牌0。

现有子项：e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a, c719bc048fa848119f217ba0e966aac7e2671ddf。列出的提交均核为实际live祖先，未登记本项implemented/duplicate。

旧规则/预期行为：原提案要求“固定核对SL T6少损3也少伤9、首战赢后4血与F49开场死；三尝试按同局资源链验收，禁止将首胜/低可信0%当连战改善或SL依据，缺通关对照时保留原规则并等待新局。”。本批维持现有出牌、药水、SL和终局规则；实际资源、候选预测、完整执行与因果收益分列。

处置与缺数据：waiting。TXZ T6整轮端点已读回为损3/伤36与损0/伤27；后续牌序改变，缺两战通关对照，完整候选因果仍未知，不能改SL或终局权重。

验证：读取本角色原日志及原冻结提案；固定数值核验、既有离线消费者读回见report.md和各消费者输出。局部正确不替代完整消费者验证。

方法/切分：不拟新参数，不把SL尝试或状态帧当独立局；后续需按run分组、用更早局训练和后移新局验证，完整反事实保持相同入口、后继和预算。

预期影响/回退：本批没有行为改动或胜率承诺，无需源码回退；保留原失败、反例、缺数据与原ID，后续实现只能撤回独立实现提交。


## 3. silent-proposal-a327449c331efbc1


角色：silent；范围仅原提案已观察进阶。领域：combat, sl。

原文：`/home/dw/Projects/agent-sts2/learner/runs/20261007-221303-postmortem/sl-tradeoff-proposal.md`；SHA256：`e52c156a500b9e5f9d35e7b7e6922a91ee893b16576bc7d11f14e179c2e6a925`（读回一致）。

账本：silent-0079, silent-0018。原任务：postmortem。

证据与反例：WQZVENQ7DTRP A10 F33第2/3试T9：均26HP/敌184；下轮13/160与4/145，血价13/22、净扣24/39。第2试T7损0、沙坑行动末4；第6试T7损4、沙坑行动末5，两轮净扣均24。六试仅一独立局，最终仍失败。

现有子项：5604982e13890e0e2bc8bf8246272e8267321c0b, c719bc048fa848119f217ba0e966aac7e2671ddf。列出的提交均核为实际live祖先，未登记本项implemented/duplicate。

旧规则/预期行为：原提案要求“复验沙虫全败探索同盘面9血换15伤与4血换沙坑一轮，保留血价、毒、沙坑两边界比较；缺独立胜局及完整反事实，不拟固定阈值，不放宽必死SL，行为证据不足部分保留waiting。”。本批维持现有出牌、药水、SL和终局规则；实际资源、候选预测、完整执行与因果收益分列。

处置与缺数据：waiting。WQ同盘多15伤付9血及T7付4血延长沙坑一轮已核；缺固定后继和独立存活验证，不能拟统一交换阈值或放宽必死SL。

验证：读取本角色原日志及原冻结提案；固定数值核验、既有离线消费者读回见report.md和各消费者输出。局部正确不替代完整消费者验证。

方法/切分：不拟新参数，不把SL尝试或状态帧当独立局；后续需按run分组、用更早局训练和后移新局验证，完整反事实保持相同入口、后继和预算。

预期影响/回退：本批没有行为改动或胜率承诺，无需源码回退；保留原失败、反例、缺数据与原ID，后续实现只能撤回独立实现提交。


## 4. silent-proposal-a099e89437e942bb


角色：silent；范围仅原提案已观察进阶。领域：combat, potion。

原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-cunning-capacity.md`；SHA256：`e02b6c6c93defbea23d60a515bf17be3c1c6ac3d3b47dd0e6da647cea92910c2`（读回一致）。

账本：silent-0030, silent-0257, silent-0258。原任务：experience-update。

证据与反例：九局42饮：SADL3CGYTGSR A7、F4QKG4J1AJJZ A9、02HB4L0C3C67/4D4J8USKCPAV/JLN5SK17W4FQ/LS8035TB32P3/NB8KCF6HRGVF/S9UZAK0JP0C0/WQZVENQ7DTRP A10。37次添3、2次添2、3次添0；逐次等于min(3,10−当步手数)，新增刀升级。WQ F33第5试T11三瓶添2/0/0，第6试添3/2/0，满手仍消耗。计划妥当建立后轮初十手是观测，不等于主动选留价值已建模。

现有子项：6403fdcdadc803a092beb5165a068e22bf51c412。列出的提交均核为实际live祖先，未登记本项implemented/duplicate。

旧规则/预期行为：原提案要求“狡诈药水确定生成与剩余手位、计划妥当保留容量及出刀穿插完整序列核验”。本批维持现有出牌、药水、SL和终局规则；实际资源、候选预测、完整执行与因果收益分列。

处置与缺数据：waiting。狡诈42次容量及现有live子项已核；计划妥当主动选留、复合生成/弃牌/重问和SL恢复后的完整消费者未验收，不能将子项当整包完成。

验证：读取本角色原日志及原冻结提案；固定数值核验、既有离线消费者读回见report.md和各消费者输出。局部正确不替代完整消费者验证。

方法/切分：不拟新参数，不把SL尝试或状态帧当独立局；后续需按run分组、用更早局训练和后移新局验证，完整反事实保持相同入口、后继和预算。

预期影响/回退：本批没有行为改动或胜率承诺，无需源码回退；保留原失败、反例、缺数据与原ID，后续实现只能撤回独立实现提交。


## 5. silent-proposal-47910f82a1fdd98f


角色：silent；范围仅原提案已观察进阶。领域：combat, potion, sl, terminal。

原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-continuation-sl.md`；SHA256：`d4ff2c80c60bdac273fbce918109b0a4634484006ec7e3b6b4516b9afede51bd`（读回一致）。

账本：silent-0018, silent-0019, silent-0020, silent-0021, silent-0025, silent-0079, silent-0198, silent-0228, silent-0255。原任务：experience-update。

证据与反例：TXZ6RVMQA09D A10 F43/F45/F46/F48/F49：出牌前70→66、52→48、62→58、60→56、4→0，第二帧均cards_played_this_turn=0。SL恢复存档不重复扣开场4。WQ及TXZ的同盘血价见对应端点核验；未知回血/复活组合不补推顺序。

现有子项：e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a。列出的提交均核为实际live祖先，未登记本项implemented/duplicate。

旧规则/预期行为：原提案要求“无小血瓶王室猛毒开场4血续战入口、SL同盘攻防/沙坑代价与真实资源结转”。本批维持现有出牌、药水、SL和终局规则；实际资源、候选预测、完整执行与因果收益分列。

处置与缺数据：waiting。王室猛毒五次开场扣4及连战入口已有live实现；仍缺留药整战对照、受控SL后继和未知回血/复活组合相位证据。

验证：读取本角色原日志及原冻结提案；固定数值核验、既有离线消费者读回见report.md和各消费者输出。局部正确不替代完整消费者验证。

方法/切分：不拟新参数，不把SL尝试或状态帧当独立局；后续需按run分组、用更早局训练和后移新局验证，完整反事实保持相同入口、后继和预算。

预期影响/回退：本批没有行为改动或胜率承诺，无需源码回退；保留原失败、反例、缺数据与原ID，后续实现只能撤回独立实现提交。


## 6. silent-proposal-f1374df72d8e6a25


角色：silent；范围仅原提案已观察进阶。领域：combat, potion, terminal。

原文：`/home/dw/Projects/agent-sts2/learner/runs/20261007-224302-postmortem/proposal-resource-value.md`；SHA256：`df1e14ed2c6b4b31c1dcbd1bd373702cff34a58332d4aab60f7e31dc44b395a0`（读回一致）。

账本：silent-0019, silent-0020, silent-0050, silent-0253。原任务：postmortem。

证据与反例：Q6M2Y34MWKRE A10 F7 36→57、F8赢后57→2、F9 2→0。F2 T1早喝敏捷+双挡是未执行候选，实际T3才喝，不能声称早喝能救后战；旧原答低可信不等于反事实。1913SE84AXQF A10 F24实际锻造40→40、F28休息40→61、F29赢后61→46、F31 46→0，路线条件已变。

现有子项：没有足以关闭本项的live源码提交。列出的提交均核为实际live祖先，未登记本项implemented/duplicate。

旧规则/预期行为：原提案要求“将胜战退出HP与药栏接入下一战评估，核对低置信选线和持续/临时药价；证据不足先保留阈值”。本批维持现有出牌、药水、SL和终局规则；实际资源、候选预测、完整执行与因果收益分列。

处置与缺数据：waiting。Q6早饮候选没有完整实打对照，原审计整轮边界全部unknown；1913实际锻造改变路线条件，缺同入口后继对照，不能改药价或HP护栏。

验证：读取本角色原日志及原冻结提案；固定数值核验、既有离线消费者读回见report.md和各消费者输出。局部正确不替代完整消费者验证。

方法/切分：不拟新参数，不把SL尝试或状态帧当独立局；后续需按run分组、用更早局训练和后移新局验证，完整反事实保持相同入口、后继和预算。

预期影响/回退：本批没有行为改动或胜率承诺，无需源码回退；保留原失败、反例、缺数据与原ID，后续实现只能撤回独立实现提交。


## 7. silent-proposal-38a49e6c97f31eea


角色：silent；范围仅原提案已观察进阶。领域：combat, potion, sl。

原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-mechanisms.md`；SHA256：`6a07471e9049744900d49529a939a7014fb686810a0d7983e6c35eb65b5e8cb0`（读回一致）。

账本：silent-0006, silent-0011, silent-0025, silent-0044, silent-0050, silent-0064, silent-0133, silent-0253, silent-0259, silent-0261, silent-0262。原任务：experience-update。

证据与反例：Q6M2Y34MWKRE A10 F8 T4普通紧勒的原提案链为103→95→85→83、毒后80，已有限定live源码；不能外推升级/叠层/有挡。1913SE84AXQF A10 F17 58→14，再生与入伤分账；F31 T2弃磨蚀建立1敏/4荆棘、T3/T4仍需真实格挡，重接不能当额外已打伤。原本包跨机制证据不等于复合选择消费者已校准。

现有子项：5c7105ff0294466da8319f2934beda05c6040794。列出的提交均核为实际live祖先，未登记本项implemented/duplicate。

旧规则/预期行为：原提案要求“第83批静默经验：紧勒逐牌失血与增益分源固定帧闭环”。本批维持现有出牌、药水、SL和终局规则；实际资源、候选预测、完整执行与因果收益分列。

处置与缺数据：waiting。普通紧勒限定公式已有live；再生/荆棘/重接/阈值与SL联合后继尚无本包完整消费者验收和受控比较，不能整包关闭。

验证：读取本角色原日志及原冻结提案；固定数值核验、既有离线消费者读回见report.md和各消费者输出。局部正确不替代完整消费者验证。

方法/切分：不拟新参数，不把SL尝试或状态帧当独立局；后续需按run分组、用更早局训练和后移新局验证，完整反事实保持相同入口、后继和预算。

预期影响/回退：本批没有行为改动或胜率承诺，无需源码回退；保留原失败、反例、缺数据与原ID，后续实现只能撤回独立实现提交。


## 8. silent-proposal-ef0e38a5dbd3bc07


角色：silent；范围仅原提案已观察进阶。领域：combat, potion, terminal。

原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-resources.md`；SHA256：`d37416e85fd4f9331fc5f652f5838eae9b528a76fe45b9c10aac07acfd572da5`（读回一致）。

账本：silent-0019, silent-0020, silent-0021。原任务：experience-update。

证据与反例：1913SE84AXQF A10 F24锻造不回血、F28实回21、F29胜损15至46、F31死，未来第三火未抵达；Q6M2Y34MWKRE A10 F7实回21、F8胜损55只余2、F9死。两局既定计划与实际动作不同，未取得/死亡前未触发的能力不能预支，但没有另一条受控路线。

现有子项：没有足以关闭本项的live源码提交。列出的提交均核为实际live祖先，未登记本项implemented/duplicate。

旧规则/预期行为：原提案要求“第83批静默经验：精英胜后连续血价与实际回复/能力资源链核验”。本批维持现有出牌、药水、SL和终局规则；实际资源、候选预测、完整执行与因果收益分列。

处置与缺数据：waiting。1913锻造/休息与Q6胜后2血接走廊资源链已核；缺受控换线/休息/用药完整后继及能力收益归属，两条失败链不能拟统一血价。

验证：读取本角色原日志及原冻结提案；固定数值核验、既有离线消费者读回见report.md和各消费者输出。局部正确不替代完整消费者验证。

方法/切分：不拟新参数，不把SL尝试或状态帧当独立局；后续需按run分组、用更早局训练和后移新局验证，完整反事实保持相同入口、后继和预算。

预期影响/回退：本批没有行为改动或胜率承诺，无需源码回退；保留原失败、反例、缺数据与原ID，后续实现只能撤回独立实现提交。


## 9. silent-proposal-7f820c02d39bfaea


角色：silent；范围仅原提案已观察进阶。领域：combat, sl。

原文：`/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/proposal-saturated-sl.md`；SHA256：`bee54fe85711a177349f927c21f184b7112308ead5c74708b8f3b0b183ecf105`（读回一致）。

账本：silent-0079。原任务：postmortem。

证据与反例：NHA2KW0RB7VP A10 F33六试T1可操作均30HP、两敌合408；首四试T2为29HP/敌合400，末两试23HP/敌合384。窗口净损1→7、敌净扣8→24，包含下轮遗物自动伤，不冒充纯卡牌伤或已执行原候选。既有消费者六个T1窗口开场未知，动作回执不证明完整候选。

现有子项：5604982e13890e0e2bc8bf8246272e8267321c0b, c769739b97389fdc978b6515b83a38e3cd900f67, fdaf787a372880b0438e73bcac7e6d2168b038ed, c719bc048fa848119f217ba0e966aac7e2671ddf。列出的提交均核为实际live祖先，未登记本项implemented/duplicate。

旧规则/预期行为：原提案要求“死亡统计饱和的SL替换须显式比较即时血价与击杀、存活推进，门槛等待固定验证”。本批维持现有出牌、药水、SL和终局规则；实际资源、候选预测、完整执行与因果收益分列。

处置与缺数据：waiting。现有SL候选与动作/整轮审计已读回，但NHA六试T1均turn_opening_unverified，完整候选结果为null；缺固定后继和独立存活验证，不改饱和筛选门槛。

验证：读取本角色原日志及原冻结提案；固定数值核验、既有离线消费者读回见report.md和各消费者输出。局部正确不替代完整消费者验证。

方法/切分：不拟新参数，不把SL尝试或状态帧当独立局；后续需按run分组、用更早局训练和后移新局验证，完整反事实保持相同入口、后继和预算。

预期影响/回退：本批没有行为改动或胜率承诺，无需源码回退；保留原失败、反例、缺数据与原ID，后续实现只能撤回独立实现提交。


## 10. silent-proposal-04b6b430759815ed


角色：silent；范围仅原提案已观察进阶。领域：combat, terminal。

原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-004303-experience-update/proposal-mechanisms.md`；SHA256：`188d4daee0970bba6b59aa7c3498d9da76ef31aac4a42c69be2a86192cadab58`（读回一致）。

账本：silent-0005, silent-0006, silent-0021, silent-0011, silent-0065, silent-0264, silent-0079, silent-0133, silent-0169, silent-0189, silent-0013, silent-0053, silent-0162, silent-0265。原任务：experience-update。

证据与反例：NHA2KW0RB7VP A10 F33 T1六试萎靡X1实−2力量/2弱，F17首毒5→10；K3676LU8B0UH A1 F30 T2带毒刺击4→8、SADL3CGYTGSR A7 F45毒药5→10来自本角色原提案。蟹F33 T2同招/力量−2/弱1时正面1、转向后2，不能在已取整1上再次乘1.5。首次标识与复合负面处理没有足够状态证据，持有油灯不自动推出每次翻倍。

现有子项：75a27fb2c230dc552761b2ad9da4be8a9a35dec3, ec29ea34b919344b707e57ba472ea210f9c39d62。列出的提交均核为实际live祖先，未登记本项implemented/duplicate。

旧规则/预期行为：原提案要求“按静默实帧核油灯首次放大、当前手数/脆弱/能量、蟹朝向取整及能力兑现；只修已观察子公式和估值窗口”。本批维持现有出牌、药水、SL和终局规则；实际资源、候选预测、完整执行与因果收益分列。

处置与缺数据：waiting。精确切击与蟹朝向限定子项已有live；油灯缺可靠首次使用状态及制品吸收/前序负面/重问/SL恢复联合消费者验证，未知不能当首次。

验证：读取本角色原日志及原冻结提案；固定数值核验、既有离线消费者读回见report.md和各消费者输出。局部正确不替代完整消费者验证。

方法/切分：不拟新参数，不把SL尝试或状态帧当独立局；后续需按run分组、用更早局训练和后移新局验证，完整反事实保持相同入口、后继和预算。

预期影响/回退：本批没有行为改动或胜率承诺，无需源码回退；保留原失败、反例、缺数据与原ID，后续实现只能撤回独立实现提交。
