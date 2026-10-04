## 复盘：run PCGH29GVGSCE — 阵亡，最高第 33 层

- 决策 441 个；Jev 调用 59 次，Claude 0 次，DeepSeek 0 次；token 118,560 入 / 2,676 出，约 $0.0051；用时 20.0 分钟
- 决策者：code 336，jev 58，jev-plan 46，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→60（-4），决策 code 10，jev-plan 2，jev 1
- 第 3 层 淤泥旋螺: HP 66→60（-6），决策 jev-plan 4，code 4，jev 2
- 第 5 层 蟾蜍蝌蚪: HP 66→60（-6），决策 code 7，jev 1，jev-plan 1
- 第 7 层 海洋混混/钙化邪教徒: HP 66→49（-17），决策 code 8
- 第 7 层 海洋混混/钙化邪教徒: HP 49→42（-7），决策 code 5，jev 2，jev-plan 2
- 第 12 层 骇鳗: HP 74→57（-17），决策 code 5，jev-plan 3，jev 2
- 第 12 层 骇鳗: HP 57→34（-23），决策 code 9
- 第 13 层 化石追踪者: HP 40→26（-14），决策 jev-plan 4，code 4，jev 3
- 第 14 层 卑鄙地精/地精佣兵/胖地精: HP 32→24（-8），决策 code 8，jev-plan 7，jev 4
- 第 17 层 乐加维林族母: HP 54→31（-23），决策 code 18，jev 2，jev-plan 2
- 第 17 层 乐加维林族母: HP 31→15（-16），决策 code 6
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 68→63（-5），决策 jev 2，jev-plan 2，code 1
- 第 19 层 盛碗虫（石）: HP 63→59（-4），决策 code 4，jev 2，jev-plan 2
- 第 22 层 地道虫: HP 65→59（-6），决策 code 11，jev 2，jev-plan 1
- 第 23 层 寄生惧魔/胧光怪: HP 65→48（-17），决策 code 13，jev 1，jev-plan 1
- 第 23 层 寄生惧魔/胧光怪: HP 48→12（-36），决策 code 11，jev 8，jev-plan 5，code-fallback 1
- 第 27 层 棘刺蟾蜍: HP 44→26（-18），决策 code 8，jev 6，jev-plan 5
- 第 29 层 蜂群术士: HP 53→25（-28），决策 code 17，jev 1，jev-plan 1
- 第 29 层 蜂群术士: HP 25→5（-20），决策 code 2
- 第 30 层 虱虫之祖: HP 13→9（-4），决策 code 11，jev 2，jev-plan 2
- 第 31 层 外骨骼虫: HP 17→1（-16），决策 code 11
- 第 33 层 知识恶魔: HP 33→33（-0），决策 code 4
- 第 33 层 知识恶魔: HP 32→32（-0），决策 code 1，jev 1
- 第 33 层 知识恶魔: HP 32→13（-19），决策 code 7，jev 3，jev-plan 2
- 第 33 层 知识恶魔: HP 12→12（-0），决策 code 4

### 死亡战斗：第 33 层 知识恶魔
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-8): 预备打击 -> 知识恶魔, 打击 -> 知识恶魔, 撕裂
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 知识恶魔
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 撕裂
- T6 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan / code: 108
- combat/plan-continue / code: 56
- combat/plan-continue / jev-plan: 46
- combat/plan-choice / jev: 45
- reward/claim / code: 38
- map/route / code: 31
- combat/lethal / code: 17
- reward/proceed / code: 15
- reward/card / code: 14
- event/leave / code: 9
- selection/add / code: 9
- event/choose / jev: 7
- rest/choose / code: 5
- rest/proceed / code: 5
- combat/plan-guarded / code: 4
- selection/curse / code: 4
- combat/end_turn / code: 3
- shop/buy / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- reward/card / jev: 2
- bundle/choose / jev: 1
- bundle/confirm / code: 1
- combat/least-loss / code: 1
- combat/plan-choice / code-fallback: 1
- event/heal / code: 1
- event/only / code: 1
- map/route / jev: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/enchant / jev: 1
- selection/remove / code: 1
- selection/upgrade / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：16 个
- 第 1 层 event/choose: Jev chose 卷轴箱 with confidence 0.21 (0.21)
- 第 1 层 bundle/choose: Jev chose bundle 0 with confidence 0.14 (0.14)
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (挑衅 -> 噬尸蛞蝓, 突破, 防御) with confidence 0.27; code rank 1 (0.27)
- 第 3 层 combat/plan-choice: Jev chose plan 1/3 (狱火, 防御, 突破) with confidence 0.25; code rank 1 (0.25)
- 第 9 层 event/choose: Jev chose 分享知识 with confidence 0.27 (0.27)
- 第 13 层 combat/plan-choice: Jev chose plan 1/3 (挑衅 -> 化石追踪者, 痛击+ -> 化石追踪者) with confidence 0.25; code rank 1 (0.25)
- 第 13 层 combat/plan-choice: Jev chose plan 1/2 (血墙, 打击 -> 化石追踪者) with confidence 0.06; code rank 1 (0.06)
- 第 15 层 event/choose: Jev chose 放入普通药水 with confidence 0.02 (0.02)
- 第 17 层 combat/plan-choice: Jev chose plan 2/4 (耸肩无视, 预备打击 -> 乐加维林族母, 剑柄打击 -> 乐加维林族母) with confidence 0.20; code rank 2 (0.20)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (突破, 打击 -> 乐加维林族母, 头槌 -> 乐加维林族母) with confidence 0.33; code rank 1 (0.33)
- 第 20 层 selection/enchant: Jev chose 预备打击 with confidence 0.11 (0.11)
- 第 21 层 event/choose: Jev chose 洗劫 with confidence 0.02 (0.02)
- 第 23 层 combat/plan-choice: Jev chose plan 1/3 (end turn) with confidence 0.18; code rank 1 (0.18)
- 第 23 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 寄生惧魔, 突破, 耸肩无视) with confidence 0.27; code rank 1 (0.27)
- 第 27 层 combat/plan-choice: Jev chose plan 1/4 (防御, 坚毅) with confidence 0.33; code rank 1 (0.33)
