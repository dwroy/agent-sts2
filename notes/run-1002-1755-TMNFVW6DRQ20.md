## 复盘：run TMNFVW6DRQ20 — 阵亡，最高第 48 层

- 决策 782 个；Jev 调用 145 次，Claude 0 次，DeepSeek 48 次；token 828,173 入 / 7,124 出，约 $0.0351（Jev）；DeepSeek token 6,714,714 入（缓存命中 6,207,488，92%）/ 187,720 出；用时 51.7 分钟
- 决策者：code 369，jev-plan 204，jev 145，deepseek 64

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→57（-7，战后回复 +6），决策 code 5，jev-plan 3，jev 2
- 第 3 层 噬尸蛞蝓: HP 63→61（-2，战后回复 +6），决策 jev-plan 7，jev 5，code 3
- 第 5 层 海洋混混: HP 67→62（-5，战后回复 +6），决策 jev 4，code 4，jev-plan 3
- 第 6 层 潮湿邪教徒/钙化邪教徒: HP 68→68（-0，战后回复 +6），决策 code 7，jev 6，jev-plan 5
- 第 8 层 花园幽灵鳗: HP 74→22（-52，战后回复 +6），决策 code 17，jev-plan 7，jev 5
- 第 13 层 鬼祟珊瑚群: HP 76→57（-19，战后回复 +6），决策 code 7，jev-plan 3，jev 2
- 第 14 层 卑鄙地精/地精佣兵/胖地精: HP 63→62（-1，战后回复 +6），决策 jev-plan 11，jev 6，code 6
- 第 15 层 化石追踪者: HP 68→53（-15，战后回复 +6），决策 jev-plan 4，code 3，jev 2
- 第 17 层 瀑布巨兽: HP 80→34（-46，战后回复 +6），决策 code 22，jev-plan 13，jev 6
- 第 19 层 外骨骼虫: HP 72→70（-2，战后回复 +6），决策 code 11，jev-plan 4，jev 2
- 第 21 层 地道虫: HP 76→72（-4，战后回复 +6），决策 code 7，jev-plan 6，jev 3
- 第 22 层 异螨: HP 78→74（-4，战后回复 +6），决策 code 11，jev-plan 5，jev 3
- 第 23 层 啃咬机: HP 80→69（-11，战后回复 +6），决策 jev-plan 11，code 6，jev 5
- 第 25 层 残杀千足虫: HP 75→59（-16，战后回复 +6），决策 jev-plan 11，code 7，jev 6
- 第 28 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 65→65（-0，战后回复 +6），决策 jev-plan 6，code 5，jev 4
- 第 30 层 猎人杀手: HP 71→51（-20，战后回复 +6），决策 jev-plan 9，jev 8，code 2
- 第 33 层 火箭/碾碎爪: HP 80→54（-26，战后回复 +6），决策 jev-plan 28，jev 14，code 10
- 第 35 层 咬人卷轴: HP 76→45（-31，战后回复 +6），决策 code 8，jev 4，jev-plan 4
- 第 36 层 活体盾/高塔炮手: HP 51→31（-20，战后回复 +6），决策 jev-plan 8，code 5，jev 3
- 第 38 层 电球头: HP 37→28（-9，战后回复 +6），决策 jev-plan 10，jev 6，code 2
- 第 39 层 猫头鹰法官: HP 34→12（-22，战后回复 +6），决策 jev-plan 12，jev 9，code 8
- 第 44 层 青蛙骑士: HP 68→41（-27，战后回复 +6），决策 jev 19，jev-plan 15，code 2
- 第 45 层 史莱姆狂战士: HP 43→14（-29，战后回复 +6），决策 jev-plan 11，jev 8，code 8
- 第 48 层 永世沙漏: HP 37→0（-37），决策 code 27，jev 9，jev-plan 8

