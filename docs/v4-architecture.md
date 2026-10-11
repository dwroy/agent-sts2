# V4 架构：当前实现

核对日期：2026-10-10。本文说明 main 的现行代码；运行中的进程采用哪个提交和配置，要看实际 live、`logs/run-config.jsonl` 和调用日志。现场状态见 `paper/materials/STATE-*.md` 及 [decision-log](../paper/materials/decision-log.md)。

V4 从 2026-09-29 的模块拆分发展而来。[原始设计](history/v4-architecture-2026-09-29.md) 与 [首次上线方案](v4-go-live.md) 保留历史口径。其中 DeepSeek 默认、Claude 优先、Codex 待实现、v3/v4 分支及人工审核流程已由后续实现和授权更新。当前边界以 [AGENTS.md](../AGENTS.md)、[学习协议](learning-protocol.md) 为准。

## 1. 模块与数据流

```text
游戏 mod 的 HTTP 状态 → 眼 → 手的决策循环
                              ├─ 战斗：小脑 / 求解器 / 推演 / Jev
                              └─ 路线、构筑、事件、计划：Codex 大脑
                                    ↑ 模拟事实、角色知识、本局记忆
                        决定 → 执行闸 → mod 动作 → 新状态

原始日志 → 离线学习者 → 经验 / 知识 / 代码提案 → 自测 → live
    └──────────────────→ 评估、校准、学习账本、论文材料
```

| 模块 | 当前职责 | 代码入口（项目根下） |
|---|---|---|
| 手 hand | 按屏幕出题、执行合法动作；决策时和发送前检查动作身份与状态指纹，过期动作重新规划 | `agent/src/hand/loop.ts`、`hand/mod/`、`hand/act/`、`hand/screens/` |
| 眼 eye | 记录与回放决策、状态、Jev 原题、每局配置 | `agent/src/eye/` |
| 小脑 reflex | 战斗候选线、回合求解、抽样推演、药水成本与 Jev 选择；读取 SL 重试信息 | `agent/src/reflex/combat-plan.ts`、`turn-solver.ts`、`rollout*.ts`、`jev/` |
| 大脑 brain | 路线、选牌、商店、休息、事件、整局计划及已启用的战斗计划；返回结构化答案，由代码校验和执行 | `agent/src/brain/brain.ts`、`router.ts`、`specs.ts`、`engines/codex*.ts` |
| 模拟器 sim | B2 战斗线整场模拟、B3 构筑对照、boss 时钟、路线血量投影；结果带样本与信度限制 | `agent/src/sim/boss-sim.ts`、`boss-lines.ts`、`build-sim.ts`、`boss-clock.ts`、`route-projection.ts` |
| 工作记忆 memory | 本局历史、路线、整局/战斗计划与承诺；`RUN_PLAN_MERGE` 可把到期计划附在下一道大脑题里 | `agent/src/memory/` |
| SL | 终局判断、重载、失败尝试记录、已知抽牌与重试探索 | `agent/src/sl/`；[SL 记录](sl.md) |
| 知识库 | 加载、按角色/进阶过滤、渲染知识前缀及工具输出 | `agent/src/knowledge/`、根目录 `knowledge/` |
| 学习者 | 复盘、经验更新、机制/升阶审计、策略提案与实现、纯 bug 修复 | `learner/run.ts`、`learner/lib/`、`learner/tasks/` |
| 调度与运维 | 持久队列、独立工作树租约、失败重试、完成回报、合入兜底、上线登记与外部完整检查 | `ops/codex-ops-learn.py`、`ops/learner_jobs.py`、`ops/proposal_dispatch.py`；[运维说明](codex-ops.md) |
| 评估 | 按角色、进阶、版本、实际大脑来源统计；区分首次尝试与 SL，生成费用及学习曲线 | `eval/`、`ops/paper_dataset.py`；[指标说明](eval.md) |

完整目录说明见 [layout.md](layout.md)。模块存在不代表其中所有实验接口都在生产决策路径上。

## 2. 大脑：生产固定 Codex，故障在原题等待

接口仍是 `BrainRequest → BrainEngine.decide → BrainAnswer`。生产入口 `createRouter` 强制 `engine="codex"`、清空分题引擎、关闭回退，并设 `codexOnly=true`。DeepSeek / Claude 适配器和可配置回退路由保留作历史兼容与固定数据回归；生产不能用环境变量切回这些引擎。

