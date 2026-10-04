## 复盘：run 2WUMK6PK5QHD — 未结束，最高第 21 层

- 决策 312 个；Jev 调用 39 次，Claude 0 次，DeepSeek 24 次；token 78,863 入 / 2,610 出，约 $0.0034；用时 18.0 分钟
- 决策者：code 204，jev 30，jev-plan 29，deepseek 24，deepseek-plan 16，code-fallback 9

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→58（-6），决策 code 9，jev-plan 5，jev 3
- 第 3 层 蟾蜍蝌蚪: HP 64→53（-11），决策 code 5，jev 1
- 第 5 层 海洋混混: HP 41→41（-0），决策 code 11，code-fallback 2，jev 1，jev-plan 1
- 第 6 层 卑鄙地精/地精佣兵/胖地精: HP 48→40（-8），决策 code 12，jev-plan 4，jev 2，code-fallback 2
- 第 7 层 海洋混混/钙化邪教徒: HP 47→31（-16），决策 code 6，jev-plan 4，jev 3
- 第 9 层 化石追踪者: HP 62→55（-7），决策 code 3，code-fallback 1
- 第 11 层 潮湿邪教徒/钙化邪教徒: HP 62→62（-0），决策 code 2，jev 1
- 第 11 层 潮湿邪教徒/钙化邪教徒: HP 62→55（-7），决策 code 4，jev 1
- 第 12 层 鬼祟珊瑚群: HP 62→41（-21），决策 deepseek-plan 7，code 6，deepseek 4
- 第 13 层 下水道蚌: HP 48→48（-0），决策 code 7，jev 2，jev-plan 2
- 第 15 层 气态炸弹/活雾: HP 43→40（-3），决策 code 9，jev-plan 2，jev 1，code-fallback 1
- 第 17 层 瀑布巨兽: HP 88→65（-23），决策 code 21，deepseek 10，deepseek-plan 9，jev 3，jev-plan 3
- 第 19 层 地道虫: HP 89→68（-21），决策 code 7，jev-plan 5，jev 3
- 第 20 层 外骨骼虫: HP 75→75（-0），决策 code 5，code-fallback 1
- 第 21 层 异螨: HP 82→71（-11），决策 code 6，jev-plan 3，code-fallback 2，jev 1

### 各类决策由谁做
- reward/claim / code: 40
- combat/end_turn / code: 38
- combat/plan-continue / code: 33
- combat/plan-continue / jev-plan: 29
- combat/plan / code: 28
- combat/plan-choice / jev: 19
- combat/plan-continue / deepseek-plan: 16
- combat/lethal / code: 14
- reward/proceed / code: 14
- map/route / code: 13
- reward/card / code: 11
- combat/plan-choice / code-fallback: 9
- combat/plan-choice / deepseek: 7
- combat/plan-choice+potion / deepseek: 7
- event/choose / deepseek: 6
- map/route / jev: 5
- event/leave / code: 4
- combat/plan-choice+potion / jev: 3
- map/route / deepseek: 2
- rest/choose / code: 2
- rest/proceed / code: 2
- reward/card / deepseek: 2
- selection/remove / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/choose / jev: 1
- reward/card / jev: 1
- selection/add / jev: 1

