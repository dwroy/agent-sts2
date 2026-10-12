## 复盘回报

- 已追加：833ZM0MJGWHC（A10，第49层，实验体末次T7以12血24挡对40攻击阵亡，第二阶段仍76血）。
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - 833ZM0MJGWHC：卷轴毒杀后误记蜥蜴尾巴已消耗，导致三次可复活回合被判死读档 — agent/src/reflex/combat-plan.ts:5004（新；核销入口:5054）。
- 写成「未记录」的项：833ZM0MJGWHC：dirty知识快照、前五次退出／实际结算、内部逐击受伤与复活、未到阶段需伤、部分击杀先后、未选方案／留药／换线的完整配对、校准boss时钟及实际费用。
- 学习账本：833ZM0MJGWHC：新增 silent-0339、silent-0340；更新 silent-0010、silent-0024、silent-0027、silent-0028、silent-0034、silent-0125、silent-0221、silent-0228、silent-0243、silent-0278（均为印证，老错重犯无）；`ledger.py check` 退出码 0。
- 代码提案（证据/账本/CLI id/实现任务，证据不足明确写限制）：833ZM0MJGWHC：复活误记（F42T4／F49T3，0339／0340）→ silent-proposal-c232010cd405fe44；连战资源（F48T2／T3／T7→F49T1，0228／0221／0243／0278）→ silent-proposal-8c372357c6d94277；护栏执行追溯（F48T2／F49T1，0125）→ silent-proposal-d83600a499152eac。均关联独立 strategy-proposal，待实现；缺整场配对，保留原策略参数，不声称修后能赢。

```json
{"task":"postmortem","appended":["833ZM0MJGWHC"],"skipped":[],"bugs":[{"run":"833ZM0MJGWHC","where":"agent/src/reflex/combat-plan.ts:5004","what":"卷轴毒杀后误记蜥蜴尾巴已消耗，导致实验体三次可复活T3被判死读档","new":true}],"ledger":{"added":["silent-0339","silent-0340"],"updated":["silent-0010","silent-0024","silent-0027","silent-0028","silent-0034","silent-0125","silent-0221","silent-0228","silent-0243","silent-0278"],"repeats":[],"check":0},"code_proposals":["silent-proposal-c232010cd405fe44","silent-proposal-8c372357c6d94277","silent-proposal-d83600a499152eac"],"implementation_domains":["combat","potion","sl","terminal","structure"],"report":"/home/dw/Projects/agent-sts2/learner/runs/20261009-144301-postmortem/report.md"}
```
