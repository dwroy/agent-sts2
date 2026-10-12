## 复盘：run P2M3DFJ4DEZ3 — 阵亡，最高第 49 层

- 决策 1247 个；Jev 调用 277 次，Claude 0 次，大脑 51 次（codex 51）；token 1,797,761 入 / 14,918 出，约 $0.0761（Jev）；大脑 token 6,860,197 入（缓存命中 4,271,104，62%）/ 15,846 出；用时 65.7 分钟
- 决策者：code 511，jev-plan 387，jev 277，codex 72

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 56→48（-8），决策 code 12，jev-plan 7，jev 5
- 第 3 层 淤泥旋螺: HP 48→40（-8），决策 code 12，jev-plan 8，jev 6
- 第 4 层 蟾蜍蝌蚪: HP 40→40（-0），决策 jev-plan 6，code 3，jev 2
- 第 8 层 幽灵船: HP 40→21（-19），决策 code 13，jev-plan 6，jev 5
- 第 9 层 卑鄙地精/地精佣兵/胖地精: HP 21→20（-1），决策 jev-plan 12，jev 7，code 7
- 第 14 层 下水道蚌: HP 43→32（-11），决策 code 14，jev-plan 6，jev 5
- 第 15 层 潮湿邪教徒/钙化邪教徒: HP 34→28（-6），决策 code 8，jev-plan 6，jev 4
- 第 17 层 灵魂异鱼: HP 51→36（-15），决策 jev-plan 19，jev 18，code 15
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 65→57（-8），决策 jev-plan 4，code 2，jev 1
- 第 20 层 地道虫: HP 59→44（-15），决策 jev-plan 4，code 3，jev 2
- 第 22 层 虱虫之祖: HP 46→32（-14），决策 code 17，jev 8，jev-plan 8
- 第 25 层 感染棱柱: HP 55→38（-17），决策 code 16，jev-plan 8，jev 6
- 第 27 层 棘刺蟾蜍: HP 40→18（-22），决策 code 9，jev 5，jev-plan 5
- 第 33 层 无厌沙虫: HP 62→8（-54），决策 jev-plan 23，jev 15，code 15
- 第 35 层 活体盾/高塔炮手: HP 59→45（-14），决策 jev-plan 8，jev 5，code 5
- 第 39 层 咬人卷轴: HP 47→47（-0），决策 jev 5，jev-plan 4，code 4
- 第 42 层 幽灵骑士/连枷骑士/魔法骑士: HP 70→45（-25），决策 jev-plan 11，code 8，jev 7
- 第 43 层 失落之物/遗忘之物: HP 47→24（-23），决策 jev-plan 17，code 12，jev 9
- 第 48 层 永世沙漏: HP 77→19（-58），决策 jev-plan 151，jev 118，code 104
- 第 49 层 女王/火炬头聚合体: HP 21→0（-21），决策 code 76，jev-plan 74，jev 44

### 死亡战斗：第 49 层 女王/火炬头聚合体
- T3 [jev] combat/plan-choice: Jev chose plan 11/11 (蛇咬+ -> 火炬头聚合体, 生存者, 中和 -> 火炬头聚合体, 打击 -> 女王) with confidence 0.84; code rank - (rollout's best line, added) conf 0.84
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 生存者
- T3 [jev] selection/choose: Jev chose 中和 with confidence 0.23 conf 0.23
- T3 [jev] combat/plan-choice: Jev chose plan 1/2 (打击 -> 女王) with confidence 0.84; code rank 1 conf 0.84
- T3 [code] combat/plan: code plan (only line): end turn; hp -12, dmg 12
- T4 [code] combat/plan: code plan (only distinct line): 匕首雨, 防御, 突然一拳 -> 火炬头聚合体; hp -0, dmg 31
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 突然一拳 -> 火炬头聚合体
- T4 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 11
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 蛇咬 -> 女王, 闪躲翻滚+
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 闪躲翻滚+
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 387
- combat/plan-choice / jev: 213
- combat/plan / code: 194
- combat/plan-continue / code: 88
- reward/claim / code: 52
- selection/choose / jev: 51
- map/route-follow / code: 43
- combat/lethal / code: 32
- combat/least-loss / code: 27
- reward/card / codex: 21
- reward/proceed / code: 20
- event/leave / code: 15
- combat/end_turn / code: 14
- combat/plan-choice+potion / jev: 10
- event/choose / codex: 10
- shop/buy / codex: 9
- rest/plan / codex: 8
- rest/proceed / code: 8
- event/plan / codex: 5
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- map/route-change / codex: 3
- selection/take into my hand / jev: 3
- shop/leave / code: 3
- event/act-plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/add / codex: 2
- selection/enchant / codex: 2
- selection/remove / codex: 2
- selection/upgrade / codex: 2
- shop/open / code: 2
- shop/plan / codex: 2
- event/only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/transform / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：42 个
- 第 3 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 淤泥旋螺, 生存者, 打击 -> 淤泥旋螺, potion 稳定血清) with confidence 0.31; code rank 3 (0.31)
- 第 3 层 combat/plan-choice: Jev chose plan 2/3 (中和 -> 淤泥旋螺, 打击 -> 淤泥旋螺, 打击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.23; code rank 2 (0.23)
- 第 9 层 selection/choose: Jev chose 打击 with confidence 0.34 (0.34)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.22; code rank 1 (0.22)
- 第 17 层 selection/take into my hand: Jev chose 飞镖 with confidence 0.06 (0.06)
- 第 20 层 combat/plan-choice: Jev chose plan 3/5 (背刺 -> 地道虫, 打击 -> 地道虫, 毒性爆发, potion 火焰药水 -> 地道虫) with confidence 0.32; code rank 3 (0.32)
- 第 22 层 combat/plan-choice: Jev chose plan 2/3 (potion 敏捷药水); plan 1 (end turn) is as good or better on every axis, playing it with confidence 0.24; code rank 1 (0.24)
- 第 25 层 selection/choose: Jev chose 生存者 with confidence 0.19 (0.19)
- 第 25 层 selection/choose: Jev chose 防御 with confidence 0.10 (0.10)
- 第 33 层 selection/choose: Jev chose 防御 with confidence 0.21 (0.21)
- 第 33 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 无厌沙虫, potion 污浊药水) with confidence 0.18; code rank 1; HP guard: plan 1 (打击 -> 无厌沙虫, potion 污浊药水; hp -12) is more than 8 HP o (0.18)
- 第 39 层 combat/plan-choice+potion: Jev chose plan 3/3 (生存者, 突然一拳 -> 咬人卷轴) with confidence 0.31; code rank - (rollout's best line, added) (0.31)
- 第 39 层 selection/choose: Jev chose 防御 with confidence 0.20 (0.20)
- 第 39 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.06) (0.06)
- 第 39 层 selection/take into my hand: Jev chose 余像 with confidence 0.14 (0.14)
