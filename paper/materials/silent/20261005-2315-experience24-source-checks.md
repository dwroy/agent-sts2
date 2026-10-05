# 经验.24 源检查与兜底交接

记录时间：2026-10-05 23:37 CST。固定源 `c02c40a38f476991d68b3ad37a082d8ce30105d5`。首轮预算断言失败、完整重跑一次通过；原始日志保留。首次合后失败提交 `79b415c09d2cf198506fb00394de1818436d975e`、树 `cbe22c6c2491fde66f6e6cee9694de45cc9e51da` 已由本地保留分支 `ops-exp24-failed-20261005` 固定，不推送。原failed-merge.patch在 /tmp/sts2-2315-live-failed.patch；失败日志已归档 experience24-first-check-failure.md。

`test-source.log`，原字节 1691，SHA256 `7a117767b78450fc44c3e828dcdb23a30d95fa4d5766631e7c3a7b9af13e9a0f`：

```text

 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/exp/agent

 ❯ tests/rollout-live.test.ts (15 tests | 1 failed) 196933ms
     × liveRollout picks its best among all code's lines, not only the shown ones (and adds no potion line) 630ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/rollout-live.test.ts > rollout facts on Jev's combat question > liveRollout picks its best among all code's lines, not only the shown ones (and adds no potion line)
AssertionError: expected '3-turn rollout (8 samples): expected …' to match /^5-turn rollout/

- Expected:
/^5-turn rollout/

+ Received:
"3-turn rollout (8 samples): expected further HP loss 14, fight over within 3 turns in 8/8, expected turns to the end (surviving samples) ~3; ranked on -(further loss) - 40 x (1 - win chance): win chance ~100% (fights won in the samples, the others by the end-of-horizon estimate), value -14 [cut to fit the time budget: horizon 3]"

 ❯ tests/rollout-live.test.ts:157:47
    155|     expect(r.byPlan.get(r.best!)!.value).toBe(Math.max(...values));
    156|     expect(r.byPlan.has(worst)).toBe(true);
    157|     expect(rolloutFacts(worst, r)["rollout"]).toMatch(/^5-turn rollout…
       |                                               ^
    158|     // The encounter's own n, and the backed-off segment named as the …
    159|     const gates = loadFightValueGates()!;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 177 passed (178)
      Tests  1 failed | 2018 passed (2019)
   Start at  22:53:58
   Duration  252.04s (transform 7.66s, setup 10.06s, import 23.87s, tests 946.72s, environment 21ms)

```

`test-source-rerun.log`，原字节 490，SHA256 `8cc2d708d60898fcc11b5a42021370ba70ab800793528889841b1bd3036b0419`：

```text

 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/exp/agent


 Test Files  178 passed (178)
      Tests  2019 passed (2019)
   Start at  23:03:32
   Duration  229.60s (transform 7.40s, setup 11.38s, import 25.41s, tests 852.04s, environment 20ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/exp/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  23:07:22
   Duration  1.99s (transform 1.51s, setup 348ms, import 1.46s, tests 52ms, environment 0ms)

```
