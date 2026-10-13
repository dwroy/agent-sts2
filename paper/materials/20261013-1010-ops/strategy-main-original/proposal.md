# 静默猎手策略提案逐项核验

记录时间：2026-10-13T09:57:49+08:00。批次：20261013-094149-strategy-proposal。角色：silent。派发锚点：751FN9QM9MHQ, KV0JHNJCKXLS, YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN, KEN58SH9SLZ6。

本批10个原提案全部waiting。六局原始证据与现有诊断已核，尚缺原提案要求的完整重规划收益归属、受控整战后继或留药反事实，未获得支持新阈值/排序的验证。本批没有生产源码、知识、任务模板改动，HEAD保持`3b8e42b099c13017d5cdb48da41aba9338b8b097`，`fixes=[]`、`merged=null`；无新提交、合入、发布或shipped登记。

## 派发与基线

- 首次git status为空；HEAD为上述完整40位base。按普通批次执行`git merge --no-edit main`，返回Already up to date，HEAD未改变。
- 根learn.json对应批task=strategy-proposal、character=silent、reason=proposal、state=running，工作树与本题一致，带指定10个proposal_ids，没有research_request/implementation_request/proposal_repair。
- 普通批次按要求只检查根notes/strategy-research-silent.json身份；它绑定20261010-150327旧批及旧树，和本批不匹配。因此继续本批原队列。没有接管其他专题、读取另一请求来替代身份或改learn.json。
- 三类专题/实现回执均不存在，不套用纯研究或冻结实现完成口径。派发原行保存dispatch.json；专题绑定检查保存research-binding-check.json。
- 10份保存Markdown分别按队列proposal_sha256核字节一致，原件保存在`<id>.original.md`；没有新增或重建提案id。code_proposals字段列原CLI已登记id，implementation_domains为空，表示本批无领域代码实现。
- 日志只读；runs.jsonl逐局均SILENT/A10。历史code里的+dirty保持，不声称恢复原完整开局树；旧兼容引擎字段不当本批原生请求模型证明。本任务未另行调用LLM或网络、未运行play、未派下级agent。

## 范围与原件

evidence-manifest.json逐原行保存行号、字节偏移、长度和SHA256，并保留本批六局的runs、states、decisions、sl-attempts、run-plans原字节。状态/决策读取限定至280900/274900原行，六局完整历史窗口均在其前；未把后来新增局混入证据。所有所选状态character_id为SILENT。

| 局号 | runs行 | states | decisions | SL记录 | 计划记录 |
|---|---:|---:|---:|---:|---:|
| 751FN9QM9MHQ | 583 | 624 | 615 | 6 | 2 |
| KV0JHNJCKXLS | 584 | 686 | 669 | 7 | 5 |
| YQL8RZ8BWN1E | 585 | 582 | 571 | 6 | 3 |
| L9SGRBB5R698 | 535 | 653 | 635 | 6 | 3 |
| PU80F84P6HPN | 540 | 1064 | 1033 | 12 | 5 |
| KEN58SH9SLZ6 | 586 | 558 | 548 | 6 | 3 |

SL记录分房间、尝试和结果读取，KV0的7条含F16，PU80的12条含不同战斗；不把记录总数称为读档次数或独立样本。每局复盘原段单独保存`<run>.lessons.original.md`及lessons-index.json。有关12个silent经验条目保存related-experience.json；其晚期局号/统计仅作既有知识与边界检查，没有把未分析的后来局列为本批新增证据。

## 已核实的差额、反例与未知

| 同指纹入口 | 原线实际损血/净扣敌血 | 替线实际损血/净扣敌血 | 有范围的结论 |
|---|---:|---:|---|
| 751 F17 T2，第1/3试 | 13 / 9 | 18 / 18 | 多9扣血付5玩家血；替换题中B2 .195/.193属于并列误差范围，仍有实际血价 |
| 751 F17 T7，第2/4试 | 13 / 12 | 23 / 18 | 多6扣血付10血；双方未决弃牌模型各保守多计6，不能把绝对误差当换线成本 |
| KEN F17 T10，第4/5试 | 15 / 2 | 21 / 4 | 无实体下多2扣血付6血；B2 .385/.127、配对差−.2583、SE .0132 |
| KEN F17 T5，第4/6试 | 7 / 1 | 5 / 2 | 当轮省2血，但步法建立从T5延迟至T9，T8敏捷2/0；反驳只按少损血评优 |
| KV0 F33 T5，第4/5试 | 0 / 36 | 0 / 29 | 删致命毒药+没有当轮保血收益；入口之后两线仍有后继差异 |

