## 复盘：run FZLZ9M4QJWBH — 阵亡，最高第 33 层

- 决策 443 个；Jev 调用 72 次，Claude 0 次，DeepSeek 30 次；token 369,482 入 / 3,718 出，约 $0.0157（Jev）；DeepSeek token 4,110,379 入（缓存命中 3,817,600，93%）/ 166,034 出；用时 28.1 分钟
- 决策者：code 230，jev-plan 94，jev 72，deepseek 47

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→57（-7，战后回复 +6），决策 jev-plan 6，code 6，jev 4
- 第 4 层 毛绒伏地虫: HP 57→57（-0，战后回复 +6），决策 code 7，jev-plan 3，jev 1
- 第 5 层 缩小甲虫: HP 63→50（-13，战后回复 +6），决策 code 7，jev 3，jev-plan 2
- 第 6 层 小啃兽: HP 56→39（-17，战后回复 +6），决策 jev-plan 9，code 6，jev 5
- 第 7 层 树叶史莱姆（中）/飞蝇菌子: HP 45→36（-9，战后回复 +6），决策 code 6，jev 4，jev-plan 3
- 第 9 层 多尼斯异鸟: HP 66→35（-31，战后回复 +6），决策 jev-plan 5，code 5，jev 3
- 第 13 层 旧日雕像: HP 79→56（-23，战后回复 +6），决策 code 8，jev-plan 3，jev 2
- 第 17 层 同族信徒/同族神官: HP 86→24（-62，战后回复 +6），决策 jev-plan 19，code 12，jev 8
- 第 19 层 外骨骼虫: HP 75→64（-11，战后回复 +6），决策 code 5，jev-plan 4，jev 3
- 第 21 层 盛碗虫（石）/盛碗虫（蜜）: HP 75→73（-2，战后回复 +6），决策 code 4，jev 3，jev-plan 2
- 第 22 层 外骨骼虫: HP 79→70（-9，战后回复 +6），决策 code 6，jev 5，jev-plan 3
- 第 25 层 异螨: HP 87→66（-21，战后回复 +6），决策 jev 9，jev-plan 6，code 2
- 第 29 层 幼虫/直飞产卵虫/结实的卵: HP 101→89（-12，战后回复 +6），决策 code 5，jev-plan 4，jev 3
- 第 30 层 残杀千足虫: HP 95→33（-62，战后回复 +6），决策 code 9，jev 7，jev-plan 5
- 第 31 层 啃咬机: HP 39→23（-16，战后回复 +6），决策 jev-plan 7，code 7，jev 4
- 第 33 层 知识恶魔: HP 77→0（-77），决策 code 23，jev-plan 13，jev 8

### 死亡战斗：第 33 层 知识恶魔
- T8 [code] combat/plan: code plan (only line): end turn; hp -3, dmg 0
- T9 [code] combat/plan: code plan (only distinct line): 上勾拳+ -> 知识恶魔, 欺凌 -> 知识恶魔; hp -0, dmg 32
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 欺凌 -> 知识恶魔
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T9 [code] selection/curse: code: Knowledge Demon curse -> 衰朽 (HP cost for this deck: DISINTEGRATION 44 (outlasts the HP: 8 a turn x 5.5 turns + 20 > 14 HP); WASTE_AWAY 70 (0.8 cards a tur
- T9 [code] selection/curse: code: Knowledge Demon curse -> 衰朽 (HP cost for this deck: DISINTEGRATION 44 (outlasts the HP: 8 a turn x 5.5 turns + 20 > 14 HP); WASTE_AWAY 70 (0.8 cards a tur
- T10 [jev] combat/plan-choice: Jev chose plan 1/3 (火焰屏障+, 愤怒 -> 知识恶魔) with confidence 0.60; code rank 1 conf 0.60
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 愤怒 -> 知识恶魔
- T10 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-22): 双重打击+ -> 知识恶魔, 连射
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 连射
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-22): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 94
- combat/plan-choice / jev: 68
- combat/plan / code: 64
- reward/claim / code: 40
- map/route-follow / code: 29
- combat/plan-continue / code: 27
- combat/lethal / code: 17
- reward/card / deepseek: 15
- reward/proceed / code: 15
- selection/upgrade / deepseek: 8
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- selection/curse / code: 6
- shop/buy / deepseek: 6
- event/leave / code: 5
- combat/plan-choice+potion / jev: 4
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- event/choose / deepseek: 2
- event/plan / deepseek: 2
- combat/end_turn / code: 1
- event/act-plan / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：11 个
- 第 2 层 combat/plan-choice: Jev chose plan 4/5 (痛击+ -> 树叶史莱姆（中）, 打击 -> 树叶史莱姆（中）) with confidence 0.21; code rank 4 (0.21)
- 第 4 层 combat/plan-choice: Jev chose plan 1/2 (愤怒 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫, 防御) with confidence 0.33; code rank 1 (0.33)
- 第 7 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.23) (0.23)
- 第 7 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.12; code rank - (rollout's best line, added) (0.12)
- 第 17 层 combat/plan-choice: Jev chose plan 7/7 (愤怒 -> 同族神官, 痛击+ -> 同族神官, 打击 -> 同族神官); plan 2 (痛击+ -> 同族神官, 愤怒 -> 同族神官, 打击 -> 同族神官) is as good or better on every axis, playing it  (0.31)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.33; code rank 1 (0.33)
- 第 25 层 combat/plan-choice: Jev chose plan 1/5 (end turn) with confidence 0.12; code rank 1 (0.12)
- 第 25 层 combat/plan-choice: Jev chose plan 9/10 (打击 -> 异螨 #2, 打击 -> 异螨 #2, 踩踏, potion 瓶中船) with confidence 0.32; code rank 9 (0.32)
- 第 29 层 combat/plan-choice: Jev chose plan 4/4 (上勾拳+ -> 直飞产卵虫, 打击 -> 直飞产卵虫) with confidence 0.26; code rank - (rollout's best line, added) (0.26)
- 第 29 层 combat/plan-choice: Jev chose plan 1/10 (potion 异鱼之油, 预备打击 -> 直飞产卵虫, 欺凌 -> 直飞产卵虫, 连射) with confidence 0.28; code rank 1 (0.28)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (燃烧+, 火焰屏障+) with confidence 0.22; code rank 2 (0.22)
