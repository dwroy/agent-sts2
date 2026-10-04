## 复盘：run 7YT0NJC2LEYQ — 阵亡，最高第 17 层

- 决策 243 个；Jev 调用 43 次，Claude 0 次，DeepSeek 17 次；token 114,981 入 / 1,870 出，约 $0.0049（Jev）；DeepSeek token 359,590 入（缓存命中 247,168，69%）/ 45,439 出；用时 12.0 分钟
- 决策者：code 131，jev-plan 48，jev 43，deepseek 21

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 75→54（-21），决策 code 7，jev-plan 4，jev 3
- 第 3 层 毛绒伏地虫: HP 60→60（-0），决策 code 7，jev-plan 5，jev 2
- 第 4 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 66→62（-4），决策 code 9，jev 3，jev-plan 3
- 第 6 层 劫掠者弩手/劫掠者暴徒/劫掠者追踪手: HP 68→45（-23），决策 jev-plan 7，code 6，jev 5
- 第 8 层 方柱构装体: HP 51→39（-12），决策 code 5，jev-plan 4，jev 3
- 第 12 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 77→64（-13），决策 jev 8，jev-plan 4，code 1
- 第 14 层 毛绒伏地虫/缩小甲虫: HP 72→53（-19），决策 jev 8，jev-plan 5，code 3
- 第 15 层 多尼斯异鸟: HP 59→46（-13），决策 jev-plan 8，code 8，jev 4
- 第 17 层 仪式兽: HP 79→6（-73），决策 code 29，jev-plan 8，jev 7

### 死亡战斗：第 17 层 仪式兽
- T10 [code] combat/end_turn: no playable cards; ending the turn
- T11 [jev] combat/plan-choice: Jev chose plan 2/2 (防御, 上勾拳 -> 仪式兽) with confidence 0.94; code rank 2 conf 0.94
- T11 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 上勾拳 -> 仪式兽
- T11 [code] combat/plan: code plan (only line): end turn; hp -12, dmg 0
- T12 [code] combat/plan: code plan (only distinct line): 上勾拳 -> 仪式兽, 头槌 -> 仪式兽; hp -0, dmg 26
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 头槌 -> 仪式兽
- T12 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T13 [code] combat/plan: code plan (only distinct line): 上勾拳 -> 仪式兽; hp -18, dmg 13
- T13 [code] combat/end_turn: no playable cards; ending the turn
- T14 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-10): 邪眼+, 痛击+ -> 仪式兽
- T14 [code] combat/plan-continue: continuing the code-chosen plan: 痛击+ -> 仪式兽
- T14 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-10): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 48
- combat/plan-choice / jev: 41
- combat/plan / code: 39
- reward/claim / code: 21
- combat/plan-continue / code: 15
- map/route-follow / code: 15
- combat/lethal / code: 10
- reward/card / deepseek: 8
- reward/proceed / code: 8
- selection/add / code: 5
- combat/end_turn / code: 4
- event/choose / deepseek: 3
- event/leave / code: 3
- rest/plan / deepseek: 3
- rest/proceed / code: 3
- combat/least-loss / code: 2
- selection/add / jev: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/plan / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/upgrade / deepseek: 1
- shop/buy / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 小啃兽, 防御) with confidence 0.21; code rank 1 (0.21)
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 小啃兽, 打击 -> 小啃兽) with confidence 0.25; code rank 1 (0.25)
- 第 3 层 combat/plan-choice: Jev chose plan 2/2 (头槌 -> 毛绒伏地虫, 防御, 防御) with confidence 0.07; code rank 2 (0.07)
- 第 8 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 方柱构装体, 头槌 -> 方柱构装体, potion 敏捷药水) with confidence 0.06; code rank 2 (0.06)
- 第 12 层 combat/plan-choice: Jev chose plan 4/4 (打击 -> 树叶史莱姆（小）, 飞剑回旋镖) with confidence 0.26; code rank 4 (0.26)
- 第 12 层 selection/add: Jev chose 飞剑回旋镖 with confidence 0.34 (0.34)
- 第 12 层 combat/plan-choice: Jev chose plan 1/4 (痛击+ -> 树叶史莱姆（中）, 飞剑回旋镖) with confidence 0.19; code rank 1 (0.19)
- 第 14 层 combat/plan-choice: Jev chose plan 2/2 (防御, 打击 -> 毛绒伏地虫, 邪眼) with confidence 0.29; code rank 2 (0.29)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (痛击+ -> 毛绒伏地虫, 飞剑回旋镖) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 仪式兽, 防御+, 邪眼+) with confidence 0.34; code rank 3 (0.34)
