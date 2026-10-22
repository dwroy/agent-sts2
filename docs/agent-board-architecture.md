# 多 agent 协作架构（通用）

Roy 2026-10-21 批准。适用于所有项目：agent-sts2 先试点，之后接入 agent-hearthstone 等。通用部分会抽到独立仓库 `dwroy/agent-board-kit`，本文是设计正本，抽出后两边保持一致。具体规则（标签、评论前缀、生命周期）见 [GitHub Issues 协作流程](github-issues-workflow.md)。

## 1. 三层

| 层 | 内容 | 通用 / 项目专属 |
|---|---|---|
| 看板 | 每个项目仓库的 GitHub Issues，唯一任务来源；标签、模板、评论规则统一 | 通用规范 |
| 派单器 | 不调用模型的确定性程序，定时轮询所有登记项目的看板：按标签开会话、发一行提醒、回收、限流；每台机器一份，读各项目 `.agents/board.yaml` | 通用工具（agent-board-kit） |
| 角色与会话 | herdr 托管的 Claude / Codex 会话，按配置启动、按规则回收 | 角色定义通用，实例按项目配置 |

## 2. 角色

| 角色 | 由谁担任 | 职责 | 不做 |
|---|---|---|---|
| Roy | 本人 | 定方向、优先级，拍板（issue 评论或对 Claude 说） | — |
| 主管 | Claude | 与 Roy 讨论；把意图写成 issue（目标、验收），排优先级；设计层验收与关闭；转达 Roy 的决定；写计划与文档 | 写代码；大量代码核验 |
| 集成员（原 watcher） | Codex，每项目一个 | 技术核验（读改动、跑测试、核证据），合入 main，协调完整检查窗口，处理分支冲突，把发现的问题开成 issue | 当消息中转站；派活；碰生产 |
| 开发者 | Codex，一个 issue 一个新会话 | 按 issue 实现、自测、交付到 `status:review` | 合入 main；上线 |
| 运营（ops） | Codex，仅有生产运行的项目 | 运行闭环：开局边界上线、健康检查、回退；按学习协议派学习者 | 研发派活 |
| 学习者 | Codex 批次，项目专属 | 从运行证据学习领域知识 | — |
| 派单器 | 代码 | 机械派活、提醒、回收、限流 | 做判断 |

集成员与长期会话每天换一次新会话，靠交接文件和 issue 衔接；只在派单器提醒有交付待核时动手，不接收转发的回执。

## 3. 研发派活流程

1. 主管（或 Roy）开 issue，写目标与验收，标优先级与 `status:ready`。
2. 派单器按优先级与并发上限开开发会话（独立工作树 + herdr tab），评论 `[board] 已派…`，登记。
3. 开发者交付，改 `status:review`；派单器提醒集成员。
4. 集成员核验、合入 main；需要上线的改 `status:waiting-release`，派单器提醒运营在开局边界发布。
5. 主管验收，关闭 issue。
6. 派单器按生命周期前提回收会话与工作树。

## 4. 派单器规则

| 看板信号 | 动作 |
|---|---|
| `owner:dev` + `status:ready`，未被阻塞 | 按优先级开会话；同时最多 N 个（项目配置，默认 4）；生产在跑时遵守资源门（进程数、nice） |
| 变为 `status:review` | 一行提醒集成员 |
| Roy 新评论（作者 dwroy、无角色前缀） | 一行提醒该 issue 负责人与主管 |
| `owner:learner` + `status:ready` | 一行提醒运营按学习协议派发 |
| `status:waiting-release` | 一行提醒运营 |
| issue 关闭 | 按前提回收会话与工作树 |

幂等：登记表记录每个 issue 已做过的派发与提醒，同一事件只处理一次；出错写 inbox，不做破坏性动作。主管若不在 herdr 中（例如 Claude rc），派单器把提醒写进看板汇总，由主管在与 Roy 对话或检查点时读取。

## 5. 项目配置 `.agents/board.yaml`（草案）

