## 复盘回报
- 已追加：9R916WW0V65N（A10，第49层，女王／火炬头聚合体战，末次T2以12血0挡承受16攻击阵亡）；已追加出牌描述及五处药水证据帧勘误。
- 新的纯 bug（以下行号均在只读live）：
  - 9R916WW0V65N：战斗专注新建禁抽未进入同一方案 — agent/src/reflex/card-model.ts:929（新）
  - 9R916WW0V65N：苦无新增敏捷未进入后继格挡 — agent/src/reflex/turn-solver.ts:2433（新）
- 写成「未记录」的项：9R916WW0V65N：dirty完整源码；七次SL截断的末轮结算／退出；完整逐击毛伤、复活独立事件／充能、换阶段隐去伤害及末击来源；部分个体击杀顺序；受控反事实和实际最优线执行比例；部分路线投影、boss输出时钟、Jev缓存命中。
- 学习账本：9R916WW0V65N：新增 silent-0290、silent-0291、silent-0292；更新 silent-0228、silent-0085、silent-0005、silent-0028、silent-0094、silent-0069、silent-0054（均support，老错repeat无）；`ledger.py check`退出码0。
- 代码提案（均关联本任务与独立strategy-proposal）：silent-proposal-68322129f031077b（F49第2试T2／silent-0290、0292，先抽后禁抽）；silent-proposal-8df611363cd82fc9（F49T1—T2／silent-0291、0085、0005，苦无增敏）；silent-proposal-6353ffbadaaac619（F42—F49／silent-0228、0290、0291，连续Boss资源审计）。替代整场胜负、留药时点和终局权重证据不足，保持现行规则等待独立验证；未实现或上线。

```json
{
  "task": "postmortem",
  "appended": [
    "9R916WW0V65N"
  ],
  "skipped": [],
  "bugs": [
    {
      "run": "9R916WW0V65N",
      "where": "agent/src/reflex/card-model.ts:929",
      "what": "战斗专注自身抽牌后新建的禁抽没有在同一方案传播。",
      "new": true
    },
    {
      "run": "9R916WW0V65N",
      "where": "agent/src/reflex/turn-solver.ts:2433",
      "what": "苦无同轮新增敏捷没有进入后继格挡推演。",
      "new": true
    }
  ],
  "ledger": {
    "added": [
      "silent-0290",
      "silent-0291",
      "silent-0292"
    ],
    "updated": [
      "silent-0228",
      "silent-0085",
      "silent-0005",
      "silent-0028",
      "silent-0094",
      "silent-0069",
      "silent-0054"
    ],
    "repeats": [],
    "check": 0
  },
  "code_proposals": [
    "silent-proposal-68322129f031077b",
    "silent-proposal-8df611363cd82fc9",
    "silent-proposal-6353ffbadaaac619"
  ],
  "implementation_domains": [
    "combat",
    "potion",
    "sl",
    "terminal"
  ],
  "report": "/home/dw/Projects/agent-sts2/learner/runs/20261008-114303-postmortem/report.md"
}
```
