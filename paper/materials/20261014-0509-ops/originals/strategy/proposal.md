# 静默猎手：本批十项派发提案的证据、消费者与处置

记录时间：2026-10-14 04:56:19 CST（写入前已执行date）。
任务strategy-proposal；角色silent；batch=20261014-044302-strategy-proposal；base=7ee7ce97efb40bdd8cbcf88746ac9f426f55c357。

本批只处理learn.json领取的十个proposal_ids，全部保留原id。开工git status为空；普通批次按要求git merge --no-edit main，初始be4664e730a7a3b6e1965c36cc8e4fc2e62498b3快进至上述base，仅吸收两项运维记录文件。没有research_request、implementation_request或proposal_repair；reason=proposal且有proposal_ids，不满足纯专题条件。根deck-size请求绑定其他批次，不读取它的研究正文或其他专题。十份原Markdown存在且SHA与专用队列逐项一致，原字节保存为各id的.original.md。

## 范围、可核事实与未知

六局runs.jsonl均为SILENT、A10。日志只读；冻结截至2026-10-07T08:25:00Z的这六局原决策3306条、状态3432帧。每条保存原物理行号、字节offset/length与含换行原行SHA；再次直接从原日志对应字节读回，6738条全部一致。日志整体持续追加不影响这些历史范围。38项原帧数值、来源、分母及已有消费者未知字段检查通过，见proof.json；这些是证据核验，不能填成生产测试或cases=38。

| 局号 | 原决策 | 状态 | 候选片段 | 可核整轮端点 | unknown轮窗 |
|---|---:|---:|---:|---:|---:|
| CA5KE8GFJ9X2 | 265 | 282 | 41 | 0 | 46 |
| 61E2QS63Y9WU | 443 | 462 | 63 | 14 | 59 |
| 5PM6JAQG6FNQ | 638 | 660 | 83 | 25 | 76 |
| DUZUBAJ3A8GP | 602 | 623 | 77 | 28 | 68 |
| VLZ6CCT8AQ0A | 699 | 729 | 99 | 10 | 97 |
| 8JRE1C4H4Z2W | 659 | 676 | 113 | 44 | 67 |

六局原始记录均属于发现/复核样本，不作独立盲测；SL尝试不扩大来源局分母。19个关联经验条目均在knowledge/characters/silent中找到，经验库较宽历史范围不当本批跨进阶验证。没有读取其他角色私有知识，没有从预训练游戏知识填未知数值。

当前离线消费者对完整输入的三局返回入口身份错误：五条map/route-change元数据没有decision_id（267143、267517、268789、268818、268864）。原行与拒绝原因保存在frozen-decisions.jsonl、audit-summary.json及audit-evidence.log。仅对有界动作审计输入排除这些非动作记录，不编造id、不重排行号；3301条动作均唯一匹配状态时间及指纹。消费者关联476候选片段、121整轮端点、413个unknown轮窗，完整候选结果、完整未截断入伤和因果归属仍null。零认证字段是现有输出能力限制，不是“实际从未完整执行候选”的频率结论。普通战斗sl_attempt=null及首轮/终态/缺连续边界会使工具留unknown，原始端点可观察的数值仍另列。

预算方案没有同总预算/同随机输入池对照；目标、启动和SL取舍没有可比较的完整后继。当前不能隔离出足以新增策略常量或给宽提案完整验收的证据。因此以下十项全部waiting；不会以已有局部实现冒称整项duplicate。

## 1. silent-proposal-89354805ee4d7e77：神化升级传播与本战实际施放

来源任务：postmortem → strategy-proposal；本批实现任务：20261014-044302-strategy-proposal。
账本：silent-0237、silent-0238；原经验：原复盘提案。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md；SHA256=ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d。

证据局号/层/回合：VLZ6CCT8AQ0A，A10，F35/F43/F45 T1；F43 T2后续抽牌。
已核：decisions269706/269707与states275679/275680/275687核实：神化实际派发身份为APOTHEOSIS，能量7→5；五张已观察手牌升级。同一后续牌序预测43伤/14损，重问后51伤/13损；敌254→203、玩家90→77。T2抽到升级毒雾。F45药水后生存者/弃牌阶段states275731→275732手牌2→0，持有神化未兑现为本战升级。

