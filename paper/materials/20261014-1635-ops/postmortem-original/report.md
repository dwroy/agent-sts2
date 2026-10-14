## 复盘回报
- 已追加：QRZX1S9USYWP（A10，第24层，猎人杀手T2以12血6挡对19攻击阵亡）；当前live提交记法已追加勘误。
- 新的纯 bug（file:line）：
  - QRZX1S9USYWP：炼制未接药槽容量，满槽净入栏0仍得固定5分 — .worktrees/live/agent/src/reflex/card-model.ts:1090（新；累加在turn-solver.ts:2436）。
- 写成「未记录」的项：QRZX1S9USYWP：历史dirty完整输入、缺失的零血中间帧／逐击毛伤、前三试完整出口／净战损、跨幕回血拆分、满槽炼制随机产物／溢出及消耗计数后继、未选完整候选／改线／留药反事实、二幕boss时钟估计及实打、实际账单。
- 学习账本：QRZX1S9USYWP：新增 silent-0474、silent-0475；更新 silent-0019、silent-0209、silent-0232、silent-0224、silent-0227、silent-0039、silent-0045、silent-0294。旧项只补support，repeat无，原claim／first_run／prior／status／version保持；ledger.py check退出码0。
- 代码提案（都关联postmortem→独立strategy-proposal，尚未实现／上线）：
  - silent-proposal-cae7ed8545a65c66：F23T1／silent-0474、0475、0294，补炼制容量与净收纳事实；消耗后继及随机产物缺证，不改持有价、不强制先喝／弃药。
  - silent-proposal-6deadb11f48aadda：F23T3、F24T1—T2／silent-0209、0232、0045，补focus当轮取舍、能力后继及SL实际前缀审计；完整替线胜负未知，保留护栏和杀序行为。

```json
{"task": "postmortem", "appended": ["QRZX1S9USYWP"], "skipped": [], "bugs": [{"run": "QRZX1S9USYWP", "where": "agent/src/reflex/card-model.ts:1090", "what": "炼制药水未接药槽容量，满槽实付1能量且净入栏0，未知技能仍给固定5分", "new": true}], "ledger": {"added": ["silent-0474", "silent-0475"], "updated": ["silent-0019", "silent-0209", "silent-0232", "silent-0224", "silent-0227", "silent-0039", "silent-0045", "silent-0294"], "repeats": [], "check": 0}, "code_proposals": ["silent-proposal-cae7ed8545a65c66", "silent-proposal-6deadb11f48aadda"], "implementation_domains": ["combat", "potion", "sl", "terminal"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261014-154305-postmortem/report.md"}
```
