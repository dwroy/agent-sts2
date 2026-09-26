## 复盘：run XKKNWSZMMSZN — 阵亡，最高第 17 层

- 决策 271 个；Jev 调用 53 次，Claude 0 次，DeepSeek 4 次；token 75,449 入 / 2,360 出，约 $0.0033；用时 13.3 分钟
- 决策者：code 181，jev 44，jev-plan 33，code-fallback 9，deepseek 4

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→49（-15），决策 code 7，code-fallback 1，jev 1，jev-plan 1
- 第 3 层 噬尸蛞蝓: HP 55→44（-11），决策 code 13，jev 3，jev-plan 3，code-fallback 1
- 第 5 层 海洋混混: HP 50→44（-6），决策 code 5，jev 3，jev-plan 2
- 第 6 层 下水道蚌: HP 50→42（-8），决策 code 14，jev 1，code-fallback 1
- 第 7 层 双尾鼠: HP 48→38（-10），决策 code 9，jev 1
- 第 9 层 潮湿邪教徒/钙化邪教徒: HP 44→39（-5），决策 code 11，jev 2，jev-plan 1
- 第 11 层 化石追踪者: HP 45→29（-16），决策 code 5，jev-plan 3，jev 2
- 第 12 层 噬尸蛞蝓: HP 35→19（-16），决策 jev-plan 9，jev 7，code 4
- 第 12 层 噬尸蛞蝓: HP 19→19（-0），决策 code 1
- 第 14 层 气态炸弹/活雾: HP 49→28（-21），决策 code 11，jev 3，jev-plan 2
- 第 15 层 海洋混混/钙化邪教徒: HP 34→21（-13），决策 code 9，jev 3，code-fallback 3，jev-plan 2
- 第 17 层 瀑布巨兽: HP 51→43（-8），决策 jev 9，jev-plan 7，code-fallback 3，code 1
- 第 17 层 瀑布巨兽: HP 43→11（-32），决策 code 23，jev 4，jev-plan 3

### 死亡战斗：第 17 层 瀑布巨兽
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 巨像
- T10 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T11 [code] combat/plan: code plan (+20.6 over next): 痛击+ -> 瀑布巨兽, 御血术+ -> 瀑布巨兽; hp -15, dmg 40
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 御血术+ -> 瀑布巨兽
- T11 [code] combat/plan: code plan (only line): end turn; hp -13, dmg 0
- T12 [code] combat/lethal: lethal: 拳斗 -> 瀑布巨兽
- T12 [code] combat/plan: code plan (+8.6 over next): 打击 -> 瀑布巨兽; hp -0, dmg 6
- T12 [code] combat/plan: code plan (+8.6 over next): end turn; hp -0, dmg 0
- T13 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 25): 剑柄打击+ -> 瀑布巨兽, 打击 -> 瀑
- T13 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 9): 耸肩无视, 飞剑回旋镖
- T13 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视
- T13 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-18): end turn

### 各类决策由谁做
- combat/plan / code: 61
- combat/plan-continue / code: 34
- combat/plan-continue / jev-plan: 33
- combat/plan-choice / jev: 26
- reward/claim / code: 24
- combat/lethal / code: 13
- combat/plan-choice+potion / jev: 13
- map/route / code: 13
- reward/proceed / code: 10
- reward/card / code: 8
- combat/plan-choice / code-fallback: 5
- combat/least-loss / code: 4
- combat/plan-choice+potion / code-fallback: 4
- map/route / jev: 3
- rest/proceed / code: 3
- event/choose / deepseek: 2
- event/leave / code: 2
- rest/choose / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- rest/choose / deepseek: 1
- reward/card / deepseek: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/take into my hand / code: 1
- selection/take into my hand / jev: 1
- selection/upgrade / code: 1

### 兜底介入（Claude/DeepSeek）：4 次（推翻 Jev 4 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.44 → o0）：熔岩石 grants two extra boss relics — permanent run-wide power; potions are consumable and the Greed curse would clog an al
- [deepseek] 第 4 层 TNone event/choose: 推翻 Jev（o0 @0.21 → o1）：359 gold funds 2-3 removals plus key buys in Act 2; one dead curse is a small, removable cost and Act 1 has no shops any
- [deepseek] 第 8 层 TNone rest/choose: 推翻 Jev（o0 @0.42 → o1）：HP 55% is above the 50% rest threshold, next node is a normal monster, and two rest sites remain before the boss; a perm
- [deepseek] 第 15 层 T5 reward/card: 推翻 Jev（card0 @0.24 → card2）：御血术+ 20伤害仅需1能量，速杀巨兽、压低喷发层数远胜3费的彼岸咆哮；休息点回血后2点自伤代价极低。

### Jev 低置信度（<0.35）决策：14 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (防御, 痛击 -> 蟾蜍蝌蚪) with confidence 0.16; code rank 1 (0.16)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (耸肩无视, 痛击 -> 下水道蚌) with confidence 0.09; code rank 1 (0.09)
- 第 9 层 combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 潮湿邪教徒, 御血术 -> 潮湿邪教徒) with confidence 0.29; code rank 1 (0.29)
- 第 11 层 combat/plan-choice: Jev chose plan 1/3 (防御, 痛击+ -> 化石追踪者) with confidence 0.15; code rank 1 (0.15)
- 第 12 层 combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 噬尸蛞蝓, 防御, 飞剑回旋镖) with confidence 0.22; code rank 1 (0.22)
- 第 12 层 combat/plan-choice+potion: Jev chose plan 2/2 (预备打击 -> 噬尸蛞蝓, 打击 -> 噬尸蛞蝓, 打击 -> 噬尸蛞蝓, potion 虚弱药水 -> 噬尸蛞蝓) with confidence 0.32; code rank 2 (0.32)
- 第 14 层 combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 活雾, 御血术 -> 活雾) with confidence 0.12; code rank 1 (0.12)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 1/3 (巨像, 痛击+ -> 钙化邪教徒) with confidence 0.31; code rank 1 (0.31)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/4 (飞剑回旋镖, 御血术+ -> 瀑布巨兽, potion 速度药水, 防御) with confidence 0.25; code rank 1; HP guard: plan 1 (飞剑回旋镖, 御血术+ -> 瀑布巨兽, potion 速度药水, 防御) l (0.25)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/4 (御血术 -> 瀑布巨兽, 耸肩无视) with confidence 0.32; code rank 1 (0.32)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (耸肩无视) with confidence 0.33; code rank 2 (0.33)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 无色药水 (confidence 0.04) (0.04)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (拳斗 -> 瀑布巨兽, 防御) with confidence 0.32; code rank 3 (0.32)
- 第 17 层 combat/plan-choice: Jev chose plan 3/4 (耸肩无视, 防御, 防御) with confidence 0.15; code rank 3 (0.15)
