# 静默猎手十项原提案的证据与实现边界

时间：2026-10-13T18:24:13+08:00。

本批只消费已领取的十个ID；全部waiting，不注册重复ID、不扩大到整条队列。已存在的分项实现按source-receipt.json核实际live祖先，完整提案没有足够证明可标implemented/duplicate。

确定性事实修复不要求先获得整场胜线；本批等待是因为未核实新的源码缺口或缺完整消费者/调参对照，不能把尚缺验证说成已发现游戏bug。

## silent-proposal-89354805ee4d7e77：神化升级传播与实际施放

处置：waiting。角色silent，观察进阶A10。账本：silent-0237、silent-0238。
来源任务：postmortem；实现任务strategy-proposal；本次batch=20261013-181302-strategy-proposal。
原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md`；实际SHA256=`ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d`，与原登记一致。
本批保留原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-181302/learner/runs/20261013-181318-strategy-proposal/silent-proposal-89354805ee4d7e77.original.md`。

**证据局号/层/回合与支持：** VLZ6CCT8AQ0A F35 T1、F43 T1–T5、F45 T1。states275564→275565消耗2能，防御5→8、打击7→10、必备工具1费→0；decisions269706/269707同后续牌序43伤/14损→51伤/13损，states275679→275687兑现51伤/13损，T2毒雾已升级。

**反例、勘误与未知：** F45没有施放神化；持有固有牌不证明收益成立。F35实打后重规划，37→52伤不能全部归升级。F43胜但损57，不证明整场必胜。

**旧行为及当前源码：** silent-apotheosis.ts、card-model.ts、turn-solver.ts与rollout.ts已实现有界升级与后续牌池传播；silent-apotheosis-reference.ts仍把actual_cast_this_fight记为null，并保留未知升级。

**未实现原因：** 已存在有界升级传播；缺实际施放经抽牌、药水、选择中断后的归属及换战/SL重置消费者验证，不能把局部实现当完整提案完成。

**预期行为与验证方法：** 固定F35/F43/F45卡牌、能量、后继牌池及场外deck，逐步验证已观察升级；未观察修改牌/重放/属性组合继续unknown。消费者须另核真实施放、中断和重置，不加入必打神化规则。

拟合/时间切分：本批六局为已用发现/回归资料；SL尝试及同局回合不扩分母，不称盲测，不从预训练补结论。
预期影响与回退：后续仅对核实缺口减少事实或执行归属误差，胜率影响未知。新增源码须撤源失败/恢复通过、原沙箱检查及角色隔离；实际上线按自己的源码提交回退并双通知Roy。当前无生产源码需回退。

## silent-proposal-f2bfceddb1898dca：三骑士药水MC与预算

处置：waiting。角色silent，观察进阶A10。账本：silent-0106、silent-0019、silent-0201。
来源任务：postmortem；实现任务strategy-proposal；本次batch=20261013-181302-strategy-proposal。
原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md`；实际SHA256=`fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26`，与原登记一致。
本批保留原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-181302/learner/runs/20261013-181318-strategy-proposal/silent-proposal-f2bfceddb1898dca.original.md`。

**证据局号/层/回合与支持：** VLZ6CCT8AQ0A F43/F44、F45 T1/T4/T5。d269748随机CURE_ALL为707ms、1/12样本，rollout horizon1、samples1、best=null；d269754为12/12药水样本，但另题五轮推演仍仅3样本。d269770低损线24伤/13损，高伤三线32伤/31损。s275754玩家32血20挡对59攻，完整损39、差7；s275755敌仍21/77/80血。

**反例、勘误与未知：** 没有实打高伤候选；少8伤不能认作败因。该局F17/F33获胜、F43损57后获胜，F44实际回复34仍不足过末战。CURE_ALL实效不是回血。

**旧行为及当前源码：** 现有题面和记录已给耗时、退化、样本、best与目标顺序；best=null不同于可比较候选并列。没有核实出需新增的预算常量或护栏缺陷。

**未实现原因：** 缺模型覆盖等价、冻结抽牌池与随机种子的同起点同总预算MC对照及候选稳定性曲线；单题707ms不能校准预算、留药价或护栏。

