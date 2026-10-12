# 本批10项提案的证据复核与处置

记录时间：2026-10-13T03:13:24+08:00。角色silent；已观察进阶A10；batch=20261013-030610-strategy-proposal。

基线：`5940fdd4c7386040f495c68b9e586d2980305fd1`。普通队列，领取10个原CLI id，无research_request/implementation_request/proposal_repair。开工干净，git merge --no-edit main返回Already up to date。只研究领取项，没有读取或代替其他专题身份。

重新按原日志偏移读取六局3432状态、3306决策、29条SL记录，共6767条；每条保留字节偏移、长度和SHA，六局决策数与唯一runs.jsonl身份行一致。原提案10份正文和指纹已保存；19个关联经验对象只从knowledge/characters/silent读取。原始断言10项通过只表示证据端点核验，不是源码测试、消费者通过或效果验证。

所有提案均waiting。已上线普通机制或诊断子项保持原事实，不能据此关闭宽提案。没有拟合新规则，没有源码/知识改动；不另造提案id或提交，不把已发经验等同实际模型采用。

## silent-proposal-89354805ee4d7e77：神化的普通升级传播与实际施放归属

来源原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md。

来源任务：postmortem；实现任务：strategy-proposal；原账本：silent-0237、silent-0238。

证据局/层/回合：VLZ6CCT8AQ0A F35 T1、F43 T1—T5、F45 T1。F35/F43实际施放均支付2能量，战内手牌升级而场外run.deck不变。F43同一后续牌序题面43伤/14损变为51伤/13损；下一轮实际77HP、敌203HP，与后者一致。

反例与未知：F45拥有神化但没有施放；F43施放后仍90→33损57。F45失利不能证明必打神化可以赢，也不能把持有认作已施放。

当前源码/规则：现有silent-apotheosis.ts覆盖本局已观察的普通牌升级对；turn-solver.ts传播同方案升级，rollout.ts传播已知后续牌。silent-apotheosis-reference.ts将actual_cast_this_fight明确留null，并对整个候选列未覆盖项。

本批处置：waiting。普通升级传播已有live源码子项；仍缺跨重规划、SL与重启的实际施放生命周期，以及未知升级、自动动作和属性组合证据，不能关闭整项。

原提案预期的后续行为（本批未实现）：沿原提案补实际施放的事件归属与失效边界；只有明确的成功动作和后继状态才能认证施放。未知升级继续unknown，不加入必打或固定加分。

后续固定验证：保留F35/F43固定帧；补同战抽弃牌重规划、SL恢复及重启的施放/未施放对照，逐牌比费用、伤害、挡和后续抽牌升级。完整获胜反事实另等后移独立局。

## silent-proposal-f2bfceddb1898dca：药水MC预算与三骑士资源时钟

来源原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md。

来源任务：postmortem；实现任务：strategy-proposal；原账本：silent-0106、silent-0019、silent-0201。

证据局/层/回合：VLZ6CCT8AQ0A F43—F45，重点F45 T1/T4/T5。F45 T1首问MC耗707ms、1/12样本，rollout horizon=1、best=null；随后12/12药水问与首问fingerprint不同。T4实打24伤/13损，T5仍需181敌血；32HP、20挡对尖啸后59，完整需损39、差7。

反例与未知：较高攻击候选32伤/31损没有实打，不能将少8伤登记为败因；12/12发生于另一盘面，不能当同盘预算改进。前战F43胜但损57，F44实补34到67仍不能推出安全线。

当前源码/规则：原题面已明确预算退化、样本数及当前血价；本批未发现原记录将best=null误标为确定判死的证据。神化未覆盖是当时模型的另一混杂项。

本批处置：waiting。缺同状态、同模型覆盖、同随机输入和同总预算的配对收益曲线；异盘1/12与12/12、707ms不能校准预算、留药、HP护栏或目标规则。

原提案预期的后续行为（本批未实现）：按原提案做同盘、同模型、同预算实验，分别记录药水MC和无药长程搜索的覆盖与收益；无稳定证据保持原时间分配及规则。

后续固定验证：冻结入口状态、抽序和知识夹具，配对比较现分配与分阶段预算的原始用时/样本/未知项；不调用LLM、不用壁钟差当算法收益。留药和focus需完整后继对照。

## silent-proposal-283a164780d11e69：神化经验的同源实现链

来源原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md。

来源任务：experience-update；实现任务：strategy-proposal；原账本：silent-0237、silent-0238。

证据局/层/回合：VLZ6CCT8AQ0A F35 T1、F43 T1/T2/T4/T5、F45 T1。原经验silent-apotheosis-combat-upgrades对应0237/0238，与89354805提案使用同一实际施放证据。神化后战内升级和场外牌组不变直接从原状态重核。

