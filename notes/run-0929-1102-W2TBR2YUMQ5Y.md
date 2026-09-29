## 复盘：run W2TBR2YUMQ5Y — 阵亡，最高第 17 层

- 决策 247 个；Jev 调用 42 次，Claude 0 次，DeepSeek 20 次；token 120,355 入 / 1,973 出，约 $0.0051（Jev）；DeepSeek token 361,003 入（缓存命中 255,616，71%）/ 36,021 出；用时 11.3 分钟
- 决策者：code 133，jev-plan 52，jev 42，deepseek 20

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→61（-3），决策 jev 7，jev-plan 6，code 3
- 第 2 层 缩小甲虫: HP 61→57（-4），决策 code 3，jev-plan 2，jev 1
- 第 4 层 小啃兽: HP 63→58（-5），决策 jev 3，jev-plan 3，code 3
- 第 6 层 毛绒伏地虫: HP 64→61（-3），决策 code 9，jev-plan 3，jev 2
- 第 8 层 利齿之眼/雾菇: HP 67→50（-17），决策 code 8，jev-plan 6，jev 3
- 第 8 层 利齿之眼/雾菇: HP 50→50（-0），决策 code 4，jev 1
- 第 9 层 多尼斯异鸟: HP 56→10（-46），决策 code 8，jev-plan 5，jev 3
- 第 11 层 蛮兽: HP 16→4（-12），决策 code 9，jev-plan 5，jev 3
- 第 13 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 33→29（-4），决策 jev-plan 4，jev 3，code 3
- 第 14 层 小啃兽: HP 35→35（-0），决策 code 5，jev-plan 3，jev 2
- 第 15 层 毛绒伏地虫/缩小甲虫: HP 41→29（-12），决策 jev-plan 7，code 7，jev 4
- 第 17 层 同族信徒/同族神官: HP 58→36（-22），决策 jev 4，jev-plan 3，code 1
- 第 17 层 同族信徒/同族神官: HP 36→1（-35），决策 jev 6，jev-plan 5，code 5
- 第 17 层 同族信徒/同族神官: HP 1→1（-0），决策 code 1

### 死亡战斗：第 17 层 同族信徒/同族神官
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-8): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 52
- combat/plan / code: 33
- combat/plan-choice / jev: 24
- reward/claim / code: 22
- combat/plan-continue / code: 20
- combat/plan-choice+potion / jev: 17
- map/route-follow / code: 12
- combat/lethal / code: 10
- reward/card / deepseek: 9
- reward/proceed / code: 9
- combat/end_turn / code: 4
- event/choose / deepseek: 3
- rest/choose / deepseek: 3
- rest/proceed / code: 3
- selection/add / code: 3
- selection/discard / code: 3
- combat/least-loss / code: 2
- event/leave / code: 2
- map/route / code: 2
- map/route-plan / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice+potion-lethal / jev: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/remove / deepseek: 1
- selection/upgrade / deepseek: 1
- shop/buy / code: 1
- shop/buy / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：8 个
- 第 4 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 小啃兽, 踩踏) with confidence 0.08; code rank 1 (0.08)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (防御+, 痛击 -> 毛绒伏地虫) with confidence 0.26; code rank 1 (0.26)
- 第 11 层 combat/plan-choice: Jev chose plan 2/2 (挑衅 -> 蛮兽, 恶魔之焰 -> 蛮兽) with confidence 0.21; code rank 2 (0.21)
- 第 15 层 combat/plan-choice: Jev chose plan 1/2 (燃烧, 预备打击 -> 毛绒伏地虫, 头槌 -> 毛绒伏地虫) with confidence 0.28; code rank 1 (0.28)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.02; code rank 1 (0.02)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (挑衅 -> 同族神官, 头槌 -> 同族神官, 拆卸 -> 同族神官) with confidence 0.09; code rank 1 (0.09)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.25; code rank 1 (0.25)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 流动铜液 (confidence 0.33) (0.33)
