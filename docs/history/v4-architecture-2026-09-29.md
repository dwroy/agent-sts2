# V4 架构（2026-09-29 Roy 定）

来源：notes/v4-dev-brief.md（V4 方向），加上 09-29 晚和 Roy 的架构讨论（paper/materials/discussions/2026-09-29-v4-architecture.md）。
Roy 的决定：
1. **大脑优先用 Claude**，而且是**本地 agent**：通过工具调用查知识库、问模拟器，还能直接下动作。引擎要能方便、无缝地切换（claude / codex / dsh / deepseek）。（22:05）
2. **自我迭代从大脑里拆出来**，作为离线的学习者；学习者**同样可以切换不同的 agent**。（22:05、22:09）
3. **修订（22:36）**：对局中的**执行大脑可以不用本地 agent 模式，前提是经验和游戏库数据能整份放进请求 prompt**（放得下就用 DeepSeek JSON + 全量知识前缀；放不下再走工具调用 / agent 模式）。**自我迭代要用 Claude 和 codex，先支持 Claude，用订阅模式（本机登录态）**。下面 §2–§4 按这条修订；第 1 条里「Claude 优先、工具调用、下动作」的 agent 大脑保留为放不下时的路径和离线学习者的形态。

A/B/C 三个事实口径（路线投影算法、卡牌统计口径、Jev 的「整场不喝」事实）等新架构完成后再讨论，**V4 开发期间不改这些算法**，只把现有算法包进新接口。

## 1. 模块

对局中（在线）：

