## 复盘：run ZTRGYYMLR8SC — 阵亡，最高第 17 层

- 决策 594 个；Jev 调用 158 次，Claude 0 次，大脑 16 次（codex 16）；token 1,150,038 入 / 7,717 出，约 $0.0486（Jev）；大脑 token 2,081,146 入（缓存命中 1,087,488，52%）/ 4,414 出；用时 36.9 分钟
- 决策者：code 246，jev-plan 167，jev 158，codex 23

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 56→43（-13），决策 code 11，jev-plan 2，jev 1
- 第 3 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 43→36（-7），决策 code 9，jev 5，jev-plan 5
- 第 4 层 缩小甲虫: HP 36→36（-0），决策 code 9，jev-plan 2，jev 1
- 第 6 层 树枝史莱姆（中）/飞蝇菌子: HP 36→31（-5），决策 jev 10，jev-plan 10，code 8
- 第 11 层 旧日雕像: HP 52→32（-20），决策 code 14，jev 7，jev-plan 5
- 第 14 层 毛绒伏地虫/缩小甲虫: HP 53→47（-6），决策 jev 11，jev-plan 8，code 6
- 第 17 层 同族信徒/同族神官: HP 68→0（-68），决策 code 136，jev-plan 135，jev 123

### 死亡战斗：第 17 层 同族信徒/同族神官
- T12 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 翻越撑击
- T12 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 中和 -> 同族神官
- T12 [code] combat/plan: code plan (only distinct line): end turn; hp -0, dmg 0
- T13 [jev] combat/plan-choice: Jev chose plan 1/2 (扫腿 -> 同族神官, 翻越撑击) with confidence 0.52; code rank 1; HP guard: plan 1 (扫腿 -> 同族神官, 翻越撑击; hp -2) is more than 0 HP over the cheapest line (th conf 0.52
- T13 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 扫腿 -> 同族神官
- T13 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T14 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): 防御, 投掷匕首 -> 同族神官, 防御
- T14 [code] combat/plan-continue: continuing the code-chosen plan: 投掷匕首 -> 同族神官
- T14 [jev] selection/choose: Jev chose 打击 with confidence 0.84 conf 0.84
- T14 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): 防御, 中和 -> 同族神官
- T14 [code] combat/plan-continue: continuing the code-chosen plan: 中和 -> 同族神官
- T14 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 167
- combat/plan / code: 111
- combat/plan-choice / jev: 106
- combat/plan-continue / code: 43
- combat/plan-choice+potion / jev: 24
- selection/choose / jev: 21
- combat/least-loss / code: 18
- reward/claim / code: 17
- map/route-follow / code: 15
- combat/lethal / code: 8
- selection/take into my hand / code: 8
- selection/take into my hand / jev: 7
- reward/card / codex: 6
- reward/proceed / code: 6
- shop/buy / codex: 6
- event/leave / code: 4
- event/plan / codex: 3
- rest/plan / codex: 3
- rest/proceed / code: 3
- selection/discard / code: 3
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / codex: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- event/choose / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/upgrade / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：16 个
- 第 11 层 selection/take into my hand: Jev chose 刀扇 with confidence 0.19 (0.19)
- 第 14 层 selection/choose: Jev chose 尖啸 with confidence 0.18 (0.18)
- 第 17 层 selection/choose: Jev chose 偏折 with confidence 0.16 (0.16)
- 第 17 层 combat/plan-choice: Jev chose plan 3/4 (打击 -> 同族神官, 翻越撑击, 打击 -> 同族神官) with confidence 0.28; code rank 3 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (探寻打击 -> 同族神官) with confidence 0.04; code rank 1; HP guard: plan 1 (探寻打击 -> 同族神官; hp -15) is more than 0 HP over the cheapest line  (0.04)
- 第 17 层 selection/choose: Jev chose 投掷匕首 with confidence 0.13 (0.13)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (potion 铁心药水) with confidence 0.28; code rank 1; SL explore: replaying attempt 1's end turn instead of potion 铁心药水 before T5 (0.28)
- 第 17 层 selection/choose: Jev chose 偏折 with confidence 0.12 (0.12)
- 第 17 层 selection/take into my hand: Jev chose 投掷匕首 with confidence 0.27 (0.27)
- 第 17 层 selection/choose: Jev chose 偏折 with confidence 0.10 (0.10)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (小刀 -> 同族神官) with confidence 0.22; code rank 1 (0.22)
- 第 17 层 selection/take into my hand: Jev chose 翻越撑击 with confidence 0.27 (0.27)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (potion 铁心药水) with confidence 0.24; code rank 1; SL explore: replaying attempt 1's end turn instead of potion 铁心药水 before T10 (0.24)
- 第 17 层 selection/choose: Jev chose 偏折 with confidence 0.07 (0.07)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御, 扫腿 -> 同族神官) with confidence 0.06; code rank 2 (0.06)
