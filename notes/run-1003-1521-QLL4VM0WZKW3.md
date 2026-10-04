## 复盘：run QLL4VM0WZKW3 — 阵亡，最高第 17 层

- 决策 250 个；Jev 调用 59 次，Claude 0 次，DeepSeek 18 次；token 335,950 入 / 3,008 出，约 $0.0142（Jev）；DeepSeek token 2,661,140 入（缓存命中 2,417,664，91%）/ 96,826 出；用时 16.7 分钟
- 决策者：code 115，jev 59，jev-plan 54，deepseek 22

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→58（-6，战后回复 +6），决策 jev-plan 8，code 6，jev 5
- 第 3 层 淤泥旋螺: HP 64→62（-2，战后回复 +6），决策 jev 6，jev-plan 6，code 3
- 第 7 层 蟾蜍蝌蚪: HP 62→62（-0，战后回复 +6），决策 code 4，jev 3，jev-plan 3
- 第 9 层 花园幽灵鳗: HP 68→56（-12，战后回复 +6），决策 jev 13，jev-plan 11，code 2
- 第 12 层 骇鳗: HP 87→42（-45，战后回复 +6），决策 jev 11，jev-plan 8，code 2
- 第 14 层 拳击构装体: HP 48→48（-0，战后回复 +6），决策 jev 6，jev-plan 3，code 2
- 第 15 层 气态炸弹/活雾: HP 54→49（-5，战后回复 +6），决策 jev 5，jev-plan 4，code 4
- 第 17 层 瀑布巨兽: HP 81→0（-81），决策 code 37，jev-plan 11，jev 10

### 死亡战斗：第 17 层 瀑布巨兽
- T11 [code] combat/plan: code plan (only distinct line): 打击 -> 瀑布巨兽, 愤怒 -> 瀑布巨兽, 应急按钮, 火焰屏障, 双重打击 -> 瀑布巨兽; hp -0, dmg 22
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 瀑布巨兽
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 应急按钮
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 火焰屏障
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 瀑布巨兽
- T11 [code] combat/end_turn: no playable cards; ending the turn
- T12 [jev] combat/plan-choice: Jev chose plan 3/3 (御血术 -> 瀑布巨兽) with confidence 0.90; code rank - (rollout's best line, added) conf 0.90
- T12 [jev] combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.90; code rank 2 conf 0.90
- T13 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-17): 打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 痛击+ -> 瀑布巨兽
- T13 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 瀑布巨兽
- T13 [code] combat/plan-continue: continuing the code-chosen plan: 痛击+ -> 瀑布巨兽
- T13 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-17): end turn

### 各类决策由谁做
- combat/plan-choice / jev: 54
- combat/plan-continue / jev-plan: 54
- combat/plan-continue / code: 26
- reward/claim / code: 20
- combat/plan / code: 18
- map/route-follow / code: 15
- combat/lethal / code: 10
- reward/card / deepseek: 7
- reward/proceed / code: 7
- combat/plan-choice+potion / jev: 4
- event/leave / code: 4
- combat/end_turn / code: 3
- event/choose / deepseek: 3
- rest/plan / deepseek: 3
- rest/proceed / code: 3
- combat/least-loss / code: 2
- selection/add / deepseek: 2
- shop/buy / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/plan / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1
- selection/take-planned / code: 1
- selection/transform / deepseek: 1
- selection/upgrade / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：2 个
- 第 12 层 combat/plan-choice: Jev chose plan 4/4 (防御, 双重打击 -> 骇鳗, 打击 -> 骇鳗, 愤怒 -> 骇鳗) with confidence 0.30; code rank - (rollout's best line, added) (0.30)
- 第 12 层 combat/plan-choice: Jev chose plan 4/4 (end turn) with confidence 0.26; code rank - (rollout's best line, added) (0.26)
