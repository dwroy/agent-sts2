# 普通学习计算槽与待审任务（#77）

主管裁决见 [#77/6410992461](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6410992461)。Silent 外部四道模式仍只留一个普通自有计算槽，复盘优先。`awaiting_review` 保留任务、输入去重、失败、rc、报告缺口和原责任；它本身不构成计算占用。其他角色、无外部需求时的原普通流水线、外部道位退休证明和学习/入库/回收门不变。

`ops/own_learning_slot.py` 从原 `learn.json`、deferral、TUI 和 native 读取占用投影，不写这些文件、不 finish、不封存、不发按键或模型。`external_learning_policy.own_busy` 共用此投影，原自动复盘、普通 writer、升阶审计及手工普通复盘在原四道准入范围内使用它。原升阶审计文件锁继续独立持有普通槽。

仅对 `awaiting_review` 尝试释放计算槽，顺序如下：

1. 原 deferral 的批次、注册字段、supervisor PID/birth 与当前行一致；监督进程已退出。数字 PID 存在但 birth 不符时保留为复用/未知，不能冒原进程仍在计算，也不能据此关进程。
2. 原 TUI 的 label（复盘带 `-postmortem`）、pane、cwd、native PID/birth 与注册一致；native 已退出。活 native 即使 UI 空闲也继续占槽，pFX 仍归 #65。
3. 沿原 `native_evidence` 账号/日志映射和 `reconstruct_native` 核实原提示绑定及完整末回合，接受已绑定的 `task_complete` 或 `turn_aborted`。重建仅在内存，不以原生成功代正式报告或任务成功，不因已核 abort 永久占计算槽，不覆盖 rc75/TUI/失败。
4. 原 pane 尚在时核精确身份、空 shell 输入、前后台进程及活动 revision；原 pane 缺席时核原 workspace/pane/tab/terminal 确已缺席。独立工作树再核宿主 cwd/argv，无命令、模型、测试或写进程。宿主视图、输入、进程身份或证据未知均继续持有。
5. 重核原件哈希、PID 和 pane 活动。所有门通过才返回 `occupies=false`，原批次仍是 `awaiting_review`。原同题/同输入去重、重试、工作树和发布门继续执行。

共享根目录下的 detached 工作无法据 cwd 归属到某个旧批时，返回 `shared_workspace_activity_unscoped`，交原 owner 沿原批补齐收尾，不能忽略其他在途任务来放行。旧终态行只有数字 PID、缺原 birth 且该 PID 当前存在时，返回 `supervisor_identity_unverified`；不把复用后的进程当原 supervisor，也不自行清旧行。缺报告留在待审列表，不单独成为计算槽持有理由。

`tick`、`write` 和 `status` 输出 `own_learning`（status 文本行为 `own learning admission`）：`busy`、`blockers`、`pending_review`。每批列 batch/task/state/pane、原 PID/birth、当前 observed_birth、原因和已核证据 SHA；待审列表包含已释放计算槽的批次。四道可继续独立派发；这个诊断字段不作为“有业务新派发”阻止 backfill。没有增加槽、进程、调度器、账号或权限。

只读投影也可单独运行，不调用生产 tick：

```bash
nice -n 19 python3 ops/own_learning_slot.py --directory <原实例ops/codex-ops目录>
```

独立 CLI 带原 learn.json SHA，读前后变化则报告 `registration_changed_during_projection` 并保留占用。它不安装代码或证明自然准入已恢复。实际发布由原集成/ops 沿唯一组合检查和自然入口接续；部署须包含新模块及四个调用叶。回退仅反向本项五个生产源码叶的差量，保留原批次、任务和所有新旧证据；不清 pending 或改生产历史。
