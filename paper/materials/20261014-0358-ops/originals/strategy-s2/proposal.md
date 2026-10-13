# 本批静默猎手十项原提案核验

记录时间：2026-10-14 03:47:38 CST。task=strategy-proposal；character=silent；batch=20261014-033425-s2-strategy-proposal。

本批仅消费已领取10个原id；未创建重复提案，未处理其他队列。learn.json无research_request/implementation_request；根普通专题请求绑定另一批，故不承接。初始工作树干净，git merge --no-edit main返回Already up to date，base=02d1e183dd84b67c2c12a9a6ccfe25502a7eac49。

329条原始状态/决策逐条从只读logs核对，留offset/length/SHA256及原JSON于verified-source-rows.jsonl；完整42饮及成对回合/资源链见evidence-verification.json。runs.jsonl核15个锚点或原提案证据局全部SILENT；只分析这些角色证据，没有重做其他专题或全历史统计。

样本与反例：同局SL不能拆为独立局；TX T6少损3同时少输出9、WQ T7延沙坑需付4血及Q6 F5/F6零损留药都是约束。未选择整场、改变后续抽序、原dirty源码不可复原、缺失内部结算顺序均保留未知。本批不拟参数；未来验证按独立run和时间后移，不以旧发现局兼作样本外验证。

旧/新规则与回退：无新生产规则。已有子实现仅核覆盖，不改变药水持有价、必死/SL或终局权重。无新commit/live合入/eval版本，不登记shipped；未来实现逐项独立提交，可撤该提交恢复旧行为并保留证据，其他角色及未观察进阶须保持等价。

## silent-proposal-08eaa60bcc449852

原目标：核赢战耗药与真实回复到boss入口的资源结转；缺未饮用/留药整战对照保留现价值规则

账本：silent-0019, silent-0020；原领域：potion。原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-resources.md；SHA256=4d080ad9b9f1c93bff7bf169d59add7d863db358ca7e05ba10d95cdfb6b31016。

核实证据：KEN58SH9SLZ6 A10 F3 T2、F4 T1、F5 T2、F11 T1/T2、F15 T1：7次饮用；F12 26→53实回27、F16 46→75实回29，SL恢复另账。

处置：**waiting**。KEN58SH9SLZ6 的7次饮用和两次真实回复可复现；缺同资源、同牌序的未饮用/留药到boss整战对照，不能校准持药价或留药阈值。

预期行为与验证：保留当前生产规则；下次只补上述缺口。机制使用冻结实际状态核数值、费用、手位及兑现时点；策略调整须在相同可观测输入和预算下比较完整后继，不用候选或局部保血冒称通关改善。

## silent-proposal-92920295a648b540

原目标：固定核对SL T6少损3也少伤9、首战赢后4血与F49开场死；三尝试按同局资源链验收，禁止将首胜/低可信0%当连战改善或SL依据，缺通关对照时保留原规则并等待新局。

账本：silent-0228, silent-0255；原领域：combat, sl, terminal。原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-214301-postmortem/proposal-sl-continuation-validation.md；SHA256=f9d04951c404f2d568d492c633e8baeb7ca5b4bee6826e20e9d5c2348c739bbf。

核实证据：TXZ6RVMQA09D A10 F48第2/3试T6，同为48血、敌460：3损/36净扣→0损/27净扣（states281479/281484、281535/281539）。末次F48出口4；F49 states281565→281566为4→0，敌111血/22攻击未执行。

处置：**waiting**。TXZ6RVMQA09D 已有连战资源接续；T6少损3也少扣9，后续牌序改变，首胜4血后F49开场死亡。缺同抽序且连续通关的替线，不调整SL或终局权重。

预期行为与验证：保留当前生产规则；下次只补上述缺口。机制使用冻结实际状态核数值、费用、手位及兑现时点；策略调整须在相同可观测输入和预算下比较完整后继，不用候选或局部保血冒称通关改善。

## silent-proposal-a327449c331efbc1

原目标：复验沙虫全败探索同盘面9血换15伤与4血换沙坑一轮，保留血价、毒、沙坑两边界比较；缺独立胜局及完整反事实，不拟固定阈值，不放宽必死SL，行为证据不足部分保留waiting。

账本：silent-0079, silent-0018；原领域：combat, sl。原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-221303-postmortem/sl-tradeoff-proposal.md；SHA256=e52c156a500b9e5f9d35e7b7e6922a91ee893b16576bc7d11f14e179c2e6a925。

核实证据：WQZVENQ7DTRP A10 F33第2/3试T9 decisions275894/275960指纹相同，states282075→282079与282144→282148：26→13/184→160，对26→4/184→145。第2/3试T7零损净扣24；第6试T7多损4、净扣仍24、T7结束前沙坑4→5；敌方结算后T8分别为3/4。末T11 9血9挡对27、25毒结算后敌56而死亡。

