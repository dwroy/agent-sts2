## 复盘：run UZ1T7AH49WMB — 阵亡，最高第 25 层

- 决策 406 个；Jev 调用 59 次，Claude 0 次，大脑 24 次（codex 24）；token 280,089 入 / 2,894 出，约 $0.0119（Jev）；大脑 token 3,099,767 入（缓存命中 1,675,520，54%）/ 7,826 出；用时 22.6 分钟
- 决策者：code 226，jev-plan 87，jev 59，codex 34

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 66→62（-4），决策 code 15，jev-plan 3，jev 2
- 第 3 层 小啃兽: HP 62→62（-0），决策 jev-plan 6，code 6，jev 3
- 第 5 层 缩小甲虫: HP 62→62（-0），决策 code 8，jev 2，jev-plan 2
- 第 9 层 劫掠者刺客/劫掠者暴徒/劫掠者追踪手: HP 62→62（-0），决策 code 6，jev 5，jev-plan 3
- 第 13 层 异蛙寄生虫/扭动虫: HP 80→45（-35），决策 code 19，jev-plan 4，jev 2
- 第 14 层 树叶史莱姆（小）/树枝史莱姆（小）/蛇行扼杀者: HP 45→40（-5），决策 code 10，jev 7，jev-plan 4
- 第 15 层 藤蔓蹒跚者: HP 40→30（-10），决策 jev-plan 10，code 6，jev 5
- 第 17 层 同族信徒/同族神官: HP 54→19（-35），决策 code 19，jev-plan 17，jev 10
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 67→53（-14），决策 jev-plan 10，code 3，jev 2
- 第 20 层 地道虫: HP 53→15（-38），决策 jev-plan 10，code 10，jev 3
- 第 25 层 残杀千足虫: HP 15→0（-15），决策 code 41，jev 18，jev-plan 18

### 死亡战斗：第 25 层 残杀千足虫
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 残杀千足虫 (FRONT)
- T1 [code] combat/plan: code plan (only line): end turn; hp -9, dmg 0
- T2 [code] combat/plan: code plan (only distinct line): 触媒, 尖啸, 匕首雨, 偏折+; hp -0, dmg 24
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 尖啸
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 匕首雨
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 偏折+
- T2 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-15): 偏折, 触媒, 防御, 毒雾+
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 触媒
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 毒雾+
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-15): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 87
- combat/plan / code: 60
- combat/plan-continue / code: 54
- combat/plan-choice / jev: 35
- reward/claim / code: 28
- map/route-follow / code: 21
- combat/lethal / code: 16
- selection/choose / jev: 12
- reward/proceed / code: 11
- combat/plan-choice+potion / jev: 10
- reward/card / codex: 10
- combat/least-loss / code: 7
- event/leave / code: 7
- shop/buy / codex: 6
- combat/end_turn / code: 5
- event/choose / codex: 4
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / codex: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- event/plan / codex: 2
- rest/plan / codex: 2
- rest/proceed / code: 2
- selection/take into my hand / jev: 2
- combat/potion-now / code: 1
- event/act-plan / codex: 1
- map/route-change / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/add / codex: 1
- selection/enchant / codex: 1
- selection/upgrade / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：4 个
- 第 15 层 selection/choose: Jev chose 进阶之灾 with confidence 0.30 (0.30)
- 第 25 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 残杀千足虫 (BACK), 打击 -> 残杀千足虫 (BACK)) with confidence 0.13; code rank 1 (0.13)
- 第 25 层 combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 残杀千足虫 (BACK)) with confidence 0.02; code rank 1 (0.02)
- 第 25 层 combat/plan-choice: Jev chose plan 2/3 (打击 -> 残杀千足虫 (FRONT), 打击 -> 残杀千足虫 (FRONT), 防御, 打击 -> 残杀千足虫 (FRONT)) with confidence 0.16; code rank 2 (0.16)
