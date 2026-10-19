---
title: Silent 核心构筑卡（多组合）草稿
model.codex: gpt-6.1-sol
effort.codex: xhigh
tools: Read, Grep, Glob, Bash, Write
timeout_min: 240
max_turns: 800
characters: silent
---
# 任务：Silent 核心构筑卡（多组合）草稿

你是离线 Silent 学习者，任务 v6-build-cores，请求 roy-20261019-v6，批次 {{batch}}。工作树 {{worktree}}，日志 {{logs_dir}}。读 README.md、docs/learning-protocol.md、docs/learning-requests.md、docs/learning-code-proposals.md、docs/v6-plan.md 第 3.2、3.3、6、9.1、9.2、9.3 节和 agent/src/v6/build-core.ts、build-core-draft.ts、knowledge.ts。它们是格式与架构要求，不是游戏知识。报告/计算/拒绝条目只写 {{scratch}}，草稿只写本工作树 knowledge/characters/silent/pending/v6-build-cores-{{batch}}/，不改正在并行的其他任务。

## 冻结输入与边界

先读取 {{evidence}}，核对 request_id=roy-20261019-v6、task=v6-build-cores、character=silent、batch={{batch}}，计算 manifest 的 SHA256。按清单核实输入文件字节数与 SHA；冻结输入包括本角色正式经验、pending 草稿、construction-templates/support/opportunities、outcome-stats、monster-records、boss-trust、double-boss 与既有本角色报告（含 silent-historical-core-builds），以及清单明确冻结的 9.1 成型签名、逐局见证、Boss 矩阵与战斗记录、9.2 小脑草稿。清单缺失项明确保留，不用其他角色补齐。原报告在主检出或内容存储中时按精确路径读取，不能因稀疏检出缺文件而声称不存在。

清单包含全部已结束 Silent 局的 run inventory 与日志 log_byte_limits。读取日志不得越过冻结字节上限；只按本角色局号、时间窗、索引偏移抽取，记录命令、范围、原始证据与 SHA。整段日志若未测 SHA 必须照实说明，不能冒充已哈希；新局或新增字节不混入。冻结文件变化停止并报告；清单中不存在的后续产物不补入本批。正式经验逐条核对实际条数，不把计划中的 244 当成实测。

游戏知识只能由冻结本角色对局证据得出，不能使用预训练流派、牌效、机制、观察者建议或计划举例补牌表。既有结论仍须可追溯 run_id/层/回合、账本 id 与原证据；旧报告或模拟不等于实战。不能用最终牌组倒填前期，不能只分析幸存者。首试按首条 predicted_death 截断，与含 SL 最终结果分开；同局多次 SL 不能算独立样本。按进阶、版本、引擎分组，未知字段保留未知，无配对反事实不宣称因果。

不开局、不跑 play、在线调用、Boss 模拟池或二进制提取。所有分析 nice、单进程优先且最多四进程，不另派模型。不改代码、正式知识、参数、调度、运维 prompt、共享配置、其他任务或 STOP；不提交、不合入、不恢复 live 或 Regent。只产出草稿，不能标记 W2 已完成、知识已上线或消费者已读回。

## 必须交付

