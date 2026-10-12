## 复盘：run SDY5T9XCSQN2 — 阵亡，最高第 17 层

- 决策 644 个；Jev 调用 135 次，Claude 0 次，大脑 17 次（codex 17）；token 780,721 入 / 6,600 出，约 $0.0331（Jev）；大脑 token 2,265,795 入（缓存命中 1,483,776，65%）/ 3,767 出；用时 27.1 分钟
- 决策者：code 297，jev-plan 194，jev 135，codex 18

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 56→51（-5），决策 code 13，jev-plan 7，jev 4
- 第 3 层 噬尸蛞蝓: HP 51→51（-0），决策 code 6，jev-plan 5，jev 3
- 第 5 层 淤泥旋螺: HP 51→49（-2），决策 jev-plan 5，code 4，jev 3
- 第 8 层 骇鳗: HP 70→4（-66），决策 code 20，jev-plan 16，jev 6
- 第 13 层 花园幽灵鳗: HP 56→49（-7），决策 jev-plan 9，jev 7，code 5
- 第 14 层 化石追踪者: HP 49→43（-6），决策 jev-plan 6，code 5，jev 3
- 第 15 层 海洋混混/钙化邪教徒: HP 43→40（-3），决策 code 10，jev-plan 7，jev 3
- 第 17 层 瀑布巨兽: HP 65→0（-65），决策 code 181，jev-plan 139，jev 106

### 死亡战斗：第 17 层 瀑布巨兽
- T13 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 瀑布巨兽
- T13 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T13 [jev] combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.70; code rank 2 conf 0.70
- T14 [jev] combat/plan-choice: Jev chose plan 1/2 (带毒刺击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.82; code rank 1 conf 0.82
- T14 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 瀑布巨兽
- T14 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 5
- T15 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): 打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 防御, 偏折, 精确切击 -> 瀑布巨兽
- T15 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 瀑布巨兽
- T15 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T15 [code] combat/plan-continue: continuing the code-chosen plan: 偏折
- T15 [code] combat/plan-continue: continuing the code-chosen plan: 精确切击 -> 瀑布巨兽
- T15 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 194
- combat/plan / code: 114
- combat/plan-choice / jev: 111
- combat/plan-continue / code: 86
- selection/choose / jev: 24
- combat/end_turn / code: 23
- reward/claim / code: 19
- map/route-follow / code: 15
- combat/least-loss / code: 14
- combat/lethal / code: 7
- reward/card / codex: 7
- reward/proceed / code: 7
- event/choose / codex: 4
- event/leave / code: 4
- rest/plan / codex: 4
- rest/proceed / code: 4
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/add / codex: 1
- selection/upgrade / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：3 个
- 第 2 层 selection/choose: Jev chose 打击 with confidence 0.22 (0.22)
- 第 3 层 selection/choose: Jev chose 进阶之灾 with confidence 0.16 (0.16)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (带毒刺击 -> 瀑布巨兽, 精确切击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.31; code rank 1 (0.31)
