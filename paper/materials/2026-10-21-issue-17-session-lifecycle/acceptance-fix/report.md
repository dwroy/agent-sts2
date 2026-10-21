# #17 register 修复与真实回收验收

按 #17 最新 [Claude] 反馈，用原参数实际登记并回收 #19、#12。两项登记成功、演练通过，实际保存尾日志并关闭对应 tab；工作树由原回收门禁保留，登记状态为 `waiting-worktree`。这符合该反馈明确的 #23 前验收边界，不表示工作树已删除。

## 原因与修复

原参数正确。`Sessions.register → save → validate → Project.checked_tree` 错把工作树删除准入用于会话登记；开发树继承的已跟踪 `ops/instance-binding.json` 触发 `persistent game instance retained`，外层又丢弃具体异常。现在将会话身份核验与删除准入分开：只有分配基线、HEAD、工作副本逐字节相同的继承元数据可通过关闭 tab 的检查，新增或改写仍保留现场；真正删除前仍执行原 `worktree_retention.checked_tree`。未修改原回收器。

CLI 失败回执带操作、阶段和具体原因，register 相同原因写入 inbox；不打印子命令输出、参数或系统错误中的私人文件路径。固定测试验证失败不改登记表，以及 inbox 和 stdout 原因一致。

真实演练另暴露两项宿主差异，原失败回执均保留：普通用户不能读取少量同用户 systemd/SSH 服务的 cwd；空闲 Codex 还有从工作线程启动的内置 code-mode host。现通过配置的只读 cwd 探针核同 PID namespace、开始时间及绝对路径；当前 WSL 调用只读 root helper，不改变文件、权限或进程。内置 helper 只有属于已核空闲终端、实际可执行文件与 Codex 同目录、argv 完全吻合且所有线程均无任务子进程时才可豁免；其他任务仍阻止关闭。

## 实际结果

| issue | 原 pane / tab | register / 演练 | apply 后 | 尾日志 SHA256 |
| --- | --- | --- | --- | --- |
| #19 | `wJ:p1H7` / `wJ:t1H5` | registered / eligible | tab、pane 不存在；树保留 | `bfadb098f6f441c8799596b89ef5b4e9dda54747ac9eef725d06ef867829fa82` |
| #12 | `wJ:p1H3` / `wJ:t1H1` | registered / eligible | tab、pane 不存在；树保留 | `eb17c9030dbcae4a7b5d2ca56aa82dfb64d9c395b7c57275b7419dc27f8f683a` |

`register-*.json`、`dry-run-*-attempt-4.json`、`apply-*.json` 为实际回执。apply 返回 `retained / persistent game instance retained` 指工作树保留；登记表独立读回为 `waiting-worktree`。`independent-readback.json` 还核到尾日志内容哈希与文件名一致、两树零工作目录引用进程，来源提交分别仍为 `42620f6531b8fa9dea1f93acdc7af7adeae7fe2b`、`de4d7d15fb920b3d890d8492972d4ecc746bd5d7`。原始尾日志只在本地忽略目录，不公开其内容。

`repeat-*.json` 重复 apply 仍为同一保留结果，`notice-readback.json` 核两项各只有一条自动回收通知。#6、#8、#15、#17、watcher 和 ops 的 pane 身份与操作前一致。

验收使用当前分支脚本和主检出作为运行根目录，显式指定忽略目录中的临时 board；其中仅将适配器、只读探针指向当前分支，评论前缀设为 `[dev #17]`。主检出跟踪文件未因此改动。正式配置随本补丁交集成员合入；不能把分支验收当作 main 现有调度器已经更新。实际 apply 时的四个脚本哈希见 `tested-code-sha256.json`；随后仅细化 register/探针失败原因，最终文件哈希见 `final-code-sha256.json`，最终生命周期测试另存 `unit-attempt-7.txt`。

## 检查与范围

- 生命周期固定测试 46 项通过（`unit-attempt-7.txt`）；原回收器回归 15 项通过（`retention-regression.txt`）。失败尝试原件与全部后续回执分开保留。
- 本分支合入 main 快照 `2b7ecc6ea`，包含 #19 基线修复，以免把旧四项断言失败再次当作本次修复结果。按仓库规定执行 `SANDBOX_WORKERS=1 nice -n 19 bash agent/tools/test-sandbox.sh`：tsc 通过，589 文件 / 5237 项通过，另 paths 独立 fork 的 1 文件 / 11 项通过，合计 590 文件 / 5248 项、0 失败；固定排除名单未变。原件为 `sandbox-checks.txt`。沙箱外全量仍由原调度器/集成员核验，不将本次沙箱检查冒充全量。
- 本次任务一律 nice 19，测试单 worker；未运行 play，未改 live/STOP、账号、共享配置、运维 prompt 或游戏知识。
- 尚待 #23 修正工作树实例判定；本补丁未绕过原工作树删除、发布或归档门禁。
