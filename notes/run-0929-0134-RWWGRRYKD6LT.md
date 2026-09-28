## 复盘：run RWWGRRYKD6LT — 阵亡，最高第 33 层

- 决策 490 个；Jev 调用 85 次，Claude 0 次，DeepSeek 48 次；token 257,774 入 / 4,092 出，约 $0.0110（Jev）；DeepSeek token 918,916 入（缓存命中 670,720，73%）/ 161,541 出；用时 31.4 分钟
- 决策者：code 265，jev-plan 92，jev 85，deepseek 48

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→61（-3），决策 code 6，jev 5，jev-plan 5
- 第 5 层 缩小甲虫: HP 61→61（-0），决策 jev 6，jev-plan 3，code 2
- 第 6 层 毛绒伏地虫: HP 67→66（-1），决策 jev 7，jev-plan 4，code 4
- 第 8 层 闪光贾克斯果/飞蝇菌子: HP 72→63（-9），决策 jev 7，jev-plan 5
- 第 8 层 闪光贾克斯果/飞蝇菌子: HP 63→48（-15），决策 code 6，jev 1，jev-plan 1
- 第 9 层 小啃兽: HP 54→54（-0），决策 jev 1
- 第 9 层 小啃兽: HP 54→34（-20），决策 jev-plan 5，code 4，jev 3
- 第 11 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 40→39（-1），决策 jev-plan 5，code 5，jev 4
- 第 12 层 异蛙寄生虫: HP 45→45（-0），决策 code 5，jev 1
- 第 12 层 异蛙寄生虫/扭动虫: HP 45→45（-0），决策 code 6，jev 2，jev-plan 2
- 第 14 层 蛮兽: HP 76→76（-0），决策 jev 2，jev-plan 2
- 第 14 层 蛮兽: HP 76→76（-0），决策 jev-plan 3，code 2，jev 1
- 第 14 层 蛮兽: HP 76→76（-0），决策 code 2
- 第 15 层 藤蔓蹒跚者: HP 82→80（-2），决策 code 6，jev 1，jev-plan 1
- 第 17 层 墨影幻灵: HP 86→56（-30），决策 code 18，jev-plan 3，jev 2
- 第 17 层 墨影幻灵: HP 56→8（-48），决策 code 12，jev 7，jev-plan 7
- 第 17 层 墨影幻灵: HP 8→8（-0），决策 code 1
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 71→69（-2），决策 jev 3，jev-plan 3，code 1
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 69→68（-1），决策 code 3，jev 1，jev-plan 1
- 第 20 层 地道虫: HP 74→74（-0），决策 jev-plan 2，jev 1
- 第 20 层 地道虫: HP 74→14（-60），决策 code 25，jev-plan 8，jev 7
- 第 22 层 虱虫之祖: HP 20→20（-0），决策 jev-plan 4，jev 3，code 2
- 第 22 层 虱虫之祖: HP 20→11（-9），决策 code 5，jev-plan 3，jev 2
- 第 23 层 寄生惧魔/胧光怪: HP 21→17（-4），决策 code 10，jev-plan 5，jev 3
- 第 25 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 50→52（+2），决策 code 5，jev-plan 4，jev 3
- 第 31 层 棘刺蟾蜍: HP 73→54（-19），决策 code 7，jev-plan 4，jev 2
- 第 33 层 火箭/碾碎爪: HP 94→13（-81），决策 jev-plan 12，code 10，jev 7

