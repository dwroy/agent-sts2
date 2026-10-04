## 复盘：run 0QSB9YV3UFCL — 阵亡，最高第 33 层

- 决策 527 个；Jev 调用 74 次，Claude 0 次，DeepSeek 32 次；token 376,823 入 / 3,611 出，约 $0.0160（Jev）；DeepSeek token 4,153,443 入（缓存命中 3,617,408，87%）/ 177,080 出；用时 31.6 分钟
- 决策者：code 281，jev-plan 127，jev 74，deepseek 45

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→59（-5，战后回复 +6），决策 jev-plan 5，code 5，jev 3
- 第 3 层 噬尸蛞蝓: HP 65→61（-4，战后回复 +6），决策 code 7，jev-plan 5，jev 3
- 第 4 层 淤泥旋螺: HP 67→66（-1，战后回复 +6），决策 jev-plan 4，code 4，jev 3
- 第 6 层 气态炸弹/活雾: HP 72→68（-4，战后回复 +6），决策 jev-plan 10，jev 8，code 8
- 第 8 层 噬尸蛞蝓: HP 74→31（-43，战后回复 +6），决策 code 10，jev-plan 8，jev 5
- 第 11 层 卑鄙地精/地精佣兵/胖地精: HP 37→27（-10，战后回复 +6），决策 jev 5，code 5，jev-plan 5
- 第 13 层 骇鳗: HP 57→26（-31，战后回复 +6），决策 code 17，jev-plan 4，jev 2
- 第 14 层 化石追踪者: HP 32→29（-3，战后回复 +6），决策 code 5，jev-plan 3，jev 2
- 第 15 层 双尾鼠: HP 35→31（-4，战后回复 +6），决策 jev-plan 5，code 5，jev 2
- 第 17 层 灵魂异鱼: HP 61→3（-58，战后回复 +6），决策 code 14，jev-plan 13，jev 8
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 65→64（-1，战后回复 +6），决策 code 10，jev-plan 5，jev 3
- 第 20 层 偷窃草蜢: HP 70→59（-11，战后回复 +6），决策 jev-plan 4，code 4，jev 2
- 第 22 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 65→12（-53，战后回复 +6），决策 jev-plan 19，code 11，jev 9
- 第 27 层 寄生惧魔/胧光怪: HP 13→9（-4，战后回复 +6），决策 jev-plan 7，code 7，jev 4
- 第 29 层 幼虫/直飞产卵虫/结实的卵: HP 15→4（-11，战后回复 +6），决策 code 11，jev-plan 5，jev 2
- 第 30 层 啃咬机: HP 10→1（-9，战后回复 +6），决策 code 31，jev 1
- 第 33 层 火箭/碾碎爪: HP 31→0（-31），决策 jev-plan 25，code 15，jev 12

### 死亡战斗：第 33 层 火箭/碾碎爪
- T7 [code] combat/end_turn: no playable cards; ending the turn
- T8 [jev] combat/plan-choice: Jev chose plan 2/3 (究极打击 -> 碾碎爪, 防御, 铁斩波 -> 碾碎爪, 坚毅) with confidence 0.91; code rank 2 conf 0.91
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 铁斩波 -> 碾碎爪
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 坚毅
- T8 [code] combat/end_turn: no playable cards; ending the turn
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 27): 耸肩无视, 燃烧, 打击 -> 火箭, 旋风
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-25): 燃烧, 打击 -> 火箭, 旋风斩, 愤怒 -> 火箭
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火箭
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 火箭
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-22): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 127
- combat/plan / code: 70
- combat/plan-choice / jev: 59
- combat/plan-continue / code: 53
- reward/claim / code: 42
- map/route-follow / code: 29
- combat/lethal / code: 16
- reward/card / deepseek: 16
- reward/proceed / code: 16
- combat/plan-choice+potion / jev: 12
- combat/end_turn / code: 11
- combat/least-loss / code: 9
- shop/buy / deepseek: 9
- event/leave / code: 7
- selection/add / code: 7
- event/choose / deepseek: 6
- rest/plan / deepseek: 4
- rest/proceed / code: 4
- selection/add / jev: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- selection/upgrade / deepseek: 2
- event/act-plan / deepseek: 1
- event/plan / deepseek: 1
- map/route-change / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/discard / code: 1
- selection/take into my hand / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 3 层 combat/plan-choice: Jev chose plan 3/3 (防御, 防御, 防御) with confidence 0.26; code rank 3 (0.26)
- 第 6 层 combat/plan-choice+potion: Jev chose plan 2/2 (打击 -> 活雾, 打击 -> 活雾, 防御) with confidence 0.29; code rank 2 (0.29)
- 第 8 层 combat/plan-choice: Jev chose plan 2/3 (打击 -> 噬尸蛞蝓 #2, 熔融之拳+ -> 噬尸蛞蝓 #2, 打击 -> 噬尸蛞蝓 #2) with confidence 0.23; code rank 2 (0.23)
- 第 14 层 combat/plan-choice: Jev chose plan 2/4 (痛击+ -> 化石追踪者, 飞剑回旋镖) with confidence 0.33; code rank 2; HP guard: plan 2 (痛击+ -> 化石追踪者, 飞剑回旋镖) loses 9 HP, more than 8 over the ch (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 灵魂异鱼, 飞剑回旋镖, potion 虚弱药水 -> 灵魂异鱼) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (岩石铠甲, 飞剑回旋镖, 熔融之拳+ -> 灵魂异鱼) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (地狱之刃) with confidence 0.08; code rank 1 (0.08)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (飞剑回旋镖, 呼唤, 防御) with confidence 0.04; code rank 1 [ending now kills by what the mod's lethal flag does not count: 22 HP lost in all (0.04)
- 第 19 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 盛碗虫（卵）, 防御, 薪火之源) with confidence 0.19; code rank 1 (0.19)
- 第 27 层 combat/plan-choice: Jev chose plan 1/3 (燃烧, 薪火之源, potion 力量药水, 愤怒 -> 胧光怪) with confidence 0.11; code rank 1 (0.11)
- 第 27 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.02; code rank 1 (0.02)
- 第 27 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 寄生惧魔, 飞剑回旋镖, 打击 -> 寄生惧魔, 头槌 -> 胧光怪, potion 消亡粉末 -> 胧光怪) with confidence 0.16; code rank 2 (0.16)
- 第 30 层 combat/plan-choice+potion: Jev chose to drink 赌徒特酿, then re-plan (confidence 0.23) (0.23)
