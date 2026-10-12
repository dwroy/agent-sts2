## 复盘：run HEMND3SMQYB8 — 阵亡，最高第 49 层

- 决策 850 个；Jev 调用 201 次，Claude 0 次，大脑 46 次（codex 46）；token 1,093,531 入 / 10,750 出，约 $0.0464（Jev）；大脑 token 6,181,686 入（缓存命中 3,656,192，59%）/ 11,255 出；用时 41.8 分钟
- 决策者：code 352，jev-plan 233，jev 201，codex 64

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 56→53（-3），决策 code 7，jev-plan 5，jev 3
- 第 4 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 53→53（-0），决策 code 5，jev-plan 4，jev 3
- 第 6 层 毛绒伏地虫: HP 53→52（-1），决策 code 8，jev-plan 6，jev 2
- 第 8 层 劫掠者刺客/劫掠者弩手/劫掠者暴徒: HP 52→36（-16），决策 jev-plan 11，jev 5，code 4
- 第 9 层 多尼斯异鸟: HP 36→14（-22），决策 jev-plan 12，jev 9，code 2
- 第 12 层 利齿之眼/雾菇: HP 35→32（-3），决策 jev-plan 7，jev 6，code 3
- 第 14 层 异蛙寄生虫/扭动虫: HP 53→30（-23），决策 jev-plan 18，jev 17，code 1
- 第 17 层 墨影幻灵: HP 51→44（-7），决策 jev 13，jev-plan 13，code 3
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 64→64（-0），决策 code 6，jev 5，jev-plan 2
- 第 21 层 地道虫: HP 64→59（-5），决策 jev-plan 8，jev 7，code 1
- 第 27 层 感染棱柱: HP 59→48（-11），决策 jev 11，jev-plan 10，code 1
- 第 28 层 虱虫之祖: HP 48→48（-0），决策 jev 11，jev-plan 8，code 1
- 第 29 层 棘刺蟾蜍: HP 48→48（-0），决策 jev-plan 12，jev 10，code 1
- 第 30 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 48→11（-37），决策 jev 10，jev-plan 9，code 4
- 第 33 层 无厌沙虫: HP 32→15（-17），决策 jev-plan 13，jev 12，code 1
- 第 35 层 活体盾/高塔炮手: HP 59→43（-16），决策 jev 8，jev-plan 6，code 2
- 第 37 层 虔诚雕刻师: HP 43→39（-4），决策 jev 7，jev-plan 6，code 1
- 第 39 层 失落之物/遗忘之物: HP 39→33（-6），决策 jev-plan 19，jev 13，code 1
- 第 42 层 猫头鹰法官: HP 54→54（-0），决策 jev-plan 12，jev 9，code 1
- 第 48 层 永世沙漏: HP 70→25（-45），决策 jev 16，jev-plan 11，code 3
- 第 49 层 女王/火炬头聚合体: HP 25→0（-25），决策 code 62，jev-plan 41，jev 24

### 死亡战斗：第 49 层 女王/火炬头聚合体
- T2 [code] combat/end_turn: no playable cards; ending the turn
- T3 [jev] combat/plan-choice: Jev chose plan 1/5 (早有准备, 防御, 扫腿 -> 火炬头聚合体, 斗篷与匕首, 先制打击 -> 女王) with confidence 0.41; code rank 1 conf 0.41
- T3 [jev] selection/choose: Jev chose 先制打击 with confidence 0.20 conf 0.20
- T3 [jev] combat/plan-choice: Jev chose plan 2/4 (扫腿 -> 火炬头聚合体, 斗篷与匕首, 毒雾+) with confidence 0.33; code rank 2 conf 0.33
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 斗篷与匕首
- T3 [jev] combat/plan-choice: Jev chose plan 2/4 (毒雾+, 小刀 -> 女王) with confidence 0.41; code rank 2 conf 0.41
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 小刀 -> 女王
- T3 [code] combat/plan: code plan (only line): end turn; hp -9, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): 扫腿 -> 火炬头聚合体, 猎杀者+ -> 火炬头聚合体, 精密瞄准 -> 火炬头聚合体
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 猎杀者+ -> 火炬头聚合体
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 精密瞄准 -> 火炬头聚合体
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-7): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 233
- combat/plan-choice+potion / jev: 169
- selection/discard / code: 88
- reward/claim / code: 49
- map/route-follow / code: 42
- combat/plan-continue / code: 28
- combat/lethal / code: 26
- combat/plan-choice / jev: 22
- combat/plan / code: 21
- selection/confirm / code: 21
- reward/proceed / code: 20
- reward/card / codex: 19
- event/leave / code: 10
- selection/choose / jev: 10
- rest/plan / codex: 9
- rest/proceed / code: 9
- shop/buy / codex: 9
- combat/least-loss / code: 7
- combat/end_turn / code: 6
- shop/leave / code: 6
- event/choose / codex: 5
- shop/open / code: 5
- shop/plan / codex: 5
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- event/plan / codex: 3
- map/route-only / code: 3
- selection/upgrade / codex: 3
- event/act-plan / codex: 2
- map/route-follow / codex: 2
- selection/add / codex: 2
- selection/remove / codex: 2
- event/after-discard / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/transform / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：11 个
- 第 2 层 selection/choose: Jev chose 进阶之灾 with confidence 0.22 (0.22)
- 第 4 层 combat/plan-choice: Jev chose plan 2/4 (potion 火焰药水 -> 树叶史莱姆（中）) with confidence 0.29; code rank 2 (0.29)
- 第 19 层 selection/choose: Jev chose 进阶之灾 with confidence 0.29 (0.29)
- 第 27 层 selection/choose: Jev chose 尖啸 with confidence 0.21 (0.21)
- 第 29 层 selection/choose: Jev chose 毒性爆发 with confidence 0.20 (0.20)
- 第 39 层 selection/choose: Jev chose 防御 with confidence 0.17 (0.17)
- 第 49 层 combat/plan-choice+potion: Jev chose to drink 混沌药水 (confidence 0.20) (0.20)
- 第 49 层 combat/plan-choice+potion: Jev chose to drink 混沌药水 (confidence 0.10) (0.10)
- 第 49 层 combat/plan-choice: Jev chose plan 4/4 (potion 火焰药水 -> 火炬头聚合体) with confidence 0.17; code rank 4 (0.17)
- 第 49 层 selection/choose: Jev chose 先制打击 with confidence 0.20 (0.20)
- 第 49 层 combat/plan-choice: Jev chose plan 2/4 (扫腿 -> 火炬头聚合体, 斗篷与匕首, 毒雾+) with confidence 0.33; code rank 2 (0.33)
