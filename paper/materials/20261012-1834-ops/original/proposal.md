# 本批静默猎手策略提案处置

时间：2026-10-12T18:27:49+08:00。batch：20261012-181302-strategy-proposal。base：4fea9c087e59461ee3a3f58a5df562a9bf5f00b9。

本批领取的10个原ID均已逐项处理，均为waiting。没有新增源码、规则、经验、提交、合入或游戏版本。本批补齐了六组当轮生产消费者复核；已正确的局部模型保留，仍未完成的跨轮/执行归因/受控策略范围继续沿原ID等待。

## 身份、来源与范围

- learn.json本批task=strategy-proposal、character=silent、reason=proposal，工作树和六局集合匹配；只有原10个proposal_ids，没有research_request、implementation_request或proposal_repair。
- 普通专题匹配文件属于20261010-150327，不符合本批身份；没有读取另一个专题代替，不承接纯研究或旧量化父任务。
- 开工git status干净；HEAD与main相同，git merge --no-edit main返回Already up to date。没有下级agent。
- 原10份Markdown逐SHA验证并以.original.md保留；原提案、队列和历史复盘未改。只读取26个相关silent账本项，runs.jsonl六局各一条，均SILENT/A10。
- 本次从原logs完整提取六局3432状态、3306决策、29条SL记录，共6767条；每条按原偏移、长度和SHA回读核验。这里只表示完整提取/字节验证，不声称六局每个决策都完成策略分析。
- 深入分析的相关楼层保留于input-summary.json：共759决策、784状态。旧687条摘录仅用来定位历史，不把旧报告结论替代原日志。
- 9组确定性证据断言见evidence-verification.json；逐动作和逐轮摘录见action-facts.json、turn-facts.json，原字节位置见raw-manifest.json。

## 本批直接消费者复核

probe-consumers.mts屏蔽生成知识文件读取，使用原帧构造真实planCombatTurn输入，经solveTap取得生产SolverInput，按实打卡牌次序调用replaySteps；没有LLM、网络、游戏动作或新策略权重。关闭长程推演，仅核当轮；源状态均未改变。

| 来源 | 当轮复现 | 限制 |
| --- | --- | --- |
| 61E2QS63Y9WU F17 T6 | 两防御6挡、毒33伤、净损8 | 不验证吸取/恢复的跨轮脚本或SL收益 |
| 61E2QS63Y9WU F23 T4 | 猎杀者+灭绝47伤、15损 | 不验证召唤/再起全链或另一focus |
| CA5KE8GFJ9X2 F13 T5 | 双防御10挡、完整需损4、敌净扣3 | 玩家仅2HP，实际死亡净扣不能当完整入伤 |
| VLZ6CCT8AQ0A F45 T5后空翻后 | 尖啸+防御新增12挡，已有8挡，共20；毒3伤、完整需损39 | 起点在抽牌之后，不认证之前整候选 |
| 5PM6JAQG6FNQ F39第二试T2 | 冒泡耗1能、零伤，余4能 | 模拟若此时结束的27损不是单卡实际损血 |
| DUZUBAJ3A8GP F30第四试T6 | 回响/爆发/打击/生存者16挡、完整需损6 | 实际只有1HP；不把零血截断当完整入伤 |

六组检查expected_matches=true、unknownCards=[]仅适用于所列当轮序列；不证明完整未来抽牌、重规划、自动动作或跨轮已建模。结果保存consumer-probes.json；不是新的策略效果实验。

## 原ID逐项结果

### silent-proposal-89354805ee4d7e77

来源任务：postmortem → strategy-proposal；领域：combat, structure；角色silent，已核范围A10。

证据：VLZ6CCT8AQ0A A10 F35/36/37/43 T1、F43 T2、F45 T1；states275564/275565、275679/275687，decisions269598/269625/269648/269706。

账本：silent-0237、silent-0238。

本次核实：本批完整局日志确认四个神化completed动作回执；F35能量7→5，F43同线净伤51、净损13。现有16个已观察牌型转换及候选覆盖说明有源码；固定神化与题面测试通过。四次施放记录均sl_attempt=null，候选actual_cast_this_fight仍为null，不能把已知历史施放事实说成当前在线消费者已跟踪。

