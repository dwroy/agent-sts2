## 复盘：run GG0Y0TJ2JXAR — 阵亡，最高第 33 层

- 决策 523 个；Jev 调用 118 次，Claude 0 次，DeepSeek 47 次；token 205,783 入 / 5,172 出，约 $0.0089（Jev）；DeepSeek token 888,772 入（缓存命中 647,040，73%）/ 133,978 出；用时 27.5 分钟
- 决策者：code 278，jev 116，jev-plan 80，deepseek 47，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→61（-3），决策 code 12，jev-plan 6，jev 4
- 第 6 层 淤泥旋螺: HP 77→74（-3），决策 code 7，jev-plan 2，jev 1
- 第 8 层 鬼祟珊瑚群: HP 80→68（-12），决策 code 11，jev 4，jev-plan 4
- 第 13 层 蟾蜍蝌蚪: HP 66→66（-0），决策 code 4，jev 1，jev-plan 1
- 第 14 层 拳击构装体: HP 72→67（-5），决策 code 8，jev-plan 4，jev 2
- 第 15 层 下水道蚌: HP 73→73（-0），决策 code 6，jev-plan 2，jev 1
- 第 15 层 下水道蚌: HP 73→73（-0），决策 code 1
- 第 17 层 灵魂异鱼: HP 79→72（-7），决策 jev 7，jev-plan 6
- 第 17 层 灵魂异鱼: HP 72→80（+8），决策 jev 4，code 2，jev-plan 2
- 第 17 层 灵魂异鱼: HP 80→51（-29），决策 jev 12，jev-plan 7
- 第 17 层 灵魂异鱼: HP 51→30（-21），决策 jev 7，jev-plan 4，code 2
- 第 19 层 地道虫: HP 71→45（-26），决策 code 10，jev-plan 8，jev 6
- 第 19 层 地道虫: HP 45→38（-7），决策 code 8，jev 1
- 第 20 层 外骨骼虫: HP 44→44（-0），决策 jev-plan 2，jev 1
- 第 20 层 外骨骼虫: HP 44→38（-6），决策 jev 3，code 2，jev-plan 2
- 第 20 层 外骨骼虫: HP 38→28（-10），决策 code 5，jev 2，jev-plan 1
- 第 22 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 37→33（-4），决策 jev 2，jev-plan 2，code 1
- 第 22 层 盛碗虫（丝）/盛碗虫（卵）: HP 33→33（-0），决策 jev 2，code 1
- 第 22 层 盛碗虫（丝）/盛碗虫（卵）: HP 33→33（-0），决策 code 7，jev 1，jev-plan 1
- 第 22 层 盛碗虫（丝）: HP 33→33（-0），决策 code 1
- 第 27 层 啃咬机: HP 58→48（-10），决策 jev 5，code 4，jev-plan 4
- 第 27 层 啃咬机: HP 48→41（-7），决策 jev 4，code 2，jev-plan 1
- 第 27 层 啃咬机: HP 41→41（-0），决策 code 1
- 第 30 层 胧光怪: HP 72→72（-0），决策 jev-plan 2，jev 1
- 第 30 层 寄生惧魔/胧光怪: HP 72→72（-0），决策 jev 2，code 1
- 第 30 层 寄生惧魔/胧光怪: HP 72→46（-26），决策 jev 12，code 5，jev-plan 3
- 第 30 层 寄生惧魔/胧光怪: HP 46→46（-0），决策 jev 1
- 第 30 层 寄生惧魔/胧光怪: HP 46→32（-14），决策 jev-plan 7，code 6，jev 5
- 第 30 层 寄生惧魔/胧光怪: HP 32→32（-0），决策 code 2
- 第 31 层 虱虫之祖: HP 38→38（-0），决策 jev-plan 2，jev 1
- 第 31 层 虱虫之祖: HP 38→38（-0），决策 code 5
- 第 31 层 虱虫之祖: HP 38→36（-2），决策 code 10，jev 3，jev-plan 1
- 第 31 层 虱虫之祖: HP 36→28（-8），决策 code 5，jev 1
- 第 31 层 虱虫之祖: HP 28→28（-0），决策 code 1
- 第 33 层 知识恶魔: HP 59→59（-0），决策 jev 1，jev-plan 1，code-fallback 1
- 第 33 层 知识恶魔: HP 59→58（-1），决策 jev 3，jev-plan 1
- 第 33 层 知识恶魔: HP 58→55（-3），决策 jev 7，jev-plan 2，code-fallback 1，code 1
- 第 33 层 知识恶魔: HP 55→55（-0），决策 jev 1
- 第 33 层 知识恶魔: HP 55→28（-27），决策 code 8，jev 6，jev-plan 1
- 第 33 层 知识恶魔: HP 28→28（-0），决策 code 1
- 第 33 层 知识恶魔: HP 28→28（-0），决策 code 3，jev 1，jev-plan 1
- 第 33 层 知识恶魔: HP 28→28（-0），决策 code 2
- 第 33 层 知识恶魔: HP 28→28（-0），决策 code 1

