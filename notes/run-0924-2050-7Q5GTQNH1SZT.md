## 复盘：run 7Q5GTQNH1SZT — 阵亡，最高第 33 层

- 决策 438 个；Jev 调用 53 次，Claude 0 次，DeepSeek 30 次；token 126,748 入 / 3,881 出，约 $0.0055；用时 26.6 分钟
- 决策者：code 314，jev 43，deepseek 30，jev-plan 29，deepseek-plan 12，code-fallback 10

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 80→72（-8），决策 code 8，jev-plan 5，jev 3
- 第 3 层 海洋混混: HP 78→74（-4），决策 code 5，jev 3，jev-plan 3，code-fallback 1
- 第 5 层 噬尸蛞蝓: HP 80→75（-5），决策 code 8，jev 2，jev-plan 2，code-fallback 2
- 第 6 层 气态炸弹/活雾: HP 80→72（-8），决策 code 8，jev 2，jev-plan 2，code-fallback 1
- 第 8 层 鬼祟珊瑚群: HP 78→55（-23），决策 code 6，deepseek-plan 5，deepseek 3
- 第 9 层 幽灵船: HP 61→58（-3），决策 code 10，jev-plan 2，jev 1
- 第 11 层 潮湿邪教徒/钙化邪教徒: HP 64→64（-0），决策 code 6，code-fallback 1
- 第 12 层 花园幽灵鳗: HP 70→59（-11），决策 code 9，deepseek 1，jev 1
- 第 13 层 化石追踪者: HP 65→65（-0），决策 code 5，jev 1
- 第 14 层 拳击构装体: HP 71→69（-2），决策 code 8，code-fallback 1，jev 1
- 第 17 层 瀑布巨兽: HP 75→50（-25），决策 deepseek 7，jev 6，jev-plan 6，code 5，deepseek-plan 1
- 第 19 层 偷窃草蜢: HP 80→77（-3），决策 code 5，jev 1，jev-plan 1
- 第 20 层 盛碗虫（卵）/盛碗虫（石）: HP 80→65（-15），决策 code 5
- 第 21 层 外骨骼虫: HP 71→61（-10），决策 code 19，jev 1
- 第 22 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 67→35（-32），决策 code 14，jev-plan 4，jev 1，code-fallback 1
- 第 23 层 猎人杀手: HP 41→14（-27），决策 code 11，code-fallback 2，jev-plan 2，jev 1
- 第 28 层 异螨: HP 63→60（-3），决策 code 8，jev 2，code-fallback 1，jev-plan 1
- 第 30 层 啃咬机: HP 66→66（-0），决策 code 8，jev 1
- 第 31 层 感染棱柱: HP 72→52（-20），决策 code 13，jev 1，deepseek 1，deepseek-plan 1
- 第 33 层 火箭/碾碎爪: HP 80→11（-69），决策 jev 5，deepseek-plan 5，code 4，deepseek 2，jev-plan 1
- 第 33 层 火箭/碾碎爪: HP 11→11（-0），决策 jev 1
- 第 33 层 火箭/碾碎爪: HP 11→8（-3），决策 code 9

