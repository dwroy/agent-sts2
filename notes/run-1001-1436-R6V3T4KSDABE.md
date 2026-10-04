## 复盘：run R6V3T4KSDABE — 阵亡，最高第 48 层

- 决策 653 个；Jev 调用 128 次，Claude 0 次，DeepSeek 45 次；token 851,669 入 / 7,327 出，约 $0.0361（Jev）；DeepSeek token 6,312,775 入（缓存命中 5,774,720，91%）/ 323,742 出；用时 60.9 分钟
- 决策者：code 296，jev-plan 157，jev 128，deepseek 72

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→58（-6，战后回复 +6），决策 jev 6，jev-plan 5，code 3
- 第 3 层 蟾蜍蝌蚪: HP 64→51（-13，战后回复 +6），决策 jev 5，code 3，jev-plan 2
- 第 4 层 淤泥旋螺: HP 57→47（-10，战后回复 +6），决策 jev 4，jev-plan 4，code 2
- 第 6 层 潮湿邪教徒/钙化邪教徒: HP 53→51（-2，战后回复 +6），决策 jev-plan 8，jev 6，code 3
- 第 8 层 骇鳗: HP 57→34（-23，战后回复 +6），决策 jev 7，jev-plan 5，code 3
- 第 11 层 花园幽灵鳗: HP 64→49（-15，战后回复 +6），决策 jev-plan 8，jev 6
- 第 12 层 化石追踪者: HP 55→51（-4，战后回复 +6），决策 jev 3，jev-plan 3，code 3
- 第 14 层 海洋混混/钙化邪教徒: HP 57→54（-3，战后回复 +6），决策 jev 7，jev-plan 7，code 2
- 第 15 层 幽灵船: HP 60→58（-2，战后回复 +6），决策 jev 4，jev-plan 3，code 3
- 第 17 层 瀑布巨兽: HP 80→54（-26，战后回复 +6），决策 jev-plan 14，jev 10，code 10
- 第 19 层 偷窃草蜢: HP 76→64（-12，战后回复 +6），决策 jev-plan 4，code 4，jev 1
- 第 21 层 外骨骼虫: HP 70→69（-1，战后回复 +6），决策 jev-plan 9，jev 8，code 5
- 第 23 层 虱虫之祖: HP 75→73（-2，战后回复 +6），决策 code 7，jev 6，jev-plan 5
- 第 24 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 79→60（-19，战后回复 +6），决策 code 13，jev-plan 9，jev 5
- 第 28 层 幼虫/直飞产卵虫/结实的卵: HP 66→60（-6，战后回复 +6），决策 code 13，jev 2，jev-plan 1
- 第 31 层 棘刺蟾蜍: HP 66→45（-21，战后回复 +6），决策 code 10
- 第 33 层 火箭/碾碎爪: HP 75→20（-55，战后回复 +6），决策 jev-plan 15，jev 8，code 7
- 第 35 层 活体盾/高塔炮手: HP 69→57（-12，战后回复 +6），决策 jev 6，jev-plan 6，code 3
- 第 38 层 咬人卷轴: HP 63→50（-13，战后回复 +6），决策 jev 5，jev-plan 4，code 4
- 第 39 层 噪音机器人/守护机器人/戳刺机器人/电击机器人/组装师: HP 56→52（-4，战后回复 +6），决策 jev-plan 10，code 6，jev 5
- 第 40 层 机甲骑士: HP 58→4（-54，战后回复 +6），决策 jev-plan 10，code 10，jev 5
- 第 45 层 失落之物/遗忘之物: HP 54→44（-10，战后回复 +6），决策 jev 8，jev-plan 8，code 2
- 第 46 层 猫头鹰法官: HP 50→23（-27，战后回复 +6），决策 code 11，jev-plan 7，jev 6
- 第 48 层 女王/火炬头聚合体: HP 51→0（-51），决策 jev-plan 10，code 7，jev 5

### 死亡战斗：第 48 层 女王/火炬头聚合体
- T2 [code] combat/plan: code plan (only line): end turn; hp -13, dmg 0
- T3 [jev] combat/plan-choice: Jev chose plan 2/4 (防御, 火焰屏障+, 愤怒 -> 女王) with confidence 0.38; code rank 2 conf 0.38
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 火焰屏障+
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 愤怒 -> 女王
- T3 [code] combat/plan: code plan (only line): end turn; hp -15, dmg 0
- T4 [jev] combat/plan-choice: Jev chose plan 2/3 (燃烧, 突破, 撕裂) with confidence 0.23; code rank 2 conf 0.23
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 突破
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 撕裂
- T4 [code] combat/plan: code plan (only line): end turn; hp -14, dmg 0
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): 无情猛攻+ -> 女王, 飞剑回旋镖
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 飞剑回旋镖
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 157
- combat/plan-choice / jev: 91
- reward/claim / code: 59
- combat/plan-continue / code: 51
- map/route-follow / code: 42
- combat/plan / code: 41
- combat/lethal / code: 33
- combat/plan-choice+potion / jev: 33
- reward/card / deepseek: 23
- reward/proceed / code: 23
- shop/buy / deepseek: 16
- rest/plan / deepseek: 9
- rest/proceed / code: 9
- event/leave / code: 7
- combat/end_turn / code: 5
- shop/leave / code: 5
- shop/open / code: 5
- shop/plan / deepseek: 5
- event/plan / deepseek: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- selection/enchant / deepseek: 3
- selection/upgrade / deepseek: 3
- combat/least-loss / code: 2
- combat/plan-choice+potion-lethal / jev: 2
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/remove / deepseek: 2
- selection/take into my hand / code: 2
- selection/take into my hand / jev: 2
- event/choose / deepseek: 1
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 15 层 selection/take into my hand: Jev chose 痛殴 with confidence 0.29 (0.29)
- 第 17 层 selection/take into my hand: Jev chose 燃烧 with confidence 0.28 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (狱火, 燃烧, 御血术 -> 瀑布巨兽, 怨恨 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 剑柄打击 -> 瀑布巨兽, potion 虚弱药水 -> 瀑布巨兽) with confidence 0.33; code rank 1 (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 瀑布巨兽) with confidence 0.33; code rank 2 (0.33)
- 第 21 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.28; code rank 3 (0.28)
- 第 33 层 combat/plan-choice: Jev chose plan 2/6 (防御, 燃烧, 飞剑回旋镖, 愤怒 -> 火箭) with confidence 0.08; code rank 2 (0.08)
- 第 45 层 combat/plan-choice: Jev chose plan 10/10 (耸肩无视, 燃烧+, 铁斩波+ -> 失落之物) with confidence 0.29; code rank - (rollout's best line, added) (0.29)
- 第 46 层 combat/plan-choice: Jev chose plan 2/5 (防御, 燃烧, 打击 -> 猫头鹰法官) with confidence 0.31; code rank 2 (0.31)
- 第 48 层 combat/plan-choice: Jev chose plan 2/6 (狱火, 突破) with confidence 0.33; code rank 2 (0.33)
- 第 48 层 combat/plan-choice: Jev chose plan 2/3 (燃烧, 突破, 撕裂) with confidence 0.23; code rank 2 (0.23)
