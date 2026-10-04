## 复盘：run R1QJUBVBSSB2 — 阵亡，最高第 33 层

- 决策 626 个；Jev 调用 140 次，Claude 0 次，DeepSeek 34 次；token 1,035,967 入 / 8,168 出，约 $0.0439（Jev）；DeepSeek token 4,792,098 入（缓存命中 4,375,552，91%）/ 213,876 出；用时 43.7 分钟
- 决策者：code 285，jev-plan 154，jev 140，deepseek 47

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→56（-8，战后回复 +6），决策 jev-plan 5，code 5，jev 3
- 第 3 层 噬尸蛞蝓: HP 62→60（-2，战后回复 +6），决策 jev-plan 5，code 3，jev 2
- 第 4 层 海洋混混: HP 66→55（-11，战后回复 +6），决策 code 3，jev-plan 2，jev 1
- 第 6 层 气态炸弹/活雾: HP 61→46（-15，战后回复 +6），决策 code 5，jev 4，jev-plan 4
- 第 8 层 海洋混混/钙化邪教徒: HP 52→41（-11，战后回复 +6），决策 code 5，jev 3，jev-plan 2
- 第 9 层 潮湿邪教徒/钙化邪教徒: HP 47→34（-13，战后回复 +6），决策 jev 4，jev-plan 4，code 4
- 第 11 层 卑鄙地精/地精佣兵/胖地精: HP 40→22（-18，战后回复 +6），决策 code 9，jev 3，jev-plan 2
- 第 14 层 化石追踪者: HP 52→40（-12，战后回复 +6），决策 jev 3，jev-plan 3，code 3
- 第 15 层 噬尸蛞蝓: HP 46→44（-2，战后回复 +6），决策 jev 3，code 2，jev-plan 1
- 第 17 层 乐加维林族母: HP 74→40（-34，战后回复 +6），决策 jev-plan 19，jev 14，code 10
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 73→63（-10，战后回复 +6），决策 jev 5，jev-plan 5，code 3
- 第 20 层 地道虫: HP 69→49（-20，战后回复 +6），决策 jev 8，jev-plan 5，code 5
- 第 21 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 55→53（-2，战后回复 +6），决策 jev 4，code 3，jev-plan 2
- 第 23 层 啃咬机: HP 59→33（-26，战后回复 +6），决策 jev 6，jev-plan 6，code 1
- 第 25 层 外骨骼虫: HP 39→9（-30，战后回复 +6），决策 jev 9，jev-plan 9，code 2
- 第 28 层 直飞产卵虫/结实的卵: HP 15→6（-9，战后回复 +6），决策 jev 5，jev-plan 4，code 3
- 第 31 层 虱虫之祖: HP 36→12（-24，战后回复 +6），决策 jev-plan 8，jev 6，code 2
- 第 33 层 无厌沙虫: HP 42→0（-42），决策 code 108，jev-plan 68，jev 57

### 死亡战斗：第 33 层 无厌沙虫
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狂乱逃离
- T5 [code] combat/plan: code plan (only line): end turn; hp -7, dmg 0
- T6 [code] combat/plan: code plan (only distinct line): 防御, 愤怒 -> 无厌沙虫, 巨像, 狂乱逃离; hp -0, dmg 10
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 无厌沙虫
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 巨像
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 狂乱逃离
- T6 [code] combat/end_turn: no playable cards; ending the turn
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 被遗忘的仪式, 血墙, 打击 -> 无厌沙虫, 狂乱逃离
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 血墙
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 无厌沙虫
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 狂乱逃离
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 154
- combat/plan-choice / jev: 121
- combat/plan-continue / code: 65
- combat/plan / code: 53
- reward/claim / code: 41
- map/route-follow / code: 29
- combat/lethal / code: 22
- combat/plan-choice+potion / jev: 17
- reward/card / deepseek: 17
- reward/proceed / code: 17
- combat/least-loss / code: 16
- selection/take into my hand / code: 11
- combat/end_turn / code: 9
- event/leave / code: 7
- event/choose / deepseek: 6
- shop/buy / deepseek: 6
- rest/plan / deepseek: 5
- rest/proceed / code: 5
- selection/add / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- map/route-change / deepseek: 2
- selection/take into my hand / jev: 2
- event/act-plan / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/upgrade / deepseek: 1
- shop/discard / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：23 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/3 (防御, 痛击 -> 淤泥旋螺) with confidence 0.27; code rank 2 (0.27)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (potion 敏捷药水); plan 1 (end turn) is as good or better on every axis, playing it with confidence 0.32; code rank 1 (0.32)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.16; code rank 2 (0.16)
- 第 20 层 selection/take into my hand: Jev chose 防御 with confidence 0.07 (0.07)
- 第 25 层 combat/plan-choice: Jev chose plan 3/5 (end turn) with confidence 0.23; code rank 3 (0.23)
- 第 33 层 combat/plan-choice: Jev chose plan 3/10 (战斗专注, 撕裂, 防御, 闪电霹雳, potion 虚弱药水 -> 无厌沙虫, potion 铁心药水) with confidence 0.18; code rank 3 (0.18)
- 第 33 层 combat/plan-choice: Jev chose plan 5/10 (撕裂, 防御, 战栗 -> 无厌沙虫, potion 虚弱药水 -> 无厌沙虫, potion 铁心药水) with confidence 0.26; code rank 5 (0.26)
- 第 33 层 combat/plan-choice: Jev chose plan 3/10 (战斗专注, 撕裂, 防御, 闪电霹雳, potion 虚弱药水 -> 无厌沙虫, potion 铁心药水) with confidence 0.22; code rank 3 (0.22)
- 第 33 层 combat/plan-choice: Jev chose plan 1/2 (狂乱逃离, 熔融之拳 -> 无厌沙虫, 拆卸 -> 无厌沙虫) with confidence 0.04; code rank 1 (0.04)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (杀灭, 防御, 狂乱逃离) with confidence 0.27; code rank 2 (0.27)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.30; code rank 2 (0.30)
- 第 33 层 combat/plan-choice: Jev chose plan 6/10 (战斗专注, 撕裂, 防御, potion 虚弱药水 -> 无厌沙虫, potion 铁心药水) with confidence 0.23; code rank 6 (0.23)
- 第 33 层 combat/plan-choice: Jev chose plan 1/2 (狂乱逃离, 熔融之拳 -> 无厌沙虫, 拆卸 -> 无厌沙虫) with confidence 0.31; code rank 1 (0.31)
- 第 33 层 combat/plan-choice: Jev chose plan 3/3 (狱火, 防御, 狂乱逃离) with confidence 0.28; code rank 3 (0.28)
- 第 33 层 combat/plan-choice: Jev chose plan 6/10 (战斗专注, 撕裂, 防御, potion 虚弱药水 -> 无厌沙虫, potion 铁心药水) with confidence 0.24; code rank 6 (0.24)