### 死亡战斗：第 48 层 永世沙漏
- T6 [code] combat/plan: code plan (only distinct line): 愤怒 -> 永世沙漏, 全身撞击+ -> 永世沙漏; hp -3, dmg 44
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 全身撞击+ -> 永世沙漏
- T6 [code] combat/end_turn: no playable cards; ending the turn
- T7 [jev] combat/plan-choice: Jev chose plan 2/3 (战斗专注, 打击 -> 永世沙漏, 打击 -> 永世沙漏, 血墙+) with confidence 0.78; code rank 2 [ending now kills by what the mod's lethal flag does not count: 19 HP l conf 0.78
- T7 [jev] combat/plan-choice: Jev chose plan 2/2 (打击 -> 永世沙漏, 打击 -> 永世沙漏, 火焰屏障+) with confidence 0.88; code rank 2 [ending now kills by what the mod's lethal flag does not count: 19 HP lost  conf 0.88
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 永世沙漏
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 火焰屏障+
- T7 [code] combat/plan: code plan (only line): end turn; hp -3, dmg 0
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): 拆卸+ -> 永世沙漏, 防御, 旋风斩
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 204
- combat/plan-choice / jev: 96
- combat/plan / code: 90
- reward/claim / code: 70
- combat/plan-continue / code: 68
- combat/plan-choice+potion / jev: 44
- map/route-follow / code: 42
- reward/card / deepseek: 23
- reward/proceed / code: 23
- combat/lethal / code: 21
- combat/end_turn / code: 10
- shop/buy / deepseek: 10
- rest/plan / deepseek: 9
- rest/proceed / code: 9
- event/leave / code: 7
- event/choose / deepseek: 5
- selection/take into my hand / code: 5
- shop/leave / code: 5
- shop/open / code: 5
- shop/plan / deepseek: 5
- selection/take into my hand / jev: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- selection/add / deepseek: 3
- selection/upgrade / deepseek: 3
- combat/least-loss / code: 2
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- combat/plan-choice+potion-lethal / jev: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (防御+, 狱火, 愤怒 -> 瀑布巨兽, potion 格挡药水, 全身撞击 -> 瀑布巨兽) with confidence 0.04; code rank 1 (0.04)
- 第 25 层 combat/plan-choice: Jev chose plan 2/3 (战斗专注, 狱火+, 防御) with confidence 0.20; code rank 2 (0.20)
- 第 33 层 combat/plan-choice: Jev chose plan 3/9 (火焰屏障+, 坚定不移+, potion 再生药水, potion 熔炉的祝福, 愤怒+ -> 碾碎爪, 打击+ -> 碾碎爪) with confidence 0.28; code rank 3 (0.28)
- 第 38 层 selection/take into my hand: Jev chose 祭品 with confidence 0.13 (0.13)
- 第 38 层 combat/plan-choice: Jev chose plan 2/2 (防御, 火焰屏障+, 全身撞击+ -> 电球头, 愤怒 -> 电球头, 打击 -> 电球头) with confidence 0.08; code rank 2 (0.08)
- 第 38 层 combat/plan-choice: Jev chose plan 1/2 (祭品, 熔融之拳 -> 电球头, 熔融之拳 -> 电球头) with confidence 0.06; code rank 1 (0.06)
- 第 44 层 combat/plan-choice+potion: Jev chose plan 6/6 (撕裂, 防御+, 残酷+) with confidence 0.30; code rank - (rollout's best line, added) (0.30)
- 第 44 层 combat/plan-choice+potion: Jev chose plan 1/4 (狱火+, 熔融之拳 -> 青蛙骑士, 拆卸+ -> 青蛙骑士) with confidence 0.32; code rank 1; HP guard: plan 1 (狱火+, 熔融之拳 -> 青蛙骑士, 拆卸+ -> 青蛙骑士; hp -19) is mo (0.32)
- 第 45 层 combat/plan-choice+potion: Jev chose plan 1/7 (耸肩无视, potion 缚魂药水, 预备打击 -> 史莱姆狂战士, 打击 -> 史莱姆狂战士, 熔融之拳 -> 史莱姆狂战士) with confidence 0.34; code rank 1 (0.34)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 3/9 (战斗专注, 与我一战！ -> 永世沙漏, 拆卸+ -> 永世沙漏, 愤怒 -> 永世沙漏, potion 格挡药水, 全身撞击+ -> 永世沙漏) with confidence 0.29; code rank 3; HP guard: plan 3 (战斗专 (0.29)
