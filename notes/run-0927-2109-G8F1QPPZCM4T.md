## 复盘：run G8F1QPPZCM4T — 阵亡，最高第 33 层

- 决策 384 个；Jev 调用 49 次，Claude 0 次，DeepSeek 0 次；token 87,904 入 / 2,201 出，约 $0.0038；用时 13.9 分钟
- 决策者：code 304，jev 46，jev-plan 31，code-fallback 3

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→56（-8），决策 code 7，jev-plan 2，code-fallback 1，jev 1
- 第 3 层 缩小甲虫: HP 62→59（-3），决策 code 8，jev-plan 4，jev 2
- 第 6 层 毛绒伏地虫: HP 72→68（-4），决策 code 5，jev-plan 2，jev 1
- 第 8 层 劫掠者刺客/劫掠者斧手/劫掠者暴徒: HP 74→47（-27），决策 code 12
- 第 13 层 蛮兽: HP 79→67（-12），决策 jev-plan 3，code 3，jev 2
- 第 14 层 墨宝: HP 73→73（-0），决策 code 1
- 第 15 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 79→68（-11），决策 code 6，code-fallback 1
- 第 17 层 同族信徒/同族神官: HP 87→13（-74），决策 code 30，jev-plan 7，jev 5
- 第 19 层 偷窃草蜢: HP 73→73（-0），决策 code 6，jev 1
- 第 19 层 偷窃草蜢: HP 73→52（-21），决策 code 6，jev 1
- 第 22 层 盛碗虫（石）/盛碗虫（蜜）: HP 58→37（-21），决策 code 12，jev-plan 4，jev 3
- 第 23 层 外骨骼虫: HP 43→37（-6），决策 code 4，jev-plan 2，jev 1，code-fallback 1
- 第 23 层 外骨骼虫: HP 37→26（-11），决策 code 2
- 第 27 层 棘刺蟾蜍: HP 58→51（-7），决策 code 7
- 第 29 层 寄生惧魔/胧光怪: HP 78→78（-0），决策 code 7
- 第 29 层 寄生惧魔/胧光怪: HP 78→71（-7），决策 code 6
- 第 30 层 感染棱柱: HP 77→6（-71），决策 code 12，jev 7，jev-plan 5
- 第 31 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 12→12（-0），决策 jev 1
- 第 31 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 12→12（-0），决策 code 9，jev 4，jev-plan 1
- 第 33 层 知识恶魔: HP 44→44（-0），决策 code 4
- 第 33 层 知识恶魔: HP 44→24（-20），决策 code 8，jev 2，jev-plan 1
- 第 33 层 知识恶魔: HP 24→10（-14），决策 code 6，jev 1

### 死亡战斗：第 33 层 知识恶魔
- T6 [code] combat/plan: code plan (+30.2 over next): 铁斩波 -> 知识恶魔, 剑柄打击 -> 知识恶魔, 御血术 -> 知识恶魔; hp -16, dmg 78
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 剑柄打击 -> 知识恶魔
- T6 [jev] combat/plan-choice: Jev chose plan 2/2 (剑柄打击 -> 知识恶魔) with confidence 0.08; code rank 2 conf 0.08
- T6 [code] combat/plan: code plan (only line): end turn; hp -14, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-20): 究极打击 -> 知识恶魔, 痛击+ -> 知识恶魔
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 痛击+ -> 知识恶魔
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-20): end turn

### 各类决策由谁做
- combat/plan / code: 87
- combat/plan-continue / code: 49
- reward/claim / code: 38
- combat/plan-choice / jev: 32
- combat/plan-continue / jev-plan: 31
- map/route / code: 30
- combat/lethal / code: 16
- reward/card / code: 15
- reward/proceed / code: 15
- event/choose / jev: 7
- rest/proceed / code: 6
- event/leave / code: 5
- rest/choose / code: 5
- combat/plan-guarded / code: 4
- selection/exhaust / code: 4
- selection/remove / code: 4
- shop/buy / code: 4
- combat/end_turn / code: 3
- combat/plan-choice / code-fallback: 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- map/route / jev: 2
- selection/curse / code: 2
- shop/buy / jev: 2
- bundle/confirm / code: 1
- rest/choose / jev: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/enchant / jev: 1
- selection/upgrade / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：12 个
- 第 5 层 event/choose: Jev chose 吃掉这颗蛋 with confidence 0.07 (0.07)
- 第 7 层 event/choose: Jev chose 读下封底 with confidence 0.22 (0.22)
- 第 12 层 event/choose: Jev chose 放入罕见药水 with confidence 0.10 (0.10)
- 第 18 层 event/choose: Jev chose 烫嘴可可 with confidence 0.22 (0.22)
- 第 19 层 combat/plan-choice: Jev chose plan 2/2 (旋风斩+) with confidence 0.32; code rank 2 (0.32)
- 第 20 层 event/choose: Jev chose 融合打击 with confidence 0.10 (0.10)
- 第 20 层 event/choose: Jev chose 融合打击 with confidence 0.06 (0.06)
- 第 21 层 shop/buy: Jev chose stop shopping with confidence 0.18 (0.18)
- 第 30 层 combat/plan-choice: Jev chose plan 2/2 (坚毅) with confidence 0.15; code rank 2 (0.15)
- 第 31 层 combat/plan-choice: Jev chose plan 1/4 (彼岸咆哮, 无惧疼痛+) with confidence 0.16; code rank 1 (0.16)
- 第 31 层 combat/plan-choice: Jev chose plan 2/4 (痛击+ -> 盛碗虫（丝）) with confidence 0.34; code rank 2 (0.34)
- 第 33 层 combat/plan-choice: Jev chose plan 2/2 (剑柄打击 -> 知识恶魔) with confidence 0.08; code rank 2 (0.08)
