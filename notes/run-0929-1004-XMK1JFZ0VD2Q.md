## 复盘：run XMK1JFZ0VD2Q — 阵亡，最高第 33 层

- 决策 412 个；Jev 调用 66 次，Claude 0 次，DeepSeek 39 次；token 240,661 入 / 3,654 出，约 $0.0103（Jev）；DeepSeek token 778,006 入（缓存命中 551,680，71%）/ 131,033 出；用时 22.9 分钟
- 决策者：code 240，jev-plan 67，jev 66，deepseek 39

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→55（-9），决策 code 7，jev-plan 4，jev 2
- 第 3 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 61→61（-0），决策 code 9，jev 7，jev-plan 6
- 第 5 层 小啃兽: HP 67→64（-3），决策 code 8，jev 4，jev-plan 4
- 第 6 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 70→69（-1），决策 jev 7，code 6，jev-plan 4
- 第 13 层 旧日雕像: HP 75→75（-0），决策 code 7，jev 3，jev-plan 1
- 第 15 层 利齿之眼/雾菇: HP 80→76（-4），决策 code 4，jev-plan 3，jev 2
- 第 17 层 墨影幻灵: HP 80→30（-50），决策 code 14，jev 11，jev-plan 8
- 第 19 层 地道虫: HP 73→68（-5），决策 code 6，jev-plan 5，jev 3
- 第 20 层 盛碗虫（石）/盛碗虫（蜜）: HP 76→73（-3），决策 code 5，jev-plan 2，jev 1
- 第 22 层 寄生惧魔/胧光怪: HP 75→75（-0），决策 code 6，jev-plan 4，jev 3
- 第 23 层 直飞产卵虫/结实的卵: HP 80→80（-0），决策 jev 3，jev-plan 2
- 第 23 层 直飞产卵虫/结实的卵: HP 80→78（-2），决策 code 5，jev 2，jev-plan 2
- 第 25 层 异螨: HP 80→80（-0），决策 jev-plan 6，code 5，jev 4
- 第 28 层 猎人杀手: HP 87→72（-15），决策 code 5，jev-plan 4，jev 3
- 第 29 层 外骨骼虫: HP 80→66（-14），决策 jev 2，jev-plan 2，code 1
- 第 29 层 外骨骼虫: HP 66→65（-1），决策 code 4，jev 1，jev-plan 1
- 第 30 层 盛碗虫（丝）/盛碗虫（卵）/盛碗虫（石）: HP 73→61（-12），决策 jev-plan 5，code 5，jev 3
- 第 33 层 无厌沙虫: HP 87→24（-63），决策 code 19，jev 5，jev-plan 4
- 第 33 层 无厌沙虫: HP 24→24（-0），决策 code 4

### 死亡战斗：第 33 层 无厌沙虫
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 狂乱逃离, 打击 -> 无厌沙虫, 狂乱逃离
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 无厌沙虫
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 狂乱逃离
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): end turn

### 各类决策由谁做
- combat/plan-continue / jev-plan: 67
- combat/plan / code: 58
- combat/plan-choice / jev: 53
- reward/claim / code: 39
- combat/plan-continue / code: 34
- map/route-follow / code: 29
- combat/lethal / code: 20
- reward/card / deepseek: 15
- reward/proceed / code: 15
- combat/plan-choice+potion / jev: 13
- rest/choose / deepseek: 6
- rest/proceed / code: 6
- shop/buy / deepseek: 6
- combat/plan-potion / code: 5
- selection/upgrade / deepseek: 5
- event/choose / deepseek: 4
- event/leave / code: 4
- shop/buy / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/least-loss / code: 3
- map/route-plan / deepseek: 2
- selection/add / code: 2
- selection/take into my hand / code: 2
- map/route / code: 1
- run/finalize / code: 1
- selection/remove / deepseek: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：6 个
- 第 2 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.22; code rank 2 (0.22)
- 第 3 层 combat/plan-choice: Jev chose plan 4/4 (防御, 防御) with confidence 0.29; code rank - (rollout's best line, added) (0.29)
- 第 3 层 combat/plan-choice: Jev chose plan 2/3 (打击 -> 树叶史莱姆（中）) with confidence 0.19; code rank 2 (0.19)
- 第 5 层 combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 小啃兽, 防御) with confidence 0.33; code rank 1 (0.33)
- 第 17 层 combat/plan-choice: Jev chose plan 3/3 (防御, 防御, 打击 -> 墨影幻灵) with confidence 0.13; code rank 3 (0.13)
- 第 25 层 combat/plan-choice: Jev chose plan 3/7 (燃烧+, 上勾拳 -> 异螨, 防御) with confidence 0.34; code rank 3 (0.34)
