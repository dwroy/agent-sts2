## 复盘：run PW7Y9EWUW8SB — 阵亡，最高第 48 层

- 决策 790 个；Jev 调用 153 次，Claude 0 次，DeepSeek 49 次；token 992,216 入 / 9,069 出，约 $0.0421（Jev）；DeepSeek token 6,934,632 入（缓存命中 6,408,960，92%）/ 337,023 出；用时 60.9 分钟
- 决策者：code 393，jev-plan 174，jev 153，deepseek 70

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→55（-9，战后回复 +6），决策 code 7，jev-plan 3，jev 2
- 第 5 层 蟾蜍蝌蚪: HP 61→51（-10，战后回复 +6），决策 code 5，jev-plan 3，jev 2
- 第 6 层 噬尸蛞蝓: HP 57→52（-5，战后回复 +6），决策 code 4，jev 3，jev-plan 2
- 第 8 层 花园幽灵鳗: HP 80→35（-45，战后回复 +6），决策 jev-plan 9，code 8，jev 6
- 第 11 层 气态炸弹/活雾: HP 67→60（-7，战后回复 +6），决策 code 8，jev-plan 4，jev 3
- 第 12 层 化石追踪者: HP 66→64（-2，战后回复 +6），决策 code 5，jev-plan 2，jev 1
- 第 14 层 双尾鼠: HP 70→70（-0，战后回复 +6），决策 jev 5，jev-plan 3，code 2
- 第 15 层 幽灵船: HP 76→71（-5，战后回复 +6），决策 jev 5，jev-plan 4，code 3
- 第 17 层 乐加维林族母: HP 80→63（-17，战后回复 +6），决策 jev-plan 11，jev 8，code 8
- 第 19 层 外骨骼虫: HP 77→69（-8，战后回复 +6），决策 jev 6，jev-plan 5，code 2
- 第 21 层 偷窃草蜢: HP 69→68（-1，战后回复 +6），决策 code 9，jev 3，jev-plan 2
- 第 22 层 啃咬机: HP 74→46（-28，战后回复 +6），决策 jev 5，jev-plan 4，code 3
- 第 28 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 65→61（-4，战后回复 +6），决策 jev-plan 4，code 4，jev 3
- 第 29 层 外骨骼虫: HP 67→46（-21，战后回复 +6），决策 jev 7，jev-plan 4，code 2
- 第 31 层 虱虫之祖: HP 52→38（-14，战后回复 +6），决策 jev 6，code 4，jev-plan 2
- 第 33 层 知识恶魔: HP 80→23（-57，战后回复 +6），决策 code 34，jev-plan 21，jev 17
- 第 35 层 咬人卷轴: HP 69→61（-8，战后回复 +6），决策 jev-plan 5，code 4，jev 2
- 第 36 层 虔诚雕刻师: HP 67→61（-6，战后回复 +6），决策 jev-plan 4，code 4，jev 3
- 第 37 层 青蛙骑士: HP 67→47（-20，战后回复 +6），决策 jev-plan 9，code 6，jev 5
- 第 39 层 失落之物/遗忘之物: HP 53→33（-20，战后回复 +6），决策 jev-plan 9，code 8，jev 6
- 第 44 层 猫头鹰法官: HP 54→32（-22，战后回复 +6），决策 jev-plan 11，jev 8，code 8
- 第 48 层 实验体 #C42: HP 74→0（-74），决策 code 77，jev-plan 53，jev 47

