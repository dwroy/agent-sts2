---
title: Silent 小脑记忆蒸馏
model.codex: gpt-6.1-sol
effort.codex: high
tools: Read, Grep, Glob, Bash, Write
timeout_min: 240
max_turns: 800
characters: silent
---
# 任务：Silent 小脑记忆蒸馏

你是离线 Silent 学习者，任务 v6-reflex-distill，请求 roy-20261019-v6，批次 {{batch}}。工作树 {{worktree}}，日志 {{logs_dir}}。读 README.md、docs/learning-protocol.md、docs/learning-requests.md、docs/learning-code-proposals.md、docs/v6-plan.md 第 5、9.2 节和 agent/src/v6/formats.ts、predicate.ts、draft.ts。它们是格式与架构要求，不是游戏知识。报告/计算/拒绝条目只写 {{scratch}}，草稿只写本工作树 knowledge/characters/silent/pending/v6-reflex-distill-{{batch}}/，不改正在并行的其他任务。

## 冻结输入与边界

先读取 {{evidence}}，核对 request_id=roy-20261019-v6、task=v6-reflex-distill、character=silent、batch={{batch}}，计算 manifest 的 SHA256。按清单核实输入文件字节数与 SHA；冻结输入包括本角色正式经验、pending 草稿、construction-templates/support/opportunities、outcome-stats、monster-records、boss-trust、double-boss 与既有本角色报告（含 silent-historical-core-builds）。清单缺失项明确保留，不用其他角色补齐。原报告在主检出或内容存储中时按精确路径读取，不能因稀疏检出缺文件而声称不存在。

清单包含全部已结束 Silent 局的 run inventory 与日志 log_byte_limits。读取日志不得越过冻结字节上限；只按本角色局号、时间窗、索引偏移抽取，记录命令、范围、原始证据与 SHA。整段日志若未测 SHA 必须照实说明，不能冒充已哈希；新局或新增字节不混入。冻结文件变化停止并报告；清单中不存在的后续产物不补入本批。正式经验逐条核对实际条数，不把计划中的 244 当成实测。

游戏知识只能由冻结本角色对局证据得出，不能使用预训练流派、牌效、机制、观察者建议或计划举例补牌表。既有结论仍须可追溯 run_id/层/回合、账本 id 与原证据；旧报告或模拟不等于实战。不能用最终牌组倒填前期，不能只分析幸存者。首试按首条 predicted_death 截断，与含 SL 最终结果分开；同局多次 SL 不能算独立样本。按进阶、版本、引擎分组，未知字段保留未知，无配对反事实不宣称因果。

不开局、不跑 play、在线调用、Boss 模拟池或二进制提取。所有分析 nice、单进程优先且最多四进程，不另派模型。不改代码、正式知识、参数、调度、运维 prompt、共享配置、其他任务或 STOP；不提交、不合入、不恢复 live 或 Regent。只产出草稿，不能标记 W2 已完成、知识已上线或消费者已读回。

## 必须交付

1. 优先级为 combat_line > card_pick > potion > rest/shop。先全量核实正式经验条数与 ID，再给每条转换状态 converted / partial / text_only / disputed，保留原文，理由不能空。逐条关联新 reflex ID；没有白名单字段或证据不能硬转。
2. vocab 按 reflex-vocab-v1 五个固定维度给成员，每个成员有本角色原始证据。条目严格为 reflex-entry-v1，不额外向条目塞审计字段。predicate 仅用 agent/src/v6/predicate.ts 白名单 DTO，不把原始 mod 对象字段当作 DTO 已实现；字段不存在留缺字段提案。标签 signal 必须引用本批词表。
3. 每条 signal 单独给 metrics 审计：样本 n、method 计算方法/原始分子分母/单位、design=observational或paired、effect_size、se（未知null）、frequency={n,total} 和 evidence。观察效应不能说因果；独立局与回合数分开，SL 不扩独立样本。numeric signal.value/se 必须与 metrics 一致；缺效应量不能编数，保留文字或只提交有证据的标签。按近期 A10 条件频率 × 效应大小排序，明确近期窗口、分母、未知排序；正负效应均保留。
4. 全部 244（以实测为准）经验转换表、不适用/反例/过时异议、五类决策覆盖和白名单缺字段清单；缺字段条目写 field/purpose/evidence，不自行扩白名单。现有源经验只生成 directions/reflex_ids 追加提案，不改正式原件。
5. 产出 draft.json：顶层严格 {schema:"v6-reflex-draft-v1",character:"silent",vocab:reflex-vocab-v1对象,reflex:{schema:"reflex-file-v1",character:"silent",entries:[reflex-entry-v1对象]},coverage:[{experience_id,status,reflex_ids:[],directions:[],reason}],metrics:[{reflex_id,n,method,design,effect_size,se,frequency:{n,total},evidence:[{run_id,floor,turn?}]}],missing_fields:[{field,purpose,evidence}],limitations:[]}。W1 所有严格字段以源码为准；不支持的证据保留报告，不在 schema 内伪造字段。空条目允许，但 complete/status 必须反映证据不足。
6. 全部草稿必须先通过下述校验，不通过的条目移到 scratch 的 rejected 清单，明确原因；不要修改校验器，也不删反例掩盖问题。报告与 JSON 记录转换分母、各类产出数、影响排序、缺字段、限制与续跑清单。

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
{"task":"v6-reflex-distill","request_id":"roy-20261019-v6","batch":"{{batch}}","character":"silent","input_sha256":"manifest实测SHA","complete":true,"status":"complete或insufficient_evidence","covered_runs":[],"covered_experience_ids":[],"coverage":{"inventory":true,"experience_mapping":true,"drafts":true,"validation":true,"limitations":true},"counts":{},"limitations":[],"disagreements":[],"ledger_ids":[],"artifacts":[{"path":"实际文件","sha256":"实测SHA"}],"report":"{{scratch}}/report.md","continuation":[],"merged":false,"published":false,"code_proposals":[],"implementation_domains":[]}
```

complete仅表示本轮审计完成；不能称已正式入库、消费者读回或W2知识验收完成。无可用条目时 status=insufficient_evidence。
