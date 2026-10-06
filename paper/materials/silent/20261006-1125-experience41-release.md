# 静默经验第41批上线记录

- 2026-10-06 11:28 处理11:25 experience-done 20261006-105531-experience-update；学习者记录目录起始时间为105532。源27fb17e4f87c658265856e493f816a8de81ac622→实际live合入a5cbfe3d9e723b2e7c403b02ef5eac627f78c36b→固定发布ef3a3e17a94ff8ef58c3ef7dc9aaf20eb916909d/树0d33879283dc42bd9fbd0500aa0110162a402e3a/唯一S1.exp41，源经验blob与发布一致；学习者自测自行合入，运维只核实、同步与登记。
- 经验2026-10-06.15→.16，新增0更新10（全部补证，纯数字0）退役0，active115、50181字；来源TD1HVGS7H6LB SILENT A10及旧47静默完局，沿10:53费用勘误。未新增用药规则、源码或生成器；本体与自爆、失败读档和同局重启沿原证据分别记。
- 源首轮tsc0/196文件2124例，合后首轮tsc0/198文件2166例；合入时已测live工具基线包括完整mod状态与启动结果判读，本轮机械同步固定已测blob，不重新编写代码。源/合后测试日志及原报告保留；完整外部checks_pending=True，留后续本批learner-checks，不借其他批次通过结果。
- 初次旧经验重叠保护退出3，改前经验blob证明一致后仅decision-log追加冲突；第二次历史论文CSV的CRLF空白检查误报中断，锁内abort恢复，最终保留双方有序日志并首次自测通过。两次流程中断不冒记为测试失败，原记录保留。
- 原第41节及收尾22459字节/SHA256 294dba86b4c5d2c10629a8d3f055b2cfae540d694e3ccbac22b3e185f791e9c6，十项十行proposed 8264字节/SHA256 28d3d1c05d61a4d1f2513d479a7e13fcd4328bf440681bfbf52e1b1a172a95a8逐字归档；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 173 item(s), 0 problem(s)。first_run/prior/claim/repeat和旧上线历史保持，0171比较缺口仍observed，后台0172/0173与新复盘不代提交。本轮同步main后经CLI/by=ops仅十项shipped。

## 原始产出指纹

```json
{
  "handoff-ops.md": {
    "bytes": 1476,
    "sha256": "4d02af49862760f75010cc8c51fd8dcc5d1cee78ca4903c1ed57930f8693b2ac"
  },
  "report.json": {
    "bytes": 1100,
    "sha256": "cf71af887fb8a2b24646d23bea6af2c50b071854c06bb996e35c7c24e1772eb6"
  },
  "test-source-result.json": {
    "bytes": 26,
    "sha256": "3dba18756c6d43e6f46ef5699617c42e51f4bfa51665e1530a2a44ab0a3a5f3a"
  },
  "test-counts.json": {
    "bytes": 53,
    "sha256": "9ede4a42e6188b763ab1606332530596ceb8b49a8f9e51f3329c8cc8494300ef"
  },
  "live-merge.json": {
    "bytes": 4735,
    "sha256": "ff1e07ce21bfaa630c026042c90b64309a175adbf9c6a2addb961d69bbc9aeb9"
  },
  "live-merge-first.json": {
    "bytes": 655,
    "sha256": "706cfb30909e9f94136570b2d390f30367aeb3600fa5ac8be2af6423d6d40196"
  },
  "live-merge-second.json": {
    "bytes": 602,
    "sha256": "ed837fbe2ac17324f1bce968ccd960b51a469184813d504a356f999e61c424d4"
  },
  "test-source.log": {
    "bytes": 492,
    "sha256": "b81e615da12e929e309fe68a39e2a818f60c9f738efce862b3e344ca6e32f08e"
  },
  "test-live.log": {
    "bytes": 491,
    "sha256": "0460646920afaff0856b2e0fa34be6764771e6cc591f3dfc0b63c1a5040c12c3"
  },
  "predecessor-proof.json": {
    "bytes": 242,
    "sha256": "ac5436e62fbd922674fbc2207bf6a7a257d1d24bef3431c1398f2fa8a88667dc"
  }
}
```

- 2026-10-06 11:31 运维codex完成11:25 experience-done 20261006-105531-experience-update登记：源27fb17e4f87c658265856e493f816a8de81ac622→实际live a5cbfe3d9e723b2e7c403b02ef5eac627f78c36b→固定发布ef3a3e17a94ff8ef58c3ef7dc9aaf20eb916909d/树0d33879283dc42bd9fbd0500aa0110162a402e3a/唯一S1.exp41，原第41节/十项proposed归档35d1f7569d6f2143802a3589e71d836d6d94c77f、main机械同步be8573654c85d446aa13009df03b0468665dd1e3。源及合后首轮tsc0/196文件2124例及198文件2166例；全部1026项已测源码/测试blob相同，其他2152项main最新blob和双方有序日志保持。CLI/by=ops仅十项shipped，first_run/prior/claim/evidence/repeat及旧历史保持，0171比较缺口保持学习者现有状态，后台0171/0172/0173新记录及新复盘未代提交，/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 173 item(s), 0 problem(s)。旧重叠保护/CRLF中断及锁内恢复历史保留，不新增 live 合并或源码/知识规则；live实时知识刷新保留，完整外部由调度器本批learner-checks处理。详情paper/materials/silent/20261006-1125-experience41-release.md。
