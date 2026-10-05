# S1.fix26 上线记录

- 2026-10-06 07:16 运维处理 07:13 fix-done：调度批次20261006-062733-fix-batch，学习者原目录learner/runs/20261006-062734-fix-batch。已核实源码b7f081fcc26da4506cb775739bb118cb6cbe4ecc、代码合入995715e80a825a1e316a6b87195a17958002f842、固定发布41bd4a44e4f5148304f072993e04e3685d534616/树a98e7a4af7421a422c517bcf0791f66bd83a128d为live祖先，唯一S1.fix26指向代码合入；学习者自测通过自行上线，无须另设审核。
- 原report.json、report.md、handoff-ops.md与live-result.json已落盘。证据及实现说明沿用学习者：10GPK5XGHCK3 SILENT A3 F9 T5；MGA0CZDDKC0P SILENT A10 F17首试T2、第6次T3。固定六帧验证普通隐秘匕首Cards语义与选择时清理旧续行，未外推升级、缺牌和重复施放；铁甲分支等价，无运维补写知识或公式。
- 最终源及合后沙箱tsc0、193文件2105例、exit0。完整六例撤整组源码5失败1通过、撤接线1失败5通过、恢复6通过；早期五例日志不冒记六例。初稿夹具/字段/接线失败、记录预检冲突及第一次锁忙历史均保持。沙箱外完整检查尚待learner-checks。
- 锁内60c245ee77c9dd317c64f993852ef9dc9f3bf9bc及91d54c329d4b7a09de52ac8f5b12831356594c57自动刷新保留，incoming_knowledge和重叠为空，无生成器变更。live外人知识/notes工作区保持；只同步固定发布，后续新增刷新不覆盖。
- 原silent-0153一条learner:fix-batch proposed逐字归档；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 158 item(s), 0 problem(s)。随后仅0153由CLI/by=ops登记shipped/S1.fix26。0154独立机制及0155独立铭记死亡不随此项登记，旧0150/S1.fix25不重置。
- 未修策略、证据不足和性能专项沿原队列及既有学习者策略任务，不因回报旧称呼新增Roy审批门槛；本轮无Roy新待定。仅记录和机械集成，后续论文数据刷新另记。

原检查日志指纹：

```json
{
  "source-sandbox-final": {
    "bytes": 504,
    "sha256": "68caaf7083223c1fbb5225ff4c42ca680a2f9ee847e8fc92cc837f3f4143e727",
    "exit": 0,
    "files": 193,
    "cases": 2105,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-062734-fix-batch/source-sandbox-final.log"
  },
  "live-sandbox": {
    "bytes": 491,
    "sha256": "75de9bde1fc226fac01f83e78267194ace6c3f94a029bcf337aea913b2ae4bba",
    "exit": 0,
    "files": 193,
    "cases": 2105,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-062734-fix-batch/live-sandbox.log"
  },
  "hidden-complete-without-fix": {
    "exit": 1,
    "summary": "5 failed | 1 passed (6)",
    "bytes": 5194,
    "sha256": "5013e8b0e8d557df4e58fbcf34d63d9109f4662ba44627eb45b8391ce224574e"
  },
  "hidden-wiring-without-fix": {
    "exit": 1,
    "summary": "1 failed | 5 passed (6)",
    "bytes": 1406,
    "sha256": "e36b720c41e450808d98c550dd6be625afcd99f5ebd71553b04bab99c56e940a"
  },
  "hidden-complete-with-fix": {
    "exit": 0,
    "summary": "6 passed (6)",
    "bytes": 241,
    "sha256": "492dc4102187927af4131f4f7d4f79998ec821570b3829d2b7212b61f6fcf21f"
  }
}
```

- 2026-10-06 07:17 原proposed归档debdd5d1194d85953cc9ab95b2228d16effdf505，main同步f41bcdcf219c03cadda35cfaf8f282c0a400e10f，全部1018源码/测试blob一致、其他2123项main最新blob及双方日志保持，七项生成知识保留。CLI/by=ops仅silent-0153追加shipped/S1.fix26；first_run/prior/evidence/repeat不变，0154/0155/0150独立保持；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 159 item(s), 0 problem(s)。只关闭队列对应模型项，其他任务保留，随后论文数据刷新。

- 2026-10-06 07:22 论文数据和学习曲线刷新完成：nice19 python3 ops/paper_dataset.py --no-raw exit0，切点2026-10-05T23:18:08.215Z，五项一致性通过、runs.jsonl决策计数差异为空、key scan CLEAN；行数{"commits.csv": 2732, "decisions_by_label.csv": 17677, "escalations.csv": 3600, "fight_plans.csv": 1461, "runs.csv": 529}。0153 shipped提交f98ef5cdc1284e5a4cd6963895da27ba8d1bd69f；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 159 item(s), 0 problem(s)。仅提交实际生成变化的12项文件及自身记录，其他后台工作保留；完整外部检查待learner-checks，旧失败历史保持。
