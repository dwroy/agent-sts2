## 复盘：run YG3HAFACLMAR — 阵亡，最高第 33 层

- 决策 407 个；Jev 调用 85 次，Claude 0 次，DeepSeek 0 次；token 175,552 入 / 3,926 出，约 $0.0075；用时 21.0 分钟
- 决策者：code 266，jev 84，jev-plan 56，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→55（-9），决策 code 9，jev-plan 2，jev 1，code-fallback 1
- 第 4 层 蟾蜍蝌蚪: HP 55→39（-16），决策 code 8，jev 1，jev-plan 1
- 第 6 层 淤泥旋螺: HP 43→35（-8），决策 jev 3，jev-plan 2，code 2
- 第 6 层 淤泥旋螺: HP 35→35（-0），决策 code 1
- 第 8 层 卑鄙地精/地精佣兵/胖地精: HP 65→45（-20），决策 code 8，jev-plan 7，jev 4
- 第 9 层 下水道蚌: HP 51→35（-16），决策 code 8，jev-plan 3，jev 2
- 第 14 层 气态炸弹/活雾: HP 63→49（-14），决策 code 7，jev-plan 4，jev 3
- 第 15 层 海洋混混/钙化邪教徒: HP 54→41（-13），决策 code 16
- 第 17 层 瀑布巨兽: HP 71→28（-43），决策 jev 16，jev-plan 12，code 7
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 67→50（-17），决策 code 7
- 第 21 层 地道虫: HP 76→52（-24），决策 code 17，jev-plan 2，jev 1
- 第 23 层 直飞产卵虫/结实的卵: HP 58→56（-2），决策 code 4，jev-plan 2，jev 1
- 第 23 层 幼虫/直飞产卵虫/结实的卵: HP 56→31（-25），决策 code 8，jev 1，jev-plan 1
- 第 29 层 残杀千足虫: HP 80→30（-50），决策 jev 7，jev-plan 1
- 第 29 层 残杀千足虫: HP 30→28（-2），决策 jev 4，jev-plan 2，code 1
- 第 30 层 外骨骼虫: HP 54→39（-15），决策 code 10
- 第 30 层 外骨骼虫: HP 39→37（-2），决策 code 8
- 第 31 层 猎人杀手: HP 43→22（-21），决策 code 7，jev-plan 5，jev 4
- 第 33 层 无厌沙虫: HP 52→2（-50），决策 jev 13，jev-plan 12，code 12

### 死亡战斗：第 33 层 无厌沙虫
- T7 [jev] combat/play: Jev chose p0 (Drink 精炼混沌) with confidence 0.24 conf 0.24
- T7 [code] combat/plan: code plan (+25.9 over next): 痛击 -> 无厌沙虫, 剑柄打击 -> 无厌沙虫; hp -5, dmg 26
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 剑柄打击 -> 无厌沙虫
- T7 [code] combat/plan: code plan (only line): end turn; hp -5, dmg 0
- T8 [code] combat/plan: code plan (only distinct line): 狂乱逃离, 狂乱逃离, 打击 -> 无厌沙虫; hp -1, dmg 13 [calc mismatch: solver says ending now kills, mod says safe]
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 狂乱逃离
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 无厌沙虫
- T8 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 61): 剑柄打击 -> 无厌沙虫, 与我一战！ ->
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): 双重打击 -> 无厌沙虫, 踩踏
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 踩踏
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): end turn

### 各类决策由谁做
- combat/plan / code: 64
- combat/plan-continue / code: 56
- combat/plan-continue / jev-plan: 56
- combat/plan-choice+potion / jev: 40
- reward/claim / code: 33
- map/route / code: 29
- combat/plan-choice / jev: 20
- reward/proceed / code: 14
- combat/lethal / code: 12
- reward/card / code: 8
- event/leave / code: 7
- rest/proceed / code: 6
- reward/card / jev: 6
- combat/end_turn / code: 5
- event/choose / jev: 5
- rest/choose / code: 5
- selection/add / code: 5
- shop/buy / jev: 5
- combat/least-loss / code: 3
- map/route / jev: 3
- shop/buy / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/only / code: 2
- selection/take into my hand / jev: 2
- combat/plan-choice / code-fallback: 1
- combat/play / jev: 1
- rest/choose / jev: 1
- run/finalize / code: 1
- selection/enchant / jev: 1
- selection/remove / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：24 个
- 第 1 层 event/choose: Jev chose 药瓶皮套 with confidence 0.09 (0.09)
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 海洋混混, 打击 -> 海洋混混, 防御) with confidence 0.31; code rank 1 (0.31)
- 第 6 层 selection/take into my hand: Jev chose 剑柄打击 with confidence 0.11 (0.11)
- 第 8 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.24; code rank 1 (0.24)
- 第 8 层 reward/card: Jev chose 御血术 (Attack, 1E) with confidence 0.23 (0.23)
- 第 9 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御) with confidence 0.14; code rank 1 (0.14)
- 第 12 层 shop/buy: Jev chose buy 踩踏 (37g) with confidence 0.23 (0.23)
- 第 12 层 shop/buy: Jev chose buy 狱火 (77g) with confidence 0.24 (0.24)
- 第 13 层 event/choose: Jev chose 读下封底 with confidence 0.07 (0.07)
- 第 19 层 reward/card: Jev chose 双重打击 (Attack, 1E) with confidence 0.12 (0.12)
- 第 20 层 shop/buy: Jev chose buy 力量药水 (50g) with confidence 0.25 (0.25)
- 第 22 层 event/choose: Jev chose 分享知识 with confidence 0.30 (0.30)
- 第 23 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 幼虫, 剑柄打击 -> 幼虫) with confidence 0.29; code rank 1; HP guard: plan 1 (痛击 -> 幼虫, 剑柄打击 -> 幼虫) loses 15 HP, more than 10 over th (0.29)
- 第 29 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.23; code rank 1 (0.23)
- 第 29 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.16; code rank 1 (0.16)
