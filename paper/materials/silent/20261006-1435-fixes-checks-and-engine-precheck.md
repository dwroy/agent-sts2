# 2026-10-06 14:35 运维事件核对

记录时间：2026-10-06 14:41 CST。

学习者修复批次20261006-104301-fix-batch最终发布`4fb81b17d099018d348942677bfe31dca333a4b1`，树`6d6ad56ba9a8c7bf86808cbee502df8e06ad74b3`。四项源码、实际代码合入与发布均已是main/live祖先；十个源码/测试blob与固定发布相同。观察者已完成main集成，无需重复合并。现有唯一S1.fix29、S1.fix30与S1.exp42保留。后续隔离目录修复84671c29已在main/live，唯一代码差异为learner/lib/engines.ts；本轮完整检查结案只对应旧固定树，不声称覆盖该后续修复。

源与最终合后沙箱均200文件2178例通过。原夹具槽位初稿失败、撤源码失败/恢复通过、glob竞态与历史日志保留，不另设审核或改游戏知识。0171仅余毒维度比较；0166仅学习者已观测力量/手数范围，未知范围仍unknown，原fix28与repeat历史保持；0172未实现，0173和0169独立。

两份完整外部检查按各自批次/固定树逐一核对，checks_pending=false、checks与fallback_checks rc0。第42批原source/merged/version、十项shipped及此前记录保持：

```json
[
  {
    "batch": "20261006-112702-experience-update",
    "release": "4fb81b17d099018d348942677bfe31dca333a4b1",
    "tree": "6d6ad56ba9a8c7bf86808cbee502df8e06ad74b3",
    "rc": 0,
    "files": 251,
    "passed": 2986,
    "skipped": 2,
    "bytes": 61155,
    "sha256": "c0290fcce420acffcacb856992ae58b7cbacf988a23367eccf34d4b39f571ca1",
    "log": "ops/codex-ops/learner/20261006-112702-experience-update.fallback-6d6ad56ba9a8c7bf86808cbee502df8e06ad74b3.checks.log",
    "start": "11:54:29",
    "duration": "602.72s"
  },
  {
    "batch": "20261006-104301-fix-batch",
    "release": "4fb81b17d099018d348942677bfe31dca333a4b1",
    "tree": "6d6ad56ba9a8c7bf86808cbee502df8e06ad74b3",
    "rc": 0,
    "files": 251,
    "passed": 2986,
    "skipped": 2,
    "bytes": 60873,
    "sha256": "0b5239f47912d0e8f7265eca46c0f872780044cc1cee599f2c0ce53e3c47878f",
    "log": "ops/codex-ops/learner/20261006-104301-fix-batch.fallback-6d6ad56ba9a8c7bf86808cbee502df8e06ad74b3.checks.log",
    "start": "12:04:32",
    "duration": "482.73s"
  }
]
```

六批引擎预检失败（四批复盘、两批修复）输出均为空、exit3，stderr完全相同，无新增源码或合入。原失败状态和日志保留，四个待复盘局不补经验或伪造台账：

```text
codex 用不了：/home/dw/.codex/AGENTS.md would be loaded into every brain call (codex reads it whatever the flags); move it, or point BRAIN_CODEX_HOME at a home without one
```

```json
[
  {
    "batch": "20261006-121301",
    "task": "postmortem",
    "rc": 3,
    "runs": [
      "S9UZAK0JP0C0"
    ],
    "missing": [
      "S9UZAK0JP0C0"
    ],
    "stderr": "ops/codex-ops/learner/20261006-121301.err",
    "stderr_bytes": 176,
    "stderr_sha256": "deaede45f7e95d911a3f56b528bdb3377f43c4910e44f401eb94a36ba50c5baa"
  },
  {
    "batch": "20261006-121301-fix-batch",
    "task": "fix-batch",
    "rc": 3,
    "runs": [],
    "missing": [],
    "stderr": "ops/codex-ops/learner/20261006-121301-fix-batch.err",
    "stderr_bytes": 176,
    "stderr_sha256": "deaede45f7e95d911a3f56b528bdb3377f43c4910e44f401eb94a36ba50c5baa"
  },
  {
    "batch": "20261006-124301",
    "task": "postmortem",
    "rc": 3,
    "runs": [
      "MCCK2602T1SR"
    ],
    "missing": [
      "MCCK2602T1SR"
    ],
    "stderr": "ops/codex-ops/learner/20261006-124301.err",
    "stderr_bytes": 176,
    "stderr_sha256": "deaede45f7e95d911a3f56b528bdb3377f43c4910e44f401eb94a36ba50c5baa"
  },
  {
    "batch": "20261006-134301",
    "task": "postmortem",
    "rc": 3,
    "runs": [
      "S9UZAK0JP0C0",
      "UJ0K3G10609Y",
      "U8K28UUGYP3U"
    ],
    "missing": [
      "S9UZAK0JP0C0",
      "UJ0K3G10609Y",
      "U8K28UUGYP3U"
    ],
    "stderr": "ops/codex-ops/learner/20261006-134301.err",
    "stderr_bytes": 176,
    "stderr_sha256": "deaede45f7e95d911a3f56b528bdb3377f43c4910e44f401eb94a36ba50c5baa"
  },
  {
    "batch": "20261006-134301-fix-batch",
    "task": "fix-batch",
    "rc": 3,
    "runs": [],
    "missing": [],
    "stderr": "ops/codex-ops/learner/20261006-134301-fix-batch.err",
    "stderr_bytes": 176,
    "stderr_sha256": "deaede45f7e95d911a3f56b528bdb3377f43c4910e44f401eb94a36ba50c5baa"
  },
  {
    "batch": "20261006-141301",
    "task": "postmortem",
    "rc": 3,
    "runs": [
      "MCCK2602T1SR"
    ],
    "missing": [
      "MCCK2602T1SR"
    ],
    "stderr": "ops/codex-ops/learner/20261006-141301.err",
    "stderr_bytes": 176,
    "stderr_sha256": "deaede45f7e95d911a3f56b528bdb3377f43c4910e44f401eb94a36ba50c5baa"
  }
]
```

按14:31观察者记录，Roy选择隔离brain与learner/ops的Codex运行目录；该介入已报告tsc0、76项learner/ops测试与真实烟测通过。运维不读取或移动全局配置/登录文件，不绕过预检。失败复盘由调度器按一小时/最多三次规则重派，后续结果等新事件；对局继续，未停局或改配置。

本轮按AGENTS运行个人记忆适配器，因外部git.lock只读报同步错误；未加载记忆、未绕过或写中央库。无用户长期记忆写入请求。

两条原学习者proposed追加行逐字入档（工作账本其他行的排列不代提交），然后CLI/by=ops只写两条shipped，所有首次证据、先验、claim、evidence、repeat及旧历史保留。原行SHA256 `82fdef3b4868a53d601e6fca97b7b4a54bf7590702c28e72eb1e8bd819dc0f56`；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 173 item(s), 0 problem(s)。

论文数据刷新完成后追加结果。
