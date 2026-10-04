## 复盘：run WLM6YKJ0ASNE — 阵亡，最高第 33 层

- 决策 440 个；Jev 调用 57 次，Claude 0 次，DeepSeek 34 次；token 304,943 入 / 3,139 出，约 $0.0129（Jev）；DeepSeek token 4,418,039 入（缓存命中 3,746,944，85%）/ 213,649 出；用时 67.4 分钟
- 决策者：code 244，jev-plan 96，jev 57，deepseek 43

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 75→66（-9，战后回复 +6），决策 code 4，jev-plan 3，jev 2
- 第 4 层 蟾蜍蝌蚪: HP 78→71（-7，战后回复 +6），决策 code 8，jev-plan 6，jev 5
- 第 5 层 噬尸蛞蝓: HP 77→74（-3，战后回复 +6），决策 code 9，jev-plan 4，jev 2
- 第 6 层 下水道蚌: HP 80→51（-29，战后回复 +6），决策 code 12，jev-plan 5，jev 3
- 第 8 层 骇鳗: HP 86→37（-49，战后回复 +6），决策 code 19，jev-plan 10，jev 4
- 第 14 层 潮湿邪教徒/钙化邪教徒: HP 65→64（-1，战后回复 +6），决策 code 6，jev 3，jev-plan 1
- 第 15 层 气态炸弹/活雾: HP 70→64（-6，战后回复 +6），决策 jev 5，jev-plan 5，code 5
- 第 17 层 乐加维林族母: HP 97→80（-17，战后回复 +6），决策 code 17，jev-plan 13，jev 4
- 第 19 层 地道虫: HP 98→92（-6，战后回复 +6），决策 jev-plan 7，code 5，jev 4
- 第 21 层 偷窃草蜢: HP 98→75（-23，战后回复 +6），决策 jev-plan 6，code 5，jev 4
- 第 22 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 81→66（-15，战后回复 +6），决策 code 7，jev-plan 4，jev 3
- 第 23 层 直飞产卵虫/结实的卵: HP 72→65（-7，战后回复 +6），决策 jev-plan 6，jev 3，code 2
- 第 25 层 感染棱柱: HP 101→68（-33，战后回复 +6），决策 code 9，jev 5，jev-plan 5
- 第 28 层 啃咬机: HP 74→58（-16，战后回复 +6），决策 code 7，jev-plan 3，jev 1
- 第 30 层 寄生惧魔/胧光怪: HP 94→88（-6，战后回复 +6），决策 code 6，jev 1，jev-plan 1
- 第 33 层 火箭/碾碎爪: HP 89→0（-89），决策 jev-plan 17，code 16，jev 8

### 死亡战斗：第 33 层 火箭/碾碎爪
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 上勾拳 -> 火箭, 防御, 愤怒+ -> 火箭, 打击 -> 火箭, 双重打击 -> 火箭
- T7 [code] combat/plan: code plan (only line): 防御, 愤怒+ -> 火箭, 双重打击 -> 火箭, 打击 -> 碾碎爪; hp -8, dmg 38
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒+ -> 火箭
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 火箭
- T7 [code] combat/plan: code plan (only distinct line): 打击 -> 碾碎爪; hp -4, dmg 0
- T7 [code] combat/plan: code plan (only line): end turn; hp -8, dmg 0
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-19): 防御, 闪电霹雳, 愤怒+ -> 碾碎爪, 防御, 打击 -> 碾碎爪
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 闪电霹雳
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒+ -> 碾碎爪
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 碾碎爪
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-19): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 96
- combat/plan / code: 64
- combat/plan-continue / code: 48
- reward/claim / code: 39
- combat/plan-choice+potion / jev: 29
- map/route-follow / code: 29
- combat/plan-choice / jev: 27
- combat/lethal / code: 18
- reward/card / deepseek: 15
- reward/proceed / code: 15
- rest/plan / deepseek: 8
- rest/proceed / code: 8
- event/choose / deepseek: 6
- event/leave / code: 6
- combat/least-loss / code: 3
- selection/upgrade / deepseek: 3
- shop/buy / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/plan / deepseek: 2
- combat/end_turn / code: 1
- combat/plan-choice+potion-lethal / jev: 1
- combat/potion-now / code: 1
- event/act-plan / deepseek: 1
- map/route-change / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/take into my hand / code: 1
- selection/take-planned / code: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/2 (痛击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.08; code rank 2 (0.08)
- 第 4 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 蟾蜍蝌蚪 #1, 打击 -> 蟾蜍蝌蚪 #1, 防御) with confidence 0.28; code rank 1 (0.28)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 下水道蚌, 防御, 打击 -> 下水道蚌) with confidence 0.30; code rank 1 (0.30)
- 第 8 层 combat/plan-choice: Jev chose plan 3/3 (防御, 防御, 打击 -> 骇鳗, 打击 -> 骇鳗) with confidence 0.20; code rank 3 (0.20)
- 第 8 层 combat/plan-choice: Jev chose plan 1/2 (突破, 打击 -> 骇鳗, 防御, 愤怒 -> 骇鳗, 防御) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (双重打击+ -> 乐加维林族母, 愤怒+ -> 乐加维林族母, 打击 -> 乐加维林族母) with confidence 0.08; code rank 1 (0.08)
- 第 21 层 combat/plan-choice+potion: Jev chose plan 2/2 (与我一战！+ -> 偷窃草蜢, 愤怒 -> 偷窃草蜢, 打击 -> 偷窃草蜢) with confidence 0.34; code rank 2 (0.34)
- 第 23 层 combat/plan-choice+potion: Jev chose plan 1/9 (祭品, 与我一战！ -> 直飞产卵虫, 打击 -> 直飞产卵虫, potion 预知之滴, 上勾拳 from 预知之滴 -> 直飞产卵虫) with confidence 0.20; code rank 1 (0.20)
- 第 33 层 combat/plan-choice: Jev chose plan 7/7 (双重打击 -> 火箭, 被遗忘的仪式, 痛击 -> 碾碎爪, 薪火之源+) with confidence 0.23; code rank - (rollout's best line, added) (0.23)
- 第 33 层 combat/plan-choice: Jev chose plan 7/7 (痛击 -> 火箭, 拆卸 -> 火箭, 双重打击 -> 碾碎爪, 防御) with confidence 0.30; code rank - (rollout's best line, added) (0.30)
