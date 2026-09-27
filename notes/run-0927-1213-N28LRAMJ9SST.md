## 复盘：run N28LRAMJ9SST — 阵亡，最高第 17 层

- 决策 210 个；Jev 调用 0 次，Claude 0 次，DeepSeek 9 次；token 0 入 / 0 出，约 $0.0000；用时 12.5 分钟
- 决策者：code 147，jev 28，jev-plan 26，deepseek 9

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→55（-9），决策 code 8，jev-plan 3，jev 2
- 第 4 层 噬尸蛞蝓: HP 61→55（-6），决策 jev-plan 4，jev 3，code 2
- 第 6 层 淤泥旋螺: HP 60→52（-8），决策 code 4，jev 2，jev-plan 2
- 第 8 层 花园幽灵鳗: HP 58→46（-12），决策 jev 4，jev-plan 4，code 4
- 第 12 层 活雾: HP 72→72（-0），决策 jev-plan 4，jev 2，code 1
- 第 12 层 气态炸弹/活雾: HP 72→67（-5），决策 code 4
- 第 14 层 海洋混混/钙化邪教徒: HP 72→71（-1），决策 jev 1，jev-plan 1，code 1
- 第 14 层 海洋混混/钙化邪教徒: HP 71→50（-21），决策 code 5，jev 4，jev-plan 3
- 第 15 层 噬尸蛞蝓: HP 56→40（-16），决策 code 8，jev-plan 2，jev 1
- 第 17 层 乐加维林族母: HP 70→67（-3），决策 code 16，jev 4，jev-plan 2
- 第 17 层 乐加维林族母: HP 67→65（-2），决策 code 3，jev 2，jev-plan 1
- 第 17 层 乐加维林族母: HP 65→37（-28），决策 code 7，jev 2
- 第 17 层 乐加维林族母: HP 37→21（-16），决策 code 9，jev 1

### 死亡战斗：第 17 层 乐加维林族母
- T10 [code] combat/plan: code plan (only distinct line): 踩踏; hp -15, dmg 10
- T10 [code] combat/plan: code plan (only line): end turn; hp -15, dmg 0
- T11 [jev] combat/plan-choice: Jev chose plan 1/2 (剑柄打击 -> 乐加维林族母, 打击 -> 乐加维林族母, 打击 -> 乐加维林族母) with confidence 0.00; code rank 1 conf 0.00
- T11 [code] combat/plan: code plan (+7.0 over next): 打击 -> 乐加维林族母, 打击 -> 乐加维林族母; hp -1, dmg 7
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 乐加维林族母
- T11 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T12 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 25): 剑柄打击 -> 乐加维林族母, 预备打击 -
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 防御, 预备打击 -> 乐加维林族母
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 预备打击 -> 乐加维林族母
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan / code: 50
- combat/plan-choice / jev: 28
- combat/plan-continue / jev-plan: 26
- reward/claim / code: 17
- map/route / code: 14
- combat/plan-continue / code: 12
- reward/proceed / code: 8
- reward/card / code: 7
- combat/lethal / code: 6
- selection/add / code: 5
- rest/proceed / code: 4
- shop/buy / code: 4
- combat/least-loss / code: 3
- shop/buy / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- event/leave / code: 2
- map/route / deepseek: 2
- rest/choose / code: 2
- rest/choose / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-guarded / code: 1
- event/choose / deepseek: 1
- event/only / code: 1
- run/finalize / code: 1
- selection/upgrade / code: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：9 次（推翻 Jev 5 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o0 @0.00 → o1）：Early deck is weak; the run snowballs through elite relics/cards, and +2 draw +1 energy makes those Act 1 elite fights f
- [deepseek] 第 3 层 TNone shop/buy: 推翻 Jev（remove @0.00 → buy_card0）：Deck has zero AOE and no strength. Breakthrough is cheap 52g AOE (9 to all) filling the biggest Act-1 hole, leaving gold
- [deepseek] 第 3 层 TNone shop/buy: 推翻 Jev（leave @0.00 → buy_card2）：坚毅 25g: 廉价高效格挡牌，还能消耗掉一张打击精简牌组；牌组缺非基础格挡，比一次性药水更持久。
- [deepseek] 第 3 层 TNone map/route: 推翻 Jev（n0 @0.00 → n1）：Both are Monster nodes; n1 has higher route value (23.62) and same continuation. HP 76% is fine for early Act 1 fights.
- [deepseek] 第 7 层 TNone map/route: 同意 Jev（n0 @0.00 → n0）：73% HP, Resonance Conch grants +1 energy and +2 cards at elite start, and a rest site follows — take the elite for a rel
- [deepseek] 第 9 层 TNone rest/choose: 推翻 Jev（o0 @0.00 → o1）：60% HP, next node is Treasure, another rest before boss; smith Bash for 3 vulnerable — our only damage multiplier for th
- [deepseek] 第 9 层 TNone selection/upgrade: 同意 Jev（card13 @0.00 → card13）：Inferno procs every turn (turn-start self-damage, plus Breakthrough) — +3 AoE per proc across elite/boss fights beats +3
- [deepseek] 第 9 层 TNone rest/choose: 同意 Jev（o0 @0.00 → o0）：HP 60% is well below the ~88% boss-entry average; boss Lagavulin is a long grind with no strength source, so 24 HP is wo
- [deepseek] 第 11 层 TNone shop/buy: 同意 Jev（buy_card0 @0.00 → buy_card0）：Deck needs damage vs 222-HP boss and upcoming elites; Stomp is cheap AoE. Iron Wave is a trap; Feel No Pain lacks exhaus

