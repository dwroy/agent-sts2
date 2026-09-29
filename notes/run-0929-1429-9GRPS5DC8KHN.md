## 复盘：run 9GRPS5DC8KHN — 阵亡，最高第 29 层

- 决策 321 个；Jev 调用 54 次，Claude 0 次，DeepSeek 29 次；token 173,156 入 / 2,719 出，约 $0.0074（Jev）；DeepSeek token 600,319 入（缓存命中 411,392，69%）/ 99,343 出；用时 20.4 分钟
- 决策者：code 173，jev 54，jev-plan 53，deepseek 41

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→61（-3），决策 code 8，jev-plan 4，jev 2
- 第 4 层 小啃兽: HP 67→65（-2），决策 code 6，jev-plan 4，jev 3
- 第 6 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 71→71（-0），决策 jev 6，code 5，jev-plan 3
- 第 7 层 异蛙寄生虫/扭动虫: HP 77→39（-38），决策 code 13，jev 8，jev-plan 7
- 第 17 层 仪式兽: HP 87→3（-84），决策 code 22，jev 9，jev-plan 8
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 71→55（-16），决策 jev 7，jev-plan 5，code 4
- 第 20 层 地道虫: HP 61→59（-2），决策 code 6，jev 5，jev-plan 5
- 第 23 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 65→45（-20），决策 jev-plan 5，jev 3，code 1
- 第 23 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 45→19（-26），决策 code 6，jev 3，jev-plan 1
- 第 27 层 啃咬机: HP 52→13（-39），决策 code 6，jev 5，jev-plan 5
- 第 29 层 猎人杀手: HP 49→14（-35），决策 jev-plan 6，code 6，jev 3

### 死亡战斗：第 29 层 猎人杀手
- T1 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T2 [jev] combat/plan-choice: Jev chose plan 3/4 (防御, 狂宴 -> 猎人杀手, 剑柄打击 -> 猎人杀手) with confidence 0.95; code rank 3 conf 0.95
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狂宴 -> 猎人杀手
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 剑柄打击 -> 猎人杀手
- T2 [code] combat/plan: code plan (only line): end turn; hp -14, dmg 0
- T3 [jev] combat/plan-choice: Jev chose plan 4/7 (痛击 -> 猎人杀手, 狱火, 战斗专注) with confidence 0.88; code rank 4 conf 0.88
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狱火
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 战斗专注
- T3 [code] combat/plan: code plan (only line): end turn; hp -21, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 防御, 痛击 -> 猎人杀手
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 痛击 -> 猎人杀手
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan-choice / jev: 54
- combat/plan-continue / jev-plan: 53
- combat/plan / code: 45
- map/route-follow / code: 24
- reward/claim / code: 24
- combat/plan-continue / code: 19
- combat/lethal / code: 14
- reward/card / deepseek: 9
- reward/proceed / code: 9
- event/leave / code: 7
- event/choose / deepseek: 6
- rest/plan / deepseek: 5
- rest/proceed / code: 5
- selection/remove / deepseek: 5
- shop/buy / deepseek: 5
- shop/leave / code: 4
- shop/open / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/end_turn / code: 3
- shop/plan / deepseek: 3
- combat/least-loss / code: 2
- map/route-plan / deepseek: 2
- selection/add / deepseek: 2
- event/act-plan / deepseek: 1
- event/plan / deepseek: 1
- map/route / code: 1
- map/route-follow / deepseek: 1
- run/finalize / code: 1
- selection/free-card / code: 1
- selection/upgrade / deepseek: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：7 个
- 第 6 层 combat/plan-choice: Jev chose plan 3/3 (防御) with confidence 0.33; code rank - (rollout's best line, added) (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 7/10 (痛击 -> 仪式兽, 飞剑回旋镖, potion 鲜血药水) with confidence 0.23; code rank 7 (0.23)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (预备打击 -> 仪式兽, 飞剑回旋镖, 打击 -> 仪式兽) with confidence 0.34; code rank 1 (0.34)
- 第 19 层 combat/plan-choice: Jev chose plan 3/3 (战斗专注) with confidence 0.34; code rank - (rollout's best line, added) (0.34)
- 第 19 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.24; code rank 2 (0.24)
- 第 20 层 combat/plan-choice: Jev chose plan 3/3 (防御, 防御) with confidence 0.28; code rank - (rollout's best line, added) (0.28)
- 第 20 层 combat/plan-choice: Jev chose plan 1/4 (燃烧+, 痛击 -> 地道虫) with confidence 0.33; code rank 1 (0.33)
