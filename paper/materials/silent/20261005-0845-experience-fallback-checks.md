# 经验批次兜底合入记录

记录时间：2026-10-05 08:57 CST。批次20261005-080501-experience-update，学习者源`90ca92012ab870c2549533f52a1594bcc6a12d4e`；live合入`002d835ff9a85590e07dbc6c5aaaabeddd015fbc`、发布`39efdab8b3f79fe78f39a93ed7df9d53fabc58da`，main集成`7fdaa01df9edb151af5de03c38409954df88f5e4`，eval版本S1.exp10。

学习者只修改静默经验：2026-10-05.8→.9，ZZMYZ5UBCG72 A2及此前11局静默证据，新增8、更新15、退役0，active60、16795字符。学习者自测tsc0、150文件1901用例通过；A8/A9各适用56条、15370字符但实际样本0，不作为效果。学习者因另一任务未完成的live合并停止，运维在其完成后按流程兜底，没有增加知识审核或补写机制。

合入前确认无report.py，与源码路径没有重叠，保存8项自动刷新数据`71e5b19a10e55b2704fccc6d3590e54434748db4`；铁甲monster-records是自动报告产出，原样保存，没有人工改动。双方记录全部保留，保留S1.fix8及main的S1.high、high强度任务说明。合后通过固定入口`nice -n 19 bash tools/test-sandbox.sh`（cwd .worktrees/live/agent），tsc0、152文件1906用例exit0，无修改排除名单或重跑；测试树`46df962211d571314adb1b885679761f3291068f`。日志`/tmp/sts2-0845-live-sandbox.log`：

```text

 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  151 passed (151)
      Tests  1895 passed (1895)
   Start at  08:52:01
   Duration  245.05s (transform 7.42s, setup 7.73s, import 20.92s, tests 929.83s, environment 17ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  08:56:07
   Duration  1.46s (transform 1.09s, setup 275ms, import 1.02s, tests 42ms, environment 0ms)
```

只将本批20项台账以by=ops登记shipped/S1.exp10，账本检查通过；silent-0066模型问题保持原状。当前A4局在上线前已经开打，本版经验下一局生效，不能以A3胜利说明新版本效果。完整沙箱外tsc+vitest沿已有动作缺口请求补跑。

A3通关证据：10GPK5XGHCK3，SL读档0，F17/F33/F39/F48受管理战斗均attempt=1、won；首决策2026-10-04T23:42:42.718Z至结束2026-10-05T00:41:20.783Z，3518.065秒。下一局1NZ8FE5F34R9配置2026-10-05T00:44:02.649Z解析A4。原证据来自runs/run-config/decisions/sl-attempts日志；本轮没有ascension-up事件，升级总结待该事件再处理。
