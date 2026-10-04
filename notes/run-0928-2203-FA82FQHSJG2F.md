## 复盘：run FA82FQHSJG2F — 阵亡，最高第 27 层

- 决策 453 个；Jev 调用 73 次，Claude 0 次，DeepSeek 33 次；token 125,278 入 / 3,178 出，约 $0.0054（Jev）；DeepSeek token 563,949 入（缓存命中 392,832，70%）/ 114,270 出；用时 33.5 分钟
- 决策者：code 278，jev 73，jev-plan 69，deepseek 33

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→60（-4），决策 code 8，jev-plan 4，jev 2
- 第 3 层 淤泥旋螺: HP 66→62（-4），决策 jev-plan 3，code 3，jev 2
- 第 4 层 噬尸蛞蝓: HP 68→68（-0），决策 code 7，jev 1
- 第 6 层 幽灵船: HP 74→61（-13），决策 code 5，jev-plan 2，jev 1
- 第 7 层 鬼祟珊瑚群: HP 67→67（-0），决策 jev 1，jev-plan 1，code 1
- 第 7 层 鬼祟珊瑚群: HP 67→58（-9），决策 code 4，jev 3，jev-plan 2
- 第 7 层 鬼祟珊瑚群: HP 58→45（-13），决策 code 7，jev 1
- 第 9 层 潮湿邪教徒/钙化邪教徒: HP 68→43（-25），决策 code 13，jev-plan 9，jev 7
- 第 14 层 骇鳗: HP 69→40（-29），决策 code 7，jev-plan 6，jev 5
- 第 17 层 灵魂异鱼: HP 72→72（-0），决策 jev 1
- 第 17 层 灵魂异鱼: HP 72→8（-64），决策 code 49，jev-plan 12，jev 11
- 第 19 层 偷窃草蜢: HP 72→61（-11），决策 code 15，jev-plan 4，jev 3
- 第 21 层 地道虫: HP 67→62（-5），决策 code 5，jev 3，jev-plan 3
- 第 21 层 地道虫: HP 62→62（-0），决策 code 3
- 第 22 层 异螨: HP 68→41（-27），决策 jev 3，code 2，jev-plan 1
- 第 22 层 异螨: HP 41→44（+3），决策 jev-plan 4，jev 3，code 3
- 第 23 层 啃咬机: HP 50→28（-22），决策 jev-plan 5，jev 3，code 2
- 第 23 层 啃咬机: HP 28→20（-8），决策 jev 6，jev-plan 3，code 2
- 第 23 层 啃咬机: HP 20→3（-17），决策 code 14，jev 3
- 第 27 层 胧光怪: HP 36→36（-0），决策 jev 1
- 第 27 层 寄生惧魔/胧光怪: HP 36→36（-0），决策 jev 4，jev-plan 4，code 3
- 第 27 层 寄生惧魔/胧光怪: HP 36→15（-21），决策 jev 5，code 4，jev-plan 4
- 第 27 层 寄生惧魔/胧光怪: HP 15→12（-3），决策 code 10，jev 4，jev-plan 2
- 第 27 层 寄生惧魔/胧光怪: HP 12→12（-0），决策 code 2
- 第 27 层 寄生惧魔/胧光怪: HP 12→12（-0），决策 code 1

### 死亡战斗：第 27 层 寄生惧魔/胧光怪
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-16): end turn

### 各类决策由谁做
- combat/plan / code: 102
- combat/plan-choice / jev: 73
- combat/plan-continue / jev-plan: 69
- combat/plan-continue / code: 45
- reward/claim / code: 30
- map/route-follow / code: 21
- combat/lethal / code: 13
- reward/card / deepseek: 12
- reward/proceed / code: 12
- shop/buy / deepseek: 7
- selection/confirm / code: 6
- combat/least-loss / code: 5
- event/choose / deepseek: 4
- event/leave / code: 4
- map/route-plan / deepseek: 4
- rest/choose / deepseek: 4
- rest/proceed / code: 4
- selection/exhaust / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- combat/plan-potion / code: 3
- selection/add / code: 3
- selection/discard / code: 3
- shop/buy / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/end_turn / code: 2
- selection/take into my hand / code: 2
- map/route / code: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：5 个
- 第 7 层 combat/plan-choice: Jev chose plan 2/2 (耸肩无视, 预备打击 -> 鬼祟珊瑚群) with confidence 0.18; code rank 2 (0.18)
- 第 7 层 combat/plan-choice: Jev chose plan 4/4 (耸肩无视, 打击+ -> 鬼祟珊瑚群) with confidence 0.33; code rank - (rollout's best line, added) (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (痛击+ -> 灵魂异鱼, 怨恨 -> 灵魂异鱼) with confidence 0.34; code rank 2 (0.34)
- 第 23 层 combat/plan-choice: Jev chose plan 1/3 (劫掠 -> 啃咬机, 邪眼, 防御+) with confidence 0.28; code rank 1 (0.28)
- 第 27 层 combat/plan-choice: Jev chose plan 1/3 (怨恨 -> 胧光怪, 防御+) with confidence 0.34; code rank 1 (0.34)
