# #36 Boss-home 固定夹具补交

依据集成员 [6345453137](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6345453137) 及主管后续裁决，只修测试夹具。基于原 R3 开发分支 `386c8b224`，供集成员将测试补丁合入实际 R414 组合；不重放分支上的其他功能。

测试改动仅两文件：

- `ops/tests/test_boss_sim_home.py`：交互路径 mock `open-pane` 返回 `w1:p2`，mock `Popen` 返回 supervisor PID 34567，核对完整启动环境、独立进程和 pidfile。项目选择 home 与显式 `LEARNER_CODEX_HOME` 都沿实际 dispatch 到 supervisor 核验；继承的全局 home 保留。新增显式 `LEARNER_CMD` 的旧命令路径案例，仍 mock `run` 返回 pane/PID，断言 home 的 `--env` 传递、close-on-exit 和不启动 supervisor。原选择器拒绝、替代 state-dir 和默认 home 规则测试保留。
- `agent/tests/boss-sim-home.test.ts`：Python 包装入口预期数量由 5 改为 6。

所有 R3 运行代码与原提交相同。只使用固定回执和 mock subprocess，不启动 pane、模型、学习者或游戏。原夹具在外层 mock Popen 防止真实 fallback 的前提下复现 1 败/4 过；修后 Python 6 过、Vitest 包装入口 1 文件/1 过、相关 TUI 生命周期 Python 18 过，生产 tsc 0。包装入口包含同一 6 项，不重复计数。全部 nice 19；Vitest 单线程 worker，检查串行。首次 Vitest 命令因本机版本不支持 minWorkers 参数而在收集前退出，去掉该参数后通过，原日志与 SHA 均保留，见 `checks.json`。

未跑 full；交回集成员与 #44 的 `110cbd8e` 修复组合，沿实际 live R414 基线做下一唯一完整检查。本补交不声称 R414 组合 full、main/live 发布或自然 TUI/直播验收已通过。未改 live/STOP/hosting/账号/共享配置或关闭其他会话。