### 死亡战斗：第 33 层 知识恶魔
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-8): end turn

### 各类决策由谁做
- combat/plan / code: 87
- combat/plan-continue / jev-plan: 80
- combat/plan-choice / jev: 65
- combat/plan-choice+potion / jev: 50
- combat/plan-continue / code: 32
- reward/claim / code: 31
- map/route-follow / code: 28
- selection/add / code: 23
- combat/lethal / code: 19
- reward/card / deepseek: 13
- reward/proceed / code: 13
- shop/buy / deepseek: 8
- event/choose / deepseek: 7
- event/leave / code: 7
- rest/choose / deepseek: 7
- rest/proceed / code: 7
- selection/curse / code: 6
- selection/upgrade / deepseek: 4
- combat/end_turn / code: 3
- combat/least-loss / code: 3
- map/route-plan / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/plan-choice+potion / code-fallback: 2
- combat/plan-potion / code: 2
- selection/add / deepseek: 2
- selection/exhaust / code: 2
- map/route / code: 1
- run/finalize / code: 1
- selection/choose / deepseek: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：19 个
- 第 8 层 combat/plan-choice: Jev chose plan 2/3 (闪电霹雳, 防御) with confidence 0.15; code rank 2 (0.15)
- 第 22 层 combat/plan-choice: Jev chose plan 4/4 (头槌+ -> 盛碗虫（卵）, 岿然不动) with confidence 0.17; code rank - (rollout's best line, added) (0.17)
- 第 27 层 combat/plan-choice: Jev chose plan 2/2 (防御) with confidence 0.19; code rank 2 (0.19)
- 第 30 层 combat/plan-choice: Jev chose plan 5/5 (狂宴 -> 寄生惧魔, 耸肩无视, 坚毅) with confidence 0.26; code rank - (rollout's best line, added) (0.26)
- 第 30 层 combat/plan-choice: Jev chose plan 5/5 (耸肩无视, 坚毅) with confidence 0.28; code rank - (rollout's best line, added) (0.28)
- 第 30 层 combat/plan-choice: Jev chose plan 2/2 (头槌 -> 寄生惧魔, 头槌+ -> 寄生惧魔) with confidence 0.06; code rank 2 (0.06)
- 第 31 层 combat/plan-choice: Jev chose plan 1/3 (头槌+ -> 虱虫之祖, 痛击+ -> 虱虫之祖, potion 无色药水, card from 无色药水) with confidence 0.19; code rank 1; HP guard: plan 1 (头槌+ -> 虱虫之祖, 痛击+ -> 虱虫 (0.19)
- 第 31 层 selection/take into my hand: Jev chose 永恒铠甲 with confidence 0.18 (0.18)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (头槌 -> 知识恶魔, 痛击+ -> 知识恶魔) with confidence 0.32; code rank 1 (0.32)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/5 (头槌 -> 知识恶魔, 放松) with confidence 0.29; code rank 1 (0.29)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.31; code rank 1 (0.31)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/4 (耸肩无视, 痛殴 -> 知识恶魔) with confidence 0.22; code rank 1 (0.22)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.23; code rank 1 (0.23)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.00; code rank 1 (0.00)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 2/4 (岿然不动, 双重打击 -> 知识恶魔) with confidence 0.19; code rank 2 (0.19)