反例及限制：F43施放神化仍全战损57；F45未施放而敗。敌人、资源、抽序不同，不能证明神化决定胜负或必须先打。
旧行为及预期增量：保留已实见普通/升级配对传播及未知覆盖标记；将持有、候选施放、模拟升级和经后帧核实的本战实际施放分列。禁止由当前升级牌、持有或弃置反推实际施放。
验证方法与缺数据：固定成功派发及后帧、抽牌、选牌、药水、SL恢复、换战、进程接续的身份链，验证旧尝试/旧战状态不会继承。本批对五帧调用现有silentApotheosisReference，actual_cast_this_fight仍全部null，未构成完整生命周期消费者验收。

处置waiting：已有神化升级子实现，但实际施放与抽牌、选牌、药水、SL恢复、换战、进程接续的持续身份及消费者验收未补齐；固定五帧读回actual_cast_this_fight均为null，不能给宽项标duplicate。
本批未实现源码；不拟合额外常量。以后若有已核缺口，须保存固定输入，在撤对应生产源码时失败、恢复后通过，再按原沙箱及live流程验收。回退对象仅为未来真实源码提交，本次无源码回退对象；原证据/反例/失败/账本/提案持续保留。Roy-2026-10-07-learning是修改授权，不提供游戏事实，也不将原人定规则作为无法修改的理由。

## 2. silent-proposal-f2bfceddb1898dca：药水MC与非药候选的同预算比较

来源任务：postmortem → strategy-proposal；本批实现任务：20261014-044302-strategy-proposal。
账本：silent-0106、silent-0019、silent-0201；原经验：原复盘提案。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md；SHA256=fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26。

证据局号/层/回合：VLZ6CCT8AQ0A，A10，F43/F44资源接续，F45 T1/T4/T5。
已核：decision269748药水MC耗707ms，rollout为horizon1/samples1/best=null；269754派发CURE_ALL。269770选24伤/13损线，攻击候选32伤/31损未实打。states275754显示32血20挡，三敌攻击14+11+34=59，完整未挡39、差7；275755三敌21/80/77血，均未退场。

反例及限制：F17/F33本局首试获胜，不能从末战退化弃用全部推演；全败并列与best=null缺比较不同，局部药水抽样成熟不代表完整胜负。
旧行为及预期增量：保留现有预算、护栏、药价及目标选择。分列推演范围、时间、样本、明确并列、各敌击杀缺口和实际抽牌；预算方案只作待验证对照。
验证方法与缺数据：相同起点、模型覆盖、总预算和冻结随机输入池下比较MC先行与分阶段预算，记录样本随预算曲线及候选稳定性。先核模型覆盖，不能以707ms孤例硬设常数。现有simulation_reference只提供诊断，未提供该配对实验。

处置waiting：缺同起点、同模型覆盖、同总预算及同固定随机输入池的MC先行/分阶段预算配对实验与候选稳定性曲线；原退化题和未选线不能校准预算、药价或护栏。
本批未实现源码；不拟合额外常量。以后若有已核缺口，须保存固定输入，在撤对应生产源码时失败、恢复后通过，再按原沙箱及live流程验收。回退对象仅为未来真实源码提交，本次无源码回退对象；原证据/反例/失败/账本/提案持续保留。Roy-2026-10-07-learning是修改授权，不提供游戏事实，也不将原人定规则作为无法修改的理由。

## 3. silent-proposal-283a164780d11e69：神化经验来源的独立提案链接

来源任务：experience-update → strategy-proposal；本批实现任务：20261014-044302-strategy-proposal。
账本：silent-0237、silent-0238；原经验：silent-apotheosis-combat-upgrades。
原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md；SHA256=78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637。

证据局号/层/回合：VLZ6CCT8AQ0A，A10，F35/F43/F45 T1与F43后续抽牌；与第1项同源。
已核：独立source_task=experience-update，关联silent-apotheosis-combat-upgrades与silent-0237/0238。原Markdown和队列指纹各自核实，不能因为与postmortem同源就丢弃这个派发id。原帧数值及消费者读回与第1项相同，不增加独立样本。

反例及限制：第1项的施放仍损血、未施放敗局及缺整场对照同样适用；四次施放仍是一来源局。
旧行为及预期增量：沿原id保留经验/账本/任务链接，复用已有升级子项；在实际施放及持续身份消费者完成后才按真实live源码登记整项处置。
验证方法与缺数据：按第1项的完整固定输入矩阵验证，保留独立经验来源链接；同源不等同整项已有实现，不新增重复id。

