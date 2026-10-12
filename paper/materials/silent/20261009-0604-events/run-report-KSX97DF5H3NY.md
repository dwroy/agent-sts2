## 复盘：run KSX97DF5H3NY — 阵亡，最高第 31 层

- 决策 517 个；Jev 调用 96 次，Claude 0 次，大脑 30 次（codex 30）；token 537,492 入 / 5,389 出，约 $0.0228（Jev）；大脑 token 4,030,798 入（缓存命中 2,220,800，55%）/ 7,979 出；用时 25.2 分钟
- 决策者：code 248，jev-plan 133，jev 96，codex 40

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 56→56（-0），决策 jev-plan 3，jev 1，code 1
- 第 3 层 小啃兽: HP 56→56（-0），决策 code 11，jev-plan 3，jev 1
- 第 4 层 毛绒伏地虫: HP 56→55（-1），决策 code 8，jev-plan 4，jev 3
- 第 5 层 蛮兽: HP 55→53（-2），决策 jev 10，jev-plan 7，code 5
- 第 8 层 多尼斯异鸟: HP 53→14（-39），决策 jev-plan 8，code 7，jev 6
- 第 13 层 毛绒伏地虫/缩小甲虫: HP 50→50（-0），决策 jev-plan 5，jev 4，code 4
- 第 14 层 扭动虫: HP 70→69（-1），决策 jev 5，jev-plan 4，code 2
- 第 15 层 方柱构装体: HP 69→69（-0），决策 code 5，jev 2，jev-plan 2
- 第 17 层 仪式兽: HP 69→38（-31），决策 code 14，jev-plan 9，jev 8
- 第 19 层 偷窃草蜢: HP 63→53（-10），决策 code 7，jev-plan 6，jev 5
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 53→48（-5），决策 code 6，jev-plan 5，jev 3
- 第 21 层 虱虫之祖: HP 48→41（-7），决策 code 10，jev-plan 8，jev 4
- 第 23 层 寄生惧魔/胧光怪: HP 41→4（-37），决策 jev-plan 8，code 7，jev 3
- 第 25 层 外骨骼虫: HP 29→18（-11），决策 jev-plan 8，jev 7，code 4
- 第 30 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 54→19（-35），决策 jev-plan 19，jev 12，code 11
- 第 31 层 幼虫/直飞产卵虫/结实的卵: HP 19→0（-19），决策 code 37，jev-plan 34，jev 22

### 死亡战斗：第 31 层 幼虫/直飞产卵虫/结实的卵
- T4 [jev] combat/plan-choice: Jev chose plan 2/3 (翻越撑击, 中和+ -> 幼虫 #1, 生存者, 致命毒药 -> 直飞产卵虫) with confidence 1.00; code rank 2; SL explore (T4, the latest question before attempt 2's death on T conf 1.00
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 中和+ -> 幼虫 #2
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 生存者
- T4 [jev] selection/choose: Jev chose 进阶之灾 with confidence 0.40 conf 0.40
- T4 [jev] combat/plan-choice: Jev chose plan 2/3 (致命毒药 -> 直飞产卵虫) with confidence 1.00; code rank 2 [calc mismatch: solver says ending now does not kill, mod says lethal: the mod's flag count conf 1.00
- T4 [code] combat/end_turn: no playable cards; ending the turn
- T5 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 31): 后空翻, 猎杀者 -> 幼虫 #1, 打击 
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-28): 余像, 打击 -> 幼虫 #2, 防御, 逃脱计划
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 幼虫 #2
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-28): 防御, 逃脱计划
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 逃脱计划
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-31): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 133
- combat/plan-choice / jev: 75
- combat/plan / code: 67
- reward/claim / code: 42
- combat/plan-continue / code: 27
- map/route-follow / code: 27
- combat/lethal / code: 22
- reward/card / codex: 16
- reward/proceed / code: 16
- combat/least-loss / code: 13
- selection/choose / jev: 11
- combat/plan-choice+potion / jev: 9
- combat/end_turn / code: 8
- event/leave / code: 7
- rest/plan / codex: 5
- rest/proceed / code: 5
- event/choose / codex: 4
- selection/upgrade / codex: 3
- shop/buy / codex: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/only / code: 2
- event/plan / codex: 2
- selection/enchant / codex: 2
- selection/take into my hand / code: 2
- combat/plan-choice+potion-lethal / jev: 1
- event/act-plan / codex: 1
- map/route-change / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 5 层 combat/plan-choice+potion: Jev chose plan 5/5 (翻越撑击, 打击 -> 蛮兽, 生存者) with confidence 0.24; code rank - (rollout's best line, added) (0.24)
- 第 5 层 combat/plan-choice+potion: Jev chose plan 1/2 (end turn) with confidence 0.28; code rank 1 (0.28)
- 第 5 层 combat/plan-choice+potion: Jev chose plan 1/2 (带毒刺击 -> 蛮兽) with confidence 0.23; code rank 1 (0.23)
- 第 5 层 combat/plan-choice+potion: Jev chose plan 1/3 (防御, 防御, 生存者, 中和 -> 蛮兽) with confidence 0.28; code rank 1 (0.28)
- 第 14 层 combat/plan-choice: Jev chose plan 4/5 (猎杀者 -> 扭动虫 #1, 防御) with confidence 0.31; code rank 4 (0.31)
- 第 17 层 combat/plan-choice: Jev chose plan 3/7 (生存者, 串刺+ -> 仪式兽) with confidence 0.33; code rank 3 (0.33)
- 第 19 层 combat/plan-choice: Jev chose plan 2/2 (防御, 串刺+ -> 偷窃草蜢, 逃脱计划) with confidence 0.34; code rank 2 (0.34)
- 第 30 层 combat/plan-choice: Jev chose plan 2/6 (防御, 后空翻, 余像, 防御, 生存者, potion 污浊药水) with confidence 0.33; code rank 2 (0.33)
- 第 30 层 combat/plan-choice: Jev chose plan 3/8 (余像, 防御, 生存者, 打击 -> 盛碗虫（石）, potion 污浊药水) with confidence 0.20; code rank 3 (0.20)
- 第 30 层 combat/plan-choice: Jev chose plan 8/9 (带毒刺击 -> 盛碗虫（丝）, 中和+ -> 盛碗虫（丝）, 猎杀者 -> 盛碗虫（丝）) with confidence 0.25; code rank 8 (0.25)
