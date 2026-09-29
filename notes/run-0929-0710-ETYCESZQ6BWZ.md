## 复盘：run ETYCESZQ6BWZ — 阵亡，最高第 24 层

- 决策 308 个；Jev 调用 56 次，Claude 0 次，DeepSeek 32 次；token 203,425 入 / 3,124 出，约 $0.0087（Jev）；DeepSeek token 595,933 入（缓存命中 424,192，71%）/ 99,091 出；用时 17.7 分钟
- 决策者：code 166，jev 56，jev-plan 54，deepseek 32

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→63（-1），决策 code 7，jev-plan 2，jev 1
- 第 4 层 缩小甲虫: HP 60→58（-2），决策 code 4，jev-plan 3，jev 2
- 第 5 层 小啃兽: HP 64→60（-4），决策 code 8，jev-plan 4，jev 2
- 第 6 层 藤蔓蹒跚者: HP 66→52（-14），决策 jev-plan 7，code 7，jev 4
- 第 8 层 毛绒伏地虫/缩小甲虫: HP 58→25（-33），决策 jev 7，code 7，jev-plan 6
- 第 14 层 方柱构装体: HP 80→75（-5），决策 code 8，jev 1，jev-plan 1
- 第 15 层 闪光贾克斯果/飞蝇菌子: HP 80→80（-0），决策 jev 2，code 1
- 第 15 层 闪光贾克斯果/飞蝇菌子: HP 80→69（-11），决策 code 4，jev-plan 3，jev 2
- 第 17 层 同族信徒/同族神官: HP 75→27（-48），决策 jev 9，code 6，jev-plan 5
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 70→63（-7），决策 code 4，jev 2，jev-plan 2
- 第 20 层 外骨骼虫: HP 69→61（-8），决策 jev 4，jev-plan 3，code 3
- 第 22 层 虱虫之祖: HP 61→26（-35），决策 code 8，jev-plan 7，jev 6
- 第 23 层 异螨: HP 31→31（-0），决策 jev 1，code 1
- 第 23 层 异螨: HP 31→7（-24），决策 jev 8，jev-plan 8，code 7
- 第 24 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 13→3（-10），决策 code 12，jev 5，jev-plan 3

### 死亡战斗：第 24 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 盛碗虫（石）
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 突破
- T2 [code] combat/plan: code plan (only line): end turn; hp -3, dmg 0
- T3 [code] combat/plan: code plan (only line): 防御, 防御, 防御+; hp -1, dmg 0
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 防御+
- T3 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 29): 妙计, 完美打击 -> 熟睡甲虫, 突破
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): 打击 -> 盛碗虫（丝）, 燃烧+, 熔融之拳 -> 熟睡甲虫
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): 燃烧+, 熔融之拳 -> 熟睡甲虫
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 熔融之拳 -> 熟睡甲虫
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-14): end turn

### 各类决策由谁做
- combat/plan-choice / jev: 56
- combat/plan-continue / jev-plan: 54
- combat/plan / code: 49
- reward/claim / code: 30
- map/route-follow / code: 19
- combat/plan-continue / code: 18
- reward/card / deepseek: 13
- combat/lethal / code: 12
- reward/proceed / code: 12
- event/choose / deepseek: 7
- event/leave / code: 7
- combat/least-loss / code: 4
- combat/plan-potion / code: 4
- map/route-plan / deepseek: 3
- rest/choose / deepseek: 3
- rest/proceed / code: 3
- selection/upgrade / deepseek: 3
- selection/add / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- map/route / code: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/exhaust / code: 1
- selection/free-card / code: 1
- selection/transform / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：1 个
- 第 5 层 combat/plan-choice: Jev chose plan 1/4 (防御+, 防御, 打击 -> 小啃兽) with confidence 0.03; code rank 1 (0.03)
