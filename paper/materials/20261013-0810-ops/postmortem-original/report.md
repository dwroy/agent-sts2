## 复盘回报
- 已追加：D9XJAX5KCSU2（A10，第48层，永世沙漏AEONGLASS，末试T7两血、九伤凋萎结束即死）；已追加勘误：F14 T1实伤6、T4实伤15。
- 新的纯 bug：
  - 无；已有silent-0297复发：凋萎缓存漏读弃牌区 — agent/src/reflex/combat-plan.ts:1558（fix-queue-v4 已有）。
- 写成「未记录」的项：D9XJAX5KCSU2：完整dirty快照、部分逐击伤害／击杀顺序、前五试结算、T6门槛预报原因、最终实线最优率、旧boss时钟／F49实盘、替代选择整战结果、Jev缓存命中。
- 学习账本：D9XJAX5KCSU2：新增 无；更新 silent-0297、silent-0079、silent-0385、silent-0024、silent-0027、silent-0011、silent-0025、silent-0037（老错 silent-0297、silent-0079、silent-0385）；ledger.py check 退出码0。
- 代码提案（均关联本局、来源postmortem，交独立strategy-proposal，未实现）：
  - silent-proposal-d3ce9b2cd72006a5：F48 T4凋萎低报3；账本0297；同步已显示牌堆伤害，缺修后整战结果。
  - silent-proposal-c010d069b568d556：F48 T4多9伤、实付6血；账本0079／0297；补全败SL血价验证，缺替代胜线。
  - silent-proposal-dbf38703a0025417：F48 T5—T7毒能力兑现；账本0385／0027／0011／0037；核抽弃后继，缺受控整战，不强制早启动。

```json
{"task": "postmortem", "appended": ["D9XJAX5KCSU2"], "skipped": [], "bugs": [{"run": "D9XJAX5KCSU2", "where": "agent/src/reflex/combat-plan.ts:1558", "what": "手空时凋萎缓存漏读可见弃牌区6伤，预测失血低报3；silent-0297复发，fix-queue-v4已有", "new": false}], "ledger": {"added": [], "updated": ["silent-0297", "silent-0079", "silent-0385", "silent-0024", "silent-0027", "silent-0011", "silent-0025", "silent-0037"], "repeats": ["silent-0297", "silent-0079", "silent-0385"], "check": 0}, "code_proposals": ["silent-proposal-d3ce9b2cd72006a5", "silent-proposal-c010d069b568d556", "silent-proposal-dbf38703a0025417"], "implementation_domains": ["combat", "sl", "terminal"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261013-074302-postmortem/report.md"}
```
