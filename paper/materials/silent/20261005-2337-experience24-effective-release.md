# 23:37 exp-silent 兜底接力完成

记录时间：2026-10-05 23:44 CST。处理上一轮主动发送的manual接力事件，保留学习者自行上线结果。

实际生效的是经验.25：源/合入 `5bc320f7ba980bd4e46049ad4b1758975ef7b77f`，发布 `0d0c4b690fb372fe0810c99b619c52e239a5c85b`，树 `3465c261d3cd4e11666ae6775a6ea068e0f4b5ed`，S1.exp25唯一。此前受阻的经验.24源 `c02c40a38f476991d68b3ad37a082d8ce30105d5` 为该源/发布及当前live祖先，原.24映射12个经验id在该固定发布中全部存在。这里只做对象/映射/测试结果核对，不另设内容审核，也不补游戏知识。

学习者231301目录的result.json、tests.json和handoff-ops.md已完成落盘；源和合后固定沙箱均tsc0、179文件2030例通过、无重跑。main同步固定发布 `3547e8bce220993c09c120afa96acb6c27b03472`，incoming只有静默experience.json和eval/versions.json；999项main源码、86份记录/论文表、Jev队列/派发记录原样保持，decision-log双方所有历史保留，没有再次修改live或重跑测试。后续.25的8条learner proposed和第25节原文仍留工作区，等其正式完成事件归档，本轮只提交.24接力登记。

.24原13条proposed已归档8e9c9a84；本轮13项由ledger.py update --json/by=ops追加shipped，版本用实际S1.exp25：silent-0019、silent-0020、silent-0021、silent-0124、silent-0006、silent-0024、silent-0025、silent-0125、silent-0063、silent-0077、silent-0120、silent-0126、silent-0129。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 129 item(s), 0 problem(s)。不改first_run/prior，不给未映射0114/0115或0127/0128写status；0128当前学习者新提案由.25批次处理。静默learning-curve CSV按当前登记刷新，其余论文/成本表保持上一轮既有切点。

旧.24独立合入79b415c0的Inferno断言失败、回退256b0eee、定向四例通过以及重跑锁占用全部保留；不建虚假的独立S1.exp24成功版本。保留分支ops-exp24-failed-20261005、2337之前全部原文和失败归档保持，13条经验的实际去处追溯到S1.exp25。学习者原224301 merged=null和调度器原failed状态不回改。

已调用 `bash ops/codex-ops-do.sh learner-recheck 20261005-224301-experience-update` 请求.24继承发布的独立完整外部补测；结果交后续learner-checks，不等待未来事件或把.23旧检查混记。实际检查树以broker锁内结果为准，不预先声明等于0d0c4b69或通过；.25完成后的检查另由调度器办理。无新的Roy待定、人工游戏操作或需重复派发，不停对局/调度，不推送。

用于核实有效发布的原始 `test-source.log`，字节490，SHA256 `f45b110620c5c2338550eec0238d812611d5f5532a672e398b5789b3b410e63b`：

```text

 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/exp/agent


 Test Files  178 passed (178)
      Tests  2019 passed (2019)
   Start at  23:20:55
   Duration  256.09s (transform 7.43s, setup 16.55s, import 27.71s, tests 936.59s, environment 20ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/exp/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  23:25:13
   Duration  2.07s (transform 1.57s, setup 348ms, import 1.54s, tests 56ms, environment 0ms)

```

用于核实有效发布的原始 `test-live.log`，字节495，SHA256 `11c8198f42471dc2ccb0e542cde765ec13d467a63f729e5f3632f6ebc6c94fe6`：

```text

 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  178 passed (178)
      Tests  2019 passed (2019)
   Start at  23:30:12
   Duration  377.23s (transform 14.18s, setup 24.28s, import 47.49s, tests 1389.14s, environment 33ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  23:36:31
   Duration  4.47s (transform 3.48s, setup 840ms, import 3.29s, tests 122ms, environment 0ms)

```
