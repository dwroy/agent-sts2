## 复盘：run XW8B5CHJ814J — 阵亡，最高第 49 层

- 决策 1223 个；Jev 调用 359 次，Claude 0 次，大脑 45 次（codex 45）；token 1,781,867 入 / 18,630 出，约 $0.0756（Jev）；大脑 token 6,140,406 入（缓存命中 3,348,224，55%）/ 12,127 出；用时 58.3 分钟
- 决策者：code 504，jev 359，jev-plan 299，codex 61

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 67→64（-3），决策 code 15，jev-plan 5，jev 3
- 第 3 层 缩小甲虫: HP 64→64（-0），决策 code 12，jev 3，jev-plan 2
- 第 5 层 小啃兽: HP 64→64（-0），决策 jev-plan 4，code 4，jev 1
- 第 6 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 64→59（-5），决策 jev-plan 11，code 8，jev 7
- 第 8 层 异蛙寄生虫/扭动虫: HP 81→61（-20），决策 code 14，jev-plan 13，jev 6
- 第 9 层 小啃兽: HP 61→57（-4），决策 jev-plan 10，code 10，jev 5
- 第 12 层 利齿之眼/雾菇: HP 57→57（-0），决策 code 10，jev-plan 5，jev 2
- 第 14 层 旧日雕像: HP 81→66（-15），决策 code 11，jev-plan 10，jev 6
- 第 17 层 墨影幻灵: HP 66→35（-31），决策 jev 23，jev-plan 19，code 2
- 第 19 层 外骨骼虫: HP 71→71（-0），决策 jev-plan 4，jev 2，code 2
- 第 20 层 盛碗虫（石）/盛碗虫（蜜）: HP 71→58（-13），决策 jev-plan 9，jev 6，code 2
- 第 22 层 猎人杀手: HP 58→42（-16），决策 jev 15，jev-plan 14，code 3
- 第 28 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 81→64（-17），决策 jev 13，jev-plan 9，code 3
- 第 29 层 蜂群术士: HP 64→52（-12），决策 jev 16，jev-plan 10，code 4
- 第 30 层 外骨骼虫: HP 52→52（-0），决策 jev 10，jev-plan 6，code 2
- 第 31 层 异螨: HP 52→35（-17），决策 jev 20，jev-plan 19，code 1
- 第 33 层 知识恶魔: HP 74→11（-63），决策 jev 34，jev-plan 19，code 11
- 第 35 层 虔诚雕刻师: HP 67→30（-37），决策 jev 18，jev-plan 12，code 10
- 第 36 层 咬人卷轴: HP 30→25（-5），决策 code 10，jev-plan 4，jev 3
- 第 37 层 战斗好伙伴V1.0: HP 25→25（-0），决策 code 7，jev-plan 2，jev 1
- 第 42 层 巨斧机器人: HP 48→17（-31），决策 code 23，jev-plan 17，jev 16
- 第 45 层 猫头鹰法官: HP 55→35（-20），决策 jev 14，jev-plan 11，code 9
- 第 48 层 实验体 #C69: HP 73→7（-66），决策 code 116，jev 108，jev-plan 68
- 第 49 层 女王/火炬头聚合体: HP 7→0（-7），决策 code 55，jev 27，jev-plan 16

### 死亡战斗：第 49 层 女王/火炬头聚合体
- T2 [code] combat/plan: code plan (only line): 斗篷与匕首, 后空翻, 防御+; hp -0, dmg 0
- T2 [jev] combat/plan-choice: Jev chose plan 1/2 (后空翻, 防御+, 小刀 -> 女王) with confidence 0.06; code rank 1 conf 0.06
- T2 [jev] combat/plan-choice: Jev chose plan 1/2 (防御+, 小刀 -> 女王) with confidence 0.08; code rank 1 conf 0.08
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 小刀 -> 女王
- T2 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T3 [jev] selection/choose: Jev chose 打击 with confidence 0.28 conf 0.28
- T3 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 9): 后空翻, 突然一拳+ -> 女王, 中和 ->
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-22): 突然一拳+ -> 女王, 中和 -> 火炬头聚合体, 毒雾, 切割 -> 女王
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 中和 -> 火炬头聚合体
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 毒雾
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 切割 -> 女王
- T3 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 299
- combat/plan-choice / jev: 149
- combat/plan / code: 148
- combat/plan-choice+potion / jev: 129
- combat/plan-continue / code: 91
- selection/choose / jev: 79
- reward/claim / code: 56
- map/route-follow / code: 43
- combat/lethal / code: 41
- combat/least-loss / code: 26
- combat/end_turn / code: 25
- reward/proceed / code: 22
- reward/card / codex: 21
- rest/plan / codex: 10
- rest/proceed / code: 10
- event/leave / code: 9
- shop/buy / codex: 9
- selection/curse / code: 6
- event/choose / codex: 5
- combat/mod-lethal / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / codex: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- selection/upgrade / codex: 3
- event/act-plan / codex: 2
- event/plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/take into my hand / jev: 2
- combat/phase-setup / code: 1
- combat/potion-now / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/free-card / code: 1
- selection/remove / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：46 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 毛绒伏地虫, 中和 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫, 防御) with confidence 0.32; code rank 1 (0.32)
- 第 6 层 selection/choose: Jev chose 进阶之灾 with confidence 0.31 (0.31)
- 第 22 层 combat/plan-choice+potion: Jev chose plan 3/3 (带毒刺击 -> 猎人杀手) with confidence 0.22; code rank - (rollout's best line, added) (0.22)
- 第 22 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.17) (0.17)
- 第 28 层 combat/plan-choice+potion: Jev chose plan 1/3 (potion 固化药水) with confidence 0.33; code rank 1 (0.33)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 1/2 (灵动步法+, 突然一拳+ -> 外骨骼虫 #3) with confidence 0.28; code rank 1 (0.28)
- 第 31 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.23) (0.23)
- 第 33 层 selection/choose: Jev chose 斗篷与匕首 with confidence 0.14 (0.14)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 2/2 (刀刃之舞, 中和 -> 知识恶魔, 防御) with confidence 0.28; code rank - (rollout's best line, added) (0.28)
- 第 33 层 selection/choose: Jev chose 中和 with confidence 0.26 (0.26)
- 第 35 层 selection/choose: Jev chose 中和 with confidence 0.13 (0.13)
- 第 35 层 selection/choose: Jev chose 打击 with confidence 0.18 (0.18)
- 第 35 层 selection/choose: Jev chose 打击 with confidence 0.29 (0.29)
- 第 36 层 combat/plan-choice: Jev chose plan 1/3 (小刀 -> 咬人卷轴 #2, 带毒刺击 -> 咬人卷轴 #2) with confidence 0.13; code rank 1 (0.13)
- 第 45 层 combat/plan-choice: Jev chose plan 1/5 (斗篷与匕首, 带毒刺击 -> 猫头鹰法官) with confidence 0.27; code rank 1 (0.27)
