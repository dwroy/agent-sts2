## 复盘：run 4JGPCH3WX6JV — 阵亡，最高第 48 层

- 决策 573 个；Jev 调用 107 次，Claude 0 次，DeepSeek 44 次；token 666,689 入 / 6,199 出，约 $0.0283（Jev）；DeepSeek token 6,116,237 入（缓存命中 5,687,552，93%）/ 227,519 出；用时 44.3 分钟
- 决策者：code 270，jev-plan 137，jev 107，deepseek 59

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→59（-5，战后回复 +6），决策 jev-plan 5，code 5，jev 3
- 第 3 层 噬尸蛞蝓: HP 65→58（-7，战后回复 +6），决策 jev-plan 3，code 3，jev 2
- 第 4 层 蟾蜍蝌蚪: HP 64→60（-4，战后回复 +6），决策 jev 2，code 2，jev-plan 1
- 第 5 层 双尾鼠: HP 66→65（-1，战后回复 +6），决策 jev 4，jev-plan 2，code 1
- 第 8 层 噬尸蛞蝓: HP 71→71（-0，战后回复 +6），决策 jev 4，jev-plan 3，code 2
- 第 9 层 海洋混混/钙化邪教徒: HP 77→77（-0，战后回复 +3），决策 code 4，jev-plan 3，jev 2
- 第 11 层 鬼祟珊瑚群: HP 80→72（-8，战后回复 +6），决策 code 9，jev-plan 6，jev 5
- 第 12 层 化石追踪者: HP 78→74（-4，战后回复 +6），决策 code 5，jev-plan 3，jev 2
- 第 14 层 骇鳗: HP 80→72（-8，战后回复 +6），决策 jev 7，jev-plan 4，code 1
- 第 17 层 灵魂异鱼: HP 78→73（-5，战后回复 +6），决策 code 11，jev-plan 10，jev 5
- 第 19 层 外骨骼虫: HP 79→79（-0，战后回复 +1），决策 code 5，jev 4，jev-plan 4
- 第 21 层 盛碗虫（卵）/盛碗虫（石）: HP 80→77（-3，战后回复 +3），决策 code 3，jev-plan 2，jev 1
- 第 22 层 外骨骼虫: HP 80→72（-8，战后回复 +6），决策 jev-plan 7，code 5，jev 4
- 第 23 层 猎人杀手: HP 78→71（-7，战后回复 +6），决策 code 5，jev-plan 4，jev 2
- 第 25 层 直飞产卵虫/结实的卵: HP 77→76（-1，战后回复 +4），决策 code 4，jev-plan 3，jev 1
- 第 29 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 74→67（-7，战后回复 +6），决策 code 5，jev 4，jev-plan 4
- 第 31 层 啃咬机: HP 73→59（-14，战后回复 +6），决策 jev-plan 6，jev 5，code 4
- 第 33 层 火箭/碾碎爪: HP 80→34（-46，战后回复 +6），决策 jev-plan 24，jev 13，code 8
- 第 35 层 咬人卷轴: HP 72→65（-7，战后回复 +6），决策 jev-plan 5，jev 4，code 2
- 第 37 层 虔诚雕刻师: HP 71→61（-10，战后回复 +6），决策 jev-plan 8，jev 6
- 第 39 层 猫头鹰法官: HP 78→35（-43，战后回复 +6），决策 jev 9，jev-plan 9，code 2
- 第 43 层 史莱姆狂战士: HP 78→48（-30，战后回复 +6），决策 jev-plan 12，jev 8，code 8
- 第 45 层 战斗好伙伴V1.0: HP 54→54（-0，战后回复 +6），决策 jev 2，jev-plan 2，code 1
- 第 48 层 女王/火炬头聚合体: HP 85→0（-85），决策 code 15，jev 8，jev-plan 7

### 死亡战斗：第 48 层 女王/火炬头聚合体
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 血墙+
- T4 [code] combat/plan: code plan (only line): end turn; hp -2, dmg 0
- T5 [jev] combat/plan-choice: Jev chose plan 3/5 (完美打击+ -> 火炬头聚合体) with confidence 0.78; code rank 3 conf 0.78
- T5 [code] combat/plan: code plan (only line): end turn; hp -24, dmg 0
- T6 [code] combat/plan: code plan (only distinct line): 无情猛攻+ -> 火炬头聚合体, 耸肩无视+, 完美打击+ -> 火炬头聚合体; hp -0, dmg 62
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 耸肩无视+
- T6 [code] combat/plan: code plan (only distinct line): 完美打击+ -> 火炬头聚合体, 闪电霹雳+; hp -0, dmg 40
- T6 [code] combat/plan: code plan (only distinct line): 闪电霹雳+; hp -0, dmg 0
- T6 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-24): 防御+, 旋风斩+
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩+
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-24): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 137
- combat/plan-choice / jev: 97
- reward/claim / code: 56
- combat/plan / code: 50
- map/route-follow / code: 42
- combat/plan-continue / code: 26
- reward/proceed / code: 24
- combat/lethal / code: 23
- reward/card / deepseek: 22
- event/leave / code: 9
- rest/plan / deepseek: 9
- rest/proceed / code: 9
- combat/end_turn / code: 6
- combat/plan-choice+potion-lethal / jev: 6
- shop/buy / deepseek: 6
- event/choose / deepseek: 5
- selection/upgrade / deepseek: 5
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- combat/least-loss / code: 2
- combat/plan-choice+potion / jev: 2
- event/act-plan / deepseek: 2
- event/plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/exhaust / code: 2
- selection/take into my hand / jev: 2
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/free-card / code: 1
- selection/remove / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：7 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/3 (防御, 痛击 -> 淤泥旋螺) with confidence 0.28; code rank 2 (0.28)
- 第 33 层 combat/plan-choice: Jev chose plan 5/10 (耸肩无视, 狂怒, 打击 -> 碾碎爪) with confidence 0.24; code rank 5 (0.24)
- 第 33 层 combat/plan-choice: Jev chose plan 1/3 (无情猛攻+ -> 碾碎爪, 完美打击+ -> 碾碎爪, 飞剑回旋镖+, 痛殴 -> 碾碎爪) with confidence 0.31; code rank 1 (0.31)
- 第 43 层 combat/plan-choice: Jev chose plan 4/4 (完美打击+ -> 史莱姆狂战士) with confidence 0.24; code rank - (rollout's best line, added) (0.24)
- 第 43 层 combat/plan-choice: Jev chose plan 2/4 (potion 明耀酊剂, 打击+ -> 史莱姆狂战士) with confidence 0.14; code rank 2 (0.14)
- 第 48 层 combat/plan-choice: Jev chose plan 2/3 (potion 易伤药水 -> 火炬头聚合体) with confidence 0.11; code rank 2 (0.11)
- 第 48 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.34; code rank 2 (0.34)
