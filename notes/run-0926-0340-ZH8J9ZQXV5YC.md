## 复盘：run ZH8J9ZQXV5YC — 阵亡，最高第 17 层

- 决策 239 个；Jev 调用 41 次，Claude 0 次，DeepSeek 3 次；token 56,697 入 / 1,769 出，约 $0.0025；用时 11.0 分钟
- 决策者：code 168，jev 39，jev-plan 27，deepseek 3，code-fallback 2

### 战斗掉血（按层）
- 第 2 层 淤泥旋螺: HP 64→55（-9），决策 code 5，jev-plan 4，jev 3
- 第 3 层 海洋混混: HP 61→55（-6），决策 code 11，jev 1，jev-plan 1
- 第 5 层 噬尸蛞蝓: HP 61→58（-3），决策 code 11，jev 3，jev-plan 3，code-fallback 2
- 第 6 层 潮湿邪教徒/钙化邪教徒: HP 64→43（-21），决策 code 10，jev 2，jev-plan 1
- 第 8 层 双尾鼠: HP 73→72（-1），决策 code 12，jev 2，jev-plan 1
- 第 9 层 鬼祟珊瑚群: HP 78→62（-16），决策 code 8，jev 5，jev-plan 5
- 第 9 层 鬼祟珊瑚群: HP 62→46（-16），决策 code 3
- 第 15 层 骇鳗: HP 77→65（-12），决策 code 15，jev 6，jev-plan 6
- 第 17 层 乐加维林族母: HP 87→87（-0），决策 jev 3
- 第 17 层 乐加维林族母: HP 87→17（-70），决策 code 29，jev 6，jev-plan 6

### 死亡战斗：第 17 层 乐加维林族母
- T10 [code] combat/plan: code plan (only line): end turn; hp -2, dmg 0
- T11 [code] combat/plan: code plan (only distinct line): 完美打击 -> 乐加维林族母, 拆卸 -> 乐加维林族母; hp -0, dmg 14
- T11 [code] combat/plan-continue: continuing the code-chosen plan: 拆卸 -> 乐加维林族母
- T11 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T12 [jev] combat/plan-choice: Jev chose plan 1/3 (打击 -> 乐加维林族母, 防御+, 打击 -> 乐加维林族母) with confidence 0.43; code rank 1; HP guard: plan 1 (打击 -> 乐加维林族母, 防御+, 打击 -> 乐加维林族母) loses 19 HP, more tha conf 0.43
- T12 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T12 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 防御
- T12 [code] combat/plan: code plan (only line): end turn; hp -17, dmg 0
- T13 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): 双重打击 -> 乐加维林族母, 打击 -> 乐加维林族母, 防御+
- T13 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 乐加维林族母
- T13 [code] combat/plan-continue: continuing the code-chosen plan: 防御+
- T13 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-5): end turn

### 各类决策由谁做
- combat/plan / code: 60
- combat/plan-continue / code: 29
- combat/plan-choice / jev: 27
- combat/plan-continue / jev-plan: 27
- reward/claim / code: 21
- map/route / code: 12
- combat/lethal / code: 9
- reward/proceed / code: 7
- reward/card / code: 6
- combat/plan-choice+potion / jev: 4
- event/leave / code: 4
- map/route / jev: 4
- combat/plan-guarded / code: 3
- rest/proceed / code: 3
- combat/least-loss / code: 2
- combat/plan-choice / code-fallback: 2
- event/choose / deepseek: 2
- rest/choose / jev: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- combat/plan-potion / code: 1
- event/only / code: 1
- rest/choose / code: 1
- reward/card / deepseek: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/take into my hand / jev: 1
- selection/transform / code: 1
- shop/buy / code: 1
- shop/buy / jev: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：3 次（推翻 Jev 2 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o0 @0.33 → o1）：变掉一张打击提升前半幕强度；不拿随机诅咒遗物，无色牌期望一般，新叶更稳。
- [deepseek] 第 6 层 T5 reward/card: 同意 Jev（card1 @0.27 → card1）：当前4打击+双重打击使完美打击约2费16伤，补足急需爆发打精英/族母；愤怒的复制会稀释牌组、拖慢抽到格挡。
- [deepseek] 第 11 层 TNone event/choose: 推翻 Jev（o0 @0.12 → o1）：藏宝图是不可打出的废牌，只会占手牌；8点血可在boss前休息点恢复，随机药水对乐加维林族母战更有价值。

### Jev 低置信度（<0.35）决策：16 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 淤泥旋螺, 防御) with confidence 0.08; code rank 1 (0.08)
- 第 2 层 combat/plan-choice: Jev chose plan 2/3 (痛击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.32; code rank 2 (0.32)
- 第 3 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 海洋混混, 防御) with confidence 0.06; code rank 1 (0.06)
- 第 5 层 combat/plan-choice: Jev chose plan 1/2 (痛击 -> 噬尸蛞蝓, 耸肩无视) with confidence 0.11; code rank 1 (0.11)
- 第 8 层 combat/plan-choice: Jev chose plan 1/3 (防御, 耸肩无视, 拆卸 -> 双尾鼠) with confidence 0.32; code rank 1 (0.32)
- 第 8 层 combat/plan-choice: Jev chose plan 1/2 (拆卸 -> 双尾鼠) with confidence 0.27; code rank 1 (0.27)
- 第 9 层 combat/plan-choice+potion: Jev chose to drink 无色药水 (confidence 0.16) (0.16)
- 第 15 层 combat/plan-choice: Jev chose plan 1/3 (耸肩无视, 拆卸 -> 骇鳗, 邪眼) with confidence 0.11; code rank 1 (0.11)
- 第 15 层 combat/plan-choice: Jev chose plan 2/3 (痛击 -> 骇鳗) with confidence 0.04; code rank 2 (0.04)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.07; code rank 1 (0.07)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (耸肩无视) with confidence 0.21; code rank 1 (0.21)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 灰水 (confidence 0.06) (0.06)
- 第 17 层 combat/plan-choice: Jev chose plan 2/3 (打击 -> 乐加维林族母, 防御+) with confidence 0.11; code rank 2 (0.11)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (拆卸 -> 乐加维林族母, 防御+, 邪眼) with confidence 0.11; code rank 1 (0.11)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (无情猛攻 -> 乐加维林族母, 拆卸 -> 乐加维林族母) with confidence 0.15; code rank 1 (0.15)
