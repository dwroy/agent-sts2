# 静默经验第43批上线记录

- 2026-10-06 15:55 处理15:51 experience-done 20261006-150910-experience-update：源fbd7a45ff75aa66d2c9f52cf8d1b4bcba55a204d→实际live 9bc79a15954e97f00c333f512f802b473a480f23→固定发布da2ccb9230a65ae210b3aafe481d97f66b610141/树57e8952bb9ced9610745c3c18057afd494072f06/唯一S1.exp43，源经验blob与发布一致；学习者自测自行上线，运维机械同步与登记。
- 经验2026-10-06.17→.18，新增2更新9（全补证/纯数字0）退役0，active116→118、50905→52421字；来源L9SGRBB5R698/D4LJ9QMGFB8Q SILENT A10及学习者列出的本角色旧证据、全部原勘误。A8/A9各112条49876字，240配对切片中位+127、最大6191→6319字。未改源码、生成器、其他角色或手写知识，不重新编写游戏规则。
- 两轮草稿固定沙箱及最终定稿源码均tsc0、200文件2178例；两次文字校正后最终复验通过，合后tsc0、201文件2182例。各次原日志分别保留，无失败重跑；独立S1.fix31代码修复在合后基线保留，不把0175经验登记算作0174代码实现。完整外部checks_pending由本批后续事件处理，不借用其他批次检查。
- 第43节原文及收尾24422字节/SHA256 912af1c9601a2af8c10bf58d5faae9fc290e5846c64bb6db817f68550e484826、11项11行原proposed 12094字节/SHA256 d173a6ba8da044a5de6bc1750f3098579022d433186f1b33f45d717d233792cc归档；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 178 item(s), 0 problem(s)。首次证据/先验/repeat与全部旧状态及上线历史保留，其他后台产出不代提交。main同步后仅经CLI/by=ops登记本批11项shipped；0174独立S1.fix31及0172未实现项保持。七项已提交自动刷新逐blob保存，live实时工作区不覆盖，不停对局。

## 原始产出指纹

```json
{
  "test-source-draft.log": {
    "bytes": 492,
    "sha256": "de621b453c873c3c7a8a1496633750c588eb9575351e05b55bd224c7104e4638",
    "files": 200,
    "cases": 2178
  },
  "test-source-draft2.log": {
    "bytes": 492,
    "sha256": "dcf658663da95494bfc769b6193e1facee90934fab82003a840fe447c103a63a",
    "files": 200,
    "cases": 2178
  },
  "test-source.log": {
    "bytes": 492,
    "sha256": "8d1c53c7c80b8e09dcc080806dca37f2e2bc6a6dfe2c69f640b8897fd393ec8a",
    "files": 200,
    "cases": 2178
  },
  "test-live.log": {
    "bytes": 492,
    "sha256": "da0b88cf31f99540e47d483eef096168e2ba78c96b033ba221b6d9e95039a5f5",
    "files": 201,
    "cases": 2182
  },
  "handoff-ops.md": {
    "bytes": 1834,
    "sha256": "27815278f75ad26832642812a6423a629a64c09bac9a1d6f072adeb7c253bb5d"
  },
  "report.json": {
    "bytes": 871,
    "sha256": "cee82e0675e1a3bd8b50333b8c3821ecd1701add06ad05d5a95b15c5bcc802cd"
  },
  "live-merge.json": {
    "bytes": 4906,
    "sha256": "129f968b4e6528931391bfffdb665fbf528c28e8d2a43e73e61b3873a3ee4b93"
  },
  "test-source-result.json": {
    "bytes": 63,
    "sha256": "f13c49c34d3f79b3a8a026175a5c7c286c4f8394cd2c44f06012ab2facbc0896"
  },
  "changelog-section.md": {
    "bytes": 22301,
    "sha256": "7f6bf569a0daaf7f21e541ddc6901907f15b56c55eaef3a238a2f9d49476b333"
  },
  "changelog-footer.md": {
    "bytes": 2120,
    "sha256": "959d6c1f6e9bcb29e6515225af20cebbbb3570b59e9edae93904a7a9fdba17c2"
  }
}
```
