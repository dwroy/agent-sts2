## 复盘回报
- 已追加：Y5H4CFAQ2WTG（A10，第33层，无厌沙虫 THE_INSATIABLE：T10以1血、28挡对30攻击阵亡，敌剩71血）
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - Y5H4CFAQ2WTG：抽牌优先检查漏认计算下注的全弃重抽标记 — .worktrees/live/agent/src/reflex/turn-solver.ts:3615（新）
- 写成「未记录」的项：Y5H4CFAQ2WTG：完整dirty源码、逐击毛伤和召唤／恢复中间帧、同ID持久实例、实际重抽及替代打法／路线／休息／留药的受控结果、护栏长期代价、三幕资源、boss时钟估计及比值、Jev缓存、实际账单费用。
- 学习账本：Y5H4CFAQ2WTG：新增 silent-0300；更新 silent-0300,silent-0021,silent-0019,silent-0018,silent-0006,silent-0046,silent-0276,silent-0005,silent-0284,silent-0243,silent-0017（老错 silent-0300；较早L704现象补账，本局repeat，其余support）；`ledger.py check`退出码0。
- 代码提案（证据/账本/CLI id/实现任务，证据不足明确写限制）：
  - 抽牌入口：本局F33T10及L704 F48T6／silent-0300／silent-proposal-1cb36e182078a20e／strategy-proposal；修抽牌识别并核沙坑顺序，实际重抽胜负未记录。
  - 毒防与药水：本局F33T1—T10、F31T3／silent-0021,0018,0006,0046,0276,0284／silent-proposal-fab06d987903ee52／strategy-proposal；缺整场配对，保留原权重与SL限制。
  - 资源投影：本局F17—F33／silent-0019,0021,0243,0017／silent-proposal-54f7ee6b632cab26／strategy-proposal；核验预测条件，未走路线与留药结果未知。均未实现、未上线。

```json
{"task": "postmortem", "appended": ["Y5H4CFAQ2WTG"], "skipped": [], "bugs": [{"run": "Y5H4CFAQ2WTG", "where": "agent/src/reflex/turn-solver.ts:3615", "what": "drawsCards遗漏计算下注的drawDiscardedHand，最少损选线没有把可打的零费全弃重抽纳入抽牌优先；较早L704现象补账，本局repeat。", "new": true}], "ledger": {"added": ["silent-0300"], "updated": ["silent-0300", "silent-0021", "silent-0019", "silent-0018", "silent-0006", "silent-0046", "silent-0276", "silent-0005", "silent-0284", "silent-0243", "silent-0017"], "repeats": ["silent-0300"], "check": 0}, "code_proposals": ["silent-proposal-1cb36e182078a20e", "silent-proposal-fab06d987903ee52", "silent-proposal-54f7ee6b632cab26"], "implementation_domains": ["combat", "potion", "sl", "structure"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261008-164302-postmortem/report.md"}
```
