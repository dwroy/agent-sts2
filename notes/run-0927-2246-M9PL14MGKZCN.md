## 复盘：run M9PL14MGKZCN — 阵亡，最高第 33 层

- 决策 457 个；Jev 调用 120 次，Claude 0 次，DeepSeek 0 次；token 239,222 入 / 5,173 出，约 $0.0103；用时 17.8 分钟
- 决策者：code 258，jev 120，jev-plan 79

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→59（-5），决策 code 8，jev-plan 3，jev 2
- 第 5 层 小啃兽: HP 65→52（-13），决策 code 4，jev-plan 3，jev 2
- 第 7 层 异蛙寄生虫/扭动虫: HP 58→24（-34），决策 code 16，jev 5，jev-plan 3
- 第 9 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 54→50（-4），决策 code 4，jev 3，jev-plan 3
- 第 11 层 墨宝: HP 56→45（-11），决策 code 10，jev 1，jev-plan 1
- 第 14 层 小啃兽: HP 75→63（-12），决策 code 10，jev-plan 2，jev 1
- 第 15 层 树枝史莱姆（中）/飞蝇菌子: HP 69→60（-9），决策 jev 6，code 6，jev-plan 2
- 第 17 层 墨影幻灵: HP 80→9（-71），决策 jev 28，jev-plan 15，code 4
- 第 19 层 外骨骼虫: HP 67→54（-13），决策 code 7，jev 6，jev-plan 6
- 第 22 层 地道虫: HP 80→78（-2），决策 code 9，jev 7，jev-plan 6
- 第 23 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 80→46（-34），决策 code 24，jev-plan 6，jev 5
- 第 25 层 残杀千足虫: HP 76→40（-36），决策 code 13，jev 9，jev-plan 9
- 第 31 层 猎人杀手: HP 70→43（-27），决策 code 11，jev 6，jev-plan 6
- 第 33 层 火箭/碾碎爪: HP 73→6（-67），决策 jev 22，jev-plan 14，code 3
- 第 33 层 火箭/碾碎爪: HP 6→6（-0），决策 code 6

### 死亡战斗：第 33 层 火箭/碾碎爪
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 29): 耸肩无视, 拆卸+ -> 火箭, 打击 ->
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 30): 耸肩无视, 突破, 倾泻
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 30): 战斗专注, 突破, 倾泻
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-15): 拆卸+ -> 火箭, 倾泻
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 倾泻
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-15): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 79
- combat/plan / code: 77
- combat/plan-choice / jev: 53
- combat/plan-choice+potion / jev: 49
- combat/plan-continue / code: 35
- reward/claim / code: 31
- map/route / code: 27
- combat/lethal / code: 16
- reward/card / code: 13
- reward/proceed / code: 13
- event/leave / code: 9
- event/choose / jev: 8
- rest/choose / code: 6
- rest/proceed / code: 6
- combat/least-loss / code: 5
- map/route / jev: 5
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- shop/buy / jev: 3
- combat/end_turn / code: 2
- shop/buy / code: 2
- combat/play / jev: 1
- event/only / code: 1
- run/finalize / code: 1
- selection/add / code: 1
- selection/remove / code: 1
- selection/take into my hand / jev: 1
- selection/transform / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：23 个
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (耸肩无视, 剑柄打击 -> 墨影幻灵) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (剑柄打击 -> 墨影幻灵) with confidence 0.27; code rank 1 (0.27)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.17; code rank 1 (0.17)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.13; code rank 1 (0.13)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (耸肩无视, 耸肩无视) with confidence 0.08; code rank 1 (0.08)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (耸肩无视) with confidence 0.07; code rank 1 (0.07)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.19; code rank 1 (0.19)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.17; code rank 1 (0.17)
- 第 18 层 event/choose: Jev chose 南瓜蜡烛 with confidence 0.21 (0.21)
- 第 20 层 event/choose: Jev chose 接纳 with confidence 0.11 (0.11)
- 第 21 层 shop/buy: Jev chose buy 闪电霹雳 (49g) with confidence 0.14 (0.14)
- 第 21 层 shop/buy: Jev chose buy 残酷 (37g) with confidence 0.12 (0.12)
- 第 22 层 combat/plan-choice: Jev chose plan 1/2 (防御, 防御) with confidence 0.17; code rank 1 (0.17)
