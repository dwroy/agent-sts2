# Codex-only 独立功能派发交接

2026-10-07 09:10，Roy 09:00 manual，功能已明确授权，专用任务模板 learner/tasks/codex-only-brain.md，任务摘要 notes/codex-only-brain-task-20261007.md。

- 大脑不可用等待恢复、禁非Codex代答、DeepSeek／混合局独立统计与默认排除、保留复盘证据／成本。独占.worktrees/codex-only-brain，branch feature-codex-only-brain，已从main 3e0711d18d2557dee14c2d31c94c2cfc1e8f8b74准备干净工作树；与075131 boss校准、081301普通修复隔离。
- 为现有fix-batch broker通道扩展第二个明确授权模板/固定请求文件；无新broker动作、不改运行中调度配置或运维prompt。手动优先本请求，普通tick不派专用任务；占用/脏树/请求去重/一小时退避/三次上限保持。Codex、boss和普通修复合live仍串行持锁。
- 派发源码8e6de9c149fb1f4a2442a1522c76a677bd920ad9，机械main集成3e0711d18d2557dee14c2d31c94c2cfc1e8f8b74，仅5项任务/派发/测试/文档；源码及集成对应文件完全一致，其他agent/learner/eval源码等价。14项固定派发验证与bash语法通过；源沙箱tsc0，216文件2308例通过；原日志与指纹归档同名目录。无对局行为上线，不加eval版本/不冒标shipped，本轮不改live。
- 请求notes/codex-only-brain-dispatch.json pending，调用现有fix-batch后核实实际批号/模板/工作树再追加派发完成记录，不能把仅写请求当已派发。保持此前受阻/失败历史和外部知识刷新。
