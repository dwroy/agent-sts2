## 复盘：run X7BX5DYHFZ3N — 阵亡，最高第 48 层

- 决策 778 个；Jev 调用 128 次，Claude 0 次，DeepSeek 47 次；token 894,480 入 / 6,830 出，约 $0.0379（Jev）；DeepSeek token 6,811,252 入（缓存命中 6,362,368，93%）/ 336,626 出；用时 58.6 分钟
- 决策者：code 409，jev-plan 170，jev 128，deepseek 71

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→54（-10，战后回复 +6），决策 jev 5，jev-plan 5，code 3
- 第 4 层 蟾蜍蝌蚪: HP 60→53（-7，战后回复 +6），决策 code 3，jev 2，jev-plan 2
- 第 5 层 淤泥旋螺: HP 59→55（-4，战后回复 +6），决策 code 3，jev 2，jev-plan 1
- 第 8 层 卑鄙地精/地精佣兵/胖地精: HP 53→53（-0，战后回复 +6），决策 jev-plan 5，jev 3，code 3
- 第 12 层 鬼祟珊瑚群: HP 80→47（-33，战后回复 +6），决策 code 10，jev-plan 3，jev 1
- 第 14 层 潮湿邪教徒/钙化邪教徒: HP 77→77（-0，战后回复 +3），决策 jev-plan 3，code 3，jev 1
- 第 15 层 花园幽灵鳗: HP 80→64（-16，战后回复 +6），决策 jev-plan 6，code 5，jev 3
- 第 17 层 乐加维林族母: HP 70→2（-68，战后回复 +6），决策 code 21，jev-plan 11，jev 5
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 65→48（-17，战后回复 +6），决策 jev-plan 5，code 4，jev 3
- 第 21 层 偷窃草蜢: HP 54→49（-5，战后回复 +6），决策 code 7，jev-plan 3，jev 1
- 第 23 层 虱虫之祖: HP 55→25（-30，战后回复 +6），决策 jev 7，jev-plan 7，code 2
- 第 30 层 寄生惧魔/胧光怪: HP 79→77（-2，战后回复 +3），决策 jev-plan 5，jev 3，code 1
- 第 31 层 啃咬机: HP 80→78（-2，战后回复 +2），决策 jev-plan 3，jev 2，code 2
- 第 33 层 无厌沙虫: HP 80→53（-27，战后回复 +6），决策 code 16，jev-plan 13，jev 11
- 第 35 层 咬人卷轴: HP 75→57（-18，战后回复 +6），决策 code 4，jev 2，jev-plan 1
- 第 37 层 虔诚雕刻师: HP 63→51（-12，战后回复 +6），决策 jev-plan 7，jev 5，code 3
- 第 43 层 电球头: HP 57→44（-13，战后回复 +6），决策 jev-plan 7，jev 5，code 4
- 第 48 层 永世沙漏: HP 98→0（-98），决策 code 124，jev-plan 83，jev 67

