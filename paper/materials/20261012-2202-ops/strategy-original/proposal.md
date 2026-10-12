# 十项派发提案的核验与处置

时间：2026-10-12T21:51:13+08:00。角色silent，已观察进阶A10。批次：20261012-214247-strategy-proposal。
完整base：`7bbd47d8cdb2a2e4cf9616e3b51da32edf9434ba`。

## 结果与边界

本批10项均保留waiting；没有新的源码实现、提交、合入或游戏版本。已有子项的10个源码commit均核为实际live祖先，但不能据此把完整父提案标implemented或duplicate。未修改任何角色的在线行为；无关角色保持等价。

起始git status干净，HEAD为上述base。learn.json本批reason=proposal、十个proposal_ids与工作树匹配，无research_request、implementation_request或proposal_repair。普通专题请求绑定另一旧批，未读取其work_spec或其他专题。按任务git merge --no-edit main返回Already up to date，base不变。独立完成，没有子agent；仅分析本角色六局，不读取其他角色知识，不运行play或网络模型。

## 原始证据与当前消费者

十份原提案按队列原SHA256逐一核对、原字节副本保存在本目录。26条关联账本按ledger.py真实累积语义读取；runs.jsonl六条唯一记录均为SILENT/A10。

前批raw-manifest只用于定位，本批从只读logs重新读取6767行原字节并核对SHA：3432状态、3306决策、29条SL。九组原始事实断言本批重新运行通过，另核沙虫首/三试HP端点、预算输入不等价和三骑士资源。原始摘录、行号、偏移、哈希及当前断言输出已保存。

本批用冻结8JRE输入实际调用既有learner/audit-selection.ts，退出0：659条决策、676条状态，无元数据排除；输出113选线片段、659动作和264可配对区间。独立断言核首/三试T2候选3损10伤/15损17伤、第三试同题死亡0/24与5/24、第二试T5的16损43伤/4损25伤。终局玩家5→0、敌154→130，显示攻击37−22挡＝15与实扣5分列；未截断伤害及完整候选结果仍为空。113片段的完整执行结果全部未知，不能把离线工具成功当在线大脑采用或策略效果验证。历史170条带questions的记录均无selection_audit，不能补造阶段归因。

十三个相关源码路径与前批base逐blob相同；当前main以来新增的learner/lib/engines.ts和launcher.ts仅学习线程续跑，不是本批实现或游戏证据。与只读live快照`b9fd54ec22cacd41c99516bef0d1e0d673abd45f`相比，十路径逐字一致、三路径只有既有Roy/Dai署名差异，补丁原样保留。没有新源码变化、数值缺口或失败需要重跑tsc/vitest；本批未运行这些套件，tests全部null。离线证据断言和消费者运行不填作vitest通过。撤源码失败/恢复通过不适用。

六局全部是发现/回归材料，SL尝试不扩独立分母，没有独立盲测；不拟合预算、血价、启动或固定首杀常数。缺数据不等于证成原策略最优，也不证明替线必胜。没有发现新增与旧知识冲突的机制结论；原提案的反例及未知逐项保留。

## 已有源码溯源

以下仅证明既有子项已在live，不是本批fixes或合入：

- 已观察神化升级：`772b839f8ada31664cb764ea9ad3bdb03da27f64`，base/live祖先均通过。
- 六个升级对补齐：`6e233ede76e5dd849f0d40760be64e7cdacf78b1`，base/live祖先均通过。
- 萎靡升级传播：`b2805be4ba44b7375c7908d873889372cc3cfe6c`，base/live祖先均通过。
- 神化候选覆盖事实：`f98a929f24901c20efed462b29591e25ebb85451`，base/live祖先均通过。
- 模拟范围与成熟度：`45161a51c2c6b7e4a499b13cf749c4108193bbf5`，base/live祖先均通过。
- 离线执行观测端点：`dc0e6080cb20c508d94c006648cc3edf0188d306`，base/live祖先均通过。
- 终局血量截断审计：`83512ddcd2c70fd9b983dc38524ff25c8970c1d3`，base/live祖先均通过。
- HP护栏候选记录：`f1542578594462e9f9f4e175488795fc480a8a13`，base/live祖先均通过。
- 保留牌损失事实：`1a00f10af95c78dfbf75de318a0083256110cf8a`，base/live祖先均通过。
- 单动作派发回执：`fdaf787a372880b0438e73bcac7e6d2168b038ed`，base/live祖先均通过。

## silent-proposal-89354805ee4d7e77：神化升级与实际施放

