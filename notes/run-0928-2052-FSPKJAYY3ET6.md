## 复盘：run FSPKJAYY3ET6 — 阵亡，最高第 48 层

- 决策 538 个；Jev 调用 91 次，Claude 0 次，DeepSeek 59 次；token 174,559 入 / 4,262 出，约 $0.0075（Jev）；DeepSeek token 1,161,887 入（缓存命中 852,992，73%）/ 187,132 出；用时 34.3 分钟
- 决策者：code 309，jev 90，jev-plan 79，deepseek 59，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→57（-7），决策 code 7，jev-plan 4，jev 3
- 第 5 层 噬尸蛞蝓: HP 58→55（-3），决策 code 8，jev-plan 5，jev 3
- 第 7 层 鬼祟珊瑚群: HP 67→44（-23），决策 jev-plan 8，code 6，jev 5
- 第 9 层 淤泥旋螺: HP 75→75（-0），决策 jev 3，jev-plan 2，code 1
- 第 9 层 淤泥旋螺: HP 75→74（-1），决策 code 3
- 第 12 层 潮湿邪教徒/钙化邪教徒: HP 80→80（-0），决策 code 5，jev 4，jev-plan 4
- 第 15 层 下水道蚌: HP 86→86（-0），决策 jev 2，jev-plan 1
- 第 15 层 下水道蚌: HP 86→83（-3），决策 code 5，jev-plan 3，jev 2
- 第 17 层 乐加维林族母: HP 86→27（-59），决策 code 14，jev 10，jev-plan 9，code-fallback 1
- 第 19 层 外骨骼虫: HP 75→75（-0），决策 jev 3
- 第 19 层 外骨骼虫: HP 75→64（-11），决策 code 4，jev-plan 3，jev 2
- 第 21 层 盛碗虫（卵）/盛碗虫（石）: HP 70→53（-17），决策 jev 4，code 4，jev-plan 2
- 第 23 层 寄生惧魔/胧光怪: HP 59→45（-14），决策 jev 5，code 5，jev-plan 4
- 第 25 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 76→65（-11），决策 jev 3，jev-plan 3，code 1
- 第 25 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 65→56（-9），决策 code 4
- 第 27 层 异螨: HP 62→53（-9），决策 jev 4，code 4，jev-plan 1
- 第 28 层 幼虫/直飞产卵虫/结实的卵: HP 59→28（-31），决策 code 7，jev 6，jev-plan 4
- 第 28 层 幼虫/直飞产卵虫: HP 28→28（-0），决策 code 2
- 第 30 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 59→46（-13），决策 code 8，jev-plan 7，jev 4
- 第 31 层 外骨骼虫: HP 52→37（-15），决策 code 6，jev-plan 5，jev 4
- 第 33 层 知识恶魔: HP 66→66（-0），决策 jev 1，jev-plan 1
- 第 33 层 知识恶魔: HP 66→66（-0），决策 code 3，jev 1
- 第 33 层 知识恶魔: HP 66→15（-51），决策 code 6，jev 4，jev-plan 3
- 第 35 层 咬人卷轴: HP 73→73（-0），决策 jev 2，jev-plan 1
- 第 35 层 咬人卷轴: HP 73→61（-12），决策 code 4
- 第 38 层 虔诚雕刻师: HP 67→67（-0），决策 code 6，jev 1，jev-plan 1
- 第 39 层 电球头: HP 69→41（-28），决策 code 4，jev 1，jev-plan 1
- 第 45 层 机甲骑士: HP 82→82（-0），决策 code 2，jev 1
- 第 45 层 机甲骑士: HP 82→30（-52），决策 code 7，jev 5，jev-plan 5
- 第 48 层 实验体 #C25: HP 60→60（-0），决策 jev 3，code 2，jev-plan 1
- 第 48 层 实验体 #C25: HP 60→18（-42），决策 code 6，jev 3，jev-plan 1

