# 静默经验第36批上线确认

- 2026-10-06 08:04 处理08:00 experience-done 20261006-073310-experience-update，实际目录learner/runs/20261006-073311-experience-update。源2d5846a2a309fd8b9e7231e96cef923cb07f1778→实际live fast-forward 2d5846a2a309fd8b9e7231e96cef923cb07f1778→固定已测发布141df6140cada59c3ad4960fd69aebf0a0749eeb/树67147431b6c019048a6f2b61dbcf23074d71837f，唯一S1.exp36。经验.10→.11，新增1更新15（全部补证）退役0、active110/56699字；来源JLN5SK17W4FQ SILENT A10及旧42本角色完局。只按交接核实际合入，无另设审核或运维游戏知识补写。
- 草稿沙箱tsc/vitest0、193文件2105例；最终源码及合后固定沙箱均tsc/vitest0、194文件2112例。运维归档预检最初误把草稿计数按最终套件核对，追加/暂存前停止，现已按原日志纠正；不是学习者或代码检查失败。草稿后同步main并调整证据文字，最终再次通过；合后首过。原草稿、校验和切片日志保留，不冒称只测一次或沙箱外完整通过。锁内incoming仅experience.json、预检0、refresh/overlap空，其他知识blob保持，无生成器改动或重建。
- 原第36节22886字节/SHA256 ecf8cf48c225ce5d192ac291beaae3ba181c8c9d0dd3bf13669a68722b839192与19项19行proposed逐字归档；原行SHA256 e7c170fd2fe0fb3e89a1e29be81c61a93e8ab98b6cea739f02d9e58b6a97aa0a；条目silent-0005, silent-0006, silent-0017, silent-0046, silent-0013, silent-0123, silent-0007, silent-0087, silent-0027, silent-0129, silent-0064, silent-0062, silent-0065, silent-0021, silent-0019, silent-0020, silent-0160, silent-0161, silent-0162。无add/retired，0160/0161/0162及旧first_run/prior/repeat、原上线历史保持。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 162 item(s), 0 problem(s)。
- 随后机械同步固定发布至main并经ledger.py/by=ops登记本批19项shipped/S1.exp36；0159/S1.strategy6和0153/S1.fix26独立不重置。完整外部checks_pending=True，结果留后续learner-checks，不借前批通过。主目录已有后台成本表变更只按本轮实际生成差异处理，无Roy新待定。

源草稿、最终及合后检查指纹：

```json
[
  {
    "exit": 0,
    "files": 193,
    "cases": 2105,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-073311-experience-update/test-source.log",
    "bytes": 491,
    "sha256": "6c03a2c7770f268b64303d3fdfc612d58aa542c165395ffa6f6953d339f30cc8"
  },
  {
    "exit": 0,
    "files": 194,
    "cases": 2112,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-073311-experience-update/test-source-final.log",
    "bytes": 489,
    "sha256": "168cae16164153cc356e7b2bf9bb49315d061831c1f27b95846acf16c5243039"
  },
  {
    "exit": 0,
    "files": 194,
    "cases": 2112,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-073311-experience-update/test-live.log",
    "bytes": 491,
    "sha256": "b5eb2c60c44f42beaeeb5fd32959347cd0f0e4b52c356aa9f0ddfe6e94aa9602"
  }
]
```

- 2026-10-06 08:04 上线登记完成：原第36节和19项proposed归档5e35991b595db01adba1bd596d4b26033d1b0558，main同步5706f2664b8cd841d5c402cdade4a83bb05d794f，全部1020项已测源码/测试blob相同，其他2138项main最新blob及双方日志保持。19项经CLI/by=ops追加shipped/S1.exp36：silent-0005, silent-0006, silent-0017, silent-0046, silent-0013, silent-0123, silent-0007, silent-0087, silent-0027, silent-0129, silent-0064, silent-0062, silent-0065, silent-0021, silent-0019, silent-0020, silent-0160, silent-0161, silent-0162；原first_run/prior/claim/evidence/repeat与历史保持，0159/S1.strategy6、0153/S1.fix26及其他未纳入项未改。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 162 item(s), 0 problem(s)。随后paper --no-raw刷新论文曲线；完整外部检查留后续事件。

- 2026-10-06 08:08 论文数据及学习曲线刷新完成：nice19 python3 ops/paper_dataset.py --no-raw exit0，切点2026-10-06T00:04:49.106Z；五项一致性通过、runs.jsonl决策计数差异为空、key scan CLEAN，行数{"commits.csv": 2747, "decisions_by_label.csv": 17712, "escalations.csv": 3600, "fight_plans.csv": 1461, "runs.csv": 530}。本轮19项shipped提交081efd03236ef75627c13e3c4b138f7023f88fa8；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 162 item(s), 0 problem(s)。仅提交实际生成变化的12项文件及自身记录，其他后台修改保留；S1.exp36完整外部补测仍留后续事件，原草稿、校验和切片日志保持。

- 2026-10-06 08:09 08:08完整补测结案：20261006-073310-experience-update固定发布141df6140cada59c3ad4960fd69aebf0a0749eeb/树67147431b6c019048a6f2b61dbcf23074d71837f沙箱外完整tsc + vitest exit0，245文件2920通过/2跳过（07:56:28起499.48秒）；原日志ops/codex-ops/learner/20261006-073310-experience-update.fallback-67147431b6c019048a6f2b61dbcf23074d71837f.checks.log（61687字节/SHA256 cbdf6be17d3ddedd124be22c0060d0f35d2aa9e6088ebea0491742a6d47f8395），调度器checks_pending=false、checks/fallback_checks对应固定发布树rc0。源/实际合入/发布均为main与live祖先，1020项源码和测试blob及本批经验数据同main，唯一S1.exp36和19项shipped核对；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 162 item(s), 0 problem(s)。沿用main同步5706f2664b8cd841d5c402cdade4a83bb05d794f及CLI shipped提交081efd03236ef75627c13e3c4b138f7023f88fa8，完整补测待办结案，草稿/文字校正/运维归档计数预检历史保持。仅追加本轮结案记录。