`BrainRouter.decideCodex` 校验结构化答案，必要时补问。额度、登录、预检、服务故障、超时、空答案或不合法答案使原题进入等待，恢复后再由 Codex 回答；没有 Jev、代码或其他模型代答的出口。程序故障保留原因并停止该决策。执行闸拒绝大脑动作也不能换一个选项代答。等待心跳、取消、预算扣除和战绩归类见 [codex-only-brain.md](codex-only-brain.md)。

| 配置 | main 代码的行为 |
|---|---|
| `BRAIN_ENGINE`、`BRAIN_ENGINE_<题型>`、`BRAIN_FALLBACK` | 历史解析仍在；生产 `createRouter` 覆盖引擎选择与回退 |
| `BRAIN_CODEX_MODEL`、`BRAIN_CODEX_EFFORT`、`BRAIN_CODEX_TIMEOUT_MS` | 仍生效；未配置时为 `gpt-6.1-sol` / `xhigh` / 600000 ms；按题型模型覆盖仍在 |
| `BRAIN_CODEX_MODE` | `exec` 每题起 CLI，`session` 使用 app-server 会话；解析默认 `exec`，实际值看 run-config |
| `BRAIN_CODEX_HOME`、`BRAIN_CODEX_BIN`、`BRAIN_CODEX_USAGE_*` | 登录目录、程序路径、额度保护和恢复预检 |
| Fast 服务档位 | 代码固定 `priority`，保留模型和推理强度；exec 与 session 都显式传入，见 [codex-fast.md](codex-fast.md) |
| `KNOWLEDGE_PREFIX` | `full` 把适用知识整份放进 system；配置解析默认 `off`，运行配置须显式设 `full` |
| `RUN_PLAN`、`FIGHT_PLAN` | 决定相应计划模块是否启用；解析默认 `off`，不能凭模块存在推断已启用 |

Codex 大脑关闭工具和项目文档，工作目录使用临时目录；它看到的是代码构造的 system、memory、题面和答案 schema。`brain/tools/` 的 stdio MCP 知识查询可供离线学习者、回放使用，当前生产大脑没有直接通过 `game_act` 操作游戏的行动模式。

保留的 `deepseek`、`ds_*`、`BUILD_DECIDER=deepseek` 名称有兼容用途，不能据此判断某局实际由 DeepSeek 回答。实际成功引擎依据 `brain.jsonl`。

## 3. 知识、事实与日志

角色由 `CHARACTER` / 启动时的 `setKnowledgeCharacter` 决定，缺省才是 `ironclad`。`agent/src/knowledge/files.ts` 统一解析路径：

- `knowledge/common/`：观察所得的共用事实，当前共用文件为 `monster-db.json`、`move-model.json`、`event-pages.json`、`card-upgrades.json`。
- `knowledge/characters/<角色>/`：该角色的经验、提示、怪物战绩、房间代价、构筑结果、药水换算、信度与 SL 数据。怪物战绩在 `monster-records.json`，读取时与共用怪物事实合并。
- 缺少角色文件表示尚无这份知识，不回退到另一个角色的数据。新游戏知识只能由学习者从本角色对局证据得出。

全量前缀由 `brain/knowledge.ts` 和 `knowledge/render/` 渲染，随进阶、文件变化缓存；牌/遗物/事件选项的结果统计放在题目事实中。构筑题不把代码启发式分数当成大脑建议，路线由大脑在完整地图上规划，代码检查连接、节点及所选路线的投影。字段及历史改造见 [v4-build-facts.md](v4-build-facts.md)。

知识加载失败或上下文超长时，当前实现记录原因，用较短的兼容提示再问 Codex；这不能记为读入了全量知识，也不会换引擎。证明某条经验被读入或采用，需要核实际知识版本、题目与调用记录。

`knowledge/builders/refresh.sh` 是战后刷新入口：先刷新共用事实，再按角色刷新统计和药水表；耗时的 fight-value 构建可单独运行。`logs/*.jsonl` 是原始记录，`data/logdb/` 的 Parquet / DuckDB 视图可增量重建，见 [logdb.md](logdb.md)。

