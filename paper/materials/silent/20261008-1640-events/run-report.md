## 复盘：run BJLTVSYXCSGS — 阵亡，最高第 42 层

- 决策 594 个；Jev 调用 111 次，Claude 0 次，大脑 41 次（codex 41）；token 567,047 入 / 5,942 出，约 $0.0241（Jev）；大脑 token 5,427,333 入（缓存命中 3,377,152，62%）/ 12,312 出；用时 33.9 分钟
- 决策者：code 281，jev-plan 147，jev 111，codex 55

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 56→50（-6），决策 code 9，jev 5，jev-plan 5
- 第 3 层 噬尸蛞蝓: HP 50→46（-4），决策 code 8，jev-plan 6，jev 4
- 第 6 层 海洋混混: HP 46→46（-0），决策 jev-plan 6，code 5，jev 4
- 第 7 层 气态炸弹/活雾: HP 46→26（-20），决策 code 12，jev-plan 9，jev 8
- 第 8 层 双尾鼠: HP 26→26（-0），决策 code 5，jev 2，jev-plan 2
- 第 9 层 潮湿邪教徒/钙化邪教徒: HP 26→22（-4），决策 jev-plan 10，jev 5，code 5
- 第 12 层 幽灵船: HP 22→15（-7），决策 jev 9，jev-plan 6，code 5
- 第 17 层 乐加维林族母: HP 43→14（-29），决策 jev 14，jev-plan 12，code 9
- 第 19 层 偷窃草蜢: HP 59→42（-17），决策 jev-plan 11，code 7，jev 5
- 第 22 层 盛碗虫（卵）/盛碗虫（石）: HP 42→36（-6），决策 code 11，jev-plan 6，jev 2
- 第 29 层 异螨: HP 65→43（-22），决策 jev-plan 8，jev 3，code 3
- 第 31 层 幼虫/直飞产卵虫/结实的卵: HP 43→37（-6），决策 code 10，jev-plan 5，jev 1
- 第 33 层 火箭/碾碎爪: HP 61→9（-52），决策 jev-plan 13，jev 8，code 6
- 第 35 层 活体盾/高塔炮手: HP 68→28（-40），决策 jev 3，jev-plan 3，code 3
- 第 37 层 咬人卷轴: HP 28→20（-8），决策 jev-plan 11，jev 5，code 5
- 第 38 层 战斗好伙伴V1.0: HP 20→21（+1），决策 code 8，jev-plan 3，jev 2
- 第 39 层 巨斧机器人: HP 21→12（-9），决策 code 14，jev-plan 13，jev 12
- 第 42 层 拳击构装体/方柱构装体: HP 12→0（-12），决策 code 22，jev 19，jev-plan 18

### 死亡战斗：第 42 层 拳击构装体/方柱构装体
- T2 [jev] combat/plan-choice: Jev chose plan 3/5 (防御, 后空翻+, 打击+ -> 方柱构装体 #1, 打击 -> 方柱构装体 #1, 蜃景+, 暴露 -> 拳击构装体) with confidence 0.56; code rank 3; SL explore (T2, the 3rd latest question befo conf 0.56
- T2 [jev] combat/plan-choice: Jev chose plan 4/4 (后空翻+, 蜃景+, 暴露 -> 拳击构装体, 打击+ -> 拳击构装体, 打击 -> 拳击构装体) with confidence 0.83; code rank 4 conf 0.83
- T2 [jev] combat/plan-choice: Jev chose plan 1/3 (打击+ -> 方柱构装体 #1, 暴露 -> 方柱构装体 #2, 打击 -> 方柱构装体 #2, 触媒+) with confidence 1.00; code rank 1; SL explore (the deviation's turn, T2): playing 蜃景+, conf 1.00
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 暴露 -> 拳击构装体
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击+ -> 拳击构装体
- T2 [jev] combat/plan-choice: Jev chose plan 1/2 (打击 -> 拳击构装体) with confidence 0.88; code rank 1 conf 0.88
- T2 [code] combat/plan: code plan (only line): end turn; hp -10, dmg 6
- T3 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 38): 独门技术, 带毒刺击 -> 拳击构装体, 防
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): 带毒刺击 -> 拳击构装体, 防御, 打击 -> 方柱构装体 #1
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): 打击 -> 方柱构装体 #1
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 147
- combat/plan-choice / jev: 87
- combat/plan / code: 75
- reward/claim / code: 43
- map/route-follow / code: 36
- combat/plan-continue / code: 29
- combat/lethal / code: 24
- reward/card / codex: 17
- reward/proceed / code: 16
- event/choose / codex: 13
- combat/least-loss / code: 12
- event/leave / code: 12
- selection/choose / jev: 12
- combat/plan-choice+potion / jev: 10
- shop/buy / codex: 9
- combat/end_turn / code: 6
- rest/plan / codex: 5
- rest/proceed / code: 5
- shop/leave / code: 5
- shop/open / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- shop/plan / codex: 3
- event/act-plan / codex: 2
- map/route-change / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/take into my hand / jev: 2
- combat/mod-lethal / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- shop/buy / code: 1
- shop/discard / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 蟾蜍蝌蚪 #1, 生存者, 打击 -> 蟾蜍蝌蚪 #1) with confidence 0.24; code rank 1 (0.24)
- 第 8 层 combat/plan-choice+potion: Jev chose to drink 精炼混沌, then re-plan (confidence 0.32) (0.32)
- 第 12 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.07; code rank - (rollout's best line, added) (0.07)
- 第 12 层 combat/plan-choice+potion: Jev chose plan 4/4 (防御, 防御) with confidence 0.21; code rank - (rollout's best line, added) (0.21)
- 第 12 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.06; code rank - (rollout's best line, added) (0.06)
- 第 12 层 selection/choose: Jev chose 晕眩 with confidence 0.31 (0.31)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (毒雾, 扫腿 -> 乐加维林族母, potion 再生药水) with confidence 0.08; code rank 1 (0.08)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (中和 -> 乐加维林族母) with confidence 0.14; code rank 2 (0.14)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.34; code rank 2 (0.34)
- 第 19 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 偷窃草蜢, 打击 -> 偷窃草蜢, 防御, 防御+, 防御) with confidence 0.11; code rank 2 (0.11)
- 第 42 层 combat/plan-choice: Jev chose plan 1/2 (打击+ -> 方柱构装体 #1, 毒雾, 毒雾) with confidence 0.20; code rank 1 (0.20)
- 第 42 层 selection/choose: Jev chose 弹跳药瓶 with confidence 0.25 (0.25)
- 第 42 层 selection/choose: Jev chose 弹跳药瓶 with confidence 0.24 (0.24)
