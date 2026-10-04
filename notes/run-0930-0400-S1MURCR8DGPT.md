## 复盘：run S1MURCR8DGPT — 胜利，最高第 48 层

- 决策 744 个；Jev 调用 142 次，Claude 0 次，DeepSeek 44 次；token 506,508 入 / 7,505 出，约 $0.0216（Jev）；DeepSeek token 1,185,340 入（缓存命中 780,544，66%）/ 206,919 出；用时 42.7 分钟
- 决策者：code 368，jev-plan 167，jev 142，deepseek 67

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 64→61（-3，战后回复 +6），决策 code 7，jev-plan 3，jev 2
- 第 4 层 淤泥旋螺: HP 67→66（-1，战后回复 +6），决策 code 6，jev-plan 3，jev 2
- 第 6 层 蟾蜍蝌蚪: HP 72→72（-0，战后回复 +6），决策 code 6，jev 5，jev-plan 4
- 第 7 层 海洋混混/钙化邪教徒: HP 78→65（-13，战后回复 +6），决策 code 8，jev 7，jev-plan 5
- 第 9 层 鬼祟珊瑚群: HP 71→46（-25，战后回复 +6），决策 code 10，jev-plan 7，jev 4
- 第 11 层 噬尸蛞蝓: HP 52→48（-4，战后回复 +6），决策 code 7，jev 3，jev-plan 3
- 第 14 层 花园幽灵鳗: HP 78→51（-27，战后回复 +6），决策 code 8，jev 4，jev-plan 2
- 第 17 层 灵魂异鱼: HP 77→40（-37，战后回复 +6），决策 code 14，jev-plan 10，jev 7
- 第 19 层 地道虫: HP 73→66（-7，战后回复 +6），决策 jev-plan 7，code 6，jev 2
- 第 20 层 偷窃草蜢: HP 72→63（-9，战后回复 +6），决策 code 9，jev-plan 6，jev 5
- 第 21 层 猎人杀手: HP 69→36（-33，战后回复 +6），决策 code 9，jev 6，jev-plan 5
- 第 24 层 寄生惧魔/胧光怪: HP 62→37（-25，战后回复 +6），决策 code 6，jev-plan 5，jev 3
- 第 28 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 77→64（-13，战后回复 +6），决策 jev-plan 10，code 10，jev 7
- 第 30 层 棘刺蟾蜍: HP 70→60（-10，战后回复 +6），决策 jev-plan 8，code 8，jev 4
- 第 31 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 86→66（-20，战后回复 +6），决策 jev-plan 7，code 7，jev 5
- 第 33 层 知识恶魔: HP 90→24（-66，战后回复 +6），决策 code 21，jev-plan 15，jev 10
- 第 35 层 虔诚雕刻师: HP 78→43（-35，战后回复 +6），决策 jev 9，code 7，jev-plan 7
- 第 36 层 活体盾/高塔炮手: HP 49→29（-20，战后回复 +6），决策 jev-plan 8，jev 6，code 4
- 第 38 层 史莱姆狂战士: HP 55→38（-17，战后回复 +6），决策 jev 14，jev-plan 14，code 6
- 第 45 层 拳击构装体/方柱构装体: HP 91→75（-16，战后回复 +6），决策 jev 11，jev-plan 11，code 6
- 第 46 层 巨斧机器人: HP 101→68（-33，战后回复 +6），决策 jev-plan 14，code 12，jev 6
- 第 48 层 永世沙漏: HP 107→80（-27，战后回复 +6），决策 jev 15，code 13，jev-plan 13

