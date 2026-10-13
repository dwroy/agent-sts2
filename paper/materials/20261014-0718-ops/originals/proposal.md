# 本批策略提案处置

记录时间：2026-10-14T06:55:45+08:00。批次：20261014-063524-strategy-proposal；角色：silent；工作树：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-063524。

仅消费本批领取的10个原ID，全部waiting。基线c9b224846787065ea279f10c7e23c6bb5313edb3；无生产源码/知识修改、无新源码提交、无合入、无版本。原提案、失败和待证据范围保留。

以下判断只据本角色六局原日志及本角色原提案/账本，不以已有实现证明整项完成。单局内重复尝试与同局帧不扩展独立样本分母；这些都是发现/回归材料，不是盲测。
## silent-proposal-89354805ee4d7e77

证据：VLZ6CCT8AQ0A，F35 T1/T2、F43 T1/T3/T4、F45 T1。账本：silent-0237, silent-0238。来源任务：postmortem；实现任务：strategy-proposal。

支持事实：神化2能升级后的手牌变化可读回；现有升级传播与持有/候选事实已经存在。六个原帧读回actual_cast_this_fight均为null。另发现扑击14→20、反射抽2→3、猎杀者15→20三个未列入传播表的配对。

反例与限制：F35施放后重规划、F43获胜仍有较大损血、F45未施放且失败，不构成施放与不施放的同盘整场对照。

处置：waiting。已有神化升级子实现；仍缺本战实际施放跨抽牌、选择、药水、SL、换战与接续的持续身份。新发现的扑击减费、反射奇巧、猎杀者次轮抽牌未有完整模拟联动，不能只补升级数值便宣称完整覆盖。

预期行为与验证方法：先冻结三张牌附加效果的出牌/弃牌及下一轮原帧，验证状态建立、消耗与期限；再验证神化剩余手牌和后续抽牌，不把牌面配对升级成完整模型或固定优先级。 本批不拟合新常数，不改变当前出牌、药水、SL或终局规则。若后续实现，须以源码撤除失败/恢复通过、原沙箱检查及实际live消费者验收闭环；不能用已有子项关闭整条要求。

原提案保留副本：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-063524/learner/runs/20261014-063554-strategy-proposal/silent-proposal-89354805ee4d7e77.md；SHA256：ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d。原路径：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md。本批源码提交：无；整项实际live实现提交：未证明，不登记implemented/duplicate/shipped。

## silent-proposal-f2bfceddb1898dca

证据：VLZ6CCT8AQ0A，F43 T1、F44、F45 T1/T4/T5。账本：silent-0106, silent-0019, silent-0201。来源任务：postmortem；实现任务：strategy-proposal。

支持事实：F45首问mc_ms=707且药水只完成1/12样本；rollout降为horizon=1、samples=1、best=null。后问药水样本成熟度改善，实际抽牌另有重问。T4实际损13、净扣24；攻击候选31损/32伤未实打。

反例与限制：模型覆盖、抽到的牌与问点均有变化，不能把两问的用时差当同输入预算实验；全败并列也不等于原线与各替换线长期等价。

处置：waiting。缺同起点、同模型覆盖、同总预算、同固定随机输入池的预算配对实验及候选稳定性曲线，不能拟合MC预算、药价、HP护栏或三骑士固定focus。

预期行为与验证方法：固定输入与随机池，分别测现有MC先行和分阶段分配；保存样本成熟度、未知覆盖、当轮净损/净扣与击杀缺口，不将日志中的跨问比较当受控结果。 本批不拟合新常数，不改变当前出牌、药水、SL或终局规则。若后续实现，须以源码撤除失败/恢复通过、原沙箱检查及实际live消费者验收闭环；不能用已有子项关闭整条要求。

原提案保留副本：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-063524/learner/runs/20261014-063554-strategy-proposal/silent-proposal-f2bfceddb1898dca.md；SHA256：fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26。原路径：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md。本批源码提交：无；整项实际live实现提交：未证明，不登记implemented/duplicate/shipped。

