## 复盘：run NTMAU4XZ2NN2 — 阵亡，最高第 14 层

- 决策 214 个；Jev 调用 45 次，Claude 0 次，大脑 13 次（codex 13）；token 156,618 入 / 2,162 出，约 $0.0067（Jev）；大脑 token 1,750,705 入（缓存命中 744,960，43%）/ 4,151 出；用时 9.9 分钟
- 决策者：code 118，jev 45，jev-plan 33，codex 18

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 56→51（-5），决策 code 16，jev-plan 6，jev 4
- 第 4 层 毛绒伏地虫: HP 51→43（-8），决策 code 11，jev 5，jev-plan 3
- 第 8 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 43→41（-2），决策 jev 11，jev-plan 6，code 6
- 第 11 层 藤蔓蹒跚者: HP 62→45（-17），决策 code 13，jev 3，jev-plan 3
- 第 13 层 小啃兽: HP 66→43（-23），决策 code 13，jev 8，jev-plan 7
- 第 14 层 异蛙寄生虫/扭动虫: HP 43→0（-43），决策 code 18，jev 14，jev-plan 8

### 死亡战斗：第 14 层 异蛙寄生虫/扭动虫
- T7 [code] combat/plan: code plan (only line): end turn; hp -7, dmg 0
- T8 [jev] combat/plan-choice: Jev chose plan 2/3 (打击 -> 扭动虫 #1, 防御, 带毒刺击 -> 扭动虫 #1) with confidence 1.00; code rank 2 conf 1.00
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 带毒刺击 -> 扭动虫 #1
- T8 [code] combat/plan: code plan (only line): end turn; hp -13, dmg 3
- T9 [jev] combat/plan-choice: Jev chose plan 3/3 (致命毒药 -> 扭动虫 #3, 生存者) with confidence 1.00; code rank - (rollout's best line, added) [ending now kills by what the mod's lethal flag does not conf 1.00
- T9 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 生存者
- T9 [jev] selection/choose: Jev chose 感染 with confidence 0.89 conf 0.89
- T9 [code] combat/end_turn: no playable cards; ending the turn
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): 防御, 打击 -> 扭动虫 #3
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 扭动虫 #3
- T10 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan / code: 40
- combat/plan-continue / jev-plan: 33
- combat/plan-choice / jev: 30
- combat/plan-continue / code: 22
- selection/choose / jev: 15
- map/route-follow / code: 12
- reward/claim / code: 12
- combat/lethal / code: 8
- combat/end_turn / code: 6
- reward/card / codex: 5
- reward/proceed / code: 5
- event/leave / code: 4
- event/plan / codex: 3
- rest/plan / codex: 2
- rest/proceed / code: 2
- shop/buy / codex: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/least-loss / code: 1
- event/choose / codex: 1
- map/route-change / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/transform / codex: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：5 个
- 第 4 层 selection/choose: Jev chose 防御 with confidence 0.26 (0.26)
- 第 8 层 combat/plan-choice: Jev chose plan 1/5 (防御, 中和 -> 树枝史莱姆（中）, 刀刃之舞, potion 虚弱药水 -> 树枝史莱姆（小）) with confidence 0.31; code rank 1 (0.31)
- 第 13 层 selection/choose: Jev chose 打击 with confidence 0.24 (0.24)
- 第 13 层 selection/choose: Jev chose 中和 with confidence 0.14 (0.14)
- 第 13 层 selection/choose: Jev chose 刀刃之舞 with confidence 0.13 (0.13)
