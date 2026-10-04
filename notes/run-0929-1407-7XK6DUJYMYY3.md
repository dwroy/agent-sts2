## 复盘：run 7XK6DUJYMYY3 — 阵亡，最高第 48 层

- 决策 593 个；Jev 调用 92 次，Claude 0 次，DeepSeek 54 次；token 350,301 入 / 5,376 出，约 $0.0149（Jev）；DeepSeek token 1,254,595 入（缓存命中 876,672，70%）/ 260,255 出；用时 40.2 分钟
- 决策者：code 337，jev-plan 97，jev 92，deepseek 67

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→64（-0），决策 code 7，jev-plan 3，jev 1
- 第 5 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 79→79（-0），决策 code 7，jev-plan 3，jev 1
- 第 8 层 异蛙寄生虫/扭动虫: HP 87→52（-35），决策 code 15，jev-plan 8，jev 6
- 第 14 层 缩小甲虫: HP 83→83（-0），决策 code 4，jev 1，jev-plan 1
- 第 15 层 旧日雕像: HP 87→72（-15），决策 code 8，jev-plan 3，jev 2
- 第 17 层 墨影幻灵: HP 78→18（-60），决策 code 20，jev-plan 7，jev 6
- 第 19 层 地道虫: HP 74→72（-2），决策 code 9，jev 1
- 第 20 层 偷窃草蜢: HP 78→76（-2），决策 jev 3，jev-plan 3，code 3
- 第 22 层 幼虫/直飞产卵虫/结实的卵: HP 82→82（-0），决策 code 7，jev 5，jev-plan 4
- 第 23 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 87→78（-9），决策 jev 6，jev-plan 5，code 5
- 第 25 层 棘刺蟾蜍: HP 84→60（-24），决策 jev 6，code 6，jev-plan 5
- 第 27 层 异螨: HP 61→61（-0），决策 jev-plan 4，code 3，jev 1
- 第 28 层 猎人杀手: HP 67→67（-0），决策 code 5，jev-plan 3，jev 1
- 第 33 层 无厌沙虫: HP 87→47（-40），决策 code 12，jev-plan 6，jev 5
- 第 35 层 虔诚雕刻师: HP 80→46（-34），决策 jev-plan 9，jev 7，code 4
- 第 36 层 战斗好伙伴V1.0: HP 52→52（-0），决策 code 5
- 第 37 层 活体盾/高塔炮手: HP 58→46（-12），决策 code 5，jev 4，jev-plan 4
- 第 39 层 咬人卷轴: HP 52→61（+9），决策 code 8，jev 4，jev-plan 3
- 第 40 层 巨斧机器人: HP 67→56（-11），决策 jev-plan 11，jev 8，code 8
- 第 42 层 电球头: HP 62→54（-8），决策 jev 5，jev-plan 5，code 2
- 第 42 层 电球头: HP 54→37（-17），决策 code 2，jev 2，jev-plan 1
- 第 45 层 猫头鹰法官: HP 83→36（-47），决策 code 14，jev 5，jev-plan 5
- 第 48 层 实验体 #C28: HP 64→62（-2），决策 jev 2，jev-plan 1
- 第 48 层 实验体 #C28: HP 62→29（-33），决策 code 12，jev 7，jev-plan 3

