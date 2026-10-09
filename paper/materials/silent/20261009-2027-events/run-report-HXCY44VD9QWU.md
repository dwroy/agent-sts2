## 复盘：run HXCY44VD9QWU — 阵亡，最高第 17 层

- 决策 370 个；Jev 调用 83 次，Claude 0 次，大脑 18 次（codex 18）；token 371,817 入 / 4,079 出，约 $0.0158（Jev）；大脑 token 2,410,171 入（缓存命中 1,483,776，62%）/ 5,541 出；用时 18.4 分钟
- 决策者：code 203，jev 83，jev-plan 59，codex 25

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 56→48（-8），决策 code 11，jev-plan 2，jev 1
- 第 8 层 多尼斯异鸟: HP 68→19（-49），决策 jev-plan 14，jev 6，code 6
- 第 9 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 19→19（-0），决策 jev 8，jev-plan 5，code 5
- 第 14 层 小啃兽: HP 40→40（-0），决策 jev-plan 7，jev 6，code 4
- 第 15 层 旧日雕像: HP 40→8（-32），决策 code 10，jev-plan 9，jev 7
- 第 17 层 仪式兽: HP 29→0（-29），决策 code 115，jev 55，jev-plan 22

### 死亡战斗：第 17 层 仪式兽
- T6 [code] combat/plan: code plan (only distinct line): 打击 -> 仪式兽, 打击 -> 仪式兽, 打击+ -> 仪式兽, 中和 -> 仪式兽; hp -0, dmg 33
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 仪式兽
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击+ -> 仪式兽
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 中和 -> 仪式兽
- T6 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 9 [calc mismatch: solver says ending now does not kill, mod says lethal: no end-of-turn block, Regen or Buffer the f
- T7 [code] combat/plan: code plan (only distinct line): 打击 -> 仪式兽, 打击 -> 仪式兽, 猛扑 -> 仪式兽; hp -0, dmg 34
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 仪式兽
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 猛扑 -> 仪式兽
- T7 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 8
- T8 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-8): 生存者
- T8 [jev] selection/choose: Jev chose 切割 with confidence 0.55 conf 0.55
- T8 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan / code: 66
- combat/plan-continue / jev-plan: 59
- combat/plan-choice / jev: 57
- combat/plan-continue / code: 53
- selection/choose / jev: 26
- map/route-follow / code: 15
- reward/claim / code: 13
- combat/end_turn / code: 12
- combat/least-loss / code: 11
- combat/lethal / code: 9
- reward/card / codex: 5
- reward/proceed / code: 5
- event/leave / code: 4
- event/choose / codex: 3
- rest/plan / codex: 3
- rest/proceed / code: 3
- shop/buy / codex: 3
- shop/leave / code: 3
- shop/open / code: 3
- map/route-change / codex: 2
- selection/add / codex: 2
- shop/plan / codex: 2
- bundle/choose / codex: 1
- bundle/confirm / code: 1
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/plan / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/upgrade / codex: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：4 个
- 第 8 层 selection/choose: Jev chose 打击 with confidence 0.28 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 3/5 (切割 -> 仪式兽, 后空翻, 防御, 触不可及) with confidence 0.30; code rank 3 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 3/5 (切割 -> 仪式兽, 后空翻, 防御, 触不可及) with confidence 0.34; code rank 3 (0.34)
- 第 17 层 combat/plan-choice: Jev chose plan 1/5 (致命毒药+ -> 仪式兽, 切割 -> 仪式兽, 后空翻, 匕首雨+, 防御) with confidence 0.34; code rank 1 (0.34)
