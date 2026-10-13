# 本批十项策略提案核验与处置

批次：20261014-041302-s2-strategy-proposal；角色：silent。
基线：4454bd24d1331c7eca756d302e5686a2d023f6f7。未绑定research_request/implementation_request，仅消费本批十个原ID，不新增重复提案。
授权：Roy-2026-10-07-learning仅提供修改权限，不提供游戏事实。本批因当前合并冲突停止源码实施，以下为既有提案的核验证据与后续验证规格。

方法与样本：核runs.jsonl确认全部14个队列证据局为SILENT，A9/A10；10,568条索引，416个关键原帧与32个跨幕原帧读回、保留偏移/SHA。仅本角色原提案、账本和日志；不拟合参数、不使用预训练游戏结论。两次同局机制观测/SL重放不充作独立局。
时间切分：蛇咬F17七毒控制、F31T1定位、F31T13同局保留验证；药水T13效应核验，T1—T12仅候选回溯。跨幕16对均为既有冻结局复核。本批没有新独立实盘或完整受控整场后继。

合并门禁：main合并Already up to date；live=60d5206de96389c3430370c0dbb8704f32714d7a。git merge-tree --write-tree只做对象预检，exit=1，17条content及1条file-location冲突；live另有12项未提交刷新。未进入实际merge或刷新提交，也没有覆盖/解决并行记录与知识。完整清单见live-merge-precheck.txt与precheck.json。

## silent-proposal-03754e1265894000：waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-024302-experience-update/proposal-mechanisms.md；原SHA：518c139723decc4238c7ea5641e671c8738ec240118ff5140ca503612295599f（匹配）。
账本：silent-0006,silent-0011,silent-0013,silent-0080,silent-0088,silent-0101,silent-0232,silent-0253。领域：combat,potion。
来源任务：experience-update；实现任务：strategy-proposal；仅silent，进阶与场景按以下证据。

证据：RC61MFQM63Y6 A10 F23 T3/T4；F29 T3/T4；F33 T1/T4。F23 T3 原帧偏移 8804070660→8804103425：敏捷1→6；8804135859斗篷12挡，8804199738防御再9挡，8804259413第三攻击额外4挡，合25。

本批结论：逐牌敏捷、柔嫩、速度药与折扇的该局实线已核，不能将25挡归为单一来源；目前源码已有多项局部模型，不能以符号存在证明八组件联合正确。

反例及缺数据：原提案F33死亡与已核局部效果并不矛盾；首小刀、临时属性清退、被动挡和不同能力建立时点的完整联合消费者重放尚缺。

拟议行为：只按已建能力与当前逐牌属性兑现，首次小刀和被动挡分别计入；保持未知组合及其他角色。

验证方法：冻结F23 T3/T4与F29首刀的完整输入，经生产入模、逐牌求解和次轮清退核对；撤回补丁须失败，恢复须通过，另核非静默控制。

处置理由：局部逐牌证据充分，仍缺八组件联合生产消费者重放及首刀/被动挡事件归属；当前live合并预检有18条冲突诊断，停止接续实现。
## silent-proposal-e5ea36df117ca9b7：waiting

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261008-031301-postmortem/proposal-controlled-opening.md；原SHA：a305a121a184c84264ac5434fddaaeb75941c0a96a350abda85418824725c9ea（匹配）。
账本：silent-0164。领域：combat,structure。
来源任务：postmortem；实现任务：strategy-proposal；仅silent，进阶与场景按以下证据。

证据：XTSV1U9JD34T A10 F49 T1；8860537263是尚无手牌的入口，8860581406才是接管后稳定可行动帧：23HP/16挡/3能量，仅进阶之灾；后帧饮幽灵。原提案另关联F34耳环、F36蘑菇。

本批结论：接管后资源与自主启动必须分开；本批没有恢复接管内部动作，也未定位当前题面误称可自主开场的确定缺陷。

反例及缺数据：原提案持耳环后的多场获胜，以及蘑菇实际增加最大HP，均不支持由末战失败禁取遗物。

拟议行为：若确定存在误述才区分接管阶段与首个稳定可行动状态；不补造瓦库内部顺序。

验证方法：固定题面与行动就绪状态核对实际手牌、能量和归属；需有内部事件记录才能复原顺序与消耗。

