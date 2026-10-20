# 临时文件生命周期与容量准入

记录时间：2026-10-20 17:40 CST。原任务为 Claude 14:25 基础设施治理，功能树 `infra-temp-lifecycle-20261020`。修后完整检查已通过：tsc 0，624 个测试文件、5,896 项通过，2 项原跳过；原阈值、nice19、ionice idle、单 worker。已独立核实检查进程退出和本次主盘临时目录自动回收，并沿原 ops 通道明确释放唯一 full 窗口给原 W4 card-combat-results full-v2。本项只续源码与材料的 main 交付，live 由原 ops 按精确输入处理。

已定位两类本项目泄漏：`oneshot-support`、loop、Jev retry 等测试只删除部分 JSONL，新增的 run-config、states、Jev prompts 等 sidecar 留在共享 `/tmp`；另一些模块级 `mkdtempSync` 夹具没有对应回收。前者改为每次测试独占目录，在服务器关闭后递归清理；后者统一注册文件级 `afterAll`。服务器关闭失败仍清理已知归属目录并保留失败结果。

增加 `agent/tools/with-temp.mjs` 和归属校验模块。未显式指定 `TMPDIR` 时，测试及离线统一入口在 Git 主检出的短路径 `.cache/t/s-*` 创建独立目录，启动子进程前设置 TMPDIR/TMP/TEMP。正常结束或失败后清理自己的目录；遇信号中断保留现场，避免删除潜在后代仍在用的目录。显式 TMPDIR 属于调用者，不改写、不回收。直接运行 vitest 也由配置及 global teardown 应用默认目录。

`npm test`、沙箱检查和学习者宿主完整检查使用同一入口；宿主从调度器仓库引用包装器的绝对路径，检查旧 live 时仍从原工作目录加载待检查的代码和知识。新增 `npm run offline`、`v6:replay`、`v6:profile` 入口供离线烟测及批量模拟使用。`rollout-backtest` 的持久产物默认改放功能树 `.artifacts/rollout-backtest`。本任务未实际启动这些模拟或模型请求。详见 [使用说明](../../../docs/temporary-files.md)。

容量准入追加共享 `/tmp` 的 `statvfs` 空间和 inode 测量，分别要求严格大于 1 GiB 和 16,384。低容量或测量失败阻止新的作业、通道与下一局，状态变化写原 inbox 并排队通知 ops；不热停当前局，不恢复 Regent。测量纳入原 current 状态及追加原件。阈值是工程余量，不是游戏规则。

固定数据验证覆盖嵌套 sidecar 清理、邻居及显式目录保留、归属标记拒绝、失败退出码、旧 checkout cwd 与缺失程序；准入覆盖 bytes/inode 边界、未知测量、恢复与复发，以及 tick 不启动模型。原相关 Python 为 11+7+3 项通过；早先一次不支持的 `--minWorkers` CLI 错误原件保留，未执行测试，不作为产品失败或验收通过。

修后 r2 完整检查基线为 `5955880a8adeeb5e06bd1d9b2c6433dd780f6d95`，固定树 `f4b158dfe7f96eeb0ff3faef2700560bbaa948ab`，2,371 个输入的清单 SHA 为 `ca9dbf359741fea1fcd5892f0e18f4ed1f023270101ff7bfa218c04655e6d8a2`。17:13:04 启动，17:35:42.764 自然结束；tsc 0、full 0，Vitest 1,356.75 秒，包装器 1,357.307712 秒分列。原完整日志 SHA 为 `cef80e25d17140433f9838acd6b3a88741ce126bae0bf649351db3a5ca530e5c`。终局后再次逐 SHA 核全部输入，无变化。验证原件和来源范围见 [validation.json](validation.json)、[完整检查](checks/full-r2-status.json)及[窗口释放](checks/full-r2-window-release.json)。

运行时只对本检查后代取白名单字段，实读 Vitest 父进程及 worker 的 TMPDIR/TMP/TEMP 都指向主盘 `.cache/t/s-QKB97Z`；17:37:49 独立核本轮 runner、tsc、包装器、Vitest 及已采样 worker 均不存在，功能树无检查进程，目录也已不存在。该目录由包装器正常终局回收，本会话和 ops 均未手动删除。见 [运行时目录读回](checks/full-r2-active-temp-root-readback.json)和[退出读回](checks/full-r2-exit-readback.json)。原 ops 的独立核验为 `paper/materials/20261020-1738-infra-ops/verification.json`；CLI 投递与原生实收分记。

原 r1 失败保持不变：15:20:11 至 15:41:53.714，tsc 0、full 1，620 文件中 619 过、1 败，5,885 项过、4 败、2 原跳，1,300.912 秒。固定树 `ed37d6614f15f5276aaad86559fc79988694eeb4`、2,331 输入前后相同。唯一失败是 `learner-self-check.test.ts` 的三个旧宿主命令断言和一个旧沙箱顺序断言仍寻找 `npx vitest`。终局核退出并释放窗口后，仅修该测试的入口断言，保留完整 suite、排除名单、worker 参数及先 tsc 约束；随后 tsc 0、4 文件 14 项定向通过。原 full 1 与定向范围均未改写；此次 r2 是修后最新输入的完整验收。见 [r1 原日志](checks/full-r1-full.log)。

来源时间补核也保留：ops 先前的七叶静态 diff 中，六个 temp 新文件当时未进入真实 index，Git 对 ed37 的比较列为删除；当前字节与 ed37、15:19 备份及首轮清单相同，并非六次源码修改。实际内容差异只有 learner-self-check.test.ts；原生 FileChange 15:45:05.840 早于 tsc 15:45:05.887 和定向 15:45:07.026。事后补核不补造定向当时的独立输入快照或连续监控。旧 diff、旧报告与原失败均保留；六叶已进入 r2 固定 Git 树和完整输入清单。详见 [来源时间绑定](checks/source-time-binding.json)。

原 ops 已完成限定旧残留清理，原件见 [清理回执](../20261020-temp-cleanup-1430-ops/receipt.json)：7,385 个已证实归属且早于 2026-10-19 12:00 CST 的对象，逐项 journal 计释放 30,975 inode、108,003,328 分配字节（约 103 MiB）。8,103 个归属不足旧对象和 19,392 个较新的 `jev-sts*` 保留；未动 `tsx-1000`、在用、非项目或炉石项目文件。全局容量可受并发影响，释放量只归因逐项 journal。本功能不再清共享 `/tmp`。

本项没有新增游戏知识，也未运行刷新、批量模拟、模型/API 或 play；不改变对局策略，不夹带暂缓的 W3-805。回退只恢复本次源文件，保留显式临时目录和原验证日志。实际 main 交付另留精确源映射回执；live 仍由原 ops 核实际知识组合及消费者后处理。本项不登记游戏发布号、不提前完成 retention 或角色 ACK。
