# 本批十项提案的核验与处置

记录时间：2026-10-12 02:20:31 CST（写入前已运行date）。

批次：20261012-021301-s2-strategy-proposal，角色silent，普通队列；只处理dispatch.json的十个原ID。
learn.json的task/character/worktree与本批一致，reason=proposal，有proposal_ids，无research_request/implementation_request/proposal_repair。普通批所读deck-size请求绑定另一旧批，不作为本批身份；未读其他专题代替身份。

开工git status干净；git merge --no-edit main返回Already up to date。base/HEAD为`af5872cddb8c205a0d14cb7f95f1d6d18be74c69`，未改生产源码、知识、任务模板或验证输入。live观察点`4159829813ca8a20dbf3ad4c0a1f099a20111866`，原现场只有notes/fight-value-backtest-silent.md刷新脏文件，没有未解决index。

静态git merge-tree --write-tree预检退出1，基线/live之间有16个冲突路径，见merge-conflicts.json和live-merge-preflight.txt。没有实际git merge、没有修改live、没有取锁或提交刷新。按任务冲突即停止的要求停止源码实施/合入；此处是待合分支的合入冲突，不能写成live已有16个未解决冲突。未读取或解决冲突中的其他专题请求正文。

## 共用证据和边界

- runs.jsonl逐局核实十局均SILENT，A5/A6/A7/A10分别保留，不借别的角色补知识。
- 十份原提案Markdown的SHA均匹配队列指纹，原字节保存为各ID.original.txt；queue-snapshot.json保留正确fold后的证据/账本/状态，未忽略派发ID。
- 原日志直接重读：GX673状态、PD9 1125状态、L2 447状态、其余七局各2帧，共2259状态；另39决策、24条SL，共2322原件。evidence-index.json保存逐条原日志line/byte offset/length/SHA256，原日志只读。
- check_facts.py的99项原始数据断言通过，包含8局11对69项改标守恒、原5项副本计数修正、同盘血价、双boss入口、单弃/余像、九护栏四撤回和昏眩实死。这是数据核验，不是tsc/vitest、撤源码或生产回归。
- 本批不拟合任何策略阈值。同一局重试只作相关诊断；以后独立新静默局才是后置验证。实际旧运行树均带dirty且未完整保存，当前源码定位不冒充旧运行树。
- 两项duplicate仅复用已有live祖先，8项waiting分列工程未完成与证据缺口。未新造ID、未改原提案/旧复盘/经验库，不冒称模型已采用或整局胜率提升。

## 逐项处置
### silent-proposal-5a95725089f53cd8：waiting

来源：postmortem → strategy-proposal；账本：silent-0019, silent-0079, silent-0005, silent-0016, silent-0087, silent-0027, silent-0030。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261008-064304-postmortem/proposal-resource-bloodprice.md`。

证据：GXNKW8X1XYJP A10 F45第2/末试T2—T3，states 290160/290165、290201/290206、290212—290214；decisions 283641/283680/283690/283691。T2起点同2HP、同五手、敌84/84/77；末轮13HP+23挡+2覆甲对40攻击仍差2。

旧/拟行为：保持现有评分、药价、护栏及SL门槛；拟按状态指纹、尝试、题目阶段关联原答、替换、重问、实际执行与逐槽资源来源。已有预测审计候选仅是子项，不能代替执行链。

反例与未知：同一局相关SL只能证明局部多保10血、少扣8敌血；精灵自动消耗不等主动饮用，缺瞬时复活帧不补造逐击顺序。无替路线或提前用药的整场胜利反事实。

验证方法及当前结果：恢复实施后用原帧验证原答→SL替换→重问→执行，逐槽区分自动消耗/饮用/新获/SL恢复；冻结当前规则作无行为差异对照。

处置理由：GX F45 T2同盘后T3为3血/0挡/敌218与13血/7挡/敌226，两线均失败。完整复活逐击帧、旧dirty源码及实际执行前缀关联缺失；审计候选be698559、5604982e未入live，基线/live的16处冲突阻塞实施。

### silent-proposal-51fa8bc34774f72d：waiting

来源：postmortem → strategy-proposal；账本：silent-0279, silent-0280。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261008-064304-postmortem/proposal-dampen-identity.md`。

