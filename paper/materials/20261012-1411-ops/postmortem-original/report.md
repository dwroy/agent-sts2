## 复盘回报
- 已追加：KF9HMZKTFC3V（A10，第49层，胜利；四次SL后通关，永世沙漏T6战后剩19血）。
- 新的纯 bug（file:line）：
  - KF9HMZKTFC3V：重放药瓶+／迷雾漏计骇人头盔第二份4挡 — agent/src/reflex/turn-solver.ts:1724（新）。
- 写成「未记录」的项：KF9HMZKTFC3V：精确运行源码、判死尝试实际退出／死亡、部分逐源伤害、受控反事实、完整实线最优比例、boss时钟及比值、末火有效模拟、Jev缓存与实际账单。
- 学习账本：KF9HMZKTFC3V：新增 silent-0432、silent-0433、silent-0434；更新 silent-0090、silent-0385、silent-0319、silent-0027、silent-0005、silent-0025、silent-0024（老错 silent-0319）；ledger.py check 退出码 0。
- 代码提案（均交 strategy-proposal，尚未实现）：
  - F48第二试T8／F49T2头盔漏挡 → silent-0432、0433 → silent-proposal-2f939cab26967b90；仅限已核重放组合。
  - F48→F49实际胜线 → silent-0090、0385、0027、0025、0024 → silent-proposal-8c8ba908af7de1cb；追加验证，单局不足以调整胜率或终局权重。
  - F48第二试T4／T10蛇咬20／10毒 → silent-0319、0434 → silent-proposal-e274353e336eb492；只扩展已核费用及现场重放边界。

```json
{"task": "postmortem", "appended": ["KF9HMZKTFC3V"], "skipped": [], "bugs": [{"run": "KF9HMZKTFC3V", "where": "agent/src/reflex/turn-solver.ts:1724", "what": "2费药瓶+和迷雾重放1时，骇人头盔第二份4格挡未计入同线推演。", "new": true}], "ledger": {"added": ["silent-0432", "silent-0433", "silent-0434"], "updated": ["silent-0090", "silent-0385", "silent-0319", "silent-0027", "silent-0005", "silent-0025", "silent-0024"], "repeats": ["silent-0319"], "check": 0}, "code_proposals": ["silent-proposal-2f939cab26967b90", "silent-proposal-8c8ba908af7de1cb", "silent-proposal-e274353e336eb492"], "implementation_domains": ["combat", "terminal"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261012-134303-postmortem/report.md"}
```
