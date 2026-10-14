# 静默猎手本批十项策略提案核验

时间：2026-10-14 10:06:59 CST（写入前已跑date）。批次：20261014-094303-strategy-proposal。普通队列任务，非纯研究，非冻结量化实现请求；根learn.json的角色、六局与工作树匹配，本批只有这10个已领取id。普通专题请求绑定旧批20261010-150327，不适用于本批，未读取其他专题代替身份。开工git干净；按要求merge main结果Already up to date，base与最终HEAD均为1375905e06a29935f1bda6021321ff10541f0196。

结论：10项全部waiting，未新增源码、经验库、游戏规则、提交、合入或版本。已有子实现与宽请求分开，不拟合缺证的血价、预算、启动或目标顺序。提案原文10份逐SHA核实；原证据/账本/经验不改写。代码提案只原样经CLI读回已有id，不另造重复id。

只使用本角色六局原证据与silent私有经验。学习单位是6局而非29条SL记录；历史执行code均+dirty，保留原身份，不冒称已还原历史完整执行树。已用样本内核验不能称盲测，未来独立完局才可作时间后移验证；本批没有胜率、整战反事实或一般参数的独立实验。
## silent-proposal-89354805ee4d7e77

原摘要：按静默已观测帧补齐神化在同线及后续抽牌中的升级传播，并区分持有、施放与模型覆盖；无整场转胜保证。。来源任务：postmortem；实现任务strategy-proposal。账本：silent-0237, silent-0238。原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md；SHA256：ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d。

证据：VLZ6CCT8AQ0A F35/F43/F45 T1及F43 T2。F35实花2能且剩手升级；F43整轮玩家净损13、敌本体净扣51，T2实抽雾已升级。现有函数对两组共9个牌对的数值与原帧相等。

反例与限制：F43施放仍损57；F45未施放而失败的资源和敌人不同，不能拟必打神化。

旧行为与预期行为：保留原提案要求；已核子机制继续使用，未知交互和未选完整后继继续标未知。未增加必打、必喝、固定杀序、血价或构筑阈值。原因：9个牌对及候选参考已有子实现；POUNCE、PREDATOR、REFLEX原牌升级函数仍返回null，三个实际施放参考均为null。缺这些交互的完整配对证据及跨抽牌、选择、药水、SL、换战和接续的持续实际施放身份，不能关闭整项。

验证方法：沿本批冻结原行、指纹和decision_id复验现有子消费者；后续具备同起点、同覆盖、同固定随机序列的完整数据时，按原提案做逐步与整场比较。若新增源码，须撤源码失败/恢复通过及原沙箱自测，然后实际合入live。当前处置waiting；没有本批新源码可回退，原行为及未覆盖角色保持。本条不能登记implemented、duplicate或shipped。

## silent-proposal-f2bfceddb1898dca

原摘要：核验三骑士全败候选的即时血价、击杀缺口与药水MC预算成熟度；先做同盘预算实验，缺对照时保留原护栏、留药与目标规则。。来源任务：postmortem；实现任务strategy-proposal。账本：silent-0106, silent-0019, silent-0201。原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md；SHA256：fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26。

证据：VLZ6CCT8AQ0A F45 T1/T4/T5，决策269748/269754/269770。T1原题记药水MC占707ms并退化为无多轮推演；喝药前后HP67不变、能量+1、手牌+2。T4已选13损/24伤与未选31损/32伤分列。

反例与限制：12/12药水局部样本不等于完整胜负；未选攻击线没有整场实打结果，不能把少8伤当败因。

旧行为与预期行为：保留原提案要求；已核子机制继续使用，未知交互和未选完整后继继续标未知。未增加必打、必喝、固定杀序、血价或构筑阈值。原因：缺同起点、相同模型覆盖、同总预算与固定随机池下现有MC和分阶段MC的配对、样本成熟度及候选稳定性曲线；707ms与一局失败不足以定新预算、血价或持药参数。

