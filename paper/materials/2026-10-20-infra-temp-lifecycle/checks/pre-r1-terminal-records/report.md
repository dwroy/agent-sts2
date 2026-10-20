# 临时文件生命周期与容量准入

记录时间：2026-10-20 15:01 CST。原任务为 Claude 14:25 基础设施治理，功能树 `infra-temp-lifecycle-20261020`，基线 `b367e05d46128849f14b84d12e9180400e4dcaf4`。当前仅候选，完整检查窗口仍由 W8 使用；尚未提交、合入 main 或 live。

已定位两类本项目泄漏：`oneshot-support`、loop、Jev retry 等测试只枚举删除部分 JSONL，新增的 run-config、states、Jev prompts 等 sidecar 留在共享 `/tmp`；另一些模块级 `mkdtempSync` 夹具没有对应回收。此次让前者使用每次测试独占目录并在服务器关闭后递归清理，后者统一注册文件级 `afterAll`。服务器关闭失败仍会清理已知归属目录并保留失败结果。

增加 `agent/tools/with-temp.mjs` 和归属校验模块。未显式指定 `TMPDIR` 时，测试及离线统一入口在 Git 主检出的短路径 `.cache/t/s-*` 创建独立目录，在子进程启动前设置 TMPDIR/TMP/TEMP。正常结束或失败后清理自己的目录；统一入口遇信号中断保留现场，避免删除潜在后代仍在用的目录。显式 TMPDIR 属于调用者，不改写、不回收。直接运行 vitest 也由配置及 global teardown 应用默认目录。

`npm test`、沙箱检查和学习者宿主完整检查使用同一入口；宿主从调度器仓库引用包装器的绝对路径，检查旧 live 时仍只从原工作目录加载待检查的代码和知识。新增 `npm run offline`、`v6:replay`、`v6:profile` 入口供离线烟测及批量模拟使用；不启动游戏、模型请求或历史回放。`rollout-backtest` 的显式持久产物默认改放功能树 `.artifacts/rollout-backtest`。详见 [使用说明](../../../docs/temporary-files.md)。

容量准入追加共享 `/tmp` 的 `statvfs` 空间和 inode 测量，分别要求严格大于 1 GiB 和 16,384。低容量或测量失败阻止新的作业、通道与下一局，首次状态变化写原 inbox 并排队通知 ops；不热停当前局，不恢复 Regent。测量纳入原 current 状态及追加原件。阈值是工程余量，不是游戏规则。

固定数据验证覆盖目录嵌套 sidecar 清理、邻居及显式目录保留、归属标记拒绝、失败退出码、旧 checkout cwd 与缺失程序；准入测试覆盖 bytes/inode 边界、未知测量、恢复与复发，以及 tick 不启动模型。变基后的 tsc 为 0，三套 TS 定向 25 项通过，相关 Python 为 11+7+3 项通过。早先一次不支持的 `--minWorkers` CLI 错误保留，未执行测试、不作为产品失败或验收通过。完整 vitest 仍 pending，不用定向结果替代。

原 ops 已实际完成限定旧残留清理，原件见 [清理回执](../20261020-temp-cleanup-1430-ops/receipt.json)：7,385 个已证实归属且早于 2026-10-19 12:00 CST 的对象，释放本批逐项 journal 计 30,975 inode、108,003,328 分配字节（约 103 MiB）。8,103 个归属不足旧对象和 19,392 个较新的 `jev-sts*` 保留；未动 `tsx-1000`、在用、非项目或炉石项目文件。全局前后容量可受并发影响，释放量只归因逐项 journal。本功能不再清共享 `/tmp`。

完整检查按既定 W8→watcher 顺序，收到明确释放且原 runner 退出后才启动 nice19、单 worker、原阈值检查。当前未启动自己的 full、刷新、批量模拟、模型/API 或 play。不会以本次治理夹带 W3-805 上线；805 已按 Claude 14:58 新授权保留暂缓，新的拿牌战斗结果由 v6-w4w6 独立实现。

回退本候选只需恢复本次源文件，保留显式临时目录和原验证日志。正式发布与 live 运行读回仍由原 ops 按精确源与实际知识组合处理；本记录不登记发布号、不完成 retention 或角色 ACK。