**预期行为与验证方法：** 先保持模型/卡池/知识输入/随机种子一致，再对现MC先行与分阶段预算做相同总CPU预算比较，记录每候选成熟度、样本收益与超时边界；不以沙箱限制代替算法结论。

拟合/时间切分：本批六局为已用发现/回归资料；SL尝试及同局回合不扩分母，不称盲测，不从预训练补结论。
预期影响与回退：后续仅对核实缺口减少事实或执行归属误差，胜率影响未知。新增源码须撤源失败/恢复通过、原沙箱检查及角色隔离；实际上线按自己的源码提交回退并双通知Roy。当前无生产源码需回退。

## silent-proposal-283a164780d11e69：神化经验来源链

处置：waiting。角色silent，观察进阶A10。账本：silent-0237、silent-0238。
来源任务：experience-update；实现任务strategy-proposal；本次batch=20261013-181302-strategy-proposal。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md`；实际SHA256=`78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637`，与原登记一致。
本批保留原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-181302/learner/runs/20261013-181318-strategy-proposal/silent-proposal-283a164780d11e69.original.md`。

**证据局号/层/回合与支持：** VLZ6CCT8AQ0A F35 T1、F43 T1–T5、F45 T1。原experience-update提案与89354805ee4d7e77使用同局同升级事实，关联经验silent-apotheosis-combat-upgrades和silent-0237/0238；两个来源任务不增加独立样本。

**反例、勘误与未知：** F45未施放的败局不是升级效果反例，也不能按相同题名直接登记整项duplicate。

**旧行为及当前源码：** 原经验、原提案SHA与现有有界升级实现均保存；沿原来源链共同验收，不另建提案ID。

**未实现原因：** 经验链存在且与原神化提案同题；实际施放、中断与重置的完整消费者链未验收，尚无整项duplicate证明。

**预期行为与验证方法：** 复用神化固定帧、卡牌覆盖与消费者验证；完成后两来源链共用实际live源码祖先，原source_task和经验ID保持。

拟合/时间切分：本批六局为已用发现/回归资料；SL尝试及同局回合不扩分母，不称盲测，不从预训练补结论。
预期影响与回退：后续仅对核实缺口减少事实或执行归属误差，胜率影响未知。新增源码须撤源失败/恢复通过、原沙箱检查及角色隔离；实际上线按自己的源码提交回退并双通知Roy。当前无生产源码需回退。

## silent-proposal-ebbfe3b97548756d：十五机制与持续资源分账

处置：waiting。角色silent，观察进阶A10。账本：silent-0005、silent-0016、silent-0049、silent-0071、silent-0143、silent-0046、silent-0053、silent-0027、silent-0011、silent-0021、silent-0106、silent-0204、silent-0020、silent-0019。
来源任务：experience-update；实现任务strategy-proposal；本次batch=20261013-181302-strategy-proposal。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md`；实际SHA256=`08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2`，与原登记一致。
本批保留原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-181302/learner/runs/20261013-181318-strategy-proposal/silent-proposal-ebbfe3b97548756d.original.md`。

**证据局号/层/回合与支持：** VLZ6CCT8AQ0A F43 T1–T5、F45 T3/T5、F44休息。F43勒紧6、步法3与口红1分源；F45勒紧4与敏3、后空翻8/防御12不能混用。s275754覆甲0、20挡对59攻，毒后仍三敌；F43胜损57、F44实际33/99→67/104。

**反例、勘误与未知：** 两张毒雾在F45没有建立，其他两敌无毒；临时减力不证明后续成长停止。十五经验的历史支持分母不同，不合成同一机制实验分母。

**旧行为及当前源码：** 已有升级、毒、当前属性、临时减力和资源题面等分项。原始局面已冻结，但未复原历史dirty树、当时知识/移动分布及十五路径统一消费输入；没有验证出本批新增公式缺口。

**未实现原因：** 缺十五机制各自依赖与状态期限的完整冻结调用及持续资源消费者对照；局部公式与神化等子项不能关闭宽提案。

