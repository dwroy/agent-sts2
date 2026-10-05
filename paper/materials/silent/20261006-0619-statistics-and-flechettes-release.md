# 重犯统计与飞镖模型修复上线确认

- 2026-10-06 06:22 处理06:19 fix-done 20261006-053524-fix-batch；学习者实际目录learner/runs/20261006-053525-fix-batch（批次名与开始记录秒数不同）。统计源af5c0fa041fbc5b97174490137301a6f6291d92d已在第33批随已测发布同步main，工具无行为版本、无对应bug-infra，不重设0009/0052。飞镖源72c1640b3271352e1a744d3997ede4c5fe10e2bd→实际代码合入851e1bafb037482de9d06f018e203343a684535d→最终发布1ee4de7d668835de92ad2b47423a19ffdb4ae4df/树68c4c14b4db5becbaa5dc1b49966ad204ee3128f，唯一S1.fix25；刷新36ccac08e3560f9a27f97a98da21ea56f29933c9保持。
- 只机械确认学习者产出，不另设审核或自行改机制。证据和范围沿原report.json/交接：9YBKCNBFP0X5 SILENT A4 F43 T4、HMVJKM56S4Q8 A9 F33第6次T3、G403VCZ3BH1B A9 F48重打T11；九个固定帧，仅已观察原手牌技能离手范围，未知抽牌/升级/转换边界不外推，铁甲等价。撤源3失败1通过、恢复4通过；初稿通过后补兼容边界，最终源/合后tsc0、192文件2099例，无失败/超时重跑。统计撤源Python两断言失败、恢复两例通过、源/合后191文件2095例。
- 原0150 proposed一行归档，后续只经CLI/by=ops登记0150 shipped；0151已学机制、0009/0052历史与0153隐秘匕首待实现分别保留。保血/留药/路线等原策略事项仍交学习者既有独立任务，不向Roy索取游戏知识；性能/证据不足项沿原队列，不新设审批。
- 本批完整外部checks_pending=True，等调度器完成事件，不提前报完整通过。第34批固定源c4e3c9ac7c053d567be773d011849503a8a994f3续办一次非阻塞锁仍busy/exit75，未动live或提前S1.exp34/8项shipped，继续原交接。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 155 item(s), 0 problem(s)。不等待/轮询、不停对局/调度。

原自测日志校验：

```json
[
  {
    "exit": 0,
    "files": 191,
    "cases": 2095,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-053525-fix-batch/source-sandbox.log",
    "sha256": "b3c00cdf623b70ebf57bd4fca6c6b78490af5cee017e80916ef68ab911f8af8a"
  },
  {
    "exit": 0,
    "files": 191,
    "cases": 2095,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-053525-fix-batch/live-sandbox.log",
    "sha256": "8d6ab13edb42a5ad3c212d452b1495ed66eff207b70c1268a217beeb9b6cf0fd"
  },
  {
    "exit": 0,
    "files": 192,
    "cases": 2099,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-053525-fix-batch/flechettes/source-sandbox.log",
    "sha256": "142fbac987ede4d708b85707c02d8d171af9e20e3c1af6dadcef7d1232f4bea7"
  },
  {
    "exit": 0,
    "files": 192,
    "cases": 2099,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-053525-fix-batch/flechettes/live-sandbox.log",
    "sha256": "a7b5480de8e01e0ead3740d1fce5ad3b822313be08f7b6e477be78ba4f13bd56"
  }
]
```
