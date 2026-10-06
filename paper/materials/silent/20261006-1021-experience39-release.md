# 静默经验第39批上线确认

- 2026-10-06 10:23 处理10:21 experience-done 20261006-100106-experience-update：源6c787e3ecfafa59af35ec0523b93ba215c86e391→实际live合入c1f61de9136d1be16bebd8eed60a54e14f9ebba0→固定发布eabdd307b11199de406e5eed5f1dedad0a39f431/树fc98367e7c2304dcb49102ee2250c4dfd9602048，唯一S1.exp39。经验.13→.14，新增2更新10（全部补证、纯数字0）退役0，active112→114、56688字；来源JQPT83P8KDSZ SILENT A10/F25及各条旧静默证据。仅核对学习者交接与实际合入，不另设审核。
- 源与合后固定沙箱均tsc/vitest0、195文件2118例，均首轮通过。锁内提交七份自动知识刷新b56ada670f3edc8a3236f5141e8fd3cf36c46d8d，incoming仅experience.json、overlap空/预检0，其余知识blob保持；没有生成器修改。临时publish.py首次括号语法错误发生于登记执行前，原merge-live.log保留；学习者修正后重新取锁，仅重跑登记，publish-retry.log确认上述固定发布，测试未失败或重跑。完整外部checks_pending=True，结果留后续learner-checks。
- 原第39节23174字节/SHA256 8fbf0ed2fd5ae17582cc7b94b733dd97662089c19cecd1f0d0f1299cc982ccad与12项12行proposed逐字归档；原行SHA256 51cae8775f3f30c18a45a56071ba8e87ebde90a51927b3d1cd985c009273dc59，条目silent-0019, silent-0020, silent-0021, silent-0006, silent-0007, silent-0011, silent-0046, silent-0088, silent-0050, silent-0167, silent-0168, silent-0169；没有add/retired。0169的first_run=XYYQYBRM2A01/A1及claim/证据是学习者按旧日志追加的更正，保留prior=unknown和全部旧行；0168斗篷扣勘误/prior=yes保持。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 169 item(s), 0 problem(s)。
- 随后机械同步固定发布及已提交刷新至main，经ledger.py/by=ops登记这12项shipped/S1.exp39。0166纯代码缺口仍observed/队列未关闭，本批经验更新不冒记为代码修复；0163/S1.fix27及其余未纳入项保持。main最新记录与live实时知识刷新保留。

源与合后检查指纹：

```json
[
  {
    "exit": 0,
    "files": 195,
    "cases": 2118,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-100106-experience-update/test-source.log",
    "bytes": 489,
    "sha256": "ca764a1866a01c403bd47b752323cc0bf0fcbcf3a9ec8227b1e1104117a40498"
  },
  {
    "exit": 0,
    "files": 195,
    "cases": 2118,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-100106-experience-update/test-live.log",
    "bytes": 491,
    "sha256": "5ba6e071ce095fc212a5647772cfc903f010fa237cc66fdbdfa0a877d4f7fc03"
  }
]
```

- 2026-10-06 10:24 上线登记完成：原第39节和12项proposed归档56c69884f7cf82a478c27aba7dc90b10f91ec8bd，main同步da5b1802ea25ac8cf45cd46c9f31199aa5365ed6，全部1021项已测源码/测试blob相同，其他2140项main最新blob及双方日志保持。12项经CLI/by=ops追加shipped/S1.exp39：silent-0019, silent-0020, silent-0021, silent-0006, silent-0007, silent-0011, silent-0046, silent-0088, silent-0050, silent-0167, silent-0168, silent-0169；原first_run/prior/claim/evidence/repeat与历史保持，0166仍observed、0163 shipped/S1.fix27及其他未纳入项未改；0169学习者旧帧更正与0168斗篷扣勘误保留。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 169 item(s), 0 problem(s)。随后paper --no-raw刷新论文曲线；完整外部检查留后续事件。

- 2026-10-06 10:28 论文数据及学习曲线刷新完成：nice19 python3 ops/paper_dataset.py --no-raw exit0，切点2026-10-06T02:24:13.317Z；五项一致性通过、runs.jsonl决策计数差异为空、key scan CLEAN，行数{"commits.csv": 2791, "decisions_by_label.csv": 17826, "escalations.csv": 3600, "fight_plans.csv": 1461, "runs.csv": 534}。本轮12项shipped提交605232e51a06fd6a74a39547f0a419c7fe6e2b82；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 169 item(s), 0 problem(s)。仅提交实际生成变化的12项文件及自身记录，其他后台修改保留；S1.exp39完整外部补测仍留后续事件，原分析、校验和切片日志保持。