证据：GXNKW8X1XYJP A10 F45 T2→T3，sl-attempts 1053—1056；states 290160/290165、290201/290206。ZE8F192FKX24 A5 F42 T2→T3配对与原T3/T4文本记录作为机制先证。

旧/拟行为：旧draws.ts在observeInserts以含升级的键做left/grew，故四种普通键被登记inserted。拟在已观察抑制窗口、同基ID守恒且唯一可配对时区分版本变化与物理牌增减；歧义保守断序，战内版本与场外deck分账。此项没有因缺新局而推迟定位。

反例与未知：四次追踪来自同一局；现帧能证明改标前后守恒，不能证明未保存的瞬时抽序。多副本、混合版本、真插牌或洗牌同帧不得强行配对。未证明胜负影响。

验证方法及当前结果：以保存原帧做纯改标/普通入手及留堆的正例；用同ID多副本、真实插牌、洗牌、缺帧和其他角色作保守阴性控制。撤源码应失败、恢复应通过，随后原沙箱入口及live合后检查；本批因冲突没有执行这些源码测试。

处置理由：GX F45四次假inserted及clean19/18/19/18已重核，draws.ts仍用升级键作差，窄范围修复证据充分；基线/live的16处冲突阻塞实施。抑制瞬时帧及同ID多副本唯一身份未知，必须保守断序。

### silent-proposal-29b7b36dffbcb017：waiting

来源：experience-update → strategy-proposal；账本：silent-0005, silent-0006, silent-0011, silent-0016, silent-0021, silent-0027, silent-0030, silent-0087, silent-0278。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-071205-experience-update/proposal-mechanisms.md`。

证据：GXNKW8X1XYJP A10 F33 T3/T5/T6、F45 T1—T3。states 289976已建ACCELERANT_POWER2，289986→289987敌214→130、毒29→26；289988→289989毒26→31且另有即时本体变化，不能混算同一来源。F45 T3持有普通触媒但未建立。

旧/拟行为：按当前实际力量、敏捷、覆甲、已建立毒雾/触媒和已施毒分别核算；保持已有模型，不以牌组持有能力预支收益，也不新增一律先能力/早用药规则。

反例与未知：该ID覆盖九条经验，机制局部正确或经验文本已上线均不等同全入口实现。旧dirty源码未完整保存，覆甲减层与药水时点的完整条件未隔离。

验证方法及当前结果：待合入冲突解除后逐入口做固定状态差分，区分施毒与结算、已有能力与未建立能力、制品与头骨条件；无充分对照的策略权重继续保持。

处置理由：GX F33实际建立触媒2层及29毒扣84可核，F45未建立能力不能预支。九机制全入口固定回放尚未齐，完整覆甲减层、先能力及提前用药整战对照缺失；基线/live冲突下不以已有局部模型关闭联合提案。

### silent-proposal-2631859b524e0652：waiting

来源：experience-update → strategy-proposal；账本：silent-0280。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-071205-experience-update/proposal-dampen.md`。

证据：ZE8F192FKX24 A5、VN7RQJMJEFMX A6、2PVLGRBGUX9S A7、DPYF2BAA3DKT/UMVLWER4CD98/VLZ6CCT8AQ0A/YF0LXT1QSTGG/GXNKW8X1XYJP A10；每对精确楼层和时间见facts-verified.json的dampen_pairs。8局、11对、69项，不当69个独立样本。

旧/拟行为：复用51fa8bc原身份修复链，不另造同根因ID。实际手牌/牌堆版本独立于场外升级；当前不改已建立能力或未观察等级。

反例与未知：原五项副本数漏计的原值及重算值均保留；纠正计数不增加独立支持局数。完整牌实体ID与瞬时帧缺失，有歧义仍断序。

验证方法及当前结果：八局只用于确定机制边界，窄实现限已核范围。固定正反例验守恒、真实增减、歧义与无抑制旧路径；本批不改经验库和旧提案原文。

处置理由：八静默局十一对六十九项改标总数守恒已独立重算，原五项*N漏计另存纠正；与0279同根因的身份修复未实施，受16处合入冲突阻塞。聚合守恒不能补足唯一副本身份或改标瞬时抽序。

### silent-proposal-b13fda1dfeb37927：waiting

