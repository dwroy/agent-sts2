## 复盘：run ERPHN3SRCRC3 — 阵亡，最高第 17 层

- 决策 244 个；Jev 调用 53 次，Claude 0 次，DeepSeek 6 次；token 87,967 入 / 2,522 出，约 $0.0038；用时 9.7 分钟
- 决策者：code 153，jev 43，jev-plan 32，code-fallback 10，deepseek 6

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→52（-12），决策 code 9，jev-plan 3，jev 2
- 第 4 层 海洋混混: HP 58→47（-11），决策 code 4，jev 1，jev-plan 1
- 第 5 层 蟾蜍蝌蚪: HP 53→43（-10），决策 code 7，jev-plan 2，jev 1
- 第 6 层 幽灵船: HP 47→47（-0），决策 jev-plan 2，jev 1，code 1，code-fallback 1
- 第 6 层 幽灵船: HP 47→32（-15），决策 code 10，code-fallback 2，jev 1，jev-plan 1
- 第 8 层 化石追踪者: HP 62→50（-12），决策 jev 1，jev-plan 1，code 1，code-fallback 1
- 第 8 层 化石追踪者: HP 50→50（-0），决策 jev 1，jev-plan 1，code 1
- 第 11 层 地精佣兵: HP 56→56（-0），决策 jev-plan 2，jev 1
- 第 11 层 卑鄙地精/地精佣兵/胖地精: HP 56→45（-11），决策 code 3，jev-plan 2，jev 1
- 第 12 层 潮湿邪教徒/钙化邪教徒: HP 51→51（-0），决策 code 7
- 第 12 层 潮湿邪教徒: HP 51→40（-11），决策 code 4，jev 3，jev-plan 2
- 第 14 层 拳击构装体: HP 46→36（-10），决策 code 7，jev 3，jev-plan 2
- 第 17 层 瀑布巨兽: HP 66→66（-0），决策 jev 2，jev-plan 2，code-fallback 1
- 第 17 层 瀑布巨兽: HP 66→63（-3），决策 jev 3，code-fallback 1，jev-plan 1
- 第 17 层 瀑布巨兽: HP 63→61（-2），决策 jev 5，jev-plan 3，code-fallback 1，code 1
- 第 17 层 瀑布巨兽: HP 61→46（-15），决策 code 1，jev 1，jev-plan 1
- 第 17 层 瀑布巨兽: HP 46→46（-0），决策 jev 3，jev-plan 1
- 第 17 层 瀑布巨兽: HP 46→42（-4），决策 jev 4，jev-plan 3，code-fallback 2
- 第 17 层 瀑布巨兽: HP 42→42（-0），决策 jev 2，jev-plan 2，code-fallback 1
- 第 17 层 瀑布巨兽: HP 42→40（-2），决策 code 3
- 第 17 层 瀑布巨兽: HP 40→40（-0），决策 code 6
- 第 17 层 瀑布巨兽: HP 40→25（-15），决策 code 9
- 第 17 层 瀑布巨兽: HP 25→25（-0），决策 code 1
- 第 17 层 瀑布巨兽: HP 25→25（-0），决策 code 2

### 死亡战斗：第 17 层 瀑布巨兽
- T15 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 防御+
- T15 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): end turn

### 各类决策由谁做
- combat/plan / code: 45
- combat/plan-continue / jev-plan: 32
- combat/plan-continue / code: 21
- combat/plan-choice+potion / jev: 20
- reward/claim / code: 19
- combat/plan-choice / jev: 16
- map/route / code: 12
- selection/add / code: 11
- reward/card / code: 8
- reward/proceed / code: 8
- combat/lethal / code: 7
- combat/plan-choice+potion / code-fallback: 6
- combat/least-loss / code: 4
- combat/plan-choice / code-fallback: 4
- event/leave / code: 3
- rest/choose / code: 3
- rest/proceed / code: 3
- event/choose / deepseek: 2
- map/route / deepseek: 2
- map/route / jev: 2
- selection/choose / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/choose / jev: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/choose / jev: 1
- selection/exhaust / code: 1
- selection/take into my hand / jev: 1
- selection/upgrade / code: 1
- shop/buy / code: 1
- shop/buy / jev: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：6 次（推翻 Jev 2 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.40 → o0）：轰鸣海螺在一幕精英战提供额外抽牌与能量，帮助活着拿下精英遗物；升级打击/防御价值极低，打击迟早要删。
- [deepseek] 第 1 层 TNone map/route: 同意 Jev（n2 @0.30 → n2）：All Monster nodes; n2 has the highest route_value (30.98) with a solid Unknown follow-up, keeping both elite and rest op
- [deepseek] 第 2 层 T5 map/route: 同意 Jev（n1 @0.27 → n1）：Unknown leads to Shop with fewer chained fights (M-M-M risks HP); route_value higher, and a shop lets me delete Strikes 
- [deepseek] 第 3 层 TNone event/choose: 同意 Jev（o0 @0.24 → o0）：A8 floor 3: 14 HP is too costly (memory: paid-HP events at F3 killed runs). Two free commons add needed act-1 attack den
- [deepseek] 第 17 层 T6 selection/choose: 同意 Jev（card2 @0.17 → card2）：长战重心是格挡：耸肩无视仅1费，升级+3格挡还过牌，本场会反复打出，收益最稳；伤害缺口已为0。
- [deepseek] 第 17 层 T11 selection/choose: 推翻 Jev（card0 @0.36 → card3）：坚毅+：随机消耗变自选，能清理进阶之灾/伤口，不再误吞燃烧或痛击++；1费9格挡在长战中最稳。

### Jev 低置信度（<0.35）决策：21 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 痛击 -> 噬尸蛞蝓) with confidence 0.27; code rank 1 (0.27)
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 噬尸蛞蝓, 打击 -> 噬尸蛞蝓, 防御) with confidence 0.10; code rank 1 (0.10)
- 第 4 层 combat/plan-choice: Jev chose plan 3/4 (痛击 -> 海洋混混, 打击 -> 海洋混混) with confidence 0.34; code rank 3 (0.34)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (双重打击 -> 幽灵船, 防御) with confidence 0.12; code rank 1 (0.12)
- 第 12 层 combat/plan-choice: Jev chose plan 1/4 (痛击+ -> 潮湿邪教徒, 头槌 -> 潮湿邪教徒) with confidence 0.32; code rank 1 (0.32)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/3 (打击 -> 瀑布巨兽, 头槌 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.28; code rank 1; HP guard: plan 1 (打击 -> 瀑布巨兽, 头槌 -> 瀑布巨兽, 打击 -> 瀑布巨兽) loses (0.28)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (坚毅) with confidence 0.20; code rank 2 (0.20)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/4 (打击 -> 瀑布巨兽, 耸肩无视, 头槌 -> 瀑布巨兽) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (头槌 -> 瀑布巨兽) with confidence 0.16; code rank 1 (0.16)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.15; code rank 1 (0.15)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 痊愈药水 (confidence 0.26) (0.26)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (预备打击 -> 瀑布巨兽) with confidence 0.12; code rank 1; HP guard: plan 1 (预备打击 -> 瀑布巨兽) loses 8 HP, more than 5 over the cheapest line, p (0.12)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.02; code rank 1 (0.02)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (挑衅 -> 瀑布巨兽, 头槌 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.20; code rank 1; HP guard: plan 1 (挑衅 -> 瀑布巨兽, 头槌 -> 瀑布巨兽, 打击 -> 瀑布巨兽) loses (0.20)
