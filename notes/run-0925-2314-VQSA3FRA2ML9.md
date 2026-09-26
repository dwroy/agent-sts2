## 复盘：run VQSA3FRA2ML9 — 阵亡，最高第 33 层

- 决策 541 个；Jev 调用 105 次，Claude 0 次，DeepSeek 17 次；token 199,960 入 / 5,641 出，约 $0.0086；用时 31.8 分钟
- 决策者：code 367，jev 75，jev-plan 52，code-fallback 30，deepseek 17

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→62（-2），决策 code 8，jev 1，jev-plan 1
- 第 4 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 62→60（-2），决策 code 9，jev 6，jev-plan 5
- 第 5 层 毛绒伏地虫: HP 66→60（-6），决策 code 4，jev 1，jev-plan 1
- 第 6 层 劫掠者刺客/劫掠者弩手/劫掠者斧手: HP 66→41（-25），决策 code 15，jev-plan 4，jev 2，code-fallback 1
- 第 8 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 47→40（-7），决策 code 20，jev 2，jev-plan 2，code-fallback 1
- 第 11 层 异蛙寄生虫/扭动虫: HP 70→67（-3），决策 code 15，jev 4，jev-plan 2
- 第 14 层 多尼斯异鸟: HP 72→61（-11），决策 code 9，jev 7，jev-plan 6
- 第 15 层 闪光贾克斯果/飞蝇菌子: HP 67→56（-11），决策 code 9，jev 4，jev-plan 1
- 第 17 层 仪式兽: HP 80→49（-31），决策 code 23，jev 3，jev-plan 2
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 82→70（-12），决策 code 9，code-fallback 4
- 第 20 层 偷窃草蜢: HP 74→64（-10），决策 code 16，code-fallback 4，jev-plan 2，jev 1
- 第 22 层 虱虫之祖: HP 70→50（-20），决策 code 17，code-fallback 4，jev-plan 2，jev 1
- 第 24 层 外骨骼虫: HP 59→51（-8），决策 jev-plan 2，code 2，jev 1，code-fallback 1
- 第 24 层 外骨骼虫: HP 51→42（-9），决策 code 6，code-fallback 3
- 第 28 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 75→64（-11），决策 code 11，code-fallback 7，jev-plan 6，jev 4
- 第 28 层 熟睡甲虫: HP 64→63（-1），决策 code 5，code-fallback 1
- 第 30 层 猎人杀手: HP 69→46（-23），决策 code 10，code-fallback 4，jev-plan 4，jev 2
- 第 31 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 52→49（-3），决策 code 4
- 第 31 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 49→49（-0），决策 code 1
- 第 33 层 知识恶魔: HP 83→81（-2），决策 jev-plan 3，jev 2，code 1
- 第 33 层 知识恶魔: HP 81→68（-13），决策 code 8，jev 4，jev-plan 4
- 第 33 层 知识恶魔: HP 67→58（-9），决策 code 10，jev 4，jev-plan 2
- 第 33 层 知识恶魔: HP 57→40（-17），决策 code 5，jev 3，jev-plan 1
- 第 33 层 知识恶魔: HP 40→5（-35），决策 jev 5，code 2，jev-plan 2
- 第 33 层 知识恶魔: HP 5→4（-1），决策 jev 4
- 第 33 层 知识恶魔: HP 4→4（-0），决策 jev 1
- 第 33 层 知识恶魔: HP 4→3（-1），决策 code 6

### 死亡战斗：第 33 层 知识恶魔
- T16 [code] combat/plan: code plan (only distinct line): 耸肩无视, 契约终结; hp -1, dmg 20
- T16 [code] combat/plan: code plan (only distinct line): 契约终结; hp -1, dmg 20
- T16 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T17 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 11): 耸肩无视, 突破
- T17 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-21): 防御
- T17 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-21): end turn

