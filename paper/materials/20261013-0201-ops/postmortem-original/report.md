## 复盘回报
- 已追加：XRCP2TKYKQBA（A10，第17层，末试T13以7血10挡对同族神官18攻击阵亡，敌剩52血）；含五轮／整场推演口径勘误。
- 新的纯 bug：无。旧silent-0287复发 — agent/src/sl/judge.ts:1333（fix-queue-v4已有；首试SL漏合招架盾与毒伤）。
- 写成「未记录」的项：XRCP2TKYKQBA：dirty完整运行树、前五次SL退出与末轮结算、部分独立死亡帧及个体伤害／内部顺序、完整最优候选实际兑现率、替线／药时／路线胜负反事实、有效boss时钟与部分路线投影、纯操作用时、Jev缓存及真实账单。
- 学习账本：XRCP2TKYKQBA：新增 silent-0441；更新 silent-0019, silent-0020, silent-0125, silent-0079, silent-0287, silent-0012, silent-0046, silent-0055, silent-0204, silent-0307, silent-0422, silent-0385（老错 silent-0079、silent-0287）；ledger.py check 退出码 0。
- 代码提案：资源／紧缠（F14—F17，账本0019/0020/0441，silent-proposal-8dac80786973c4e8）；护栏／SL审计（F14T3、F17T3/T5，0079/0125/0422，silent-proposal-577144b8043e7c51）；盾毒SL缺口（F17首试T13，0287，silent-proposal-4a736801d02cc9a9）。均关联独立strategy-proposal；缺受控整场反事实，不宣称已胜／已实现，未拟新打法阈值。

```json
{
  "task": "postmortem",
  "appended": [
    "XRCP2TKYKQBA"
  ],
  "skipped": [],
  "bugs": [
    {
      "run": "XRCP2TKYKQBA",
      "where": "agent/src/sl/judge.ts:1333",
      "what": "旧silent-0287复发：SL分开比较招架盾6与毒7，漏合计对12HP神官的攻击前退场上界，首试T13被提前读档",
      "new": false
    }
  ],
  "ledger": {
    "added": [
      "silent-0441"
    ],
    "updated": [
      "silent-0019",
      "silent-0020",
      "silent-0125",
      "silent-0079",
      "silent-0287",
      "silent-0012",
      "silent-0046",
      "silent-0055",
      "silent-0204",
      "silent-0307",
      "silent-0422",
      "silent-0385"
    ],
    "repeats": [
      "silent-0079",
      "silent-0287"
    ],
    "check": 0
  },
  "code_proposals": [
    "silent-proposal-8dac80786973c4e8",
    "silent-proposal-577144b8043e7c51",
    "silent-proposal-4a736801d02cc9a9"
  ],
  "implementation_domains": [
    "combat",
    "potion",
    "sl",
    "terminal"
  ],
  "report": "/home/dw/Projects/agent-sts2/learner/runs/20261013-011302-postmortem/report.md"
}
```
