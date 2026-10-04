## 复盘：run XPDAUKKM1UT6 — 阵亡，最高第 39 层

- 决策 592 个；Jev 调用 142 次，Claude 0 次，DeepSeek 38 次；token 929,502 入 / 7,455 出，约 $0.0394（Jev）；DeepSeek token 5,360,109 入（缓存命中 4,909,952，92%）/ 297,314 出；用时 58.7 分钟
- 决策者：code 233，jev-plan 166，jev 142，deepseek 51

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 64→53（-11，战后回复 +6），决策 jev-plan 7，jev 5，code 5
- 第 6 层 缩小甲虫: HP 61→51（-10，战后回复 +6），决策 code 9，jev-plan 6，jev 2
- 第 7 层 小啃兽: HP 57→50（-7，战后回复 +6），决策 jev 6，code 5，jev-plan 4
- 第 9 层 墨宝: HP 80→67（-13，战后回复 +6），决策 jev 8，jev-plan 4，code 4
- 第 11 层 劫掠者刺客/劫掠者斧手/劫掠者追踪手: HP 73→41（-32，战后回复 +6），决策 jev-plan 7，code 6，jev 4
- 第 12 层 小啃兽: HP 47→20（-27，战后回复 +6），决策 jev 8，code 8，jev-plan 7
- 第 14 层 藤蔓蹒跚者: HP 50→31（-19，战后回复 +6），决策 jev-plan 7，jev 6，code 5
- 第 15 层 方柱构装体: HP 37→32（-5，战后回复 +6），决策 jev-plan 7，jev 5，code 1
- 第 17 层 仪式兽: HP 62→41（-21，战后回复 +6），决策 jev 11，jev-plan 8，code 7
- 第 19 层 偷窃草蜢: HP 73→49（-24，战后回复 +6），决策 code 7，jev-plan 4，jev 2
- 第 20 层 外骨骼虫: HP 55→53（-2，战后回复 +6），决策 jev-plan 6，jev 3，code 3
- 第 23 层 虱虫之祖: HP 56→34（-22，战后回复 +6），决策 jev-plan 10，jev 9，code 2
- 第 24 层 外骨骼虫: HP 40→20（-20，战后回复 +6），决策 jev 9，jev-plan 7，code 1
- 第 28 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 50→41（-9，战后回复 +6），决策 jev 7，jev-plan 5，code 3
- 第 31 层 异螨: HP 71→58（-13，战后回复 +6），决策 jev-plan 6，jev 5，code 3
- 第 33 层 火箭/碾碎爪: HP 80→9（-71，战后回复 +6），决策 jev-plan 58，jev 39，code 20
- 第 35 层 虔诚雕刻师: HP 67→16（-51，战后回复 +6），决策 jev-plan 8，jev 5，code 5
- 第 37 层 活体盾/高塔炮手: HP 42→9（-33，战后回复 +6），决策 code 8，jev 4，jev-plan 4
- 第 39 层 猫头鹰法官: HP 15→0（-15），决策 code 5，jev 4，jev-plan 1

### 死亡战斗：第 39 层 猫头鹰法官
- T1 [jev] combat/plan-choice+potion: Jev chose to drink 技能药水, then re-plan (confidence 0.68) conf 0.68
- T1 [jev] selection/take into my hand: Jev chose 挑衅 with confidence 0.74 conf 0.74
- T1 [jev] combat/plan-choice: Jev chose plan 1/2 (神化, 防御, 挑衅 -> 猫头鹰法官) with confidence 0.75; code rank 1 conf 0.75
- T1 [jev] combat/plan-choice: Jev chose plan 1/2 (防御+, 挑衅+ -> 猫头鹰法官) with confidence 0.87; code rank 1 conf 0.87
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 挑衅+ -> 猫头鹰法官
- T1 [code] combat/plan: code plan (only line): end turn; hp -2, dmg 0
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 打击+ -> 猫头鹰法官, 撕裂+, 挑衅+ -> 猫头鹰法官
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 撕裂+
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 挑衅+ -> 猫头鹰法官
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 166
- combat/plan-choice / jev: 108
- reward/claim / code: 45
- combat/plan / code: 43
- map/route-follow / code: 33
- combat/plan-choice+potion / jev: 31
- combat/plan-continue / code: 25
- combat/lethal / code: 24
- reward/card / deepseek: 18
- reward/proceed / code: 18
- event/leave / code: 8
- rest/plan / deepseek: 7
- rest/proceed / code: 7
- combat/end_turn / code: 6
- event/choose / deepseek: 6
- shop/buy / deepseek: 6
- combat/least-loss / code: 5
- selection/take into my hand / jev: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/act-plan / deepseek: 2
- map/route-change / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/discard / code: 2
- event/plan / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：15 个
- 第 7 层 combat/plan-choice: Jev chose plan 3/3 (战斗专注, 撕裂) with confidence 0.30; code rank 3 (0.30)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 6/6 (痛击 -> 仪式兽, 放血, 重锤 -> 仪式兽); plan 1 (放血, 痛击 -> 仪式兽, 重锤 -> 仪式兽) is as good or better on every axis, playing it with confidence 0.29;  (0.29)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 攻击药水, then re-plan (confidence 0.03) (0.03)
- 第 23 层 selection/take into my hand: Jev chose 武装 with confidence 0.10 (0.10)
- 第 28 层 combat/plan-choice: Jev chose plan 3/3 (potion 马萨雷斯的赠礼) with confidence 0.28; code rank 3 (0.28)
- 第 31 层 combat/plan-choice: Jev chose plan 10/10 (与我一战！ -> 异螨 #1, 突破, 打击 -> 异螨 #2) with confidence 0.27; code rank - (rollout's best line, added) (0.27)
- 第 31 层 combat/plan-choice: Jev chose plan 2/4 (撕裂+) with confidence 0.24; code rank 2 (0.24)
- 第 31 层 combat/plan-choice: Jev chose plan 4/4 (end turn) with confidence 0.27; code rank - (rollout's best line, added) (0.27)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (potion 铁心药水) with confidence 0.34; code rank 2 (0.34)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.07; code rank 2 (0.07)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (potion 铁心药水) with confidence 0.32; code rank 2 (0.32)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.07; code rank 2 (0.07)
- 第 33 层 combat/plan-choice: Jev chose plan 1/2 (potion 易伤药水 -> 火箭) with confidence 0.03; code rank 1 (0.03)
- 第 37 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 活体盾, 绯红披风) with confidence 0.26; code rank - (rollout's best line, added) (0.26)
- 第 37 层 combat/plan-choice: Jev chose plan 1/2 (神化) with confidence 0.18; code rank 1 (0.18)
