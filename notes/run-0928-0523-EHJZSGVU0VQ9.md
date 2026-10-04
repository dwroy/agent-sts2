## 复盘：run EHJZSGVU0VQ9 — 阵亡，最高第 33 层

- 决策 372 个；Jev 调用 42 次，Claude 0 次，DeepSeek 0 次；token 81,280 入 / 1,816 出，约 $0.0035；用时 17.7 分钟
- 决策者：code 300，jev 42，jev-plan 30

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→55（-9），决策 code 5，jev-plan 3，jev 2
- 第 5 层 蟾蜍蝌蚪: HP 67→56（-11），决策 code 8
- 第 6 层 噬尸蛞蝓: HP 60→57（-3），决策 code 6
- 第 7 层 双尾鼠: HP 63→41（-22），决策 code 9，jev-plan 2，jev 1
- 第 9 层 化石追踪者: HP 47→26（-21），决策 code 4，jev 2，jev-plan 2
- 第 11 层 幽灵船: HP 32→19（-13），决策 jev 5，jev-plan 4，code 3
- 第 15 层 下水道蚌: HP 25→25（-0），决策 code 3，jev 1，jev-plan 1
- 第 15 层 下水道蚌: HP 25→22（-3），决策 code 4，jev 1
- 第 17 层 灵魂异鱼: HP 53→51（-2），决策 jev-plan 2，jev 1
- 第 17 层 灵魂异鱼: HP 51→24（-27），决策 code 17，jev-plan 2，jev 1
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 74→72（-2），决策 code 12，jev 1，jev-plan 1
- 第 22 层 地道虫: HP 88→88（-0），决策 code 9
- 第 22 层 地道虫: HP 88→64（-24），决策 code 4，jev-plan 4，jev 1
- 第 22 层 地道虫: HP 64→63（-1），决策 code 3
- 第 23 层 猎人杀手: HP 69→63（-6），决策 code 5，jev 1
- 第 23 层 猎人杀手: HP 63→26（-37），决策 code 8，jev-plan 3，jev 1
- 第 25 层 外骨骼虫: HP 60→52（-8），决策 code 10，jev-plan 2，jev 1
- 第 28 层 异螨: HP 84→84（-0），决策 code 5
- 第 28 层 异螨: HP 84→67（-17），决策 code 12
- 第 29 层 残杀千足虫: HP 73→30（-43），决策 code 13，jev 3，jev-plan 1
- 第 30 层 啃咬机: HP 35→33（-2），决策 code 2
- 第 30 层 啃咬机: HP 33→28（-5），决策 code 4，jev 3，jev-plan 1
- 第 33 层 火箭/碾碎爪: HP 65→7（-58），决策 code 17，jev 2，jev-plan 2

### 死亡战斗：第 33 层 火箭/碾碎爪
- T2 [code] combat/plan: code plan (only line): end turn; hp -3, dmg 0
- T3 [code] combat/plan: code plan (only distinct line): 打击 -> 碾碎爪, 血墙, 怨恨 -> 碾碎爪; hp -3, dmg 28
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 血墙
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 怨恨 -> 碾碎爪
- T3 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T4 [jev] combat/plan-choice: Jev chose plan 1/4 (痛击+ -> 火箭, 御血术 -> 火箭) with confidence 0.76; code rank 1 conf 0.76
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 御血术 -> 火箭
- T4 [code] combat/plan: code plan (only line): end turn; hp -34, dmg 0
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-8): 熔融之拳 -> 火箭, 打击 -> 碾碎爪, 踩踏
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 碾碎爪
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 踩踏
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-8): end turn

### 各类决策由谁做
- combat/plan / code: 83
- combat/plan-continue / code: 62
- reward/claim / code: 37
- combat/plan-continue / jev-plan: 30
- map/route / code: 28
- combat/plan-choice / jev: 25
- reward/proceed / code: 16
- combat/lethal / code: 13
- reward/card / code: 13
- event/leave / code: 8
- selection/exhaust / code: 6
- event/choose / jev: 5
- map/route / jev: 4
- rest/choose / code: 4
- rest/proceed / code: 4
- event/only / code: 3
- reward/card / jev: 3
- shop/buy / jev: 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- combat/plan-choice+potion / jev: 2
- combat/plan-guarded / code: 2
- selection/take into my hand / code: 2
- shop/buy / code: 2
- combat/end_turn / code: 1
- run/finalize / code: 1
- selection/upgrade / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：8 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (痛击+ -> 海洋混混, 防御) with confidence 0.17; code rank 1 (0.17)
- 第 4 层 shop/buy: Jev chose buy 狱火 (78g) with confidence 0.18 (0.18)
- 第 13 层 shop/buy: Jev chose buy 巨像 (72g) with confidence 0.18 (0.18)
- 第 15 层 reward/card: Jev chose 怨恨 (Attack, 0E) with confidence 0.34 (0.34)
- 第 18 层 event/choose: Jev chose 南瓜蜡烛 with confidence 0.28 (0.28)
- 第 20 层 event/choose: Jev chose 洗劫 with confidence 0.07 (0.07)
- 第 29 层 reward/card: Jev chose 御血术 (Attack, 1E) with confidence 0.32 (0.32)
- 第 31 层 shop/buy: Jev chose stop shopping with confidence 0.24 (0.24)
