## 复盘：run RRMYC7MCSYX8 — 阵亡，最高第 33 层

- 决策 427 个；Jev 调用 78 次，Claude 0 次，DeepSeek 35 次；token 315,775 入 / 4,541 出，约 $0.0135（Jev）；DeepSeek token 839,597 入（缓存命中 529,664，63%）/ 142,292 出；用时 26.6 分钟
- 决策者：code 217，jev-plan 85，jev 78，deepseek 47

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→56（-8），决策 code 6，jev-plan 3，jev 2
- 第 4 层 蟾蜍蝌蚪: HP 62→59（-3），决策 jev 6，jev-plan 5，code 4
- 第 6 层 淤泥旋螺: HP 58→47（-11），决策 code 10，jev-plan 3，jev 1
- 第 8 层 卑鄙地精/地精佣兵/胖地精: HP 53→49（-4），决策 jev 7，code 6，jev-plan 5
- 第 9 层 拳击构装体: HP 55→45（-10），决策 code 7，jev 2，jev-plan 2
- 第 13 层 气态炸弹/活雾: HP 75→69（-6），决策 code 9，jev 8，jev-plan 8
- 第 14 层 骇鳗: HP 75→55（-20），决策 code 9，jev 3，jev-plan 3
- 第 15 层 海洋混混/钙化邪教徒: HP 61→41（-20），决策 jev-plan 6，code 6，jev 3
- 第 17 层 灵魂异鱼: HP 71→34（-37），决策 code 11，jev 8，jev-plan 8
- 第 19 层 外骨骼虫: HP 72→58（-14），决策 code 5，jev-plan 3，jev 2
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 64→56（-8），决策 jev 5，code 5，jev-plan 1
- 第 21 层 猎人杀手: HP 62→40（-22），决策 code 7，jev-plan 6，jev 4
- 第 23 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 46→17（-29），决策 jev-plan 11，jev 8，code 6
- 第 28 层 棘刺蟾蜍: HP 47→11（-36），决策 jev-plan 7，code 7，jev 5
- 第 33 层 火箭/碾碎爪: HP 63→9（-54），决策 jev-plan 14，jev 13，code 11

### 死亡战斗：第 33 层 火箭/碾碎爪
- T6 [code] selection/confirm: selected 1; nothing else worth discarding
- T6 [jev] combat/plan-choice: Jev chose plan 1/10 (剑柄打击 -> 火箭, 匕首雨, 亮剑 -> 碾碎爪, 坚毅) with confidence 0.50; code rank 1 conf 0.50
- T6 [jev] combat/plan-choice: Jev chose plan 1/3 (狂怒, 匕首雨, 亮剑 -> 碾碎爪, 坚毅) with confidence 0.47; code rank 1 conf 0.47
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 匕首雨
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 亮剑 -> 碾碎爪
- T6 [jev] combat/plan-choice: Jev chose plan 2/2 (坚毅) with confidence 0.90; code rank 2 conf 0.90
- T6 [code] combat/plan: code plan (only line): end turn; hp -7, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 139): 战斗专注, 预备打击 -> 碾碎爪, 突破
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): 预备打击 -> 火箭, 防御, 打击 -> 火箭
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火箭
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 85
- combat/plan / code: 66
- combat/plan-choice / jev: 59
- reward/claim / code: 36
- map/route-follow / code: 29
- combat/plan-continue / code: 20
- combat/lethal / code: 17
- combat/plan-choice+potion / jev: 17
- reward/card / deepseek: 16
- reward/proceed / code: 15
- event/leave / code: 7
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- shop/buy / deepseek: 6
- combat/least-loss / code: 3
- event/choose / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/plan / deepseek: 2
- selection/add / deepseek: 2
- selection/remove / deepseek: 2
- event/act-plan / deepseek: 1
- event/only / code: 1
- map/route / code: 1
- map/route-change / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/choose / deepseek: 1
- selection/confirm / code: 1
- selection/discard / code: 1
- selection/enchant / deepseek: 1
- selection/exhaust / code: 1
- selection/take into my hand / jev: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 8 层 combat/plan-choice+potion: Jev chose plan 1/2 (双重打击 -> 地精佣兵, 血墙) with confidence 0.28; code rank 1 (0.28)
- 第 13 层 combat/plan-choice+potion: Jev chose plan 2/2 (防御, 打击 -> 活雾) with confidence 0.28; code rank 2 (0.28)
- 第 13 层 combat/plan-choice+potion: Jev chose to drink 迅捷药水, then re-plan (confidence 0.19) (0.19)
- 第 13 层 combat/plan-choice: Jev chose plan 1/6 (双重打击 -> 气态炸弹, 燃烧+, 防御) with confidence 0.31; code rank 1 (0.31)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (燃烧+, 突破) with confidence 0.08; code rank 1 (0.08)
- 第 20 层 combat/plan-choice: Jev chose plan 3/3 (血墙) with confidence 0.32; code rank 3 (0.32)
- 第 23 层 combat/plan-choice: Jev chose plan 11/11 (燃烧+, 血墙, 亮剑 -> 盛碗虫（石）, potion 虚弱药水 -> 盛碗虫（石）, potion 爆炸安瓿) with confidence 0.31; code rank - (rollout's best line, added) (0.31)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.34; code rank 1 (0.34)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/5 (亮剑 -> 火箭, 战斗专注, 匕首雨, 双重打击 -> 火箭, 防御) with confidence 0.28; code rank 1 (0.28)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.07; code rank 1 (0.07)