## silent-proposal-283a164780d11e69

证据：VLZ6CCT8AQ0A，F35 T1、F43 T1/T2/T3/T4、F45 T1。账本：silent-0237, silent-0238。来源任务：experience-update；实现任务：strategy-proposal。

支持事实：本ID独立链接silent-apotheosis-combat-upgrades，与89354805同源但原来源任务为experience-update。已保存原Markdown及其独立SHA；新发现的三个配对沿相同原证据处理。

反例与限制：同源链接不能证明全部实现，也不能以局部升级提交替代持有/施放/覆盖的完整边界。

处置：waiting。独立经验链接仍缺实际施放及SL、换战、接续消费者；同源和已有升级子项不足以登记整项duplicate。三个未覆盖配对还有附加机制缺口。

预期行为与验证方法：复用神化原提案的固定证据和补充配对，分别验升级传播与持续施放身份；保留两个原ID，不新造重复ID或改原提案。 本批不拟合新常数，不改变当前出牌、药水、SL或终局规则。若后续实现，须以源码撤除失败/恢复通过、原沙箱检查及实际live消费者验收闭环；不能用已有子项关闭整条要求。

原提案保留副本：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-063524/learner/runs/20261014-063554-strategy-proposal/silent-proposal-283a164780d11e69.md；SHA256：78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637。原路径：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md。本批源码提交：无；整项实际live实现提交：未证明，不登记implemented/duplicate/shipped。

## silent-proposal-ebbfe3b97548756d

证据：VLZ6CCT8AQ0A，F43 T1—T5、F45 T1—T5、F44休息。账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。来源任务：experience-update；实现任务：strategy-proposal。

支持事实：原提案包含15项经验，涉及逐击力量、敏捷、临时减力、勒紧、毒及路线/休息资源。F45 T5原意图83，尖啸后59；20挡/32血完整显示差额为需损39、缺7，终态三敌仍在。

反例与限制：持有的能力不等于已建立；F45仍败也不反证单项机制。F43/F45的升级、属性、覆甲与毒触发条件不同，不可混用数值。

处置：waiting。十五子机制尚缺逐项冻结生产调用、状态期限和路线/休息消费者验收矩阵；局部端点及既有源码不能关闭整项，也没有新的可隔离完整机制差额。

预期行为与验证方法：为15项建立分项生产输入/输出表；单独核即时作用、回合到期、后续毒结算和实际净回，不预支未知持续收益。 本批不拟合新常数，不改变当前出牌、药水、SL或终局规则。若后续实现，须以源码撤除失败/恢复通过、原沙箱检查及实际live消费者验收闭环；不能用已有子项关闭整条要求。

原提案保留副本：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-063524/learner/runs/20261014-063554-strategy-proposal/silent-proposal-ebbfe3b97548756d.md；SHA256：08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2。原路径：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md。本批源码提交：无；整项实际live实现提交：未证明，不登记implemented/duplicate/shipped。

## silent-proposal-e5b87be50f28f311

证据：8JRE1C4H4Z2W，F17 T6、F33首/三试T2、第二试T5、末试T11。账本：silent-0079, silent-0021, silent-0125, silent-0018。来源任务：postmortem；实现任务：strategy-proposal。

支持事实：首试与第三试T2指纹相同，实际分别损3/15、净扣10/17，多12血仅多7伤。完整659决策/676状态输入经现有CLI读回：113候选片段、264相邻观测、111整轮窗口，其中44端点可核、67未知；全部候选完整执行结果仍null。

反例与限制：末试保血改线延至T11仍失败，反对一律把防御替换当错误；末轮净损5与显示37−22=15的算术参考分列，未截断完整入伤未知。

