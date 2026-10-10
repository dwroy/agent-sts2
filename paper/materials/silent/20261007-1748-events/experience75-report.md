## 经验库更新回报
- 版本：2026-10-07.20 → 2026-10-07.21；提交：91d49f827f3d429955d63f0b11c5944731759264（分支 exp-silent）；合入：未合入（知识刷新与本分支不同blob重叠，停止、不覆盖）
- 条数：新增 2、更新 15（加证据 15、只改数字 0）、退役 0；active 146 → 148，共 49478 字；A8：140条/46248字，A9：141条/46532字。
- 机制推理：
  - 神化战内升级 — 2费战内升级，持有不算兑现 — 1支持/0反例 — VLZ6CCT8AQ0A
  - 痊愈药水 — 加1能抽2，HP不变 — 8支持/0反例 — VLZ6CCT8AQ0A、T082DRCUHRRD
  - 力量/敏捷分源 — 力量逐击、敏捷逐张挡牌 — 94支持/0反例 — VLZ6CCT8AQ0A
  - 灵动步法 — 建2/3敏，靠后续挡牌兑现 — 56支持/0反例 — VLZ6CCT8AQ0A
  - 护喉甲 — 现场覆甲耗尽不沿用开场4 — 7支持/0反例 — VLZ6CCT8AQ0A
  - 金刚杵 — 开场1力按攻击段兑现 — 9支持/0反例 — VLZ6CCT8AQ0A
  - 闪亮口红 — T3一次加1力/1敏 — 3支持/0反例 — VLZ6CCT8AQ0A
  - 勒紧 — 普通/升级4/6只加防御 — 5支持/0反例 — VLZ6CCT8AQ0A
  - 尖啸 — 逐段临时减力，后轮重算 — 44支持/0反例 — VLZ6CCT8AQ0A
  - 萎靡 — 升级X+1减力加弱，不产挡 — 16支持/0反例 — VLZ6CCT8AQ0A
  - 触媒 — 加结算次数，每次毒减1 — 35支持/0反例 — VLZ6CCT8AQ0A
  - 毒雾 — 实建后轮初补毒，未建不预支 — 46支持/0反例 — VLZ6CCT8AQ0A
  - 石炉加湿器 — 实际HEAL补5并加5上限 — 3支持/0反例 — VLZ6CCT8AQ0A
  - 构筑兑现（观察） — 持有/计划与实际施放分账 — 93支持/0反例 — VLZ6CCT8AQ0A
  - 三骑士时钟（观察） — 当轮减力不等后段减员/生存 — 4支持/0反例 — VLZ6CCT8AQ0A
- 改了的手写知识：无。
- 测试：tsc 退出码 0；vitest 232 文件 / 2430 用例 / 退出码 0；重跑 0 次。
- 切片大小：整体中位 +79 字，配对增量中位 5.5 字；最大 5238 字。
- 学习账本：新增 silent-0240；改成 proposed silent-0005,silent-0016,silent-0049,silent-0071,silent-0143,silent-0046,silent-0053,silent-0027,silent-0011,silent-0021,silent-0106,silent-0204,silent-0020,silent-0019,silent-0238；退役 无；`ledger.py check` 退出码 0。
- 需要 Roy 定的事：无。

```json
{"task": "experience-update", "version": "2026-10-07.21", "commit": "91d49f827f3d429955d63f0b11c5944731759264", "merged": null, "added": 2, "updated": 15, "retired": 0, "active": 148, "mechanisms": ["神化战内升级", "痊愈药水", "力量/敏捷分源", "灵动步法", "护喉甲", "金刚杵", "闪亮口红", "勒紧", "尖啸", "萎靡", "触媒", "毒雾", "石炉加湿器", "构筑兑现（观察）", "三骑士时钟（观察）"], "tests": {"tsc": 0, "vitest": 0, "cases": 2430}, "ledger": {"added": ["silent-0240"], "proposed": ["silent-0005", "silent-0016", "silent-0049", "silent-0071", "silent-0143", "silent-0046", "silent-0053", "silent-0027", "silent-0011", "silent-0021", "silent-0106", "silent-0204", "silent-0020", "silent-0019", "silent-0238"], "retired": [], "check": 0}, "code_proposals": ["silent-proposal-283a164780d11e69", "silent-proposal-ebbfe3b97548756d", "silent-proposal-7ef28c3cb0160972"], "implementation_domains": ["combat", "potion", "structure"], "report": "/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/report.md"}
```