来源：experience-update → strategy-proposal；账本：silent-0019, silent-0020, silent-0079, silent-0243。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-071205-experience-update/proposal-resources-sl.md`。

证据：GXNKW8X1XYJP A10 F35/38/40、F42/F44/F45，末F45第2/末试T2—T3同盘对照；完整本局673状态已重读，关键原始offset/SHA见evidence-index.json。

旧/拟行为：复用原资源审计/学习链，保持路线与药水/SL/终局权重；计划投影、实到血量、赢战净耗、自动精灵和SL恢复分账。

反例与未知：不能将局部更高后续HP视为整场胜率提升；缺失的替路线与药时点整战不由模拟样本冒充。该联合项也不因跨幕回复子经验已发布而关闭。

验证方法及当前结果：原帧验证资源入口/出口与恢复分源，并串联到真实动作；规则保持等价。后置独立新局只作未来验证，不将同局重试拆训练/测试。

处置理由：GX的赢战资源链和复活后局部10血/8敌血取舍可核，但两线均败；缺替路线/提前用药整战对照、复活逐击帧和完整执行资源关联。已有预测审计候选非live祖先，16处冲突阻塞工程续办。

### silent-proposal-33f42d310878caa7：duplicate

来源：postmortem → strategy-proposal；账本：silent-0228。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261008-071302-postmortem/proposal-terminal-resources.md`。

证据：PD9AYQVMLQW6 A10 F47休息、F48 T1—T10、F49六试；states 290966—291342，第二boss六次入口行号及空槽原值见facts-verified.json。

旧/拟行为：继续复用continuationInput/fightSample：首战成功后以该样本实际剩余HP/药/复活接续，首战胜利不算联合胜利。没有新增留药门槛或终局权重。

反例与未知：58→10→10是一条实线，不要求每个模拟样本都输出10。联合零胜样本未校准，本局首战胜利不构成联合模型独立错误或替线获胜证明。

验证方法及当前结果：已做原始状态事实校验、源码接线检查及git merge-base --is-ancestor验证。当前相关源码与live仅Roy/Dai名称注释差异；不把旧测试记成本批新测试。

处置理由：PD9 F48的58→10与F49六次10HP空槽接续重核；当前live已有同样本HP、带槽位药水、复活资源接续及非终战HP价值，未定位新接续缺陷，复用实际live祖先e1a467e18。

实际live祖先源码：`e1a467e18a0dfa8d99046a24ff4c0e1af59278c8`。

### silent-proposal-9e00f95f7cf1e2d4：duplicate

来源：postmortem → strategy-proposal；账本：silent-0239。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261008-071302-postmortem/proposal-rollout-boundaries.md`。

证据：PD9AYQVMLQW6 A10 F48T1 decision284407、F49首试T1 decision284458及末T7 decision284693；本批重新读取原决策，有限死亡样本与实盘改线后的更晚死亡没有混算。

旧/拟行为：复用silentSimulationReference及其两个问题视图接线；有限样本、时钟回退、并列、未比较、未知牌、抽牌后重算分别展示。饱和排名保留，SL准入和预算不变。

反例与未知：饱和的估计损失封顶不等于固定五轮全死；抽牌重问改变路径，不能拿T10实际终局否定此前整条固定计划。无新阈值依据。

验证方法及当前结果：现live的silent-simulation-reference.ts与本树字节相同，源码commit已核祖先；原日志事实分列核验通过。无本批源码改动，未运行生产测试。

处置理由：PD9 F48T1饱和但五轮死0/6、F49首T1死8/8及末T7死24/24已核；live已分列horizon/samples/sampled_wins/sampled_deaths、未知牌与抽牌重问边界，复用实际live祖先45161a51。

实际live祖先源码：`45161a51c2c6b7e4a499b13cf749c4108193bbf5`。

### silent-proposal-d7b8d36cf3d0303d：waiting

来源：postmortem → strategy-proposal；账本：silent-0268。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261008-071302-postmortem/proposal-survivor-discard.md`。

证据：PD9AYQVMLQW6 A10 F49第6试T10，states291336—291342、decisions284707—284711、sl-attempts1067；3HP、实际32挡、24持牌伤+23攻击仍需15HP，敌250→244后玩家死亡。

旧/拟行为：旧单弃消费仍绑绷带收益；已有bf423c17候选覆盖唯一余牌/未知选择边界，本批不重复实现。当前evaluate仅聚合新增WITHER数量，尚不能把它视为完整可弃实体消费。

