## 复盘：run XSPHCB4GUSEU — 阵亡，最高第 48 层

- 决策 841 个；Jev 调用 177 次，Claude 0 次，DeepSeek 43 次；token 1,063,999 入 / 8,721 出，约 $0.0451（Jev）；DeepSeek token 5,978,548 入（缓存命中 5,548,928，93%）/ 193,819 出；用时 50.8 分钟
- 决策者：code 408，jev-plan 195，jev 177，deepseek 61

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→58（-6，战后回复 +6），决策 jev 5，jev-plan 5，code 5
- 第 3 层 噬尸蛞蝓: HP 64→63（-1，战后回复 +6），决策 code 11，jev 3，jev-plan 3
- 第 4 层 淤泥旋螺: HP 69→66（-3，战后回复 +6），决策 jev-plan 10，jev 5，code 5
- 第 5 层 幽灵船: HP 72→62（-10，战后回复 +6），决策 code 14，jev 4，jev-plan 3
- 第 7 层 化石追踪者: HP 68→59（-9，战后回复 +6），决策 code 7，jev 2，jev-plan 2
- 第 9 层 拳击构装体: HP 65→53（-12，战后回复 +6），决策 code 6，jev-plan 5，jev 3
- 第 11 层 鬼祟珊瑚群: HP 59→35（-24，战后回复 +6），决策 jev 8，code 8，jev-plan 7
- 第 12 层 下水道蚌: HP 41→41（-0，战后回复 +6），决策 code 17，jev 2，jev-plan 1
- 第 15 层 花园幽灵鳗: HP 71→56（-15，战后回复 +6），决策 code 9，jev 7，jev-plan 5
- 第 17 层 乐加维林族母: HP 62→33（-29，战后回复 +6），决策 code 17，jev-plan 10，jev 7
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 71→53（-18，战后回复 +6），决策 jev 6，code 5，jev-plan 4
- 第 21 层 地道虫: HP 59→55（-4，战后回复 +6），决策 jev-plan 9，jev 6，code 2
- 第 25 层 蜂群术士: HP 80→2（-78，战后回复 +6），决策 code 14，jev 7，jev-plan 6
- 第 29 层 棘刺蟾蜍: HP 57→47（-10，战后回复 +6），决策 jev 6，code 5，jev-plan 4
- 第 33 层 知识恶魔: HP 77→16（-61，战后回复 +6），决策 code 20，jev-plan 12，jev 7
- 第 35 层 咬人卷轴: HP 99→83（-16，战后回复 +6），决策 code 6，jev 3，jev-plan 1
- 第 37 层 活体盾/高塔炮手: HP 89→85（-4，战后回复 +6），决策 jev 7，code 5，jev-plan 2
- 第 38 层 电球头: HP 91→68（-23，战后回复 +6），决策 jev 8，jev-plan 6，code 5
- 第 39 层 巨斧机器人: HP 74→47（-27，战后回复 +6），决策 jev 14，jev-plan 12，code 9
- 第 44 层 机甲骑士: HP 85→23（-62，战后回复 +6），决策 jev-plan 15，jev 12，code 5
- 第 45 层 青蛙骑士: HP 29→20（-9，战后回复 +6），决策 jev-plan 8，code 7，jev 6
- 第 46 层 守护机器人/戳刺机器人/电击机器人/组装师: HP 26→22（-4，战后回复 +6），决策 jev 7，jev-plan 5，code 5
- 第 48 层 女王/火炬头聚合体: HP 60→0（-60），决策 jev-plan 60，code 54，jev 42

