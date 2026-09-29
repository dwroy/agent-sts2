## 复盘：run YVYZ6QHA85FN — 阵亡，最高第 48 层

- 决策 767 个；Jev 调用 198 次，Claude 0 次，DeepSeek 48 次；token 815,975 入 / 11,402 出，约 $0.0347（Jev）；DeepSeek token 1,230,624 入（缓存命中 792,704，64%）/ 191,335 出；用时 42.1 分钟
- 决策者：code 348，jev 198，jev-plan 155，deepseek 66

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 75→70（-5，战后回复 +6），决策 jev-plan 7，code 6，jev 4
- 第 3 层 蟾蜍蝌蚪: HP 76→70（-6，战后回复 +6），决策 jev-plan 5，code 5，jev 3
- 第 5 层 噬尸蛞蝓: HP 71→71（-0，战后回复 +6），决策 code 7，jev-plan 6，jev 3
- 第 6 层 幽灵船: HP 77→72（-5，战后回复 +6），决策 jev-plan 9，code 8，jev 6
- 第 11 层 骇鳗: HP 78→60（-18，战后回复 +6），决策 code 16，jev-plan 8，jev 7
- 第 13 层 花园幽灵鳗: HP 91→80（-11，战后回复 +6），决策 code 9，jev-plan 7，jev 6
- 第 15 层 噬尸蛞蝓: HP 86→73（-13，战后回复 +6），决策 jev-plan 7，jev 6，code 3
- 第 17 层 灵魂异鱼: HP 79→28（-51，战后回复 +6），决策 code 22，jev-plan 13，jev 11
- 第 19 层 偷窃草蜢: HP 79→66（-13，战后回复 +6），决策 jev 6，jev-plan 6，code 3
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 72→72（-0，战后回复 +6），决策 code 5，jev-plan 4，jev 3
- 第 23 层 外骨骼虫: HP 83→69（-14，战后回复 +6），决策 jev 6，code 5，jev-plan 4
- 第 25 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 75→62（-13，战后回复 +6），决策 jev 14，jev-plan 9，code 9
- 第 28 层 感染棱柱: HP 91→77（-14，战后回复 +6），决策 jev 9，jev-plan 7，code 7
- 第 29 层 啃咬机: HP 88→90（+2，战后回复 +1），决策 jev 7，code 7，jev-plan 5
- 第 30 层 棘刺蟾蜍: HP 91→67（-24，战后回复 +6），决策 jev-plan 4，code 4，jev 2
- 第 33 层 火箭/碾碎爪: HP 91→32（-59，战后回复 +6），决策 jev 17，jev-plan 13，code 8
- 第 35 层 咬人卷轴: HP 80→56（-24，战后回复 +6），决策 code 5，jev 2
- 第 36 层 虔诚雕刻师: HP 62→49（-13，战后回复 +6），决策 jev 9，code 5，jev-plan 3
- 第 37 层 噪音机器人/守护机器人/戳刺机器人/电击机器人/组装师: HP 55→49（-6，战后回复 +6），决策 jev 13，jev-plan 6，code 6
- 第 38 层 拳击构装体/方柱构装体: HP 55→27（-28，战后回复 +6），决策 jev 8，jev-plan 6，code 4
- 第 39 层 失落之物/遗忘之物: HP 33→8（-25，战后回复 +6），决策 jev 17，jev-plan 9，code 9
- 第 43 层 青蛙骑士: HP 64→18（-46，战后回复 +6），决策 jev 13，code 8，jev-plan 7
- 第 46 层 电球头: HP 34→15（-19，战后回复 +6），决策 jev 11，code 9，jev-plan 3
- 第 48 层 永世沙漏: HP 46→0（-46），决策 jev 15，code 13，jev-plan 7

