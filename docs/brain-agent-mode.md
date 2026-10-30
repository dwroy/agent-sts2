# 对局大脑的知识工具模式（#33）

Roy 2026-10-22 授权直接切换，不做 A/B，不额外开实验局。生产 `createBrain/createRouter` 使用知识 agent：状态、选项、投影和本局工作记忆照旧随题给出；全量知识前缀、开卷附件、策略库附件和记忆里的经验段改为工具查询。历史通用引擎适配器和固定回放仍保留原接口。

#81 的[决策点默认知识摘要](decision-knowledge-injection.md)是默认关闭的待审扩展；启用后题面可携带本局 K1 的有界背景，工具继续按需查询。#80 审阅通过前不集成、发布或启用，不以本段声明改变当前生产状态。

默认生产引擎是 Codex，GPT-6.1 Sol / high；DeepSeek 为 max，经本机现有 Nova dsh 启动器运行，不使用旧 API 直连。没有跨引擎自动兜底。Codex 的服务不可用等待机制沿用；等待不代表已作答，也不代表达到本题完成验收。

主循环对两种生产知识引擎使用相同的出题入口；dsh 不要求旧 `DEEPSEEK_API_KEY`，也不受旧直连 `DEEPSEEK_MAX_CALLS` 门禁控制。实际限制登记在 `brain.agent`，不会把未使用的 API 模型或额度记成 dsh 的配置。原有 L1 安全回退与 Codex 的故障等待策略保留。

## 运行配置

仅在新对局入口选择，进程内不重读环境、不热切线程。

| 配置 | 默认值 | 含义 |
|---|---:|---|
| `BRAIN_ENGINE` | `codex`（生产入口） | `codex` 或 `deepseek`；后者实际使用 dsh |
| `BRAIN_RUN_CONFIG` | 未设置 | 复用 #31 的按局 JSON；例如 `{"engine":"codex","effort":"high"}` 或 `{"engine":"deepseek","effort":"max"}`，优先于普通设置；不启动交替试验 |
| `BRAIN_CODEX_EFFORT` | `high` | 可设置 Codex 支持的强度 |
| `BRAIN_DEEPSEEK_EFFORT` | `max` | dsh 支持 `low/high/max`，不自动逐题降低 |
| `BRAIN_DEEPSEEK_MODEL` | `deepseek/deepseek-flash` | Nova dsh 模型 ID |
| `BRAIN_MAX_TOOL_CALLS` | `8` | 每题最多执行的知识查询数；错误查询也计入，重问不重新发额度 |
| `BRAIN_AGENT_CODEX_TOTAL_MS` | `300000` | Codex 单次题目处理的总预算 |
| `BRAIN_AGENT_CODEX_ANSWER_MS` | `120000` | 在总预算内保留的无工具作答时间 |
| `BRAIN_AGENT_DEEPSEEK_TOTAL_MS` | `900000` | DeepSeek 单次题目处理的总预算 |
| `BRAIN_AGENT_DEEPSEEK_ANSWER_MS` | `300000` | 在总预算内保留的无工具作答时间 |
| `BRAIN_DSH_BIN` | `~/.local/bin/dsh` | 已配置 Nova 的现有启动器；不创建/修改账号或共用配置 |
| `BRAIN_DSH_STALL_MS` | `180000` | 无流式进展的卡住检测 |

初值理由：8 次查询容纳本题实体、经验、策略和统计的少量定向检索，避免无边界搜索；Codex 查询阶段最多180秒，DeepSeek最多600秒，分别留下120/300秒完成 JSON。DeepSeek 总预算比旧90秒大脑节奏长，完成率优先。值是工程初值，不是从游戏胜率学出的规则。预算与实际引擎/强度记录在原 run-config 的 `brain.agent`、`brain.engines` 和 human-pace 段。

到调用或查询阶段时间上限时，停止查询 harness，用**同一引擎**、原题及已记录的工具结果重新作答，关闭全部工具。工具错误作为错误文本返回，不令题目直接失败。硬取消或后端在整个保留时间内仍无法回答时，不能伪造游戏选择；原错误和 Codex 服务恢复等待仍保留。没有承诺在后端永久不可用时一定得到答案。

## 工具与隔离

生产原14个工具为 `kb_monster`、`kb_encounter`、`kb_experience`、`kb_stats`、`kb_old_knowledge`、`kb_potion`、`kb_open_book`、`kb_strategies`，以及 #26 的 `external_stats_card/skip/deck_size/encounter/clusters/cooccurrence` 六个工具。#49 为 Silent 增加 `kb_reflex`，共15项；其他角色仍为原14项。不含日志 SQL、对局原日志读取、模拟、任意路径、shell、文件写入或联网搜索。输入按 JSON Schema 校验，只读固定的已发布知识及既有开卷汇总；公共外部数据不计成本角色实盘验证。

