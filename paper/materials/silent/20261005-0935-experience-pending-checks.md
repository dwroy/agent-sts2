# 经验2026-10-05.10待live合入记录

记录时间：2026-10-05 09:49 CST。批次20261005-085844-experience-update，固定源c2ece69c8c6d342ab7d55e10d8aca6af1ace25bc，main归档32756163a905574e0716767de0a59cb17be1655b；只改静默经验，+2/~15/-0，active62、19242字符。

学习者自测tsc0、152文件1906用例exit0，未重跑；原日志与exit文件保留在learner/runs/20261005-085845-experience-update/。

```text
RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/exp/agent


 Test Files  151 passed (151)
      Tests  1895 passed (1895)
   Start at  09:05:30
   Duration  206.46s (transform 5.87s, setup 7.52s, import 19.02s, tests 777.46s, environment 16ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/exp/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  09:08:57
   Duration  1.89s (transform 1.41s, setup 354ms, import 1.33s, tests 63ms, environment 0ms)
```

本轮非阻塞live锁busy，未启动合并、未跑live组合检查。`bash ops/codex-ops-do.sh learner-merge exp-silent`exit128，完整输出“（超过 30 秒，已终止）”；未确认manual入队。步骤与固定源已写notes/ops-handoff.md最新节，补事件请求已写ops/inbox-dev.md及notes/for-dai.md。本批17项保持proposed，未创建S1.exp11或本批shipped；只归档17行学习者proposed，另5行其他任务台账保留未暂存。

账本检查：/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 77 item(s), 0 problem(s)。学习者报告的silent-0076来源结构字段更正和兜底动作争用已转录修复队列，未由运维修游戏机制或改历史。

A3完整评估另由新白名单eval-metrics成功生成paper/materials/silent/a3-metrics-20261005-093548.kaoyu5.md；A3升级小结已附指标、账本id、学习曲线原行及五行以内收件箱摘要。

论文数据刷新原始输出：

```text
cut at 2026-10-05T01:44:47.160Z: decisions.jsonl 496,226,572 B, deepseek-reasoning.jsonl 373,779,361 B, runs.jsonl 199,005 B, states.jsonl 6,641,655,965 B, fight-plans.jsonl 2,233,957 B, run-plans.jsonl 4,878,860 B
decisions: 216,546 records, 500 runs
scanning states.jsonl ...
OK   decisions attributed + unattributed == play records
OK   decisions_by_label sum == attributed decisions
OK   escalations rows == records with escalation
OK   every runs.jsonl id present in runs.csv
OK   commits == git rev-list --all --count
rows: runs 500, decisions_by_label 16670, escalations 3600, commits 2261
/home/dw/Projects/agent-sts2/paper/data/learning-curve-ironclad.csv: 10 row(s)
/home/dw/Projects/agent-sts2/paper/data/learning-curve-silent.csv: 6 row(s)
key scan: CLEAN (no sk-<key> patterns)
```