### 死亡战斗：第 48 层 实验体 #C28
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视
- T2 [jev] combat/plan-choice: Jev chose plan 3/4 (防御) with confidence 0.37; code rank 3 conf 0.37
- T2 [code] combat/plan: code plan (only distinct line): end turn; hp -3, dmg 0
- T3 [jev] combat/plan-choice: Jev chose plan 2/4 (战斗专注, 双重打击 -> 实验体 #C28, 飞剑回旋镖+, 痛殴 -> 实验体 #C28) with confidence 0.34; code rank 2 conf 0.34
- T3 [jev] combat/plan-choice: Jev chose plan 3/3 (飞剑回旋镖+, 血墙+) with confidence 0.45; code rank 3 conf 0.45
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 血墙+
- T3 [code] combat/plan: code plan (only line): end turn; hp -22, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-11): 防御, 被遗忘的仪式, 岩石铠甲+, 打击 -> 实验体 #C28
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 被遗忘的仪式
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 岩石铠甲+
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 实验体 #C28
- T4 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 97
- combat/plan-choice / jev: 86
- combat/plan / code: 79
- reward/claim / code: 54
- combat/plan-continue / code: 51
- map/route-follow / code: 41
- combat/lethal / code: 23
- reward/card / deepseek: 20
- reward/proceed / code: 20
- shop/plan / deepseek: 12
- rest/plan / deepseek: 10
- rest/proceed / code: 10
- combat/plan-potion / code: 9
- event/leave / code: 9
- combat/end_turn / code: 8
- selection/take into my hand / code: 7
- selection/upgrade / deepseek: 7
- shop/leave / code: 5
- shop/open / code: 5
- event/choose / deepseek: 4
- shop/buy / deepseek: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/plan-choice+potion / jev: 3
- event/plan / deepseek: 3
- selection/take into my hand / jev: 3
- event/act-plan / deepseek: 2
- map/route / code: 2
- map/route-plan / deepseek: 2
- shop/buy / code: 2
- combat/least-loss / code: 1
- map/route-follow / deepseek: 1
- map/route-review / deepseek: 1
- run/finalize / code: 1
- selection/add / code: 1
- selection/remove / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：12 个
- 第 8 层 combat/plan-choice: Jev chose plan 1/2 (岩石铠甲+, 打击 -> 异蛙寄生虫, 防御) with confidence 0.11; code rank 1 (0.11)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (potion 火焰药水 -> 墨影幻灵) with confidence 0.31; code rank 1 (0.31)
- 第 25 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 棘刺蟾蜍, 打击 -> 棘刺蟾蜍, 岩石铠甲+, potion 虚弱药水 -> 棘刺蟾蜍) with confidence 0.27; code rank 1 (0.27)
- 第 28 层 combat/plan-choice: Jev chose plan 10/10 (岩石铠甲+, 与我一战！+ -> 猎人杀手, 头槌 -> 猎人杀手, 打击 -> 猎人杀手) with confidence 0.34; code rank - (rollout's best line, added) (0.34)
- 第 35 层 combat/plan-choice: Jev chose plan 1/2 (岩石铠甲+, 被遗忘的仪式, 痛击+ -> 虔诚雕刻师, 打击 -> 虔诚雕刻师) with confidence 0.24; code rank 1 (0.24)
- 第 39 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 咬人卷轴, 预备打击+ -> 咬人卷轴, 与我一战！+ -> 咬人卷轴, 撕裂+, 凌虐 -> 咬人卷轴) with confidence 0.30; code rank 1 (0.30)
- 第 40 层 combat/plan-choice: Jev chose plan 1/2 (祭品+, 打击 -> 巨斧机器人, 头槌 -> 巨斧机器人, 欺凌 -> 巨斧机器人, 踩踏+) with confidence 0.00; code rank 1 (0.00)
- 第 42 层 selection/take into my hand: Jev chose 无情猛攻 with confidence 0.29 (0.29)
- 第 48 层 combat/plan-choice: Jev chose plan 7/7 (耸肩无视, 无惧疼痛) with confidence 0.25; code rank 7 (0.25)
- 第 48 层 combat/plan-choice: Jev chose plan 1/11 (无惧疼痛, 祭品+, 痛击+ -> 实验体 #C28, 突破, 地狱之刃+) with confidence 0.34; code rank 1 (0.34)
- 第 48 层 combat/plan-choice: Jev chose plan 10/11 (闪电霹雳+, 耸肩无视, 防御) with confidence 0.24; code rank 10 (0.24)
- 第 48 层 combat/plan-choice: Jev chose plan 2/4 (战斗专注, 双重打击 -> 实验体 #C28, 飞剑回旋镖+, 痛殴 -> 实验体 #C28) with confidence 0.34; code rank 2 (0.34)
