# 本批十项策略提案复核

角色 silent；已观察范围仅本批六个 A10 完局。batch=20261021-181310-strategy-proposal；base=7c560c9afad6b08a45fd9ef65edb1ff44dbbff1c。
本文件是已领取提案的本批处置记录，不新增或改写原提案，不登记新代码提案id。原始Markdown已按队列SHA从保留归档选择性读回，见 proposal-original-paths.json 和十个 *.original.md。
没有足够新证据支持策略常量、必打牌、药水/SL/终局或目标顺序变更；所有现有行为保留。本批没有生产实现，无需回退生产源码。

## silent-proposal-89354805ee4d7e77

原提案：按静默已观测帧补齐神化在同线及后续抽牌中的升级传播，并区分持有、施放与模型覆盖；无整场转胜保证。
证据：VLZ6CCT8AQ0A F43 T1→T2、F45 T1；decisions 269706/269707/269748/269754。
账本：silent-0237, silent-0238。
原任务：postmortem → strategy-proposal；源Markdown SHA256=ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d。
本批处置：waiting。神化已有限定升级传播和候选事实展示，actual_cast_this_fight仍为null；缺跨抽牌、弃牌选择、药水重规划、SL及换战的持续施放身份和完整消费者校准，不能将局部实现登记为整项duplicate。
预期行为：保持原实现与所有合法选项，不额外加权，不按持有预支已施放或整战收益。
验证入口：covered-questions.json 的完整原题与decision原行，question-state-windows.json 的精确观测指纹窗口，raw-readback-verification.json 的 offset/bytes/SHA。后续实现须冻结缺少的输入、分离发现/时间后置验证，撤源码失败/恢复通过并完成原沙箱套件；不能把本批已用于发现的帧当盲测。
反例/限制：以原提案原文及本批report.md逐项限制为准；未选候选没有实际整场后继，不以败局证明另一线会赢。

## silent-proposal-f2bfceddb1898dca

原提案：核验三骑士全败候选的即时血价、击杀缺口与药水MC预算成熟度；先做同盘预算实验，缺对照时保留原护栏、留药与目标规则。
证据：VLZ6CCT8AQ0A F45 T1；decisions 269748/269754。
账本：silent-0106, silent-0019, silent-0201。
原任务：postmortem → strategy-proposal；源Markdown SHA256=fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26。
本批处置：waiting。F45 T1原文确认药水MC耗707ms、只完成1/12样本且rollout退化；后问12/12是不同手牌起点。缺同起点、同随机池、同总预算的分配对照及成熟度曲线，不拟合新预算常量、药水血价或护栏阈值。
预期行为：保持原实现与所有合法选项，不额外加权，不按持有预支已施放或整战收益。
验证入口：covered-questions.json 的完整原题与decision原行，question-state-windows.json 的精确观测指纹窗口，raw-readback-verification.json 的 offset/bytes/SHA。后续实现须冻结缺少的输入、分离发现/时间后置验证，撤源码失败/恢复通过并完成原沙箱套件；不能把本批已用于发现的帧当盲测。
反例/限制：以原提案原文及本批report.md逐项限制为准；未选候选没有实际整场后继，不以败局证明另一线会赢。

## silent-proposal-283a164780d11e69

原提案：神化已观察升级进入同方案与后续抽牌，保留未知边界，不定必打规则
证据：VLZ6CCT8AQ0A F43 T1→T2、F45 T1；decisions 269706/269707/269748/269754。
账本：silent-0237, silent-0238。
原任务：experience-update → strategy-proposal；源Markdown SHA256=78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637。
本批处置：waiting。与89354805同源的神化经验链，局部升级传播不等于实际本战持续施放跟踪；缺完整升级交互及重规划后消费者校准。保留原经验链，不重复创建提案或仅因同源而登记duplicate。
预期行为：保持原实现与所有合法选项，不额外加权，不按持有预支已施放或整战收益。
验证入口：covered-questions.json 的完整原题与decision原行，question-state-windows.json 的精确观测指纹窗口，raw-readback-verification.json 的 offset/bytes/SHA。后续实现须冻结缺少的输入、分离发现/时间后置验证，撤源码失败/恢复通过并完成原沙箱套件；不能把本批已用于发现的帧当盲测。
反例/限制：以原提案原文及本批report.md逐项限制为准；未选候选没有实际整场后继，不以败局证明另一线会赢。

## silent-proposal-ebbfe3b97548756d

