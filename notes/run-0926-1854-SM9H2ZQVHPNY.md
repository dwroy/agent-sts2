## 复盘：run SM9H2ZQVHPNY — 阵亡，最高第 33 层

- 决策 434 个；Jev 调用 58 次，Claude 0 次，DeepSeek 12 次；token 99,925 入 / 3,006 出，约 $0.0043；用时 22.0 分钟
- 决策者：code 326，jev 56，jev-plan 38，deepseek 12，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→51（-13），决策 jev-plan 4，code 4，jev 3
- 第 4 层 蟾蜍蝌蚪: HP 57→48（-9），决策 code 5，jev 1，jev-plan 1
- 第 5 层 淤泥旋螺: HP 52→52（-0），决策 code 2，jev 1，jev-plan 1
- 第 6 层 化石追踪者: HP 58→46（-12），决策 code 7，jev-plan 2，jev 1，code-fallback 1
- 第 7 层 幽灵船: HP 52→47（-5），决策 code 7，jev 2
- 第 8 层 潮湿邪教徒/钙化邪教徒: HP 53→50（-3），决策 code 11，jev 4，jev-plan 1
- 第 12 层 花园幽灵鳗: HP 80→60（-20），决策 code 16，jev 2，jev-plan 2
- 第 17 层 灵魂异鱼: HP 80→30（-50），决策 code 18，jev-plan 9，jev 5
- 第 19 层 地道虫: HP 71→63（-8），决策 code 6，jev 1，jev-plan 1
- 第 19 层 地道虫: HP 63→50（-13），决策 code 8，jev 1
- 第 21 层 偷窃草蜢: HP 56→56（-0），决策 code 4
- 第 21 层 偷窃草蜢: HP 56→44（-12），决策 code 4
- 第 23 层 外骨骼虫: HP 45→29（-16），决策 code 17，jev 2，jev-plan 1
- 第 25 层 猎人杀手: HP 74→74（-0），决策 jev 2，jev-plan 2
- 第 25 层 猎人杀手: HP 74→44（-30），决策 code 9，jev-plan 3，jev 2，code-fallback 1
- 第 28 层 感染棱柱: HP 80→58（-22），决策 code 10，jev 1
- 第 28 层 感染棱柱: HP 58→31（-27），决策 code 14，jev-plan 4，jev 2
- 第 29 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 37→37（-0），决策 code 8，jev 1
- 第 29 层 盛碗虫（丝）/盛碗虫（蜜）: HP 37→35（-2），决策 code 5，jev 5，jev-plan 3
- 第 33 层 知识恶魔: HP 80→80（-0），决策 code 3
- 第 33 层 知识恶魔: HP 80→54（-26），决策 code 9，jev 3，jev-plan 2
- 第 33 层 知识恶魔: HP 54→26（-28），决策 jev 7，jev-plan 2，code 2
- 第 33 层 知识恶魔: HP 26→26（-0），决策 code 2
- 第 33 层 知识恶魔: HP 26→13（-13），决策 code 5
- 第 33 层 知识恶魔: HP 13→13（-0），决策 code 3

### 死亡战斗：第 33 层 知识恶魔
- T10 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 18): 耸肩无视, 飞剑回旋镖
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 飞剑回旋镖
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan / code: 89
- combat/plan-continue / code: 62
- reward/claim / code: 46
- combat/plan-continue / jev-plan: 38
- combat/plan-choice / jev: 36
- map/route / code: 25
- combat/lethal / code: 17
- reward/proceed / code: 15
- combat/plan-choice+potion / jev: 10
- reward/card / code: 10
- combat/end_turn / code: 6
- event/choose / deepseek: 6
- event/leave / code: 6
- rest/choose / code: 6
- rest/proceed / code: 6
- selection/add / code: 5
- map/route / jev: 4
- shop/buy / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/least-loss / code: 3
- selection/curse / code: 3
- shop/leave / code: 3
- combat/plan-choice / code-fallback: 2
- combat/plan-guarded / code: 2
- map/route / deepseek: 2
- reward/card / deepseek: 2
- reward/card / jev: 2
- selection/remove / code: 2
- shop/buy / deepseek: 2
- shop/buy / jev: 2
- shop/open / code: 2
- event/only / code: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/take into my hand / code: 1
- selection/take into my hand / jev: 1
- selection/transform / code: 1
- selection/upgrade / code: 1

