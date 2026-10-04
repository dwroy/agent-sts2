## 复盘：run T0ZSE8L3MCDA — 阵亡，最高第 33 层

- 决策 586 个；Jev 调用 125 次，Claude 0 次，大脑 35 次（deepseek 20，codex 15）；token 783,671 入 / 6,449 出，约 $0.0332（Jev）；大脑 token 5,357,493 入（缓存命中 3,903,744，73%）/ 98,734 出；用时 40.8 分钟
- 决策者：code 299，jev 125，jev-plan 114，deepseek (for codex) 29，codex 19

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→55（-9，战后回复 +6），决策 code 8，jev-plan 4，jev 2
- 第 4 层 毛绒伏地虫: HP 61→60（-1，战后回复 +6），决策 jev 7，jev-plan 4，code 3
- 第 5 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 66→66（-0，战后回复 +6），决策 jev 9，jev-plan 5，code 3
- 第 6 层 蛮兽: HP 72→54（-18，战后回复 +6），决策 jev 11，jev-plan 7，code 2
- 第 9 层 毛绒伏地虫/缩小甲虫: HP 80→67（-13，战后回复 +6），决策 jev 10，jev-plan 5，code 4
- 第 12 层 旧日雕像: HP 73→44（-29，战后回复 +6），决策 code 11，jev-plan 7，jev 3
- 第 14 层 利齿之眼/雾菇: HP 74→67（-7，战后回复 +6），决策 jev-plan 5，jev 4，code 3
- 第 17 层 同族信徒/同族神官: HP 73→42（-31，战后回复 +6），决策 jev-plan 11，jev 5，code 4
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 73→63（-10，战后回复 +6），决策 code 7，jev-plan 5，jev 4
- 第 21 层 外骨骼虫: HP 63→41（-22，战后回复 +6），决策 code 12，jev 7，jev-plan 6
- 第 23 层 幼虫/直飞产卵虫/结实的卵: HP 47→22（-25，战后回复 +6），决策 code 7，jev-plan 5，jev 4
- 第 29 层 猎人杀手: HP 76→30（-46，战后回复 +6），决策 jev 6，code 5，jev-plan 2
- 第 30 层 棘刺蟾蜍: HP 36→7（-29，战后回复 +6），决策 jev 9，code 7，jev-plan 5
- 第 31 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 13→1（-12，战后回复 +6），决策 code 8，jev-plan 7，jev 4
- 第 33 层 无厌沙虫: HP 31→0（-31），决策 code 104，jev 40，jev-plan 36

### 死亡战斗：第 33 层 无厌沙虫
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狂宴 -> 无厌沙虫
- T4 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T5 [code] selection/exhaust: code: 进阶之灾 scores 100 vs 打击 58
- T5 [code] combat/plan: code plan (only line): 耸肩无视, 铁斩波 -> 无厌沙虫, 狂乱逃离; hp -7, dmg 12
- T5 [code] combat/plan: code plan (only line): 铁斩波 -> 无厌沙虫, 狂乱逃离; hp -7, dmg 12
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 狂乱逃离
- T5 [code] combat/plan: code plan (only line): end turn; hp -7, dmg 0
- T6 [code] selection/exhaust: code: 打击 scores 56 vs 与我一战！ 5
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): 狂乱逃离, 耸肩无视, 防御
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 耸肩无视
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): 防御
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-9): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 114
- combat/plan-choice / jev: 90
- combat/plan / code: 65
- selection/exhaust / code: 65
- combat/plan-choice+potion / jev: 34
- reward/claim / code: 34
- map/route-follow / code: 29
- combat/plan-continue / code: 24
- combat/least-loss / code: 18
- combat/lethal / code: 18
- reward/proceed / code: 14
- reward/card / deepseek (for codex): 8
- event/leave / code: 7
- rest/proceed / code: 6
- reward/card / codex: 6
- shop/buy / deepseek (for codex): 6
- combat/end_turn / code: 4
- rest/plan / deepseek (for codex): 4
- event/choose / deepseek (for codex): 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/choose / codex: 2
- rest/plan / codex: 2
- selection/add / deepseek (for codex): 2
- shop/buy / codex: 2
- shop/plan / codex: 2
- shop/plan / deepseek (for codex): 2
- event/act-plan / deepseek (for codex): 1
- event/plan / codex: 1
- map/route-follow / deepseek (for codex): 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/add / codex: 1
- selection/remove / codex: 1
- selection/remove / deepseek (for codex): 1
- selection/take into my hand / code: 1
- selection/take into my hand / jev: 1
- selection/upgrade / codex: 1
- selection/upgrade / deepseek (for codex): 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：6 个
- 第 23 层 combat/plan-choice: Jev chose plan 4/8 (打击 -> 直飞产卵虫, 防御, 打击 -> 直飞产卵虫) with confidence 0.23; code rank 4 (0.23)
- 第 30 层 combat/plan-choice: Jev chose plan 1/4 (飞剑回旋镖) with confidence 0.26; code rank 1 (0.26)
- 第 30 层 combat/plan-choice: Jev chose plan 1/4 (end turn) with confidence 0.27; code rank 1 (0.27)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (放血, 耸肩无视) with confidence 0.15; code rank 2 (0.15)
- 第 33 层 combat/plan-choice: Jev chose plan 1/2 (狂宴 -> 无厌沙虫) with confidence 0.34; code rank 1; SL explore (the deviation's turn, T4): playing end turn instead of 狂宴 -> 无厌沙虫, whic (0.34)
- 第 33 层 combat/plan-choice: Jev chose plan 1/2 (铁斩波 -> 无厌沙虫, 狂乱逃离) with confidence 0.33; code rank 1 (0.33)
