# 本批十项提案核验与处置

时间：2026-10-12T20:14:23+08:00。角色silent，观察范围A10。批次20261012-200522-strategy-proposal。base=`257c41df88157b59e520232dae1210662b08d8e6`。

结论：10项均waiting；已有局部机制继续保留，没有足够证据支持本批新增策略规则，也没有完整父提案可据本次核验登记implemented/duplicate。本批未修改生产源码、知识或在线行为，未提交、合入、新增版本或标shipped。

## 身份与范围

起始git status干净；learn.json对应行task/character/worktree/runs核对一致，reason=proposal，恰有10个proposal_ids，无research_request、implementation_request或proposal_repair。普通专题请求绑定另一批，本批不承接其正文。按要求git merge --no-edit main结果Already up to date，HEAD保持base。未派下级agent、未扩领队列、未读其他角色知识、未联网或运行play。

原提案Markdown均按专用队列SHA核实并保存为*.original.md；26条关联账本按ledger.py的追加合并语义重建为ledger-folded.json。初稿ledger-latest-naive.json只是逐ID末行字段快照，会丢失累计证据/链接，已明确弃作分析依据并保留历史；没有据其重复加证或改状态。

## 本次实际验证

六个runs.jsonl记录全部SILENT/A10。借前批同六局偏移清单定位，本批重新从只读logs读取6767条原字节并逐SHA核实：3432状态、3306决策、29条SL记录。完整本角色摘录与raw-manifest.json落盘；helper-provenance.json记录所复用定位/探针脚本的原路径与SHA，未沿用前批的测试通过声明。

重点楼层的781状态和756决策进入当前离线审计：生成152候选段、505个可连接相邻观测区间，原历史结构化selection_stages均缺失，完整候选结果均保持未知。这说明观测/派发链与候选完整归因是不同证据，不能补造历史字段或声称动作未执行。

9组原帧断言通过；另直接核首/第三试沙虫T2的起终HP与敌血、末试T11零血端点。6组当前生产planCombatTurn→replaySteps探针全部匹配，输入未变，knowledge数据读取被阻断，只用冻结实盘卡牌/状态，不调LLM或网络。它们只验证当前轮；没有提供跨轮预测所需完整敌动作表/抽序，不能冒称整场验证。probe冒泡后的hpLoss27也不当作实盘单动作损血。

未运行tsc、vitest或test-sandbox；本批无生产代码改动或提交，撤源码失败/恢复通过不适用，tests全部null。既有测试文件仅作覆盖定位，未宣称其本批运行通过。检查结果见evidence-verification.json、consumer-probes.json、audit-summary.json、selection-coverage.json、sl-paired-endpoints.json。

所有来源均已用于发现/回归，不是独立盲测，SL尝试不扩独立局分母；没有拟合预算、血价、启动权重或首杀参数。当前进阶首样本数据库规则及房间代价五样本门槛保持。

## 已存在源码的核实

本批只读核对live=`a9127cd90c1e62dd09a9325962d21bc4b11a44d3`。以下10个既有源码提交均为base/live祖先，均不属于本批fixes。13条相关路径中10条blob相同，3条仅Roy/Dai注释署名差异，精确patch保存在本目录；没有同步或覆盖main/live差异。祖先关系不代替完整提案验收。

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

## silent-proposal-89354805ee4d7e77：神化升级与本战实际施放

