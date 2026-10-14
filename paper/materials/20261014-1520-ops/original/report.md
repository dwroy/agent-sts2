## 复盘回报

- 已追加：9GTFF6DC500L（A10，第49层，胜利；F48剩7血接F49，五次SL后第六试T8剩4血通关）
- 新的纯 bug：无。已知bug复现：9GTFF6DC500L毒胜误核销蜥蜴尾巴 — agent/src/reflex/combat-plan.ts:5124（fix-queue-v4已有，silent-0339；fix-queue.md未列）。
- 写成「未记录」的项：9GTFF6DC500L：判死截断的完整退出／战损、末敌归零与聚合体退场伤害、复活归零／逐击时序、F43减最大血量来源、未选线／药时／路线的完整反事实、实际完整最优线执行比例、护栏整战净收益、boss时钟伤害估值与比值／F49血量投影、操作与等待分时、Jev缓存及真实账单。
- 学习账本：9GTFF6DC500L：新增无；更新 silent-0079、silent-0339、silent-0059、silent-0259、silent-0069、silent-0025、silent-0037、silent-0005、silent-0228、silent-0340、silent-0352（老错 silent-0339；其他为支持）；ledger.py check退出码0。
- 代码提案（均关联本局／账本，由独立strategy-proposal实现，未称上线）：
  - silent-proposal-7540499affe862a1：F48T1／T2攻防与两王血药接续，silent-0079／0228；未选线后继缺失，保留现行规则。
  - silent-proposal-a8b6beb464e2a1a9：F48T6误核销及F49第六试T4实际复活，silent-0339／0340；修复资源证据与SL输入，不宣称前五线必胜。
  - silent-proposal-a750d907a2105d3c：F49第六试T8毒爆132伤及凋萎净损12，silent-0059／0037；核终局剩余HP接续，已有机制正确兑现，缺完整消费者验收。

```json
{"task": "postmortem", "appended": ["9GTFF6DC500L"], "skipped": [], "bugs": [{"run": "9GTFF6DC500L", "where": "agent/src/reflex/combat-plan.ts:5124", "what": "毒胜后仍7血却按假设复活出口误核销蜥蜴尾巴；F49末试T4判死后实复活34。fix-queue-v4已有silent-0339。", "new": false}], "ledger": {"added": [], "updated": ["silent-0079", "silent-0339", "silent-0059", "silent-0259", "silent-0069", "silent-0025", "silent-0037", "silent-0005", "silent-0228", "silent-0340", "silent-0352"], "repeats": ["silent-0339"], "check": 0}, "code_proposals": ["silent-proposal-7540499affe862a1", "silent-proposal-a8b6beb464e2a1a9", "silent-proposal-a750d907a2105d3c"], "implementation_domains": ["combat", "potion", "sl", "terminal"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261014-144305-postmortem/report.md"}
```