反例/限制：F43施放仍净损57；F45持有却未施放。敌人、手牌与资源不同，不能给神化拟合必打规则或保证胜率。

处置：waiting。四个历史施放回执及既有升级子项已核；仍缺跨重规划、SL和进程重启的可靠施放生命周期绑定，以及未知升级/自动出牌/弃牌副效应接续的配对验收，不能将整案登记implemented或duplicate。

预期行为与验证方法：沿两原神化ID补在线施放的开始/结束/SL/重启回执与后帧，再按有证据的牌型逐项验证；未知保持未知。新增跟踪需固定红绿、角色隔离及实际live源码证明。

原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md；SHA256=ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d。

### silent-proposal-f2bfceddb1898dca

来源任务：postmortem → strategy-proposal；领域：combat, potion；角色silent，已核范围A10。

证据：VLZ6CCT8AQ0A A10 F45 T1/T4/T5；decisions269748/269754/269770，states275748/275754。

账本：silent-0106、silent-0019、silent-0201。

本次核实：首问药水MC707ms/1-of-12，rollout horizon1/samples1/best=null；后问MC11ms/12-of-12但已换状态。T4三攻击线31损32伤、8/8死亡并列，另一线13损24伤。既有成熟度诊断有live源码，末轮现场59来袭/20挡已由生产消费者复现完整需损39。

反例/限制：后问12样本不是同题同输入预算对照，T4未选高伤线没有后续实打。全部推演失败不能认证所有实盘选项均必败。

处置：waiting。现有日志没有同状态、同模型覆盖、同随机输入与同总预算下的配对曲线和候选稳定性，且未知覆盖仍存在；无法从707ms单例设MC预算、留药价格或首杀规则。

预期行为与验证方法：先补剩余模型覆盖，再按冻结状态和确定随机流比较现预算与分阶段预算，记录成本、有效样本和排序稳定性；不凭单次墙钟用时调常量。

原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md；SHA256=fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26。

### silent-proposal-283a164780d11e69

来源任务：experience-update → strategy-proposal；领域：combat, structure；角色silent，已核范围A10。

证据：VLZ6CCT8AQ0A A10 F35/36/37/43 T1、F43 T2、F45 T1；与89354805同一机制证据，保留experience-update来源与silent-apotheosis-combat-upgrades链接。

账本：silent-0237、silent-0238。

本次核实：原Markdown SHA匹配；与89354805共享已验证升级及当轮复现，不另建重复ID。原经验链不等于在线实际施放及全部升级已覆盖。

反例/限制：持有神化、候选包含神化、模拟升级和实际打出是四种不同事实；F45未施放不是升级效果的反例。

处置：waiting。同源升级与题面子项已有，实际施放生命周期、未知费用/弃牌/跨轮副效应仍未完成消费者验收；不能仅凭同源提案或经验发布把整案标duplicate。

预期行为与验证方法：复用89354805的补证与实现，不增第三个提案；分别验已观察升级、实际施放和完整消费者覆盖。

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md；SHA256=78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637。

### silent-proposal-ebbfe3b97548756d

来源任务：experience-update → strategy-proposal；领域：combat, structure；角色silent，已核范围A10。

证据：VLZ6CCT8AQ0A A10 F43 T2—T5、F45 T3—T5；states275687—275706、275738—275755；生产消费者起点275752/decision269777。

账本：silent-0005、silent-0016、silent-0049、silent-0071、silent-0143、silent-0046、silent-0053、silent-0027、silent-0011、silent-0021、silent-0106、silent-0204、silent-0020、silent-0019。

本次核实：原帧核实触媒2下12毒扣33、16毒扣45；F45 T5敏捷3/勒紧4/覆甲0，先有后空翻8挡，再尖啸+防御增加12挡，共20；当前消费者复现残毒扣3、完整需损39，unknownCards为空。该结论只覆盖该末段，不涵盖抽牌/弃牌和后续回合。

反例/限制：F43获胜仍损57，F44回复到67后F45仍败；临时减力不关闭后续成长，另一focus或休息路线没有受控结果。

处置：waiting。本批已补F45末段复合机制的真实消费者复现；剩余口红触发、覆甲变化、临时恢复与未来毒的跨轮联合接续及大脑资源消费尚无完整验收，不能据局部正确关闭综合提案或拟合休息血线。

