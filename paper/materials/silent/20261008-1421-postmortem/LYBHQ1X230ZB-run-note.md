## 复盘：run LYBHQ1X230ZB — 阵亡，最高第 30 层

- 决策 455 个；Jev 调用 79 次，Claude 0 次，大脑 28 次（codex 28）；token 331,966 入 / 3,894 出，约 $0.0141（Jev）；大脑 token 3,729,174 入（缓存命中 2,559,488，69%）/ 7,607 出；用时 22.7 分钟
- 决策者：code 249，jev-plan 92，jev 79，codex 35

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 56→50（-6），决策 jev 9，jev-plan 8，code 8
- 第 3 层 噬尸蛞蝓: HP 50→49（-1），决策 code 8，jev-plan 8，jev 6
- 第 4 层 淤泥旋螺: HP 49→49（-0），决策 code 9，jev-plan 6，jev 3
- 第 5 层 噬尸蛞蝓: HP 49→41（-8），决策 code 5，jev-plan 4，jev 3
- 第 8 层 鬼祟珊瑚群: HP 62→32（-30），决策 code 13，jev 9，jev-plan 9
- 第 12 层 花园幽灵鳗: HP 53→34（-19），决策 code 5，jev 4，jev-plan 4
- 第 12 层 花园幽灵鳗: HP 34→34（-0），决策 code 2
- 第 15 层 化石追踪者: HP 34→34（-0），决策 code 10，jev 3，jev-plan 1
- 第 17 层 灵魂异鱼: HP 55→29（-26），决策 jev-plan 17，code 17，jev 12
- 第 19 层 外骨骼虫: HP 65→65（-0），决策 code 5，jev 2，jev-plan 2
- 第 21 层 偷窃草蜢: HP 65→65（-0），决策 jev-plan 5，code 5，jev 4
- 第 22 层 猎人杀手: HP 65→36（-29），决策 jev 8，jev-plan 8，code 8
- 第 23 层 幼虫/直飞产卵虫/结实的卵: HP 36→6（-30），决策 code 10，jev-plan 6，jev 5
- 第 29 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 42→4（-38），决策 jev-plan 14，jev 11，code 6
- 第 30 层 寄生惧魔/胧光怪: HP 4→0（-4），决策 code 32

### 死亡战斗：第 30 层 寄生惧魔/胧光怪
- T1 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 4
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 迷雾+, 防御
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn
- T1 [code] combat/plan: code plan (only distinct line): 背刺 -> 胧光怪, 打击 -> 胧光怪, 灵动步法+, 匕首雨; hp -0, dmg 33
- T1 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 胧光怪
- T1 [code] combat/plan-continue: continuing the code-chosen plan: 灵动步法+
- T1 [code] combat/plan-continue: continuing the code-chosen plan: 匕首雨
- T1 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 4
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 迷雾+, 防御
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 92
- combat/plan / code: 64
- combat/plan-choice / jev: 53
- combat/plan-continue / code: 43
- reward/claim / code: 38
- map/route-follow / code: 26
- combat/lethal / code: 23
- reward/card / codex: 13
- reward/proceed / code: 13
- combat/plan-choice+potion / jev: 12
- selection/choose / jev: 12
- combat/least-loss / code: 8
- event/leave / code: 6
- rest/plan / codex: 6
- rest/proceed / code: 6
- shop/buy / codex: 4
- combat/end_turn / code: 3
- event/choose / codex: 3
- shop/discard / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/plan / codex: 2
- pause/close_submenu / code: 2
- selection/take into my hand / code: 2
- selection/take into my hand / jev: 2
- selection/upgrade / codex: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / codex: 2
- event/act-plan / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：3 个
- 第 3 层 selection/choose: Jev chose 打击 with confidence 0.15 (0.15)
- 第 8 层 selection/take into my hand: Jev chose 蜃景 with confidence 0.14 (0.14)
- 第 29 层 selection/choose: Jev chose 尖啸 with confidence 0.28 (0.28)
