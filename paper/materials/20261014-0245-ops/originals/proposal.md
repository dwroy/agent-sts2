# 静默猎手本批十项策略提案复核

时间：2026-10-14 02:29:30 CST。批次：20261014-021302-strategy-proposal。base：179205a84dd5a10e63b5f332b0a680d339d7e8a9。

本批只处理派发的十个原ID；没有research_request、implementation_request或proposal_repair，不承接其他专题，不扩队列。10份原Markdown逐字节匹配原SHA并保存；不改原文、不重复登记ID。已知事实只来自六个SILENT A10局及原账本，不用其他角色知识或预训练结论。

原规则保留：不更改HP护栏、药水持有价格/预算、SL范围、成长权重、固定focus、终局价值。Roy授权足以实现有据改动；本批缺的是原提案剩余范围的核验与可隔离源码差额，并非待审批。局部确定性模型准确性不要求先证明胜率，未选整场反事实仅用于拟合权重或宣称策略收益。

## silent-proposal-89354805ee4d7e77

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md；SHA256：ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d。
来源任务：postmortem；实现任务：strategy-proposal；角色silent，A10。
证据：VLZ6CCT8AQ0A F35 T1、F43 T1—T5、F45 T1。账本：silent-0237、silent-0238。

本批核对：F35能量7→5；F43同后续牌序43伤/14损→51伤/13损。当前同线、已知抽牌及萎靡升级已有固定消费者验证；实际施放参考仍为null。

处置：waiting。缺本战实际施放的持续身份链：跨抽牌、选择/药水中断、SL、换战与进程接续。当前候选字段actual_cast_this_fight=null；已有升级子实现不足以关闭包含实际施放分账的原提案。

反例与限制：F43施放后仍损57，F45未施放后败；战斗/构筑/资源不同，不能证明必打或胜负因果。

预期行为及验证：下一次实现应冻结实际派发身份与后帧，验证施放确证、换战/SL清除和接续不串局；未知或中断不能按持有推定施放。

当前不拟合常数或改变选择；这些历史样本均已用于发现/回归，不称盲测，SL按run_id归组。需要后续新局的部分按结束时间后移，缺样本保留未知。后续真实源码修正须固定数据撤源码失败、恢复通过及原沙箱入口；本批无源码撤除/恢复实验。回退：本批无生产变更可回退，原提案/账本历史保留；后续实现回退其实际源码提交，原证据与失败不删除。

## silent-proposal-f2bfceddb1898dca

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md；SHA256：fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26。
来源任务：postmortem；实现任务：strategy-proposal；角色silent，A10。
证据：VLZ6CCT8AQ0A F43 T1—T5、F44、F45 T1/T4/T5。账本：silent-0106、silent-0019、silent-0201。

本批核对：历史首问药水MC707ms/1样本、rollout退化到1轮；实喝痊愈药水67HP不变、能量1→2。末32HP/20挡对59攻击，显示缺7HP；三敌均存活。

处置：waiting。缺同起点、相同覆盖与相同总预算的固定随机输入池对照，以及候选稳定性/MC收益随预算曲线；历史dirty源码和模型缺口未被完整重建，不能把退化样本拟合成新预算、药价或HP护栏。

反例与限制：F17/F33首试胜，F45未实打的31损/32伤线不能认作胜线；只更改算力不能消除模型偏差。

预期行为及验证：先冻结种子、采样输入池及完整模型覆盖，在同总预算比较原分配与候选分配；报告有效样本和候选稳定性，不用沙箱用时拟合生产常数。

当前不拟合常数或改变选择；这些历史样本均已用于发现/回归，不称盲测，SL按run_id归组。需要后续新局的部分按结束时间后移，缺样本保留未知。后续真实源码修正须固定数据撤源码失败、恢复通过及原沙箱入口；本批无源码撤除/恢复实验。回退：本批无生产变更可回退，原提案/账本历史保留；后续实现回退其实际源码提交，原证据与失败不删除。

