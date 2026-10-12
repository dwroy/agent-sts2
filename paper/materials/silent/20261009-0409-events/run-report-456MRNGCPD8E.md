## 复盘：run 456MRNGCPD8E — 阵亡，最高第 31 层

- 决策 634 个；Jev 调用 239 次，Claude 0 次，大脑 29 次（codex 29）；token 994,938 入 / 11,196 出，约 $0.0423（Jev）；大脑 token 4,048,493 入（缓存命中 2,098,560，52%）/ 8,507 出；用时 29.2 分钟
- 决策者：jev 239，jev-plan 196，code 156，codex 43

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 56→44（-12），决策 jev-plan 8，code 7，jev 4
- 第 3 层 淤泥旋螺: HP 44→33（-11），决策 jev 6，jev-plan 6，code 2
- 第 4 层 海洋混混: HP 33→28（-5），决策 jev 9，jev-plan 4，code 4
- 第 5 层 下水道蚌: HP 28→28（-0），决策 jev 20，jev-plan 13，code 2
- 第 7 层 潮湿邪教徒/钙化邪教徒: HP 28→26（-2），决策 jev 14，jev-plan 10，code 3
- 第 9 层 幽灵船: HP 47→41（-6），决策 code 6，jev 5，jev-plan 3
- 第 12 层 气态炸弹/活雾: HP 41→41（-0），决策 jev 11，jev-plan 8，code 3
- 第 13 层 海洋混混/钙化邪教徒: HP 41→36（-5），决策 jev 13，jev-plan 11，code 2
- 第 14 层 卑鄙地精/地精佣兵/胖地精: HP 36→23（-13），决策 jev 13，jev-plan 10，code 1
- 第 17 层 瀑布巨兽: HP 59→14（-45），决策 jev 25，jev-plan 21
- 第 19 层 地道虫: HP 58→36（-22），决策 jev 14，jev-plan 13，code 2
- 第 20 层 偷窃草蜢: HP 36→36（-0），决策 jev-plan 8，jev 6，code 2
- 第 21 层 寄生惧魔/胧光怪: HP 36→25（-11），决策 jev 15，jev-plan 14，code 1
- 第 23 层 外骨骼虫: HP 40→36（-4），决策 jev-plan 16，jev 12，code 2
- 第 27 层 异螨: HP 57→43（-14），决策 jev 17，jev-plan 15，code 3
- 第 29 层 虱虫之祖: HP 64→24（-40），决策 jev 17，jev-plan 11，code 1
- 第 30 层 猎人杀手: HP 24→4（-20），决策 jev 20，jev-plan 14，code 1
- 第 31 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 4→0（-4），决策 jev 18，jev-plan 11，code 5

### 死亡战斗：第 31 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T4 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.28; code rank 1 conf 0.28
- T5 [jev] combat/play: Jev chose p0 (Drink 罐装幽灵) with confidence 0.74 conf 0.74
- T5 [jev] combat/plan-choice: Jev chose plan 2/6 (肾上腺素, 蛇咬 -> 熟睡甲虫, 突然一拳 -> 盛碗虫（丝）, 回响斩击) with confidence 1.00; code rank 2 conf 1.00
- T5 [jev] combat/plan-choice: Jev chose plan 3/7 (蛇咬 -> 熟睡甲虫, 回响斩击, 毒雾) with confidence 0.94; code rank 3 conf 0.94
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 回响斩击
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 毒雾
- T5 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 27
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 突然一拳 -> 熟睡甲虫, 防御, 防御
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 196
- combat/plan-choice+potion / jev: 193
- reward/claim / code: 43
- selection/choose / jev: 38
- combat/lethal / code: 27
- map/route-follow / code: 27
- reward/card / codex: 17
- reward/proceed / code: 17
- combat/plan-continue / code: 13
- shop/buy / codex: 9
- combat/plan-choice / jev: 6
- combat/plan / code: 5
- event/leave / code: 4
- rest/plan / codex: 4
- rest/proceed / code: 4
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / codex: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- event/plan / codex: 2
- selection/enchant / codex: 2
- combat/play / jev: 1
- event/act-plan / codex: 1
- event/choose / codex: 1
- map/route-change / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/remove / codex: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：19 个
- 第 2 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 噬尸蛞蝓 #2, 打击 -> 噬尸蛞蝓 #2, 打击 -> 噬尸蛞蝓 #2, 中和 -> 噬尸蛞蝓 #2) with confidence 0.21; code rank 3 (0.21)
- 第 3 层 combat/plan-choice+potion: Jev chose plan 2/4 (防御, 打击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.34; code rank 2 (0.34)
- 第 4 层 selection/choose: Jev chose 打击 with confidence 0.21 (0.21)
- 第 5 层 selection/choose: Jev chose 贪婪 with confidence 0.26 (0.26)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 1/3 (小刀 -> 卑鄙地精, 小刀 -> 卑鄙地精) with confidence 0.19; code rank 1 (0.19)
- 第 17 层 selection/choose: Jev chose 进阶之灾 with confidence 0.28 (0.28)
- 第 17 层 selection/choose: Jev chose 灵动步法 with confidence 0.33 (0.33)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.24 (0.24)
- 第 27 层 selection/choose: Jev chose 中和 with confidence 0.13 (0.13)
- 第 27 层 selection/choose: Jev chose 毒素 with confidence 0.33 (0.33)
- 第 27 层 selection/choose: Jev chose 进阶之灾 with confidence 0.28 (0.28)
- 第 29 层 combat/plan-choice+potion: Jev chose plan 2/9 (背刺 -> 虱虫之祖, 融入暗影, 隐秘匕首, 打击 -> 虱虫之祖, 闪躲翻滚, 突然一拳 -> 虱虫之祖, potion 药水形状的石头 -> 虱虫之祖, 小刀 -> 虱虫之祖, 小刀 -> 虱虫之祖) with confidence 0.31; code (0.31)
- 第 29 层 selection/choose: Jev chose 中和 with confidence 0.23 (0.23)
- 第 30 层 selection/choose: Jev chose 防御 with confidence 0.16 (0.16)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 1/3 (毒雾, 突然一拳 -> 猎人杀手, 小刀 -> 猎人杀手, 小刀 -> 猎人杀手, 灵动步法, potion 药水形状的石头 -> 猎人杀手) with confidence 0.33; code rank 1 (0.33)