- 来源任务：postmortem → strategy-proposal；账本：silent-0237, silent-0238。
- 原文：`/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md`；SHA256 `ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d`。
- 已核证据：VLZ6CCT8AQ0A F35/36/37/43 T1、F43 T2、F45 T1。已完成神化动作269598/269625/269648/269706；s275564→275565能量7→5；F43 s275679→275687玩家90→77、敌254→203。F45没有完成神化动作。
- 现有实现：772b839f8ada31664cb764ea9ad3bdb03da27f64、6e233ede76e5dd849f0d40760be64e7cdacf78b1、b2805be4ba44b7375c7908d873889372cc3cfe6c已实现观察到的升级对；f98a929f24901c20efed462b29591e25ebb85451提供持有/候选/覆盖事实。当前actual_cast_this_fight明确为null。
- 反例/限制：四次已施放与未施放末战不是同敌同盘的胜负配对；F43打神化后整场仍损57。未知升级保留unknown是边界，不能为补齐数量推造数值。
- 本次处置：waiting。已有升级和题面子项已核实；本批神化动作记录没有可直接承接跨重规划、SL和重启的完整战斗身份/生命周期验证，未知升级与自动动作副效应亦未获完整证据，整案waiting。
- 预期行为与验证：保留现有观察对变换与未知标记；用已完成动作加前后帧核施放，另补战斗/尝试/重启边界证据后再接在线生命周期。不能以仅持有或候选包含神化记已施放。

## silent-proposal-f2bfceddb1898dca：三骑士药水预算与击杀时钟

- 来源任务：postmortem → strategy-proposal；账本：silent-0106, silent-0019, silent-0201。
- 原文：`/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md`；SHA256 `fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26`。
- 已核证据：VLZ6CCT8AQ0A F45 T1：d269748 MC707ms、1/12样本、horizon1、best=null；d269754为12/12，但指纹不同。T4 d269770少损线13损24伤、攻击线31损32伤；T5 s275748→275754来袭83→59，32HP、20挡、完整需损39。
- 现有实现：45161a51c2c6b7e4a499b13cf749c4108193bbf5已把未形成比较、明确并列、样本数和药水用时分列。当前当轮消费者复现末轮残毒3伤与完整需损39。
- 反例/限制：两次MC之间状态已变，不能把12样本与1样本当同盘预算改进；高伤候选未执行。F43胜战90→33、F44休息到67的前置成本不能省略。
- 本次处置：waiting。缺同状态、同模型覆盖、同随机输入和同总预算的配对收益曲线；现有两问不是受控预算实验，不据707ms单例修改预算、留药或目标顺序。
- 预期行为与验证：保留现有预算与候选；后续冻结同题全部输入，分别测分阶段MC的候选稳定性/样本收益，保留退化和未建模范围，不拟合单局阈值。

## silent-proposal-283a164780d11e69：神化经验提案的同源实现链

- 来源任务：experience-update → strategy-proposal；账本：silent-0237, silent-0238。
- 原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md`；SHA256 `78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637`。
- 已核证据：VLZ6CCT8AQ0A F35/F43/F45，与89354805同一证据问题；来源experience-update，关联silent-apotheosis-combat-upgrades。原Markdown已单独核SHA。
- 现有实现：与89354805共享已核live升级来源和覆盖题面；原两个ID保留，不重新登记重复提案。
- 反例/限制：同源提案或已发布经验不等于代码全范围完成；场外牌组、战内升级及后续实际动作必须分开。
- 本次处置：waiting。观察升级子项已有实现；仍缺跨SL/重启的实际施放绑定及未知费用、弃牌、跨轮副效应验收，不能仅因同源或经验已上线标duplicate。
- 预期行为与验证：沿两个原ID和silent-0237/0238核同一实现；保留未观察升级边界，后续补生命周期与真实消费者链。

## silent-proposal-ebbfe3b97548756d：攻防、持续毒和资源分项

- 来源任务：experience-update → strategy-proposal；账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。
- 原文：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md`；SHA256 `08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2`。
- 已核证据：VLZ6CCT8AQ0A F43 T1—5、F45 T3/5。F45末轮后空翻8挡、防御12挡合20；四段来袭83经尖啸成59；残2毒在触媒1下结算3。生产重放d269777从已有8挡起新增12挡，完整需损39。
- 现有实现：当前card-model/turn-solver复合当轮计算匹配；dc0e6080cb20c508d94c006648cc3edf0188d306提供能力和HP观测端点。
- 反例/限制：开场覆甲4不能延用到T5的0；持有两毒雾不能作已施毒，回血也不保证赢。无HEAL/SMITH与完整路线反事实。
- 本次处置：waiting。当轮攻防和残毒已核；缺口红、覆甲、临时减力恢复与未来毒的冻结跨轮联合输入/独立后继验证，以及大脑对资源事实的完整消费证据，不以当轮通过关闭综合提案。
- 预期行为与验证：保留现场能力和已结算/未来收益分账；按不同来源分别冻结触发前后帧、敌动作和抽序后验证跨轮链，不据本局改变休息或统一持续价值。

