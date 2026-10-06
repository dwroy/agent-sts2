# 静默经验第37批上线确认

- 2026-10-06 08:51 处理08:50 experience-done 20261006-082746-experience-update。源65b1a45b0192b744b6c46f9e7174f3c2156f093c→实际live合入28bdbfc6c9de5eb802724351a199e1a20c67b41c→固定发布3cbc6955b270538e452d19118bab91a949305ab3/树c9cfdff305a4fc75aecd0ecc7be5ea1aac9d30f0，唯一S1.exp37。经验.11→.12，新增2更新16（补证14、仅压缩2、纯数字0）退役0，active110→112、56699→54154字；来源JMH5C51RLN4E SILENT A10/F49及旧43静默完局。仅核对实际合入及交接，不另设审核。
- 源与合后固定沙箱均tsc/vitest0、194文件2112例、首轮通过。锁内提交七份自动刷新数据30cfa6d7a20951ae21d780e74c5e7026166d1ceb，incoming仅experience.json、overlap空/预检0，其余知识blob保持；未改生成器或重建。完整外部checks_pending=True，结果留后续learner-checks。
- 原第37節27542字节/SHA256 5b83dd77bc237ba00991342af9434ede23fe4c393a2c589ffa464f848f64fe68与18项18行proposed逐字归档；原行SHA256 0e0ecaa7e5418b06d41954c207eb6d9622e77ba684e6be7a6893d3319b4abec6，条目silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0007, silent-0011, silent-0013, silent-0027, silent-0028, silent-0024, silent-0025, silent-0077, silent-0138, silent-0129, silent-0142, silent-0164, silent-0165；无add/retired，first_run/prior/repeat和旧发布历史保留。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 165 item(s), 0 problem(s)。
- 随后机械同步固定发布及已提交刷新至main，经ledger.py/by=ops登记这18项shipped/S1.exp37。连续Boss投影缺陷0163和main新复盘/修复队列保持，交原学习者修复流程；0159/S1.strategy6、0153/S1.fix26等不重置。

源与合后检查指纹：

```json
[
  {
    "exit": 0,
    "files": 194,
    "cases": 2112,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-082746-experience-update/test-source.log",
    "bytes": 491,
    "sha256": "bc366e01b828d8dc1bb1ae6ca52f951a979e076b19b5be572339f0f08f89f2ce"
  },
  {
    "exit": 0,
    "files": 194,
    "cases": 2112,
    "log": "/home/dw/Projects/agent-sts2/learner/runs/20261006-082746-experience-update/test-live.log",
    "bytes": 491,
    "sha256": "bafc54948284628ac11db92166d746c17aef5a6f7c8cc4068e484e157de5f9a3"
  }
]
```
