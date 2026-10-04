# agent-sts2

让一套 agent 架构自动游玩《杀戮尖塔 2》（Slay the Spire 2），并且**靠自己的对局经验变强**：打、复盘、学习、改进、再打。这里同时是研究档案：每一局的日志、每一次改动的来由、每一批的评估都留在仓库里，供论文使用。

- 第一阶段：铁甲战士，A0 到 A7 每级都赢过（每赢一局升一级），A8 打了 232 局赢 13 局，A9 打了 103 局赢 3 局，A9 的三场胜利都是存档读档（SL）之后赢的。截至 2026-10-04 共 480 局。
- 第二阶段（2026-10-04 起）：静默猎手从 A0 开始，赢一局升一级。这个角色的游戏知识只能由 agent 自己从对局里学，人不提供。规则见 [docs/learning-protocol.md](docs/learning-protocol.md)。

当前状态以最新的 `paper/materials/STATE-*.md` 为准，每一次决定都记在 [paper/materials/decision-log.md](paper/materials/decision-log.md)。

## 系统怎么工作

游戏跑在 Windows 上，装了 [STS2-Agent](https://steamcommunity.com/sharedfiles/filedetails/?id=3796486050) mod，它在 `127.0.0.1:8080` 上提供本地 HTTP 接口。控制器跑在 WSL 里，通过这个接口读取状态、下达动作，不看画面。

```
           对局中（在线）                                  对局外（离线）
 ┌──────────────────────────────────────┐        ┌───────────────────────────────┐
 │ 眼 eye     结构化状态，所有输入落盘     │  日志   │ 学习者 learner（claude / codex） │
 │ 手 hand    执行闸：合法性、状态指纹     │ ─────▶ │   复盘 → 经验库、知识数据        │
 │ 小脑 reflex 战斗：代码推演 + Jev 挑选   │        │   → 修复提案（带证据局号）       │
 │ 大脑 brain  路线、构筑、事件、整局计划   │ ◀───── │ 评估 evaluator：按版本对比指标   │
 │ 模拟器 sim  boss 整场、路线血量、时钟    │  知识   │ 开发会话：审核、实现、上线、     │
 │ 工作记忆 memory   本局计划和承诺        │        │   和 Dai 调架构                 │
 │ SL         必死时读档重打、换线         │        └───────────────────────────────┘
 │ 知识库 knowledge  按角色分开的数据       │
 └──────────────────────────────────────┘
```

- **Jev**（TypeSafe System One）：在接近的选项之间快速挑选，单次 70 到 500 ms。
- **大脑**：可以切换引擎，现在是 Codex（GPT），DeepSeek 作为回退。知识整份放进系统提示。
- **SL**：只在真正必死时读档。统计时第一次尝试和 SL 之后的结果分开记。

架构的完整说明见 [docs/v4-architecture.md](docs/v4-architecture.md)，目录怎么分见 [docs/layout.md](docs/layout.md)。

## 目录

| 目录 | 内容 |
|---|---|
| `agent/` | TypeScript 包，也就是控制器。`src/` 按模块分为 hand、eye、reflex、brain、sim、memory、sl、knowledge、core |
| `knowledge/` | 知识数据。`common/` 放和角色无关的游戏事实，`characters/<角色>/` 放各角色的打法结果和经验，`builders/` 放从日志重建这些数据的脚本 |
| `learner/` | 离线学习者：启动器加上与引擎无关的任务说明（`tasks/*.md`） |
| `eval/` | 版本表 `versions.json` 和指标脚本 |
| `ops/` | 运维：一局接一局的循环、卡死检查、报告、运维会话的 prompt |
| `notes/` | 复盘（`lessons.md`）、各批窗口报告、修复队列 |
| `paper/` | 论文材料：状态快照、决策日志、数据集、讨论记录 |
| `docs/` | 设计文档 |
| `experiments/` | 一次性实验，保持当时的样子 |
| `third_party/jev-sts2/` | 上游 [DiscreteTom/jev-sts2](https://github.com/DiscreteTom/jev-sts2)，作为 submodule 原样保留，只作参照，不改 |
| `logs/`、`data/` | 原始日志和可以重建的数据，**不进 git** |

## 运行

需要 Node ≥ 20（本机装在 `~/.local/node/bin`）和 Python 3。

```bash
export PATH=$HOME/.local/node/bin:$PATH
cd agent
npx tsc -p tsconfig.test.json && npx vitest run   # 类型检查 + 测试
npm run doctor                                    # 检查 mod、Jev、大脑引擎是否可用
npm run shadow -- --max-decisions 20              # 只决策不动手
```

对局由运维循环 `ops/autoplay.sh` 在 `.worktrees/live` 里运行，开发用的检出不跑对局。主要配置在 `agent/.env`，模板是 `agent/.env.example`，`.env` 不进 git：

- `CHARACTER`：选哪个角色。
- `TARGET_ASCENSION`：进阶，可以填固定数字，或者设成随胜利升阶。
- `BRAIN_ENGINE`：大脑用哪个引擎。
- `SL_*`：读档相关的开关。

学习者：

```bash
agent/node_modules/.bin/tsx learner/run.ts --engine claude|codex --task postmortem --set runs=A,B,C --cwd .
```

用法、权限和安全见 [learner/README.md](learner/README.md)。

## 谁在这个仓库里工作

- **Dai**：定目标和规则，参与架构调整，审批上线。
- **开发会话**（Claude 或 Codex）：实现、修复、审核学习者的产出、上线、记录。
- **运维会话**：管理对局循环、出窗口报告、驱动学习闭环。
- **学习者**：离线复盘，更新经验和知识，提出修复提案。引擎可以切换。

所有 agent 开工前先读 [AGENTS.md](AGENTS.md)，里面是规矩和边界。

## 安全

- key 不打印、不落盘，存放位置见 `.env.example`。
- 不读游戏的 `sts2.dll` 和 `.pck`。
- 杀进程一律用 PID。
- 推送只经 Windows 的 `ssh.exe`。
