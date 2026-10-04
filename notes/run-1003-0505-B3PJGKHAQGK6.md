## 复盘：run B3PJGKHAQGK6 — 阵亡，最高第 17 层

- 决策 371 个；Jev 调用 69 次，Claude 0 次，DeepSeek 17 次；token 401,065 入 / 3,461 出，约 $0.0170（Jev）；DeepSeek token 2,356,476 入（缓存命中 2,128,256，90%）/ 142,215 出；用时 22.9 分钟
- 决策者：code 213，jev 69，jev-plan 67，deepseek 22

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→52（-12，战后回复 +6），决策 code 10，jev-plan 6，jev 3
- 第 3 层 毛绒伏地虫: HP 58→55（-3，战后回复 +6），决策 code 7，jev-plan 4，jev 2
- 第 6 层 小啃兽: HP 61→51（-10，战后回复 +6），决策 jev 6，jev-plan 5，code 1
- 第 7 层 扭动虫: HP 80→49（-31，战后回复 +6），决策 jev 10，jev-plan 5
- 第 8 层 旧日雕像: HP 55→33（-22，战后回复 +6），决策 code 15，jev-plan 7，jev 3
- 第 9 层 方柱构装体: HP 39→4（-35，战后回复 +6），决策 code 11，jev-plan 4，jev 2
- 第 12 层 树枝史莱姆（中）/蛇行扼杀者: HP 19→6（-13，战后回复 +6），决策 code 12，jev 2，jev-plan 2
- 第 14 层 小啃兽: HP 36→21（-15，战后回复 +6），决策 code 14，jev-plan 5，jev 3
- 第 15 层 毛绒伏地虫/缩小甲虫: HP 27→6（-21，战后回复 +6），决策 code 8，jev 5，jev-plan 4
- 第 17 层 仪式兽: HP 36→0（-36），决策 code 76，jev 33，jev-plan 25

### 死亡战斗：第 17 层 仪式兽
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 仪式兽
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 撕裂
- T2 [code] combat/end_turn: no playable cards; ending the turn
- T3 [jev] combat/plan-choice: Jev chose plan 3/4 (剑柄打击 -> 仪式兽, 防御, 狱火) with confidence 0.58; code rank 3 conf 0.58
- T3 [jev] combat/plan-choice: Jev chose plan 3/3 (防御, 狱火) with confidence 0.51; code rank 3 conf 0.51
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狱火
- T3 [code] combat/plan: code plan (only line): end turn; hp -18, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-8): 防御, 打击 -> 仪式兽, 打击 -> 仪式兽
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 仪式兽
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 仪式兽
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-8): end turn

### 各类决策由谁做
- combat/plan / code: 69
- combat/plan-choice / jev: 69
- combat/plan-continue / jev-plan: 67
- combat/plan-continue / code: 62
- reward/claim / code: 23
- map/route-follow / code: 15
- combat/end_turn / code: 9
- reward/card / deepseek: 9
- reward/proceed / code: 9
- combat/least-loss / code: 7
- combat/lethal / code: 7
- event/leave / code: 3
- event/plan / deepseek: 3
- rest/plan / deepseek: 2
- rest/proceed / code: 2
- shop/buy / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/choose / deepseek: 1
- event/only / code: 1
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/transform / deepseek: 1
- selection/upgrade / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：7 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/2 (巨像, 打击 -> 缩小甲虫, 打击 -> 缩小甲虫) with confidence 0.15; code rank 2 (0.15)
- 第 6 层 combat/plan-choice: Jev chose plan 1/9 (防御, 撕裂, 狱火) with confidence 0.25; code rank 1 (0.25)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (防御, 狱火) with confidence 0.30; code rank 3 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 仪式兽, 狱火) with confidence 0.01; code rank 1 (0.01)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (上勾拳 -> 仪式兽) with confidence 0.19; code rank 2 (0.19)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 仪式兽, 狱火) with confidence 0.28; code rank 1 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (上勾拳 -> 仪式兽) with confidence 0.08; code rank 2 (0.08)