处置理由：已核首个稳定可行动状态；接管内部动作顺序与耗能轨迹未记录，且未找到当前题面的确定误述，不能实施或标整项duplicate。
## silent-proposal-ab055ef7dfbb44e5：waiting

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261008-031301-postmortem/proposal-survival-and-ghost.md；原SHA：c5490a44836c3900e1d03b59370dea8c076a8b5435236f7a5e575e4c0b516b17（匹配）。
账本：silent-0140,silent-0069,silent-0005,silent-0206。领域：combat,potion。
来源任务：postmortem；实现任务：strategy-proposal；仅silent，进阶与场景按以下证据。

证据：XTSV1U9JD34T A10 F49 T1：8860581406→8860626847建立INTANGIBLE_POWER1，HP仍23、挡16；末T4 8864890487夜魇3层，8864940152为1HP/6挡，8864988835已死。

本批结论：该次幽灵一层表现与夜魇死亡前未兑现的复制已核；幽灵子项源码96f17377a331e50ea5b6a3fe8d2b605932ed1bd4是真实live祖先，但不涵盖整个复合提案。

反例及缺数据：T1幽灵已兑现局部减伤，末T4死亡不能证明延后饮用或不用夜魇能获胜；六次同局重放不是六独立样本。

拟议行为：复制的未来收益须与实际存活窗口对齐，幽灵只按已观察条件建模；不拟新时机或药价。

验证方法：完整T3/T4入模、可执行动作和死亡前未来收益固定重放；另需同条件延后饮药整场后继才能比较时机。

处置理由：幽灵一层子实现已为live祖先；仍缺夜魇复制收益与存活窗口的联合消费者验证、延后饮药整场对照，不能关闭复合提案。
## silent-proposal-0129c465c6f5bd79：waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-033315-experience-update/proposal-replay.md；原SHA：bf425049a5868e3bec28ff845f0dcc2f5560594b3b85b4380a378ab2295bdcdc（匹配）。
账本：silent-0009,silent-0021,silent-0024,silent-0057,silent-0079,silent-0090,silent-0140,silent-0164,silent-0205,silent-0268,silent-0271。领域：combat,sl,terminal。
来源任务：experience-update；实现任务：strategy-proposal；仅silent，进阶与场景按以下证据。

证据：BTSRF7JL1W1Y A10 F31 T2 8834477538只有生存者与突然一拳；8834517465手空、13挡；XTSV1U9JD34T F48 T8 8860405391为32血/0挡/5能量、有凋萎和防御，8860454714战胜余23。

本批结论：唯一后继被弃与毒胜持牌血价均已核；普通单弃子源码bf423c173d3be348a4ad714e1d26516df619ff41为真实live祖先。宽项另含复制、接管及同条件SL整战，不能仅凭子实现关闭。

反例及缺数据：既有弃牌子实现不能复原历史dirty树或证明所有抽弃组合；毒胜保血可能改善当轮HP，未证明后场可赢。

拟议行为：计划必须消费真实弃牌；可毒胜时仍比较合法保血候选；未来复制与SL后继保持证据边界。

验证方法：普通单弃、毒胜持牌伤和后场实际资源串联固定回放，另核接管/复制与完整同条件SL后继。

处置理由：唯一余牌弃牌及毒胜血价已核，已有窄源码不能覆盖接管内部动作、复制次轮兑现及同条件SL整战；缺完整联合消费者验证。
## silent-proposal-abe9d5d0be109a9f：waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-033315-experience-update/proposal-resources.md；原SHA：21263e5782fa17b030141cf5d79a9968115beeb1a99dc66f6309cbac9b51957b（匹配）。
账本：silent-0019,silent-0020。领域：sl,terminal。
来源任务：experience-update；实现任务：strategy-proposal；仅silent，进阶与场景按以下证据。

证据：BTSRF7JL1W1Y A10 F30/F31；XTSV1U9JD34T F47/F48/F49。X F48 T8原帧32→23，F49入口8860537263仍23；原提案记F48整战97→23、F47先回满97。

本批结论：赢战末血真实传入后场，不能预支尚未抵达的回复；本批核局部资源端点，未把旧统计全量重跑或假定所有资源消费者已覆盖。

反例及缺数据：本局没有同资源改线、留药或锻造的完整受控胜负对照；SL复药不等于新获药。

拟议行为：赢战消耗、真实回血、SL恢复和后场入血各自记录；仅用实到资源，不设新安全血线。

验证方法：路线、休息、SL和连战消费者的端点及来源联合重放，持药/路线价值需要同条件完整后继。

