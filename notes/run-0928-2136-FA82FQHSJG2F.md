## 复盘：run FA82FQHSJG2F — 未结束，最高第 9 层

- 决策 107 个；Jev 调用 11 次，Claude 0 次，DeepSeek 10 次；token 17,713 入 / 502 出，约 $0.0008（Jev）；DeepSeek token 167,511 入（缓存命中 118,784，71%）/ 28,537 出；用时 6.1 分钟
- 决策者：code 74，jev-plan 12，jev 11，deepseek 10

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→60（-4），决策 code 8，jev-plan 4，jev 2
- 第 3 层 淤泥旋螺: HP 66→62（-4），决策 jev-plan 3，code 3，jev 2
- 第 4 层 噬尸蛞蝓: HP 68→68（-0），决策 code 7，jev 1
- 第 6 层 幽灵船: HP 74→61（-13），决策 code 5，jev-plan 2，jev 1
- 第 7 层 鬼祟珊瑚群: HP 67→67（-0），决策 jev 1，jev-plan 1，code 1
- 第 7 层 鬼祟珊瑚群: HP 67→58（-9），决策 code 4，jev 3，jev-plan 2
- 第 7 层 鬼祟珊瑚群: HP 58→45（-13），决策 code 7，jev 1
- 第 9 层 潮湿邪教徒/钙化邪教徒: HP 68→68（-0），决策 code 4

### 各类决策由谁做
- combat/plan / code: 21
- reward/claim / code: 13
- combat/plan-continue / jev-plan: 12
- combat/plan-choice / jev: 11
- combat/plan-continue / code: 11
- map/route-follow / code: 7
- combat/lethal / code: 5
- reward/card / deepseek: 5
- reward/proceed / code: 5
- selection/discard / code: 3
- combat/plan-potion / code: 2
- event/choose / deepseek: 2
- event/leave / code: 2
- map/route-plan / deepseek: 1
- selection/confirm / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1
- shop/buy / code: 1
- shop/buy / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：2 个
- 第 7 层 combat/plan-choice: Jev chose plan 2/2 (耸肩无视, 预备打击 -> 鬼祟珊瑚群) with confidence 0.18; code rank 2 (0.18)
- 第 7 层 combat/plan-choice: Jev chose plan 4/4 (耸肩无视, 打击+ -> 鬼祟珊瑚群) with confidence 0.33; code rank - (rollout's best line, added) (0.33)
