---
title: 静默全部历史核心组合学习
effort.codex: xhigh
tools: Read, Grep, Glob, Bash, Write
timeout_min: 240
max_turns: 800
characters: silent
---
# 任务：从静默全部历史学习整套构筑

你是离线知识学习者。批次 {{batch}}，冻结输入 {{evidence}}；工作树 {{worktree}}，日志 {{logs_dir}}，所有产出保存在 {{scratch}}。先读取 README.md、docs/learning-protocol.md、docs/codex-only-brain.md 和请求 notes/watcher-20261009-core-build-request.json、notes/watcher-20261009-core-build-paper-trace.json。工作目录内若没有请求记录，到 {{project_root}}/notes/ 读取。这些是学习目标，不是游戏知识。

读取输入 JSON，核对 request_id=roy-20261009-historical-core-builds、character=silent、batch={{batch}}，计算输入文件 SHA256。该清单包含全部已结束的静默历史局，不能截取最近十局。只读取本角色的复盘/知识；日志只按局号、时间窗、索引偏移读取，且不得读超过 log_byte_limits 的新追加内容。整个分析 nice、单进程或最多四进程，不运行 play、在线调用、boss 模拟池或二进制提取。

游戏知识只能从冻结的本角色观察得出，不能使用预训练流派或观察者建议补牌表。你只做知识经验学习，不修改 agent/、ops/、learner/、eval/ 或 knowledge/builders/ 源码，不提交/合入，不修改生产知识、参数、运维 prompt、调度器或其他任务。代码与数据接入提案留报告，供开发会话按证据实施。后续产生的新局不混入本轮结果。

## 必须交付的内容

1. 全部输入局的清单、进阶/版本/实际大脑来源、可用日志/缺帧范围，证据抽取命令、字节偏移及保存的证据 SHA。纯 Codex 战绩单列；其他引擎本角色历史作为证据时标明。首试按首条 predicted_death 截断，含 SL 最终结果分开，同局多次 SL 不能计作独立样本。
2. 从胜局和败局归纳整套构筑候选。每候选说明核心组件及协作、最小成型条件、首次成型时点、启动/持续输出/生存与资源来源、已观察替代件、过渡方式、失效条件和反例。不能用最终牌组倒填前期，不能只分析到达最后 boss 的幸存者。每个事实引用 run_id/层/回合、既有账本 id 和原始证据。
3. 真实伤害、生存和消耗：有效伤害/启动回合/战斗回合、进退场 HP、药水消耗及 SL 依赖；死亡、回血、SL 恢复、过量伤害及模拟数据分开。无配对反事实不说因果，未知字段保留未知。
4. 每候选逐 boss、进阶列到达数、独立局胜负、通过率、整局胜率、资源消耗及不确定性。分母写明；按最新向前每二十局给全漏斗观察，不把低阶成绩外推 A10，不用未记录的模拟替代实战。
5. 通用性以实际跨 boss 覆盖、可重复通过及消耗为依据。“比较轻松过所有 boss”是目标，不能因目标而捏造通杀组合。候选/局部验证/跨 boss 验证及缺证分别列；没有合格组合也要交付有证据的候选、失败和下一步所缺数据。
6. 基于上述证据形成可供大脑使用的构筑模板：当前牌组目标、缺口、补强/替代/过渡以及转型或放弃条件。所有具体规则必须是学习结论。报告接入建议，不自行写代码或上线。

中途每次候选、口径、证据、结论的变更在 {{scratch}}/changes.jsonl 追加旧→新、理由、时间和证据。保留失败命令、初稿、反例和被弃候选；修订另立记录，不覆盖原失败或倒填历史。冻结输入及相关原件哈希变化要停止并报告。

每项新学出的综合结论先查重，按 docs/learning-protocol.md 经 {{project_root}}/learner/ledger.py 的 CLI 登记 observed/proposed，附本角色证据与报告路径，保留 prior/反例；不标 shipped、不直接改账本。该 CLI 追加记录是仅存临时目录规则的明确例外。没有新结论时只关联已有条目，不为任务派发造游戏知识。代码接入建议仍由开发会话处理。

## 回报

完整中文报告写 {{scratch}}/report.md，并保存机器可读结果。最终单独输出 JSON 代码块，字段如下。covered_runs 是核对过的完整输入清单（即使某局缺帧也列明缺帧），不能伪称全部原始帧已核。coverage 各字段为 true 表示报告确实包含对应章节；缺证章节必须写具体限制。

```json
{"task":"silent-historical-core-builds","request_id":"roy-20261009-historical-core-builds","batch":"{{batch}}","character":"silent","input_sha256":"冻结输入SHA256","covered_runs":["全部输入局号"],"complete":true,"status":"complete或insufficient_evidence","candidate_builds":[{"name":"从证据学出的名称","evidence_runs":["本角色输入局号"]}],"coverage":{"candidate_builds":true,"boss_matrix":true,"damage_survival":true,"construction_templates":true,"limitations":true},"limitations":["具体证据限制"],"report":"{{scratch}}/report.md","code_proposals":[],"implementation_domains":[]}
```

candidate_builds 可为空，但此时 status 必须 insufficient_evidence，且写明确缺口。候选完整组件、boss 矩阵和模板另在报告/机器结果中保存；回报不宣称已部署、已上线或已通知 Roy。
