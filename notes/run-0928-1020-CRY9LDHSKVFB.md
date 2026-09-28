## 复盘：run CRY9LDHSKVFB — 阵亡，最高第 24 层

- 决策 261 个；Jev 调用 94 次，Claude 0 次，DeepSeek 0 次；token 239,666 入 / 4,299 出，约 $0.0102；用时 16.2 分钟
- 决策者：code 133，jev 94，jev-plan 34

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→53（-11），决策 code 6，jev 2，jev-plan 1
- 第 6 层 噬尸蛞蝓: HP 67→63（-4），决策 code 9，jev-plan 3，jev 2
- 第 8 层 海洋混混: HP 69→58（-11），决策 code 3，jev 1，jev-plan 1
- 第 11 层 潮湿邪教徒/钙化邪教徒: HP 80→75（-5），决策 jev 7，code 6，jev-plan 3
- 第 12 层 气态炸弹/活雾: HP 77→53（-24），决策 code 5，jev-plan 4，jev 3
- 第 17 层 灵魂异鱼: HP 94→38（-56），决策 jev 21，jev-plan 11，code 1
- 第 19 层 偷窃草蜢: HP 84→39（-45），决策 code 7，jev 3，jev-plan 2
- 第 20 层 盛碗虫（石）/盛碗虫（蜜）: HP 45→19（-26），决策 code 6，jev 5，jev-plan 2
- 第 21 层 猎人杀手: HP 25→25（-0），决策 jev 3，jev-plan 2，code 1
- 第 21 层 猎人杀手: HP 25→3（-22），决策 code 7，jev 3，jev-plan 2
- 第 24 层 异螨: HP 9→5（-4），决策 code 6，jev-plan 3，jev 2

### 死亡战斗：第 24 层 异螨
- T1 [jev] combat/plan-choice: Jev chose plan 1/2 (重锤 -> 异螨, 愤怒 -> 异螨) with confidence 0.60; code reference rank 1 conf 0.60
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 愤怒 -> 异螨
- T1 [code] combat/plan: code plan (only line): end turn; hp -4, dmg 0
- T2 [jev] combat/plan-choice: Jev chose plan 1/2 (火焰屏障, 预备打击 -> 异螨, potion 固化药水) with confidence 0.95; code reference rank 1 conf 0.95
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 预备打击 -> 异螨
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: potion 固化药水
- T2 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T3 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 26): 剑柄打击 -> 异螨, 痛击+ -> 异螨
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): 毒素, 毒素
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 毒素
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): end turn

### 各类决策由谁做
- combat/plan / code: 36
- combat/plan-continue / jev-plan: 34
- combat/plan-choice / jev: 28
- reward/claim / code: 27
- combat/plan-choice+potion / jev: 24
- map/route / code: 15
- combat/plan-continue / code: 10
- reward/card / jev: 9
- reward/proceed / code: 9
- event/choose / jev: 8
- event/leave / code: 8
- map/route / jev: 8
- combat/lethal / code: 7
- selection/remove / jev: 6
- shop/buy / jev: 5
- combat/least-loss / code: 3
- map/discard-potion / code: 3
- rest/choose / jev: 3
- rest/proceed / code: 3
- selection/add / jev: 2
- selection/take into my hand / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- run/finalize / code: 1
- selection/upgrade / jev: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：17 个
- 第 1 层 event/choose: Jev chose 华美发束 with confidence 0.15; code rank 1/3 (0.15)
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 蟾蜍蝌蚪, 打击 -> 蟾蜍蝌蚪) with confidence 0.04; code reference rank 1 (0.04)
- 第 3 层 event/choose: Jev chose 第二个箱子 with confidence 0.02; code rank 1/2 (0.02)
- 第 4 层 event/choose: Jev chose 暗之门 with confidence 0.13; code rank 1/2 (0.13)
- 第 6 层 combat/plan-choice: Jev chose plan 4/4 (防御, 打击 -> 噬尸蛞蝓, 防御) with confidence 0.18; code reference rank 4 (0.18)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 噬尸蛞蝓, 飞剑回旋镖, 打击 -> 噬尸蛞蝓) with confidence 0.20; code reference rank 1 (0.20)
- 第 7 层 rest/choose: Jev chose 锻造 (SMITH) with confidence 0.20; code rank 1/2 (0.20)
- 第 9 层 rest/choose: Jev chose 休息 (HEAL) with confidence 0.25; code rank 2/2 (0.25)
- 第 11 层 combat/plan-choice: Jev chose plan 3/4 (potion 鲜血药水, 打击 -> 潮湿邪教徒, 火焰屏障) with confidence 0.24; code reference rank 3 (0.24)
- 第 14 层 shop/buy: Jev chose buy 狱火 (76g) with confidence 0.33; code rank 4/6 (0.33)
- 第 15 层 selection/add: Jev chose 耸肩无视 with confidence 0.22; code rank 1/6 (0.22)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.34; code reference rank 1 (0.34)
- 第 17 层 reward/card: Jev chose 凌虐 (Attack, 3E) with confidence 0.23; code rank 4/4 (0.23)
- 第 18 层 map/route: Jev chose Monster (row 1, col 4) with confidence 0.09; code rank 1/2 (0.09)
- 第 21 层 combat/plan-choice: Jev chose plan 4/4 (防御, 预备打击 -> 猎人杀手, 飞剑回旋镖) with confidence 0.19; code reference rank 4 (0.19)
