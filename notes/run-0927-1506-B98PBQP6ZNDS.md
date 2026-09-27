## 复盘：run B98PBQP6ZNDS — 阵亡，最高第 28 层

- 决策 334 个；Jev 调用 36 次，Claude 0 次，DeepSeek 12 次；token 75,597 入 / 2,127 出，约 $0.0033；用时 23.5 分钟
- 决策者：code 252，jev 35，jev-plan 34，deepseek 12，code-fallback 1

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→55（-9），决策 code 7，jev-plan 3，jev 2
- 第 4 层 海洋混混: HP 61→42（-19），决策 jev-plan 3，code 3，jev 2
- 第 6 层 蟾蜍蝌蚪: HP 51→51（-0），决策 code 5
- 第 12 层 花园幽灵鳗: HP 55→50（-5），决策 jev-plan 4，jev 3，code 1
- 第 12 层 花园幽灵鳗: HP 50→23（-27），决策 code 14，jev 1，jev-plan 1
- 第 13 层 双尾鼠: HP 29→21（-8），决策 code 8，jev-plan 4，jev 2
- 第 14 层 噬尸蛞蝓: HP 26→26（-0），决策 jev 3，jev-plan 3，code 2，code-fallback 1
- 第 14 层 噬尸蛞蝓: HP 26→26（-0），决策 jev 2
- 第 14 层 噬尸蛞蝓: HP 26→4（-22），决策 code 9，jev-plan 3，jev 1
- 第 17 层 乐加维林族母: HP 37→37（-0），决策 code 11
- 第 17 层 乐加维林族母: HP 37→9（-28），决策 code 13
- 第 19 层 外骨骼虫: HP 79→71（-8），决策 code 11，jev-plan 3，jev 1
- 第 21 层 地道虫: HP 77→64（-13），决策 code 4
- 第 21 层 地道虫: HP 64→63（-1），决策 code 10
- 第 23 层 幼虫/直飞产卵虫/结实的卵: HP 79→47（-32），决策 code 12，jev-plan 3，jev 1
- 第 25 层 蜂群术士: HP 104→14（-90），决策 code 18，jev 4，jev-plan 2
- 第 27 层 外骨骼虫: HP 20→6（-14），决策 code 6，jev-plan 5，jev 3
- 第 28 层 棘刺蟾蜍: HP 12→7（-5），决策 code 5

### 死亡战斗：第 28 层 棘刺蟾蜍
- T1 [code] combat/plan: code plan (only distinct line): 头槌 -> 棘刺蟾蜍, 双重打击 -> 棘刺蟾蜍; hp -0, dmg 19
- T1 [code] combat/plan-continue: continuing the code-chosen plan: 双重打击 -> 棘刺蟾蜍
- T1 [code] combat/plan: code plan (only distinct line): end turn; hp -0, dmg 0
- T2 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 48): 剑柄打击 -> 棘刺蟾蜍, 双重打击 -> 
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-16): end turn

### 各类决策由谁做
- combat/plan / code: 74
- combat/plan-continue / code: 43
- combat/plan-continue / jev-plan: 34
- reward/claim / code: 32
- map/route / code: 24
- combat/plan-choice / jev: 17
- combat/lethal / code: 12
- reward/proceed / code: 12
- reward/card / code: 9
- combat/plan-choice+potion / jev: 8
- event/choose / deepseek: 7
- event/leave / code: 7
- selection/add / code: 5
- combat/end_turn / code: 4
- rest/choose / code: 4
- rest/proceed / code: 4
- combat/least-loss / code: 3
- combat/plan-guarded / code: 3
- map/route / jev: 3
- shop/buy / deepseek: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- reward/card / jev: 2
- selection/take into my hand / jev: 2
- selection/upgrade / code: 2
- shop/buy / code: 2
- shop/buy / jev: 2
- shop/leave / code: 2
- shop/open / code: 2
- combat/plan-choice+potion / code-fallback: 1
- reward/card / deepseek: 1
- run/finalize / code: 1
- selection/add / jev: 1
- selection/choose / deepseek: 1
- selection/remove / code: 1

