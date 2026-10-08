## 复盘：run LY83ZMTFVKJH — 阵亡，最高第 21 层

- 决策 538 个；Jev 调用 169 次，Claude 0 次，大脑 19 次（codex 19）；token 842,588 入 / 8,565 出，约 $0.0357（Jev）；大脑 token 2,486,914 入（缓存命中 972,544，39%）/ 5,662 出；用时 35.1 分钟
- 决策者：code 214，jev 169，jev-plan 127，codex 28

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 56→56（-0），决策 code 17，jev 4，jev-plan 3
- 第 3 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 56→52（-4），决策 code 12，jev-plan 6，jev 4
- 第 5 层 小啃兽: HP 59→58（-1），决策 code 8，jev 5，jev-plan 3
- 第 6 层 小啃兽: HP 58→49（-9），决策 jev-plan 9，code 9，jev 6
- 第 12 层 异蛙寄生虫/扭动虫: HP 51→30（-21），决策 code 14，jev 10，jev-plan 10
- 第 14 层 利齿之眼/雾菇: HP 55→66（+11），决策 jev 7，jev-plan 6，code 5
- 第 15 层 闪光贾克斯果/飞蝇菌子: HP 68→56（-12），决策 jev 10，jev-plan 7，code 3
- 第 17 层 同族信徒/同族神官: HP 77→11（-66），决策 jev 100，jev-plan 63，code 18
- 第 19 层 外骨骼虫: HP 65→65（-0），决策 jev-plan 7，code 6，jev 4
- 第 20 层 偷窃草蜢: HP 67→61（-6），决策 code 12，jev 9，jev-plan 5
- 第 21 层 虱虫之祖: HP 63→0（-63），决策 code 35，jev 10，jev-plan 8

### 死亡战斗：第 21 层 虱虫之祖
- T10 [jev] combat/plan-choice: Jev chose plan 3/4 (紧勒 -> 虱虫之祖, 匕首雨+, 偏折) with confidence 0.99; code rank 3 conf 0.99
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 匕首雨+
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 偏折
- T10 [code] combat/plan: code plan (only line): end turn; hp -11, dmg 0
- T11 [code] combat/plan: code plan (only distinct line): 打击 -> 虱虫之祖, 打击 -> 虱虫之祖; hp -0, dmg 12
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 虱虫之祖
- T11 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-23): 防御, 防御, 防御, 中和+ -> 虱虫之祖
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 中和+ -> 虱虫之祖
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-23): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 127
- combat/plan-choice+potion / jev: 104
- combat/plan / code: 73
- combat/plan-continue / code: 48
- combat/plan-choice / jev: 43
- reward/claim / code: 30
- map/route-follow / code: 17
- selection/choose / jev: 16
- combat/lethal / code: 10
- reward/card / codex: 10
- reward/proceed / code: 10
- combat/least-loss / code: 6
- combat/play / jev: 5
- selection/upgrade / codex: 5
- event/leave / code: 3
- rest/plan / codex: 3
- rest/proceed / code: 3
- shop/buy / codex: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/end_turn / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / codex: 2
- event/act-plan / codex: 1
- event/choose / codex: 1
- event/plan / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：26 个
- 第 2 层 selection/choose: Jev chose 中和 with confidence 0.29 (0.29)
- 第 12 层 selection/choose: Jev chose 防御 with confidence 0.25 (0.25)
- 第 15 层 selection/choose: Jev chose 打击 with confidence 0.34 (0.34)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/4 (无休手斧 -> 同族神官, 猎杀者 -> 同族神官, 中和 -> 同族神官, 匕首雨+) with confidence 0.31; code rank 1 (0.31)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/4 (无休手斧 -> 同族神官, 打击 -> 同族神官, 生存者, 中和 -> 同族神官) with confidence 0.33; code rank 2 (0.33)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.18; code rank 1 (0.18)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (无休手斧 -> 同族信徒, 打击 -> 同族神官, 匕首雨+) with confidence 0.16; code rank 1 (0.16)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.10; code rank 1 (0.10)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (中和 -> 同族神官) with confidence 0.34; code rank 1 (0.34)
- 第 17 层 combat/play: Jev chose c0->e0 (Play 打击 on 同族神官) with confidence 0.32 (0.32)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/5 (打击 -> 同族神官, 后空翻, 后空翻, 肾上腺素, 无休手斧 -> 同族神官, 中和 -> 同族神官) with confidence 0.33; code rank 1 (0.33)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.26; code rank 1 (0.26)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.31; code rank 1 (0.31)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.08; code rank 1 (0.08)
