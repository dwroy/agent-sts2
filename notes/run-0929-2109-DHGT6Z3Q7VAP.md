## 复盘：run DHGT6Z3Q7VAP — 阵亡，最高第 33 层

- 决策 362 个；Jev 调用 47 次，Claude 0 次，DeepSeek 30 次；token 160,546 入 / 2,185 出，约 $0.0068（Jev）；DeepSeek token 720,507 入（缓存命中 443,392，62%）/ 99,723 出；用时 21.7 分钟
- 决策者：code 202，jev-plan 72，jev 47，deepseek 41

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→61（-3），决策 code 8，jev-plan 4，jev 2
- 第 4 层 蟾蜍蝌蚪: HP 73→58（-15），决策 code 8，jev-plan 3，jev 2
- 第 6 层 噬尸蛞蝓: HP 57→52（-5），决策 jev-plan 5，code 5，jev 4
- 第 7 层 卑鄙地精/地精佣兵/胖地精: HP 58→28（-30），决策 jev-plan 5，code 5，jev 4
- 第 12 层 骇鳗: HP 84→31（-53），决策 code 14，jev-plan 7，jev 5
- 第 14 层 化石追踪者: HP 62→62（-0），决策 code 5，jev-plan 3，jev 2
- 第 15 层 气态炸弹/活雾: HP 68→64（-4），决策 code 4，jev-plan 3，jev 2
- 第 17 层 瀑布巨兽: HP 86→61（-25），决策 jev-plan 20，jev 11，code 10
- 第 19 层 外骨骼虫: HP 76→76（-0），决策 jev-plan 6，code 5，jev 3
- 第 20 层 盛碗虫（石）/盛碗虫（蜜）: HP 85→85（-0），决策 jev-plan 4，code 4，jev 2
- 第 22 层 棘刺蟾蜍: HP 92→69（-23），决策 code 7，jev 2
- 第 23 层 寄生惧魔/胧光怪: HP 75→75（-0），决策 code 9
- 第 30 层 直飞产卵虫/结实的卵: HP 84→84（-0），决策 code 9
- 第 33 层 火箭/碾碎爪: HP 90→7（-83），决策 jev-plan 12，code 10，jev 8

### 死亡战斗：第 33 层 火箭/碾碎爪
- T4 [code] combat/plan: code plan (only line): end turn; hp -18, dmg 0
- T5 [jev] combat/plan-choice: Jev chose plan 7/7 (头槌+ -> 碾碎爪, 火焰屏障) with confidence 0.66; code rank 7 conf 0.66
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 火焰屏障
- T5 [code] combat/plan: code plan (only line): end turn; hp -7, dmg 0
- T6 [jev] combat/plan-choice: Jev chose plan 2/3 (防御, 飞剑回旋镖+, 拆卸 -> 碾碎爪) with confidence 0.88; code rank 2 conf 0.88
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 飞剑回旋镖+
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 拆卸 -> 碾碎爪
- T6 [code] combat/plan: code plan (only line): end turn; hp -22, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): 防御+, 打击 -> 火箭, 防御
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火箭
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 72
- combat/plan / code: 53
- combat/plan-continue / code: 36
- reward/claim / code: 30
- map/route-follow / code: 29
- combat/plan-choice / jev: 25
- combat/plan-choice+potion / jev: 22
- reward/card / deepseek: 13
- reward/proceed / code: 13
- combat/lethal / code: 11
- event/leave / code: 7
- rest/plan / deepseek: 7
- rest/proceed / code: 7
- event/choose / deepseek: 5
- shop/buy / deepseek: 4
- selection/upgrade / deepseek: 3
- shop/leave / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- map/route-change / deepseek: 2
- shop/open / code: 2
- shop/plan / deepseek: 2
- event/act-plan / deepseek: 1
- event/plan / deepseek: 1
- map/route / code: 1
- map/route-follow / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/free-card / code: 1
- selection/remove / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 防御, 防御) with confidence 0.09; code rank 1 (0.09)
- 第 4 层 combat/plan-choice: Jev chose plan 3/3 (防御, 防御, 打击 -> 蟾蜍蝌蚪 #1) with confidence 0.33; code rank 3 (0.33)
- 第 7 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 地精佣兵, 打击 -> 地精佣兵, 双重打击 -> 地精佣兵) with confidence 0.26; code rank 2 (0.26)
- 第 12 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 骇鳗, 防御) with confidence 0.09; code rank 1; HP guard: plan 1 (痛击 -> 骇鳗, 防御) loses 19 HP, more than 8 over the cheapest line,  (0.09)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (火焰屏障+, 双重打击 -> 化石追踪者) with confidence 0.34; code rank 1 (0.34)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 2/3 (防御+, 痛击 -> 活雾) with confidence 0.33; code rank 2 (0.33)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (完美打击 -> 瀑布巨兽, 双重打击 -> 瀑布巨兽) with confidence 0.05; code rank 1 (0.05)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/3 (无情猛攻 -> 瀑布巨兽, 痛击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.20; code rank 1 (0.20)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (双重打击 -> 瀑布巨兽); plan 1 (打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 双重打击 -> 瀑布巨兽) is as good or better on every axis, playing it with confidence 0.27;  (0.27)
- 第 19 层 combat/plan-choice+potion: Jev chose plan 2/4 (打击 -> 外骨骼虫 #1, 双重打击 -> 外骨骼虫 #1, 痛击 -> 外骨骼虫 #3, 打击 -> 外骨骼虫 #1, 防御, 熔融之拳 -> 外骨骼虫 #3) with confidence 0.34; code rank 2 (0.34)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 2/4 (上勾拳+ -> 碾碎爪, 无情猛攻 -> 碾碎爪, 痛击+ -> 火箭, 飞剑回旋镖, 飞剑回旋镖+, 拆卸 -> 碾碎爪) with confidence 0.16; code rank 2 (0.16)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/2 (potion 爆炸安瓿) with confidence 0.11; code rank 1 (0.11)
- 第 33 层 combat/plan-choice+potion: Jev chose to drink 稳定血清 (confidence 0.08) (0.08)
