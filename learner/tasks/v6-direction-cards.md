---
title: Silent 正式格式方向卡草稿
model.codex: gpt-6.1-sol
effort.codex: high
tools: Read, Grep, Glob, Bash, Write
timeout_min: 240
max_turns: 800
characters: silent
---
# 任务：Silent 正式格式方向卡草稿

你是离线 Silent 学习者，任务 v6-direction-cards，请求 roy-20261019-v6，批次 {{batch}}。工作树 {{worktree}}，日志 {{logs_dir}}。读 README.md、docs/learning-protocol.md、docs/learning-requests.md、docs/learning-code-proposals.md、docs/v6-plan.md 第 6、9.1 节和 agent/src/v6/formats.ts、predicate.ts、draft.ts。它们是格式与架构要求，不是游戏知识。报告/计算/拒绝条目只写 {{scratch}}，草稿只写本工作树 knowledge/characters/silent/pending/v6-direction-cards-{{batch}}/，不改正在并行的其他任务。

## 冻结输入与边界

先读取 {{evidence}}，核对 request_id=roy-20261019-v6、task=v6-direction-cards、character=silent、batch={{batch}}，计算 manifest 的 SHA256。按清单核实输入文件字节数与 SHA；冻结输入包括本角色正式经验、pending 草稿、construction-templates/support/opportunities、outcome-stats、monster-records、boss-trust、double-boss 与既有本角色报告（含 silent-historical-core-builds）。清单缺失项明确保留，不用其他角色补齐。原报告在主检出或内容存储中时按精确路径读取，不能因稀疏检出缺文件而声称不存在。

清单包含全部已结束 Silent 局的 run inventory 与日志 log_byte_limits。读取日志不得越过冻结字节上限；只按本角色局号、时间窗、索引偏移抽取，记录命令、范围、原始证据与 SHA。整段日志若未测 SHA 必须照实说明，不能冒充已哈希；新局或新增字节不混入。冻结文件变化停止并报告；清单中不存在的后续产物不补入本批。正式经验逐条核对实际条数，不把计划中的 244 当成实测。

游戏知识只能由冻结本角色对局证据得出，不能使用预训练流派、牌效、机制、观察者建议或计划举例补牌表。既有结论仍须可追溯 run_id/层/回合、账本 id 与原证据；旧报告或模拟不等于实战。不能用最终牌组倒填前期，不能只分析幸存者。首试按首条 predicted_death 截断，与含 SL 最终结果分开；同局多次 SL 不能算独立样本。按进阶、版本、引擎分组，未知字段保留未知，无配对反事实不宣称因果。

不开局、不跑 play、在线调用、Boss 模拟池或二进制提取。所有分析 nice、单进程优先且最多四进程，不另派模型。不改代码、正式知识、参数、调度、运维 prompt、共享配置、其他任务或 STOP；不提交、不合入、不恢复 live 或 Regent。只产出草稿，不能标记 W2 已完成、知识已上线或消费者已读回。

## 必须交付

1. 本模板仅准备，当前未获派发授权。正式派发必须由 Claude 在 9.1 结束且 watcher 核实其产物后另行指派；不能因本模板存在而自启批次。
2. 冻结方向经验草稿若被本轮 manifest 明确列入才可读取。把有证据的内容转成 direction-card-v1；核心 requirements 保留 any/count/distinct 语义与证据，支撑/冲突、act1_end/act2_end/pre_f48 理想组件数量与优先级、升级/删牌顺序都必须来自学习证据。没有证据不补理想牌表，无法满足严格格式的方向留 scratch 未完成清单。
3. matchups 的 actual 是独立局计数（wins+losses等于去重局号数），明确采用首试或含 SL 的口径；另一口径和进阶/版本分层单独在报告给出，缺数据保持未知，不用0表达未观察。模拟 projection 可null，非实战且必须带模型可信标签。转向/失败/反例/置信度与 scope 证据完整。
4. 现有每条经验归属表含 directions/reflex_ids，仅形成追加字段提案，不删条目不改原证据。方向目录新增/合并/放弃单独提案，不自行改变冻结目录；已有来源小脑记忆未冻结不引用。
5. 产出 draft.json：严格 {schema:"v6-direction-draft-v1",character:"silent",cards:{schema:"direction-cards-v1",character:"silent",entries:[direction-card-v1对象]},coverage:[{experience_id,status:"converted|partial|text_only|disputed",reflex_ids:[],directions:[],reason}],limitations:[]}。字段的实际类型以 W1 formats.ts 为准，不把字符串联合写成字面值。无法成卡可空 entries，显式证据不足与续跑清单。

## 自测与闭环

先从冻结输入生成 {{scratch}}/validation-context.json，严格 {character:"silent",experienceIds:[实测全部正式经验id],directionIds:[冻结construction-templates中全部方向id],runIds:[manifest全部冻结局号]}。记录其提取程序、来源SHA和本文件SHA；不得删减分母让校验通过。校验入口只验证格式、覆盖与引用，不证明知识正确或消费者可用。调用：

```sh
nice -n 10 {{worktree}}/agent/node_modules/.bin/tsx {{worktree}}/knowledge/builders/validate-v6.ts KIND 实际draft.json路径 {{scratch}}/validation-context.json
```

KIND 替换为本任务 reflex 或 directions。保存命令、exit code、stdout 和两个输入 SHA。校验是只读，不移动、不发布、不合入。输入超过8MiB时先报告限制，不改校验器绕过。空 entries 通过不代表有可用知识。

每次候选/口径/结论改变向 {{scratch}}/changes.jsonl 追加时间、旧→新、原因和证据。保留失败原件、初稿、反例和弃选。新结论先用 {{project_root}}/learner/ledger.py CLI 查重，再登记 observed/proposed，关联本角色局号和报告，不直接写账本、不标 shipped；这是仅写scratch/pending的明确例外。涉及打法/药水/必死SL/终局价值时，按代码提案闭环写来源任务、账本ID、证据/反例、旧新行为、角色/进阶范围、验证/回退提案，只留scratch，不实施或派修复。异议列 prior、新证据、影响和未知，供 ops→watcher→Roy 转达，不代填确认。

## 回报

中文 report.md 和机器结果写 scratch，报告链接实际草稿、校验记录、输入与产物 SHA、全量经验/局覆盖、限制和续跑清单。最终单独输出 JSON：

```json
{"task":"v6-direction-cards","request_id":"roy-20261019-v6","batch":"{{batch}}","character":"silent","input_sha256":"manifest实测SHA","complete":true,"status":"complete或insufficient_evidence","covered_runs":[],"covered_experience_ids":[],"coverage":{"inventory":true,"experience_mapping":true,"drafts":true,"validation":true,"limitations":true},"counts":{},"limitations":[],"disagreements":[],"ledger_ids":[],"artifacts":[{"path":"实际文件","sha256":"实测SHA"}],"report":"{{scratch}}/report.md","continuation":[],"merged":false,"published":false,"code_proposals":[],"implementation_domains":[]}
```

complete仅表示本轮审计完成；不能称已正式入库、消费者读回或W2知识验收完成。无可用条目时 status=insufficient_evidence。
