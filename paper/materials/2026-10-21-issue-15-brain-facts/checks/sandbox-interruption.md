# 固定沙箱清单回归中断

2026-10-21 11:48 CST，`SANDBOX_WORKERS=1 nice -n 19 bash tools/test-sandbox.sh --reporter=verbose`（cwd agent）内 tsc 通过，vitest 已输出 1417 条通过、未见失败，尚未给出最终汇总。开发会话发现 vitest PID 3678597 下仍留下四个 esbuild 子进程：3726740、3734331、3734332、3734339；另有空闲 with-temp 包装进程 3678588，全部 nice 19。为遵守本任务 ≤2 进程限制，仅向已核实主 PID 3678597 发 SIGTERM，脚本退出 143；随后回读上述六个 PID，均已消失。

这不是完整通过结果，也不是已确诊的产品失败；不改变仓库固定排除名单、生产代码或 live/STOP 来绕过限制。原始输出 `sandbox-attempt-1.log` 保持原样。此前不带固定排除的中断另见 `full-vitest-interruption.md`。

最终新功能三文件逐个单线程执行，避免跨文件子进程积累：opening-value 3、card-value 5、brain-card-value-loop 6，共 14 项通过；loop-final.log 包含完整准备耗时与题面字节。完整 vitest 与原沙箱排除项仍交 ops 在允许的资源窗口验收，不报告 full green。
