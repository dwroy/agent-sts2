## 复盘回报
- 已追加：Q9FM7A80E4BZ（A10，第17层，族母T11以2血1挡对18攻击阵亡，毒后敌剩24血）；遗物出处、事件ID、用时及源码引用已追加勘误。
- 新的纯 bug（file:line）：
  - Q9FM7A80E4BZ：发条靴低额攻击漏模，三小刀少报9伤 — agent/src/reflex/turn-solver.ts:1516（新定位，旧证据补登；fix-queue无同项）。
- 写成「未记录」的项：Q9FM7A80E4BZ：启动dirty完整树、部分逐击伤害与同ID击杀身份、完整最优线执行率、未选方案的整战反事实、boss时钟比值、操作／等待分时、Jev服务端缓存及账单。
- 学习账本：Q9FM7A80E4BZ：新增 silent-0465、silent-0466；更新 silent-0465、silent-0030、silent-0125（老错 silent-0465）；ledger.py check退出码0。
- 代码提案（均交独立strategy-proposal，未实现／上线）：
  - F17T8／silent-0465、0466／silent-proposal-a98391cbbe996a35：补发条靴模型；部分挡及特殊上限缺证据，限制在已核窗口。
  - F17T6—11／silent-0030／silent-proposal-2b9379056147660a：核族母实际能力与属性输入；缺受控反事实，不改构筑权重。
  - F17T2—3／silent-0125／silent-proposal-263511c7d12ef833：核护栏与SL实际资源链；不把候选省血当收益，保留原阈值。

```json
{"task": "postmortem", "appended": ["Q9FM7A80E4BZ"], "skipped": [], "bugs": [{"run": "Q9FM7A80E4BZ", "where": "agent/src/reflex/turn-solver.ts:1516", "what": "发条靴低额攻击漏模，末试T8三小刀少报9伤；更早同型证据已补立账。", "new": true}], "ledger": {"added": ["silent-0465", "silent-0466"], "updated": ["silent-0465", "silent-0030", "silent-0125"], "repeats": ["silent-0465"], "check": 0}, "code_proposals": ["silent-proposal-a98391cbbe996a35", "silent-proposal-2b9379056147660a", "silent-proposal-263511c7d12ef833"], "implementation_domains": ["combat", "sl", "terminal"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261014-081303-postmortem/report.md"}
```
