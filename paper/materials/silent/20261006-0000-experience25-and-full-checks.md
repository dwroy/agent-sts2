# 00:00 经验 .25 与两批完整检查归档

记录时间：2026-10-06 00:10 CST。处理本轮 experience-done 与两条 learner-checks；新修复 232305 的兜底另记，不把本树完整检查当新代码检查。

实际经验源 `5bc320f7ba980bd4e46049ad4b1758975ef7b77f`、发布 `0d0c4b690fb372fe0810c99b619c52e239a5c85b`、树 `3465c261d3cd4e11666ae6775a6ea068e0f4b5ed`、唯一版本 S1.exp25；main 前轮同步 3547e8bc。本轮未再次合经验或建版本。经验 .25 来自 3KME36ADUE4U SILENT A7 与旧31局，新增1/更新7/退役0，active93条/51696字；A8/A9各84条/42232字，实际样本0。只登记学习者已有产出，没有运维补的游戏知识。源/合后固定沙箱均 tsc0、179文件2030例首过。

第25节原文、8条原 proposed 与本批8条 ops shipped 归档：silent-0019、silent-0020、silent-0021、silent-0006、silent-0005、silent-0046、silent-0107、silent-0128。4项此前已随 .24 映射登记同版本，这次补齐本批来源，不增加上线数或新版本。账本校验：/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 131 item(s), 0 problem(s)。原 first_run/prior 不改，0127独立代码修复、0114/0115历史不重置；0128经验入库不冒记完整醒来成长模型已实现。

两份完整外部检查在同一实际发布树独立运行，均 tsc/vitest exit0、230文件2838通过/2跳过，分开保留批次、开始时间、时长与日志指纹。前轮 .24 完整补测待办已完成，不再重复请求。原 .24 failed/merged=null、79b415c0失败树、回退256b0eee、源预算断言失败/重跑、Inferno失败/定向通过与锁占用保持原文，不回改旧回报或抹除失败。

20261005-231301-experience-update

```json
{
  "rc": 0,
  "log": "/home/dw/Projects/agent-sts2/ops/codex-ops/learner/20261005-231301-experience-update.fallback-3465c261d3cd4e11666ae6775a6ea068e0f4b5ed.checks.log",
  "merged": "0d0c4b690fb372fe0810c99b619c52e239a5c85b",
  "tree": "3465c261d3cd4e11666ae6775a6ea068e0f4b5ed",
  "commits": [
    "5bc320f7ba980bd4e46049ad4b1758975ef7b77f",
    "5bc320f7ba980bd4e46049ad4b1758975ef7b77f"
  ],
  "sha256": "0271806cd06173d6d17fbd135ae241397485116299255fa0b7873f6f1fd8db6f",
  "bytes": 59000
}
```

```text
 ✓ tests/knowledge-check-a8w-cards.test.ts (1 test) 3ms
 ✓ tests/learning-roles.test.ts (4 tests) 4ms
 ✓ tests/ops-action-list.test.ts (1 test) 3ms
 ✓ tests/combat-rationale.test.ts (1 test) 2ms

 Test Files  230 passed (230)
      Tests  2838 passed | 2 skipped (2840)
   Start at  23:40:07
   Duration  549.48s (transform 9.74s, setup 10.74s, import 31.83s, tests 1030.65s, environment 21ms)

```

20261005-224301-experience-update

```json
{
  "rc": 0,
  "log": "/home/dw/Projects/agent-sts2/ops/codex-ops/learner/20261005-224301-experience-update.fallback-3465c261d3cd4e11666ae6775a6ea068e0f4b5ed.checks.log",
  "merged": "0d0c4b690fb372fe0810c99b619c52e239a5c85b",
  "tree": "3465c261d3cd4e11666ae6775a6ea068e0f4b5ed",
  "commits": [
    "c02c40a38f476991d68b3ad37a082d8ce30105d5"
  ],
  "sha256": "6e9ca63c670cb084eee7c583399af714488e35b38d10da4ab71793d4ef46b3d6",
  "bytes": 60171
}
```

```text
 ✓ tests/knowledge-check-cards.test.ts (2 tests) 4ms
 ✓ tests/knowledge-check-a8w-cards.test.ts (1 test) 3ms
 ✓ tests/ops-action-list.test.ts (1 test) 5ms
 ✓ tests/combat-rationale.test.ts (1 test) 2ms

 Test Files  230 passed (230)
      Tests  2838 passed | 2 skipped (2840)
   Start at  23:49:18
   Duration  498.80s (transform 6.00s, setup 9.92s, import 28.55s, tests 933.22s, environment 22ms)

```
