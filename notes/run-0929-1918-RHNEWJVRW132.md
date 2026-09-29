## 复盘：run RHNEWJVRW132 — 阵亡，最高第 17 层

- 决策 173 个；Jev 调用 27 次，Claude 0 次，DeepSeek 19 次；token 120,074 入 / 1,751 出，约 $0.0051（Jev）；DeepSeek token 406,542 入（缓存命中 264,064，65%）/ 74,147 出；用时 12.8 分钟
- 决策者：code 91，jev-plan 31，jev 27，deepseek 24

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→61（-3），决策 code 3，jev 2，jev-plan 2
- 第 3 层 海洋混混: HP 67→59（-8），决策 code 4，jev-plan 2，jev 1
- 第 5 层 噬尸蛞蝓: HP 71→71（-0），决策 code 3，jev-plan 2，jev 1
- 第 8 层 花园幽灵鳗: HP 77→77（-0），决策 jev-plan 5，code 5，jev 4
- 第 12 层 化石追踪者: HP 83→62（-21），决策 code 7，jev-plan 3，jev 2
- 第 14 层 鬼祟珊瑚群: HP 68→25（-43），决策 jev 5，jev-plan 5，code 5
- 第 17 层 瀑布巨兽: HP 49→10（-39），决策 jev 12，jev-plan 12，code 12

### 死亡战斗：第 17 层 瀑布巨兽
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T7 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T8 [jev] combat/plan-choice: Jev chose plan 1/9 (御血术 -> 瀑布巨兽, 飞剑回旋镖, 防御) with confidence 0.43; code rank 1 conf 0.43
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 飞剑回旋镖
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T8 [code] combat/plan: code plan (only line): end turn; hp -6, dmg 0
- T9 [jev] combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 瀑布巨兽, 与我一战！+ -> 瀑布巨兽) with confidence 0.85; code rank 1 conf 0.85
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 与我一战！+ -> 瀑布巨兽
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 防御, 火焰屏障
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 火焰屏障
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 31
- combat/plan / code: 23
- reward/claim / code: 17
- combat/plan-choice+potion / jev: 16
- map/route-follow / code: 15
- combat/plan-choice / jev: 11
- combat/plan-continue / code: 8
- combat/lethal / code: 6
- reward/card / deepseek: 6
- reward/proceed / code: 6
- event/choose / deepseek: 5
- event/leave / code: 5
- rest/plan / deepseek: 3
- rest/proceed / code: 3
- combat/least-loss / code: 2
- event/plan / deepseek: 2
- selection/upgrade / deepseek: 2
- shop/buy / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/choose / deepseek: 1
- selection/enchant / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：5 个
- 第 12 层 combat/plan-choice+potion: Jev chose plan 1/8 (与我一战！+ -> 化石追踪者, 御血术 -> 化石追踪者) with confidence 0.20; code rank 1 (0.20)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/4 (与我一战！+ -> 瀑布巨兽) with confidence 0.32; code rank 1; HP guard: plan 1 (与我一战！+ -> 瀑布巨兽) loses 17 HP, more than 8 over the cheapest li (0.32)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 发光水, then re-plan (confidence 0.28) (0.28)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 3/5 (火焰屏障, 飞剑回旋镖) with confidence 0.17; code rank 3 (0.17)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 6/9 (痛击+ -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.32; code rank 6 (0.32)