## silent-proposal-283a164780d11e69

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md；SHA256：78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637。
来源任务：experience-update；实现任务：strategy-proposal；角色silent，A10。
证据：VLZ6CCT8AQ0A F35 T1、F43 T1—T5、F45 T1。账本：silent-0237、silent-0238。

本批核对：同89354805原来源，但有独立experience-update链接silent-apotheosis-combat-upgrades；两份原文SHA分别核实。

处置：waiting。与89354805同源的经验链接，仍缺实际施放、中断、SL/换战/接续分账的完整消费者；不能把同源或已有局部升级实现登记为整项duplicate。

反例与限制：场外deck升级数仍4；战内升级和永久锻造不能互换。

预期行为及验证：沿原两ID共同核同一实现，不新建重复ID；分别保留postmortem和experience-update账本链，按89354805验证实际施放身份。

当前不拟合常数或改变选择；这些历史样本均已用于发现/回归，不称盲测，SL按run_id归组。需要后续新局的部分按结束时间后移，缺样本保留未知。后续真实源码修正须固定数据撤源码失败、恢复通过及原沙箱入口；本批无源码撤除/恢复实验。回退：本批无生产变更可回退，原提案/账本历史保留；后续实现回退其实际源码提交，原证据与失败不删除。

## silent-proposal-ebbfe3b97548756d

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md；SHA256：08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2。
来源任务：experience-update；实现任务：strategy-proposal；角色silent，A10。
证据：VLZ6CCT8AQ0A F43 T1—T5、F45 T3/T5、各场资源首末。账本：silent-0005、silent-0016、silent-0049、silent-0071、silent-0143、silent-0046、silent-0053、silent-0027、silent-0011、silent-0021、silent-0106、silent-0204、silent-0020、silent-0019。

本批核对：十五条子经验包括力量/敏捷、口红、覆甲、勒紧、毒结算和休息/路线。F45现有敏3配后空翻8、防御12、共20挡，覆甲已0；尖啸后总攻击59。

处置：waiting。十五子机制尚缺逐项冻结生产调用、状态期限及路线/休息消费者验收。本批核实的升级、局部攻防和原资源事实没有暴露可隔离的新源码差额；不能用这些子项关闭全部十五项或拟合统一权重。

反例与限制：F43赢仍损57，F44回血到67后下一战败；高血、已持有成长组件和当轮减力都不保证整场收益。

预期行为及验证：建立十五项逐源矩阵：固定手牌/能力/敌人当前进阶/期限/消费者，各条分别比较预测与实盘；神化由其原提案负责，已覆盖项保持行为。

当前不拟合常数或改变选择；这些历史样本均已用于发现/回归，不称盲测，SL按run_id归组。需要后续新局的部分按结束时间后移，缺样本保留未知。后续真实源码修正须固定数据撤源码失败、恢复通过及原沙箱入口；本批无源码撤除/恢复实验。回退：本批无生产变更可回退，原提案/账本历史保留；后续实现回退其实际源码提交，原证据与失败不删除。

## silent-proposal-e5b87be50f28f311

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md；SHA256：5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709。
来源任务：postmortem；实现任务：strategy-proposal；角色silent，A10。
证据：8JRE1C4H4Z2W F17 T6、F33首/三试T2、第二试T5、末试T11。账本：silent-0079、silent-0021、silent-0125、silent-0018。

本批核对：同指纹首/三试T2实付3/15HP、扣10/17敌血；第三试同问原线死亡0/24、替换5/24。全局659决策/676状态进入当前离线消费者，113片段/44整轮端点，完整候选结果均null。

处置：waiting。当前单步审计及离线端点已覆盖，但113个选线片段均actual_full_candidate_result=null，31片段被新题中断。缺在线持续候选身份、完整执行判定及跨中断/SL/重问消费者，不能用44整轮端点关闭原宽审计或修改成长/SL偏好。

