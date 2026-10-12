# 静默猎手本批十项代码提案核验

时间：2026-10-12T19:54:01+08:00。批次：20261012-194301-strategy-proposal。角色：silent，六个来源局均为A10。基线：`a9beb0fd37058a1f279bb8d074baf13cc79357ae`。

本批是普通队列：learn.json 的reason=proposal，有明确的十个proposal_ids，无research_request、implementation_request或proposal_repair；工作树与派发一致。普通研究请求文件绑定另一旧批，不承接其work_spec。本工作树起始干净，按要求merge main结果Already up to date，HEAD未移动。没有扩领其他队列，也没有读取其他角色知识。

本次逐项核原Markdown SHA与26条相关账本，重读六局原始证据。十项均保留waiting：已有机制和诊断子项继续生效，剩余范围缺完整验收或受控数据。没有新源码/知识变更、提交、合入、版本或shipped；不重新注册重复ID。

## 证据与验证范围

日志只读。本批从上一批同六局的原偏移清单定位，重新从根logs读取并核6767条原字节SHA，保存完整本角色摘录：3432 states、3306 decisions、29 SL记录。六个runs.jsonl身份逐行保存，角色全部SILENT、ascension全部10。原清单与辅助核验脚本只是定位/分析工具，结论由本批重新运行得出，未复用上批测试成功声明。

重点楼层：VLZ6CCT8AQ0A F35/36/37/43/45；8JRE1C4H4Z2W F17/33；CA5KE8GFJ9X2 F13；5PM6JAQG6FNQ F33/39；61E2QS63Y9WU F17/23；DUZUBAJ3A8GP F30。实际消费者输入共781状态、756决策；全部756动作唯一匹配原观测时间和指纹，505相邻区间可比较。152候选段全无历史结构化选择阶段，整候选实际收益均未认证；这不意味着动作没执行，而是不能从现有记录证明完整候选归因。

固定数据验证：8文件81项vitest通过；六组当前生产入口planCombatTurn→replaySteps探针均匹配；9组原帧数据断言通过。所有知识JSON读取在探针中阻断，模拟只使用冻结状态和固定输入，未调用LLM或网络。原参数--minWorkers不被安装的vitest接受，首轮未运行任何测试；first.log/first.rc完整保留，去掉不支持参数并采用threads/maxWorkers=1后通过。不将参数启动失败当策略或代码测试失败。

完整tsc、完整vitest/test-sandbox未运行：没有源码改动或提交。撤源码失败/恢复通过不适用，未伪造红绿回执。源码对照只读，十个已存在源码提交经本批核实为实际live `a9127cd90c1e62dd09a9325962d21bc4b11a44d3` 的祖先；13条对应路径中10个blob完全相同，另3个只存在Roy/Dai文本差异，补丁与字节归一核验另存，不擅自同步main/live。固定测试只证明本工作树所跑范围；不声称整个live树完成全套测试。

所有样本均已用于发现或回归，不当盲测。六局不是新六局，SL尝试不增加独立局分母。没有新证据足以拟合预算、血价、启动权重或首杀顺序；未观察进阶和其他角色行为零改动。怪物当前进阶数据库首样本规则、房间五样本门槛均未改变。

## 已有实现的实际来源

这些提交不是本批实现，不能填入本批fixes或merged：

- `772b839f8ada31664cb764ea9ad3bdb03da27f64`：Model observed Silent Apotheosis upgrades。
- `6e233ede76e5dd849f0d40760be64e7cdacf78b1`：Complete six observed Silent Apotheosis upgrade pairs。
- `b2805be4ba44b7375c7908d873889372cc3cfe6c`：Propagate observed Silent Apotheosis Malaise upgrade。
- `f98a929f24901c20efed462b29591e25ebb85451`：Expose Silent Apotheosis candidate coverage facts。
- `45161a51c2c6b7e4a499b13cf749c4108193bbf5`：Expose observed simulation scope in Silent combat choices。
- `dc0e6080cb20c508d94c006648cc3edf0188d306`：Add observed power and HP endpoints to Silent offline execution audit。
- `83512ddcd2c70fd9b983dc38524ff25c8970c1d3`：Audit Silent terminal HP observations after final end turns。
- `f1542578594462e9f9f4e175488795fc480a8a13`：Log Silent A10 HP guard candidate predictions。
- `1a00f10af95c78dfbf75de318a0083256110cf8a`：Expose conservative held-card loss in Silent Fysh candidate facts。
- `fdaf787a372880b0438e73bcac7e6d2168b038ed`：Record Silent candidate dispatch receipts separately from forecasts。