处置理由：前战余血接入后战已核；缺同资源改线、留药、锻造完整后继及路线/休息/SL分源联合消费者验收，不拟新安全血线。
## silent-proposal-f16527e59b5cc1e0：waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-033315-experience-update/proposal-mechanisms.md；原SHA：a71d6c87441d33115c5a8f4d3e0103673fd07798805978646f3a3961fb749079（匹配）。
账本：silent-0005,silent-0006,silent-0011,silent-0013,silent-0016,silent-0027,silent-0046,silent-0069,silent-0095,silent-0128,silent-0196,silent-0241。领域：combat,potion。
来源任务：experience-update；实现任务：strategy-proposal；仅silent，进阶与场景按以下证据。

证据：BTSRF7JL1W1Y A10 F31 T2：原帧8834351441起覆甲3，8834517465牌挡13且手空；XTSV1U9JD34T F49 T1幽灵1层，末T4敏捷3、脆弱98、防御实6挡。

本批结论：覆甲与卡牌格挡、临时减力、留挡及能力时点须分源；本次没有把临时能力、上一场能力或留挡上限当每轮固定保底。

反例及缺数据：原提案六试均T1饮幽灵；没有延后同条件实战线，不能从最终失败校准早喝/持有价值。

拟议行为：用当前属性与层数逐项兑现，临时减力和留挡按时点处理；不制定统一时机阈值。

验证方法：含敏捷/脆弱/覆甲、临时降力恢复和钳子留挡的完整生产回放，另需延后饮药受控后继。

处置理由：已核局部分源状态，仍缺敏捷/脆弱/覆甲、临时减力及钳子留挡的联合生产回放；无延后幽灵同条件对照，不校准时机或药价。
## silent-proposal-7a8e9ccb7e646538：waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-044250-experience-update/proposal-combat.md；原SHA：e365da8858d06c845b8f83b662fad011721eeab59fd4e0dce4c46aa3925b640f（匹配）。
账本：silent-0005,silent-0006,silent-0011,silent-0021,silent-0024,silent-0027,silent-0034,silent-0077,silent-0079,silent-0123,silent-0129,silent-0180,silent-0221。领域：combat,potion,sl,terminal。
来源任务：experience-update；实现任务：strategy-proposal；仅silent，进阶与场景按以下证据。

证据：9Z9H2EXKLF3T A10 F48末试T10：8904379029为18血；第一偏折8904432407加18，后偏折8904590987至27，防御8904642225至37，8904692678次轮3血、敌112HP。原提案记预测余血−9与实18→3不符。

本批结论：本批核首张翻倍的消耗、整轮净血18→3；这些端点不能唯一分离凋萎、攻击、复活、荆棘和截断的逐事件毛伤，也不能复原历史dirty执行源码。

反例及缺数据：最终实败和24/24模拟全败不证明所有合法线必死；换线预计与实盘差额还伴随熔炉时点变化。

拟议行为：模拟预测与实盘净变化分列，未执行第二击反伤不预支；仅可复现并隔离根因时修改规则。

验证方法：完整历史输入/源码、逐事件毛伤账、复活与截断顺序联合回放；SL阈值需受控整战证据。

处置理由：末试T10实18→3及37挡已核；缺原dirty完整源码和逐击/持牌伤/复活/截断事件归属，不能凭24/24全败修改必死或SL规则。
## silent-proposal-cd9f76184de6e29a：waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-044250-experience-update/proposal-resources.md；原SHA：54f562100db0a2dbc72c07a5b1411e42838e3370221a23ea4b769795196c66aa（匹配）。
账本：silent-0019,silent-0020,silent-0243。领域：structure,sl,terminal。
来源任务：experience-update；实现任务：strategy-proposal；仅silent，进阶与场景按以下证据。

证据：原提案十局A9/A10共16对F17→18/F33→34；本批全部重新索引并读回32原帧、SHA及原run HP。9Z9H2EXKLF3T为24/70→60/70、23/77→66/77；详细逐局见act-transitions.json。

本批结论：16/16均符合floor(缺失HP×80%)且上限不变。此为同一既有局样本的重新核验，未新增16个独立局，也未证明路线、营火、SL和上限变化联合消费者完整。

反例及缺数据：首次仅筛act_id变化时仍在旧楼层，HP尚未回复，16对零匹配；原失败材料保留。实际回复发生在进入下一层的原帧，不能把过早采样当机制反证。未知遗物交互及更低进阶不外推。

