## 复盘：run GL2UHZGJ7P8M — 阵亡，最高第 33 层

- 决策 395 个；Jev 调用 46 次，Claude 0 次，DeepSeek 5 次；token 75,783 入 / 2,085 出，约 $0.0033；用时 20.3 分钟
- 决策者：code 299，jev-plan 45，jev 40，code-fallback 6，deepseek 5

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 64→52（-12），决策 code 11，jev 1，jev-plan 1
- 第 3 层 海洋混混: HP 58→54（-4），决策 code 8，code-fallback 2
- 第 5 层 淤泥旋螺: HP 60→48（-12），决策 code 6，code-fallback 2，jev 1
- 第 9 层 花园幽灵鳗: HP 78→63（-15），决策 code 13，jev-plan 3，jev 1
- 第 11 层 鬼祟珊瑚群: HP 69→69（-0），决策 code 1
- 第 11 层 鬼祟珊瑚群: HP 69→47（-22），决策 code 9，jev-plan 4，jev 2
- 第 12 层 化石追踪者: HP 39→30（-9），决策 code 4，code-fallback 1
- 第 14 层 潮湿邪教徒/钙化邪教徒: HP 60→60（-0），决策 jev-plan 3，jev 2，code 1
- 第 14 层 潮湿邪教徒: HP 60→59（-1），决策 code 2，jev 1，jev-plan 1
- 第 15 层 骇鳗: HP 65→55（-10），决策 code 7，jev 2，jev-plan 2
- 第 15 层 骇鳗: HP 55→55（-0），决策 code 1
- 第 15 层 骇鳗: HP 55→37（-18），决策 code 3，jev 1，jev-plan 1
- 第 17 层 瀑布巨兽: HP 67→67（-0），决策 code 1
- 第 17 层 瀑布巨兽: HP 67→67（-0），决策 code 4，jev-plan 3，jev 1
- 第 17 层 瀑布巨兽: HP 67→35（-32），决策 code 8，jev-plan 5，jev 4
- 第 17 层 瀑布巨兽: HP 35→32（-3），决策 code 9
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 70→63（-7），决策 code 7
- 第 21 层 地道虫: HP 69→65（-4），决策 code 6，jev-plan 5，jev 4
- 第 22 层 棘刺蟾蜍: HP 71→56（-15），决策 code 7，jev-plan 4，jev 2，code-fallback 1
- 第 28 层 蜂群术士: HP 57→48（-9），决策 jev-plan 4，jev 3，code 1
- 第 28 层 蜂群术士: HP 48→46（-2），决策 code 6
- 第 30 层 猎人杀手: HP 52→31（-21），决策 code 5，jev 3，jev-plan 2
- 第 31 层 外骨骼虫: HP 37→22（-15），决策 jev 2，jev-plan 2，code 2
- 第 31 层 外骨骼虫: HP 22→22（-0），决策 code 3
- 第 33 层 火箭/碾碎爪: HP 52→45（-7），决策 jev-plan 5，jev 4，code 3
- 第 33 层 火箭/碾碎爪: HP 45→1（-44），决策 code 13

### 死亡战斗：第 33 层 火箭/碾碎爪
- T4 [code] combat/plan-guarded: code plan 双重打击 -> 火箭, 彼岸咆哮 loses 30 HP, over the HP guard bound; playing 耸肩无视, 头槌 -> 火箭, 双重打击 -> 火箭, 防御 instead (hp -21, dmg 27)
- T4 [code] combat/plan: code plan (+12.0 over next): 双重打击 -> 火箭, 旋风斩; hp -24, dmg 42
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩
- T4 [code] combat/plan: code plan (only line): end turn; hp -24, dmg 0
- T5 [code] combat/plan: code plan (only distinct line): 痛击 -> 碾碎爪, 预备打击 -> 碾碎爪, 打击 -> 碾碎爪; hp -12, dmg 40
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 预备打击 -> 碾碎爪
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 碾碎爪
- T5 [code] combat/plan: code plan (only line): end turn; hp -12, dmg 0 [calc mismatch: solver says ending now does not kill, mod says lethal]
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): 防御, 挑衅+ -> 碾碎爪, 挑衅 -> 碾碎爪
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 挑衅+ -> 碾碎爪
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 挑衅 -> 碾碎爪
- T6 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-1): end turn

