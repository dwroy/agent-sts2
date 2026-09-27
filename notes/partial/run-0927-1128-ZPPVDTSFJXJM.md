## 复盘：run ZPPVDTSFJXJM — 未结束，最高第 33 层

- 决策 434 个；Jev 调用 49 次，Claude 0 次，DeepSeek 0 次；token 66,796 入 / 1,960 出，约 $0.0029；用时 16.7 分钟
- 决策者：code 336，jev-plan 49，jev 45，code-fallback 4

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→61（-3），决策 code 6，code-fallback 1
- 第 3 层 海洋混混: HP 67→58（-9），决策 code 8，jev-plan 2，jev 1
- 第 4 层 噬尸蛞蝓: HP 64→64（-0），决策 code 4
- 第 6 层 卑鄙地精/地精佣兵/胖地精: HP 70→39（-31），决策 code 11，jev-plan 6，jev 4
- 第 9 层 下水道蚌: HP 45→31（-14），决策 code 12，jev-plan 2，jev 1
- 第 11 层 噬尸蛞蝓: HP 37→37（-0），决策 code 4，jev-plan 3，jev 1
- 第 13 层 花园幽灵鳗: HP 67→63（-4），决策 code 12，jev 3，jev-plan 1
- 第 15 层 鬼祟珊瑚群: HP 69→32（-37），决策 code 15，jev-plan 2，jev 1
- 第 17 层 灵魂异鱼: HP 62→16（-46），决策 code 25，jev-plan 12，jev 5
- 第 19 层 偷窃草蜢: HP 68→57（-11），决策 code 6，code-fallback 1
- 第 20 层 地道虫: HP 63→56（-7），决策 code 13
- 第 21 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 62→59（-3），决策 code 8
- 第 22 层 异螨: HP 65→55（-10），决策 code 8，jev-plan 2，code-fallback 2，jev 1
- 第 24 层 蜂群术士: HP 61→13（-48），决策 code 23
- 第 28 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 67→62（-5），决策 code 14，jev-plan 2，jev 1
- 第 29 层 啃咬机: HP 68→58（-10），决策 code 12
- 第 31 层 棘刺蟾蜍: HP 64→46（-18），决策 code 13，jev 1，jev-plan 1
- 第 33 层 火箭/碾碎爪: HP 76→73（-3），决策 jev-plan 8，jev 2，code 2
- 第 33 层 火箭/碾碎爪: HP 73→30（-43），决策 jev-plan 8，code 7，jev 6

### 各类决策由谁做
- combat/plan-continue / code: 89
- combat/plan / code: 79
- combat/plan-continue / jev-plan: 49
- reward/claim / code: 43
- map/route / code: 26
- combat/plan-choice / jev: 20
- combat/lethal / code: 18
- reward/proceed / code: 17
- combat/end_turn / code: 16
- reward/card / code: 14
- combat/plan-choice+potion / jev: 7
- event/leave / code: 6
- map/route / jev: 6
- event/choose / jev: 5
- rest/proceed / code: 5
- combat/plan-choice / code-fallback: 4
- rest/choose / code: 4
- reward/card / jev: 3
- shop/buy / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- selection/remove / code: 2
- shop/buy / jev: 2
- shop/leave / code: 2
- shop/open / code: 2
- combat/potion-now / code: 1
- rest/choose / jev: 1
- selection/add / code: 1
- selection/choose / jev: 1
- selection/take into my hand / code: 1
- selection/transform / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：18 个
- 第 4 层 map/route: Jev chose Shop (row 4, col 5) with confidence 0.30 (0.30)
- 第 5 层 map/route: Jev chose Monster (row 5, col 6) with confidence 0.13 (0.13)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (防御, 痛击 -> 地精佣兵, 欺凌 -> 地精佣兵) with confidence 0.34; code rank 1 (0.34)
- 第 7 层 event/choose: Jev chose 光之门 with confidence 0.14 (0.14)
- 第 9 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 下水道蚌, 闪亮登场, 打击+ -> 下水道蚌) with confidence 0.31; code rank 1; HP guard: plan 1 (痛击 -> 下水道蚌, 闪亮登场, 打击+ -> 下水道蚌) loses 10 HP, mo (0.31)
- 第 15 层 combat/plan-choice: Jev chose plan 2/2 (打击+ -> 鬼祟珊瑚群, 防御, 防御) with confidence 0.16; code rank 2 (0.16)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 灵魂异鱼, 扯碎 -> 灵魂异鱼) with confidence 0.12; code rank 1; HP guard: plan 1 (打击 -> 灵魂异鱼, 扯碎 -> 灵魂异鱼) loses 6 HP, more than 5 over  (0.12)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (预备打击 -> 灵魂异鱼, 打击+ -> 灵魂异鱼, 踩踏, potion 消亡粉末 -> 灵魂异鱼) with confidence 0.26; code rank 1; HP guard: plan 1 (预备打击 -> 灵魂异鱼, 打击+ -> 灵魂异鱼 (0.26)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (呼唤, 呼唤, 挑衅 -> 灵魂异鱼) with confidence 0.05; code rank 2 [calc mismatch: solver says ending now kills, mod says safe] (0.05)
- 第 18 层 event/choose: Jev chose 营养汤 with confidence 0.26 (0.26)
- 第 23 层 event/choose: Jev chose 用火烧杀 with confidence 0.13 (0.13)
- 第 28 层 reward/card: Jev chose skip the card reward with confidence 0.03 (0.03)
- 第 29 层 reward/card: Jev chose skip the card reward with confidence 0.05 (0.05)
- 第 30 层 shop/buy: Jev chose stop shopping with confidence 0.14 (0.14)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 3/4 (防御, 挑衅 -> 碾碎爪, 双重打击 -> 碾碎爪) with confidence 0.27; code rank 3 (0.27)