## silent-proposal-89354805ee4d7e77：神化升级传播与实际施放

- 来源：postmortem → strategy-proposal；原文 `/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md`，SHA256 `ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d`；本批保存同名原文副本。
- 账本：silent-0237, silent-0238。
- 本次核实的证据：VLZ6CCT8AQ0A A10 F35/36/37/43 T1、F43 T2、F45 T1。已完成动作269598/269625/269648/269706；states275564→275565能量7→5，275679→275687为90→77血、敌254→203。四次完成回执与F45持有但未施放分列。
- 现有实现和可支持的结论：已有772b839f8ada31664cb764ea9ad3bdb03da27f64、6e233ede76e5dd849f0d40760be64e7cdacf78b1、b2805be4ba44b7375c7908d873889372cc3cfe6c实现已观察升级；f98a929f24901c20efed462b29591e25ebb85451展示候选覆盖。当前silentApotheosisReference明确actual_cast_this_fight=null，不能冒充已追踪本战施放。
- 反例及限制：F43打神化仍整战损57；F45未打而败，不构成神化导致胜负的受控比较。固定F43同序51伤/13损及后续抽牌测试通过，仅证明已覆盖卡的变换。
- 逐项处置：**waiting**。已观察升级和题面子项已有实际live祖先；仍缺跨重规划、SL、重启的本战施放绑定，以及未知升级与自动动作副效应的完整验收，整案保留waiting。
- 预期行为和下一步验证：以四次完成回执和相邻状态为正例，以F45弃神化为持有未施放例；后续须冻结跨SL/重启记录，核可靠的战斗与动作身份，再实现施放生命周期。未知升级保持未知，不设必打神化规则。
- 假设结论变化：原文待核范围经当轮复验得到局部支持，未得到新的策略优越性证据；不新增参数、不扩大已观察范围。

## silent-proposal-f2bfceddb1898dca：三骑士药水预算与时钟

- 来源：postmortem → strategy-proposal；原文 `/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md`，SHA256 `fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26`；本批保存同名原文副本。
- 账本：silent-0106, silent-0019, silent-0201。
- 本次核实的证据：VLZ6CCT8AQ0A F43 T1–末、F45 T1/T4/T5。269748记录MC707ms、1/12样本，rollout horizon1、best=null；269754记录12/12样本，但指纹已经不同。269770原少损候选13损/24伤，对攻击候选31损/32伤。末轮32HP、20挡、来袭83经尖啸成59，完整需损39。
- 现有实现和可支持的结论：45161a51c2c6b7e4a499b13cf749c4108193bbf5已分列模拟范围。现有题面已解释预算退化并保留并列与即时血价；不能重复上线相同诊断。
- 反例及限制：第二次药水MC11ms有12样本不能作首题707ms的一对一性能改善，因为起点手牌/状态已变。未实打的高伤线没有完整胜负；F43胜战损57也须计入F45进场资源。
- 逐项处置：**waiting**。缺同状态、同模型覆盖、同随机输入及同总预算的配对曲线；两次MC题面状态已不同，不能据707ms单例修改预算、留药价格或首杀规则。
- 预期行为和下一步验证：需要固定同一题面、种子、候选和覆盖，离线比较预算分阶段方案，记录候选稳定性与样本收益曲线；未达到此前保留预算和药水规则。
- 假设结论变化：原文待核范围经当轮复验得到局部支持，未得到新的策略优越性证据；不新增参数、不扩大已观察范围。

## silent-proposal-283a164780d11e69：神化经验提案的同源闭环

