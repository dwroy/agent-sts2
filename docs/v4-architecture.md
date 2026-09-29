# V4 架构（2026-09-29 Dai 定）

来源：notes/v4-dev-brief.md（V4 方向），加上 09-29 晚和 Dai 的架构讨论（paper/materials/discussions/2026-09-29-v4-architecture.md）。
Dai 的两条决定：
1. 对局中的大脑放开 Claude、codex，要能方便、无缝地切换引擎；
2. 自我迭代从大脑里拆出来，作为离线的学习者。

A/B/C 三个事实口径（路线投影算法、卡牌统计口径、Jev 的「整场不喝」事实）等新架构完成后再讨论，**V4 开发期间不改这些算法**，只把现有算法包进新接口。

## 1. 模块

对局中（在线）：

| 模块 | 职责 | 现在对应的代码 |
|---|---|---|
| 手 action adapter + 执行闸 | 执行动作；执行前核对状态指纹和合法性，过期动作不执行 | src/mod、src/screens、loop.ts |
| 眼 watcher | 结构化状态（不看画面）；**每个模块看到的输入原文全部落盘**；预测对实际的偏差记录 | src/telemetry、logs/*.jsonl |
| 小脑 reflex | 战斗：代码推演 + Jev 挑选；按明确条件升级给大脑 | screens/combat-plan.ts、turn-solver、rollout |
| 大脑 brain | 路线、构筑、商店、休息、事件、整局计划；以后接小脑的升级 | src/brain（新）；原 src/llm/deepseek.ts |
| 模拟器 simulator | 算准的事实：战斗推演、路线血量、boss 时钟；作为工具给大脑和小脑 | strategy/route-projection.ts、boss-clock.ts、rollout |
| 工作记忆 | 本局计划和承诺（如「这瓶药留给 boss」），大脑写、小脑读，只作事实、不作硬过滤 | project/run-journal.ts、run-plan.ts |
| 知识库 GKB | 游戏事实（观察所得，带 n）、日志库、统计（自动算）、经验（带证据局号） | src/knowledge、logs、experience.json |

对局外（离线）：

| 模块 | 职责 | 现在对应 |
|---|---|---|
| 学习者 learner | 复盘、更新经验库、修 bug、改题面；产出新版本 | 运维会话（ops/ops-session-prompt.md） |
| 评估 evaluator | 每个版本冻结后跑一批，按代理指标对比；Dai 决定上线 | ops/version_compare.py、ops/metrics.py |

## 2. 大脑：引擎可切换

接口在 `src/brain/types.ts`：`BrainRequest → BrainEngine.decide → BrainAnswer`。

- **路由器**（src/brain/router.ts）：按配置选引擎；**统一**负责校验（AnswerSpec.validate）、最多一次补问、失败回退、落盘。引擎只管「问一次」。
- **切换只改环境变量，不改代码**：
  - `BRAIN_ENGINE=deepseek|claude|codex|dsh`（默认 deepseek，行为和 v3 完全一致）；
  - `BRAIN_ENGINE_<前缀>` 按问题类型覆盖，前缀取 label 的第一段大写，如 `BRAIN_ENGINE_MAP=claude`、`BRAIN_ENGINE_SHOP=codex`；
  - `BRAIN_FALLBACK=deepseek`：引擎报错或超时时退回的引擎；
  - `BRAIN_<ENGINE>_MODEL`、`BRAIN_<ENGINE>_TIMEOUT_MS` 等各引擎参数。
- **引擎适配器**（src/brain/engines/）：
  - deepseek：包住现有 DeepSeekClient（JSON 模式），默认不带工具，知识放系统提示；
  - claude：无头 `claude -p`，`--output-format json`、`--json-schema`、`--system-prompt`（整份替换，不带 Claude Code 自己的提示）、`--mcp-config` 只挂我们的工具服务器、`--strict-mcp-config`、禁用内置工具（Bash/读写文件等）；不加载用户 hooks、CLAUDE.md、记忆；工作目录用空的临时目录；子进程环境变量里不带任何 key；
  - codex：无头 `codex exec`，`--output-schema`、只读沙箱、MCP 挂我们的工具服务器（codex 待 Dai 安装和登录，先用假程序测试）；
  - dsh：沿用 jev-sts2-dsh/experiments/dsh 的 arm C，工具注册成 dsh 工具。
- **落盘**：每次调用一行写到 `logs/brain.jsonl`：时间、label、引擎、模型、system 的哈希、完整 memory/question/payload、每次工具调用（输入和完整输出）、回答、问题清单、补问次数、token、耗时、成本、回退情况。**key 永远不落盘。**
- dsh 实验结论（jev-sts2-dsh/experiments/dsh/data/analysis.md，93 题）：JSON 模式格式失败 0%，最快也最便宜；严格工具调用和 dsh 没有更好。所以格式约束沿用 JSON 模式加统一校验，工具调用的价值在于**按需查知识和事实**，不在格式。

## 3. 工具层和知识库

接口在 `src/tools/types.ts`：`ToolDef { name, description, inputSchema, run(input, ctx) }`，只读、确定性。

- 同一份工具清单有三种给法：API 引擎在进程内调用；CLI 代码代理（claude/codex/dsh）经 stdio MCP 服务器（src/tools/mcp-server.ts，零依赖手写）调用；不用工具的引擎，由同一套渲染代码生成全量文本放进系统提示。
- 知识文本在程序启动时从数据文件渲染（monster-db.json、experience.json、room-costs.json、outcome-stats.json 每局结束后已自动刷新，所以不另挂 report.py）：
  - 怪物：只写当前进阶，没有当前进阶数据时按比例推算并标「估」，每个数带 n；
  - 经验：按主题分块，每条「结论 + 局数 + 一两个典型案例（run id + 一句话）」；
  - 统计表：各幕各进阶的房间代价（中位数、p75、p90、死亡率）、精英和 boss 战绩、休息点回血和锻造的效果；
  - 旧知识：ironclad-guide.md、ds-handbook.md、jev-hints.json 整份放入，标「旧知识、待数据验证」；开头写明「和数据冲突时以数据为准」。
- 知识加载失败要报错，不能静默给空知识。同一个事实只从一个地方算。

## 4. 里程碑

| 里程碑 | 内容 | 验收 |
|---|---|---|
| M1 大脑可切换 | 接口、路由器、四个引擎适配器、统一校验和补问、brain.jsonl 落盘、回放工具 | 默认 deepseek 时请求和 v3 逐字节相同（测试）；拿 30 个记录的真实问题，每个引擎各跑一遍，合法率（补问一次后）100%，报告耗时、token、成本、答案差异；切引擎只改环境变量 |
| M2 知识库工具 | 渲染器（全量 / 单条）、工具清单、MCP 服务器、导出命令 | 各引擎带工具回答同一批问题；DeepSeek 全量知识和按需查询两种方式对比 |
| M3 模拟器、工作记忆、执行闸、眼 | 路线事实和合法性检查做成工具；承诺落在工作记忆里给小脑看；执行前核对状态；Jev 题面原文落盘；预测对实际记录 | 回放日志地图：大脑给的路线 100% 通过检查（或补问一次后通过）；Jev 题面可复现 |
| M4 接入对局 | 完整地图自由规划路线、事件最后一问带路线、Jev 走廊/精英题面加留药和机制经验、小脑升级给大脑、评估指标脚本 | 交 Dai 决定是否切到 V4 |

## 5. 分支和工作树

- `v4`（jev-sts2）：集成分支。各开发项在自己的工作树和分支上做，做完合回 v4：
  - `v4-brain`（jev-sts2-v4brain）：M1；
  - `v4-gkb`（jev-sts2-v4gkb）：M2 的知识渲染、工具、MCP 服务器。
- 定期把 v3 合进 v4（运维会话一直往 v3 合修复），再从 v4 合到各开发分支。
- 一个工作树同一时间只让一个 agent 改代码。

## 6. 规矩（沿用 v4-dev-brief）

- 每次提交前 tsc（`npx tsc -p tsconfig.json --noEmit`）和 vitest 退出码都是 0（PATH 加 ~/.local/node/bin）；测试用固定数据，不依赖每局刷新的知识数据。
- `git -c user.name=dwroy -c user.email=roy.dongwei@gmail.com commit`，不推送。
- key 不许打印、不许落盘；只改 ~/Projects/sts2-jev；不运行 play；不动 jev-sts2-v3、jev-sts2-step；不读 sts2.dll 或 .pck；杀进程用 PID。
- node_modules、logs、.cache 是指向 jev-sts2 的软链接，和正在跑的 v3 共用：**不要 npm install**，要加依赖先问。
- 代码注释用英文，和现有代码一致；给模型的知识文本用中文。
