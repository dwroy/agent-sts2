## 复盘：run FA82FQHSJG2F — 未结束，最高第 14 层

- 决策 155 个；Jev 调用 20 次，Claude 0 次，DeepSeek 16 次；token 30,733 入 / 896 出，约 $0.0013（Jev）；DeepSeek token 266,216 入（缓存命中 188,672，71%）/ 38,974 出；用时 14.5 分钟
- 决策者：code 97，jev-plan 22，jev 20，deepseek 16

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→60（-4），决策 code 8，jev-plan 4，jev 2
- 第 3 层 淤泥旋螺: HP 66→62（-4），决策 jev-plan 3，code 3，jev 2
- 第 4 层 噬尸蛞蝓: HP 68→68（-0），决策 code 7，jev 1
- 第 6 层 幽灵船: HP 74→61（-13），决策 code 5，jev-plan 2，jev 1
- 第 7 层 鬼祟珊瑚群: HP 67→67（-0），决策 jev 1，jev-plan 1，code 1
- 第 7 层 鬼祟珊瑚群: HP 67→58（-9），决策 code 4，jev 3，jev-plan 2
- 第 7 层 鬼祟珊瑚群: HP 58→45（-13），决策 code 7，jev 1
- 第 9 层 潮湿邪教徒/钙化邪教徒: HP 68→43（-25），决策 code 13，jev-plan 9，jev 7
- 第 14 层 骇鳗: HP 69→69（-0），决策 jev 2，jev-plan 1，code 1

### 各类决策由谁做
- combat/plan / code: 29
- combat/plan-continue / jev-plan: 22
- combat/plan-choice / jev: 20
- reward/claim / code: 15
- combat/plan-continue / code: 12
- map/route-follow / code: 11
- combat/lethal / code: 6
- reward/card / deepseek: 6
- reward/proceed / code: 6
- event/choose / deepseek: 3
- event/leave / code: 3
- selection/discard / code: 3
- combat/plan-potion / code: 2
- map/route-plan / deepseek: 2
- rest/choose / deepseek: 2
- rest/proceed / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- selection/confirm / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1
- selection/upgrade / deepseek: 1
- shop/buy / code: 1
- shop/buy / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：2 个
- 第 7 层 combat/plan-choice: Jev chose plan 2/2 (耸肩无视, 预备打击 -> 鬼祟珊瑚群) with confidence 0.18; code rank 2 (0.18)
- 第 7 层 combat/plan-choice: Jev chose plan 4/4 (耸肩无视, 打击+ -> 鬼祟珊瑚群) with confidence 0.33; code rank - (rollout's best line, added) (0.33)
