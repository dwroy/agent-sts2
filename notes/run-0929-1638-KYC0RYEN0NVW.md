## 复盘：run KYC0RYEN0NVW — 阵亡，最高第 28 层

- 决策 321 个；Jev 调用 59 次，Claude 0 次，DeepSeek 27 次；token 202,696 入 / 3,225 出，约 $0.0086（Jev）；DeepSeek token 592,446 入（缓存命中 386,304，65%）/ 73,684 出；用时 15.9 分钟
- 决策者：code 186，jev 59，jev-plan 42，deepseek 34

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→54（-10），决策 code 6，jev 3，jev-plan 3
- 第 4 层 淤泥旋螺: HP 60→53（-7），决策 code 5，jev-plan 4，jev 2
- 第 4 层 淤泥旋螺: HP 53→53（-0），决策 code 4
- 第 6 层 海洋混混: HP 53→53（-0），决策 jev 1
- 第 6 层 海洋混混: HP 53→49（-4），决策 jev 3，code 3，jev-plan 1
- 第 7 层 地精佣兵: HP 55→55（-0），决策 jev 3，jev-plan 1
- 第 7 层 卑鄙地精/地精佣兵/胖地精: HP 55→43（-12），决策 code 5，jev 4，jev-plan 3
- 第 9 层 花园幽灵鳗: HP 73→73（-0），决策 jev 1
- 第 9 层 花园幽灵鳗: HP 73→67（-6），决策 jev 3，jev-plan 2，code 1
- 第 9 层 花园幽灵鳗: HP 67→51（-16），决策 code 3，jev 3
- 第 9 层 花园幽灵鳗: HP 51→51（-0），决策 code 3，jev 2
- 第 14 层 骇鳗: HP 80→67（-13），决策 code 3，jev 2，jev-plan 2
- 第 14 层 骇鳗: HP 67→67（-0），决策 code 5，jev 3，jev-plan 1
- 第 17 层 灵魂异鱼: HP 80→80（-0），决策 jev 3，jev-plan 2，code 2
- 第 17 层 灵魂异鱼: HP 80→37（-43），决策 code 11，jev 7，jev-plan 5
- 第 17 层 灵魂异鱼: HP 37→34（-3），决策 code 3
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 72→54（-18），决策 jev-plan 3，jev 2，code 1
- 第 19 层 盛碗虫（卵）: HP 54→51（-3），决策 code 4
- 第 22 层 外骨骼虫: HP 57→57（-0），决策 jev 2，jev-plan 2，code 1
- 第 22 层 外骨骼虫: HP 57→48（-9），决策 code 5，jev 2，jev-plan 1
- 第 24 层 感染棱柱: HP 54→54（-0），决策 jev-plan 3，jev 2，code 1
- 第 24 层 感染棱柱: HP 54→35（-19），决策 code 2，jev 2
- 第 24 层 感染棱柱: HP 35→24（-11），决策 jev 2，jev-plan 2，code 2
- 第 24 层 感染棱柱: HP 24→2（-22），决策 code 5，jev 3，jev-plan 3
- 第 28 层 残杀千足虫: HP 56→56（-0），决策 jev 1
- 第 28 层 残杀千足虫: HP 56→16（-40），决策 code 5，jev-plan 4，jev 2

### 死亡战斗：第 28 层 残杀千足虫
- T1 [jev] combat/plan-choice: Jev chose plan 10/10 (燃烧, 防御, 打击 -> 残杀千足虫, 滚石) with confidence 0.56; code rank - (rollout's best line, added) conf 0.56
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 残杀千足虫
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 滚石
- T1 [code] combat/plan: code plan (only line): end turn; hp -7, dmg 0
- T2 [jev] combat/plan-choice: Jev chose plan 1/10 (与我一战！ -> 残杀千足虫, 飞剑回旋镖) with confidence 0.76; code rank 1 conf 0.76
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 飞剑回旋镖
- T2 [code] combat/plan: code plan (only line): end turn; hp -33, dmg 0
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 火焰屏障, 防御
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan / code: 53
- combat/plan-continue / jev-plan: 42
- combat/plan-choice / jev: 31
- reward/claim / code: 30
- combat/plan-choice+potion / jev: 26
- map/route-follow / code: 24
- combat/plan-continue / code: 13
- combat/lethal / code: 11
- reward/card / deepseek: 11
- reward/proceed / code: 11
- selection/exhaust / code: 9
- event/leave / code: 6
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- event/choose / deepseek: 5
- shop/buy / deepseek: 5
- selection/take into my hand / code: 4
- selection/add / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- combat/least-loss / code: 2
- chest/relic / code: 1
- combat/plan-choice+potion-lethal / jev: 1
- combat/plan-potion / code: 1
- event/act-plan / deepseek: 1
- map/route / code: 1
- map/route-follow / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：11 个
- 第 6 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.23; code rank 2 (0.23)
- 第 7 层 combat/plan-choice: Jev chose plan 1/2 (potion 敏捷药水, 坚毅+) with confidence 0.13; code rank 1 (0.13)
- 第 7 层 combat/plan-choice: Jev chose plan 1/2 (坚毅+) with confidence 0.09; code rank 1 (0.09)
- 第 7 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 地精佣兵, 打击 -> 地精佣兵) with confidence 0.14; code rank 1 (0.14)
- 第 9 层 combat/plan-choice: Jev chose plan 1/2 (剑柄打击 -> 花园幽灵鳗, 痛击 -> 花园幽灵鳗) with confidence 0.09; code rank 1 (0.09)
- 第 9 层 combat/plan-choice: Jev chose plan 3/3 (防御) with confidence 0.23; code rank 3 (0.23)
- 第 19 层 combat/plan-choice+potion: Jev chose plan 1/3 (燃烧+, 薪火之源) with confidence 0.30; code rank 1 (0.30)
- 第 22 层 selection/take into my hand: Jev chose 地狱之刃 with confidence 0.13 (0.13)
- 第 22 层 combat/plan-choice+potion: Jev chose plan 1/9 (打击 -> 外骨骼虫, 剑柄打击 -> 外骨骼虫, 剑柄打击 -> 外骨骼虫, 地狱之刃) with confidence 0.29; code rank 1 (0.29)
- 第 24 层 combat/plan-choice+potion: Jev chose plan 1/3 (闪电霹雳, 火焰屏障+) with confidence 0.28; code rank 1 (0.28)
- 第 24 层 combat/plan-choice+potion: Jev chose plan 2/4 (防御, 挑衅 -> 感染棱柱, 头槌+ -> 感染棱柱) with confidence 0.23; code rank 2 (0.23)
