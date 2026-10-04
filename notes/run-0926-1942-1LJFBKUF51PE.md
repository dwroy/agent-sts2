## 复盘：run 1LJFBKUF51PE — 阵亡，最高第 42 层

- 决策 557 个；Jev 调用 64 次，Claude 0 次，DeepSeek 11 次；token 116,717 入 / 3,279 出，约 $0.0050；用时 27.2 分钟
- 决策者：code 420，jev-plan 62，jev 57，deepseek 11，code-fallback 7

### 战斗掉血（按层）
- 第 2 层 小啃兽: HP 64→56（-8），决策 code 7，jev-plan 2，code-fallback 1，jev 1
- 第 3 层 缩小甲虫: HP 62→57（-5），决策 code 12，jev-plan 2，jev 1
- 第 5 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 56→53（-3），决策 code 9，jev-plan 2，jev 1
- 第 7 层 方柱构装体: HP 59→50（-9），决策 code 9，jev-plan 4，jev 2
- 第 9 层 异蛙寄生虫/扭动虫: HP 80→70（-10），决策 code 15，jev-plan 3，jev 2
- 第 12 层 旧日雕像: HP 83→41（-42），决策 code 16，jev 2，jev-plan 2
- 第 14 层 树枝史莱姆（小）/蛇行扼杀者: HP 73→53（-20），决策 code 11，jev 2，code-fallback 2，jev-plan 1
- 第 15 层 墨宝: HP 59→55（-4），决策 code 4
- 第 17 层 仪式兽: HP 87→56（-31），决策 code 24，jev 3，jev-plan 1
- 第 19 层 盛碗虫（卵）/盛碗虫（石）: HP 82→66（-16），决策 code 4，jev-plan 2，jev 1
- 第 21 层 外骨骼虫: HP 72→71（-1），决策 code 4，jev-plan 3，jev 1
- 第 22 层 异螨: HP 77→57（-20），决策 jev-plan 8，jev 4，code 4
- 第 23 层 寄生惧魔/胧光怪: HP 63→56（-7），决策 code 9，code-fallback 2，jev 1
- 第 25 层 蜂群术士: HP 87→44（-43），决策 code 9，jev 6，jev-plan 6
- 第 27 层 外骨骼虫: HP 52→45（-7），决策 code 4，jev-plan 3，jev 2，code-fallback 1
- 第 31 层 啃咬机: HP 53→46（-7），决策 code 8，jev 2，jev-plan 2
- 第 33 层 火箭/碾碎爪: HP 80→3（-77），决策 code 28，jev 2，jev-plan 1
- 第 35 层 虔诚雕刻师: HP 73→34（-39），决策 code 9，jev-plan 6，jev 4，code-fallback 1
- 第 37 层 活体盾/高塔炮手: HP 42→25（-17），决策 jev-plan 6，code 4，jev 3
- 第 39 层 青蛙骑士: HP 33→2（-31），决策 code 24，jev-plan 3，jev 2
- 第 42 层 机甲骑士: HP 36→31（-5），决策 code 6，jev-plan 4，jev 3
- 第 42 层 机甲骑士: HP 31→7（-24），决策 code 14，jev 1，jev-plan 1

### 死亡战斗：第 42 层 机甲骑士
- T4 [code] combat/plan: code plan (only line): end turn; hp -17, dmg 0
- T5 [jev] combat/plan-choice: Jev chose plan 1/3 (燃烧, 剑柄打击 -> 机甲骑士, 坚毅) with confidence 0.78; code rank 1 conf 0.78
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 剑柄打击 -> 机甲骑士
- T5 [code] combat/plan: code plan (only line): 坚毅; hp -6, dmg 0
- T5 [code] combat/plan: code plan (only line): end turn; hp -6, dmg 0
- T6 [code] combat/plan: code plan (+10.4 over next): 拆卸+ -> 机甲骑士, 火焰屏障; hp -0, dmg 13 [calc mismatch: solver says ending now kills, mod says safe]
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 火焰屏障
- T6 [code] combat/plan: code plan (+27.8 over next): end turn; hp -0, dmg 0
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视, 防御, 邪眼+
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): 防御, 邪眼+
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 邪眼+
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-12): end turn

### 各类决策由谁做
- combat/plan / code: 112
- combat/plan-continue / code: 86
- reward/claim / code: 63
- combat/plan-continue / jev-plan: 62
- combat/plan-choice / jev: 46
- map/route / code: 35
- combat/lethal / code: 23
- reward/proceed / code: 20
- reward/card / code: 16
- event/leave / code: 9
- combat/plan-choice / code-fallback: 7
- shop/buy / code: 7
- combat/end_turn / code: 6
- event/choose / deepseek: 6
- map/route / jev: 6
- rest/proceed / code: 6
- rest/choose / code: 5
- combat/plan-guarded / code: 4
- selection/exhaust / code: 4
- chest/open / code: 3
- chest/proceed / code: 3
- chest/relic / code: 3
- combat/least-loss / code: 3
- selection/remove / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- reward/card / deepseek: 2
- reward/card / jev: 2
- shop/buy / deepseek: 2
- event/choose / jev: 1
- event/only / code: 1
- rest/choose / jev: 1
- run/finalize / code: 1
- selection/confirm / code: 1
- selection/enchant / deepseek: 1
- shop/buy / jev: 1

