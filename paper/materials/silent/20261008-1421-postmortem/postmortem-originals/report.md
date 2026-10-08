## 复盘回报

- 已追加：LYBHQ1X230ZB（A10，第30层，胧光怪／寄生惧魔战T2以4血16挡对20攻击阵亡）；已追加一处饮药时间勘误。
- 新的纯 bug（file:line，每条一行；没有写「无」）：

  - LYBHQ1X230ZB：逃脱计划固定抽1遗漏、条件格挡未按抽入牌类型结算 — agent/src/reflex/card-model.ts:929、852（新；按只读live，首证LRN0HPZ0FZS1）。
- 写成「未记录」的项：LYBHQ1X230ZB：dirty完整源码、前三次读档退出／未执行结算、重复ID个体杀序及卵孵化退场毛伤、本局逃脱计划实抽及补模胜负、替代路线／休息／购物／留药／出牌整场对照、F31后资源、boss时钟每轮需要／估计／实打比、Jev缓存及完整最优线执行比例。
- 学习账本：LYBHQ1X230ZB：新增 silent-0296；更新 silent-0019, silent-0039, silent-0005, silent-0013, silent-0077, silent-0196, silent-0128, silent-0049, silent-0232, silent-0115, silent-0007, silent-0142（老错复现silent-0296仅指首证回溯的原始重复，本次才登记；其余均support，未记上线后重犯）；`ledger.py check`退出码0。
- 代码提案：silent-proposal-0337a5f076c49d02（LYB F30T1及两局A0证据／silent-0296，普通逃脱计划模型与SL抽牌边界）和 silent-proposal-8e9beeee55eac364（LYB F22→F30／其余12条账本，赢后资源与终局价值核验）；均已CLI登记pending、关联独立strategy-proposal。缺受控整场反事实，保留现权重／喝药规则，不宣称已实现或胜率改善。

```json
{"task": "postmortem", "appended": ["LYBHQ1X230ZB"], "skipped": [], "bugs": [{"run": "LYBHQ1X230ZB", "where": "agent/src/reflex/card-model.ts:929", "what": "普通逃脱计划的固定抽1遗漏，条件格挡未按抽入技能结算；首证回溯LRN0HPZ0FZS1。", "new": true}], "ledger": {"added": ["silent-0296"], "updated": ["silent-0019", "silent-0039", "silent-0005", "silent-0013", "silent-0077", "silent-0196", "silent-0128", "silent-0049", "silent-0232", "silent-0115", "silent-0007", "silent-0142"], "repeats": ["silent-0296"], "check": 0}, "code_proposals": ["silent-proposal-0337a5f076c49d02", "silent-proposal-8e9beeee55eac364"], "implementation_domains": ["combat", "potion", "sl", "terminal"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261008-134301-postmortem/report.md"}
```
