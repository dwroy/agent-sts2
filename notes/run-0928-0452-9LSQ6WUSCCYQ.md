## 复盘：run 9LSQ6WUSCCYQ — 阵亡，最高第 33 层

- 决策 360 个；Jev 调用 47 次，Claude 0 次，DeepSeek 0 次；token 90,167 入 / 2,024 出，约 $0.0039；用时 19.7 分钟
- 决策者：code 275，jev 45，jev-plan 38，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→51（-13），决策 code 9，code-fallback 1
- 第 5 层 噬尸蛞蝓: HP 80→72（-8），决策 code 5，jev 2，jev-plan 2
- 第 6 层 海洋混混: HP 78→69（-9），决策 code 5，jev-plan 4，jev 2
- 第 11 层 双尾鼠: HP 75→67（-8），决策 code 6
- 第 12 层 下水道蚌: HP 73→49（-24），决策 code 7，jev-plan 3，jev 2
- 第 13 层 化石追踪者: HP 55→47（-8），决策 code 7，jev 1，jev-plan 1
- 第 15 层 噬尸蛞蝓: HP 53→53（-0），决策 code 7
- 第 17 层 灵魂异鱼: HP 80→80（-0），决策 code 3
- 第 17 层 灵魂异鱼: HP 80→39（-41），决策 code 16，jev-plan 8，jev 4
- 第 19 层 地道虫: HP 73→42（-31），决策 code 10，jev-plan 3，jev 2
- 第 21 层 外骨骼虫: HP 48→37（-11），决策 code 9，jev 1，jev-plan 1
- 第 23 层 猎人杀手: HP 43→43（-0），决策 jev-plan 5，code 2，jev 2
- 第 23 层 猎人杀手: HP 43→31（-12），决策 code 9，jev-plan 2，jev 1
- 第 23 层 猎人杀手: HP 31→31（-0），决策 code 2
- 第 25 层 直飞产卵虫: HP 61→61（-0），决策 jev 2，jev-plan 2
- 第 25 层 直飞产卵虫/结实的卵: HP 61→51（-10），决策 code 9，code-fallback 1
- 第 28 层 盛碗虫（卵）/盛碗虫（石）/盛碗虫（蜜）: HP 50→31（-19），决策 code 7，jev-plan 2，jev 1
- 第 31 层 棘刺蟾蜍: HP 61→42（-19），决策 code 5，jev 2，jev-plan 1
- 第 31 层 棘刺蟾蜍: HP 42→42（-0），决策 code 2
- 第 33 层 无厌沙虫: HP 72→34（-38），决策 code 17，jev-plan 4，jev 3
- 第 33 层 无厌沙虫: HP 34→14（-20），决策 code 6

### 死亡战斗：第 33 层 无厌沙虫
- T6 [code] combat/plan: code plan (+18.1 over next): 狂乱逃离; hp -20, dmg 0
- T6 [code] combat/plan: code plan (only line): end turn; hp -20, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 防御, 狂乱逃离, 防御
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 狂乱逃离
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): end turn

### 各类决策由谁做
- combat/plan / code: 75
- combat/plan-continue / code: 50
- combat/plan-continue / jev-plan: 38
- reward/claim / code: 32
- map/route / code: 27
- combat/plan-choice / jev: 25
- combat/lethal / code: 16
- reward/proceed / code: 15
- reward/card / code: 9
- event/choose / jev: 8
- event/leave / code: 8
- rest/choose / code: 6
- rest/proceed / code: 6
- selection/add / code: 6
- map/route / jev: 5
- reward/card / jev: 5
- sphere/clear / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- combat/plan-choice / code-fallback: 2
- event/only / code: 2
- selection/take into my hand / code: 2
- selection/upgrade / code: 2
- shop/buy / code: 2
- shop/buy / jev: 2
- event/heal / code: 1
- run/finalize / code: 1
- selection/remove / code: 1
- shop/leave / code: 1
- shop/open / code: 1
- sphere/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：9 个
- 第 1 层 event/choose: Jev chose 羽翼之靴 with confidence 0.17 (0.17)
- 第 4 层 event/choose: Jev chose 分享知识 with confidence 0.20 (0.20)
- 第 8 层 event/choose: Jev chose 观察主厨 with confidence 0.11 (0.11)
- 第 11 层 reward/card: Jev chose 无情猛攻 (Attack, 2E) with confidence 0.25 (0.25)
- 第 18 层 event/choose: Jev chose 佩尔之血 with confidence 0.32 (0.32)
- 第 25 层 combat/plan-choice: Jev chose plan 1/2 (燃烧+, 打击 -> 直飞产卵虫, 头槌 -> 直飞产卵虫) with confidence 0.19; code rank 1 (0.19)
- 第 25 层 reward/card: Jev chose 连环拳 (Skill, 1E) with confidence 0.20 (0.20)
- 第 27 层 event/choose: Jev chose 再撑一会 with confidence 0.10 (0.10)
- 第 27 层 event/choose: Jev chose 再撑一会 with confidence 0.13 (0.13)
