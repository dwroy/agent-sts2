# 本批静默策略提案复核

时间：2026-10-12T16:54:30+08:00。batch：20261012-164302-strategy-proposal。base：ae5eb284f46d15914acb137fee57ee6ed99b7b3f。

本批只有10个原proposal_ids，task=strategy-proposal、character=silent、reason=proposal，工作树绑定正确；无research_request、implementation_request、proposal_repair。普通专题匹配文件属于20261010-150327，不承接其专题。开工git status干净，git merge --no-edit main返回Already up to date。未追加领取其他ID，未派下级。

6局runs.jsonl各一条、均SILENT/A10，原行575—580保存于run-identities.json。10份提案原文SHA全部匹配，保存proposals.json、queue-history.json及proposal-receipts.json。原账本26项仅按本角色关联项读取。

本次按既有索引直接回读原logs，逐条核SHA及角色/局号；687条中185决策、502状态，非六局全量。分项为VLZ285、8JRE92、CA5 32、61E52、5PM109、DUZ117。raw-manifest.json给出偏移/SHA，verified-raw-v2.jsonl保留本次核实的原对象，state-facts.json为选定字段。初次脚本误认states的run_id在顶层而KeyError；verified-raw.jsonl初稿及verification-first-failure.txt保留，修正只改身份取值路径，不放松SHA。

未改源码、知识、经验或选择阈值。以下每项均列原证据、实际仍缺部分和下一步验收；已有子项不冒充整案implemented或duplicate。

## silent-proposal-89354805ee4d7e77

来源任务：postmortem → strategy-proposal；角色silent / A10。原领域：combat, structure。

证据：VLZ6CCT8AQ0A F35 T1、F43 T1/T2、F45 T1。账本：silent-0237, silent-0238。

本次核实：神化基础、六升级、萎靡及候选覆盖说明均有实际live祖先源码。F35 275564→275565能量7→5、防御5→8；F43 275679→275680之后同线即时51伤/13损已有固定回归。

反例与限制：F43已施放仍损57；F45持有但未施放而败，不能隔离神化的整战胜负贡献。

处置：waiting。实际施放字段仍null；冻结VLZ决策的sl_attempt全为null，不能直接建立跨重规划/SL/重启的本战施放跟踪。未覆盖牌的费用、下轮抽牌、弃牌副效应和自动执行仍缺完整配对消费者验收。

预期行为与验证：先补完整动作回执、对应后帧、战斗/SL/重启边界及副效应覆盖的固定验收；未知仍unknown，不设必打或固定加分。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md；SHA256=ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d。本目录同ID.md保留原字节。

## silent-proposal-f2bfceddb1898dca

来源任务：postmortem → strategy-proposal；角色silent / A10。原领域：combat, potion。

证据：VLZ6CCT8AQ0A F45 T1/T4，decisions269748/269754/269770。账本：silent-0106, silent-0019, silent-0201。

本次核实：首问MC 707ms、1/12，另一问12/12；T4候选13损/24伤与31损/32伤分列，成熟度说明已有源码。

反例与限制：两问状态/已知牌与预算竞争不同，不是同预算配对实验；全部推演失败不证明所有实打顺序必败。

处置：waiting。缺相同状态、模型覆盖、随机输入与总预算下的配对成本曲线和排名稳定性；神化等模型缺口尚未消除，无法校准MC预算、药水持有价或首杀规则。

预期行为与验证：使用同一固定输入与确定随机流比较现有分配/分阶段预算，保存用时、覆盖、样本及稳定性；证据不足保留原预算和药水规则。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md；SHA256=fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26。本目录同ID.md保留原字节。

## silent-proposal-283a164780d11e69

来源任务：experience-update → strategy-proposal；角色silent / A10。原领域：combat, structure。

证据：VLZ6CCT8AQ0A F35 T1、F43 T1/T2、F45 T1。账本：silent-0237, silent-0238。

本次核实：与89354805同一实盘问题，experience-update来源及silent-apotheosis-combat-upgrades链接保留。

反例与限制：不能用已有经验发布或几个已实现升级子项证明所有实际施放和副效应均覆盖。

处置：waiting。同源神化已有局部实现，但实际施放跟踪、未知费用/弃牌/跨轮副效应的消费者验收未完；不足将整案登记duplicate。

预期行为与验证：沿原两ID关联相同证据，不建第三个重复提案；下一次补证按实际施放/模型覆盖/消费者分别验收。

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md；SHA256=78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637。本目录同ID.md保留原字节。

## silent-proposal-ebbfe3b97548756d

来源任务：experience-update → strategy-proposal；角色silent / A10。原领域：combat, structure。

证据：VLZ6CCT8AQ0A F43 T2—T5、F45 T3—T5。账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。

本次核实：F43毒12/16在触媒2下结算33/45；F45 T5当前力量/敏捷/覆甲与挡分列，32血20挡面对减力后59仍缺7，三敌未退场。

