## 复盘：run 4AWDPGCHQPKZ — 阵亡，最高第 40 层

- 决策 473 个；Jev 调用 72 次，Claude 0 次，大脑 37 次（codex 37）；token 438,576 入 / 4,116 出，约 $0.0186（Jev）；大脑 token 6,348,619 入（缓存命中 3,876,992，61%）/ 37,829 出；用时 46.4 分钟
- 决策者：code 249，jev-plan 99，jev 72，codex 53

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→55（-9，战后回复 +6），决策 code 8，jev 1，jev-plan 1
- 第 3 层 蟾蜍蝌蚪: HP 61→58（-3，战后回复 +6），决策 code 6，jev 1，jev-plan 1
- 第 5 层 噬尸蛞蝓: HP 64→60（-4，战后回复 +6），决策 jev-plan 4，code 4，jev 3
- 第 6 层 拳击构装体: HP 66→66（-0，战后回复 +6），决策 code 5，jev-plan 3，jev 2
- 第 7 层 下水道蚌: HP 72→70（-2，战后回复 +6），决策 code 5，jev-plan 4，jev 2
- 第 8 层 鬼祟珊瑚群: HP 76→25（-51，战后回复 +6），决策 code 8，jev-plan 6，jev 4
- 第 14 层 双尾鼠: HP 67→64（-3，战后回复 +6），决策 jev 5，jev-plan 4，code 3
- 第 17 层 乐加维林族母: HP 72→28（-44，战后回复 +6），决策 jev-plan 14，code 7，jev 6
- 第 19 层 偷窃草蜢: HP 74→61（-13，战后回复 +6），决策 code 7
- 第 21 层 盛碗虫（卵）/盛碗虫（石）: HP 64→52（-12，战后回复 +6），决策 jev-plan 3，code 3，jev 1
- 第 22 层 虱虫之祖: HP 60→38（-22，战后回复 +6），决策 code 8，jev-plan 4，jev 2
- 第 27 层 啃咬机: HP 40→38（-2，战后回复 +6），决策 jev 5，jev-plan 5，code 2
- 第 30 层 猎人杀手: HP 86→73（-13，战后回复 +6），决策 code 8，jev-plan 5，jev 3
- 第 31 层 异螨: HP 81→62（-19，战后回复 +6），决策 jev 7，jev-plan 7，code 5
- 第 33 层 火箭/碾碎爪: HP 88→11（-77，战后回复 +6），决策 code 14，jev-plan 13，jev 7
- 第 35 层 虔诚雕刻师: HP 76→66（-10，战后回复 +6），决策 code 7，jev 5，jev-plan 5
- 第 36 层 咬人卷轴: HP 74→67（-7，战后回复 +6），决策 jev-plan 5，code 5，jev 4
- 第 37 层 守护机器人/戳刺机器人/组装师: HP 75→74（-1，战后回复 +6），决策 jev 3，jev-plan 3，code 2
- 第 40 层 巨斧机器人: HP 67→0（-67），决策 jev-plan 12，jev 11，code 9

### 死亡战斗：第 40 层 巨斧机器人
- T4 [code] combat/plan: code plan (only line): end turn; hp -16, dmg 0
- T5 [jev] combat/plan-choice: Jev chose plan 7/7 (无情猛攻 -> 巨斧机器人, 上勾拳 -> 巨斧机器人) with confidence 0.91; code rank - (rollout's best line, added) conf 0.91
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 上勾拳 -> 巨斧机器人
- T5 [jev] combat/plan-choice: Jev chose plan 2/3 (闪电霹雳) with confidence 0.59; code rank 2 conf 0.59
- T5 [jev] combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.93; code rank 2 conf 0.93
- T6 [jev] combat/plan-choice: Jev chose plan 3/3 (防御, 血墙) with confidence 0.86; code rank 3 conf 0.86
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 血墙
- T6 [code] combat/plan: code plan (only line): end turn; hp -10, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 5): 羽化, 防御, 愤怒 -> 巨斧机器人
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): 防御, 愤怒 -> 巨斧机器人
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 巨斧机器人
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 99
- combat/plan-choice / jev: 62
- combat/plan / code: 53
- reward/claim / code: 46
- map/route-follow / code: 34
- combat/plan-continue / code: 32
- combat/lethal / code: 21
- reward/card / codex: 18
- reward/proceed / code: 18
- event/leave / code: 9
- shop/buy / codex: 9
- combat/plan-choice+potion / jev: 7
- combat/end_turn / code: 6
- event/choose / codex: 6
- rest/plan / codex: 5
- rest/proceed / code: 5
- combat/least-loss / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- shop/plan / codex: 3
- combat/plan-choice+potion-lethal / jev: 2
- event/act-plan / codex: 2
- event/plan / codex: 2
- map/route-change / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/remove / codex: 1
- selection/take into my hand / jev: 1
- selection/upgrade / codex: 1
- shop/buy / code: 1
- shop/discard / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：5 个
- 第 8 层 combat/plan-choice: Jev chose plan 3/3 (防御, 打击 -> 鬼祟珊瑚群, 打击 -> 鬼祟珊瑚群) with confidence 0.15; code rank 3 (0.15)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御, 战栗 -> 乐加维林族母, 打击 -> 乐加维林族母, 愤怒 -> 乐加维林族母) with confidence 0.26; code rank 2 (0.26)
- 第 33 层 combat/plan-choice: Jev chose plan 1/5 (耸肩无视, 战栗 -> 碾碎爪, potion 固化药水, potion 异鱼之油, 打击 -> 碾碎爪, 剑柄打击 -> 碾碎爪) with confidence 0.34; code rank 1 (0.34)
- 第 33 层 combat/plan-choice: Jev chose plan 1/4 (战栗 -> 碾碎爪, potion 固化药水, potion 异鱼之油, 打击 -> 碾碎爪, 剑柄打击 -> 碾碎爪) with confidence 0.22; code rank 1 (0.22)
- 第 40 层 combat/plan-choice: Jev chose plan 2/2 (potion 异鱼之油) with confidence 0.09; code rank 2 (0.09)