预期行为与验证方法：按完整战斗动作序列逐源对照跨轮状态期限，明确重规划与未知覆盖；未见路线/休息反事实不转成权重，现场敌人HP/伤害继续按当前进阶。

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md；SHA256=08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2。

### silent-proposal-e5b87be50f28f311

来源任务：postmortem → strategy-proposal；领域：combat, sl；角色silent，已核范围A10。

证据：8JRE1C4H4Z2W A10 F17 T6、F33首/三试T2、第二试T5、末试T11；decisions270216/270282/270264；本批F17/F33共277决策280状态。

账本：silent-0079、silent-0021、silent-0125、silent-0018。

本次核实：首/三试T2指纹逐字相同；固定消费者保留3损10伤与15损17伤及0/24对5/24差别。扩大到完整相关楼层后，离线消费者得到66片段、264可比较观测区间、21次新问题边界，277动作全唯一匹配；原日志selection_audit均缺失。现有护栏/派发/端点/终局子项的固定测试通过。

反例/限制：F17投掷匕首后重规划；末试防御延至T11仍败。前五试末轮未完成敌方结算，不能补记未来伤害；零血截断净损不等于完整入伤。

处置：waiting。完整相关楼层已消除仅摘录导致的局部缺帧，但历史没有结构化选择阶段和逐次重规划原因，也没有未选线完整执行；当前消费者始终不认证整候选收益。仍缺全流程归因验收，不能据此改SL血价或探索门槛。

预期行为与验证方法：后续本角色日志须同时核Jev原答、护栏、SL、真实请求/回执、重规划原因、自动动作与后帧；按尝试分链而按局分统计分母，保持预测与已执行事实分开。

原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md；SHA256=5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709。

### silent-proposal-49632bc4878fb597

来源任务：experience-update → strategy-proposal；领域：combat；角色silent，已核范围A10。

证据：CA5KE8GFJ9X2 A10 F13 T1/T3/T5；states273237/273252/273263/273268，生产消费者起点273264/decision267381。

账本：silent-0005、silent-0231。

本次核实：原帧力0→4→8、喷水11→15→19；末轮弱后14。当前出牌消费者按实打打击/双防御/中和复现10挡、完整需损4、净敌扣3，unknownCards为空。死亡时只有2HP，不能将实扣2冒充完整入伤。

反例/限制：该战没有正敏捷，计划中的步法未取得。虚弱仍未阻止后续加压；本批别处正敏捷帧也不能替代本战成长的受控比较。

处置：waiting。当前力量/虚弱/双防御的真实当轮消费者已复现；还缺该成长脚本的跨轮固定消费与正敏捷/逐击修正联合覆盖，不能从本战拟合统一保血或输出权重。

预期行为与验证方法：基于已观察加压前后数据验证当前进阶的逐回合输入及成长传递，再以含所需属性的本角色帧做联合验收；不补未观察参数。

原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md；SHA256=aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2。

### silent-proposal-66532328a585941f

来源任务：experience-update → strategy-proposal；领域：combat, structure；角色silent，已核范围A10。

证据：5PM6JAQG6FNQ A10 F33 T1/T2、F39末试T2；states274201/274202与274379/274380，decision268455。

账本：silent-0021、silent-0009。

本次核实：F33实建雾3/触媒1/群蛇4并赢；F39末试毒雾未建。冒泡前后玩家29HP、敌35HP不变，能量5→4，两敌无毒；当前消费者复现耗1能/零伤且unknownCards为空。消费者的hpLoss27只是若此刻结束回合的参考，未当作该单卡实际损血。

反例/限制：F33和F39敌人、入口HP、抽序与能力建立一起变动；同一局两试也不构成两个独立样本。

处置：waiting。无毒目标冒泡的即时零收益已有模型并经本批验证；仍缺同入口HP、同构筑和完整抽序下不同启动顺序的整场结果及可复现收益函数，不能拟合构筑/启动阈值。

预期行为与验证方法：沿原ID登记持有/计划/实建的分账；以后冻结完整抽序和启动选择，按run_id分开发/后置验证，避免把房间差异当能力因果。

原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md；SHA256=56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831。

### silent-proposal-43a76a31ba7bdcfa