### 兜底介入（Claude/DeepSeek）：12 次（推翻 Jev 3 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.24 → o2）：A rare card now is the biggest power spike; run lacks strength/AOE win conditions. One Injury is a manageable, later-del
- [deepseek] 第 1 层 TNone selection/choose: 同意 Jev（card1 @0.14 → card1）：狂宴即拿：10 点伤害补前期输出，斩杀永久 +3 最大生命（A8 血线吃紧），消耗还能精简牌组。
- [deepseek] 第 3 层 TNone event/choose: 同意 Jev（o0 @0.48 → o0）：Losing 14 HP early hurts elite pathing; two chosen commons better fill missing AoE/block and keep us healthy for Act 1.
- [deepseek] 第 5 层 TNone event/choose: 同意 Jev（o0 @0.02 → o0）：Deck has no exhaust and already two dead cards; a third unplayable curse hurts boss consistency more than 303 gold (few 
- [deepseek] 第 8 层 TNone event/choose: 同意 Jev（o0 @0.44 → o0）：Free pick from 5 class cards beats paying 5 HP for one colorless; better odds at strength/AOE before elite and Matriarch
- [deepseek] 第 11 层 TNone event/choose: 同意 Jev（o0 @0.18 → o0）：重锤3费、无能量支撑，免费移除即可瘦身；下个节点是强制精英，66%血量不该花3+点生命去赌随机重随。
- [deepseek] 第 15 层 TNone shop/buy: 同意 Jev（buy_card3 @0.38 → buy_card3）：Low HP, thin block: 跃跃欲试 costs 1E and scales with Demon Form (+5 block per Strength), and 72g still leaves enough for 震荡
- [deepseek] 第 15 层 TNone shop/buy: 同意 Jev（buy_potion1 @0.27 → buy_potion1）：10 HP, boss next: 力量药水 whole-fight +2 Strength boosts damage and 跃跃欲试 block at zero HP cost; 御血术 self-damage too risky n
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o2 @0.18 → o0）：Permanent +1 energy from turn 3 is strongest: Demon Form costs 3, and long boss fights (Knowledge Demon) reward energy e
- [deepseek] 第 19 层 T4 reward/card: 同意 Jev（card1 @0.29 → card1）：Deck has zero draw and needs boss frontload; Headbutt gives 9 damage plus recursion of 狂宴/跃跃欲试. Second 放血 wastes 佩尔之肉 en
- [deepseek] 第 20 层 TNone shop/buy: 推翻 Jev（buy_card4 @0.08 → buy_card1）：上勾拳 gives the deck's only Weak (cuts Knowledge Demon's 19/30 hits by 25%) plus 13 damage and Vulnerable; best per-gold, 
- [deepseek] 第 22 层 TNone event/choose: 同意 Jev（o0 @0.10 → o0）：火焰药水非关键资源（非格挡/力量，且常被囤死），+10 最大生命与回血利于知识恶魔消耗战；避免花 HP。

### Jev 低置信度（<0.35）决策：9 个
- 第 12 层 combat/plan-choice+potion: Jev chose plan 1/2 (闪电霹雳, 打击 -> 花园幽灵鳗, 打击 -> 花园幽灵鳗) with confidence 0.33; code rank 1 (0.33)
- 第 12 层 combat/plan-choice+potion: Jev chose to drink 技能药水 (confidence 0.25) (0.25)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 1/3 (双重打击 -> 噬尸蛞蝓, 闪电霹雳, 防御) with confidence 0.28; code rank 1 (0.28)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 1/3 (防御, 头槌 -> 噬尸蛞蝓, 突破) with confidence 0.23; code rank 1 (0.23)
- 第 14 层 combat/plan-choice+potion: Jev chose plan 2/3 (防御) with confidence 0.30; code rank 2 (0.30)
- 第 19 层 combat/plan-choice: Jev chose plan 1/3 (放血, 防御, 痛击+ -> 外骨骼虫, 打击 -> 外骨骼虫) with confidence 0.34; code rank 1 (0.34)
- 第 25 层 combat/plan-choice: Jev chose plan 2/2 (打击 -> 蜂群术士, 双重打击 -> 蜂群术士) with confidence 0.10; code rank 2 (0.10)
- 第 25 层 combat/plan-choice: Jev chose plan 2/2 (跃跃欲试) with confidence 0.08; code rank 2 (0.08)
- 第 27 层 combat/plan-choice: Jev chose plan 1/4 (主宰 -> 外骨骼虫, 双重打击 -> 外骨骼虫, 狂宴+ -> 外骨骼虫) with confidence 0.25; code rank 1 (0.25)
