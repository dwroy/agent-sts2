## 复盘：run R6WDLYS19ZTY — 阵亡，最高第 42 层

- 决策 827 个；Jev 调用 158 次，Claude 0 次，大脑 41 次（codex 41）；token 968,721 入 / 8,650 出，约 $0.0410（Jev）；大脑 token 5,562,210 入（缓存命中 2,732,672，49%）/ 12,414 出；用时 55.3 分钟
- 决策者：code 388，jev-plan 226，jev 158，codex 55

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 56→43（-13），决策 code 11，jev 2，jev-plan 2
- 第 3 层 蟾蜍蝌蚪: HP 43→38（-5），决策 jev-plan 9，code 9，jev 4
- 第 4 层 淤泥旋螺: HP 38→38（-0），决策 jev-plan 9，jev 3，code 3
- 第 9 层 卑鄙地精/地精佣兵/胖地精: HP 48→41（-7），决策 jev-plan 13，code 11，jev 9
- 第 12 层 噬尸蛞蝓: HP 41→32（-9），决策 code 13，jev 7，jev-plan 7
- 第 15 层 海洋混混/钙化邪教徒: HP 32→32（-0），决策 code 9，jev-plan 6，jev 3
- 第 17 层 瀑布巨兽: HP 53→12（-41），决策 code 102，jev-plan 38，jev 26
- 第 19 层 地道虫: HP 58→30（-28），决策 jev-plan 8，code 8，jev 6
- 第 28 层 盛碗虫（石）/盛碗虫（蜜）: HP 54→45（-9），决策 code 7，jev-plan 2，jev 1
- 第 30 层 感染棱柱: HP 66→8（-58），决策 jev-plan 21，jev 14，code 10
- 第 33 层 火箭/碾碎爪: HP 44→1（-43），决策 jev-plan 91，jev 65，code 60
- 第 35 层 咬人卷轴: HP 56→27（-29），决策 jev 8，jev-plan 7，code 4
- 第 42 层 幽灵骑士/连枷骑士/魔法骑士: HP 57→0（-57），决策 jev-plan 13，code 11，jev 10

### 死亡战斗：第 42 层 幽灵骑士/连枷骑士/魔法骑士
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 迷雾
- T4 [code] combat/plan: code plan (only line): end turn; hp -2, dmg 21
- T5 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 87): 后空翻, 毒性爆发
- T5 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 36): 刀刃之舞, 打击 -> 连枷骑士, 打击 -
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-19): 打击 -> 连枷骑士, 打击 -> 连枷骑士, 切割 -> 连枷骑士, 小刀 -> 连枷骑士, 小刀 -> 连枷骑士, 小刀 -> 连枷骑士
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 连枷骑士
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 切割 -> 连枷骑士
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 小刀 -> 连枷骑士
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 小刀 -> 连枷骑士
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 小刀 -> 连枷骑士
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 226
- combat/plan-choice / jev: 124
- combat/plan / code: 101
- combat/plan-continue / code: 97
- map/route-follow / code: 36
- reward/claim / code: 31
- selection/choose / jev: 24
- combat/least-loss / code: 21
- combat/end_turn / code: 20
- combat/lethal / code: 17
- reward/card / codex: 12
- reward/proceed / code: 12
- event/leave / code: 11
- event/choose / codex: 10
- combat/plan-choice+potion / jev: 8
- rest/plan / codex: 8
- rest/proceed / code: 8
- shop/buy / codex: 7
- shop/leave / code: 6
- shop/open / code: 6
- shop/plan / codex: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- selection/upgrade / codex: 3
- sphere/clear / code: 3
- event/act-plan / codex: 2
- map/route-change / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/add / codex: 2
- selection/take into my hand / code: 2
- selection/take into my hand / jev: 2
- shop/buy / code: 2
- bundle/choose / codex: 1
- bundle/confirm / code: 1
- event/only / code: 1
- event/plan / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- sphere/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：22 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/3 (灵动步法, 打击 -> 蟾蜍蝌蚪 #1, 中和 -> 蟾蜍蝌蚪 #2, 防御, 切割 -> 蟾蜍蝌蚪 #1) with confidence 0.13; code rank 1 (0.13)
- 第 9 层 combat/plan-choice: Jev chose plan 2/2 (小刀 -> 胖地精, 小刀 -> 胖地精, 小刀 -> 胖地精) with confidence 0.10; code rank 2 (0.10)
- 第 17 层 combat/plan-choice: Jev chose plan 3/4 (打击 -> 瀑布巨兽, 迷雾+) with confidence 0.33; code rank 3 (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (切割 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 迷雾+, 中和 -> 瀑布巨兽) with confidence 0.16; code rank 2 (0.16)
- 第 17 层 combat/plan-choice: Jev chose plan 3/4 (打击 -> 瀑布巨兽, 迷雾+) with confidence 0.29; code rank 3; SL explore (T5, the 6th latest question before attempt 2's death on T13): play (0.29)
- 第 19 层 selection/choose: Jev chose 刀刃之舞 with confidence 0.27 (0.27)
- 第 30 层 selection/choose: Jev chose 蛇咬 with confidence 0.19 (0.19)
- 第 33 层 selection/choose: Jev chose 防御 with confidence 0.16 (0.16)
- 第 33 层 selection/choose: Jev chose 打击 with confidence 0.27 (0.27)
- 第 33 层 selection/choose: Jev chose 蛇咬 with confidence 0.20 (0.20)
- 第 33 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.34; code rank 3 (0.34)
- 第 33 层 combat/plan-choice: Jev chose plan 3/3 (毒性爆发, 防御, 防御, 切割 -> 火箭) with confidence 0.27; code rank - (rollout's best line, added) (0.27)
- 第 33 层 selection/choose: Jev chose 蛇咬 with confidence 0.13 (0.13)
- 第 33 层 combat/plan-choice: Jev chose plan 3/3 (毒性爆发, 防御, 防御, 切割 -> 火箭) with confidence 0.28; code rank - (rollout's best line, added) (0.28)
- 第 33 层 selection/choose: Jev chose 防御 with confidence 0.13 (0.13)
