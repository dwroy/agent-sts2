## 复盘：run NHL75AQZSMFS — 阵亡，最高第 17 层

- 决策 192 个；Jev 调用 26 次，Claude 0 次，DeepSeek 0 次；token 47,566 入 / 1,171 出，约 $0.0020；用时 6.4 分钟
- 决策者：code 150，jev 25，jev-plan 16，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→53（-11），决策 code 11，jev 1，jev-plan 1
- 第 4 层 小啃兽: HP 68→55（-13），决策 code 7，code-fallback 1，jev 1，jev-plan 1
- 第 5 层 缩小甲虫: HP 61→59（-2），决策 code 7，jev-plan 2，jev 1
- 第 7 层 树叶史莱姆（中）/飞蝇菌子: HP 65→60（-5），决策 code 10，jev 4，jev-plan 4
- 第 9 层 蛮兽: HP 66→59（-7），决策 code 10，jev-plan 2，jev 1
- 第 11 层 闪光贾克斯果/飞蝇菌子: HP 65→54（-11），决策 code 9，jev-plan 3，jev 2
- 第 14 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 72→70（-2），决策 code 7，jev-plan 2，jev 1
- 第 17 层 同族信徒/同族神官: HP 76→67（-9），决策 code 4，jev 1，jev-plan 1
- 第 17 层 同族信徒/同族神官: HP 67→2（-65），决策 code 18
- 第 17 层 同族信徒/同族神官: HP 2→2（-0），决策 code 2

### 死亡战斗：第 17 层 同族信徒/同族神官
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): 防御
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-6): end turn

### 各类决策由谁做
- combat/plan / code: 40
- combat/plan-continue / code: 32
- combat/plan-continue / jev-plan: 16
- reward/claim / code: 16
- combat/plan-choice / jev: 12
- map/route / code: 10
- combat/lethal / code: 8
- reward/proceed / code: 8
- reward/card / code: 7
- map/route / jev: 6
- combat/least-loss / code: 4
- event/choose / jev: 3
- event/leave / code: 3
- rest/proceed / code: 3
- shop/buy / code: 3
- rest/choose / code: 2
- selection/take into my hand / code: 2
- selection/upgrade / code: 2
- shop/buy / jev: 2
- shop/leave / code: 2
- shop/open / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-choice / code-fallback: 1
- combat/plan-guarded / code: 1
- rest/choose / jev: 1
- run/finalize / code: 1
- selection/add / code: 1
- selection/upgrade / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：5 个
- 第 1 层 event/choose: Jev chose 羽翼之靴 with confidence 0.21 (0.21)
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.18; code rank 1 (0.18)
- 第 3 层 event/choose: Jev chose 吃下 with confidence 0.29 (0.29)
- 第 13 层 event/choose: Jev chose 耐心寻找出口 with confidence 0.03 (0.03)
- 第 15 层 shop/buy: Jev chose buy 炸弹 (89g) with confidence 0.19 (0.19)