| 模块 | 职责 | 现在对应的代码 |
|---|---|---|
| 手 action adapter + 执行闸 | 执行动作；执行前核对状态指纹和合法性，过期动作不执行；大脑和小脑的动作都经过它 | agent/src/hand/mod、agent/src/hand/screens、loop.ts |
| 眼 watcher | 结构化状态（不看画面）；**每个模块看到的输入原文全部落盘**；预测对实际的偏差记录 | agent/src/eye、logs/*.jsonl |
| 小脑 reflex | 战斗：代码推演 + Jev 挑选；按明确条件升级给大脑 | screens/combat-plan.ts、turn-solver、rollout |
| 大脑 brain | 本地 agent：路线、构筑、商店、休息、事件、整局计划；能调工具查知识、问模拟器、下动作；以后接小脑的升级 | agent/src/brain（新）；原 agent/src/brain/llm/deepseek.ts |
| 模拟器 simulator | 算准的事实：战斗推演、路线血量、boss 时钟；作为工具给大脑和小脑 | strategy/route-projection.ts、boss-clock.ts、rollout |
| 工作记忆 | 本局计划和承诺（如「这瓶药留给 boss」），大脑写、小脑读，只作事实、不作硬过滤 | project/run-journal.ts、run-plan.ts |
| 知识库 GKB | 游戏事实（观察所得，带 n）、日志库、统计（自动算）、经验（带证据局号） | knowledge、logs、experience.json |

对局外（离线）：

| 模块 | 职责 | 现在对应 |
|---|---|---|
| 学习者 learner | 复盘、更新经验库、修 bug、改题面；产出新版本。任务写成任务说明文件，由统一的启动脚本交给 claude / codex / dsh 执行，引擎可切换 | 运维会话（ops/ops-session-prompt.md） |
| 评估 evaluator | 每个版本冻结后跑一批，按代理指标对比；Roy 决定上线 | ops/version_compare.py、ops/metrics.py |

## 2. 大脑：引擎可切换；执行大脑先走「全量知识 + JSON」

接口在 `agent/src/brain/types.ts`：`BrainRequest → BrainEngine.decide → BrainAnswer`。

**修订后的主路径（22:36）**：
- 对局中的执行大脑 = DeepSeek JSON 模式，系统提示最前面放全量知识前缀（§3），前提是实测放得下（总 token、缓存命中、耗时、答案质量都可接受）。这条路径不需要工具服务。
- **执行大脑也要能切换 LLM（Roy 22:39）**：默认 DeepSeek JSON；可切到 Claude（Opus / Sonnet，用订阅即本机登录态），同样是「全量知识前缀 + 结构化回答」、不带工具，可按问题类型分别指定（如路线用 Opus、选牌用 DeepSeek）。订阅额度用完、限流或超时时自动退回 DeepSeek，并记下原因（对局 24 小时无人值守，不能卡住）。
- claude 引擎只做订阅（login）认证；执行大脑和离线学习者共用。
- MCP 服务先只做 stdio 版（学习者、回放用）；进程内 HTTP 版、dsh 引擎、codex 引擎、行动模式都推迟：放不下全量知识、或学习者要接 codex 时再做。

以下是完整设计（含推迟的部分）：

- **两种工作方式**：
  - **决策模式**（M1）：代码在某个屏幕提一个问题；大脑可以先调工具查知识、问事实，再给结构化回答；路由器校验、补问；代码执行。
  - **行动模式**（M2）：代码把一段流程交给大脑（一个商店、一个事件、一次休息、选路；以后是小脑升级上来的战斗回合），大脑用 `game_state` / `game_act` 工具自己操作。每个动作经执行闸核对合法性和状态指纹；这一段结束（屏幕变了、预算用完、超时）控制权回到代码。
- **路由器**（agent/src/brain/router.ts）：按配置选引擎；**统一**负责校验（AnswerSpec.validate）、最多一次补问、失败回退、落盘。
- **切换只改环境变量，不改代码**：
  - `BRAIN_ENGINE=claude|codex|dsh|deepseek`（开发期默认 deepseek，行为和 v3 完全一致；Claude 验收通过后由 Roy 决定改默认）；
  - `BRAIN_ENGINE_<前缀>` 按问题类型覆盖，前缀取 label 的第一段大写，如 `BRAIN_ENGINE_MAP=claude`；
  - `BRAIN_FALLBACK=deepseek`：引擎报错或超时时退回的引擎；
  - `BRAIN_<ENGINE>_MODEL`、`BRAIN_<ENGINE>_TIMEOUT_MS`、`BRAIN_<ENGINE>_EFFORT` 等各引擎参数。
- **工具服务**：对局进程内起一个 MCP 服务（HTTP，只监听 127.0.0.1，随机端口 + 一次性 token），工具在进程内运行，能读实时状态、能调执行闸。claude / codex 经 `--mcp-config` 的 http 条目连它；dsh 在进程内注册；DeepSeek 用原生函数调用。离线（学习者、回放）用同一份工具清单的 stdio 版本。
- **引擎适配器**（agent/src/brain/engines/）：
  - **claude（优先）**：无头 `claude -p`，`--output-format json`、`--json-schema`、`--system-prompt`（整份替换，不带 Claude Code 自己的提示）、`--mcp-config` 只挂我们的工具服务、`--strict-mcp-config`、`--tools ""` 禁用内置工具；不加载用户 hooks、CLAUDE.md、记忆；工作目录用空的临时目录；子进程环境变量里不带我们的任何 key。认证方式（本机登录的订阅，还是 ANTHROPIC_API_KEY 配 `--bare`）待 Roy 定。
  - codex：无头 `codex exec`，`--output-schema`、只读沙箱、MCP 连我们的工具服务（codex 待 Roy 安装和登录，先用假程序测试）；
  - dsh：沿用 jev-sts2-dsh/experiments/dsh 的 arm C，工具注册成 dsh 工具；
  - deepseek：包住现有 DeepSeekClient；不带工具时和 v3 逐字节相同，带工具时走原生函数调用。
- **落盘**：每次调用一行写到 `logs/brain.jsonl`：时间、label、引擎、模型、system 的哈希、完整 memory/question/payload、每次工具调用（输入和完整输出）、回答、问题清单、补问次数、token、耗时、成本、回退情况。**key 永远不落盘。**
- dsh 实验结论（jev-sts2-dsh/experiments/dsh/data/analysis.md，93 题）：JSON 模式格式失败 0%，最快也最便宜；严格工具调用和 dsh 没有更好。所以工具调用的价值在于**按需查知识、问事实、下动作**，不在格式约束。

## 3. 工具层和知识库

接口在 `agent/src/brain/tools/types.ts`：`ToolDef { name, description, inputSchema, run(input, ctx) }`。

- 工具分三类：知识库（kb_*，只读、确定性）、模拟器（sim_*，只读、确定性）、游戏（game_state 只读；game_act 经执行闸执行动作，只在行动模式开放）。
- 日志库（09-29 Roy 定用 DuckDB）：logs/*.jsonl 增量派生成 Parquet 分析库 data/logdb（JSONL 仍是唯一原始记录），表 runs / floors / fights / turns / decisions / llm_calls / run_plans / state_index；查询入口 agent/tools/logdb/query.py，工具 `logs_query`（只读 SQL）。见 docs/logdb.md。
- 知识文本在程序启动时从数据文件渲染（monster-db.json、experience.json、room-costs.json、outcome-stats.json 每局结束后已自动刷新，所以不另挂 report.py）：
  - 怪物：只写当前进阶，没有当前进阶数据时按比例推算并标「估」，每个数带 n；
  - 经验：按主题分块，每条「结论 + 局数 + 一两个典型案例（run id + 一句话）」；
  - 统计表：各幕各进阶的房间代价（中位数、p75、p90、死亡率）、精英和 boss 战绩、休息点回血和锻造的效果；
  - 药水换算表（2026-09-30）：每瓶药留到本幕 boss 战值多少血/伤害/格挡，按进阶和幕，带来源和 n（potion-equivalents.json，knowledge/builders/build-potion-equivalents.py 手动重建；docs/potion-equivalents.md）；工具 `kb_potion`，Jev 战斗题的 potion_context 也带手里每瓶药的这一行；
  - 旧知识：ironclad-guide.md、ds-handbook.md、jev-hints.json 整份放入，标「旧知识、待数据验证」；开头写明「和数据冲突时以数据为准」。
- 同一套渲染代码既出全量前缀（给不用工具的引擎，或作为常驻摘要），也出单条查询结果（给工具）。
- 知识加载失败要报错，不能静默给空知识。同一个事实只从一个地方算。

## 4. 里程碑

（22:36 修订后）

| 里程碑 | 内容 | 验收 |
|---|---|---|
| M1 执行大脑：全量知识 + JSON | 知识渲染器和全量前缀；实测放不放得下；路由器、deepseek 引擎、统一校验和补问、brain.jsonl、回放工具；claude 引擎（订阅）和 stdio MCP + kb_* 工具（给学习者和对比用） | 默认配置请求和 v3 逐字节相同（测试）；30 个记录的真实问题，旧问法和「全量知识前缀」新问法各跑一遍，报告 token、缓存命中、耗时、成本、答案差异；放不下时给出按需查询方案的数据 |
| M2 路线和构筑事实 | 完整地图交给大脑自由规划，代码检查合法性（含飞行靴、A10 第二个 boss 节点）并算所选路线的事实；路线修正随选牌、休息、事件最后一问；卡牌事实替代社区分数；删旧的候选路线代码。算法本身（A/B）等讨论后再改 | 回放日志地图：路线 100% 通过检查（或补问一次后通过）；没有代码拍脑袋定的分数 |
| M3 工作记忆、执行闸、眼 | 留药等承诺作为事实进 Jev 走廊/精英题面（清单第 4 项，C 待讨论）；执行前核对状态指纹；Jev 题面原文落盘；预测对实际记录 | Jev 题面可复现；20 个走廊喝药局面新旧题面对比 |
| M4 离线学习者、评估 | 学习任务（复盘、经验更新、修 bug）写成任务说明文件，统一启动脚本先支持 Claude（订阅），codex 以后加；评估指标脚本（清单第 7 项） | 交 Roy 决定是否切到 V4 |

推迟项（放不下全量知识、或需要时再做）：进程内 HTTP MCP、行动模式（game_state / game_act）、dsh 和 codex 对局引擎、小脑升级给大脑。

## 5. 分支和工作树

- `v4`（jev-sts2）：集成分支。各开发项在自己的工作树和分支上做，做完合回 v4：
  - `v4-brain`（jev-sts2-v4brain）：大脑、路由器、引擎、MCP 服务；
  - `v4-gkb`（jev-sts2-v4gkb）：知识渲染器和 kb_* 工具（agent/src/brain/tools/registry.ts 的内容）。
- 定期把 v3 合进 v4（运维会话一直往 v3 合修复），再从 v4 合到各开发分支。
- 一个工作树同一时间只让一个 agent 改代码。

## 6. 规矩（沿用 v4-dev-brief）

- 每次提交前 tsc（`npx tsc -p tsconfig.json --noEmit`）和 vitest 退出码都是 0（PATH 加 ~/.local/node/bin）；测试用固定数据，不依赖每局刷新的知识数据。
- `git -c user.name=dwroy -c user.email=roy.dongwei@gmail.com commit`，不推送。
- key 不许打印、不许落盘；只改 ~/Projects/sts2-jev；不运行 play；不动 jev-sts2-v3、jev-sts2-step；不读 sts2.dll 或 .pck；杀进程用 PID。
- node_modules、logs、.cache 是指向 jev-sts2 的软链接，和正在跑的 v3 共用：**不要 npm install**，要加依赖先问。
- 代码注释用英文，和现有代码一致；给模型的知识文本用中文。