反例与限制：单轮尖啸不关闭后续成长；F43胜损57、F44补至67仍死，不能拟合休息硬血线或整场保血权重。

处置：waiting。缺复合属性、毒触发、覆甲、临时恢复的同输入生产消费者全链验收和可靠敌实体关联；另一focus/休息选择无受控整场结果。

预期行为与验证：先逐源核当前值与持续期限，未知实体关联不强行连接；同推演值并列，保留全部目标及路线选项。

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md；SHA256=08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2。本目录同ID.md保留原字节。

## silent-proposal-e5b87be50f28f311

来源任务：postmortem → strategy-proposal；角色silent / A10。原领域：combat, sl。

证据：8JRE1C4H4Z2W F33 首/三试T2、第二试T5、末试T11；decisions270216/270282/270264。账本：silent-0079, silent-0021, silent-0125, silent-0018。

本次核实：冻结46动作均唯一匹配状态，既有消费者输出13候选片段、39个可比较观测区间。270219结束后HP47→44；270285结束后47→32；轮首敌326，本轮含毒净扣10/17，支持多12血价、多7伤。

反例与限制：末试防御延长至T11仍败；F17抽牌后重规划不能把候选差记实付收益，首/三试均败不提供原线完整胜局。

处置：waiting。已核相邻观测/终局/派发子项；重规划与自动动作全过程、未选线完整执行和唯一敌实体身份仍未验收，不能把端点差归作整候选收益或拟合SL血价。

预期行为与验证：完整串联Jev原答、护栏、SL、实际请求/回执、重规划与后帧；0/24与5/24保持不同，零血截断和完整需损分列。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md；SHA256=5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709。本目录同ID.md保留原字节。

## silent-proposal-49632bc4878fb597

来源任务：experience-update → strategy-proposal；角色silent / A10。原领域：combat。

证据：CA5KE8GFJ9X2 F13 T1—T5，重点T5。账本：silent-0005, silent-0231。

本次核实：原始32帧显示加压后力0→4→8，喷水11→15→19、弱后11/14；末2HP与10挡对14显示攻击，完整需损4。

反例与限制：该战玩家无正敏捷；计划步法不等于取得/建立，不能由本局补正敏捷联合效果。

处置：waiting。缺正敏捷与逐击力量、虚弱、独立成长共同出现的实盘配对及实际消费者调用；本局只能验证已发生的分项，不能据此拟合统一攻防权重。

预期行为与验证：按各帧实际进阶HP/伤害输入核验；下一份同时含上述属性的本角色固定输入再做联合验收，不套其他角色或进阶。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md；SHA256=aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2。本目录同ID.md保留原字节。

## silent-proposal-66532328a585941f

来源任务：experience-update → strategy-proposal；角色silent / A10。原领域：combat, structure。

证据：5PM6JAQG6FNQ F33 T2、F39末试T2。账本：silent-0021, silent-0009。

本次核实：F33已建立雾3/触媒1/群蛇4并胜；F39末试未建立毒雾，冒泡对无毒目标没有增毒，持有与已建立须分列。

反例与限制：两个房间的敌人、入口HP、抽序和存活条件一起变动，不是能力启动处理组/对照组。

处置：waiting。缺同入口HP、同构筑及完整抽序下不同启动顺序的整场结果和可复现收益函数；不能从不同战斗的胜败拟合启动/构筑阈值。

预期行为与验证：保留当前持有/计划/实际能力事实；按run_id划分后置验证，不把SL尝试扩为独立局。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md；SHA256=56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831。本目录同ID.md保留原字节。

## silent-proposal-43a76a31ba7bdcfa

来源任务：experience-update → strategy-proposal；角色silent / A10。原领域：combat, sl。

证据：61E2QS63Y9WU F17 T5/T6/T7。账本：silent-0030, silent-0027。

本次核实：原帧T5玩家力2、敏捷未列，吸取后T6力未列/敏−2，敌力2；两防御共6、尖啸后17攻，覆甲3参与挡，56→48；毒17+16使敌67→34。

反例与限制：该战60血首试七轮赢，不能套成另一局失败的可救SL反事实；属性下降未停止本局毒结算。

处置：waiting。缺负属性与毒的完整联合生产消费者验收，以及同入口HP/构筑/抽序下可救活的完整SL另一线路；现有首试胜利不能校准SL范围和换线偏好。

预期行为与验证：冻结吸取前后、两防御与毒结算的同一输入，分别核净HP和完整入伤；不改SL阈值。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md；SHA256=f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c。本目录同ID.md保留原字节。

## silent-proposal-5264153a4a4b0e5c

来源任务：experience-update → strategy-proposal；角色silent / A10。原领域：combat。

证据：61E2QS63Y9WU F23 T1—T5，重点T4。账本：silent-0039, silent-0209。

本次核实：首次本体index0，召唤后幻象index0/本体index1；两次航行后力量3/6。T4本体线47净伤、HP25→10；T5幻象仍2血，攻击23，随后才见0血REVIVE_MOVE。