拟议行为：只在已观察跨幕节点应用现有公式，营火、赢战消耗、复活、上限变化与SL复药分源。

验证方法：同上限跨幕固定回放与路线/休息/终局/SL资源流联合消费者验收；比较路线仍需同条件后继。

处置理由：十局16对实际跨幕回复全部支持既有公式；缺跨幕/营火/赢战耗血/上限变化/SL复药联合消费者验收和同条件路线后继，不能整项duplicate。
## silent-proposal-292f6731bdb9b669：waiting

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261008-044302-postmortem/proposal-poison-potion.md；原SHA：2f943d1aee2e7ed6d1ddfa07b469a4488d27525bad4714cec58f6a94917a8c63（匹配）。
账本：silent-0087,silent-0020。领域：potion,combat。
来源任务：postmortem；实现任务：strategy-proposal；仅silent，进阶与场景按以下证据。

证据：7X0W3U8TVA2A A10 F31 T13：8919586836后段0毒/25HP；8919626580后段7毒/25HP，玩家仍1血14挡；8919666143后段18HP、前段4、中段重接25，玩家死。仅一饮效果样本。

本批结论：头骨组合药水当步总增量7的机制证据充分。当前combat-plan只给精确知识恶魔或双boss观察上下文，此三段千足虫场景不匹配；不能标已有实现。

反例及缺数据：末轮加7仍死亡，不能断言提前饮用必胜；缺无头骨/阻挡/其他增益对照，不拆基础药效。缺转换数值不能当实测药价为零。

拟议行为：限定本局实际组合，沿observedPoison传入总量7，只加一次，未知效果与持有价值明确未校准；仍保留Jev所有合法选项。

验证方法：先以末T13固定原帧验证0→7且无即时HP伤、结算后25→18；再回溯T1—T12入模，未知组合/其他角色不变。早喝/药价另需可比后继。

处置理由：头骨组合毒药实加7机制证据充分、当前live入口未覆盖；18条合并冲突诊断使本批按任务停止接线，消费者验证未完成。早喝/持有价另缺可比后继。
## silent-proposal-e09a3905a3922b95：waiting

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261008-044302-postmortem/proposal-snakebite-skull.md；原SHA：5066561d71de499c27dba55e8cea63e220d95809a0f6091a31dcb31b136492f5（匹配）。
账本：silent-0087。领域：combat。
来源任务：postmortem；实现任务：strategy-proposal；仅silent，进阶与场景按以下证据。

证据：7X0W3U8TVA2A A10 F17 T3：8910138990普通蛇咬base/current7；8910205964实17→24毒。F31 T1：8916878976 base7/current8，8917003402前段0→8；T13 8919546616同动态、8919586836再次0→8。

本批结论：一个独立局的七毒控制及两次头骨组合八毒已核。当前card-model普通蛇咬仍只接dyn=7，不能将升级十毒或其他毒雾子修复当覆盖普通动态8。

反例及缺数据：两次8毒非两个独立局；T13前段12→4仍未死。升级、人工制品、未知增益和重抽消费者尚未由本任务验证。

拟议行为：仅普通A10/base7且已观察头骨/current8组合按当前8施毒；重抽时基础与当前分开，避免重复再加头骨。

验证方法：七毒控制保持；T1定位、T13同局保留验证，追加离手重抽不重复加1及未知组合/非静默控制。撤码失败与恢复通过后才可交付。

处置理由：普通蛇咬base7/current8两次0→8机制证据充分、live仍未覆盖；18条合并冲突诊断使本批停止扩展，组合入模及重抽不重复加头骨的消费者验证未完成。

## 提交、验证、回退与后续

无源码修改、提交、实际合入或新版本；tsc/vitest/cases均null。没有执行撤源码失败/恢复通过，不能用证据提取核验冒称生产测试成功。幽灵和单弃的既有子源码祖先已核，仅作范围说明，十个宽项均保留waiting。
后续实施先由ops协调当前main/live并行历史与刷新冲突，再沿原ID在独立策略工作树接续对应消费者验证；证据充分的八毒/七毒组合不需要重新创造提案。其他项按具体缺数据等待新局。
本批没有规则上线，无需回退生产；将来实际实现按独立提交逆向回退、保留知识刷新和历史，并按授权双通知Roy。报告结束不关闭量化学习或学习入库父要求。
