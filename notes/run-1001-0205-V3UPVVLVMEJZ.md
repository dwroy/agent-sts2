## 复盘：run V3UPVVLVMEJZ — 阵亡，最高第 48 层

- 决策 633 个；Jev 调用 94 次，Claude 0 次，DeepSeek 45 次；token 503,874 入 / 5,040 出，约 $0.0214（Jev）；DeepSeek token 6,230,308 入（缓存命中 5,833,472，94%）/ 318,712 出；用时 47.3 分钟
- 决策者：code 349，jev-plan 126，jev 94，deepseek 64

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→64（-0，战后回复 +6），决策 jev-plan 7，code 6，jev 4
- 第 4 层 缩小甲虫: HP 70→68（-2，战后回复 +6），决策 code 6，jev-plan 2，jev 1
- 第 6 层 小啃兽: HP 74→67（-7，战后回复 +6），决策 code 6，jev-plan 2，jev 1
- 第 7 层 藤蔓蹒跚者: HP 73→52（-21，战后回复 +6），决策 code 8，jev-plan 5，jev 4
- 第 11 层 多尼斯异鸟: HP 67→46（-21，战后回复 +6），决策 jev-plan 4，code 4，jev 2
- 第 12 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 52→30（-22，战后回复 +6），决策 jev 4，code 4，jev-plan 2
- 第 14 层 异蛙寄生虫/扭动虫: HP 75→63（-12，战后回复 +6），决策 code 17，jev-plan 7，jev 5
- 第 17 层 墨影幻灵: HP 80→30（-50，战后回复 +6），决策 code 25，jev-plan 7，jev 6
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 71→68（-3，战后回复 +6），决策 code 5，jev 3，jev-plan 3
- 第 20 层 地道虫: HP 74→74（-0，战后回复 +6），决策 code 7，jev-plan 5，jev 2
- 第 21 层 外骨骼虫: HP 80→72（-8，战后回复 +6），决策 code 4，jev-plan 3，jev 2
- 第 23 层 虱虫之祖: HP 78→58（-20，战后回复 +6），决策 jev-plan 7，code 5，jev 4
- 第 28 层 残杀千足虫: HP 64→20（-44，战后回复 +6），决策 jev-plan 12，jev 9，code 7
- 第 30 层 幼虫/直飞产卵虫/结实的卵: HP 65→46（-19，战后回复 +6），决策 jev-plan 6，code 6，jev 5
- 第 31 层 棘刺蟾蜍: HP 52→34（-18，战后回复 +6），决策 code 7，jev-plan 4，jev 3
- 第 33 层 知识恶魔: HP 79→24（-55，战后回复 +6），决策 code 31，jev-plan 9，jev 6
- 第 35 层 咬人卷轴: HP 70→61（-9，战后回复 +6），决策 code 6，jev 3，jev-plan 2
- 第 36 层 虔诚雕刻师: HP 67→65（-2，战后回复 +6），决策 code 6，jev-plan 5，jev 3
- 第 37 层 猫头鹰法官: HP 71→32（-39，战后回复 +6），决策 jev-plan 11，code 7，jev 6
- 第 39 层 拳击构装体/方柱构装体: HP 32→22（-10，战后回复 +6），决策 jev-plan 7，code 6，jev 5
- 第 43 层 电球头: HP 65→58（-7，战后回复 +6），决策 jev 6，jev-plan 4，code 2
- 第 45 层 咬人卷轴: HP 49→37（-12，战后回复 +6），决策 jev 2，jev-plan 2，code 2
- 第 48 层 女王/火炬头聚合体: HP 68→0（-68），决策 code 13，jev-plan 10，jev 8