**预期行为与验证方法：** 逐机制固定已观察进阶的HP/移动表、现场属性与牌面，区分当前收益、到期恢复、未来毒及实际回血；未知附魔和未建立能力不补公式，路线代价保持既有5样本门槛。

拟合/时间切分：本批六局为已用发现/回归资料；SL尝试及同局回合不扩分母，不称盲测，不从预训练补结论。
预期影响与回退：后续仅对核实缺口减少事实或执行归属误差，胜率影响未知。新增源码须撤源失败/恢复通过、原沙箱检查及角色隔离；实际上线按自己的源码提交回退并双通知Roy。当前无生产源码需回退。

## silent-proposal-e5b87be50f28f311：Jev、HP护栏与SL实际血价审计

处置：waiting。角色silent，观察进阶A10。账本：silent-0079、silent-0021、silent-0125、silent-0018。
来源任务：postmortem；实现任务strategy-proposal；本次batch=20261013-181302-strategy-proposal。
原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md`；实际SHA256=`5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709`，与原登记一致。
本批保留原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-181302/learner/runs/20261013-181318-strategy-proposal/silent-proposal-e5b87be50f28f311.original.md`。

**证据局号/层/回合与支持：** 8JRE1C4H4Z2W F33首/三试T2、第二试T5、末试T11；F17 T6。d270216/270282指纹相同；原候选3损/10伤、SL替换15损/17伤，首/三试T2→T3实际分别损3/15。d270264护栏plan4为16损/43伤，plan6为4损/25伤。六试都是一局，前五试末轮判死截断。

**反例、勘误与未知：** 末次保血替换省3血、少10伤，延至T11仍死；不支持一律输出或保血。抽牌后的重新规划会中断原候选，候选差不能直接记实际收益。

**旧行为及当前源码：** 候选audit/HP护栏已记录预测。新核实首动作执行消费者silent-selection-dispatch.ts及loop.ts接线，fdaf787a372880b0438e73bcac7e6d2168b038ed是实际live祖先；返回/未派发/错误分列，仍state_effect_verified=false、whole_plan_executed=null、actual_turn=null。

**未实现原因：** 首动作派发回执已有实际live实现；仍缺跨抽牌、选择、重问续步与末端状态的同一完整候选归属，不能将首动作成功当整轮实际结果。

**预期行为与验证方法：** 固定同盘T2、护栏T5、抽牌重规划及终局截断，关联候选、派发身份与后继观测；完整执行/前缀/中断/未知分列。已有派发子项保留，不重复实现；没有独立策略对照不改SL或护栏阈值。

拟合/时间切分：本批六局为已用发现/回归资料；SL尝试及同局回合不扩分母，不称盲测，不从预训练补结论。
预期影响与回退：后续仅对核实缺口减少事实或执行归属误差，胜率影响未知。新增源码须撤源失败/恢复通过、原沙箱检查及角色隔离；实际上线按自己的源码提交回退并双通知Roy。当前无生产源码需回退。

## silent-proposal-49632bc4878fb597：力量、逐击、敏捷与成长

处置：waiting。角色silent，观察进阶A10。账本：silent-0005、silent-0231。
来源任务：experience-update；实现任务strategy-proposal；本次batch=20261013-181302-strategy-proposal。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md`；实际SHA256=`aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2`，与原登记一致。
本批保留原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-181302/learner/runs/20261013-181318-strategy-proposal/silent-proposal-49632bc4878fb597.original.md`。

**证据局号/层/回合与支持：** CA5KE8GFJ9X2 F13 T1/T3/T5。s273252/s273263蚌力量4/8、喷水15/19；s273268虚弱后14攻，玩家2血10挡仍需损4。临时虚弱没有停止下一次加压。

**反例、勘误与未知：** 本局没有取得计划中的步法，不能把该局当敏捷建立实验；silent-0005原claim为敏捷，不能以账本ID代替力量实验。

**旧行为及当前源码：** 模型存在当前力量/弱与逐牌格挡路径；尚缺把原调用的牌面修正、敌成长、逐击和敏捷四路径联合复验的完整依赖，未证明新缺陷。

**未实现原因：** 本局支持力量与弱而未实际建立步法；缺四路径完整冻结消费对照，不用单一能力提交或计划牌补足敏捷验证。

