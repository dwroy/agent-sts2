# 静默经验 .21 完整补测失败处置

- 2026-10-05 21:26 CST：21:20 learner-checks，批次20261005-204301-experience-update，实际固定live发布c3f0410c72166b5c3145fe25c12a2974569b4ff6、树ba54713b8b91189f4f38e569a06bf4df318f6371；已核实git树及main/live祖先。原日志ops/codex-ops/learner/20261005-204301-experience-update.fallback-ba54713b8b91189f4f38e569a06bf4df318f6371.checks.log保留。
- 完整tsc+vitest合计exit1，日志唯一失败为`agent/tests/subscription-usage.test.ts:36:27`“appends success and failure without losing history or disclosing account/error payloads”：测试的`join(process.env["TMPDIR"]!, "quota-test-")`在TMPDIR未设置时收到undefined。227文件226通过/1失败，2813用例通过/1失败/2跳过（总2816），21:09:35开始、561.33秒；没有把完整套件记为通过。
- 该测试来自额度采样源bd418431，main当前文件blob同固定发布。本轮在main对相同源码用`node_modules/.bin/vitest run tests/subscription-usage.test.ts --pool=threads --maxWorkers=1`（nice19、PATH含本地node）做固定数据对照：21:22:10明确删除TMPDIR后exit1、2通过/1失败、同一TypeError；21:22:47给已创建的临时TMPDIR后exit0、3通过。学习者任务原先明确设置TMPDIR，解释了源/合后176文件2006例通过与完整环境的差异；环境对照只确认原因，不记已修复或完整补测通过，没有修改源码/排除名单/断言。
- 运维决定派修复、保留上线：失败只在测试临时目录初始化，采样器21:15已有fresh周44%真实安全样本；不回滚经验.21或停止采样/对局/调度，不撤14项shipped历史。非阻塞纯测试问题已追加fix-queue-v4，局号/层/回合不适用，没有游戏知识或Roy新增待定。
- 学习者需按Node临时目录API兼容正常未设置TMPDIR环境，并验证未设置/已设置两种环境，保留追加成功/失败、历史及脱敏检查；不放宽断言、删除用例、新增排除或仅给完整测试命令塞TMPDIR来掩盖。修复自测合入后，用新树补完整检查；旧树失败与此前沙箱通过历史均保留，不能把同树去重返回的旧结果记为重新验证。
- 已运行完整命令`bash ops/codex-ops-do.sh fix-batch`，exit1、完整输出`{"dispatched": null}`；learner-status已确认20261005-204301-fix-batch/PID1552069在运行（成本归集/升级爆发），现有同树独占，不并发写或停止学习者，新队列供下一批自动派发。本轮不等待批次结束或轮询；派发处置已写收件箱，具体修复/实际上线及完整重测待后续完成事件。
