## 复盘：run SVN20LTDALQS — 阵亡，最高第 17 层

- 决策 237 个；Jev 调用 60 次，Claude 0 次，DeepSeek 4 次；token 91,575 入 / 2,655 出，约 $0.0040；用时 11.1 分钟
- 决策者：code 132，jev 49，jev-plan 41，code-fallback 11，deepseek 4

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→43（-21），决策 jev-plan 5，code 5，jev 3，code-fallback 2
- 第 3 层 淤泥旋螺: HP 49→41（-8），决策 code 5，code-fallback 1
- 第 5 层 蟾蜍蝌蚪: HP 47→40（-7），决策 code 6，code-fallback 1
- 第 6 层 地精佣兵: HP 46→32（-14），决策 jev-plan 6，code 5，jev 2
- 第 6 层 卑鄙地精/胖地精: HP 32→32（-0），决策 code 4
- 第 7 层 海洋混混/钙化邪教徒: HP 38→35（-3），决策 code-fallback 4，code 3
- 第 7 层 海洋混混/钙化邪教徒: HP 35→23（-12），决策 code 6，jev-plan 4，code-fallback 3，jev 1
- 第 11 层 双尾鼠: HP 45→45（-0），决策 code 6
- 第 14 层 拳击构装体: HP 75→62（-13），决策 jev-plan 6，jev 3，code 3
- 第 15 层 鬼祟珊瑚群: HP 68→37（-31），决策 code 8，jev-plan 6，jev 5
- 第 17 层 乐加维林族母: HP 67→64（-3），决策 jev 9，jev-plan 1
- 第 17 层 乐加维林族母: HP 64→57（-7），决策 jev 9，jev-plan 4
- 第 17 层 乐加维林族母: HP 57→37（-20），决策 jev 9，jev-plan 5
- 第 17 层 乐加维林族母: HP 37→34（-3），决策 jev 5，jev-plan 2
- 第 17 层 乐加维林族母: HP 34→4（-30），决策 code 6，jev-plan 2，jev 1

### 死亡战斗：第 17 层 乐加维林族母
- T12 [code] combat/plan: code plan (only line): end turn; hp -10, dmg 0
- T13 [jev] combat/plan-choice: Jev chose plan 2/2 (头槌 -> 乐加维林族母, 防御, 邪眼) with confidence 0.14; code rank 2 conf 0.14
- T13 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T13 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 邪眼
- T13 [code] combat/plan: code plan (only line): end turn; hp -20, dmg 0
- T14 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-10): 打击 -> 乐加维林族母, 双重打击 -> 乐加维林族母, 防御
- T14 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 乐加维林族母
- T14 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T14 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-10): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 41
- combat/plan-choice+potion / jev: 33
- combat/plan / code: 21
- combat/plan-continue / code: 21
- reward/claim / code: 19
- map/route / code: 16
- combat/plan-choice / jev: 14
- combat/plan-choice / code-fallback: 11
- reward/proceed / code: 9
- combat/lethal / code: 8
- reward/card / code: 7
- selection/add / code: 4
- combat/end_turn / code: 3
- event/leave / code: 3
- rest/proceed / code: 3
- shop/buy / code: 3
- combat/least-loss / code: 2
- combat/plan-potion / code: 2
- event/choose / deepseek: 2
- rest/choose / code: 2
- bundle/confirm / code: 1
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/choose / jev: 1
- rest/choose / jev: 1
- reward/card / deepseek: 1
- run/finalize / code: 1
- selection/add / deepseek: 1
- selection/confirm / code: 1
- selection/remove / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：4 次（推翻 Jev 4 次）
- [deepseek] 第 3 层 T2 reward/card: 推翻 Jev（card0 @0.23 → card2）：邪眼: cheapest real block card (deck has none), 1E flexible vs boss 19/9x2, and exhaust synergy from 熔融之拳; Blood Wall's HP
- [deepseek] 第 4 层 TNone event/choose: 推翻 Jev（o1 @0.05 → o0）：石之剑是永久价值，7 点血可靠燃烧之血与休息补回；已有 124 金，111 金币边际价值低，本牌组更缺永久成长。
- [deepseek] 第 6 层 T3 selection/add: 推翻 Jev（card0 @0.14 → card1）：痛击：力量+2下造成10伤并挂2层易伤，下回合配合打击(12)或熔融之拳(翻倍易伤)正好斩杀22血的地精佣兵。
- [deepseek] 第 9 层 TNone event/choose: 推翻 Jev（o0 @0.22 → o1）：藏宝图是无用诅咒牌，占手牌且拖延；8点生命损失可接受（53/80，仍有休息点），换一瓶随机药水对老板战更有价值。

### Jev 低置信度（<0.35）决策：25 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 噬尸蛞蝓, 防御, 防御) with confidence 0.34; code rank 1 (0.34)
- 第 6 层 combat/plan-choice: Jev chose plan 1/4 (防御, 燃烧, 防御) with confidence 0.26; code rank 1 (0.26)
- 第 15 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 鬼祟珊瑚群, 耸肩无视) with confidence 0.18; code rank 1 (0.18)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 1/2 (放血, 御血术 -> 鬼祟珊瑚群) with confidence 0.23; code rank 1 (0.23)
- 第 15 层 combat/plan-choice: Jev chose plan 2/3 (邪眼, 痛击 -> 鬼祟珊瑚群) with confidence 0.31; code rank 2 (0.31)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.02; code rank 1 (0.02)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.01; code rank 1 (0.01)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.06; code rank 1 (0.06)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (耸肩无视, 旋风斩) with confidence 0.33; code rank 2 (0.33)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (头槌 -> 乐加维林族母) with confidence 0.19; code rank 1 (0.19)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.25; code rank 1 (0.25)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.04; code rank 1 (0.04)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.11; code rank 1 (0.11)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 4/4 (防御, 耸肩无视) with confidence 0.16; code rank 4 (0.16)
