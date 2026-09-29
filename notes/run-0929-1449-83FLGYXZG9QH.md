## 复盘：run 83FLGYXZG9QH — 阵亡，最高第 17 层

- 决策 203 个；Jev 调用 32 次，Claude 0 次，DeepSeek 17 次；token 103,526 入 / 1,600 出，约 $0.0044（Jev）；DeepSeek token 350,232 入（缓存命中 253,184，72%）/ 52,444 出；用时 11.0 分钟
- 决策者：code 119，jev 32，jev-plan 28，deepseek 24

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→60（-4），决策 code 7，jev 4，jev-plan 3
- 第 5 层 毛绒伏地虫: HP 67→67（-0），决策 code 6，jev 2，jev-plan 2
- 第 6 层 缩小甲虫: HP 73→73（-0），决策 code 9
- 第 8 层 多尼斯异鸟: HP 74→28（-46），决策 code 8，jev 5，jev-plan 5
- 第 12 层 异蛙寄生虫/扭动虫: HP 73→61（-12），决策 code 14，jev 9，jev-plan 7
- 第 15 层 藤蔓蹒跚者: HP 80→76（-4），决策 code 7，jev-plan 4，jev 3
- 第 17 层 同族信徒/同族神官: HP 82→2（-80），决策 code 10，jev 9，jev-plan 7

### 死亡战斗：第 17 层 同族信徒/同族神官
- T4 [code] combat/plan: code plan (only line): end turn; hp -3, dmg 0
- T5 [jev] combat/plan-choice: Jev chose plan 2/2 (上勾拳+ -> 同族神官, 双重打击 -> 同族神官) with confidence 0.67; code rank 2 conf 0.67
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 双重打击 -> 同族神官
- T5 [code] combat/plan: code plan (only line): end turn; hp -30, dmg 0
- T6 [jev] combat/plan-choice: Jev chose plan 1/5 (耸肩无视, 耸肩无视+, 御血术 -> 同族神官) with confidence 0.22; code rank 1 conf 0.22
- T6 [jev] combat/plan-choice: Jev chose plan 3/5 (耸肩无视+, 挑衅 -> 同族信徒) with confidence 0.34; code rank 3 conf 0.34
- T6 [jev] combat/plan-choice: Jev chose plan 1/4 (御血术 -> 同族神官) with confidence 0.27; code rank 1 conf 0.27
- T6 [code] combat/plan: code plan (only line): end turn; hp -11, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 9): 耸肩无视+, 上勾拳+ -> 同族神官
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 4): 耸肩无视, 打击 -> 同族神官
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 挑衅 -> 同族信徒
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan / code: 32
- combat/plan-choice / jev: 32
- combat/plan-continue / jev-plan: 28
- reward/claim / code: 21
- combat/plan-continue / code: 15
- map/route-follow / code: 15
- reward/card / deepseek: 8
- combat/lethal / code: 7
- reward/proceed / code: 6
- combat/least-loss / code: 4
- event/leave / code: 4
- event/choose / deepseek: 3
- rest/plan / deepseek: 3
- rest/proceed / code: 3
- selection/upgrade / deepseek: 3
- shop/buy / deepseek: 3
- combat/plan-potion / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/potion-now / code: 1
- event/plan / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1
- shop/buy / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：8 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/8 (打击 -> 树叶史莱姆（小）, 双重打击 -> 树叶史莱姆（小）, 防御, potion 易伤药水 -> 树叶史莱姆（中）) with confidence 0.30; code rank 1 (0.30)
- 第 5 层 combat/plan-choice: Jev chose plan 2/2 (potion 士兵炖汤) with confidence 0.34; code rank 2 (0.34)
- 第 8 层 combat/plan-choice: Jev chose plan 2/4 (防御, 痛击+ -> 多尼斯异鸟) with confidence 0.14; code rank 2 (0.14)
- 第 12 层 combat/plan-choice: Jev chose plan 2/3 (痛击+ -> 异蛙寄生虫, 打击 -> 异蛙寄生虫) with confidence 0.25; code rank 2 (0.25)
- 第 17 层 combat/plan-choice: Jev chose plan 1/6 (御血术 -> 同族神官, 打击 -> 同族神官) with confidence 0.31; code rank 1 (0.31)
- 第 17 层 combat/plan-choice: Jev chose plan 1/5 (耸肩无视, 耸肩无视+, 御血术 -> 同族神官) with confidence 0.22; code rank 1 (0.22)
- 第 17 层 combat/plan-choice: Jev chose plan 3/5 (耸肩无视+, 挑衅 -> 同族信徒) with confidence 0.34; code rank 3 (0.34)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (御血术 -> 同族神官) with confidence 0.27; code rank 1 (0.27)
