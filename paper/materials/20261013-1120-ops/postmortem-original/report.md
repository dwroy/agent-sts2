## 复盘回报
- 已追加：TGTXN42TE0X4（A10，第23层，虱虫之祖 LOUSE_PROGENITOR，末试T3以3血0挡对23攻击阵亡）
- 新的纯 bug（file:line，每条一行）：
  - 无
- 写成「未记录」的项：TGTXN42TE0X4：完整脏运行树、逐击毛伤／同ID永久身份、前三次SL退出及未执行结算、完整执行线最优率、Jev缓存命中、boss时钟及实打／估值比、未达营火与后续boss资源、替路线／用药／出牌的受控整战结果。
- 学习账本：TGTXN42TE0X4：新增无；更新 silent-0019、silent-0418、silent-0278、silent-0316、silent-0046、silent-0049、silent-0276、silent-0204、silent-0020；均为support，老错重犯无；`ledger.py check`退出码0。
- 代码提案（均待独立strategy-proposal核验，未实现）：
  - silent-proposal-9f6b0e752977fae6：F19—F22连续赢战耗73血及F24未达营火；关联0019／0020／0204。缺替路线对照，保留策略参数。
  - silent-proposal-c8b6b0c8ec6ec9a8：F23T1 SL替线27→20伤、T3毒药结算后敌仍53血；关联0418／0278／0316／0046／0049。缺受控胜线，不推定早喝或改线必胜。

```json
{"task":"postmortem","appended":["TGTXN42TE0X4"],"skipped":[],"bugs":[],"ledger":{"added":[],"updated":["silent-0019","silent-0418","silent-0278","silent-0316","silent-0046","silent-0049","silent-0276","silent-0204","silent-0020"],"repeats":[],"check":0},"code_proposals":["silent-proposal-9f6b0e752977fae6","silent-proposal-c8b6b0c8ec6ec9a8"],"implementation_domains":["combat","potion","sl","terminal","structure"],"report":"/home/dw/Projects/agent-sts2/learner/runs/20261013-104302-postmortem/report.md"}
```
