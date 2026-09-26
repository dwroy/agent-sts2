## 复盘：run 5TQX4PBBB9ZU — 阵亡，最高第 33 层

- 决策 367 个；Jev 调用 53 次，Claude 0 次，DeepSeek 15 次；token 107,027 入 / 3,154 出，约 $0.0046；用时 21.9 分钟
- 决策者：code 258，jev 44，jev-plan 41，deepseek 15，code-fallback 9

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→60（-4），决策 code 3，jev 1，jev-plan 1
- 第 3 层 小啃兽: HP 66→59（-7），决策 code 5，code-fallback 1
- 第 5 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 65→65（-0），决策 code 3，code-fallback 1
- 第 6 层 小啃兽: HP 71→56（-15），决策 code 10，code-fallback 1
- 第 9 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 62→62（-0），决策 code 4
- 第 11 层 异蛙寄生虫/扭动虫: HP 68→43（-25），决策 code 24
- 第 13 层 旧日雕像: HP 73→50（-23），决策 code 8，jev 2，jev-plan 1
- 第 14 层 劫掠者刺客/劫掠者斧手/劫掠者追踪手: HP 56→56（-0），决策 code 6，jev-plan 2，jev 1
- 第 17 层 同族信徒/同族神官: HP 80→39（-41），决策 jev 15，jev-plan 12，code 2
- 第 19 层 地道虫: HP 73→65（-8），决策 jev 2，jev-plan 2，code 1
- 第 19 层 地道虫: HP 64→44（-20），决策 code 3，jev 3，jev-plan 3，code-fallback 1
- 第 19 层 地道虫: HP 43→42（-1），决策 code 3，jev 1，jev-plan 1
- 第 21 层 盛碗虫（卵）/盛碗虫（石）: HP 48→38（-10），决策 code 5，jev 1，jev-plan 1
- 第 23 层 猎人杀手: HP 44→44（-0），决策 code 2，jev 1
- 第 23 层 猎人杀手: HP 43→26（-17），决策 jev 4，code 4，jev-plan 3
- 第 27 层 啃咬机: HP 56→56（-0），决策 jev-plan 2，jev 1
- 第 27 层 啃咬机: HP 55→33（-22），决策 code 8，jev 1，jev-plan 1
- 第 29 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 63→33（-30），决策 code 12，code-fallback 2
- 第 30 层 感染棱柱: HP 39→2（-37），决策 code 8，jev-plan 7，jev 3，code-fallback 1
- 第 33 层 火箭/碾碎爪: HP 57→49（-8），决策 jev-plan 4，jev 3，code 1
- 第 33 层 火箭/碾碎爪: HP 48→16（-32），决策 code-fallback 2，jev 2，jev-plan 1
- 第 33 层 火箭/碾碎爪: HP 16→16（-0），决策 code 6

### 死亡战斗：第 33 层 火箭/碾碎爪
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-10): 防御, 无情猛攻 -> 碾碎爪, 暴走 -> 火箭, 坚毅
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 无情猛攻 -> 碾碎爪
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 暴走 -> 火箭
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 坚毅
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-10): 熔融之拳 -> 火箭
- T4 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan / code: 51
- combat/plan-continue / code: 42
- combat/plan-continue / jev-plan: 41
- reward/claim / code: 40
- map/route / code: 29
- combat/plan-choice+potion / jev: 25
- combat/lethal / code: 16
- combat/plan-choice / jev: 15
- reward/proceed / code: 15
- reward/card / code: 10
- combat/plan-choice / code-fallback: 7
- combat/end_turn / code: 6
- event/choose / deepseek: 6
- event/leave / code: 6
- rest/choose / code: 6
- rest/proceed / code: 6
- selection/exhaust / code: 5
- reward/card / deepseek: 4
- selection/remove / code: 4
- shop/buy / code: 4
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- combat/plan-choice+potion / code-fallback: 2
- event/only / code: 2
- map/route / deepseek: 2
- shop/leave / code: 2
- shop/open / code: 2
- bundle/confirm / code: 1
- combat/plan-potion / code: 1
- combat/play / jev: 1
- map/route / jev: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/add / deepseek: 1
- selection/enchant / jev: 1
- selection/take into my hand / deepseek: 1
- selection/upgrade / code: 1
- shop/buy / deepseek: 1