### 各类决策由谁做
- combat/plan-continue / jev-plan: 167
- combat/plan-choice / jev: 127
- combat/plan / code: 104
- reward/claim / code: 69
- map/route-follow / code: 42
- combat/plan-continue / code: 33
- combat/lethal / code: 25
- reward/proceed / code: 22
- reward/card / deepseek: 21
- shop/buy / deepseek: 10
- rest/plan / deepseek: 9
- rest/proceed / code: 9
- event/leave / code: 8
- selection/add / code: 8
- selection/exhaust / code: 8
- combat/plan-choice+potion / jev: 7
- combat/end_turn / code: 6
- event/choose / deepseek: 5
- selection/take into my hand / jev: 5
- shop/leave / code: 5
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- selection/curse / code: 4
- selection/upgrade / deepseek: 4
- shop/open / code: 4
- shop/plan / deepseek: 4
- event/only / code: 3
- event/plan / deepseek: 3
- selection/add / jev: 3
- event/act-plan / deepseek: 2
- map/route / code: 2
- map/route-follow / deepseek: 2
- selection/remove / deepseek: 2
- selection/take into my hand / code: 2
- selection/transform / deepseek: 2
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/enchant / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：16 个
- 第 17 层 combat/plan-choice: Jev chose plan 2/4 (呼唤, 无情猛攻 -> 灵魂异鱼, 踩踏) with confidence 0.32; code rank 2 (0.32)
- 第 19 层 combat/plan-choice: Jev chose plan 1/5 (狱火+, 防御+, 被遗忘的仪式, 痛击+ -> 地道虫, 打击+ -> 地道虫, potion 爆炸安瓿) with confidence 0.19; code rank 1 (0.19)
- 第 21 层 combat/plan-choice: Jev chose plan 10/10 (主宰 -> 猎人杀手, 剑柄打击 -> 猎人杀手, 耸肩无视) with confidence 0.30; code rank - (rollout's best line, added) (0.30)
- 第 24 层 combat/plan-choice: Jev chose plan 2/7 (无情猛攻 -> 胧光怪, 痛击+ -> 胧光怪, 剑柄打击 -> 胧光怪) with confidence 0.24; code rank 2 (0.24)
- 第 28 层 combat/plan-choice: Jev chose plan 1/4 (放血, 头槌 -> 盛碗虫（石）, 打击+ -> 盛碗虫（石）) with confidence 0.29; code rank 1 (0.29)
- 第 33 层 combat/plan-choice: Jev chose plan 3/3 (狱火+, 邪眼, 防御) with confidence 0.24; code rank 3 (0.24)
- 第 35 层 combat/plan-choice: Jev chose plan 6/6 (无情猛攻 -> 虔诚雕刻师, 邪眼) with confidence 0.28; code rank - (rollout's best line, added) (0.28)
- 第 35 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 虔诚雕刻师) with confidence 0.29; code rank 1 (0.29)
- 第 35 层 combat/plan-choice: Jev chose plan 1/5 (被遗忘的仪式, 痛击+ -> 虔诚雕刻师, 踩踏) with confidence 0.33; code rank 1 (0.33)
- 第 36 层 combat/plan-choice: Jev chose plan 2/6 (坚毅+, 绯红披风+, 被遗忘的仪式, 无情猛攻 -> 活体盾, 踩踏, 撕裂+) with confidence 0.20; code rank 2 (0.20)
- 第 38 层 combat/plan-choice: Jev chose plan 4/10 (剑柄打击 -> 史莱姆狂战士, 头槌 -> 史莱姆狂战士, 放血, 彼岸咆哮, potion 鲜血药水) with confidence 0.29; code rank 4 (0.29)
- 第 38 层 combat/plan-choice: Jev chose plan 1/7 (无惧疼痛+, 放血, 彼岸咆哮, potion 鲜血药水) with confidence 0.10; code rank 1 (0.10)
- 第 38 层 combat/plan-choice: Jev chose plan 2/2 (防御+) with confidence 0.13; code rank 2 (0.13)
- 第 45 层 combat/plan-choice: Jev chose plan 2/2 (被遗忘的仪式, 邪眼, 踩踏) with confidence 0.33; code rank 2 (0.33)
- 第 45 层 selection/add: Jev chose 踩踏 with confidence 0.34 (0.34)