处置：waiting。实际离线消费者已读回完整本局，但不认证完整候选；缺在线持续候选身份、中断/重问后的认证、后帧因果及成长建立时点全链。缺另一完整受控后继，不能改SL偏好。

预期行为与验证方法：以现有113片段和44可核窗口为回归，补持续候选身份、动作后验证与中断清除；候选预测、整轮净变化及单动作因果必须分别验收。 本批不拟合新常数，不改变当前出牌、药水、SL或终局规则。若后续实现，须以源码撤除失败/恢复通过、原沙箱检查及实际live消费者验收闭环；不能用已有子项关闭整条要求。

原提案保留副本：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-063524/learner/runs/20261014-063554-strategy-proposal/silent-proposal-e5b87be50f28f311.md；SHA256：5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709。原路径：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md。本批源码提交：无；整项实际live实现提交：未证明，不登记implemented/duplicate/shipped。

## silent-proposal-49632bc4878fb597

证据：CA5KE8GFJ9X2，F13 T1—T5。账本：silent-0005, silent-0231。来源任务：experience-update；实现任务：strategy-proposal。

支持事实：喷水意图11/15/19对应力量0/4/8；虚弱后15→11、19→14，下一次加压仍成长。T5 2血、10挡对14，显示完整需损4而实际零血截断只损2。

反例与限制：本局未建立计划中的步法正敏捷，不能用本局补四路径中的正敏捷实验。

处置：waiting。力量、虚弱、加压成长原帧已核；仍缺力量、敏捷、虚弱与独立成长四路径的完整冻结生产调用对照，步法子实现不能关闭复合经验。

预期行为与验证方法：按原帧分离当前属性、每击修正、临时虚弱与成长，并补本角色可核的正敏捷输入；不加统一保血/输出权重。 本批不拟合新常数，不改变当前出牌、药水、SL或终局规则。若后续实现，须以源码撤除失败/恢复通过、原沙箱检查及实际live消费者验收闭环；不能用已有子项关闭整条要求。

原提案保留副本：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-063524/learner/runs/20261014-063554-strategy-proposal/silent-proposal-49632bc4878fb597.md；SHA256：aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2。原路径：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md。本批源码提交：无；整项实际live实现提交：未证明，不登记implemented/duplicate/shipped。

## silent-proposal-66532328a585941f

证据：5PM6JAQG6FNQ，F33与F39末试T2。账本：silent-0021, silent-0009。来源任务：experience-update；实现任务：strategy-proposal。

支持事实：F39末试未建立毒雾；无毒失落目标上冒泡花1能量但未增加毒或扣35血目标。与已建立雾/触媒/群蛇的F33分开记。

反例与限制：F33同时有不同组件与生存条件并赢，不能只按能力数量把胜因归于更早启动。

处置：waiting。无毒冒泡的零效果证据可核；缺同HP、构筑、药水及完整抽序下不同启动顺序的整场对照和可复现收益函数，不拟合启动或构筑阈值。

预期行为与验证方法：先分列持有、计划和真实能力建立，再用同初始资源/完整抽序比较启动次序；保留全部选项，不写必打规则。 本批不拟合新常数，不改变当前出牌、药水、SL或终局规则。若后续实现，须以源码撤除失败/恢复通过、原沙箱检查及实际live消费者验收闭环；不能用已有子项关闭整条要求。

原提案保留副本：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-063524/learner/runs/20261014-063554-strategy-proposal/silent-proposal-66532328a585941f.md；SHA256：56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831。原路径：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md。本批源码提交：无；整项实际live实现提交：未证明，不登记implemented/duplicate/shipped。

## silent-proposal-43a76a31ba7bdcfa

证据：61E2QS63Y9WU，F17 T5—T7。账本：silent-0030, silent-0027。来源任务：experience-update；实现任务：strategy-proposal。

支持事实：T5吸取后玩家力量2消失、敏捷0→−2、敌力0→2；T6两防御各3，已有毒17+16扣33至下一轮敌34血。首试七轮获胜。

