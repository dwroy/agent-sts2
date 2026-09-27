## 复盘：run X8R8CDF4HMNG — 阵亡，最高第 17 层

- 决策 215 个；Jev 调用 61 次，Claude 0 次，DeepSeek 0 次；token 107,023 入 / 2,757 出，约 $0.0046；用时 10.6 分钟
- 决策者：code 125，jev 56，jev-plan 29，code-fallback 5

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→56（-8），决策 code 10，code-fallback 2
- 第 4 层 毛绒伏地虫: HP 62→56（-6），决策 code 9，jev-plan 2，jev 1
- 第 5 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 62→48（-14），决策 code 5，jev 4，jev-plan 3，code-fallback 1
- 第 6 层 闪光贾克斯果/飞蝇菌子: HP 54→31（-23），决策 jev-plan 5，code 5，jev 4
- 第 9 层 墨宝: HP 80→69（-11），决策 code 10，jev-plan 2，jev 1
- 第 12 层 藤蔓蹒跚者: HP 75→56（-19），决策 code 8，jev 3，jev-plan 2
- 第 14 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 62→56（-6），决策 code 6，jev 2，jev-plan 2，code-fallback 1
- 第 15 层 方柱构装体: HP 62→54（-8），决策 code 7，jev-plan 2，code-fallback 1，jev 1
- 第 17 层 同族信徒/同族神官: HP 80→3（-77），决策 jev 23，jev-plan 11
- 第 17 层 同族神官: HP 3→3（-0），决策 code 5

### 死亡战斗：第 17 层 同族神官
- T11 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 34): 剑柄打击 -> 同族神官, 打击 -> 同族
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 邪眼, 防御, 重锤 -> 同族神官
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 重锤 -> 同族神官
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): end turn

### 各类决策由谁做
- combat/plan / code: 36
- combat/plan-continue / jev-plan: 29
- combat/plan-choice+potion / jev: 22
- reward/claim / code: 18
- combat/plan-continue / code: 17
- combat/plan-choice / jev: 16
- combat/lethal / code: 9
- map/route / code: 8
- map/route / jev: 8
- reward/proceed / code: 8
- reward/card / code: 6
- combat/plan-choice / code-fallback: 5
- event/choose / jev: 4
- event/leave / code: 4
- combat/least-loss / code: 3
- shop/buy / code: 3
- rest/choose / code: 2
- rest/proceed / code: 2
- reward/card / jev: 2
- selection/take into my hand / code: 2
- shop/buy / jev: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/play / jev: 1
- run/finalize / code: 1
- selection/enchant / jev: 1
- selection/upgrade / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 5 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 树枝史莱姆（小）, 打击 -> 树枝史莱姆（小）, 防御) with confidence 0.12; code rank 1 (0.12)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (重锤 -> 闪光贾克斯果) with confidence 0.01; code rank 1 (0.01)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 飞蝇菌子, 防御) with confidence 0.33; code rank 1 (0.33)
- 第 11 层 shop/buy: Jev chose buy 突破 (48g) with confidence 0.15 (0.15)
- 第 13 层 event/choose: Jev chose 读下封底 with confidence 0.12 (0.12)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.34; code rank 1 (0.34)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/4 (闪电霹雳, 突破, 防御, potion 迅捷药水) with confidence 0.34; code rank 1 (0.34)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.25; code rank 1 (0.25)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.27; code rank 1 (0.27)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.31; code rank 1 (0.31)
