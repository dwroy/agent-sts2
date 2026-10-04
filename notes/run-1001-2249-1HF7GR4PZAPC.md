## 复盘：run 1HF7GR4PZAPC — 阵亡，最高第 48 层

- 决策 695 个；Jev 调用 143 次，Claude 0 次，DeepSeek 46 次；token 827,982 入 / 7,765 出，约 $0.0351（Jev）；DeepSeek token 6,523,091 入（缓存命中 6,041,856，93%）/ 306,474 出；用时 58.8 分钟
- 决策者：code 340，jev-plan 145，jev 143，deepseek 67

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→59（-5，战后回复 +6），决策 code 8，jev-plan 3，jev 2
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 65→58（-7，战后回复 +6），决策 jev 7，jev-plan 3，code 1
- 第 5 层 缩小甲虫: HP 64→64（-0，战后回复 +6），决策 jev 4，jev-plan 3
- 第 9 层 闪光贾克斯果/飞蝇菌子: HP 52→35（-17，战后回复 +6），决策 jev 12，jev-plan 10，code 2
- 第 11 层 藤蔓蹒跚者: HP 41→32（-9，战后回复 +6），决策 jev 9，jev-plan 3，code 2
- 第 13 层 小啃兽: HP 77→64（-13，战后回复 +6），决策 code 12，jev-plan 8，jev 6
- 第 14 层 墨宝: HP 70→68（-2，战后回复 +6），决策 jev-plan 3，code 3，jev 2
- 第 15 层 异蛙寄生虫/扭动虫: HP 74→55（-19，战后回复 +6），决策 jev 16，code 14，jev-plan 6
- 第 17 层 同族信徒/同族神官: HP 61→36（-25，战后回复 +6），决策 jev-plan 15，jev 12，code 11
- 第 19 层 地道虫: HP 72→67（-5，战后回复 +6），决策 code 26，jev-plan 5，jev 3
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 73→62（-11，战后回复 +6），决策 jev 6，jev-plan 6，code 5
- 第 23 层 寄生惧魔/胧光怪: HP 68→54（-14，战后回复 +6），决策 jev 6，jev-plan 5，code 5
- 第 24 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 60→48（-12，战后回复 +6），决策 jev-plan 13，jev 8，code 7
- 第 31 层 蜂群术士: HP 80→57（-23，战后回复 +6），决策 code 13，jev-plan 7，jev 3
- 第 33 层 知识恶魔: HP 80→12（-68，战后回复 +6），决策 code 34，jev-plan 12，jev 7
- 第 35 层 虔诚雕刻师: HP 98→72（-26，战后回复 +6），决策 jev-plan 9，code 6，jev 5
- 第 36 层 咬人卷轴: HP 78→56（-22，战后回复 +6），决策 code 4，jev 3，jev-plan 2
- 第 38 层 史莱姆狂战士: HP 62→54（-8，战后回复 +6），决策 jev 18，jev-plan 12，code 4
- 第 45 层 灵魂枢纽: HP 103→43（-60，战后回复 +6），决策 code 13，jev-plan 6，jev 5
- 第 48 层 实验体 #C36: HP 94→0（-94），决策 jev-plan 14，code 10，jev 9

### 死亡战斗：第 48 层 实验体 #C36
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 全身撞击 -> 实验体 #C36
- T5 [code] combat/end_turn: no living enemy but combat continues (boss phase change): ending the turn
- T6 [jev] combat/plan-choice: Jev chose plan 2/3 (防御, 剑柄打击 -> 实验体 #C36, 愤怒+ -> 实验体 #C36) with confidence 0.46; code rank 2 conf 0.46
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 剑柄打击 -> 实验体 #C36
- T6 [jev] combat/plan-choice: Jev chose plan 2/2 (愤怒+ -> 实验体 #C36, 欺凌 -> 实验体 #C36) with confidence 0.36; code rank 2 conf 0.36
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 欺凌 -> 实验体 #C36
- T6 [jev] combat/plan-choice: Jev chose plan 1/2 (突破+) with confidence 0.29; code rank 1 conf 0.29
- T6 [code] combat/end_turn: no playable cards; ending the turn
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): 防御, 上勾拳 -> 实验体 #C36, 邪眼+
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 上勾拳 -> 实验体 #C36
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 邪眼+
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 145
- combat/plan-choice / jev: 124
- combat/plan / code: 84
- combat/plan-continue / code: 52
- reward/claim / code: 51
- map/route-follow / code: 42
- combat/lethal / code: 20
- reward/card / deepseek: 19
- reward/proceed / code: 19
- combat/plan-choice+potion / jev: 14
- combat/end_turn / code: 13
- event/choose / deepseek: 10
- event/leave / code: 10
- rest/plan / deepseek: 9
- rest/proceed / code: 9
- shop/buy / deepseek: 9
- selection/upgrade / deepseek: 6
- chest/open / code: 5
- chest/proceed / code: 5
- chest/relic / code: 5
- selection/curse / code: 5
- combat/plan-choice+potion-lethal / jev: 4
- selection/discard / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- sphere/clear / code: 3
- combat/least-loss / code: 2
- event/act-plan / deepseek: 2
- event/plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- event/only / code: 1
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / deepseek: 1
- selection/confirm / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- sphere/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 9 层 combat/plan-choice: Jev chose plan 4/4 (end turn) with confidence 0.30; code rank - (rollout's best line, added) (0.30)
- 第 15 层 combat/plan-choice: Jev chose plan 3/4 (打击 -> 扭动虫 #2, 邪眼, 打击 -> 扭动虫 #2) with confidence 0.28; code rank 3 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 2/7 (战斗专注, potion 熔炉的祝福, 火焰屏障+) with confidence 0.32; code rank 2 (0.32)
- 第 19 层 combat/plan-choice: Jev chose plan 2/2 (防御, 痛击 -> 地道虫, 防御) with confidence 0.34; code rank 2 (0.34)
- 第 24 层 combat/plan-choice: Jev chose plan 2/6 (火焰屏障+, potion 力量药水, 熔融之拳 -> 盛碗虫（石）) with confidence 0.19; code rank 2 (0.19)
- 第 31 层 combat/plan-choice: Jev chose plan 3/4 (打击 -> 蜂群术士, 撕裂+, 防御, 愤怒 -> 蜂群术士) with confidence 0.27; code rank 3 (0.27)
- 第 38 层 combat/plan-choice: Jev chose plan 1/4 (撕裂+, potion 复制药水, 痛击 -> 史莱姆狂战士, 打击 -> 史莱姆狂战士, 欺凌 -> 史莱姆狂战士) with confidence 0.25; code rank 1 (0.25)
- 第 45 层 combat/plan-choice: Jev chose plan 2/3 (potion 虚弱药水 -> 灵魂枢纽) with confidence 0.24; code rank 2 (0.24)
- 第 48 层 combat/plan-choice: Jev chose plan 1/2 (放血+, 打击 -> 实验体 #C36, 熔融之拳 -> 实验体 #C36, 打击 -> 实验体 #C36, 火焰屏障+) with confidence 0.30; code rank 1 (0.30)
- 第 48 层 combat/plan-choice: Jev chose plan 1/2 (突破+) with confidence 0.29; code rank 1 (0.29)