原提案：逐源验证当前攻防、毒触发与持续资源，不从持有或单轮减力预支整场收益
证据：VLZ6CCT8AQ0A F43 T1→T2、F45 T1；decisions 269706/269707/269748/269754；其余十五机制窗口未全读。
账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。
原任务：experience-update → strategy-proposal；源Markdown SHA256=08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2。
本批处置：waiting。十五机制提案本批仅复核神化、临时减力、负敏捷、毒及资源局部端点；缺其余属性/期限/升级交互与战斗、路线、休息消费者的完整联合校准，不把整包标成已实现。
预期行为：保持原实现与所有合法选项，不额外加权，不按持有预支已施放或整战收益。
验证入口：covered-questions.json 的完整原题与decision原行，question-state-windows.json 的精确观测指纹窗口，raw-readback-verification.json 的 offset/bytes/SHA。后续实现须冻结缺少的输入、分离发现/时间后置验证，撤源码失败/恢复通过并完成原沙箱套件；不能把本批已用于发现的帧当盲测。
反例/限制：以原提案原文及本批report.md逐项限制为准；未选候选没有实际整场后继，不以败局证明另一线会赢。

## silent-proposal-e5b87be50f28f311

原提案：静默A10同盘SL以12血换7伤重犯：补齐Jev原答、HP护栏、SL换线及重规划的候选代价与实际成长兑现审计；单局不足以改阈值，保留现行为并独立验证。
证据：8JRE1C4H4Z2W F33 首/第三试 T2→T3；decisions 270216/270282。
账本：silent-0079, silent-0021, silent-0125, silent-0018。
原任务：postmortem → strategy-proposal；源Markdown SHA256=5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709。
本批处置：waiting。沙虫F33首试与第三试T2指纹相同；原答均plan1，第三试SL换线实付额外12血、仅多扣7敌血。现有审计仍把候选与单动作回执分开且actual_turn/whole_plan_executed为null，缺跨重规划的持续候选归属和全过程生产校准。
预期行为：保持原实现与所有合法选项，不额外加权，不按持有预支已施放或整战收益。
验证入口：covered-questions.json 的完整原题与decision原行，question-state-windows.json 的精确观测指纹窗口，raw-readback-verification.json 的 offset/bytes/SHA。后续实现须冻结缺少的输入、分离发现/时间后置验证，撤源码失败/恢复通过并完成原沙箱套件；不能把本批已用于发现的帧当盲测。
反例/限制：以原提案原文及本批report.md逐项限制为准；未选候选没有实际整场后继，不以败局证明另一线会赢。

## silent-proposal-49632bc4878fb597

原提案：把当前属性、每击修正、弱与成长分项验证，不增加统一保血或输出权重。
证据：CA5KE8GFJ9X2 F13 T4→T5；decision 267377；原提案T5后段本次未完整复核。
账本：silent-0005, silent-0231。
原任务：experience-update → strategy-proposal；源Markdown SHA256=aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2。
本批处置：waiting。蚌F13 T4→T5力量4→8、弱消失后19攻击；已读当前属性与双防御到手帧，但本局没有取得计划步法的正敏捷施放对照。缺力量、敏捷、弱、独立成长四路径同时冻结的实际消费者输入及联合校准。
预期行为：保持原实现与所有合法选项，不额外加权，不按持有预支已施放或整战收益。
验证入口：covered-questions.json 的完整原题与decision原行，question-state-windows.json 的精确观测指纹窗口，raw-readback-verification.json 的 offset/bytes/SHA。后续实现须冻结缺少的输入、分离发现/时间后置验证，撤源码失败/恢复通过并完成原沙箱套件；不能把本批已用于发现的帧当盲测。
反例/限制：以原提案原文及本批report.md逐项限制为准；未选候选没有实际整场后继，不以败局证明另一线会赢。

## silent-proposal-66532328a585941f