Codex 保留空 cwd、project docs/hooks/apps/skills/multi-agent/shell/网络搜索禁用、无代码执行和 apply_patch 的模型目录配置；会话通过客户端 `gkb` 命名空间桥转发到本进程 MCP；不加载原生 MCP 配置，避免自动附加三个通用资源工具。知识模式不降到旧 exec。dsh 对继承配置中的每个顶层插件先禁用，再插入必要内核、Nova 凭据引用、只读知识 MCP 和流式观察器，不继承 bash、文件、Web、子 agent、通用 MCP 资源工具或其他用户工具。临时配置不含密钥，原生 dsh 会话保留在本仓库忽略的数据目录。

两种 harness 都连接进程内同一 `ToolDef` 列表，MCP 仅绑定 loopback 随机端口及不可预测路径，不新建 daemon、cron 或 MCP 子进程。查询结果保留完整正文、参数、UTF-8 返回字节数、来源/版本/SHA 与耗时，进入原 `brain.jsonl.tool_calls`。大结果返回缩小范围的提示；外部资料不覆盖当前 mod 数字或认证模拟可信度。

策略库复用 #16 已发布的 `strategy-entries.json` 及题型/状态触发器，不存在或为空时返回空。外部统计直接挂载 #26 的 `externalStatsTools()`，只读 `ctx.knowledgeDir/external/sts2fun/silent-a10.json` 的 #24 聚合，SHA固定在原模块；输入版本默认 `v0.111`。仅 Silent A10 适用，其他角色/进阶不回退；缺失、损坏 SHA、未知 ID 和不支持版本返回明确“无数据”的错误文本。每条保留 `external:sts2fun`、版本、分母、下载日期、原库/数据/来源 SHA、局限及16KB分页上限；流派和共现保留原模块的非因果/不能作方向依据说明，不混入自有统计。工具在对局控制器进程内执行，dsh/Codex 子进程不加载知识，因此角色身份不依赖继承 CHARACTER。

### 查询引导（#49）

Roy/主管 2026-10-23 最新裁定（issue评论6361846602）：rk 指 **reflex knowledge**，即 `reflex.json` 条目（v6-plan §5），不是 experience/shared-experience 的别名。此前开发6290300d8的解释已撤回，原提交、交付报告和失败证据保留为历史；本节为修正后的合同。

Roy 2026-10-24 晨裁定（评论6377338293）：先关闭策略/rk查询引导，等 #51 外部条目入库后再议开启。Silent 的系统提示和题面不再附策略/rk的匹配数量、身份、工具参数或查询引导；`kb_strategies`、`kb_reflex` 仍注册，大脑可自行调用，工具只读合同、调用/耗时预算与实际调用审计保留。R419经验暂不回退；Ironclad 的基础指令和原工具表/schema 保持原样。此前10-23晚按非空匹配给线索的R420合同作为历史保留，由本次裁定取代。

#55 后续授权的候选扩展：Silent 仅在当前策略匹配数>0时给一句“本题有 N 条相关策略/剧本可查。”，不恢复强制查询或 rk 提示。`kb_strategies` 默认前三条、按页保留完整证据，并支持 #54 几何的显式模型/版本/簇绑定段落；详见[情境检索与剧本发布合同](strategy-context-retrieval.md)。源码交付不代表已上线；集成员/ops沿原发布链核实际版本、自然局每题命中ID与每局耗时。未正式发布的 #51 scratch 候选不在查询范围。

题面末尾 `brain-query-cues-v3` 保留独立的 experience 及适用时的 external_stats，不再包含 strategies/rk。经验线索只含候选数量、最多六条身份/已有标题、scope及非空时的 `kb_experience relevant=true` 参数；缺失库数量为null，合法空库为0。经验正文仍由工具返回，不把相关性当作条件已成立或Jev采用。

`kb_reflex` 只读当前 Silent 的已发布 reflex.json，支持 query（关键词/ID/`*`）及可选 applies_to（combat_line/card_pick/potion/rest/shop），不接受路径、角色、进阶或写入参数。复用 `loadV6Knowledge` 的目录/文件边界、严格 schema 与词表/方向/core/combo 引用校验，按条目角色和当前进阶过滤；不回退到公共或其他角色文件，不以经验条目填补 rk。构筑题按用途筛选：拿牌仅card_pick，商店为shop/card_pick/potion，休息仅rest，事件与幕初规划为四种构筑用途，均排除combat_line（显式请求也不能绕过）。返回一句话摘要（原label_en）、ID/版本/用途、原confidence/evidence/source_experience，不返回原始predicate或signal JSON；摘要省略条件并不意味着无条件适用。fight-plan仍返回完整原条目，其他角色不变。source_experience为来源经验关联，不是reflex命中ID。加载器的可选审计读取回调只记录其实际解析字节及输入文件 SHA，原 Jev 消费者沿默认读取，行为不变。来源包含 reflex.json 及实际读取的引用校验输入（reflex-vocab/build-cores/direction-cards），每份有角色、版本/schema 和 SHA。