| 记录 | 用途 |
|---|---|
| `logs/decisions.jsonl`、`states.jsonl`、`runs.jsonl` | 实际动作、观测状态、整局结果 |
| `logs/brain.jsonl`、`codex-calls.jsonl` | 大脑题号、题面、答案、校验、引擎/模型/用量；system 保存摘要，不能据此声称存有逐题 system 全文 |
| `logs/jev-prompts.jsonl` | Jev 请求原文 |
| `logs/run-config.jsonl` | 启动提交、角色/进阶、实际大脑配置、知识前缀摘要与告警 |
| `logs/brain-wait.json`、`brain-wait.jsonl` | 当前等待标记与等待/恢复/故障历史 |
| `learner/runs/`、`ops/codex-ops/` | 学习任务、派发状态、原始事件和回执；关键材料另归档进 paper |

所有记录禁止包含密钥。缺失的帧、反事实和未保存的输入必须标未知。

## 4. 离线学习与评估

任务说明在 `learner/tasks/*.md`，启动器在 `learner/run.ts`。启动器支持 codex / claude 两种适配；现行生产学习者使用 Codex，默认 `gpt-6.1-sol` / `xhigh`，Fast 启用。Claude 只观察和与 Roy 对话，不修改或审核。用法见 [learner/README.md](../learner/README.md)。

闭环为：对局证据 → 复盘 → 经验/知识或代码提案 → Codex 学习者实现与自测 → 自行合入 live → 运维核实际合入、登记与外部检查 → 评估。没有独立人工审核闸；未授权的架构调整仍交 Roy。Roy 2026-10-07 已允许学习者在理由与本角色证据充分时修改其原定的出牌、药水、必死/SL、终局价值规则，必须同时保存代码提案、账本链和上线后的双收件箱通知。

学习账本只经 `learner/ledger.py` 追加；代码提案只经 `learner/code_proposals.py` 登记。调度器保存未完成项、派发与实现链接；waiting / 失败保留历史与重试条件。提案结果、自测通过、实际合入、外部检查通过、模型自然采用和收益改善分别核实，见 [learning-code-proposals.md](learning-code-proposals.md)。

机械调度按角色批复盘，经验有待并条目即可派更新；策略提案目前允许两路独立消费者（`STRATEGY_WORKERS=2`），每路持独立工作树租约。升阶结构审计、boss 校准及 Roy 指定专题有持久请求；调度器管理租约/去重，不替学习者补游戏知识。合入、共享状态和完整检查仍串行。

评估按 `eval/versions.json` 的提交祖先及实际配置分组；默认爬塔、指标与学习曲线使用可追溯的纯 Codex 成功脑局，其他来源单列，首次尝试与 SL 分开。评估用于观察结果，不能把相关性当作规则的因果效果，不能把旧角色验证当成新角色验证。

## 5. 分支、工作树与上线

- `main`：代码与文档的集成检出；开发使用 `.worktrees/<功能>` 的独立分支，一个工作树同时只由一个 agent 修改。
- `live` / `.worktrees/live`：对局运行分支；运维循环从这里启动控制器。主检出的运维脚本和 live 源码须分别核版本，运行中的进程不会因 Git 合入自动热更新。
- 合入前核 live 未提交的知识刷新，保留并行记录；按任务的 live 合入流程持 `ops/live-merge.lock`，不能覆盖最新数据。
- 改变对局行为的上线登记 decision-log 和唯一版本，并通知运维；规则变更还需 `notes/for-roy.md`、`ops/inbox-dev.md` 双通知。纯文档同步不新增游戏版本。

## 6. 验证与边界

改代码的自测在 `agent/` 执行 `npx tsc -p tsconfig.json --noEmit` 与 `npx vitest run`；Codex 沙箱用 `bash tools/test-sandbox.sh`，固定排除原因在脚本里。实际合入后调度器在沙箱外补完整检查，失败由运维决定回滚或修复。`tsconfig.test.json` 的历史测试类型错误不代替生产类型检查结果。只改文档、记录或数据不用跑代码全套测试。

开发会话不运行 play、不改运维 prompt、不读游戏二进制；不安装依赖，提交前扫描密钥；Git 使用全局身份，推送只经 Windows `ssh.exe`。其余边界见 [AGENTS.md](../AGENTS.md)。