### 死亡战斗：第 48 层 实验体 #C25
- T2 [jev] combat/plan-choice: Jev chose plan 3/4 (剑柄打击+ -> 实验体 #C25, 耸肩无视+) with confidence 0.24; code rank 3 conf 0.24
- T2 [jev] combat/plan-choice: Jev chose plan 3/3 (耸肩无视+) with confidence 0.51; code rank 3 conf 0.51
- T2 [code] combat/plan: code plan (only line): end turn; hp -20, dmg 0
- T3 [jev] combat/plan-choice: Jev chose plan 3/3 (火焰屏障, 防御+) with confidence 0.17; code rank 3 conf 0.17
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御+
- T3 [code] combat/plan: code plan (only line): end turn; hp -22, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 95): 剑柄打击 -> 实验体 #C25, 预备打击
- T4 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 40): 耸肩无视+, 双重打击 -> 实验体 #C2
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-25): 防御
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-25): end turn

### 各类决策由谁做
- combat/plan-choice / jev: 89
- combat/plan-continue / jev-plan: 79
- combat/plan / code: 70
- reward/claim / code: 60
- map/route-follow / code: 42
- combat/lethal / code: 35
- reward/card / deepseek: 21
- reward/proceed / code: 20
- combat/plan-continue / code: 19
- event/choose / deepseek: 11
- event/leave / code: 11
- rest/choose / deepseek: 10
- rest/proceed / code: 10
- shop/buy / deepseek: 6
- selection/add / code: 5
- combat/least-loss / code: 4
- combat/plan-potion / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- map/route-plan / deepseek: 3
- selection/remove / deepseek: 3
- selection/upgrade / deepseek: 3
- shop/leave / code: 3
- combat/end_turn / code: 2
- map/route / code: 2
- selection/curse / code: 2
- selection/discard / code: 2
- selection/enchant / deepseek: 2
- selection/take into my hand / code: 2
- shop/buy / code: 2
- shop/open / code: 2
- combat/plan-choice / code-fallback: 1
- event/only / code: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/confirm / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：12 个
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (双重打击+ -> 乐加维林族母, 打击 -> 乐加维林族母, 打击+ -> 乐加维林族母) with confidence 0.31; code rank 1 (0.31)
- 第 21 层 combat/plan-choice: Jev chose plan 3/3 (双重打击+ -> 盛碗虫（石）) with confidence 0.25; code rank 3 (0.25)
- 第 23 层 combat/plan-choice: Jev chose plan 1/3 (飞剑回旋镖) with confidence 0.31; code rank 1 (0.31)
- 第 23 层 combat/plan-choice: Jev chose plan 2/2 (双重打击+ -> 寄生惧魔) with confidence 0.18; code rank 2 (0.18)
- 第 28 层 combat/plan-choice: Jev chose plan 4/4 (耸肩无视) with confidence 0.18; code rank 4 (0.18)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (原始力量, 狂怒) with confidence 0.25; code rank 2 (0.25)
- 第 33 层 combat/plan-choice: Jev chose plan 5/5 (剑柄打击 -> 知识恶魔, 火焰屏障) with confidence 0.31; code rank - (rollout's best line, added) (0.31)
- 第 45 层 combat/plan-choice: Jev chose plan 2/5 (耸肩无视, 剑柄打击+ -> 机甲骑士, 预备打击 -> 机甲骑士) with confidence 0.31; code rank 2 (0.31)
- 第 45 层 combat/plan-choice: Jev chose plan 3/5 (防御, 非凡技艺+, 燃烧) with confidence 0.23; code rank 3 (0.23)
- 第 48 层 combat/plan-choice: Jev chose plan 2/4 (非凡技艺+, potion 赌徒特酿, an average draw -> 实验体 #C25, an average draw -> 实验体 #C25) with confidence 0.20; code rank 2 (0.20)
- 第 48 层 combat/plan-choice: Jev chose plan 3/4 (剑柄打击+ -> 实验体 #C25, 耸肩无视+) with confidence 0.24; code rank 3 (0.24)
- 第 48 层 combat/plan-choice: Jev chose plan 3/3 (火焰屏障, 防御+) with confidence 0.17; code rank 3 (0.17)
