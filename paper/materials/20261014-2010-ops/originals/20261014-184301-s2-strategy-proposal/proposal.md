# 静默猎手策略提案逐项核验（20261014-184301-s2-strategy-proposal）

本批没有源码实现或合入。十个原提案均保留waiting，理由逐项区分已有窄覆盖、证据限制和发布阻塞，不能视作游戏机制均缺证或已经全部重复实现。

普通队列绑定：task=strategy-proposal，character=silent，reason=proposal；工作树/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-184301-s2。本批无research_request/implementation_request，不承接其他专题，不新领队列。原十Markdown SHA均一致，副本及来源在original-proposal-manifest.json。原提案和父要求均保持。

完整base：`a43decfe89e60877dea41d91157d4b32dbc989b8`；开工git status干净，git merge --no-edit main为Already up to date。只读merge-tree在固定live `d9bfb65a4ec28cdda8706a150fc4341d28db1227` 返回1，17个共享记录冲突，详细路径与输出SHA在live-merge-preflight.json及-frozen.txt。按任务“有冲突就停下回报”停止源码实施，不实际merge、覆盖记录、改live、造提交/版本或补测成功。

读取README、最新STATE-2026-10-12、decision-log末尾、learning-protocol、learning-code-proposals及原提案。native-profile.json核实际gpt-6.1-sol/xhigh/workspace-write/never；任务正文请求high，实际原生会话是xhigh，本会话未修改宿主配置、未声称已切换成high。只读session证据为offset 50287，SHA 77fd6117d5472e817283ef9c23b6197dbb3f0bbd33ce089cf9284a752ec9ee19。

## 有界证据与验证口径

本批10个派发锚点，另9局只因十个原提案明确引用而读取。verified-runs.json逐局核SILENT：A3/A4/A6/A7/A8各1，A10共14；历史混合脑不冒称全为纯Codex。共用extract_evidence.py按显式run/run_id/state.run_id/fingerprint.run取归属；所有流冻结source_size，逐行原字节/offset/bytes/SHA/正文/身份与输出计数复核，共33,276行（states16561、decisions15612、SL137、run-config19、run-plans130、brain798、runs19、fight-plans0）。0行只说明此冻结截点未选到显式所属行，不等于无战斗计划或原日志缺失。原源states/decisions各2行、brain1行不可解析，原件不修改且不认作本批支持证据。

重点有界读回为5局924状态、841决策、19 SL记录，见selected-states.evidence.jsonl、state-observations.json、selected-decisions.json、selected-sl-attempts.json；全19局只是材料归属核验，不声称逐局完整策略分析。所有历史code均带dirty，run-config基础提交不能冒认当时完整执行源码。没有读取其他角色知识、游戏二进制、凭据或.env，没有运行play、联网、调用LLM或派下级agent。

不拟游戏权重/药水血价/休息门槛/SL必死/终局参数。涉及终局的原资源提案只审限制，infection沿e6f9更正仅combat/potion。全部SL尝试按同一局归组；后续机制实现用冻结正反例，策略效果用截止后新完局时间留出。撤源码失败/恢复通过及tsc/vitest/cases均为null：没有生产源码变更，未运行发布测试；三个固定投影是基线诊断，不是源码实现或整战消费者认证。

## 当前源码与窄路径

六份base/live源码对象在source-audit.json：turn-solver、combat-plan、rollout逐字相等，其余card-model、sl/explore、sl/judge仅Roy/Dai注释署名差异；完整diff保存live-source-differences.patch。source-diff.patch为空，工作树无改动。五个既有源码提交均核为固定live祖先，但每个只证明自己的窄范围，不能用来关闭十个宽提案：

- `2e6fa2e5c68be70efb2ee87bee58f2cb3128bfb2`：持牌伤先于敌方回合毒结算。
- `cf0f2495354d9cf5dcb96dc31a2de0f4c53f441a`：普通蜃景读取当时毒量的窄条件模型。
- `e3e7068b028e9d9bb75441b99a973161e9d90f4d`：普通施毒攻击穿透命中与跨轮传播。
- `a6ed582e8c26e1cc7d51fd21459d1c46481bfa10`：子弹时间禁抽；不等同战斗专注。
- `222445a9bb6bf56cb4f3ceea2cc8b20fba54128f`：已观察毒胜前资源保持；不等于宽终局提案。

