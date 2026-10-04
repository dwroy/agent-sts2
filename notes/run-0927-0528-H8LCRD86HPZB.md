## 复盘：run H8LCRD86HPZB — 阵亡，最高第 23 层

- 决策 309 个；Jev 调用 24 次，Claude 0 次，DeepSeek 10 次；token 45,785 入 / 1,431 出，约 $0.0020；用时 16.1 分钟
- 决策者：code 247，jev-plan 28，jev 19，deepseek 10，code-fallback 5

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→55（-9），决策 code 7，jev-plan 3，jev 2
- 第 3 层 蟾蜍蝌蚪: HP 61→49（-12），决策 code 11，jev-plan 3，jev 2
- 第 4 层 噬尸蛞蝓: HP 55→47（-8），决策 code 12，code-fallback 1，jev 1，jev-plan 1
- 第 7 层 幽灵船: HP 47→32（-15），决策 code 14，jev-plan 3，jev 1
- 第 13 层 骇鳗: HP 80→62（-18），决策 code 15，jev 2，code-fallback 1，jev-plan 1
- 第 15 层 海洋混混/钙化邪教徒: HP 60→44（-16），决策 code 11，jev-plan 3，jev 2
- 第 17 层 瀑布巨兽: HP 74→36（-38），决策 code 32，jev-plan 7，jev 4
- 第 19 层 偷窃草蜢: HP 67→38（-29），决策 code 9，jev-plan 4，jev 2，code-fallback 1
- 第 20 层 地道虫: HP 44→27（-17），决策 code 15，jev-plan 3，jev 2，code-fallback 1
- 第 23 层 寄生惧魔/胧光怪: HP 33→26（-7），决策 code 13，code-fallback 1
- 第 23 层 寄生惧魔/胧光怪: HP 26→11（-15），决策 code 10

### 死亡战斗：第 23 层 寄生惧魔/胧光怪
- T4 [code] combat/plan: code plan (only line): 踩踏; hp -13, dmg 24
- T4 [code] combat/plan: code plan (only line): end turn; hp -13, dmg 0
- T5 [code] combat/plan: code plan (+23.2 over next): 挑衅 -> 胧光怪, 燃烧, 飞剑回旋镖, potion 药水形状的石头 -> 寄生惧魔; hp -0, dmg 28
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 燃烧
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 飞剑回旋镖
- T5 [code] combat/plan-continue: continuing the code-chosen plan: potion 药水形状的石头 -> 寄生惧魔
- T5 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 防御, 血墙
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 血墙
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan / code: 70
- combat/plan-continue / code: 63
- combat/plan-continue / jev-plan: 28
- reward/claim / code: 24
- map/route / code: 20
- combat/plan-choice / jev: 18
- combat/lethal / code: 9
- reward/proceed / code: 9
- reward/card / code: 8
- combat/plan-choice / code-fallback: 5
- event/leave / code: 5
- shop/buy / code: 5
- combat/plan-guarded / code: 3
- event/choose / deepseek: 3
- map/discard-potion / code: 3
- rest/choose / code: 3
- rest/proceed / code: 3
- selection/remove / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/end_turn / code: 2
- combat/least-loss / code: 2
- map/route / deepseek: 2
- selection/add / deepseek: 2
- shop/buy / deepseek: 2
- event/choose / jev: 1
- event/only / code: 1
- reward/card / deepseek: 1
- run/finalize / code: 1
- selection/add / code: 1

### 兜底介入（Claude/DeepSeek）：10 次（推翻 Jev 8 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o0 @0.36 → o1）：删牌最优先：移除一张打击，直接提升牌组质量；升级打击/防御收益低，药水换诅咒更是净亏。
- [deepseek] 第 9 层 TNone shop/buy: 推翻 Jev（remove @0.10 → buy_card0）：Deck has 0 AOE and low damage; Stomp at 76 is cheap and scales with our Strikes. Remove a Strike with remaining gold nex
- [deepseek] 第 9 层 TNone shop/buy: 推翻 Jev（buy_card2 @0.33 → buy_card3）：Taunt's block plus vulnerable speeds the Waterfall Giant damage race before its gun scales; Blood Wall duplicates an exi
- [deepseek] 第 11 层 TNone map/route: 同意 Jev（n0 @0.25 → n0）：Rest site before the elite: heal or smith (HP 78%, no strength source), safer than Unknown leading straight into the eli
- [deepseek] 第 13 层 T5 map/route: 同意 Jev（n0 @0.29 → n0）：Unknown avoids second straight fight before the pre-boss rest; 85% HP and route_value 5.5 favor event/shop upside over a
- [deepseek] 第 14 层 TNone event/choose: 推翻 Jev（o0 @0.07 → o1）：藏宝图是无用死牌（等同诅咒），会稀释16张的薄牌组；8血换一瓶药水为boss做准备，血量充足且有休息点。
- [deepseek] 第 17 层 T11 reward/card: 推翻 Jev（card2 @0.09 → card1）：18 HP vs escalating Giant damage: Unmovable doubles 血墙/跃跃欲试 block (turn 1 free to cast) and scales with the strength pla
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o0 @0.10 → o1）：Wings converts card rewards into relics; deck is already near target size and should skip mediocre rewards anyway, while
- [deepseek] 第 21 层 TNone selection/add: 推翻 Jev（card3 @0.24 → card1）：Boomerang is 3-hit strength scaling — the run's core need; with Inflame it out-damages all options and suits the single-
- [deepseek] 第 21 层 TNone selection/add: 推翻 Jev（card3 @0.29 → card5）：Headbutt: A-tier reusable 9 dmg that recurs key cards (Block Wall, Uppercut, Stomp). Deck already has 2 AOE, so skip Bre

### Jev 低置信度（<0.35）决策：8 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 海洋混混, 防御) with confidence 0.19; code rank 1 (0.19)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 蟾蜍蝌蚪, 防御, 打击 -> 蟾蜍蝌蚪) with confidence 0.26; code rank 1 (0.26)
- 第 3 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 蟾蜍蝌蚪, 防御) with confidence 0.19; code rank 1 (0.19)
- 第 7 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 幽灵船, 防御, 防御, 欺凌 -> 幽灵船) with confidence 0.34; code rank 1 (0.34)
- 第 15 层 combat/plan-choice: Jev chose plan 1/2 (防御, 挑衅 -> 钙化邪教徒, 打击 -> 钙化邪教徒) with confidence 0.28; code rank 1 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (挑衅 -> 瀑布巨兽, 防御, 打击 -> 瀑布巨兽) with confidence 0.11; code rank 1 (0.11)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (上勾拳 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.28; code rank 1 (0.28)
- 第 19 层 combat/plan-choice: Jev chose plan 2/2 (防御, 挑衅 -> 偷窃草蜢, 打击 -> 偷窃草蜢) with confidence 0.34; code rank 2 (0.34)
