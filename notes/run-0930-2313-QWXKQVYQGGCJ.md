## 复盘：run QWXKQVYQGGCJ — 阵亡，最高第 30 层

- 决策 376 个；Jev 调用 54 次，Claude 0 次，DeepSeek 27 次；token 265,313 入 / 2,716 出，约 $0.0113（Jev）；DeepSeek token 3,688,470 入（缓存命中 3,411,328，92%）/ 159,837 出；用时 25.2 分钟
- 决策者：code 214，jev-plan 68，jev 54，deepseek 40

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 75→60（-15，战后回复 +6），决策 code 7，jev-plan 3，jev 2
- 第 3 层 噬尸蛞蝓: HP 66→66（-0，战后回复 +6），决策 jev-plan 5，code 5，jev 2
- 第 5 层 海洋混混: HP 72→58（-14，战后回复 +6），决策 code 5，jev 2，jev-plan 2
- 第 8 层 骇鳗: HP 91→76（-15，战后回复 +6），决策 code 14，jev-plan 5，jev 4
- 第 11 层 拳击构装体: HP 76→71（-5，战后回复 +6），决策 code 14，jev 4，jev-plan 2
- 第 12 层 花园幽灵鳗: HP 77→50（-27，战后回复 +6），决策 code 11，jev 5，jev-plan 4
- 第 14 层 双尾鼠: HP 56→56（-0，战后回复 +6），决策 code 1
- 第 17 层 灵魂异鱼: HP 89→49（-40，战后回复 +6），决策 jev-plan 13，jev 9，code 7
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 83→80（-3，战后回复 +6），决策 code 9，jev 2，jev-plan 1
- 第 20 层 外骨骼虫: HP 86→76（-10，战后回复 +6），决策 jev-plan 4，code 4，jev 3
- 第 21 层 猎人杀手: HP 82→54（-28，战后回复 +6），决策 jev-plan 8，code 5，jev 4
- 第 23 层 棘刺蟾蜍: HP 60→24（-36，战后回复 +6），决策 code 10，jev 3，jev-plan 2
- 第 28 层 啃咬机: HP 84→58（-26，战后回复 +6），决策 jev-plan 8，jev 5，code 5
- 第 29 层 蜂群术士: HP 64→4（-60，战后回复 +6），决策 code 8，jev-plan 8，jev 7
- 第 30 层 外骨骼虫: HP 10→0（-10），决策 code 5，jev-plan 3，jev 2

### 死亡战斗：第 30 层 外骨骼虫
- T1 [jev] combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 外骨骼虫 #2, 狱火, 防御, 拆卸+ -> 外骨骼虫 #2) with confidence 0.67; code rank 1 conf 0.67
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狱火
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 拆卸+ -> 外骨骼虫 #2
- T1 [jev] combat/plan-choice: Jev chose plan 1/3 (end turn) with confidence 0.48; code rank 1 conf 0.48
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 防御, 打击 -> 外骨骼虫 #2, potion 易伤药水 -> 外骨骼虫 #2, 双重打击+ -> 外骨骼虫 #2
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 外骨骼虫 #2
- T2 [code] combat/plan-continue: continuing the code-chosen plan: potion 易伤药水 -> 外骨骼虫 #2
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击+ -> 外骨骼虫 #2
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 68
- combat/plan / code: 46
- combat/plan-choice / jev: 45
- reward/claim / code: 38
- combat/plan-continue / code: 32
- map/route-follow / code: 26
- reward/card / deepseek: 14
- reward/proceed / code: 14
- combat/lethal / code: 12
- selection/confirm / code: 9
- combat/plan-choice+potion / jev: 8
- rest/plan / deepseek: 5
- rest/proceed / code: 5
- selection/exhaust / code: 5
- selection/upgrade / deepseek: 5
- shop/buy / deepseek: 5
- combat/end_turn / code: 4
- event/leave / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- event/choose / deepseek: 3
- shop/plan / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- event/act-plan / deepseek: 1
- map/route-change / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：5 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.14; code rank 1 (0.14)
- 第 5 层 combat/plan-choice+potion: Jev chose plan 1/2 (痛击 -> 海洋混混, 防御, 愤怒 -> 海洋混混) with confidence 0.34; code rank 1 (0.34)
- 第 5 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.11; code rank 1 (0.11)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (呼唤, 打击 -> 灵魂异鱼, 双重打击 -> 灵魂异鱼) with confidence 0.33; code rank 1 (0.33)
- 第 21 层 combat/plan-choice: Jev chose plan 2/3 (end turn) with confidence 0.32; code rank 2 (0.32)
