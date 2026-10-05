# 经验.24 首次合后失败与诊断

记录时间：2026-10-05 23:33 CST。固定失败合入 `79b415c09d2cf198506fb00394de1818436d975e`、树 `cbe22c6c2491fde66f6e6cee9694de45cc9e51da`。tsc0；177文件2018例通过，1文件1例失败，turn-start-settle.test.ts:165 Inferno指纹断言。live恢复合前 `256b0eee715750c1851f85274885a0770c85977f`，其他知识/未提交记录保留；不登记shipped/版本，不将失败当通过。与204301成本批同断言历史一致，定向恢复基线诊断4例通过；随后核对相同合并树完整重跑最多一次，无断言/排除名单改动。最终结果后续追加。

首次合后完整失败日志，原字节1465，SHA256 `a84c2b4361f9b8d6fdc5d3e55fcef539cef124d2147676b8882e78087050838b`：

```text

 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent

 ❯ tests/turn-start-settle.test.ts (4 tests | 1 failed) 1187ms
     × Inferno up: the first action is not sent on the stale board; the re-read after 500 ms re-plans on the settled one 903ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/turn-start-settle.test.ts > the loop at a turn start still settling > Inferno up: the first action is not sent on the stale board; the re-read after 500 ms re-plans on the settled one
AssertionError: expected '{"actions":["play_card","end_turn","u…' not to be '{"actions":["play_card","end_turn","u…' // Object.is equality
 ❯ tests/turn-start-settle.test.ts:165:48
    163|     // Slow planning can consume the settle interval; the re-read must…
    164|     expect(records.at(-1)!["result"]).toBe("completed: scripted");
    165|     expect(records.at(-1)!["fingerprint"]).not.toBe(records[0]!["finge…
       |                                                ^
    166|     expect(records.slice(0, -1).every((record) => String(record["resul…
    167|     expect(notes.some((note) => note.startsWith("state changed while d…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 177 passed (178)
      Tests  1 failed | 2018 passed (2019)
   Start at  23:25:06
   Duration  302.52s (transform 24.17s, setup 22.58s, import 50.44s, tests 1095.49s, environment 29ms)

```

恢复合前的定向四例诊断，原字节237，SHA256 `963c654c7ea9c8175fbff5f119825009728875afe0637718207ada5cbe34dfe7`：

```text

 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  23:31:32
   Duration  8.01s (transform 5.19s, setup 1.40s, import 4.99s, tests 1.25s, environment 0ms)

```