### 兜底介入（Claude/DeepSeek）：24 次（推翻 Jev 14 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o0 @0.35 → o2）：Removing 2 Strikes early beats 2 minor upgrades; 16 HP is minor and Burning Blood recovers it over the act.
- [deepseek] 第 4 层 TNone event/choose: 推翻 Jev（o0 @0.42 → o1）：Relic is permanent value; 14 HP is affordable at 69% with Burning Blood sustain, while two random commons dilute this th
- [deepseek] 第 6 层 T6 reward/card: 推翻 Jev（card1 @0.40 → card2）：双重打击 1E 打 10 点、多段可成长且不消耗，长线对瀑布巨兽更稳；熔融之拳消耗后收益一次性。
- [deepseek] 第 12 层 T1 combat/plan-choice: 推翻 Jev（plan1 @0.14 → plan2）：At 73% HP with healing relic, trade 5 HP for 6 extra damage to shorten this 75 HP elite fight.
- [deepseek] 第 12 层 T2 combat/plan-choice: 同意 Jev（plan1 @0.34 → plan1）：Flame Barrier blocks most damage and reflects, Twin Strike chips 10 while only losing 2 HP; Plan2 wastes a turn at 0 dmg
- [deepseek] 第 12 层 T3 combat/plan-choice: 同意 Jev（plan1 @0.30 → plan1）：Same 20 damage as plan2 but only 3 HP lost (6 block via Taunt), leaving enemy at 26 with Vulnerable; strictly best tempo
- [deepseek] 第 12 层 T4 combat/plan-choice: 推翻 Jev（plan1 @0.14 → plan2）：Leave elite at 6 HP so any attack kills next turn, saving a full 18-damage enemy turn; 12 HP is affordable with Burning 
- [deepseek] 第 13 层 T3 map/route: 推翻 Jev（n1 @0.04 → n0）：Higher route value; Unknown may be event or shop to save HP, and a RestSite still follows before the boss.
- [deepseek] 第 14 层 TNone event/choose: 推翻 Jev（o0 @0.12 → o1）：3点生命代价极低；重掷以求移除打击/防御等废牌，保留能与痛击易伤配合的欺凌，16张牌组更精简。
- [deepseek] 第 14 层 TNone event/choose: 同意 Jev（o1 @0.20 → o1）：Bash is the only vulnerable source and key Act 1 attack; pay 4 HP to reroll for a Strike/Defend removal instead — 52/87 
- [deepseek] 第 14 层 TNone event/choose: 推翻 Jev（o1 @0.44 → o0）：Free removal of a Strike is ideal deck thinning; paying 6 HP to reroll risks a worse outcome for marginal gain.
- [deepseek] 第 15 层 T4 reward/card: 推翻 Jev（card0 @0.11 → card2）：战斗专注是S级0费过3张：牌组零过牌，能更快找到防御/火焰屏障应对巨兽自爆；耸肩仅8格挡，价值次之。
- [deepseek] 第 17 层 T3 combat/plan-choice+potion: 同意 Jev（plan1 @0.47 → plan1）：Loses 0 HP, gains 12 block, saves potions for explosion; 2 damage difference not worth losing 5-10 HP.
- [deepseek] 第 17 层 T3 combat/plan-choice+potion: 同意 Jev（plan1 @0.46 → plan1）：Twin Strike uses otherwise-wasted energy for free damage; Taunt's Vulnerable 1 expires before my next attacks, so hold i
- [deepseek] 第 17 层 T3 combat/plan-choice+potion: 同意 Jev（plan1 @0.25 → plan1）：Fully blocked (0 HP lost), 0 energy, nothing to play. Drinking Plating now is wasted on an already-blocked turn; save po
- [deepseek] 第 17 层 T5 combat/plan-choice+potion: 同意 Jev（plan1 @0.15 → plan1）：Flame Barrier is our best block; chips 10 damage while losing only 8 HP, preserving buffer for the boss's growing explos
- [deepseek] 第 17 层 T6 combat/plan-choice+potion: 同意 Jev（plan1 @0.21 → plan1）：Blocking heavy keeps HP above the eruption self-destruct threshold; the 5-10 extra HP saved outweighs 6-11 marginal dama
- [deepseek] 第 17 层 T6 combat/plan-choice+potion: 推翻 Jev（plan1 @0.20 → p0）：Drink Iron Skin now: plating cancels the 3 HP loss and adds block each remaining turn, vital before the boss's self-dest
- [deepseek] 第 17 层 T6 combat/plan-choice+potion: 同意 Jev（p1 @0.03 → p1）：Free Plating boosts block for the impending explosion and future turns; taking 0 damage this turn means pure upside.
- [deepseek] 第 17 层 T7 combat/plan-choice: 推翻 Jev（plan2 @0.17 → plan1）：Applies Vulnerable 3, boosting all future turns (enemy still has 72 HP, race matters since steam grows); plan2's extra 9

### Jev 低置信度（<0.35）决策：3 个
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御, 防御) with confidence 0.24; code rank 1 (0.24)
- 第 11 层 combat/plan-choice: Jev chose plan 1/2 (头槌 -> 潮湿邪教徒, 旋风斩) with confidence 0.24; code rank 1 (0.24)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (防御, 战斗专注) with confidence 0.26; code rank 1 (0.26)