### 各类决策由谁做
- combat/plan / code: 121
- combat/plan-continue / code: 74
- combat/plan-continue / jev-plan: 52
- combat/plan-choice / jev: 48
- reward/claim / code: 47
- combat/plan-choice / code-fallback: 30
- combat/lethal / code: 24
- map/route / code: 22
- reward/proceed / code: 17
- combat/plan-choice+potion / jev: 14
- reward/card / code: 11
- map/route / jev: 10
- rest/proceed / code: 7
- reward/card / deepseek: 6
- event/leave / code: 5
- rest/choose / code: 5
- shop/buy / deepseek: 5
- selection/add / code: 4
- shop/buy / code: 4
- combat/end_turn / code: 3
- combat/least-loss / code: 3
- event/choose / deepseek: 3
- selection/curse / code: 3
- selection/upgrade / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/only / code: 2
- rest/choose / jev: 2
- selection/remove / code: 2
- selection/take into my hand / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- run/finalize / code: 1
- selection/add / jev: 1

### 兜底介入（Claude/DeepSeek）：17 次（推翻 Jev 14 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.49 → o0）：额外两件遗物价值远超升级1打击1防御；骨骰带诅咒按经验必拒。遗物助力更弱的第二幕，提升整局胜率。
- [deepseek] 第 2 层 T3 reward/card: 同意 Jev（card2 @0.25 → card2）：Shrug It Off is A-tier: 8 block plus draw fixes our zero non-basic block and zero draw; Breakthrough's self-damage AoE i
- [deepseek] 第 3 层 TNone event/choose: 同意 Jev（o0 @0.30 → o0）：6 HP at 85% is cheap; Clumsy is a dead card and cursed relics are never worth it. 68 gold funds card removal and potions
- [deepseek] 第 4 层 T6 reward/card: 推翻 Jev（card1 @0.22 → card2）：御血术: 1费15伤，一幕最高效输出，助快速把仪式兽打到150触发击晕；2点自伤极轻，燃烧之血可回，且契合未来自伤/力量流。
- [deepseek] 第 7 层 TNone shop/buy: 推翻 Jev（buy_card1 @0.12 → buy_potion0）：消亡粉末免能量、无视格挡持续掉血，正补本牌组对252血仪式兽的输出短板；暴走为F级陷阱，能量药水收益偏小。药水留给Boss战。
- [deepseek] 第 7 层 TNone shop/buy: 推翻 Jev（buy_card0 @0.22 → buy_card4）：牌组缺持续格挡；第二张岩石铠甲叠加到每回合8格挡，仅38金；无壁垒时全身撞击太弱，药水价值低于永久防御。
- [deepseek] 第 12 层 TNone selection/upgrade: 推翻 Jev（card15 @0.23 → card8）：Bash+ (10 dmg, 3 vulnerable) boosts all attacks 50% for 3 turns — best for racing Ceremonial Beast to its 150 stun; Ston
- [deepseek] 第 14 层 T5 reward/card: 同意 Jev（card2 @0.38 → card2）：熔融之拳 (10dmg) 配合已升级痛击++：易伤3翻倍到6，对252血仪式兽整场+50%伤害，正是本牌组缺的爆发。
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o0 @0.15 → o2）：佩尔之血每回合无条件多抽1张，提升抽到格挡与核心牌的一致性；眼泪需刻意留能量，爪只强化防御牌，价值都更低。
- [deepseek] 第 19 层 T3 reward/card: 推翻 Jev（card1 @0.37 → card2）：拆卸 pairs with Bash++/Molten Fist vulnerable: 24+ damage for 1E, fills the deck's weak damage, and the deck lacks better 
- [deepseek] 第 20 层 T6 reward/card: 推翻 Jev（skip @0.03 → card2）：坚毅+ 每回合提供9格挡（二幕格挡牌优先），还能消耗打击/状态精简牌组；愤怒会复制塞弃牌堆，拖累知识恶魔长战。
- [deepseek] 第 23 层 TNone shop/buy: 推翻 Jev（buy_relic1 @0.14 → buy_card1）：Headbutt: cheap damage plus tutor for Bash++/Molten Fist/Shrug, keeps 139 gold for a later strike removal; Whetstone may
- [deepseek] 第 23 层 TNone shop/buy: 推翻 Jev（leave @0.24 → buy_card2）：Cheap permanent 8-block+draw; improves consistency for elite/boss multi-hits, and no affordable strength/AOE card exists
- [deepseek] 第 23 层 TNone shop/buy: 推翻 Jev（buy_card2 @0.21 → buy_potion0）：牌组无力量来源，知识恶魔379血需速攻；异鱼之油补力量+敏捷，可与易伤药水叠加爆发，优于格挡牌。
- [deepseek] 第 27 层 TNone selection/upgrade: 推翻 Jev（card13 @0.39 → card15）：升级绯红披风：每回合多3点稳定格挡，知识恶魔这种十几回合持久战收益最高；覆甲会被未挡伤害削减，战斗专注只多抽1张，价值较低。
- [deepseek] 第 29 层 TNone selection/upgrade: 推翻 Jev（card7 @0.31 → card13）：战斗专注升级后抽4张，提升0费过牌与关键牌上手率；本局无力量来源、知识恶魔是十几回合耐久战，抽牌比再堆1张覆甲更关键。
- [deepseek] 第 30 层 T5 reward/card: 推翻 Jev（skip @0.25 → card1）：突破+ is a pre-upgraded 13-damage AOE for 1E — above deck average; third AOE helps elites and act 3 multi-enemy fights. De