处置：**waiting**。WQZVENQ7DTRP 同指纹T9替线多损9/多扣15，T7逃离另有4血换沙坑1轮的收益；现有诊断已列资源差额，缺完整获胜对照及可校准的双截止排序条件。

预期行为与验证：保留当前生产规则；下次只补上述缺口。机制使用冻结实际状态核数值、费用、手位及兑现时点；策略调整须在相同可观测输入和预算下比较完整后继，不用候选或局部保血冒称通关改善。

## silent-proposal-a099e89437e942bb

原目标：狡诈药水确定生成与剩余手位、计划妥当保留容量及出刀穿插完整序列核验

账本：silent-0030, silent-0257, silent-0258；原领域：combat, potion。原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-cunning-capacity.md；SHA256=e02b6c6c93defbea23d60a515bf17be3c1c6ac3d3b47dd0e6da647cea92910c2。

核实证据：本提案9局均SILENT：SADL3CGYTGSR A7、F4QKG4J1AJJZ A9，其余02HB4L0C3C67/4D4J8USKCPAV/JLN5SK17W4FQ/LS8035TB32P3/NB8KCF6HRGVF/S9UZAK0JP0C0/WQZVENQ7DTRP A10。42饮原帧均核；37次有位添3、两次8手添2、三次10手添0。WQ F33第5试T11为2/0/0、第6试为3/2/0；新增刀均升级/基础6，饮用当步HP与能量不变。

处置：**waiting**。狡诈药水3/2/0生成与基础6已在live实现；生成后按真实手牌重规划，缺穿插饮用完整方案的实际派发、保留选择与跨轮手位消费者验证，不能将求解器候选当已执行整线。

预期行为与验证：保留当前生产规则；下次只补上述缺口。机制使用冻结实际状态核数值、费用、手位及兑现时点；策略调整须在相同可观测输入和预算下比较完整后继，不用候选或局部保血冒称通关改善。

## silent-proposal-47910f82a1fdd98f

原目标：无小血瓶王室猛毒开场4血续战入口、SL同盘攻防/沙坑代价与真实资源结转

账本：silent-0018, silent-0019, silent-0020, silent-0021, silent-0025, silent-0079, silent-0198, silent-0228, silent-0255；原领域：combat, potion, sl, terminal。原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-continuation-sl.md；SHA256=d4ff2c80c60bdac273fbce918109b0a4634484006ec7e3b6b4516b9afede51bd。

核实证据：TXZ A10 F48第三试首胜4血/空栏接F49 4→0；WQ A10 F33 T9和T7的即时血价方向相反，说明不能统一只保血或只增伤。王室猛毒+血瓶旧净2来自原账本silent-0198，本批不重新拆分其内部顺序或扩到未知组合。

处置：**waiting**。王室猛毒无血瓶开场扣4及连战结转已有live实现；旧合并提案还含SL双向血价、药水留用和路线资源预算，缺这些条件的完整受控后继战及未知回血/复活组合证据。

预期行为与验证：保留当前生产规则；下次只补上述缺口。机制使用冻结实际状态核数值、费用、手位及兑现时点；策略调整须在相同可观测输入和预算下比较完整后继，不用候选或局部保血冒称通关改善。

## silent-proposal-f1374df72d8e6a25

原目标：将胜战退出HP与药栏接入下一战评估，核对低置信选线和持续/临时药价；证据不足先保留阈值

账本：silent-0019, silent-0020, silent-0050, silent-0253；原领域：combat, potion, terminal。原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-224302-postmortem/proposal-resource-value.md；SHA256=df1e14ed2c6b4b31c1dcbd1bd373702cff34a58332d4aab60f7e31dc44b395a0。

核实证据：Q6M2Y34MWKRE A10 F2 56→44、F5/F6零损并保留速度药、F8 57→2胜后空栏、F9 2→0。F2 T3敏捷2、两防御7+7，现场吞噬14实零损。1913SE84AXQF A10 F17 58→14胜、F19 58→44、F23 44→40、F29 61→46、F31 46带虚弱/复制入场后死。

处置：**waiting**。Q6赢精英后2血接走廊死、1913入口46资源链已核；早喝敏捷候选未完整执行且路线实际锻造改变条件，缺同输入同预算整战/后继对照，不能拟新药价或HP权重。

预期行为与验证：保留当前生产规则；下次只补上述缺口。机制使用冻结实际状态核数值、费用、手位及兑现时点；策略调整须在相同可观测输入和预算下比较完整后继，不用候选或局部保血冒称通关改善。

## silent-proposal-38a49e6c97f31eea

原目标：第83批静默经验：紧勒逐牌失血与增益分源固定帧闭环