诊断脚本diagnose-model.mjs只用固定原帧投影和空升级表，不读刷新的知识JSON，不模拟完整敌招/遗物集合：

- 普通专注s295458：自身抽3成立，模型after.noDraw=false，下一原帧NO_DRAW1；缺口仍存在，子弹时间提交不能代替。
- 苦无s295428第三攻前投影：现有PlayerSim无苦无入口，第三攻新敏捷仍0；步法后仅2，普通防御增7，原帧敏捷1→3且同牌增8。该隔离对照不声称24/31总差或全候选复现。
- 感染s293464：当前模型heldDamage9、diesOwnTurn=true、damageDealt0、目标8HP/10毒保持；与原结束帧先死一致。不是整个毒药/所有组合提案完成。

model-diagnostics.json/log保存真实运行输出；material-findings.json保存原帧断言。缺原始完整后继、混合遗物/重放/弃牌身份及整战反事实的量保留未知。

## 十个原提案

### silent-proposal-243ad8dd038a4ff6：同首29抽蟹重打与三骑士资源

账本：silent-0019,silent-0020,silent-0065,silent-0106。来源任务experience-update；目标strategy-proposal。原Markdown副本silent-proposal-243ad8dd038a4ff6.original.md；SHA `e8f8451e62c4f0435082e636dba0308bbe60ee86b992f85328a17835062a1acc`。

证据：K2JAGKVJAWZJ A10/F33 T1—T11、F46 T1—T9；SL首试仅predicted_death，末试won余28；首29抽同序，T5洗牌后未知。

反例/限制：多回合、攻击目标与饮药同时改变；高血两药的三骑士仍实死。没有单动作受控整战或未走路线结果。

旧/新行为及验证：保留尝试身份和资源分账；不拟新的SL准入、休息或终局阈值。后续按整局分组验证，不把SL当独立局。未来最小实现各自独立提交，撤回该净源码时固定测试必须失败、恢复通过；沙箱测试/gitleaks、知识刷新冲突预检、合后自测及正式版本由实际上线流程承担。本批没有任何新行为生效。

处置waiting：首29抽后的抽牌条件与单动作/替代路线整战反事实缺失；17项共享记录合入冲突亦未解决。

回退：本批无需回退；后续若有实际源码发布，只逆向对应独立净补丁，保留原提案、证据、知识刷新和其他并行记录。

### silent-proposal-9c3ff04261867dd2：资源更正与能力/跨幕回复

账本：silent-0021,silent-0243,silent-0276,silent-0277,silent-0278。来源任务experience-update；目标strategy-proposal。原Markdown副本silent-proposal-9c3ff04261867dd2.original.md；SHA `2f19523d142524633da29cdb34fd133fd86b3b8fbc95cf4de2e10c37ad4ebb7b`。

证据：K2JAGKVJAWZJ A10/F27 T2 s292788→292789：牌挡0→0、覆甲0→7；F17→18回复45，F33→34回复37。

反例/限制：旧16即时挡记法已被原更正撤回；饮药当步与轮末挡、SL恢复与回血不能混用。换药/时点的整战胜因未控。

旧/新行为及验证：维持已有药水门槛；新实现只补已观察事实与消费者追踪，不把持有能力视为已建立。未来最小实现各自独立提交，撤回该净源码时固定测试必须失败、恢复通过；沙箱测试/gitleaks、知识刷新冲突预检、合后自测及正式版本由实际上线流程承担。本批没有任何新行为生效。

处置waiting：铁心0挡更正已核，但宽资源提案缺完整消费者及相同资源下的饮药/构筑整战对照；17项合入冲突未解决。

回退：本批无需回退；后续若有实际源码发布，只逆向对应独立净补丁，保留原提案、证据、知识刷新和其他并行记录。

### silent-proposal-650ea306e8627f9e：脑来源计数勘误与原提案依赖

账本：silent-0010,silent-0012,silent-0013,silent-0019,silent-0020,silent-0021,silent-0046,silent-0065,silent-0077,silent-0106,silent-0115,silent-0178,silent-0243,silent-0276,silent-0277,silent-0278。来源任务experience-update；目标strategy-proposal。原Markdown副本silent-proposal-650ea306e8627f9e.original.md；SHA `99bf749a34924cae166afdd58e915b59927c8de6a3c400b57587e194cdf49290`。