### 死亡战斗：第 48 层 永世沙漏
- T5 [jev] combat/plan-choice: Jev chose plan 1/4 (挑衅+ -> 永世沙漏, 熔融之拳 -> 永世沙漏, 剑柄打击 -> 永世沙漏, 头槌 -> 永世沙漏) with confidence 0.32; code rank 1 conf 0.32
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 熔融之拳 -> 永世沙漏
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 剑柄打击 -> 永世沙漏
- T5 [jev] combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.57; code rank 3 conf 0.57
- T6 [jev] combat/plan-choice: Jev chose plan 1/3 (打击 -> 永世沙漏, 旋风斩) with confidence 0.30; code rank 1 conf 0.30
- T6 [jev] combat/plan-choice: Jev chose plan 4/4 (坚定不移, 防御, 打击 -> 永世沙漏) with confidence 0.63; code rank 4 conf 0.63
- T6 [jev] combat/plan-choice: Jev chose plan 3/3 (坚毅) with confidence 0.59; code rank - (rollout's best line, added) [ending now kills by what the mod's lethal flag does not count: 6 HP lost conf 0.59
- T6 [jev] combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.83; code rank 2 conf 0.83
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 23): 剑柄打击 -> 永世沙漏, 打击 -> 永世
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 41): 剑柄打击 -> 永世沙漏, 防御, 打击 -
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 打击 -> 永世沙漏, 血墙+
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 血墙+

### 各类决策由谁做
- combat/plan-choice / jev: 184
- combat/plan-continue / jev-plan: 155
- combat/plan / code: 84
- reward/claim / code: 63
- map/route-follow / code: 42
- combat/plan-continue / code: 36
- combat/lethal / code: 33
- reward/card / deepseek: 24
- reward/proceed / code: 23
- selection/add / code: 17
- combat/plan-choice+potion / jev: 10
- shop/buy / deepseek: 10
- combat/end_turn / code: 9
- rest/plan / deepseek: 9
- rest/proceed / code: 9
- event/leave / code: 7
- event/choose / deepseek: 5
- shop/leave / code: 5
- combat/least-loss / code: 4
- shop/open / code: 4
- shop/plan / deepseek: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- selection/take into my hand / jev: 3
- selection/upgrade / deepseek: 3
- event/act-plan / deepseek: 2
- map/route / code: 2
- map/route-follow / deepseek: 2
- selection/add / deepseek: 2
- selection/remove / deepseek: 2
- event/plan / deepseek: 1
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：26 个
- 第 2 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 淤泥旋螺, 防御, 打击 -> 淤泥旋螺) with confidence 0.21; code rank 3 (0.21)
- 第 6 层 combat/plan-choice: Jev chose plan 6/6 (打击 -> 幽灵船, 剑柄打击 -> 幽灵船, 头槌 -> 幽灵船) with confidence 0.24; code rank 6 (0.24)
- 第 6 层 combat/plan-choice: Jev chose plan 1/4 (岩石铠甲, potion 鲜血药水) with confidence 0.12; code rank 1 (0.12)
- 第 6 层 combat/plan-choice: Jev chose plan 2/2 (防御, 箭雨 -> 幽灵船, 打击 -> 幽灵船) with confidence 0.24; code rank 2 (0.24)
- 第 15 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.28; code rank 2 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (岩石铠甲, 无情猛攻 -> 灵魂异鱼, 头槌 -> 灵魂异鱼) with confidence 0.13; code rank 1 (0.13)
- 第 17 层 combat/plan-choice: Jev chose plan 1/6 (头槌 -> 灵魂异鱼, 狱火, 打击 -> 灵魂异鱼) with confidence 0.25; code rank 1; HP guard: plan 1 (头槌 -> 灵魂异鱼, 狱火, 打击 -> 灵魂异鱼) loses 36 HP, more tha (0.25)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (邪眼, 呼唤, 打击 -> 灵魂异鱼) with confidence 0.27; code rank 2 (0.27)
- 第 19 层 combat/plan-choice: Jev chose plan 5/5 (头槌 -> 偷窃草蜢, 打击 -> 偷窃草蜢, 打击 -> 偷窃草蜢) with confidence 0.17; code rank 5 (0.17)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (岩石铠甲) with confidence 0.06; code rank 1 (0.06)
- 第 23 层 combat/plan-choice+potion: Jev chose plan 1/2 (end turn) with confidence 0.19; code rank 1 (0.19)
- 第 25 层 selection/take into my hand: Jev chose 凶恶 with confidence 0.12 (0.12)
- 第 25 层 combat/plan-choice: Jev chose plan 3/4 (无情猛攻 -> 盛碗虫（石）, 愤怒 -> 盛碗虫（石）, 耸肩无视) with confidence 0.19; code rank 3 (0.19)
- 第 25 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.11; code rank 1 (0.11)
- 第 33 层 combat/plan-choice: Jev chose plan 1/6 (防御, 狱火+, 上勾拳 -> 碾碎爪) with confidence 0.20; code rank 1 (0.20)
