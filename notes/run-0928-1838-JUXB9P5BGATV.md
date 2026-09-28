## 复盘：run JUXB9P5BGATV — 阵亡，最高第 33 层

- 决策 464 个；Jev 调用 74 次，Claude 0 次，DeepSeek 41 次；token 130,929 入 / 3,220 出，约 $0.0056；用时 29.5 分钟
- 决策者：code 251，jev-plan 98，jev 74，deepseek 41

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→57（-7），决策 code 5，jev-plan 4，jev 3
- 第 3 层 噬尸蛞蝓: HP 63→42（-21），决策 code 9，jev-plan 8，jev 4
- 第 5 层 淤泥旋螺: HP 48→42（-6），决策 code 5，jev-plan 3，jev 2
- 第 6 层 气态炸弹/活雾: HP 48→37（-11），决策 code 9，jev 4，jev-plan 3
- 第 8 层 噬尸蛞蝓: HP 43→24（-19），决策 jev-plan 8，code 8，jev 5
- 第 11 层 花园幽灵鳗: HP 54→54（-0），决策 jev 1，code 1
- 第 11 层 花园幽灵鳗: HP 54→50（-4），决策 code 6，jev-plan 3，jev 2
- 第 12 层 幽灵船: HP 56→46（-10），决策 code 6，jev-plan 4，jev 1
- 第 15 层 拳击构装体: HP 52→39（-13），决策 code 4，jev 3，jev-plan 3
- 第 17 层 瀑布巨兽: HP 69→30（-39），决策 code 14，jev-plan 14，jev 6
- 第 19 层 外骨骼虫: HP 67→58（-9），决策 jev 5，jev-plan 5，code 4
- 第 21 层 偷窃草蜢: HP 64→52（-12），决策 code 11
- 第 22 层 幼虫/直飞产卵虫/结实的卵: HP 58→41（-17），决策 code 8，jev 4，jev-plan 4
- 第 23 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 47→14（-33），决策 jev-plan 6，jev 4，code 4
- 第 24 层 寄生惧魔/胧光怪: HP 20→15（-5），决策 jev-plan 5，jev 3，code 2
- 第 24 层 寄生惧魔/胧光怪: HP 15→4（-11），决策 jev 3，jev-plan 2，code 2
- 第 27 层 异螨: HP 34→23（-11），决策 code 9，jev-plan 5，jev 3
- 第 30 层 残杀千足虫: HP 68→40（-28），决策 jev 10，jev-plan 10，code 3
- 第 30 层 残杀千足虫: HP 40→36（-4），决策 code 5
- 第 33 层 无厌沙虫: HP 60→41（-19），决策 code 11，jev 9，jev-plan 9
- 第 33 层 无厌沙虫: HP 41→14（-27），决策 code 7，jev 2，jev-plan 2

### 死亡战斗：第 33 层 无厌沙虫
- T5 [code] combat/plan: code plan (only line): end turn; hp -18, dmg 0
- T6 [jev] combat/plan-choice: Jev chose plan 4/4 (耸肩无视, 血墙, 狂乱逃离) with confidence 0.30; code rank 4 conf 0.30
- T6 [jev] combat/plan-choice: Jev chose plan 1/3 (狂乱逃离, 双重打击 -> 无厌沙虫, 狂乱逃离) with confidence 0.27; code rank 1; HP guard: plan 1 (狂乱逃离, 双重打击 -> 无厌沙虫, 狂乱逃离) loses 16 HP, more than 4 over the c conf 0.27
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狂乱逃离
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 坚毅
- T6 [code] combat/plan: code plan (only line): end turn; hp -9, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): 挑衅 -> 无厌沙虫, 打击 -> 无厌沙虫, 打击 -> 无厌沙虫, 双重打击 -> 无厌沙虫
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 无厌沙虫
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 无厌沙虫
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 无厌沙虫
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 98
- combat/plan / code: 60
- combat/plan-choice / jev: 59
- reward/claim / code: 40
- combat/plan-continue / code: 37
- map/route-follow / code: 29
- combat/lethal / code: 19
- reward/card / deepseek: 16
- reward/proceed / code: 16
- combat/plan-choice+potion / jev: 15
- combat/end_turn / code: 13
- shop/buy / deepseek: 7
- rest/choose / deepseek: 6
- rest/proceed / code: 6
- event/choose / deepseek: 5
- event/leave / code: 5
- selection/add / code: 3
- shop/buy / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- combat/plan-potion / code: 2
- map/route-plan / deepseek: 2
- selection/add / deepseek: 2
- selection/take into my hand / code: 2
- map/route / code: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/remove / deepseek: 1
- selection/upgrade / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 3 层 combat/plan-choice: Jev chose plan 3/3 (防御, 双重打击 -> 噬尸蛞蝓, 打击 -> 噬尸蛞蝓) with confidence 0.27; code rank 3 (0.27)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (双重打击 -> 活雾, 恶魔之焰 -> 活雾) with confidence 0.22; code rank 1 (0.22)
- 第 19 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.23; code rank 2 (0.23)
- 第 22 层 combat/plan-choice: Jev chose plan 5/5 (预备打击 -> 直飞产卵虫, 完美打击 -> 直飞产卵虫) with confidence 0.19; code rank - (rollout's best line, added) (0.19)
- 第 22 层 combat/plan-choice: Jev chose plan 4/4 (end turn) with confidence 0.15; code rank 4 (0.15)
- 第 33 层 combat/plan-choice+potion: Jev chose to drink 明耀酊剂 (confidence 0.01) (0.01)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (防御, 双重打击 -> 无厌沙虫) with confidence 0.06; code rank 2 (0.06)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (恶魔之焰 -> 无厌沙虫) with confidence 0.04; code rank 2; HP guard: plan 2 (恶魔之焰 -> 无厌沙虫) loses 24 HP, more than 4 over the cheapest line,  (0.04)
- 第 33 层 combat/plan-choice: Jev chose plan 4/4 (耸肩无视, 血墙, 狂乱逃离) with confidence 0.30; code rank 4 (0.30)
- 第 33 层 combat/plan-choice: Jev chose plan 1/3 (狂乱逃离, 双重打击 -> 无厌沙虫, 狂乱逃离) with confidence 0.27; code rank 1; HP guard: plan 1 (狂乱逃离, 双重打击 -> 无厌沙虫, 狂乱逃离) loses 16 HP, more than 4  (0.27)