**预期行为与验证方法：** 每一路以实见牌面、属性与当前进阶招式表冻结验证，互不借分母；新增缺口若核实再实现状态变换，不拟合统一输出/保血权重。

拟合/时间切分：本批六局为已用发现/回归资料；SL尝试及同局回合不扩分母，不称盲测，不从预训练补结论。
预期影响与回退：后续仅对核实缺口减少事实或执行归属误差，胜率影响未知。新增源码须撤源失败/恢复通过、原沙箱检查及角色隔离；实际上线按自己的源码提交回退并双通知Roy。当前无生产源码需回退。

## silent-proposal-66532328a585941f：组件持有与实际启动

处置：waiting。角色silent，观察进阶A10。账本：silent-0021、silent-0009。
来源任务：experience-update；实现任务strategy-proposal；本次batch=20261013-181302-strategy-proposal。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md`；实际SHA256=`56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831`，与原登记一致。
本批保留原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-181302/learner/runs/20261013-181318-strategy-proposal/silent-proposal-66532328a585941f.original.md`。

**证据局号/层/回合与支持：** 5PM6JAQG6FNQ F33、F39第二试T2。F33建立毒雾3/触媒1/群蛇4并胜；F39末试毒雾未建立，s274379→274380向无毒目标打冒泡，玩家29血不变、能量5→4、敌35/72血不变且均无毒。

**反例、勘误与未知：** 原账本早期备注把敌35血写成玩家35血，既有追加勘误已更正为29，本批直接核原字节不重写历史。F33和F39敌人/起始资源不同；首试建立毒雾仍败。

**旧行为及当前源码：** 已有知识区分持有与兑现，冒泡条件按实际目标毒核；未得到可校准启动或构筑收益权重的受控资料。

**未实现原因：** 缺同HP、构筑、药水与抽序下不同启动顺序的完整对照及可复现收益函数；无毒空放只能确认本次1能量代价。

**预期行为与验证方法：** 冻结同起点资源与牌序，分列实际施放/建立/结算；对不同启动序列比较完整后继和生存窗口，后续独立完局再做时间后移验证。

拟合/时间切分：本批六局为已用发现/回归资料；SL尝试及同局回合不扩分母，不称盲测，不从预训练补结论。
预期影响与回退：后续仅对核实缺口减少事实或执行归属误差，胜率影响未知。新增源码须撤源失败/恢复通过、原沙箱检查及角色隔离；实际上线按自己的源码提交回退并双通知Roy。当前无生产源码需回退。

## silent-proposal-43a76a31ba7bdcfa：族母吸取、负敏捷与SL

处置：waiting。角色silent，观察进阶A10。账本：silent-0030、silent-0027。
来源任务：experience-update；实现任务strategy-proposal；本次batch=20261013-181302-strategy-proposal。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md`；实际SHA256=`f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c`，与原登记一致。
本批保留原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-181302/learner/runs/20261013-181318-strategy-proposal/silent-proposal-43a76a31ba7bdcfa.original.md`。

**证据局号/层/回合与支持：** 61E2QS63Y9WU F17 T5/T6/T7。T5吸取后玩家力量2→0、敏捷0→−2，敌力0→2；s273504防御3、负敏捷−2，s273504→273508毒17+16实扣33。该战首试获胜。

**反例、勘误与未知：** 首试胜不支持扩大SL范围；负敏捷与持续毒进度独立，不用另一局重打失败证明固定顺序。

**旧行为及当前源码：** 吸取/当前属性与毒分项已有模型；完整historical调用依赖和同盘SL抽牌输入未复原，没有本批支持的新SL偏好。

**未实现原因：** 缺同起始资源、完整抽序与当前进阶移动输入的受控SL换线对照；首试胜不足以改变SL范围或偏好。

**预期行为与验证方法：** 固定T5→T7属性/毒/每张牌挡验证现有分项；若建议SL范围变化，另比同盘候选完整后继。事实模型修复不要求先有胜线，但本批未核实新的模型缺陷。

