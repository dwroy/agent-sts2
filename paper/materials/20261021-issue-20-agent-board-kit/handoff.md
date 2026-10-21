# #20 通用派单器交付

基线：`6a90f0882362752efca1f9ded831ee237cf1e281`。开发分支/工作树：`issue-20-agent-board-kit`。范围为协作基础设施，不改变游戏决策、知识、版本或生产会话。

## 产物

- 私有仓库：<https://github.com/dwroy/agent-board-kit>。确定性 Python 派单器、固定测试和安装/新项目四步接入 README；发布 SHA 和核验结果在本报告末尾登记。通用程序无 STS2 import、无模型调用，所有生命周期操作复用 #17 的 CLI 合同。
- `.agents/board.yaml`：保留当前 5 个开发会话、nice 19、每任务最多 2 进程及原生命周期配置，补充 kit 安装/本机登记表/账本/摘要/暂停文件。
- `ops/agent_board.py`：读取配置，用 exec 替换当前进程运行独立 kit；传递 dry-run 和关闭回收开关。
- `ops/codex-ops.sh`：`CODEX_AGENT_BOARD=on` 时仅在现有五分钟 stall tick 调用一份 kit，其他 tick 不重复；默认 off 沿原 #17 行为。没有新增 timer/cron 或修改 ops prompt。
- `ops/issue_session.py`：修 #17 命名失败。先无任务启动，核原 pane/terminal/tab/cwd 与空闲 Codex，显式命名并读回，再单次发任务。自动命名报错但同终端已就绪时安全补命名；身份不符、命名失败或任务回执不确定则保留阶段，不盲目重启。已识别的 Herdr 错误类别及阶段可见，原始 stderr 不外发。
- 补充主管派发评论中的锁冲突要求：生命周期锁在任何会话动作前被占用时返回退出码 75、`state=retry/retryable=true`；kit 保留 pending，下一轮自动重试。只有明确未开始的锁冲突可重试，回执不确定仍沿人工核验流程。

## 规则与边界

- 按 P0–P3、issue 号与并发上限派 `owner:dev/status:ready`，blocked、needs:roy、冲突状态暂缓。未完成分配和启动回执失败均预留容量，已有手工登记不重复 spawn。
- review → 集成员；learner/ready、waiting-release → ops；首轮建立历史 Roy 评论基线，之后无前缀 `dwroy` 新评论 → 负责人和主管。外部作者、agent 前缀评论、PR 均不触发指令提醒。GitHub 逐页读取，标签 event ID 区分重新进入状态。消息仅 `#N 轮到你`。
- 忙碌或缺席的接收方留队并写 inbox；主管不在 Herdr 时读 `ops/codex-ops/board-digest.md`。摘要不包含原评论、标题、原始终端输出。
- root/repo 绑定事件账本、宿主锁与项目锁保证幂等。外部动作前写阶段；失败或中断保留 uncertain，不能称送达、不自动重发。原 pane/生命周期登记表核实后才用 kit `--resolve` 留证解锁。失败隔离到项目/事件，不强制关闭或删除。
- 只回收生命周期登记过的 closed issue，仍经过 #17 原保护门、发布门和归档读回；waiting-worktree/retained 每轮重试。`CODEX_OPS_RETENTION=off` 映射 `--no-reclaim`，`PAUSE/LLM_DRAIN` 暂停全部动作。
- dry-run 不创建锁、账本、汇总、inbox、评论、工作树或会话。测试只使用固定临时仓库与假外部接口。

## 运维启用步骤（交集成员核验后）

