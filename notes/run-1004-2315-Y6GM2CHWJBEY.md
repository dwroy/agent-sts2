## 复盘：run Y6GM2CHWJBEY — 阵亡，最高第 17 层

- 决策 557 个；Jev 调用 151 次，Claude 0 次，大脑 19 次（codex 19）；token 1,001,842 入 / 9,313 出，约 $0.0425（Jev）；大脑 token 738,300 入（缓存命中 99,456，13%）/ 13,552 出；用时 36.5 分钟
- 决策者：code 195，jev-plan 190，jev 151，codex 21

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 70→70（-0），决策 code 12，jev-plan 5，jev 4
- 第 3 层 毛绒伏地虫: HP 70→67（-3），决策 code 12，jev-plan 6，jev 3
- 第 4 层 缩小甲虫: HP 67→67（-0），决策 jev-plan 4，code 4，jev 1
- 第 5 层 树枝史莱姆（中）/蛇行扼杀者: HP 67→52（-15），决策 jev 9，jev-plan 9，code 9
- 第 6 层 劫掠者弩手/劫掠者暴徒/劫掠者追踪手: HP 52→52（-0），决策 jev-plan 6，jev 3，code 3
- 第 7 层 藤蔓蹒跚者: HP 52→38（-14），决策 code 8，jev-plan 7，jev 6
- 第 9 层 旧日雕像: HP 59→31（-28），决策 jev-plan 14，jev 8，code 6
- 第 14 层 多尼斯异鸟: HP 49→45（-4），决策 jev-plan 10，jev 7，code 1
- 第 15 层 墨宝: HP 45→45（-0），决策 jev-plan 7，jev 4，code 4
- 第 17 层 同族信徒/同族神官: HP 62→0（-62），决策 jev-plan 122，jev 106，code 70

### 死亡战斗：第 17 层 同族信徒/同族神官
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T8 [code] combat/plan: code plan (only line): end turn; hp -13, dmg 0
- T9 [jev] combat/plan-choice: Jev chose plan 1/2 (防御+, 防御, 中和 -> 同族信徒 #1, 突然一拳 -> 同族神官) with confidence 0.83; code rank 1 conf 0.83
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 中和 -> 同族信徒 #1
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 突然一拳 -> 同族神官
- T9 [code] combat/plan: code plan (only line): end turn; hp -8, dmg 0
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-20): 打击 -> 同族神官, 打击 -> 同族神官, 紧勒 -> 同族神官
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 同族神官
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 紧勒 -> 同族神官
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-20): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 190
- combat/plan / code: 79
- combat/plan-choice / jev: 66
- combat/plan-choice+potion / jev: 57
- reward/claim / code: 35
- combat/plan-continue / code: 26
- selection/choose / jev: 15
- selection/take into my hand / jev: 13
- map/route-follow / code: 12
- combat/least-loss / code: 10
- reward/card / codex: 9
- reward/proceed / code: 9
- combat/lethal / code: 7
- event/leave / code: 3
- map/statue-potion / codex: 3
- rest/plan / codex: 3
- rest/proceed / code: 3
- selection/take into my hand / code: 3
- combat/end_turn / code: 2
- event/plan / codex: 2
- selection/take-planned / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/choose / codex: 1
- map/route-change / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/upgrade / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：33 个
- 第 2 层 selection/choose: Jev chose 防御 with confidence 0.33 (0.33)
- 第 2 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 小啃兽, 防御, 生存者, 中和 -> 小啃兽) with confidence 0.25; code rank 2 (0.25)
- 第 2 层 selection/choose: Jev chose 打击 with confidence 0.12 (0.12)
- 第 3 层 combat/plan-choice: Jev chose plan 1/3 (potion 液态记忆, 打击 from 液态记忆 -> 毛绒伏地虫) with confidence 0.25; code rank 1 (0.25)
- 第 5 层 selection/choose: Jev chose 打击 with confidence 0.31 (0.31)
- 第 5 层 selection/choose: Jev chose 黏液 with confidence 0.19 (0.19)
- 第 7 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.32) (0.32)
- 第 7 层 selection/take into my hand: Jev chose 生存者 with confidence 0.11 (0.11)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.25; code rank - (rollout's best line, added) (0.25)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (背刺 -> 同族神官) with confidence 0.13; code rank 2 (0.13)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 迅捷药水, then re-plan (confidence 0.34) (0.34)
- 第 17 层 combat/plan-choice: Jev chose plan 5/5 (打击 -> 同族神官, 刀刃之舞, 打击 -> 同族神官) with confidence 0.29; code rank - (rollout's best line, added) (0.29)
- 第 17 层 combat/plan-choice: Jev chose plan 1/6 (打击 -> 同族神官, 小刀 -> 同族神官, 小刀 -> 同族神官, 小刀 -> 同族神官) with confidence 0.33; code rank 1 (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 4/5 (防御, 防御, 防御) with confidence 0.30; code rank 4 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (防御+, 防御, 中和 -> 同族信徒 #1, 突然一拳 -> 同族神官) with confidence 0.34; code rank 1 (0.34)