拟合/时间切分：本批六局为已用发现/回归资料；SL尝试及同局回合不扩分母，不称盲测，不从预训练补结论。
预期影响与回退：后续仅对核实缺口减少事实或执行归属误差，胜率影响未知。新增源码须撤源失败/恢复通过、原沙箱检查及角色隔离；实际上线按自己的源码提交回退并双通知Roy。当前无生产源码需回退。

## silent-proposal-5264153a4a4b0e5c：胧光怪召唤与各实体成长

处置：waiting。角色silent，观察进阶A10。账本：silent-0039、silent-0209。
来源任务：experience-update；实现任务strategy-proposal；本次batch=20261013-181302-strategy-proposal。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md`；实际SHA256=`b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02`，与原登记一致。
本批保留原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-181302/learner/runs/20261013-181318-strategy-proposal/silent-proposal-5264153a4a4b0e5c.original.md`。

**证据局号/层/回合与支持：** 61E2QS63Y9WU F23 T1–T5。s273589幻象力3、s273596力6；s273595幻象仍2血并有15攻，下一轮玩家25→10，本体51→41为毒结算。另一focus的39伤/零损候选没有实打。

**反例、勘误与未知：** 本局没有再次复生，不能从历史召唤测试推出该局复生链全部正确，也不能把47伤直接当幻象退场。

**旧行为及当前源码：** monster-db/boardRolloutInput已接活体召唤与当前进阶数据；既有silent-obscura-summon.test.ts只验证另一已观测进阶的召唤子项，未运行或当作本批A10成长全链证明。

**未实现原因：** 缺A10航行、幻象与复生联动的完整冻结模拟调用及另一focus后继；旧召唤子项不证明目标排序收益。

**预期行为与验证方法：** 固定两实体当前HP、力量、移动表和稳定ID，分别核召唤、成长、临减、存活攻击与退场；合法目标保留、相同推演值并列，不指定首杀。

拟合/时间切分：本批六局为已用发现/回归资料；SL尝试及同局回合不扩分母，不称盲测，不从预训练补结论。
预期影响与回退：后续仅对核实缺口减少事实或执行归属误差，胜率影响未知。新增源码须撤源失败/恢复通过、原沙箱检查及角色隔离；实际上线按自己的源码提交回退并双通知Roy。当前无生产源码需回退。

## silent-proposal-bddfa690a84e03d0：甲虫睡眠、眩晕与成长

处置：waiting。角色silent，观察进阶A10。账本：silent-0128、silent-0079。
来源任务：experience-update；实现任务strategy-proposal；本次batch=20261013-181302-strategy-proposal。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md`；实际SHA256=`b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780`，与原登记一致。
本批保留原文：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-181302/learner/runs/20261013-181318-strategy-proposal/silent-proposal-bddfa690a84e03d0.original.md`。

**证据局号/层/回合与支持：** DUZUBAJ3A8GP F30 T1–T6、末试T6。原复盘睡3/2/1后T4醒来、T5减力后T6恢复至力4；s275022玩家1血16挡对22攻、完整需损6；s275023实际死、毒和荆棘结后敌32血。四试都失败。

**反例、勘误与未知：** 同一局四试不是四个独立样本；末试T4比首试多打3但多损2，不支持按敌血改全败权重。未实打线可救与否未知。

**旧行为及当前源码：** 已有睡眠/strip-stun和眩晕后继缺数据拒绝路径；现有源码与原帧不能单独证明历史全链覆盖，未核实新的接线缺陷。

**未实现原因：** 缺睡眠、醒来/眩晕接续和当前进阶成长的完整历史调用依赖，以及同抽换序完整对照；四败不足拟合血价。

**预期行为与验证方法：** 分别冻结睡层、真实失血、醒来帧、减力恢复和A10移动输入；后继伤害缺失保持未知，不用零伤眩晕重复预测安全，不改固定杀序或血价。

拟合/时间切分：本批六局为已用发现/回归资料；SL尝试及同局回合不扩分母，不称盲测，不从预训练补结论。
预期影响与回退：后续仅对核实缺口减少事实或执行归属误差，胜率影响未知。新增源码须撤源失败/恢复通过、原沙箱检查及角色隔离；实际上线按自己的源码提交回退并双通知Roy。当前无生产源码需回退。