1. Roy 已授权本次一次性手动派发，模型 gpt-6.1-sol / xhigh、240 分钟。不要续批、另派学习者或恢复运行。以冻结 construction-templates 的目录为准，每个有足够证据的方向一张 build-core-v1，每方向允许多个组合、同牌跨组合，不按固定牌数分。牌池逐张写 roles、contribution、升级是否重要、组合反向引用和局号/层/回合证据。不能说清贡献的牌不能进组合；组合每张牌和 any_of 各候选都必须在牌池有证据，升级要求也要有证据。
2. 组合 types 覆盖 must_pick_minimal、common、max_cards、max_dpr，可同一组合多类型，可按证据新增。不能为了凑四种编造组合。没有证据的方向/类型在 missing 写原因。区分曾同时持有与核心全部生效，按逐层/回合证据确定首次成型，不能用最终牌组回填。组合 boss、fits 正反 Boss、路线（精英/休息/升级需求）、情况（血量/遗物/规模）、pivot_signals、failure_modes、confidence 都要有实战证据或明确未知。
3. 按第 6 节计算全部实战指标，使用该方向全部成型局，不只 9.1 抽样局。每个进阶、版本、首试 first 与 including_sl 分层；同一局多 SL 不能当独立局。逐组合保存全量成型/未成型/反例见证和排除原因，保存可复现统计程序、命令、采样单位、分母、误差与 SHA，供 W2.2 生成器复用。包括 Boss/精英/普通 DPR 中位/p25/p75，1–3/4–6/7+回合段、峰值/AoE，格挡/掉血，启动回合分布/能量/抽牌/首次成型层，成型局/通关局/平均到达层/各 Boss 到达胜率/连战，各牌按幕出现率/凑齐率，牌组范围与规模变化、药水/SL/关键遗物依赖。观察相关性不能写因果；每项 n、unit、method、evidence、small_sample 完整。未知 value=null、unknown_reason 非空，n=0 不得用0胜率代替。没有做模拟则 simulation=[] 并列限制；不要启动 Boss 模拟。
4. 原始 experience.json 全量逐条重归纳，产出追加 cores/combos 的字段提案，不改正式文件、不删原条目和证据。coverage 精确覆盖全部冻结经验，status=linked/unrelated/unknown/disputed，linked 的 links 为 {core:方向id,combo:组合id}，与核心/组合 linked_experience 双向一致；“无关”要逐条列明原因。linked_reflex 只引用冻结9.2草稿实际ID，不能引用后续产物。方向新增/合并/放弃单独 catalog_opinions，异议与反证单独 disagreements，不自行改目录。
5. draft.json 严格 {schema:"v6-build-core-draft-v1",character:"silent",cores:{schema:"build-cores-v1",character:"silent",entries:[build-core-v1对象]},coverage:[{experience_id,status,links,reason}],missing:[{direction,category,reason}],catalog_opinions:[],disagreements:[],limitations:[]}。实际字段类型以 build-core.ts 与 build-core-draft.ts 为准。每张卡含 schema/direction/name/status/scope/card_pool/combos/pivot_signals/failure_modes/linked_experience/linked_reflex；组合含 id/types/boss/cards/metrics/fits/evidence/confidence/linked_experience。cards 每项是 {id,count,upgraded} 或 {any_of:[id],count,upgraded}，upgraded 显式布尔。metrics 每层 {ascension,attempt,version,observed,bosses,availability,simulation}；observed 的必填字段名见 buildObservedMetricNames。每个 statistic 严格 {n,unit,method,value,se,distribution:[{label,count}],evidence,unknown_reason,small_sample,p25?,p75?}。distribution 可空，但启动分布能观察时必须提供。无法成卡可空 entries，全部缺项明确写 missing/限制。

## 自测与闭环

从冻结输入生成 {{scratch}}/validation-context.json，严格 {character:"silent",experienceIds:[实测全部正式经验id],directionIds:[冻结construction-templates中全部方向id],runIds:[manifest全部冻结局号],reflexIds:[冻结9.2草稿全部实际reflex id]}。记录提取程序、来源SHA和context SHA；不得删减分母让校验通过。校验只证明格式、覆盖和引用，不证明知识正确或消费者可用。运行：

```sh
(cd {{worktree}}/agent && nice -n 10 node --import tsx ../knowledge/builders/validate-v6-build-cores.ts 实际draft.json绝对路径 {{scratch}}/validation-context.json)
```

保存命令、exit code、stdout 与输入 SHA。入口只读，不发布、不合入。超过8MiB先报告，不修改校验器绕过。每次候选/口径/结论变化向 {{scratch}}/changes.jsonl 追加时间、旧→新、原因、证据；保留失败原件、初稿、反例和弃选。

新结论先用 {{project_root}}/learner/ledger.py CLI 查重，再登记 observed/proposed、关联本角色局号与报告；不直接写账本、不标 shipped，这是仅写scratch/pending的明确例外。涉及打法/药水/必死SL/终局价值时按代码提案闭环写任务、账本、证据/反例、旧新行为、角色/进阶范围、验证/回退建议，只留scratch，不实施或派修复。异议列 prior、新证据、影响与未知，供 ops→watcher→Roy 转达，不代填确认。

## 回报

中文 report.md 和机器结果写 scratch，报告链接实际草稿、校验记录、输入与产物 SHA、全量经验/局覆盖、限制和续跑清单。最终单独输出 JSON：

```json
{"task":"v6-build-cores","request_id":"roy-20261019-v6","batch":"{{batch}}","character":"silent","input_sha256":"manifest实测SHA","complete":true,"status":"complete或insufficient_evidence","covered_runs":[],"covered_experience_ids":[],"coverage":{"inventory":true,"experience_mapping":true,"drafts":true,"all_formed_runs":true,"combo_categories":true,"metrics_strata":true,"validation":true,"limitations":true},"counts":{},"limitations":[],"disagreements":[],"ledger_ids":[],"artifacts":[{"path":"实际文件","sha256":"实测SHA"}],"report":"{{scratch}}/report.md","continuation":[],"merged":false,"published":false,"code_proposals":[],"implementation_domains":[]}
```

complete仅表示本轮审计完成；不能称已正式入库、消费者读回或W2.2生成器已完成。无可用条目时 status=insufficient_evidence。
