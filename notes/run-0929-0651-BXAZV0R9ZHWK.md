## 复盘：run BXAZV0R9ZHWK — 阵亡，最高第 17 层

- 决策 241 个；Jev 调用 54 次，Claude 0 次，DeepSeek 22 次；token 125,677 入 / 2,332 出，约 $0.0054（Jev）；DeepSeek token 401,547 入（缓存命中 299,904，75%）/ 45,762 出；用时 11.0 分钟
- 决策者：code 122，jev 54，jev-plan 43，deepseek 22

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→61（-3），决策 jev 3，jev-plan 2，code 1
- 第 2 层 海洋混混: HP 61→61（-0），决策 code 6，jev-plan 3，jev 1
- 第 3 层 噬尸蛞蝓: HP 67→59（-8），决策 code 10，jev-plan 7，jev 6
- 第 7 层 鬼祟珊瑚群: HP 71→10（-61），决策 jev 9，jev-plan 8，code 4
- 第 8 层 淤泥旋螺: HP 16→9（-7），决策 code 4，jev 3，jev-plan 3
- 第 12 层 化石追踪者: HP 62→41（-21），决策 jev-plan 5，jev 4，code 3
- 第 14 层 气态炸弹/活雾: HP 74→47（-27），决策 code 11，jev 7，jev-plan 3
- 第 15 层 海洋混混/钙化邪教徒: HP 53→53（-0），决策 jev 2，jev-plan 1
- 第 15 层 海洋混混/钙化邪教徒: HP 53→33（-20），决策 jev 6，jev-plan 5，code 4
- 第 15 层 钙化邪教徒: HP 33→26（-7），决策 code 3，jev 2
- 第 17 层 乐加维林族母: HP 59→42（-17），决策 code 7，jev 5，jev-plan 2
- 第 17 层 乐加维林族母: HP 42→23（-19），决策 code 4，jev 3，jev-plan 3
- 第 17 层 乐加维林族母: HP 23→9（-14），决策 code 9，jev 2，jev-plan 1

### 死亡战斗：第 17 层 乐加维林族母
- T7 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T8 [jev] combat/plan-choice+potion: Jev chose to drink 熔炉的祝福 (confidence 0.53) conf 0.53
- T8 [code] combat/plan: code plan (only distinct line): 耸肩无视+, 心神不宁+, 打击+ -> 乐加维林族母, 双重打击+ -> 乐加维林族母; hp -14, dmg 17
- T8 [code] combat/plan: code plan (only distinct line): 心神不宁+, 打击+ -> 乐加维林族母, 双重打击+ -> 乐加维林族母, 防御; hp -11, dmg 17
- T8 [jev] combat/plan-choice: Jev chose plan 1/2 (打击+ -> 乐加维林族母, 双重打击+ -> 乐加维林族母) with confidence 0.39; code rank 1 conf 0.39
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 双重打击+ -> 乐加维林族母
- T8 [code] combat/plan: code plan (only distinct line): end turn; hp -14, dmg 0
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 14): 剑柄打击 -> 乐加维林族母, 防御, 打击
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 13): 心神不宁+, 防御, 打击 -> 乐加维林族
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): 防御, 拆卸 -> 乐加维林族母
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 拆卸 -> 乐加维林族母
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 43
- combat/plan / code: 37
- combat/plan-choice+potion / jev: 30
- combat/plan-choice / jev: 23
- reward/claim / code: 17
- combat/plan-continue / code: 13
- map/route-follow / code: 12
- combat/lethal / code: 10
- event/choose / deepseek: 7
- reward/card / deepseek: 7
- reward/proceed / code: 7
- combat/least-loss / code: 4
- event/leave / code: 4
- selection/add / code: 4
- rest/choose / deepseek: 3
- rest/proceed / code: 3
- map/route / code: 2
- map/route-plan / deepseek: 2
- shop/buy / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-potion / code: 1
- combat/potion-now / code: 1
- event/only / code: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：17 个
- 第 2 层 combat/plan-choice+potion: Jev chose plan 1/2 (打击 -> 海洋混混, 防御, 打击 -> 海洋混混) with confidence 0.34; code rank 1 (0.34)
- 第 2 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.29; code rank 1 (0.29)
- 第 2 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.22) (0.22)
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 打击 -> 海洋混混, 防御, 闪亮登场) with confidence 0.05; code rank 1 (0.05)
- 第 7 层 combat/plan-choice+potion: Jev chose plan 2/2 (打击 -> 鬼祟珊瑚群, 打击 -> 鬼祟珊瑚群, 打击 -> 鬼祟珊瑚群); plan 1 (打击 -> 鬼祟珊瑚群, 打击 -> 鬼祟珊瑚群, 双重打击 -> 鬼祟珊瑚群) is as good or better on every axis, playi (0.12)
- 第 7 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.31; code rank 1 (0.31)
- 第 12 层 combat/plan-choice: Jev chose plan 5/5 (痛击 -> 化石追踪者, 双重打击 -> 化石追踪者) with confidence 0.24; code rank 5 (0.24)
- 第 14 层 combat/plan-choice: Jev chose plan 3/3 (飞剑回旋镖, 打击 -> 活雾, 打击 -> 活雾) with confidence 0.30; code rank 3 (0.30)
- 第 14 层 combat/plan-choice: Jev chose plan 2/4 (痛击 -> 气态炸弹, 防御) with confidence 0.33; code rank 2 (0.33)
- 第 14 层 combat/plan-choice: Jev chose plan 1/2 (放血, 飞剑回旋镖, 防御, 打击 -> 活雾) with confidence 0.16; code rank 1 (0.16)
- 第 15 层 combat/plan-choice: Jev chose plan 3/3 (头槌 -> 海洋混混) with confidence 0.07; code rank 3 (0.07)
- 第 15 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御, 双重打击 -> 钙化邪教徒) with confidence 0.08; code rank 1 (0.08)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 乐加维林族母, 耸肩无视, potion 铁心药水) with confidence 0.01; code rank 1 (0.01)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 4/4 (打击 -> 乐加维林族母, 痛击 -> 乐加维林族母); plan 1 (痛击 -> 乐加维林族母, 打击 -> 乐加维林族母) is as good or better on every axis, playing it with confidence 0. (0.20)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (心神不宁, 头槌 -> 乐加维林族母, 防御, 飞剑回旋镖, 双重打击 -> 乐加维林族母) with confidence 0.02; code rank 1 (0.02)
