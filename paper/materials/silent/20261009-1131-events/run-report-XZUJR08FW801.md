## 复盘：run XZUJR08FW801 — 阵亡，最高第 29 层

- 决策 471 个；Jev 调用 145 次，Claude 0 次，大脑 28 次（codex 28）；token 572,079 入 / 7,449 出，约 $0.0243（Jev）；大脑 token 3,761,214 入（缓存命中 2,108,800，56%）/ 6,996 出；用时 24.1 分钟
- 决策者：code 149，jev 145，jev-plan 137，codex 40

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 56→55（-1），决策 code 15，jev 4，jev-plan 4
- 第 3 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 55→54（-1），决策 jev-plan 7，code 6，jev 5
- 第 5 层 小啃兽: HP 54→54（-0），决策 jev-plan 7，jev 6，code 1
- 第 6 层 劫掠者斧手/劫掠者暴徒/劫掠者追踪手: HP 54→49（-5），决策 jev 10，jev-plan 9，code 3
- 第 9 层 方柱构装体: HP 49→44（-5），决策 jev 7，jev-plan 7，code 1
- 第 12 层 闪光贾克斯果/飞蝇菌子: HP 44→37（-7），决策 jev-plan 10，jev 9，code 1
- 第 14 层 旧日雕像: HP 58→31（-27），决策 jev 19，jev-plan 13，code 5
- 第 15 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 31→31（-0），决策 jev-plan 6，jev 4，code 2
- 第 17 层 墨影幻灵: HP 52→8（-44），决策 jev 23，jev-plan 18，code 1
- 第 19 层 偷窃草蜢: HP 57→57（-0），决策 jev 14，jev-plan 14
- 第 23 层 外骨骼虫: HP 46→46（-0），决策 jev 6，jev-plan 4，code 2
- 第 25 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 46→23（-23），决策 jev 15，jev-plan 13，code 1
- 第 27 层 幼虫/直飞产卵虫/结实的卵: HP 23→5（-18），决策 jev 9，jev-plan 8，code 2
- 第 29 层 寄生惧魔/胧光怪: HP 5→0（-5），决策 jev-plan 17，jev 14，code 11

### 死亡战斗：第 29 层 寄生惧魔/胧光怪
- T1 [jev] combat/plan-choice: Jev chose plan 2/4 (背刺+ -> 胧光怪, 致命毒药+ -> 胧光怪, 突然一拳+ -> 胧光怪, 打击+ -> 胧光怪, 小刀+ -> 胧光怪, 小刀+ -> 胧光怪) with confidence 0.97; code rank 2 conf 0.97
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 致命毒药+ -> 胧光怪
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 突然一拳+ -> 胧光怪
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击+ -> 胧光怪
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 小刀+ -> 胧光怪
- T1 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 小刀+ -> 胧光怪
- T1 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 7
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 防御, 毒雾, 防御, 中和+ -> 寄生惧魔
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 毒雾
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 中和+ -> 寄生惧魔
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 137
- combat/plan-choice+potion / jev: 102
- reward/claim / code: 34
- selection/choose / jev: 27
- map/route-follow / code: 25
- combat/plan-choice / jev: 16
- combat/lethal / code: 15
- combat/plan-continue / code: 15
- combat/plan / code: 14
- reward/proceed / code: 14
- reward/card / codex: 13
- event/leave / code: 6
- combat/least-loss / code: 5
- rest/plan / codex: 5
- rest/proceed / code: 5
- selection/upgrade / codex: 4
- event/choose / codex: 3
- event/plan / codex: 3
- selection/enchant / codex: 3
- shop/buy / codex: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- shop/plan / codex: 2
- combat/end_turn / code: 1
- event/act-plan / codex: 1
- event/after-discard / code: 1
- event/discard-more / code: 1
- map/route-follow / codex: 1
- map/route-only / code: 1
- map/route-plan / codex: 1
- run/finalize / code: 1
- selection/remove / codex: 1
- selection/take-planned / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：15 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (中和+ -> 树叶史莱姆（中）) with confidence 0.28; code rank 1 (0.28)
- 第 6 层 selection/choose: Jev chose 进阶之灾 with confidence 0.27 (0.27)
- 第 14 层 selection/choose: Jev chose 防御 with confidence 0.34 (0.34)
- 第 14 层 selection/choose: Jev chose 防御 with confidence 0.34 (0.34)
- 第 15 层 combat/plan-choice+potion: Jev chose plan 2/6 (背刺 -> 树枝史莱姆（中）, 毒雾+, 打击 -> 树枝史莱姆（中）, 匕首雨) with confidence 0.31; code rank 2 (0.31)
- 第 19 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.24; code rank 1 (0.24)
- 第 25 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.30; code rank 1 (0.30)
- 第 27 层 combat/plan-choice+potion: Jev chose plan 3/8 (串刺+ -> 直飞产卵虫, 隐秘匕首, potion 虚弱药水 -> 结实的卵 #1, 小刀 -> 直飞产卵虫, 小刀 -> 直飞产卵虫) with confidence 0.22; code rank 3 (0.22)
- 第 27 层 selection/choose: Jev chose 冲刺+ with confidence 0.16 (0.16)
- 第 29 层 selection/choose: Jev chose 打击+ with confidence 0.26 (0.26)
- 第 29 层 selection/choose: Jev chose 打击+ with confidence 0.22 (0.22)
- 第 29 层 selection/choose: Jev chose 打击+ with confidence 0.27 (0.27)
- 第 29 层 selection/choose: Jev chose 打击+ with confidence 0.19 (0.19)
- 第 29 层 selection/choose: Jev chose 打击+ with confidence 0.27 (0.27)
- 第 29 层 selection/choose: Jev chose 打击+ with confidence 0.25 (0.25)
