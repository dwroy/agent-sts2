# #17：issue 会话派发与回收

记录时间：2026-10-21 11:50:25 CST。基线 `42ba9497f`，独立分支 `issue-17-session-lifecycle`。

实现以 `8710b77c7` 的 `docs/github-issues-workflow.md`「生命周期」为准：保存尾日志 → 关 tab → 原 `worktree_retention.complete` 登记 → 原调度器回收 → issue 回执。本次补回该标准原文，再添加命令用法与恢复说明；没有另造删除器、daemon 或 cron。

## 交付内容

- `ops/issue_session.py`：`spawn`、显式 `register`、默认演练的 `reclaim`、自动 `tick`；登记 issue、pane、tab、terminal、工作树、分支、基线、开始时间和外部动作阶段。
- 派发沿用现有工作树分配器和依赖链接，读取既有账号选择文件；新 shell 降至 nice 19，启动独立 Codex，参数 `gpt-6.1-sol/high`，标准提示和 `[ops]` 评论。参数不代替原生档位回执，本次未启动真实新会话。
- 回收核已关闭 issue、精确终端身份、空闲状态、无草稿、进程、来源引用及学习/对局保护；关闭前再核一次。脏文件保存分离的 Git binary patch 并读回，不 reset 原文件；凭据命名路径和不安全链接保留。
- 原回收器继续核真实 main/live 发布、干净工作树、唯一产物归档和零进程。未发布代码或脏现场可能只关闭 tab，工作树继续保留，回执明确区分 `waiting-worktree` 和实际 `reclaimed`，不会声称已完整回收。
- 原调度器三个 tick 主工作之后执行检查，沿用 PAUSE、LLM_DRAIN 和 retention 关闭开关。失败入 inbox，评论按稳定标记去重；不确定的创建/启动不盲目重放，须查询实际结果后显式对齐登记。

## 标准与边界说明

issue 描述和新标准的动作顺序一致。文档明确要求由原调度器保留唯一产物，因此不放宽它已有的发布、清洁和归档门禁；“分支引用保留/脏改动已存补丁”允许安全关闭空闲 tab，不代表可以越过原门禁删工作树。唯一允许关闭前仍存活的是已核实空闲的 Codex TUI 与 shell，其他前后台任务全部阻止关闭；原工作树回收仍要求零进程。

实际 issue-6/8/12/15 仅做只读核对，候选快照见 `existing-session-candidates.json`，没有导入运行登记表，没有发消息、重启或关 tab。分配时间与实际会话开始时间分开保留，未知时间未倒填。没有运行 play，没有修改 live、STOP、共用账号配置或 ops prompt，没有合并 main/live。

## 验证与原件

- `unit-attempt-3.txt`：33 项固定数据测试通过。临时 Git 仓库及模拟 Herdr/GitHub；覆盖派发、显式恢复、原回收器真实归档/删除、重复执行、关闭前竞争、损坏登记、脏文件/二进制文件、敏感路径、进程/学习/对局门禁、评论扫描顺序，以及三个调度 tick 和暂停开关。
- `retention-regression-1.txt`：既有工作树回收器 15 项测试通过。
- `bash -n ops/codex-ops.sh` 通过；最终 `git -c core.whitespace=-blank-at-eof diff --cached --check` 保留原始 Vitest stdout 的结尾空行，其他空白检查通过。原始 stdout 未为通过检查而改写。
- `sandbox-checks-1.txt`：单 worker、nice 19 执行 `SANDBOX_WORKERS=1 bash tools/test-sandbox.sh`。tsc 通过；Vitest 583 个文件通过、3 个失败，5219 项通过、4 项失败，退出 1。不是全绿，不满足 issue 中整套 Vitest 通过的验收项。
- `baseline-v6-recheck-1.txt`：只复跑失败的三个文件，2.16 秒内稳定复现相同 4 个失败，另 6 项通过。源码完整保持基线，未扩大 #17 去改游戏算法或放宽断言。
- 全套脚本因上述失败未进入末尾的 paths 单 fork 阶段，另按原参数补跑：11 项通过，原件 `paths-recheck-1.txt`。

源码基线核对：`git diff --exit-code 42ba9497f -- agent` 无差异，`42ba9497f:agent` 与本分支 `HEAD:agent` 同为 `96d5b216ff8cd1214086fa74ff2c8d6152bae1cc`。本次没有改动游戏实现、游戏测试或既有测试排除名单。

基线失败明细：

| 文件 / 行 | 不一致 |
| --- | --- |
| `v6-direction-provider.test.ts:139` | 断言缺少 W0 时 `win/expected_win` 为 null，实际为 0.5 |
| `v6-projection-entries.test.ts:23` | 断言 `general_win.n` 为 20，实际 undefined |
| `v6-target-values.test.ts:18` | 断言 coverage reason 为 null，实际 `insufficient_known_options` |
| `v6-target-values.test.ts:58` | 同上，combat deadline 情形 |

交付供 review，但不声称整套验证已通过；需整合者处理或明确接受这项已有基线阻塞后再完成最终验收。

最初 `unit-attempt-1.txt` 保留测试辅助方法误用 unittest 的 `run` 名称所致的夹具错误；已改名，`unit-attempt-2.txt` 的原 24 项通过，随后扩充至最终 33 项。失败原件未覆盖。

真实 Herdr 只读验证了 CLI 数据形状与既有会话身份；真实 spawn、关 tab 与生产工作树回收没有执行，合入后由 ops 对专用已关闭任务验收。不把固定数据验证计为生产回收完成。
