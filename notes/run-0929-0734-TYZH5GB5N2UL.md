## 复盘：run TYZH5GB5N2UL — 阵亡，最高第 30 层

- 决策 376 个；Jev 调用 75 次，Claude 0 次，DeepSeek 38 次；token 305,718 入 / 4,601 出，约 $0.0130（Jev）；DeepSeek token 722,012 入（缓存命中 512,640，71%）/ 138,573 出；用时 23.5 分钟
- 决策者：code 186，jev-plan 77，jev 75，deepseek 38

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→58（-6），决策 code 8，jev-plan 4，jev 2
- 第 4 层 缩小甲虫: HP 64→61（-3），决策 code 4，jev-plan 3，jev 2
- 第 5 层 毛绒伏地虫: HP 67→66（-1），决策 code 4，jev 3，jev-plan 2
- 第 8 层 藤蔓蹒跚者: HP 72→66（-6），决策 jev 5，code 4，jev-plan 2
- 第 8 层 藤蔓蹒跚者: HP 66→53（-13），决策 code 3，jev 1，jev-plan 1
- 第 9 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 59→58（-1），决策 code 3，jev 1，jev-plan 1
- 第 12 层 方柱构装体: HP 63→52（-11），决策 jev 4，jev-plan 4，code 4
- 第 13 层 蛇行扼杀者/闪光贾克斯果: HP 58→51（-7），决策 code 6，jev-plan 5，jev 4
- 第 15 层 毛绒伏地虫/缩小甲虫: HP 57→48（-9），决策 jev-plan 5，code 5，jev 4
- 第 17 层 同族信徒/同族神官: HP 77→1（-76），决策 jev 18，jev-plan 17，code 13
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 63→51（-12），决策 code 6，jev 4，jev-plan 4
- 第 21 层 外骨骼虫: HP 57→48（-9），决策 jev 6，jev-plan 5，code 5
- 第 23 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 54→7（-47），决策 jev 8，jev-plan 8，code 5
- 第 25 层 虱虫之祖: HP 35→33（-2），决策 jev-plan 7，jev 4，code 2
- 第 25 层 虱虫之祖: HP 33→12（-21），决策 code 6，jev 3，jev-plan 2
- 第 30 层 感染棱柱: HP 41→8（-33），决策 code 9，jev-plan 7，jev 6

### 死亡战斗：第 30 层 感染棱柱
- T3 [jev] combat/plan-choice: Jev chose plan 4/4 (痛击 -> 感染棱柱, 双重打击 -> 感染棱柱, 痛殴 -> 感染棱柱) with confidence 0.94; code rank - (rollout's best line, added) conf 0.94
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 双重打击 -> 感染棱柱
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 痛殴 -> 感染棱柱
- T3 [code] combat/plan: code plan (only line): end turn; hp -14, dmg 0
- T4 [jev] combat/plan-choice: Jev chose plan 2/7 (防御+, 突破, 剑柄打击 -> 感染棱柱) with confidence 0.93; code rank 2 [calc mismatch: solver says ending now does not kill, mod says lethal] conf 0.93
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 突破
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 剑柄打击 -> 感染棱柱
- T4 [jev] combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.89; code rank 1 conf 0.89
- T5 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视, 挑衅 -> 感染棱柱, 耸肩无视
- T5 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视, 挑衅 -> 感染棱柱
- T5 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 剑柄打击 -> 感染棱柱
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 77
- combat/plan-choice / jev: 62
- combat/plan / code: 54
- reward/claim / code: 33
- map/route-follow / code: 25
- combat/lethal / code: 18
- combat/plan-choice+potion / jev: 13
- reward/card / deepseek: 13
- reward/proceed / code: 13
- event/choose / deepseek: 10
- event/leave / code: 9
- combat/plan-continue / code: 8
- combat/least-loss / code: 4
- rest/choose / deepseek: 4
- rest/proceed / code: 4
- combat/plan-potion / code: 3
- map/route-plan / deepseek: 3
- selection/add / deepseek: 3
- selection/transform / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- selection/confirm / code: 2
- map/route / code: 1
- run/finalize / code: 1
- selection/discard / code: 1
- selection/enchant / deepseek: 1
- selection/exhaust / code: 1
- selection/upgrade / deepseek: 1
- shop/buy / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：4 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 小啃兽, 防御, 防御) with confidence 0.29; code rank 2 (0.29)
- 第 23 层 combat/plan-choice: Jev chose plan 2/8 (耸肩无视, 打击 -> 盛碗虫（石）, potion 易伤药水 -> 盛碗虫（丝）, 剑柄打击 -> 盛碗虫（丝）) with confidence 0.22; code rank 2 (0.22)
- 第 23 层 combat/plan-choice: Jev chose plan 2/4 (打击 -> 盛碗虫（石）, 剑柄打击 -> 盛碗虫（丝）) with confidence 0.26; code rank 2 (0.26)
- 第 25 层 combat/plan-choice: Jev chose plan 3/3 (双重打击 -> 虱虫之祖, 打击 -> 虱虫之祖, 岩石铠甲) with confidence 0.34; code rank - (rollout's best line, added) (0.34)