### 兜底介入（Claude/DeepSeek）：15 次（推翻 Jev 7 次）
- [deepseek] 第 1 层 TNone event/choose: 同意 Jev（o0 @0.34 → o0）：卡包立即提升牌组，符合一幕缺输出/AOE需求；海螺只对精英有用，贪婪诅咒按历史教训不拿。
- [deepseek] 第 4 层 TNone event/choose: 同意 Jev（o0 @0.10 → o0）：攻击牌是主要输出来源且不会被删（防御牌迟早删），锋利永久加伤，多段攻击收益更高；牌组11攻击，Boss 神官需输出。
- [deepseek] 第 5 层 T2 map/route: 推翻 Jev（n0 @0.04 → n1）：保底战斗收益+后续商店能花掉135金删打击/买格挡牌（当前0格挡牌），再休息；HP 89%打普通战安全，路线价值几乎持平。
- [deepseek] 第 6 层 T4 reward/card: 推翻 Jev（card1 @0.18 → card2）：坚毅: 1E 7格挡更契合3能量曲线，随机消耗可顺手删掉占手的打击；牌组缺非基础格挡牌，血墙2E偏重、连环拳不解决防御。
- [deepseek] 第 7 层 TNone shop/buy: 同意 Jev（buy_card0 @0.12 → buy_card0）：双重打击 1费10伤多段，契合力量/易伤体系且补前期输出；删牌已涨到100买不起，下个商店不保证有，金币该花就花。
- [deepseek] 第 17 层 T9 reward/card: 推翻 Jev（card1 @0.17 → card2）：Brand gives reusable 0-cost strength; deck lacks strength sources, scales Howl AOE, and triggers Inferno on self-damage.
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o0 @0.22 → o1）：Sacrificing only bad/skipped rewards is optional; two skips buy a permanent relic — best long-run value. Block relic lim
- [deepseek] 第 18 层 TNone map/route: 同意 Jev（n3 @0.25 → n3）：Highest route value (25.6) and its Unknown node breaks the monster chain, avoiding the 3-fight-no-rest routes n1/n2; 91%
- [deepseek] 第 20 层 TNone event/choose: 同意 Jev（o0 @0.43 → o0）：Free pick of 5 class cards can supply the missing strength/AOE for Kaiser Crab; save 5 HP for boss entry. Colorless pool
- [deepseek] 第 20 层 TNone selection/add: 推翻 Jev（card1 @0.10 → card0）：熔融之拳：1费10伤，翻倍易伤配合痛击++与主宰可拿约6点力量，正好补本局力量缺口；消耗还能精简牌组，优于无惧疼痛。
- [deepseek] 第 22 层 TNone event/choose: 同意 Jev（o0 @0.20 → o0）：Remove Strikes (guide priority: delete Strikes first); 13-attack deck, Kaiser Crab boss needs damage, and we already kee
- [deepseek] 第 22 层 TNone event/choose: 同意 Jev（o0 @0.19 → o0）：Guide priority: delete Strikes first; deck still runs 5 Strikes into Act 2, and Ultimate Strike adds burst for Kaiser Cr
- [deepseek] 第 29 层 T4 reward/card: 推翻 Jev（card2 @0.14 → card0）：Strength deck has only 2 non-basic block cards; 39 HP into forced elite and Kaiser Crab. 跃跃欲试 scales with strength (燃烧/主
- [deepseek] 第 30 层 T4 reward/card: 同意 Jev（card0 @0.07 → card0）：Block is the deck's weak point (3 non-basic block cards) and 5 exhaust enablers make 邪眼 16 block for 1E; helps survive t
- [deepseek] 第 33 层 T4 selection/take into my hand: 推翻 Jev（card1 @0.11 → card2）：None block the 49 incoming; Unrelenting gives the biggest burst (14 damage) and makes the next attack free, maximizing t

### Jev 低置信度（<0.35）决策：18 个
- 第 13 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.20; code rank 1 (0.20)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (暴走 -> 劫掠者刺客, 防御, 熔融之拳 -> 劫掠者刺客) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.11; code rank 1 (0.11)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/4 (完美打击+ -> 同族信徒, 狱火) with confidence 0.22; code rank 2 (0.22)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.12; code rank 1 (0.12)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.17; code rank 1 (0.17)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/3 (痛击+ -> 同族神官, 打击 -> 同族神官) with confidence 0.34; code rank 1; HP guard: plan 1 (痛击+ -> 同族神官, 打击 -> 同族神官) loses 11 HP, more than 5 ov (0.34)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.26; code rank 1 (0.26)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.19; code rank 1 (0.19)
- 第 19 层 combat/plan-choice: Jev chose plan 1/4 (主宰 -> 地道虫, 打击 -> 地道虫, 防御) with confidence 0.31; code rank 1 (0.31)
- 第 19 层 combat/plan-choice+potion: Jev chose plan 1/1 (打击+ -> 地道虫, 暴走 -> 地道虫) with confidence 0.15; code rank 1 (0.15)
- 第 21 层 combat/plan-choice: Jev chose plan 1/4 (完美打击+ -> 盛碗虫（卵）, 防御) with confidence 0.24; code rank 1 (0.24)
- 第 23 层 combat/plan-choice+potion: Jev chose to drink 流动铜液 (confidence 0.31) (0.31)
- 第 23 层 combat/plan-choice: Jev chose plan 1/4 (完美打击+ -> 猎人杀手, 熔融之拳 -> 猎人杀手, 坚毅) with confidence 0.26; code rank 1 (0.26)
- 第 30 层 combat/plan-choice: Jev chose plan 2/2 (熔融之拳 -> 感染棱柱, 防御, 完美打击+ -> 感染棱柱) with confidence 0.29; code rank 2 (0.29)
