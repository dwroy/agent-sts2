## 复盘：run C48LLXBGKXQ9 — 阵亡，最高第 33 层

- 决策 1108 个；Jev 调用 272 次，Claude 0 次，大脑 32 次（codex 32）；token 1,224,522 入 / 12,864 出，约 $0.0520（Jev）；大脑 token 1,235,810 入（缓存命中 222,848，18%）/ 32,119 出；用时 53.1 分钟
- 决策者：code 500，jev-plan 290，jev 272，codex 46

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 70→67（-3），决策 jev-plan 7，code 7，jev 2
- 第 3 层 噬尸蛞蝓: HP 67→59（-8），决策 jev-plan 10，jev 5，code 5
- 第 4 层 蟾蜍蝌蚪: HP 59→59（-0），决策 jev-plan 5，code 5，jev 4
- 第 6 层 拳击构装体: HP 59→59（-0），决策 code 13，jev 4
- 第 7 层 气态炸弹/活雾: HP 59→59（-0），决策 jev-plan 10，code 7，jev 6
- 第 9 层 鬼祟珊瑚群: HP 59→35（-24），决策 code 20，jev-plan 7，jev 5
- 第 12 层 幽灵船: HP 35→32（-3），决策 jev-plan 10，code 8，jev 7
- 第 15 层 噬尸蛞蝓: HP 53→53（-0），决策 jev 7，code 7，jev-plan 6
- 第 17 层 瀑布巨兽: HP 53→7（-46），决策 code 80，jev 50，jev-plan 46
- 第 19 层 地道虫: HP 70→32（-38），决策 code 16，jev 12，jev-plan 12
- 第 22 层 偷窃草蜢: HP 57→50（-7），决策 jev-plan 10，jev 4，code 2
- 第 23 层 棘刺蟾蜍: HP 50→47（-3），决策 jev 12，jev-plan 11，code 2
- 第 24 层 外骨骼虫: HP 47→44（-3），决策 jev 13，jev-plan 10，code 2
- 第 30 层 寄生惧魔/胧光怪: HP 65→39（-26），决策 jev 21，jev-plan 11，code 3
- 第 31 层 异螨: HP 39→39（-0），决策 jev-plan 9，jev 6，code 1
- 第 33 层 无厌沙虫: HP 60→0（-60），决策 code 210，jev-plan 126，jev 114

### 死亡战斗：第 33 层 无厌沙虫
- T9 [code] combat/plan: code plan (only distinct line): 翻越撑击; hp -8, dmg 7
- T9 [code] combat/plan: code plan (only line): end turn; hp -8, dmg 0
- T10 [jev] combat/plan-choice: Jev chose plan 1/2 (打击 -> 无厌沙虫, 猎杀者 -> 无厌沙虫, 匕首雨, 打击 -> 无厌沙虫) with confidence 0.94; code rank 1 conf 0.94
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 猎杀者 -> 无厌沙虫
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 匕首雨
- T10 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 无厌沙虫
- T10 [code] combat/plan: code plan (only distinct line): end turn; hp -24, dmg 0
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 狂乱逃离, 防御, 偏折+, 防御
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 偏折+
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T11 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 290
- combat/plan / code: 199
- combat/plan-choice / jev: 173
- combat/plan-continue / code: 146
- combat/plan-choice+potion / jev: 75
- reward/claim / code: 42
- map/route-follow / code: 29
- selection/choose / jev: 21
- combat/lethal / code: 19
- reward/card / codex: 16
- combat/least-loss / code: 15
- reward/proceed / code: 15
- shop/buy / codex: 8
- event/leave / code: 6
- rest/plan / codex: 6
- rest/proceed / code: 6
- selection/free-card / code: 6
- event/choose / codex: 3
- selection/upgrade / codex: 3
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / codex: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/sandpit-guard / code: 2
- event/plan / codex: 2
- selection/take into my hand / jev: 2
- combat/end_turn / code: 1
- event/act-plan / codex: 1
- map/route-change / codex: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/remove / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：44 个
- 第 3 层 selection/choose: Jev chose 先制打击 with confidence 0.02 (0.02)
- 第 4 层 selection/choose: Jev chose 打击 with confidence 0.28 (0.28)
- 第 6 层 combat/plan-choice+potion: Jev chose to drink 无色药水, then re-plan (confidence 0.13) (0.13)
- 第 7 层 selection/choose: Jev chose 打击 with confidence 0.29 (0.29)
- 第 9 层 selection/choose: Jev chose 打击 with confidence 0.34 (0.34)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 2/2 (刀刃之舞+) with confidence 0.15; code rank 2 (0.15)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 异蛇之油, then re-plan (confidence 0.15) (0.15)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 瀑布巨兽, 生存者, 匕首雨) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (终结技+ -> 瀑布巨兽) with confidence 0.31; code rank 1 (0.31)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (防御+, 打击 -> 瀑布巨兽, 匕首雨) with confidence 0.28; code rank 1 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御, 打击 -> 瀑布巨兽) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 5/5 (防御, 打击 -> 瀑布巨兽, 匕首雨); plan 1 (生存者, 打击 -> 瀑布巨兽, 匕首雨) is as good or better on every axis, playing it with confidence 0.26; code rank (0.26)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (防御, 打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽) with confidence 0.34; code rank 1 (0.34)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 瀑布巨兽, 生存者, 打击 -> 瀑布巨兽) with confidence 0.09; code rank 1 (0.09)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (终结技+ -> 瀑布巨兽) with confidence 0.20; code rank 2 (0.20)
