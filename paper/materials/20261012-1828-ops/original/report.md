# 策略学习任务回报

本批十个已领取ID逐项核验后均保留waiting。没有新增生产源码或知识，没有提交、合入、游戏版本或shipped登记；不将已实现的有限子项当作父提案完成。

batch：20261012-181302-s2-strategy-proposal；character：silent。完整base：`4fea9c087e59461ee3a3f58a5df562a9bf5f00b9`。派发身份、原文SHA及原字节副本已保存；开工干净且合main后HEAD未变。

给运维的完整提案路径：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-181302-s2/learner/runs/20261012-181317-strategy-proposal/proposal.md`。机器回报：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-181302-s2/learner/runs/20261012-181317-strategy-proposal/report.json`。

## 实盘证据与消费者验证

六局唯一SILENT/A10身份已核；限定房间重新核2105条原始记录的字节SHA（1062状态、1043决策），四组同指纹配对端点及15项机制检查通过。各账本ID、层/回合、反例、旧行为、预期行为和验收方法逐项见proposal.md；原始寻址和算法均落盘，不重复写历史复盘。

| 对照 | 原/替实际损血 | 原/替敌本体净扣 | 同指纹决策行 |
|---|---:|---:|---|
| 8JRE1C4H4Z2W F33 T2 | 3/15 | 10/17 | 270216/270282 |
| YF0LXT1QSTGG F48 T1 | 0/9 | 45/38 | 271309/271348 |
| XP2SL33HT0D9 F33 T3 | 9/14 | 24/27 | 271992/272040 |
| XP2SL33HT0D9 F33 T1 | 2/10 | 25/34 | 271982/272195 |

同轮差值不能消除永久成长、后续抽序和动作差异。六次SL仍计一局；没有受控整战胜线，不能从失败样本推出固定低损血优先或探索禁令。

污染T5三技能使0→6→12→18、攻击12→17→21→26，同时有17挡及13毒结算；不能只从损9推少打技能。失落死亡后返力不证明遗忘返敏；蚌的覆甲同步变化不证明全部触发条件；电击机器人index4→3不能作为持久实例ID。

现有audit-selection.ts用本批固定输入三次exit0，沙虫/实验体/双蟹分别66/52/58段，21/22/22段被重问替代，完整候选实际结果仍null。死亡端点实损5/18/11已可见；沙虫37−22=15、实验体44−23=21作为显示值算术参考另列；双蟹混合意图中的null未擅自补零。见consumer-exits.json、consumer-summary.json和逐局consumer.json。消费者成功运行不等于生产测试通过或策略收益。

## 已有源码核验

核验live快照：`1d3b8508d4b58b2dc24815c8b740d95e7c54a48b`。表中提交均为实际live祖先，均不是本批提交。文件blob及完整diff见source-proof.json、source-main-live.patch；九个文件一致，rollout/turn-solver合计四处注释署名差异原样保留。此表只证明有限代码范围与来源，不关闭父提案。

| 文件 | 已有源码commit | 本树/live/source比较 |
|---|---|---|
| agent/src/reflex/silent-selection-audit.ts | `9d8278702dbc581b5015ba7ec9a70dc0fb94cccb` | 相同 |
| agent/src/reflex/silent-selection-dispatch.ts | `fdaf787a372880b0438e73bcac7e6d2168b038ed` | 相同 |
| agent/src/reflex/silent-sl-resource-comparison.ts | `66283dd9982bdd7f480da7a4d9bfefea0572a9ac` | 相同 |
| agent/src/reflex/silent-phase-current.ts | `aad2700abed6dff1d66e87fb36aaa6fedb39adf3` | 相同 |
| learner/lib/selection-execution.ts | `83512ddcd2c70fd9b983dc38524ff25c8970c1d3` | 相同 |
| learner/lib/selection-observation.ts | `dc0e6080cb20c508d94c006648cc3edf0188d306` | 相同 |
| learner/lib/selection-terminal.ts | `83512ddcd2c70fd9b983dc38524ff25c8970c1d3` | 相同 |
| agent/src/knowledge/monster-db.ts | `4ed3c72df30f27b881da637aebf528b97440e0bb` | 相同 |
| agent/src/knowledge/room-costs.ts | `295a90aef9eb6f5b267490294f7733806419c45a` | 相同 |
| agent/src/reflex/rollout.ts | `b2805be4ba44b7375c7908d873889372cc3cfe6c` | main/live仅注释署名差异 |
| agent/src/reflex/turn-solver.ts | `b2805be4ba44b7375c7908d873889372cc3cfe6c` | main/live仅注释署名差异 |

