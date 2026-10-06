# 静默经验第40批合入兜底

- 2026-10-06 10:52 处理10:50 experience-done 20261006-102554-experience-update，exit0/merged=null，来源26ae625bb01700cc56b7d96084294109e0e97f0b、经验2026-10-06.14→.15。本源仅experience.json，学习者源首轮沙箱tsc0/195文件2118例exit0；仅核实自测与交接，不另设审核。新增1/更新17（12补证、5压缩、纯数字0）/退役0，active114→115、正文56688→49252字；来源4D4J8USKCPAV SILENT A10及旧本角色证据，含10:24复盘勘误，未新增用药规则或手写知识。
- 学习者锁内merge-tree预检仅decision-log追加冲突，未实际merge/未合后测试/未登记版本或shipped；原merged=null/预检退出1/流程退出3均保留，不记为代码或测试失败。运维按授权保留双方原记录后兜底；若刷新或锁仍忙，不等待或停止对局，由调度器后续事件续办。
- 原第40节24813字节/SHA256 c719bfbfc2737ba5946a1f2aad90f8be981a461a11f96b4d15101497edd4d737与17项17行proposed（1add、16update）逐字归档，账本原行SHA256 e0db9e75456e3db5a551c6eeb827f1e37adf92f6fb09283c675b8bca77db0b10；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 170 item(s), 0 problem(s)。条目：silent-0170, silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0007, silent-0013, silent-0027, silent-0046, silent-0030, silent-0012, silent-0134, silent-0011, silent-0017, silent-0064, silent-0080。0170钓鱼竿first_run=1NZ8FE5F34R9/A4、prior=yes按学习者保留，0009无本局repeat，0166独立shipped/S1.fix28及全部旧先验/证据/repeat历史保持；实际合入并合后测试通过后才登记本批shipped。

源自测与预检日志指纹：

```json
{
  "report.json": {
    "bytes": 1017,
    "sha256": "76b929ada447246890e1c0547479cb3ad575158b8751995d1c4dde8c1559b963"
  },
  "handoff-ops.md": {
    "bytes": 3324,
    "sha256": "8148bdb8990a8d75f3c433e9d8063c5f58fd2f31f792193184d276193456b9e6"
  },
  "test-source-result.json": {
    "bytes": 185,
    "sha256": "b7378a293cc3f28074f9e8ba1eb979cea4f42c2e363d6c2458609e4986d9bb32"
  },
  "test-source.log": {
    "bytes": 489,
    "sha256": "c8f11b54a368752966874ae4adcc2c0fa6f65b9a6ec183ba8fe1d7829466ba6f"
  },
  "merge-tree-locked.txt": {
    "bytes": 403,
    "sha256": "ad84496394799040ce7ab133dcad62e700cb287acbaa566267a9bb13fc048862"
  },
  "merge-live.log": {
    "bytes": 61,
    "sha256": "2a58d1fe1cfa72901dd1411bee88b9cec28a1dad28cf9d7ba84d326b13908963"
  }
}
```

- 2026-10-06 10:58 上线登记完成：原第40节和17项proposed归档d967edbc168426395f0e9284e5435d427da97119，main同步9f54642309922358771dbd0d8036ff7ccc1a64d2，全部1023项已测源码/测试blob相同，其他2145项main最新blob及双方日志保持。17项经CLI/by=ops追加shipped/S1.exp40：silent-0170, silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0007, silent-0013, silent-0027, silent-0046, silent-0030, silent-0012, silent-0134, silent-0011, silent-0017, silent-0064, silent-0080；原first_run/prior/claim/evidence/repeat与历史保持，0166 shipped/S1.fix28、0009原状态及其他未纳入项未改；0170最早1NZ8FE5F34R9 A4及prior=yes保持。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 171 item(s), 0 problem(s)。随后paper --no-raw刷新论文曲线；完整外部检查留后续事件。

- 2026-10-06 11:03 论文表与学习曲线刷新：nice19 python3 ops/paper_dataset.py --no-raw exit0，切点2026-10-06T02:59:01.059Z，五项一致性通过、runs.jsonl决策计数差异为空、key scan CLEAN，行数{"commits.csv": 2812, "decisions_by_label.csv": 17867, "escalations.csv": 3600, "fight_plans.csv": 1461, "runs.csv": 535}。原回报归档d967edbc168426395f0e9284e5435d427da97119，固定发布机械同步main 9f54642309922358771dbd0d8036ff7ccc1a64d2，17项shipped登记c1fd9898e28067caf7b890f91df10e421a37f58e；本轮仅实际生成变化的12项表及自身记录提交。沙箱外完整测试仍待调度器本批learner-checks，不冒用其他批次通过结果。
