## 复盘：run L2TSFU62Z57Z — 阵亡，最高第 17 层

- 决策 442 个；Jev 调用 102 次，Claude 0 次，大脑 17 次（codex 17）；token 702,143 入 / 6,049 出，约 $0.0297（Jev）；大脑 token 2,223,513 入（缓存命中 1,329,152，60%）/ 5,244 出；用时 23.8 分钟
- 决策者：code 179，jev-plan 137，jev 102，codex 24

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 56→56（-0），决策 code 17，jev-plan 3，jev 2
- 第 4 层 毛绒伏地虫: HP 56→51（-5），决策 code 6，jev 5，jev-plan 4
- 第 6 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 51→51（-0），决策 jev-plan 6，code 4，jev 3
- 第 9 层 闪光贾克斯果/飞蝇菌子: HP 45→23（-22），决策 code 7，jev-plan 5，jev 3
- 第 14 层 多尼斯异鸟: HP 44→24（-20），决策 jev-plan 8，code 8，jev 3
- 第 17 层 仪式兽: HP 65→0（-65），决策 jev-plan 111，code 87，jev 86

### 死亡战斗：第 17 层 仪式兽
- T6 [jev] combat/plan-choice: Jev chose plan 3/3 (突然一拳 -> 仪式兽, 匕首雨+, 独门技术, 打击 -> 仪式兽) with confidence 0.80; code rank - (rollout's best line, added) conf 0.80
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 匕首雨+
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 独门技术
- T6 [jev] combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.94; code rank - (rollout's best line, added) conf 0.94
- T7 [jev] combat/plan-choice: Jev chose plan 1/2 (侧步, 小刀 -> 仪式兽, 后空翻) with confidence 0.90; code rank 1 conf 0.90
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 小刀 -> 仪式兽
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 后空翻
- T7 [code] combat/plan: code plan (only distinct line): 中和 -> 仪式兽, 打击 -> 仪式兽; hp -0, dmg 11
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 仪式兽
- T7 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 精密瞄准 -> 仪式兽
- T8 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 137
- combat/plan-choice / jev: 93
- combat/plan / code: 77
- combat/plan-continue / code: 23
- combat/end_turn / code: 15
- map/route-follow / code: 15
- reward/claim / code: 13
- selection/choose / jev: 9
- combat/least-loss / code: 7
- combat/lethal / code: 7
- event/leave / code: 5
- reward/card / codex: 5
- reward/proceed / code: 5
- event/choose / codex: 4
- shop/buy / codex: 4
- rest/plan / codex: 3
- rest/proceed / code: 3
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / codex: 2
- bundle/choose / codex: 1
- bundle/confirm / code: 1
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/plan / codex: 1
- map/route-change / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/transform / codex: 1
- selection/upgrade / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (暴露 -> 仪式兽, 突然一拳 -> 仪式兽, 精密瞄准 -> 仪式兽, potion 稳定血清); plan 1 (暴露 -> 仪式兽, 突然一拳 -> 仪式兽, 精密瞄准 -> 仪式兽) is as good or better on every axis (0.34)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (精密瞄准 -> 仪式兽, 匕首雨+, potion 稳定血清); plan 1 (精密瞄准 -> 仪式兽, 匕首雨+) is as good or better on every axis, playing it with confidence 0.27; c (0.27)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.29 (0.29)
- 第 17 层 selection/choose: Jev chose 精密瞄准 with confidence 0.23 (0.23)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (精密瞄准 -> 仪式兽, 匕首雨+, potion 稳定血清); plan 1 (精密瞄准 -> 仪式兽, 匕首雨+) is as good or better on every axis, playing it with confidence 0.33; c (0.33)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.27 (0.27)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (精密瞄准 -> 仪式兽, 匕首雨+, potion 稳定血清); plan 1 (精密瞄准 -> 仪式兽, 匕首雨+) is as good or better on every axis, playing it with confidence 0.27; c (0.27)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.26 (0.26)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (斗篷与匕首) with confidence 0.18; code rank 2 (0.18)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (精密瞄准 -> 仪式兽, 匕首雨+, potion 稳定血清); plan 1 (精密瞄准 -> 仪式兽, 匕首雨+) is as good or better on every axis, playing it with confidence 0.30; c (0.30)
- 第 17 层 selection/choose: Jev chose 防御 with confidence 0.17 (0.17)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (精密瞄准 -> 仪式兽, 匕首雨+, potion 稳定血清); plan 1 (精密瞄准 -> 仪式兽, 匕首雨+) is as good or better on every axis, playing it with confidence 0.25; c (0.25)
- 第 17 层 selection/choose: Jev chose 防御 with confidence 0.19 (0.19)