反例与限制：39伤零损的另一focus只有候选，不是实打胜线；类型/索引不是跨帧永久实体ID。

处置：waiting。已有召唤源码不足覆盖该A10航行成长、幻象再起与索引变化全链联合验收；缺另一focus完整后续结果，不能证明固定首杀收益。

预期行为与验证：按实际A10样本冻结召唤HP/伤害及实体变化；全部目标保留、相同值并列，不按未实打线强制定序。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md；SHA256=b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02。本目录同ID.md保留原字节。

## silent-proposal-bddfa690a84e03d0

来源任务：experience-update → strategy-proposal；角色silent / A10。原领域：combat。

证据：DUZUBAJ3A8GP F30 T1—T6，四次尝试。账本：silent-0128, silent-0079。

本次核实：117帧显示自然睡3/2/1，T4醒后18攻，T5力2，尖啸后力−4/14攻，T6恢复并成长至4/22攻；四试都败。

反例与限制：末试T4比首试更多伤害伴随更多损血，不能只看敌HP设血价；自然醒不能替代提前打醒后的STUNNED证据。

处置：waiting。本来源缺提前唤醒后STUNNED接续的配对帧和相同抽序完整获胜另一线路；四败不足拟合血价、固定杀序或SL偏好。

预期行为与验证：分别验证睡眠、自然醒、提前醒/眩晕、临时恢复和成长；缺失分支继续未知。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md；SHA256=b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780。本目录同ID.md保留原字节。
## 既有源码与验证

冻结live=460725771eec2081ee531fe7922b3cb82d7a45ef。以下9提交均为真实live祖先，均不是本批提交：

- 772b839f8ada31664cb764ea9ad3bdb03da27f64：Model observed Silent Apotheosis upgrades；base祖先=true。
- 6e233ede76e5dd849f0d40760be64e7cdacf78b1：Complete six observed Silent Apotheosis upgrade pairs；base祖先=false。
- b2805be4ba44b7375c7908d873889372cc3cfe6c：Propagate observed Silent Apotheosis Malaise upgrade；base祖先=true。
- f98a929f24901c20efed462b29591e25ebb85451：Expose Silent Apotheosis candidate coverage facts；base祖先=true。
- 45161a51c2c6b7e4a499b13cf749c4108193bbf5：Expose observed simulation scope in Silent combat choices；base祖先=true。
- dc0e6080cb20c508d94c006648cc3edf0188d306：Add observed power and HP endpoints to Silent offline execution audit；base祖先=true。
- 83512ddcd2c70fd9b983dc38524ff25c8970c1d3：Audit Silent terminal HP observations after final end turns；base祖先=true。
- f1542578594462e9f9f4e175488795fc480a8a13：Log Silent A10 HP guard candidate predictions；base祖先=false。
- 1a00f10af95c78dfbf75de318a0083256110cf8a：Expose conservative held-card loss in Silent Fysh candidate facts；base祖先=true。

11个相关路径中8个base/live blob一致；card-model.ts、turn-solver.ts、combat-plan.ts有33行注释中的Roy/Dai称呼差异，逐字归一后相同。保留真实blob差异和两个base非祖先事实，不声称两树相同或把重放源码当原提交祖先。

16文件127个既有固定测试通过，日志existing-fixed-tests.log，退出码0；只定向回归，没有运行tsc、完整vitest或沙箱全套。本批源码零改动，不进行撤源码红绿实验，不能把既有测试算作新实现验收。

真实learner/audit-selection.ts分别消费本次从原日志构造的两份冻结输入，退出均0，无模型或网络调用：8JRE为13片段/46动作，46状态唯一匹配，39相邻区间可比较、7未知；VLZ为24片段/139动作，139状态唯一匹配，但139区间仍未知（135尝试号未知、3原决策断档、1输入结束）。VLZ所有冻结决策sl_attempt=null、sl_reloads=0；null不能擅自改成第1试。两局整候选结果均未认证。该范围不包含VLZ F36的全部施放链，不把冻结片段当完整历史。

这些都是样本内复核，不是时间后置盲测。怪物HP/攻击从各帧实际A10值核实，不用其他进阶或其他角色知识补数；未改首样本读取与房间代价5样本门槛。

## 处置、台账与回退

10原ID全部waiting，保持原队列与来源任务，code_proposals只列这10个既有CLI ID，不创建重复ID。仅经根ledger.py追加本批报告链接/说明，by=learner:strategy-proposal；不新增机制证据分母，不改claim/prior/version或任何既有上线状态，不标shipped。原待实现提案继续proposed，已有经验/子项的shipped不能被本次waiting父提案降级。

fixes=[]、merged=null、implementation_domains=[]；没有本批源码提交或游戏版本，没有执行live合并或上线通知。工作树HEAD保持base、跟踪文件干净。无新源码可回退；报告、失败初稿、原提案与账本历史保留，待原队列补证和独立实现验收。
