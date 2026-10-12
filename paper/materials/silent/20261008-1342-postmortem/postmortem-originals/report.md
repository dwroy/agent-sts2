## 复盘回报
- 已追加：G8NHLL09DLBX（A10，第24层，直飞产卵虫／幼虫战末次T5以1血0挡阵亡）；已追加SL记录口径勘误。
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - G8NHLL09DLBX：弹跳药瓶随机施毒伪造确定整场斩杀 — agent/src/reflex/turn-solver.ts:2284（新）
- 写成「未记录」的项：G8NHLL09DLBX：完整dirty源码、SL退出／未执行结算、死亡首击与完整毛伤、重复ID个体杀序、F25后资源、boss时钟指标、Jev缓存、受控反事实、完整最优线执行比例。
- 学习账本：G8NHLL09DLBX：新增 silent-0295；更新 silent-0019、silent-0017、silent-0005、silent-0046、silent-0253、silent-0007、silent-0021（均support，老错repeat无）；ledger.py check退出码0。
- 代码提案（证据/账本/CLI id/实现任务，证据不足明确写限制）：
  - F24T5／silent-0295／silent-proposal-982c99080350f43e／strategy-proposal：修正随机施毒确定斩杀边界；固定帧已复现，修后整场胜负未验证。
  - F17、F23→F24／上述7条既有账本／silent-proposal-aaefd918a706de14／strategy-proposal：核对胜战资源、药水兑现与SL自爆处理；缺受控对照，保留原参数。两提案均pending，未实现或上线。

```json
{"task": "postmortem", "appended": ["G8NHLL09DLBX"], "skipped": [], "bugs": [{"run": "G8NHLL09DLBX", "where": "agent/src/reflex/turn-solver.ts:2284", "what": "随机施毒复用最高HP目标，误把弹跳药瓶分配至母体并判为确定整场斩杀。", "new": true}], "ledger": {"added": ["silent-0295"], "updated": ["silent-0019", "silent-0017", "silent-0005", "silent-0046", "silent-0253", "silent-0007", "silent-0021"], "repeats": [], "check": 0}, "code_proposals": ["silent-proposal-982c99080350f43e", "silent-proposal-aaefd918a706de14"], "implementation_domains": ["combat", "potion", "sl"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261008-131301-postmortem/report.md"}
```