### 死亡战斗：第 48 层 永世沙漏
- T5 [code] combat/plan: code plan (only line): end turn; hp -24, dmg 0
- T6 [code] combat/plan: code plan (only distinct line): 巨像+, 无情猛攻+ -> 永世沙漏, 铁斩波 -> 永世沙漏, 熔融之拳 -> 永世沙漏; hp -0, dmg 81
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 无情猛攻+ -> 永世沙漏
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 铁斩波 -> 永世沙漏
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 熔融之拳 -> 永世沙漏
- T6 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T7 [jev] combat/plan-choice: Jev chose plan 1/2 (无情猛攻 -> 永世沙漏, 血墙, 凌虐 -> 永世沙漏, 愤怒+ -> 永世沙漏, 怨恨 -> 永世沙漏, 全身撞击 -> 永世沙漏) with confidence 0.28; code rank 1 conf 0.28
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 血墙
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 全身撞击 -> 永世沙漏, 愤怒+ -> 永世沙漏, 怨恨 -> 永世沙漏
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒+ -> 永世沙漏
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 怨恨 -> 永世沙漏
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 170
- combat/plan-choice / jev: 118
- combat/plan / code: 83
- combat/plan-continue / code: 80
- reward/claim / code: 47
- map/route-follow / code: 42
- selection/discard / code: 27
- selection/confirm / code: 20
- combat/lethal / code: 19
- reward/card / deepseek: 18
- reward/proceed / code: 17
- combat/least-loss / code: 14
- rest/plan / deepseek: 13
- rest/proceed / code: 13
- combat/end_turn / code: 11
- shop/buy / deepseek: 11
- event/leave / code: 10
- combat/plan-choice+potion / jev: 9
- event/choose / deepseek: 9
- selection/upgrade / deepseek: 8
- selection/add / code: 5
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / deepseek: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- combat/plan-choice+potion-lethal / jev: 1
- event/after-discard / code: 1
- event/plan / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：42 个
- 第 2 层 combat/plan-choice: Jev chose plan 11/11 (打击 -> 噬尸蛞蝓 #1, 打击 -> 噬尸蛞蝓 #1, 防御) with confidence 0.32; code rank - (rollout's best line, added) (0.32)
- 第 15 层 combat/plan-choice: Jev chose plan 1/2 (防御, 预备打击 -> 花园幽灵鳗 #1, 打击 -> 花园幽灵鳗 #2) with confidence 0.24; code rank 1 (0.24)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 乐加维林族母, 愤怒 -> 乐加维林族母, 无情猛攻 -> 乐加维林族母, 究极打击+ -> 乐加维林族母, 踩踏, potion 爆炸安瓿) with confidence 0.06; code rank 1 (0.06)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (打击 -> 无厌沙虫) with confidence 0.31; code rank 2 (0.31)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.15; code rank 2 (0.15)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.03; code rank 2 (0.03)
- 第 33 层 combat/plan-choice: Jev chose plan 4/4 (愤怒 -> 无厌沙虫, 防御, 狂乱逃离, 狂乱逃离) with confidence 0.21; code rank 4 (0.21)
- 第 33 层 combat/plan-choice: Jev chose plan 1/2 (potion 鲜血药水) with confidence 0.13; code rank 1 (0.13)
- 第 48 层 combat/plan-choice+potion: Jev chose plan 1/6 (potion 力量药水, 预备打击 -> 永世沙漏, 铁斩波+ -> 永世沙漏, 愤怒+ -> 永世沙漏, 打击 -> 永世沙漏, 怨恨 -> 永世沙漏) with confidence 0.31; code rank 1 (0.31)
- 第 48 层 combat/plan-choice: Jev chose plan 5/6 (势不可当+, 打击+ -> 永世沙漏, 打击 -> 永世沙漏, 凌虐 -> 永世沙漏, 踩踏) with confidence 0.29; code rank 5 (0.29)
- 第 48 层 combat/plan-choice: Jev chose plan 3/7 (重锤+ -> 永世沙漏, 防御+, 究极打击+ -> 永世沙漏) with confidence 0.22; code rank 3 (0.22)
- 第 48 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.30; code rank 3 (0.30)
- 第 48 层 combat/plan-choice: Jev chose plan 1/2 (心神不宁+, 打击+ -> 永世沙漏, 打击 -> 永世沙漏, 踩踏, 凌虐 -> 永世沙漏, potion 鲜血药水) with confidence 0.24; code rank 1 (0.24)
- 第 48 层 combat/plan-choice: Jev chose plan 1/2 (打击+ -> 永世沙漏, 打击 -> 永世沙漏, 踩踏, 凌虐 -> 永世沙漏, potion 鲜血药水) with confidence 0.26; code rank 1 (0.26)
- 第 48 层 combat/plan-choice: Jev chose plan 2/3 (耸肩无视, 预备打击 -> 永世沙漏, 打击 -> 永世沙漏, 重锤 -> 永世沙漏) with confidence 0.24; code rank 2 (0.24)