反例与未知：同源经验及普通传播已经存在，不代表未知费用、其他属性状态或所有后续抽牌已验证；持有未施放的F45不是机制失效反例。

当前源码/规则：与89354805共享现有升级传播与事实展示源码，本批不另建重复id，也不重复实施普通升级。

本批处置：waiting。同源普通升级子项已在live；实际施放生命周期、未知费用、跨轮副效应和自动动作组合仍缺完整验证，同源链接不能将整项登记duplicate。

原提案预期的后续行为（本批未实现）：沿两个原id复用同一后续实现与证据，保留原source_task及experience链接；完整边界验证通过后再核实际live源码祖先。

后续固定验证：与89354805共用固定回归及事件生命周期验证；两个队列id都保留独立处置，不能用经验版本代替源码或消费者证明。

## silent-proposal-ebbfe3b97548756d：15条机制与资源经验的联合验证

来源原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md。

来源任务：experience-update；实现任务：strategy-proposal；原账本：silent-0005、silent-0016、silent-0049、silent-0071、silent-0143、silent-0046、silent-0053、silent-0027、silent-0011、silent-0021、silent-0106、silent-0204、silent-0020、silent-0019。

证据局/层/回合：VLZ6CCT8AQ0A F43 T1—T5、F45 T1—T5、F44休息。F43 T3轮初1敏、步法后共4敏；F45 T3口红使力量1→2、敏捷0→1，步法后3敏。F45 T5覆甲0，后空翻8与防御12合20挡，临时减力后的来袭59；没有把开场覆甲4延续到末轮。

反例与未知：本批只有原来源局及当前端点复核，没有将原15条经验的每一条历史实验、分母、联合跨轮消费者全量重新验证；不能从静默资料已有发布推出求解器整包正确。

当前源码/规则：现有模型有力量、敏捷、专属防御挡、毒、临时减力恢复与现场覆甲路径；本批只是源码定位和原端点核验，没有运行覆盖15条经验的消费者测试。

本批处置：waiting。已核本局分源端点和既有机制路径；仍缺口红、覆甲、临时减力恢复与未来毒的联合跨轮调用验证及15条经验逐项消费者证明，不能关闭整包。

原提案预期的后续行为（本批未实现）：逐条建立原经验→固定帧→实际消费路径映射；只修证实不符的本角色状态变换。原神化问题仍归专属id，资源观察不拟合路线或休息硬门槛。

后续固定验证：固定F43/F45逐动作和逐轮输入，核同轮属性、毒实际结算、覆甲期限、减力恢复与完整敌方回合；历史15条逐项覆盖和反例需单独完整验证，不能相加支持数。

## silent-proposal-e5b87be50f28f311：SL、HP护栏与重规划的执行审计

来源原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md。

来源任务：postmortem；实现任务：strategy-proposal；原账本：silent-0079、silent-0021、silent-0125、silent-0018。

证据局/层/回合：8JRE1C4H4Z2W F33首/三试T2、第二试T5、末试T11；F17 T6。首/三试T2 fingerprint逐字相同；到T3实际损3/15、敌净扣10/17，换线多12血仅多7伤。原候选、原答、最终动作及observed_ts可连回状态，但六局历史顶层机械replan_reason/whole_plan_executed/actual_turn等字段均无。

反例与未知：同盘换线没有取得可获胜原线后继；末试保血替线延长到T11仍死，不支持一概认定防御替换错误。预测能力与抽牌续步不能预支成实付收益。

当前源码/规则：silent-selection-audit.ts保存候选阶段；silent-hp-guard-audit.ts和silent-sl-comparison.ts保存预测差；silent-selection-dispatch.ts只认证单动作回执，whole_plan_executed/actual_turn仍null、state_effect_verified=false。

本批处置：waiting。候选差与单动作回执已有live子项；仍缺逐次机械重规划原因、跨抽弃牌完整执行归属和能力分源后继，不能认证整套审计或校准HP/SL阈值。

原提案预期的后续行为（本批未实现）：沿原审计提案补完整执行生命周期和各中断原因；不得从一次returned/stable回执倒填整个方案已执行，继续分列原答、护栏、SL、实际状态。

后续固定验证：冻结本局同盘T2、第二试T5、F17 T6和末试T11，逐次连接候选→动作→返回→新状态→重规划；补抽弃牌/药水/SL断点与敌ID重排，完整需损和死亡截断分别核验。

## silent-proposal-49632bc4878fb597：力量、虚弱、敏捷与蚌成长的分项边界

来源原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md。

来源任务：experience-update；实现任务：strategy-proposal；原账本：silent-0005、silent-0231。

