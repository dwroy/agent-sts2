## 复盘：run ARKG3JFT26HC — 阵亡，最高第 17 层

- 决策 237 个；Jev 调用 54 次，Claude 0 次，DeepSeek 20 次；token 162,437 入 / 2,285 出，约 $0.0069（Jev）；DeepSeek token 434,656 入（缓存命中 272,896，63%）/ 79,156 出；用时 13.7 分钟
- 决策者：code 104，jev 54，jev-plan 52，deepseek 27

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→48（-16），决策 jev-plan 4，code 4，jev 3
- 第 4 层 噬尸蛞蝓: HP 54→53（-1），决策 code 4，jev-plan 3，jev 2
- 第 5 层 蟾蜍蝌蚪: HP 59→49（-10），决策 code 5，jev 1，jev-plan 1
- 第 6 层 幽灵船: HP 55→46（-9），决策 jev-plan 4，code 4，jev 2
- 第 8 层 噬尸蛞蝓: HP 76→61（-15），决策 code 11，jev 1，jev-plan 1
- 第 9 层 花园幽灵鳗: HP 67→27（-40），决策 jev-plan 11，jev 9，code 8
- 第 12 层 双尾鼠: HP 57→57（-0），决策 code 4，jev-plan 3，jev 2
- 第 17 层 灵魂异鱼: HP 75→5（-70），决策 jev 34，jev-plan 25，code 11

### 死亡战斗：第 17 层 灵魂异鱼
- T13 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 坚毅
- T13 [jev] combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.81; code rank 1 conf 0.81
- T14 [jev] combat/plan-choice: Jev chose plan 1/2 (呼唤, 劫掠 -> 灵魂异鱼, 打击 -> 灵魂异鱼) with confidence 0.70; code rank 1 [calc mismatch: solver says ending now kills, mod says safe] conf 0.70
- T14 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 劫掠 -> 灵魂异鱼
- T14 [jev] combat/plan-choice: Jev chose plan 1/2 (呼唤) with confidence 0.55; code rank 1 [calc mismatch: solver says ending now kills, mod says safe] conf 0.55
- T14 [jev] combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.73; code rank 1 conf 0.73
- T15 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 1): 燃烧契约, 头槌 -> 灵魂异鱼, 呼唤, p
- T15 [code] selection/exhaust: code: 防御 scores -9 vs 呼唤 -60
- T15 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-19): 呼唤, 呼唤, potion 消亡粉末 -> 灵魂异鱼
- T15 [code] combat/plan-continue: continuing the code-chosen plan: 呼唤
- T15 [code] combat/plan-continue: continuing the code-chosen plan: potion 消亡粉末 -> 灵魂异鱼
- T15 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-19): end turn

### 各类决策由谁做
- combat/plan-choice / jev: 53
- combat/plan-continue / jev-plan: 52
- combat/plan / code: 20
- reward/claim / code: 18
- map/route-follow / code: 15
- combat/plan-continue / code: 11
- combat/lethal / code: 8
- reward/card / deepseek: 7
- reward/proceed / code: 7
- event/choose / deepseek: 5
- selection/add / code: 5
- rest/plan / deepseek: 4
- rest/proceed / code: 4
- selection/exhaust / code: 4
- shop/buy / deepseek: 4
- combat/least-loss / code: 3
- event/leave / code: 3
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/plan / deepseek: 1
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/choose / deepseek: 1
- selection/remove / deepseek: 1
- selection/upgrade / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：3 个
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 幽灵船, 头槌 -> 幽灵船, potion 爆炸安瓿) with confidence 0.24; code rank 1 (0.24)
- 第 12 层 combat/plan-choice: Jev chose plan 5/8 (打击 -> 双尾鼠 #1, 打击 -> 双尾鼠 #2, 熔融之拳 -> 双尾鼠 #1, potion 鲜血药水) with confidence 0.27; code rank 5 (0.27)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (呼唤, 呼唤) with confidence 0.17; code rank 1 (0.17)
