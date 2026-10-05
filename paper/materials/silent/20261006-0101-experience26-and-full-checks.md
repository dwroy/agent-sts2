# 01:01 经验第二十六次增量与独立完整检查

- 2026-10-06 01:05 已核实测试修复批次 `20261006-000206-fix-batch` 的独立完整外部 tsc/vitest exit 0，固定 live `000ab7927ba3e57fa786b7d5f593a6eed290ccd2` / 树 `763287a1d10bebee05218fcff76c561250ee4d66`；232 文件、2846 例通过、2 例跳过，00:52:57 开始、541.02 秒。固定源195869aa为main/live祖先，仅测试夹具改动；上轮完整补测待办关闭，不增加行为版本或新账本条目，不重复提交源码或补测。
- 原日志 `ops/codex-ops/learner/20261006-000206-fix-batch.fallback-763287a1d10bebee05218fcff76c561250ee4d66.checks.log`，61993 字节，SHA256 `64f8c28f8f5efc84eb7cb898c026da3fec7c2aa8036f8b81157d52cbff209b3b`。本次成功不删除首次 herdr 清理断言失败、失败树9fc1e4f8、回退341b75fe及同树一次沙箱复测通过的历史；herdr首次失败根因未定的证据队列保持。
- 本轮经验批次 `20261006-000206-experience-update` 固定学习者源 `c2aba14f9a7a51fa3867360ac996a1e57b336463`，经验 `2026-10-06.1`，只改 `knowledge/characters/silent/experience.json`。学习者自测首过tsc0、179文件2030例，预检decision-log并发追加冲突停止、merged=null保持原回报；运维按完成事件机械兜底，不另设策略审核，不自行修改经验文本。
- 新增2、更新13、退役0，active93→95、lesson51696→53903字；A8/A9各86条44073字、实战样本均0，240片配对增长中位147、最大7874→8021。以上数字引用学习者回报；来源VLV17NUSFS61 SILENT A7与旧32本角色局，完整推理原文在changelog第二十六节及学习者审计目录。
- 学习者第二十六节原文与15条原账本proposed历史归档；条目 `silent-0019,silent-0020,silent-0021,silent-0006,silent-0005,silent-0016,silent-0013,silent-0048,silent-0010,silent-0011,silent-0069,silent-0079,silent-0131,silent-0132,silent-0009`。0132为本角色群蛇机制，0131为头冠机制；0130重复扣挡源码修复不属于本经验批次，不随经验条目登记shipped，也不覆盖后续fix-batch追加的proposed。账本 `/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 134 item(s), 0 problem(s)`；所有first_run/prior/repeat及已有上线历史保持，运维不补游戏知识。
- 经验源尚待锁内实际合入、合后沙箱自测，通过后才登记唯一S1.exp26及对应15项ops shipped、同步main，经验批次完整外部测试另请求自己的learner-recheck。保留live自动知识刷新、双方追加记录及main论文表。无新Roy待定，不停对局/调度，不运行play。

独立完整检查原始摘要（去ANSI显示）：

```text
Test Files  232 passed (232)
      Tests  2846 passed | 2 skipped (2848)
   Start at  00:52:57
   Duration  541.02s (transform 7.02s, setup 10.70s, import 31.28s, tests 1013.21s, environment 22ms)
```

- 2026-10-06 01:13 经验第二十六次增量兜底完成：固定学习者源`c2aba14f9a7a51fa3867360ac996a1e57b336463`→live实际合入`c7ca5d01614905357803b9c644f18ff80d9df703`、发布`8b2688581394344419420a0c341c498d07f03efc`/树`992b9c08c3fc68f57de6c743360e2d4ce2660dcb`，main同步`2472ffd921fe356e1ae5baf9adf8c73913e2759e`。唯一S1.exp26指实际合入，源179文件2030例与合后181文件2038例tsc0首过；知识刷新`000ab7927ba3e57fa786b7d5f593a6eed290ccd2`和全部非经验知识blob保持，main其余1829项源码/记录/论文表保持。不另审策略、不更改经验文字、不重跑相同源码检查。
- 15项原learner proposed与15项ops shipped完整归档，`/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 134 item(s), 0 problem(s)`；first_run/prior/repeat历史保持，0130独立缺陷提案不混记经验上线或重置，0009本次仅经验证据并入，不冒作源码修复。silent学习曲线已刷新；0131与0132机制进入经验文本不等于模拟代码覆盖已实现，未覆盖项沿原队列由学习者处理。
- 已调用`bash ops/codex-ops-do.sh learner-recheck 20261006-000206-experience-update`请求本经验独立完整外部检查，结果交后续learner-checks；不借本轮fix-batch的232文件2846通过/2跳过来冒记经验完成。原预检冲突/merged=null及所有旧失败/回退历史保持。无新Roy待定，不停对局/调度，不运行play。

学习者源固定沙箱：`/home/dw/Projects/agent-sts2/learner/runs/20261006-000206-experience-update/test-source.log`，489字节，SHA256 `0edeabcb53b70e0163a8929e0640e60fe9243f9f002808c351713c53890df8cf`。

```text
Test Files  178 passed (178)
      Tests  2019 passed (2019)
   Start at  00:13:15
   Duration  210.41s (transform 6.18s, setup 8.11s, import 20.01s, tests 789.44s, environment 18ms)

Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  00:16:46
   Duration  1.48s (transform 1.11s, setup 274ms, import 1.05s, tests 48ms, environment 0ms)
```

实际合入后固定沙箱：`/tmp/sts2-0101-live-sandbox.log`，491字节，SHA256 `cd0d37b0ea582de36bac805430772d8d2147c849e25660e02f9de23a82e07f53`。

```text
Test Files  180 passed (180)
      Tests  2027 passed (2027)
   Start at  01:08:04
   Duration  216.97s (transform 7.13s, setup 8.25s, import 21.24s, tests 814.02s, environment 18ms)

Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  01:11:41
   Duration  1.42s (transform 1.07s, setup 280ms, import 993ms, tests 43ms, environment 0ms)
```