证据：K2JAGKVJAWZJ A10/F1—F46：48条实际Codex brain记录，71个codex决策含复用；722决策/814状态。

反例/限制：runs.deepseek_calls是历史兼容计数，不能因此认作DeepSeek脑；原dirty源码完整内容未知。原关联机制未随计数勘误全部实现。

旧/新行为及验证：只更正证据口径并保留原提案；不重复创建id、不制造行为版本。未来最小实现各自独立提交，撤回该净源码时固定测试必须失败、恢复通过；沙箱测试/gitleaks、知识刷新冲突预检、合后自测及正式版本由实际上线流程承担。本批没有任何新行为生效。

处置waiting：48调用/71决策来源勘误已核；关联宽机制与资源提案仍缺消费者验证，不能仅以文档更正关闭全部范围；17项合入冲突未解决。

回退：本批无需回退；后续若有实际源码发布，只逆向对应独立净补丁，保留原提案、证据、知识刷新和其他并行记录。

### silent-proposal-aff5ac3bb7cdb81b：饱和SL换线的即时资源账

账本：silent-0079,silent-0135,silent-0167,silent-0168,silent-0010。来源任务postmortem；目标strategy-proposal。原Markdown副本silent-proposal-aff5ac3bb7cdb81b.original.md；SHA `0d6558b7a3202aaf072b159c279b4cf1c19837e2bbe4df2973b3a81623f05363`。

证据：NEWRFAYKTQHR A10/F31 T2 d287298/287341/287366；s294063—68与294131—35：原线损3/伤30/挡11，替线损8/伤23/挡4、污染6→3。

反例/限制：首试题面为8样本，第三/末试为24样本，两案均全败；后轮改变，无受控整战胜线。原答与执行、HP/伤害numbers已存在，不能报全面漏记。

旧/新行为及验证：只补结构化旧线/新线及完整资源差额；固定原题读回验证原答未被替线改写，候选和探索准入保持。未来最小实现各自独立提交，撤回该净源码时固定测试必须失败、恢复通过；沙箱测试/gitleaks、知识刷新冲突预检、合后自测及正式版本由实际上线流程承担。本批没有任何新行为生效。

处置waiting：原答、实线及HP/伤害对照已记录；格挡/毒/污染差额与饱和标志的完整结构字段/消费者未齐，17项合入冲突阻止剩余接线；不据单局改探索准入。

回退：本批无需回退；后续若有实际源码发布，只逆向对应独立净补丁，保留原提案、证据、知识刷新和其他并行记录。

### silent-proposal-60e68d681e861d1c：感染结束伤与毒药覆盖

账本：silent-0286,silent-0278。来源任务experience-update；目标strategy-proposal。原Markdown副本silent-proposal-60e68d681e861d1c.original.md；SHA `d6477b9c87124b415d47f324fae196beb88a0d08167bd998b456f86b3fcefc8d`。

证据：79UCJ0K6R9C1 A10/F14 T10—T11 s293457—65：两个感染先吃6挡；三感染9伤吃7挡后2血死亡，8HP/10毒敌没有毒结算。

反例/限制：当前窄模型已先结算持牌伤，不能报全面漏算。毒药仅施毒，不是即时敌HP伤；普通战、头骨/制品及未隔离组合不得用特殊场景代替。

旧/新行为及验证：覆盖求解→药水执行→重读→结束顺序，禁止死后结毒；不改变饮药/持有门槛。未来最小实现各自独立提交，撤回该净源码时固定测试必须失败、恢复通过；沙箱测试/gitleaks、知识刷新冲突预检、合后自测及正式版本由实际上线流程承担。本批没有任何新行为生效。

处置waiting：感染先扣持牌伤已有live窄实现；普通战毒药/头骨/制品等路径的完整消费者验证未齐，17项合入冲突阻止剩余接线；本项领域沿e6f9更正为combat/potion。

回退：本批无需回退；后续若有实际源码发布，只逆向对应独立净补丁，保留原提案、证据、知识刷新和其他并行记录。

### silent-proposal-9aa48a84227bcdb5：资源预测、实建与SL恢复分账

账本：silent-0019,silent-0020,silent-0243,silent-0021,silent-0276,silent-0277,silent-0259。来源任务experience-update；目标strategy-proposal。原Markdown副本silent-proposal-9aa48a84227bcdb5.original.md；SHA `6e755f305975acfa695aec86f2dca6234746abe1ec3ec80c3eff8dc8a6fa51ef`。

