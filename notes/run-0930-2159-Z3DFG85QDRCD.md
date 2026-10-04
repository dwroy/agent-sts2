## 复盘：run Z3DFG85QDRCD — 阵亡，最高第 48 层

- 决策 548 个；Jev 调用 112 次，Claude 0 次，DeepSeek 54 次；token 633,517 入 / 6,594 出，约 $0.0269（Jev）；DeepSeek token 7,477,045 入（缓存命中 6,973,312，93%）/ 388,919 出；用时 51.4 分钟
- 决策者：code 270，jev 112，jev-plan 97，deepseek 69

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→50（-14，战后回复 +6），决策 code 6，jev 5，jev-plan 5
- 第 4 层 缩小甲虫: HP 56→46（-10，战后回复 +6），决策 code 9，jev-plan 5，jev 3
- 第 5 层 毛绒伏地虫: HP 52→51（-1，战后回复 +6），决策 code 8，jev-plan 4，jev 2
- 第 6 层 方柱构装体: HP 57→49（-8，战后回复 +6），决策 code 7，jev 6，jev-plan 2
- 第 8 层 藤蔓蹒跚者: HP 55→40（-15，战后回复 +6），决策 jev 4，code 4，jev-plan 3
- 第 11 层 旧日雕像: HP 70→51（-19，战后回复 +6），决策 code 7，jev-plan 5，jev 3
- 第 15 层 异蛙寄生虫/扭动虫: HP 80→79（-1，战后回复 +1），决策 jev 9，jev-plan 4，code 2
- 第 17 层 墨影幻灵: HP 80→51（-29，战后回复 +6），决策 code 18，jev-plan 12，jev 6
- 第 19 层 偷窃草蜢: HP 75→72（-3，战后回复 +6），决策 jev 3，code 3，jev-plan 2
- 第 21 层 外骨骼虫: HP 73→73（-0，战后回复 +6），决策 jev-plan 4，code 2，jev 1
- 第 27 层 虱虫之祖: HP 73→51（-22，战后回复 +6），决策 jev 7，jev-plan 6，code 3
- 第 31 层 残杀千足虫: HP 80→80（-0），决策 code 1
- 第 33 层 无厌沙虫: HP 80→43（-37，战后回复 +6），决策 code 14，jev-plan 9，jev 5
- 第 35 层 虔诚雕刻师: HP 73→73（-0，战后回复 +6），决策 jev 2，code 2
- 第 38 层 咬人卷轴: HP 68→68（-0，战后回复 +6），决策 code 2
- 第 39 层 拳击构装体/方柱构装体: HP 74→62（-12，战后回复 +6），决策 jev 6，jev-plan 5，code 4
- 第 42 层 幽灵骑士/连枷骑士/魔法骑士: HP 68→35（-33，战后回复 +6），决策 jev 12，jev-plan 5，code 4
- 第 45 层 巨斧机器人: HP 65→55（-10，战后回复 +6），决策 jev 13，jev-plan 10，code 3
- 第 46 层 史莱姆狂战士: HP 61→60（-1，战后回复 +6），决策 jev 13，jev-plan 5，code 3
- 第 48 层 实验体 #C33: HP 66→0（-66），决策 code 15，jev 12，jev-plan 11

### 死亡战斗：第 48 层 实验体 #C33
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 岩石铠甲
- T6 [code] combat/end_turn: no playable cards; ending the turn
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 73): 凶恶, 燃烧, 痛击 -> 实验体 #C33
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-30): 燃烧, 痛击 -> 实验体 #C33, 流星锤 -> 实验体 #C33, 打击 -> 实验体 #C33
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 痛击 -> 实验体 #C33
- T7 [code] combat/plan: code plan (only line): 流星锤 -> 实验体 #C33, 旋风斩+; hp -1, dmg 61
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩+
- T7 [code] combat/end_turn: no living enemy but combat continues (boss phase change): ending the turn
- T8 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 3): 剑柄打击 -> 实验体 #C33, 流星锤 -
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 流星锤 -> 实验体 #C33, 势不可当+
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 势不可当+
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 97
- combat/plan-choice / jev: 61
- combat/plan-choice+potion / jev: 49
- reward/claim / code: 49
- combat/plan / code: 42
- map/route-follow / code: 42
- combat/plan-continue / code: 38
- combat/lethal / code: 20
- reward/card / deepseek: 19
- reward/proceed / code: 19
- event/leave / code: 12
- rest/plan / deepseek: 10
- rest/proceed / code: 10
- event/choose / deepseek: 9
- shop/buy / deepseek: 9
- selection/upgrade / deepseek: 6
- combat/least-loss / code: 5
- combat/end_turn / code: 4
- selection/add / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- event/plan / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- event/act-plan / deepseek: 2
- event/only / code: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/exhaust / code: 2
- selection/remove / deepseek: 2
- selection/take into my hand / jev: 2
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / deepseek: 1
- selection/enchant / deepseek: 1
- selection/free-card / code: 1
- selection/take into my hand / code: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：18 个
- 第 2 层 combat/plan-choice: Jev chose plan 5/6 (打击 -> 树叶史莱姆（小）, 打击 -> 树叶史莱姆（小）, 打击 -> 树叶史莱姆（小）) with confidence 0.23; code rank 5 (0.23)
- 第 4 层 combat/plan-choice: Jev chose plan 2/2 (痛击 -> 缩小甲虫, 打击 -> 缩小甲虫) with confidence 0.23; code rank 2 (0.23)
- 第 6 层 selection/take into my hand: Jev chose 狠揍 with confidence 0.30 (0.30)
- 第 6 层 combat/plan-choice: Jev chose plan 2/2 (防御) with confidence 0.01; code rank 2 (0.01)
- 第 15 层 combat/plan-choice: Jev chose plan 4/4 (end turn) with confidence 0.29; code rank - (rollout's best line, added) (0.29)
- 第 15 层 combat/plan-choice: Jev chose plan 1/9 (旋风斩, 愤怒 -> 异蛙寄生虫) with confidence 0.30; code rank 1 (0.30)
- 第 15 层 combat/plan-choice: Jev chose plan 2/4 (end turn) with confidence 0.30; code rank 2 (0.30)
- 第 27 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.17; code rank - (rollout's best line, added) (0.17)
- 第 27 层 combat/plan-choice: Jev chose plan 3/3 (剑柄打击 -> 虱虫之祖, 打击 -> 虱虫之祖) with confidence 0.24; code rank - (rollout's best line, added) (0.24)
- 第 27 层 combat/plan-choice: Jev chose plan 2/3 (被遗忘的仪式, 打击 -> 虱虫之祖, 势不可当+) with confidence 0.34; code rank 2 (0.34)
- 第 27 层 combat/plan-choice: Jev chose plan 4/4 (end turn) with confidence 0.28; code rank - (rollout's best line, added) (0.28)
- 第 33 层 combat/plan-choice: Jev chose plan 4/10 (防御, 残酷+, 打击 -> 无厌沙虫, 上勾拳 -> 无厌沙虫) with confidence 0.29; code rank 4 (0.29)
- 第 42 层 combat/plan-choice+potion: Jev chose plan 5/8 (凶恶, 打击 -> 连枷骑士, 愤怒 -> 连枷骑士, 头槌 -> 连枷骑士) with confidence 0.19; code rank 5 (0.19)
- 第 42 层 combat/plan-choice+potion: Jev chose plan 1/6 (旋风斩) with confidence 0.32; code rank 1 (0.32)
- 第 46 层 selection/take into my hand: Jev chose 凶恶 with confidence 0.30 (0.30)