处置waiting：独立经验链接与89354805同源，实际施放、SL恢复、换战与接续消费者仍缺；已有升级子项不证明完整提案duplicate，保留原id待补证。
本批未实现源码；不拟合额外常量。以后若有已核缺口，须保存固定输入，在撤对应生产源码时失败、恢复后通过，再按原沙箱及live流程验收。回退对象仅为未来真实源码提交，本次无源码回退对象；原证据/反例/失败/账本/提案持续保留。Roy-2026-10-07-learning是修改授权，不提供游戏事实，也不将原人定规则作为无法修改的理由。

## 4. silent-proposal-ebbfe3b97548756d：十五项攻防、持续资源及路线/休息分账

来源任务：experience-update → strategy-proposal；本批实现任务：20261014-044302-strategy-proposal。
账本：silent-0005、silent-0016、silent-0049、silent-0071、silent-0143、silent-0046、silent-0053、silent-0027、silent-0011、silent-0021、silent-0106、silent-0204、silent-0020、silent-0019；原经验：silent-strength-weak-observation、silent-footwork-block、silent-gorget-plating、silent-vajra-opening-strength、silent-sparkling-rouge-turn-three、silent-fasten-defend-extra-block、silent-piercing-wail-temporary-strength、silent-malaise-x-debuff、silent-accelerant-triggers、silent-noxious-fumes-growth、silent-deck-burst-observation、silent-three-knights-output-buffer-observation、silent-stone-humidifier-rest-growth、silent-rest-buffer-observation、silent-route-hp-observation。
原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md；SHA256=08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2。

证据局号/层/回合：VLZ6CCT8AQ0A，A10，F43 T1/T2/T3/T4/T5、F45 T1/T3/T5、F44休息；原经验历史范围不当本批跨进阶证据。
已核：原提案十五经验链接全部保留。F43升级/抽牌、F45现场力量/敏捷/勒紧/覆甲与临时减力应按各来源及期限分列。F45末轮32血20挡对59且三敌仍活已核。F43赢战实付57血，F44净回34至67/104仍在F45敗，实际回复和路线投影不能相互替代。

反例及限制：已建能力不保证每轮有格挡，开场覆甲不代表末轮覆甲；已有毒或回血不证明整战安全。原账本较宽历史样本数不是十五种子机制各自实验分母。
旧行为及预期增量：只在固定实帧证明数值缺口后补对应静默状态变换；神化传播复用专属项。既有诊断、逐击力量、逐牌敏捷、毒结算、暂时减力及现场覆甲保持；不统一加分、定路线安全线或规定focus。
验证方法与缺数据：逐项冻结生产调用、当前进阶数据库输入、状态期限、路线和休息选项，逐源比较实盘及消费者，形成十五项验收矩阵。已有源码及本批局部端点不替代未完成组件和消费者。

处置waiting：十五子机制缺逐项冻结生产调用、期限及路线/休息消费者的完整验收矩阵；当前仅核局部升级、现场属性、末轮威胁及资源端点，不能以某个子实现关闭整项。
本批未实现源码；不拟合额外常量。以后若有已核缺口，须保存固定输入，在撤对应生产源码时失败、恢复后通过，再按原沙箱及live流程验收。回退对象仅为未来真实源码提交，本次无源码回退对象；原证据/反例/失败/账本/提案持续保留。Roy-2026-10-07-learning是修改授权，不提供游戏事实，也不将原人定规则作为无法修改的理由。

## 5. silent-proposal-e5b87be50f28f311：SL换线血价、重问和完整候选执行审计

来源任务：postmortem → strategy-proposal；本批实现任务：20261014-044302-strategy-proposal。
账本：silent-0079、silent-0021、silent-0125、silent-0018；原经验：原复盘提案。
原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md；SHA256=5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709。

证据局号/层/回合：8JRE1C4H4Z2W，A10，F33首/第三试T2、第二试T5、末试T2/T11；原提案另含F17 T6。
已核：decisions270216/270282指纹逐字相同。states276208→276212首试损3/扣10，276274→276278第三试损15/扣17，即多12血换7当轮伤。原题未来损血均封顶47，但预测死亡0/24与5/24不同。末试T2端点276386→276390损0/扣0；第二试T5实际损4/扣25，原候选损16/扣43未完整执行。现有离线消费者关联本局113片段、44整轮端点，完整候选及因果字段仍null。

