# 静默经验第38批上线确认

- 2026-10-06 09:59 处理09:55 experience-done 20261006-092705-experience-update。源5f0c0515a9dc4de8696f1172af9da17000a79a65→实际live合入f90ba577c3111a9cda7bf1cbfebc645c3d036a01→固定发布62b4caf85ded558e5d07ef840ae882d82bc7ae2c/树0a56f09473c57f5c0a504ce1ae7f5b9965a57462，唯一S1.exp38。经验.12→.13，新增0更新20（全部补证、纯数字0）退役0，active112→112、54675字；来源9TG1RP5LFAAK SILENT A10/F49败及旧44静默完局。仅核对实际合入与学习者交接，不另设审核。
- 源草稿、源最终完整复测与合后固定沙箱均tsc/vitest0、195文件2118例；草稿通过后复测，合后首轮通过，未借用旧测试结果。锁内提交七份自动刷新数据97b8697f6a8e3b669cf40187e7a94138f4b24017，incoming仅experience.json、overlap空/预检0，其余知识blob保持；未改生成器或重建。完整外部checks_pending=True，结果留后续learner-checks。
- 原第38节28761字节/SHA256 b4176075b457bb2756a7f7a5db2dee0a86b8fab79332f837ceb6a5640ebcf2ac与20项20行proposed逐字归档；原行SHA256 3077f0cb83a26fd1c122bd7675e0f04798e1c695f606d827f786dae5dfd7c82f，条目silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0007, silent-0010, silent-0011, silent-0023, silent-0028, silent-0013, silent-0072, silent-0069, silent-0077, silent-0087, silent-0094, silent-0119, silent-0142, silent-0030, silent-0065；无add/retired，first_run/prior/repeat和旧发布历史保留。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 169 item(s), 0 problem(s)。
- 随后机械同步固定发布及已提交刷新至main，经ledger.py/by=ops登记这20项shipped/S1.exp38。silent-0163已shipped/S1.fix27保持，本局属于修前重复观测；main新复盘与其余后台修改保留，0159/S1.strategy6、0153/S1.fix26等不重置。

源草稿、源最终与合后检查指纹：

```json
[
  {
    "exit": 0,
    "files": 195,
    "cases": 2118,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-092705-experience-update/test-source-draft.log",
    "bytes": 492,
    "sha256": "9984bdebfc8bc612d84d29ecd1596b6a36924c87e2bfc61a4c7ec003db6cb431"
  },
  {
    "exit": 0,
    "files": 195,
    "cases": 2118,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-092705-experience-update/test-source.log",
    "bytes": 489,
    "sha256": "3d1489741024191568778692e715f45799940a77a1aa644b5544184b7823a61c"
  },
  {
    "exit": 0,
    "files": 195,
    "cases": 2118,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-092705-experience-update/test-live.log",
    "bytes": 491,
    "sha256": "9a039655e875aef66aac5881c998baa786b57bf40a59fd52c2bc7f1a094c2149"
  }
]
```

- 2026-10-06 09:59 上线登记完成：原第38节和20项proposed归档0f3005c2afd1593c298a1e5a13f0d3cf2d93190c，main同步ee3f13cdb7b79f9f315d596e1b4c90d77e30f344，全部1021项已测源码/测试blob相同，其他2137项main最新blob及双方日志保持。20项经CLI/by=ops追加shipped/S1.exp38：silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0007, silent-0010, silent-0011, silent-0023, silent-0028, silent-0013, silent-0072, silent-0069, silent-0077, silent-0087, silent-0094, silent-0119, silent-0142, silent-0030, silent-0065；原first_run/prior/claim/evidence/repeat与历史保持，0163 shipped/S1.fix27、0159/S1.strategy6、0153/S1.fix26及其他未纳入项未改。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 169 item(s), 0 problem(s)。随后paper --no-raw刷新论文曲线；完整外部检查留后续事件。

- 2026-10-06 10:03 论文数据及学习曲线刷新完成：nice19 python3 ops/paper_dataset.py --no-raw exit0，切点2026-10-06T01:59:38.546Z；五项一致性通过、runs.jsonl决策计数差异为空、key scan CLEAN，行数{"commits.csv": 2779, "decisions_by_label.csv": 17801, "escalations.csv": 3600, "fight_plans.csv": 1461, "runs.csv": 533}。本轮20项shipped提交9bbd3416ead8e256c0a0c8fd1488ed54938194fa；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 169 item(s), 0 problem(s)。仅提交实际生成变化的12项文件及自身记录，其他后台修改保留；S1.exp38完整外部补测仍留后续事件，原分析、校验和切片日志保持。

- 2026-10-06 10:07 10:03完整补测结案：20261006-092705-experience-update固定发布62b4caf85ded558e5d07ef840ae882d82bc7ae2c/树0a56f09473c57f5c0a504ce1ae7f5b9965a57462沙箱外完整tsc + vitest exit0，246文件2926通过/2跳过（09:53:03起522.61秒）；原日志ops/codex-ops/learner/20261006-092705-experience-update.fallback-0a56f09473c57f5c0a504ce1ae7f5b9965a57462.checks.log（63046字节/SHA256 4a2e272887e37fec0d74309686600e8d093a80ccedbff78647acbc625a865675），checks_pending=false、checks/fallback_checks对应固定树rc0。源/实际合入/发布main与live祖先、1021项源码/测试blob同main、唯一S1.exp38与20项shipped核对；既有源草稿后复测/合后首过及decision-log冲突历史保留。本轮只追加结案，详情paper/materials/silent/20261006-1003-a10-postmortem-and-exp38-checks.md。