### 死亡战斗：第 48 层 实验体 #C42
- T5 [jev] combat/plan-choice: Jev chose plan 2/4 (与我一战！+ -> 实验体 #C42, 烙印+, 双重打击+ -> 实验体 #C42, 凌虐 -> 实验体 #C42) with confidence 0.22; code rank 2 conf 0.22
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 烙印+
- T5 [code] selection/exhaust: code: 御血术 scores 14 vs 重锤 9
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 双重打击+ -> 实验体 #C42
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 凌虐 -> 实验体 #C42
- T5 [code] combat/plan: code plan (only line): end turn; hp -6, dmg 0
- T6 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 102): 剑柄打击 -> 实验体 #C42, 狂怒,
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-19): 狂怒, 防御, 打击 -> 实验体 #C42
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 实验体 #C42
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): 突破
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 174
- combat/plan-choice / jev: 142
- reward/claim / code: 71
- combat/plan / code: 69
- combat/plan-continue / code: 64
- map/route-follow / code: 42
- combat/lethal / code: 25
- combat/end_turn / code: 21
- reward/card / deepseek: 21
- reward/proceed / code: 21
- combat/least-loss / code: 16
- selection/exhaust / code: 11
- shop/buy / deepseek: 11
- event/choose / deepseek: 10
- event/leave / code: 10
- combat/plan-choice+potion / jev: 9
- selection/curse / code: 8
- rest/plan / deepseek: 7
- rest/proceed / code: 7
- shop/leave / code: 5
- shop/open / code: 5
- shop/plan / deepseek: 5
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- event/plan / deepseek: 3
- selection/remove / deepseek: 3
- selection/upgrade / deepseek: 3
- sphere/clear / code: 3
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/enchant / deepseek: 2
- selection/take into my hand / jev: 2
- event/only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/take-planned / code: 1
- sphere/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：23 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 打击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.00; code rank 1 (0.00)
- 第 6 层 combat/plan-choice: Jev chose plan 1/9 (与我一战！ -> 噬尸蛞蝓 #1, 战栗 -> 噬尸蛞蝓 #2) with confidence 0.27; code rank 1 (0.27)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (战栗 -> 噬尸蛞蝓) with confidence 0.03; code rank 1 (0.03)
- 第 44 层 combat/plan-choice: Jev chose plan 8/10 (防御, 防御, 狂怒, 烙印+, 飞剑回旋镖) with confidence 0.27; code rank 8 (0.27)
- 第 48 层 combat/plan-choice: Jev chose plan 4/5 (防御, 战栗 -> 实验体 #C42, 飞剑回旋镖, 暴走 -> 实验体 #C42) with confidence 0.31; code rank 4 (0.31)
- 第 48 层 combat/plan-choice: Jev chose plan 7/10 (血墙, 暴走 -> 实验体 #C42, 剑柄打击+ -> 实验体 #C42, 踩踏) with confidence 0.16; code rank 7 (0.16)
- 第 48 层 combat/plan-choice: Jev chose plan 1/3 (战斗专注+, 祭品, 与我一战！+ -> 实验体 #C42, 剑柄打击+ -> 实验体 #C42, 无情猛攻 -> 实验体 #C42, 与我一战！+ -> 实验体 #C42, 暴走 -> 实验体 #C42) with confidence 0.34; code (0.34)
- 第 48 层 combat/plan-choice: Jev chose plan 5/7 (飞剑回旋镖+, 飞剑回旋镖, 防御) with confidence 0.16; code rank 5 (0.16)
- 第 48 层 combat/plan-choice: Jev chose plan 5/6 (烙印+, 凌虐 -> 实验体 #C42) with confidence 0.34; code rank 5 (0.34)
- 第 48 层 combat/plan-choice: Jev chose plan 9/10 (血墙, 剑柄打击+ -> 实验体 #C42, 踩踏) with confidence 0.18; code rank 9 (0.18)
- 第 48 层 combat/plan-choice: Jev chose plan 3/3 (战斗专注+, 剑柄打击+ -> 实验体 #C42, 无情猛攻 -> 实验体 #C42, 飞剑回旋镖+, 暴走 -> 实验体 #C42, 欺凌 -> 实验体 #C42) with confidence 0.13; code rank 3 (0.13)
- 第 48 层 combat/plan-choice: Jev chose plan 5/7 (飞剑回旋镖+, 飞剑回旋镖, 防御) with confidence 0.15; code rank 5 (0.15)
- 第 48 层 combat/plan-choice: Jev chose plan 7/10 (血墙, 暴走 -> 实验体 #C42, 剑柄打击+ -> 实验体 #C42, 踩踏) with confidence 0.18; code rank 7 (0.18)
- 第 48 层 combat/plan-choice: Jev chose plan 1/3 (战斗专注+, 祭品, 与我一战！+ -> 实验体 #C42, 剑柄打击+ -> 实验体 #C42, 无情猛攻 -> 实验体 #C42, 与我一战！+ -> 实验体 #C42, 暴走 -> 实验体 #C42) with confidence 0.22; code (0.22)
- 第 48 层 combat/plan-choice: Jev chose plan 5/7 (飞剑回旋镖+, 飞剑回旋镖, 防御) with confidence 0.20; code rank 5 (0.20)
