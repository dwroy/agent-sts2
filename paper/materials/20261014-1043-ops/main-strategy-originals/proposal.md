# 静默策略提案逐项核验

时间：2026-10-14T10:24:15+08:00。

本批只消费派发的10个原ID，未领取其他队列项、未新建重复ID。普通任务没有research_request或implementation_request；不套用纯研究专题。开工树干净，git merge --no-edit main返回Already up to date，base为`935059cc107780c1e4c9f8846ea84a5b123a3ffb`。

角色由原runs.jsonl核实：10个锚点及5个原提案明确指定补证局，共15局静默。K367为A1、SADL为A7、F4Q为A9，其余A10；进阶不混用于策略拟合。详细物理行/offset/bytes/SHA及逐局数量见source-references.json、runs-selected.json和evidence-extraction-summary.json。

共同边界：原运行记录均带dirty，不能重建全部历史源码；当前源码仅定位已发布实现及缺口。未拟合任何新阈值/权重。今后按独立局及开始时间切分训练和验证，同局SL不拆成独立样本。没有源码改动、撤码/恢复测试或生产tsc/vitest；不声称实际入库、消费者自然采用或胜率提升。

## silent-proposal-08eaa60bcc449852

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-resources.md`；原SHA256：`4d080ad9b9f1c93bff7bf169d59add7d863db358ca7e05ba10d95cdfb6b31016`。保存原字节副本：`silent-proposal-08eaa60bcc449852.original.md`。

账本：silent-0019、silent-0020。来源任务：experience-update；实现任务：strategy-proposal/20261014-100836-strategy-proposal。

证据：KEN58SH9SLZ6 A10 F3 T2、F4 T1、F5 T2、F11 T1/T2、F15 T1：7次实饮；六赢战净损0/3/0/37/6/0。F12实回27、F16实回29，boss六试空栏。原行及槽位见ken-drinks.json，回复见resource-chains.json。

反例与限制：F15零损仍喝两药，不能推不喝也零损；SL恢复不属于新获药或真实回复。

预期行为与旧规则处置：核赢战到boss入口的实际资源结转，饮用和回复分别计账；当前价格保持。

验证：固定原帧/原决策和现有离线消费者读回；范围、缺帧/缺ID与回执状态保持。需要后续新局的完整已执行候选与受控后继验证，不能用当轮数字代替整战结果。

处置：waiting。七次饮用与两次真实回复已核；缺同资源、同牌序的不饮用或留药到boss完整对照，无法校准持药价格。

拟合与回退：本次不拟参数，缺口按角色/进阶/独立局留出验证；没有新行为提交可回退，保留当前live规则、原提案、初稿和失败历史。

## silent-proposal-92920295a648b540

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-214301-postmortem/proposal-sl-continuation-validation.md`；原SHA256：`f9d04951c404f2d568d492c633e8baeb7ca5b4bee6826e20e9d5c2348c739bbf`。保存原字节副本：`silent-proposal-92920295a648b540.original.md`。

账本：silent-0228、silent-0255。来源任务：postmortem；实现任务：strategy-proposal/20261014-100836-strategy-proposal。

证据：TXZ6RVMQA09D A10 F48第2/3试T6：同48血、敌460，分别损3/净扣36与损0/净扣27；第3试首胜留4，F49开场4→0，未到可操作帧。对应9个配对窗口和五开场见paired-turn-observations.json、royal-opening-observations.json。

反例与限制：少损3也少输出9，后续抽序/生成改变；本局三试不是三局，首胜不等连续通关。

预期行为与旧规则处置：按两战实际剩血/药栏接续验收，保留现有连战目标和严格SL资格。

验证：固定原帧/原决策和现有离线消费者读回；范围、缺帧/缺ID与回执状态保持。需要后续新局的完整已执行候选与受控后继验证，不能用当轮数字代替整战结果。

处置：waiting。三试资源链已核；缺保持后轮牌序与资源条件的连续通关替线，不能据局部保血改SL资格或终局权重。

拟合与回退：本次不拟参数，缺口按角色/进阶/独立局留出验证；没有新行为提交可回退，保留当前live规则、原提案、初稿和失败历史。