### 死亡战斗：第 33 层 火箭/碾碎爪
- T4 [code] combat/plan: code plan (only line): end turn; hp -18, dmg 0
- T5 [jev] combat/plan-choice: Jev chose plan 1/4 (与我一战！ -> 碾碎爪, 焚烧) with confidence 0.52; code rank 1 conf 0.52
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 焚烧
- T5 [code] combat/plan: code plan (only line): end turn; hp -15, dmg 0
- T6 [jev] combat/plan-choice: Jev chose plan 5/6 (双重打击 -> 火箭, 预备打击 -> 碾碎爪, 防御) with confidence 0.37; code rank 5 conf 0.37
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 预备打击 -> 碾碎爪
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T6 [code] combat/plan: code plan (only line): end turn; hp -17, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 41): 劫掠 -> 火箭, 狂宴+ -> 火箭, 打
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 32): 亮剑 -> 火箭, 狂宴+ -> 火箭, 打
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 血墙
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 92
- combat/plan / code: 82
- combat/plan-choice / jev: 59
- reward/claim / code: 41
- combat/plan-continue / code: 32
- map/route-follow / code: 26
- combat/plan-choice+potion / jev: 23
- combat/lethal / code: 22
- reward/card / deepseek: 16
- reward/proceed / code: 16
- event/choose / deepseek: 10
- shop/buy / deepseek: 7
- event/leave / code: 6
- rest/choose / deepseek: 6
- rest/proceed / code: 6
- selection/add / code: 5
- combat/end_turn / code: 4
- combat/least-loss / code: 4
- combat/plan-potion / code: 3
- map/route / code: 3
- map/route-plan / deepseek: 3
- selection/take into my hand / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- selection/add / jev: 2
- selection/upgrade / deepseek: 2
- shop/leave / code: 2
- shop/open / code: 2
- event/choose / jev: 1
- run/finalize / code: 1
- selection/add / deepseek: 1
- selection/choose / deepseek: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 5 层 combat/plan-choice+potion: Jev chose plan 4/4 (亮剑 -> 缩小甲虫, 血墙) with confidence 0.26; code rank 4 (0.26)
- 第 8 层 combat/plan-choice+potion: Jev chose plan 2/5 (打击 -> 闪光贾克斯果, 打击 -> 闪光贾克斯果, 防御) with confidence 0.29; code rank 2 (0.29)
- 第 8 层 combat/plan-choice+potion: Jev chose plan 6/6 (防御, 打击 -> 闪光贾克斯果, 亮剑 -> 飞蝇菌子, 打击 -> 闪光贾克斯果) with confidence 0.33; code rank - (rollout's best line, added) (0.33)
- 第 15 层 combat/plan-choice: Jev chose plan 1/5 (血墙, potion 易伤药水 -> 藤蔓蹒跚者, 无情猛攻 -> 藤蔓蹒跚者) with confidence 0.31; code rank 1 (0.31)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (血墙, 突破) with confidence 0.18; code rank 1 (0.18)
- 第 20 层 combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 地道虫, 头槌 -> 地道虫, 防御) with confidence 0.20; code rank 1 (0.20)
- 第 20 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 地道虫) with confidence 0.15; code rank 2 (0.15)
- 第 22 层 combat/plan-choice: Jev chose plan 3/4 (焚烧, 打击 -> 虱虫之祖, 踩踏, 坚毅) with confidence 0.32; code rank 3 (0.32)
- 第 25 层 combat/plan-choice: Jev chose plan 3/3 (上勾拳+ -> 盛碗虫（石）, 痛击+ -> 盛碗虫（蜜）, 狂宴+ -> 盛碗虫（蜜）) with confidence 0.26; code rank 3 (0.26)
- 第 27 层 event/choose: Jev chose 再撑一会 with confidence 0.11 (0.11)
- 第 33 层 combat/plan-choice: Jev chose plan 9/9 (飞剑回旋镖+, 上勾拳+ -> 碾碎爪, 劫掠 -> 碾碎爪) with confidence 0.23; code rank - (rollout's best line, added); HP guard: plan 9 (飞剑回旋镖+, 上勾拳+ ->  (0.23)
- 第 33 层 combat/plan-choice: Jev chose plan 4/8 (打击 -> 火箭, 打击 -> 碾碎爪, 耸肩无视) with confidence 0.16; code rank 4 (0.16)
- 第 33 层 combat/plan-choice: Jev chose plan 1/4 (与我一战！ -> 火箭, 防御) with confidence 0.28; code rank 1; HP guard: plan 1 (与我一战！ -> 火箭, 防御) loses 31 HP, more than 8 over the cheapest  (0.28)