反例及限制：末试保血换线延长至T11仍敗，反对将防御替换一概判错，也不证明一律保血。前五次末轮未完整结算，六次SL仍是一局。
旧行为及预期增量：保留Jev原答、护栏、SL后线、首次派发动作和重问原因；在线持续身份应跟随实动作及后帧，抽牌、选牌、药水、SL或换战结束原候选完整执行声明。保留现有探索和阈值。
验证方法与缺数据：本批重新执行既有离线消费者并核同指纹血价；尚须在线候选持续身份/中断/后帧/建立时点的全链固定验收。单动作completed、整轮净变化和候选文字相符都不直接认证完整执行。若以后改实际选择，另做按局分组的完整对照与时间后置验证。

处置waiting：已复核同指纹额外12血换7伤及113片段/44整轮端点，但既有库仍不认证完整候选；缺在线持续身份、中断/重问、派发后帧和建立时点全链，策略变更另缺完整后继对照。
本批未实现源码；不拟合额外常量。以后若有已核缺口，须保存固定输入，在撤对应生产源码时失败、恢复后通过，再按原沙箱及live流程验收。回退对象仅为未来真实源码提交，本次无源码回退对象；原证据/反例/失败/账本/提案持续保留。Roy-2026-10-07-learning是修改授权，不提供游戏事实，也不将原人定规则作为无法修改的理由。

## 6. silent-proposal-49632bc4878fb597：力量、敏捷、虚弱与独立成长四路径

来源任务：experience-update → strategy-proposal；本批实现任务：20261014-044302-strategy-proposal。
账本：silent-0005、silent-0231；原经验：silent-strength-weak-observation。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md；SHA256=aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2。

证据局号/层/回合：CA5KE8GFJ9X2，A10，F13 T1/T3/T5；末轮states273268/273269。
已核：末轮蚌力量8，原19攻击经虚弱降14，双防御合10，玩家2血而完整需损4，死亡后敌仍16血。加压0→4→8和弱后11/14并存；弱没有停止后续成长。本局计划中的步法未取得或建立。

反例及限制：本局没有正敏捷/步法实际建立，不能补作敏捷收益样本；现场公式成立不证明统一保血或输出权重有效。
旧行为及预期增量：分列当前属性、每击修正、虚弱及下一次独立成长；缺新数值差额时保留原行为，已有步法子实现不覆盖整条复合经验。
验证方法与缺数据：冻结四路径各自已核手牌、能力、A10敌人数据库和移动输入，逐步调用生产模型比较；仍需完整四路径消费者对照，不能以其他角色或未观察正敏捷补齐。

处置waiting：CA5原帧只支持力量、虚弱和加压成长，未建立步法正敏捷；缺力量/敏捷/弱/独立成长四路径的完整冻结生产调用对照，步法子实现不能关闭复合项。
本批未实现源码；不拟合额外常量。以后若有已核缺口，须保存固定输入，在撤对应生产源码时失败、恢复后通过，再按原沙箱及live流程验收。回退对象仅为未来真实源码提交，本次无源码回退对象；原证据/反例/失败/账本/提案持续保留。Roy-2026-10-07-learning是修改授权，不提供游戏事实，也不将原人定规则作为无法修改的理由。

## 7. silent-proposal-66532328a585941f：持有、计划与已建立的持续输出

来源任务：experience-update → strategy-proposal；本批实现任务：20261014-044302-strategy-proposal。
账本：silent-0021、silent-0009；原经验：silent-deck-burst-observation。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md；SHA256=56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831。

证据局号/层/回合：5PM6JAQG6FNQ，A10，F39第二次T2；同局F33已建立能力为条件不同的对照观察。
已核：decision268455向THE_LOST派发BUBBLE_BUBBLE；states274379→274380玩家HP均29、能量5→4，目标35血/0挡/0毒不变，两敌无净扣。35是敌血，不能沿用旧备注误当玩家血。末试毒雾未建立，不把持有当实际输出。

反例及限制：同局F33雾3/触媒1/群蛇4已建立且赢，但敌人、资源和抽序也变；不是只改变启动顺序的整场实验。
旧行为及预期增量：持续分账持有、计划、已建立和已结算输出；没有完整受控收益函数不增加构筑/启动权重，也不把早施毒写成必胜规则。
验证方法与缺数据：固定HP、构筑、药水、完整抽序及模型覆盖，比较不同启动顺序的整场后继与收益函数；已核零毒空打只是即时事实，不替代另一顺序的后续结果。

