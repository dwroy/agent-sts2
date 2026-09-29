## 复盘：run 2ZCKFSKXTL4E — 阵亡，最高第 17 层

- 决策 261 个；Jev 调用 54 次，Claude 0 次，DeepSeek 20 次；token 150,011 入 / 2,754 出，约 $0.0064（Jev）；DeepSeek token 401,815 入（缓存命中 274,816，68%）/ 70,778 出；用时 13.2 分钟
- 决策者：code 118，jev-plan 63，jev 54，deepseek 26

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→58（-6），决策 jev-plan 12，code 8，jev 6
- 第 4 层 海洋混混: HP 64→54（-10），决策 code 6，jev-plan 5，jev 2
- 第 8 层 蟾蜍蝌蚪: HP 55→52（-3），决策 code 6，jev 5，jev-plan 4
- 第 11 层 潮湿邪教徒/钙化邪教徒: HP 54→39（-15），决策 jev-plan 9，code 7，jev 6
- 第 12 层 气态炸弹/活雾: HP 45→30（-15），决策 code 11，jev-plan 6，jev 5
- 第 14 层 下水道蚌: HP 60→45（-15），决策 jev-plan 7，code 7，jev 6
- 第 15 层 化石追踪者: HP 51→50（-1），决策 code 6，jev 4，jev-plan 3
- 第 17 层 瀑布巨兽: HP 80→79（-1），决策 jev 3，jev-plan 2
- 第 17 层 瀑布巨兽: HP 79→79（-0），决策 jev 1
- 第 17 层 瀑布巨兽: HP 79→39（-40），决策 jev 8，jev-plan 8，code 3
- 第 17 层 瀑布巨兽: HP 39→20（-19），决策 jev 8，jev-plan 7，code 7

### 死亡战斗：第 17 层 瀑布巨兽
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 剑柄打击 -> 瀑布巨兽
- T9 [code] combat/plan: code plan (only distinct line): 愤怒 -> 瀑布巨兽; hp -0, dmg 13
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T10 [jev] combat/plan-choice+potion: Jev chose plan 1/3 (愤怒 -> 瀑布巨兽, 突破, 双重打击 -> 瀑布巨兽) with confidence 0.28; code rank 1 conf 0.28
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 突破
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 双重打击 -> 瀑布巨兽
- T10 [code] combat/plan: code plan (only distinct line): 挑衅 -> 瀑布巨兽; hp -0, dmg 0
- T10 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T11 [jev] combat/play: Jev chose c3 (Play 耸肩无视) with confidence 0.51 conf 0.51
- T11 [jev] combat/play: Jev chose c1 (Play 防御) with confidence 0.55 conf 0.55
- T11 [jev] combat/play: Jev chose p0 (Drink 稳定血清) with confidence 0.15 conf 0.15
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-11): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 63
- combat/plan / code: 40
- combat/plan-choice / jev: 32
- combat/plan-choice+potion / jev: 19
- reward/claim / code: 19
- map/route-follow / code: 13
- combat/plan-continue / code: 12
- reward/card / deepseek: 8
- combat/lethal / code: 7
- reward/proceed / code: 7
- event/leave / code: 4
- combat/play / jev: 3
- event/choose / deepseek: 3
- rest/plan / deepseek: 3
- rest/proceed / code: 3
- shop/buy / deepseek: 3
- map/route-plan / deepseek: 2
- selection/add / code: 2
- selection/add / deepseek: 2
- selection/remove / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- combat/least-loss / code: 1
- event/plan / deepseek: 1
- map/route / code: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/discard / code: 1
- selection/upgrade / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：12 个
- 第 2 层 combat/plan-choice: Jev chose plan 3/4 (打击 -> 淤泥旋螺, 防御, 防御) with confidence 0.30; code rank 3 (0.30)
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 淤泥旋螺, 防御, 防御) with confidence 0.06; code rank 1 (0.06)
- 第 8 层 combat/plan-choice: Jev chose plan 4/4 (防御, 血墙) with confidence 0.20; code rank 4 (0.20)
- 第 12 层 combat/plan-choice: Jev chose plan 2/3 (双重打击 -> 活雾, 血墙) with confidence 0.32; code rank 2 (0.32)
- 第 12 层 combat/plan-choice: Jev chose plan 1/3 (铁蒺藜, 挑衅 -> 气态炸弹, 打击 -> 气态炸弹) with confidence 0.19; code rank 1 (0.19)
- 第 12 层 combat/plan-choice: Jev chose plan 2/3 (痛击+ -> 活雾, 双重打击 -> 活雾) with confidence 0.29; code rank 2 (0.29)
- 第 12 层 combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 气态炸弹, 打击 -> 气态炸弹) with confidence 0.24; code rank 1 (0.24)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.01; code rank 1 (0.01)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.25; code rank 1 (0.25)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 4/4 (打击 -> 瀑布巨兽, 痛击+ -> 瀑布巨兽, 愤怒 -> 瀑布巨兽); plan 1 (痛击+ -> 瀑布巨兽, 剑柄打击 -> 瀑布巨兽, 愤怒 -> 瀑布巨兽) is as good or better on every axis, playing i (0.24)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/3 (愤怒 -> 瀑布巨兽, 突破, 双重打击 -> 瀑布巨兽) with confidence 0.28; code rank 1 (0.28)
- 第 17 层 combat/play: Jev chose p0 (Drink 稳定血清) with confidence 0.15 (0.15)
