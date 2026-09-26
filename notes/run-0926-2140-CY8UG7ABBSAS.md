## 复盘：run CY8UG7ABBSAS — 阵亡，最高第 25 层

- 决策 337 个；Jev 调用 66 次，Claude 0 次，DeepSeek 9 次；token 115,610 入 / 3,350 出，约 $0.0050；用时 17.4 分钟
- 决策者：code 200，jev-plan 62，jev 61，deepseek 9，code-fallback 5

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→50（-14），决策 code 7，jev-plan 4，jev 2
- 第 6 层 淤泥旋螺: HP 48→42（-6），决策 code 6，jev-plan 3，jev 2
- 第 8 层 海洋混混: HP 72→66（-6），决策 code 6，jev 2，jev-plan 1，code-fallback 1
- 第 11 层 气态炸弹/活雾: HP 72→65（-7），决策 code 9，jev-plan 3，jev 2，code-fallback 1
- 第 12 层 潮湿邪教徒/钙化邪教徒: HP 71→65（-6），决策 code 13，code-fallback 1
- 第 14 层 噬尸蛞蝓: HP 71→60（-11），决策 code 8，jev-plan 6，jev 5
- 第 15 层 鬼祟珊瑚群: HP 66→38（-28），决策 code 10，jev 4，jev-plan 4
- 第 17 层 灵魂异鱼: HP 68→23（-45），决策 jev 25，jev-plan 25，code 3
- 第 19 层 偷窃草蜢: HP 69→58（-11），决策 code 15，jev 1，jev-plan 1
- 第 21 层 盛碗虫（石）/盛碗虫（蜜）: HP 64→46（-18），决策 code 6，jev-plan 2，jev 1，code-fallback 1
- 第 23 层 幼虫/直飞产卵虫/结实的卵: HP 52→27（-25），决策 code 11，jev-plan 6，jev 3，code-fallback 1
- 第 25 层 蜂群术士: HP 57→30（-27），决策 code 9，jev 7，jev-plan 7

### 死亡战斗：第 25 层 蜂群术士
- T4 [jev] combat/plan-choice+potion: Jev chose plan 3/3 (防御, 防御, 预备打击+ -> 蜂群术士) with confidence 0.24; code rank 3 conf 0.24
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 预备打击+ -> 蜂群术士
- T4 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.00; code rank 1 conf 0.00
- T5 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (挑衅 -> 蜂群术士, 愤怒+ -> 蜂群术士) with confidence 0.35; code rank 1 conf 0.35
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 愤怒+ -> 蜂群术士
- T5 [code] combat/end_turn: no playable cards; ending the turn
- T6 [jev] combat/plan-choice+potion: Jev chose plan 1/2 (剑柄打击 -> 蜂群术士, 拆卸+ -> 蜂群术士, 打击 -> 蜂群术士) with confidence 0.45; code rank 1 conf 0.45
- T6 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (拆卸+ -> 蜂群术士, 打击 -> 蜂群术士) with confidence 0.23; code rank 1 conf 0.23
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 蜂群术士
- T6 [code] combat/end_turn: no playable cards; ending the turn
- T7 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 62
- combat/plan / code: 46
- combat/plan-continue / code: 40
- combat/plan-choice+potion / jev: 33
- reward/claim / code: 26
- combat/plan-choice / jev: 21
- map/route / code: 19
- combat/lethal / code: 12
- reward/proceed / code: 11
- reward/card / code: 8
- shop/buy / code: 6
- combat/end_turn / code: 5
- rest/proceed / code: 5
- combat/plan-choice / code-fallback: 4
- event/leave / code: 4
- map/route / jev: 4
- rest/choose / code: 4
- selection/upgrade / code: 4
- event/choose / deepseek: 3
- reward/card / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- selection/upgrade / jev: 2
- shop/buy / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice+potion / code-fallback: 1
- map/route / deepseek: 1
- rest/choose / jev: 1
- run/finalize / code: 1