账本：silent-0006, silent-0011, silent-0025, silent-0044, silent-0050, silent-0064, silent-0133, silent-0253, silent-0259, silent-0261, silent-0262；原领域：combat, potion, sl。原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-mechanisms.md；SHA256=6a07471e9049744900d49529a939a7014fb686810a0d7983e6c35eb65b5e8cb0。

核实证据：Q6 A10 F8 T4 states282887—282892敌103→95（普通紧勒建2）→85（突然一拳8+2）→83（生存者弃牌完成2）→80（已结3毒），HP不变。1913 A10 F17赢后14；F31以46血/两药入场后死。更早Y6 A0的紧勒和封顶再生只引用既有账本，不冒作本批重新核原帧。

处置：**waiting**。普通无挡紧勒子公式已在live接线；宽提案还含再生/荆棘/重接/能力分源与用药、SL整战验收，缺联合完整消费者重放及隔离机制误差后的独立胜负对照，不能整条标duplicate。

预期行为与验证：保留当前生产规则；下次只补上述缺口。机制使用冻结实际状态核数值、费用、手位及兑现时点；策略调整须在相同可观测输入和预算下比较完整后继，不用候选或局部保血冒称通关改善。

## silent-proposal-ef0e38a5dbd3bc07

原目标：第83批静默经验：精英胜后连续血价与实际回复/能力资源链核验

账本：silent-0019, silent-0020, silent-0021；原领域：combat, potion, terminal。原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-resources.md；SHA256=d37416e85fd4f9331fc5f652f5838eae9b528a76fe45b9c10aac07acfd572da5。

核实证据：Q6 A10 F8胜净损55，2血空栏接F9；1913 A10 F29胜净损15至46、F31仍死。F24实际锻造不回血及未到F32是原提案条件限制；本批入口/退出raw来源逐条验证，未另拟旧全史239后战分母。

处置：**waiting**。1913实际锻造、回血和Q6精英出口资源可核；未到的未来营火无收益，缺另选休息/提前用药/不付事件血价的完整后继路线对照及通用资源预算校准。

预期行为与验证：保留当前生产规则；下次只补上述缺口。机制使用冻结实际状态核数值、费用、手位及兑现时点；策略调整须在相同可观测输入和预算下比较完整后继，不用候选或局部保血冒称通关改善。

## silent-proposal-7f820c02d39bfaea

原目标：死亡统计饱和的SL替换须显式比较即时血价与击杀、存活推进，门槛等待固定验证

账本：silent-0079；原领域：combat, sl。原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/proposal-saturated-sl.md；SHA256=bee54fe85711a177349f927c21f184b7112308ead5c74708b8f3b0b183ecf105。

核实证据：NHA2KW0RB7VP A10 F33 T1六试可操作30血/两敌408：第1—4次T2为29血/总敌400；第5/6次为23血/总敌384。跨轮净扣8/24含抱抱先生次轮自动伤，不能全部记牌伤；两侧均存活。末T4 16血6挡、38攻击，毒后敌170/147而玩家0。

处置：**waiting**。NHA同开场替线跨轮敌净扣8→24且损血1→7，两侧均未杀、六试全败；现有候选诊断不提供完整执行结果，缺独立成对胜负与同预算排序校准，不改饱和SL准入。

预期行为与验证：保留当前生产规则；下次只补上述缺口。机制使用冻结实际状态核数值、费用、手位及兑现时点；策略调整须在相同可观测输入和预算下比较完整后继，不用候选或局部保血冒称通关改善。

## silent-proposal-04b6b430759815ed

原目标：按静默实帧核油灯首次放大、当前手数/脆弱/能量、蟹朝向取整及能力兑现；只修已观察子公式和估值窗口

账本：silent-0005, silent-0006, silent-0021, silent-0011, silent-0065, silent-0264, silent-0079, silent-0133, silent-0169, silent-0189, silent-0013, silent-0053, silent-0162, silent-0265；原领域：combat, terminal。原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-004303-experience-update/proposal-mechanisms.md；SHA256=188d4daee0970bba6b59aa7c3498d9da76ef31aac4a42c69be2a86192cadab58。

核实证据：NHA A10 F17 T1 states283142—283148：七/六/五手精确切击1/3/5，四攻累计31；首次毒药5实际建10。F33 T1 X1萎靡实−2力/2弱；T2同爪−2力/1弱，朝向1→2、火箭30→20，15挡损7及第二试16挡损6。油灯relic字段只有stack=null等静态信息，无首次负面牌是否消费字段。

处置：**waiting**。七/六/五手精确切击及已观察蟹朝向1→2子公式已有live实现；油灯快照无首次使用计数且跨动作/SL恢复状态尚未接线，其他负面/制品/叠层与早建能力整战对照缺失。

预期行为与验证：保留当前生产规则；下次只补上述缺口。机制使用冻结实际状态核数值、费用、手位及兑现时点；策略调整须在相同可观测输入和预算下比较完整后继，不用候选或局部保血冒称通关改善。