反例与限制：本局首试胜利不能说明其他同抽SL一定有救，也不能提供另一完整线路的胜率。

处置：waiting。负敏捷与17+16毒结算已核；缺完整A10移动消费者验收和同资源、完整抽序的另一完整SL后继，不改变SL范围。

预期行为与验证方法：冻结吸取、负敏捷挡与毒的分项模型/移动输入；SL规则改变另需完整同盘可救线路，不能以单个机制测试替代整战。 本批不拟合新常数，不改变当前出牌、药水、SL或终局规则。若后续实现，须以源码撤除失败/恢复通过、原沙箱检查及实际live消费者验收闭环；不能用已有子项关闭整条要求。

原提案保留副本：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-063524/learner/runs/20261014-063554-strategy-proposal/silent-proposal-43a76a31ba7bdcfa.md；SHA256：f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c。原路径：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md。本批源码提交：无；整项实际live实现提交：未证明，不登记implemented/duplicate/shipped。

## silent-proposal-5264153a4a4b0e5c

证据：61E2QS63Y9WU，F23 T1—T5，重点T4。账本：silent-0039, silent-0209。来源任务：experience-update；实现任务：strategy-proposal。

支持事实：T4到下一轮净扣47、损15；行动末幻象14→2仍显示15攻击，本体76→51并经毒到41。末轮先杀幻象再由毒收本体，另一focus候选未实打。

反例与限制：另一focus的39伤/零损仅是题面预测；本局未再次观察复生，不能补复生联动。

处置：waiting。T4净扣47/损15及幻象余2已核；缺A10召唤、航行、复生联动的完整冻结生产调用和另一focus完整后继，不强制首杀。

预期行为与验证方法：逐实体核召唤、移动、成长和死亡后索引，推演相同值并列；不同focus收益需完整后继，敌人类型ID不能直接认证稳定实例。 本批不拟合新常数，不改变当前出牌、药水、SL或终局规则。若后续实现，须以源码撤除失败/恢复通过、原沙箱检查及实际live消费者验收闭环；不能用已有子项关闭整条要求。

原提案保留副本：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-063524/learner/runs/20261014-063554-strategy-proposal/silent-proposal-5264153a4a4b0e5c.md；SHA256：b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02。原路径：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md。本批源码提交：无；整项实际live实现提交：未证明，不登记implemented/duplicate/shipped。

## silent-proposal-bddfa690a84e03d0

证据：DUZUBAJ3A8GP，F30四次相关尝试，末试T1—T6。账本：silent-0128, silent-0079。来源任务：experience-update；实现任务：strategy-proposal。

支持事实：末试睡层3/2/1，T4醒来0力量/18攻击，T5力量2、尖啸后−4/14攻击，T6恢复并成长到4/22攻击；末轮1血、16挡，显示完整需损6。四次尝试均未赢。

反例与限制：多扣敌血可能同时付更多玩家血价；四次失败没有完整获胜反事实，零血终态不提供未截断完整损伤。

处置：waiting。睡眠、醒来和成长端点已核；缺当前A10睡眠/伤害唤醒/眩晕/成长完整消费者验收及同抽换序完整后继，不拟合血价或固定杀序。

预期行为与验证方法：冻结自然醒来与伤害唤醒各自状态，验证期限及当前进阶移动；完整受控后继不足时保留原排序。 本批不拟合新常数，不改变当前出牌、药水、SL或终局规则。若后续实现，须以源码撤除失败/恢复通过、原沙箱检查及实际live消费者验收闭环；不能用已有子项关闭整条要求。

原提案保留副本：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-063524/learner/runs/20261014-063554-strategy-proposal/silent-proposal-bddfa690a84e03d0.md；SHA256：b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780。原路径：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md。本批源码提交：无；整项实际live实现提交：未证明，不登记implemented/duplicate/shipped。