检索不执行 predicate，不把未知战斗/选项状态当作满足条件；返回明确 `predicate_evaluation=not_evaluated`。`V6_COMBAT_ENTRIES=off` 关闭的是 Jev 执行消费，备战题仍可供大脑只读规划，构筑题排除combat_line；查询不会打开它、修改知识或发送条目给 Jev。缺库/空库/无命中返回明确空结果，坏库/坏引用返回工具错误；正文最多12条/24KB，省略数单列，不截断证据，元数据本身超限则报错。

`kb_experience relevant=true` 仍按既有 relevance 和进阶有效性查询经验，最多12条/24KB；保留原置信度、支持/反例、来源、证据与文件版本/SHA，可结合 theme/id/keyword 筛选。策略触发题型包含 fight_plan，旧策略不自动外推。新增查询工具后仍为原8次调用及查询/作答预算，无新增重问、强制查询闸或跨引擎兜底；错误/空结果或预算耗尽后用已有信息作答。

拿牌/商店的 `external_stats` 为可选线索：复用 #26 已审核且SHA固定的聚合，按当前候选精确ID、幕、Silent A10/v0.111核实际数据行是否存在；给六工具的非零可执行参数、匹配候选数及最多六张候选ID，不内嵌拿取率/胜率/区间等统计正文。缺库、SHA错误、其他角色/进阶/题型不提示。卡牌/跳过表来自奖励机会，不冒称商店购买率；聚类/共现保留非因果、不能作方向依据说明，由大脑自行决定调用。原 #26 奖励提示不改，不引入额外依赖或联网请求。

工具模式 brain 日志使用 `query_audit.schema=brain-query-audit-v2`，strategies 只计 kb_strategies，rk 只计 kb_reflex，experience 只计 kb_experience；分别记录 queried/calls/hit_calls/unknown_hit_calls/hit_ids，成功与失败题均从实际 tool_calls 重建。错误、空结果、线索及模型文字不算命中，未知输出不补零。完整参数、来源、返回字节和耗时仍留在 tool_calls。

## 上线与读回

开发树不动 live/STOP。集成员联合检查后，由 ops 在自然开局边界选择引擎、显式核对旧环境中的 `BRAIN_ENGINE/BRAIN_CODEX_EFFORT/BRAIN_RUN_CONFIG`，防止历史显式值被误当成新默认。ops 核实际源码、分配行为 release_id，按原流程记录上线与通知。Codex 强度以原生 turn_context 回执为准；dsh 请求设置与原生会话分别留证，不把命令行意图当服务端已生效。

只读预检，不调用模型：

```bash
cd agent
nice -n 19 node --import tsx tools/dsh-knowledge-preflight.ts
nice -n 19 node --import tsx tools/codex-knowledge-preflight.ts
```

dsh 预检启动真实内核并以同一按角色工具清单（Silent为15项）的知识 MCP 核工具清单，替换任务 runner，绝不提交用户题。Codex 预检使用临时独立 home 和只连接本机、拒绝推理的 Responses fixture，核实际序列化工具清单，不使用生产账号。

首批自然局沿原日志读回：

```bash
nice -n 19 node --import tsx tools/brain-agent-report.ts <brain.jsonl> <run-id> ...
```

#49 的 `query_groups` 按引擎及互斥题型分别列策略/rk/经验查询率、每题调用次数均值/p95、工具命中率、实际命中ID及每题耗时均值/中位数/p95；幕初事件只进 act_plan 分母。命中率为非空ID返回次数/该工具调用次数（含错误），没有调用或存在未知历史输出时为 null。`rk_available_questions` 另列该窗口实际公布 kb_reflex 的题数。历史日志按原 tool_calls 重建，kb_experience 绝不追认为 rk，即使旧 query_audit 曾误标；前18局没有 rk 工具时明确显示可用题数为0。冻结上线前18个自然局号与上线后首批自然局号后比较：

```bash
nice -n 19 node --import tsx tools/brain-agent-report.ts <after.jsonl> <after-run-id> ... \
  --baseline <before.jsonl> --baseline-run <before-run-id> --baseline-run <before-run-id-2>
```

