## 复盘：run MZCG9T5G6TBZ — 阵亡，最高第 33 层

- 决策 424 个；Jev 调用 45 次，Claude 0 次，DeepSeek 0 次；token 91,329 入 / 1,986 出，约 $0.0039；用时 19.9 分钟
- 决策者：code 346，jev 44，jev-plan 33，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→43（-21），决策 jev-plan 6，code 6，jev 4
- 第 3 层 海洋混混: HP 49→43（-6），决策 code 12，jev 2，jev-plan 2
- 第 4 层 蟾蜍蝌蚪: HP 49→38（-11），决策 code 5，jev 1
- 第 5 层 化石追踪者: HP 42→35（-7），决策 code 4，jev-plan 2，jev 1
- 第 6 层 双尾鼠: HP 41→37（-4），决策 code 7，code-fallback 1
- 第 11 层 骇鳗: HP 43→14（-29），决策 code 15，jev-plan 3，jev 2
- 第 12 层 下水道蚌: HP 20→16（-4），决策 code 16
- 第 12 层 下水道蚌: HP 16→13（-3），决策 code 2
- 第 14 层 海洋混混/钙化邪教徒: HP 43→24（-19），决策 code 8，jev-plan 2，jev 1
- 第 17 层 瀑布巨兽: HP 54→54（-0），决策 code 3
- 第 17 层 瀑布巨兽: HP 54→17（-37），决策 code 22，jev 4，jev-plan 2
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 73→73（-0），决策 code 4
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 73→71（-2），决策 code 5，jev 1，jev-plan 1
- 第 21 层 地道虫: HP 77→77（-0），决策 code 3
- 第 21 层 地道虫: HP 77→64（-13），决策 code 4
- 第 22 层 外骨骼虫: HP 70→56（-14），决策 code 7，jev-plan 2，jev 1
- 第 23 层 寄生惧魔/胧光怪: HP 62→50（-12），决策 code 7，jev 2，jev-plan 1
- 第 24 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 56→56（-0），决策 code 5
- 第 24 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 56→19（-37），决策 code 17，jev 4，jev-plan 4
- 第 28 层 感染棱柱: HP 73→22（-51），决策 code 14
- 第 30 层 幼虫/直飞产卵虫/结实的卵: HP 52→35（-17），决策 code 4，jev-plan 3，jev 2
- 第 30 层 幼虫/直飞产卵虫: HP 35→20（-15），决策 code 5
- 第 31 层 蜂群术士: HP 26→8（-18），决策 code 8，jev 4，jev-plan 3
- 第 33 层 火箭/碾碎爪: HP 34→5（-29），决策 code 14，jev 3，jev-plan 2

### 死亡战斗：第 33 层 火箭/碾碎爪
- T2 [code] combat/plan: code plan (+9.0 over next): 主宰 -> 火箭, 拆卸 -> 火箭, 熔融之拳 -> 火箭; hp -24, dmg 51
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 拆卸 -> 火箭
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 熔融之拳 -> 火箭
- T2 [code] combat/plan: code plan (only line): end turn; hp -24, dmg 0
- T3 [code] combat/plan: code plan (+8.4 over next): 暴走 -> 碾碎爪, 耸肩无视, 旋风斩; hp -4, dmg 33
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 耸肩无视
- T3 [code] combat/plan: code plan (+8.4 over next): 旋风斩; hp -4, dmg 20
- T3 [code] combat/plan: code plan (only line): end turn; hp -4, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-22): 打击 -> 火箭, 防御, 防御
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-22): end turn

### 各类决策由谁做
- combat/plan / code: 114
- combat/plan-continue / code: 56
- reward/claim / code: 47
- combat/plan-continue / jev-plan: 33
- map/route / code: 30
- combat/plan-choice / jev: 26
- combat/lethal / code: 18
- reward/proceed / code: 18
- reward/card / code: 14
- combat/least-loss / code: 6
- combat/plan-choice+potion / jev: 6
- event/leave / code: 6
- rest/choose / code: 6
- rest/proceed / code: 6
- selection/add / code: 6
- reward/card / jev: 4
- combat/plan-guarded / code: 3
- event/choose / jev: 3
- event/only / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- map/route / jev: 2
- selection/remove / code: 2
- selection/take into my hand / jev: 2
- shop/buy / code: 2
- combat/plan-choice / code-fallback: 1
- run/finalize / code: 1
- shop/buy / jev: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：9 个
- 第 1 层 event/choose: Jev chose 精准剪刀 with confidence 0.11 (0.11)
- 第 4 层 reward/card: Jev chose 拆卸 (Attack, 1E) with confidence 0.32 (0.32)
- 第 7 层 event/choose: Jev chose 光之门 with confidence 0.21 (0.21)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (薪火之源, 拆卸 -> 瀑布巨兽) with confidence 0.24; code rank 1 (0.24)
- 第 17 层 combat/plan-choice: Jev chose plan 2/4 (防御, 重锤+ -> 瀑布巨兽) with confidence 0.13; code rank 2 (0.13)
- 第 18 层 event/choose: Jev chose 南瓜蜡烛 with confidence 0.05 (0.05)
- 第 19 层 reward/card: Jev chose 劫掠 (Attack, 1E) with confidence 0.15 (0.15)
- 第 24 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.33; code rank 1 (0.33)
- 第 31 层 combat/plan-choice+potion: Jev chose to drink 流动铜液 (confidence 0.09) (0.09)
