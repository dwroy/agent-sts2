## 复盘：run V5S6QVVQYL37 — 未结束，最高第 22 层

- 决策 302 个；Jev 调用 54 次，DeepSeek 10 次；token 91,777 入 / 3,539 出，约 $0.0040；用时 15.7 分钟
- 决策者：code 199，jev 54，jev-plan 39，deepseek 10

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 80→77（-3），决策 code 7，jev 5，jev-plan 5
- 第 4 层 缩小甲虫: HP 80→70（-10），决策 code 7，jev-plan 3，jev 2
- 第 6 层 毛绒伏地虫: HP 76→69（-7），决策 code 7，jev-plan 4，jev 3
- 第 8 层 旧日雕像: HP 75→29（-46），决策 code 9，jev-plan 4，jev 3
- 第 11 层 利齿之眼/雾菇: HP 59→56（-3），决策 code 8，jev 2，jev-plan 2
- 第 12 层 树枝史莱姆（中）/飞蝇菌子: HP 62→54（-8），决策 code 8
- 第 14 层 方柱构装体: HP 60→46（-14），决策 code 12
- 第 15 层 多尼斯异鸟: HP 52→32（-20），决策 jev-plan 7，jev 6，code 3
- 第 15 层 多尼斯异鸟: HP 32→32（-0），决策 jev 1
- 第 15 层 多尼斯异鸟: HP 32→19（-13），决策 code 3，jev 2，jev-plan 2
- 第 17 层 仪式兽: HP 49→38（-11），决策 code 22，jev-plan 12，jev 6，deepseek 5
- 第 19 层 偷窃草蜢: HP 80→28（-52），决策 code 12
- 第 21 层 外骨骼虫: HP 34→34（-0），决策 code 4
- 第 22 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 40→12（-28），决策 code 13，jev 4

### 各类决策由谁做
- combat/end_turn / code: 43
- combat/plan-continue / jev-plan: 39
- reward/claim / code: 29
- combat/plan-continue / code: 26
- combat/plan / code: 24
- combat/lethal / code: 22
- combat/plan-choice / jev: 17
- map/route / code: 13
- combat/plan-choice+potion / jev: 11
- reward/proceed / code: 11
- map/route / jev: 7
- combat/play / jev: 6
- reward/card / jev: 6
- reward/card / code: 5
- shop/buy / code: 4
- combat/plan-choice / deepseek: 3
- event/leave / code: 3
- rest/choose / code: 3
- rest/proceed / code: 3
- selection/upgrade / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- combat/plan-choice+potion / deepseek: 2
- event/choose / jev: 2
- selection/remove / jev: 2
- selection/upgrade / deepseek: 2
- shop/buy / jev: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/choose / deepseek: 1
- map/route / deepseek: 1
- selection/choose / jev: 1
- selection/remove / code: 1
- shop/buy / deepseek: 1

### DeepSeek 介入：10 次（推翻 Jev 4 次）
- 第 17 层 T3 combat/plan-choice+potion: 推翻 Jev（plan1 @0.19 → plan2）：Blocks 10, takes only 3 damage, chips 17; preserves HP for long boss fight with scaling intent.
- 第 17 层 T5 combat/plan-choice+potion: 推翻 Jev（plan2 @0.15 → plan3）：Boss at 169 HP; survive first. Plan3 loses least HP (12) while applying Vulnerable 5 for future turns.
- 第 17 层 T8 combat/plan-choice: 同意 Jev（plan2 @0.19 → plan2）：At 12 HP vs 15 attack, survival is critical; plan2 takes 0 damage and still applies Vulnerable for future turns.
- 第 17 层 T9 combat/plan-choice: 同意 Jev（plan1 @0.27 → plan1）：Survives at 8 HP with 10 block and Vulnerable 3; plan2 risks death at 4 HP for only 5 more damage.
- 第 17 层 T10 combat/plan-choice: 同意 Jev（plan2 @0.49 → plan2）：More damage and block, no HP loss; at 7 HP survival is everything, and Lizard Tail still in reserve.
- 第 18 层 TNone event/choose: 推翻 Jev（o2 @0.17 → o0）：Upgrade 4 cards is strong permanent value; deck is 20 cards with only 1 upgrade, and no downside.
- 第 18 层 TNone selection/upgrade: 同意 Jev（card14 @0.15 → card14）：重锤升级后伤害大幅提升，是当前卡组最强单体爆发，优先升级收益最高。
- 第 18 层 TNone selection/upgrade: 同意 Jev（card17 @0.14 → card17）：旋风斩升级后每次伤害5→8，配合力量与易伤是主要AOE输出，收益最高。
- 第 18 层 TNone map/route: 推翻 Jev（n1 @0.33 → n0）：Highest route value, leads to shop for deck fixing with 283 gold, and full HP makes early fights safe.
- 第 20 层 TNone shop/buy: 同意 Jev（buy_relic0 @0.28 → buy_relic0）：红面具开局群体虚弱，显著降低战损，配合易伤体系提升生存，优于随机升级或无色牌。

### Jev 低置信度（<0.35）决策：19 个
- 第 1 层 event/choose: Jev chose 金色珍珠 with confidence 0.30 (0.30)
- 第 2 层 combat/plan-choice: Jev chose plan 2/4 (防御, 打击 -> 树枝史莱姆（小）, 打击 -> 树枝史莱姆（小）) with confidence 0.21; code rank 2 (0.21)
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 树叶史莱姆（中）, 防御) with confidence 0.06; code rank 1 (0.06)
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 树叶史莱姆（中）, 打击 -> 树叶史莱姆（中）, 打击 -> 树叶史莱姆（小）) with confidence 0.34; code rank 1 (0.34)
- 第 2 层 reward/card: Jev chose 凶恶 (Power, 1E) with confidence 0.11 (0.11)
- 第 3 层 shop/buy: Jev chose buy 石化蟾蜍 (229g) with confidence 0.16 (0.16)
- 第 4 层 combat/plan-choice: Jev chose plan 4/4 (打击 -> 缩小甲虫, 防御, 打击 -> 缩小甲虫) with confidence 0.29; code rank 4 (0.29)
- 第 4 层 combat/plan-choice: Jev chose plan 2/2 (防御, 打击 -> 缩小甲虫) with confidence 0.31; code rank 2 (0.31)
- 第 5 层 shop/buy: Jev chose buy 全身撞击 (48g) with confidence 0.19 (0.19)
- 第 6 层 combat/plan-choice: Jev chose plan 2/3 (防御) with confidence 0.15; code rank 2 (0.15)
- 第 11 层 combat/plan-choice: Jev chose plan 1/4 (防御, 预备打击 -> 利齿之眼, 打击 -> 雾菇) with confidence 0.13; code rank 1 (0.13)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 2/3 (痛击+ -> 多尼斯异鸟, 防御, potion 药水形状的石头 -> 多尼斯异鸟) with confidence 0.18; code rank 2 (0.18)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 3/3 (防御, 打击 -> 多尼斯异鸟, 巨像) with confidence 0.32; code rank 3 (0.32)
- 第 15 层 combat/plan-choice: Jev chose plan 1/4 (挑衅 -> 多尼斯异鸟, 防御, 全身撞击 -> 多尼斯异鸟) with confidence 0.34; code rank 1 (0.34)
- 第 15 层 combat/plan-choice+potion: Jev chose to drink 无色药水 (confidence 0.12) (0.12)