### 兜底介入（Claude/DeepSeek）：9 次（推翻 Jev 4 次）
- [deepseek] 第 1 层 TNone event/choose: 同意 Jev（o0 @0.23 → o0）：Free recurring upgrades with no downside; skipping curse-relic trade (past runs punished it) and New Leaf's random trans
- [deepseek] 第 3 层 TNone shop/buy: 推翻 Jev（buy_card2 @0.27 → buy_card1）：Deck has zero AOE and needs early attacks; Thunderclap adds AOE plus vulnerable for group fights and Soul Fysh damage. A
- [deepseek] 第 4 层 TNone event/choose: 推翻 Jev（o0 @0.23 → o1）：Treasure Map is a dead hand-clogging card (manual says skip it); 8 HP at 70% with Burning Blood regen is cheap for a ran
- [deepseek] 第 6 层 T3 map/route: 推翻 Jev（n1 @0.07 → n0）：60% HP, no strength, one block card — optional elites need >80%; rest heals to ~72 and still reaches another RestSite be
- [deepseek] 第 8 层 T3 reward/card: 同意 Jev（card0 @0.22 → card0）：0-cost 6 damage raises the deck's 15/turn toward the 23 Soul Fysh needs, and costs no energy so blocking still happens; 
- [deepseek] 第 12 层 T4 reward/card: 同意 Jev（card2 @0.15 → card2）：Feel No Pain has ~1 exhaust trigger (only Molten Fist); Plated Armor 4 gives reliable block every turn for the long Soul
- [deepseek] 第 15 层 T5 reward/card: 同意 Jev（card2 @0.24 → card2）：拆卸配合牌组已有痛击/熔融之拳的易伤可打24伤害，多段还能吃未来力量成长；速杀灵魂异鱼可减少Beckon堆积。
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o1 @0.22 → o0）：永久升级4张胜过会融化的蜡遗物；A7升级牌稀少，牌组21张薄，升级痛击/拆卸/熔融之拳等核心牌能全局补足输出与格挡，更稳。
- [deepseek] 第 20 层 TNone shop/buy: 同意 Jev（buy_card0 @0.31 → buy_card0）：Stomp is a cheap 2nd AOE — essential to keep both crab claws even and kill them same turn; deck is damage-short for the 

### Jev 低置信度（<0.35）决策：18 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 打击 -> 蟾蜍蝌蚪, 打击 -> 蟾蜍蝌蚪) with confidence 0.31; code rank 1 (0.31)
- 第 8 层 combat/plan-choice: Jev chose plan 1/4 (闪电霹雳, 耸肩无视, 预备打击 -> 海洋混混) with confidence 0.31; code rank 1 (0.31)
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (防御, 岩石铠甲, 防御) with confidence 0.16; code rank 1 (0.16)
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (防御, 打击 -> 噬尸蛞蝓, 闪电霹雳) with confidence 0.20; code rank 1 (0.20)
- 第 14 层 combat/plan-choice: Jev chose plan 1/2 (双重打击+ -> 噬尸蛞蝓, 愤怒 -> 噬尸蛞蝓, 防御) with confidence 0.02; code rank 1 (0.02)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (闪电霹雳, 预备打击 -> 噬尸蛞蝓, 打击 -> 噬尸蛞蝓) with confidence 0.13; code rank 1 (0.13)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/4 (闪电霹雳, 剑柄打击+ -> 灵魂异鱼, 拆卸 -> 灵魂异鱼) with confidence 0.20; code rank 2 (0.20)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.28; code rank 1 (0.28)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.25; code rank 1 (0.25)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (闪电霹雳, 愤怒 -> 灵魂异鱼) with confidence 0.19; code rank 1 (0.19)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/3 (呼唤, 呼唤) with confidence 0.27; code rank 2 (0.27)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.17; code rank 1 (0.17)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.16; code rank 1 (0.16)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.33; code rank 1 (0.33)
- 第 23 层 combat/plan-choice: Jev chose plan 1/4 (防御, 双重打击+ -> 直飞产卵虫, 拆卸+ -> 直飞产卵虫) with confidence 0.15; code rank 1 (0.15)
