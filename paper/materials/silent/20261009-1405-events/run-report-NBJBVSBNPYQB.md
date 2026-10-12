## 复盘：run NBJBVSBNPYQB — 阵亡，最高第 49 层

- 决策 737 个；Jev 调用 124 次，Claude 0 次，大脑 46 次（codex 46）；token 828,342 入 / 7,494 出，约 $0.0351（Jev）；大脑 token 6,323,012 入（缓存命中 3,606,656，57%）/ 11,742 出；用时 41.4 分钟
- 决策者：code 375，jev-plan 177，jev 124，codex 61

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 56→53（-3），决策 code 13，jev-plan 2，jev 1
- 第 5 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 53→49（-4），决策 code 10，jev 5，jev-plan 3
- 第 8 层 小啃兽: HP 77→77（-0），决策 code 8，jev-plan 5，jev 4
- 第 12 层 旧日雕像: HP 77→29（-48），决策 code 17，jev-plan 8，jev 5
- 第 15 层 异蛙寄生虫/扭动虫: HP 67→55（-12），决策 jev-plan 13，jev 9，code 9
- 第 17 层 墨影幻灵: HP 77→31（-46），决策 code 21，jev-plan 13，jev 6
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 67→54（-13），决策 code 10，jev-plan 5，jev 3
- 第 22 层 地道虫: HP 54→54（-0），决策 code 9，jev-plan 7，jev 4
- 第 24 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 54→44（-10），决策 jev-plan 7，jev 4，code 4
- 第 28 层 感染棱柱: HP 77→41（-36），决策 code 19，jev-plan 8，jev 7
- 第 31 层 外骨骼虫: HP 41→41（-0），决策 jev 4，jev-plan 3，code 2
- 第 33 层 火箭/碾碎爪: HP 77→8（-69），决策 jev-plan 20，jev 15，code 8
- 第 35 层 虔诚雕刻师: HP 63→62（-1），决策 jev-plan 5，code 5，jev 4
- 第 39 层 咬人卷轴: HP 51→45（-6），决策 jev 10，jev-plan 9，code 7
- 第 42 层 戳刺机器人/电击机器人/组装师: HP 75→22（-53），决策 jev-plan 14，jev 11，code 11
- 第 45 层 幽灵骑士/连枷骑士/魔法骑士: HP 56→12（-44），决策 jev-plan 13，jev 11，code 7
- 第 46 层 战斗好伙伴V1.0: HP 12→12（-0），决策 jev-plan 4，code 3，jev 1
- 第 48 层 永世沙漏: HP 49→27（-22），决策 code 15，jev-plan 6，jev 4
- 第 49 层 女王/火炬头聚合体: HP 27→0（-27），决策 code 37，jev-plan 32，jev 16

### 死亡战斗：第 49 层 女王/火炬头聚合体
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 火炬头聚合体
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 匕首雨
- T1 [jev] combat/plan-choice: Jev chose plan 1/3 (potion 药水形状的石头 -> 女王) with confidence 0.06; code rank 1 conf 0.06
- T1 [code] combat/plan: code plan (only line): end turn; hp -21, dmg 0
- T2 [code] combat/plan: code plan (only distinct line): 余像, 尖啸, 中和 -> 火炬头聚合体; hp -3, dmg 4
- T2 [jev] combat/plan-choice: Jev chose plan 2/3 (尖啸, 中和 -> 火炬头聚合体, 防御) with confidence 0.69; code rank 2 conf 0.69
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 中和 -> 火炬头聚合体
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T2 [code] combat/end_turn: no playable cards; ending the turn
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-15): 坚韧之环, 防御
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T3 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 177
- combat/plan / code: 105
- combat/plan-choice / jev: 105
- combat/plan-continue / code: 54
- reward/claim / code: 47
- map/route-follow / code: 43
- combat/lethal / code: 31
- combat/end_turn / code: 19
- reward/proceed / code: 17
- reward/card / codex: 16
- event/leave / code: 11
- shop/buy / codex: 11
- combat/plan-choice+potion / jev: 10
- event/choose / codex: 9
- rest/plan / codex: 9
- rest/proceed / code: 9
- selection/choose / jev: 8
- combat/least-loss / code: 6
- shop/leave / code: 6
- shop/open / code: 6
- shop/plan / codex: 6
- chest/open / code: 5
- chest/proceed / code: 5
- chest/relic / code: 5
- event/act-plan / codex: 2
- event/only / code: 2
- event/plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- bundle/choose / codex: 1
- bundle/confirm / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1
- selection/transform / codex: 1
- selection/upgrade / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：15 个
- 第 12 层 selection/choose: Jev chose 打击 with confidence 0.23 (0.23)
- 第 15 层 combat/plan-choice: Jev chose plan 3/6 (中和 -> 异蛙寄生虫, 尖啸, 致命毒药 -> 异蛙寄生虫, potion 虚弱药水 -> 异蛙寄生虫) with confidence 0.34; code rank 3 (0.34)
- 第 17 层 selection/choose: Jev chose 弹跳药瓶 with confidence 0.21 (0.21)
- 第 22 层 selection/choose: Jev chose 进阶之灾 with confidence 0.26 (0.26)
- 第 28 层 selection/choose: Jev chose 坚韧之环 with confidence 0.19 (0.19)
- 第 39 层 combat/plan-choice: Jev chose plan 1/5 (小刀 -> 咬人卷轴 #1, potion 药水形状的石头 -> 咬人卷轴 #3) with confidence 0.19; code rank 1 (0.19)
- 第 39 层 combat/plan-choice: Jev chose plan 1/3 (potion 药水形状的石头 -> 咬人卷轴 #2) with confidence 0.23; code rank 1 (0.23)
- 第 39 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 咬人卷轴, 蜃景, 防御, 打击 -> 咬人卷轴) with confidence 0.30; code rank 1 (0.30)
- 第 42 层 combat/plan-choice: Jev chose plan 4/7 (防御, 毒性爆发) with confidence 0.30; code rank 4 (0.30)
- 第 42 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.27; code rank - (rollout's best line, added) (0.27)
- 第 45 层 combat/plan-choice: Jev chose plan 4/5 (potion 药水形状的石头 -> 魔法骑士) with confidence 0.27; code rank 4 (0.27)
- 第 45 层 selection/choose: Jev chose 笨拙 with confidence 0.30 (0.30)
- 第 49 层 combat/plan-choice: Jev chose plan 1/3 (potion 药水形状的石头 -> 女王) with confidence 0.20; code rank 1 (0.20)
- 第 49 层 combat/plan-choice: Jev chose plan 1/3 (余像, 中和 -> 火炬头聚合体, 防御) with confidence 0.12; code rank 1 (0.12)
- 第 49 层 combat/plan-choice: Jev chose plan 1/3 (potion 药水形状的石头 -> 女王) with confidence 0.06; code rank 1 (0.06)
