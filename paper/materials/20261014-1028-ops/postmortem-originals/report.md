## 复盘回报

- 已追加：6ZGMGEQ5YDVK（A10，第45层，三骑士末试T3以11血13挡面对24攻击阵亡，三敌仍78／67／44血）。
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - 6ZGMGEQ5YDVK：木札附魔余像的即时3挡漏算，同线预计新增17挡、实际20挡 — agent/src/reflex/card-model.ts:888（新）。
- 写成「未记录」的项：6ZGMGEQ5YDVK：完整启动dirty树、部分退出／死亡帧、完整逐击毛伤与同ID持久身份、完整最优线执行比例、未选路线／休息／用药／SL的整战反事实、boss时钟比值与F48→49实打、操作／等待分时、Jev缓存及实际账单。
- 学习账本：6ZGMGEQ5YDVK：新增 silent-0467、silent-0468；更新 silent-0020、silent-0106、silent-0125（均为支持证据，老错重犯无）；`ledger.py check` 退出码0。
- 代码提案（均交独立 strategy-proposal，尚未实现）：
  - silent-proposal-0137566a28b900e1：F39第二试T1／F45首试T1证据，关联 silent-0467、silent-0468，修附魔3挡漏算；未知修饰交互不推广，胜负影响未证。
  - silent-proposal-ac7784bffbaf1904：F38→45资源链、F45四试及F17T2护栏证据，关联 silent-0020、silent-0106、silent-0125；核资源传播与完整候选归属，缺受控后继，保留现有规则。

```json
{"task":"postmortem","appended":["6ZGMGEQ5YDVK"],"skipped":[],"bugs":[{"run":"6ZGMGEQ5YDVK","where":"agent/src/reflex/card-model.ts:888","what":"木札伶俐附魔余像的独立即时3挡漏算，同线预计新增17挡而实际20挡","new":true}],"ledger":{"added":["silent-0467","silent-0468"],"updated":["silent-0020","silent-0106","silent-0125"],"repeats":[],"check":0},"code_proposals":["silent-proposal-0137566a28b900e1","silent-proposal-ac7784bffbaf1904"],"implementation_domains":["combat","sl","terminal","structure"],"report":"/home/dw/Projects/agent-sts2/learner/runs/20261014-094303-postmortem/report.md"}
```