验证方法：沿本批冻结原行、指纹和decision_id复验现有子消费者；后续具备同起点、同覆盖、同固定随机序列的完整数据时，按原提案做逐步与整场比较。若新增源码，须撤源码失败/恢复通过及原沙箱自测，然后实际合入live。当前处置waiting；没有本批新源码可回退，原行为及未覆盖角色保持。本条不能登记implemented、duplicate或shipped。

## silent-proposal-283a164780d11e69

原摘要：神化已观察升级进入同方案与后续抽牌，保留未知边界，不定必打规则。来源任务：experience-update；实现任务strategy-proposal。账本：silent-0237, silent-0238。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md；SHA256：78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637。

证据：VLZ6CCT8AQ0A F35/F43/F45；与89354805同实盘证据。经验链和复盘链的原Markdown各自SHA匹配；本批同样读回9个升级牌对。

反例与限制：独立经验来源链接不能被另一提案的子实现替代；同一局不能增加独立样本数。

旧行为与预期行为：保留原提案要求；已核子机制继续使用，未知交互和未选完整后继继续标未知。未增加必打、必喝、固定杀序、血价或构筑阈值。原因：与89354805属于同一机制问题，但完整实际施放身份和未覆盖升级交互仍待证；没有覆盖原经验请求全部范围的live源码提交，不能仅按提案语义重合登记duplicate。

验证方法：沿本批冻结原行、指纹和decision_id复验现有子消费者；后续具备同起点、同覆盖、同固定随机序列的完整数据时，按原提案做逐步与整场比较。若新增源码，须撤源码失败/恢复通过及原沙箱自测，然后实际合入live。当前处置waiting；没有本批新源码可回退，原行为及未覆盖角色保持。本条不能登记implemented、duplicate或shipped。

## silent-proposal-ebbfe3b97548756d

原摘要：逐源验证当前攻防、毒触发与持续资源，不从持有或单轮减力预支整场收益。来源任务：experience-update；实现任务strategy-proposal。账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md；SHA256：08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2。

证据：VLZ6CCT8AQ0A F43 T1—T5、F45 T3/T5及休息资源链。F43触媒轮末177→144净扣33；F45末轮32血20挡，临减后显示来袭59；三敌末轮前仍24/80/77血。现有子公式和经验版本可追溯。

反例与限制：显示完整需损39与真实HP零截断分开；持有两雾不证明全部敌已中毒，胜败不能隔离路线或某能力贡献。

旧行为与预期行为：保留原提案要求；已核子机制继续使用，未知交互和未选完整后继继续标未知。未增加必打、必喝、固定杀序、血价或构筑阈值。原因：原15条机制和资源请求的全部升级、属性组合、状态期限及路线消费者没有逐路完整生产配对验收；本批素材核验和9个升级函数牌对只覆盖子域，不能登记整组implemented或duplicate。

验证方法：沿本批冻结原行、指纹和decision_id复验现有子消费者；后续具备同起点、同覆盖、同固定随机序列的完整数据时，按原提案做逐步与整场比较。若新增源码，须撤源码失败/恢复通过及原沙箱自测，然后实际合入live。当前处置waiting；没有本批新源码可回退，原行为及未覆盖角色保持。本条不能登记implemented、duplicate或shipped。

## silent-proposal-e5b87be50f28f311

原摘要：静默A10同盘SL以12血换7伤重犯：补齐Jev原答、HP护栏、SL换线及重规划的候选代价与实际成长兑现审计；单局不足以改阈值，保留现行为并独立验证。。来源任务：postmortem；实现任务strategy-proposal。账本：silent-0079, silent-0021, silent-0125, silent-0018。原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md；SHA256：5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709。

证据：8JRE1C4H4Z2W F33首/第三试T2、第二试T5、第六试T11；兼F17 T6。T2原帧分别47→44/敌326→316，与47→32/敌326→309，多损12只多扣7。终局T11玩家5→0、敌154→130；显示攻击37与挡22只是15的参考差，不补毛伤。

反例与限制：末试T2防御替换延至T11仍死亡，反对一律认定所有防御换线错误。0/24与5/24并非同死率。

