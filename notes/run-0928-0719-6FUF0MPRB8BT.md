## 复盘：run 6FUF0MPRB8BT — 阵亡，最高第 17 层

- 决策 202 个；Jev 调用 26 次，Claude 0 次，DeepSeek 0 次；token 45,102 入 / 1,137 出，约 $0.0019；用时 10.8 分钟
- 决策者：code 153，jev 24，jev-plan 23，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 75→59（-16），决策 code 10，jev 2，jev-plan 2
- 第 3 层 小啃兽: HP 65→57（-8），决策 code 8，jev-plan 2，code-fallback 1，jev 1
- 第 6 层 缩小甲虫: HP 63→61（-2），决策 code 7，jev-plan 2，jev 1
- 第 7 层 闪光贾克斯果/飞蝇菌子: HP 67→41（-26），决策 code 9，jev-plan 4，jev 2，code-fallback 1
- 第 9 层 利齿之眼/雾菇: HP 74→56（-18），决策 code 9，jev-plan 2，jev 1
- 第 12 层 树枝史莱姆（中）/飞蝇菌子: HP 71→47（-24），决策 code 7，jev-plan 3，jev 2
- 第 14 层 劫掠者刺客/劫掠者斧手/劫掠者追踪手: HP 80→67（-13），决策 code 8，jev-plan 4，jev 2
- 第 17 层 同族信徒/同族神官: HP 91→3（-88），决策 code 30，jev-plan 4，jev 2

### 死亡战斗：第 17 层 同族信徒/同族神官
- T7 [code] combat/plan: code plan (+12.0 over next): 战斗专注, 挑衅 -> 同族神官, 旋风斩; hp -18, dmg 22
- T7 [code] combat/plan: code plan (+6.8 over next): 挑衅 -> 同族神官, 旋风斩; hp -18, dmg 22
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩
- T7 [code] combat/plan: code plan (only line): end turn; hp -18, dmg 0
- T8 [code] combat/plan: code plan (+58.6 over next): 挑衅 -> 同族信徒, 预备打击 -> 同族信徒, 双重打击 -> 同族信徒; hp -5, dmg 32
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 预备打击 -> 同族信徒
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 同族信徒
- T8 [code] combat/plan: code plan (only line): end turn; hp -5, dmg 0
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 17): 耸肩无视, 闪电霹雳, 打击 -> 同族神官
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): 防御, 防御
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): end turn

### 各类决策由谁做
- combat/plan / code: 47
- combat/plan-continue / code: 29
- combat/plan-continue / jev-plan: 23
- reward/claim / code: 17
- combat/plan-choice / jev: 13
- map/route / code: 12
- reward/proceed / code: 10
- combat/lethal / code: 7
- reward/card / code: 6
- event/choose / jev: 4
- event/leave / code: 4
- map/route / jev: 4
- combat/least-loss / code: 3
- rest/choose / code: 3
- rest/proceed / code: 3
- combat/plan-choice / code-fallback: 2
- combat/plan-guarded / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- map/discard-potion / code: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/add / code: 1
- selection/add / jev: 1
- selection/upgrade / code: 1
- shop/buy / code: 1
- shop/buy / jev: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：4 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 小啃兽, 防御, 打击 -> 小啃兽) with confidence 0.10; code rank 1 (0.10)
- 第 5 层 shop/buy: Jev chose buy 火焰屏障 (79g) with confidence 0.20 (0.20)
- 第 6 层 combat/plan-choice: Jev chose plan 2/3 (防御, 预备打击 -> 缩小甲虫, 打击 -> 缩小甲虫) with confidence 0.34; code rank 2 (0.34)
- 第 12 层 map/route: Jev chose RestSite (row 12, col 3) with confidence 0.09 (0.09)
