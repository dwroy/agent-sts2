## 复盘：run 92MWCWJCFDAE — 阵亡，最高第 33 层

- 决策 437 个；Jev 调用 56 次，Claude 0 次，DeepSeek 12 次；token 106,465 入 / 3,054 出，约 $0.0046；用时 21.9 分钟
- 决策者：code 328，jev 49，jev-plan 41，deepseek 12，code-fallback 7

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→56（-8），决策 code 3，jev 1，jev-plan 1
- 第 3 层 海洋混混: HP 62→53（-9），决策 jev-plan 3，code 3，jev 2，code-fallback 1
- 第 4 层 蟾蜍蝌蚪: HP 59→55（-4），决策 code 7
- 第 6 层 海洋混混/钙化邪教徒: HP 59→40（-19），决策 code 8，jev 4，jev-plan 2，code-fallback 1
- 第 7 层 鬼祟珊瑚群: HP 46→46（-0），决策 code 1
- 第 7 层 鬼祟珊瑚群: HP 46→12（-34），决策 code 8，jev 4，jev-plan 4，code-fallback 1
- 第 12 层 噬尸蛞蝓: HP 66→51（-15），决策 code 8，jev 2，jev-plan 2，code-fallback 1
- 第 13 层 拳击构装体: HP 57→55（-2），决策 code 7，jev 2，jev-plan 1
- 第 14 层 花园幽灵鳗: HP 61→18（-43），决策 code 14，jev 6，jev-plan 4
- 第 17 层 灵魂异鱼: HP 63→63（-0），决策 code 1
- 第 17 层 灵魂异鱼: HP 63→31（-32），决策 code 31，jev-plan 7，jev 5
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 74→60（-14），决策 code 8，code-fallback 2
- 第 20 层 偷窃草蜢: HP 69→52（-17），决策 code 7
- 第 21 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 58→39（-19），决策 code 12，jev 2，code-fallback 1，jev-plan 1
- 第 27 层 寄生惧魔/胧光怪: HP 60→46（-14），决策 code 9，jev-plan 3，jev 2
- 第 29 层 残杀千足虫: HP 81→81（-0），决策 code 1
- 第 29 层 残杀千足虫: HP 81→34（-47），决策 code 9，jev-plan 4，jev 3
- 第 30 层 猎人杀手: HP 42→24（-18），决策 code 7，jev-plan 4，jev 2
- 第 31 层 外骨骼虫: HP 32→9（-23），决策 code 12，jev 1，jev-plan 1
- 第 33 层 知识恶魔: HP 44→44（-0），决策 code 3，jev 1
- 第 33 层 知识恶魔: HP 44→23（-21），决策 code 10，jev-plan 4，jev 2
- 第 33 层 知识恶魔: HP 22→4（-18），决策 code 12

### 死亡战斗：第 33 层 知识恶魔
- T6 [code] combat/plan: code plan (+11.6 over next): 剑柄打击 -> 知识恶魔, 邪眼, 御血术 -> 知识恶魔; hp -6, dmg 34
- T6 [code] combat/plan-guarded: code plan 邪眼, 御血术 -> 知识恶魔 loses 6 HP, over the HP guard bound; playing 剑柄打击 -> 知识恶魔, 邪眼 instead (hp -4, dmg 11)
- T6 [code] combat/plan: code plan (+16.4 over next): 邪眼; hp -4, dmg 0
- T6 [code] combat/plan: code plan (only line): end turn; hp -4, dmg 0
- T7 [code] combat/plan: code plan (only distinct line): 挑衅 -> 知识恶魔, 痛殴 -> 知识恶魔, 防御; hp -9, dmg 54
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 痛殴 -> 知识恶魔
- T7 [code] combat/plan: code plan (only line): 防御; hp -14, dmg 0
- T7 [code] combat/plan: code plan (only line): end turn; hp -14, dmg 0
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 防御, 打击 -> 知识恶魔, 打击 -> 知识恶魔
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 知识恶魔
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 知识恶魔
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan / code: 86
- combat/plan-continue / code: 60
- reward/claim / code: 53
- combat/plan-continue / jev-plan: 41
- combat/plan-choice / jev: 33
- map/route / code: 29
- combat/lethal / code: 24
- reward/proceed / code: 17
- reward/card / code: 10
- combat/plan-choice / code-fallback: 7
- combat/plan-choice+potion / jev: 6
- event/leave / code: 6
- rest/proceed / code: 6
- combat/plan-guarded / code: 5
- event/choose / deepseek: 5
- rest/choose / code: 5
- combat/plan-potion / code: 4
- map/route / jev: 3
- reward/card / deepseek: 3
- reward/card / jev: 3
- shop/buy / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- selection/curse / code: 2
- selection/take into my hand / jev: 2
- shop/buy / deepseek: 2
- shop/leave / code: 2
- shop/open / code: 2
- event/only / code: 1
- rest/choose / jev: 1
- run/finalize / code: 1
- selection/add / code: 1
- selection/add / deepseek: 1
- selection/choose / jev: 1
- selection/enchant / deepseek: 1
- selection/remove / code: 1
- selection/take into my hand / code: 1
- selection/upgrade / code: 1