### 各类决策由谁做
- combat/plan / code: 71
- combat/plan-continue / jev-plan: 45
- combat/plan-continue / code: 44
- reward/claim / code: 44
- map/route / code: 28
- combat/plan-choice / jev: 27
- reward/card / code: 17
- reward/proceed / code: 17
- combat/lethal / code: 16
- shop/buy / code: 8
- combat/plan-choice+potion / jev: 7
- event/leave / code: 7
- selection/add / code: 7
- combat/plan-choice / code-fallback: 6
- rest/proceed / code: 5
- combat/plan-guarded / code: 4
- rest/choose / code: 4
- shop/leave / code: 4
- shop/open / code: 4
- event/choose / deepseek: 3
- map/route / jev: 3
- selection/remove / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/end_turn / code: 2
- combat/least-loss / code: 2
- combat/plan-potion / code: 2
- selection/take into my hand / code: 2
- event/choose / jev: 1
- event/only / code: 1
- map/route / deepseek: 1
- rest/choose / deepseek: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：5 次（推翻 Jev 2 次）
- [deepseek] 第 7 层 TNone event/choose: 推翻 Jev（o1 @0.12 → o2）：甲虫汁最不值钱；本牌组无力量成长，升级稀有能力牌有机会拿到恶魔形态/壁垒等核心引擎，长期价值最高。
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o0 @0.18 → o0）：每回合+能量(第3回合起)最稳：强化旋风斩等X费AOE，配合力量在蟹王战一回合击杀双钳；另两项只是噱头或会返还卡牌、白费删牌。
- [deepseek] 第 20 层 TNone map/route: 同意 Jev（n0 @0.05 → n0）：Equal route value; HP 86% + Burning Blood make the fight cheap, and guaranteed card reward/gold is the best way to find 
- [deepseek] 第 23 层 TNone event/choose: 推翻 Jev（o0 @0.37 → o1）：5点生命代价小，无色卡池上限高且可跳过；26张牌组不宜被迫塞入随机牌，留着删打击、存钱进商店更稳。
- [deepseek] 第 25 层 TNone rest/choose: 同意 Jev（o2 @0.21 → o2）：Deck has zero strength sources and Kaiser Crab is a strength check; +1 permanent strength compounds with multi-hit AOE, 

### Jev 低置信度（<0.35）决策：9 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 蟾蜍蝌蚪, 防御) with confidence 0.15; code rank 1 (0.15)
- 第 15 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 骇鳗, 打击 -> 骇鳗) with confidence 0.29; code rank 1 (0.29)
- 第 15 层 combat/plan-choice: Jev chose plan 1/2 (挑衅 -> 骇鳗, 痛击 -> 骇鳗) with confidence 0.20; code rank 1 (0.20)
- 第 28 层 combat/plan-choice+potion: Jev chose plan 2/4 (防御, 挑衅+ -> 蜂群术士, 剑柄打击 -> 蜂群术士) with confidence 0.30; code rank 2 (0.30)
- 第 28 层 combat/plan-choice+potion: Jev chose to drink 技能药水 (confidence 0.13) (0.13)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 1/2 (预备打击 -> 猎人杀手, 打击 -> 猎人杀手, 痛殴 -> 猎人杀手) with confidence 0.22; code rank 1 (0.22)
- 第 30 层 combat/plan-choice: Jev chose plan 1/2 (剑柄打击 -> 猎人杀手) with confidence 0.29; code rank 1 (0.29)
- 第 33 层 combat/plan-choice: Jev chose plan 4/4 (挑衅 -> 碾碎爪, 防御+, 挑衅+ -> 火箭) with confidence 0.27; code rank 4 (0.27)
- 第 33 层 combat/plan-choice: Jev chose plan 3/4 (坚定不移+, 岩石铠甲, 突破, 剑柄打击 -> 火箭) with confidence 0.25; code rank 3; HP guard: plan 3 (坚定不移+, 岩石铠甲, 突破, 剑柄打击 -> 火箭) loses 19 HP, more t (0.25)
