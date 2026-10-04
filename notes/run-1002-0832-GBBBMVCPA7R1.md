## 复盘：run GBBBMVCPA7R1 — 阵亡，最高第 46 层

- 决策 589 个；Jev 调用 127 次，Claude 0 次，DeepSeek 43 次；token 737,391 入 / 6,990 出，约 $0.0313（Jev）；DeepSeek token 5,961,357 入（缓存命中 5,425,280，91%）/ 314,346 出；用时 52.7 分钟
- 决策者：code 267，jev-plan 136，jev 127，deepseek 59

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→62（-2，战后回复 +6），决策 code 12，jev-plan 4，jev 2
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 68→57（-11，战后回复 +6），决策 code 4，jev 3，jev-plan 3
- 第 4 层 小啃兽: HP 63→55（-8，战后回复 +6），决策 code 9，jev 1，jev-plan 1
- 第 5 层 劫掠者刺客/劫掠者弩手/劫掠者斧手: HP 61→51（-10，战后回复 +6），决策 jev-plan 5，code 5，jev 3
- 第 8 层 多尼斯异鸟: HP 57→21（-36，战后回复 +6），决策 code 10，jev 4，jev-plan 3
- 第 11 层 利齿之眼/雾菇: HP 51→51（-0，战后回复 +6），决策 jev 3，code 3，jev-plan 2
- 第 12 层 旧日雕像: HP 57→36（-21，战后回复 +6），决策 jev 10，jev-plan 8，code 3
- 第 17 层 同族信徒/同族神官: HP 75→29（-46，战后回复 +6），决策 jev-plan 15，jev 14，code 9
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 76→61（-15，战后回复 +6），决策 code 3，jev 2，jev-plan 1
- 第 22 层 偷窃草蜢: HP 87→70（-17，战后回复 +6），决策 jev 8，jev-plan 5，code 4
- 第 27 层 蜂群术士: HP 76→17（-59，战后回复 +6），决策 jev 12，jev-plan 9，code 3
- 第 28 层 外骨骼虫: HP 23→19（-4，战后回复 +6），决策 jev-plan 5，jev 3，code 1
- 第 30 层 异螨: HP 51→39（-12，战后回复 +6），决策 jev-plan 8，jev 7，code 1
- 第 33 层 无厌沙虫: HP 71→55（-16，战后回复 +6），决策 jev-plan 14，code 12，jev 8
- 第 35 层 虔诚雕刻师: HP 81→60（-21，战后回复 +6），决策 jev-plan 9，jev 6，code 3
- 第 36 层 咬人卷轴: HP 66→46（-20，战后回复 +6），决策 code 9，jev 6，jev-plan 5
- 第 39 层 失落之物/遗忘之物: HP 67→46（-21，战后回复 +6），决策 jev-plan 14，jev 10，code 6
- 第 43 层 电球头: HP 76→43（-33，战后回复 +6），决策 jev-plan 13，jev 11，code 1
- 第 45 层 噪音机器人/守护机器人/戳刺机器人/电击机器人/组装师: HP 49→15（-34，战后回复 +6），决策 jev 12，jev-plan 12，code 10
- 第 46 层 灵魂枢纽: HP 21→0（-21），决策 code 7，jev 2

### 死亡战斗：第 46 层 灵魂枢纽
- T1 [jev] combat/plan-choice+potion: Jev chose to drink 技能药水, then re-plan (confidence 0.41) conf 0.41
- T1 [jev] selection/take into my hand: Jev chose 挑衅 with confidence 0.47 conf 0.47
- T1 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 神化+, 被遗忘的仪式+, 恶魔形态+, 挑衅 -> 灵魂枢纽, 双重打击+ -> 灵魂枢纽, 双重打击 -> 灵魂枢纽
- T1 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 被遗忘的仪式+, 恶魔形态+, 挑衅+ -> 灵魂枢纽, 双重打击+ -> 灵魂枢纽, 双重打击+ -> 灵魂枢纽
- T1 [code] combat/plan-continue: continuing the code-chosen plan: 恶魔形态+
- T1 [code] combat/plan-continue: continuing the code-chosen plan: 挑衅+ -> 灵魂枢纽
- T1 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击+ -> 灵魂枢纽
- T1 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击+ -> 灵魂枢纽
- T1 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 136
- combat/plan-choice / jev: 97
- reward/claim / code: 51
- combat/plan / code: 49
- map/route-follow / code: 40
- combat/plan-continue / code: 31
- combat/plan-choice+potion / jev: 27
- combat/lethal / code: 22
- reward/card / deepseek: 19
- reward/proceed / code: 19
- event/leave / code: 11
- shop/buy / deepseek: 9
- combat/end_turn / code: 8
- rest/plan / deepseek: 7
- rest/proceed / code: 7
- event/choose / deepseek: 5
- shop/leave / code: 5
- shop/open / code: 5
- event/plan / deepseek: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/least-loss / code: 3
- selection/take into my hand / jev: 3
- shop/plan / deepseek: 3
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/add / deepseek: 2
- selection/upgrade / deepseek: 2
- shop/buy / code: 2
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/discard / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/transform / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：8 个
- 第 8 层 combat/plan-choice: Jev chose plan 2/2 (end turn); plan 1 (愤怒 -> 多尼斯异鸟) is as good or better on every axis, playing it with confidence 0.25; code rank 1 (0.25)
- 第 11 层 combat/plan-choice: Jev chose plan 2/3 (彼岸咆哮+, 愤怒 -> 雾菇) with confidence 0.32; code rank 2 (0.32)
- 第 17 层 combat/plan-choice: Jev chose plan 2/4 (上勾拳 -> 同族神官, 彼岸咆哮+) with confidence 0.31; code rank 2 (0.31)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (放血+, 踩踏) with confidence 0.17; code rank 1 (0.17)
- 第 27 层 combat/plan-choice+potion: Jev chose plan 9/9 (地狱之刃+, 防御, 羽化+, 放血+, 防御) with confidence 0.23; code rank - (rollout's best line, added) (0.23)
- 第 27 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.20) (0.20)
- 第 33 层 combat/plan-choice: Jev chose plan 1/6 (potion 异鱼之油, 打击 -> 无厌沙虫, 双重打击 -> 无厌沙虫, potion 敏捷药水, 耸肩无视+) with confidence 0.15; code rank 1 (0.15)
- 第 45 层 combat/plan-choice: Jev chose plan 3/3 (剑柄打击 -> 组装师, 耸肩无视+, 全身撞击+ -> 戳刺机器人) with confidence 0.30; code rank 3 (0.30)