上述5组入口指纹完全一致，10个原始状态窗口与SL summary相符，逐行结果在paired-raw-state-verification.json。敌血列是该窗口实际净血差，不是跨回血场景的毛伤害。后继动作没有被实验控制，不能由同入口推广为整战因果或胜率收益。751 T2配对数取替换题sl_explore.b2，不将首试600样本的.297与重试1200样本的.195混作同一配对结果。

KEN的T5模型报伤0/1，实际1/2包括另问后追加小刀；不把额外1伤当原模型误差。能力建立T5/T9及T8敏捷2/0由原始状态核验。各局同场多次SL只算同一独立局。

KEN七次实际use_potion和对应槽位由原帧逐对确认：F3 T2攻击、F4 T1稳定、F5 T2速度、F11 T1虚弱/T2攻击、F15 T1发光/技能。F15取得后重问与随机选牌可能改变余线，确认耗药不代表已隔离整轮收益。没有不喝或保留到boss的实盘完整分支。751 F13的同题无药/有药及抽样胜率是模型参考，不是实际无药胜局；holdHp为空时不能从charged_hp=0推导已证留药价0。

YQL末试F17 T10，states280160/280161：本体已结束，残壳毒2→8，HP26/挡13/来袭41及占位HP保持；当次局部施毒没有兑现回血、格挡或降低来袭。26+13−41=−2是完整覆盖差，死亡帧0为截断，存活还需3血。此观察不证明提前喝、留药或删该合法选项更好。三局共15份自爆残壳末态summary已核；占位HP不能代表本体剩血，但统一残血为0会改变同轮平局参考选择，缺完整后继不能声称新排序获益。

KV0末试T4/T5原帧279559→279560：敌327/毒15→342/毒14，带Heal意图。当前帧合并毒与回复，不能从没有独立+30帧推导没回血。复盘将这次分账为15毒和30回复；原始跨帧净增15与复盘相符，本批没有生成通用逐事件毛伤归属规则。文件KV0-T4-T5-state-window.json保存核对窗口，初次单搜+30事件的空结果另保留。

## 现有live实现的准确边界

源码取只读live快照`e8773abf3a4dcf395eab3f9495dac045ae819eaa`，完整材料见source-verification.json及.base.txt/.live.txt。15个相关路径中10个逐字相同；5个差异完整保存base-live-source-difference.patch，逐字替换Roy→Dai后均一致，差异所在行经diff核为注释。此限定比较不推断整个main/live工作树一致，也未重跑其历史测试。

| 现有能力 | 实际live祖先源码commit | 验收边界 |
|---|---|---|
| 候选预测比较 | a8b1f8be153fe4f3a34146117546c2178f2e446b | candidate_forecast，actual_turn_result=null |
| 持牌保守来源/候选选择审计 | 05cd292c6f01bb31e406473d3a9843e659d62b93 | hp_lost拆项、弃牌未决；predicted_candidates，actual_turn=null |
| 药水未知持有价与无药参考 | 04921bd785ac6838066522f91ea0bb6ab95cb6a1 | 同题模型对照，抽样后续饮用单列；没有实际留药价值 |
| 巨兽残壳药水事实 | d5e20aa4dd44168ce30944dfcce74f8322144953 | 当帧及一次已观察施毒，不删除选项，不更改终局/排序 |
| 巨兽阶段/限定末态资源 | 0d092f6b928a6221eabf3516abad25c48ceaac9c | 本体0与自爆待结算分列；最终资源只覆盖严格限定条件；旧占位HP仍为anchorRank输入 |
| 首次动作回执 | bade647f9fe4c9103b40e2f26b26296692ad24b7 | single_action_receipt，state_effect_verified=false，whole_plan_executed/actual_turn=null |

