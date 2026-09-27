## 复盘：run VF5CMUAQV4G4 — 阵亡，最高第 27 层

- 决策 349 个；Jev 调用 80 次，Claude 0 次，DeepSeek 0 次；token 135,671 入 / 3,402 出，约 $0.0058；用时 13.0 分钟
- 决策者：code 220，jev 75，jev-plan 49，code-fallback 5

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→56（-8），决策 code 6，jev 3，jev-plan 3
- 第 3 层 小啃兽: HP 62→54（-8），决策 code 6，jev 2，jev-plan 2，code-fallback 1
- 第 5 层 毛绒伏地虫: HP 60→54（-6），决策 code 7，jev-plan 2，jev 1，code-fallback 1
- 第 6 层 劫掠者刺客/劫掠者斧手/劫掠者追踪手: HP 60→23（-37），决策 jev-plan 6，code 6，jev 5
- 第 13 层 方柱构装体: HP 77→62（-15），决策 jev-plan 9，code 9，jev 7
- 第 14 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 68→65（-3），决策 code 14，jev 4，jev-plan 2
- 第 17 层 同族信徒/同族神官: HP 80→8（-72），决策 code 42，jev 10，jev-plan 8
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 66→60（-6），决策 code 11，jev 2，jev-plan 1
- 第 21 层 外骨骼虫: HP 66→55（-11），决策 code 9，jev-plan 6，jev 5，code-fallback 1
- 第 22 层 猎人杀手: HP 61→23（-38），决策 jev 8，jev-plan 7，code 5，code-fallback 2
- 第 27 层 蜂群术士: HP 53→53（-0），决策 jev 2，jev-plan 2
- 第 27 层 蜂群术士: HP 53→2（-51），决策 code 13，jev 3，jev-plan 1

### 死亡战斗：第 27 层 蜂群术士
- T3 [code] combat/plan: code plan (only distinct line): 杀灭, 完美打击 -> 蜂群术士, 打击 -> 蜂群术士; hp -0, dmg 58
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 完美打击 -> 蜂群术士
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 蜂群术士
- T3 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T4 [code] combat/plan: code plan (only distinct line): 预备打击+ -> 蜂群术士, 重锤 -> 蜂群术士, 狱火; hp -29, dmg 45
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 重锤 -> 蜂群术士
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 狱火
- T4 [code] combat/end_turn: no playable cards; ending the turn
- T5 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 10): 战斗专注, potion 虚弱药水 -> 蜂
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): 预备打击 -> 蜂群术士, potion 虚弱药水 -> 蜂群术士
- T5 [code] combat/plan-continue: continuing the code-chosen plan: potion 虚弱药水 -> 蜂群术士
- T5 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan / code: 78
- combat/plan-continue / jev-plan: 49
- combat/plan-choice / jev: 48
- combat/plan-continue / code: 29
- reward/claim / code: 25
- map/route / code: 22
- combat/lethal / code: 11
- reward/proceed / code: 10
- event/choose / jev: 8
- event/leave / code: 8
- reward/card / code: 6
- combat/plan-guarded / code: 5
- rest/proceed / code: 5
- combat/plan-choice / code-fallback: 4
- combat/plan-choice+potion / jev: 4
- map/route / jev: 4
- rest/choose / code: 4
- reward/card / jev: 4
- combat/end_turn / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- selection/remove / code: 2
- selection/upgrade / jev: 2
- shop/buy / jev: 2
- combat/plan-choice+potion / code-fallback: 1
- rest/choose / jev: 1
- run/finalize / code: 1
- selection/enchant / jev: 1
- selection/take into my hand / jev: 1
- shop/buy / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：16 个
- 第 1 层 event/choose: Jev chose 奥术卷轴 with confidence 0.24 (0.24)
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 树叶史莱姆（小）, 打击 -> 树叶史莱姆（小）) with confidence 0.06; code rank 1 (0.06)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (end turn) with confidence 0.31; code rank 1 (0.31)
- 第 6 层 reward/card: Jev chose 火焰屏障 (Skill, 2E) with confidence 0.34 (0.34)
- 第 8 层 shop/buy: Jev chose buy 凶恶 (38g) with confidence 0.09 (0.09)
- 第 13 层 reward/card: Jev chose 预备打击 (Attack, 1E) with confidence 0.20 (0.20)
- 第 13 层 map/route: Jev chose Unknown (row 13, col 3) with confidence 0.11 (0.11)
- 第 15 层 event/choose: Jev chose 蛇 with confidence 0.07 (0.07)
- 第 15 层 selection/enchant: Jev chose 预备打击 with confidence 0.26 (0.26)
- 第 18 层 event/choose: Jev chose 佩尔之肉 with confidence 0.29 (0.29)
- 第 20 层 event/choose: Jev chose 融合防御 with confidence 0.15 (0.15)
- 第 21 层 combat/plan-choice: Jev chose plan 2/2 (究极防御, 防御, 打击 -> 外骨骼虫) with confidence 0.34; code rank 2 (0.34)
- 第 23 层 event/choose: Jev chose 搜索附近的区域 with confidence 0.28 (0.28)
- 第 25 层 event/choose: Jev chose 学习杀灭的技巧 with confidence 0.14 (0.14)
- 第 27 层 selection/take into my hand: Jev chose 薪火之源 with confidence 0.15 (0.15)