原提案：持有/计划/已建立分账；如提构筑或启动权重，先做实盘兑现与受控整场验证。
证据：5PM6JAQG6FNQ F39 第二试（末试）T2→T3；decision 268455。
账本：silent-0021, silent-0009。
原任务：experience-update → strategy-proposal；源Markdown SHA256=56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831。
本批处置：waiting。F39末试T2向无毒失落打冒泡，能量5→4且目标HP/毒不变；随后出现额外被动伤害及后抽，不能把整轮效果全归最初候选。缺同HP、构筑、药水及完整抽序的启动顺序整场配对，不拟合启动权重。
预期行为：保持原实现与所有合法选项，不额外加权，不按持有预支已施放或整战收益。
验证入口：covered-questions.json 的完整原题与decision原行，question-state-windows.json 的精确观测指纹窗口，raw-readback-verification.json 的 offset/bytes/SHA。后续实现须冻结缺少的输入、分离发现/时间后置验证，撤源码失败/恢复通过并完成原沙箱套件；不能把本批已用于发现的帧当盲测。
反例/限制：以原提案原文及本批report.md逐项限制为准；未选候选没有实际整场后继，不以败局证明另一线会赢。

## silent-proposal-43a76a31ba7bdcfa

原提案：冻结吸取、负敏捷与毒的分项事实；任何SL范围或换线偏好需完整同盘验证。
证据：61E2QS63Y9WU F17 T6→T7；decision 267612；T5吸取原文未另读。
账本：silent-0030, silent-0027。
原任务：experience-update → strategy-proposal；源Markdown SHA256=f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c。
本批处置：waiting。族母F17 T6两防御分别加3挡，尖啸临时减6力，实毒33、净损8；这条已选线并不提供另一完整SL线路。缺同起始血量/构筑/抽序的另一整场线路，不据首试胜改SL范围或阈值。
预期行为：保持原实现与所有合法选项，不额外加权，不按持有预支已施放或整战收益。
验证入口：covered-questions.json 的完整原题与decision原行，question-state-windows.json 的精确观测指纹窗口，raw-readback-verification.json 的 offset/bytes/SHA。后续实现须冻结缺少的输入、分离发现/时间后置验证，撤源码失败/恢复通过并完成原沙箱套件；不能把本批已用于发现的帧当盲测。
反例/限制：以原提案原文及本批report.md逐项限制为准；未选候选没有实际整场后继，不以败局证明另一线会赢。

## silent-proposal-5264153a4a4b0e5c

原提案：复验已有召唤和各实体成长；保留所有目标选项，相同推演值并列，不强制首杀。
证据：61E2QS63Y9WU F23 T4→T5；decision 267696。
账本：silent-0039, silent-0209。
原任务：experience-update → strategy-proposal；源Markdown SHA256=b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02。
本批处置：waiting。胧光F23 T4本体候选47伤/损15与状态一致，幻象余2仍攻击，T5两实体力量6。缺召唤、航行、复活及当前进阶成长全链校准和另一focus完整后继，不能由单轮数值证明固定杀序收益。
预期行为：保持原实现与所有合法选项，不额外加权，不按持有预支已施放或整战收益。
验证入口：covered-questions.json 的完整原题与decision原行，question-state-windows.json 的精确观测指纹窗口，raw-readback-verification.json 的 offset/bytes/SHA。后续实现须冻结缺少的输入、分离发现/时间后置验证，撤源码失败/恢复通过并完成原沙箱套件；不能把本批已用于发现的帧当盲测。
反例/限制：以原提案原文及本批report.md逐项限制为准；未选候选没有实际整场后继，不以败局证明另一线会赢。

## silent-proposal-bddfa690a84e03d0

原提案：按当前进阶、睡眠/眩晕/成长分别验证；不把未知换线胜率或固定杀序写成规则。
证据：DUZUBAJ3A8GP F30 第四试T4→T5；decision 269062；T6及17/22挡争议窗口未重读。
账本：silent-0128, silent-0079。
原任务：experience-update → strategy-proposal；源Markdown SHA256=b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780。
本批处置：waiting。熟睡甲虫F30末试T4原答plan2被SL换成plan3，随后另打带毒刺击和小刀，整轮不等于原候选；T5玩家1血、甲虫71血/2力/20攻。缺睡眠/唤醒眩晕/成长全链及同抽换序完整后继；既有17挡题面与22挡实盘异议本次未重审，保持未解决。
预期行为：保持原实现与所有合法选项，不额外加权，不按持有预支已施放或整战收益。
验证入口：covered-questions.json 的完整原题与decision原行，question-state-windows.json 的精确观测指纹窗口，raw-readback-verification.json 的 offset/bytes/SHA。后续实现须冻结缺少的输入、分离发现/时间后置验证，撤源码失败/恢复通过并完成原沙箱套件；不能把本批已用于发现的帧当盲测。
反例/限制：以原提案原文及本批report.md逐项限制为准；未选候选没有实际整场后继，不以败局证明另一线会赢。