以上commit逐一为捕获live祖先，都是既有子项来源，不是本批提交、合入或10个完整原提案的implemented_commit。combat-plan接入候选事实、选择审计，hand/loop写单步回执；抽牌、弃牌和随机药水后重规划的完整实际收益不能由该首次回执恢复。anchorRank仍用enemyHpLeft原始总血作同轮次序比较，不因阶段说明已有就登记整项duplicate。账本silent-0250的经验数据shipped状态也不能单独证明该源码排序已变。

## 逐项提案、验证与处置

### silent-proposal-366288801d9150d9

来源：postmortem → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md`。账本：silent-0079, silent-0176。

证据：751FN9QM9MHQ，F17 T2/T7；决策272434/272575、272531/272652；原始状态278479→278483、278620→278623、278576→278581、278697→278702。

处置：waiting。已存在候选血价、B2配对差、保守持牌来源和首次派发诊断；actual_turn_result/actual_turn仍为null。缺抽弃续问后的完整实际整轮归属、同后继整战与独立验证，不能据5/10血局部成本设额外失血门槛。

预期行为与验证：待完整重规划链可以核对原答、护栏后、SL后及最终实际收益，再以保持后继一致的完整原/换线和后期独立局验证血价规则。 无新参数拟合，不移除选项、原排序及护栏保持；若将来实现规则，按独立局时间切分及固定红绿核验，本局相关尝试不作独立留出。回退仅针对届时独立源码提交；本批无需源码回退。

### silent-proposal-85929bdfc8a3fc1b

来源：postmortem → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md`。账本：silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176。

证据：751FN9QM9MHQ，F13 T3决策272361/272362；F17 T7决策272531/272652。

处置：waiting。持牌保守来源、hold_hp=null及同题无药抽样参考已有；缺F13实际不喝/留药整战支线与重问后联合收益归属，不能校准持有价值或改变固定喝药/弃牌规则。

预期行为与验证：保留holdHp未知及弃牌未决标志；有药、整战无药、留到后战分别核完整入口、后续动作、实际资源和可用样本。 无新参数拟合，不移除选项、原排序及护栏保持；若将来实现规则，按独立局时间切分及固定红绿核验，本局相关尝试不作独立留出。回退仅针对届时独立源码提交；本批无需源码回退。

### silent-proposal-efd9f83ee9e1a6dc

来源：experience-update → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md`。账本：silent-0079, silent-0176。

证据：751FN9QM9MHQ，F17 T2/T7，沿同一批实盘与原经验提案；六次属于一局。

处置：waiting。现有预测比较和单步派发仍不包含重规划后的完整actual_turn；缺同后继整战及独立时间留出验证，不能拟统一血价；经验来源与复盘来源两个原id均保留。

预期行为与验证：沿原id补完整实际链；更早同角色独立局用于校准，后期局留作验证，同局六试不拆为训练/验证。 无新参数拟合，不移除选项、原排序及护栏保持；若将来实现规则，按独立局时间切分及固定红绿核验，本局相关尝试不作独立留出。回退仅针对届时独立源码提交；本批无需源码回退。

### silent-proposal-131042659448ae74

来源：experience-update → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md`。账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176。

证据：751FN9QM9MHQ，F13 T3药水候选，F17 T7弃牌保守差额与T17末态；原提案的各机制仍按单独账本关联。

处置：waiting。敏捷、毒/荆棘、持牌与缺失持有价值的诊断子项已有；缺实际无药/留药完整对照及抽弃重问后联合兑现归属，不能据各子项关闭整项或调整药水/出牌权重。

预期行为与验证：将机制、当轮预测、实际抽弃、后继能力和药水后战价值分账；完整反事实不足时保持各候选及原护栏排序。 无新参数拟合，不移除选项、原排序及护栏保持；若将来实现规则，按独立局时间切分及固定红绿核验，本局相关尝试不作独立留出。回退仅针对届时独立源码提交；本批无需源码回退。

### silent-proposal-990f054036609447