## silent-proposal-e5b87be50f28f311：SL换线、派发与执行归因

- 来源任务：postmortem → strategy-proposal；账本：silent-0079, silent-0021, silent-0125, silent-0018。
- 原文：`/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md`；SHA256 `5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709`。
- 已核证据：8JRE1C4H4Z2W F33首/第三试T2 d270216/270282指纹相同；s276208→276212为47→44HP、敌326→316；s276274→276278为47→32HP、敌326→309，换线多12损、多7伤。末试T11 s276433→276434为5→0HP、敌154→130，结算前22挡对37。
- 现有实现：f1542578594462e9f9f4e175488795fc480a8a13记录护栏预测；fdaf787a372880b0438e73bcac7e6d2168b038ed记录单动作派发；dc0e6080cb20c508d94c006648cc3edf0188d306和83512ddcd2c70fd9b983dc38524ff25c8970c1d3提供观测及终态审计。
- 反例/限制：两试当轮配对不证明原线整场能赢；较保血末试延长到T11仍死。终局实扣5和显示完整需损15不同，completed回执也不认证整候选。
- 本次处置：waiting。本批历史152个候选段没有结构化selection_stages，逐次重规划原因不能补造；缺带新字段的完整选线—中断—执行归因证据，策略取舍另缺完整未选线结果。
- 预期行为与验证：保留当前候选和单动作审计；以带新字段自然局验证抽牌/选牌/生成/药水/SL边界和动作身份，缺失处保持unknown，不改变HP护栏或SL规则。

## silent-proposal-49632bc4878fb597：力量、虚弱与独立成长

- 来源任务：experience-update → strategy-proposal；账本：silent-0005, silent-0231。
- 原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md`；SHA256 `aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2`。
- 已核证据：CA5KE8GFJ9X2 F13 T1/3/5：s273237/273252/273263敌力0/4/8、喷水11/15/19；s273268弱后14攻、10挡、玩家2HP。d267381生产重放获得10挡、完整需损4。
- 现有实现：当前模型按现场属性计算，与固定动作序列一致；本批无新数值修复。
- 反例/限制：虚弱没有停止后续加压；本局没有取得计划中的步法，不能用它验证正敏捷。零血截断的实损2不是完整需损4。
- 本次处置：waiting。当前力量/虚弱/双防御已核；本局不能提供正敏捷的联合验证，跨轮加压及逐击修正的冻结全链仍不完整，不能据此新增统一保血/输出权重。
- 预期行为与验证：保留当前属性消费；用本角色可追溯的正敏捷、多段及成长前后帧分别检验，跨轮输入要包含当前进阶移动表和抽序。

## silent-proposal-66532328a585941f：持有、计划与启动兑现

- 来源任务：experience-update → strategy-proposal；账本：silent-0021, silent-0009。
- 原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md`；SHA256 `56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831`。
- 已核证据：5PM6JAQG6FNQ F39末试T2 s274379→274380：玩家29HP/敌35HP不变，两敌无毒，冒泡耗能5→4；d268455重放damageDealt=0、energyLeft=4。F33曾建立毒雾/触媒并胜。
- 现有实现：无毒冒泡耗能零收益已由当前生产入口复现；账本已存在玩家29/敌35的勘误，本批不重复更正或增加样本。
- 反例/限制：F33和F39的敌人、入口HP、构筑/抽序、已建立组件不同；探针hpLoss27是只打冒泡后结束回合的模型值，不是该动作实际造成27损。
- 本次处置：waiting。缺同入口HP、构筑和完整抽序下不同启动顺序的整场对照及可复现收益函数；不能从一次空打拟合启动或构筑阈值。
- 预期行为与验证：继续分列持有/计划/已建立；保留选项，由实际动作与能力帧核兑现，待完整对照后评价启动权重。