反例与限制：末试防御线延至T11仍败，不能将所有保血替换认作错。末5→0为净损5，37攻击−22挡=15只是显示参考；不是已观察未截断伤害。

预期行为及验证：保留各选择阶段机器身份与所有单步回执；新题/选牌/药水使原候选中断；冻结完整调用并检验完整执行与中断的不同判定，独立新局再验策略效果。

当前不拟合常数或改变选择；这些历史样本均已用于发现/回归，不称盲测，SL按run_id归组。需要后续新局的部分按结束时间后移，缺样本保留未知。后续真实源码修正须固定数据撤源码失败、恢复通过及原沙箱入口；本批无源码撤除/恢复实验。回退：本批无生产变更可回退，原提案/账本历史保留；后续实现回退其实际源码提交，原证据与失败不删除。

## silent-proposal-49632bc4878fb597

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md；SHA256：aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2。
来源任务：experience-update；实现任务：strategy-proposal；角色silent，A10。
证据：CA5KE8GFJ9X2 F13 T1—T5（重点T5）。账本：silent-0005、silent-0231。

本批核对：蚌加压后的力量4/8与虚弱后喷水11/14均保留；末2HP/10挡对14攻击。该局未取得并建立计划中的步法。

处置：waiting。本局没有建立步法，不能用该盘补出敏捷路径；力量、敏捷、虚弱与独立成长四路径的同范围生产消费者对照尚未完整冻结核验。已有敏捷/神化子测试不证明复合经验全部实现，未据败局发现新的确定公式差额。

反例与限制：虚弱未取消下次加压，计划牌不能补记为已取得属性。

预期行为及验证：分别冻结有/无已建立属性的实盘输入，逐击力量、逐牌敏捷与未来成长分列；不添加统一保血/输出权重。

当前不拟合常数或改变选择；这些历史样本均已用于发现/回归，不称盲测，SL按run_id归组。需要后续新局的部分按结束时间后移，缺样本保留未知。后续真实源码修正须固定数据撤源码失败、恢复通过及原沙箱入口；本批无源码撤除/恢复实验。回退：本批无生产变更可回退，原提案/账本历史保留；后续实现回退其实际源码提交，原证据与失败不删除。

## silent-proposal-66532328a585941f

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md；SHA256：56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831。
来源任务：experience-update；实现任务：strategy-proposal；角色silent，A10。
证据：5PM6JAQG6FNQ F33、F39末试T2/T4。账本：silent-0021、silent-0009。

本批核对：原decision268455精确expect.card.id=BUBBLE_BUBBLE，目标THE_LOST在匹配原帧无毒；持有两步法不等于末试正4敏捷，T4仍为−2。

处置：waiting。局部冒泡零毒目标事实已核；缺同HP、牌组、药水、完整抽序下不同启动顺序的整场受控对照和可复现收益函数。F33已建毒组件的胜战与F39败战不是同盘实验，不据此加构筑/启动权重。

反例与限制：F33已建毒雾/触媒/群蛇并胜；组件、生存和敌人同时改变，无法单归因。

预期行为及验证：持有、计划、实际建立分别保存；仅在受控全场样本和后置验证允许时拟合启动收益，当前保持原行为。

当前不拟合常数或改变选择；这些历史样本均已用于发现/回归，不称盲测，SL按run_id归组。需要后续新局的部分按结束时间后移，缺样本保留未知。后续真实源码修正须固定数据撤源码失败、恢复通过及原沙箱入口；本批无源码撤除/恢复实验。回退：本批无生产变更可回退，原提案/账本历史保留；后续实现回退其实际源码提交，原证据与失败不删除。

## silent-proposal-43a76a31ba7bdcfa

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md；SHA256：f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c。
来源任务：experience-update；实现任务：strategy-proposal；角色silent，A10。
证据：61E2QS63Y9WU F17 T5/T6/T7。账本：silent-0030、silent-0027。

