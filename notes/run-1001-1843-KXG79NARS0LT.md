## 复盘：run KXG79NARS0LT — 阵亡，最高第 48 层

- 决策 573 个；Jev 调用 122 次，Claude 0 次，DeepSeek 43 次；token 795,862 入 / 7,009 出，约 $0.0337（Jev）；DeepSeek token 6,156,470 入（缓存命中 5,651,200，92%）/ 262,708 出；用时 48.9 分钟
- 决策者：code 255，jev-plan 129，jev 122，deepseek 67

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→61（-3，战后回复 +6），决策 jev 6，jev-plan 5，code 2
- 第 4 层 毛绒伏地虫: HP 67→67（-0，战后回复 +6），决策 jev 4，jev-plan 3，code 1
- 第 6 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 65→65（-0，战后回复 +6），决策 code 4
- 第 8 层 蛮兽: HP 71→71（-0，战后回复 +6），决策 jev 5，jev-plan 4，code 3
- 第 9 层 多尼斯异鸟: HP 77→65（-12，战后回复 +6），决策 jev-plan 7，jev 3
- 第 12 层 墨宝: HP 71→70（-1，战后回复 +6），决策 jev 6，jev-plan 3，code 3
- 第 13 层 旧日雕像: HP 76→76（-0，战后回复 +4），决策 jev-plan 6，jev 4，code 1
- 第 14 层 树枝史莱姆（中）/蛇行扼杀者: HP 80→78（-2，战后回复 +2），决策 jev 4，jev-plan 4，code 1
- 第 15 层 劫掠者刺客/劫掠者斧手/劫掠者追踪手: HP 80→80（-0），决策 jev 4，jev-plan 1，code 1
- 第 17 层 墨影幻灵: HP 80→60（-20，战后回复 +6），决策 jev 12，jev-plan 10，code 6
- 第 19 层 偷窃草蜢: HP 77→71（-6，战后回复 +6），决策 code 9，jev 2，jev-plan 2
- 第 22 层 盛碗虫（石）/盛碗虫（蜜）: HP 77→75（-2，战后回复 +5），决策 jev 4，code 3，jev-plan 1
- 第 23 层 外骨骼虫: HP 80→80（-0），决策 jev 7，jev-plan 3，code 1
- 第 25 层 猎人杀手: HP 80→75（-5，战后回复 +5），决策 jev 8，jev-plan 5，code 2
- 第 27 层 啃咬机: HP 80→76（-4，战后回复 +4），决策 jev 6，jev-plan 4，code 4
- 第 28 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 80→62（-18，战后回复 +6），决策 jev 2，jev-plan 2，code 2
- 第 31 层 棘刺蟾蜍: HP 68→54（-14，战后回复 +6），决策 jev 3，jev-plan 2，code 2
- 第 33 层 火箭/碾碎爪: HP 80→22（-58，战后回复 +6），决策 jev-plan 15，code 10，jev 8
- 第 35 层 虔诚雕刻师: HP 69→67（-2，战后回复 +6），决策 jev-plan 9，code 4，jev 2
- 第 38 层 活体盾/高塔炮手: HP 93→87（-6，战后回复 +6），决策 jev-plan 5，jev 4，code 2
- 第 43 层 戳刺机器人/电击机器人/组装师: HP 93→72（-21，战后回复 +6），决策 code 5，jev 4，jev-plan 3
- 第 44 层 机甲骑士: HP 78→14（-64，战后回复 +6），决策 jev-plan 14，jev 9，code 1
- 第 45 层 咬人卷轴: HP 20→8（-12，战后回复 +6），决策 jev 5，code 3，jev-plan 2
- 第 48 层 女王/火炬头聚合体: HP 57→0（-57），决策 jev-plan 19，code 12，jev 10

### 死亡战斗：第 48 层 女王/火炬头聚合体
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 上勾拳 -> 女王
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 剑柄打击 -> 女王
- T5 [code] combat/plan: code plan (only line): end turn; hp -7, dmg 0
- T6 [jev] combat/plan-choice: Jev chose plan 2/5 (上勾拳 -> 女王, 预备打击 -> 女王, 御血术 -> 女王) with confidence 0.22; code rank 2 conf 0.22
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 预备打击 -> 女王
- T6 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 御血术 -> 女王
- T6 [code] combat/plan: code plan (only line): end turn; hp -2, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-31): 防御+, 预备打击 -> 女王
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-31): 防御+, 预备打击 -> 女王
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 预备打击 -> 女王
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-31): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 129
- combat/plan-choice / jev: 77
- reward/claim / code: 66
- combat/plan-choice+potion / jev: 42
- map/route-follow / code: 42
- combat/lethal / code: 29
- combat/plan / code: 26
- reward/proceed / code: 25
- reward/card / deepseek: 23
- combat/plan-continue / code: 19
- shop/buy / deepseek: 11
- rest/plan / deepseek: 8
- rest/proceed / code: 8
- event/leave / code: 6
- selection/upgrade / deepseek: 6
- shop/leave / code: 6
- shop/open / code: 5
- shop/plan / deepseek: 5
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- selection/take into my hand / code: 4
- combat/least-loss / code: 3
- event/choose / deepseek: 3
- combat/plan-choice+potion-lethal / jev: 2
- event/act-plan / deepseek: 2
- map/route-follow / deepseek: 2
- map/route-only / code: 2
- selection/remove / deepseek: 2
- combat/end_turn / code: 1
- event/plan / deepseek: 1
- map/route-change / deepseek: 1
- map/route-plan / deepseek: 1
- run/finalize / code: 1
- selection/enchant / deepseek: 1
- selection/take into my hand / jev: 1
- shop/discard / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：6 个
- 第 17 层 selection/take into my hand: Jev chose 地狱之刃 with confidence 0.07 (0.07)
- 第 17 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 墨影幻灵) with confidence 0.32; code rank 2 (0.32)
- 第 31 层 combat/plan-choice: Jev chose plan 5/5 (end turn) with confidence 0.09; code rank - (rollout's best line, added) (0.09)
- 第 44 层 combat/plan-choice+potion: Jev chose plan 1/4 (potion 肌肉药水, 愤怒 -> 机甲骑士, 无情猛攻 -> 机甲骑士, 打击 -> 机甲骑士, 双重打击 -> 机甲骑士) with confidence 0.15; code rank 1 (0.15)
- 第 44 层 combat/plan-choice+potion: Jev chose plan 1/3 (end turn) with confidence 0.29; code rank 1 (0.29)
- 第 48 层 combat/plan-choice: Jev chose plan 2/5 (上勾拳 -> 女王, 预备打击 -> 女王, 御血术 -> 女王) with confidence 0.22; code rank 2 (0.22)
