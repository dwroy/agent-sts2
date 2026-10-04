## 复盘：run F6NT0JYR6NLS — 阵亡，最高第 17 层

- 决策 255 个；Jev 调用 53 次，Claude 0 次，DeepSeek 7 次；token 78,983 入 / 2,553 出，约 $0.0034；用时 11.7 分钟
- 决策者：code 149，jev-plan 46，jev 41，code-fallback 12，deepseek 7

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→56（-8），决策 code 8，jev-plan 4，code-fallback 2，jev 2
- 第 3 层 海洋混混: HP 62→55（-7），决策 jev-plan 6，code 4，jev 2
- 第 4 层 噬尸蛞蝓: HP 61→51（-10），决策 code 12，code-fallback 2，jev 1，jev-plan 1
- 第 5 层 潮湿邪教徒/钙化邪教徒: HP 57→39（-18），决策 code 11，jev 5，code-fallback 4，jev-plan 4
- 第 9 层 双尾鼠: HP 71→50（-21），决策 code 15，jev-plan 3，jev 2，code-fallback 2
- 第 9 层 双尾鼠: HP 50→50（-0），决策 code 1
- 第 11 层 幽灵船: HP 56→44（-12），决策 code 8，jev-plan 6，jev 3
- 第 11 层 幽灵船: HP 44→37（-7），决策 code 4
- 第 12 层 下水道蚌: HP 43→36（-7），决策 code 14，code-fallback 2
- 第 17 层 灵魂异鱼: HP 80→80（-0），决策 jev 1
- 第 17 层 灵魂异鱼: HP 80→52（-28），决策 jev-plan 11，jev 10，code 3
- 第 17 层 灵魂异鱼: HP 52→21（-31），决策 jev-plan 7，jev 5，code 1
- 第 17 层 灵魂异鱼: HP 21→8（-13），决策 jev 5，jev-plan 4
- 第 17 层 灵魂异鱼: HP 8→8（-0），决策 jev 1

### 死亡战斗：第 17 层 灵魂异鱼
- T11 [jev] combat/play: Jev chose end_turn (End the turn) with confidence 0.35 conf 0.35

### 各类决策由谁做
- combat/plan-continue / jev-plan: 46
- combat/plan-continue / code: 37
- combat/plan / code: 31
- combat/plan-choice+potion / jev: 21
- reward/claim / code: 17
- combat/plan-choice / jev: 15
- map/route / code: 14
- combat/plan-choice / code-fallback: 12
- combat/lethal / code: 7
- reward/proceed / code: 7
- combat/end_turn / code: 6
- selection/exhaust / code: 6
- event/leave / code: 4
- event/choose / deepseek: 3
- rest/proceed / code: 3
- reward/card / code: 3
- reward/card / deepseek: 3
- selection/remove / code: 3
- map/route / jev: 2
- rest/choose / code: 2
- shop/buy / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/play / jev: 1
- rest/choose / jev: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/upgrade / code: 1
- shop/buy / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：7 次（推翻 Jev 3 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.22 → o0）：精剪删1张打击：一层最稳的牌组精简，避免诅咒占手牌；无色牌随机且不可控，333金需带贪婪整幕冒险。
- [deepseek] 第 3 层 T3 reward/card: 同意 Jev（card1 @0.09 → card1）：挑衅是A级高效牌：1费6格挡加易伤，提升痛击与打击输出；无力量时飞剑回旋镖仅是随机9伤，完美打击不适合删打击计划。
- [deepseek] 第 6 层 TNone event/choose: 同意 Jev（o1 @0.25 → o1）：56% HP with a weak, power-less deck and 11 floors to Soul Fysh boss: 26 HP now buys real safety; enchanting a starter St
- [deepseek] 第 9 层 T6 reward/card: 推翻 Jev（skip @0.07 → card2）：熔融之拳: 1费10伤, 与痛击++和挑衅的易伤翻倍联动, 一层boss急需输出; 无惧疼痛消耗源只有2张, 触发太少。
- [deepseek] 第 11 层 T6 reward/card: 同意 Jev（card0 @0.26 → card0）：Thin deck lacks powers and sustained block; 4 Plated Armor each turn helps survive Soul Fysh's long fight better than a 
- [deepseek] 第 14 层 TNone shop/buy: 同意 Jev（buy_card3 @0.16 → buy_card3）：Third 燃烧契约: exhaust Beckon and cycle to damage vs Soul Fysh; deck lacks exhaust, block already covered.
- [deepseek] 第 15 层 TNone event/choose: 推翻 Jev（o0 @0.28 → o1）：Targeted removal (a Strike) beats two random upgrades that likely hit Defend/Strike; next node is a forced RestSite anyw

### Jev 低置信度（<0.35）决策：10 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 淤泥旋螺, 防御, 防御) with confidence 0.24; code rank 1 (0.24)
- 第 3 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御, 打击 -> 海洋混混) with confidence 0.28; code rank 1 (0.28)
- 第 4 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 噬尸蛞蝓, 打击 -> 噬尸蛞蝓, 挑衅 -> 噬尸蛞蝓) with confidence 0.25; code rank 1 (0.25)
- 第 5 层 combat/plan-choice: Jev chose plan 1/2 (挑衅 -> 钙化邪教徒, 打击 -> 钙化邪教徒, 打击 -> 钙化邪教徒) with confidence 0.03; code rank 1 (0.03)
- 第 9 层 combat/plan-choice: Jev chose plan 1/4 (痛击+ -> 双尾鼠, 防御) with confidence 0.26; code rank 1 (0.26)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (燃烧契约, potion 肌肉药水, 熔融之拳 -> 灵魂异鱼) with confidence 0.33; code rank 2 (0.33)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.18; code rank 1 (0.18)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.34; code rank 1 (0.34)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (呼唤, 呼唤, 呼唤) with confidence 0.30; code rank 1 [calc mismatch: solver says ending now kills, mod says safe] (0.30)
