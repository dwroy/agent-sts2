## 复盘：run RA3QYBLN7RJF — 阵亡，最高第 33 层

- 决策 445 个；Jev 调用 78 次，Claude 0 次，DeepSeek 12 次；token 136,737 入 / 3,565 出，约 $0.0059；用时 31.2 分钟
- 决策者：code 305，jev 68，jev-plan 50，deepseek 12，code-fallback 10

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→38（-26），决策 code 9，jev-plan 6，jev 4，code-fallback 1
- 第 5 层 海洋混混: HP 54→42（-12），决策 code 7，jev-plan 3，jev 2
- 第 6 层 蟾蜍蝌蚪: HP 48→44（-4），决策 jev-plan 4，code 4，jev 2
- 第 7 层 花园幽灵鳗: HP 48→35（-13），决策 code 12，jev 2，jev-plan 1
- 第 13 层 骇鳗: HP 75→37（-38），决策 code 14，jev 3，jev-plan 3，code-fallback 1
- 第 14 层 噬尸蛞蝓: HP 44→44（-0），决策 code 2
- 第 14 层 噬尸蛞蝓: HP 44→34（-10），决策 code 7，jev 3，jev-plan 3，code-fallback 1
- 第 14 层 噬尸蛞蝓: HP 34→34（-0），决策 code 1
- 第 17 层 乐加维林族母: HP 65→23（-42），决策 jev 20，code 13，jev-plan 8，code-fallback 1
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 72→69（-3），决策 code 7，jev-plan 4，jev 2
- 第 20 层 偷窃草蜢: HP 76→65（-11），决策 code 12，jev-plan 2，jev 1
- 第 23 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 54→37（-17），决策 code 13，jev 3，jev-plan 2
- 第 28 层 异螨: HP 68→36（-32），决策 code 9，jev 3，jev-plan 3，code-fallback 1
- 第 30 层 幼虫/直飞产卵虫/结实的卵: HP 48→34（-14），决策 code 11，code-fallback 1
- 第 31 层 猎人杀手: HP 41→26（-15），决策 code 8，code-fallback 2，jev 1，jev-plan 1
- 第 31 层 猎人杀手: HP 26→25（-1），决策 code 2
- 第 33 层 知识恶魔: HP 58→58（-0），决策 code 4
- 第 33 层 知识恶魔: HP 60→60（-0），决策 code 2，jev 1，jev-plan 1
- 第 33 层 知识恶魔: HP 60→62（+2），决策 jev 4，jev-plan 4，code-fallback 2，code 1
- 第 33 层 知识恶魔: HP 62→62（-0），决策 jev-plan 2，jev 1
- 第 33 层 知识恶魔: HP 62→56（-6），决策 jev 7，jev-plan 2，code 1
- 第 33 层 知识恶魔: HP 56→56（-0），决策 jev 1
- 第 33 层 知识恶魔: HP 55→3（-52），决策 code 19，jev 3，jev-plan 1

### 死亡战斗：第 33 层 知识恶魔
- T13 [code] combat/end_turn: no playable cards; ending the turn
- T14 [code] combat/plan: code plan (only distinct line): 巨像, 预备打击 -> 知识恶魔; hp -28, dmg 10 [calc mismatch: solver says ending now kills, mod says safe]
- T14 [code] combat/plan-continue: continuing the code-chosen plan: 预备打击 -> 知识恶魔
- T14 [code] combat/plan: code plan (only line): end turn; hp -28, dmg 0
- T15 [code] combat/plan: code plan (only line): 挑衅 -> 知识恶魔, 防御+; hp -2, dmg 0
- T15 [code] combat/plan: code plan (only distinct line): 头槌 -> 知识恶魔; hp -1, dmg 18
- T15 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T16 [code] combat/plan: code plan (only line): 挑衅 -> 知识恶魔, 巨像+; hp -1, dmg 0
- T16 [code] combat/plan-continue: continuing the code-chosen plan: 巨像+
- T16 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T17 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-36): 痛击+ -> 知识恶魔
- T17 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan / code: 92
- combat/plan-continue / jev-plan: 50
- combat/plan-continue / code: 44
- combat/plan-choice+potion / jev: 39
- reward/claim / code: 36
- map/route / code: 30
- combat/plan-choice / jev: 24
- combat/lethal / code: 13
- reward/card / code: 13
- reward/proceed / code: 13
- event/choose / deepseek: 11
- event/leave / code: 8
- combat/plan-choice / code-fallback: 7
- rest/proceed / code: 6
- selection/remove / code: 6
- combat/end_turn / code: 5
- shop/buy / code: 5
- rest/choose / code: 4
- selection/add / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/plan-choice+potion / code-fallback: 3
- selection/curse / code: 3
- combat/plan-potion / code: 2
- map/route / jev: 2
- rest/choose / jev: 2
- selection/exhaust / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- combat/least-loss / code: 1
- combat/plan-guarded / code: 1
- event/only / code: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/transform / code: 1
- selection/upgrade / code: 1
- shop/buy / deepseek: 1