来源：experience-update → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md`。账本：silent-0102, silent-0019, silent-0020。

证据：KV0JHNJCKXLS，F33第4/5试T5决策273400/273450，states279460→279465、279511→279515；末试T4/T5 states279559→279560。

处置：waiting。两线同入口且当轮均零损，净扣36→29；已有候选比较。缺敌回血/毒/攻击完整事件归属、同后继整战及实际路线反事实，不能把删输出叫保血收益或调整探索/路线规则。

预期行为与验证：核回血与毒的独立来源、下一轮毒20→13及完整后继；路线只登记实际回血/已走节点，未走旧线不补反事实。 无新参数拟合，不移除选项、原排序及护栏保持；若将来实现规则，按独立局时间切分及固定红绿核验，本局相关尝试不作独立留出。回退仅针对届时独立源码提交；本批无需源码回退。

### silent-proposal-e18d3f18e6cac2a0

来源：postmortem → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md`。账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046。

证据：L9SGRBB5R698 F17 T14，PU80F84P6HPN F17 T17，YQL8RZ8BWN1E F17本体T12/T12/T11/T12/T12/T9结束；YQL T10 states280160→280161。

处置：waiting。本体/残壳阶段与毒药水局部无减伤说明已存在；anchorRank同存活回合仍按enemyHpLeft原始占位血排序。缺改排序后的完整受控后继与独立验证，不能将阶段展示子项记为整项duplicate。

预期行为与验证：先保留原始HP、阶段和未获胜事实；比较旧/新参考选择的完整后继及自爆血挡缺口，不能仅把占位残血统一成0就声称改进。 无新参数拟合，不移除选项、原排序及护栏保持；若将来实现规则，按独立局时间切分及固定红绿核验，本局相关尝试不作独立留出。回退仅针对届时独立源码提交；本批无需源码回退。

### silent-proposal-9733bb80f445aeae

来源：experience-update → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md`。账本：silent-0017, silent-0019, silent-0020, silent-0250。

证据：同三局F17占位阶段；YQL末试T10毒药水使毒2→8，HP26/挡13/自爆41保持。

处置：waiting。阶段/残壳收益说明已有；缺提前喝、整战不喝、留药和阶段排序改动的完整对照，不能拟药水/终局权重或把经验数据上线当策略源码完成。

预期行为与验证：毒层增长与已兑现输出分列，完整生存覆盖及阶段排序收益由原id后续验证；不从2→8毒推导减少6自爆。 无新参数拟合，不移除选项、原排序及护栏保持；若将来实现规则，按独立局时间切分及固定红绿核验，本局相关尝试不作独立留出。回退仅针对届时独立源码提交；本批无需源码回退。

### silent-proposal-c51468c5e8ba6668

来源：postmortem → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md`。账本：silent-0019。

证据：KEN58SH9SLZ6，F3 T2/F4 T1/F5 T2/F11 T1/T2/F15 T1共七次实际耗药，逐槽位原始状态见evidence-audit.json。

处置：waiting。七次实际耗药已核；现有候选/单步回执不能给随机选牌、发光水重问后的整轮收益完整归属。缺F15不喝及任一留到boss的完整支线，跨战预算不能校准。

预期行为与验证：串接随机选择、生成牌、重问与实际出牌；区分瓶身即时变化和整个回合净伤挡，验证未饮用/留到后战的独立分支。 无新参数拟合，不移除选项、原排序及护栏保持；若将来实现规则，按独立局时间切分及固定红绿核验，本局相关尝试不作独立留出。回退仅针对届时独立源码提交；本批无需源码回退。

### silent-proposal-86a7db08d1a31976

来源：postmortem → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md`。账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176。

证据：KEN58SH9SLZ6 F17第4/5试T10决策274505/274568；第4/6试T5决策274484/274601。

处置：waiting。T10损15→21、扣敌2→4已兑现；T5省2血但步法T5延至T9亦已核。缺受控能力后继与独立后期局验证，不能设6血/2伤统一准入值或关闭所有更差线探索。

预期行为与验证：同时验证持牌血价、无实体逐段实伤与能力建立窗口；当前最少损血、B2并列或未试过均不能单独替代完整后继验证。 无新参数拟合，不移除选项、原排序及护栏保持；若将来实现规则，按独立局时间切分及固定红绿核验，本局相关尝试不作独立留出。回退仅针对届时独立源码提交；本批无需源码回退。

### silent-proposal-e282a9131b99129a

来源：experience-update → strategy-proposal；原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md`。账本：silent-0021, silent-0079, silent-0125, silent-0176。

