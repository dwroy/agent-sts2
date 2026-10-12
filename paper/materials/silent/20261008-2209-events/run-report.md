## 复盘：run WZL2AMEY85S7 — 阵亡，最高第 17 层

- 决策 381 个；Jev 调用 58 次，Claude 0 次，大脑 15 次（codex 15）；token 279,100 入 / 2,725 出，约 $0.0118（Jev）；大脑 token 1,968,362 入（缓存命中 846,336，43%）/ 4,241 出；用时 34.7 分钟
- 决策者：code 218，jev-plan 85，jev 58，codex 20

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 56→56（-0），决策 code 17，jev 3，jev-plan 2
- 第 3 层 缩小甲虫: HP 56→55（-1），决策 jev-plan 6，jev 3，code 3
- 第 4 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 55→55（-0），决策 jev-plan 2，jev 1
- 第 5 层 蛮兽: HP 55→45（-10），决策 jev-plan 10，code 10，jev 5
- 第 6 层 劫掠者刺客/劫掠者斧手/劫掠者暴徒: HP 45→2（-43），决策 jev-plan 8，code 8，jev 6
- 第 13 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 56→33（-23），决策 code 6，jev-plan 5，jev 3
- 第 14 层 方柱构装体: HP 33→19（-14），决策 code 9，jev-plan 6，jev 3
- 第 17 层 仪式兽: HP 40→0（-40），决策 code 112，jev-plan 46，jev 34

### 死亡战斗：第 17 层 仪式兽
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 尖啸
- T5 [code] combat/plan: code plan (only line): end turn; hp -4, dmg 8
- T6 [code] combat/plan: code plan (only distinct line): 毒雾, 突然一拳 -> 仪式兽, 回响斩击, 中和 -> 仪式兽; hp -0, dmg 32
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 突然一拳 -> 仪式兽
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 回响斩击
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 中和 -> 仪式兽
- T6 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 11 [calc mismatch: solver says ending now does not kill, mod says lethal: no end-of-turn block, Regen or Buffer the 
- T7 [code] combat/plan: code plan (only distinct line): 打击 -> 仪式兽; hp -0, dmg 22
- T7 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 16
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 生存者
- T8 [jev] selection/choose: Jev chose 打击 with confidence 0.46 conf 0.46
- T8 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 85
- combat/plan / code: 84
- combat/plan-continue / code: 58
- combat/plan-choice / jev: 45
- reward/claim / code: 16
- map/route-follow / code: 15
- selection/choose / jev: 13
- combat/lethal / code: 8
- combat/end_turn / code: 7
- combat/least-loss / code: 7
- reward/card / codex: 7
- reward/proceed / code: 7
- rest/plan / codex: 4
- rest/proceed / code: 4
- event/leave / code: 2
- event/plan / codex: 2
- shop/buy / codex: 2
- shop/leave / code: 2
- shop/open / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/mod-lethal / code: 1
- map/route-change / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/remove / codex: 1
- selection/transform / codex: 1
- shop/buy / code: 1
- shop/plan / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：7 个
- 第 2 层 selection/choose: Jev chose 进阶之灾 with confidence 0.30 (0.30)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (小刀 -> 劫掠者斧手, 小刀 -> 劫掠者斧手, 小刀 -> 劫掠者斧手) with confidence 0.02; code rank 1 [calc mismatch: solver says ending now does not kill, mod (0.02)
- 第 17 层 selection/choose: Jev chose 刀刃之舞 with confidence 0.31 (0.31)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.30 (0.30)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.34 (0.34)
- 第 17 层 selection/choose: Jev chose 打击 with confidence 0.24 (0.24)
- 第 17 层 selection/choose: Jev chose 刀刃之舞 with confidence 0.29 (0.29)
