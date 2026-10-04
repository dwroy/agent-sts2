## 复盘：run NBCDUAYLWKVK — 阵亡，最高第 17 层

- 决策 205 个；Jev 调用 42 次，Claude 0 次，DeepSeek 16 次；token 212,607 入 / 1,972 出，约 $0.0090（Jev）；DeepSeek token 2,173,622 入（缓存命中 1,896,960，87%）/ 108,393 出；用时 16.4 分钟
- 决策者：code 106，jev 42，jev-plan 36，deepseek 21

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→57（-7，战后回复 +6），决策 jev-plan 6，code 5，jev 3
- 第 6 层 噬尸蛞蝓: HP 62→55（-7，战后回复 +6），决策 jev-plan 5，code 5，jev 4
- 第 8 层 蟾蜍蝌蚪: HP 86→74（-12，战后回复 +6），决策 code 6，jev 2，jev-plan 2
- 第 9 层 骇鳗: HP 80→53（-27，战后回复 +6），决策 jev 7，jev-plan 7，code 7
- 第 14 层 花园幽灵鳗: HP 59→31（-28，战后回复 +6），决策 jev 9，code 8，jev-plan 6
- 第 17 层 瀑布巨兽: HP 77→0（-77），决策 code 27，jev 17，jev-plan 10

### 死亡战斗：第 17 层 瀑布巨兽
- T11 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视
- T11 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T12 [jev] combat/plan-choice: Jev chose plan 2/2 (防御, 防御) with confidence 0.85; code rank 2 conf 0.85
- T12 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T12 [jev] combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.86; code rank 2 conf 0.86
- T13 [code] combat/plan: code plan (only distinct line): 剑柄打击 -> 瀑布巨兽; hp -0, dmg 6
- T13 [code] combat/plan: code plan (only distinct line): 痛击 -> 瀑布巨兽; hp -0, dmg 0
- T13 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T14 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视, 防御, 防御
- T14 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 剑柄打击 -> 瀑布巨兽, 防御
- T14 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-30): 防御
- T14 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-30): end turn

### 各类决策由谁做
- combat/plan / code: 41
- combat/plan-choice / jev: 41
- combat/plan-continue / jev-plan: 36
- map/route-follow / code: 15
- reward/claim / code: 13
- combat/lethal / code: 6
- event/leave / code: 6
- event/choose / deepseek: 5
- reward/card / deepseek: 5
- reward/proceed / code: 5
- combat/least-loss / code: 4
- combat/plan-continue / code: 4
- rest/plan / deepseek: 3
- rest/proceed / code: 3
- shop/buy / deepseek: 3
- selection/discard / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice+potion / jev: 1
- event/plan / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/remove / deepseek: 1
- selection/upgrade / deepseek: 1
- shop/leave / code: 1
- shop/open / code: 1
- shop/plan / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：1 个
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (剑柄打击 -> 花园幽灵鳗 #2, 拆卸 -> 花园幽灵鳗 #1) with confidence 0.33; code rank 1 (0.33)