### Jev 低置信度（<0.35）决策：28 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 海洋混混, 防御) with confidence 0.00; code rank 1 (0.00)
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 海洋混混, 打击 -> 海洋混混) with confidence 0.00; code rank 1 (0.00)
- 第 4 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 噬尸蛞蝓, 头槌 -> 噬尸蛞蝓) with confidence 0.00; code rank 1 (0.00)
- 第 4 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 噬尸蛞蝓, 打击 -> 噬尸蛞蝓) with confidence 0.00; code rank 1 (0.00)
- 第 4 层 combat/plan-choice: Jev chose plan 1/2 (防御, 打击 -> 噬尸蛞蝓, 突破) with confidence 0.00; code rank 1 (0.00)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (无情猛攻 -> 淤泥旋螺, 防御) with confidence 0.00; code rank 1 (0.00)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 淤泥旋螺, 坚毅) with confidence 0.00; code rank 1 (0.00)
- 第 8 层 combat/plan-choice: Jev chose plan 1/4 (防御, 痛击+ -> 花园幽灵鳗, 防御) with confidence 0.00; code rank 1 (0.00)
- 第 8 层 combat/plan-choice: Jev chose plan 1/4 (防御, 狱火, 突破) with confidence 0.00; code rank 1; HP guard: plan 1 (防御, 狱火, 突破) loses 7 HP, more than 5 over the cheapest line, playi (0.00)
- 第 8 层 combat/plan-choice: Jev chose plan 1/3 (防御) with confidence 0.00; code rank 1 (0.00)
- 第 8 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 花园幽灵鳗, 无情猛攻 -> 花园幽灵鳗) with confidence 0.00; code rank 1 (0.00)
- 第 12 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 活雾, 无情猛攻 -> 活雾, 踩踏, 耸肩无视) with confidence 0.00; code rank 1 (0.00)
- 第 12 层 combat/plan-choice: Jev chose plan 1/3 (痛击+ -> 活雾, 头槌 -> 活雾) with confidence 0.00; code rank 1 (0.00)
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (突破, 耸肩无视, 头槌 -> 钙化邪教徒) with confidence 0.00; code rank 1 (0.00)
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 钙化邪教徒, 踩踏) with confidence 0.00; code rank 1 (0.00)
