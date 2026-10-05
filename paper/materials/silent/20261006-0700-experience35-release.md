# 静默经验第35批上线确认

- 2026-10-06 07:02 处理07:00 experience-done 20261006-062733-experience-update。源7bcee3ebd8d8f452253c9eedaf7d14b10cc29f17→实际live 1c85d0a7e6f176a528f7043d5019e0fffdcc5752→固定已测发布eda90a6c02bbb411bb74caed8f11cca718fc31b4/树019b013e07a395e26e85627debd31b4877a2a4fa，唯一S1.exp35。经验.9→.10，新增2更新9（全部补证）退役0、active109/54484字；来源25226ZFLNR1J SILENT A10及旧41本角色完局，42局740房32实死。只核实际合入与原回报，不另审或添加游戏知识。
- 最终源和合后固定沙箱tsc/vitest0、192文件2099例。首次源码测试误设CHARACTER=silent导致默认角色夹具失败42文件156例，移除该环境后重跑一次通过；原日志learner/runs/20261006-062734-experience-update/test-source.log（207587字节/SHA256 a347e64c6702eb952bcf07bef3f6ed8344ca9380d64b8dccd115790feb4e6585）完整保留，合后首过。原preflight0、刷新/知识重叠空、其他知识blob保持；后续60c245ee自动刷新不覆盖。
- 原第35节24324字节/SHA256 b908815fed3b199c807fca9685c6d301c186355dd404e59d077f2594acc947b3与12项12行proposed归档，原行SHA256 7a8c609518ab4783104fb8ba2cc576654ed6f9ff56e7293d7f94c47fcb724502。新增0158为石头观察，first_run ZZMYZ5UBCG72/A2、priorunknown；0156/0157保留25226ZFLNR1J/A10，所有旧先验、首次局、repeat及历史保持。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 158 item(s), 0 problem(s)。
- 随后机械同步固定发布至main并经ledger.py/by=ops登记12项shipped/S1.exp35。旧0153模型缺口及0150/S1.fix25独立，不重置。完整沙箱外补测checks_pending=True留后续learner-checks；不借前批通过，不重测记录类提交。无Roy新待定。

源重跑与合后摘要原文件：

```json
[
  {
    "exit": 0,
    "files": 192,
    "cases": 2099,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-062734-experience-update/test-source-retry.log",
    "bytes": 492,
    "sha256": "2024be1679a64c29385d701439f48f438dc96b73b4220861ad7c2942d155f2aa"
  },
  {
    "exit": 0,
    "files": 192,
    "cases": 2099,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-062734-experience-update/test-live.log",
    "bytes": 494,
    "sha256": "a70cf7b7baffde4e0247a50f700b8f3ff0cf6ac0f5eadd371bcf32ab6359c9bf"
  }
]
```

- 2026-10-06 07:03 上线登记完成：原第35节和12项proposed归档2233a3c3bc950adf6f4f47c85dec4e63530142ba，main同步f6fd58890494aca67a5a3738cf50958fb6e06b6e，全部1016项已测源码/测试blob相同，其他2131项main最新blob及双方日志保持。12项经CLI/by=ops追加shipped/S1.exp35：silent-0005, silent-0006, silent-0011, silent-0019, silent-0020, silent-0021, silent-0024, silent-0025, silent-0027, silent-0156, silent-0157, silent-0158；原first_run/prior/claim/evidence/repeat与历史保持，0150/S1.fix25、0153及其他未纳入项未改。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 158 item(s), 0 problem(s)。随后paper --no-raw刷新论文曲线；完整外部检查留后续事件。

- 2026-10-06 07:07 论文数据及学习曲线刷新完成：nice19 python3 ops/paper_dataset.py --no-raw exit0，切点2026-10-05T23:03:56.502Z；五项一致性通过、runs.jsonl决策计数差异为空、key scan CLEAN，行数{"commits.csv": 2723, "decisions_by_label.csv": 17662, "escalations.csv": 3600, "fight_plans.csv": 1461, "runs.csv": 529}。本轮12项shipped提交27acbb476d7deb2030f5b3fb720836f3f801a313；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 158 item(s), 0 problem(s)。仅提交实际生成变化的12项文件及自身记录，其他后台修改保留；S1.exp35完整外部补测仍留后续事件，旧失败历史保持。

- 2026-10-06 07:09 07:08完整补测结案：20261006-062733-experience-update沙箱外完整tsc + vitest exit0，243文件2907通过/2跳过（06:57:33起480.32秒）；原日志ops/codex-ops/learner/20261006-062733-experience-update.fallback-cc1a0f5fa4b926a38a97ed740ba472498f0039b4.checks.log（60066字节/SHA256 4280b4ba748e951f74b883a3a7cf8afcb7f0e04f7e205a3b987cc718a2362166），调度器checks_pending=false、checks/fallback_checks对应树rc0。此次固定检查提交60c245ee77c9dd317c64f993852ef9dc9f3bf9bc/树cc1a0f5fa4b926a38a97ed740ba472498f0039b4为登记发布eda90a6c02bbb411bb74caed8f11cca718fc31b4之后的自动刷新，只改monster-records/monster-db/move-model三份生成数据；该提交为live祖先，源/实际合入/登记发布均为main/live祖先，1016项源码/测试blob与main相同，experience内容及唯一S1.exp35一致。自动刷新留在live，沿用main同步f6fd58890494aca67a5a3738cf50958fb6e06b6e与12项shipped提交27acbb476d7deb2030f5b3fb720836f3f801a313，完整补测待办关闭；原角色环境失败/重跑历史保留，本轮只追加记录。