调用点还核过combat-plan.ts中的当前阶段/原替资源比较/选线审计，以及hand/loop.ts中的单动作派发回执。完整候选和累计分阶段收益仍未知；当前进阶观测读取及房间代价五样本门槛已存在，无需重新实现。

## 十项处置

各项均waiting，具体未实现原因如下；所缺的是该项未被原帧证明的范围，不否认已存在子项。

| 原提案ID | 未实现原因 |
|---|---|
| `silent-proposal-c20b5139dd0dff71` | 当前逐技能污染与火花后续增长路径已有；缺历史实际移动表输入及相同起点替线的完整后继，无法验证跨轮联合模型或少打技能的净收益。 |
| `silent-proposal-ae9e692d680e3819` | 缺遗忘死亡返敏、多个来源抢同一属性和临时属性混合返还的相邻帧，不能验收完整来源返还模型或固定击杀序。 |
| `silent-proposal-52f1e1bd2e7db0ed` | 当前进阶首样本读取和房间成本五样本门槛已有；历史实际移动表输入、覆甲独立触发与其他来源叠加未齐，不能完成整个成长/覆甲模型验收。 |
| `silent-proposal-6dd8bbff876be528` | 高电压逐轮增长路径已有；缺同种新旧召唤并存/替换的稳定实例标识与实际移动表快照，不能验收新旧计数隔离全范围。 |
| `silent-proposal-578e415a259e6835` | 选择、派发及终局端点子项已有；当前66段中21段被重问替代，完整候选执行、跨重规划资源归因及能力收益仍不能认证。 |
| `silent-proposal-c0767768bf6a7ab1` | 已有原/替预测差与端点记录，但覆盖重放和弃牌后完整候选执行未证实，也没有受控完整胜线支持探索禁令或血价惩罚系数。 |
| `silent-proposal-a46bdb7fe711d79a` | 当前阶段、本帧已建/持有和零毒事实已有；缺跨阶段各伤害来源的完整中间结算帧及候选执行链，不能认证累计已兑现收益或据此改排序。 |
| `silent-proposal-1044224808015e5c` | 两组当轮差不能隔离成长及后继；缺相同资源起点的完整替线结果和独立胜线，不足启用零胜并列时固定低损血优先。 |
| `silent-proposal-7cbc6005db712ba9` | 当前端点与末轮实际净损11已覆盖；完整联合候选收益、额外触发和混合意图的未知字段语义未齐，不能整项关闭或补零后改排序。 |
| `silent-proposal-c59f592f1427a67e` | 现有局部审计未认证整候选收益、跨重规划归因及完整恢复/资源链；宽机制包不能由两局局部检查记为整体完成。 |

## 测试、记录与边界

fixes=[]；merged=null；源码提交和eval版本均无。没有生产代码更改，未运行tsc、vitest或撤源码红绿，三项为null，不能填0冒报成功。固定原帧和现有离线消费者验证单列如上；gitleaks材料扫描与最终HEAD/干净状态由final-verification.json记录。

只经根ledger.py update追加既有账本的本批proposal/report链接及waiting说明，不新增游戏claim、证据分母、版本或状态，不将原已上线子项降回proposed，也不标shipped。没有新提案，code_proposals列原CLI的十个ID，不重复add。CLI精确输入、stdout/stderr及追加原行另存并核对。无规则上线，故不制造上线记录、双通知或合入审批。

保留的操作限制：一次shell调用在bubblewrap构建阶段因项目外不存在路径的ENOENT失败，同命令权限下重试可运行；这不是代码测试失败。探索时两处猜测源码路径不存在，后改用实际路径；未据这些失败得游戏结论。所有任务临时文件在本批scratch，未运行play、联网、读取凭据或游戏二进制，未修改运维prompt、原提案、请求或调度状态。

本批只直接分析上述六局的限定房间，历史广泛机制/路线/药水统计仅保留原提案限制，未把它们冒称本批全量复证。原dirty运行源码未复原，真实消费者采用及胜率效果均未证明。后续沿同十ID补证。