### 兜底介入（Claude/DeepSeek）：11 次（推翻 Jev 7 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.36 → o0）：免费删牌是开局最强选项：删一张打击提升抽牌质量、加速痛击上手；随机稀有牌收益不稳，诅咒换遗物更不可取。
- [deepseek] 第 2 层 T4 reward/card: 推翻 Jev（card0 @0.07 → card2）：被遗忘的仪式净赚2能量且消耗：前期让痛击+多张打击一回合爆发、抢血速杀，比随机不可控的地狱之刃可靠，也不污染后期牌组。
- [deepseek] 第 4 层 TNone event/choose: 推翻 Jev（o0 @0.01 → o1）：116金≈A6一次删打击，是当前最缺的提升；7血有燃烧之血与沿途休息兜底，未知石剑不如确定金币。
- [deepseek] 第 6 层 TNone shop/buy: 推翻 Jev（buy_card2 @0.26 → buy_card0）：牌组0张AOE，踩踏补上一幕头号缺口（群伤），74金可负担；之后再买耸肩无视、删打击仍够钱。
- [deepseek] 第 11 层 TNone event/choose: 推翻 Jev（o1 @0.14 → o0）：+7 最大生命永久收益；异鸟蛋是打不出的废牌，占手牌（手册明令不拿蛋/藏宝图），牌组已 16 张需精简。
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o0 @0.42 → o0）：能量是本局短板：廉价攻击多、AOE 3 张，且帝皇蟹需同回合斩杀双钳，靠 5 能量爆发回合；此遗物无代价、纯增益。
- [deepseek] 第 20 层 TNone shop/buy: 同意 Jev（buy_card1 @0.30 → buy_card1）：熔融之拳+ 1费10伤、易伤翻倍配合痛击/挑衅，且消耗不稀释21张牌组；欺凌+ 需大量易伤层才够本，本套易伤源不足。
- [deepseek] 第 30 层 TNone event/choose: 同意 Jev（o1 @0.23 → o1）：灰水近乎无用（牌组无消耗协同），力量药水要留给帝皇蟹叠力爆发；用废药换升级罕见攻击牌，正好补输出。
- [deepseek] 第 30 层 TNone selection/enchant: 推翻 Jev（card6 @0.38 → card4）：耸肩无视 is the best skill here: 1E, 8 block plus draw, played nearly every fight — the enchantment's per-play value is maxi
- [deepseek] 第 31 层 T3 reward/card: 同意 Jev（card2 @0.44 → card2）：Rupture turns existing self-damage (突破/祭品) into permanent strength, the scaling this deck needs for Kaiser Crab's 408 HP
- [deepseek] 第 34 层 TNone event/choose: 推翻 Jev（o2 @0.38 → o1）：灵体3张是应对女王高伤与99层脆弱的最强防御，完美补上牌组缺格挡的短板；2张诅咒可被6张过牌稀释，小提琴则与6张过牌严重冲突。

### Jev 低置信度（<0.35）决策：15 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 小啃兽, 防御, 打击 -> 小啃兽) with confidence 0.20; code rank 1 (0.20)
- 第 5 层 combat/plan-choice: Jev chose plan 1/4 (双重打击 -> 树叶史莱姆（中）, 打击 -> 树叶史莱姆（小）, 防御) with confidence 0.33; code rank 1 (0.33)
- 第 7 层 combat/plan-choice: Jev chose plan 1/2 (双重打击 -> 方柱构装体, 打击 -> 方柱构装体, 踩踏) with confidence 0.25; code rank 1 (0.25)
- 第 9 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 扭动虫, potion 虚弱药水 -> 扭动虫) with confidence 0.24; code rank 1 (0.24)
- 第 9 层 combat/plan-choice: Jev chose plan 1/4 (突破, 双重打击 -> 扭动虫, 打击 -> 扭动虫) with confidence 0.30; code rank 1 (0.30)
- 第 21 层 combat/plan-choice: Jev chose plan 1/3 (双重打击 -> 外骨骼虫, 熔融之拳+ -> 外骨骼虫, 突破, 踩踏) with confidence 0.18; code rank 1 (0.18)
- 第 22 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 异螨, 打击 -> 异螨) with confidence 0.13; code rank 1 (0.13)
- 第 22 层 combat/plan-choice: Jev chose plan 1/2 (踩踏, 旋风斩+) with confidence 0.06; code rank 1 (0.06)
- 第 23 层 combat/plan-choice: Jev chose plan 1/3 (剑柄打击+ -> 胧光怪, 被遗忘的仪式, 火焰屏障, 剑柄打击+ -> 胧光怪) with confidence 0.29; code rank 1 (0.29)
- 第 25 层 combat/plan-choice: Jev chose plan 1/2 (双重打击 -> 蜂群术士, 剑柄打击+ -> 蜂群术士, 双重打击 -> 蜂群术士) with confidence 0.17; code rank 1 (0.17)
- 第 25 层 combat/plan-choice: Jev chose plan 1/4 (挑衅 -> 蜂群术士, 扯碎+ -> 蜂群术士) with confidence 0.19; code rank 1; HP guard: plan 1 (挑衅 -> 蜂群术士, 扯碎+ -> 蜂群术士) loses 12 HP, more than 8 ov (0.19)
- 第 35 层 combat/plan-choice: Jev chose plan 1/2 (祭品, 灵体) with confidence 0.01; code rank 1 (0.01)
- 第 39 层 combat/plan-choice: Jev chose plan 1/4 (剑柄打击+ -> 青蛙骑士, 旋风斩+) with confidence 0.28; code rank 1; HP guard: plan 1 (剑柄打击+ -> 青蛙骑士, 旋风斩+) loses 18 HP, more than 6 over the c (0.28)
- 第 42 层 combat/plan-choice: Jev chose plan 2/2 (end turn) with confidence 0.12; code rank 2 (0.12)
- 第 42 层 combat/plan-choice: Jev chose plan 1/2 (防御, 剑柄打击+ -> 机甲骑士, 踩踏, 剑柄打击+ -> 机甲骑士) with confidence 0.16; code rank 1 (0.16)