## silent-proposal-a327449c331efbc1

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-221303-postmortem/sl-tradeoff-proposal.md`；原SHA256：`e52c156a500b9e5f9d35e7b7e6922a91ee893b16576bc7d11f14e179c2e6a925`。保存原字节副本：`silent-proposal-a327449c331efbc1.original.md`。

账本：silent-0079、silent-0018。来源任务：postmortem；实现任务：strategy-proposal/20261014-100836-strategy-proposal。

证据：WQZVENQ7DTRP A10 F33第2/3试T9同指纹，损13/净扣24→损22/净扣39；第2/6试T7损0→4、净扣仍24，沙坑延长1。六试均败，末T11玩家9血，敌未杀。

反例与限制：多付血有输出或沙坑延时收益，既不能称同安全，也不能一律禁止多损血换线；末轮内部先致死来源未知。

预期行为与旧规则处置：将损血、输出、沙坑与已知后继并列展示；现有候选诊断仅为预测，不调探索排序门槛。

验证：固定原帧/原决策和现有离线消费者读回；范围、缺帧/缺ID与回执状态保持。需要后续新局的完整已执行候选与受控后继验证，不能用当轮数字代替整战结果。

处置：waiting。T9付9血多15净扣、T7付4血延长沙坑已核；缺两条截止边界的完整受控后继及独立胜局，不能拟固定血伤阈值。

拟合与回退：本次不拟参数，缺口按角色/进阶/独立局留出验证；没有新行为提交可回退，保留当前live规则、原提案、初稿和失败历史。

## silent-proposal-a099e89437e942bb

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-cunning-capacity.md`；原SHA256：`e02b6c6c93defbea23d60a515bf17be3c1c6ac3d3b47dd0e6da647cea92910c2`。保存原字节副本：`silent-proposal-a099e89437e942bb.original.md`。

账本：silent-0030、silent-0257、silent-0258。来源任务：experience-update；实现任务：strategy-proposal/20261014-100836-strategy-proposal。

证据：WQZVENQ7DTRP A10 F33第5/6试T11八手/五手连饮，添2/0/0与3/2/0；九个指定静默局共42饮：37次添3、2次添2、3次添0，新增SHIV均升级、基础6，HP与能量不变。具体局/层/回合见cunning-observations.json。

反例与限制：满手耗瓶不添刀；手位不足分支仅WQ，不能泛化所有生成牌或认多刀就能救局。

预期行为与旧规则处置：按每步手位比较饮用与出刀穿插，保留跨轮计划妥当与SL恢复的未知分支。

验证：固定原帧/原决策和现有离线消费者读回；范围、缺帧/缺ID与回执状态保持。需要后续新局的完整已执行候选与受控后继验证，不能用当轮数字代替整战结果。

处置：waiting。3/2/0生成及逐步手位已有live实现6403fdcdadc803a092beb5165a068e22bf51c412；缺完整穿插派发、跨轮保留与SL恢复的消费者验证，整项继续waiting。

拟合与回退：本次不拟参数，缺口按角色/进阶/独立局留出验证；没有新行为提交可回退，保留当前live规则、原提案、初稿和失败历史。

## silent-proposal-47910f82a1fdd98f

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-continuation-sl.md`；原SHA256：`d4ff2c80c60bdac273fbce918109b0a4634484006ec7e3b6b4516b9afede51bd`。保存原字节副本：`silent-proposal-47910f82a1fdd98f.original.md`。

账本：silent-0018、silent-0019、silent-0020、silent-0021、silent-0025、silent-0079、silent-0198、silent-0228、silent-0255。来源任务：experience-update；实现任务：strategy-proposal/20261014-100836-strategy-proposal。

证据：TXZ6RVMQA09D A10 F43/45/46/48/49首动作前70→66、52→48、62→58、60→56、4→0。首COMBAT可能仍在开场结算，须取ready=true或最终GAME_OVER；WQ同盘血价分开。

反例与限制：无小血瓶的扣4不能决定小血瓶/回血/复活组合内部顺序；SL恢复帧已含开场结算不能再扣。

预期行为与旧规则处置：新模拟战按已观察组合扣开场价，并传递首战实际资源；不提前记未知回血/复活或未来营火。

验证：固定原帧/原决策和现有离线消费者读回；范围、缺帧/缺ID与回执状态保持。需要后续新局的完整已执行候选与受控后继验证，不能用当轮数字代替整战结果。

处置：waiting。开场扣4及连战接续已有live实现e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a；宽项缺SL血价、留药、路线预算的受控后继及未知回血/复活组合顺序。

拟合与回退：本次不拟参数，缺口按角色/进阶/独立局留出验证；没有新行为提交可回退，保留当前live规则、原提案、初稿和失败历史。

## silent-proposal-f1374df72d8e6a25

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-224302-postmortem/proposal-resource-value.md`；原SHA256：`df1e14ed2c6b4b31c1dcbd1bd373702cff34a58332d4aab60f7e31dc44b395a0`。保存原字节副本：`silent-proposal-f1374df72d8e6a25.original.md`。

