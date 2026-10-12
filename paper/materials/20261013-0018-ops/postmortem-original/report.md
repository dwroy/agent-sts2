## 复盘回报
- 已追加：47731LKMZRBJ（A10，第33层，无厌沙虫沙坑归零，T5以53血9挡结束仍阵亡，敌剩198血）。
- 新的纯 bug：无；复现旧bug silent-0308 — agent/src/reflex/combat.ts:100（fix-queue-v4已列）。
- 写成「未记录」的项：47731LKMZRBJ：运行源码SHA、推理全文、F23首试退出及完整净损、部分末击和回血中间帧、群攻内部死亡顺序、完整最优线执行比例、替线／用药／路线整战对照、有效boss时钟及比值、纯操作用时、Jev缓存与实际费用。
- 学习账本：47731LKMZRBJ：新增无；更新silent-0308、silent-0117、silent-0232、silent-0018、silent-0016、silent-0253、silent-0278、silent-0007（老错silent-0308、silent-0117）；ledger.py check退出码0。
- 代码提案（均交独立strategy-proposal，尚未实现）：
  - silent-proposal-ee4e3012ebfe746a：F33T5及F23T3证据；账本0308／0018／0278；补沙坑题面事实，药水与SL穷尽判定仍缺验证。
  - silent-proposal-b3332868a7999ff9：F33T3证据；账本0117／0018；核弃牌后的逃离兑现，缺保留逃离的整战对照。
  - silent-proposal-5de4944c19bb860d：F23两试T1—T3证据；账本0232／0253／0016／0007；核柔嫩、敏捷和SL收益分账，不将局部增挡归为整场胜因。

```json
{"task": "postmortem", "appended": ["47731LKMZRBJ"], "skipped": [], "bugs": [{"run": "47731LKMZRBJ", "where": "agent/src/reflex/combat.ts:100", "what": "单动作题面漏接沙坑截止，预计剩44血却归零；silent-0308及fix-queue-v4已有", "new": false}], "ledger": {"added": [], "updated": ["silent-0308", "silent-0117", "silent-0232", "silent-0018", "silent-0016", "silent-0253", "silent-0278", "silent-0007"], "repeats": ["silent-0308", "silent-0117"], "check": 0}, "code_proposals": ["silent-proposal-ee4e3012ebfe746a", "silent-proposal-b3332868a7999ff9", "silent-proposal-5de4944c19bb860d"], "implementation_domains": ["combat", "potion", "sl", "terminal"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261012-234301-postmortem/report.md"}
```
