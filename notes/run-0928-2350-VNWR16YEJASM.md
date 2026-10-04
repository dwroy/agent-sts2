## 复盘：run VNWR16YEJASM — 阵亡，最高第 33 层

- 决策 456 个；Jev 调用 71 次，Claude 0 次，DeepSeek 42 次；token 210,884 入 / 3,318 出，约 $0.0090（Jev）；DeepSeek token 786,328 入（缓存命中 570,112，73%）/ 97,437 出；用时 25.1 分钟
- 决策者：code 264，jev-plan 79，jev 71，deepseek 42

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→44（-20），决策 code 8，jev-plan 6，jev 4
- 第 6 层 淤泥旋螺: HP 44→41（-3），决策 code 4，jev 1，jev-plan 1
- 第 7 层 蟾蜍蝌蚪: HP 47→40（-7），决策 code 5，jev 2，jev-plan 2
- 第 9 层 卑鄙地精/地精佣兵/胖地精: HP 68→63（-5），决策 jev-plan 7，code 7，jev 4
- 第 11 层 化石追踪者: HP 71→59（-12），决策 code 3，jev 1，jev-plan 1
- 第 15 层 噬尸蛞蝓: HP 56→41（-15），决策 code 5，jev 3，jev-plan 2
- 第 17 层 乐加维林族母: HP 74→34（-40），决策 code 12，jev-plan 10，jev 7
- 第 19 层 偷窃草蜢: HP 77→76（-1），决策 code 3，jev 1，jev-plan 1
- 第 19 层 偷窃草蜢: HP 76→76（-0），决策 jev 1，jev-plan 1，code 1
- 第 19 层 偷窃草蜢: HP 76→76（-0），决策 code 4
- 第 19 层 偷窃草蜢: HP 60→60（-0），决策 jev-plan 2，jev 1，code 1
- 第 19 层 偷窃草蜢: HP 60→60（-0），决策 code 4
- 第 19 层 偷窃草蜢: HP 60→60（-0），决策 code 1
- 第 22 层 盛碗虫（石）/盛碗虫（蜜）: HP 84→83（-1），决策 jev-plan 3，jev 1，code 1
- 第 22 层 盛碗虫（石）/盛碗虫（蜜）: HP 79→79（-0），决策 jev 1，jev-plan 1，code 1
- 第 22 层 盛碗虫（蜜）: HP 79→79（-0），决策 jev-plan 2，jev 1，code 1
- 第 22 层 盛碗虫（蜜）: HP 79→79（-0），决策 code 1
- 第 23 层 异螨: HP 84→83（-1），决策 jev 2，jev-plan 1，code 1
- 第 23 层 异螨: HP 80→77（-3），决策 jev-plan 4，jev 2，code 1
- 第 23 层 异螨: HP 74→74（-0），决策 jev 3，code 1
- 第 23 层 异螨: HP 71→71（-0），决策 jev 1，jev-plan 1，code 1
- 第 23 层 异螨: HP 71→71（-0），决策 code 2
- 第 25 层 直飞产卵虫: HP 79→79（-0），决策 jev 2
- 第 25 层 直飞产卵虫/结实的卵: HP 79→79（-0），决策 jev 3，jev-plan 2
- 第 25 层 幼虫/直飞产卵虫: HP 71→71（-0），决策 jev 1
- 第 25 层 幼虫/直飞产卵虫: HP 71→71（-0），决策 jev-plan 3，jev 1，code 1
- 第 25 层 幼虫/直飞产卵虫: HP 71→71（-0），决策 code 2
- 第 27 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 79→79（-0），决策 jev-plan 2，jev 1，code 1
- 第 27 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 79→79（-0），决策 jev-plan 2，jev 1，code 1
- 第 27 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 76→73（-3），决策 jev-plan 3，jev 2，code 1
- 第 27 层 熟睡甲虫/盛碗虫（石）: HP 66→65（-1），决策 jev 1，jev-plan 1，code 1
- 第 27 层 熟睡甲虫: HP 55→52（-3），决策 jev 2，code 2，jev-plan 1
- 第 29 层 啃咬机: HP 84→83（-1），决策 jev-plan 2，jev 1，code 1
- 第 29 层 啃咬机: HP 77→77（-0），决策 jev 2，jev-plan 1
- 第 29 层 啃咬机: HP 66→66（-0），决策 code 4
- 第 29 层 啃咬机: HP 56→56（-0），决策 jev 2，code 2，jev-plan 1
- 第 29 层 啃咬机: HP 56→56（-0），决策 code 3
- 第 30 层 外骨骼虫: HP 64→63（-1），决策 jev 2，code 2，jev-plan 1
- 第 30 层 外骨骼虫: HP 63→63（-0），决策 jev-plan 2，jev 1，code 1
- 第 30 层 外骨骼虫: HP 52→52（-0），决策 code 2，jev 1，jev-plan 1
- 第 30 层 外骨骼虫: HP 52→49（-3），决策 code 3，jev-plan 3，jev 2
- 第 30 层 外骨骼虫: HP 46→45（-1），决策 jev 1，jev-plan 1，code 1
- 第 30 层 外骨骼虫: HP 45→45（-0），决策 code 3
- 第 33 层 无厌沙虫: HP 78→78（-0），决策 code 3
- 第 33 层 无厌沙虫: HP 78→77（-1），决策 jev-plan 2，jev 1，code 1
- 第 33 层 无厌沙虫: HP 69→69（-0），决策 jev 1，jev-plan 1，code 1
- 第 33 层 无厌沙虫: HP 47→47（-0），决策 code 3
- 第 33 层 无厌沙虫: HP 47→47（-0），决策 jev 2，jev-plan 1，code 1
- 第 33 层 无厌沙虫: HP 38→38（-0），决策 code 2，jev 1，jev-plan 1
- 第 33 层 无厌沙虫: HP 31→31（-0），决策 jev-plan 2，jev 1，code 1
- 第 33 层 无厌沙虫: HP 7→7（-0），决策 jev 1，jev-plan 1，code 1
- 第 33 层 无厌沙虫: HP 7→6（-1），决策 code 5

