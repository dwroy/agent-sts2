## 复盘：run R3AJCGQGGMR4 — 阵亡，最高第 45 层

- 决策 668 个；Jev 调用 164 次，Claude 0 次，大脑 45 次（codex 45）；token 766,020 入 / 7,845 出，约 $0.0325（Jev）；大脑 token 6,038,387 入（缓存命中 3,641,600，60%）/ 14,213 出；用时 42.4 分钟
- 决策者：code 261，jev-plan 175，jev 164，codex 68

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 56→56（-0），决策 code 13，jev-plan 6，jev 5
- 第 5 层 小啃兽: HP 56→56（-0），决策 code 6，jev-plan 5，jev 3
- 第 7 层 毛绒伏地虫: HP 56→53（-3），决策 code 6，jev-plan 5，jev 4
- 第 9 层 蛮兽: HP 53→45（-8），决策 code 7，jev-plan 6，jev 5
- 第 12 层 异蛙寄生虫/扭动虫: HP 57→47（-10），决策 code 13，jev-plan 6，jev 3
- 第 15 层 方柱构装体: HP 54→50（-4），决策 jev 9，code 5，jev-plan 4
- 第 17 层 同族信徒/同族神官: HP 62→8（-54），决策 jev 22，jev-plan 17，code 1
- 第 19 层 地道虫: HP 63→41（-22），决策 jev-plan 11，jev 9，code 1
- 第 22 层 偷窃草蜢: HP 35→27（-8），决策 jev 6，jev-plan 5，code 3
- 第 24 层 虱虫之祖: HP 27→4（-23），决策 jev-plan 13，jev 11，code 2
- 第 29 层 感染棱柱: HP 77→51（-26），决策 jev 14，jev-plan 12，code 3
- 第 30 层 外骨骼虫: HP 51→29（-22），决策 jev 11，jev-plan 6，code 1
- 第 31 层 异螨: HP 29→20（-9），决策 jev-plan 7，jev 4，code 1
- 第 33 层 无厌沙虫: HP 61→3（-58），决策 jev 27，jev-plan 26，code 16
- 第 35 层 咬人卷轴: HP 62→52（-10），决策 jev-plan 3，code 3，jev 1
- 第 37 层 活体盾/高塔炮手: HP 52→32（-20），决策 jev-plan 10，jev 7，code 2
- 第 39 层 青蛙骑士: HP 32→8（-24），决策 jev-plan 10，code 9，jev 5
- 第 43 层 守护机器人/戳刺机器人/电击机器人/组装师: HP 51→6（-45），决策 jev-plan 10，code 8，jev 7
- 第 45 层 巨斧机器人: HP 52→0（-52），决策 code 16，jev-plan 13，jev 11

### 死亡战斗：第 45 层 巨斧机器人
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击 -> 巨斧机器人
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 谋划专家+
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 弹跳药瓶
- T5 [code] combat/plan: code plan (only line): end turn; hp -10, dmg 23
- T6 [code] combat/plan: code plan (only distinct line): 触媒, 触媒; hp -0, dmg 2 [calc mismatch: solver says ending now does not kill, mod says lethal: no end-of-turn block, Regen or Buffe
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 触媒
- T6 [code] combat/mod-lethal: mod says ending the turn is lethal, solver disagrees; not ending it: 翻越撑击 [calc mismatch: solver says ending now does not kill, mod says lethal: no end-of-turn 
- T6 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 灵动步法, 防御, 防御
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 175
- combat/plan-choice+potion / jev: 95
- reward/claim / code: 48
- combat/plan / code: 42
- combat/plan-choice / jev: 39
- map/route-follow / code: 39
- combat/plan-continue / code: 34
- selection/choose / jev: 28
- combat/lethal / code: 24
- reward/card / codex: 18
- reward/proceed / code: 18
- shop/buy / codex: 13
- event/leave / code: 11
- combat/end_turn / code: 8
- event/choose / codex: 7
- rest/plan / codex: 7
- rest/proceed / code: 7
- shop/leave / code: 5
- shop/open / code: 5
- shop/plan / codex: 5
- selection/enchant / codex: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/least-loss / code: 3
- selection/add / codex: 3
- combat/mod-lethal / code: 2
- event/act-plan / codex: 2
- event/plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/upgrade / codex: 2
- combat/play / jev: 1
- combat/sandpit-guard / code: 1
- map/route-change / codex: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/discard / code: 1
- selection/remove / codex: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：23 个
- 第 7 层 combat/plan-choice: Jev chose plan 2/3 (匕首雨, 打击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.24; code rank 2 (0.24)
- 第 7 层 combat/plan-choice: Jev chose plan 1/3 (potion 虚弱药水 -> 毛绒伏地虫) with confidence 0.18; code rank 1 (0.18)
- 第 9 层 selection/choose: Jev chose 打击 with confidence 0.25 (0.25)
- 第 15 层 selection/choose: Jev chose 进阶之灾 with confidence 0.12 (0.12)
- 第 22 层 selection/choose: Jev chose 计划妥当 with confidence 0.22 (0.22)
- 第 22 层 combat/plan-choice+potion: Jev chose to drink 攻击药水, then re-plan (confidence 0.30) (0.30)
- 第 24 层 selection/choose: Jev chose 带毒刺击 with confidence 0.05 (0.05)
- 第 29 层 selection/choose: Jev chose 防御 with confidence 0.23 (0.23)
- 第 29 层 selection/choose: Jev chose 隐秘匕首 with confidence 0.13 (0.13)
- 第 30 层 selection/choose: Jev chose 防御 with confidence 0.28 (0.28)
- 第 30 层 selection/choose: Jev chose 咕嘟冒泡 with confidence 0.12 (0.12)
- 第 33 层 selection/choose: Jev chose 回响斩击 with confidence 0.11 (0.11)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.09; code rank 1 (0.09)
- 第 33 层 selection/choose: Jev chose 狂乱逃离 with confidence 0.21 (0.21)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.20; code rank 1 (0.20)
