## 复盘：run BFVATR4WANS6 — 阵亡，最高第 33 层

- 决策 411 个；Jev 调用 42 次，Claude 0 次，DeepSeek 9 次；token 68,406 入 / 2,133 出，约 $0.0030；用时 19.0 分钟
- 决策者：code 338，jev 34，jev-plan 22，deepseek 9，code-fallback 8

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→64（-0），决策 code 2
- 第 2 层 淤泥旋螺: HP 64→55（-9），决策 code 3，jev-plan 2，jev 1
- 第 3 层 蟾蜍蝌蚪: HP 61→61（-0），决策 code-fallback 1，code 1
- 第 3 层 蟾蜍蝌蚪: HP 61→55（-6），决策 code 6，code-fallback 1
- 第 4 层 噬尸蛞蝓: HP 59→59（-0），决策 code-fallback 1，code 1
- 第 4 层 噬尸蛞蝓: HP 59→56（-3），决策 code 8，jev 2，jev-plan 2
- 第 6 层 活雾: HP 62→62（-0），决策 code 3
- 第 6 层 活雾: HP 62→59（-3），决策 code 4，code-fallback 1
- 第 6 层 气态炸弹/活雾: HP 59→54（-5），决策 code 4
- 第 8 层 双尾鼠: HP 60→60（-0），决策 code 6
- 第 9 层 化石追踪者: HP 66→66（-0），决策 code 3，jev 2，jev-plan 1
- 第 12 层 骇鳗: HP 72→56（-16），决策 code 4，jev 1，jev-plan 1
- 第 12 层 骇鳗: HP 56→56（-0），决策 code 8
- 第 15 层 潮湿邪教徒/钙化邪教徒: HP 62→62（-0），决策 code 5
- 第 15 层 潮湿邪教徒: HP 62→61（-1），决策 code 3
- 第 17 层 乐加维林族母: HP 80→80（-0），决策 code 8
- 第 17 层 乐加维林族母: HP 80→56（-24），决策 code 8，jev 2，jev-plan 1
- 第 17 层 乐加维林族母: HP 56→52（-4），决策 code 5
- 第 17 层 乐加维林族母: HP 52→52（-0），决策 code 3
- 第 19 层 地道虫: HP 75→73（-2），决策 code 3，jev-plan 2，jev 1
- 第 19 层 地道虫: HP 73→73（-0），决策 code 5
- 第 19 层 地道虫: HP 73→67（-6），决策 code 4，jev 1
- 第 21 层 偷窃草蜢: HP 73→67（-6），决策 code 6，code-fallback 1，jev 1
- 第 21 层 偷窃草蜢: HP 67→51（-16），决策 code 4
- 第 23 层 棘刺蟾蜍: HP 51→51（-0），决策 code 4，code-fallback 1，jev 1
- 第 23 层 棘刺蟾蜍: HP 51→39（-12），决策 code 1，jev 1，jev-plan 1
- 第 23 层 棘刺蟾蜍: HP 39→16（-23），决策 code 4，jev 2，jev-plan 2，code-fallback 1
- 第 27 层 异螨: HP 46→31（-15），决策 jev-plan 5，jev 3，code 2，code-fallback 1
- 第 27 层 异螨: HP 31→22（-9），决策 code 5，jev 1
- 第 29 层 胧光怪: HP 52→49（-3），决策 code 4
- 第 29 层 胧光怪: HP 49→49（-0），决策 code 2
- 第 29 层 寄生惧魔/胧光怪: HP 49→49（-0），决策 code 5
- 第 30 层 感染棱柱: HP 55→54（-1），决策 code 4，jev 3
- 第 30 层 感染棱柱: HP 54→34（-20），决策 code 5，jev-plan 5，jev 2
- 第 30 层 感染棱柱: HP 34→26（-8），决策 code 7
- 第 33 层 火箭/碾碎爪: HP 56→48（-8），决策 code 5
- 第 33 层 火箭/碾碎爪: HP 48→48（-0），决策 code 3
- 第 33 层 火箭/碾碎爪: HP 48→28（-20），决策 code 12
- 第 33 层 火箭/碾碎爪: HP 28→8（-20），决策 code 5
- 第 33 层 火箭/碾碎爪: HP 8→8（-0），决策 code 2