旧行为与预期行为：保留原提案要求；已核子机制继续使用，未知交互和未选完整后继继续标未知。未增加必打、必喝、固定杀序、血价或构筑阈值。原因：现有离线消费者可读原答、SL、单步、区间及整轮端点，但完整候选结果按设计仍null。缺抽牌、选择、药水及重规划后整条候选持续归属、未选原线和完整独立后继，不能用离线子审计关闭宽项或改SL血价。

验证方法：沿本批冻结原行、指纹和decision_id复验现有子消费者；后续具备同起点、同覆盖、同固定随机序列的完整数据时，按原提案做逐步与整场比较。若新增源码，须撤源码失败/恢复通过及原沙箱自测，然后实际合入live。当前处置waiting；没有本批新源码可回退，原行为及未覆盖角色保持。本条不能登记implemented、duplicate或shipped。

## silent-proposal-49632bc4878fb597

原摘要：把当前属性、每击修正、弱与成长分项验证，不增加统一保血或输出权重。。来源任务：experience-update；实现任务strategy-proposal。账本：silent-0005, silent-0231。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md；SHA256：aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2。

证据：CA5KE8GFJ9X2 F13 T1—T5；对照本批VLZ F43正敏捷与61E F17负敏捷帧。CA末轮力8、弱后显示14攻击、玩家2血10挡核实；跨局正敏捷与负敏捷帧存在，不能再写为本批完全没有正敏捷证据。

反例与限制：虚弱没有关闭加压成长；CA该战没有实际建立正敏捷，跨局局面不是同条件复合校准。

旧行为与预期行为：保留原提案要求；已核子机制继续使用，未知交互和未选完整后继继续标未知。未增加必打、必喝、固定杀序、血价或构筑阈值。原因：缺可唯一分源的逐击力量、正负敏捷、虚弱及独立成长四路复合生产校准和完整后继；已有分项事实不足以给统一保血/输出权重或证明整个请求已实现。

验证方法：沿本批冻结原行、指纹和decision_id复验现有子消费者；后续具备同起点、同覆盖、同固定随机序列的完整数据时，按原提案做逐步与整场比较。若新增源码，须撤源码失败/恢复通过及原沙箱自测，然后实际合入live。当前处置waiting；没有本批新源码可回退，原行为及未覆盖角色保持。本条不能登记implemented、duplicate或shipped。

## silent-proposal-66532328a585941f

原摘要：持有/计划/已建立分账；如提构筑或启动权重，先做实盘兑现与受控整场验证。。来源任务：experience-update；实现任务strategy-proposal。账本：silent-0021, silent-0009。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md；SHA256：56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831。

证据：5PM6JAQG6FNQ F39末试T2，状态274379→274380；同局F33为限制对照。向无毒目标打冒泡后能量少1，两敌35/72血不变，玩家能力列表未列毒雾。持有、拟启动与已建立必须分账。

反例与限制：F33实际建立组件并赢的敌人、资源和存活条件一起变化；不能据F39失败拟合启动优先级。

旧行为与预期行为：保留原提案要求；已核子机制继续使用，未知交互和未选完整后继继续标未知。未增加必打、必喝、固定杀序、血价或构筑阈值。原因：缺同HP、牌组、药水及完整抽序下另一启动/构筑顺序的整场对照和可复现收益函数；不定启动阈值或固定组件加分。

验证方法：沿本批冻结原行、指纹和decision_id复验现有子消费者；后续具备同起点、同覆盖、同固定随机序列的完整数据时，按原提案做逐步与整场比较。若新增源码，须撤源码失败/恢复通过及原沙箱自测，然后实际合入live。当前处置waiting；没有本批新源码可回退，原行为及未覆盖角色保持。本条不能登记implemented、duplicate或shipped。

## silent-proposal-43a76a31ba7bdcfa

原摘要：冻结吸取、负敏捷与毒的分项事实；任何SL范围或换线偏好需完整同盘验证。。来源任务：experience-update；实现任务strategy-proposal。账本：silent-0030, silent-0027。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md；SHA256：f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c。