- 来源：experience-update → strategy-proposal；原文 `/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md`，SHA256 `78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637`；本批保存同名原文副本。
- 账本：silent-0237, silent-0238。
- 本次核实的证据：同89354805的VLZ6CCT8AQ0A F35/F43/F45；此项来自experience-update，关联silent-apotheosis-combat-upgrades，原提案SHA单独核验。
- 现有实现和可支持的结论：复用同一组真实live升级及参考信息源，不能仅因两个原提案描述同一机制就把本项标duplicate；必须覆盖这份原文要求的实际施放和未知边界。
- 反例及限制：升级后手牌正确不证明跨战永久锻造或所有后续自动动作正确；场外deck不改的固定测试通过。
- 逐项处置：**waiting**。同源神化已实现子项已核；实际施放生命周期、未知费用/弃牌及跨轮副效应仍缺验收，不能把经验发布或同源关系当整案duplicate。
- 预期行为和下一步验证：沿原两个ID共同验证，后续实现关联silent-0237/0238，不新增重复提案ID或重复写复盘。
- 假设结论变化：原文待核范围经当轮复验得到局部支持，未得到新的策略优越性证据；不新增参数、不扩大已观察范围。

## silent-proposal-ebbfe3b97548756d：攻防、毒和持续资源分项

- 来源：experience-update → strategy-proposal；原文 `/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md`，SHA256 `08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2`；本批保存同名原文副本。
- 账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。
- 本次核实的证据：VLZ6CCT8AQ0A F43 T1–T5、F45 T3/T5。F45末帧32HP、后空翻8挡和防御12挡合20；力量来袭83经四段各减6到59；余2毒在触媒1下结算3。当前生产入口重放269777只新得12挡，已有8挡另计，完整需损39。
- 现有实现和可支持的结论：现有card-model/turn-solver当前轮复合机制与日志一致；dc0e6080cb20c508d94c006648cc3edf0188d306已提供观测能力与HP端点。没有新增数值修复。
- 反例及限制：开场覆甲4不能带到已耗尽的T5；两张毒雾持有不等于F45已建立。休息增加当前HP仍不保证胜利，本批无HEAL/SMITH整场配对。
- 逐项处置：**waiting**。F45当轮复合数值已复现；口红触发、覆甲变化、临时恢复、未来毒的跨轮联合消费及大脑资源事实消费尚缺完整验收，综合提案仍waiting。
- 预期行为和下一步验证：后续按各触发前后帧和实际敌动作表建立独立跨轮验收；持有、已建立、已结算及未来投影分列，不拟合休息血线或统一持续价值。
- 假设结论变化：原文待核范围经当轮复验得到局部支持，未得到新的策略优越性证据；不新增参数、不扩大已观察范围。

## silent-proposal-e5b87be50f28f311：SL换线和实际执行审计

- 来源：postmortem → strategy-proposal；原文 `/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md`，SHA256 `5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709`；本批保存同名原文副本。
- 账本：silent-0079, silent-0021, silent-0125, silent-0018。
- 本次核实的证据：8JRE1C4H4Z2W F33首试/第三次T2：270216/270282指纹相同，分别attempt1/3；旧原线3损/10伤，换线15损/17伤，候选五轮死亡0/24和5/24须分开。第二次T5护栏与F17 T6抽牌重问也保留；末试T11为5HP/22挡对37。
- 现有实现和可支持的结论：当前selection_audit保留原答、护栏后、SL后及请求动作；fdaf787a372880b0438e73bcac7e6d2168b038ed另存单动作执行回执；离线审计记录连续观测和终态。8文件81项含这些接口固定测试，均通过。
- 反例及限制：多12血价多7伤只证明本轮差值；两试仍失败，不证明拒绝换线能赢。末试防御延长生存但仍死亡，不能据此一概否定保血。completed回执不保证完整候选执行。
- 逐项处置：**waiting**。本批历史152个候选段均无结构化selection_stages，不能补造逐次重规划原因；现有消费者不认证整候选收益。仍缺从选线到中断/执行的全链归因验收及未选线完整结果，保留waiting。
- 预期行为和下一步验证：后续以带新字段的同角色自然局核候选身份、首次派发、抽牌/选择/生成/药水中断和SL边界；策略改动另需受控整场比较，不能用日志展示通过代替收益验证。
- 假设结论变化：原文待核范围经当轮复验得到局部支持，未得到新的策略优越性证据；不新增参数、不扩大已观察范围。