### 死亡战斗：第 33 层 火箭/碾碎爪
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 打击+ -> 碾碎爪
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan / code: 88
- combat/plan-continue / code: 66
- reward/claim / code: 39
- map/route / code: 26
- combat/plan-choice / jev: 22
- combat/plan-continue / jev-plan: 22
- reward/proceed / code: 15
- combat/lethal / code: 14
- reward/card / code: 13
- selection/confirm / code: 13
- selection/add / code: 10
- combat/plan-choice / code-fallback: 7
- event/leave / code: 6
- selection/remove / code: 6
- shop/buy / code: 6
- event/choose / deepseek: 5
- map/route / jev: 5
- rest/choose / code: 5
- rest/proceed / code: 5
- combat/least-loss / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- combat/end_turn / code: 3
- shop/buy / jev: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/plan-choice+potion / jev: 2
- combat/plan-choice+potion / code-fallback: 1
- combat/plan-guarded / code: 1
- combat/plan-potion / code: 1
- event/choose / jev: 1
- map/route / deepseek: 1
- reward/card / deepseek: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/exhaust / code: 1
- selection/upgrade / code: 1
- shop/buy / deepseek: 1

### 兜底介入（Claude/DeepSeek）：9 次（推翻 Jev 7 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.40 → o0）：Act 1 needs damage for the 222-HP sleeping boss; Neow's Wrath upgrades the thin starter deck, while Winged Boots is only
- [deepseek] 第 5 层 TNone event/choose: 推翻 Jev（o0 @0.11 → o1）：Free random upgrade adds early tempo for the 222-HP boss burst and saves 128 gold for Strike removal; a random colorless
- [deepseek] 第 11 层 TNone event/choose: 推翻 Jev（o1 @0.01 → o0）：Deck is attack-heavy with zero real block; Sharp 2 adds damage for bursting the sleeping Matriarch, while +2 block on on
- [deepseek] 第 11 层 TNone selection/enchant: 推翻 Jev（card10 @0.38 → card11）：Twin Strike scales per-hit with Sharp and future strength, fitting the multi-hit strength plan; Strikes get deleted, Mol
- [deepseek] 第 12 层 T4 reward/card: 推翻 Jev（skip @0.13 → card1）：Perfect Strike hits ~20 for 2E with 7 strike-named cards; deck lacks damage for the 222-HP Matriarch, and Strikes stay f
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o1 @0.16 → o1）：22-card deck bloated with Strikes; removing 5 now sharpens draws for the boss push, and they return upgraded — free long
- [deepseek] 第 18 层 TNone map/route: 推翻 Jev（n1 @0.23 → n2）：Highest route value with a shop break (delete Strike/buy block) before more fights; HP 94% makes early combats safe, and
- [deepseek] 第 22 层 TNone event/choose: 同意 Jev（o0 @0.36 → o0）：6 HP is cheap; gold reaches 89 for a shop removal. Past losses show Clumsy clogs draws and random-relic curses aren't wo
- [deepseek] 第 24 层 TNone shop/buy: 推翻 Jev（buy_card2 @0.05 → buy_card3）：Battle Trance (S-tier, 0-cost draw 3) adds consistency to dig for block and burst before the Crab boss; upgraded Strikes

### Jev 低置信度（<0.35）决策：8 个
- 第 4 层 combat/plan-choice: Jev chose plan 1/2 (头槌 -> 噬尸蛞蝓) with confidence 0.33; code rank 1 (0.33)
- 第 23 层 combat/plan-choice: Jev chose plan 1/2 (涅奥之怒 -> 棘刺蟾蜍) with confidence 0.10; code rank 1 (0.10)
- 第 23 层 combat/plan-choice+potion: Jev chose plan 1/1 (预备打击 -> 棘刺蟾蜍, 头槌 -> 棘刺蟾蜍, 欺凌 -> 棘刺蟾蜍, 踩踏) with confidence 0.28; code rank 1 (0.28)
- 第 23 层 combat/plan-choice+potion: Jev chose plan 1/1 (欺凌 -> 棘刺蟾蜍, 踩踏) with confidence 0.28; code rank 1 (0.28)
- 第 27 层 combat/plan-choice: Jev chose plan 1/4 (打击+ -> 异螨, 涅奥之怒 -> 异螨, 双重打击 -> 异螨) with confidence 0.14; code rank 1; HP guard: plan 1 (打击+ -> 异螨, 涅奥之怒 -> 异螨, 双重打击 -> 异螨) loses 1 (0.14)
- 第 27 层 combat/plan-choice: Jev chose plan 1/2 (双重打击 -> 异螨) with confidence 0.27; code rank 1 (0.27)
- 第 30 层 combat/plan-choice: Jev chose plan 3/4 (涅奥之怒 -> 感染棱柱, 撕裂, 熔融之拳 -> 感染棱柱) with confidence 0.09; code rank 3; HP guard: plan 3 (涅奥之怒 -> 感染棱柱, 撕裂, 熔融之拳 -> 感染棱柱) loses 8 HP, m (0.09)
- 第 30 层 combat/plan-choice: Jev chose plan 2/2 (涅奥之怒 -> 感染棱柱, 熔融之拳 -> 感染棱柱) with confidence 0.11; code rank 2 (0.11)
