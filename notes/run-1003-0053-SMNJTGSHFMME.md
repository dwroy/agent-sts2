## 复盘：run SMNJTGSHFMME — 阵亡，最高第 48 层

- 决策 870 个；Jev 调用 254 次，Claude 0 次，DeepSeek 47 次；token 1,720,204 入 / 13,633 出，约 $0.0728（Jev）；DeepSeek token 6,664,385 入（缓存命中 6,178,176，93%）/ 338,932 出；用时 67.6 分钟
- 决策者：code 324，jev 254，jev-plan 222，deepseek 70

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→53（-11，战后回复 +6），决策 code 4，jev 3，jev-plan 2
- 第 3 层 噬尸蛞蝓: HP 59→59（-0，战后回复 +6），决策 jev 5，code 5，jev-plan 4
- 第 6 层 淤泥旋螺: HP 65→65（-0，战后回复 +6），决策 code 11，jev 6，jev-plan 5
- 第 11 层 鬼祟珊瑚群: HP 71→37（-34，战后回复 +6），决策 code 7，jev-plan 6，jev 4
- 第 14 层 潮湿邪教徒/钙化邪教徒: HP 43→43（-0，战后回复 +6），决策 jev 5，code 5，jev-plan 2
- 第 17 层 乐加维林族母: HP 73→73（-0，战后回复 +6），决策 jev 11，code 7，jev-plan 6
- 第 19 层 地道虫: HP 89→89（-0，战后回复 +1），决策 jev 5，jev-plan 5，code 2
- 第 21 层 外骨骼虫: HP 90→90（-0），决策 jev 4，code 2，jev-plan 1
- 第 24 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 80→62（-18，战后回复 +6），决策 jev 10，jev-plan 5，code 2
- 第 28 层 虱虫之祖: HP 50→50（-0，战后回复 +6），决策 jev-plan 8，jev 7，code 3
- 第 30 层 棘刺蟾蜍: HP 83→83（-0，战后回复 +6），决策 jev 8，jev-plan 7，code 3
- 第 31 层 异螨: HP 89→87（-2，战后回复 +3），决策 jev 10，jev-plan 7，code 1
- 第 33 层 无厌沙虫: HP 90→53（-37，战后回复 +6），决策 jev 12，jev-plan 12，code 1
- 第 35 层 咬人卷轴: HP 83→70（-13，战后回复 +6），决策 jev 4，jev-plan 4，code 3
- 第 37 层 活体盾/高塔炮手: HP 76→60（-16，战后回复 +6），决策 code 5，jev 3，jev-plan 3
- 第 39 层 拳击构装体/方柱构装体: HP 55→43（-12，战后回复 +6），决策 jev 9，jev-plan 9，code 1
- 第 40 层 失落之物/遗忘之物: HP 49→43（-6，战后回复 +6），决策 jev-plan 11，jev 10，code 2
- 第 44 层 咬人卷轴: HP 49→47（-2，战后回复 +6），决策 code 7，jev 5，jev-plan 4
- 第 46 层 史莱姆狂战士: HP 53→40（-13，战后回复 +6），决策 jev 10，jev-plan 10，code 4
- 第 48 层 永世沙漏: HP 72→0（-72），决策 jev 123，jev-plan 111，code 87

### 死亡战斗：第 48 层 永世沙漏
- T7 [code] combat/plan: code plan (only line): end turn; hp -28, dmg 0
- T8 [code] combat/plan: code plan (only distinct line): 坚毅+, 防御+, 防御; hp -29, dmg 0
- T8 [code] selection/exhaust: code: 凋萎+2 scores 90 vs 凋萎+2 90
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 防御+
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T8 [code] combat/plan: code plan (only distinct line): end turn; hp -29, dmg 0
- T9 [jev] combat/plan-choice: Jev chose plan 1/2 (火焰屏障, 打击+ -> 永世沙漏, 头槌 -> 永世沙漏) with confidence 0.19; code rank 1 [ending now kills by what the mod's lethal flag does not count: 9 HP lost i conf 0.19
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击+ -> 永世沙漏
- T9 [code] combat/plan: code plan (only distinct line): 头槌 -> 永世沙漏; hp -0, dmg 18
- T9 [code] selection/add: code: 血墙+ scores 125.9 vs 耸肩无视 116.6
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 血墙+

### 各类决策由谁做
- combat/plan-continue / jev-plan: 222
- combat/plan-choice+potion / jev: 150
- combat/plan-choice / jev: 98
- combat/plan / code: 65
- reward/claim / code: 54
- map/route-follow / code: 42
- combat/lethal / code: 32
- combat/plan-continue / code: 30
- reward/card / deepseek: 20
- reward/proceed / code: 19
- selection/exhaust / code: 14
- event/leave / code: 10
- shop/buy / deepseek: 9
- rest/plan / deepseek: 8
- rest/proceed / code: 8
- shop/leave / code: 7
- shop/open / code: 7
- combat/least-loss / code: 6
- event/choose / deepseek: 6
- selection/free-card / code: 6
- selection/take into my hand / jev: 6
- selection/upgrade / deepseek: 6
- event/plan / deepseek: 5
- shop/plan / deepseek: 5
- selection/add / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- selection/remove / deepseek: 3
- selection/take into my hand / code: 3
- combat/end_turn / code: 2
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/enchant / deepseek: 2
- shop/buy / code: 2
- event/only / code: 1
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：39 个
- 第 6 层 combat/plan-choice+potion: Jev chose plan 1/3 (打击 -> 淤泥旋螺, 防御) with confidence 0.28; code rank 1 (0.28)
- 第 24 层 combat/plan-choice: Jev chose plan 4/10 (防御+, 打击+ -> 盛碗虫（石）, 双重打击 -> 盛碗虫（石）) with confidence 0.22; code rank 4 (0.22)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.32; code rank 1 (0.32)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.34; code rank 1 (0.34)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 4/4 (愤怒 -> 永世沙漏, 防御+, 究极打击 -> 永世沙漏, 坚定不移+, 打击+ -> 永世沙漏, 痛殴 -> 永世沙漏) with confidence 0.12; code rank 4 (0.12)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn); plan 1 (打击+ -> 永世沙漏, 痛殴 -> 永世沙漏) is as good or better on every axis, playing it with confidence 0.21; code rank 1 (0.21)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.19; code rank 1 (0.19)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 4/4 (防御, 飞剑回旋镖+, 彼岸咆哮, 全身撞击 -> 永世沙漏) with confidence 0.17; code rank 4 (0.17)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.13; code rank 1 (0.13)
- 第 48 层 combat/plan-choice+potion: Jev chose to drink 混沌药水 (confidence 0.12) (0.12)
- 第 48 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.32) (0.32)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.11; code rank 1 (0.11)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 3/5 (愤怒 -> 永世沙漏, 究极打击 -> 永世沙漏, 坚定不移+, 打击+ -> 永世沙漏, 痛殴 -> 永世沙漏) with confidence 0.20; code rank 3; HP guard: plan 3 (愤怒 -> 永世沙漏, 究极打击 -> (0.20)
- 第 48 层 combat/plan-choice+potion: Jev chose to drink 混沌药水 (confidence 0.11) (0.11)
- 第 48 层 combat/plan-choice: Jev chose plan 1/2 (拳斗 -> 永世沙漏, potion 士兵炖汤) with confidence 0.05; code rank 1 (0.05)