`--baseline-run` 重复18次；报告会核实际有工具模式记录的基线局数是否为18。未指定局号时读取该文件全部工具模式题，调用者须先冻结正确窗口。比较保留两个窗口完整分母与指标，缺少题型的差值为 null。发布与首批自然读回由集成员/ops 完成，不为本功能追加实验局，不将前后差异当因果收益。

分别报告完成率、原生工具调用率/次数、工具执行耗时、查询阶段耗时、总耗时、调用/时间/卡住后作答比例。另列“有思考但无原生工具调用”和“把工具调用写进文字 JSON”的观测；前者不自动判失败，后者只匹配工具调用文字，不把正常答案 JSON 算失败。自然题的 `knowledge.mode=tools`、无前缀预算导致的开卷遗漏、来源标记与完整工具返回均须核实。零题或仅离线预检不构成自然局验收。

接口参考：[官方 Codex App Server 文档](https://developers.openai.com/codex/app-server/)。实际 CLI、dsh 的已安装协议和固定夹具另行验证；没有外部游戏知识变更。

小修正的自然验收须另冻结发布后首批窗口，继续分列查询率、命中率及 latency_ms_median/mean/p95，与原18局口径比较。约14秒中位数为目标，固定测试不证明时延或命中率收益；不追加实验局。

## 工具能力与计划复用（#58）

生产系统提示按**本次请求实际注册**的 `ToolDef.name/description/inputSchema` 生成工具定义、主要输入与用途；Silent 为15项，其余角色按实际清单。用途写在原 ToolDef.description，MCP 与提示共用，不维护另一份工具能力表。机械资料、经验、策略/rk及统计分别帮助启动与过渡、本幕Boss、最终双Boss、路线及拿/删/升级/商店决策；工具本身不新增模拟或预测能力。查询由大脑按需选择，没有“查策略/rk后才能答”的固定前置条件。

Silent A10 的终局目标继续从第一幕面向 F48→F49 连胜。初次建立完整 `run_plan`（含 endgame）；后续已有计划时，省略或 `null` 的 `run_plan` 沿用原计划，不要求每题声明保持/更新。确需调整时，在同题给受影响字段及 `change_reason`，说明当前事实、相较旧计划的取舍和预期胜率收益，缺证可写未知，不编造百分比。`endgame` 可仅更新一项，其他策略、方向权重及终局字段保留。重复相同字段按复用处理；幕末只须在 `run_plan.endgame.checkpoint` 回答准备程度，不强制换路线或重写全套计划。

爬楼继续使用原 `RoutePlan`、代码逐节点执行和合法性检查。普通复核题可省略 route 或给 `keep`，重复相同节点序列也复用原计划；真实改线才给合法新节点序列及 `route_reason`，结合当前情况说明取舍和预期收益。初始路线、路线失效、幕初随机结果的一次复核沿原入口处理；两类路线分别调整。非目标角色/进阶保留原控制与日志语义。

Silent A10 的改线题在严格 Codex 输出格式中保留可空的 `route_reason`，即使历史配置为 `BRAIN_CODEX_ROUTE_REASON=drop`；默认文本上限仍为 60 字符。不改线可给 null，解析后等同省略。理由只随真实改线进入路线记录，构筑的 `run_plan.change_reason` 不代替它；字段存在不表示代码能验证理由语义或胜率收益。

Silent A10 的 `routeBlockState` 按实际依赖分别缓存 `plan_facts`、`next_rest` 和初始 `candidate_routes`。地图/当前位置/可达性/飞行靴、剩余节点与房间代价参与键，HP/maxHP、连续战斗数、休息选项及文字说明按各自消费者参与；金币、牌组等仍随当前事实更新，经 `routeCosts` 实际改变的回血/房间模型也会失效。仅休息选项变化不重算无关的 next_rest；重复题且依赖未变不再计算同一整段投影/枚举替代线。缓存不落盘，冷启动重新核算当前数值；不拿原计划投影冒充当前HP。缓存数据复制后交题面，不能被消费者修改污染。

沿原自然局读取 `brain.jsonl` 和 `run-plans.jsonl`，报告 `planning_questions` 列实际查库、路线/构筑变更理由、`route_calculation` 复用/失效原因、答案JSON字符数、原文字符数、输出token及整题耗时。`run_plan_merge`/`plan_update` 记录 reused/updated/checkpoint 与变更字段；合法执行仍核 decisions 的 route_review、route-change及后继读回。报告的 accepted 只证明接口接受，不能代实际落盘/采用或决策质量；缺字段/空样本保持未知。ops 在自然发布边界核实际提示SHA/工具清单与消费者、恢复后，继续观察自然决策质量与原 #50 达标线/终局效果；不为本项增开局或以查询次数下降单独验收。
