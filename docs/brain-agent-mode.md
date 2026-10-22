# 对局大脑的知识工具模式（#33）

Roy 2026-10-22 授权直接切换，不做 A/B，不额外开实验局。生产 `createBrain/createRouter` 使用知识 agent：状态、选项、投影和本局工作记忆照旧随题给出；全量知识前缀、开卷附件、策略库附件和记忆里的经验段改为工具查询。历史通用引擎适配器和固定回放仍保留原接口。

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

生产14个工具固定为 `kb_monster`、`kb_encounter`、`kb_experience`、`kb_stats`、`kb_old_knowledge`、`kb_potion`、`kb_open_book`、`kb_strategies`，以及 #26 的 `external_stats_card/skip/deck_size/encounter/clusters/cooccurrence` 六个工具。不含日志 SQL、对局原日志读取、模拟、任意路径、shell、文件写入或联网搜索。输入按 JSON Schema 校验，只读固定的已发布知识及既有开卷汇总；公共外部数据不计成本角色实盘验证。

Codex 保留空 cwd、project docs/hooks/apps/skills/multi-agent/shell/网络搜索禁用、无代码执行和 apply_patch 的模型目录配置；会话通过客户端 `gkb` 命名空间桥转发到本进程 MCP；不加载原生 MCP 配置，避免自动附加三个通用资源工具。知识模式不降到旧 exec。dsh 对继承配置中的每个顶层插件先禁用，再插入必要内核、Nova 凭据引用、只读知识 MCP 和流式观察器，不继承 bash、文件、Web、子 agent、通用 MCP 资源工具或其他用户工具。临时配置不含密钥，原生 dsh 会话保留在本仓库忽略的数据目录。

两种 harness 都连接进程内同一 `ToolDef` 列表，MCP 仅绑定 loopback 随机端口及不可预测路径，不新建 daemon、cron 或 MCP 子进程。查询结果保留完整正文、参数、UTF-8 返回字节数、来源/版本/SHA 与耗时，进入原 `brain.jsonl.tool_calls`。大结果返回缩小范围的提示；外部资料不覆盖当前 mod 数字或认证模拟可信度。

策略库复用 #16 已发布的 `strategy-entries.json` 及题型/状态触发器，不存在或为空时返回空。外部统计直接挂载 #26 的 `externalStatsTools()`，只读 `ctx.knowledgeDir/external/sts2fun/silent-a10.json` 的 #24 聚合，SHA固定在原模块；输入版本默认 `v0.111`。仅 Silent A10 适用，其他角色/进阶不回退；缺失、损坏 SHA、未知 ID 和不支持版本返回明确“无数据”的错误文本。每条保留 `external:sts2fun`、版本、分母、下载日期、原库/数据/来源 SHA、局限及16KB分页上限；流派和共现保留原模块的非因果/不能作方向依据说明，不混入自有统计。工具在对局控制器进程内执行，dsh/Codex 子进程不加载知识，因此角色身份不依赖继承 CHARACTER。

## 上线与读回

开发树不动 live/STOP。集成员联合检查后，由 ops 在自然开局边界选择引擎、显式核对旧环境中的 `BRAIN_ENGINE/BRAIN_CODEX_EFFORT/BRAIN_RUN_CONFIG`，防止历史显式值被误当成新默认。ops 核实际源码、分配行为 release_id，按原流程记录上线与通知。Codex 强度以原生 turn_context 回执为准；dsh 请求设置与原生会话分别留证，不把命令行意图当服务端已生效。

只读预检，不调用模型：

```bash
cd agent
nice -n 19 node --import tsx tools/dsh-knowledge-preflight.ts
nice -n 19 node --import tsx tools/codex-knowledge-preflight.ts
```

dsh 预检启动真实内核并以同一14项知识 MCP 核工具清单，替换任务 runner，绝不提交用户题。Codex 预检使用临时独立 home 和只连接本机、拒绝推理的 Responses fixture，核实际序列化工具清单，不使用生产账号。

首批自然局沿原日志读回：

```bash
nice -n 19 node --import tsx tools/brain-agent-report.ts <brain.jsonl> <run-id> ...
```

分别报告完成率、原生工具调用率/次数、工具执行耗时、查询阶段耗时、总耗时、调用/时间/卡住后作答比例。另列“有思考但无原生工具调用”和“把工具调用写进文字 JSON”的观测；前者不自动判失败，后者只匹配工具调用文字，不把正常答案 JSON 算失败。自然题的 `knowledge.mode=tools`、无前缀预算导致的开卷遗漏、来源标记与完整工具返回均须核实。零题或仅离线预检不构成自然局验收。

接口参考：[官方 Codex App Server 文档](https://developers.openai.com/codex/app-server/)。实际 CLI、dsh 的已安装协议和固定夹具另行验证；没有外部游戏知识变更。