反例与未知：把持牌伤36改24不代表实际少损12或转胜。既有候选的首证来自其他静默局，当前本批只以PD9原帧核所需补充范围，不扩展升级版或其他抽弃牌。

验证方法及当前结果：由正在处理17源集成的原批续办既有候选；本项还需固定PD9生成WITHER、强制选择、余像完成时点与死亡结算的回放。实际live及全项覆盖验证前保持waiting。

处置理由：PD9末T10普通生存者后31挡/三凋萎→32挡/两凋萎已核。候选bf423c17尚非live祖先且不证明门槛新增WITHER进入可弃实体池；缺生成/选择/余像时序的端到端固定回放，另有16处合入冲突。

### silent-proposal-c873d6543c414f92：waiting

来源：postmortem → strategy-proposal；账本：silent-0125, silent-0005, silent-0044, silent-0253。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261008-074302-postmortem/proposal-control-trace.md`。

证据：L2TSFU62Z57Z A10 F17，decisions284918/284967/284971/285020/285024/285073/285077/285126/285130；实际第2试T2护栏保留，随后四试T2被SL撤回，四个T3后空翻再问。

旧/拟行为：候选省血与实际净耗分账；拟保存原选、支配、护栏、SL最终选择、已执行前缀及下题关联，药水饮用/丢弃/新获/恢复分别计。保持现有打法参数。

反例与未知：自然语言可人工追踪，但不能把九条护栏文字累计为90点实际省血；未执行全线、完整dirty运行树及受控药水时点胜负未保存。

验证方法及当前结果：先复用并验证已有审计候选的真实覆盖，不另造ID；然后固定本局九条控制路径与四次撤回、抽牌新题和真实动作消费者的对应。

处置理由：L2 F17九条护栏中四条T2随后由SL撤回已核。完整候选稳定ID、执行前缀与抽弃重问父子链接未齐；be698559/5604982e/f1542578为未入live的预测审计子项，16处冲突下不重复实现或冒称全链完成。

### silent-proposal-dfbf51502f30c9b1：waiting

来源：postmortem → strategy-proposal；账本：silent-0021, silent-0133, silent-0222, silent-0049, silent-0020。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261008-074302-postmortem/proposal-ringing-terminal.md`。

证据：L2TSFU62Z57Z A10 F17末试T6 states291780—291783/decision285148，T8 states291790—291792/decisions285155—285157。168→159跨现场160阈值且清力量；末T8一牌后四张blocked_by_hook、敌113、玩家死亡。

旧/拟行为：保留全败模拟并列和一牌额度，展示已兑现伤害与尚未兑现能量/抽牌；不把模拟plan1的7伤补进实际输出，也不制定全败时固定先攻击规则。

反例与未知：一局六试不是六局，1200模拟样本不是真实样本；增能牌未建模、抽序与重问后路径缺完整反事实，局部攻击量更多不能推出整场更好。

验证方法及当前结果：冻结原T6三线、未知牌及死亡分母，对照完整可执行前缀/下一轮额度；有证据定位模型或排序缺口才窄改。当前没有充分依据改权重，合入冲突也未解除。

处置理由：L2末T6的7伤线与结束线整战各1200样本0胜，但五轮死14/24对11/24，侧步仍标未建模；末T8昏眩一牌后17HP对17伤死亡。缺完整同起点替线/抽序/出牌额度对照，不据即时7伤改终局优先级。

## 源码范围与回退

source-ancestry.json保存六个相关源码的祖先查询：e1a467e18与45161a51为live祖先；bf423c17、be698559、5604982e、f1542578均非祖先。后四者属于正在整合的旧候选；候选存在不能登记duplicate。7个检查文件与live的实际差异及SHA保存于source-inspection.json/inspected-source-live-diff.patch：差异只涉及Roy/Dai操作人名称，相关算法没有差异。

当前无需回退，因为没有本批源码/知识提交与上线。后续获通道实施时各项单独提交，撤源码红/恢复绿、原沙箱入口自测、live锁内知识刷新与冲突预检、合后复验、实际版本和双通知仍需完成；回退只逆对应窄源码增量，保留日志、刷新和并行记录。不把历史候选测试成绩迁移成本批通过。
