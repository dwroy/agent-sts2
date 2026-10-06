# 静默经验第45批上线记录

2026-10-06 17:37，处理17:33 experience-done 20261006-170126-experience-update。

- 源ab8335ba091e3385036352f04354613cac683cdb→实际live 8807bc1442e7525c8d8f52361e8d45925c9436aa→固定发布56c64ff8c32d6ef1cc0d2febb8252229f7e69133/树a6beac224eb8405df7466b457d08658e67bd54c3，唯一S1.exp45。源经验blob与固定发布一致，源及合后首轮tsc0/vitest0、203文件2194例；完整外部补测留调度器。
- 来源4ANT8D00TP72 SILENT A10/F37及学习者本角色历史。经验.19→.20，新增2、更新12（全加证据/只数字0）、退役0，active118→120/53162→54122字；A8/A9各114条51577字。240配对切片中位+74、单片最多+555、最大6430→6586。只记录学习者产出与实际上线，不另审或新增游戏规则。
- 原第45节含收尾25338字节/SHA256 50713e6a12dcff02943074d1507b80c8fefcd4d5bb9a7ae57aba17d7d475536a，原15行proposed 14227字节/SHA256 3ef1623eff35700c7748ccdb36e056fec02e6ddc5c887cdcfdda802259cdf538归档；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 186 item(s), 0 problem(s)。旧first_run/prior/claim/证据/repeat/版本历史保留，0181既有repeat不另加、0183首证LRN/A0及prior=yes保持。
- 七份自动知识刷新823ccc3223dac21d430433235b63d79566d7b362已由学习者提交，冲突重叠为空；其他知识blob保持，无生成器或手写知识变更。同节SL原“另三条”追加更正为“另两条”，旧文保持；不重写复盘或统计口径。main同步后CLI/by=ops仅本批15项shipped，其他批次保持。

## 原始产出指纹

```json
{
  "test-source.log": {
    "bytes": 491,
    "sha256": "078bfe1675b4da9b00c5b40232a7e547a257663005a719fae90ad0e2bfda5155",
    "files": 203,
    "cases": 2194
  },
  "test-live.log": {
    "bytes": 491,
    "sha256": "659104f54699b793a3a19bc9e13843500392049f427d757811747d70dd4c3f44",
    "files": 203,
    "cases": 2194
  },
  "handoff-ops.md": {
    "bytes": 2254,
    "sha256": "6c693e390525eecf38c652cbff7ae756af477e464abbc7ad6edeb86b6bd360e8"
  },
  "report.json": {
    "bytes": 1124,
    "sha256": "23f1aed371a87891291685e1c269395dfdf927fc43479072da323371fa9c0707"
  },
  "live-merge.json": {
    "bytes": 4998,
    "sha256": "a564556509cd5ee193a3e75c0a9734348a0c68c55d19ff2470d5d071a2973143"
  },
  "changelog-append-proof.json": {
    "bytes": 208,
    "sha256": "bd42dac0ac18349f72b401c747beae77ab46845d86d1cd6c8d94074750524ae4"
  },
  "changelog-section.md": {
    "bytes": 23373,
    "sha256": "d18978c3ec0a82a496afd71468e643ce9fc3e143bf4553ae27391259b3d44281"
  },
  "changelog-footer.md": {
    "bytes": 1964,
    "sha256": "908f0223f1bde5936380703e2552d585b5ee60255509c99aa93f97be2995ea4b"
  },
  "ledger-updates.jsonl": {
    "bytes": 13462,
    "sha256": "e962c8fede2dfdf15a8d936433433f0577b49a04547a48a0cdb84947a705037b"
  },
  "mechanism-validation.json": {
    "bytes": 23588645,
    "sha256": "6308bbe70ac4a56248c2e06c38aa271478c341ad6b531c99f425ed41a669cad3"
  }
}
```

- 2026-10-06 17:39 运维codex完成17:33 experience-done 20261006-170126-experience-update上线登记：源ab8335ba091e3385036352f04354613cac683cdb→实际live 8807bc1442e7525c8d8f52361e8d45925c9436aa→固定发布56c64ff8c32d6ef1cc0d2febb8252229f7e69133/树a6beac224eb8405df7466b457d08658e67bd54c3/唯一S1.exp45；原第45节含收尾25338字节与15项proposed归档88a52203683c7f478db2e518b75a3de8f5a97914，main机械同步5f4ae04a9fbabe8daf35d434d6195b222b329bf9。源/合后首轮tsc0、203文件2194例，原日志保留；全部1035项源码/测试blob同固定发布且无源码改动，其余2173项main最新blob和双方日志历史保持。CLI/by=ops仅15项shipped，first_run/prior/claim/证据/repeat及旧上线历史保持，0181既有repeat不另加/0183 prior=yes，/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 186 item(s), 0 problem(s)。经验.19→.20新增2更新12、active120/54122字与七项823ccc32已提交知识刷新同步，SL数量原文及追加更正保留；完整外部补测待本批learner-checks，不重复live合并、版本、论文刷新或测试，对局照常。详情paper/materials/silent/20261006-1733-experience45-release.md。
