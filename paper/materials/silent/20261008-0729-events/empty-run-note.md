## 复盘：run PD9AYQVMLQW6 — 阵亡，最高第 49 层

- 决策 1017 个；Jev 调用 182 次，Claude 0 次，大脑 54 次（codex 54）；token 969,556 入 / 8,599 出，约 $0.0411（Jev）；大脑 token 7,196,250 入（缓存命中 5,163,776，72%）/ 13,968 出；用时 50.9 分钟
- 决策者：code 539，jev-plan 223，jev 182，codex 73

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 56→56（-0），决策 code 8，jev 4，jev-plan 2
- 第 5 层 噬尸蛞蝓: HP 56→46（-10），决策 jev-plan 4，code 4，jev 3
- 第 6 层 海洋混混: HP 46→43（-3），决策 jev-plan 5，code 4，jev 3
- 第 8 层 噬尸蛞蝓: HP 64→64（-0），决策 code 8，jev-plan 7，jev 3
- 第 9 层 海洋混混/钙化邪教徒: HP 64→51（-13），决策 code 9，jev-plan 8，jev 5
- 第 13 层 卑鄙地精/地精佣兵/胖地精: HP 51→47（-4），决策 code 11，jev 5，jev-plan 5
- 第 14 层 化石追踪者: HP 47→45（-2），决策 jev-plan 6，jev 4，code 4
- 第 15 层 下水道蚌: HP 45→33（-12），决策 code 10，jev-plan 2，jev 1
- 第 17 层 灵魂异鱼: HP 54→15（-39），决策 code 23，jev-plan 15，jev 10
- 第 19 层 外骨骼虫: HP 59→60（+1），决策 jev-plan 4，code 3，jev 2
- 第 21 层 偷窃草蜢: HP 60→48（-12），决策 code 12，jev-plan 5，jev 2
- 第 22 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 48→46（-2），决策 jev-plan 11，code 8，jev 5
- 第 29 层 虱虫之祖: HP 46→45（-1），决策 jev-plan 14，code 12，jev 9
- 第 30 层 棘刺蟾蜍: HP 45→44（-1），决策 jev-plan 10，jev 6，code 5
- 第 33 层 知识恶魔: HP 65→5（-60），决策 code 35，jev-plan 12，jev 11
- 第 35 层 虔诚雕刻师: HP 57→10（-47），决策 code 16，jev-plan 14，jev 6
- 第 37 层 活体盾/高塔炮手: HP 10→10（-0），决策 jev-plan 10，jev 7，code 6
- 第 39 层 青蛙骑士: HP 10→9（-1），决策 code 23，jev 8，jev-plan 8
- 第 46 层 电球头: HP 51→37（-14），决策 jev 12，jev-plan 9，code 9
- 第 48 层 女王/火炬头聚合体: HP 58→10（-48），决策 jev-plan 17，jev 16，code 16
- 第 49 层 永世沙漏: HP 10→0（-10），决策 code 139，jev 60，jev-plan 55

### 死亡战斗：第 49 层 永世沙漏
- T8 [jev] combat/plan-choice: Jev chose plan 1/2 (冲刺 -> 永世沙漏, 防御, 致命毒药 -> 永世沙漏) with confidence 0.80; code rank 1 conf 0.80
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T8 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 致命毒药 -> 永世沙漏
- T8 [code] combat/plan: code plan (only line): end turn; hp -4, dmg 8
- T9 [code] combat/plan: code plan (only line): 闪躲翻滚, 蜃景; hp -0, dmg 7 [ending now kills by what the mod's lethal flag does not count: 18 HP lost in all, 0 of it the enemy hits after bl
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 蜃景
- T9 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 7
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 防御, 打击 -> 永世沙漏, 生存者
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 打击 -> 永世沙漏, 生存者
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 生存者
- T10 [jev] selection/choose: Jev chose 凋萎+3 with confidence 0.91 conf 0.91
- T10 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 223
- combat/plan / code: 191
- combat/plan-choice / jev: 137
- combat/plan-continue / code: 99
- reward/claim / code: 64
- map/route-follow / code: 43
- selection/choose / jev: 31
- reward/card / codex: 30
- combat/lethal / code: 24
- combat/end_turn / code: 23
- combat/least-loss / code: 23
- reward/proceed / code: 21
- combat/plan-choice+potion / jev: 12
- event/leave / code: 11
- shop/buy / codex: 11
- event/choose / codex: 8
- rest/plan / codex: 8
- rest/proceed / code: 8
- selection/curse / code: 5
- shop/leave / code: 5
- shop/open / code: 5
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- shop/plan / codex: 4
- event/act-plan / codex: 2
- map/route-change / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/take into my hand / jev: 2
- selection/upgrade / codex: 2
- event/plan / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/remove / codex: 1
- shop/buy / code: 1
- shop/discard / code: 1
- shop/discard / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：27 个
- 第 2 层 combat/plan-choice+potion: Jev chose plan 1/4 (防御, 回响斩击, 防御) with confidence 0.33; code rank 1 (0.33)
- 第 2 层 combat/plan-choice+potion: Jev chose to drink 攻击药水, then re-plan (confidence 0.25) (0.25)
- 第 2 层 selection/choose: Jev chose 中和 with confidence 0.22 (0.22)
- 第 5 层 selection/choose: Jev chose 防御 with confidence 0.13 (0.13)
- 第 6 层 selection/choose: Jev chose 打击 with confidence 0.33 (0.33)
- 第 29 层 combat/plan-choice: Jev chose plan 2/2 (斗篷与匕首, 打击 -> 虱虫之祖, 防御) with confidence 0.06; code rank 2 (0.06)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (防御) with confidence 0.30; code rank 2 (0.30)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.28; code rank 2 (0.28)
- 第 33 层 selection/choose: Jev chose 猛扑 with confidence 0.14 (0.14)
- 第 35 层 combat/plan-choice: Jev chose plan 2/3 (蜃景, 灵动步法, 小刀 -> 虔诚雕刻师) with confidence 0.25; code rank 2 (0.25)
- 第 46 层 combat/plan-choice+potion: Jev chose to drink 能力药水, then re-plan (confidence 0.17) (0.17)
- 第 46 层 selection/take into my hand: Jev chose 触媒 with confidence 0.09 (0.09)
- 第 46 层 combat/plan-choice: Jev chose plan 2/2 (匕首雨, 触媒) with confidence 0.34; code rank 2 (0.34)
- 第 46 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 电球头, 扫腿 -> 电球头, 突然一拳+ -> 电球头) with confidence 0.26; code rank 2 (0.26)
- 第 48 层 combat/plan-choice: Jev chose plan 1/4 (回响斩击, 冲刺 -> 女王) with confidence 0.28; code rank 1 (0.28)
