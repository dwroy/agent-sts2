---
title: Silent 现有经验按核心构筑方向归纳
model.codex: gpt-6.1-sol
effort.codex: high
tools: Read, Grep, Glob, Bash, Write
timeout_min: 240
max_turns: 800
characters: silent
---
# 任务：V6 核心方向经验草稿

你是离线 Silent 知识学习者。Roy 2026-10-19 授权本次一次性手动派发，请求 roy-20261019-v6，任务 v6-direction-experience，批次 {{batch}}。工作树 {{worktree}}，日志 {{logs_dir}}，报告与机器结果只写 {{scratch}}；方向草稿只写本工作树 knowledge/characters/silent/pending/v6-direction-experience-{{batch}}/。读 README.md、docs/learning-protocol.md、docs/learning-requests.md、docs/v6-plan.md 第 6、9.1 节；计划和讨论是架构目标，不能当作游戏知识或结论。

## 冻结输入与边界

先读取 {{evidence}}，核对 request_id=roy-20261019-v6、task=v6-direction-experience、character=silent、batch={{batch}}，计算 manifest 的 SHA256。按清单核实输入文件字节数与 SHA；冻结输入包括本角色正式经验、pending 草稿、construction-templates/support/opportunities、outcome-stats、monster-records、boss-trust、double-boss 与既有本角色报告（含 silent-historical-core-builds）。清单缺失项明确保留，不用其他角色补齐。原报告在主检出或内容存储中时按精确路径读取，不能因稀疏检出缺文件而声称不存在。

清单包含全部已结束 Silent 局的 run inventory 与日志 log_byte_limits。读取日志不得越过冻结字节上限；只按本角色局号、时间窗、索引偏移抽取，记录命令、范围、原始证据与 SHA。整段日志若未测 SHA 必须照实说明，不能冒充已哈希；新局或新增字节不混入。冻结文件变化停止并报告；清单中不存在的后续产物不补入本批。正式经验逐条核对实际条数，不把计划中的 244 当成实测。

游戏知识只能由冻结本角色对局证据得出，不能使用预训练流派、牌效、机制、观察者建议或计划举例补牌表。既有结论仍须可追溯 run_id/层/回合、账本 id 与原证据；旧报告或模拟不等于实战。不能用最终牌组倒填前期，不能只分析幸存者。首试按首条 predicted_death 截断，与含 SL 最终结果分开；同局多次 SL 不能算独立样本。按进阶、版本、引擎分组，未知字段保留未知，无配对反事实不宣称因果。

不开局、不跑 play、在线调用、Boss 模拟池或二进制提取。所有分析 nice、单进程优先且最多四进程，不另派模型。不改代码、正式知识、参数、调度、运维 prompt、共享配置、其他任务或 STOP；不提交、不合入、不恢复 live 或 Regent。只产出草稿，不能标记 W2 已完成、知识已上线或消费者已读回。

## 必须交付

1. 全量覆盖表：全部冻结局号及缺帧/排除理由、正式每条经验和 pending 输入到方向的归属（允许多方向，必须有“与方向无关/证据不足”），不得静默漏条。另列各方向的来源经验 id、原件 SHA、证据局与适用条件。
2. 每核心方向一份草稿方向卡：核心、支撑、冲突件及已观察替代；各检查点理想牌组、升级/删牌优先级；最小成型、首次成型时点、过渡、转向及放弃信号、典型失败、反例和可信度。未观察的检查点/组件/机制写未知，不因字段要求编造。无需等待 W1 schema，W2 将按正式格式转写。
3. 每方向按进阶列第三幕各 Boss 及 F48→F49 的实战矩阵：独立局分母、到达/胜负、首试与含 SL 分开、进退场 HP、药水与资源消耗、SL 依赖和不确定性；死亡/回血/恢复/过量伤害/模拟分开。缺配对或缺帧保留限制，不把幸存者通过率当整局胜率。
4. 可写成“条件 + 数值/标签”的小脑记忆候选：原经验 id、条件所需字段、数值单位/样本/不确定性或标签、反例、作用对象与角色边界；只给证据支持的候选，不能补算未记录机制。
5. 方向相关药水证据：使用/保留场景、对 boss/连战的观察与限制，供后续大脑药水方向条目参考；无证据不造优先级。
6. 对方向目录新增、合并、放弃的意见及证据；与旧知识、计划预期或其他候选冲突时独立列为异议，写 prior、新证据、影响范围与仍未知处，不强行支持原假设。异议汇总供 ops→watcher→Roy 转达，不代填他人确认。

每次候选、口径或结论变化向 {{scratch}}/changes.jsonl 追加时间、旧→新、原因与证据。保留失败原件、初稿、反例与弃选，不覆盖失败或倒填历史。每项新综合结论先查重，再仅用 {{project_root}}/learner/ledger.py CLI 登记 observed/proposed，关联本角色证据和本批报告、保留 prior/反例；不直接改账本，不标 shipped。该 CLI 追加是仅写 scratch/pending 的明确例外。没有新结论只关联已有条目，不为派发造知识。

## 回报

中文报告写 {{scratch}}/report.md；全量经验归属、方向卡、实战矩阵与记忆/药水候选、异议另存机器结果，报告链接这些实际文件与 SHA。complete 仅表示本次审计任务完成，不表示知识入库或 W2 完成；缺证章节仍必须写限制。最后单独输出 JSON：

```json
{"task":"v6-direction-experience","request_id":"roy-20261019-v6","batch":"{{batch}}","character":"silent","input_sha256":"冻结manifest的SHA256","covered_runs":["全部冻结局号"],"covered_experience_ids":["全部正式条目id"],"complete":true,"status":"complete或insufficient_evidence","directions":[{"id":"草稿方向id","evidence_runs":["本角色冻结局号"],"draft":"实际pending路径"}],"coverage":{"input_inventory":true,"experience_mapping":true,"direction_cards":true,"boss_matrix":true,"reflex_candidates":true,"potion_evidence":true,"catalog_review":true,"limitations":true},"limitations":["具体限制"],"disagreements":[{"prior":"旧结论或预期","evidence":"原始证据引用","finding":"异议","unresolved":"未知"}],"ledger_ids":["实际登记或关联id"],"artifacts":[{"path":"实际路径","sha256":"实际SHA256"}],"report":"{{scratch}}/report.md","merged":false,"published":false,"code_proposals":[],"implementation_domains":[]}
```

无合格方向时 directions 可为空，status 必须 insufficient_evidence；不能为了非空而编造结论。回报不宣称已送达 Roy 或已入正式知识。