### 死亡战斗：第 48 层 女王/火炬头聚合体
- T2 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T3 [jev] combat/plan-choice: Jev chose plan 4/4 (痛击+ -> 火炬头聚合体, 突破, 打击 -> 火炬头聚合体) with confidence 0.83; code rank 4 conf 0.83
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 突破
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 火炬头聚合体
- T3 [code] combat/plan: code plan (only line): end turn; hp -33, dmg 0
- T4 [jev] combat/plan-choice: Jev chose plan 2/3 (防御+, 杀灭, 打击 -> 火炬头聚合体) with confidence 0.63; code rank 2 conf 0.63
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 杀灭
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 火炬头聚合体
- T4 [code] combat/end_turn: no playable cards; ending the turn
- T5 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 14): 耸肩无视, 与我一战！ -> 火炬头聚合体
- T5 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 羽化
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-8): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 195
- combat/plan-choice / jev: 141
- combat/plan / code: 98
- reward/claim / code: 60
- combat/plan-continue / code: 43
- map/route-follow / code: 42
- combat/lethal / code: 33
- combat/plan-choice+potion / jev: 30
- reward/card / deepseek: 22
- reward/proceed / code: 22
- combat/end_turn / code: 19
- combat/least-loss / code: 18
- selection/exhaust / code: 12
- shop/buy / deepseek: 11
- rest/plan / deepseek: 8
- rest/proceed / code: 8
- selection/add / code: 8
- event/leave / code: 7
- selection/take-planned / code: 6
- shop/leave / code: 6
- shop/open / code: 6
- selection/take into my hand / jev: 5
- shop/plan / deepseek: 5
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- event/choose / deepseek: 3
- selection/curse / code: 3
- event/act-plan / deepseek: 2
- event/plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/remove / deepseek: 2
- selection/upgrade / deepseek: 2
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/take into my hand / code: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：15 个
- 第 3 层 combat/plan-choice: Jev chose plan 2/4 (防御, 痛击 -> 噬尸蛞蝓 #1) with confidence 0.21; code rank 2 (0.21)
- 第 7 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 化石追踪者, 完美打击 -> 化石追踪者) with confidence 0.21; code rank 2 (0.21)
- 第 15 层 selection/add: Jev chose 痛击+ with confidence 0.26 (0.26)
- 第 19 层 combat/plan-choice: Jev chose plan 1/9 (愤怒 -> 盛碗虫（石）, 耸肩无视, 打击 -> 盛碗虫（石）, 头槌 -> 盛碗虫（卵）) with confidence 0.25; code rank 1 (0.25)
- 第 19 层 combat/plan-choice: Jev chose plan 3/4 (打击 -> 盛碗虫（卵）, 头槌 -> 盛碗虫（卵）) with confidence 0.32; code rank 3 (0.32)
- 第 21 层 combat/plan-choice: Jev chose plan 2/5 (防御, 防御, 燃烧+, 愤怒 -> 地道虫, 打击 -> 地道虫, potion 火焰药水 -> 地道虫) with confidence 0.28; code rank 2 (0.28)
- 第 25 层 combat/plan-choice: Jev chose plan 2/3 (愤怒 -> 蜂群术士, 打击 -> 蜂群术士, potion 鲜血药水) with confidence 0.25; code rank 2 (0.25)
- 第 35 层 combat/plan-choice: Jev chose plan 2/2 (飞剑回旋镖, 打击 -> 咬人卷轴 #2) with confidence 0.11; code rank 2 (0.11)
- 第 38 层 combat/plan-choice: Jev chose plan 3/4 (potion 虚弱药水 -> 电球头) with confidence 0.19; code rank 3 (0.19)
- 第 39 层 selection/take into my hand: Jev chose 防御 with confidence 0.31 (0.31)
- 第 44 层 combat/plan-choice+potion: Jev chose plan 3/3 (撕裂, 防御, 愤怒 -> 机甲骑士, 防御) with confidence 0.32; code rank - (rollout's best line, added) (0.32)
- 第 46 层 combat/plan-choice: Jev chose plan 1/7 (完美打击 -> 电击机器人, 狂怒) with confidence 0.29; code rank 1 (0.29)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 6/9 (双重打击 -> 女王, 坚毅+, 血墙, potion 爆炸安瓿) with confidence 0.32; code rank 6 (0.32)
- 第 48 层 combat/plan-choice: Jev chose plan 2/7 (亮剑 -> 女王, 愤怒 -> 女王, 岩石铠甲) with confidence 0.34; code rank 2 (0.34)
- 第 48 层 combat/plan-choice: Jev chose plan 2/7 (亮剑 -> 女王, 愤怒 -> 女王, 岩石铠甲) with confidence 0.34; code rank 2 (0.34)
