## 复盘：run VUV4MSZUA34L — 阵亡，最高第 17 层

- 决策 228 个；Jev 调用 49 次，Claude 0 次，DeepSeek 0 次；token 85,605 入 / 2,077 出，约 $0.0037；用时 10.2 分钟
- 决策者：code 149，jev 47，jev-plan 30，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→56（-8），决策 code 8，jev-plan 5，jev 3
- 第 3 层 毛绒伏地虫: HP 62→57（-5），决策 code 7，jev-plan 3，jev 2
- 第 4 层 缩小甲虫: HP 63→55（-8），决策 code 10，jev 1，jev-plan 1
- 第 5 层 墨宝: HP 61→43（-18），决策 code 11，jev-plan 3，jev 2，code-fallback 1
- 第 8 层 毛绒伏地虫/缩小甲虫: HP 49→28（-21），决策 code 9，jev 3，jev-plan 3
- 第 13 层 扭动虫: HP 80→59（-21），决策 code 9，jev 3，jev-plan 2
- 第 14 层 异蛙寄生虫/扭动虫: HP 65→56（-9），决策 code 7，jev 3，jev-plan 2
- 第 14 层 扭动虫: HP 56→29（-27），决策 jev 5，code 2，jev-plan 1
- 第 17 层 同族信徒/同族神官: HP 59→3（-56），决策 jev 12，jev-plan 10，code 9，code-fallback 1
- 第 17 层 同族神官: HP 3→3（-0），决策 code 9

### 死亡战斗：第 17 层 同族神官
- T8 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T9 [code] combat/plan: code plan (+14.5 over next): 耸肩无视, 耸肩无视, 痛击 -> 同族神官; hp -0, dmg 8
- T9 [code] combat/plan: code plan (+14.5 over next): 耸肩无视, 痛击 -> 同族神官; hp -0, dmg 8
- T9 [code] combat/plan: code plan (+14.5 over next): 痛击 -> 同族神官; hp -0, dmg 8
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): 防御, 打击 -> 同族神官, 防御
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 同族神官
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): end turn

### 各类决策由谁做
- combat/plan / code: 50
- combat/plan-continue / jev-plan: 30
- combat/plan-choice+potion / jev: 19
- combat/plan-continue / code: 19
- reward/claim / code: 18
- combat/plan-choice / jev: 15
- map/route / code: 11
- combat/lethal / code: 10
- reward/proceed / code: 8
- reward/card / code: 6
- map/route / jev: 5
- event/choose / jev: 4
- event/leave / code: 4
- selection/add / code: 4
- rest/proceed / code: 3
- shop/buy / code: 3
- combat/least-loss / code: 2
- event/only / code: 2
- rest/choose / code: 2
- reward/card / jev: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice / code-fallback: 1
- combat/plan-choice+potion / code-fallback: 1
- rest/choose / jev: 1
- run/finalize / code: 1
- selection/remove / code: 1
- shop/buy / jev: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 1 层 event/choose: Jev chose 羽翼之靴 with confidence 0.08 (0.08)
- 第 3 层 combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 毛绒伏地虫, 防御) with confidence 0.28; code rank 1 (0.28)
- 第 3 层 map/route: Jev chose Monster (row 3, col 6) with confidence 0.33 (0.33)
- 第 4 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 缩小甲虫, 防御) with confidence 0.24; code rank 1 (0.24)
- 第 6 层 event/choose: Jev chose 顺走地图 with confidence 0.22 (0.22)
- 第 13 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.28; code rank 1 (0.28)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.21; code rank 1 (0.21)
- 第 14 层 reward/card: Jev chose 完美打击 (Attack, 2E) with confidence 0.06 (0.06)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.11; code rank 1 (0.11)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (打击 -> 同族信徒, 打击 -> 同族信徒, 打击 -> 同族神官) with confidence 0.17; code rank 1 (0.17)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.26; code rank 1 (0.26)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 熔炉的祝福 (confidence 0.01) (0.01)
