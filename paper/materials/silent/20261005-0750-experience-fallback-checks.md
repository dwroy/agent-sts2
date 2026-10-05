# 2026-10-05 两次静默经验兜底检查

记录时间：2026-10-05 08:02 CST。固定沙箱入口为`nice -n 19 bash tools/test-sandbox.sh`，从live的agent目录执行；保留固定排除列表，无重跑。

- 20261005-063057-experience-update：源`0d469a227c080f8dd460e40352ee10dfee3770b2`，合入`0f34d1c43820371749920bde8e378b598f67fa33`，发布`fe4b466fc17a9bd41a3b1d1a2b82c5d389fd0de1`，版本S1.exp8、经验2026-10-05.7。tsc退出0；vitest 150文件、1901用例通过，退出0。测试树`9e080b1f1942c48a723a8f35cc39f56a0af19de0`，原始日志`/tmp/sts2-0750-exp7-live-sandbox.log`。
- 20261005-072823-experience-update：源`267128cdd633134b614d3ff91392a5ec7128d8ff`，合入`972303c55c0b1ab55453c8f44d967ccf5f53a3f6`，发布`62faa08a848fa97d38c810dd1294e2511db17dfe`，版本S1.exp9、经验2026-10-05.8。tsc退出0；vitest 150文件、1901用例通过，退出0。测试树`6c48035f4876132f4fa30d2d31579fa4f35b1733`，原始日志`/tmp/sts2-0750-exp8-live-sandbox.log`。

经验.7合并前，保留已解冲突的c603f398暂存树及七项后续自动刷新数据；重新测试包含刷新数据的工作树。经验.8只改变静默经验文件，保留刷新及历史后单独执行合入检查。机械同步main后代码及knowledge与最终已测live逐文件相同，因此不重复测试。沙箱外完整检查仍需要调度器补跑，相关既有动作缺口保留。

## 固定沙箱检查原始输出

### S1.exp8 / 2026-10-05.7

```text

 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  149 passed (149)
      Tests  1890 passed (1890)
   Start at  07:54:28
   Duration  224.32s (transform 5.91s, setup 6.90s, import 18.01s, tests 852.23s, environment 16ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  07:58:13
   Duration  1.35s (transform 1.02s, setup 258ms, import 956ms, tests 39ms, environment 0ms)
```

### S1.exp9 / 2026-10-05.8

```text

 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  149 passed (149)
      Tests  1890 passed (1890)
   Start at  07:58:18
   Duration  194.61s (transform 5.67s, setup 6.56s, import 17.04s, tests 735.42s, environment 15ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  08:01:34
   Duration  1.36s (transform 1.02s, setup 254ms, import 965ms, tests 40ms, environment 0ms)
```
