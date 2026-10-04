## 复盘：run NSWFREAAWMXQ — 未结束，最高第 11 层

- 决策 153 个；Jev 调用 20 次，Claude 9 次，DeepSeek 0 次；token 21,525 入 / 829 出，约 $0.0009；用时 7.5 分钟
- 决策者：code 119，claude 9，jev 9，jev-plan 7，claude-plan 7，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 80→68（-12），决策 code 16，code-fallback 1
- 第 3 层 毛绒伏地虫: HP 74→74（-0），决策 code 7，jev-plan 2，jev 1
- 第 4 层 缩小甲虫: HP 80→78（-2），决策 code 8，code-fallback 1
- 第 6 层 墨宝: HP 80→74（-6），决策 code 9
- 第 7 层 多尼斯异鸟: HP 80→55（-25），决策 code 9，claude-plan 7，claude 6
- 第 8 层 小啃兽: HP 61→37（-24），决策 code 12，jev-plan 3，jev 2
- 第 9 层 树叶史莱姆（小）/蛇行扼杀者: HP 43→33（-10），决策 code 10，jev-plan 2，jev 1
- 第 11 层 劫掠者刺客/劫掠者斧手/劫掠者追踪手: HP 39→35（-4），决策 code 4

### 各类决策由谁做
- combat/plan-continue / code: 25
- combat/end_turn / code: 20
- combat/plan / code: 20
- reward/claim / code: 19
- combat/lethal / code: 10
- reward/proceed / code: 8
- combat/plan-continue / claude-plan: 7
- combat/plan-continue / jev-plan: 7
- map/route / code: 7
- combat/plan-choice / claude: 5
- reward/card / code: 5
- combat/plan-choice / jev: 4
- map/route / jev: 3
- combat/plan-choice / code-fallback: 2
- event/choose / claude: 2
- event/leave / code: 2
- reward/card / jev: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice+potion / claude: 1
- reward/card / claude: 1

### 兜底介入（Claude/DeepSeek）：9 次（推翻 Jev 2 次）
- [claude] 第 1 层 TNone event/choose: 同意 Jev（o1 @0.47 → o1）：150 gold up front buys a removal or a key card at the first shop; the fishing rod's random upgrades are slow.
- [claude] 第 5 层 TNone event/choose: 推翻 Jev（o1 @0.20 → o2）：Free, with a one-fight penalty of 2 Dazed at full HP; keeps all 304 gold for removals and key cards instead of 150 for f
- [claude] 第 6 层 T3 reward/card: 同意 Jev（card1 @0.20 → card1）：Breakthrough is 9 AoE for 1 energy and 1 HP; Act 1 has many multi-enemy hallway fights. Armaments is low impact.
- [claude] 第 7 层 T1 combat/plan-choice: 同意 Jev（plan1 @0.26 → plan1）：Both use the Weak potion (3 turns of -25% from an 80+ HP elite); plan1 keeps 5 more HP for 6 less damage.
- [claude] 第 7 层 T2 combat/plan-choice: 同意 Jev（plan4 @0.39 → plan4）：0 HP lost, and Flame Barrier's retaliation (4 per enemy hit) adds damage the listed 9 does not count.
- [claude] 第 7 层 T3 combat/plan-choice+potion: 推翻 Jev（plan1 @0.27 → p0）：Fruit Juice is permanent max HP with no timing value: drink it now, then re-plan the turn.
- [claude] 第 7 层 T3 combat/plan-choice: 同意 Jev（plan2 @0.24 → plan2）：Trading 6 HP for 9 chip damage is even at best; double Defend loses only 4.
- [claude] 第 7 层 T4 combat/plan-choice: 同意 Jev（plan1 @0.49 → plan1）：Byrdonis attacks 6x3: Flame Barrier reflects 4 per hit = 12 damage (not in the listed 0), while 17 block holds the loss 
- [claude] 第 7 层 T5 combat/plan-choice: 同意 Jev（plan1 @0.28 → plan1）：12 HP left is a sure kill next turn; 21 may survive and cost another 14-17 damage turn, more than the 6 HP saved now.

### Jev 低置信度（<0.35）决策：3 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫, 防御) with confidence 0.06; code rank 1 (0.06)
- 第 8 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 小啃兽, 防御, 飞剑回旋镖) with confidence 0.13; code rank 1 (0.13)
- 第 8 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 小啃兽, 突破) with confidence 0.31; code rank 1 (0.31)
