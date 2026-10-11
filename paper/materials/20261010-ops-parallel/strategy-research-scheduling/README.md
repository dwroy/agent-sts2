# 已授权静默专题的调度与注册衔接

2026-10-10 补齐纯工具入口；尚未由本子 agent 实际派发、合入 main/live 或推送。
唯一请求为 `roy-20261010-silent-deck-size-value`，研究目标和冻结游戏证据均由主 ops 保存，本修复不提供游戏结论。

原缺口：`check_jobs` 自动提案优先占据可用策略槽，唯一手动专题持续 pending。新宿主在 `start_learner` 返回后才保存 learn 行，又允许 wrapper 先启动模型。独立原红见 `original-red.log`（exit 1，自动提案启动而请求仍 pending）；完成协议的独立绕过红绿见 `completion-binding-red-green.log`。

修复在已有 learn.lock 内给这一个请求优先权，仍共用两个策略槽。满槽直接只读返回，不写 null 尝试。`dispatch_write(reason=ops)` 仍调用现有 `start_learner`；hosting/herdr/tail/关闭行为、Fast native、模型与推理保持原设置。专属第七参数只允许本请求。宿主 wrapper 在原 learn.lock 上有界等待 120 秒，核对已落盘批/根请求/真实基线/冻结 SHA 后才建立工作树和启动模型；PID 在 herdr-exec 命令前落盘，等待不会挡住父进程拿回 PID。固定 dispatch_base 建树，避免 main 前移归入本研究。独立注册回执不会被模型的 out 截断。

派发后 root request 原子 pending→running 精确绑定实际 batch/worktree/pane；原文件字节按 SHA 保存。绑定/回执失败保留实际批 marker 与 pid/回执，不再自动重复；未知未保存批不能调用 finish。即使外层 learn.json 保存失败，根绑定与独立实际回执仍阻止下一次同锚点手动调用退回普通任务。完成验收对本唯一请求同时比较根请求和批独立登记的 request/base/input SHA；原提案/repair/manual 范围不扩宽。

即时入口沿原 broker：主 ops 在集成后执行 `bash ops/codex-ops-do.sh strategy-proposal <原十锚点逗号串>`。`cmd_write` 精确匹配同请求锚点时调用专属 helper，running/done/已登记请求返回未派发而不转普通 ops 批。下一次原 check_jobs/tick 也会优先派。本子 agent 没有调用这个生产入口，没有修改根请求或 learn.json。

验证仅固定 /tmp 仓库、请求、stub，不使用模型、网络、生产状态、对局或凭据。18 个 Python 专项覆盖优先权、上限、原子绑定和外层保存失败、实际 main 与 checkout HEAD 不同、等待期间 main 前移、同锚点手调去重、模型前注册门闩、白名单参数、普通链和完成独立字段。旧闭环 24、并发 6、纯报告 8、Fast 8 专项均 exit 0。最终桥接两文件两用例 exit 0。

完整固定沙箱于 14:49:35 启动，session 27452，`SANDBOX_WORKERS=2 nice -n 19 bash tools/test-sandbox.sh`，固定排除名单不变。执行源码在启动前固定。启动后仅模板两次澄清：已绑定纯研究不合后续 main；身份/SHA 改变停止专题，不退普通选题。`source-under-test.json` 与 `source-final.json` 分别给出原/最终 SHA；完整检查实际 exit 0：tsc 通过；主 Vitest 264 文件/2665 用例，paths 1 文件/11 用例，共 265 文件/2676 用例。主阶段 688.57 秒，paths 1.75 秒。完整原日志及退出码保留，不据缺少中间输出或 PID 沙箱看不到宿主进程而误判挂死。

本轮材料只在本独立目录，旧任务、报告、失败、租约和队列保持。本修复不改知识、游戏代码、对局参数、凭据、模型、运维 prompt 或 hosting。主 ops 后续串行整合、派发与回执。

源提交：`0bfd7db5b8083f35eed96acbd6a94ce1901659fd`。提交前 staged diff 的 gitleaks stdin exit 0，检查命令与源 SHA 边界见 `validation.json`。主 ops 负责集成、实际派发、herdr pane/log 核对和后续报告闭环。
