## 复盘：run HEACJRY5LEVD — 阵亡，最高第 17 层

- 决策 246 个；Jev 调用 47 次，Claude 0 次，DeepSeek 19 次；token 131,847 入 / 2,182 出，约 $0.0056（Jev）；DeepSeek token 337,919 入（缓存命中 239,616，71%）/ 63,546 出；用时 12.9 分钟
- 决策者：code 133，jev 47，jev-plan 47，deepseek 19

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→43（-21），决策 code 6，jev 1，jev-plan 1
- 第 4 层 噬尸蛞蝓: HP 55→38（-17），决策 code 6，jev-plan 4，jev 3
- 第 7 层 蟾蜍蝌蚪: HP 38→34（-4），决策 jev 4，code 4，jev-plan 3
- 第 9 层 气态炸弹/活雾: HP 65→49（-16），决策 code 5，jev 4，jev-plan 4
- 第 12 层 双尾鼠: HP 55→41（-14），决策 jev 4，jev-plan 3，code 3
- 第 13 层 潮湿邪教徒/钙化邪教徒: HP 52→52（-0），决策 jev 7，jev-plan 4，code 4
- 第 13 层 潮湿邪教徒: HP 52→27（-25），决策 code 8，jev-plan 2，jev 1
- 第 14 层 下水道蚌: HP 33→33（-0），决策 code 8，jev-plan 2，jev 1
- 第 15 层 幽灵船: HP 39→38（-1），决策 code 6，jev 5，jev-plan 5
- 第 17 层 瀑布巨兽: HP 69→7（-62），决策 code 29，jev-plan 19，jev 16

### 死亡战斗：第 17 层 瀑布巨兽
- T13 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 愤怒 -> 瀑布巨兽
- T13 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 愤怒 -> 瀑布巨兽
- T13 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视
- T13 [code] combat/plan: code plan (only distinct line): 愤怒 -> 瀑布巨兽; hp -0, dmg 6
- T13 [code] combat/end_turn: no playable cards; ending the turn
- T14 [jev] combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.79; code rank 1 conf 0.79
- T15 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): 防御, 打击 -> 瀑布巨兽, 愤怒 -> 瀑布巨兽, 愤怒 -> 瀑布巨兽, 防御+
- T15 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 瀑布巨兽
- T15 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 瀑布巨兽
- T15 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 瀑布巨兽
- T15 [code] combat/plan-continue: continuing the code-chosen plan: 防御+
- T15 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan / code: 49
- combat/plan-continue / jev-plan: 47
- combat/plan-choice / jev: 27
- combat/plan-choice+potion / jev: 19
- combat/plan-continue / code: 19
- reward/claim / code: 19
- map/route-follow / code: 10
- combat/lethal / code: 8
- reward/card / deepseek: 8
- reward/proceed / code: 8
- map/route / code: 4
- event/choose / deepseek: 3
- event/leave / code: 3
- rest/choose / deepseek: 3
- rest/proceed / code: 3
- combat/end_turn / code: 2
- map/route-plan / deepseek: 2
- shop/buy / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/least-loss / code: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1
- selection/upgrade / deepseek: 1
- shop/buy / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：6 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/3 (痛击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.19; code rank 2 (0.19)
- 第 4 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 噬尸蛞蝓, 无情猛攻 -> 噬尸蛞蝓) with confidence 0.32; code rank 3 (0.32)
- 第 4 层 combat/plan-choice: Jev chose plan 2/3 (痛击 -> 噬尸蛞蝓, 防御) with confidence 0.23; code rank 2 (0.23)
- 第 9 层 combat/plan-choice+potion: Jev chose plan 6/6 (打击 -> 活雾, 火焰屏障) with confidence 0.31; code rank - (rollout's best line, added) (0.31)
- 第 15 层 combat/plan-choice: Jev chose plan 1/2 (potion 能量药水, 劫掠 -> 幽灵船, 打击 -> 幽灵船) with confidence 0.34; code rank 1 (0.34)
- 第 15 层 combat/plan-choice: Jev chose plan 1/4 (火焰屏障, 耸肩无视) with confidence 0.34; code rank 1 (0.34)
