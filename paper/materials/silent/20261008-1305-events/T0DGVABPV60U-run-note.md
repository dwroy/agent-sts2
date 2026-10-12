## 复盘：run T0DGVABPV60U — 阵亡，最高第 48 层

- 决策 1071 个；Jev 调用 292 次，Claude 0 次，大脑 45 次（codex 45）；token 1,573,908 入 / 16,731 出，约 $0.0668（Jev）；大脑 token 5,965,994 入（缓存命中 3,716,864，62%）/ 14,733 出；用时 55.1 分钟
- 决策者：code 460，jev 292，jev-plan 259，codex 60

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 56→50（-6），决策 code 15，jev-plan 7，jev 6
- 第 3 层 淤泥旋螺: HP 50→49（-1），决策 jev-plan 6，code 5，jev 2
- 第 4 层 蟾蜍蝌蚪: HP 49→49（-0），决策 code 8，jev-plan 7，jev 5
- 第 5 层 海洋混混/钙化邪教徒: HP 49→14（-35），决策 code 14，jev-plan 9，jev 8
- 第 8 层 幽灵船: HP 35→28（-7），决策 code 8，jev-plan 6，jev 4
- 第 13 层 下水道蚌: HP 70→70（-0），决策 code 14，jev 5，jev-plan 2
- 第 14 层 鬼祟珊瑚群: HP 70→54（-16），决策 code 9，jev-plan 6，jev 4
- 第 17 层 乐加维林族母: HP 54→46（-8），决策 jev 11，jev-plan 11，code 9
- 第 19 层 地道虫: HP 65→41（-24），决策 jev 12，jev-plan 8，code 1
- 第 20 层 偷窃草蜢: HP 41→34（-7），决策 jev 11，jev-plan 11，code 1
- 第 21 层 虱虫之祖: HP 34→33（-1），决策 jev 15，jev-plan 14，code 3
- 第 23 层 啃咬机: HP 33→17（-16），决策 jev 11，jev-plan 10，code 4
- 第 25 层 幼虫/直飞产卵虫/结实的卵: HP 38→18（-20），决策 jev-plan 15，jev 13，code 3
- 第 28 层 残杀千足虫: HP 39→1（-38），决策 jev 20，jev-plan 19，code 1
- 第 30 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 22→22（-0），决策 jev-plan 12，jev 6，code 6
- 第 31 层 异螨: HP 22→20（-2），决策 code 12，jev-plan 7，jev 5
- 第 33 层 无厌沙虫: HP 41→13（-28），决策 code 21，jev-plan 15，jev 10
- 第 35 层 活体盾/高塔炮手: HP 58→41（-17），决策 jev-plan 11，code 10，jev 9
- 第 43 层 虔诚雕刻师: HP 77→63（-14），决策 code 13，jev 6，jev-plan 6
- 第 45 层 猫头鹰法官: HP 63→51（-12），决策 code 23，jev 18，jev-plan 9
- 第 46 层 灵魂枢纽: HP 51→13（-38），决策 jev 20，code 19，jev-plan 16
- 第 48 层 实验体 #C67: HP 55→0（-55），决策 code 100，jev 91，jev-plan 52

### 死亡战斗：第 48 层 实验体 #C67
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 偏折
- T4 [code] combat/plan: code plan (only distinct line): 防御+; hp -10, dmg 9
- T4 [code] combat/plan: code plan (only line): end turn; hp -10, dmg 9
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-29): 小刀 -> 实验体 #C67, 打击 -> 实验体 #C67, 致命毒药+ -> 实验体 #C67, 紧勒 -> 实验体 #C67, 灵动步法
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 实验体 #C67
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 致命毒药+ -> 实验体 #C67
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-24): 灵动步法, 隐秘匕首, 小刀 -> 实验体 #C67, 小刀 -> 实验体 #C67
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 隐秘匕首
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-24): 小刀 -> 实验体 #C67, 小刀 -> 实验体 #C67
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 小刀 -> 实验体 #C67
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-24): 打击 -> 实验体 #C67
- T5 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 259
- combat/plan / code: 124
- combat/plan-choice+potion / jev: 123
- combat/plan-choice / jev: 117
- combat/plan-continue / code: 103
- reward/claim / code: 58
- map/route-follow / code: 42
- selection/choose / jev: 37
- combat/lethal / code: 31
- combat/least-loss / code: 26
- reward/card / codex: 21
- reward/proceed / code: 21
- combat/play / jev: 13
- combat/end_turn / code: 11
- shop/buy / codex: 11
- rest/plan / codex: 10
- rest/proceed / code: 10
- event/leave / code: 8
- event/choose / codex: 6
- shop/leave / code: 5
- shop/open / code: 4
- shop/plan / codex: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- event/act-plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/take into my hand / code: 2
- selection/take into my hand / jev: 2
- combat/mod-lethal / code: 1
- combat/sandpit-guard / code: 1
- event/only / code: 1
- event/plan / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/upgrade / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：42 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 海洋混混, 中和 -> 海洋混混, 防御, 打击 -> 海洋混混) with confidence 0.24; code rank 2 (0.24)
- 第 4 层 selection/choose: Jev chose 打击 with confidence 0.25 (0.25)
- 第 8 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 幽灵船, 打击 -> 幽灵船, 灵动步法+) with confidence 0.28; code rank - (rollout's best line, added) (0.28)
- 第 13 层 combat/plan-choice+potion: Jev chose to drink 攻击药水, then re-plan (confidence 0.25) (0.25)
- 第 14 层 combat/plan-choice: Jev chose plan 3/3 (防御, 生存者, 致命毒药 -> 鬼祟珊瑚群) with confidence 0.09; code rank 3 (0.09)
- 第 19 层 selection/choose: Jev chose 进阶之灾 with confidence 0.12 (0.12)
- 第 25 层 combat/plan-choice+potion: Jev chose plan 4/8 (打击+ -> 直飞产卵虫, 防御, 生存者, 带毒刺击 -> 直飞产卵虫) with confidence 0.27; code rank 4 (0.27)
- 第 25 层 selection/choose: Jev chose 炼制药水 with confidence 0.27 (0.27)
- 第 28 层 combat/plan-choice+potion: Jev chose plan 3/5 (打击 -> 残杀千足虫 (MIDDLE), 防御, 中和 -> 残杀千足虫 (BACK), 打击 -> 残杀千足虫 (MIDDLE), 咕嘟冒泡 -> 残杀千足虫 (FRONT), 防御) with confidence 0.29; code rank 3;  (0.29)
- 第 28 层 combat/play: Jev chose c0->e0 (Play 打击 on 残杀千足虫) with confidence 0.29 (0.29)
- 第 28 层 combat/play: Jev chose p0->e2 (Drink 毒药水 on 残杀千足虫) with confidence 0.18 (0.18)
- 第 30 层 combat/plan-choice: Jev chose plan 3/4 (防御, 弹跳药瓶, 致命毒药+ -> 盛碗虫（丝）) with confidence 0.31; code rank 3 (0.31)
- 第 35 层 selection/choose: Jev chose 防御 with confidence 0.29 (0.29)
- 第 45 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.25) (0.25)
- 第 45 层 selection/take into my hand: Jev chose 秘密武器 with confidence 0.25 (0.25)