### 兜底介入（Claude/DeepSeek）：12 次（推翻 Jev 7 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.37 → o0）：Horn: +2 cards +1 energy every elite fight is irreplaceable snowball value and HP savings; a single upgrade is replaceab
- [deepseek] 第 3 层 TNone event/choose: 同意 Jev（o0 @0.23 → o0）：无消耗手段，诅咒等于永久废抽，小牌组经不起；本幕商店仅0–1家，332金难花掉，56金更稳。
- [deepseek] 第 4 层 TNone event/choose: 推翻 Jev（o1 @0.31 → o0）：40金买药水低于商店价，余钱仍够删一张打击；随机升级多半落在迟早要删的打击/防御上，药水对精英/boss更救命。
- [deepseek] 第 4 层 TNone event/choose: 推翻 Jev（o1 @0.05 → o0）：40金换变化远超删牌价，且余86金足以删打击；把多余打击转成攻击/AOE/力量牌正是牌组所需。
- [deepseek] 第 4 层 TNone event/choose: 同意 Jev（o1 @0.30 → o1）：Save gold for the 100-cost strike removal (A6+); an unknown card for 40 gold dilutes an 11-card deck with no guaranteed 
- [deepseek] 第 11 层 TNone event/choose: 推翻 Jev（o0 @0.16 → o1）：81% HP with rest sites and Burning Blood before boss; a permanent relic beats adding 2 forced random commons to a lean 1
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o1 @0.20 → o1）：删4张（打击/诅咒）是最大提升，牌组仅18张急需精简；风箱已免费升级起手，煤灰只是战斗中洗牌才出现的风险，可接受。
- [deepseek] 第 21 层 TNone event/choose: 同意 Jev（o1 @0.35 → o1）：仅 5 血（血量 85%）换取花卉中心更强奖励，可能补本局紧缺的力量/稀有牌；35 金价值太低。
- [deepseek] 第 21 层 TNone event/choose: 推翻 Jev（o0 @0.02 → o1）：79% HP、boss 前有 3 个休息点，6 血很便宜；本局无力量来源、急需稀有牌，花心更深的奖励比 75 金更值（已有 227 金足够删牌）。
- [deepseek] 第 21 层 TNone event/choose: 同意 Jev（o1 @0.02 → o1）：7 HP is affordable with 3 rests ahead and 72% HP; a permanent relic beats 135 gold we may not spend, and this run needs 
- [deepseek] 第 22 层 TNone shop/buy: 推翻 Jev（buy_card0 @0.16 → buy_card1）：Buy Hemokinesis: 15 damage for 1E, the biggest boss-DPS fix; no strength card offered, and gold otherwise unspent. Self-
- [deepseek] 第 29 层 TNone event/choose: 推翻 Jev（o1 @0.18 → o0）：Relic is permanent value; 60 gold buys nothing before boss, and Decay's chip damage is offset by Burning Blood while hel

### Jev 低置信度（<0.35）决策：35 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御, 防御) with confidence 0.18; code rank 1 (0.18)
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 噬尸蛞蝓, 打击 -> 噬尸蛞蝓) with confidence 0.31; code rank 1 (0.31)
- 第 7 层 combat/plan-choice+potion: Jev chose plan 1/2 (防御, 踩踏) with confidence 0.24; code rank 1 (0.24)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.21; code rank 1 (0.21)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.17; code rank 1 (0.17)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.27; code rank 1 (0.27)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (上勾拳 -> 乐加维林族母, 打击 -> 乐加维林族母) with confidence 0.24; code rank 2 (0.24)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.27; code rank 1 (0.27)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.23; code rank 1 (0.23)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (挑衅+ -> 乐加维林族母, 上勾拳 -> 乐加维林族母) with confidence 0.20; code rank 1 (0.20)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.25; code rank 1 (0.25)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/3 (拆卸 -> 乐加维林族母, 无情猛攻+ -> 乐加维林族母) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (打击 -> 乐加维林族母) with confidence 0.17; code rank 1 (0.17)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.15; code rank 1 (0.15)
