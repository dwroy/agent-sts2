# A7首胜复盘及经验第28批完整检查失败

- 2026-10-06 02:40 learner-done：20261006-021302/4Y94N8RDPGPM exit0，A7/F48首次通关、9血、无读档；学习者没有新的纯bug或Roy待定。复盘本体和focus/药水措辞追加勘误原样归档14773字节，SHA256 1db745cd1a03b433ec15c17734808c16348e9d2c3156dd4ce4ce44288a32bd21；回报SHA256 12a6e717ca0c3cd5dfa54aa87269425b87624bac8dd019b79ab90979aff8c9f2，完整事件流learner/runs/20261006-021302-postmortem.jsonl。
- 本批9项9行原账本：silent-0005,silent-0007,silent-0016,silent-0020,silent-0046,silent-0069,silent-0090,silent-0140,silent-0141；0140夜魇启动血价/次轮复制收益、0141复制到手与附魔现场为新增observed、prior=unknown，既有7项仅support补证，repeat无。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 141 item(s), 0 problem(s)。0139属于其他尚未收到完成事件的批次，不混提交；不改知识、版本或上线标签。
- 独立learner-checks：20261006-020339-experience-update固定发布98f88e06ac849c29af6474c76121f37c2d8019ce/树d98a9fdb2704aea31f544c350f5a16ae902f64b7完整tsc+vitest exit1；233文件通过/1文件失败、2855例通过/1例失败/2跳过。唯一失败实际耗时1506ms大于1500ms断言，根因待核；原日志ops/codex-ops/learner/20261006-020339-experience-update.fallback-d98a9fdb2704aea31f544c350f5a16ae902f64b7.checks.log，64226字节，SHA256 cb1f9f971f2391c38046c944ba4e87344acc9b6d30c02f16563168e392ac1ac1，fallback映射核对。当前main agent源码/测试blob等同该固定发布，经验源825c94d5仅改silent/experience.json，不将本失败归因为经验机制文字。

```text
FAIL  tests/target-options.test.ts > per-target options (EZ2L F48 T2: Queen + Torch Head Amalgam) > stays inside the time budget with the real clock, degrading the samples per order first
AssertionError: expected 1506 to be less than or equal to 1500
 ❯ tests/target-options.test.ts:178:31
    176|     const decision = ez2l({ budgetMs: ROLLOUT_BUDGET_MS }) as AskDecis…
    177|     const log = decision.resolve(pick("plan1")).log!["rollout"] as Rec…
    178|     expect(Number(log["ms"])).toBeLessThanOrEqual(ROLLOUT_BUDGET_MS);
       |                               ^
    179|     for (const step of log["degraded"] as string[]) expect(step).toMat…
    180|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
```

```text
Test Files  1 failed | 233 passed (234)
Tests  1 failed | 2855 passed | 2 skipped (2858)
Start at  02:25:43
Duration  555.36s (transform 6.82s, setup 10.54s, import 29.45s, tests 1043.91s, environment 22ms)
```

- 一次相同源码/固定夹具定向诊断：nice19 node_modules/.bin/vitest run tests/target-options.test.ts --maxWorkers 1 --reporter verbose，exit0、1文件22例、02:36:57开始43.65秒，归档paper/materials/silent/20261006-0236-target-options-check.txt前4265字节为原日志、SHA256 4ec7da529d44fef67b5749143707814d5bffa8b3dd53d6cb906a0377cc6ffade（末尾另附归档说明，原输出字节未修改）。未放宽1500ms断言、改源码或新建排除；这一局部结果不替代失败的完整套件。
- 运维决定派学习者核查时钟/截止边界，保留S1.exp28及17项既有shipped，不回滚或停对局；未发现该测试导致运行对局阻塞的证据，不能据局部复测宣告根因已修。新队列留原失败与对照，派发结果另记；修复合入后交调度器补完整检查。
- 随后按协议nice19运行paper_dataset.py --no-raw并提交本轮生成论文表/自身记录；A7首胜正式复盘补充至升级报告，旧统计快照和“首胜待复盘”记录保留。

- 2026-10-06 02:44 实际派发命令 `bash ops/codex-ops-do.sh fix-batch` exit1、返回 `{"dispatched": null}`，未启动新批次。一次 `bash ops/codex-ops-do.sh learner-status` exit0证实20261006-021302-strategy-proposal/PID2125510仍running、使用同一codex-dev工作树；ops/learner_jobs.py:83—89、:135—137的同树busy保护拒绝并发派发。保持该任务与对局/调度运行，预算失败队列等待同树占用解除由调度器下一批承接，不重复派发或绕过保护。收件箱已写原失败、完整命令和原因；无需Roy新增决定。

- 2026-10-06 02:46 本轮论文刷新完成：nice19 python3 ops/paper_dataset.py --no-raw exit0，切点2026-10-05T18:42:20.673Z，五项一致性通过/决策计数差异为空/key scan CLEAN；行数{"commits.csv": 2611, "decisions_by_label.csv": 17436, "escalations.csv": 3600, "fight_plans.csv": 1461, "runs.csv": 522}，/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 143 item(s), 0 problem(s)。只提交本轮生成论文/成本输出和自身记录，其他任务账本/运行日志保持；生成表按脚本当前日志与账本输入读数，不把这批首胜复盘倒算为本级结束前上线。原复盘九行已提交00d706d1c1cacd4c835bfb85f58df319a18af495，派发/收件箱记录f7cc1f4d498ee13e4c4b104735c7ea2bb32dd77d。
- 第28批完整外部exit1的预算边界失败仍待学习者核查，定向22例通过不替代完整检查或宣称已修；S1.exp28、17项已上线账本保持。同树021302策略任务占用导致fix-batch返回null，本轮不重复派发或停止任何任务，队列交下一可用fix-batch/后续事件。