## silent-proposal-43a76a31ba7bdcfa：吸取、负敏捷、毒与SL

- 来源任务：experience-update → strategy-proposal；账本：silent-0030, silent-0027。
- 原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md`；SHA256 `f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c`。
- 已核证据：61E2QS63Y9WU F17 T5/6：s273503→273504吸取后敌2力量、玩家敏−2；T6双防御共6、覆甲3、毒17+16扣33，玩家56→48。d267612生产重放得到6挡/33伤/8损。
- 现有实现：当前负敏捷、覆甲和毒的当轮组合已准确消费。
- 反例/限制：本局首试60血七轮赢，不能证明别局可被SL救活，也不能拿不同入口条件改范围。
- 本次处置：waiting。缺吸取跨轮接续的完整冻结验证，以及同入口HP、构筑、抽序下可救活的完整SL替线；当轮匹配不足以改变SL范围或换线偏好。
- 预期行为与验证：分开核状态变换与整场可救活性；没有后者时只保留机制事实，现有SL行为保持。

## silent-proposal-5264153a4a4b0e5c：胧光怪召唤、成长与目标

- 来源任务：experience-update → strategy-proposal；账本：silent-0039, silent-0209。
- 原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md`；SHA256 `b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02`。
- 已核证据：61E2QS63Y9WU F23 T1—5：s273577只有本体，s273582加入幻象、索引改变；s273583/273589/273596力0/3/6。T4本体线d267696重放并实付47伤15损，幻象余2到T5才0血/REVIVE_MOVE。
- 现有实现：当前生产当轮重放匹配47伤/15损；已有召唤实现不自动证明A10整条召唤/成长/再起链验收。
- 反例/限制：39伤零损的focus幻象线没有实打，不能把其题面值当完整胜线；index变化不代表稳定实体身份。
- 本次处置：waiting。缺A10召唤、航行、再起及索引变化的冻结跨轮全链，另一focus完整结果也未观测；不据当轮参考值指定首杀。
- 预期行为与验证：按当前进阶观察值冻结HP/伤害及移动表，验证实体加入/退场/再起；保留各目标与并列选项。

## silent-proposal-bddfa690a84e03d0：甲虫唤醒、成长与血价

- 来源任务：experience-update → strategy-proposal；账本：silent-0128, silent-0079。
- 原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md`；SHA256 `b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780`。
- 已核证据：DUZUBAJ3A8GP F30 T1—6：睡3/2/1后T4自然醒；末试s275018力4/22攻，s275022玩家1HP/16挡；d269073重放16挡、完整需损6。SL记录三次predicted_death后一次died。
- 现有实现：末轮消费者匹配，预测重载和实际死亡分别计数，四试仍只是一局。
- 反例/限制：末试T4比首试多扣3敌血也多损2玩家血；没有获胜替线。本来源缺提前打醒后STUNNED的完整配对。
- 本次处置：waiting。缺提前唤醒后的眩晕接续配对及同抽序完整获胜替线；末轮16挡/需损6已核，不能从四试均败拟合血价或固定杀序。
- 预期行为与验证：自然醒与提前唤醒分开验证，核临时减力恢复和独立成长；整场排序改变须补同条件对照。

## 登记、交付与回退

不新增重复code_proposals ID、不改原提案或复盘。只经根learner/ledger.py update为原26条账本追加本批proposal/report链接和核验说明，不改claim、status、version、证据分母；尤其不把已经shipped的经验降回proposed。10个原提案的waiting通过最终proposal_results交调用方沿原队列保留，不直接改专用队列。

本批没有可回退的生产改动。将本目录proposal.md与report.md交运维核验；没有上线，无eval版本或规则双通知。不把已有live源码填作本批合入。固定数据探针、原偏移、初稿、缺证原因和检查日志均保存，最终无改动证明及材料SHA见completion-validation.json和artifacts.json。
