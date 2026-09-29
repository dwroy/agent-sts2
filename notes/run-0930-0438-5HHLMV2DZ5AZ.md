## 复盘：run 5HHLMV2DZ5AZ — 胜利，最高第 48 层

- 决策 580 个；Jev 调用 110 次，Claude 0 次，DeepSeek 44 次；token 387,154 入 / 5,440 出，约 $0.0165（Jev）；DeepSeek token 1,130,972 入（缓存命中 762,752，67%）/ 215,015 出；用时 37.0 分钟
- 决策者：code 301，jev 110，jev-plan 102，deepseek 67

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→58（-6，战后回复 +6），决策 code 6，jev 4，jev-plan 4
- 第 4 层 淤泥旋螺: HP 64→53（-11，战后回复 +6），决策 code 4，jev 2，jev-plan 2
- 第 9 层 海洋混混: HP 69→63（-6，战后回复 +6），决策 code 9，jev 5，jev-plan 2
- 第 14 层 化石追踪者: HP 62→70（+8，战后回复 +6），决策 jev 5，jev-plan 3，code 3
- 第 15 层 幽灵船: HP 76→73（-3，战后回复 +6），决策 jev-plan 6，code 5，jev 3
- 第 17 层 灵魂异鱼: HP 79→20（-59，战后回复 +6），决策 code 16，jev-plan 13，jev 11
- 第 19 层 外骨骼虫: HP 69→58（-11，战后回复 +6），决策 code 8，jev 6，jev-plan 4
- 第 21 层 地道虫: HP 64→60（-4，战后回复 +6），决策 code 9，jev-plan 4，jev 3
- 第 23 层 外骨骼虫: HP 66→30（-36，战后回复 +6），决策 code 8，jev 7，jev-plan 7
- 第 25 层 啃咬机: HP 60→42（-18，战后回复 +6），决策 jev-plan 8，code 7，jev 5
- 第 33 层 知识恶魔: HP 80→54（-26，战后回复 +6），决策 code 26，jev 16，jev-plan 10
- 第 35 层 虔诚雕刻师: HP 76→50（-26，战后回复 +6），决策 jev-plan 12，jev 7，code 7
- 第 38 层 活体盾/高塔炮手: HP 56→55（-1，战后回复 +6），决策 code 11，jev 10，jev-plan 3
- 第 39 层 噪音机器人/戳刺机器人/电击机器人/组装师: HP 61→61（-0，战后回复 +6），决策 jev 9，code 5，jev-plan 4
- 第 46 层 失落之物/遗忘之物: HP 76→69（-7，战后回复 +6），决策 code 10，jev-plan 8，jev 4
- 第 48 层 女王/火炬头聚合体: HP 75→31（-44，战后回复 +6），决策 code 17，jev 13，jev-plan 12

### 各类决策由谁做
- combat/plan-continue / jev-plan: 102
- combat/plan-choice / jev: 95
- combat/plan / code: 92
- map/route-follow / code: 42
- reward/claim / code: 38
- combat/plan-continue / code: 21
- combat/lethal / code: 20
- reward/proceed / code: 16
- reward/card / deepseek: 15
- event/leave / code: 14
- combat/plan-choice+potion / jev: 12
- shop/buy / deepseek: 11
- event/choose / deepseek: 10
- rest/plan / deepseek: 9
- rest/proceed / code: 9
- chest/open / code: 6
- chest/proceed / code: 6
- chest/relic / code: 6
- selection/exhaust / code: 6
- combat/end_turn / code: 5
- event/only / code: 4
- selection/curse / code: 4
- selection/upgrade / deepseek: 4
- event/plan / deepseek: 3
- selection/remove / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / deepseek: 3
- event/act-plan / deepseek: 2
- map/route / code: 2
- map/route-follow / deepseek: 2
- selection/take into my hand / code: 2
- selection/take into my hand / jev: 2
- combat/plan-choice+potion-lethal / jev: 1
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/add / deepseek: 1
- selection/enchant / deepseek: 1
- selection/free-card / code: 1
- selection/transform / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：21 个
- 第 9 层 combat/plan-choice+potion: Jev chose plan 3/5 (耸肩无视, 打击 -> 海洋混混, 打击 -> 海洋混混) with confidence 0.21; code rank 3 (0.21)
- 第 9 层 selection/take into my hand: Jev chose 闪电霹雳 with confidence 0.23 (0.23)
- 第 9 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 海洋混混, 防御) with confidence 0.34; code rank 1 (0.34)
- 第 14 层 combat/plan-choice: Jev chose plan 6/10 (耸肩无视, 打击+ -> 化石追踪者, 防御, potion 鲜血药水) with confidence 0.30; code rank 6 (0.30)
- 第 14 层 combat/plan-choice: Jev chose plan 5/10 (打击+ -> 化石追踪者, 防御, potion 鲜血药水) with confidence 0.31; code rank 5 (0.31)
- 第 15 层 combat/plan-choice: Jev chose plan 1/2 (打击+ -> 幽灵船, 铁蒺藜, 打击+ -> 幽灵船, potion 火焰药水 -> 幽灵船) with confidence 0.16; code rank 1 (0.16)
- 第 15 层 combat/plan-choice: Jev chose plan 7/7 (打击 -> 幽灵船, 防御, 防御) with confidence 0.17; code rank - (rollout's best line, added) (0.17)
- 第 23 层 combat/plan-choice: Jev chose plan 1/7 (打击+ -> 外骨骼虫 #2, 预备打击 -> 外骨骼虫 #2, 剑柄打击 -> 外骨骼虫 #3) with confidence 0.26; code rank 1 (0.26)
- 第 23 层 combat/plan-choice: Jev chose plan 3/4 (铁蒺藜, 势不可当) with confidence 0.13; code rank 3 (0.13)
- 第 33 层 combat/plan-choice+potion: Jev chose to drink 迅捷药水, then re-plan (confidence 0.14) (0.14)
- 第 33 层 combat/plan-choice: Jev chose plan 2/4 (耸肩无视, 与我一战！ -> 知识恶魔, 铁蒺藜) with confidence 0.21; code rank 2 (0.21)
- 第 33 层 combat/plan-choice: Jev chose plan 2/5 (痛击 -> 知识恶魔, 双重打击 -> 知识恶魔) with confidence 0.34; code rank 2 (0.34)
- 第 33 层 combat/plan-choice: Jev chose plan 3/3 (耸肩无视, 防御); plan 1 (耸肩无视, 耸肩无视) is as good or better on every axis, playing it with confidence 0.19; code rank 1 (0.19)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (耸肩无视, 防御, 打击+ -> 知识恶魔) with confidence 0.25; code rank 2 (0.25)
- 第 33 层 combat/plan-choice: Jev chose plan 3/3 (防御, 防御) with confidence 0.31; code rank 3 (0.31)
