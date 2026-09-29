## 复盘：run 5PHF3ML3XMJN — 阵亡，最高第 17 层

- 决策 260 个；Jev 调用 41 次，Claude 0 次，DeepSeek 18 次；token 125,953 入 / 1,965 出，约 $0.0054（Jev）；DeepSeek token 434,722 入（缓存命中 272,256，63%）/ 44,641 出；用时 12.5 分钟
- 决策者：code 139，jev-plan 55，jev 41，deepseek 25

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→56（-8），决策 code 5，jev 4，jev-plan 3
- 第 3 层 噬尸蛞蝓: HP 62→62（-0），决策 code 13，jev-plan 4，jev 3
- 第 4 层 淤泥旋螺: HP 68→51（-17），决策 code 9，jev-plan 5，jev 3
- 第 5 层 化石追踪者: HP 57→43（-14），决策 jev-plan 7，code 5，jev 4
- 第 7 层 潮湿邪教徒/钙化邪教徒: HP 59→19（-40），决策 jev-plan 7，jev 6，code 6
- 第 9 层 骇鳗: HP 49→2（-47），决策 code 18，jev-plan 9，jev 5
- 第 11 层 噬尸蛞蝓: HP 8→3（-5），决策 jev-plan 4，code 2，jev 1
- 第 14 层 海洋混混/钙化邪教徒: HP 48→40（-8），决策 jev-plan 4，code 4，jev 3
- 第 17 层 瀑布巨兽: HP 80→25（-55），决策 code 22，jev 12，jev-plan 12

### 死亡战斗：第 17 层 瀑布巨兽
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 头槌 -> 瀑布巨兽
- T8 [jev] selection/add: Jev chose 与我一战！ with confidence 0.32 conf 0.32
- T8 [code] combat/end_turn: no playable cards; ending the turn
- T9 [code] combat/plan: code plan (only distinct line): 预备打击 -> 瀑布巨兽, 与我一战！ -> 瀑布巨兽, 愤怒 -> 瀑布巨兽; hp -0, dmg 47
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 与我一战！ -> 瀑布巨兽
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 瀑布巨兽
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T10 [jev] combat/plan-choice: Jev chose plan 4/4 (飞剑回旋镖) with confidence 0.91; code rank - (rollout's best line, added) conf 0.91
- T10 [jev] combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.92; code rank 2 conf 0.92
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): 打击 -> 瀑布巨兽, 痛击 -> 瀑布巨兽
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 痛击 -> 瀑布巨兽
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 55
- combat/plan / code: 46
- combat/plan-choice / jev: 40
- combat/plan-continue / code: 22
- reward/claim / code: 20
- map/route-follow / code: 15
- combat/lethal / code: 8
- reward/card / deepseek: 8
- reward/proceed / code: 8
- shop/buy / deepseek: 5
- event/choose / deepseek: 3
- event/leave / code: 3
- rest/plan / deepseek: 3
- rest/proceed / code: 3
- selection/add / code: 3
- combat/least-loss / code: 2
- selection/add / deepseek: 2
- selection/exhaust / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/remove / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：9 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/3 (邪眼, 痛击 -> 噬尸蛞蝓 #1) with confidence 0.11; code rank 1 (0.11)
- 第 4 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 淤泥旋螺, 打击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.17; code rank 2 (0.17)
- 第 5 层 combat/plan-choice: Jev chose plan 3/4 (打击 -> 化石追踪者, 打击 -> 化石追踪者, 防御) with confidence 0.20; code rank 3 (0.20)
- 第 7 层 combat/plan-choice: Jev chose plan 2/2 (痛击 -> 潮湿邪教徒, 打击 -> 潮湿邪教徒) with confidence 0.19; code rank 2 (0.19)
- 第 7 层 combat/plan-choice: Jev chose plan 4/4 (防御, 打击 -> 钙化邪教徒, 飞剑回旋镖) with confidence 0.34; code rank - (rollout's best line, added) (0.34)
- 第 7 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 钙化邪教徒, 打击 -> 钙化邪教徒, 飞剑回旋镖) with confidence 0.28; code rank 2 (0.28)
- 第 14 层 combat/plan-choice: Jev chose plan 3/8 (打击 -> 钙化邪教徒, 究极打击 -> 海洋混混, 打击 -> 钙化邪教徒) with confidence 0.30; code rank 3 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (飞剑回旋镖, 燃烧契约) with confidence 0.30; code rank 2 (0.30)
- 第 17 层 selection/add: Jev chose 与我一战！ with confidence 0.32 (0.32)
