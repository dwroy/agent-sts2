## 复盘：run ZW9SQYC7KBC3 — 阵亡，最高第 22 层

- 决策 276 个；Jev 调用 75 次，Claude 0 次，DeepSeek 0 次；token 192,841 入 / 3,298 出，约 $0.0082；用时 13.9 分钟
- 决策者：code 159，jev 75，jev-plan 42

### 战斗掉血（按层）
- 第 2 层 毛绒伏地虫: HP 64→76（+12），决策 code 6，jev 4，jev-plan 1
- 第 3 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 80→68（-12），决策 jev 3，jev-plan 3，code 3
- 第 4 层 小啃兽: HP 74→62（-12），决策 code 4，jev-plan 2，jev 1
- 第 5 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 67→58（-9），决策 jev-plan 3，code 3，jev 2
- 第 6 层 藤蔓蹒跚者: HP 64→63（-1），决策 jev-plan 3，jev 1
- 第 6 层 藤蔓蹒跚者: HP 63→32（-31），决策 code 5，jev 2，jev-plan 1
- 第 9 层 树枝史莱姆（小）/蛇行扼杀者: HP 62→48（-14），决策 code 6，jev 4，jev-plan 4
- 第 12 层 旧日雕像: HP 78→77（-1），决策 code 6，jev-plan 3，jev 2
- 第 12 层 旧日雕像: HP 77→54（-23），决策 code 5，jev 1
- 第 17 层 同族信徒/同族神官: HP 80→72（-8），决策 jev 2，jev-plan 2，code 2
- 第 17 层 同族信徒/同族神官: HP 72→47（-25），决策 jev-plan 6，jev 4，code 3
- 第 17 层 同族信徒/同族神官: HP 47→47（-0），决策 jev 1
- 第 17 层 同族信徒/同族神官: HP 47→20（-27），决策 jev 6，code 6，jev-plan 4
- 第 17 层 同族神官: HP 20→20（-0），决策 code 1
- 第 19 层 外骨骼虫: HP 69→63（-6），决策 jev 2，jev-plan 2，code 1
- 第 19 层 外骨骼虫: HP 63→63（-0），决策 jev 1
- 第 19 层 外骨骼虫: HP 63→63（-0），决策 code 2，jev 1
- 第 21 层 地道虫: HP 69→43（-26），决策 code 6，jev-plan 4，jev 3
- 第 21 层 地道虫: HP 43→24（-19），决策 code 15
- 第 22 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 30→13（-17），决策 code 5，jev-plan 4，jev 3
- 第 22 层 盛碗虫（丝）/盛碗虫（石）: HP 13→1（-12），决策 code 6

### 死亡战斗：第 22 层 盛碗虫（丝）/盛碗虫（石）
- T4 [code] combat/plan: code plan (only line): 防御; hp -12, dmg 0
- T4 [code] combat/plan: code plan (only line): end turn; hp -12, dmg 0
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): 防御, 挑衅 -> 盛碗虫（石）, 双重打击 -> 盛碗虫（石）
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 挑衅 -> 盛碗虫（石）
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 盛碗虫（石）
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (0): end turn

### 各类决策由谁做
- combat/plan / code: 50
- combat/plan-choice / jev: 43
- combat/plan-continue / jev-plan: 42
- reward/claim / code: 25
- combat/plan-continue / code: 22
- map/route / code: 14
- combat/lethal / code: 11
- reward/card / jev: 11
- reward/proceed / code: 11
- map/route / jev: 7
- selection/add / code: 7
- event/leave / code: 6
- event/choose / jev: 5
- selection/add / jev: 4
- rest/choose / jev: 3
- rest/proceed / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- event/only / code: 1
- run/finalize / code: 1
- selection/remove / jev: 1
- selection/take into my hand / jev: 1

### 兜底介入（Claude/DeepSeek）：0 次（推翻 Jev 0 次）

### Jev 低置信度（<0.35）决策：10 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.23; code reference rank 2 (0.23)
- 第 3 层 combat/plan-choice: Jev chose plan 2/3 (potion 异鱼之油, 打击 -> 树枝史莱姆（小）, 打击 -> 树枝史莱姆（小）, 打击 -> 树叶史莱姆（小）) with confidence 0.25; code reference rank 1 (0.25)
- 第 6 层 combat/plan-choice: Jev chose plan 3/4 (打击 -> 藤蔓蹒跚者, 防御, 突破, potion 攻击药水, card from 攻击药水 -> 藤蔓蹒跚者) with confidence 0.21; code reference rank 1 (0.21)
- 第 9 层 combat/plan-choice: Jev chose plan 1/2 (挑衅 -> 树枝史莱姆（小）, 打击 -> 树枝史莱姆（小）, 打击 -> 树枝史莱姆（小）) with confidence 0.05; code reference rank 1 (0.05)
- 第 9 层 combat/plan-choice: Jev chose plan 2/4 (突破, 打击 -> 树枝史莱姆（小）, 双重打击 -> 蛇行扼杀者) with confidence 0.27; code reference rank 3 (0.27)
- 第 9 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 蛇行扼杀者, 旋风斩) with confidence 0.26; code reference rank 2 (0.26)
- 第 9 层 map/route: Jev chose Treasure (row 9, col 4) with confidence 0.23; code rank 1/2 (0.23)
- 第 14 层 event/choose: Jev chose 圆环 with confidence 0.23; code rank 3/3 (0.23)
- 第 18 层 event/choose: Jev chose 佩尔之泪 with confidence 0.16; code rank 1/3 (0.16)
- 第 21 层 combat/plan-choice: Jev chose plan 2/2 (坚韧之环) with confidence 0.22; code reference rank 1 (0.22)