- 来源任务：postmortem → strategy-proposal；账本：silent-0237, silent-0238。
- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md；原SHA256：`ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d`；副本：`silent-proposal-89354805ee4d7e77.original.md`。
- 本角色证据：VLZ6CCT8AQ0A F35/36/37/43 T1、F43 T2、F45 T1。d269598/269625/269648/269706为四个完成回执；s275564→275565能量7→5，s275679→275687玩家90→77、敌254→203，即51伤/13损。F45没有完成的神化动作。
- 当前实现边界：已观察升级和候选覆盖已有源码；actual_cast_this_fight仍明确为空。
- 反例与限制：F43已施放仍整战损57；F45未施放与其他施放胜场不是同盘对照，不能推出必打规则。
- 处置：waiting。已观察升级已有实现；本批四次完成动作均无SL尝试绑定，缺跨重规划、SL、重启的实际施放生命周期证据，未知升级及自动动作副效应仍未完整验收。
- 预期行为及验证：继续保留已观察升级和unknown边界；用完成回执、前后帧与战斗/尝试身份冻结实际施放链，再验证重规划及重启；不把持有当施放。

## silent-proposal-f2bfceddb1898dca：三骑士药水预算与时钟

- 来源任务：postmortem → strategy-proposal；账本：silent-0106, silent-0019, silent-0201。
- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md；原SHA256：`fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26`；副本：`silent-proposal-f2bfceddb1898dca.original.md`。
- 本角色证据：VLZ6CCT8AQ0A F45 T1 d269748：药水1/12样本、707ms；rollout horizon1、best=null。d269754药水12/12，但状态指纹不同。T4 d269770显式并列plan2/3/4；T5来袭83→59，32HP/20挡完整需损39。F43胜战90→33，F45入口67。
- 当前实现边界：现有模拟成熟度展示已有实现，不能将该历史退化当现版本缺少诊断。
- 反例与限制：两问的手牌、能量、已建立能力和敌血均不同；较多样本不构成同盘预算收益证据。另一目标及留药的完整结果未记录。
- 处置：waiting。缺同状态、同模型覆盖、同随机输入和同总预算的配对收益曲线；现有1/12与12/12样本来自异状态，不能据707ms单例调整预算或留药。
- 预期行为及验证：冻结完整输入后比较预算分配及候选稳定性，模型缺覆盖和时间不足分别统计；维持原护栏、留药及所有目标选项。

## silent-proposal-283a164780d11e69：神化经验的同源提案链

- 来源任务：experience-update → strategy-proposal；账本：silent-0237, silent-0238。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md；原SHA256：`78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637`；副本：`silent-proposal-283a164780d11e69.original.md`。
- 本角色证据：VLZ6CCT8AQ0A F35/F43/F45，来源experience-update，关联silent-apotheosis-combat-upgrades；与89354805ee4d7e77共享证据，但原Markdown和来源链分别核验。
- 当前实现边界：共享神化升级与候选覆盖源码，保留两个原ID，不新建重复提案。
- 反例与限制：经验已发布、与原提案同源，都不证明完整代码范围已经实现。
- 处置：waiting。同源升级子项已有实现；仍缺实际施放跨SL/重启绑定、未知费用和跨轮副效应的完整验证，不能仅因同源将整案标duplicate。
- 预期行为及验证：沿同一机制实现核验场外牌组不变、升级不重复和未知差值；实际施放状态须有独立完整生命周期证据。

## silent-proposal-ebbfe3b97548756d：攻防、持续毒及资源分账

- 来源任务：experience-update → strategy-proposal；账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md；原SHA256：`08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2`；副本：`silent-proposal-ebbfe3b97548756d.original.md`。
- 本角色证据：VLZ6CCT8AQ0A F43 T1—5、F45 T2/3/5。s275737→275738玩家力1→2、敏0→1，三敌临时减力−6恢复0；s275752/275754为8挡/20挡、敏3、覆甲0。终态三敌血21/80/77；不能将未来毒预支为退场。
- 当前实现边界：当前当轮路径和残毒可与原帧核对；本批不将经验文本或某个子公式当完整跨轮消费者验收。
- 反例与限制：F43建立能力仍损57；F45持有毒雾但未建立。血量恢复与构筑差异无法支持固定火堆或路线阈值。
- 处置：waiting。当轮攻防及资源端点已复核；口红、覆甲、减力恢复和未来毒的冻结跨轮联合调用及大脑完整消费证据仍不足，不能以端点相符认证全部机制。
- 预期行为及验证：分别冻结已观察属性、被动来源、临时期限和各敌残毒；逐步核对完整调用与消费者字段，不改路线或血价。

