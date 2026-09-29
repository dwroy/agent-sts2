## 复盘：run 5NFGDU7BQPD3 — 阵亡，最高第 17 层

- 决策 198 个；Jev 调用 29 次，Claude 0 次，DeepSeek 17 次；token 81,602 入 / 1,274 出，约 $0.0035（Jev）；DeepSeek token 342,091 入（缓存命中 230,656，67%）/ 45,911 出；用时 9.1 分钟
- 决策者：code 116，jev 29，jev-plan 29，deepseek 24

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→64（-0），决策 jev 2，jev-plan 2
- 第 2 层 淤泥旋螺: HP 64→62（-2），决策 code 5，jev-plan 4，jev 2
- 第 3 层 海洋混混: HP 68→62（-6），决策 code 7，jev-plan 3，jev 2
- 第 5 层 蟾蜍蝌蚪: HP 68→66（-2），决策 code 5，jev 1
- 第 6 层 活雾: HP 70→61（-9），决策 code 4，jev 1，jev-plan 1
- 第 6 层 气态炸弹/活雾: HP 61→55（-6），决策 code 3
- 第 11 层 鬼祟珊瑚群: HP 71→44（-27），决策 code 4，jev 3，jev-plan 2
- 第 11 层 鬼祟珊瑚群: HP 44→38（-6），决策 code 2，jev 1，jev-plan 1
- 第 12 层 海洋混混/钙化邪教徒: HP 44→38（-6），决策 code 6，jev-plan 5，jev 2
- 第 14 层 化石追踪者: HP 68→54（-14），决策 jev-plan 2，code 2，jev 1
- 第 17 层 瀑布巨兽: HP 80→80（-0），决策 jev 2，jev-plan 2
- 第 17 层 瀑布巨兽: HP 80→14（-66），决策 code 17，jev 11，jev-plan 7

### 死亡战斗：第 17 层 瀑布巨兽
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 完美打击 -> 瀑布巨兽
- T7 [code] combat/plan: code plan (only line): end turn; hp -11, dmg 0
- T8 [jev] combat/plan-choice: Jev chose plan 2/2 (防御, 预备打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.39; code rank 2 conf 0.39
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 预备打击 -> 瀑布巨兽
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 瀑布巨兽
- T8 [jev] combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.38; code rank 2 conf 0.38
- T9 [code] combat/plan: code plan (dominates the score-best line): 完美打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽; hp -0, dmg 32
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 瀑布巨兽
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T10 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 26): 剑柄打击 -> 瀑布巨兽, 头槌 -> 瀑布
- T10 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 18): 剑柄打击 -> 瀑布巨兽, 头槌 -> 瀑布
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-27): end turn

### 各类决策由谁做
- combat/plan / code: 32
- combat/plan-continue / jev-plan: 29
- combat/plan-choice / jev: 26
- reward/claim / code: 22
- map/route-follow / code: 15
- combat/plan-continue / code: 13
- reward/card / deepseek: 8
- combat/lethal / code: 7
- reward/proceed / code: 7
- shop/buy / deepseek: 5
- rest/plan / deepseek: 4
- rest/proceed / code: 4
- combat/least-loss / code: 3
- selection/add / code: 3
- combat/plan-choice+potion / jev: 2
- event/choose / deepseek: 2
- event/leave / code: 2
- selection/upgrade / deepseek: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：4 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 打击 -> 淤泥旋螺, 防御) with confidence 0.00; code rank 1 (0.00)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (预备打击 -> 瀑布巨兽, 双重打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.28; code rank 2 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.28; code rank 2 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (剑柄打击 -> 瀑布巨兽, 剑柄打击 -> 瀑布巨兽) with confidence 0.24; code rank 3 (0.24)
