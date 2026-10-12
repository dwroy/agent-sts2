## 复盘回报
- 已追加：PBUBM0LRTEDD（A10，第49层，实验体 #C68 TEST_SUBJECT，末次T3以3血11挡对38攻阵亡，敌余57血）。追加后原始日志核验一致，无勘误。
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - PBUBM0LRTEDD：1费神化+未接同线升级，候选少报8挡 — agent/src/reflex/card-model.ts:1144（新；普通版旧修复之外的升级分支）。
- 写成「未记录」的项：PBUBM0LRTEDD：SL截断退出及未执行结算、部分敌人退场归零帧与完整毛伤、F49条件化进场投影、boss时钟需要／估计与实打／估值、最终实线最优比例、策略及药水时点的整场受控对照、Jev缓存及实际费用、完整开局dirty源码。
- 学习账本：PBUBM0LRTEDD：新增 silent-0322、silent-0323；更新 silent-0079、silent-0228、silent-0028、silent-0005、silent-0077、silent-0255（老错 silent-0079；其余补证）；`ledger.py check` 退出码0，323条、0问题。
- 代码提案（证据/账本/CLI id/实现任务，证据不足明确写限制）：
  - F49末次T1／silent-0322、0323／silent-proposal-53b3db220508b3d9／strategy-proposal：接神化+已观察分支；没有修后整场胜负对照。
  - F49第三／四次T1／silent-0079、0322、0323／silent-proposal-84d4c469867ba70e／strategy-proposal：核SL全败换线血价；缺受控胜线，保留现有规则。
  - F43→F48→F49资源／silent-0228、0255、0322／silent-proposal-46ebe0b559d993ce／strategy-proposal：核连王实际端点；留药、药水价值及终局权重缺配对证据，保留原行为。三项均pending，未实现／提交／上线。

```json
{"task":"postmortem","appended":["PBUBM0LRTEDD"],"skipped":[],"bugs":[{"run":"PBUBM0LRTEDD","where":"agent/src/reflex/card-model.ts:1144","what":"1费神化+未接同线升级，完整候选14挡而实22挡；普通版已修，升级分支新定位。","new":true}],"ledger":{"added":["silent-0322","silent-0323"],"updated":["silent-0079","silent-0228","silent-0028","silent-0005","silent-0077","silent-0255"],"repeats":["silent-0079"],"check":0},"code_proposals":["silent-proposal-53b3db220508b3d9","silent-proposal-84d4c469867ba70e","silent-proposal-46ebe0b559d993ce"],"implementation_domains":["combat","potion","sl","terminal"],"report":"/home/dw/Projects/agent-sts2/learner/runs/20261009-024302-postmortem/report.md"}
```
