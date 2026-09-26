## 复盘：run WFR4AUP2CWDT — 未结束，最高第 7 层

- 决策 93 个；Jev 调用 15 次，Claude 9 次，DeepSeek 0 次；token 16,867 入 / 612 出，约 $0.0007；用时 4.6 分钟
- 决策者：code 65，claude-plan 10，claude 9，jev 6，jev-plan 3

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 80→77（-3），决策 code 7，claude-plan 3，claude 2
- 第 3 层 缩小甲虫: HP 80→80（-0），决策 code 6
- 第 4 层 毛绒伏地虫: HP 80→76（-4），决策 code 8
- 第 5 层 藤蔓蹒跚者: HP 80→54（-26），决策 code 4，jev 2，jev-plan 2，claude-plan 2，claude 1
- 第 6 层 闪光贾克斯果/飞蝇菌子: HP 60→45（-15），决策 code 10，claude-plan 3，claude 2，jev 2，jev-plan 1
- 第 7 层 方柱构装体: HP 51→51（-0），决策 code 4，claude-plan 2，claude 1

### 各类决策由谁做
- combat/end_turn / code: 15
- reward/claim / code: 13
- combat/plan-continue / claude-plan: 10
- combat/plan-continue / code: 10
- combat/plan / code: 8
- combat/lethal / code: 6
- combat/plan-choice / claude: 6
- reward/proceed / code: 5
- combat/plan-choice / jev: 4
- map/route / code: 4
- combat/plan-continue / jev-plan: 3
- reward/card / code: 3
- event/choose / claude: 1
- event/leave / code: 1
- map/route / claude: 1
- map/route / jev: 1
- reward/card / claude: 1
- reward/card / jev: 1

### 兜底介入（Claude/DeepSeek）：9 次（推翻 Jev 4 次）
- [claude] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.49 → o0）：+5 max HP per rest compounds over three acts; upgrading a Strike and a Defend is minor, and the potion option adds a cur
- [claude] 第 1 层 TNone map/route: 同意 Jev（n0 @0.31 → n0）：Route values are equal; a starter deck needs card rewards most, and n0 continues through hallway fights.
- [claude] 第 2 层 T1 combat/plan-choice: 同意 Jev（plan1 @0.22 → plan1）：Trading 5 HP for 6 extra damage against a 42-HP hallway enemy is poor; block now and keep HP.
- [claude] 第 2 层 T2 combat/plan-choice: 推翻 Jev（plan2 @0.11 → plan1）：Same Vulnerable 2 setup for 1 HP instead of 6; the extra 9 damage is not worth 5 HP in a hallway fight.
- [claude] 第 5 层 T2 combat/plan-choice: 推翻 Jev（plan2 @0.26 → plan1）：Either way it dies next turn (15 HP with Vulnerable 3 is two Strikes); plan1 saves 5 HP.
- [claude] 第 5 层 T4 reward/card: 同意 Jev（card2 @0.29 → card2）：Early deck is mostly Strikes/Defends, so True Grit's random exhaust usually thins basics; 1-cost 7 block beats a 3-cost 
- [claude] 第 6 层 T1 combat/plan-choice: 同意 Jev（plan2 @0.17 → plan2）：Neither plan kills; plan2 blocks 12 and still AoEs 18 for 3 HP lost versus 8.
- [claude] 第 6 层 T2 combat/plan-choice: 同意 Jev（plan1 @0.15 → plan1）：No plan kills the fruit this turn; plan1 loses 3 HP instead of 8-13 for a few points of chip damage.
- [claude] 第 7 层 T2 combat/plan-choice: 推翻 Jev（plan3 @0.06 → plan1）：No kill this turn: take 0 damage with double Defend and still chip 10.

### Jev 低置信度（<0.35）决策：1 个
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (坚毅, 打击 -> 飞蝇菌子, 打击 -> 飞蝇菌子) with confidence 0.34; code rank 1 (0.34)
