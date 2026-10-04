## 复盘：run 5LRZ7HJ7YGSY — 阵亡，最高第 48 层

- 决策 753 个；Jev 调用 128 次，Claude 0 次，DeepSeek 48 次；token 419,378 入 / 6,167 出，约 $0.0179（Jev）；DeepSeek token 1,202,608 入（缓存命中 802,560，67%）/ 221,847 出；用时 46.2 分钟
- 决策者：code 385，jev-plan 167，jev 128，deepseek 73

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 75→71（-4），决策 code 5，jev-plan 3，jev 2
- 第 3 层 蟾蜍蝌蚪: HP 77→67（-10），决策 code 5，jev-plan 3，jev 2
- 第 4 层 海洋混混: HP 71→60（-11），决策 code 5，jev-plan 3，jev 2
- 第 6 层 双尾鼠: HP 66→62（-4），决策 jev-plan 5，code 4，jev 2
- 第 8 层 骇鳗: HP 91→55（-36），决策 code 16，jev-plan 10，jev 4
- 第 9 层 下水道蚌: HP 61→48（-13），决策 code 8，jev-plan 4，jev 3
- 第 11 层 气态炸弹/活雾: HP 54→49（-5），决策 code 5，jev-plan 4，jev 2
- 第 13 层 鬼祟珊瑚群: HP 81→63（-18），决策 code 11，jev-plan 5，jev 4
- 第 15 层 噬尸蛞蝓: HP 76→76（-0），决策 jev 6，jev-plan 5，code 3
- 第 17 层 乐加维林族母: HP 98→59（-39），决策 jev 12，code 11，jev-plan 9
- 第 19 层 外骨骼虫: HP 91→83（-8），决策 code 9，jev-plan 6，jev 5
- 第 21 层 地道虫: HP 89→91（+2），决策 jev-plan 10，code 10，jev 6
- 第 22 层 棘刺蟾蜍: HP 97→87（-10），决策 jev 10，jev-plan 9，code 5
- 第 23 层 幼虫/直飞产卵虫/结实的卵: HP 88→55（-33），决策 jev-plan 9，code 7，jev 4
- 第 25 层 感染棱柱: HP 90→52（-38），决策 jev-plan 9，code 9，jev 6
- 第 28 层 啃咬机: HP 87→87（-0），决策 code 11，jev 8，jev-plan 8
- 第 30 层 异螨: HP 93→87（-6），决策 code 12，jev-plan 6，jev 2
- 第 33 层 知识恶魔: HP 93→46（-47），决策 code 21，jev-plan 11，jev 10
- 第 35 层 活体盾/高塔炮手: HP 88→70（-18），决策 code 7，jev-plan 4，jev 2
- 第 36 层 咬人卷轴: HP 76→70（-6），决策 code 3，jev 2，jev-plan 1
- 第 38 层 电球头: HP 76→70（-6），决策 code 11，jev-plan 4，jev 3
- 第 39 层 史莱姆狂战士: HP 76→52（-24），决策 jev-plan 12，code 8，jev 6
- 第 44 层 咬人卷轴: HP 86→84（-2），决策 jev 10，jev-plan 5，code 1
- 第 45 层 机甲骑士: HP 90→24（-66），决策 jev-plan 15，code 11，jev 8
- 第 48 层 女王/火炬头聚合体: HP 57→1（-56），决策 code 14，jev 7，jev-plan 7

### 死亡战斗：第 48 层 女王/火炬头聚合体
- T4 [jev] combat/plan-choice: Jev chose plan 1/4 (挑衅 -> 火炬头聚合体, 巨像) with confidence 0.86; code rank 1 conf 0.86
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 巨像
- T4 [code] combat/plan: code plan (only line): end turn; hp -2, dmg 0
- T5 [code] combat/plan: code plan (only distinct line): 防御, 打击 -> 火炬头聚合体, 打击 -> 火炬头聚合体; hp -20, dmg 12
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火炬头聚合体
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火炬头聚合体
- T5 [code] combat/end_turn: no playable cards; ending the turn
- T6 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 15): 耸肩无视, 与我一战！+ -> 火炬头聚合体
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-41): 痛击+ -> 火炬头聚合体, 打击 -> 火炬头聚合体, 愤怒 -> 火炬头聚合体
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火炬头聚合体
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 愤怒 -> 火炬头聚合体
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-41): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 167
- combat/plan / code: 105
- combat/plan-choice / jev: 95
- reward/claim / code: 70
- combat/plan-continue / code: 57
- map/route-follow / code: 39
- combat/lethal / code: 30
- combat/plan-choice+potion / jev: 26
- reward/card / deepseek: 25
- reward/proceed / code: 25
- shop/buy / deepseek: 16
- rest/plan / deepseek: 9
- rest/proceed / code: 9
- combat/end_turn / code: 8
- event/leave / code: 6
- shop/leave / code: 5
- shop/open / code: 5
- shop/plan / deepseek: 5
- selection/curse / code: 4
- selection/take into my hand / jev: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/least-loss / code: 3
- map/statue-potion / deepseek: 3
- selection/add / jev: 3
- selection/remove / deepseek: 3
- event/act-plan / deepseek: 2
- event/choose / deepseek: 2
- map/route / code: 2
- map/route-change / deepseek: 2
- map/route-follow / deepseek: 2
- selection/add / code: 2
- selection/upgrade / deepseek: 2
- event/only / code: 1
- event/plan / deepseek: 1
- map/after-discard / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/exhaust / code: 1
- selection/take into my hand / code: 1
- selection/take-planned / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：31 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (防御, 痛击 -> 淤泥旋螺) with confidence 0.19; code rank 1 (0.19)
- 第 4 层 combat/plan-choice: Jev chose plan 2/2 (防御, 防御, 打击 -> 海洋混混) with confidence 0.26; code rank 2 (0.26)
- 第 9 层 combat/plan-choice: Jev chose plan 2/3 (痛击 -> 下水道蚌, 打击 -> 下水道蚌) with confidence 0.27; code rank 2 (0.27)
- 第 9 层 combat/plan-choice: Jev chose plan 5/5 (防御, 防御, 突破) with confidence 0.33; code rank - (rollout's best line, added) (0.33)
- 第 15 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.31; code rank 2 (0.31)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 3/3 (打击 -> 乐加维林族母, 巨像, 耸肩无视, 防御); plan 2 (耸肩无视) is as good or better on every axis, playing it with confidence 0.34; code rank 2 (0.34)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (end turn) with confidence 0.32; code rank 2 (0.32)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.15) (0.15)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 外骨骼虫 #1) with confidence 0.17; code rank 1 (0.17)
- 第 19 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 外骨骼虫 #1, 剑柄打击 -> 外骨骼虫 #1, 耸肩无视, 打击 -> 外骨骼虫 #2) with confidence 0.13; code rank 1 (0.13)
- 第 21 层 combat/plan-choice+potion: Jev chose plan 1/2 (potion 再生药水) with confidence 0.14; code rank 1 (0.14)
- 第 22 层 selection/take into my hand: Jev chose 岩石铠甲 with confidence 0.20 (0.20)
- 第 22 层 selection/take into my hand: Jev chose 燃烧 with confidence 0.05 (0.05)
- 第 25 层 combat/plan-choice: Jev chose plan 2/3 (坚定不移, 挑衅 -> 感染棱柱) with confidence 0.19; code rank 2 (0.19)
- 第 25 层 combat/plan-choice: Jev chose plan 1/3 (重锤 -> 感染棱柱, 打击 -> 感染棱柱) with confidence 0.22; code rank 1 (0.22)
