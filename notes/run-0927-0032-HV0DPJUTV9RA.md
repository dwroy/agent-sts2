## 复盘：run HV0DPJUTV9RA — 阵亡，最高第 21 层

- 决策 314 个；Jev 调用 50 次，Claude 0 次，DeepSeek 8 次；token 80,489 入 / 2,437 出，约 $0.0035；用时 17.1 分钟
- 决策者：code 210，jev 46，jev-plan 46，deepseek 8，code-fallback 4

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→52（-12），决策 code 5，jev-plan 2，jev 1，code-fallback 1
- 第 3 层 毛绒伏地虫: HP 58→53（-5），决策 code 5，jev-plan 4，jev 2
- 第 5 层 缩小甲虫: HP 52→51（-1），决策 code 7
- 第 6 层 墨宝: HP 49→40（-9），决策 jev-plan 6，code 6，jev 3
- 第 8 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 53→39（-14），决策 code 14，jev 3，jev-plan 3
- 第 12 层 方柱构装体: HP 59→53（-6），决策 code 6，jev 6，jev-plan 3
- 第 14 层 多尼斯异鸟: HP 70→47（-23），决策 code 7，jev 2，jev-plan 1
- 第 15 层 闪光贾克斯果/飞蝇菌子: HP 53→35（-18），决策 code 6，jev-plan 4，jev 2，code-fallback 1
- 第 17 层 同族信徒/同族神官: HP 67→6（-61），决策 code 31，jev 13，jev-plan 12
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 72→41（-31），决策 code 13，jev-plan 4，jev 2，code-fallback 1
- 第 21 层 地道虫: HP 47→8（-39），决策 code 28，jev 8，jev-plan 7，code-fallback 1

### 死亡战斗：第 21 层 地道虫
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 挑衅 -> 地道虫
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T10 [jev] combat/plan-choice: Jev chose plan 1/4 (巨像, 耸肩无视+) with confidence 0.51; code rank 1 conf 0.51
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视+
- T10 [jev] combat/plan-choice: Jev chose plan 2/2 (剑柄打击 -> 地道虫) with confidence 0.55; code rank 2 conf 0.55
- T10 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T11 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 26): 战斗专注, 痛击 -> 地道虫, 打击+ -
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 打击+ -> 地道虫, 防御, 双重打击 -> 地道虫
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 地道虫
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan / code: 80
- combat/plan-continue / jev-plan: 46
- combat/plan-choice / jev: 42
- combat/plan-continue / code: 32
- reward/claim / code: 24
- map/route / code: 18
- combat/lethal / code: 11
- reward/proceed / code: 11
- reward/card / code: 10
- event/choose / deepseek: 7
- event/leave / code: 5
- combat/least-loss / code: 4
- combat/plan-choice / code-fallback: 4
- rest/proceed / code: 3
- map/route / jev: 2
- shop/buy / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-guarded / code: 1
- event/choose / jev: 1
- map/discard-potion / code: 1
- rest/choose / code: 1
- rest/choose / jev: 1
- run/finalize / code: 1
- selection/transform / code: 1
- shop/buy / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：8 次（推翻 Jev 5 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.25 → o0）：变形一张打击提升牌组质量，无色牌平均偏弱且不删打击；本局缺输出与AOE，随机牌期望更高。
- [deepseek] 第 4 层 TNone shop/buy: 同意 Jev（buy_card2 @0.25 → buy_card2）：买巨像：36金可负担，牌组缺格挡牌，配合痛击的易伤可减50%来袭伤害；这里剩下的钱也删不了牌。
- [deepseek] 第 7 层 TNone event/choose: 推翻 Jev（o1 @0.05 → o0）：多尼斯异鸟蛋是打不出的废牌占手牌；+7 最大生命是手册推荐的永久收益（有+最大生命就选）。
- [deepseek] 第 11 层 TNone event/choose: 推翻 Jev（o0 @0.09 → o1）：3 HP is trivial (71/87, Burning Blood); Shrug It Off is one of only 3 block cards. Reroll hoping to pitch a Strike inste
- [deepseek] 第 11 层 TNone event/choose: 同意 Jev（o1 @0.41 → o1）：Inferno is our only AoE, essential for Kin's followers; 4 HP is cheap to reroll the removal onto a Strike.
- [deepseek] 第 11 层 TNone event/choose: 同意 Jev（o1 @0.24 → o1）：燃烧是本局唯一永久力量来源，删掉必输神官(190血+信徒)；5点生命很便宜，有休息点和燃烧之血兜底，重随机更划算。
- [deepseek] 第 11 层 TNone event/choose: 推翻 Jev（o1 @0.08 → o0）：Free deck-thinning; 6 HP reroll risks landing on core cards (燃烧/地狱火) and escalates cost. HP already below boss-entry ave
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o0 @0.24 → o1）：Wings turns card rewards we plan to skip into relics with no HP cost; relic density best fixes our weak deck before Kais

### Jev 低置信度（<0.35）决策：16 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (防御, 狱火, 打击 -> 树叶史莱姆（小）) with confidence 0.19; code rank 1 (0.19)
- 第 6 层 combat/plan-choice: Jev chose plan 1/4 (燃烧, 打击 -> 墨宝, 双重打击 -> 墨宝) with confidence 0.25; code rank 1 (0.25)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 墨宝, 防御, 打击 -> 墨宝) with confidence 0.26; code rank 1 (0.26)
- 第 12 层 combat/plan-choice: Jev chose plan 1/4 (燃烧, 剑柄打击 -> 方柱构装体, 防御+) with confidence 0.32; code rank 1 (0.32)
- 第 12 层 combat/plan-choice: Jev chose plan 1/2 (防御+) with confidence 0.16; code rank 1 (0.16)
- 第 14 层 combat/plan-choice: Jev chose plan 2/4 (耸肩无视, 燃烧, 狱火) with confidence 0.21; code rank 2 (0.21)
- 第 17 层 combat/plan-choice: Jev chose plan 2/4 (挑衅 -> 同族信徒, potion 缚魂药水, 打击 -> 同族信徒, 打击 -> 同族信徒) with confidence 0.29; code rank 2 (0.29)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 同族信徒) with confidence 0.02; code rank 1 (0.02)
- 第 17 层 combat/plan-choice: Jev chose plan 3/4 (防御+, 双重打击 -> 同族神官, 防御+) with confidence 0.11; code rank 3 (0.11)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (剑柄打击 -> 同族神官, 双重打击 -> 同族神官, 防御) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 2/4 (防御, 耸肩无视) with confidence 0.19; code rank 2 (0.19)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (挑衅 -> 同族神官, 打击 -> 同族神官) with confidence 0.22; code rank 1 (0.22)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (防御+, 双重打击 -> 同族神官, 剑柄打击 -> 同族神官) with confidence 0.24; code rank 1 (0.24)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (挑衅 -> 同族神官, 双重打击 -> 同族神官, 剑柄打击 -> 同族神官) with confidence 0.25; code rank 1 (0.25)
- 第 19 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 盛碗虫（蜜）, 狱火, 防御+, 打击 -> 盛碗虫（蜜）) with confidence 0.20; code rank 1 (0.20)
