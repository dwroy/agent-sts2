## 复盘回报

- 已追加：EBVT8UZM6P12（A10，第43层，三骑士末试T5剩6血16挡，魔法退出后对连枷12×2攻击阵亡，存活差3血）。
- 新的纯 bug：
  - EBVT8UZM6P12：纸鹤新施虚弱仍按0.75推演，两试首轮多报2／3失血 — agent/src/reflex/turn-solver.ts:2834（新；接线核查 combat-plan.ts:2544）。
- 写成「未记录」的项：EBVT8UZM6P12：完整启动树、首试退出帧、逐击毛伤及同ID持久身份、F35上限下降原因、完整最优候选执行比例、未选路线／休息／药时／SL整战反事实、石头重开内部恢复或生成、boss时钟与未达F48→F49资源、操作／等待分时、Jev缓存及真实账单。
- 学习账本：EBVT8UZM6P12：新增 silent-0469；更新 silent-0020、silent-0106、silent-0125（均为support，新增老错repeat无）；ledger.py check退出码0。
- 代码提案：silent-proposal-60a60ac13fdaf5fe（F43两试T1／silent-0469）及 silent-proposal-e0abad5c66b2b1dd（赢战资源链及三次护栏／silent-0020、silent-0106、silent-0125），均已经CLI登记，关联strategy-proposal实现任务。前者限定补纸鹤接线；后者缺完整候选与受控整战证据，保留现规则。均pending，未实现或上线。

```json
{"task": "postmortem", "appended": ["EBVT8UZM6P12"], "skipped": [], "bugs": [{"run": "EBVT8UZM6P12", "where": "agent/src/reflex/turn-solver.ts:2834", "what": "纸鹤的新施虚弱减伤未接求解器，固定0.75使两试首轮高报2/3失血", "new": true}], "ledger": {"added": ["silent-0469"], "updated": ["silent-0020", "silent-0106", "silent-0125"], "repeats": [], "check": 0}, "code_proposals": ["silent-proposal-60a60ac13fdaf5fe", "silent-proposal-e0abad5c66b2b1dd"], "implementation_domains": ["combat", "potion", "sl", "terminal"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261014-111302-postmortem/report.md"}
```
