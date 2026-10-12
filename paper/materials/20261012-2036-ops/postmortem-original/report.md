## 复盘回报
- 已追加：8ZCFND4T35H7（A10，第25层，感染棱柱T8：4血7挡，完整需损8，敌余90血）
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - 无
- 写成「未记录」的项：8ZCFND4T35H7：精确运行源码、部分胜战归零及同ID内部伤害帧、完整最优线执行率、未执行分支的整战结果、有效boss时钟及比值、二幕boss实到、纯操作用时、Jev缓存和真实费用。
- 学习账本：8ZCFND4T35H7：新增无；更新 silent-0019、silent-0167、silent-0278、silent-0168、silent-0005、silent-0011、silent-0012、silent-0178、silent-0419；均为支持证据，老错repeat无；`ledger.py check`退出码0。
- 代码提案（证据/账本/CLI id/实现任务，证据不足明确写限制）：
  - 8ZCFND4T35H7 F25T3—T8及F17T5／silent-0167、0168、0005、0011、0012、0178、0419／silent-proposal-e76e895381da5bfc／strategy-proposal：核棱柱阶段技能血价与完整候选；缺未执行替线整战证据，保留现行规则。
  - 8ZCFND4T35H7 F19—F25、F25T8／silent-0278、0019／silent-proposal-d430378cd8acc6f2／strategy-proposal：验证单棱柱毒药水6层的条件题面与整线；缺提前喝药对照，不制定固定时机。两项均未实现或上线。

```json
{"task": "postmortem", "appended": ["8ZCFND4T35H7"], "skipped": [], "bugs": [], "ledger": {"added": [], "updated": ["silent-0019", "silent-0167", "silent-0278", "silent-0168", "silent-0005", "silent-0011", "silent-0012", "silent-0178", "silent-0419"], "repeats": [], "check": 0}, "code_proposals": ["silent-proposal-e76e895381da5bfc", "silent-proposal-d430378cd8acc6f2"], "implementation_domains": ["combat", "potion"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261012-201302-postmortem/report.md"}
```