证据：K2JAGKVJAWZJ A10/F17→18、F33两试与F45—46；79UCJ0K6R9C1 A10/F14；NEWRFAYKTQHR A10/F28四试及F31四试。

反例/限制：SL恢复原药不等新获药；净HP损失含再生/回复，不能当敌毛伤。未走路线、未来F32/F33/F48/F49和不同饮药时点结果未知。

旧/新行为及验证：实际损伤、回复、主动弃药/饮药和SL恢复分别追踪；保留当前规则，按时间留出新完局。未来最小实现各自独立提交，撤回该净源码时固定测试必须失败、恢复通过；沙箱测试/gitleaks、知识刷新冲突预检、合后自测及正式版本由实际上线流程承担。本批没有任何新行为生效。

处置waiting：未执行路线与饮药时点的受控整战结果缺失，宽资源消费者尚未齐；不能据净HP损失拟新价值/门槛，17项合入冲突未解决。

回退：本批无需回退；后续若有实际源码发布，只逆向对应独立净补丁，保留原提案、证据、知识刷新和其他并行记录。

### silent-proposal-7cfd0f9b6b0fbbda：多机制与坚韧之环施放快照

账本：silent-0012,silent-0005,silent-0016,silent-0080,silent-0046,silent-0084,silent-0011,silent-0023,silent-0010,silent-0123,silent-0168,silent-0079,silent-0135,silent-0133,silent-0289。来源任务experience-update；目标strategy-proposal。原Markdown副本silent-proposal-7cfd0f9b6b0fbbda.original.md；SHA `2705cc7cfa6181902ad3b2010632dbfff1ea8a64d2410618275af1a5356dfef5`。

证据：79UCJ0K6R9C1 A10/F14 T2—4/T10—11；NEWRFAYKTQHR A10/F31 T2—4；ZVYUL2YP3518 A10/F33 T6—8。

反例/限制：蜃景收益会随先施毒而变，技能污染同时增攻；坚韧之环普通施放值与后续敏捷分源。升级/叠层/重放没有隔离证据，单轮净收益不能拟全战规则。

旧/新行为及验证：按原普通牌实见条件逐项补状态传播；不预支尚未活到的延迟挡，不把同死亡率描述成资源等价。未来最小实现各自独立提交，撤回该净源码时固定测试必须失败、恢复通过；沙箱测试/gitleaks、知识刷新冲突预检、合后自测及正式版本由实际上线流程承担。本批没有任何新行为生效。

处置waiting：普通施毒/蜃景等只有窄子项已覆盖；坚韧之环施放值跨轮入口及宽组合消费者未完成，升级/叠层/重放仍未核；17项合入冲突阻止接线。

回退：本批无需回退；后续若有实际源码发布，只逆向对应独立净补丁，保留原提案、证据、知识刷新和其他并行记录。

### silent-proposal-e6f9cb57c1204036：感染提案领域更正

账本：silent-0286,silent-0278。来源任务experience-update；目标strategy-proposal。原Markdown副本silent-proposal-e6f9cb57c1204036.original.md；SHA `f2377f6b22fed47a6b0ff21f786d6238856ade64bb574bb9ca61cec88b67aee6`。

证据：与60e68d681e861d1c共用79UCJ0K6R9C1 A10/F14 T10—11；原Markdown另有领域更正段。

反例/限制：领域更正是同一范围的补链，不代表原combat/potion实现完整；没有terminal参数研究。

旧/新行为及验证：与60e68d共享核验与后续代码，保留两个原id和指纹，避免重复实现。未来最小实现各自独立提交，撤回该净源码时固定测试必须失败、恢复通过；沙箱测试/gitleaks、知识刷新冲突预检、合后自测及正式版本由实际上线流程承担。本批没有任何新行为生效。

处置waiting：领域更正已遵循，原感染/毒药宽范围消费者仍未齐且17项合入冲突未解决；不把同文更正登记成整项已有实现。

回退：本批无需回退；后续若有实际源码发布，只逆向对应独立净补丁，保留原提案、证据、知识刷新和其他并行记录。

### silent-proposal-68322129f031077b：普通战斗专注先抽后禁抽

