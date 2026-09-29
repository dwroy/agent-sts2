## 复盘：run 9CDEMGKTJ77N — 阵亡，最高第 17 层

- 决策 169 个；Jev 调用 23 次，Claude 0 次，DeepSeek 16 次；token 71,577 入 / 1,126 出，约 $0.0031（Jev）；DeepSeek token 353,944 入（缓存命中 232,448，66%）/ 59,862 出；用时 10.6 分钟
- 决策者：code 92，deepseek 27，jev-plan 27，jev 23

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→59（-5），决策 code 7，jev-plan 4，jev 2
- 第 3 层 毛绒伏地虫: HP 65→59（-6），决策 code 8
- 第 5 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 65→54（-11），决策 jev-plan 6，code 6，jev 3
- 第 8 层 蛮兽: HP 60→54（-6），决策 code 4，jev 3，jev-plan 3
- 第 14 层 毛绒伏地虫/缩小甲虫: HP 51→40（-11），决策 jev 8，jev-plan 7，code 4
- 第 15 层 墨宝: HP 46→26（-20），决策 code 3，jev-plan 2，jev 1
- 第 17 层 仪式兽: HP 53→9（-44），决策 code 11，jev 6，jev-plan 5

### 死亡战斗：第 17 层 仪式兽
- T3 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T4 [jev] combat/plan-choice: Jev chose plan 6/6 (血墙, 防御) with confidence 0.69; code rank 6 conf 0.69
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T4 [code] combat/plan: code plan (only line): end turn; hp -3, dmg 0
- T5 [jev] combat/plan-choice: Jev chose plan 2/3 (燃烧+, 飞剑回旋镖, 防御) with confidence 0.85; code rank 2 conf 0.85
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 飞剑回旋镖
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T5 [jev] combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.91; code rank 2 conf 0.91
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): 防御, 防御, 打击 -> 仪式兽
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 仪式兽
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 27
- combat/plan / code: 21
- combat/plan-choice / jev: 17
- map/route-follow / code: 15
- reward/claim / code: 13
- combat/plan-continue / code: 12
- combat/lethal / code: 8
- reward/card / deepseek: 6
- reward/proceed / code: 6
- combat/plan-choice+potion / jev: 5
- event/leave / code: 4
- event/plan / deepseek: 4
- rest/plan / deepseek: 3
- rest/proceed / code: 3
- selection/transform / deepseek: 3
- selection/upgrade / deepseek: 3
- shop/buy / deepseek: 3
- combat/least-loss / code: 2
- map/route-change / deepseek: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：1 个
- 第 17 层 combat/plan-choice: Jev chose plan 2/4 (剑柄打击 -> 仪式兽, 狱火+, 防御) with confidence 0.31; code rank 2 (0.31)