### 死亡战斗：第 33 层 无厌沙虫
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 30): 耸肩无视, 突破, 狂怒+, 防御
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 狂怒+, 防御
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 突破
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 79
- combat/plan / code: 72
- combat/plan-choice / jev: 63
- selection/exhaust / code: 44
- reward/claim / code: 35
- map/route-follow / code: 28
- combat/plan-continue / code: 23
- combat/lethal / code: 16
- reward/card / deepseek: 14
- reward/proceed / code: 14
- event/choose / deepseek: 10
- event/leave / code: 9
- combat/plan-choice+potion / jev: 6
- rest/choose / deepseek: 6
- rest/proceed / code: 6
- combat/least-loss / code: 4
- map/route-plan / deepseek: 3
- selection/remove / deepseek: 3
- shop/buy / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/end_turn / code: 2
- selection/upgrade / deepseek: 2
- event/choose / jev: 1
- map/route / code: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/take into my hand / jev: 1
- shop/buy / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/2 (痛击 -> 噬尸蛞蝓, 防御) with confidence 0.16; code rank 2 (0.16)
- 第 9 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.22; code rank 2 (0.22)
- 第 9 层 combat/plan-choice: Jev chose plan 2/6 (防御, 突破, 熔融之拳 -> 地精佣兵, potion 鲜血药水) with confidence 0.30; code rank 2 (0.30)
- 第 23 层 combat/plan-choice: Jev chose plan 2/2 (毒素, 防御, 防御) with confidence 0.09; code rank 2 (0.09)
- 第 23 层 combat/plan-choice: Jev chose plan 1/2 (放血, 打击 -> 异螨, 打击 -> 异螨) with confidence 0.16; code rank 1 (0.16)
- 第 23 层 combat/plan-choice: Jev chose plan 1/2 (拆卸 -> 异螨) with confidence 0.13; code rank 1 (0.13)
- 第 25 层 combat/plan-choice+potion: Jev chose plan 3/3 (耸肩无视) with confidence 0.32; code rank 3 (0.32)
- 第 27 层 combat/plan-choice: Jev chose plan 5/5 (耸肩无视, 拆卸 -> 盛碗虫（丝）, 熔融之拳 -> 盛碗虫（丝）) with confidence 0.34; code rank 5 (0.34)
- 第 30 层 combat/plan-choice: Jev chose plan 1/2 (熔融之拳 -> 外骨骼虫, 战斗专注+, 剑柄打击 -> 外骨骼虫) with confidence 0.23; code rank 1 (0.23)
- 第 30 层 combat/plan-choice: Jev chose plan 1/2 (突破, 耸肩无视) with confidence 0.01; code rank 1 (0.01)
- 第 33 层 combat/plan-choice: Jev chose plan 1/6 (耸肩无视+, 狂乱逃离, 熔融之拳 -> 无厌沙虫) with confidence 0.30; code rank 1 (0.30)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (狂乱逃离, 熔融之拳 -> 无厌沙虫) with confidence 0.19; code rank 2 (0.19)
- 第 33 层 combat/plan-choice: Jev chose plan 1/5 (拆卸 -> 无厌沙虫, 耸肩无视, 防御) with confidence 0.19; code rank 1 (0.19)
