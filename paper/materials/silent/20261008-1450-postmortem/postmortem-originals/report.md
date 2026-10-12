## 复盘回报
- 已追加：H1T1F8ML9FUE（A10，第48层，永世沙漏 AEONGLASS末次T4：34血0挡承30攻击及6伤凋萎，完整需损36，敌剩402/535；含自动局报补读勘误）。
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - H1T1F8ML9FUE：手空时忽略可见牌堆升级的凋萎伤害，缓存3而新生6、方案低报3 — .worktrees/live/agent/src/reflex/fight-plays.ts:48（新；输入出口combat-plan.ts:1529）。
- 写成「未记录」的项：H1T1F8ML9FUE：完整dirty源码；自动局报生成过程；6个SL截断出口及未执行结算；首试额外门槛预报差额归因；重复敌ID个体与召唤退场逐击毛伤；留药／换线／休息／升级／修模的受控整场胜负；F49资源；boss时钟需／估及实打比；Jev缓存；实际完整最优线执行比例。
- 学习账本：H1T1F8ML9FUE：新增 silent-0297；更新 silent-0005, silent-0006, silent-0010, silent-0018, silent-0019, silent-0023, silent-0024, silent-0025, silent-0079, silent-0117, silent-0132, silent-0221（老错 silent-0079、silent-0117）；ledger.py check退出码0，297条目／0问题。新增机制0，记录中的机制补证使用已有条目。
- 代码提案（证据/账本/CLI id/实现任务，证据不足明确写限制）：
  - F48T4／silent-0297及0024、0025、0006／silent-proposal-179fd62ad9b2f71b／strategy-proposal：同步已显示的凋萎伤害；固定帧已复现，修后整战未记录。
  - F48T3、F33T6／silent-0079、0117及0010、0018／silent-proposal-2ae7436286228166／strategy-proposal：核SL换线血价与沙坑逃离弃牌；不由饱和推演判必败，不声称保牌必胜。
  - F35—48资源链／silent-0019及0005、0023、0132、0221／silent-proposal-de26499e8385f25b／strategy-proposal：核终局与药水实际资源；留药对照不足，保留现参数。
  - 三项均pending，提案Markdown／JSON和固定证据已保存；没有代码实现、提交或上线。30项关键数字复核通过，原复盘只追加，旧记录未重写。

```json
{"task": "postmortem", "appended": ["H1T1F8ML9FUE"], "skipped": [], "bugs": [{"run": "H1T1F8ML9FUE", "where": "agent/src/reflex/fight-plays.ts:48", "what": "手空时忽略可见弃牌区已升级凋萎伤害，缓存3而实际新生6，末试T4方案完整损血低报3。", "new": true}], "ledger": {"added": ["silent-0297"], "updated": ["silent-0005", "silent-0006", "silent-0010", "silent-0018", "silent-0019", "silent-0023", "silent-0024", "silent-0025", "silent-0079", "silent-0117", "silent-0132", "silent-0221"], "repeats": ["silent-0079", "silent-0117"], "check": 0}, "code_proposals": ["silent-proposal-179fd62ad9b2f71b", "silent-proposal-2ae7436286228166", "silent-proposal-de26499e8385f25b"], "implementation_domains": ["combat", "potion", "sl", "terminal"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261008-141302-postmortem/report.md"}
```
