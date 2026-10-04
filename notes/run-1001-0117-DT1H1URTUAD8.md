## 复盘：run DT1H1URTUAD8 — 阵亡，最高第 42 层

- 决策 564 个；Jev 调用 113 次，Claude 0 次，DeepSeek 43 次；token 670,929 入 / 6,506 出，约 $0.0285（Jev）；DeepSeek token 5,932,749 入（缓存命中 5,603,584，94%）/ 320,352 出；用时 45.4 分钟
- 决策者：code 295，jev 113，jev-plan 94，deepseek 62

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→61（-3，战后回复 +6），决策 code 7，jev-plan 4，jev 2
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 67→70（+3，战后回复 +6），决策 code 7，jev 6，jev-plan 4
- 第 5 层 毛绒伏地虫: HP 76→75（-1，战后回复 +6），决策 jev-plan 5，jev 4，code 4
- 第 6 层 蛮兽: HP 81→79（-2，战后回复 +6），决策 jev 3，jev-plan 3，code 3
- 第 9 层 利齿之眼/雾菇: HP 85→79（-6，战后回复 +6），决策 code 9，jev 4，jev-plan 3
- 第 11 层 旧日雕像: HP 85→55（-30，战后回复 +6），决策 code 8，jev 3，jev-plan 3
- 第 13 层 多尼斯异鸟: HP 85→59（-26，战后回复 +6），决策 code 4，jev 3，jev-plan 3
- 第 14 层 方柱构装体: HP 65→62（-3，战后回复 +6），决策 code 9
- 第 15 层 藤蔓蹒跚者: HP 68→66（-2，战后回复 +6），决策 jev-plan 4，code 4，jev 3
- 第 17 层 仪式兽: HP 85→55（-30，战后回复 +6），决策 code 16，jev-plan 8，jev 7
- 第 19 层 外骨骼虫: HP 90→83（-7，战后回复 +6），决策 code 13，jev 3，jev-plan 3
- 第 21 层 地道虫: HP 95→95（-0），决策 jev 8，jev-plan 4，code 1
- 第 22 层 猎人杀手: HP 95→79（-16，战后回复 +6），决策 jev 6，jev-plan 4，code 2
- 第 25 层 残杀千足虫: HP 85→52（-33，战后回复 +6），决策 jev 10，jev-plan 6，code 5
- 第 27 层 寄生惧魔/胧光怪: HP 58→48（-10，战后回复 +6），决策 code 6，jev 3，jev-plan 2
- 第 30 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 95→59（-36，战后回复 +6），决策 jev 12，jev-plan 8，code 7
- 第 31 层 外骨骼虫: HP 65→52（-13，战后回复 +6），决策 code 6，jev 2，jev-plan 2
- 第 33 层 无厌沙虫: HP 86→10（-76，战后回复 +6），决策 code 10，jev 9，jev-plan 9
- 第 35 层 咬人卷轴: HP 79→76（-3，战后回复 +6），决策 jev 6，jev-plan 2，code 2
- 第 36 层 虔诚雕刻师: HP 82→81（-1，战后回复 +6），决策 jev 6，jev-plan 6，code 3
- 第 37 层 电球头: HP 87→79（-8，战后回复 +6），决策 code 4，jev 3，jev-plan 2
- 第 42 层 幽灵骑士/连枷骑士/魔法骑士: HP 77→0（-77），决策 code 15，jev 10，jev-plan 9

### 死亡战斗：第 42 层 幽灵骑士/连枷骑士/魔法骑士
- T6 [jev] combat/plan-choice: Jev chose plan 2/7 (防御, 飞剑回旋镖, 耸肩无视) with confidence 0.72; code rank 2 conf 0.72
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 飞剑回旋镖
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视
- T6 [code] combat/plan: code plan (only line): end turn; hp -4, dmg 0
- T7 [code] combat/plan: code plan (only line): 愤怒 -> 连枷骑士, 打击 -> 连枷骑士, 挑衅 -> 连枷骑士, 拆卸 -> 连枷骑士; hp -0, dmg 50
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 连枷骑士
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 挑衅 -> 连枷骑士
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 拆卸 -> 连枷骑士
- T7 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-39): 痛击 -> 魔法骑士, 拆卸 -> 魔法骑士
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 拆卸 -> 魔法骑士
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-39): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 94
- combat/plan / code: 88
- combat/plan-choice / jev: 61
- reward/claim / code: 59
- combat/plan-choice+potion / jev: 50
- map/route-follow / code: 36
- combat/plan-continue / code: 29
- combat/lethal / code: 23
- reward/card / deepseek: 21
- reward/proceed / code: 21
- shop/buy / deepseek: 12
- event/choose / deepseek: 8
- rest/plan / deepseek: 7
- rest/proceed / code: 7
- event/leave / code: 6
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- selection/upgrade / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- combat/least-loss / code: 2
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/take into my hand / jev: 2
- combat/end_turn / code: 1
- combat/potion-now / code: 1
- event/plan / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 3 层 combat/plan-choice: Jev chose plan 2/4 (打击 -> 树枝史莱姆（小）, 打击 -> 树叶史莱姆（小）) with confidence 0.31; code rank 2 (0.31)
- 第 3 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 树叶史莱姆（小）) with confidence 0.23; code rank 2 (0.23)
- 第 5 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫, 防御) with confidence 0.19; code rank 3 (0.19)
- 第 9 层 combat/plan-choice: Jev chose plan 2/3 (防御, 痛击+ -> 雾菇) with confidence 0.24; code rank 2 (0.24)
- 第 25 层 combat/plan-choice+potion: Jev chose plan 3/7 (防御, 痛击+ -> 残杀千足虫 (BACK)) with confidence 0.13; code rank 3 (0.13)
- 第 25 层 combat/plan-choice+potion: Jev chose plan 1/9 (飞剑回旋镖, 御血术 -> 残杀千足虫 (BACK)) with confidence 0.30; code rank 1 (0.30)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 1/2 (痛击+ -> 盛碗虫（石）, 打击 -> 盛碗虫（石）) with confidence 0.21; code rank 1 (0.21)
- 第 30 层 selection/take into my hand: Jev chose 武装 with confidence 0.12 (0.12)
- 第 33 层 combat/plan-choice: Jev chose plan 1/2 (双重打击 -> 无厌沙虫, 狂乱逃离) with confidence 0.33; code rank 1 [ending now kills by what the mod's lethal flag does not count: the Sandpit  (0.33)
- 第 35 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.32; code rank - (rollout's best line, added) (0.32)
- 第 35 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.24; code rank - (rollout's best line, added) (0.24)
- 第 42 层 combat/plan-choice+potion: Jev chose plan 2/6 (耸肩无视, 痛击+ -> 连枷骑士, 愤怒 -> 连枷骑士) with confidence 0.30; code rank 2 (0.30)
- 第 42 层 combat/plan-choice+potion: Jev chose plan 4/8 (防御, 与我一战！ -> 魔法骑士) with confidence 0.18; code rank 4 (0.18)