## silent-proposal-49632bc4878fb597：当前属性、虚弱和成长

- 来源：experience-update → strategy-proposal；原文 `/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md`，SHA256 `aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2`；本批保存同名原文副本。
- 账本：silent-0005, silent-0231。
- 本次核实的证据：CA5KE8GFJ9X2 F13 T1/T3/T5；states273237/273252/273263力量0/4/8、喷水11/15/19；273268弱后14攻、10挡、2HP。生产输入267381重放打击/双防御/中和得10挡、完整需损4。
- 现有实现和可支持的结论：当前轮消费者准确，零血实扣2和完整需损4分别记录；不需要为同一数值重复改源码。
- 反例及限制：虚弱没有停止下一次加压，计划中的步法没有取得，不能将本局作为正敏捷验证。
- 逐项处置：**waiting**。当前力量、虚弱和双防御已复现；该成长脚本的跨轮消费与正敏捷、逐击修正联合覆盖仍缺验收，不从单局拟合统一保血或输出权重。
- 预期行为和下一步验证：固定当前进阶、敌移动表和属性前后状态，逐条核跨轮成长；补独立正敏捷、多段案例后再声称整条复合经验覆盖。
- 假设结论变化：原文待核范围经当轮复验得到局部支持，未得到新的策略优越性证据；不新增参数、不扩大已观察范围。

## silent-proposal-66532328a585941f：持有组件和实际启动

- 来源：experience-update → strategy-proposal；原文 `/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md`，SHA256 `56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831`；本批保存同名原文副本。
- 账本：silent-0021, silent-0009。
- 本次核实的证据：5PM6JAQG6FNQ F39末试T2，states274379→274380：玩家29HP、敌35HP均不变，两敌无毒，冒泡耗能5→4；本次消费决策268455。F33建立过雾3/触媒1并赢，不能混作F39条件。
- 现有实现和可支持的结论：当前生产入口重放BUBBLE_BUBBLE的增伤0、剩能4；旧ledger备注把35误作玩家血的勘误已存在，本批不重复更正或扩样本。
- 反例及限制：不同敌人、入口血量、已建立组件和抽序一起变化，F33胜战不是F39提前启动的反事实。探针末尾hpLoss27属于只打冒泡后结束回合的模型值，不是冒泡造成27实损。
- 逐项处置：**waiting**。无毒冒泡耗能零收益已有实现；缺同入口HP、构筑、完整抽序下不同启动顺序的整场对照和收益函数，不能拟合构筑或启动阈值。
- 预期行为和下一步验证：将持有、计划、已建立分别验收；后续固定全场输入比较启动方案，保留所有合法选项，不因一次空打添加未经验证的强制选牌规则。
- 假设结论变化：原文待核范围经当轮复验得到局部支持，未得到新的策略优越性证据；不新增参数、不扩大已观察范围。

## silent-proposal-43a76a31ba7bdcfa：吸取、负敏捷与毒及SL

- 来源：experience-update → strategy-proposal；原文 `/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md`，SHA256 `f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c`；本批保存同名原文副本。
- 账本：silent-0030, silent-0027。
- 本次核实的证据：61E2QS63Y9WU F17 T5/T6，273503→273504吸取后敌2力量、玩家敏捷−2；T6两防御合6，已有覆甲3，毒17+16扣33，玩家56→48。当前267612实盘序列复现6挡、33伤、8损。
- 现有实现和可支持的结论：负敏捷、覆甲和毒分源的当前轮消费者匹配。现有SL语义保持，不因该局首试胜利扩大SL准入。
- 反例及限制：本局首试60血七轮赢，未出现同入口、同抽序的可救活另一失败线；不能混用别局的同抽重试。
- 逐项处置：**waiting**。负敏捷与毒的当前轮数值已核；跨轮吸取接续及同入口HP、构筑、抽序下完整SL另一线仍缺验收，不能修改SL范围或换线偏好。
- 预期行为和下一步验证：分开验证吸取前后状态变换和整场可救活性；没有后者就只保留机制事实，不补未知换线胜率。
- 假设结论变化：原文待核范围经当轮复验得到局部支持，未得到新的策略优越性证据；不新增参数、不扩大已观察范围。

