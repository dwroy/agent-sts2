## 复盘：run Z6AMPPWHQ5CV — 阵亡，最高第 33 层

- 决策 425 个；Jev 调用 59 次，Claude 0 次，DeepSeek 43 次；token 148,747 入 / 2,694 出，约 $0.0064（Jev）；DeepSeek token 801,107 入（缓存命中 580,352，72%）/ 105,859 出；用时 21.6 分钟
- 决策者：code 270，jev 59，jev-plan 53，deepseek 43

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→61（-3），决策 code 8，jev-plan 4，jev 2
- 第 3 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 67→66（-1），决策 code 6，jev-plan 2，jev 1
- 第 4 层 毛绒伏地虫: HP 72→68（-4），决策 code 7，jev 2，jev-plan 1
- 第 9 层 墨宝: HP 74→68（-6），决策 code 6，jev-plan 4，jev 3
- 第 13 层 树枝史莱姆（中）/飞蝇菌子: HP 74→72（-2），决策 code 9，jev-plan 6，jev 3
- 第 14 层 劫掠者斧手/劫掠者暴徒/劫掠者追踪手: HP 78→73（-5），决策 code 4，jev 2，jev-plan 2
- 第 15 层 旧日雕像: HP 79→56（-23），决策 code 8，jev 4，jev-plan 4
- 第 17 层 仪式兽: HP 80→31（-49），决策 code 15，jev 11，jev-plan 8
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 71→71（-0），决策 jev 1，jev-plan 1，code 1
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 53→53（-0），决策 jev 2，code 2，jev-plan 1
- 第 19 层 盛碗虫（蜜）: HP 53→53（-0），决策 code 2
- 第 22 层 外骨骼虫: HP 59→59（-0），决策 code 2，jev 1，jev-plan 1
- 第 22 层 外骨骼虫: HP 48→48（-0），决策 code 2
- 第 24 层 感染棱柱: HP 54→52（-2），决策 jev 3，jev-plan 1，code 1
- 第 24 层 感染棱柱: HP 51→51（-0），决策 code 5
- 第 24 层 感染棱柱: HP 43→41（-2），决策 code 2，jev 1
- 第 24 层 感染棱柱: HP 36→36（-0），决策 jev 1，jev-plan 1，code 1
- 第 24 层 感染棱柱: HP 30→30（-0），决策 jev 1，jev-plan 1，code 1
- 第 24 层 感染棱柱: HP 19→19（-0），决策 code 2
- 第 27 层 异螨: HP 49→49（-0），决策 jev 2，jev-plan 1，code 1
- 第 27 层 异螨: HP 45→45（-0），决策 jev-plan 3，jev 2，code 1
- 第 27 层 异螨: HP 40→40（-0），决策 code 4
- 第 27 层 异螨: HP 40→40（-0），决策 code 1
- 第 29 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 70→70（-0），决策 jev 1，jev-plan 1，code 1
- 第 29 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 55→55（-0），决策 code 2，jev 2，jev-plan 2
- 第 29 层 熟睡甲虫/盛碗虫（丝）: HP 55→53（-2），决策 jev 1，jev-plan 1，code 1
- 第 29 层 熟睡甲虫: HP 53→53（-0），决策 jev-plan 2，jev 1，code 1
- 第 29 层 熟睡甲虫: HP 47→47（-0），决策 code 2
- 第 30 层 猎人杀手: HP 53→50（-3），决策 jev 3，code 3，jev-plan 1
- 第 30 层 猎人杀手: HP 50→50（-0），决策 code 4，jev 1，jev-plan 1
- 第 30 层 猎人杀手: HP 41→39（-2），决策 jev 1，jev-plan 1，code 1
- 第 30 层 猎人杀手: HP 24→24（-0），决策 code 2
- 第 33 层 知识恶魔: HP 54→54（-0），决策 code 4，jev 1
- 第 33 层 知识恶魔: HP 54→54（-0），决策 code 3，jev 1
- 第 33 层 知识恶魔: HP 49→49（-0），决策 code 4
- 第 33 层 知识恶魔: HP 30→30（-0），决策 jev 2，jev-plan 1，code 1
- 第 33 层 知识恶魔: HP 30→30（-0），决策 jev 2，jev-plan 1，code 1
- 第 33 层 知识恶魔: HP 29→27（-2），决策 jev 1，jev-plan 1，code 1
- 第 33 层 知识恶魔: HP 19→19（-0），决策 code 3

### 死亡战斗：第 33 层 知识恶魔
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 飞剑回旋镖, 双重打击 -> 知识恶魔
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 知识恶魔
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan / code: 72
- combat/plan-choice / jev: 55
- combat/plan-continue / jev-plan: 53
- reward/claim / code: 37
- selection/exhaust / code: 31
- combat/plan-continue / code: 29
- map/route-follow / code: 29
- combat/lethal / code: 18
- reward/card / deepseek: 14
- reward/proceed / code: 14
- event/choose / deepseek: 8
- event/leave / code: 7
- shop/buy / deepseek: 7
- rest/choose / deepseek: 5
- rest/proceed / code: 5
- combat/plan-choice+potion / jev: 4
- combat/plan-potion / code: 3
- selection/curse / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- sphere/clear / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- map/route-plan / deepseek: 2
- selection/add / deepseek: 2
- selection/remove / deepseek: 2
- combat/end_turn / code: 1
- map/route / code: 1
- run/finalize / code: 1
- selection/choose / deepseek: 1
- selection/enchant / deepseek: 1
- selection/upgrade / deepseek: 1
- shop/buy / code: 1
- sphere/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：7 个
- 第 15 层 combat/plan-choice: Jev chose plan 1/3 (飞剑回旋镖, 剑柄打击 -> 旧日雕像, 旋风斩) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice: Jev chose plan 4/4 (耸肩无视, 耸肩无视) with confidence 0.34; code rank 4 (0.34)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 仪式兽, 飞剑回旋镖) with confidence 0.21; code rank 1 (0.21)
- 第 17 层 combat/plan-choice: Jev chose plan 4/4 (耸肩无视, 血墙) with confidence 0.17; code rank 4 (0.17)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (血墙) with confidence 0.28; code rank 2 (0.28)
- 第 30 层 combat/plan-choice: Jev chose plan 1/2 (耸肩无视, potion 复制药水, 剑柄打击 -> 猎人杀手) with confidence 0.33; code rank 1 (0.33)
- 第 30 层 combat/plan-choice: Jev chose plan 1/2 (上勾拳 -> 猎人杀手, 御血术 -> 猎人杀手) with confidence 0.25; code rank 1 (0.25)
