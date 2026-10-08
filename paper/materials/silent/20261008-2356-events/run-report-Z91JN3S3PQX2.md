## 复盘：run Z91JN3S3PQX2 — 阵亡，最高第 33 层

- 决策 481 个；Jev 调用 117 次，Claude 0 次，大脑 31 次（codex 31）；token 477,560 入 / 5,527 出，约 $0.0203（Jev）；大脑 token 4,123,946 入（缓存命中 2,322,048，56%）/ 8,547 出；用时 25.5 分钟
- 决策者：code 210，jev 117，jev-plan 109，codex 45

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 56→55（-1），决策 code 10，jev-plan 8，jev 7
- 第 3 层 蟾蜍蝌蚪: HP 55→54（-1），决策 jev-plan 5，jev 4，code 4
- 第 8 层 海洋混混: HP 40→37（-3），决策 jev 10，jev-plan 7
- 第 9 层 拳击构装体: HP 37→33（-4），决策 jev 12，jev-plan 9，code 1
- 第 12 层 花园幽灵鳗: HP 54→55（+1），决策 code 13，jev-plan 9，jev 7
- 第 14 层 双尾鼠: HP 55→54（-1），决策 jev 4，jev-plan 4，code 3
- 第 15 层 下水道蚌: HP 54→53（-1），决策 code 12，jev-plan 7，jev 4
- 第 17 层 瀑布巨兽: HP 75→33（-42），决策 code 29，jev 9，jev-plan 9
- 第 19 层 外骨骼虫: HP 67→68（+1），决策 jev-plan 4，jev 1，code 1
- 第 21 层 地道虫: HP 58→36（-22），决策 code 11，jev-plan 7，jev 4
- 第 28 层 感染棱柱: HP 77→58（-19），决策 jev-plan 10，jev 8，code 8
- 第 30 层 棘刺蟾蜍: HP 58→55（-3），决策 jev-plan 13，jev 12，code 1
- 第 33 层 无厌沙虫: HP 79→0（-79），决策 jev 35，jev-plan 17，code 12

### 死亡战斗：第 33 层 无厌沙虫
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 小刀 -> 无厌沙虫
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 小刀 -> 无厌沙虫
- T12 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 6
- T13 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 23): 隐秘匕首+, 打击 -> 无厌沙虫, 匕首雨
- T13 [jev] selection/choose: Jev chose 打击 with confidence 0.34 conf 0.34
- T13 [jev] selection/choose: Jev chose 贪婪 with confidence 0.39 conf 0.39
- T13 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (1): 匕首雨, 中和+ -> 无厌沙虫, 防御, 小刀+ -> 无厌沙虫, 小刀+ -> 无厌沙虫
- T13 [code] combat/plan-continue: continuing the code-chosen plan: 中和+ -> 无厌沙虫
- T13 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T13 [code] combat/plan-continue: continuing the code-chosen plan: 小刀+ -> 无厌沙虫
- T13 [code] combat/plan-continue: continuing the code-chosen plan: 小刀+ -> 无厌沙虫
- T13 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 109
- combat/plan-choice+potion / jev: 65
- combat/plan / code: 52
- combat/plan-continue / code: 39
- combat/plan-choice / jev: 34
- reward/claim / code: 32
- map/route-follow / code: 29
- selection/choose / jev: 17
- reward/card / codex: 12
- reward/proceed / code: 12
- combat/lethal / code: 9
- rest/plan / codex: 8
- rest/proceed / code: 8
- shop/buy / codex: 8
- event/leave / code: 5
- shop/leave / code: 5
- shop/open / code: 5
- event/choose / codex: 4
- selection/upgrade / codex: 4
- shop/plan / codex: 4
- combat/end_turn / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- event/act-plan / codex: 1
- event/plan / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/remove / codex: 1
- selection/take into my hand / jev: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：20 个
- 第 2 层 selection/choose: Jev chose 中和 with confidence 0.24 (0.24)
- 第 3 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.15; code rank - (rollout's best line, added) (0.15)
- 第 3 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.23; code rank - (rollout's best line, added) (0.23)
- 第 8 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.27; code rank - (rollout's best line, added) (0.27)
- 第 8 层 combat/plan-choice+potion: Jev chose plan 2/2 (匕首雨, 中和 -> 海洋混混, 打击 -> 海洋混混, 究极打击 -> 海洋混混) with confidence 0.28; code rank - (rollout's best line, added) (0.28)
- 第 8 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.25; code rank - (rollout's best line, added) (0.25)
- 第 8 层 combat/plan-choice+potion: Jev chose plan 3/3 (滚石) with confidence 0.28; code rank - (rollout's best line, added) (0.28)
- 第 8 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.18; code rank - (rollout's best line, added) (0.18)
- 第 9 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.26; code rank - (rollout's best line, added) (0.26)
- 第 9 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.15; code rank - (rollout's best line, added) (0.15)
- 第 12 层 selection/choose: Jev chose 打击 with confidence 0.25 (0.25)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.29 (0.29)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 1/3 (突然一拳 -> 棘刺蟾蜍, 扫腿+ -> 棘刺蟾蜍) with confidence 0.28; code rank 1 (0.28)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (隐秘匕首+, 狂乱逃离, 刀刃之舞) with confidence 0.34; code rank 1 (0.34)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.34; code rank 1 (0.34)
