# 精确切击手牌重算修复上线记录

- 2026-10-06 10:39 处理10:35 fix-done，批次20261006-101302-fix-batch，exit0。学习者源码8b9bacbebb20eaaa1133a9945da6c7abfcda745d→实际代码合入4f4d11a7e4ce4d42ce14536817fc63a1d48b8fde→固定发布be0ee6df1395b2373a88e0bf222a6e89312b0945/树b71d2d537b2e6a140f2a98f813c418b2306f0243；唯一S1.fix28已指向实际代码合入。四项源码/测试blob与来源完全一致，已核实为live祖先；运维机械同步main与登记上线，不另设审核。
- 证据仅转录学习者交接：JQPT83P8KDSZ SILENT A10 F25第二次T3，01:11:54.480Z五手5伤，后空翻后01:11:56.432Z六手3伤，打击离手后01:11:57.297Z五手5伤，精确切击后01:11:58.163Z敌143血4挡→142血0挡。范围限原普通牌已观测五/六手，其他数量、升级、变形及修正规则未验证、不外推；铁甲战士及缺角色上下文保持旧行为。只登记silent-0166模型修复，独立机制0169/S1.exp39保持。
- 最终源及合后沙箱tsc0，各196文件2124例exit0，首次完整运行通过；撤两处源码且保留固定夹具/测试，5失败1通过；恢复6通过，含原眩晕/首帧回归合跑3文件17例。初稿resolveEffects作用域错误的定向失败及撤源失败分别保留，未冒称完整外部通过。
- 锁内知识刷新6169595b8d201884fa524325600791e5fac5f8f4，七项自动数据逐blob保留；双方decision-log追加冲突按union保留，原notes记录不覆盖。两个旧修复631f9485/195869aa已有效，不重部署；其余策略/未验证范围及工具缺口继续原队列。
- 归档学习者原proposed行（仅0166），/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 169 item(s), 0 problem(s)；账本first_run/prior、原证据/repeat和旧状态历史不改。沙箱外完整tsc/vitest等待本批固定发布树的learner-checks事件。

原回报与测试日志位置：learner/runs/20261006-101302-fix-batch/；哈希记录：

```json
{
  "report.json": {
    "bytes": 1529,
    "sha256": "64a813584de369bd5622f4389f5388ae2cf59fd579aa945c0b8e29af1a978b3b"
  },
  "handoff-ops.md": {
    "bytes": 4921,
    "sha256": "feb5c30266aafcf42d37cd07201b4dfa9a12337139b3eec581cff9ad5a253655"
  },
  "source-sandbox.log": {
    "bytes": 501,
    "sha256": "6a1c32074483e75260890f379ed91196cb8286616f48c9ec3512efb726984c8e"
  },
  "live-sandbox.log": {
    "bytes": 492,
    "sha256": "70eab382dfca81a37f723682f03951c2ac73a7cf0ddc2c3479a23cfa463a7478"
  },
  "precise-without-fix.log": {
    "bytes": 4158,
    "sha256": "524b1dcced5b5c5dc1d09bac92b36c7f53ed514a263d8da621b8de047d62186d"
  },
  "precise-fixed-draft.log": {
    "bytes": 241,
    "sha256": "a5c6b0afb9dccdc17aeaf1aa16b11349171b7b285ee079a58b3e30155901e9cc"
  },
  "precise-restored.log": {
    "bytes": 244,
    "sha256": "daf872a69b4f594778933a45c474a5136f9383628697a32aef4774054d438253"
  },
  "queue-history-audit.json": {
    "bytes": 45931,
    "sha256": "a68ac4c80765b9e321d6e51edd2bc48da7a51c350824a96bbd8a1a9ad783d7a3"
  }
}
```