本批核对：吸取后玩家力2→0、敏0→−2；T6双防御各3，毒17+16继续结算，敌方临时减力与下一轮恢复分列。本战首试获胜。

处置：waiting。本战首试胜；缺同资源/完整抽序的可救活另一SL线路及完整进阶移动调用对照，无法据胜战修改SL范围或换线偏好。吸取/负敏捷/毒的局部端点不是完整SL消费者证明。

反例与限制：首试60血七轮胜，不支持把其他局同抽失败归于固定顺序。

预期行为及验证：冻结吸取前后属性和毒触发输入逐项核模型；如拟改SL需同盘完整抽序、未选路径后继与按局分组的时间后置验证。

当前不拟合常数或改变选择；这些历史样本均已用于发现/回归，不称盲测，SL按run_id归组。需要后续新局的部分按结束时间后移，缺样本保留未知。后续真实源码修正须固定数据撤源码失败、恢复通过及原沙箱入口；本批无源码撤除/恢复实验。回退：本批无生产变更可回退，原提案/账本历史保留；后续实现回退其实际源码提交，原证据与失败不删除。

## silent-proposal-5264153a4a4b0e5c

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md；SHA256：b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02。
来源任务：experience-update；实现任务：strategy-proposal；角色silent，A10。
证据：61E2QS63Y9WU F23 T1—T5（重点T4）。账本：silent-0039、silent-0209。

本批核对：幻象21血召入；两次航行后现场力量3/6，T4幻象仍2血并攻击15，T5才退场。47伤/15损为本体focus已执行观测。

处置：waiting。仍缺本次A10召唤、航行成长、幻象复生联动的完整冻结生产模拟调用，以及另一focus的完整后继；本局结束前未复生，不能以旧召唤子项或T4单轮兑现证明目标排序整场收益。

反例与限制：39伤/零损的幻象focus候选未实打；本局未见再次复生，不能补造复生实验。

预期行为及验证：按实体保存当前HP/攻击/成长，冻结当前进阶调用与复生证据；保留全部合法目标、相同推演值并列，不加固定首杀。

当前不拟合常数或改变选择；这些历史样本均已用于发现/回归，不称盲测，SL按run_id归组。需要后续新局的部分按结束时间后移，缺样本保留未知。后续真实源码修正须固定数据撤源码失败、恢复通过及原沙箱入口；本批无源码撤除/恢复实验。回退：本批无生产变更可回退，原提案/账本历史保留；后续实现回退其实际源码提交，原证据与失败不删除。

## silent-proposal-bddfa690a84e03d0

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md；SHA256：b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780。
来源任务：experience-update；实现任务：strategy-proposal；角色silent，A10。
证据：DUZUBAJ3A8GP F30四试，末试T1—T6。账本：silent-0128、silent-0079。

本批核对：睡3/2/1后T4醒且覆甲消失；T5尖啸力2→−4/攻击14，T6恢复且成长至4/攻击22；末1HP/16挡仍败。

处置：waiting。四次相关尝试均败，缺同抽换序的完整受控后继及醒来/眩晕/当前进阶成长的全链消费者核验；本批无独立胜线或可拟合血价样本，不设固定杀序/新SL权重。

反例与限制：末试T4比首试多扣3敵HP亦多损2玩家HP，单看输出不是整场收益；SL尝试不增独立局数。

预期行为及验证：冻结睡层、真实失血、眩晕期限、成长和当前进阶招式依赖，逐回合核未来攻击；再用同抽完整后继验证候选排序。

当前不拟合常数或改变选择；这些历史样本均已用于发现/回归，不称盲测，SL按run_id归组。需要后续新局的部分按结束时间后移，缺样本保留未知。后续真实源码修正须固定数据撤源码失败、恢复通过及原沙箱入口；本批无源码撤除/恢复实验。回退：本批无生产变更可回退，原提案/账本历史保留；后续实现回退其实际源码提交，原证据与失败不删除。