### 兜底介入（Claude/DeepSeek）：12 次（推翻 Jev 4 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.26 → o0）：化解一张打击：既删废牌又补新牌，早期最稳；已有诅咒不宜再添贪婪，随机稀有期望一般。
- [deepseek] 第 3 层 TNone event/choose: 同意 Jev（o0 @0.30 → o0）：Free pick from 5 cards, no HP cost. At 71% HP with no potions on A7, keep blood for act 1 elites and boss.
- [deepseek] 第 4 层 T3 reward/card: 推翻 Jev（skip @0.10 → card0）：Energy burst (net +2) enables Bludgeon+Bash turns; deck is only 13 cards and guide rates it fit for high-cost decks. Ski
- [deepseek] 第 10 层 TNone map/route: 同意 Jev（n0 @0.24 → n0）：皇家枕头休息可回满血，为灵魂异鱼长战与后续精英备好血线；休息后再看精英是否可绕，路线价值也更高。
- [deepseek] 第 12 层 T6 map/route: 同意 Jev（n1 @0.31 → n1）：HP 83% and a rest still available before boss; take the higher-value Unknown for card/relic/gold upside, save the rest f
- [deepseek] 第 13 层 TNone event/choose: 同意 Jev（o1 @0.00 → o1）：藏宝图是不可打出的废牌，等于诅咒，绝不该拿；付8血换一瓶药水，正好留给灵魂异鱼boss战。
- [deepseek] 第 14 层 TNone shop/buy: 推翻 Jev（buy_card2 @0.29 → buy_card1）：头槌仅26金：1费9伤优于打击，还能回收重锤/耸肩无视提升稳定性；挑衅虽好但贵且Bash已供易伤。钱要花掉，买它。
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o0 @0.16 → o0）：首回合+4能量让每场战斗开局铺能力/爆发，最利于速攻知识恶魔；优于加一张未知牌或改地图。
- [deepseek] 第 20 层 TNone event/choose: 同意 Jev（o2 @0.31 → o2）：Only power is Inflame — the deck's strength win condition. Swift 2 makes it cheaper/faster every combat; Sharp on one of
- [deepseek] 第 21 层 T2 reward/card: 推翻 Jev（skip @0.06 → card1）：0费8伤优于仍要删的打击；与燃烧/预备打击的力量叠加良好，长战可省能量用于格挡，打知识恶魔的持续输出。
- [deepseek] 第 22 层 TNone event/choose: 同意 Jev（o1 @0.17 → o1）：5 HP is trivial next to Burning Blood healing and 50/80 health; the center reward (relic/pollen) outweighs 35 gold, and 
- [deepseek] 第 31 层 TNone shop/buy: 同意 Jev（buy_relic1 @0.39 → buy_relic1）：永久+1力量每场战斗生效，契合力量成长速攻与知识恶魔长战；金币该花掉，优于一次性能量/格挡遗物。

### Jev 低置信度（<0.35）决策：14 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 噬尸蛞蝓, 防御, 打击 -> 噬尸蛞蝓) with confidence 0.14; code rank 1 (0.14)
- 第 4 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 蟾蜍蝌蚪, 打击 -> 蟾蜍蝌蚪) with confidence 0.11; code rank 1 (0.11)
- 第 7 层 combat/plan-choice: Jev chose plan 1/3 (耸肩无视, 防御) with confidence 0.17; code rank 1 (0.17)
- 第 7 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 幽灵船) with confidence 0.10; code rank 1 (0.10)
- 第 17 层 combat/plan-choice: Jev chose plan 2/4 (飞剑回旋镖, 呼唤, 耸肩无视) with confidence 0.34; code rank 2 (0.34)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (预备打击 -> 灵魂异鱼, 打击 -> 灵魂异鱼, 打击 -> 灵魂异鱼) with confidence 0.04; code rank 1 (0.04)
- 第 25 层 combat/plan-choice: Jev chose plan 2/3 (燃烧, 预备打击 -> 猎人杀手, 飞剑回旋镖, 余烬 -> 猎人杀手) with confidence 0.33; code rank 2 (0.33)
- 第 28 层 combat/plan-choice: Jev chose plan 2/3 (头槌 -> 感染棱柱, 防御, 飞剑回旋镖) with confidence 0.04; code rank 2 (0.04)
- 第 28 层 combat/plan-choice: Jev chose plan 3/3 (飞剑回旋镖, 打击 -> 感染棱柱) with confidence 0.14; code rank 3; HP guard: plan 3 (飞剑回旋镖, 打击 -> 感染棱柱) loses 11 HP, more than 6 over the cheap (0.14)
- 第 29 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 盛碗虫（蜜）, 耸肩无视, 巨像, 祭品, 防御) with confidence 0.23; code rank 1 (0.23)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 2/3 (剑柄打击+ -> 知识恶魔, 头槌 -> 知识恶魔) with confidence 0.27; code rank 2; HP guard: plan 2 (剑柄打击+ -> 知识恶魔, 头槌 -> 知识恶魔) loses 15 HP, more than  (0.27)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/2 (耸肩无视, 耸肩无视, 防御) with confidence 0.26; code rank 1 (0.26)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 2/2 (重锤 -> 知识恶魔) with confidence 0.20; code rank 2 (0.20)
- 第 33 层 combat/plan-choice+potion: Jev chose to drink 无色药水 (confidence 0.15) (0.15)
