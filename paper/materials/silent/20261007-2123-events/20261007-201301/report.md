## 复盘回报
- 已追加：YQL8RZ8BWN1E（A10，第17层，瀑布巨兽本体已死，末次T10以26血、13挡对41自爆，差2血阵亡）
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - YQL8RZ8BWN1E：SL残血统计将不可击杀自爆占位体的近十亿血用于参考路径排序 — agent/src/sl/explore.ts:896、:913（新；首证回溯L9SGRBB5R698，账本silent-0250）
- 写成「未记录」的项：YQL8RZ8BWN1E：前五次SL截断战斗的完整净损；弃牌／SL后的完整最优执行比例；改线后的逐节点血量投影；旧boss时钟需伤／估伤及实打／估值比；Jev缓存命中；未执行路线、保留猎杀者和提前喝药等整场反事实。
- 学习账本：YQL8RZ8BWN1E：新增 silent-0250；更新 silent-0017、silent-0205、silent-0011、silent-0027、silent-0046（均为support，老错repeat无）；`ledger.py check` 退出码 0。
- 代码提案（证据/账本/CLI id/实现任务，证据不足明确写限制）：
  - YQL8RZ8BWN1E F17 T6—T10、SL记录960—963，及L9SGRBB5R698／PU80F84P6HPN历史静默证据；账本 silent-0017、silent-0250、silent-0011、silent-0027、silent-0046；CLI silent-proposal-e18d3f18e6cac2a0；实现任务 strategy-proposal：分列巨兽本体／自爆、药水阶段收益和SL有效残血，涉及 combat/potion/sl/terminal。缺完整受控后续，保留原参考路径规则，不宣称提前喝药或改排序可赢。
  - YQL8RZ8BWN1E F17六次T3；账本 silent-0205；CLI silent-proposal-1697e17b9ae127ca；实现任务 strategy-proposal：弃牌题展示已选方案后继上下文，涉及 combat。保留猎杀者的整场效果未记录，不强制留牌、不宣称可赢。两提案均仅登记，未实现或上线。

```json
{"task":"postmortem","appended":["YQL8RZ8BWN1E"],"skipped":[],"bugs":[{"run":"YQL8RZ8BWN1E","where":"agent/src/sl/explore.ts:896","what":"SL残血统计将不可击杀自爆占位血用于参考路径排序（排序使用点:913）","new":true}],"ledger":{"added":["silent-0250"],"updated":["silent-0017","silent-0205","silent-0011","silent-0027","silent-0046"],"repeats":[],"check":0},"code_proposals":["silent-proposal-e18d3f18e6cac2a0","silent-proposal-1697e17b9ae127ca"],"implementation_domains":["combat","potion","sl","terminal"],"report":"/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/report.md"}
```