## silent-proposal-5264153a4a4b0e5c：胧光怪召唤、实体成长与focus

- 来源：experience-update → strategy-proposal；原文 `/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md`，SHA256 `b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02`；本批保存同名原文副本。
- 账本：silent-0039, silent-0209。
- 本次核实的证据：61E2QS63Y9WU F23 T1–T5，273577只有本体，273582加入幻象且索引变化；273583/273589/273596力0/3/6。T4本体线267696实盘总扣47、损15；幻象还剩2，到273599为0血/REVIVE_MOVE。
- 现有实现和可支持的结论：当前生产入口复现47伤/15损，但只覆盖已观测当轮序列；已有召唤模型不自动证明完整A10召唤、航行和再起链通过。
- 反例及限制：39伤/零损的focus幻象候选未实打，没有下一轮及整场结果；不能把当前伤害和预测少损当固定首杀收益。
- 逐项处置：**waiting**。T4当前目标线已复现；A10召唤、航行、再起和索引变化的跨轮全链及另一focus完整结果仍缺验收，保留waiting。
- 预期行为和下一步验证：以当前进阶首样本的HP/伤害和观察移动表冻结跨轮输入；保留每目标选项、相同推演并列，实体增减时不把index当稳定身份。
- 假设结论变化：原文待核范围经当轮复验得到局部支持，未得到新的策略优越性证据；不新增参数、不扩大已观察范围。

## silent-proposal-bddfa690a84e03d0：熟睡甲虫唤醒、成长和血价

- 来源：experience-update → strategy-proposal；原文 `/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md`，SHA256 `b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780`；本批保存同名原文副本。
- 账本：silent-0128, silent-0079。
- 本次核实的证据：DUZUBAJ3A8GP F30 T1–T6，睡3/2/1后自然醒；末试275018敌4力量/22攻，275022玩家1HP/16挡，完整需损6。269073序列重放16挡/需损6；SL记录前三次predicted_death，末次died。
- 现有实现和可支持的结论：当前末轮消费者准确；不将前三次预测判死混写成三次实际死亡，也不把四试当四个独立局。
- 反例及限制：末试T4相较首试多扣3敌血也多损2玩家血，四试均无获胜另一线。本来源缺提前打醒后的STUNNED配对。
- 逐项处置：**waiting**。末试T6的16挡及完整需损6已复现；缺提前唤醒后眩晕接续配对与同抽序完整获胜另一线，不能拟合血价、固定杀序或SL偏好。
- 预期行为和下一步验证：按自然醒与提前唤醒分别冻结证据，核临时减力恢复及独立成长；整场排序改变需同条件比较，不用全败推演拟合新权重。
- 假设结论变化：原文待核范围经当轮复验得到局部支持，未得到新的策略优越性证据；不新增参数、不扩大已观察范围。

## 产物、登记与回退

- `raw-manifest.json`：原日志文件、行号、偏移、长度、SHA；`runs-verified.json`：六局身份。
- `queue-snapshot.json`、十份原文副本、`ledger-snapshot.json`：派发范围与原始关联。
- `evidence-verification.json`、`focused-decision-facts.json`：实盘数值和预算/SL配对断言。
- 六份`audit-input-*`/`audit-output-*`、`consumer-summary.json`：实际离线消费；`consumer-probes.json`：六组当轮值，不作全场证明。
- `live-source-verification.json`与三份补丁：实际live祖先和源码差异证明。
- `existing-fixed-tests.first.log`保留参数错误；`existing-fixed-tests.log`为本次81项通过。

只经根目录ledger.py update追加本报告和提案链接，不新增证据分母、claim或状态；原已shipped条目不降为proposed，未完成父提案继续waiting。既有code_proposals ID沿用，不执行add生成重复请求。proposal_results由本任务最终回报交原调度消费，学习者不直接改队列或learn.json。

没有新行为需回退；现有实现保持。后续任何实现仍须固定证据红绿、原沙箱入口、密钥扫描和live锁内流程，通过后登记实际源码与唯一版本、双通知Roy；本报告不制造这些上线记录。没有运行play、停止对局或推送。
