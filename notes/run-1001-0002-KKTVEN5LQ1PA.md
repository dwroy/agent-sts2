## 复盘：run KKTVEN5LQ1PA — 胜利，最高第 48 层

- 决策 606 个；Jev 调用 90 次，Claude 0 次，DeepSeek 44 次；token 502,442 入 / 4,784 出，约 $0.0213（Jev）；DeepSeek token 6,083,487 入（缓存命中 5,695,616，94%）/ 280,873 出；用时 47.8 分钟
- 决策者：code 309，jev-plan 146，jev 90，deepseek 61

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 75→73（-2，战后回复 +6），决策 code 8，jev 1，jev-plan 1
- 第 3 层 毛绒伏地虫: HP 79→79（-0，战后回复 +6），决策 code 7，jev-plan 2，jev 1
- 第 5 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 85→77（-8，战后回复 +6），决策 jev 4，jev-plan 3，code 3
- 第 6 层 墨宝: HP 83→81（-2，战后回复 +6），决策 code 6，jev-plan 4，jev 3
- 第 8 层 旧日雕像: HP 87→60（-27，战后回复 +6），决策 code 10，jev-plan 4，jev 2
- 第 11 层 毛绒伏地虫/缩小甲虫: HP 91→86（-5，战后回复 +5），决策 jev 4，jev-plan 4，code 3
- 第 12 层 利齿之眼/雾菇: HP 91→89（-2，战后回复 +2），决策 code 4，jev 2，jev-plan 2
- 第 13 层 藤蔓蹒跚者: HP 91→86（-5，战后回复 +5），决策 jev 3，jev-plan 3，code 3
- 第 14 层 异蛙寄生虫/扭动虫: HP 91→73（-18，战后回复 +6），决策 code 17，jev-plan 10，jev 7
- 第 17 层 墨影幻灵: HP 79→12（-67，战后回复 +6），决策 code 16，jev-plan 10，jev 8
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 76→76（-0，战后回复 +6），决策 jev-plan 3，jev 2，code 2
- 第 20 层 外骨骼虫: HP 82→81（-1，战后回复 +6），决策 jev-plan 3，code 3，jev 2
- 第 21 层 虱虫之祖: HP 87→84（-3，战后回复 +6），决策 jev-plan 6，jev 3，code 3
- 第 23 层 啃咬机: HP 90→90（-0，战后回复 +1），决策 jev 3，jev-plan 3，code 2
- 第 25 层 蜂群术士: HP 91→22（-69，战后回复 +6），决策 code 10，jev 5，jev-plan 5
- 第 31 层 残杀千足虫: HP 91→87（-4，战后回复 +4），决策 jev-plan 4，jev 2，code 2
- 第 33 层 火箭/碾碎爪: HP 91→52（-39，战后回复 +6），决策 code 13，jev-plan 12，jev 10
- 第 35 层 虔诚雕刻师: HP 84→82（-2，战后回复 +6），决策 jev-plan 9，jev 4，code 3
- 第 38 层 活体盾/高塔炮手: HP 88→83（-5，战后回复 +6），决策 jev-plan 5，jev 2，code 2
- 第 39 层 噪音机器人/电击机器人/组装师: HP 89→73（-16，战后回复 +6），决策 jev-plan 6，code 5，jev 4
- 第 45 层 失落之物/遗忘之物: HP 79→74（-5，战后回复 +6），决策 jev-plan 15，jev 6，code 1
- 第 46 层 机甲骑士: HP 80→53（-27，战后回复 +6），决策 jev-plan 13，code 11，jev 3
- 第 48 层 永世沙漏: HP 91→20（-71，战后回复 +6），决策 jev-plan 19，jev 9，code 6

### 各类决策由谁做
- combat/plan-continue / jev-plan: 146
- combat/plan-choice / jev: 83
- reward/claim / code: 60
- combat/plan / code: 56
- combat/plan-continue / code: 49
- map/route-follow / code: 42
- combat/lethal / code: 28
- reward/proceed / code: 23
- reward/card / deepseek: 22
- rest/plan / deepseek: 10
- rest/proceed / code: 10
- shop/buy / deepseek: 8
- combat/plan-choice+potion / jev: 6
- event/leave / code: 6
- selection/upgrade / deepseek: 6
- shop/leave / code: 5
- shop/open / code: 5
- shop/plan / deepseek: 5
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- combat/end_turn / code: 4
- event/choose / deepseek: 4
- event/act-plan / deepseek: 2
- event/only / code: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/exhaust / code: 2
- event/after-discard / code: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/remove / deepseek: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：12 个
- 第 5 层 combat/plan-choice: Jev chose plan 1/10 (御血术 -> 树枝史莱姆（中）, 痛击 -> 树枝史莱姆（中）) with confidence 0.31; code rank 1 (0.31)
- 第 6 层 combat/plan-choice: Jev chose plan 2/2 (防御) with confidence 0.04; code rank 2 (0.04)
- 第 14 层 combat/plan-choice: Jev chose plan 9/10 (防御, 剑柄打击 -> 扭动虫 #1, 打击 -> 扭动虫 #1) with confidence 0.23; code rank 9 (0.23)
- 第 14 层 combat/plan-choice: Jev chose plan 3/7 (御血术 -> 扭动虫 #2, potion 灰水) with confidence 0.12; code rank 3 (0.12)
- 第 14 层 combat/plan-choice: Jev chose plan 2/4 (打击 -> 扭动虫 #1, 血墙) with confidence 0.28; code rank 2 (0.28)
- 第 14 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 扭动虫 #1, 防御) with confidence 0.23; code rank 1 (0.23)
- 第 23 层 combat/plan-choice: Jev chose plan 2/4 (预备打击 -> 啃咬机 #2, 怨恨 -> 啃咬机 #1, 完美打击 -> 啃咬机 #1, 踩踏) with confidence 0.32; code rank 2 (0.32)
- 第 23 层 combat/plan-choice: Jev chose plan 2/3 (end turn) with confidence 0.20; code rank 2 (0.20)
- 第 33 层 combat/plan-choice: Jev chose plan 6/6 (燃烧+, 永恒铠甲, 闪电霹雳, 飞剑回旋镖+, 怨恨 -> 火箭, 打击 -> 火箭, 痛击 -> 火箭) with confidence 0.33; code rank 6 (0.33)
- 第 33 层 combat/plan-choice: Jev chose plan 2/3 (打击 -> 火箭, 打击 -> 火箭, 飞剑回旋镖+, 防御) with confidence 0.26; code rank 2 (0.26)
- 第 35 层 combat/plan-choice: Jev chose plan 5/5 (薪火之源, 燃烧+, 怨恨 -> 虔诚雕刻师, 打击 -> 虔诚雕刻师) with confidence 0.34; code rank - (rollout's best line, added) (0.34)
- 第 48 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 永世沙漏, 被遗忘的仪式+, 御血术 -> 永世沙漏, 燃烧契约) with confidence 0.32; code rank 1 (0.32)
