## 复盘：run GSFSFQ3JWGEL — 阵亡，最高第 48 层

- 决策 625 个；Jev 调用 119 次，Claude 0 次，DeepSeek 49 次；token 777,528 入 / 6,749 出，约 $0.0329（Jev）；DeepSeek token 6,965,456 入（缓存命中 6,503,936，93%）/ 327,482 出；用时 58.8 分钟
- 决策者：code 273，jev-plan 159，jev 119，deepseek 74

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→41（-23，战后回复 +6），决策 code 10，jev-plan 2，jev 1
- 第 4 层 噬尸蛞蝓: HP 47→40（-7，战后回复 +6），决策 jev 4，jev-plan 4，code 2
- 第 5 层 蟾蜍蝌蚪: HP 46→46（-0，战后回复 +6），决策 jev 4，jev-plan 3，code 3
- 第 6 层 下水道蚌: HP 52→43（-9，战后回复 +6），决策 jev-plan 7，jev 6，code 4
- 第 9 层 噬尸蛞蝓: HP 73→73（-0，战后回复 +6），决策 jev 4，jev-plan 3，code 3
- 第 11 层 双尾鼠: HP 79→68（-11，战后回复 +6），决策 jev 5，jev-plan 3，code 2
- 第 13 层 鬼祟珊瑚群: HP 74→37（-37，战后回复 +6），决策 jev 9，jev-plan 6，code 2
- 第 17 层 灵魂异鱼: HP 67→65（-2，战后回复 +6），决策 jev-plan 17，jev 11，code 5
- 第 19 层 地道虫: HP 78→69（-9，战后回复 +6），决策 code 9，jev 1，jev-plan 1
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 75→65（-10，战后回复 +6），决策 jev-plan 7，code 6，jev 4
- 第 23 层 寄生惧魔/胧光怪: HP 61→60（-1，战后回复 +6），决策 jev 7，jev-plan 7，code 5
- 第 25 层 啃咬机: HP 66→61（-5，战后回复 +6），决策 jev-plan 10，jev 9
- 第 29 层 残杀千足虫: HP 87→74（-13，战后回复 +6），决策 jev-plan 9，code 5，jev 4
- 第 30 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 80→79（-1，战后回复 +6），决策 code 6，jev-plan 5，jev 2
- 第 33 层 火箭/碾碎爪: HP 79→23（-56，战后回复 +6），决策 jev-plan 27，code 11，jev 10
- 第 35 层 虔诚雕刻师: HP 75→68（-7，战后回复 +6），决策 jev-plan 7，jev 4，code 4
- 第 37 层 活体盾/高塔炮手: HP 74→64（-10，战后回复 +6），决策 jev-plan 4，jev 3，code 3
- 第 39 层 噪音机器人/戳刺机器人/电击机器人/组装师: HP 70→61（-9，战后回复 +6），决策 code 7，jev-plan 5，jev 4
- 第 43 层 青蛙骑士: HP 67→27（-40，战后回复 +6），决策 jev-plan 9，jev 8，code 4
- 第 45 层 拳击构装体/方柱构装体: HP 59→33（-26，战后回复 +6），决策 code 8，jev-plan 5，jev 3
- 第 46 层 史莱姆狂战士: HP 39→30（-9，战后回复 +6），决策 jev-plan 7，code 6，jev 4
- 第 48 层 永世沙漏: HP 62→0（-62），决策 jev 12，jev-plan 11，code 11

### 死亡战斗：第 48 层 永世沙漏
- T5 [code] combat/end_turn: no playable cards; ending the turn
- T6 [jev] combat/plan-choice: Jev chose plan 5/5 (岩石铠甲, 狱火+, 飞剑回旋镖+) with confidence 0.84; code rank - (rollout's best line, added) conf 0.84
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狱火+
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 飞剑回旋镖+
- T6 [code] combat/plan: code plan (only line): end turn; hp -2, dmg 0
- T7 [code] combat/plan: code plan (only distinct line): 打击+ -> 永世沙漏, 飞剑回旋镖, 耸肩无视; hp -2, dmg 66
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 飞剑回旋镖
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 耸肩无视
- T7 [code] combat/plan: code plan (only distinct line): 飞剑回旋镖; hp -2, dmg 75
- T7 [code] combat/plan: code plan (only line): end turn; hp -2, dmg 0
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): 防御+
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-8): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 159
- combat/plan-choice / jev: 82
- reward/claim / code: 55
- combat/plan / code: 43
- map/route-follow / code: 42
- combat/plan-continue / code: 35
- combat/plan-choice+potion / jev: 33
- combat/lethal / code: 25
- reward/card / deepseek: 21
- reward/proceed / code: 21
- shop/buy / deepseek: 12
- rest/plan / deepseek: 10
- rest/proceed / code: 10
- event/leave / code: 9
- event/choose / deepseek: 7
- combat/end_turn / code: 6
- selection/upgrade / deepseek: 5
- selection/exhaust / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / deepseek: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/plan-choice+potion-lethal / jev: 3
- combat/least-loss / code: 2
- event/act-plan / deepseek: 2
- event/plan / deepseek: 2
- map/route-change / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/add / deepseek: 2
- selection/enchant / deepseek: 2
- selection/remove / deepseek: 2
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/free-card / code: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：11 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/2 (防御, 打击 -> 海洋混混, 防御) with confidence 0.06; code rank 2 (0.06)
- 第 17 层 selection/take into my hand: Jev chose 好勇斗狠 with confidence 0.16 (0.16)
- 第 25 层 combat/plan-choice: Jev chose plan 4/4 (打击 -> 啃咬机 #2, 防御, 飞剑回旋镖, 愤怒 -> 啃咬机 #2, 坚毅) with confidence 0.31; code rank - (rollout's best line, added) (0.31)
- 第 25 层 combat/plan-choice: Jev chose plan 4/4 (end turn) with confidence 0.25; code rank - (rollout's best line, added) (0.25)
- 第 33 层 combat/plan-choice: Jev chose plan 11/11 (防御, 战栗 -> 碾碎爪, 飞剑回旋镖, 打击 -> 碾碎爪) with confidence 0.20; code rank - (rollout's best line, added) (0.20)
- 第 43 层 combat/plan-choice+potion-lethal: Jev chose plan 2/2 (绯红披风+, 飞剑回旋镖, 燃烧契约+, 耸肩无视) with confidence 0.29; code rank 2 (0.29)
- 第 45 层 combat/plan-choice: Jev chose plan 4/5 (预备打击 -> 拳击构装体, 飞剑回旋镖, 欺凌 -> 拳击构装体, 御血术 -> 拳击构装体) with confidence 0.26; code rank 4 (0.26)
- 第 48 层 combat/plan-choice: Jev chose plan 1/4 (火焰屏障) with confidence 0.21; code rank 1 (0.21)
- 第 48 层 combat/plan-choice: Jev chose plan 1/3 (end turn) with confidence 0.20; code rank 1 (0.20)
- 第 48 层 combat/plan-choice: Jev chose plan 1/3 (end turn) with confidence 0.27; code rank 1 (0.27)
- 第 48 层 combat/plan-choice: Jev chose plan 1/3 (预备打击 -> 永世沙漏, 闪电霹雳, 打击 -> 永世沙漏) with confidence 0.19; code rank 1 (0.19)
