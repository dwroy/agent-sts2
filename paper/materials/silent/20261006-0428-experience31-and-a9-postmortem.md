# 经验第31批上线与A9复盘归档

- 2026-10-06 04:31 处理04:28两个事件：经验20261006-040345-experience-update exit0，源16a691d1513abe828ad8dab3a352c2cd693d2f14→实际live fef46e7e842ba8216f6220ace845d8e9f4f01d84→固定发布cf6fae73003337e346c73b600d6c3fc0c791c039/树cd31a8d169349e94117a5c5a7be1acacbf35f802，唯一S1.exp31已指向实际代码合入。来源HMVJKM56S4Q8 SILENT A9及旧37本角色完局，经验.5→.6；新增1/更新16/退役0、active102、54501字符，A8/A9各96条52069字符。只机械核实学习者已测产出，不另审或补游戏知识。
- 草稿与文案校正后的最终源均tsc0、188文件2068例，合后首次同数通过，无失败重跑；日志及摘要SHA如下。完整外部检查由调度器补跑，本轮检查点checks_pending=True，未提前判定完整通过。源仅改silent/experience.json；在线七项自动刷新b5c2bd5f64b39f4f0f0d1d452ae2e8e1178b1562已由学习者锁内提交并在发布保留，incoming经验与刷新无重叠，不改生成器或其他角色知识。
- 学习者18项原proposed及第三十一节原文归档，原0147的claim补证校正只来自学习者，first_run仍2SU6XN2AEJRD/A6；0009旧repeat保留，不因本次经验上线改写为本局已经执行或造成已结束胜局。main同步后再经ledger.py/by=ops登记18项shipped/S1.exp31，不重复版本。
- 复盘20261006-041302/F4QKG4J1AJJZ exit0，已有1/1、无缺失，bugs=[]。学习者记录A9/F38史莱姆狂战士终战T6以14血、0挡面对32伤死亡，终战未读档；全局此前SL和首试路径仍按原复盘分账。原新增复盘14265字节/SHA256 9ee0764d580dd8dc86c0897b154e54d45a7ac2d1e4d39936c5a7f93e3f756bfe，9项9行原账本归档；新增0149 observed/prior=unknown，最早证据C48LLXBGKXQ9/A0，不当作A9首次出现，8旧项均support、无repeat或状态/版本改写。原未记录项和受控胜负限制保持，不新增机制代码或修复队列项。
- /home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 149 item(s), 0 problem(s)。未触发的0148策略原行和其他后台记录保留未混提交；本轮不改live工作区、对局或调度，不派重复复盘，无Roy新待定。main同步、18项上线登记和paper_dataset.py --no-raw结果随后追加。

源/合后测试：

```json
[
  {
    "log": "learner/runs/20261006-040345-experience-update/test-source.log",
    "summary": {
      "tsc": 0,
      "vitest": 0,
      "files": 188,
      "cases": 2068
    },
    "bytes": 490,
    "sha256": "1452e0921cc6080f2eb61efb387992a644cd685482b2b108d120afc45e89a207"
  },
  {
    "log": "learner/runs/20261006-040345-experience-update/test-source-final.log",
    "summary": {
      "tsc": 0,
      "vitest": 0,
      "files": 188,
      "cases": 2068
    },
    "bytes": 490,
    "sha256": "e8f2090f2958ee2c036db159a29a0ccccf7fcdbf1004541797e8a9a1a4d4e3e9"
  },
  {
    "log": "learner/runs/20261006-040345-experience-update/test-live.log",
    "summary": {
      "tsc": 0,
      "vitest": 0,
      "files": 188,
      "cases": 2068
    },
    "bytes": 492,
    "sha256": "56a38603c4a0cbf4385b14153b9bfb7b909a19a6a475a36b78f02f4f21ed9cfd"
  }
]
```

原第三十一节：29752字节/SHA256 829715dca0e3a9966332a3459ac54f2babe974538a870e4843057bc09e1fa6e3；经验回报SHA256 9b2ad63601f466e06d6fc98b06822381244238fbeb9f09433b2a74ea29cab0fd，复盘回报SHA256 36cc242bc8fbc555fbad42a3ca99b6955ddfd830bf293d5dab58707f9332a254，完整复盘流learner/runs/20261006-041302-postmortem.jsonl。交接learner/runs/20261006-040345-experience-update/handoff-ops.md原处保留。

- 2026-10-06 04:36 原18条经验提案及9条复盘账本、14265字节原复盘与29752字节changelog已归档f7e160eb12970905308f58451ef312dbc5894a05；main同步固定已测发布cf6fae73003337e346c73b600d6c3fc0c791c039/树cd31a8d169349e94117a5c5a7be1acacbf35f802完成于62d6edc5543682a7289d52263d6294b934366f4b，1009项源码/测试blob一致、8项知识blob来自发布、其余2102项main blob保持。decision-log追加冲突保留双方历史；live工作区未改。
- CLI/by=ops登记18个指定id shipped/S1.exp31：silent-0019, silent-0020, silent-0021, silent-0009, silent-0006, silent-0005, silent-0013, silent-0007, silent-0011, silent-0027, silent-0030, silent-0062, silent-0065, silent-0080, silent-0128, silent-0049, silent-0073, silent-0147。first_run/prior/prior_note/claim/evidence/effect/repeat保持，0147首次证据A6及0009旧重犯不变；0149首次证据C48LLXBGKXQ9/A0、observed，0144旧S1.fix24和0051旧S1.fix5保持，其他任务的0148原始行未混入提交。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 149 item(s), 0 problem(s)。完整外部测试仍checks_pending，待调度器后续事件；随后运行paper_dataset.py --no-raw。不停对局/调度，无Roy新待定。

- 2026-10-06 04:40 本轮论文与成本表刷新完成：nice -n19 python3 ops/paper_dataset.py --no-raw exit0，切点2026-10-05T20:36:25.920Z，五项一致性通过、runs.jsonl决策计数差异为空、key scan CLEAN；行数{"commits.csv": 2655, "decisions_by_label.csv": 17540, "escalations.csv": 3600, "fight_plans.csv": 1461, "runs.csv": 525}，/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 149 item(s), 0 problem(s)。27行原账本、14265字节原复盘及29752字节changelog归档f7e160eb12970905308f58451ef312dbc5894a05，固定发布同步main 62d6edc5543682a7289d52263d6294b934366f4b，18项CLI上线登记dbeb4169f40d57bdb6c84a513dedd11f0804c8f3。本提交只加入本轮生成表与自身记录，其他任务原始账本及后台文件保持。本批完整外部测试仍待后续事件，不停止对局/调度。
