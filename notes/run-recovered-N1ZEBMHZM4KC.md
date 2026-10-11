## 复盘：run N1ZEBMHZM4KC — 阵亡，最高第 21 层

- 决策 349 个；Jev 调用 66 次，Claude 0 次，大脑 21 次（codex 21）；token 358,987 入 / 3,498 出，约 $0.0152（Jev）；大脑 token 3,071,742 入（缓存命中 1,705,984，56%）/ 13,627 出；用时 29.8 分钟
- 决策者：code 164，jev-plan 92，jev 66，codex 27

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 56→54（-2），决策 code 9，jev-plan 8，jev 3
- 第 3 层 小啃兽: HP 54→49（-5），决策 code 8，jev 4，jev-plan 4
- 第 4 层 毛绒伏地虫: HP 49→45（-4），决策 jev 7，code 6，jev-plan 5
- 第 5 层 利齿之眼/雾菇: HP 45→34（-11），决策 code 12，jev-plan 6，jev 4
- 第 9 层 蛮兽: HP 27→24（-3），决策 jev-plan 8，code 6，jev 4
- 第 12 层 闪光贾克斯果/飞蝇菌子: HP 45→35（-10），决策 jev-plan 7，jev 6，code 5
- 第 15 层 旧日雕像: HP 56→48（-8），决策 jev-plan 12，code 11，jev 7
- 第 17 层 同族信徒/同族神官: HP 69→7（-62），决策 jev-plan 17，code 12，jev 11
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 57→52（-5），决策 jev-plan 7，jev 6，code 5
- 第 20 层 偷窃草蜢: HP 52→30（-22），决策 jev-plan 9，code 9，jev 6
- 第 21 层 幼虫/直飞产卵虫/结实的卵: HP 30→0（-30），决策 jev-plan 9，jev 8，code 8

### 死亡战斗：第 21 层 幼虫/直飞产卵虫/结实的卵
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 尖啸
- T3 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 7
- T4 [jev] combat/plan-choice: Jev chose plan 1/2 (防御, 生存者, 迷雾+) with confidence 0.98; code rank 1 conf 0.98
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 生存者
- T4 [jev] selection/choose: Jev chose 迷雾+ with confidence 0.23; 此弃牌会移除原计划后继；原整条预测失效，返回战斗后按真实手牌重算 conf 0.23
- T4 [code] combat/plan: code plan (only distinct line): 防御; hp -0, dmg 14
- T4 [code] combat/end_turn: no playable cards; ending the turn
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 打击 -> 幼虫 #3, 迷雾, 迷雾+, 逃脱计划
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 迷雾
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 迷雾+
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 逃脱计划
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 92
- combat/plan-choice / jev: 56
- combat/plan / code: 51
- reward/claim / code: 31
- combat/lethal / code: 17
- combat/plan-continue / code: 17
- map/route-follow / code: 17
- reward/card / codex: 11
- reward/proceed / code: 10
- selection/choose / jev: 8
- combat/end_turn / code: 4
- event/leave / code: 4
- rest/plan / codex: 4
- rest/proceed / code: 4
- combat/least-loss / code: 2
- event/choose / codex: 2
- map/route-change / codex: 2
- shop/buy / codex: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice+potion / jev: 1
- event/act-plan / codex: 1
- event/plan / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1
- selection/upgrade / codex: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 3 层 selection/choose: Jev chose 防御 with confidence 0.16; 此弃牌会移除原计划后继；原整条预测失效，返回战斗后按真实手牌重算 (0.16)
- 第 4 层 selection/take into my hand: Jev chose 发现 with confidence 0.22 (0.22)
- 第 4 层 selection/choose: Jev chose 发现 with confidence 0.21; 此弃牌会移除原计划后继；原整条预测失效，返回战斗后按真实手牌重算 (0.21)
- 第 5 层 selection/choose: Jev chose 打击 with confidence 0.29; 此弃牌会移除原计划后继；原整条预测失效，返回战斗后按真实手牌重算 (0.29)
- 第 9 层 combat/plan-choice: Jev chose plan 1/5 (打击 -> 蛮兽, 毒雾, potion 速度药水, 防御) with confidence 0.31; code rank 1 (0.31)
- 第 15 层 selection/choose: Jev chose 进阶之灾 with confidence 0.31 (0.31)
- 第 15 层 selection/choose: Jev chose 打击 with confidence 0.13; 此弃牌会移除原计划后继；原整条预测失效，返回战斗后按真实手牌重算 (0.13)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (灵动步法, 打击 -> 同族神官, 生存者) with confidence 0.32; code rank 1 (0.32)
- 第 20 层 combat/plan-choice: Jev chose plan 2/3 (致命毒药 -> 偷窃草蜢, 防御, 打击 -> 偷窃草蜢, 打击 -> 偷窃草蜢) with confidence 0.23; code rank 2 (0.23)
- 第 21 层 selection/choose: Jev chose 迷雾+ with confidence 0.23; 此弃牌会移除原计划后继；原整条预测失效，返回战斗后按真实手牌重算 (0.23)
