## 复盘：run LRN0HPZ0FZS1 — 阵亡，最高第 48 层

- 决策 793 个；Jev 调用 172 次，Claude 0 次，大脑 48 次（codex 48）；token 658,361 入 / 10,121 出，约 $0.0281（Jev）；大脑 token 2,033,763 入（缓存命中 574,464，28%）/ 45,421 出；用时 50.1 分钟
- 决策者：code 382，jev 172，jev-plan 166，codex 73

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 70→66（-4），决策 code 9，jev-plan 5，jev 2
- 第 3 层 缩小甲虫: HP 66→66（-0），决策 code 10，jev 3
- 第 4 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 66→66（-0），决策 code 3
- 第 5 层 蛮兽: HP 66→57（-9），决策 code 12，jev 7，jev-plan 4
- 第 9 层 旧日雕像: HP 43→4（-39），决策 code 17，jev-plan 10，jev 7
- 第 15 层 利齿之眼/雾菇: HP 42→43（+1），决策 jev 4，jev-plan 4，code 4
- 第 17 层 仪式兽: HP 55→16（-39），决策 code 39，jev 32，jev-plan 29
- 第 19 层 地道虫: HP 70→66（-4），决策 code 12，jev-plan 8，jev 5
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 66→62（-4），决策 jev 5，jev-plan 5，code 5
- 第 23 层 异螨: HP 56→47（-9），决策 jev-plan 7，jev 6，code 6
- 第 28 层 棘刺蟾蜍: HP 73→62（-11），决策 jev-plan 9，jev 5，code 2
- 第 33 层 无厌沙虫: HP 74→48（-26），决策 code 16，jev-plan 15，jev 11
- 第 35 层 虔诚雕刻师: HP 75→76（+1），决策 code 11，jev 8，jev-plan 6
- 第 36 层 活体盾/高塔炮手: HP 76→77（+1），决策 jev 9，code 9，jev-plan 7
- 第 37 层 拳击构装体/方柱构装体: HP 77→60（-17），决策 jev-plan 8，jev 7，code 7
- 第 38 层 巨斧机器人: HP 60→41（-19），决策 jev 22，jev-plan 20，code 10
- 第 43 层 灵魂枢纽: HP 79→62（-17），决策 jev-plan 15，jev 12，code 7
- 第 46 层 失落之物/遗忘之物: HP 80→70（-10），决策 code 20，jev 11，jev-plan 7
- 第 48 层 永世沙漏: HP 81→0（-81），决策 code 28，jev 16，jev-plan 7

### 死亡战斗：第 48 层 永世沙漏
- T5 [code] combat/plan: code plan (only distinct line): 防御+; hp -18, dmg 0
- T5 [code] combat/plan: code plan (only distinct line): end turn; hp -23, dmg 0
- T6 [code] combat/plan: code plan (only distinct line): 防御, 后空翻, 切割 -> 永世沙漏, 投掷匕首 -> 永世沙漏; hp -0, dmg 14
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 后空翻
- T6 [code] combat/plan: code plan (dominates the score-best line): 切割 -> 永世沙漏, 投掷匕首 -> 永世沙漏, 斗篷与匕首+; hp -0, dmg 14
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 投掷匕首 -> 永世沙漏
- T6 [jev] selection/choose: Jev chose 防御 with confidence 0.10 conf 0.10
- T6 [jev] combat/plan-choice: Jev chose plan 1/2 (打击 -> 永世沙漏) with confidence 0.64; code rank 1 conf 0.64
- T6 [code] combat/plan: code plan (only distinct line): end turn; hp -0, dmg 0
- T7 [code] combat/plan: code plan (only line): 扫腿 -> 永世沙漏; hp -19, dmg 0
- T7 [code] combat/plan: code plan (only line): end turn; hp -27, dmg 0
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-34): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 166
- combat/plan / code: 117
- combat/plan-choice / jev: 95
- combat/plan-continue / code: 70
- reward/claim / code: 49
- selection/choose / jev: 47
- map/route-follow / code: 42
- combat/lethal / code: 26
- combat/plan-choice+potion / jev: 26
- reward/card / codex: 21
- reward/proceed / code: 18
- rest/plan / codex: 12
- rest/proceed / code: 12
- selection/upgrade / codex: 11
- combat/end_turn / code: 10
- shop/buy / codex: 10
- event/leave / code: 8
- event/choose / codex: 7
- shop/leave / code: 5
- shop/open / code: 5
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- selection/take into my hand / jev: 4
- shop/plan / codex: 4
- combat/least-loss / code: 3
- event/act-plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- event/plan / codex: 1
- map/route-change / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/take into my hand / code: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：36 个
- 第 3 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.25) (0.25)
- 第 5 层 selection/choose: Jev chose 打击 with confidence 0.17 (0.17)
- 第 5 层 combat/plan-choice: Jev chose plan 4/4 (防御, 防御) with confidence 0.25; code rank - (rollout's best line, added) (0.25)
- 第 9 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 旧日雕像, 小刀 -> 旧日雕像) with confidence 0.04; code rank 2 (0.04)
- 第 17 层 combat/plan-choice: Jev chose plan 4/4 (翻越撑击, 打击 -> 仪式兽, 中和+ -> 仪式兽); plan 1 (防御, 翻越撑击, 打击 -> 仪式兽, 中和+ -> 仪式兽) is as good or better on every axis, playing it with confide (0.32)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (中和+ -> 仪式兽, 生存者, 打击 -> 仪式兽, 打击 -> 仪式兽) with confidence 0.15; code rank 1 (0.15)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (防御, 小刀 -> 仪式兽, 小刀 -> 仪式兽) with confidence 0.20; code rank 1 (0.20)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.23 (0.23)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 5/9 (杂技, 暴露 -> 仪式兽, 切割 -> 仪式兽, 防御, 防御) with confidence 0.20; code rank 5 (0.20)
- 第 17 层 selection/choose: Jev chose 暴露 with confidence 0.25 (0.25)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 技能药水, then re-plan (confidence 0.07) (0.07)
- 第 17 层 selection/choose: Jev chose 生存者 with confidence 0.23 (0.23)
- 第 20 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 盛碗虫（石）) with confidence 0.21; code rank 2 (0.21)
- 第 23 层 selection/choose: Jev chose 毒素 with confidence 0.23 (0.23)
- 第 33 层 selection/choose: Jev chose 狂乱逃离 with confidence 0.16 (0.16)