### 兜底介入（Claude/DeepSeek）：12 次（推翻 Jev 8 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.30 → o0）：Permanent colorless card improves an 11-card starter deck; avoids curse (o2) and one-time random potions the bot often m
- [deepseek] 第 3 层 T3 reward/card: 推翻 Jev（card2 @0.14 → card1）：狱火是可持续 AOE 兼成长牌，正好补牌组 0 AOE、0 能力、0 成长的短板，1 回合 1 血代价极低。
- [deepseek] 第 5 层 TNone selection/add: 推翻 Jev（card1 @0.28 → card0）：狱火已就位：突破自伤1点即触发狱火6点群伤，1费等于全场15点，补足第二张AOE，后期多敌战核心。
- [deepseek] 第 9 层 TNone event/choose: 推翻 Jev（o2 @0.13 → o0）：Attack-heavy deck: Sharp 2 on Breakthrough adds recurring AOE damage every play, while cheap powers waste Swift and no b
- [deepseek] 第 9 层 TNone selection/enchant: 推翻 Jev（card7 @0.34 → card6）：无休手斧每回合回到手牌，可反复吃到+2伤害，本场累积收益最高；打击将删、痛击/熔融之拳/突破每场只打一两次。
- [deepseek] 第 13 层 T3 reward/card: 同意 Jev（card0 @0.44 → card0）：Deck has only one real block card; Taunt adds 6 block plus vulnerable synergy with Molten Fist/Bash, and Unmovable doubl
- [deepseek] 第 15 层 TNone shop/buy: 推翻 Jev（buy_card1 @0.19 → remove）：75g strike removal is top priority (5 strikes left); 218g remaining still covers Feed (150g) and a boss potion on follow
- [deepseek] 第 15 层 TNone shop/buy: 推翻 Jev（leave @0.21 → buy_potion2）：Boss is Soul Fysh: pop Ability Potion turn 1 for Demon Form/Inflame scaling; only 49g and no card is affordable anyway.
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o0 @0.11 → o2）：佩尔之血无条件每回合多抽1张，直接补牌量与稳定性，帮我找到仅有的2张格挡和关键攻击；能量条件触发不可靠，我牌均费仅0.96。
- [deepseek] 第 21 层 T4 reward/card: 同意 Jev（card2 @0.31 → card2）：Deck lacks any strength scaling for 379 HP boss; Rupture gains +1/turn from Inferno plus Breakthrough/Hemokinesis for +4
- [deepseek] 第 22 层 TNone event/choose: 同意 Jev（o1 @0.33 → o1）：牌组仅靠撕裂提供力量；150金换接下来5场战斗+2力量，强化多段AOE速杀精英，保住45血迎战379血知识恶魔。
- [deepseek] 第 24 层 TNone event/choose: 同意 Jev（o1 @0.14 → o1）：污浊药水代码永不使用，3瓶只能占格或卖钱；随机罕见药水更有实战价值（当前仅2瓶，若满格也可替换保留能力药水）。

### Jev 低置信度（<0.35）决策：18 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 淤泥旋螺, 无休手斧 -> 淤泥旋螺) with confidence 0.23; code rank 1 (0.23)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 海洋混混, 无休手斧 -> 海洋混混, 防御) with confidence 0.28; code rank 1 (0.28)
- 第 3 层 combat/plan-choice: Jev chose plan 3/3 (无休手斧 -> 海洋混混, 剑柄打击 -> 海洋混混, 打击 -> 海洋混混) with confidence 0.32; code rank 3 (0.32)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (剑柄打击 -> 钙化邪教徒) with confidence 0.13; code rank 1 (0.13)
- 第 6 层 combat/plan-choice: Jev chose plan 2/4 (无休手斧 -> 海洋混混, 突破, 熔融之拳 -> 海洋混混) with confidence 0.31; code rank 2 (0.31)
- 第 7 层 combat/plan-choice: Jev chose plan 2/2 (突破, 邪眼) with confidence 0.12; code rank 2; HP guard: plan 2 (突破, 邪眼) loses 7 HP, more than 5 over the cheapest line, playing plan  (0.12)
- 第 7 层 combat/plan-choice: Jev chose plan 2/2 (狱火, 痛击 -> 鬼祟珊瑚群) with confidence 0.16; code rank 2 (0.16)
- 第 7 层 combat/plan-choice: Jev chose plan 1/2 (剑柄打击 -> 鬼祟珊瑚群, 剑柄打击 -> 鬼祟珊瑚群, 防御) with confidence 0.23; code rank 1 (0.23)
- 第 12 层 combat/plan-choice: Jev chose plan 2/4 (打击 -> 噬尸蛞蝓, 防御, 防御) with confidence 0.32; code rank 2 (0.32)
- 第 13 层 combat/plan-choice: Jev chose plan 1/3 (无休手斧 -> 拳击构装体, 剑柄打击 -> 拳击构装体, 邪眼) with confidence 0.24; code rank 1 (0.24)
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (无休手斧 -> 花园幽灵鳗, 邪眼, 防御) with confidence 0.24; code rank 1 (0.24)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 3/4 (无休手斧 -> 花园幽灵鳗, 剑柄打击 -> 花园幽灵鳗, 防御, potion 迅捷药水) with confidence 0.31; code rank 3 (0.31)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 1/2 (end turn) with confidence 0.19; code rank 1 (0.19)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.16; code rank 1 (0.16)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (无休手斧 -> 灵魂异鱼, 邪眼, 呼唤) with confidence 0.19; code rank 1 (0.19)