处置waiting：无毒目标冒泡能量5→4而敌35血/0毒不变已核；缺同HP、构筑、药水、完整抽序下不同启动顺序的整场对照及可复现收益函数，不拟合启动阈值。
本批未实现源码；不拟合额外常量。以后若有已核缺口，须保存固定输入，在撤对应生产源码时失败、恢复后通过，再按原沙箱及live流程验收。回退对象仅为未来真实源码提交，本次无源码回退对象；原证据/反例/失败/账本/提案持续保留。Roy-2026-10-07-learning是修改授权，不提供游戏事实，也不将原人定规则作为无法修改的理由。

## 8. silent-proposal-43a76a31ba7bdcfa：族母吸取、负敏捷、毒与SL边界

来源任务：experience-update → strategy-proposal；本批实现任务：20261014-044302-strategy-proposal。
账本：silent-0030、silent-0027；原经验：silent-lagavulin-siphon-poison-sl。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md；SHA256=f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c。

证据局号/层/回合：61E2QS63Y9WU，A10，F17 T5/T6；states273504→273508。
已核：吸取后玩家力量2→0、敏捷0→−2、敌力0→2；T6玩家敏捷−2，两防御各3合6，与覆甲另列。敌67→34，17+16毒仍实际结算33。本战首试七轮赢，不是SL救回的成功样本。

反例及限制：本战60血首试获胜不能否定其他局同抽重打失败；负敏捷、减力和毒各自成立也不能规定SL范围。
旧行为及预期增量：按当前进阶数据库冻结吸取移动、负属性及毒结算分项；不把毒输出归当前力量、不忽略负敏捷，不改变SL名单或阈值。
验证方法与缺数据：补完整进阶移动调用的生产验收；若改SL范围，须同起始HP/构筑/药水/完整抽序的可比较完整后继。本局首试胜无法提供另一SL线的反事实。

处置waiting：负敏捷与17+16毒结算已核，本战首试七轮获胜；缺完整A10移动消费者验收及同资源/完整抽序的另一完整SL后继，不能据胜局改变SL范围。
本批未实现源码；不拟合额外常量。以后若有已核缺口，须保存固定输入，在撤对应生产源码时失败、恢复后通过，再按原沙箱及live流程验收。回退对象仅为未来真实源码提交，本次无源码回退对象；原证据/反例/失败/账本/提案持续保留。Roy-2026-10-07-learning是修改授权，不提供游戏事实，也不将原人定规则作为无法修改的理由。

## 9. silent-proposal-5264153a4a4b0e5c：胧光怪召唤、实体成长及退场窗口

来源任务：experience-update → strategy-proposal；本批实现任务：20261014-044302-strategy-proposal。
账本：silent-0039、silent-0209；原经验：silent-obscura-summon-growth。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md；SHA256=b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02。

证据局号/层/回合：61E2QS63Y9WU，A10，F23 T1/T2/T4/T5；states273593→273596。
已核：T1召21血幻象，两次航行两实体力量0→3→6。T4实际合扣47、玩家25→10，但幻象14→2仍存活；另一focus幻象的39伤/零损候选未实打。T5才退场并本体毒收尾，本局未再独立观察幻象复生。

反例及限制：较高合计扣血没有让攻击者及时退场；未选零损线没有整场实打后继，不宣称另一focus必胜或长期更省血。
旧行为及预期增量：保留全部目标选项、相同推演值并列，按实际名单/血量/成长重算；不规定固定首杀，已有召唤子修复不当全联动完成。
验证方法与缺数据：冻结A10召唤、航行、幻象退场/复生全链生产调用，并比较另一focus的完整后继；当前局没有复生帧，不能用旧低进阶或其他角色数据替代。

处置waiting：T4合扣47/损15而幻象余2及两实体成长已核；缺A10召唤/航行/复生全联动的冻结生产调用和另一focus完整后继，本局未再观察复生。
本批未实现源码；不拟合额外常量。以后若有已核缺口，须保存固定输入，在撤对应生产源码时失败、恢复后通过，再按原沙箱及live流程验收。回退对象仅为未来真实源码提交，本次无源码回退对象；原证据/反例/失败/账本/提案持续保留。Roy-2026-10-07-learning是修改授权，不提供游戏事实，也不将原人定规则作为无法修改的理由。