### 死亡战斗：第 33 层 火箭/碾碎爪
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 上勾拳+ -> 碾碎爪, 防御, 痛殴 -> 碾碎爪, 打击+ -> 碾碎爪, 防御
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 痛殴 -> 碾碎爪
- T5 [code] combat/plan: code plan (only line): 防御; hp -8, dmg 0
- T5 [code] combat/plan: code plan (only line): end turn; hp -8, dmg 0
- T6 [code] combat/lethal: lethal: 预备打击 -> 碾碎爪, 打击+ -> 碾碎爪, 旋风斩
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 打击+ -> 碾碎爪
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩
- T6 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/end_turn / code: 56
- combat/plan / code: 49
- reward/claim / code: 49
- combat/plan-continue / code: 47
- combat/plan-continue / jev-plan: 29
- map/route / code: 24
- combat/lethal / code: 21
- combat/plan-choice / jev: 20
- reward/proceed / code: 19
- combat/plan-continue / deepseek-plan: 12
- reward/card / code: 12
- combat/plan-choice+potion / jev: 11
- combat/plan-choice / code-fallback: 10
- combat/plan-choice+potion / deepseek: 10
- map/route / jev: 8
- rest/choose / code: 6
- rest/proceed / code: 6
- reward/card / deepseek: 6
- selection/remove / code: 6
- event/choose / deepseek: 5
- combat/plan-choice / deepseek: 4
- event/leave / code: 4
- combat/play / jev: 3
- selection/choose / deepseek: 3
- selection/upgrade / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- shop/buy / code: 2
- shop/buy / deepseek: 2
- combat/least-loss / code: 1
- reward/card / jev: 1
- run/finalize / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：30 次（推翻 Jev 16 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o0 @0.19 → o2）：A choice of 3 rare cards gives run-defining power early; the Injury is a minor cost at A0 with Burning Blood healing. Be
- [deepseek] 第 1 层 TNone selection/choose: 推翻 Jev（card1 @0.07 → card0）：痛殴 is S-tier: 1-cost multi-hit attack that consumes a strike to grow, strong scaling for the whole run; AOE can be picke
- [deepseek] 第 4 层 TNone event/choose: 同意 Jev（o0 @0.08 → o0）：Free permanent relic with no HP cost beats 117 gold; gold is replaceable and 7 HP chip adds up in Act 1.
- [deepseek] 第 5 层 T5 reward/card: 同意 Jev（card2 @0.28 → card2）：Raw Act 1 damage: 14 for 2E plus a free follow-up attack beats Perfect Strike, which decays as Strikes get removed.
- [deepseek] 第 8 层 T1 combat/plan-choice: 推翻 Jev（plan2 @0.43 → plan1）：Use block potion now to take only 2 damage and deal 20, speeding elite kill; HP is high and Regen potion remains.
- [deepseek] 第 8 层 T2 combat/plan-choice: 推翻 Jev（plan1 @0.21 → plan2）：At 98% HP vs a sustained elite, extra 6 damage speeds the kill; 5 HP is cheap and Burning Blood heals it back.
- [deepseek] 第 8 层 T3 combat/plan-choice: 推翻 Jev（plan2 @0.20 → plan1）：Elite buffs each turn; extra 9 damage sets up a reliable kill next turn, and 9 HP is cheap at 64/80 with Burning Blood h
- [deepseek] 第 8 层 T4 reward/card: 推翻 Jev（skip @0.11 → card1）：Bloodletting: 0-cost 2 energy fuels Bash+Flame Barrier turns; HP is safe at 76% with Burning Blood. Second Flame Barrier
- [deepseek] 第 12 层 T2 combat/plan-choice: 推翻 Jev（plan4 @0.33 → plan1）：Kills an attacker, drops the buffing eel to 9 HP for an easy kill next turn, and the 3 HP lost to 放血 buys 8 extra damage
- [deepseek] 第 13 层 T3 reward/card: 推翻 Jev（skip @0.04 → card2）：Deck runs many 2-3 cost cards (痛击++, 彼岸咆哮, 恶魔之焰, 火焰屏障) with zero energy generation; ritual is the guide-endorsed energy 
- [deepseek] 第 15 层 TNone shop/buy: 推翻 Jev（leave @0.19 → buy_relic2）：硫磺每回合加力量，痛殴、彼岸咆哮消耗回响与多段攻击极吃力量；182金可承担，买后还剩117金再拿双重打击。
- [deepseek] 第 15 层 TNone shop/buy: 推翻 Jev（buy_card2 @0.21 → buy_card3）：硫磺每回合+力量，使跃跃欲试格挡快速成长；面对boss和后续敌人加力量，这是本店最有价值的防御核心。
- [deepseek] 第 17 层 T3 combat/plan-choice+potion: 同意 Jev（plan1 @0.24 → plan1）：No incoming damage with 45 block; save Regen potion for when HP actually drops or next act.
- [deepseek] 第 17 层 T4 combat/plan-choice+potion: 同意 Jev（plan1 @0.47 → plan1）：Free buff/heal turn—no incoming damage. Plan1 deals 75 dmg (vs 36) for only 3 HP, outpacing boss heals; save the regen p
- [deepseek] 第 17 层 T4 combat/plan-choice+potion: 同意 Jev（plan1 @0.49 → plan1）：Boss isn't attacking (Heal/Buff), so 0 HP is lost regardless; Regen at 94% HP is wasted and better saved for later bosse
- [deepseek] 第 17 层 T4 combat/plan-choice+potion: 同意 Jev（plan1 @0.26 → plan1）：No energy left; no damage this turn. Save the regen potion for after the eruption hits, when healing won't overcharge pa
- [deepseek] 第 17 层 T5 combat/plan-choice+potion: 同意 Jev（plan1 @0.42 → plan1）：Max damage (45) leaves boss at 16 HP, so next turn kills it fast, minimizing growing eruption/strength; 50 HP still clea
- [deepseek] 第 17 层 T6 combat/plan-choice+potion: 同意 Jev（plan1 @0.27 → plan1）：Boss is indestructible remnant; attack damage is irrelevant and potion should be saved. Next turn's explosion is survive
- [deepseek] 第 17 层 T6 combat/plan-choice+potion: 推翻 Jev（p0 @0.11 → plan1）：Remnant can't be damaged; 50 HP beats the ~36-42 self-destruct and we can block next turn, so save the regen potion for 
- [deepseek] 第 18 层 TNone event/choose: 同意 Jev（o1 @0.13 → o1）：Thinning 5 cards now plus 5 eventual upgrades fixes a bloated 23-card deck; far better than conditional energy or an ext

### Jev 低置信度（<0.35）决策：11 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 蟾蜍蝌蚪, 防御, 痛殴 -> 蟾蜍蝌蚪) with confidence 0.03; code rank 1 (0.03)
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 蟾蜍蝌蚪, 防御) with confidence 0.24; code rank 1 (0.24)
- 第 5 层 combat/plan-choice: Jev chose plan 1/4 (防御, 火焰屏障) with confidence 0.32; code rank 1 (0.32)
- 第 5 层 combat/plan-choice: Jev chose plan 1/4 (防御, 火焰屏障) with confidence 0.30; code rank 1 (0.30)
- 第 9 层 combat/plan-choice: Jev chose plan 2/3 (彼岸咆哮, 放血, 火焰屏障) with confidence 0.33; code rank 2 (0.33)
- 第 13 层 combat/plan-choice: Jev chose plan 1/2 (恶魔之焰 -> 化石追踪者, 打击 -> 化石追踪者) with confidence 0.34; code rank 1 (0.34)
- 第 14 层 combat/plan-choice: Jev chose plan 1/2 (无情猛攻 -> 拳击构装体) with confidence 0.21; code rank 1 (0.21)
- 第 28 层 combat/plan-choice: Jev chose plan 1/4 (坚毅, 主宰 -> 异螨, 打击+ -> 异螨) with confidence 0.15; code rank 1 (0.15)
- 第 28 层 combat/plan-choice: Jev chose plan 1/2 (主宰 -> 异螨, 打击+ -> 异螨) with confidence 0.07; code rank 1 (0.07)
- 第 33 层 combat/play: Jev chose p1 (Drink 技能药水) with confidence 0.30 (0.30)
- 第 33 层 combat/play: Jev chose p2 (Drink 癫狂之触) with confidence 0.31 (0.31)
