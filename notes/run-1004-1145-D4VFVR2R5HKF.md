## 复盘：run D4VFVR2R5HKF — 胜利，最高第 48 层

- 决策 675 个；Jev 调用 124 次，Claude 0 次，大脑 51 次（codex 51）；token 915,591 入 / 7,867 出，约 $0.0388（Jev）；大脑 token 9,083,023 入（缓存命中 6,114,304，67%）/ 51,585 出；用时 73.0 分钟
- 决策者：code 323，jev-plan 157，jev 124，codex 71

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→60（-4，战后回复 +6），决策 code 4，jev 3，jev-plan 2
- 第 3 层 海洋混混: HP 66→63（-3，战后回复 +6），决策 jev 5，code 5，jev-plan 3
- 第 6 层 蟾蜍蝌蚪: HP 69→62（-7，战后回复 +6），决策 code 3，jev 1，jev-plan 1
- 第 11 层 鬼祟珊瑚群: HP 80→36（-44，战后回复 +6），决策 code 6，jev 5，jev-plan 5
- 第 14 层 海洋混混/钙化邪教徒: HP 66→60（-6，战后回复 +6），决策 jev 7，jev-plan 4，code 2
- 第 15 层 化石追踪者: HP 66→66（-0，战后回复 +6），决策 jev 3，code 2，jev-plan 1
- 第 17 层 瀑布巨兽: HP 80→43（-37，战后回复 +6），决策 jev-plan 12，jev 9，code 9
- 第 19 层 偷窃草蜢: HP 73→64（-9，战后回复 +6），决策 jev-plan 5，code 4，jev 3
- 第 22 层 外骨骼虫: HP 70→62（-8，战后回复 +6），决策 jev-plan 6，jev 4，code 4
- 第 23 层 猎人杀手: HP 68→61（-7，战后回复 +6），决策 code 5，jev-plan 4，jev 3
- 第 25 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 80→69（-11，战后回复 +6），决策 jev-plan 8，code 8，jev 6
- 第 27 层 感染棱柱: HP 75→60（-15，战后回复 +6），决策 code 12，jev-plan 8，jev 4
- 第 30 层 棘刺蟾蜍: HP 80→79（-1，战后回复 +1），决策 jev 7，jev-plan 4，code 4
- 第 33 层 无厌沙虫: HP 80→3（-77，战后回复 +6），决策 code 14，jev-plan 11，jev 5
- 第 35 层 活体盾/高塔炮手: HP 96→88（-8，战后回复 +6），决策 jev 5，jev-plan 1，code 1
- 第 36 层 虔诚雕刻师: HP 94→84（-10，战后回复 +6），决策 jev 6，jev-plan 5，code 2
- 第 37 层 拳击构装体/方柱构装体: HP 90→76（-14，战后回复 +6），决策 jev 3，jev-plan 3，code 2
- 第 42 层 失落之物/遗忘之物: HP 111→82（-29，战后回复 +6），决策 jev-plan 9，jev 7，code 5
- 第 45 层 电球头: HP 111→106（-5，战后回复 +5），决策 jev-plan 9，jev 4，code 4
- 第 48 层 女王/火炬头聚合体: HP 111→19（-92，战后回复 +6），决策 jev-plan 56，code 54，jev 34

### 各类决策由谁做
- combat/plan-continue / jev-plan: 157
- combat/plan-choice / jev: 120
- combat/plan / code: 77
- reward/claim / code: 53
- map/route-follow / code: 42
- combat/plan-continue / code: 30
- reward/card / codex: 22
- reward/proceed / code: 21
- combat/lethal / code: 20
- event/leave / code: 11
- rest/plan / code: 10
- rest/plan / codex: 10
- rest/proceed / code: 10
- selection/upgrade / codex: 10
- selection/exhaust / code: 8
- combat/end_turn / code: 7
- event/choose / codex: 7
- shop/buy / codex: 7
- combat/least-loss / code: 5
- event/only / code: 5
- shop/leave / code: 4
- shop/open / code: 4
- shop/plan / codex: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/plan-choice+potion / jev: 3
- selection/free-card / code: 3
- event/act-plan / codex: 2
- event/plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/add / codex: 2
- bundle/choose / codex: 1
- bundle/confirm / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：5 个
- 第 33 层 combat/plan-choice: Jev chose plan 1/4 (狱火+, 御血术 -> 无厌沙虫, 飞剑回旋镖+, 狂乱逃离, 打击 -> 无厌沙虫) with confidence 0.34; code rank 1 (0.34)
- 第 48 层 combat/plan-choice: Jev chose plan 4/5 (与我一战！+ -> 女王, 血墙+, 巨像+) with confidence 0.11; code rank 4 (0.11)
- 第 48 层 combat/plan-choice: Jev chose plan 2/4 (防御+, 旋风斩+) with confidence 0.24; code rank 2 (0.24)
- 第 48 层 combat/plan-choice: Jev chose plan 2/3 (与我一战！+ -> 女王) with confidence 0.29; code rank 2 (0.29)
- 第 48 层 combat/plan-choice: Jev chose plan 3/4 (铁斩波 -> 女王, 飞剑回旋镖+) with confidence 0.25; code rank 3 (0.25)