1. 将本分支接入代码合 main，核独立 kit 提交。按 kit README 在主运行根忽略目录安装私有仓库，仓库级 `core.sshCommand` 使用 Windows ssh.exe，不设置 user.*。
2. 在 `.agents/board.yaml` 指定的本机登记表放全部同机项目的实际主运行根。逐个核已有 issue 会话登记、角色 pane 和当前容量；不自动认领其他 tab。
3. 从主运行根运行 `nice -n 19 python3 ops/agent_board.py --root "$PWD" --dry-run`，核计划与摘要目的地。对新项目按配置、标签、AGENTS.md 规则、登记四步接入。
4. 原 ops 在其调度器环境设 `CODEX_AGENT_BOARD=on`，只保留这一个宿主入口，核实际首 tick、摘要及事件账本。回退为 off 即恢复原 #17 调度；保留 kit 与事件账本，不清除 uncertain 记录。

本开发会话未在主运行根安装或启用派单器，未改 main/live/STOP，未关闭、重命名或给其他会话发消息。上线启用与首 tick 读回交原角色执行，不把代码测试当实际生产派发/回收。

## 验证记录

本地日志保留在本目录（忽略的 `.log`），命令结果、被测源码 blob 与日志 SHA256 见 `verification.json`，历史失败见 `check-history.json`。首次生命周期测试的一条旧断言仍假定任务作为 `agent start` 的参数，失败后改为核 `agent prompt`，随后通过；原失败不当作实现通过。首次完整 Vitest 包装器多占进程，已仅按本会话已核 PID 中断并保留 `vitest-interrupted.log`，改为直接单 worker 入口，其他会话未触碰。`paths.test.ts` 按项目现有说明单独用 fork（Node 不允许线程内 chdir），其余全部文件用单线程 worker，合计为完整集合。

- 私有 kit 最终提交及 `gh api repos/dwroy/agent-board-kit/commits/main` 远端读回均为 `d15456158f0d7d4ad3b48537b034013fa20cb9f1`（初版 `4c1cb8afed418e8c3cc176366a16c9059c174f9e`，随后补 Roy 评论先提醒再回收、精确识别角色前缀、锁忙安全重试）；Git 推送只经该仓库配置的 Windows ssh.exe。四次提交前 gitleaks 均无泄漏。
- kit 固定测试：`nice -n 19 python3 -m unittest discover -s ops/codex-ops/agent-board-kit -p 'test_*.py'`，最终 26 项通过。
- STS2 生命周期/调度入口测试：`nice -n 19 python3 -m unittest discover -s ops/tests -p test_issue_session.py`，最终 52 项通过。
- 生产类型检查：在 agent/ 加 Node PATH 后 `npx tsc -p tsconfig.json --noEmit`，退出 0。
- 最终源码后直接调用同一个本地 TypeScript CLI 再核类型，退出 0；shell 语法检查退出 0。
- 完整 Vitest 集合：646 文件、6084 通过、2 原有跳过。首轮（除 paths）645 文件中 644 文件/6072 项通过、1 项 import 检查失败，原因是稀疏 checkout 未展开 #29 已跟踪的 `paper/materials/issue29-brain-speed/results.jsonl`。从基线精确读回 blob `b84d95c5185941eec143cbcf2966d5770309cca5`，211076 字节/SHA256 核同（`material-readback.json`），未改数据或源码；随后单 fork 重跑 `check-imports.test.ts` 和 `paths.test.ts`，2 文件/12 项通过。这是全量首跑与受影响定向复测的完整集合结果，不把首轮退出 1 改成全绿，不扩大重跑。
- 真实只读演练：初版 4c1cb8a，仅从开发 checkout 调 `ops/agent_board.py --dry-run`，6 个 waiting-release 提醒因运营接收方缺席或忙碌排队，#32 ready 遇并发上限；退出 1 原样保留，不能当送达/生产验收。`real-dry-run.json`、`dry-run-readback.json` 核无新增运行账本、锁、汇总或 session 登记；tracked inbox 也无改动。
- 本地 kit clone 保留在本树忽略目录 `ops/codex-ops/agent-board-kit`；它的源和提交已完整推送私有远端。开发未删除自身工作树，后续回收沿原门禁核这份可重建副本。
