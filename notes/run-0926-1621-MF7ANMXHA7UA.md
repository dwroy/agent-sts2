## 复盘：run MF7ANMXHA7UA — 阵亡，最高第 25 层

- 决策 317 个；Jev 调用 52 次，Claude 0 次，DeepSeek 4 次；token 77,776 入 / 2,263 出，约 $0.0034；用时 15.3 分钟
- 决策者：code 226，jev 39，jev-plan 35，code-fallback 13，deepseek 4

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 64→47（-17），决策 code 11，code-fallback 1
- 第 4 层 小啃兽: HP 53→43（-10），决策 code 5，code-fallback 1，jev 1，jev-plan 1
- 第 5 层 缩小甲虫: HP 49→47（-2），决策 code 6，jev 1，jev-plan 1
- 第 11 层 异蛙寄生虫/扭动虫: HP 71→32（-39），决策 code 17，jev-plan 6，jev 4，code-fallback 1
- 第 13 层 藤蔓蹒跚者: HP 62→43（-19），决策 code 9，jev-plan 2，code-fallback 1，jev 1
- 第 14 层 蛮兽: HP 49→37（-12），决策 code 7，jev 2，jev-plan 2
- 第 17 层 墨影幻灵: HP 67→7（-60），决策 jev-plan 14，jev 11，code-fallback 6，code 4
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 66→66（-0），决策 code-fallback 1，code 1
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 65→65（-0），决策 code 2，jev 1，jev-plan 1
- 第 19 层 盛碗虫（石）/盛碗虫（蜜）: HP 52→52（-0），决策 code 2
- 第 20 层 地道虫: HP 58→58（-0），决策 jev-plan 2，jev 1，code 1
- 第 20 层 地道虫: HP 45→45（-0），决策 code 3
- 第 20 层 地道虫: HP 45→45（-0），决策 jev 1
- 第 20 层 地道虫: HP 44→44（-0），决策 jev 1
- 第 20 层 地道虫: HP 44→42（-2），决策 jev-plan 2，jev 1，code 1
- 第 21 层 猎人杀手: HP 48→48（-0），决策 jev 1
- 第 21 层 猎人杀手: HP 47→47（-0），决策 jev 1，jev-plan 1，code 1
- 第 21 层 猎人杀手: HP 47→47（-0），决策 code 3，code-fallback 1
- 第 21 层 猎人杀手: HP 38→38（-0），决策 jev-plan 2，jev 1，code 1
- 第 21 层 猎人杀手: HP 23→23（-0），决策 code 4
- 第 21 层 猎人杀手: HP 8→8（-0），决策 code 1
- 第 23 层 外骨骼虫: HP 14→14（-0），决策 code 4
- 第 23 层 外骨骼虫: HP 14→14（-0），决策 code 2，jev 1，jev-plan 1
- 第 23 层 外骨骼虫: HP 1→1（-0），决策 code 3
- 第 25 层 残杀千足虫: HP 31→31（-0），决策 code 4，code-fallback 1
- 第 25 层 残杀千足虫: HP 31→31（-0），决策 code 3
- 第 25 层 残杀千足虫: HP 9→9（-0），决策 code 4

### 死亡战斗：第 25 层 残杀千足虫
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 预备打击 -> 残杀千足虫, 飞剑回旋镖, 防御
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 飞剑回旋镖
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan / code: 41
- combat/plan-continue / code: 37
- combat/plan-continue / jev-plan: 35
- reward/claim / code: 35
- map/route / code: 20
- selection/exhaust / code: 19
- combat/plan-choice+potion / jev: 15
- combat/plan-choice / jev: 14
- combat/lethal / code: 12
- reward/proceed / code: 11
- reward/card / code: 9
- combat/plan-choice+potion / code-fallback: 7
- combat/plan-choice / code-fallback: 6
- event/leave / code: 5
- shop/buy / code: 5
- combat/end_turn / code: 4
- map/route / jev: 4
- rest/proceed / code: 4
- combat/plan-guarded / code: 3
- event/choose / deepseek: 3
- rest/choose / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- reward/card / jev: 2
- selection/remove / code: 2
- shop/leave / code: 2
- shop/open / code: 2
- event/choose / jev: 1
- event/only / code: 1
- rest/choose / jev: 1
- run/finalize / code: 1
- selection/add / code: 1
- selection/add / jev: 1
- selection/take into my hand / deepseek: 1
- selection/transform / code: 1
- shop/buy / jev: 1

### 兜底介入（Claude/DeepSeek）：4 次（推翻 Jev 1 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.26 → o0）：Transform removes a weak Strike for a random card, best early value; pack risks bloat, Seek too slow for Act 1.
- [deepseek] 第 3 层 TNone event/choose: 同意 Jev（o0 @0.15 → o0）：不花血：本 bot 反复死于事件掉血；石剑是永久收益，符合力量/输出计划，金币只在商店有用且路线商店少。
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o1 @0.32 → o1）：牌组无力量来源，知识恶魔需力量成长速攻；烘焙手套每回合可叠加+1力量，是核心胜利条件，优于限时能量与4次升级。
- [deepseek] 第 20 层 T3 selection/take into my hand: 同意 Jev（card1 @0.21 → card1）：御血术 1 能量 15 伤害是当下最可靠的即时输出，留 2 能量给其他牌；44 血付 2 血可接受。

### Jev 低置信度（<0.35）决策：8 个
- 第 5 层 combat/plan-choice: Jev chose plan 1/2 (防御, 痛击 -> 缩小甲虫) with confidence 0.27; code rank 1 (0.27)
- 第 13 层 combat/plan-choice: Jev chose plan 2/2 (防御, 打击 -> 藤蔓蹒跚者, 飞剑回旋镖) with confidence 0.34; code rank 2 (0.34)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/2 (预备打击 -> 墨影幻灵, 防御, 双重打击 -> 墨影幻灵) with confidence 0.27; code rank 1 (0.27)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.18; code rank 1 (0.18)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.03; code rank 1 (0.03)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.03; code rank 1 (0.03)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (挑衅 -> 墨影幻灵, 预备打击 -> 墨影幻灵, 打击 -> 墨影幻灵) with confidence 0.13; code rank 1 (0.13)
- 第 20 层 combat/plan-choice: Jev chose plan 1/4 (无惧疼痛, 预备打击 -> 地道虫, 飞剑回旋镖) with confidence 0.25; code rank 1 (0.25)
