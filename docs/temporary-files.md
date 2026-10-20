# 测试与离线工具的临时文件

完整 vitest、沙箱检查及学习者宿主检查默认把临时文件放在主检出的 `.cache/t/s-*`，不使用共享 `/tmp`。直接从 `agent/` 执行 `npx vitest run` 也应用这一默认值。公共 Git 目录用于定位主检出，使工作树较深时的 Unix socket 路径仍保持较短。

每次运行创建独立目录和随机归属标记。正常完成（包括测试失败）后删除本次目录及其 sidecar；各测试也负责在 `afterEach`、`afterAll` 或 `finally` 中删除自己创建的目录。通过统一入口执行的进程被信号中断时保留临时现场，不自动清理仍可能有后代进程使用的目录。

显式设置 `TMPDIR` 时沿用调用者目录，入口不会删除该目录。需要保留诊断现场时可在主盘指定一个独立的短路径，由原 owner 核实无使用者后回收。不要指向共享目录或修改全局环境配置。

离线烟测与批量模拟从 `agent/` 使用统一入口，例如：

```bash
nice -n 19 npm run offline -- node --import tsx tools/rollout-backtest.ts extract --logs /path/to/frozen-logs --rows /path/to/frozen-rows.jsonl --work ../.artifacts/backtest-new
nice -n 19 npm run v6:replay -- --evidence /path/to/frozen-evidence --out ../.artifacts/replay-new --workers 1
nice -n 19 npm run v6:profile -- --evidence /path/to/frozen-evidence --out ../.artifacts/profile-new
```

`offline` 后可以接现有的离线命令。原工具参数、模型授权和并发边界仍适用；这不是运行对局或发起模型请求的授权。直接运行其他临时脚本时也应使用该入口。显式输出文件和回放产物须放在临时目录之外；`rollout-backtest` 的默认工作目录为项目内 `.artifacts/rollout-backtest`，供后续核验保留。

学习者宿主检查使用调度器所在仓库的包装器绝对路径，待检查的 live 工作树仍作为原命令工作目录。旧 live 尚无这个包装器时也能应用主盘临时目录；不会从新树加载待检查的源码或知识。

运维容量准入同时测量主盘和共享 `/tmp`。`/tmp` 可用空间须严格大于 1 GiB，且可用 inode 须严格大于 16,384；测量失败保留未知并暂停新准入。低容量会阻止新学习作业、通道及下一局，容量 tick 首次发现状态变化时写入 `ops/inbox-dev.md` 并排队通知原 ops，不热停正在运行的对局。测量原件在原容量状态和追加日志中。

旧残留只按已授权截止时间、项目归属和实际使用情况逐项清理。不得删除 `tsx-1000`、在用目录或无法证明归属的目录；本入口不提供全局 `/tmp` 清理。2026-10-20 的旧项目清理回执见 [原 ops 记录](../paper/materials/20261020-temp-cleanup-1430-ops/receipt.json)。