来源任务：experience-update → strategy-proposal；领域：combat, sl；角色silent，已核范围A10。

证据：61E2QS63Y9WU A10 F17 T5/T6/T7；states273503/273504/273507/273508，decision267612。

账本：silent-0030、silent-0027。

本次核实：吸取后玩家敏−2、敌力2；两防御6挡，尖啸后17攻，覆甲3参与。当前生产输入重放两防御/尖啸精确得到6挡、毒33伤、净损8；原帧56→48与敌67→34一致，unknownCards为空。此前“负属性与毒当轮联合消费者未验”缺口在此限定范围已补齐。

反例/限制：该场60血首试七轮赢，不是另一局失败中可救活的SL反事实；下一轮仍有恢复和成长，不能由本轮正确外推全部接续。

处置：waiting。负敏捷与毒的当前回合联合消费者已核；跨轮吸取/恢复接续和同入口HP、构筑、抽序下可救活的完整SL另一线仍缺验收，现有首试胜利不足改变SL范围或换线偏好。

预期行为与验证方法：保留本批当轮通过证据，补完整吸取前后跨轮生产重放及受控SL替代线路；不再把已验证的6挡/33伤/8损重复列为缺口。

原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md；SHA256=f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c。

### silent-proposal-5264153a4a4b0e5c

来源任务：experience-update → strategy-proposal；领域：combat；角色silent，已核范围A10。

证据：61E2QS63Y9WU A10 F23 T1—T5；states273577/273582/273589/273593/273596/273599，decision267696。

账本：silent-0039、silent-0209。

本次核实：本体index0在召唤后变index1，幻象index0；航行后力3/6。当前真实消费者重放T4猎杀者+灭绝，得到47伤15损，unknownCards为空，实盘幻象14→2仍攻击，T5才0血/REVIVE。局部当轮目标模型正确不证明召唤/成长/复活全链均正确。

反例/限制：focus幻象39伤零损线只有题面，没有同抽后续实打；相同类型或index不等于跨帧永久实体ID。

处置：waiting。T4当前目标线已由实际消费者复现；仍缺A10召唤、航行、再起与索引变化的跨轮全链验收及另一focus完整结果，不能推固定首杀收益或关闭整个提案。

预期行为与验证方法：在冻结A10怪物数据和完整动作序列下分别验召唤、成长、复活与目标关联；保留所有目标，相同推演值并列，不强制首杀。

原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md；SHA256=b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02。

### silent-proposal-bddfa690a84e03d0

来源任务：experience-update → strategy-proposal；领域：combat；角色silent，已核范围A10。

证据：DUZUBAJ3A8GP A10 F30 T1—T6，四次尝试；states275018/275022，末试decision269073—269077。

账本：silent-0128、silent-0079。

本次核实：睡3/2/1后自然醒；末试T5临时减力、T6恢复并成长到力4/22攻。当前消费者重放回响斩击/爆发/打击/生存者得到16挡、完整需损6；实盘1HP死亡净扣仅1。四次结果为前三次predicted_death重载、末次died，未把四次都算实际死亡结算。

反例/限制：末试T4多3伤同时多损2HP；自然醒的样本不能替代提前打醒后的STUNNED接续。

处置：waiting。末试T6当轮16挡/完整需损6已复现；本来源仍无提前打醒后STUNNED接续配对，也无相同抽序完整获胜另一线，不能拟合血价、固定杀序或SL偏好。

预期行为与验证方法：分开冻结自然醒、提前醒/眩晕和临时恢复分支；对未见分支保持未知，补新的本角色接续帧后再验，不据四次失败设权重。

原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md；SHA256=b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780。

## 既有源码与离线执行审计

本次只读核对live=1d3b8508d4b58b2dc24815c8b740d95e7c54a48b。以下均为base和该实际live的祖先源码提交，均不是本批新实现：

