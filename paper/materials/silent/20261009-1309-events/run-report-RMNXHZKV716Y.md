## 复盘：run RMNXHZKV716Y — 阵亡，最高第 49 层

- 决策 981 个；Jev 调用 352 次，Claude 0 次，大脑 50 次（codex 50）；token 1,916,688 入 / 20,110 出，约 $0.0813（Jev）；大脑 token 6,876,497 入（缓存命中 3,983,616，58%）/ 12,802 出；用时 56.7 分钟
- 决策者：jev 352，code 292，jev-plan 269，codex 68

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 56→56（-0），决策 code 14，jev-plan 7，jev 4
- 第 3 层 毛绒伏地虫: HP 56→56（-0），决策 code 7，jev-plan 6，jev 2
- 第 5 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 56→52（-4），决策 code 8，jev-plan 4，jev 2
- 第 6 层 小啃兽: HP 52→32（-20），决策 jev-plan 10，code 8，jev 6
- 第 7 层 方柱构装体: HP 32→25（-7），决策 code 7，jev-plan 4，jev 2
- 第 9 层 旧日雕像: HP 51→16（-35），决策 jev 14，code 11，jev-plan 10
- 第 15 层 毛绒伏地虫/缩小甲虫: HP 45→31（-14），决策 jev 9，jev-plan 9，code 1
- 第 17 层 同族信徒/同族神官: HP 72→16（-56），决策 jev 26，jev-plan 21
- 第 19 层 外骨骼虫: HP 71→68（-3），决策 jev 10，jev-plan 9
- 第 21 层 偷窃草蜢: HP 68→68（-0），决策 jev 9，jev-plan 8，code 3
- 第 23 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 50→50（-0），决策 jev 15，jev-plan 10，code 1
- 第 25 层 猎人杀手: HP 62→51（-11），决策 jev 10，jev-plan 7，code 2
- 第 29 层 棘刺蟾蜍: HP 63→57（-6），决策 jev 9，jev-plan 8，code 1
- 第 30 层 啃咬机: HP 57→45（-12），决策 jev 10，jev-plan 10，code 4
- 第 33 层 火箭/碾碎爪: HP 90→31（-59），决策 jev 29，jev-plan 16，code 1
- 第 35 层 咬人卷轴: HP 78→78（-0），决策 jev-plan 8，jev 7，code 2
- 第 36 层 战斗好伙伴V1.0: HP 78→78（-0），决策 jev-plan 7，jev 6，code 3
- 第 37 层 虔诚雕刻师: HP 78→26（-52），决策 jev 13，jev-plan 10，code 1
- 第 44 层 失落之物/遗忘之物: HP 94→71（-23），决策 jev 13，jev-plan 10，code 1
- 第 46 层 史莱姆狂战士: HP 71→50（-21），决策 jev 21，jev-plan 12，code 1
- 第 48 层 永世沙漏: HP 100→13（-87），决策 jev 91，jev-plan 42，code 14
- 第 49 层 女王/火炬头聚合体: HP 13→0（-13），决策 code 45，jev-plan 41，jev 38

### 死亡战斗：第 49 层 女王/火炬头聚合体
- T2 [jev] selection/choose: Jev chose 谋划专家 with confidence 0.16 conf 0.16
- T2 [jev] combat/plan-choice: Jev chose plan 3/3 (毒雾, 致命毒药+ -> 火炬头聚合体, 疯狂科学) with confidence 0.22; code rank 3 [calc mismatch: solver says ending now does not kill, mod says lethal: no end-o conf 0.22
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 致命毒药+ -> 火炬头聚合体
- T2 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 疯狂科学
- T2 [code] combat/end_turn: no playable cards; ending the turn
- T3 [code] combat/plan: code plan (only distinct line): 扫腿+ -> 火炬头聚合体, 后空翻; hp -0, dmg 22
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 后空翻
- T3 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 22
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): 灵动步法, 打击 -> 火炬头聚合体, 打击 -> 火炬头聚合体
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火炬头聚合体
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 火炬头聚合体
- T4 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 269
- combat/plan-choice+potion / jev: 243
- combat/plan-choice / jev: 51
- reward/claim / code: 50
- combat/plan / code: 46
- map/route-follow / code: 43
- selection/choose / jev: 42
- combat/plan-continue / code: 35
- combat/lethal / code: 26
- reward/card / codex: 20
- reward/proceed / code: 20
- selection/take into my hand / jev: 15
- combat/least-loss / code: 14
- combat/end_turn / code: 12
- event/leave / code: 11
- shop/buy / codex: 10
- event/choose / codex: 9
- rest/plan / codex: 9
- rest/proceed / code: 9
- shop/leave / code: 5
- shop/open / code: 5
- shop/plan / codex: 5
- event/plan / codex: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- selection/remove / codex: 3
- selection/take into my hand / code: 3
- selection/upgrade / codex: 3
- event/act-plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- combat/play / jev: 1
- event/only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：47 个
- 第 9 层 selection/take into my hand: Jev chose 必备工具 with confidence 0.27 (0.27)
- 第 15 层 selection/choose: Jev chose 防御 with confidence 0.25 (0.25)
- 第 17 层 selection/choose: Jev chose 进阶之灾 with confidence 0.17 (0.17)
- 第 17 层 selection/choose: Jev chose 翻越撑击 with confidence 0.23 (0.23)
- 第 29 层 selection/choose: Jev chose 中和 with confidence 0.22 (0.22)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 1/2 (end turn) with confidence 0.19; code rank 1 (0.19)
- 第 33 层 selection/take into my hand: Jev chose 必备工具 with confidence 0.30 (0.30)
- 第 33 层 selection/choose: Jev chose 计算下注 with confidence 0.18 (0.18)
- 第 33 层 selection/choose: Jev chose 计算下注 with confidence 0.33 (0.33)
- 第 33 层 selection/choose: Jev chose 震荡波 with confidence 0.20 (0.20)
- 第 33 层 selection/choose: Jev chose 生存者 with confidence 0.08 (0.08)
- 第 33 层 selection/choose: Jev chose 翻越撑击 with confidence 0.29 (0.29)
- 第 36 层 selection/take into my hand: Jev chose 融入暗影 with confidence 0.12 (0.12)
- 第 46 层 selection/choose: Jev chose 精密瞄准 with confidence 0.22 (0.22)
- 第 48 层 selection/take into my hand: Jev chose 突然一拳 with confidence 0.17 (0.17)
