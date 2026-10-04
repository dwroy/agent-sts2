## 复盘：run 77QXNB8RFSQQ — 阵亡，最高第 22 层

- 决策 267 个；Jev 调用 40 次，Claude 0 次，DeepSeek 0 次；token 78,806 入 / 1,855 出，约 $0.0034；用时 13.5 分钟
- 决策者：code 199，jev 39，jev-plan 28，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→42（-22），决策 code 5，jev-plan 3，jev 2，code-fallback 1
- 第 3 层 海洋混混: HP 48→39（-9），决策 code 6，jev-plan 4，jev 2
- 第 6 层 蟾蜍蝌蚪: HP 71→61（-10），决策 code 5，jev 1，jev-plan 1
- 第 8 层 下水道蚌: HP 65→46（-19），决策 code 9，jev-plan 3，jev 2
- 第 11 层 骇鳗: HP 52→17（-35），决策 code 11，jev 3，jev-plan 2
- 第 13 层 噬尸蛞蝓: HP 47→24（-23），决策 code 11
- 第 17 层 乐加维林族母: HP 54→54（-0），决策 code 1
- 第 17 层 乐加维林族母: HP 54→4（-50），决策 code 20，jev-plan 6，jev 4
- 第 19 层 地道虫: HP 66→22（-44），决策 code 15，jev 4，jev-plan 3
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 28→18（-10），决策 code 8，jev-plan 2，jev 1
- 第 20 层 盛碗虫（石）: HP 18→18（-0），决策 code 1
- 第 21 层 啃咬机: HP 24→18（-6），决策 code 11，jev 2
- 第 22 层 猎人杀手: HP 24→14（-10），决策 code 9，jev 5，jev-plan 4

### 死亡战斗：第 22 层 猎人杀手
- T3 [code] combat/plan: code plan (+32.6 over next): 放松; hp -5, dmg 0
- T3 [code] combat/plan: code plan (only line): end turn; hp -5, dmg 0
- T4 [jev] combat/plan-choice: Jev chose plan 1/4 (耸肩无视, 燃烧+, 放松) with confidence 0.62; code rank 1 conf 0.62
- T4 [jev] combat/plan-choice: Jev chose plan 1/4 (燃烧+, 放松) with confidence 0.61; code rank 1 conf 0.61
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 放松
- T4 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T5 [jev] combat/plan-choice: Jev chose plan 1/4 (血墙, 恶魔形态) with confidence 0.50; code rank 1 conf 0.50
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 恶魔形态
- T5 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): 扯碎 -> 猎人杀手, 打击 -> 猎人杀手
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 猎人杀手
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): end turn

### 各类决策由谁做
- combat/plan / code: 73
- combat/plan-continue / jev-plan: 28
- combat/plan-choice / jev: 26
- reward/claim / code: 25
- combat/plan-continue / code: 21
- map/route / code: 19
- combat/lethal / code: 12
- reward/proceed / code: 10
- reward/card / code: 7
- event/leave / code: 4
- rest/choose / code: 4
- rest/proceed / code: 4
- reward/card / jev: 4
- combat/least-loss / code: 3
- combat/plan-guarded / code: 3
- event/choose / jev: 3
- shop/buy / code: 3
- map/route / jev: 2
- selection/exhaust / code: 2
- selection/upgrade / jev: 2
- shop/buy / jev: 2
- shop/leave / code: 2
- shop/open / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice / code-fallback: 1
- event/only / code: 1
- run/finalize / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：3 个
- 第 5 层 event/choose: Jev chose 饮用 with confidence 0.18 (0.18)
- 第 9 层 selection/upgrade: Jev chose 旋风斩 with confidence 0.33 (0.33)
- 第 18 层 event/choose: Jev chose 佩尔之角 with confidence 0.20 (0.20)
