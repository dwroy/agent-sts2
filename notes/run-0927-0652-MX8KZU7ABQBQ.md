## 复盘：run MX8KZU7ABQBQ — 阵亡，最高第 33 层

- 决策 397 个；Jev 调用 61 次，Claude 0 次，DeepSeek 9 次；token 112,226 入 / 3,066 出，约 $0.0048；用时 22.7 分钟
- 决策者：code 281，jev 55，jev-plan 46，deepseek 9，code-fallback 6

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→49（-15），决策 code 12，jev-plan 2，code-fallback 1，jev 1
- 第 3 层 蟾蜍蝌蚪: HP 55→49（-6），决策 code 10，jev 1，code-fallback 1
- 第 7 层 淤泥旋螺: HP 55→55（-0），决策 code 6，jev 2，jev-plan 2
- 第 11 层 气态炸弹/活雾: HP 61→56（-5），决策 code 9，jev-plan 4，jev 3，code-fallback 1
- 第 14 层 下水道蚌: HP 62→52（-10），决策 code 10，jev 1，jev-plan 1
- 第 15 层 双尾鼠: HP 58→50（-8），决策 code 7，jev 1，jev-plan 1
- 第 17 层 灵魂异鱼: HP 80→39（-41），决策 code 14，jev 10，jev-plan 7
- 第 19 层 偷窃草蜢: HP 73→47（-26），决策 code 7，jev-plan 5，jev 3，code-fallback 1
- 第 21 层 外骨骼虫: HP 53→40（-13），决策 code 6，jev-plan 2，jev 1，code-fallback 1
- 第 22 层 寄生惧魔/胧光怪: HP 46→39（-7），决策 code 11，jev 4，jev-plan 2，code-fallback 1
- 第 27 层 蜂群术士: HP 73→13（-60），决策 code 18，jev-plan 5，jev 4
- 第 29 层 啃咬机: HP 52→31（-21），决策 jev 6，jev-plan 6，code 5
- 第 31 层 虱虫之祖: HP 72→42（-30），决策 code 12，jev-plan 2，jev 1
- 第 33 层 火箭/碾碎爪: HP 74→72（-2），决策 jev 2，jev-plan 2
- 第 33 层 火箭/碾碎爪: HP 72→6（-66），决策 code 27，jev-plan 5，jev 4

### 死亡战斗：第 33 层 火箭/碾碎爪
- T8 [code] combat/plan: code plan (+60.5 over next): 防御, 耸肩无视+, 旋风斩; hp -5, dmg 52
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 耸肩无视+
- T8 [code] combat/plan: code plan (only distinct line): 旋风斩, 暴走 -> 碾碎爪; hp -1, dmg 83
- T8 [code] combat/plan-continue: continuing the code-chosen plan: 暴走 -> 碾碎爪
- T8 [code] combat/plan: code plan (only line): end turn; hp -1, dmg 0
- T9 [code] combat/lethal: lethal: 闪电霹雳, 打击 -> 碾碎爪, 铁斩波 -> 火箭, 突破
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 碾碎爪
- T9 [code] combat/plan-continue: continuing the code-chosen plan: 铁斩波 -> 火箭
- T9 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 劫掠 -> 火箭
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-26): 地狱之刃
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-26): 拆卸 -> 火箭
- T9 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-26): end turn

### 各类决策由谁做
- combat/plan / code: 93
- combat/plan-continue / jev-plan: 46
- combat/plan-continue / code: 41
- combat/plan-choice / jev: 39
- reward/claim / code: 33
- map/route / code: 26
- reward/proceed / code: 13
- combat/lethal / code: 12
- reward/card / code: 11
- event/leave / code: 7
- combat/plan-choice / code-fallback: 6
- map/route / jev: 6
- rest/proceed / code: 6
- combat/least-loss / code: 5
- combat/plan-choice+potion / jev: 5
- rest/choose / code: 5
- event/choose / deepseek: 4
- shop/buy / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/plan-guarded / code: 3
- shop/buy / deepseek: 3
- shop/leave / code: 3
- shop/open / code: 3
- selection/upgrade / code: 2
- bundle/confirm / code: 1
- event/choose / jev: 1
- event/only / code: 1
- rest/choose / jev: 1
- reward/card / deepseek: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/add / code: 1
- selection/add / deepseek: 1
- selection/remove / code: 1
- selection/take into my hand / jev: 1
- shop/buy / jev: 1

