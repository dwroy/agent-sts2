## 复盘：run 9FVEQKJ0Y1YQ — 阵亡，最高第 33 层

- 决策 459 个；Jev 调用 105 次，Claude 0 次，DeepSeek 31 次；token 597,885 入 / 5,769 出，约 $0.0254（Jev）；DeepSeek token 4,241,920 入（缓存命中 3,950,848，93%）/ 154,869 出；用时 31.7 分钟
- 决策者：code 210，jev 105，jev-plan 101，deepseek 43

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→62（-2，战后回复 +6），决策 code 5，jev-plan 4，jev 2
- 第 3 层 毛绒伏地虫: HP 68→68（-0，战后回复 +6），决策 code 6，jev-plan 3，jev 1
- 第 4 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 74→76（+2，战后回复 +6），决策 code 5，jev 4，jev-plan 3
- 第 5 层 小啃兽: HP 82→50（-32，战后回复 +6），决策 jev-plan 8，code 7，jev 5
- 第 6 层 劫掠者刺客/劫掠者斧手/劫掠者追踪手: HP 56→27（-29，战后回复 +6），决策 code 6，jev 5，jev-plan 3
- 第 11 层 树叶史莱姆（中）/蛇行扼杀者: HP 83→61（-22，战后回复 +6），决策 jev 8，jev-plan 4，code 1
- 第 12 层 旧日雕像: HP 67→15（-52，战后回复 +6），决策 jev 11，jev-plan 6，code 3
- 第 14 层 毛绒伏地虫/缩小甲虫: HP 47→43（-4，战后回复 +6），决策 jev 8，jev-plan 8，code 4
- 第 17 层 墨影幻灵: HP 75→1（-74，战后回复 +6），决策 code 13，jev-plan 8，jev 7
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 72→67（-5，战后回复 +6），决策 jev-plan 6，code 5，jev 3
- 第 22 层 外骨骼虫: HP 73→56（-17，战后回复 +6），决策 jev 8，jev-plan 7，code 3
- 第 23 层 寄生惧魔/胧光怪: HP 62→33（-29，战后回复 +6），决策 jev 12，jev-plan 11，code 6
- 第 27 层 外骨骼虫: HP 39→26（-13，战后回复 +6），决策 jev 9，code 8，jev-plan 7
- 第 29 层 蜂群术士: HP 59→41（-18，战后回复 +6），决策 jev 9，jev-plan 8，code 5
- 第 31 层 啃咬机: HP 47→29（-18，战后回复 +6），决策 code 8，jev 7，jev-plan 7
- 第 33 层 无厌沙虫: HP 62→0（-62），决策 code 16，jev-plan 8，jev 6

### 死亡战斗：第 33 层 无厌沙虫
- T5 [jev] combat/plan-choice+potion: Jev chose plan 1/2 (防御, 狂宴 -> 无厌沙虫, 头槌 -> 无厌沙虫) with confidence 0.21; code rank 1 conf 0.21
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狂宴 -> 无厌沙虫
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 头槌 -> 无厌沙虫
- T5 [code] selection/add: code: 血墙 scores 121.9 vs 血墙 121.9
- T5 [code] combat/plan: code plan (only line): end turn; hp -14, dmg 0
- T6 [code] combat/plan: code plan (only distinct line): 血墙, 与我一战！ -> 无厌沙虫, 防御; hp -2, dmg 24
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 与我一战！ -> 无厌沙虫
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T6 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 狂乱逃离, 痛击 -> 无厌沙虫
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 痛击 -> 无厌沙虫
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 101
- combat/plan-choice / jev: 72
- combat/plan / code: 47
- reward/claim / code: 39
- combat/plan-choice+potion / jev: 29
- map/route-follow / code: 29
- combat/plan-continue / code: 21
- reward/card / deepseek: 15
- reward/proceed / code: 15
- combat/lethal / code: 14
- selection/add / code: 9
- shop/buy / deepseek: 8
- event/leave / code: 6
- rest/plan / deepseek: 6
- rest/proceed / code: 6
- selection/exhaust / code: 5
- event/choose / deepseek: 4
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/end_turn / code: 2
- combat/least-loss / code: 2
- combat/plan-choice+potion-lethal / jev: 2
- map/route-change / deepseek: 2
- event/act-plan / deepseek: 1
- event/plan / deepseek: 1
- map/route-follow / deepseek: 1
- map/route-only / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/free-card / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：15 个
- 第 11 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.17; code rank - (rollout's best line, added) (0.17)
- 第 11 层 combat/plan-choice: Jev chose plan 3/3 (end turn) with confidence 0.13; code rank - (rollout's best line, added) (0.13)
- 第 12 层 combat/plan-choice+potion: Jev chose plan 2/3 (防御, 打击 -> 旧日雕像, 打击 -> 旧日雕像) with confidence 0.10; code rank 2 (0.10)
- 第 12 层 combat/plan-choice: Jev chose plan 2/3 (end turn) with confidence 0.34; code rank 2 (0.34)
- 第 12 层 combat/plan-choice: Jev chose plan 4/4 (防御, 血墙) with confidence 0.21; code rank - (rollout's best line, added) (0.21)
- 第 14 层 combat/plan-choice: Jev chose plan 2/3 (end turn) with confidence 0.33; code rank 2 (0.33)
- 第 14 层 combat/plan-choice: Jev chose plan 2/4 (头槌 -> 缩小甲虫) with confidence 0.23; code rank 2 (0.23)
- 第 14 层 combat/plan-choice: Jev chose plan 5/10 (飞剑回旋镖, 防御, 打击 -> 毛绒伏地虫) with confidence 0.26; code rank 5 (0.26)
- 第 14 层 combat/plan-choice: Jev chose plan 2/3 (end turn) with confidence 0.32; code rank 2 (0.32)
- 第 14 层 combat/plan-choice: Jev chose plan 3/9 (打击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫, potion 鲜血药水) with confidence 0.18; code rank 3 (0.18)
- 第 22 层 combat/plan-choice+potion-lethal: Jev chose plan 2/10 (防御, 与我一战！ -> 外骨骼虫) with confidence 0.25; code rank 2 (0.25)
- 第 27 层 combat/plan-choice+potion: Jev chose plan 1/6 (与我一战！ -> 外骨骼虫 #3) with confidence 0.23; code rank 1 (0.23)
- 第 27 层 combat/plan-choice+potion: Jev chose plan 1/2 (end turn) with confidence 0.28; code rank 1 (0.28)
- 第 29 层 combat/plan-choice: Jev chose plan 1/3 (end turn) with confidence 0.34; code rank 1 (0.34)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/2 (防御, 狂宴 -> 无厌沙虫, 头槌 -> 无厌沙虫) with confidence 0.21; code rank 1 (0.21)