### Jev 低置信度（<0.35）决策：28 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 缩小甲虫, 防御) with confidence 0.18; code rank 1 (0.18)
- 第 4 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 树枝史莱姆（中）, 防御, 防御) with confidence 0.18; code rank 1 (0.18)
- 第 5 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.33; code rank 1 (0.33)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (防御, 岩石铠甲, 防御) with confidence 0.18; code rank 1 (0.18)
- 第 6 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 劫掠者斧手, 打击 -> 劫掠者弩手, 御血术 -> 劫掠者弩手) with confidence 0.14; code rank 1 (0.14)
- 第 11 层 combat/plan-choice: Jev chose plan 3/4 (耸肩无视, 痛击 -> 异蛙寄生虫) with confidence 0.34; code rank 3 (0.34)
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (岩石铠甲, 御血术 -> 多尼斯异鸟, 耸肩无视) with confidence 0.32; code rank 1 (0.32)
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (突破, 御血术 -> 多尼斯异鸟) with confidence 0.18; code rank 1; HP guard: plan 1 (突破, 御血术 -> 多尼斯异鸟) loses 8 HP, more than 6 over the cheapest (0.18)
- 第 15 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 闪光贾克斯果, 突破, 御血术 -> 飞蝇菌子) with confidence 0.13; code rank 1 (0.13)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (岩石铠甲, 熔融之拳 -> 仪式兽, 打击 -> 仪式兽) with confidence 0.19; code rank 1; HP guard: plan 1 (岩石铠甲, 熔融之拳 -> 仪式兽, 打击 -> 仪式兽) loses 11 HP, more (0.19)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (痛击+ -> 仪式兽, 打击 -> 仪式兽) with confidence 0.28; code rank 1; HP guard: plan 1 (痛击+ -> 仪式兽, 打击 -> 仪式兽) loses 8 HP, more than 5 over th (0.28)
- 第 28 层 combat/plan-choice: Jev chose plan 2/4 (打击 -> 盛碗虫（石）, 耸肩无视, 绯红披风+) with confidence 0.29; code rank 2 (0.29)
- 第 30 层 combat/plan-choice: Jev chose plan 1/4 (御血术 -> 猎人杀手, 绯红披风+, 熔融之拳 -> 猎人杀手) with confidence 0.28; code rank 1 (0.28)
- 第 33 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 知识恶魔, 御血术 -> 知识恶魔, 熔融之拳 -> 知识恶魔) with confidence 0.17; code rank 1 (0.17)
- 第 33 层 combat/plan-choice: Jev chose plan 3/4 (狂宴 -> 知识恶魔, 耸肩无视, 突破) with confidence 0.21; code rank 3 (0.21)
