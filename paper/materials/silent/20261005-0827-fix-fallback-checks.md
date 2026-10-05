# 终帧统计修复兜底检查

记录时间：2026-10-05 08:43 CST。批次20261005-081301-fix-batch，固定学习者源`098a54719bae87b909b25174a73ccebd68a17a61`，live合入`87e64393e5f2c3013765cf72713d4fa2d1b9d03b`，生成数据提交`adc02237539d1fb26076e6fadb7d495338c0ebb4`，发布`45965f496135d8755c69edbadb3eddafbddf703a`、eval S1.fix8，main集成`6713c9e7d24880f8153d89cffdd65c2bf8e46fad`。

来源CSBR5CRDWQNB A2 F17 T9及08:05统计提案。学习者提交前tsc0、152文件1906用例通过；终帧固定回归撤源码23≠40退出1、恢复退出0，另核对较高铁甲回血终点和缺失/跨房间终帧，详见learner/runs/20261005-081301-fix-batch/handoff-ops.md及回归日志。

因decision-log冲突未合入，运维非阻塞取得live锁、确认无知识刷新、保留双方全部记录，合入后运行固定入口`nice -n 19 bash tools/test-sandbox.sh`（cwd .worktrees/live/agent），无重跑或修改排除名单；tsc0、152文件1906用例exit0，测试树`13bee6f5bf97639ddddcf5a50892ffa5ed00eaff`。原始日志`/tmp/sts2-0827-live-sandbox.log`：

```text

 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  151 passed (151)
      Tests  1895 passed (1895)
   Start at  08:31:46
   Duration  237.34s (transform 8.19s, setup 9.76s, import 26.36s, tests 887.24s, environment 18ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  08:35:44
   Duration  1.51s (transform 1.13s, setup 273ms, import 1.08s, tests 50ms, environment 0ms)
```

随后按任务流程运行`nice -n 19 python3 knowledge/builders/build-monster-db.py --character silent`（cwd live），exit0，生成共同怪物事实和静默角色记录；铁甲角色文件哈希未变。共用解析器未来刷新其他角色时也修同类低终帧统计，较高回血终点保持既有区分，不宣称未来所有角色统计都等价。原始日志`/tmp/sts2-0827-monster-rebuild.log`：

```text
105 monsters, 7306 fights (by ascension {'0': 860, '1': 66, '2': 245, '3': 248, '4': 201, '5': 256, '6': 65, '7': 550, '8': 3376, '9': 1439}) in 52.8s -> /home/dw/Projects/agent-sts2/.worktrees/live/knowledge/common/monster-db.json
  silent: 11 bosses, 227 fights -> /home/dw/Projects/agent-sts2/.worktrees/live/knowledge/characters/silent/monster-records.json
```

主目录集成的源码及knowledge与已检查源码和已生成live数据一致，因此不重复测试记录数据。关联账本silent-0040只登记终帧子项发布为shipped，原boss-damage跨SL回合拼接仍在队列待修，禁止用本次状态声称其整体解决。完整沙箱外tsc+vitest待有权限执行方補跑，原merged=null未触发调度器检查且无补跑白名单动作，沿05:44/08:05/08:16既有请求追加本批。
