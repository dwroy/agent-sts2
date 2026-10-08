## 复盘：run K2JAGKVJAWZJ — 阵亡，最高第 46 层

- 决策 722 个；Jev 调用 160 次，Claude 0 次，大脑 48 次（codex 48）；token 890,543 入 / 9,572 出，约 $0.0378（Jev）；大脑 token 6,500,256 入（缓存命中 4,109,184，63%）/ 16,395 出；用时 50.1 分钟
- 决策者：code 282，jev-plan 209，jev 160，codex 71

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 56→56（-0），决策 code 12，jev-plan 8，jev 6
- 第 3 层 噬尸蛞蝓: HP 56→47（-9），决策 code 11，jev-plan 8，jev 6
- 第 6 层 海洋混混: HP 47→47（-0），决策 code 10，jev 4，jev-plan 3
- 第 9 层 潮湿邪教徒/钙化邪教徒: HP 47→41（-6），决策 code 8，jev 4，jev-plan 4
- 第 13 层 卑鄙地精/地精佣兵/胖地精: HP 62→56（-6），决策 code 7，jev-plan 6，jev 4
- 第 15 层 海洋混混/钙化邪教徒: HP 56→39（-17），决策 code 9，jev-plan 8，jev 6
- 第 17 层 瀑布巨兽: HP 60→13（-47），决策 code 21，jev-plan 9，jev 8
- 第 19 层 偷窃草蜢: HP 58→60（+2），决策 code 7，jev-plan 7，jev 3
- 第 21 层 盛碗虫（卵）/盛碗虫（石）: HP 60→60（-0），决策 jev-plan 13，jev 7，code 5
- 第 25 层 蜂群术士: HP 70→57（-13），决策 jev-plan 13，code 8，jev 7
- 第 27 层 虱虫之祖: HP 57→57（-0），决策 jev-plan 10，jev 6，code 5
- 第 31 层 残杀千足虫: HP 75→40（-35），决策 code 14，jev-plan 13，jev 7
- 第 33 层 火箭/碾碎爪: HP 62→28（-34），决策 jev 51，jev-plan 50，code 2
- 第 35 层 活体盾/高塔炮手: HP 65→41（-24），决策 jev-plan 10，jev 8，code 1
- 第 38 层 咬人卷轴: HP 61→53（-8），决策 jev-plan 12，jev 8，code 3
- 第 39 层 失落之物/遗忘之物: HP 53→42（-11），决策 jev-plan 12，jev 10，code 1
- 第 46 层 幽灵骑士/连枷骑士/魔法骑士: HP 86→0（-86），决策 jev-plan 23，jev 15，code 12

### 死亡战斗：第 46 层 幽灵骑士/连枷骑士/魔法骑士
- T7 [code] combat/plan: code plan (only line): end turn; hp -6, dmg 25
- T8 [jev] combat/plan-choice: Jev chose plan 3/4 (扫腿 -> 连枷骑士, 中和 -> 连枷骑士, 扫腿 -> 幽灵骑士, 偏折) with confidence 0.97; code rank 3 conf 0.97
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 中和 -> 连枷骑士
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 扫腿 -> 幽灵骑士
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 偏折
- T8 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 11 [calc mismatch: solver says ending now does not kill, mod says lethal: no end-of-turn block, Regen or Buffer the 
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 执迷, 爆发+, 生存者
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 爆发+
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 生存者
- T9 [jev] selection/choose: Jev chose 猎杀者 with confidence 0.58 conf 0.58
- T9 [jev] selection/choose: Jev chose 突然一拳+ with confidence 0.70 conf 0.70
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 209
- combat/plan-choice+potion / jev: 81
- combat/plan / code: 73
- combat/plan-choice / jev: 57
- reward/claim / code: 46
- map/route-follow / code: 40
- combat/plan-continue / code: 34
- combat/lethal / code: 21
- selection/choose / jev: 17
- reward/card / codex: 16
- reward/proceed / code: 16
- shop/buy / codex: 13
- event/leave / code: 11
- event/choose / codex: 10
- rest/plan / codex: 10
- rest/proceed / code: 10
- combat/play / jev: 5
- shop/leave / code: 5
- shop/open / code: 5
- shop/plan / codex: 5
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/end_turn / code: 3
- combat/least-loss / code: 3
- selection/upgrade / codex: 3
- event/act-plan / codex: 2
- event/plan / codex: 2
- map/route-change / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/add / codex: 2
- combat/potion-now / code: 1
- event/only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/remove / codex: 1
- selection/take-planned / code: 1
- shop/discard / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：17 个
- 第 9 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 钙化邪教徒) with confidence 0.30; code rank - (rollout's best line, added) (0.30)
- 第 15 层 combat/plan-choice: Jev chose plan 1/3 (end turn) with confidence 0.20; code rank 1 (0.20)
- 第 17 层 selection/choose: Jev chose 进阶之灾 with confidence 0.22 (0.22)
- 第 21 层 selection/choose: Jev chose 藏宝图 with confidence 0.20 (0.20)
- 第 21 层 combat/plan-choice+potion: Jev chose plan 2/2 (打击 -> 盛碗虫（卵）, 偏折+, 打击 -> 盛碗虫（卵）, 中和 -> 盛碗虫（卵）) with confidence 0.22; code rank - (rollout's best line, added) (0.22)
- 第 21 层 combat/plan-choice+potion: Jev chose to drink 迅捷药水, then re-plan (confidence 0.11) (0.11)
- 第 25 层 selection/choose: Jev chose 猎杀者 with confidence 0.28 (0.28)
- 第 27 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 虱虫之祖, 猎杀者 -> 虱虫之祖) with confidence 0.22; code rank 1 (0.22)
- 第 31 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 残杀千足虫 (MIDDLE)) with confidence 0.24; code rank 1 (0.24)
- 第 33 层 combat/play: Jev chose c3 (Play 延伸+) with confidence 0.26 (0.26)
- 第 33 层 combat/play: Jev chose c1->e0 (Play 打击 on 碾碎爪) with confidence 0.15 (0.15)
- 第 33 层 selection/choose: Jev chose 打击 with confidence 0.31 (0.31)
- 第 33 层 selection/choose: Jev chose 打击 with confidence 0.18 (0.18)
- 第 46 层 combat/plan-choice: Jev chose plan 3/3 (蜃景+) with confidence 0.11; code rank - (rollout's best line, added) (0.11)
- 第 46 层 combat/plan-choice: Jev chose plan 1/4 (后空翻+, 致命毒药+ -> 魔法骑士) with confidence 0.21; code rank 1 (0.21)
