## 复盘回报
- 已追加：XTSV1U9JD34T（A10，第49层，女王／火炬头聚合体；末次T4以1血、6挡承受16攻击阵亡）
- 新的纯 bug（file:line，每条一行）：
  - XTSV1U9JD34T：毒必胜提前停止搜索，遗漏连战前的保血候选 — agent/src/reflex/turn-solver.ts:3764（新；执行入口agent/src/reflex/combat-plan.ts:3293）
- 写成「未记录」的项：XTSV1U9JD34T：替代出牌／路线／药水／遗物的受控胜线、首轮接管完整动作、6次截断尝试退出结算、完整毛伤事件账、boss时钟估伤／掉血／存活回合及比值、Jev缓存、本局dirty完整源码。
- 学习账本：XTSV1U9JD34T：新增 silent-0271；更新 silent-0164、silent-0140、silent-0228、silent-0069、silent-0005、silent-0027、silent-0024、silent-0095、silent-0206；旧经验均补support，已证老错复现无；ledger.py check退出码0。
- 代码提案（来源postmortem／20261008-031301，实现任务均为strategy-proposal，尚未实施）：
  - silent-proposal-d60691b060dfc40a：F48T8早停／9伤凋萎／F49资源接续，关联silent-0271、silent-0228；替代动作保血量与后场胜负待验证。
  - silent-proposal-e5ea36df117ca9b7：F34／F36／F49T1首轮接管边界，关联silent-0164；未记录自动动作，先核既有实现，不禁取遗物。
  - silent-proposal-ab055ef7dfbb44e5：F49T1／T3／T4幽灵效果与次轮复制兑现，关联silent-0140、silent-0069、silent-0005、silent-0206；延后用药无实盘对照，保留原时点与药价规则。

```json
{"task": "postmortem", "appended": ["XTSV1U9JD34T"], "skipped": [], "bugs": [{"run": "XTSV1U9JD34T", "where": "agent/src/reflex/turn-solver.ts:3764", "what": "毒必胜后搜索立即返回，未生成可保留后场HP的防御候选；F48T8直接结束先受9伤凋萎，32血降至23进入第二boss。", "new": true}], "ledger": {"added": ["silent-0271"], "updated": ["silent-0164", "silent-0140", "silent-0228", "silent-0069", "silent-0005", "silent-0027", "silent-0024", "silent-0095", "silent-0206"], "repeats": [], "check": 0}, "code_proposals": ["silent-proposal-d60691b060dfc40a", "silent-proposal-e5ea36df117ca9b7", "silent-proposal-ab055ef7dfbb44e5"], "implementation_domains": ["combat", "potion", "terminal", "structure"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261008-031301-postmortem/report.md"}
```