证据局/层/回合：CA5KE8GFJ9X2 F13 T1/T3/T5。蚌力量0→4→8，无虚弱喷水11→15→19；T3/T5虚弱后11/14仍继续成长。全局282状态中正敏捷样本0，末2HP/10挡对14完整需损4。

反例与未知：计划中想要步法但没有取得或建立，不能据这局补正敏捷；当轮虚弱降低伤害不能代表关闭后段成长。

当前源码/规则：已有当前属性与成长相关模型；本局只能核力量/虚弱/成长端点，没有同时涵盖四路径的固定消费者证明。

本批处置：waiting。来源局正敏捷样本为0；缺力量、敏捷、虚弱与跨轮成长四路径的完整共同调用证据，不能据当轮吻合校准统一权重。

原提案预期的后续行为（本批未实现）：保留分项事实；等待同角色已实际建立正敏捷的可追溯组合帧，再做联合模型验证，不借用别角色数值。

后续固定验证：冻结当前进阶HP/伤害/移动表和T3/T5状态，逐步比当轮格挡、敌力恢复/增长；正敏捷分支另需实际样本及完整调用链，不能在此局造数据。

## silent-proposal-66532328a585941f：持有、启动与输出兑现分账

来源原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md。

来源任务：experience-update；实现任务：strategy-proposal；原账本：silent-0021、silent-0009。

证据局/层/回合：5PM6JAQG6FNQ F39第二试T2；反例F33 T3。F39第二试T2冒泡实付1能量，敌状态完全未变；当时玩家29HP、失落35HP、遗忘72HP，两敌无毒。原账本已经更正过把敌35误当玩家血的备注，本批使用29，不重复改历史。

反例与未知：同局F33已建立毒雾3、触媒1、群蛇4并获胜；入口HP、敌人和组件条件同时变化，不能当控制实验，也不能证明早启毒必胜。

当前源码/规则：本角色现有经验要求不预支未建立能力；原提案没有已核的完整收益函数或同抽序启动顺序对照。

本批处置：waiting。缺同入口HP、构筑与完整抽序下不同启动顺序的整场对照和可复现收益函数；无毒目标空放只确认局部代价，不足拟合启动阈值。

原提案预期的后续行为（本批未实现）：继续将持有、计划与实际建立分列，原条件未成立的动作保留真实费用；拟提权重前先复现原线与候选线全程。

后续固定验证：固定本局空放前后状态及实际建立能力帧，逐源比毒/直接伤/血/挡；另冻同入口抽序及资源的完整启动对照，后移独立局验证泛化。

## silent-proposal-43a76a31ba7bdcfa：吸取、负敏捷、毒与SL范围

来源原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md。

来源任务：experience-update；实现任务：strategy-proposal；原账本：silent-0030、silent-0027。

证据局/层/回合：61E2QS63Y9WU F17 T5/T6。T5→T6玩家力量2→0、敏捷0→−2，敌力量0→2；T6实际两防御分别只加3挡，现场毒17在普通触媒1下17+16结算。

反例与未知：本战60HP首试七轮获胜；不是SL恢复样本，没有同入口、同抽序可救活替线，不能据首试胜扩大或缩小SL范围。

当前源码/规则：当前属性、额外毒触发等分项已有模型路径；本批没有运行吸取跨轮联合的完整固定消费者验证。

本批处置：waiting。缺吸取跨轮联合模型验证及同入口HP、构筑、完整抽序下可救活的SL替线；本局首试胜利不足修改SL范围或换线偏好。

原提案预期的后续行为（本批未实现）：冻结吸取前后与毒结算分项事实，继续保持现SL规则；完整替线验证之后再考虑范围或偏好。

后续固定验证：逐轮核力量/敏捷削减、敌增力、逐牌挡和17+16毒，提供实际当前进阶表与完整抽序；SL候选必须有同资源全程后继及独立验证。

## silent-proposal-5264153a4a4b0e5c：召唤、各实体成长与退场窗口

来源原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md。

来源任务：experience-update；实现任务：strategy-proposal；原账本：silent-0039、silent-0209。

证据局/层/回合：61E2QS63Y9WU F23 T1—T5，重点T4。T1召21HP幻象；两次航行后两实体力量0→3→6，幻象撞击17→20→23。T4本体focus线实净扣47/损15，到T5幻象仍2HP，不能在T4预记退场。

反例与未知：focus幻象的39伤/零损只是未实打候选；本局T5杀幻象后本体毒收尾，没有提供复起接续，不能从另一候选的零损证明整场胜利。

当前源码/规则：现有living summon模型及固定测试有旧已观察进阶的召唤子项；读取测试正文不等于本批执行，更不能覆盖本次A10航行、复起、索引变化和另一focus收益。