账本：silent-0019、silent-0020、silent-0050、silent-0253。来源任务：postmortem；实现任务：strategy-proposal/20261014-100836-strategy-proposal。

证据：Q6M2Y34MWKRE A10 F2 T1原线实损12，早喝敏捷双挡为未完整执行候选；T3实际用药后双挡14零损。F7休36→57，F8胜后2，F9 T2死。1913SE84AXQF F24实锻造、F28休40→61、F29胜后46、F31入口46。

反例与限制：Q6 F5/F6零损留药不能推全局都应早喝；1913原预计回血改锻造，实际路线条件不同，不作同条件预测误差。

预期行为与旧规则处置：将实际退出HP/药栏与后继入口连续核查，临时/持续药效分账，先隔离机制误差。

验证：固定原帧/原决策和现有离线消费者读回；范围、缺帧/缺ID与回执状态保持。需要后续新局的完整已执行候选与受控后继验证，不能用当轮数字代替整战结果。

处置：waiting。Q6早喝候选未完整执行，1913营火条件改变；缺隔离机制误差、同预算完整后继与未用/早用/留药对照，不能改药价或终局权重。

拟合与回退：本次不拟参数，缺口按角色/进阶/独立局留出验证；没有新行为提交可回退，保留当前live规则、原提案、初稿和失败历史。

## silent-proposal-38a49e6c97f31eea

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-mechanisms.md`；原SHA256：`6a07471e9049744900d49529a939a7014fb686810a0d7983e6c35eb65b5e8cb0`。保存原字节副本：`silent-proposal-38a49e6c97f31eea.original.md`。

账本：silent-0006、silent-0011、silent-0025、silent-0044、silent-0050、silent-0064、silent-0133、silent-0253、silent-0259、silent-0261、silent-0262。来源任务：experience-update；实现任务：strategy-proposal/20261014-100836-strategy-proposal。

证据：Q6M2Y34MWKRE A10 F8 T4 s282887—282891敌103→95→85→85→83，T5首帧80，对应8攻击、后攻8+2、弃牌完成后2、毒3。1913SE84AXQF F17再生、F31 T2—T4敏捷/荆棘/重接须分源；T3双挡12仍损5。

反例与限制：普通无挡紧勒子公式不覆盖升级/重放/叠层/有挡；净HP损不等敌方毛伤，重接和死亡截断不作总伤差额。

预期行为与旧规则处置：按已观察机制对普通紧勒、临时敏捷、再生、荆棘、重接逐项核查；未证分支保留未知。

验证：固定原帧/原决策和现有离线消费者读回；范围、缺帧/缺ID与回执状态保持。需要后续新局的完整已执行候选与受控后继验证，不能用当轮数字代替整战结果。

处置：waiting。普通无挡紧勒已有live实现5c7105ff0294466da8319f2934beda05c6040794；多机制宽项仍缺联合消费者重放、来源拆分及隔离机制误差后的整战验证。

拟合与回退：本次不拟参数，缺口按角色/进阶/独立局留出验证；没有新行为提交可回退，保留当前live规则、原提案、初稿和失败历史。

## silent-proposal-ef0e38a5dbd3bc07

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-resources.md`；原SHA256：`d37416e85fd4f9331fc5f652f5838eae9b528a76fe45b9c10aac07acfd572da5`。保存原字节副本：`silent-proposal-ef0e38a5dbd3bc07.original.md`。

账本：silent-0019、silent-0020、silent-0021。来源任务：experience-update；实现任务：strategy-proposal/20261014-100836-strategy-proposal。

证据：1913SE84AXQF A10 F24锻造不回血、F28实回21、F29再损15、F31精英入口46；Q6M2Y34MWKRE F3事件付8、F7回21、F8赢损55到2、F9死亡。能力持有/本战施放/下一轮兑现须分开。

