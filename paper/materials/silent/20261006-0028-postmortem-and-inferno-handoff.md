# 00:28 复盘、完整检查与测试修复交接

记录时间：2026-10-06 00:32 CST。

VLV17NUSFS61：SILENT A7/F48，学习者已追加完整复盘，六次boss均42/77进场，末次T5需损8而仅7血阵亡；全局成功SL6次（F37一次、boss五次）。新增bug-infra silent-0130（单行动题重复扣挡，最早Z6CFLDR3N4SB）与mechanic silent-0131（钻石头冠两轮保护与首次格挡加成），七旧support原行共9条归档，0009目标条件/启动未兑现是学习者标记的老错。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 132 item(s), 0 problem(s)。状态/first_run/prior均不由运维补写；新扣挡问题非阻塞，file:line及两局证据已入fix-queue-v4，交学习者，运维不改游戏模型。修复/另一打法的受控胜负及其余未记录项保留学习者原文，无新Roy待定事项。

232305修复完整外部补测：实际快照 `341b75fef2cc18a2685113b8d91bebf81c2c7e6b`，树 `e98d15c5642ecb05091f04f5f9119e9df1568c5a`，Jev源80199dcc/缺后继源631f9485为祖先；与9988ca8b已测发布代码完全相同，仅后续知识刷新。broker映射与原日志核对：tsc/vitest exit0、232文件2845通过/2跳过、00:20:13开始500.35秒，字节59273，SHA256 `bee12d5808b38f919443257b265cc6ad3d793f5f8ee1531ae137b0c1b0161208`。本批完整补测待办关闭，不重测/再合/再登记S1.fix22或0127 shipped；旧PLACEHOLDER更正、撤源、夹具、预检/锁、TMPDIR/Inferno失败历史不回改，原报告merged=null与state=failed保持。

```json
{
  "rc": 0,
  "log": "/home/dw/Projects/agent-sts2/ops/codex-ops/learner/20261005-232305-fix-batch.fallback-e98d15c5642ecb05091f04f5f9119e9df1568c5a.checks.log",
  "merged": "341b75fef2cc18a2685113b8d91bebf81c2c7e6b",
  "tree": "e98d15c5642ecb05091f04f5f9119e9df1568c5a",
  "commits": [
    "80199dcc3f7a66bfceeb7d8c028c6c3bad935b7c",
    "631f94856702772a4bc5e27d38ddfc140fb0d714"
  ]
}
```

```text
 ✓ tests/pricing.test.ts (6 tests) 3ms
 ✓ tests/knowledge-check-cards.test.ts (2 tests) 4ms
 ✓ tests/combat-rationale.test.ts (1 test) 2ms
 ✓ tests/knowledge-check-a8w-cards.test.ts (1 test) 3ms

 Test Files  232 passed (232)
      Tests  2845 passed | 2 skipped (2847)
   Start at  00:20:13
   Duration  500.35s (transform 6.15s, setup 9.76s, import 27.74s, tests 938.05s, environment 22ms)

```

000206-fix-batch有一项真实产出：固定源195869aa77dc216de08e6d1c5842782b239cb670，仅测试turn-start-settle.test.ts的首帧/时间竞态；源tsc0、181文件2038例首过，撤夹具改动1失败/4通过，恢复5通过；初次访问错误字段失败单独保留，不当预期红灯或负载重跑。原锁内预检仅decision-log冲突、未merge。后续按live流程兜底；不改变对局行为，不新增eval版本或bug-infra台账、不重复前批Jev/0127部署，不另审策略。不停对局、不运行play；当前本记录不提前宣称本批合入/合后或外部检查通过。

- 2026-10-06 00:39 论文数据生成完成：nice19 python3 ops/paper_dataset.py --no-raw exit0，切点2026-10-05T16:34:43.331Z；五项一致性全部通过、决策计数差异为空、key scan CLEAN，行数{"commits.csv": 2559, "decisions_by_label.csv": 17362, "escalations.csv": 3600, "fight_plans.csv": 1461, "runs.csv": 520}。复盘及9条原台账已提交12d828f443fedbcd95b88a4216e92b4d97c300a9，只提交本轮生成的论文/组件成本输出和自身记录；Jev按Roy输入0.042美元/百万token、免费输出及差额/未知保留，其他经验批次的changelog/台账、他人记录不混提交。记录与数据提交免代码测试；000206代码合后测试单独记。

- 2026-10-06 00:44 000206首次合后失败与安全回退：固定合入9fc1e4f84538319c021a9d22e3fa42f251096db1/树e00c7ce75b7a66da53f0dd33ac9dbaa88fe3ff1a，tsc0；主组180文件中179通过/1失败、2026例通过/1失败，00:34:48开始236.36秒，paths组因set-e失败尚未执行。唯一失败是未改动的agent/tests/ops-herdr.test.ts:187:107，close-on-exit检查pane注册表期待空，却留batch-1；该测试与ops/herdr-host.sh两个blob和合前341b75fe相同，Inferno新增回归及其他测试通过，不把此失败说成新夹具回归失败，也不编造根因。已安全恢复341b75fe，保留分支ops-inferno-test-failed-20261006指向失败提交，无本批main同步、行为版本或shipped。

原始失败日志/tmp/sts2-0028-test-live-sandbox.log，1284字节，SHA256 d93a6a168c16c96befeb758b907a9f1aeb58261d4fffbf9bde777480c69a8a2f；保留原文：

```text

 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent

 ❯ tests/ops-herdr.test.ts (17 tests | 1 failed) 20084ms
     × --close-on-exit: the pane closes when the job ends and its last lines are kept 2555ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/ops-herdr.test.ts > ops/herdr-host.sh (fake herdr) > --close-on-exit: the pane closes when the job ends and its last lines are kept
AssertionError: expected { 'batch-1': { …(2) } } to deeply equal {}

- Expected
+ Received

- {}
+ {
+   "batch-1": {
+     "pane_id": "w1:p2",
+     "since": "2026-10-06 00:37:49",
+   },
+ }

 ❯ tests/ops-herdr.test.ts:187:107
    185|     expect(tail).toContain("batch output");
    186|     expect(tail).toContain("exited 3");
    187|     expect(JSON.parse(readFileSync(join(w.dir, "proj", "ops", "codex-o…
       |                                                                                                           ^
    188|   }, 30_000);
    189|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 179 passed (180)
      Tests  1 failed | 2026 passed (2027)
   Start at  00:34:48
   Duration  236.36s (transform 5.98s, setup 8.09s, import 19.45s, tests 894.22s, environment 18ms)

```

只进行一次同一固定失败树复测：隔离工作树.worktrees/ops-inferno-check detached 9fc1e4f8，树必须与首次失败完全相同、不改代码/断言/排除列表/知识，不影响已恢复live；结果后续追加，不能预记通过。新herdr断言证据单列队列；与原Inferno/预算/TMPDIR失败的历史分开，不覆盖旧回报。
