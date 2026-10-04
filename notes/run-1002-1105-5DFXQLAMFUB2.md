## 复盘：run 5DFXQLAMFUB2 — 胜利，最高第 48 层

- 决策 570 个；Jev 调用 83 次，Claude 0 次，DeepSeek 53 次；token 506,073 入 / 4,489 出，约 $0.0214（Jev）；DeepSeek token 7,396,477 入（缓存命中 6,958,976，94%）/ 360,076 出；用时 57.5 分钟
- 决策者：code 270，jev-plan 146，jev 83，deepseek 71

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→58（-6，战后回复 +6），决策 jev-plan 6，code 5，jev 3
- 第 4 层 海洋混混: HP 64→60（-4，战后回复 +6），决策 jev 6，jev-plan 6，code 1
- 第 5 层 蟾蜍蝌蚪: HP 66→58（-8，战后回复 +6），决策 jev-plan 5，jev 4，code 2
- 第 7 层 下水道蚌: HP 64→64（-0，战后回复 +6），决策 jev 4，code 4，jev-plan 2
- 第 9 层 拳击构装体: HP 70→65（-5，战后回复 +6），决策 jev-plan 6，jev 4，code 2
- 第 11 层 鬼祟珊瑚群: HP 71→51（-20，战后回复 +6），决策 jev-plan 7，jev 6，code 3
- 第 14 层 双尾鼠: HP 84→77（-7，战后回复 +6），决策 code 8，jev-plan 4，jev 2
- 第 15 层 花园幽灵鳗: HP 83→61（-22，战后回复 +6），决策 jev 6，jev-plan 6，code 1
- 第 17 层 灵魂异鱼: HP 67→42（-25，战后回复 +6），决策 jev-plan 14，code 10，jev 7
- 第 19 层 地道虫: HP 76→78（+2，战后回复 +6），决策 code 9，jev-plan 4，jev 2
- 第 20 层 外骨骼虫: HP 84→66（-18，战后回复 +6），决策 jev-plan 7，jev 3，code 2
- 第 22 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 72→51（-21，战后回复 +6），决策 jev-plan 4，code 4，jev 3
- 第 30 层 蜂群术士: HP 89→71（-18，战后回复 +6），决策 jev-plan 11，code 6，jev 5
- 第 31 层 棘刺蟾蜍: HP 77→47（-30，战后回复 +6），决策 code 5，jev-plan 3，jev 1
- 第 33 层 火箭/碾碎爪: HP 79→15（-64，战后回复 +6），决策 jev-plan 19，code 9，jev 8
- 第 35 层 虔诚雕刻师: HP 75→63（-12，战后回复 +6），决策 code 11，jev-plan 7，jev 2
- 第 39 层 活体盾/高塔炮手: HP 57→42（-15，战后回复 +6），决策 jev-plan 5，code 3，jev 2
- 第 43 层 噪音机器人/守护机器人/戳刺机器人/电击机器人/组装师: HP 55→34（-21，战后回复 +6），决策 jev-plan 11，jev 7，code 7
- 第 45 层 电球头: HP 68→58（-10，战后回复 +6），决策 jev-plan 5，jev 3，code 2
- 第 48 层 实验体 #C38: HP 96→63（-33，战后回复 +6），决策 code 14，jev-plan 14，jev 5

### 各类决策由谁做
- combat/plan-continue / jev-plan: 146
- combat/plan-choice / jev: 69
- reward/claim / code: 52
- map/route-follow / code: 42
- combat/plan / code: 40
- combat/plan-continue / code: 39
- combat/lethal / code: 22
- reward/card / deepseek: 22
- reward/proceed / code: 20
- combat/plan-choice+potion / jev: 13
- event/choose / deepseek: 11
- rest/plan / deepseek: 11
- rest/proceed / code: 11
- event/leave / code: 9
- shop/buy / deepseek: 8
- selection/upgrade / deepseek: 6
- combat/end_turn / code: 5
- event/only / code: 5
- shop/leave / code: 5
- shop/open / code: 5
- shop/plan / deepseek: 5
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- event/act-plan / deepseek: 2
- event/plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- combat/plan-choice+potion-lethal / jev: 1
- combat/potion-now / code: 1
- event/after-discard / code: 1
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/take into my hand / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：3 个
- 第 9 层 combat/plan-choice: Jev chose plan 4/4 (打击 -> 拳击构装体, 打击 -> 拳击构装体, 飞剑回旋镖) with confidence 0.26; code rank - (rollout's best line, added) (0.26)
- 第 33 层 combat/plan-choice: Jev chose plan 2/4 (防御) with confidence 0.21; code rank 2 (0.21)
- 第 33 层 combat/plan-choice: Jev chose plan 6/6 (双重打击+ -> 火箭, 岩石铠甲+, 战栗 -> 碾碎爪, 拆卸 -> 碾碎爪) with confidence 0.33; code rank - (rollout's best line, added) [calc mismatch: solver sa (0.33)
