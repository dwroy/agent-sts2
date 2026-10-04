## 复盘：run HYQW47E7CBSC — 阵亡，最高第 38 层

- 决策 550 个；Jev 调用 127 次，Claude 0 次，DeepSeek 40 次；token 705,669 入 / 6,809 出，约 $0.0299（Jev）；DeepSeek token 5,753,097 入（缓存命中 5,090,432，88%）/ 161,584 出；用时 34.8 分钟
- 决策者：code 243，jev-plan 129，jev 127，deepseek 51

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 75→64（-11，战后回复 +6），决策 code 9，jev-plan 5，jev 3
- 第 3 层 噬尸蛞蝓: HP 70→61（-9，战后回复 +6），决策 code 6，jev 4，jev-plan 4
- 第 4 层 淤泥旋螺: HP 67→59（-8，战后回复 +6），决策 jev 9，jev-plan 8，code 2
- 第 5 层 化石追踪者: HP 65→61（-4，战后回复 +6），决策 code 7，jev 3，jev-plan 2
- 第 6 层 气态炸弹/活雾: HP 67→47（-20，战后回复 +6），决策 code 13，jev 7，jev-plan 6
- 第 9 层 海洋混混/钙化邪教徒: HP 80→69（-11，战后回复 +6），决策 jev 7，jev-plan 4，code 4
- 第 12 层 卑鄙地精/地精佣兵/胖地精: HP 75→66（-9，战后回复 +6），决策 jev 5，jev-plan 5，code 3
- 第 14 层 鬼祟珊瑚群: HP 72→20（-52，战后回复 +6），决策 jev 9，jev-plan 7，code 5
- 第 17 层 乐加维林族母: HP 66→45（-21，战后回复 +6），决策 jev-plan 10，code 9，jev 6
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 91→72（-19，战后回复 +6），决策 jev 4，jev-plan 4，code 3
- 第 22 层 偷窃草蜢: HP 78→61（-17，战后回复 +6），决策 jev-plan 5，jev 4，code 2
- 第 23 层 异螨: HP 67→34（-33，战后回复 +6），决策 jev-plan 10，jev 7，code 2
- 第 24 层 直飞产卵虫/结实的卵: HP 40→25（-15，战后回复 +6），决策 jev 10，jev-plan 6，code 3
- 第 28 层 外骨骼虫: HP 63→46（-17，战后回复 +6），决策 jev 6，jev-plan 4，code 3
- 第 30 层 寄生惧魔/胧光怪: HP 84→72（-12，战后回复 +6），决策 jev-plan 10，jev 9，code 3
- 第 31 层 啃咬机: HP 80→64（-16，战后回复 +6），决策 jev-plan 8，jev 6，code 6
- 第 33 层 无厌沙虫: HP 101→44（-57，战后回复 +6），决策 code 17，jev-plan 8，jev 6
- 第 35 层 活体盾/高塔炮手: HP 92→53（-39，战后回复 +6），决策 jev-plan 11，jev 10，code 1
- 第 36 层 虔诚雕刻师: HP 61→43（-18，战后回复 +6），决策 jev-plan 7，jev 5，code 2
- 第 38 层 青蛙骑士: HP 51→0（-51），决策 code 12，jev 7，jev-plan 5

### 死亡战斗：第 38 层 青蛙骑士
- T2 [code] combat/plan: code plan (only line): end turn; hp -18, dmg 0
- T3 [jev] combat/plan-choice: Jev chose plan 1/2 (剑柄打击 -> 青蛙骑士, 重锤 -> 青蛙骑士, 双重打击+ -> 青蛙骑士) with confidence 0.95; code rank 1 conf 0.95
- T3 [code] combat/plan: code plan (only distinct line): 重锤 -> 青蛙骑士, 焚烧; hp -1, dmg 55
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 焚烧
- T3 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T4 [code] combat/plan: code plan (only line): end turn; hp -13, dmg 0
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 预备打击 -> 青蛙骑士, 防御, 防御, 熔融之拳 -> 青蛙骑士, 飞剑回旋镖
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 熔融之拳 -> 青蛙骑士
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 飞剑回旋镖
- T5 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 129
- combat/plan-choice / jev: 102
- reward/claim / code: 51
- combat/plan / code: 41
- combat/plan-continue / code: 38
- map/route-follow / code: 32
- combat/lethal / code: 25
- combat/plan-choice+potion / jev: 22
- reward/card / deepseek: 20
- reward/proceed / code: 19
- shop/buy / deepseek: 7
- event/leave / code: 6
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- combat/end_turn / code: 5
- event/choose / deepseek: 4
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / deepseek: 4
- selection/add / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/take into my hand / jev: 2
- combat/least-loss / code: 1
- combat/plan-choice+potion-lethal / jev: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/free-card / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：7 个
- 第 3 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 噬尸蛞蝓, 打击 -> 噬尸蛞蝓) with confidence 0.20; code rank 2 (0.20)
- 第 12 层 combat/plan-choice+potion: Jev chose plan 1/2 (打击 -> 卑鄙地精) with confidence 0.21; code rank 1 (0.21)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (end turn) with confidence 0.18; code rank 1 (0.18)
- 第 22 层 combat/plan-choice+potion-lethal: Jev chose plan 3/5 (燃烧, 预备打击 -> 偷窃草蜢, 焚烧) with confidence 0.28; code rank 3 (0.28)
- 第 24 层 combat/plan-choice: Jev chose plan 6/6 (燃烧, 打击 -> 直飞产卵虫) with confidence 0.32; code rank - (rollout's best line, added) (0.32)
- 第 28 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.31; code rank 1 (0.31)
- 第 35 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.21; code rank 1 (0.21)
