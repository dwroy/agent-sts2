## 复盘：run ZGZ0EQDDNJPT — 阵亡，最高第 17 层

- 决策 181 个；Jev 调用 24 次，Claude 0 次，DeepSeek 17 次；token 76,979 入 / 1,313 出，约 $0.0033（Jev）；DeepSeek token 350,557 入（缓存命中 236,032，67%）/ 56,130 出；用时 12.7 分钟
- 决策者：code 103，jev-plan 32，jev 24，deepseek 22

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→64（-0），决策 jev-plan 5，code 5，jev 2
- 第 3 层 缩小甲虫: HP 70→67（-3），决策 code 8，jev 1，jev-plan 1
- 第 6 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 73→73（-0），决策 jev 3，jev-plan 1，code 1
- 第 8 层 异蛙寄生虫/扭动虫: HP 79→29（-50），决策 code 14，jev-plan 9，jev 7
- 第 12 层 利齿之眼/雾菇: HP 59→59（-0），决策 jev-plan 4，jev 3，code 3
- 第 14 层 树叶史莱姆（中）/飞蝇菌子: HP 59→47（-12），决策 jev 3，code 2，jev-plan 1
- 第 17 层 同族信徒/同族神官: HP 72→2（-70），决策 code 12，jev-plan 11，jev 5

### 死亡战斗：第 17 层 同族信徒/同族神官
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 愤怒 -> 同族神官
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 踩踏
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 同族神官
- T4 [code] combat/plan: code plan (only line): end turn; hp -3, dmg 0
- T5 [code] combat/plan: code plan (only distinct line): 痛击+ -> 同族信徒, 剑柄打击+ -> 同族信徒; hp -22, dmg 22
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 剑柄打击+ -> 同族信徒
- T5 [code] combat/plan: code plan (only line): end turn; hp -22, dmg 0
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): 防御, 打击 -> 同族神官, 愤怒 -> 同族神官, 打击 -> 同族神官
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 同族神官
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 同族神官
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 同族神官
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 32
- reward/claim / code: 22
- combat/plan / code: 21
- combat/plan-choice / jev: 18
- map/route-follow / code: 15
- combat/plan-continue / code: 12
- combat/lethal / code: 7
- reward/card / deepseek: 7
- reward/proceed / code: 6
- combat/plan-choice+potion / jev: 5
- event/leave / code: 4
- rest/plan / deepseek: 4
- rest/proceed / code: 4
- event/choose / deepseek: 3
- combat/end_turn / code: 2
- combat/least-loss / code: 2
- selection/upgrade / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice+potion-lethal / jev: 1
- event/plan / deepseek: 1
- map/discard-potion / code: 1
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / code: 1
- shop/buy / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：5 个
- 第 8 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 异蛙寄生虫, 痛击+ -> 异蛙寄生虫) with confidence 0.27; code rank 1 (0.27)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (重锤 -> 树叶史莱姆（中）) with confidence 0.08; code rank 1 (0.08)
- 第 14 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.18; code rank 2 (0.18)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/9 (防御, 突破, 剑柄打击+ -> 同族神官, 愤怒 -> 同族神官, potion 火焰药水 -> 同族神官) with confidence 0.31; code rank 1 (0.31)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/5 (打击 -> 同族神官, 打击 -> 同族神官, 踩踏) with confidence 0.19; code rank 1 (0.19)
