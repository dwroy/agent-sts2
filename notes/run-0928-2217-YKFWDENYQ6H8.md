## 复盘：run YKFWDENYQ6H8 — 阵亡，最高第 15 层

- 决策 182 个；Jev 调用 27 次，Claude 0 次，DeepSeek 19 次；token 39,474 入 / 1,174 出，约 $0.0017（Jev）；DeepSeek token 326,932 入（缓存命中 239,360，73%）/ 81,708 出；用时 11.9 分钟
- 决策者：code 113，jev 27，jev-plan 23，deepseek 19

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→58（-6），决策 code 5，jev 4，jev-plan 4
- 第 5 层 海洋混混: HP 64→53（-11），决策 code 7，jev-plan 3，jev 2
- 第 7 层 噬尸蛞蝓: HP 59→50（-9），决策 code 14，jev 2，jev-plan 1
- 第 9 层 幽灵船: HP 56→36（-20），决策 code 13，jev 2，jev-plan 2
- 第 11 层 拳击构装体: HP 42→42（-0），决策 code 3，jev 2，jev-plan 1
- 第 11 层 拳击构装体: HP 42→32（-10），决策 code 3，jev 1
- 第 13 层 双尾鼠: HP 38→38（-0），决策 code 3
- 第 14 层 潮湿邪教徒/钙化邪教徒: HP 43→2（-41），决策 jev-plan 9，jev 8，code 6
- 第 15 层 鬼祟珊瑚群: HP 8→2（-6），决策 code 8，jev 6，jev-plan 3

### 死亡战斗：第 15 层 鬼祟珊瑚群
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 熔融之拳 -> 鬼祟珊瑚群
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T2 [jev] combat/plan-choice+potion: Jev chose to drink 痊愈药水 (confidence 0.18) conf 0.18
- T2 [jev] combat/plan-choice+potion: Jev chose to drink 熔炉的祝福 (confidence 0.39) conf 0.39
- T2 [code] combat/plan: code plan (only distinct line): 打击+ -> 鬼祟珊瑚群, 愤怒+ -> 鬼祟珊瑚群; hp -4, dmg 17
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒+ -> 鬼祟珊瑚群
- T2 [code] combat/plan: code plan (only line): end turn; hp -4, dmg 0
- T3 [code] combat/plan: code plan (only distinct line): 防御, 防御, 预备打击 -> 鬼祟珊瑚群; hp -0, dmg 7
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 预备打击 -> 鬼祟珊瑚群
- T3 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 血墙, 愤怒+ -> 鬼祟珊瑚群

### 各类决策由谁做
- combat/plan-continue / code: 26
- combat/plan / code: 25
- combat/plan-continue / jev-plan: 23
- reward/claim / code: 17
- combat/plan-choice / jev: 15
- combat/plan-choice+potion / jev: 12
- map/route-follow / code: 11
- reward/card / deepseek: 7
- reward/proceed / code: 7
- combat/lethal / code: 6
- combat/end_turn / code: 4
- event/choose / deepseek: 3
- event/leave / code: 3
- shop/buy / deepseek: 3
- map/route-plan / deepseek: 2
- shop/buy / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/least-loss / code: 1
- map/route / code: 1
- rest/choose / deepseek: 1
- rest/proceed / code: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：9 个
- 第 5 层 combat/plan-choice: Jev chose plan 2/3 (痛击 -> 海洋混混, 打击 -> 海洋混混) with confidence 0.33; code rank 2 (0.33)
- 第 9 层 combat/plan-choice: Jev chose plan 1/2 (血墙, 突破) with confidence 0.01; code rank 1 (0.01)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.20; code rank 1 (0.20)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.24; code rank 1 (0.24)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 4/4 (打击 -> 鬼祟珊瑚群, 耸肩无视, 打击 -> 鬼祟珊瑚群) with confidence 0.17; code rank 4 (0.17)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 2/2 (预备打击 -> 鬼祟珊瑚群) with confidence 0.32; code rank 2 (0.32)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.19; code rank 1 (0.19)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 1/1 (防御, 熔融之拳 -> 鬼祟珊瑚群, 防御) with confidence 0.21; code rank 1 (0.21)
- 第 15 层 combat/plan-choice+potion: Jev chose to drink 痊愈药水 (confidence 0.18) (0.18)