```yaml
repo: dwroy/agent-sts2
machine: xdwin                 # herdr --machine，可省略为本机
herdr_workspace: agent-sts2
worktree:
  root: .worktrees
  allocate: python3 ops/worktree_checkout.py {root} {path} {ref}
  prepare: ["ln -s ../../../agent/node_modules {path}/agent/node_modules"]
  retire: python3 ops/worktree_retention.py complete --workspace {path}
roles:
  dev:        {kind: codex, codex_home: ~/.codex1, model: gpt-6.1-sol, effort: high, max_parallel: 4}
  integrator: {pane: wJ:p1HD}
  ops:        {pane: w1H:p8}
  lead:       {kind: claude, notify: board-digest}
resource_gate: {when: "game running", max_procs_per_task: 4, nice: 19}
never_reclaim: [".worktrees/live", "panes: integrator, ops, learner-*"]
verify: ["npx tsc -p tsconfig.json --noEmit", "npx vitest run"]
```

## 6. 落地顺序

1. agent-sts2：派发/回收工具（#17）按本文做成配置驱动；派单器（#20）接入 ops 调度。
2. watcher 改为集成员：更新角色说明与开场提示。
3. 抽出 `dwroy/agent-board-kit`（私有），各机器安装；agent-sts2 只留 `.agents/board.yaml`。
4. 接入 agent-hearthstone，之后的新项目照此接入。

## 7. 集成员开场提示（每天换新会话时使用）

> 你是本项目的集成员。先读 AGENTS.md、`docs/agent-board-architecture.md`、`docs/github-issues-workflow.md` 与上一份交接文件（如有），再 `gh issue list --label status:review` 看待核验的交付。只在收到一行提醒或有 `status:review` 时动手：核验改动、测试与证据，合入 main，协调完整检查窗口，需要上线的改 `status:waiting-release` 交运营；发现的问题开成 issue。结论写在对应 issue 评论（首行 `[watcher]`，发前 gitleaks），不读整份回执原文进上下文，不派活、不碰生产。下班前写交接文件（只写未完成项与位置），交给下一会话。


## 8. 资源与冲突（Roy 2026-10-22，#20 补充 3）

完整流程见 [Issues 协作流程的资源与冲突](github-issues-workflow.md#资源与冲突20-补充-3roy-2026-10-22)。该整套流程取代当天早先仅发窗口提醒的方案；默认关闭，由 ops 安装后在自然边界启用，启用前各角色照旧。

- 派单器读 area 标签，同区域已有 in-progress/review 或 ready 启动预约时等待，在汇总注明等待哪个 issue；无 area 照旧。同 tick 也预留区域，不制造并行编辑。
- 重任务共用 kernel flock 队列。对局中1位、停局2位；ops 发布 > 集成员 > 学习/实验 > 其他，同档 FIFO。只决定下一空位，不打断在跑任务；等待用 inotify/pidfd，无轮询或额外守候模型。
- 开发交付只做 tsc 与定向测试并列改动文件；集成员合入前对一批 review 做一次完整测试；ops 同受测树 SHA 复用完整结果，不同组合重跑。完整 Vitest、知识重建和批量模拟统一经重任务入口；原发布锁在资源准入之后取得。
- 集成员发现同文件交付先定顺序，后者变基再交，组合检查证明最终结果。
- 原 stall digest 列在跑、等待、等待时长与超60分钟标记。队列不依赖 tick/模型释放位置，不杀进程、不发信号；原 ops 守卫改为等位，旧失败保留。


## 9. 启动也是发布输入（Roy 2026-10-22，#20）

开发/集成结论独列“影响 live 启动：是/否”。main 改 run/autoplay、环境和读取的行为配置，只有进入受检 live 发布并由原 ops 在自然边界固定 launch 版本后才可采用。固定 bundle 来自实际 live 提交并核 SHA/模式，主目录仅保留运维状态；入口拒绝版本混用，当前 play 参数不热切。详细 pin、环境、旧会话安全重载及首局 source/run-config 读回见 [发布时固定启动入口](github-issues-workflow.md#发布时固定启动入口20roy-2026-10-22)。