### 死亡战斗：第 48 层 女王/火炬头聚合体
- T6 [jev] combat/plan-choice: Jev chose plan 1/3 (熔融之拳+ -> 火炬头聚合体, 主宰 -> 火炬头聚合体, 飞剑回旋镖+) with confidence 0.94; code rank 1 conf 0.94
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 主宰 -> 火炬头聚合体
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 飞剑回旋镖+
- T6 [code] combat/plan: code plan (only line): end turn; hp -26, dmg 0
- T7 [jev] combat/plan-choice: Jev chose plan 4/4 (打击+ -> 女王, 怨恨 -> 火炬头聚合体) with confidence 0.41; code rank - (rollout's best line, added) conf 0.41
- T7 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 怨恨 -> 火炬头聚合体
- T7 [code] combat/plan: code plan (only distinct line): 预备打击 -> 女王; hp -0, dmg 19
- T7 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): 双重打击 -> 女王, 愤怒+ -> 女王, 防御
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒+ -> 女王
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T8 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 126
- combat/plan / code: 100
- combat/plan-choice / jev: 88
- reward/claim / code: 58
- map/route-follow / code: 42
- combat/plan-continue / code: 40
- combat/lethal / code: 24
- reward/card / deepseek: 22
- reward/proceed / code: 22
- combat/end_turn / code: 10
- event/leave / code: 10
- rest/plan / deepseek: 9
- rest/proceed / code: 9
- selection/upgrade / deepseek: 8
- selection/curse / code: 6
- shop/buy / deepseek: 6
- event/choose / deepseek: 5
- combat/plan-choice+potion / jev: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- event/plan / deepseek: 3
- selection/add / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/exhaust / code: 2
- selection/take into my hand / code: 2
- selection/take into my hand / jev: 2
- combat/least-loss / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/discard / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/transform / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：14 个
- 第 7 层 combat/plan-choice: Jev chose plan 3/6 (防御, 完美打击 -> 藤蔓蹒跚者) with confidence 0.20; code rank 3 (0.20)
- 第 12 层 combat/plan-choice: Jev chose plan 4/8 (旋风斩) with confidence 0.29; code rank 4 (0.29)
- 第 14 层 combat/plan-choice: Jev chose plan 3/7 (防御+, 旋风斩) with confidence 0.33; code rank 3 (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 墨影幻灵, 拆卸 -> 墨影幻灵, 旋风斩) with confidence 0.02; code rank 1 (0.02)
- 第 20 层 combat/plan-choice: Jev chose plan 1/7 (防御+, 防御, 飞剑回旋镖+, potion 爆炸安瓿) with confidence 0.20; code rank 1 (0.20)
- 第 23 层 combat/plan-choice: Jev chose plan 1/2 (打击+ -> 虱虫之祖, 防御+, 拆卸+ -> 虱虫之祖) with confidence 0.24; code rank 1 (0.24)
- 第 28 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.18) (0.18)
- 第 28 层 combat/plan-choice: Jev chose plan 1/9 (耸肩无视+, 防御+, 防御, 放血+, 打击+ -> 残杀千足虫 (BACK), 完美打击 -> 残杀千足虫 (BACK), 撕碎 -> 残杀千足虫 (BACK)) with confidence 0.24; code rank 1 (0.24)
- 第 30 层 combat/plan-choice: Jev chose plan 1/8 (防御, 燃烧+, 飞剑回旋镖+) with confidence 0.28; code rank 1 (0.28)
- 第 36 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.34; code rank - (rollout's best line, added) (0.34)
- 第 39 层 combat/plan-choice: Jev chose plan 1/2 (完美打击 -> 方柱构装体) with confidence 0.14; code rank 1 (0.14)
- 第 45 层 combat/plan-choice: Jev chose plan 4/10 (主宰 -> 咬人卷轴 #3, 头槌 -> 咬人卷轴 #3, 熔融之拳+ -> 咬人卷轴 #3) with confidence 0.13; code rank 4 (0.13)
- 第 45 层 combat/plan-choice: Jev chose plan 1/3 (end turn) with confidence 0.29; code rank 1 (0.29)
- 第 48 层 combat/plan-choice: Jev chose plan 1/4 (上勾拳+ -> 火炬头聚合体, 耸肩无视+) with confidence 0.32; code rank 1 (0.32)
