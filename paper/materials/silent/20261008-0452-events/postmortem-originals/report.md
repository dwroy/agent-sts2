## 复盘回报

- 已追加：9Z9H2EXKLF3T（A10，第48层，永世沙漏 AEONGLASS 末次T11以3血0挡面对48攻击阵亡）。
- 新的纯 bug（file:line，每条一行）：
  - 9Z9H2EXKLF3T：静态移除名单误报悔恨不可选，实际移除页索引0可选 — agent/src/hand/screens/oneshot.ts:217（新；误报输出另见shop.ts:520）。
- 写成「未记录」的项：9Z9H2EXKLF3T：完整毛伤事件账、F39逐实例击杀顺序、前两次SL尝试退出结算、boss时钟指标、Jev缓存、dirty源码快照、替代路线／删牌／留药受控结果、新bug的更早可比先验。
- 学习账本：9Z9H2EXKLF3T：新增 silent-0272；更新 silent-0020、silent-0079、silent-0019、silent-0021、silent-0005、silent-0024、silent-0027、silent-0034、silent-0077、silent-0123、silent-0129、silent-0180、silent-0221、silent-0243（均为support，老错重犯无）；`ledger.py check`退出码0。
- 代码提案：均已登记pending，实现任务均为strategy-proposal，尚未实现／上线。
  - silent-proposal-c32b04d610b1f62d：F37实际移除页证据／silent-0272；修正名单事实与重选链，限已观察静默流程，不宣称改删能赢。
  - silent-proposal-8f62129d7da70b94：F48T7—T11证据／silent-0079、silent-0021及相关机制账本；审计SL预测、重规划与实盘整轮。缺受控成功线及完整dirty源码，保留现行策略门槛。

```json
{"task": "postmortem", "appended": ["9Z9H2EXKLF3T"], "skipped": [], "bugs": [{"run": "9Z9H2EXKLF3T", "where": "agent/src/hand/screens/oneshot.ts:217", "what": "商店按原牌组前25张预测移除名单，将实际可选的悔恨误报为不可选，影响大脑删牌选择。", "new": true}], "ledger": {"added": ["silent-0272"], "updated": ["silent-0020", "silent-0079", "silent-0019", "silent-0021", "silent-0005", "silent-0024", "silent-0027", "silent-0034", "silent-0077", "silent-0123", "silent-0129", "silent-0180", "silent-0221", "silent-0243"], "repeats": [], "check": 0}, "code_proposals": ["silent-proposal-c32b04d610b1f62d", "silent-proposal-8f62129d7da70b94"], "implementation_domains": ["structure", "combat", "sl"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261008-041302-postmortem/report.md"}
```