账本：silent-0290,silent-0292。来源任务postmortem；目标strategy-proposal。原Markdown副本silent-proposal-68322129f031077b.original.md；SHA `8157a13def891ebda7b7ceda0829f7a10f72ed2ce85479cd248628ad72076d6d`。

证据：9R916WW0V65N A10/F49第2试T2 s295458→59添3牌并NO_DRAW1，s295460步法不添牌；d288467抽9/伤23/零损→d288468伤4/损7。

反例/限制：原长线被撤，魂缚和重规划也参与差额；准备未实打，不能虚构其抽0；更早A0的LRN原帧本批未重新提取，升级/重放/其他取牌保持未知。

旧/新行为及验证：普通已观察模板自身3抽后建立封锁，下一轮清除；固定自身抽牌/后继牌与能力抽0、已有封锁、子弹时间、SL已知抽牌及其他角色等价边界。未来最小实现各自独立提交，撤回该净源码时固定测试必须失败、恢复通过；沙箱测试/gitleaks、知识刷新冲突预检、合后自测及正式版本由实际上线流程承担。本批没有任何新行为生效。

处置waiting：本批A10普通专注机制已核，固定投影仍自身抽3后noDraw=false；17项共享记录冲突阻止实现及消费者验收，不能记duplicate；升级/重放/其他取牌未核。

回退：本批无需回退；后续若有实际源码发布，只逆向对应独立净补丁，保留原提案、证据、知识刷新和其他并行记录。

### silent-proposal-8df611363cd82fc9：苦无新敏捷进入后继挡

账本：silent-0291,silent-0085,silent-0005。来源任务postmortem；目标strategy-proposal。原Markdown副本silent-proposal-8df611363cd82fc9.original.md；SHA `dde31d667fe44c768ba98bcebe161ccdcd93fdddf4cb6c7708a4bb1061522394`。

证据：9R916WW0V65N A10/F49 T1 s295428→29第三攻敏0→1/挡0；步法到3，防御增8；末试另线后空翻8/生存者11，T2 s295549敏6/挡0仍亡。

反例/限制：原题24与实际31含重规划/其他遗物/重放，不能全归苦无；同局六试不是独立六局。自动/重放来源与缺失计数不外推，末试无挡牌不能因敏捷免死。

旧/新行为及验证：限Silent A10可靠手动计数：第三攻击完成后加敏、先前挡不倒补；核计数0/2/3/4、先挡后攻、读到既有敏捷、跨轮持久/下一战重置及其他角色等价。未来最小实现各自独立提交，撤回该净源码时固定测试必须失败、恢复通过；沙箱测试/gitleaks、知识刷新冲突预检、合后自测及正式版本由实际上线流程承担。本批没有任何新行为生效。

处置waiting：手动第三攻增1敏与后挡8已核；仍无苦无入口及跨轮传播验收，17项合入冲突阻止实现，不能记duplicate；自动/重放和缺失计数保持未知。

回退：本批无需回退；后续若有实际源码发布，只逆向对应独立净补丁，保留原提案、证据、知识刷新和其他并行记录。

## 记录、上线和接续

无新增代码提案id，code_proposals为十个已登记CLI原id；未直接改提案队列。既有机制账本保留claim/status/evidence/first_run/asc/prior/version；只经根learner/ledger.py update追加by/where/note追溯报告，不把旧shipped机制等同本批实现，不重复写历史复盘。具体CLI原字节回执及读回验收写ledger-update-receipt.json。

源码提交、合入提交、行为版本、shipped、规则变更双通知均无。本批未实际合入，因此不登记上线或发规则变更通知。运维可据固定17项冲突回执协调原记录集成后，沿原十id接续窄机制实现和消费者验证，不另建重复提案、不关闭宽范围/量化父要求。工作树及全部原材料由原启动器/回收器按未完成门禁保留，不在模型内删除自己工作树。

## 执行限制和失败历史

两次shell在bubblewrap构建期因其他工作树/目录消失出现rg纯ENOENT，原命令同权限重试后成功；不是源码失败。初次材料schema查看遇到combat=null导致TypeError，改为只读COMBAT对象后核对；另一次探查不存在的logged-combat-replay.ts收到ENOENT，没有因此认定对局缺失。原native事件流、out/err以及本批提取/核验/诊断日志保留，未改失败或历史截点。本批新材料全部在指定scratch。

报告生成前实际date：Wed Oct 14 19:03:38 CST 2026。
