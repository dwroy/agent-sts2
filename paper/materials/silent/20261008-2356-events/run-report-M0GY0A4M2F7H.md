## 复盘：run M0GY0A4M2F7H — 阵亡，最高第 17 层

- 决策 526 个；Jev 调用 153 次，Claude 0 次，大脑 18 次（codex 18）；token 743,583 入 / 6,917 出，约 $0.0315（Jev）；大脑 token 2,363,621 入（缓存命中 1,456,384，62%）/ 5,070 出；用时 24.9 分钟
- 决策者：code 210，jev 153，jev-plan 142，codex 21

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 56→51（-5），决策 code 12，jev-plan 7，jev 4
- 第 3 层 小啃兽: HP 51→47（-4），决策 code 10，jev-plan 5，jev 2
- 第 4 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 47→39（-8），决策 code 6，jev 4，jev-plan 4
- 第 6 层 墨宝: HP 39→36（-3），决策 jev-plan 7，code 5，jev 3
- 第 11 层 方柱构装体: HP 50→31（-19），决策 code 14，jev-plan 10，jev 5
- 第 13 层 毛绒伏地虫/缩小甲虫: HP 52→31（-21），决策 jev-plan 16，code 10，jev 9
- 第 14 层 树叶史莱姆（中）/飞蝇菌子: HP 31→11（-20），决策 code 11，jev 10，jev-plan 9
- 第 15 层 利齿之眼/雾菇: HP 11→8（-3），决策 code 12，jev 10，jev-plan 5
- 第 17 层 墨影幻灵: HP 29→0（-29），决策 jev 106，jev-plan 79，code 76

### 死亡战斗：第 17 层 墨影幻灵
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 中和 -> 墨影幻灵
- T5 [code] combat/plan: code plan (only line): end turn; hp -7, dmg 7
- T6 [jev] combat/plan-choice: Jev chose plan 3/3 (打击 -> 墨影幻灵, 精确切击 -> 墨影幻灵, 生存者, 闪亮登场) with confidence 0.24; code rank 3 conf 0.24
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 精确切击 -> 墨影幻灵
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 生存者
- T6 [jev] selection/choose: Jev chose 闪亮登场 with confidence 0.25 conf 0.25
- T6 [code] combat/plan: code plan (only distinct line): 后空翻; hp -1, dmg 6
- T6 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 6
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 偏折, 防御, 防御
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 142
- combat/plan / code: 91
- combat/plan-choice / jev: 71
- combat/plan-choice+potion / jev: 44
- combat/plan-continue / code: 34
- selection/choose / jev: 32
- reward/claim / code: 19
- combat/lethal / code: 15
- map/route-follow / code: 15
- combat/least-loss / code: 9
- reward/card / codex: 8
- reward/proceed / code: 8
- combat/end_turn / code: 6
- selection/take into my hand / jev: 6
- event/choose / codex: 5
- event/leave / code: 3
- rest/plan / codex: 3
- rest/proceed / code: 3
- shop/buy / codex: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- map/route-change / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/free-card / code: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：22 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/3 (打击 -> 毛绒伏地虫, 生存者, 打击 -> 毛绒伏地虫) with confidence 0.23; code rank 2 (0.23)
- 第 2 层 selection/choose: Jev chose 防御 with confidence 0.21 (0.21)
- 第 13 层 selection/choose: Jev chose 打击 with confidence 0.29 (0.29)
- 第 14 层 selection/choose: Jev chose 黏液 with confidence 0.24 (0.24)
- 第 15 层 selection/choose: Jev chose 精确切击 with confidence 0.33 (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 5/5 (打击 -> 墨影幻灵, 中和 -> 墨影幻灵, 后空翻, 投掷匕首 -> 墨影幻灵) with confidence 0.34; code rank - (rollout's best line, added) (0.34)
- 第 17 层 selection/choose: Jev chose 伤口 with confidence 0.22 (0.22)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.33; code rank 2 (0.33)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.15 (0.15)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.25; code rank 2 (0.25)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.26) (0.26)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.21 (0.21)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.28; code rank 1 (0.28)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.22; code rank 2 (0.22)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.34) (0.34)