## silent-proposal-e5b87be50f28f311：候选选择、SL与实际执行审计

- 来源任务：postmortem → strategy-proposal；账本：silent-0079, silent-0021, silent-0125, silent-0018。
- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md；原SHA256：`5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709`；副本：`silent-proposal-e5b87be50f28f311.original.md`。
- 本角色证据：8JRE1C4H4Z2W F33首/三试T2 d270216/d270282同指纹：实际47→44/32，敌326→316/309，多12血损、多7伤。第二试T5候选16损43伤换4损25伤；末试T11实扣5而显示攻击37−挡22＝15。
- 当前实现边界：本批真实运行现有audit-selection：659决策/676状态，113片段、264可配对观测区间。消费者正确分开0/24与5/24、动作端点和终局截断，全部完整候选结果仍为空。
- 反例与限制：末次更偏防御延至T11仍败，不证明所有换防御都错；历史170条带questions记录没有selection_audit。T5虽能还原候选，结构化hp_guard与selection_stages仍缺。
- 处置：waiting。现有消费者可还原113片段、264观测区间及终局5血截断，但完整候选结果均未知；历史阶段字段与逐次重规划原因缺失，缺完整选线—中断—执行归因证据。
- 预期行为及验证：后续带结构化阶段和派发字段的自然局验抽牌、选牌、生成、药水和SL边界；单动作完成不等于整线完成。任何策略改动还需完整未选线对照。

## silent-proposal-49632bc4878fb597：力量、虚弱与独立成长

- 来源任务：experience-update → strategy-proposal；账本：silent-0005, silent-0231。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md；原SHA256：`aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2`；副本：`silent-proposal-49632bc4878fb597.original.md`。
- 本角色证据：CA5KE8GFJ9X2 F13 T1/3/5，s273237/273252/273263敌力0/4/8、喷水11/15/19；T5 s273268虚弱后14攻击，玩家2血10挡，完整需损4，死亡截断实扣2。
- 当前实现边界：当前模型已有现场属性输入，本批未定位新的当轮数值差。
- 反例与限制：临时虚弱没有取消后续加压；计划步法没有取得，不能把本局当正敏捷联合实验。
- 处置：waiting。本局没有正敏捷联合样本；跨轮加压、每击修正与敏捷四路径的完整冻结调用仍未验收，不能仅凭当轮吻合新增保血或输出权重。
- 预期行为及验证：将当前力量/虚弱、敏捷和跨轮成长分开冻结验证；按本角色当前进阶数据核HP/伤害，不能用别的进阶或角色补值。

## silent-proposal-66532328a585941f：持有、计划与实际建立

- 来源任务：experience-update → strategy-proposal；账本：silent-0021, silent-0009。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md；原SHA256：`56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831`；副本：`silent-proposal-66532328a585941f.original.md`。
- 本角色证据：5PM6JAQG6FNQ F39末试T2，s274379→274380两敌无毒，冒泡耗1能5→4，玩家29HP、目标35HP不变，没有新增毒。
- 当前实现边界：只确认空目标动作的原始端点，持有或计划能力不算实际建立。
- 反例与限制：原提案F33已建立组件并赢与F39入口、敌人、抽序不同，不构成不同启动顺序的受控比较。
- 处置：waiting。缺同入口HP、构筑和完整抽序下不同启动顺序的整场对照及可复现收益函数；一次无毒目标空打不足以拟合构筑或启动阈值。
- 预期行为及验证：继续分列持有/计划/已建立；整场同条件配对充分后才能讨论构筑或启动权重，不预设必打优先级。

## silent-proposal-43a76a31ba7bdcfa：吸取、负敏捷、毒与SL

- 来源任务：experience-update → strategy-proposal；账本：silent-0030, silent-0027。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md；原SHA256：`f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c`；副本：`silent-proposal-43a76a31ba7bdcfa.original.md`。
- 本角色证据：61E2QS63Y9WU F17 T5/6/7，s273503→273504吸取后敏−2、敌力2；s273507共6挡，下一帧玩家56→48、敌67→34，毒17+16扣33，覆甲3另列。
- 当前实现边界：现场负敏捷、毒和覆甲的当轮事实成立，不由一次赢局扩展SL名单。
- 反例与限制：本战首试获胜，没有同入口另线救活反事实，不能从不同局输赢归因固定顺序。
- 处置：waiting。缺吸取跨轮接续的完整冻结验证，以及同入口HP、构筑、完整抽序下可救活的SL替线；不据首试获胜修改SL范围。
- 预期行为及验证：先核状态变换，再独立验证整场可救活性；样本不足保持SL边界与换线偏好。

