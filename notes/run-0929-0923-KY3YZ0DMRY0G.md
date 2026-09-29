## 复盘：run KY3YZ0DMRY0G — 阵亡，最高第 33 层

- 决策 428 个；Jev 调用 65 次，Claude 0 次，DeepSeek 43 次；token 189,135 入 / 3,147 出，约 $0.0081（Jev）；DeepSeek token 821,518 入（缓存命中 590,208，72%）/ 128,801 出；用时 26.3 分钟
- 决策者：code 239，jev-plan 81，jev 65，deepseek 43

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→48（-16），决策 jev-plan 5，code 4，jev 3
- 第 3 层 蟾蜍蝌蚪: HP 54→42（-12），决策 code 8，jev 3，jev-plan 2
- 第 7 层 噬尸蛞蝓: HP 48→48（-0），决策 jev-plan 4，code 4，jev 2
- 第 9 层 海洋混混/钙化邪教徒: HP 54→49（-5），决策 jev 5，jev-plan 5，code 3
- 第 9 层 钙化邪教徒: HP 49→49（-0），决策 code 4，jev 1，jev-plan 1
- 第 12 层 骇鳗: HP 79→45（-34），决策 code 13，jev-plan 7，jev 4
- 第 15 层 地精佣兵: HP 51→51（-0），决策 jev 2，jev-plan 2，code 2
- 第 15 层 卑鄙地精/地精佣兵/胖地精: HP 51→54（+3），决策 code 4，jev-plan 3，jev 2
- 第 17 层 灵魂异鱼: HP 83→64（-19），决策 code 9，jev-plan 2，jev 1
- 第 17 层 灵魂异鱼: HP 64→6（-58），决策 code 15，jev-plan 12，jev 7
- 第 19 层 外骨骼虫: HP 68→68（-0），决策 code 5，jev 4，jev-plan 3
- 第 20 层 地道虫: HP 77→77（-0），决策 jev 1
- 第 20 层 地道虫: HP 77→72（-5），决策 code 8，jev-plan 3，jev 2
- 第 21 层 异螨: HP 81→81（-0），决策 jev 1
- 第 21 层 异螨: HP 81→78（-3），决策 jev-plan 7，code 7，jev 3
- 第 23 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 84→63（-21），决策 code 7，jev-plan 6，jev 4
- 第 30 层 感染棱柱: HP 90→90（-0），决策 jev 2，jev-plan 1
- 第 30 层 感染棱柱: HP 90→48（-42），决策 jev 6，jev-plan 6，code 6
- 第 31 层 幼虫/直飞产卵虫/结实的卵: HP 54→31（-23），决策 code 6，jev-plan 3，jev 2
- 第 31 层 幼虫/直飞产卵虫/结实的卵: HP 31→31（-0），决策 code 5，jev 1
- 第 33 层 无厌沙虫: HP 64→14（-50），决策 code 13，jev-plan 9，jev 6
- 第 33 层 无厌沙虫: HP 14→14（-0），决策 code 3

### 死亡战斗：第 33 层 无厌沙虫
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-8): 防御, 防御
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-8): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 81
- combat/plan / code: 78
- combat/plan-choice / jev: 56
- reward/claim / code: 35
- combat/plan-continue / code: 30
- map/route-follow / code: 28
- reward/proceed / code: 14
- combat/lethal / code: 13
- reward/card / deepseek: 13
- event/choose / deepseek: 9
- event/leave / code: 8
- shop/buy / deepseek: 7
- combat/plan-choice+potion / jev: 6
- rest/choose / deepseek: 6
- rest/proceed / code: 6
- selection/exhaust / code: 4
- combat/least-loss / code: 3
- map/route-plan / deepseek: 3
- selection/take into my hand / jev: 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- selection/remove / deepseek: 2
- selection/take into my hand / code: 2
- selection/upgrade / deepseek: 2
- shop/buy / code: 2
- combat/end_turn / code: 1
- combat/plan-potion / code: 1
- map/route / code: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：9 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 淤泥旋螺, 打击 -> 淤泥旋螺, 防御) with confidence 0.27; code rank 1 (0.27)
- 第 3 层 combat/plan-choice: Jev chose plan 3/4 (邪眼) with confidence 0.27; code rank 3 (0.27)
- 第 9 层 combat/plan-choice: Jev chose plan 3/3 (防御, 打击 -> 钙化邪教徒, 邪眼) with confidence 0.17; code rank 3 (0.17)
- 第 12 层 combat/plan-choice: Jev chose plan 3/3 (熔融之拳 -> 骇鳗, 邪眼); plan 1 (打击 -> 骇鳗, 熔融之拳 -> 骇鳗, 邪眼) is as good or better on every axis, playing it with confidence 0.22; code rank  (0.22)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (呼唤, 打击 -> 灵魂异鱼, 打击 -> 灵魂异鱼) with confidence 0.30; code rank 2 (0.30)
- 第 20 层 selection/take into my hand: Jev chose 踩踏 with confidence 0.30 (0.30)
- 第 21 层 combat/plan-choice+potion: Jev chose to drink 技能药水, then re-plan (confidence 0.26) (0.26)
- 第 21 层 combat/plan-choice: Jev chose plan 3/4 (毒素, 防御+, 熔融之拳 -> 异螨) with confidence 0.29; code rank 3 (0.29)
- 第 33 层 combat/plan-choice: Jev chose plan 3/5 (与我一战！+ -> 无厌沙虫, 双重打击 -> 无厌沙虫, 狂乱逃离, 坚毅) with confidence 0.13; code rank 3 (0.13)
