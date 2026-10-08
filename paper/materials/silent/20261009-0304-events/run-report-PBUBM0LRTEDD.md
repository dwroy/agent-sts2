## 复盘：run PBUBM0LRTEDD — 阵亡，最高第 49 层

- 决策 934 个；Jev 调用 194 次，Claude 0 次，大脑 47 次（codex 47）；token 1,113,830 入 / 10,762 出，约 $0.0472（Jev）；大脑 token 6,372,920 入（缓存命中 3,696,000，58%）/ 11,975 出；用时 50.1 分钟
- 决策者：code 436，jev-plan 243，jev 194，codex 61

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 56→50（-6），决策 code 19，jev 4，jev-plan 2
- 第 4 层 噬尸蛞蝓: HP 50→50（-0），决策 jev-plan 7，code 3，jev 2
- 第 6 层 蟾蜍蝌蚪: HP 50→49（-1），决策 jev-plan 8，jev 7，code 5
- 第 8 层 花园幽灵鳗: HP 75→55（-20），决策 jev-plan 13，jev 9，code 9
- 第 12 层 气态炸弹/活雾: HP 55→39（-16），决策 code 12，jev 7，jev-plan 5
- 第 14 层 鬼祟珊瑚群: HP 66→56（-10），决策 code 12，jev-plan 7，jev 5
- 第 15 层 潮湿邪教徒/钙化邪教徒: HP 56→50（-6），决策 jev-plan 14，jev 13，code 7
- 第 17 层 瀑布巨兽: HP 79→34（-45），决策 jev-plan 21，code 19，jev 14
- 第 19 层 外骨骼虫: HP 78→78（-0），决策 code 5，jev 4，jev-plan 3
- 第 20 层 偷窃草蜢: HP 78→68（-10），决策 code 9，jev 6，jev-plan 5
- 第 27 层 感染棱柱: HP 88→14（-74），决策 jev-plan 19，jev 17，code 1
- 第 30 层 寄生惧魔/胧光怪: HP 56→41（-15），决策 jev 13，jev-plan 11，code 7
- 第 31 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 41→30（-11），决策 jev-plan 11，code 5，jev 3
- 第 33 层 无厌沙虫: HP 66→2（-64），决策 code 40，jev 22，jev-plan 16
- 第 35 层 咬人卷轴: HP 92→71（-21），决策 jev-plan 7，code 5，jev 2
- 第 36 层 虔诚雕刻师: HP 71→58（-13），决策 jev-plan 14，jev 6，code 4
- 第 37 层 猫头鹰法官: HP 58→17（-41），决策 jev-plan 16，code 9，jev 8
- 第 43 层 灵魂枢纽: HP 105→79（-26），决策 jev-plan 14，code 10，jev 6
- 第 48 层 女王/火炬头聚合体: HP 110→26（-84），决策 jev-plan 33，code 30，jev 27
- 第 49 层 实验体 #C68: HP 22→0（-22），决策 code 55，jev 19，jev-plan 17

### 死亡战斗：第 49 层 实验体 #C68
- T1 [jev] combat/plan-choice: Jev chose plan 1/3 (打击+ -> 实验体 #C68) with confidence 0.39; code rank 1; SL explore (the deviation's turn, T1): playing end turn instead of 打击+ -> 实验体 #C68, whic conf 0.39
- T2 [code] combat/plan: code plan (only distinct line): 中和+ -> 实验体 #C68, 切割+ -> 实验体 #C68, 突然一拳+ -> 实验体 #C68, 打击+ -> 实验体 #C68; hp -18, dmg 32
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 切割+ -> 实验体 #C68
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 突然一拳+ -> 实验体 #C68
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 打击+ -> 实验体 #C68
- T2 [code] combat/plan: code plan (only line): end turn; hp -18, dmg 0
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-24): 毒雾+, 带毒刺击+ -> 实验体 #C68, 毒雾+, 打击+ -> 实验体 #C68, 防御+
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 带毒刺击+ -> 实验体 #C68
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 毒雾+
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 打击+ -> 实验体 #C68
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 防御+
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-24): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 243
- combat/plan-choice / jev: 148
- combat/plan / code: 104
- combat/plan-continue / code: 89
- reward/claim / code: 61
- map/route-follow / code: 43
- combat/end_turn / code: 33
- selection/choose / jev: 29
- combat/lethal / code: 21
- reward/proceed / code: 21
- reward/card / codex: 18
- combat/least-loss / code: 16
- combat/plan-choice+potion / jev: 11
- rest/plan / codex: 11
- rest/proceed / code: 11
- event/leave / code: 10
- event/choose / codex: 7
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- event/plan / codex: 4
- selection/take into my hand / jev: 4
- selection/upgrade / codex: 4
- shop/buy / codex: 4
- selection/take-planned / code: 3
- shop/leave / code: 3
- shop/plan / codex: 3
- sphere/clear / code: 3
- combat/plan-choice+potion-lethal / jev: 2
- event/act-plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/remove / codex: 2
- selection/transform / codex: 2
- shop/open / code: 2
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- sphere/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：35 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 打击 -> 淤泥旋螺, 防御) with confidence 0.31; code rank 1 (0.31)
- 第 2 层 selection/choose: Jev chose 防御 with confidence 0.29 (0.29)
- 第 8 层 selection/choose: Jev chose 打击 with confidence 0.09 (0.09)
- 第 12 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 活雾, 打击 -> 活雾, 翻越撑击) with confidence 0.10; code rank 2 (0.10)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (切割 -> 鬼祟珊瑚群, 打击 -> 鬼祟珊瑚群, 防御, 防御) with confidence 0.29; code rank 1 (0.29)
- 第 14 层 selection/choose: Jev chose 打击 with confidence 0.33 (0.33)
- 第 15 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.15) (0.15)
- 第 15 层 selection/take into my hand: Jev chose 速行者 with confidence 0.08 (0.08)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.31 (0.31)
- 第 20 层 combat/plan-choice: Jev chose plan 1/3 (后空翻, 蛇咬 -> 偷窃草蜢, potion 力量药水) with confidence 0.13; code rank 1 (0.13)
- 第 20 层 combat/plan-choice: Jev chose plan 1/3 (potion 力量药水) with confidence 0.22; code rank 1 (0.22)
- 第 27 层 combat/plan-choice+potion-lethal: Jev chose plan 1/2 (potion 污浊药水) with confidence 0.12; code rank 1 (0.12)
- 第 30 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.31) (0.31)
- 第 30 层 selection/take into my hand: Jev chose 必备工具 with confidence 0.22 (0.22)
- 第 30 层 selection/choose: Jev chose 打击 with confidence 0.15 (0.15)
