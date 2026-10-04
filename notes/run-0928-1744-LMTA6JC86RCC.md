## 复盘：run LMTA6JC86RCC — 阵亡，最高第 17 层

- 决策 186 个；Jev 调用 30 次，Claude 0 次，DeepSeek 20 次；token 48,912 入 / 1,316 出，约 $0.0021；用时 11.5 分钟
- 决策者：code 106，jev-plan 30，jev 28，deepseek 20，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→56（-8），决策 code 7，jev-plan 3，jev 2
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 62→56（-6），决策 code 7，jev 5，jev-plan 4
- 第 4 层 毛绒伏地虫: HP 62→62（-0），决策 code 6，jev 4，jev-plan 4
- 第 9 层 多尼斯异鸟: HP 68→68（-0），决策 jev-plan 2，jev 1
- 第 9 层 多尼斯异鸟: HP 68→37（-31），决策 jev-plan 4，code 3，jev 3
- 第 9 层 多尼斯异鸟: HP 37→24（-13），决策 code 3，jev 1
- 第 11 层 墨宝: HP 30→25（-5），决策 jev-plan 5，code 5，jev 2
- 第 14 层 藤蔓蹒跚者: HP 38→30（-8），决策 jev-plan 3，jev 2，code 2，code-fallback 1
- 第 14 层 藤蔓蹒跚者: HP 30→30（-0），决策 code 1
- 第 17 层 同族信徒/同族神官: HP 62→24（-38），决策 code 6，jev 5，jev-plan 4，code-fallback 1
- 第 17 层 同族信徒/同族神官: HP 24→23（-1），决策 jev 2，code 1，jev-plan 1
- 第 17 层 同族信徒/同族神官: HP 23→2（-21），决策 code 9

### 死亡战斗：第 17 层 同族信徒/同族神官
- T5 [code] combat/plan: code plan (only line): end turn; hp -12, dmg 0
- T6 [code] combat/plan: code plan (only line): 耸肩无视+, 防御, 防御; hp -9, dmg 0
- T6 [code] combat/plan: code plan (only line): 防御, 防御; hp -9, dmg 0
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T6 [code] combat/plan: code plan (only line): end turn; hp -9, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 18): 剑柄打击+ -> 同族信徒, 防御, 啄击 
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): 防御, 防御
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-13): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 30
- combat/plan / code: 29
- combat/plan-choice / jev: 27
- reward/claim / code: 16
- map/route-follow / code: 15
- combat/lethal / code: 9
- combat/plan-continue / code: 8
- reward/card / deepseek: 6
- reward/proceed / code: 6
- event/choose / deepseek: 5
- event/leave / code: 5
- selection/add / code: 4
- combat/least-loss / code: 3
- shop/buy / deepseek: 3
- combat/plan-choice / code-fallback: 2
- rest/choose / deepseek: 2
- rest/proceed / code: 2
- selection/upgrade / deepseek: 2
- shop/leave / code: 2
- shop/open / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- combat/plan-potion / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/remove / deepseek: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：2 个
- 第 4 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.27; code rank - (rollout's best line, added) (0.27)
- 第 14 层 combat/plan-choice: Jev chose plan 5/5 (防御, 熔融之拳 -> 藤蔓蹒跚者, 耸肩无视+) with confidence 0.26; code rank - (rollout's best line, added) (0.26)
