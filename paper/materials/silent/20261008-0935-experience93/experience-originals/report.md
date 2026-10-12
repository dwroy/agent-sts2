## 经验库更新回报

- 版本：2026-10-08.9 → 2026-10-08.10；提交：46d0d2a19f5ab0830d9c32d2b8f64ae4286d7721（分支 exp-silent）；合入：未合入（锁内预检冲突，待运维续办）；第93节已追加，根目录记录由调用方提交。
- 条数：新增1、更新9（加证据9、只改数字0）、退役0；active 168 → 169（高101、中43、低25）；正文51016字符；A8 158条/47012字，A9 159条/47296字。压缩：脆弱、尖啸、刀扇、休息、路线、同族；合并无。
- 机制推理：
  - 力量/敏捷 — 逐击伤、逐牌挡分源 — 119支持/0反例 — ZTRGYYMLR8SC
  - 脆弱 — 两防御各3挡，完整净损7杀4血 — 22/0 — ZTRGYYMLR8SC
  - 尖啸 — 当轮33攻降11，次轮恢复 — 55/0 — ZTRGYYMLR8SC
  - 铁心 — 建7覆甲，末试T9耗尽 — 17/0 — ZTRGYYMLR8SC
  - 刀扇 — 8手实际添3刀，2力逐刀加伤 — 10/0 — ZTRGYYMLR8SC
  - 铜钹 — 弃牌附伤分账，滑溜同现1伤保留限制 — 7/0 — ZTRGYYMLR8SC
  - 能力/护栏 — 未建不预支，候选省血不当整场胜因 — 118/0 — ZTRGYYMLR8SC
- 改了的手写知识：无。
- 测试：tsc 0；vitest 247文件/2604用例/0，无失败重跑；最终经验定向1文件/10例/0。
- 切片大小：中位下降65.5字，配对增量中位−2字；最大5290字，单片最多增加358字。
- 学习账本：新增 silent-0284；改成 proposed silent-0012,silent-0013,silent-0019,silent-0020,silent-0021,silent-0046,silent-0125,silent-0149,silent-0277；退役无；ledger.py check 0。
- 需要 Roy 定的事：无。live有20处并行记录冲突，未覆盖，待运维续办。

```json
{
  "task": "experience-update",
  "version": "2026-10-08.10",
  "commit": "46d0d2a19f5ab0830d9c32d2b8f64ae4286d7721",
  "merged": null,
  "added": 1,
  "updated": 9,
  "retired": 0,
  "active": 169,
  "mechanisms": [
    "力量/敏捷",
    "脆弱",
    "尖啸暂减力",
    "铁心覆甲",
    "刀扇容量/力量",
    "铜钹弃牌附伤",
    "能力/护栏血价"
  ],
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 2604
  },
  "ledger": {
    "added": [
      "silent-0284"
    ],
    "proposed": [
      "silent-0012",
      "silent-0013",
      "silent-0019",
      "silent-0020",
      "silent-0021",
      "silent-0046",
      "silent-0125",
      "silent-0149",
      "silent-0277"
    ],
    "retired": [],
    "check": 0
  },
  "code_proposals": [
    "silent-proposal-5367449b857450a7",
    "silent-proposal-9b8890c2649a2734"
  ],
  "implementation_domains": [
    "combat",
    "potion",
    "sl",
    "terminal"
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-085641-experience-update/report.md"
}
```
