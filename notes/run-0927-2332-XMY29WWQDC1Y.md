## 复盘：run XMY29WWQDC1Y — 阵亡，最高第 24 层

- 决策 353 个；Jev 调用 61 次，Claude 0 次，DeepSeek 0 次；token 115,214 入 / 2,914 出，约 $0.0050；用时 13.7 分钟
- 决策者：code 248，jev 60，jev-plan 44，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→60（-4），决策 code 7，jev 1，jev-plan 1
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 66→52（-14），决策 code 8，jev-plan 4，jev 2
- 第 5 层 小啃兽: HP 58→57（-1），决策 code 6，jev-plan 4，jev 3
- 第 6 层 墨宝: HP 61→60（-1），决策 code 4，jev 1，jev-plan 1
- 第 7 层 藤蔓蹒跚者: HP 55→39（-16），决策 code 11，jev 2，jev-plan 2
- 第 8 层 劫掠者弩手/劫掠者暴徒/劫掠者追踪手: HP 45→28（-17），决策 code 9
- 第 12 层 方柱构装体: HP 58→48（-10），决策 code 8，jev-plan 3，jev 1
- 第 14 层 旧日雕像: HP 54→31（-23），决策 code 6，jev 4，jev-plan 4
- 第 15 层 树叶史莱姆（小）/树枝史莱姆（小）/蛇行扼杀者: HP 37→30（-7），决策 jev-plan 4，code 4，jev 3
- 第 17 层 仪式兽: HP 60→38（-22），决策 jev 8，jev-plan 7
- 第 17 层 仪式兽: HP 38→18（-20），决策 jev 12，jev-plan 3，code 1
- 第 17 层 仪式兽: HP 18→3（-15），决策 code 6
- 第 19 层 偷窃草蜢: HP 65→44（-21），决策 code 12，jev 3，jev-plan 3，code-fallback 1
- 第 20 层 外骨骼虫: HP 50→48（-2），决策 code 10
- 第 22 层 棘刺蟾蜍: HP 54→54（-0），决策 code 3
- 第 22 层 棘刺蟾蜍: HP 54→54（-0），决策 code 2
- 第 22 层 棘刺蟾蜍: HP 54→34（-20），决策 code 6，jev-plan 4，jev 3
- 第 23 层 直飞产卵虫/结实的卵: HP 35→34（-1），决策 code 4，jev 1，jev-plan 1
- 第 23 层 幼虫/直飞产卵虫/结实的卵: HP 34→13（-21），决策 code 15，jev 5，jev-plan 1
- 第 24 层 猎人杀手: HP 19→18（-1），决策 code 4，jev 3，jev-plan 2
- 第 24 层 猎人杀手: HP 18→7（-11），决策 code 5，jev 1
- 第 24 层 猎人杀手: HP 7→7（-0），决策 code 3

### 死亡战斗：第 24 层 猎人杀手
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-10): potion 易伤药水 -> 猎人杀手, 打击 -> 猎人杀手
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-10): 打击 -> 猎人杀手
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-10): end turn

### 各类决策由谁做
- combat/plan / code: 80
- combat/plan-continue / jev-plan: 44
- combat/plan-continue / code: 33
- reward/claim / code: 32
- combat/plan-choice / jev: 26
- combat/plan-choice+potion / jev: 26
- map/route / code: 22
- reward/card / code: 14
- reward/proceed / code: 14
- combat/lethal / code: 12
- combat/least-loss / code: 6
- selection/add / code: 5
- event/leave / code: 4
- shop/buy / code: 4
- event/choose / jev: 3
- shop/buy / jev: 3
- combat/end_turn / code: 2
- rest/choose / code: 2
- rest/proceed / code: 2
- selection/discard / code: 2
- selection/exhaust / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice / code-fallback: 1
- combat/play / jev: 1
- combat/potion-now / code: 1
- event/only / code: 1
- map/route / jev: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/remove / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：13 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.28; code rank 1 (0.28)
- 第 3 层 combat/plan-choice: Jev chose plan 1/4 (狱火, 打击 -> 树叶史莱姆（小）, 打击 -> 树叶史莱姆（小）) with confidence 0.34; code rank 1 (0.34)
- 第 5 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 小啃兽, 防御, 打击 -> 小啃兽) with confidence 0.08; code rank 1 (0.08)
- 第 15 层 combat/plan-choice: Jev chose plan 1/2 (拆卸 -> 树枝史莱姆（小）, 狱火, 打击 -> 树枝史莱姆（小）) with confidence 0.01; code rank 1 (0.01)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.32; code rank 1 (0.32)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.30; code rank 1 (0.30)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.28; code rank 1 (0.28)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 马萨雷斯的赠礼 (confidence 0.21) (0.21)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (防御) with confidence 0.17; code rank 1 (0.17)
- 第 19 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 偷窃草蜢, 打击 -> 偷窃草蜢) with confidence 0.34; code rank 2 (0.34)
- 第 21 层 shop/buy: Jev chose buy 上勾拳 (39g) with confidence 0.16 (0.16)
- 第 21 层 shop/buy: Jev chose buy 无惧疼痛 (76g) with confidence 0.20 (0.20)
- 第 23 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.08; code rank 1 (0.08)