## silent-proposal-5264153a4a4b0e5c：胧光怪召唤、成长与目标

- 来源任务：experience-update → strategy-proposal；账本：silent-0039, silent-0209。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md；原SHA256：`b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02`；副本：`silent-proposal-5264153a4a4b0e5c.original.md`。
- 本角色证据：61E2QS63Y9WU F23 T1—5，s273577只有本体，s273582幻象加入使索引变化；s273583/273589/273596力0/3/6。T4 s273593→273596共47伤/15损，幻象余2，s273599才到0血/REVIVE_MOVE。
- 当前实现边界：已有召唤子项；目标与实体索引必须分开，保留所有选项及同值并列。
- 反例与限制：原题的另一focus幻象39伤零损没有完整实打后继；当轮匹配不能证明固定首杀。
- 处置：waiting。缺A10召唤、航行、再起及索引变化的冻结跨轮完整调用链；另一focus的后续整场结果未观察，不能制定固定目标顺序。
- 预期行为及验证：用本角色A10已观察的HP/伤害/移动表冻结完整调用并逐实体核对；不把旧召唤提交当新增成长排序完成。

## silent-proposal-bddfa690a84e03d0：甲虫睡眠、成长与血价

- 来源任务：experience-update → strategy-proposal；账本：silent-0128, silent-0079。
- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md；原SHA256：`b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780`；副本：`silent-proposal-bddfa690a84e03d0.original.md`。
- 本角色证据：DUZUBAJ3A8GP F30末试T6，s275018敌力4、攻击22，s275022玩家1血16挡，完整需损6。四次尝试前三predicted_death、末次died。
- 当前实现边界：末轮数值与SL结果分账已有事实基础，四次尝试仍只算一局。
- 反例与限制：来源的自然醒过程不是提前唤醒眩晕配对；不同末轮敌血不能替代整场胜负。
- 处置：waiting。缺提前唤醒后眩晕接续的配对和同抽序完整获胜替线；自然醒、成长及16挡对22攻不足以拟合统一血价或固定杀序。
- 预期行为及验证：自然醒与提前打醒、临时减力恢复与独立成长分别核验；整场受控证据充分前维持排序。

## 留存、登记与回退

只经根learner/ledger.py update给26条原账本追加本批proposal/report路径和核验说明，by=learner:strategy-proposal。本批26条追加均不写status，不扩样本、不重复证据或新建提案ID。初读16条proposed、10条shipped；并行experience-update于21:50:57将silent-0019/0020/0021追加为proposed，本批保留其他任务的更新，不恢复旧快照。输入、输出、物理追加行回执保存。十个原提案的waiting由最终proposal_results交调度器消费，不直接改队列或冒称shipped。

无源码实现，无提交或合入，没有eval版本与规则双通知，也没有生产代码需要回退。工作树保持干净，HEAD保持base；scratch和根账本CLI记录是允许的交付。运维请接收本目录proposal.md/report.md，保留这些未完成父项；经验入库、量化父请求与后续消费者验收不因本批报告而关闭。

过程记录：最初猜测logs/sl.jsonl不存在，随后由原manifest定位sl-attempts.jsonl；两处rg路径猜测无匹配，没有当作游戏证据。一次apply_patch写scratch验证器失败且未生成文件，磁盘/权限检查后以允许的shell方式写入成功。初版资源投影从combat.turn读取，字段为空；v2改取state.turn，原版保留。初版T4候选投影误将JSON字符串当对象，v2显式解析；空投影未用于策略结论。上述是材料准备问题，不是生产源码或tsc/vitest失败。

原始记录、原提案、投影初稿、核验输出和来源补丁全部保留；材料SHA索引见artifacts.json。最终clean/base、逐ID覆盖、根账本物理追加及gitleaks结果见completion-validation.json与对应回执。

最终核验初版错误地要求共享账本所有状态等于开工快照，因此因上述三条并行更新触发AssertionError。原失败保留在completion-validation-initial-failure.json；v2按本批物理追加行不含status、原前缀及原行SHA不变来验收，未覆盖并行记录。并行来源仅用于审计归属，不作为本批新增游戏证据。首次修正脚本因输出语句括号缺失导致SyntaxError，整段Python未执行，随后修正；原工具失败文本保存在report-correction-failure.txt。