### 兜底介入（Claude/DeepSeek）：9 次（推翻 Jev 3 次）
- [deepseek] 第 1 层 TNone event/choose: 同意 Jev（o1 @0.28 → o1）：牌组全是基础牌、缺输出/AOE/格挡；卡牌包立即补强战力，助打一幕精英与Boss。加湿器仅休息时加最大生命，收益太慢。
- [deepseek] 第 3 层 T4 reward/card: 推翻 Jev（card1 @0.27 → card0）：Shrug It Off: 1E 8 block + draw fixes deck's zero draw and thin block, valuable all run; Bludgeon's 3E single hit clashe
- [deepseek] 第 4 层 TNone selection/add: 同意 Jev（card3 @0.23 → card3）：双重打击1E打10，永久力量每点多打2下，是力量流核心多段输出；预备打击仅临时力量且裸打7伤，突破AOE弱、完美打击与删打击计划冲突。
- [deepseek] 第 6 层 TNone event/choose: 推翻 Jev（o0 @0.32 → o1）：藏宝图是占手牌的废牌（手册明令不拿）；8血换1瓶药水可接受，且药水格有空位。燃烧之血小战可回血。
- [deepseek] 第 12 层 TNone shop/buy: 同意 Jev（buy_card0 @0.22 → buy_card0）：上勾拳正好补 run 最大短板：13伤+易伤放大双重打击与痛击++，虚弱减伤助速杀灵魂异鱼少叠呼唤；格挡已有5张够用。
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o0 @0.35 → o2）：佩尔的士兵 gives repeatable defensive value with no deck dilution; the deck already needs every card reward for damage, and 2
- [deepseek] 第 20 层 TNone shop/buy: 同意 Jev（buy_card1 @0.27 → buy_card1）：突破: 24 gold AOE, triggers 狱火 (9+6 to all), perfect for Kaiser Crab keeping claws even; fills run's AOE gap cheaply.
- [deepseek] 第 20 层 TNone shop/buy: 同意 Jev（buy_card5 @0.12 → buy_card5）：Bomb gives recurring 40 AOE each battle, helps sync-kill both Kaiser claws and fixes low damage; permanent card beats on
- [deepseek] 第 24 层 TNone event/choose: 同意 Jev（o1 @0.23 → o1）：Avoid the curse: dead draws and decay HP bleed hurt the Kaiser Crab fight; gold accrues toward an act-3 shop removal.

### Jev 低置信度（<0.35）决策：24 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 噬尸蛞蝓, 防御, 打击 -> 噬尸蛞蝓) with confidence 0.06; code rank 1 (0.06)
- 第 3 层 combat/plan-choice: Jev chose plan 1/4 (地狱之刃, 血墙) with confidence 0.23; code rank 1 (0.23)
- 第 7 层 combat/plan-choice: Jev chose plan 1/3 (耸肩无视, 打击 -> 淤泥旋螺, 打击 -> 淤泥旋螺) with confidence 0.18; code rank 1 (0.18)
- 第 15 层 combat/plan-choice: Jev chose plan 1/4 (痛击+ -> 双尾鼠, 打击 -> 双尾鼠) with confidence 0.20; code rank 1 (0.20)
- 第 17 层 combat/plan-choice: Jev chose plan 4/4 (战斗专注, 防御, 打击 -> 灵魂异鱼, 双重打击 -> 灵魂异鱼) with confidence 0.32; code rank 4 (0.32)
- 第 17 层 combat/plan-choice: Jev chose plan 2/4 (上勾拳 -> 灵魂异鱼, 呼唤) with confidence 0.28; code rank 2 (0.28)
- 第 17 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 灵魂异鱼, 防御, 双重打击 -> 灵魂异鱼) with confidence 0.15; code rank 1 (0.15)
- 第 17 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.16; code rank 1 (0.16)
- 第 17 层 combat/plan-choice+potion: Jev chose to drink 鲜血药水 (confidence 0.06) (0.06)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (防御, 挑衅 -> 偷窃草蜢, 旋风斩) with confidence 0.13; code rank 1 (0.13)
- 第 21 层 combat/plan-choice: Jev chose plan 1/3 (铁斩波 -> 外骨骼虫, 挑衅 -> 外骨骼虫, 打击 -> 外骨骼虫) with confidence 0.33; code rank 1 (0.33)
- 第 22 层 combat/plan-choice: Jev chose plan 1/4 (战斗专注, 燃烧, 双重打击 -> 寄生惧魔, 打击 -> 胧光怪) with confidence 0.33; code rank 1 (0.33)
- 第 22 层 combat/plan-choice: Jev chose plan 1/4 (燃烧, 双重打击 -> 寄生惧魔, 打击 -> 胧光怪) with confidence 0.15; code rank 1 (0.15)
- 第 22 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 胧光怪) with confidence 0.04; code rank 1 (0.04)
- 第 22 层 combat/plan-choice: Jev chose plan 1/4 (双重打击 -> 胧光怪, 血墙) with confidence 0.27; code rank 1 (0.27)
