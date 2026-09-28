## 复盘：run VNWR16YEJASM — 未结束，最高第 27 层

- 决策 308 个；Jev 调用 46 次，Claude 0 次，DeepSeek 34 次；token 127,758 入 / 2,092 出，约 $0.0055（Jev）；DeepSeek token 620,172 入（缓存命中 449,280，72%）/ 91,494 出；用时 17.3 分钟
- 决策者：code 176，jev-plan 52，jev 46，deepseek 34

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

### 各类决策由谁做
- combat/plan-continue / jev-plan: 52
- combat/plan / code: 42
- combat/plan-choice / jev: 38
- reward/claim / code: 28
- map/route-follow / code: 22
- selection/exhaust / code: 21
- combat/plan-continue / code: 15
- combat/lethal / code: 14
- reward/card / deepseek: 11
- reward/proceed / code: 11
- event/choose / deepseek: 9
- event/leave / code: 8
- combat/plan-choice+potion / jev: 6
- rest/choose / deepseek: 4
- rest/proceed / code: 4
- map/route-plan / deepseek: 3
- shop/buy / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- selection/upgrade / deepseek: 2
- combat/end_turn / code: 1
- event/choose / jev: 1
- map/route / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- shop/buy / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：7 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/2 (痛击 -> 噬尸蛞蝓, 防御) with confidence 0.16; code rank 2 (0.16)
- 第 9 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.22; code rank 2 (0.22)
- 第 9 层 combat/plan-choice: Jev chose plan 2/6 (防御, 突破, 熔融之拳 -> 地精佣兵, potion 鲜血药水) with confidence 0.30; code rank 2 (0.30)
- 第 23 层 combat/plan-choice: Jev chose plan 2/2 (毒素, 防御, 防御) with confidence 0.09; code rank 2 (0.09)
- 第 23 层 combat/plan-choice: Jev chose plan 1/2 (放血, 打击 -> 异螨, 打击 -> 异螨) with confidence 0.16; code rank 1 (0.16)
- 第 23 层 combat/plan-choice: Jev chose plan 1/2 (拆卸 -> 异螨) with confidence 0.13; code rank 1 (0.13)
- 第 25 层 combat/plan-choice+potion: Jev chose plan 3/3 (耸肩无视) with confidence 0.32; code rank 3 (0.32)