## 10. silent-proposal-bddfa690a84e03d0：熟睡、醒来、眩晕接续与当前进阶成长

来源任务：experience-update → strategy-proposal；本批实现任务：20261014-044302-strategy-proposal。
账本：silent-0128、silent-0079；原经验：silent-slumbering-beetle-wake-growth。
原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md；SHA256=b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780。

证据局号/层/回合：DUZUBAJ3A8GP，A10，F30四次尝试T4/T5/T6；末轮states275022/275023。
已核：睡3/2/1后T4醒来，T5力量2且尖啸临时2→−4，T6恢复并成长力量4、攻击22。末轮1血16挡，完整需损6、差5，终态甲虫仍32血。首/末试T4观测分别损2/扣23与损4/扣26；末试生成小刀后重问，不能将全轮差归一处SL替换。

反例及限制：多扣3敌血同时多付2玩家血，不能只按敌血排序；四试同一局均未赢，前三次判死读档不等于完成死亡结算。
旧行为及预期增量：按当前A10数据分列睡眠、醒来、眩晕及成长与暂减力恢复；保持所有目标/换线，不拟合固定杀序、血价或输出权重。
验证方法与缺数据：补当前进阶全链消费者固定输入与同抽不同顺序的完整后继；末轮端点只证明当前缺口，未证明哪个未选顺序可救回。

处置waiting：末轮1血16挡对22及四次同局未赢已核；缺A10熟睡/醒来/眩晕/成长完整消费者验收和同抽換序可比较的完整后继，不拟合血价或固定杀序。
本批未实现源码；不拟合额外常量。以后若有已核缺口，须保存固定输入，在撤对应生产源码时失败、恢复后通过，再按原沙箱及live流程验收。回退对象仅为未来真实源码提交，本次无源码回退对象；原证据/反例/失败/账本/提案持续保留。Roy-2026-10-07-learning是修改授权，不提供游戏事实，也不将原人定规则作为无法修改的理由。

## 已有源码来源及最终边界

核验时实际live HEAD=040a5fab25314f9001948e79ea78088d1a46f401。以下八个相关文件最后源码commit均为实际live祖先，本工作树字节与该源码对象、live读回一致；详source-readback.json。它们证明已有子项的来源，未证明本批宽提案已全部实现，不填为本批fixes或merged。

| 文件 | 已有源码commit | live祖先且字节一致 |
|---|---|---|
| agent/src/reflex/silent-apotheosis.ts | b2805be4ba44b7375c7908d873889372cc3cfe6c | 是 |
| agent/src/reflex/silent-apotheosis-reference.ts | 30ec2425012eea75f41226b31d8180b1abb837bc | 是 |
| agent/src/reflex/silent-simulation-reference.ts | 0fa15f5e06d60a6caa95b8f49675ee6222b4b276 | 是 |
| agent/src/reflex/silent-selection-audit.ts | 9d8278702dbc581b5015ba7ec9a70dc0fb94cccb | 是 |
| agent/src/reflex/silent-selection-dispatch.ts | fdaf787a372880b0438e73bcac7e6d2168b038ed | 是 |
| agent/src/reflex/silent-hp-guard-audit.ts | 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 是 |
| learner/lib/selection-execution.ts | e75438488df159b2e8e9d3458cf219b39aadd933 | 是 |
| learner/lib/selection-turn.ts | e75438488df159b2e8e9d3458cf219b39aadd933 | 是 |

本批未修改生产源码、任务模板、knowledge、版本或运行行为；铁甲及其他角色行为没有变化。无源码提交、撤源码红/恢复绿、tsc/vitest、live合入或新release_id；tests三字段均null，fixes=[]、merged=null。没有implemented/duplicate/shipped登记；未调用LLM/网络、未启动play、未推送。

本批38项检查及既有消费者读回只支持上述范围，不证明新的策略胜率。范围相同的旧现象、来源误记及限制不重复生成经验或复盘，保留原提案id。关联26个账本只经根ledger.py update追加本提案/报告及逐项处置说明；不重写claim/status/version、不追加SL尝试作为独立样本，不新建代码提案id。CLI回执和读回分别保存ledger-update.log与ledger-readback.json；核验记录保存final-validation.json。队列由调用方依据完整proposal_results保持waiting、待有针对性的本角色新证据再派；父学习要求不因本报告或批次完成关闭。
