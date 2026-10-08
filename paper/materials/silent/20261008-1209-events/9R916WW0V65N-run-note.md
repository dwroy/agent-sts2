## 复盘：run 9R916WW0V65N — 阵亡，最高第 49 层

- 决策 1165 个；Jev 调用 235 次，Claude 0 次，大脑 50 次（codex 50）；token 1,316,567 入 / 11,705 出，约 $0.0558（Jev）；大脑 token 6,597,367 入（缓存命中 4,441,728，67%）/ 15,608 出；用时 63.3 分钟
- 决策者：code 610，jev-plan 250，jev 235，codex 70

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 56→55（-1），决策 code 11，jev-plan 3，jev 1
- 第 5 层 噬尸蛞蝓: HP 55→55（-0），决策 jev-plan 6，jev 5，code 4
- 第 8 层 蟾蜍蝌蚪: HP 61→61（-0），决策 code 6
- 第 13 层 拳击构装体: HP 61→61（-0），决策 code 10，jev 4，jev-plan 4
- 第 14 层 鬼祟珊瑚群: HP 61→48（-13），决策 code 11，jev-plan 5，jev 3
- 第 15 层 潮湿邪教徒/钙化邪教徒: HP 48→47（-1），决策 jev-plan 10，code 7，jev 5
- 第 17 层 灵魂异鱼: HP 69→42（-27），决策 code 30，jev-plan 20，jev 14
- 第 19 层 偷窃草蜢: HP 69→69（-0），决策 code 11，jev-plan 9，jev 7
- 第 20 层 盛碗虫（石）/盛碗虫（蜜）: HP 69→69（-0），决策 code 7，jev-plan 6，jev 1
- 第 22 层 寄生惧魔/胧光怪: HP 69→68（-1），决策 jev-plan 15，jev 11，code 11
- 第 23 层 异螨: HP 68→49（-19），决策 jev-plan 15，code 10，jev 5
- 第 28 层 蜂群术士: HP 71→55（-16），决策 code 16，jev 7，jev-plan 6
- 第 30 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 55→41（-14），决策 jev 12，code 11，jev-plan 10
- 第 33 层 无厌沙虫: HP 63→40（-23），决策 code 26，jev 10，jev-plan 8
- 第 35 层 活体盾/高塔炮手: HP 68→61（-7），决策 jev 11，code 9，jev-plan 6
- 第 36 层 咬人卷轴: HP 61→46（-15），决策 jev 9，jev-plan 8，code 5
- 第 42 层 机甲骑士: HP 68→37（-31），决策 code 21，jev 18，jev-plan 13
- 第 43 层 噪音机器人/戳刺机器人/电击机器人/组装师: HP 37→1（-36），决策 code 17，jev 14，jev-plan 9
- 第 45 层 巨斧机器人: HP 23→3（-20），决策 code 46，jev-plan 10，jev 9
- 第 48 层 实验体 #C65: HP 25→12（-13），决策 code 127，jev 61，jev-plan 58
- 第 49 层 女王/火炬头聚合体: HP 12→0（-12），决策 code 49，jev-plan 29，jev 28

### 死亡战斗：第 49 层 女王/火炬头聚合体
- T1 [jev] selection/choose: Jev chose 防御 with confidence 0.31 conf 0.31
- T1 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T2 [jev] combat/plan-choice: Jev chose plan 3/5 (灵动步法, 刀刃之舞, 早有准备, 撕咬 -> 女王, 斗篷与匕首+, 闪躲翻滚, 打击 -> 女王) with confidence 0.85; code rank 3 conf 0.85
- T2 [jev] combat/plan-choice: Jev chose plan 3/5 (刀刃之舞, 早有准备, 撕咬 -> 女王, 斗篷与匕首+, 闪躲翻滚, 打击 -> 女王) with confidence 0.69; code rank 3 conf 0.69
- T2 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 12): 早有准备, 精准, 小刀 -> 女王, 小刀
- T2 [jev] selection/choose: Jev chose 战斗专注 with confidence 0.17 conf 0.17
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 精准, 小刀 -> 女王, 小刀 -> 女王, 小刀 -> 女王
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 小刀 -> 女王, 小刀 -> 女王, 小刀 -> 女王, 撕咬 -> 女王
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 小刀 -> 女王
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 小刀 -> 女王
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 撕咬 -> 女王
- T2 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 250
- combat/plan / code: 197
- combat/plan-continue / code: 166
- combat/plan-choice / jev: 158
- reward/claim / code: 59
- map/route-follow / code: 43
- combat/plan-choice+potion / jev: 38
- combat/end_turn / code: 36
- selection/choose / jev: 35
- combat/lethal / code: 26
- reward/card / codex: 24
- reward/proceed / code: 20
- combat/least-loss / code: 18
- event/leave / code: 11
- rest/plan / codex: 9
- rest/proceed / code: 9
- shop/buy / codex: 8
- event/choose / codex: 5
- shop/leave / code: 5
- shop/open / code: 5
- shop/plan / codex: 5
- event/plan / codex: 4
- selection/take into my hand / jev: 4
- selection/transform / codex: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- selection/upgrade / codex: 3
- event/act-plan / codex: 2
- map/route-change / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/take into my hand / code: 2
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/enchant / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：43 个
- 第 5 层 selection/choose: Jev chose 中和 with confidence 0.16 (0.16)
- 第 5 层 combat/plan-choice: Jev chose plan 1/2 (打击+ -> 噬尸蛞蝓 #2, 打击 -> 噬尸蛞蝓 #1, 切割 -> 噬尸蛞蝓 #2, 防御) with confidence 0.28; code rank 1 (0.28)
- 第 13 层 combat/plan-choice+potion: Jev chose to drink 攻击药水, then re-plan (confidence 0.30) (0.30)
- 第 14 层 selection/choose: Jev chose 防御 with confidence 0.21 (0.21)
- 第 17 层 selection/choose: Jev chose 防御 with confidence 0.32 (0.32)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 灵魂异鱼, 匕首雨, 打击 -> 灵魂异鱼) with confidence 0.16; code rank 2 (0.16)
- 第 19 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.33; code rank - (rollout's best line, added) (0.33)
- 第 19 层 combat/plan-choice+potion: Jev chose plan 2/2 (中和+ -> 偷窃草蜢, 打击 -> 偷窃草蜢, 防御, 打击 -> 偷窃草蜢, 防御) with confidence 0.28; code rank - (rollout's best line, added) (0.28)
- 第 19 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.19) (0.19)
- 第 22 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.25) (0.25)
- 第 22 层 combat/plan-choice: Jev chose plan 3/3 (打击+ -> 寄生惧魔, 回响斩击, 打击+ -> 胧光怪, 致命毒药+ -> 胧光怪, 切割 -> 胧光怪) with confidence 0.23; code rank - (rollout's best line, added) (0.23)
- 第 23 层 combat/plan-choice: Jev chose plan 2/3 (打击 -> 异螨 #2, 切割 -> 异螨 #2, 中和+ -> 异螨 #2, 滚石) with confidence 0.18; code rank 2 (0.18)
- 第 28 层 selection/choose: Jev chose 晕眩 with confidence 0.18 (0.18)
- 第 33 层 selection/choose: Jev chose 匕首雨 with confidence 0.20 (0.20)
- 第 33 层 selection/choose: Jev chose 防御 with confidence 0.16 (0.16)