本批处置：waiting。缺A10召唤、航行、复起与索引变化的完整跨轮调用验证及另一focus全程后继；旧召唤子项不足证明成长组合或固定首杀收益。

原提案预期的后续行为（本批未实现）：按各实体记录当前进阶HP、力量、移动与实际退场，保留全部合法focus，推演相同的仍并列；不设强制首杀。

后续固定验证：冻结F23各实体ID/索引与成长输入，贯通真实boardRolloutInput→rollout→消费者；复起分支另需实际接续证据，另一focus须同入口全程重放。

## silent-proposal-bddfa690a84e03d0：熟睡甲虫的唤醒与后段成长

来源原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md。

来源任务：experience-update；实现任务：strategy-proposal；原账本：silent-0128、silent-0079。

证据局/层/回合：DUZUBAJ3A8GP F30四次尝试T1—T6。自然睡层3/2/1后T4醒，T4/T5/T6力量0/2/4、攻击18/20/22；末试T6仍只有1HP，16挡对22完整需损6。四次均败，同局尝试不扩大独立样本分母。

反例与未知：末试T4较首试多3敌血扣但多付2玩家血，不能只按敌血推进定更优；本批没有提前唤醒、眩晕接续与自然醒的配对胜局。

当前源码/规则：当前端点支持自然醒与后段成长的分源描述；没有本批完整睡眠/眩晕/成长联合调用和获胜替线证明。

本批处置：waiting。缺提前唤醒后眩晕接续的配对证据和同抽序完整获胜替线；自然醒及当前攻防端点不足校准输出血价或固定杀序。

原提案预期的后续行为（本批未实现）：继续使用实际当前进阶、睡层、力量与意图，区分醒来、眩晕和成长；规则变化等有完整对照再提出。

后续固定验证：冻结四次入口、抽序、实体变化与末轮完整未挡伤；新增提前醒/眩晕配对接续，比较完整获胜/失败后继，不用同局四败拟合新常数。

## 拟合、样本切分与回退

本批只复核六局既有发现证据，所有来源局均A10；同局SL不作独立样本，所有帧已用于发现/复核，没有时间后移盲测。无拟合、无新参数、无胜率估计。后续若拟改规则须按run_id与结束时间切分，并保证同入口资源、抽序和模型覆盖的配对，不以不受控抽弃、重规划或预算差冒充因果收益。

Roy-2026-10-07-learning允许有实证时改规则，不提供游戏事实。本批因以上具体缺证保留原行为；不改变铁甲战士或未观察进阶。后续验证若证实缺口并实现，按原任务做撤源码失败/恢复通过、沙箱全套、自测上线和双通知；本批没有生产改动，无回退提交或规则开关需要处理。

## 既有源码证据的范围

源码核对时live HEAD=`a30265a1046fdacdd0d26c8c792ef8612787183c`；17份源码/已有测试仅核提交内容、工作文件、SHA及祖先。6份专属升级/审计源码与本树逐字一致；共用源码7路径另有历史main/live差异，完整结果在source-verification.json，不将其当本批新增待合入。

- agent/src/reflex/silent-apotheosis.ts：实际live祖先`a11dd870b09f3f1b67fcb5d6c08af6573fd809e0`。只认证已有子项，不作本批implemented_commit。
- agent/src/reflex/silent-apotheosis-reference.ts：实际live祖先`3aa6c03a83c5cdcdea29c43e3caa130bcce9bd17`。只认证已有子项，不作本批implemented_commit。
- agent/src/reflex/silent-selection-audit.ts：实际live祖先`05cd292c6f01bb31e406473d3a9843e659d62b93`。只认证已有子项，不作本批implemented_commit。
- agent/src/reflex/silent-selection-dispatch.ts：实际live祖先`bade647f9fe4c9103b40e2f26b26296692ad24b7`。只认证已有子项，不作本批implemented_commit。
- agent/src/reflex/silent-hp-guard-audit.ts：实际live祖先`a8b1f8be153fe4f3a34146117546c2178f2e446b`。只认证已有子项，不作本批implemented_commit。
- agent/src/reflex/silent-sl-comparison.ts：实际live祖先`a8b1f8be153fe4f3a34146117546c2178f2e446b`。只认证已有子项，不作本批implemented_commit。

本批没有运行上述已有测试，没有认证整套消费者、完整执行或自然局效果；故原提案均非整项duplicate/implemented。账本只经根ledger.py追加报告/提案路径和本批说明，既有claim/evidence/status/version保持；没有新发现需要新增id或把既有已上线条目降回proposed。

运维交付：保留10项waiting及各自缺证原因，后续按原队列等待可对应的新局或完整固定输入。父学习要求、宽机制提案与消费者效果未关闭。
