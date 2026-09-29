## 复盘：run UNRLW0W3XWLD — 阵亡，最高第 33 层

- 决策 466 个；Jev 调用 65 次，Claude 0 次，DeepSeek 31 次；token 207,390 入 / 2,962 出，约 $0.0088（Jev）；DeepSeek token 775,110 入（缓存命中 495,616，64%）/ 96,327 出；用时 23.4 分钟
- 决策者：code 252，jev-plan 106，jev 65，deepseek 43

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→55（-9，战后回复 +6），决策 code 5，jev-plan 3，jev 2
- 第 3 层 蟾蜍蝌蚪: HP 61→45（-16，战后回复 +6），决策 jev-plan 6，code 4，jev 3
- 第 4 层 噬尸蛞蝓: HP 51→49（-2，战后回复 +6），决策 code 7，jev-plan 2，jev 1
- 第 5 层 海洋混混/钙化邪教徒: HP 55→40（-15，战后回复 +6），决策 code 8，jev-plan 4，jev 2
- 第 7 层 卑鄙地精/地精佣兵/胖地精: HP 38→22（-16，战后回复 +6），决策 jev-plan 11，code 9，jev 5
- 第 12 层 鬼祟珊瑚群: HP 76→52（-24，战后回复 +6），决策 jev-plan 11，code 11，jev 4
- 第 15 层 花园幽灵鳗: HP 80→76（-4，战后回复 +4），决策 code 10，jev 6，jev-plan 5
- 第 17 层 瀑布巨兽: HP 80→10（-70，战后回复 +6），决策 code 22，jev-plan 20，jev 9
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 67→56（-11，战后回复 +6），决策 code 8，jev-plan 3，jev 1
- 第 20 层 偷窃草蜢: HP 62→44（-18，战后回复 +6），决策 code 6，jev-plan 2，jev 1
- 第 21 层 异螨: HP 50→46（-4，战后回复 +6），决策 jev-plan 10，code 5，jev 4
- 第 23 层 外骨骼虫: HP 52→51（-1，战后回复 +6），决策 jev 4，code 3
- 第 24 层 啃咬机: HP 57→41（-16，战后回复 +6），决策 jev-plan 3，code 3，jev 2
- 第 28 层 蜂群术士: HP 71→22（-49，战后回复 +6），决策 code 10，jev-plan 8，jev 5
- 第 31 层 棘刺蟾蜍: HP 80→49（-31，战后回复 +6），决策 code 6，jev 3，jev-plan 2
- 第 33 层 无厌沙虫: HP 79→0（-79），决策 code 22，jev-plan 16，jev 13

### 死亡战斗：第 33 层 无厌沙虫
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 无厌沙虫
- T8 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 34): 剑柄打击 -> 无厌沙虫, 愤怒 -> 无厌
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-21): 狂乱逃离, 祭品, 怨恨 -> 无厌沙虫, 愤怒 -> 无厌沙虫, 突破
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 祭品
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 43): 剑柄打击 -> 无厌沙虫, 愤怒 -> 无厌
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 34): 战斗专注, 愤怒 -> 无厌沙虫, 突破, 
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): 怨恨 -> 无厌沙虫, 愤怒 -> 无厌沙虫, 打击 -> 无厌沙虫, 坚毅
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 无厌沙虫
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 无厌沙虫
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 坚毅
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 106
- combat/plan / code: 63
- combat/plan-choice / jev: 63
- reward/claim / code: 44
- combat/plan-continue / code: 34
- map/route-follow / code: 29
- combat/lethal / code: 17
- reward/card / deepseek: 15
- reward/proceed / code: 15
- combat/end_turn / code: 10
- rest/plan / deepseek: 8
- rest/proceed / code: 8
- selection/add / code: 7
- shop/buy / deepseek: 7
- combat/least-loss / code: 6
- event/leave / code: 5
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/choose / deepseek: 2
- event/plan / deepseek: 2
- selection/upgrade / deepseek: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / deepseek: 2
- combat/plan-choice+potion / jev: 1
- event/act-plan / deepseek: 1
- map/route / code: 1
- map/route-follow / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/free-card / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- selection/take-planned / code: 1
- shop/discard / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：11 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 打击 -> 海洋混混, 防御) with confidence 0.17; code rank 1 (0.17)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (突破, 打击 -> 蟾蜍蝌蚪 #1, 打击 -> 蟾蜍蝌蚪 #2) with confidence 0.14; code rank 1 (0.14)
- 第 5 层 combat/plan-choice: Jev chose plan 1/8 (痛击 -> 钙化邪教徒, 突破, potion 爆炸安瓿) with confidence 0.32; code rank 1 (0.32)
- 第 7 层 combat/plan-choice: Jev chose plan 2/3 (突破, 打击 -> 地精佣兵, 打击 -> 地精佣兵) with confidence 0.30; code rank 2 (0.30)
- 第 12 层 combat/plan-choice: Jev chose plan 1/2 (怨恨 -> 鬼祟珊瑚群, 防御, 防御, 打击 -> 鬼祟珊瑚群) with confidence 0.14; code rank 1 (0.14)
- 第 12 层 combat/plan-choice: Jev chose plan 2/3 (邪眼, 突破, 打击 -> 鬼祟珊瑚群) with confidence 0.03; code rank 2 (0.03)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御) with confidence 0.02; code rank 2 (0.02)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 愤怒 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.33; code rank 1 (0.33)
- 第 20 层 combat/plan-choice: Jev chose plan 1/2 (突破, 打击 -> 偷窃草蜢, 剑柄打击 -> 偷窃草蜢, 头槌 -> 偷窃草蜢) with confidence 0.32; code rank 1 (0.32)
- 第 23 层 combat/plan-choice: Jev chose plan 2/8 (剑柄打击 -> 外骨骼虫 #1, 突破, 头槌 -> 外骨骼虫 #4) with confidence 0.34; code rank 2 (0.34)
- 第 31 层 combat/plan-choice: Jev chose plan 5/5 (打击 -> 棘刺蟾蜍, 旋风斩+) with confidence 0.24; code rank 5 (0.24)
