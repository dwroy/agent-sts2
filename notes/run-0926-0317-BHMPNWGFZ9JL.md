## 复盘：run BHMPNWGFZ9JL — 阵亡，最高第 13 层

- 决策 161 个；Jev 调用 20 次，Claude 0 次，DeepSeek 4 次；token 30,181 入 / 1,008 出，约 $0.0013；用时 7.6 分钟
- 决策者：code 116，jev-plan 21，jev 18，deepseek 4，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→59（-5），决策 code 7，jev-plan 3，jev 2
- 第 3 层 缩小甲虫: HP 65→63（-2），决策 code 6，jev 1，jev-plan 1
- 第 5 层 小啃兽: HP 61→59（-2），决策 code 3，jev-plan 2，jev 1
- 第 5 层 小啃兽: HP 59→53（-6），决策 code 2
- 第 6 层 蛇行扼杀者/闪光贾克斯果: HP 59→55（-4），决策 code 6，code-fallback 1
- 第 6 层 蛇行扼杀者: HP 55→28（-27），决策 code 4，jev-plan 4，jev 2
- 第 9 层 劫掠者弩手/劫掠者暴徒/劫掠者追踪手: HP 58→41（-17），决策 code 6，jev 2，jev-plan 2
- 第 9 层 劫掠者弩手: HP 41→41（-0），决策 code 2
- 第 11 层 毛绒伏地虫/缩小甲虫: HP 47→43（-4），决策 code 4，code-fallback 1，jev 1，jev-plan 1
- 第 11 层 毛绒伏地虫: HP 43→32（-11），决策 code 2
- 第 12 层 旧日雕像: HP 38→38（-0），决策 code 4
- 第 12 层 旧日雕像: HP 38→26（-12），决策 code 4，jev-plan 4，jev 2
- 第 12 层 旧日雕像: HP 26→11（-15），决策 code 3，jev 2，jev-plan 2
- 第 13 层 闪光贾克斯果/飞蝇菌子: HP 17→17（-0），决策 jev-plan 2，jev 1
- 第 13 层 闪光贾克斯果/飞蝇菌子: HP 17→5（-12），决策 code 8

### 死亡战斗：第 13 层 闪光贾克斯果/飞蝇菌子
- T1 [code] combat/plan: code plan (only line): end turn; hp -9, dmg 0
- T2 [code] combat/plan: code plan (only line): 防御, 拆卸 -> 闪光贾克斯果, 打击 -> 闪光贾克斯果; hp -3, dmg 13
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 拆卸 -> 闪光贾克斯果
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 闪光贾克斯果
- T2 [code] combat/plan: code plan (only line): end turn; hp -3, dmg 0
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 防御, 防御
- T3 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T3 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan / code: 35
- combat/plan-continue / jev-plan: 21
- reward/claim / code: 17
- combat/plan-continue / code: 16
- combat/plan-choice / jev: 12
- map/route / code: 9
- reward/proceed / code: 8
- combat/lethal / code: 7
- reward/card / code: 7
- selection/add / code: 5
- event/leave / code: 3
- map/route / jev: 3
- combat/least-loss / code: 2
- combat/plan-choice / code-fallback: 2
- combat/plan-choice+potion / jev: 2
- event/choose / deepseek: 2
- selection/add / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-potion / code: 1
- event/choose / jev: 1
- rest/choose / code: 1
- rest/proceed / code: 1
- run/finalize / code: 1

### 兜底介入（Claude/DeepSeek）：4 次（推翻 Jev 2 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.31 → o0）：随机稀有牌有机会直给恶魔形态/力量成长或AOE，正补当前0力量0AOE短板；羽翼之靴不加战力，诅咒珍珠是死牌且金常花不完。
- [deepseek] 第 4 层 TNone event/choose: 同意 Jev（o0 @0.34 → o0）：86% HP 时用 8 血换 83 金很划算（休息被 80 上限截掉 13 点，还要多打一场），金币可在商店删打击/补 AOE。
- [deepseek] 第 6 层 T2 selection/add: 推翻 Jev（card4 @0.34 → card2）：Second AOE (Breakthrough) is the top need for The Kin boss's fast-growing followers; Hellraiser needs a thin strike deck
- [deepseek] 第 11 层 T3 selection/add: 同意 Jev（card6 @0.13 → card6）：重锤32点无条件最高伤害，能最快结束战斗、为下一个强制精英保留HP；拆卸需易伤支撑，双重打击/打击伤害太低。

### Jev 低置信度（<0.35）决策：6 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.34; code rank 1 (0.34)
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 毛绒伏地虫, 防御, 防御) with confidence 0.28; code rank 1 (0.28)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 缩小甲虫, 防御) with confidence 0.08; code rank 1 (0.08)
- 第 9 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 劫掠者追踪手, 防御) with confidence 0.26; code rank 1 (0.26)
- 第 12 层 combat/plan-choice+potion: Jev chose to drink 鲜血药水 (confidence 0.31) (0.31)
- 第 12 层 combat/plan-choice: Jev chose plan 1/2 (防御, 防御, 双重打击 -> 旧日雕像) with confidence 0.05; code rank 1 (0.05)
