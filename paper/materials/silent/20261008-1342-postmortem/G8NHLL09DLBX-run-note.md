## 复盘：run G8NHLL09DLBX — 阵亡，最高第 24 层

- 决策 726 个；Jev 调用 147 次，Claude 0 次，大脑 25 次（codex 25）；token 737,800 入 / 7,461 出，约 $0.0313（Jev）；大脑 token 3,256,473 入（缓存命中 1,689,088，52%）/ 5,767 出；用时 34.3 分钟
- 决策者：code 336，jev-plan 209，jev 147，codex 34

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 56→56（-0），决策 code 9，jev 4，jev-plan 4
- 第 4 层 蟾蜍蝌蚪: HP 56→56（-0），决策 jev-plan 8，code 4，jev 2
- 第 6 层 噬尸蛞蝓: HP 49→48（-1），决策 jev-plan 7，jev 5，code 4
- 第 8 层 花园幽灵鳗: HP 69→58（-11），决策 code 14，jev-plan 8，jev 5
- 第 11 层 卑鄙地精/地精佣兵/胖地精: HP 64→58（-6），决策 jev-plan 11，code 10，jev 7
- 第 12 层 下水道蚌: HP 58→58（-0），决策 jev-plan 6，code 5，jev 3
- 第 14 层 海洋混混/钙化邪教徒: HP 58→47（-11），决策 code 10，jev-plan 9，jev 7
- 第 15 层 双尾鼠: HP 47→44（-3），决策 code 9，jev-plan 6，jev 4
- 第 17 层 瀑布巨兽: HP 76→1（-75），决策 code 144，jev-plan 109，jev 76
- 第 19 层 地道虫: HP 61→54（-7），决策 code 14，jev 8，jev-plan 8
- 第 20 层 偷窃草蜢: HP 54→52（-2），决策 jev 10，code 8，jev-plan 7
- 第 23 层 棘刺蟾蜍: HP 52→22（-30），决策 jev-plan 8，code 7，jev 3
- 第 24 层 幼虫/直飞产卵虫/结实的卵: HP 22→0（-22），决策 jev-plan 18，code 16，jev 13

### 死亡战斗：第 24 层 幼虫/直飞产卵虫/结实的卵
- T3 [code] combat/plan: code plan (only line): end turn; hp -2, dmg 19
- T4 [jev] combat/plan-choice: Jev chose plan 1/2 (必备工具, 带毒刺击 -> 幼虫 #1, 偏折, 打击 -> 幼虫 #1, 中和 -> 幼虫 #2) with confidence 0.94; code rank 1 conf 0.94
- T4 [jev] combat/plan-choice: Jev chose plan 2/2 (带毒刺击 -> 直飞产卵虫, 偏折, 中和 -> 幼虫 #1, 防御) with confidence 1.00; code rank 2 conf 1.00
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 偏折
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 中和 -> 幼虫 #1
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T4 [code] combat/plan: code plan (only line): end turn; hp -10, dmg 21
- T5 [jev] selection/choose: Jev chose 打击 with confidence 0.66 conf 0.66
- T5 [code] combat/lethal: lethal: 切割 -> 幼虫 #2, 致命毒药+ -> 幼虫 #2, 弹跳药瓶
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 致命毒药+ -> 幼虫 #2
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 弹跳药瓶
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-44): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 209
- combat/plan / code: 136
- combat/plan-choice / jev: 119
- combat/plan-continue / code: 75
- reward/claim / code: 33
- selection/choose / jev: 28
- map/route-follow / code: 20
- combat/lethal / code: 19
- combat/end_turn / code: 15
- reward/card / codex: 12
- reward/proceed / code: 12
- combat/least-loss / code: 9
- shop/buy / codex: 6
- event/leave / code: 5
- event/choose / codex: 3
- rest/plan / codex: 3
- rest/proceed / code: 3
- selection/add / codex: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / codex: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- event/act-plan / codex: 1
- event/plan / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/remove / codex: 1
- selection/upgrade / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：25 个
- 第 4 层 combat/plan-choice: Jev chose plan 1/2 (防御, 中和 -> 蟾蜍蝌蚪 #1, 打击 -> 蟾蜍蝌蚪 #2) with confidence 0.10; code rank 1 (0.10)
- 第 11 层 selection/choose: Jev chose 中和 with confidence 0.24 (0.24)
- 第 11 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 卑鄙地精) with confidence 0.12; code rank 1 (0.12)
- 第 17 层 selection/choose: Jev chose 精确切击 with confidence 0.26 (0.26)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (匕首雨, 生存者, 打击 -> 瀑布巨兽) with confidence 0.12; code rank 2 (0.12)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 瀑布巨兽, 防御, 防御, 中和 -> 瀑布巨兽) with confidence 0.24; code rank 2 (0.24)
- 第 17 层 selection/choose: Jev chose 串刺 with confidence 0.14 (0.14)
- 第 17 层 combat/plan-choice: Jev chose plan 4/6 (防御, 后空翻, 防御) with confidence 0.28; code rank 4 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御) with confidence 0.28; code rank 2 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 3/7 (防御, 精确切击 -> 瀑布巨兽, 防御, 串刺 -> 瀑布巨兽) with confidence 0.33; code rank 3 (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (防御, 打击 -> 瀑布巨兽, 匕首雨, 切割 -> 瀑布巨兽) with confidence 0.30; code rank 2 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.20; code rank 2 (0.20)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (匕首雨, 生存者, 偏折, 精确切击 -> 瀑布巨兽) with confidence 0.25; code rank 2 (0.25)
- 第 17 层 selection/choose: Jev chose 精确切击 with confidence 0.31 (0.31)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (致命毒药+ -> 瀑布巨兽) with confidence 0.34; code rank 1 (0.34)
