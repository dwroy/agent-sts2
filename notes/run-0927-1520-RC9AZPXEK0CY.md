## 复盘：run RC9AZPXEK0CY — 阵亡，最高第 27 层

- 决策 360 个；Jev 调用 56 次，Claude 0 次，DeepSeek 0 次；token 72,555 入 / 2,319 出，约 $0.0031；用时 8.7 分钟
- 决策者：code 274，jev 47，jev-plan 30，code-fallback 9

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→62（-2），决策 code 12，code-fallback 2，jev 1，jev-plan 1
- 第 3 层 毛绒伏地虫: HP 68→65（-3），决策 code 6，jev-plan 4，jev 2
- 第 4 层 小啃兽: HP 71→63（-8），决策 code 9，jev 1，jev-plan 1，code-fallback 1
- 第 6 层 蛮兽: HP 61→52（-9），决策 code 11，jev-plan 2，jev 1
- 第 8 层 利齿之眼/雾菇: HP 58→58（-0），决策 code 5，code-fallback 1
- 第 8 层 利齿之眼/雾菇: HP 58→50（-8），决策 code 4，code-fallback 1
- 第 12 层 树枝史莱姆（中）/蛇行扼杀者: HP 56→56（-0），决策 jev-plan 2，jev 1
- 第 12 层 蛇行扼杀者: HP 56→46（-10），决策 code 9，code-fallback 2
- 第 14 层 小啃兽: HP 52→42（-10），决策 jev-plan 5，jev 3，code 2
- 第 14 层 小啃兽: HP 42→36（-6），决策 code 5，jev-plan 2，jev 1
- 第 14 层 小啃兽: HP 36→36（-0），决策 code 2
- 第 15 层 闪光贾克斯果/飞蝇菌子: HP 42→26（-16），决策 code 8，jev 3，jev-plan 3，code-fallback 2
- 第 17 层 墨影幻灵: HP 56→49（-7），决策 code 7，jev-plan 3，jev 1
- 第 17 层 墨影幻灵: HP 49→33（-16），决策 code 5
- 第 17 层 墨影幻灵: HP 33→31（-2），决策 code 8
- 第 17 层 墨影幻灵: HP 31→8（-23），决策 code 11
- 第 19 层 偷窃草蜢: HP 66→66（-0），决策 code 3
- 第 19 层 偷窃草蜢: HP 66→49（-17），决策 code 4
- 第 22 层 外骨骼虫: HP 55→40（-15），决策 code 8，jev 2，jev-plan 2
- 第 22 层 外骨骼虫: HP 40→40（-0），决策 code 1
- 第 23 层 虱虫之祖: HP 46→46（-0），决策 code 2
- 第 23 层 虱虫之祖: HP 46→46（-0），决策 code 4，jev 1
- 第 23 层 虱虫之祖: HP 46→8（-38），决策 code 13，jev 2，jev-plan 2
- 第 23 层 虱虫之祖: HP 8→8（-0），决策 code 2
- 第 27 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 48→30（-18），决策 code 5，jev 2，jev-plan 2
- 第 27 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 30→18（-12），决策 code 5，jev 3，jev-plan 1
- 第 27 层 熟睡甲虫/盛碗虫（丝）: HP 18→13（-5），决策 code 6，jev 1

### 死亡战斗：第 27 层 熟睡甲虫/盛碗虫（丝）
- T5 [jev] combat/plan-choice: Jev chose plan 1/2 (防御+) with confidence 0.48; code rank 1 conf 0.48
- T5 [code] combat/plan: code plan (only line): end turn; hp -5, dmg 0
- T6 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 29): 剑柄打击+ -> 盛碗虫（丝）, 打击 ->
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 打击+ -> 熟睡甲虫, 飞剑回旋镖, 防御
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 飞剑回旋镖
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 防御
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan / code: 71
- combat/plan-continue / code: 61
- combat/plan-continue / jev-plan: 30
- reward/claim / code: 29
- combat/plan-choice / jev: 25
- map/route / code: 22
- combat/lethal / code: 15
- reward/proceed / code: 12
- combat/plan-choice / code-fallback: 9
- reward/card / code: 9
- selection/add / code: 9
- event/leave / code: 7
- event/choose / jev: 6
- combat/least-loss / code: 4
- combat/plan-guarded / code: 4
- map/route / jev: 4
- selection/choose / jev: 4
- selection/upgrade / code: 4
- shop/buy / code: 4
- rest/choose / code: 3
- rest/proceed / code: 3
- reward/card / jev: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/end_turn / code: 2
- selection/remove / code: 2
- shop/buy / jev: 2
- shop/leave / code: 2
- shop/open / code: 2
- event/only / code: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/enchant / jev: 1
- selection/exhaust / code: 1
- selection/upgrade / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：26 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 缩小甲虫, 防御) with confidence 0.26; code rank 1 (0.26)
- 第 2 层 reward/card: Jev chose skip the card reward with confidence 0.16 (0.16)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 毛绒伏地虫, 打击+ -> 毛绒伏地虫, 防御) with confidence 0.07; code rank 1 (0.07)
- 第 3 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 毛绒伏地虫, 防御+, 打击+ -> 毛绒伏地虫) with confidence 0.31; code rank 1 (0.31)
- 第 3 层 reward/card: Jev chose 双重打击 (Attack, 1E) with confidence 0.10 (0.10)
- 第 4 层 combat/plan-choice: Jev chose plan 1/3 (防御, 痛击 -> 小啃兽) with confidence 0.18; code rank 1 (0.18)
- 第 5 层 event/choose: Jev chose 坚持跋涉 with confidence 0.30 (0.30)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (打击+ -> 蛮兽, 双重打击 -> 蛮兽, 防御) with confidence 0.13; code rank 1 (0.13)
- 第 9 层 selection/add: Jev chose 熔融之拳 with confidence 0.30 (0.30)
- 第 11 层 event/choose: Jev chose 随便读个一段 with confidence 0.12 (0.12)
- 第 11 层 selection/enchant: Jev chose 血墙 with confidence 0.26 (0.26)
- 第 13 层 shop/buy: Jev chose buy 薪火之源 (77g) with confidence 0.10 (0.10)
- 第 13 层 shop/buy: Jev chose buy 武装 (50g) with confidence 0.21 (0.21)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (双重打击 -> 小啃兽, 熔融之拳 -> 小啃兽, 防御) with confidence 0.25; code rank 1 (0.25)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (痛击+ -> 小啃兽, 打击 -> 小啃兽, 防御) with confidence 0.17; code rank 1 (0.17)