- 772b839f8ada31664cb764ea9ad3bdb03da27f64：Model observed Silent Apotheosis upgrades。
- 6e233ede76e5dd849f0d40760be64e7cdacf78b1：Complete six observed Silent Apotheosis upgrade pairs。
- b2805be4ba44b7375c7908d873889372cc3cfe6c：Propagate observed Silent Apotheosis Malaise upgrade。
- f98a929f24901c20efed462b29591e25ebb85451：Expose Silent Apotheosis candidate coverage facts。
- 45161a51c2c6b7e4a499b13cf749c4108193bbf5：Expose observed simulation scope in Silent combat choices。
- dc0e6080cb20c508d94c006648cc3edf0188d306：Add observed power and HP endpoints to Silent offline execution audit。
- 83512ddcd2c70fd9b983dc38524ff25c8970c1d3：Audit Silent terminal HP observations after final end turns。
- f1542578594462e9f9f4e175488795fc480a8a13：Log Silent A10 HP guard candidate predictions。
- 1a00f10af95c78dfbf75de318a0083256110cf8a：Expose conservative held-card loss in Silent Fysh candidate facts。

13个相关源码路径中10个base/live blob完全相同；card-model.ts、turn-solver.ts、combat-plan.ts只在Roy/Dai称呼注释上不同，字节差异保留为.patch并经归一核实，不宣称两树逐字相同。live-source-verification.json保存完整证据。

本次六个冻结输入实际运行learner/audit-selection.ts，均退出0；不改消费者：

| 局号 | 片段 | 动作 | 可比较观测区间 | 未知区间 |
| --- | ---: | ---: | ---: | ---: |
| VLZ6CCT8AQ0A | 27 | 165 | 0 | 165 |
| 8JRE1C4H4Z2W | 66 | 277 | 264 | 13 |
| CA5KE8GFJ9X2 | 4 | 26 | 0 | 26 |
| 5PM6JAQG6FNQ | 21 | 114 | 102 | 12 |
| 61E2QS63Y9WU | 12 | 60 | 27 | 33 |
| DUZUBAJ3A8GP | 22 | 117 | 112 | 5 |

759动作全部唯一匹配时间戳和指纹；152片段、505个可比较区间、254个未知区间。所有整候选结果仍为null，这是消费者的证据边界，不是策略失败次数。VLZ相关165决策sl_attempt全空，SL文件仅F17/F33两场，不能伪填F35等非SL战的尝试号。各未知原因和重问边界见consumer-summary.json；六局都没有历史selection_audit字段。

## 样本、验证与限制

- 本批是六局A10既有发现样本内的复核；同局不同楼层、回合、SL尝试不扩成独立局。没有后置盲测、整场受控胜负、阈值拟合或泛化声明。
- 怪物HP/伤害用各帧实际A10观测值；不补其他角色或未观察进阶。没有修改首样本读取或房间代价5样本门槛，铁甲等角色行为不变。
- 既有固定测试8文件81项通过、退出0，见existing-fixed-tests.log。只跑相关固定测试，未运行tsc、完整vitest或test-sandbox全套；没有源码提交触发这些提交检查。
- 6组直接生产输入复核全部匹配；6次离线审计CLI均退出0；6767条原字节及9组证据断言通过。它们分别记账，不把探针或数据断言加进81个vitest案例数。
- 没有生产源码变更，撤源码失败/恢复实验不适用，不把当前源码已有实现冒记成本批红绿实现。
- 临时消费者脚本首轮屏蔽范围过宽，误拦agent/src/knowledge源码导入，尚未执行消费者即退出1；已保留probe-consumers.first.txt和consumer-probes.first.stderr/.rc。仅缩小屏蔽路径区分源码与生成知识后六组通过，没有修改生产源码或放开任何知识数据读取。
- 两次只读定位命令引用不存在的推测文件名并报找不到文件；随后使用rg实际路径与生产入口检查。此类读取错误未作为测试失败或模型证据。

## 台账、处置与回退

只经根learner/ledger.py update向26个既有silent条目追加本报告/提案链接和限定复核说明；by=learner:strategy-proposal。不重复登记相同历史证据、不改claim/prior/version，不新增支持分母，不把已shipped的局部经验降级，也不把waiting父提案标shipped。原待实现项继续proposed；本次没有新的代码提案，因此code_proposals仅列原10个CLI ID，不调用add制造重复ID。

fixes=[]、merged=null、implementation_domains=[]。未执行live合并/知识刷新/上线通知，未制造eval版本。HEAD保持base、跟踪工作树干净；全部本批材料位于任务scratch，原队列等待后续本角色证据或独立完整实现。没有新增生产代码可回退；材料、首轮失败与账本追加历史保留。
