## 复盘：run VAC6Z1PZ1QJG — 阵亡，最高第 48 层

- 决策 1185 个；Jev 调用 306 次，Claude 0 次，大脑 51 次（codex 51）；token 1,905,477 入 / 15,555 出，约 $0.0807（Jev）；大脑 token 6,786,329 入（缓存命中 3,831,168，56%）/ 12,547 出；用时 59.7 分钟
- 决策者：code 450，jev-plan 357，jev 306，codex 72

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 56→48（-8），决策 code 10，jev-plan 8，jev 6
- 第 4 层 小啃兽: HP 48→48（-0），决策 code 7，jev-plan 5，jev 2
- 第 5 层 毛绒伏地虫: HP 48→48（-0），决策 code 6，jev 4，jev-plan 4
- 第 11 层 多尼斯异鸟: HP 77→41（-36），决策 jev-plan 11，jev 9，code 6
- 第 13 层 藤蔓蹒跚者: HP 64→64（-0），决策 jev-plan 5，code 4，jev 1
- 第 14 层 异蛙寄生虫/扭动虫: HP 64→57（-7），决策 code 18，jev 3
- 第 15 层 利齿之眼/雾菇: HP 57→57（-0），决策 jev-plan 4，code 4，jev 2
- 第 17 层 墨影幻灵: HP 77→54（-23），决策 code 16，jev 12，jev-plan 11
- 第 19 层 偷窃草蜢: HP 72→54（-18），决策 code 12，jev-plan 5，jev 2
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 54→54（-0），决策 jev-plan 4，jev 1，code 1
- 第 22 层 异螨: HP 77→50（-27），决策 jev-plan 10，jev 5，code 5
- 第 23 层 外骨骼虫: HP 50→41（-9），决策 code 6，jev 5，jev-plan 4
- 第 27 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 64→57（-7），决策 jev-plan 9，jev 4，code 4
- 第 30 层 幼虫/直飞产卵虫/结实的卵: HP 62→53（-9），决策 jev 16，jev-plan 16，code 3
- 第 33 层 火箭/碾碎爪: HP 75→7（-68），决策 jev-plan 26，jev 19，code 11
- 第 35 层 虔诚雕刻师: HP 63→55（-8），决策 jev-plan 12，code 11，jev 4
- 第 36 层 战斗好伙伴V1.0: HP 60→60（-0），决策 code 9，jev 2，jev-plan 2
- 第 37 层 活体盾/高塔炮手: HP 60→57（-3），决策 jev-plan 10，jev 9，code 6
- 第 39 层 失落之物/遗忘之物: HP 51→30（-21），决策 code 12，jev 11，jev-plan 10
- 第 42 层 猫头鹰法官: HP 53→23（-30），决策 jev 26，jev-plan 21，code 1
- 第 44 层 巨斧机器人: HP 40→37（-3），决策 jev 30，jev-plan 26，code 2
- 第 48 层 女王/火炬头聚合体: HP 67→0（-67），决策 jev-plan 154，jev 133，code 125

### 死亡战斗：第 48 层 女王/火炬头聚合体
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 预判+
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T10 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 女王
- T10 [code] combat/end_turn: no playable cards; ending the turn
- T11 [code] combat/plan: code plan (only distinct line): 小刀 -> 女王, 匕首雨+, 中和+ -> 女王; hp -0, dmg 33
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 匕首雨+
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 中和+ -> 女王
- T11 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 13
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-23): 小刀 -> 女王, 坚韧之环, 弹跳药瓶
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 坚韧之环
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 弹跳药瓶
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-23): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 357
- combat/plan-choice / jev: 168
- combat/plan / code: 127
- combat/plan-choice+potion / jev: 85
- combat/plan-continue / code: 74
- reward/claim / code: 63
- selection/choose / jev: 43
- map/route-follow / code: 42
- combat/end_turn / code: 36
- combat/lethal / code: 31
- reward/proceed / code: 22
- reward/card / codex: 20
- event/leave / code: 13
- rest/plan / codex: 12
- combat/least-loss / code: 9
- selection/take into my hand / jev: 9
- event/choose / codex: 7
- rest/proceed / code: 7
- selection/upgrade / codex: 7
- shop/buy / codex: 7
- chest/open / code: 4
- chest/proceed / code: 4
- chest/relic / code: 4
- event/plan / codex: 4
- shop/leave / code: 3
- shop/open / code: 3
- shop/plan / codex: 3
- event/act-plan / codex: 2
- map/route-follow / codex: 2
- map/route-only / code: 2
- selection/add / codex: 2
- selection/remove / codex: 2
- combat/plan-choice+potion-lethal / jev: 1
- event/only / code: 1
- map/route-change / codex: 1
- map/route-plan / codex: 1
- rest/after-discard / code: 1
- rest/plan / code: 1
- run/finalize / code: 1
- selection/enchant / codex: 1
- selection/free-card / code: 1
- selection/take into my hand / code: 1
- selection/transform / codex: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：56 个
- 第 5 层 combat/plan-choice+potion: Jev chose plan 1/3 (背刺 -> 毛绒伏地虫, 投掷匕首 -> 毛绒伏地虫, 中和 -> 毛绒伏地虫, 防御, 打击 -> 毛绒伏地虫) with confidence 0.28; code rank 1 (0.28)
- 第 5 层 selection/choose: Jev chose 打击 with confidence 0.32 (0.32)
- 第 5 层 combat/plan-choice+potion: Jev chose to drink 攻击药水, then re-plan (confidence 0.28) (0.28)
- 第 17 层 selection/choose: Jev chose 进阶之灾 with confidence 0.30 (0.30)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 攻击药水, then re-plan (confidence 0.24) (0.24)
- 第 17 层 selection/choose: Jev chose 伤口 with confidence 0.33 (0.33)
- 第 27 层 combat/plan-choice: Jev chose plan 1/5 (羽化, potion 格挡药水, potion 铁心药水) with confidence 0.33; code rank 1 (0.33)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 1/3 (背刺 -> 直飞产卵虫, 毒雾, 后空翻, 中和+ -> 直飞产卵虫) with confidence 0.27; code rank 1 (0.27)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 1/3 (中和+ -> 直飞产卵虫) with confidence 0.11; code rank 1 (0.11)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 1/3 (end turn) with confidence 0.19; code rank 1 (0.19)
- 第 30 层 selection/take into my hand: Jev chose 飞镖 with confidence 0.31 (0.31)
- 第 30 层 combat/plan-choice: Jev chose plan 1/8 (斗篷与匕首, 无尽刀刃, 防御) with confidence 0.25; code rank 1 (0.25)
- 第 30 层 combat/plan-choice: Jev chose plan 1/6 (无尽刀刃, 防御, 小刀 -> 直飞产卵虫) with confidence 0.21; code rank 1 (0.21)
- 第 33 层 combat/plan-choice: Jev chose plan 11/11 (切割 -> 火箭, 偏折, 无尽刀刃, 后空翻) with confidence 0.26; code rank - (rollout's best line, added) (0.26)
- 第 33 层 combat/plan-choice: Jev chose plan 1/3 (potion 格挡药水) with confidence 0.25; code rank 1 (0.25)
