## 复盘：run SK1USHSB1U7U — 阵亡，最高第 45 层

- 决策 550 个；Jev 调用 84 次，Claude 0 次，DeepSeek 60 次；token 249,619 入 / 3,864 出，约 $0.0106（Jev）；DeepSeek token 1,141,364 入（缓存命中 831,104，73%）/ 213,538 出；用时 36.5 分钟
- 决策者：code 302，jev-plan 104，jev 84，deepseek 60

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→53（-11），决策 code 7，jev-plan 3，jev 2
- 第 5 层 蟾蜍蝌蚪: HP 73→72（-1），决策 jev-plan 3，code 3，jev 1
- 第 7 层 淤泥旋螺: HP 70→70（-0），决策 code 9，jev-plan 2，jev 1
- 第 8 层 骇鳗: HP 76→41（-35），决策 code 11，jev-plan 8，jev 6
- 第 12 层 拳击构装体: HP 71→71（-0），决策 code 5，jev 2，jev-plan 1
- 第 12 层 拳击构装体: HP 71→70（-1），决策 code 5，jev 2，jev-plan 1
- 第 17 层 灵魂异鱼: HP 76→73（-3），决策 jev-plan 7，jev 5，code 2
- 第 17 层 灵魂异鱼: HP 73→68（-5），决策 code 9，jev-plan 5，jev 2
- 第 17 层 灵魂异鱼: HP 68→68（-0），决策 code 1
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 82→82（-0），决策 code 4
- 第 22 层 偷窃草蜢: HP 84→80（-4），决策 jev-plan 4，jev 3，code 2
- 第 22 层 偷窃草蜢: HP 79→79（-0），决策 code 1，jev 1，jev-plan 1
- 第 24 层 猎人杀手: HP 84→84（-0），决策 jev 1，jev-plan 1
- 第 24 层 猎人杀手: HP 84→84（-0），决策 code 7
- 第 25 层 寄生惧魔/胧光怪: HP 84→47（-37），决策 jev-plan 14，jev 11，code 10
- 第 25 层 寄生惧魔/胧光怪: HP 47→15（-32），决策 code 3，jev 2
- 第 28 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 21→21（-0），决策 jev-plan 6，jev 4，code 3
- 第 30 层 棘刺蟾蜍: HP 50→50（-0），决策 jev 1，jev-plan 1
- 第 30 层 棘刺蟾蜍: HP 49→46（-3），决策 jev-plan 5，code 4，jev 2
- 第 33 层 知识恶魔: HP 77→77（-0），决策 jev-plan 2，jev 1，code 1
- 第 33 层 知识恶魔: HP 76→46（-30），决策 code 11，jev 3，jev-plan 3
- 第 33 层 知识恶魔: HP 43→30（-13），决策 jev 4，jev-plan 3，code 2
- 第 35 层 咬人卷轴: HP 105→105（-0），决策 code 3
- 第 37 层 虔诚雕刻师: HP 111→111（-0），决策 jev-plan 4，jev 3，code 1
- 第 37 层 虔诚雕刻师: HP 110→100（-10），决策 code 3，jev 1
- 第 37 层 虔诚雕刻师: HP 100→90（-10），决策 code 3，jev 2，jev-plan 2
- 第 40 层 青蛙骑士: HP 106→105（-1），决策 jev-plan 5，jev 2，code 1
- 第 40 层 青蛙骑士: HP 104→102（-2），决策 code 4，jev 3，jev-plan 3
- 第 40 层 青蛙骑士: HP 102→51（-51），决策 jev-plan 6，code 5，jev 5
- 第 43 层 战斗好伙伴V2.0: HP 54→52（-2），决策 code 7，jev-plan 4，jev 3
- 第 45 层 机甲骑士: HP 92→59（-33），决策 jev-plan 9，jev 8，code 4
- 第 45 层 机甲骑士: HP 59→31（-28），决策 code 5，jev 3，jev-plan 1

### 死亡战斗：第 45 层 机甲骑士
- T5 [jev] combat/plan-choice: Jev chose plan 3/3 (狱火) with confidence 0.11; code rank 3 conf 0.11
- T5 [code] combat/plan: code plan (only line): end turn; hp -15, dmg 0
- T6 [jev] combat/plan-choice: Jev chose plan 1/4 (剑柄打击 -> 机甲骑士, 御血术 -> 机甲骑士, 打击+ -> 机甲骑士) with confidence 0.73; code rank 1 conf 0.73
- T6 [jev] combat/plan-choice: Jev chose plan 1/3 (御血术 -> 机甲骑士, 御血术 -> 机甲骑士) with confidence 0.33; code rank 1 conf 0.33
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 御血术 -> 机甲骑士
- T6 [code] combat/plan: code plan (only line): end turn; hp -9, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-22): 撕裂
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-22): 愤怒 -> 机甲骑士
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-22): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 104
- combat/plan / code: 67
- combat/plan-choice / jev: 60
- reward/claim / code: 43
- combat/plan-continue / code: 41
- map/route-follow / code: 37
- combat/plan-choice+potion / jev: 24
- event/choose / deepseek: 21
- combat/lethal / code: 19
- reward/proceed / code: 17
- reward/card / deepseek: 16
- event/leave / code: 12
- selection/exhaust / code: 12
- shop/buy / deepseek: 9
- shop/buy / code: 7
- shop/leave / code: 7
- shop/open / code: 7
- rest/choose / deepseek: 6
- rest/proceed / code: 6
- map/route-plan / deepseek: 4
- selection/curse / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/end_turn / code: 3
- combat/least-loss / code: 3
- combat/plan-potion / code: 3
- map/route / code: 3
- selection/enchant / deepseek: 2
- selection/upgrade / deepseek: 2
- event/only / code: 1
- run/finalize / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：9 个
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (闪亮登场, 打击 -> 灵魂异鱼, 痛击+ -> 灵魂异鱼, 愤怒 -> 灵魂异鱼) with confidence 0.25; code rank 2 (0.25)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (potion 鲜血药水) with confidence 0.33; code rank 1 (0.33)
- 第 22 层 combat/plan-choice+potion: Jev chose plan 4/6 (挑衅 -> 偷窃草蜢, 烙印, potion 肌肉药水, 痛击+ -> 偷窃草蜢, 打击+ -> 偷窃草蜢) with confidence 0.22; code rank 4 (0.22)
- 第 40 层 combat/plan-choice: Jev chose plan 3/3 (剑柄打击 -> 青蛙骑士, 旋风斩); plan 1 (打击 -> 青蛙骑士, 剑柄打击 -> 青蛙骑士, 打击 -> 青蛙骑士) is as good or better on every axis, playing it with confidence 0 (0.15)
- 第 43 层 combat/plan-choice: Jev chose plan 1/3 (闪亮登场, 御血术 -> 战斗好伙伴V2.0, 打击+ -> 战斗好伙伴V2.0, 双重打击 -> 战斗好伙伴V2.0) with confidence 0.24; code rank 1 (0.24)
- 第 43 层 combat/plan-choice: Jev chose plan 2/2 (potion 敏捷药水) with confidence 0.21; code rank 2 (0.21)
- 第 45 层 combat/plan-choice+potion: Jev chose to drink 稳定血清 (confidence 0.03) (0.03)
- 第 45 层 combat/plan-choice: Jev chose plan 3/3 (狱火) with confidence 0.11; code rank 3 (0.11)
- 第 45 层 combat/plan-choice: Jev chose plan 1/3 (御血术 -> 机甲骑士, 御血术 -> 机甲骑士) with confidence 0.33; code rank 1 (0.33)
