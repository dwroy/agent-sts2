# 策略4独立完整补测失败与处理决定

- 2026-10-06 03:00 02:57 learner-checks：批次20261006-021302-strategy-proposal，实际固定live 6566b7d308947e1929cb398034dd8f02a1d1cb25/树298172c3021fbc4bdb6fc1b53f0a79e7b143fff3，源939db23df241af81cd729489d1ee4e4a8b7115b8与实际合入a10be71d74755150bc5eda0e7df48d437efa9848均为live/main祖先，独立fallback映射已核对。发布291617bc95c34115863eaa57110c255f2894ea59/唯一S1.strategy4与固定检查树只差六项自动知识刷新；全部993项源码/测试/配置blob相同，main也相同，不借先前沙箱通过抹掉本次完整失败。
- 完整tsc+vitest exit1：235文件中234通过、1失败；2864例中2861通过、1失败、2跳过。02:47:22开始、500.39秒。唯一失败agent/tests/rollout-live.test.ts:249:40，真实时钟遍历固定夹具yg3h-f33-t1，记录2993ms，断言ROLLOUT_BUDGET_MS(1500)+300=1800ms，超1193ms。原日志ops/codex-ops/learner/20261006-021302-strategy-proposal.fallback-298172c3021fbc4bdb6fc1b53f0a79e7b143fff3.checks.log，61760字节/SHA256 0861eb38d55332c5fbf5a3663d7f133a5c4702c6d85f1b5067065a16df5c72e0；原字节永久归档paper/materials/silent/20261006-0257-strategy4-full-check.txt，前缀保留原ANSI和换行，审计注单独追加。
- 本次四个策略路径均属于构筑模拟胜率并列显示/对应固定证据测试；相关rollout-live.test.ts、rollout-live.ts、rollout.ts、combat-plan.ts与合前98f88e06 blob相同。六项在线知识刷新并不等于无影响，本次失败根因仍未定，不能据此宣布发布没有问题或真实对局卡死。策略4新增6例在本次完整套件通过；原沙箱首次1527>1500失败/回退/同树一次通过与经验28另一次1506>1500历史均保留。
- 运维决定派学习者核查和修复，保留S1.strategy4与0139真实shipped，不回滚或停对局。核查生产截止传播/最后采样与墙钟、测试夹具时钟边界及测试并发影响；只根据固定证据修确实存在的系统缺陷，不提高1500ms预算/1800ms断言阈值，不放宽断言或排除测试，不用重跑通过冒记修复。根因不明就写未修，不引入游戏机制/打法；局号/角色/进阶不适用于新系统缺陷，yg3h仅既有固定测试夹具名，不新建游戏账本/bug-infra。
- 优先队列已追加并先提交，使fix-batch接手可读。实际派发结果随后追加；不等待学习者或重跑相同完整套件。原state=done/rc0、checks_pending=false与独立checks rc1都保留，不改broker状态或把完整检查标成功；经验29仍留原锁占用交接，未随此事件合入或冒记S1.exp29。

原始失败与汇总（仅去ANSI显示）：

```text
Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/rollout-live.test.ts > rollout facts on Jev's combat question > the real clock: every logged board's rollout stays inside the budget
AssertionError: yg3h-f33-t1: expected 2993 to be less than or equal to 1800
 ❯ tests/rollout-live.test.ts:249:40
    247|       // The clock is checked between samples, so the last sample may …
    248|       // takes 100–200 ms (overruns of 1–110 ms were logged at load 15…
    249|       expect(Number(log!["ms"]), name).toBeLessThanOrEqual(ROLLOUT_BUD…
       |                                        ^
    250|     }
    251|   }, 120_000);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 234 passed (235)
      Tests  1 failed | 2861 passed | 2 skipped (2864)
   Start at  02:47:22
   Duration  500.39s (transform 6.19s, setup 10.66s, import 30.20s, tests 932.34s, environment 23ms)
```