证据：61E2QS63Y9WU F17 T5/T6/T7，状态273503/273504/273507/273509。吸取后玩家力量原2不再列出、敏捷列−2、敌力2；两防御合6挡，毒端点67→34净扣33。字段未列与实际数值分开记录。

反例与限制：本局首试60血七轮赢；全局SL记录不是本场受控换线，也不证明另一局固定顺序能获救。

旧行为与预期行为：保留原提案要求；已核子机制继续使用，未知交互和未选完整后继继续标未知。未增加必打、必喝、固定杀序、血价或构筑阈值。原因：缺A10吸取、负敏捷、毒及后续移动的完整冻结生产整战配对，以及同资源和完整抽序下另一完整SL线；不由首试胜利更改SL范围或阈值。

验证方法：沿本批冻结原行、指纹和decision_id复验现有子消费者；后续具备同起点、同覆盖、同固定随机序列的完整数据时，按原提案做逐步与整场比较。若新增源码，须撤源码失败/恢复通过及原沙箱自测，然后实际合入live。当前处置waiting；没有本批新源码可回退，原行为及未覆盖角色保持。本条不能登记implemented、duplicate或shipped。

## silent-proposal-5264153a4a4b0e5c

原摘要：复验已有召唤和各实体成长；保留所有目标选项，相同推演值并列，不强制首杀。。来源任务：experience-update；实现任务strategy-proposal。账本：silent-0039, silent-0209。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md；SHA256：b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02。

证据：61E2QS63Y9WU F23 T1—T5，状态273595为T4攻击后端点。T4本体线后幻象仍2血，本体51血；幻象当轮攻击存在。原39伤零损的另一focus仍是未选预测。

反例与限制：召唤子模型存在不等于航行、复生、退场和另一目标序的全链校准；本体血与全体净变化不得混加。

旧行为与预期行为：保留原提案要求；已核子机制继续使用，未知交互和未选完整后继继续标未知。未增加必打、必喝、固定杀序、血价或构筑阈值。原因：缺A10召唤、航行增力和幻象复现/退场的完整生产调用校准及另一focus完整后继；不以旧召唤提交登记整个请求duplicate，不强制首杀。

验证方法：沿本批冻结原行、指纹和decision_id复验现有子消费者；后续具备同起点、同覆盖、同固定随机序列的完整数据时，按原提案做逐步与整场比较。若新增源码，须撤源码失败/恢复通过及原沙箱自测，然后实际合入live。当前处置waiting；没有本批新源码可回退，原行为及未覆盖角色保持。本条不能登记implemented、duplicate或shipped。

## silent-proposal-bddfa690a84e03d0

原摘要：按当前进阶、睡眠/眩晕/成长分别验证；不把未知换线胜率或固定杀序写成规则。。来源任务：experience-update；实现任务strategy-proposal。账本：silent-0128, silent-0079。原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md；SHA256：b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780。

证据：DUZUBAJ3A8GP F30 T1—T6，首试状态274933→274934。甲虫临减力−4/尖啸6后下一帧力4、攻击22；T6 least-loss动作实际未派发而SL恢复。原预测不能记为实打。

反例与限制：四试均失败，更多当轮敌扣伴随玩家血价；没有同抽另一完整赢线，无法据全死排序拟新权重。

旧行为与预期行为：保留原提案要求；已核子机制继续使用，未知交互和未选完整后继继续标未知。未增加必打、必喝、固定杀序、血价或构筑阈值。原因：缺当前A10睡眠、伤害唤醒、眩晕接续与独立成长的完整生产全链校准和同抽换序完整后继；保留现有规则，不把少量端点或子判死规则登记为整项duplicate。

验证方法：沿本批冻结原行、指纹和decision_id复验现有子消费者；后续具备同起点、同覆盖、同固定随机序列的完整数据时，按原提案做逐步与整场比较。若新增源码，须撤源码失败/恢复通过及原沙箱自测，然后实际合入live。当前处置waiting；没有本批新源码可回退，原行为及未覆盖角色保持。本条不能登记implemented、duplicate或shipped。
