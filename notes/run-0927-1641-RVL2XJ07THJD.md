## 复盘：run RVL2XJ07THJD — 阵亡，最高第 31 层

- 决策 431 个；Jev 调用 65 次，Claude 0 次，DeepSeek 6 次；token 116,757 入 / 3,052 出，约 $0.0050；用时 20.8 分钟
- 决策者：code 315，jev 58，jev-plan 45，code-fallback 7，deepseek 6

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→60（-4），决策 code 7，jev 1，jev-plan 1
- 第 5 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 66→55（-11），决策 code 7，jev-plan 5，jev 4
- 第 7 层 缩小甲虫: HP 61→61（-0），决策 code 7，jev-plan 2，jev 1
- 第 8 层 闪光贾克斯果/飞蝇菌子: HP 67→39（-28），决策 jev 5，code 4，code-fallback 1，jev-plan 1
- 第 9 层 小啃兽: HP 45→19（-26），决策 code 10，jev 4，jev-plan 3
- 第 12 层 毛绒伏地虫/缩小甲虫: HP 49→37（-12），决策 code 7，jev 5，jev-plan 2
- 第 12 层 毛绒伏地虫/缩小甲虫: HP 37→34（-3），决策 code 3
- 第 14 层 旧日雕像: HP 64→36（-28），决策 code 12，jev-plan 6，jev 5
- 第 15 层 树枝史莱姆（中）/蛇行扼杀者: HP 42→29（-13），决策 code 14，jev 2，jev-plan 1，code-fallback 1
- 第 17 层 墨影幻灵: HP 59→59（-0），决策 code 1
- 第 17 层 墨影幻灵: HP 59→26（-33），决策 code 28，jev 6，jev-plan 2
- 第 19 层 外骨骼虫: HP 70→52（-18），决策 code 7，jev 3，jev-plan 2，code-fallback 1
- 第 22 层 地道虫: HP 58→39（-19），决策 jev 5，jev-plan 5，code 5
- 第 22 层 地道虫: HP 39→30（-9），决策 code 3
- 第 25 层 虱虫之祖: HP 34→8（-26），决策 code 18，jev-plan 7，jev 4，code-fallback 2
- 第 29 层 幼虫/直飞产卵虫/结实的卵: HP 36→19（-17），决策 code 13，jev 7，jev-plan 5，code-fallback 1
- 第 30 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 25→24（-1），决策 code 13，jev-plan 3，jev 2
- 第 30 层 熟睡甲虫: HP 24→17（-7），决策 code 7
- 第 30 层 熟睡甲虫: HP 17→10（-7），决策 code 3
- 第 31 层 残杀千足虫: HP 14→1（-13），决策 code 10，code-fallback 1

### 死亡战斗：第 31 层 残杀千足虫
- T1 [code-fallback] combat/plan-choice: Jev chose an attack potion below code rank 1 at 0.39 in a elite fight; using the code-best plan
- T1 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩
- T1 [code] combat/plan-continue: continuing the code-chosen plan: potion 爆炸安瓿
- T1 [code] combat/plan: code plan (only line): end turn; hp -10, dmg 0 [calc mismatch: solver says ending now does not kill, mod says lethal]
- T2 [code] combat/plan: code plan (only line): 血墙, 巨像; hp -3, dmg 0
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 巨像
- T2 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0 [calc mismatch: solver says ending now does not kill, mod says lethal]
- T3 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 22): 耸肩无视, 挑衅 -> 残杀千足虫, 突破
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): 挑衅 -> 残杀千足虫, 拆卸 -> 残杀千足虫
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 拆卸 -> 残杀千足虫
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): end turn

### 各类决策由谁做
- combat/plan / code: 95
- combat/plan-continue / code: 51
- combat/plan-choice / jev: 50
- combat/plan-continue / jev-plan: 45
- reward/claim / code: 37
- map/route / code: 27
- combat/lethal / code: 20
- reward/proceed / code: 15
- reward/card / code: 13
- combat/plan-choice / code-fallback: 7
- event/leave / code: 7
- shop/buy / code: 7
- combat/plan-guarded / code: 6
- combat/plan-choice+potion / jev: 4
- rest/choose / code: 4
- rest/proceed / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/least-loss / code: 3
- event/choose / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- combat/end_turn / code: 2
- combat/plan-potion / code: 2
- map/route / jev: 2
- selection/add / code: 2
- selection/exhaust / code: 2
- event/choose / jev: 1
- event/only / code: 1
- map/route / deepseek: 1
- reward/card / deepseek: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/remove / code: 1
- selection/take into my hand / deepseek: 1

