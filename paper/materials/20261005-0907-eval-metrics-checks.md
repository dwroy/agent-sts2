# eval-metrics 动作上线检查

记录时间：2026-10-05 09:33 CST。来源：调度器09:07 manual，Dai 08:37授权（main e601de00）。

- 工作树：.worktrees/ops-eval-metrics，分支ops-eval-metrics。
- 功能源：ef46d720c74909aecff9a09ff7e6d443e06cd9d7；main集成：e223fb56f9ae67ffb4dd34ef714deb19024e9587。
- live合前：7efeed50d42453e3fa6a6c832214796a7f73b8dd；合入：dac9d94123f9da2237e94e2313c34a044b4c255f；上线记录：d9a3ea37a0d1f01cdbeb395c060b0fc57e3f8449。
- 合后受测树：d414270e0b7384f2f363d92d0649901efaf90e57。保留双方decision-log、版本及自动刷新数据；只实现工具，不增加打法eval版本。
- 固定调用：`bash ops/codex-ops-do.sh eval-metrics silent 3`。角色id和进阶在broker及动作端分别校验；完整评估使用data/logdb-venv/bin/python，nice19，生成paper/materials/<角色>/独立报告，返回绝对路径。
- 本次没有运行真实沙箱外评估。当前叫醒加载的是旧白名单；下一次叫醒加载新动作，可补历史升级报告，无需重启对局。
- 学习者fix-batch中旧调度器只读说明已更新；Dai已批准的策略提案任务建设和派发已转交学习者队列，具体策略只由学习者依据本角色证据形成。

固定测试数据不连接游戏、日志数据库、网络或LLM。Python回归涵盖严格参数、完整参数传递、重复生成独立报告、其他角色目录、缺少Python解释器、失败退出码、部分及空结果不发布、旧报告保留。原脚本缺少动作时3项按预期失败，1项非法参数测试通过；实现后4项均通过。另有22个broker参数测试及Dai授权后旧权限测试更新。首次固定入口在learner-jobs.test.ts:74仍断言调度器只读，和e601de00授权冲突；更新为允许调度器编辑且保护git hooks/config后重跑通过，没有扩大排除名单。shell语法检查通过，提交前diff检查及gitleaks通过。

原动作回归（预期失败）：

```text
test_failed_or_empty_output_does_not_publish_or_replace_a_report (action_contract.EvalMetricsActionTest.test_failed_or_empty_output_does_not_publish_or_replace_a_report) ... FAIL
test_fixed_arguments_and_separate_snapshots (action_contract.EvalMetricsActionTest.test_fixed_arguments_and_separate_snapshots) ... FAIL
test_invalid_requests_never_call_evaluator (action_contract.EvalMetricsActionTest.test_invalid_requests_never_call_evaluator) ... ok
test_missing_database_python_fails_before_evaluation (action_contract.EvalMetricsActionTest.test_missing_database_python_fails_before_evaluation) ... FAIL

======================================================================
FAIL: test_failed_or_empty_output_does_not_publish_or_replace_a_report (action_contract.EvalMetricsActionTest.test_failed_or_empty_output_does_not_publish_or_replace_a_report)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/home/dw/Projects/agent-sts2/.worktrees/ops-eval-metrics/agent/tests/ops_eval_metrics_test.py", line 71, in test_failed_or_empty_output_does_not_publish_or_replace_a_report
    self.assertEqual(failed.returncode, 7)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 2 != 7

======================================================================
FAIL: test_fixed_arguments_and_separate_snapshots (action_contract.EvalMetricsActionTest.test_fixed_arguments_and_separate_snapshots)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/home/dw/Projects/agent-sts2/.worktrees/ops-eval-metrics/agent/tests/ops_eval_metrics_test.py", line 39, in test_fixed_arguments_and_separate_snapshots
    self.assertEqual(first.returncode, 0, first.stderr)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 2 != 0 :

======================================================================
FAIL: test_missing_database_python_fails_before_evaluation (action_contract.EvalMetricsActionTest.test_missing_database_python_fails_before_evaluation)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/home/dw/Projects/agent-sts2/.worktrees/ops-eval-metrics/agent/tests/ops_eval_metrics_test.py", line 84, in test_missing_database_python_fails_before_evaluation
    self.assertEqual(result.returncode, 127)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 2 != 127

----------------------------------------------------------------------
Ran 4 tests in 0.166s

FAILED (failures=3)
```

实现后动作回归：

```text
....
----------------------------------------------------------------------
Ran 4 tests in 0.424s

OK
```

工作树固定沙箱入口，exit 0（内含tsc）：

```text
RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/ops-eval-metrics/agent


 Test Files  152 passed (152)
      Tests  1917 passed (1917)
   Start at  09:24:40
   Duration  243.63s (transform 14.97s, setup 9.78s, import 28.46s, tests 913.84s, environment 16ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/ops-eval-metrics/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  09:28:45
   Duration  1.41s (transform 1.06s, setup 273ms, import 999ms, tests 42ms, environment 0ms)
```

live合后固定沙箱入口，exit 0（内含tsc）：

```text
RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  156 passed (156)
      Tests  1928 passed (1928)
   Start at  09:29:11
   Duration  234.24s (transform 6.16s, setup 7.17s, import 18.29s, tests 890.86s, environment 15ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  09:33:05
   Duration  1.42s (transform 1.07s, setup 269ms, import 1.01s, tests 43ms, environment 0ms)
```