反例与限制：实际选休息仍可能后战死；未来第三营火未抵达，不能预支为已到账HP；两败不证明更保守路线会赢。

预期行为与旧规则处置：只结转实际完成的节点效果，保留未来回血和未触发能力的未知，不改路线血价或能力权重。

验证：固定原帧/原决策和现有离线消费者读回；范围、缺帧/缺ID与回执状态保持。需要后续新局的完整已执行候选与受控后继验证，不能用当轮数字代替整战结果。

处置：waiting。实际休息、锻造与胜战损血链已核；缺另选营火、前序事件血价、早用药或换路线的完整受控结果，不能校准路线血价与能力终局权重。

拟合与回退：本次不拟参数，缺口按角色/进阶/独立局留出验证；没有新行为提交可回退，保留当前live规则、原提案、初稿和失败历史。

## silent-proposal-7f820c02d39bfaea

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/proposal-saturated-sl.md`；原SHA256：`bee54fe85711a177349f927c21f184b7112308ead5c74708b8f3b0b183ecf105`。保存原字节副本：`silent-proposal-7f820c02d39bfaea.original.md`。

账本：silent-0079。来源任务：postmortem；实现任务：strategy-proposal/20261014-100836-strategy-proposal。

证据：NHA2KW0RB7VP A10 F33第1/5/6试T1，30血同盘：原整轮14挡/损1/跨轮净扣8，替线8挡/损7/净扣24；两敌均活，六试全败。见paired-turn-observations.json。

反例与限制：净扣包含后继轮初来源，不能全归SL选定卡；第5/6同局重放不是独立胜率样本，全死预测不抹平6实血价。

预期行为与旧规则处置：同时保存原线与替线预测、实际动作和观测端点；不把现有诊断当已验证排序收益。

验证：固定原帧/原决策和现有离线消费者读回；范围、缺帧/缺ID与回执状态保持。需要后续新局的完整已执行候选与受控后继验证，不能用当轮数字代替整战结果。

处置：waiting。多16净扣付6血、两敌均活且六试败已核；现有预测比较已实现，缺独立成对后继胜负及同预算饱和排序校准，不能改探索门槛。

拟合与回退：本次不拟参数，缺口按角色/进阶/独立局留出验证；没有新行为提交可回退，保留当前live规则、原提案、初稿和失败历史。

## silent-proposal-04b6b430759815ed

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-004303-experience-update/proposal-mechanisms.md`；原SHA256：`188d4daee0970bba6b59aa7c3498d9da76ef31aac4a42c69be2a86192cadab58`。保存原字节副本：`silent-proposal-04b6b430759815ed.original.md`。

账本：silent-0005、silent-0006、silent-0021、silent-0011、silent-0065、silent-0264、silent-0079、silent-0133、silent-0169、silent-0189、silent-0013、silent-0053、silent-0162、silent-0265。来源任务：experience-update；实现任务：strategy-proposal/20261014-100836-strategy-proposal。

证据：NHA2KW0RB7VP A10 F17 T1首毒5→10、F33 T1 X1萎靡−2力/2弱；K3676LU8B0UH A1 F30 T2带毒刺击4→8；SADL3CGYTGSR A7 F45首毒5→10。三局17窗口支持，NHA油灯字段跨501帧仅一个值、stack=null。

反例与限制：遗物静态字段不表示首次放大是否已耗；未知负面、零X/升级/叠层未被这些窗口覆盖；手牌持有或未来毒雾不当已兑现收益。

预期行为与旧规则处置：已证手数/朝向子公式沿既有实现；油灯需要跨动作、新战与SL恢复的实际消费跟踪及联合验证。

验证：固定原帧/原决策和现有离线消费者读回；范围、缺帧/缺ID与回执状态保持。需要后续新局的完整已执行候选与受控后继验证，不能用当轮数字代替整战结果。

处置：waiting。精确切击与蟹朝向分别已有live祖先8b9bacbebb20eaaa1133a9945da6c7abfcda745d、ec29ea34b919344b707e57ba472ea210f9c39d62；油灯首次消费跨动作/新战/SL追踪和能力完整后继仍未验证，宽项waiting。

拟合与回退：本次不拟参数，缺口按角色/进阶/独立局留出验证；没有新行为提交可回退，保留当前live规则、原提案、初稿和失败历史。