### 兜底介入（Claude/DeepSeek）：6 次（推翻 Jev 5 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.32 → o0）：精英额外抽2牌+1能量全程有效，A8精英更多；变形1张收益小，金币换附魔不值。
- [deepseek] 第 3 层 TNone event/choose: 推翻 Jev（o1 @0.05 → o0）：A8 前3层HP比金币贵，保留83%血为精英；空药水栏正好装满2瓶，Vantom战兜底，坏药水还能卖钱。
- [deepseek] 第 8 层 T4 map/route: 同意 Jev（n0 @0.26 → n0）：HP 45/80 (56%) is below the 80% elite threshold; deck lacks strength and has only 2 block cards. Take the safe Monster p
- [deepseek] 第 12 层 T5 reward/card: 推翻 Jev（card0 @0.15 → card2）：Deck needs block before Vantom (3/5); 坚毅 upgraded by 剃刀牙 gives 9 block. 劫掠's single 6-damage hit is weak vs 9 Slippery s
- [deepseek] 第 17 层 T1 selection/take into my hand: 推翻 Jev（card0 @0.21 → card1）：4 hits strip 4 Slippery layers for 1 energy — best turn-1 play vs Vantom; single big hits only remove 1 layer each.
- [deepseek] 第 23 层 TNone event/choose: 推翻 Jev（o1 @0.24 → o0）：Deck has zero power/growth and needs strength; a random Power can be Demon Form/Inflame, while random 0-cost cards are u

### Jev 低置信度（<0.35）决策：16 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.34; code rank 1 (0.34)
- 第 8 层 combat/plan-choice: Jev chose plan 1/3 (旋风斩) with confidence 0.17; code rank 1 (0.17)
- 第 12 层 combat/plan-choice: Jev chose plan 1/4 (挑衅 -> 毛绒伏地虫, 剑柄打击 -> 毛绒伏地虫, 旋风斩) with confidence 0.34; code rank 1 (0.34)
- 第 12 层 combat/plan-choice: Jev chose plan 1/4 (防御, 耸肩无视, 坚毅) with confidence 0.34; code rank 1 (0.34)
- 第 12 层 combat/plan-choice: Jev chose plan 1/2 (坚毅) with confidence 0.29; code rank 1 (0.29)
- 第 14 层 combat/plan-choice: Jev chose plan 1/5 (打击 -> 旧日雕像, 狱火, 打击 -> 旧日雕像, 剑柄打击 -> 旧日雕像, potion 敏捷药水) with confidence 0.32; code rank 1 (0.32)
- 第 14 层 combat/plan-choice: Jev chose plan 3/4 (防御, 防御, 剑柄打击+ -> 旧日雕像) with confidence 0.34; code rank 3 (0.34)
- 第 15 层 combat/plan-choice: Jev chose plan 3/4 (狱火, 防御, 剑柄打击 -> 树枝史莱姆（中）) with confidence 0.30; code rank 3; HP guard: plan 3 (狱火, 防御, 剑柄打击 -> 树枝史莱姆（中）) loses 14 HP, more than 8  (0.30)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (挑衅 -> 墨影幻灵, 耸肩无视) with confidence 0.24; code rank 1 (0.24)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (剑柄打击 -> 墨影幻灵, 坚毅) with confidence 0.23; code rank 1 (0.23)
- 第 17 层 combat/plan-choice: Jev chose plan 1/4 (剑柄打击+ -> 墨影幻灵, 旋风斩) with confidence 0.29; code rank 1 (0.29)
- 第 17 层 combat/plan-choice: Jev chose plan 2/4 (防御+, 剑柄打击+ -> 墨影幻灵) with confidence 0.21; code rank 2 (0.21)
- 第 25 层 combat/plan-choice: Jev chose plan 1/2 (potion 迅捷药水) with confidence 0.13; code rank 1 (0.13)
- 第 29 层 combat/plan-choice+potion: Jev chose plan 1/3 (旋风斩+) with confidence 0.20; code rank 1; HP guard: plan 1 (旋风斩+) loses 24 HP, more than 6 over the cheapest line, playing plan 3 ( (0.20)
- 第 29 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.23; code rank 1 (0.23)
