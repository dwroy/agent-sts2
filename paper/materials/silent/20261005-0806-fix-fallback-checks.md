# 静默修复批次兜底检查

记录时间：2026-10-05 08:16 CST。批次20261005-074301-fix-batch，源`907a19f8d03ede74ed135c0395d120ed84232358`，live合入`dcc1c8976f28c5383fd786748bfe3c9ccf266929`，发布`1b2945335a8e3b54d5264c8dd39133a2671a4e8b`，eval S1.fix7；main集成`590627005c0cfba33091e69c880cf919f5553458`。

学习者提交前tsc0、151文件1905用例通过，四项固定回归仅撤源码时三失败一等价通过、恢复四项通过，详见learner/runs/20261005-074301-fix-batch/handoff-ops.md及其回归日志。未合入原因是当时两次live锁争用，本批由运维在非阻塞取得锁、确认无知识刷新后机械合入，decision-log冲突保留双方历史。

合入后检查固定入口`nice -n 19 bash tools/test-sandbox.sh`，cwd `.worktrees/live/agent`；tsc0、151文件1905用例exit0。测试树`6ce1598a09be928dee3f35671ac1ff1d7ec98658`，无重跑或更改排除名单；主目录集成的代码及knowledge与已测live一致，记录数据免重复测试。原始日志`/tmp/sts2-0806-fix7-live-sandbox.log`：

```text

 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  150 passed (150)
      Tests  1894 passed (1894)
   Start at  08:12:39
   Duration  243.14s (transform 6.55s, setup 8.69s, import 21.07s, tests 919.40s, environment 18ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  08:16:43
   Duration  1.78s (transform 1.33s, setup 334ms, import 1.27s, tests 58ms, environment 0ms)
```

完整沙箱外tsc+vitest尚需补跑；原merged=null未触发自动检查且无补跑白名单动作，已沿既有05:44/08:05请求追加本批提交及命令，不将沙箱检查冒充完整检查。
