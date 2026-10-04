## 复盘：run QUG1DSDARAXU — 阵亡，最高第 23 层

- 决策 306 个；Jev 调用 56 次，Claude 0 次，DeepSeek 28 次；token 154,369 入 / 2,560 出，约 $0.0066（Jev）；DeepSeek token 524,184 入（缓存命中 370,176，71%）/ 67,946 出；用时 16.4 分钟
- 决策者：code 163，jev-plan 59，jev 56，deepseek 28

### 战斗掉血（按层）
- 第 2 层 缩小甲虫: HP 64→53（-11），决策 code 10，jev-plan 8，jev 4
- 第 4 层 毛绒伏地虫: HP 59→58（-1），决策 code 6，jev-plan 2，jev 1
- 第 5 层 小啃兽: HP 64→61（-3），决策 jev-plan 3，code 2，jev 1
- 第 6 层 蛮兽: HP 67→38（-29），决策 jev-plan 7，code 6，jev 4
- 第 8 层 多尼斯异鸟: HP 68→20（-48），决策 jev-plan 7，code 6，jev 4
- 第 11 层 闪光贾克斯果/飞蝇菌子: HP 18→8（-10），决策 jev 3，jev-plan 3，code 3
- 第 13 层 雾菇: HP 38→38（-0），决策 jev 1
- 第 13 层 利齿之眼/雾菇: HP 38→33（-5），决策 jev-plan 3，code 3，jev 2
- 第 14 层 小啃兽: HP 39→24（-15），决策 jev 6，jev-plan 3，code 2
- 第 17 层 墨影幻灵: HP 54→1（-53），决策 code 13，jev 7，jev-plan 7
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 65→62（-3），决策 code 5，jev 1，jev-plan 1
- 第 20 层 地道虫: HP 68→48（-20），决策 code 6，jev 5，jev-plan 5
- 第 21 层 直飞产卵虫/结实的卵: HP 54→54（-0），决策 jev 4，jev-plan 3
- 第 21 层 幼虫/直飞产卵虫/结实的卵: HP 54→11（-43），决策 jev 4，code 3，jev-plan 3
- 第 23 层 寄生惧魔/胧光怪: HP 17→2（-15），决策 code 12，jev 9，jev-plan 4

### 死亡战斗：第 23 层 寄生惧魔/胧光怪
- T4 [jev] combat/plan-choice: Jev chose plan 1/2 (岩石铠甲, 火焰屏障) with confidence 0.21; code rank 1 conf 0.21
- T4 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 火焰屏障
- T4 [code] combat/plan: code plan (only line): end turn; hp -12, dmg 0 [calc mismatch: solver says ending now does not kill, mod says lethal]
- T5 [code] combat/plan: code plan (only distinct line): 愤怒 -> 寄生惧魔, 打击 -> 寄生惧魔, 防御, 双重打击 -> 胧光怪; hp -0, dmg 43
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 寄生惧魔
- T5 [code] combat/plan: code plan (only distinct line): 防御, 双重打击 -> 胧光怪; hp -0, dmg 26
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 胧光怪
- T5 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-10): 无情猛攻 -> 寄生惧魔, 打击 -> 寄生惧魔
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 寄生惧魔
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 防御
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 59
- combat/plan / code: 43
- reward/claim / code: 32
- combat/plan-choice / jev: 29
- combat/plan-choice+potion / jev: 27
- combat/plan-continue / code: 17
- map/route-follow / code: 15
- combat/lethal / code: 12
- reward/card / deepseek: 12
- reward/proceed / code: 12
- selection/discard / code: 5
- event/choose / deepseek: 4
- event/leave / code: 4
- map/route / code: 4
- shop/buy / deepseek: 4
- combat/least-loss / code: 3
- map/route-plan / deepseek: 3
- rest/choose / deepseek: 3
- rest/proceed / code: 3
- selection/confirm / code: 2
- selection/remove / deepseek: 2
- shop/leave / code: 2
- shop/open / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/end_turn / code: 1
- combat/plan-potion / code: 1
- run/finalize / code: 1
- shop/buy / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：12 个
- 第 6 层 combat/plan-choice: Jev chose plan 2/2 (防御, 坚韧之环) with confidence 0.17; code rank 2 (0.17)
- 第 6 层 combat/plan-choice: Jev chose plan 3/3 (打击 -> 蛮兽, 打击 -> 蛮兽, 打击 -> 蛮兽) with confidence 0.23; code rank 3 (0.23)
- 第 11 层 combat/plan-choice+potion: Jev chose plan 4/8 (potion 肌肉药水, 打击 -> 闪光贾克斯果, 打击 -> 飞蝇菌子, 突破) with confidence 0.34; code rank 4 (0.34)
- 第 11 层 combat/plan-choice+potion: Jev chose plan 1/6 (打击 -> 闪光贾克斯果, 打击 -> 闪光贾克斯果, 突破) with confidence 0.26; code rank 1 (0.26)
- 第 13 层 combat/plan-choice+potion: Jev chose to drink 赌徒特酿, then re-plan (confidence 0.31) (0.31)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.11; code rank 1 (0.11)
- 第 20 层 combat/plan-choice: Jev chose plan 2/3 (势不可当, 打击 -> 地道虫) with confidence 0.33; code rank 2 (0.33)
- 第 20 层 combat/plan-choice: Jev chose plan 1/3 (与我一战！ -> 地道虫, 打击 -> 地道虫) with confidence 0.21; code rank 1 (0.21)
- 第 21 层 combat/plan-choice+potion: Jev chose plan 1/2 (双重打击 -> 直飞产卵虫, 打击 -> 直飞产卵虫, 打击 -> 直飞产卵虫) with confidence 0.26; code rank 1 (0.26)
- 第 21 层 combat/plan-choice+potion: Jev chose plan 1/2 (飞剑回旋镖, 火焰屏障) with confidence 0.31; code rank 1 (0.31)
- 第 23 层 combat/plan-choice+potion: Jev chose to drink 士兵炖汤 (confidence 0.08) (0.08)
- 第 23 层 combat/plan-choice: Jev chose plan 1/2 (岩石铠甲, 火焰屏障) with confidence 0.21; code rank 1 (0.21)
