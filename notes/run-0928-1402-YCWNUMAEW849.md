## 复盘：run YCWNUMAEW849 — 阵亡，最高第 17 层

- 决策 166 个；Jev 调用 30 次，Claude 0 次，DeepSeek 6 次；token 52,516 入 / 1,489 出，约 $0.0023；用时 11.0 分钟
- 决策者：code 113，jev 25，jev-plan 17，deepseek 6，code-fallback 5

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→63（-1），决策 code 9，code-fallback 1
- 第 4 层 海洋混混: HP 69→50（-19），决策 jev-plan 3，code 3，jev 2
- 第 6 层 淤泥旋螺: HP 48→40（-8），决策 code 4，jev-plan 2，jev 1
- 第 11 层 鬼祟珊瑚群: HP 70→29（-41），决策 code 8，jev-plan 5，jev 3
- 第 14 层 潮湿邪教徒/钙化邪教徒: HP 59→50（-9），决策 code 5，jev 1
- 第 15 层 双尾鼠: HP 56→56（-0），决策 code 1
- 第 17 层 乐加维林族母: HP 80→10（-70），决策 code 22，jev 13，jev-plan 7，code-fallback 4

### 死亡战斗：第 17 层 乐加维林族母
- T10 [jev] combat/plan-choice: Jev chose plan 1/3 (痛击 -> 乐加维林族母) with confidence 0.81; code rank 1 conf 0.81
- T10 [code] combat/plan: code plan (only line): end turn; hp -6, dmg 0
- T11 [code] combat/plan-guarded: code plan 预备打击 -> 乐加维林族母, 突破, 打击 -> 乐加维林族母 loses 1 HP, over the HP guard bound; playing 预备打击 -> 乐加维林族母, 打击 -> 乐加维林族母 instead (hp -0, dmg 3)
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 乐加维林族母
- T11 [code] combat/plan-guarded: code plan 突破 loses 1 HP, over the HP guard bound; playing end turn instead (hp -0, dmg 0)
- T12 [jev] combat/plan-choice: Jev chose plan 1/4 (突破, 耸肩无视, 耸肩无视) with confidence 0.41; code rank 1; HP guard: plan 1 (突破, 耸肩无视, 耸肩无视) loses 12 HP, more than 0 over the cheapest line (this f conf 0.41
- T12 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视
- T12 [jev] combat/plan-choice: Jev chose plan 2/2 (突破) with confidence 0.28; code rank 2; HP guard: plan 2 (突破) loses 18 HP, more than 0 over the cheapest line (this fight already took 12+ ex conf 0.28
- T12 [code] combat/plan: code plan (only line): end turn; hp -11, dmg 0
- T13 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): 防御, 痛击 -> 乐加维林族母
- T13 [code] combat/plan-continue: continuing the code-chosen plan: 痛击 -> 乐加维林族母
- T13 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): end turn

### 各类决策由谁做
- combat/plan / code: 25
- reward/claim / code: 19
- combat/plan-continue / jev-plan: 17
- combat/plan-continue / code: 16
- combat/plan-choice / jev: 14
- map/route / code: 12
- combat/lethal / code: 6
- combat/plan-choice+potion / jev: 6
- reward/card / code: 6
- reward/proceed / code: 6
- event/leave / code: 5
- combat/plan-choice+potion / code-fallback: 4
- map/route / jev: 4
- event/choose / deepseek: 3
- rest/proceed / code: 3
- combat/least-loss / code: 2
- combat/plan-guarded / code: 2
- event/only / code: 2
- reward/card / deepseek: 2
- shop/buy / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- combat/plan-choice / code-fallback: 1
- reward/card / jev: 1
- run/finalize / code: 1
- shop/buy / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：6 次（推翻 Jev 3 次）
- [deepseek] 第 1 层 TNone event/choose: 同意 Jev（o1 @0.10 → o1）：Random relic is permanent value and typically better expected value than 1-of-2 colorless cards early; colorless picks a
- [deepseek] 第 3 层 TNone shop/buy: 推翻 Jev（buy_card1 @0.31 → buy_card2）：Iron Wave is a guide-rated trap; block potion is temporary. Hell's Blade adds real attack damage to close the Lagavulin 
- [deepseek] 第 5 层 TNone event/choose: 同意 Jev（o0 @0.41 → o0）：No shops before boss, so 100 gold is near-dead; a permanent relic beats a random card, and 8 HP is recoverable via rests
- [deepseek] 第 6 层 T2 reward/card: 同意 Jev（card0 @0.19 → card0）：坚毅: cheap 1E block the deck lacks; exhaust thins Strikes/curse for draw quality and fits the 3-energy curve better than 
- [deepseek] 第 9 层 TNone event/choose: 推翻 Jev（o0 @0.32 → o1）：63 gold is below even one shop removal; 306 funds act-2 removal plus a key card/potion. One curse is a small, removable 
- [deepseek] 第 11 层 T5 reward/card: 推翻 Jev（skip @0.24 → card1）：1E 10-damage exhaust attack that doubles Bash/Marble Bag vulnerable, boosting Bludgeon burst against the 222-HP Matriarc

### Jev 低置信度（<0.35）决策：4 个
- 第 17 层 combat/plan-choice+potion: Jev chose plan 3/4 (踩踏) with confidence 0.24; code rank 3; HP guard: plan 3 (踩踏) loses 19 HP, more than 8 over the cheapest line, playing plan 1 (耸肩无视 (0.24)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 发光水 (confidence 0.06) (0.06)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (耸肩无视, 痛击 -> 乐加维林族母) with confidence 0.26; code rank 1; HP guard: plan 1 (耸肩无视, 痛击 -> 乐加维林族母) loses 6 HP, more than 4 over the chea (0.26)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (突破) with confidence 0.28; code rank 2; HP guard: plan 2 (突破) loses 18 HP, more than 0 over the cheapest line (this fight already t (0.28)
