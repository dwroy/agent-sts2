## 复盘：run AD3QSC3P41JU — 阵亡，最高第 49 层

- 决策 708 个；Jev 调用 117 次，Claude 0 次，大脑 43 次（codex 43）；token 528,219 入 / 5,829 出，约 $0.0224（Jev）；大脑 token 5,743,412 入（缓存命中 2,910,080，51%）/ 11,525 出；用时 37.0 分钟
- 决策者：code 364，jev-plan 163，jev 117，codex 64

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 56→35（-21），决策 code 11，jev 5，jev-plan 5
- 第 4 层 淤泥旋螺: HP 35→30（-5），决策 code 8，jev-plan 4，jev 1
- 第 6 层 噬尸蛞蝓: HP 30→30（-0），决策 code 8，jev-plan 7，jev 6
- 第 12 层 卑鄙地精/地精佣兵/胖地精: HP 40→33（-7），决策 code 14，jev-plan 6，jev 3
- 第 14 层 化石追踪者: HP 54→53（-1），决策 code 9，jev-plan 7，jev 4
- 第 15 层 花园幽灵鳗: HP 53→17（-36），决策 jev-plan 11，code 7，jev 6
- 第 17 层 乐加维林族母: HP 38→11（-27），决策 code 19，jev-plan 13，jev 8
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 58→57（-1），决策 code 10，jev 4，jev-plan 2
- 第 21 层 外骨骼虫: HP 57→55（-2），决策 jev-plan 7，code 5，jev 4
- 第 24 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 55→39（-16），决策 jev-plan 14，code 10，jev 8
- 第 30 层 外骨骼虫: HP 60→55（-5），决策 code 8，jev-plan 3，jev 1
- 第 33 层 无厌沙虫: HP 70→19（-51），决策 jev-plan 17，code 16，jev 11
- 第 35 层 虔诚雕刻师: HP 59→29（-30），决策 code 12，jev-plan 11，jev 9
- 第 39 层 战斗好伙伴V1.0: HP 66→66（-0），决策 jev-plan 5，jev 4，code 2
- 第 45 层 咬人卷轴: HP 66→66（-0），决策 jev-plan 4，jev 3，code 2
- 第 46 层 猫头鹰法官: HP 62→26（-36），决策 jev 19，code 19，jev-plan 10
- 第 48 层 女王/火炬头聚合体: HP 58→15（-43），决策 jev 14，jev-plan 14，code 14
- 第 49 层 实验体 #C68: HP 11→0（-11），决策 code 39，jev-plan 23，jev 7

### 死亡战斗：第 49 层 实验体 #C68
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 突然一拳 -> 实验体 #C68
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 实验体 #C68
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 切割 -> 实验体 #C68
- T1 [code] combat/plan: code plan (only line): end turn; hp -8, dmg 0
- T2 [code] combat/end_turn: every line dies: ending the turn with no card played for Pael's Eye's extra turn
- T2 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 24): 肾上腺素, 后空翻, 防御+, 回响斩击, 
- T2 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 24): 后空翻, 防御+, 回响斩击, 突然一拳 -
- T2 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 24): 后空翻, 回响斩击, 突然一拳 -> 实验体
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 防御+, 突然一拳 -> 实验体 #C68
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 突然一拳 -> 实验体 #C68
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 163
- combat/plan / code: 108
- combat/plan-choice / jev: 84
- map/route-follow / code: 43
- combat/plan-continue / code: 42
- reward/claim / code: 41
- combat/lethal / code: 28
- selection/choose / jev: 25
- combat/least-loss / code: 22
- reward/proceed / code: 16
- reward/card / codex: 15
- combat/end_turn / code: 12
- rest/plan / codex: 11
- rest/proceed / code: 11
- event/leave / code: 10
- shop/buy / codex: 9
- combat/plan-choice+potion / jev: 7
- shop/leave / code: 7
- shop/open / code: 7
- event/choose / codex: 6
- shop/plan / codex: 6
- selection/upgrade / codex: 5
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- event/act-plan / codex: 2
- event/plan / codex: 2
- map/route-change / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- combat/mod-lethal / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/remove / codex: 1
- selection/take into my hand / jev: 1
- selection/transform / codex: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：25 个
- 第 12 层 combat/plan-choice: Jev chose plan 1/3 (突然一拳 -> 地精佣兵, 突然一拳 -> 地精佣兵, 防御) with confidence 0.31; code rank 1 (0.31)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (突然一拳 -> 化石追踪者, 切割 -> 化石追踪者, 防御, 毒雾+) with confidence 0.25; code rank 1 (0.25)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (切割 -> 乐加维林族母, 防御, 中和 -> 乐加维林族母, 扫腿 -> 乐加维林族母) with confidence 0.30; code rank 2 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (生存者, 防御, 突然一拳 -> 乐加维林族母) with confidence 0.31; code rank 1 (0.31)
- 第 19 层 selection/choose: Jev chose 防御 with confidence 0.21 (0.21)
- 第 21 层 combat/plan-choice: Jev chose plan 3/7 (突然一拳 -> 外骨骼虫 #3, 毒雾+, potion 敏捷药水, 生存者) with confidence 0.30; code rank 3 (0.30)
- 第 33 层 combat/plan-choice: Jev chose plan 1/3 (切割 -> 无厌沙虫, 突然一拳 -> 无厌沙虫, 狂乱逃离, 打击 -> 无厌沙虫) with confidence 0.33; code rank 1; HP guard: plan 1 (切割 -> 无厌沙虫, 突然一拳 -> 无厌沙虫, 狂乱逃离, 打 (0.33)
- 第 33 层 combat/plan-choice: Jev chose plan 1/4 (蜃景+, 回响斩击, 打击 -> 无厌沙虫) with confidence 0.33; code rank 1 [calc mismatch: solver says ending now does not kill, mod says lethal: no (0.33)
- 第 39 层 combat/plan-choice: Jev chose plan 4/4 (毒雾+) with confidence 0.09; code rank - (rollout's best line, added) (0.09)
- 第 39 层 combat/plan-choice: Jev chose plan 4/4 (end turn) with confidence 0.16; code rank - (rollout's best line, added) (0.16)
- 第 39 层 combat/plan-choice: Jev chose plan 1/4 (potion 异鱼之油, 打击 -> 战斗好伙伴V1.0, 回响斩击, 突然一拳 -> 战斗好伙伴V1.0, 切割 -> 战斗好伙伴V1.0) with confidence 0.19; code rank 1 (0.19)
- 第 45 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.14; code rank - (rollout's best line, added) (0.14)
- 第 46 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.30) (0.30)
- 第 46 层 selection/take into my hand: Jev chose 必备工具 with confidence 0.06 (0.06)
- 第 46 层 selection/choose: Jev chose 生存者 with confidence 0.33 (0.33)