证据：同KEN F17 T10/T5原始状态与经验来源；关联silent-0021/0079/0125/0176，原id独立保留。

处置：waiting。已有持牌、候选与首次派发诊断；缺续问执行链、同后继整战和独立后期验证，现有子项不足整项duplicate/implemented。

预期行为与验证：保留原题、原答、最终替换和续问完整结果；用独立局时间切分研究血价与能力窗口，不用相关六试校准通用门槛。 无新参数拟合，不移除选项、原排序及护栏保持；若将来实现规则，按独立局时间切分及固定红绿核验，本局相关尝试不作独立留出。回退仅针对届时独立源码提交；本批无需源码回退。

## 记录与检查

- 生产源码未改，撤源码失败/恢复通过不适用。tsc/vitest均未运行，cases=null；没有引用旧测试为本批成功。evidence-audit.json的22项及paired-raw-state-verification.json的10个窗口是日志证据核验，不能当vitest或策略整战模拟用例。
- 16个既有silent账本仅通过根ledger.py update追加本批提案/报告链接与waiting范围说明，by=learner:strategy-proposal；不重写claim、首证、历史证据、status、version，不登记新shipped。16条本批追加的即时前后claim/status/version/first_run/evidence保持已核（并行任务的7条status更新保留），具体CLI结果与追加原行已保存在ledger-cli.log、ledger-own-appends.jsonl、ledger-link-verification.json。
- 无新游戏结论或策略源码进入经验库，本批不冒称入库或消费者采用；各原提案及量化父要求继续保持未完成。无源码提交/合入/发布，不执行live合入阶段，不产生上线双通知。
- scratch全部位于指定learner/runs目录并由既有gitignore排除，源码副本仅为.txt，原提案.md及分析脚本都作为批次材料保留。最终HEAD与tracked status验证记录final-verification.json。

## 取证过程更正

1. 初读队列直接将最后update行当完整对象，访问character出现KeyError；保存原历史后按add/update折叠，10个对象角色均silent且原Markdown SHA均通过。没有把初读错误登记为生产bug。
2. 初版账本摘要自行合并where字段的方法没有保留完整历史链接；原ledger-folded.json保留，后使用根ledger.py官方fold重算ledger-folded-official.json。本次记录CLI只追加，不按初稿修改历史。
3. 首次共享路径搜索曾列出两个不存在候选agent.ts/loop.ts；真正消费者是agent/src/hand/loop.ts，已核import与回执调用。不存在路径不充作缺消费者证据。
4. 对KV0初次搜相邻帧+30得到空数组，仅说明未捕获独立回复帧；后原始窗口显示327/毒15→342/毒14及Heal意图。保留初稿KV0-healing-transitions.json，不将空结果称无回血。

5. 初次将本批开始前快照与最新全局status直接比较，silent-0005断言失败。根账本在本批CLI前已有experience-update于09:48追加7条proposed；保留原失败，改按本次16条追加的即时前后核验，claim/status/version/first_run/evidence均保持，不覆盖并行更新。
6. 接续最终核验初稿在上述失败之后提前填ledger_check_exit=0；该初稿与原报告分别保存.before-ledger-correction.txt。随后实际重做限定追加验证并运行账本CLI check：450项、0问题、exit0，最新报告仅使用真实结果。

最终机器回报见final-report.json。每个派发id有一个waiting结果，未新增提案id、未伪造implemented/duplicate提交；完整base、无源码改动与各具体等待条件都保留。

最终核验：16条本批CLI追加的即时前后验证通过；账本CLI check实际退出0（450项、0问题）；本批HEAD与base相等，git status为空；10个proposal_results完整且各为waiting，tsc/vitest/cases均为null。
