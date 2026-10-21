# 完整测试中断记录

2026-10-21 11:39 CST：本次 unrestricted 单线程完整回归尚无测试汇总时，由开发会话按 PID 对主进程 3616735 发 SIGTERM（退出 143）。原因是 CLI/tsx 测试留下四个 esbuild 子进程（3646302、3653738、3653748、3653777，nice 均为 19），超过当前任务两个进程的资源限制。主进程退出后重新核查，上述 PID 均已消失。

命令：`node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1 --exclude tests/paths.test.ts`，nice 19。原输出保留 `full-vitest.log`。这不是通过结果，也不归因为产品测试失败。

随后沿仓库已有 `tools/test-sandbox.sh` 固定排除清单、`SANDBOX_WORKERS=1` 重跑，额外使用 verbose reporter 观察进度。该脚本自带 tsc 与 paths 单 fork 检查；受限测试仍按仓库流程交调度器/ops 完整检查。
