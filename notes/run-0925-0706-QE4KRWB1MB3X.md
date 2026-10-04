## 复盘：run QE4KRWB1MB3X — 阵亡，最高第 22 层

- 决策 349 个；Jev 调用 53 次，Claude 0 次，DeepSeek 25 次；token 100,014 入 / 3,185 出，约 $0.0043；用时 22.2 分钟
- 决策者：code 230，jev 47，jev-plan 28，deepseek 25，deepseek-plan 13，code-fallback 6

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（小）/树枝史莱姆（中）/树枝史莱姆（小）: HP 80→68（-12），决策 jev-plan 5，code 5，jev 3
- 第 4 层 缩小甲虫: HP 74→59（-15），决策 code 6，jev 2，jev-plan 2
- 第 5 层 毛绒伏地虫: HP 65→65（-0），决策 code 7，jev 1，jev-plan 1
- 第 7 层 利齿之眼/雾菇: HP 71→68（-3），决策 code 8，jev 2，jev-plan 1，code-fallback 1
- 第 11 层 方柱构装体: HP 66→65（-1），决策 code 9，jev 1，code-fallback 1
- 第 12 层 旧日雕像: HP 71→40（-31），决策 code 15，deepseek 5，deepseek-plan 5，jev 3，jev-plan 1
- 第 14 层 藤蔓蹒跚者: HP 70→58（-12），决策 code 8，jev 2，jev-plan 1
- 第 15 层 树枝史莱姆（中）/蛇行扼杀者: HP 64→61（-3），决策 code 9，jev-plan 3，jev 2，code-fallback 1
- 第 17 层 墨影幻灵: HP 80→66（-14），决策 deepseek 6，deepseek-plan 5，code 4，jev 2，jev-plan 2
- 第 17 层 墨影幻灵: HP 66→41（-25），决策 code 20，deepseek 3，deepseek-plan 3
- 第 19 层 外骨骼虫: HP 80→50（-30），决策 code 10，jev 2，jev-plan 2
- 第 20 层 偷窃草蜢: HP 56→52（-4），决策 code 7，jev 1
- 第 21 层 幼虫/直飞产卵虫/结实的卵: HP 58→12（-46），决策 code 23，jev 10，jev-plan 4，code-fallback 3
- 第 22 层 异螨: HP 18→8（-10），决策 jev 11，code 8，jev-plan 6

### 死亡战斗：第 22 层 异螨
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 打击+ -> 异螨
- T3 [code] combat/end_turn: no playable cards; ending the turn
- T4 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (耸肩无视+, 耸肩无视, 愤怒 -> 异螨) with confidence 0.62; code rank 1 conf 0.62
- T4 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (耸肩无视, 愤怒 -> 异螨) with confidence 0.49; code rank 1 conf 0.49
- T4 [jev] combat/plan-choice+potion: Jev chose plan 1/1 (愤怒 -> 异螨) with confidence 0.22; code rank 1 conf 0.22
- T4 [jev] combat/plan-choice+potion: Jev chose to drink 明晰提取物 (confidence 0.12) conf 0.12
- T4 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 毒素, 战斗专注, 坚毅, 防御+
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 战斗专注
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 坚毅, 防御+
- T5 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 防御+
- T5 [code] combat/end_turn: no playable cards; ending the turn

### 各类决策由谁做
- combat/end_turn / code: 48
- combat/plan / code: 38
- combat/plan-continue / code: 34
- reward/claim / code: 31
- combat/plan-continue / jev-plan: 28
- combat/plan-choice / jev: 26
- map/route / code: 17
- combat/lethal / code: 16
- combat/plan-choice+potion / jev: 16
- combat/plan-continue / deepseek-plan: 13
- reward/proceed / code: 12
- combat/plan-choice / deepseek: 8
- reward/card / code: 8
- combat/plan-choice / code-fallback: 6
- combat/plan-choice+potion / deepseek: 6
- selection/remove / code: 6
- event/choose / deepseek: 4
- event/leave / code: 4
- map/route / jev: 4
- reward/card / deepseek: 4
- combat/least-loss / code: 3
- rest/proceed / code: 3
- rest/choose / code: 2
- shop/buy / deepseek: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- rest/choose / jev: 1
- run/finalize / code: 1
- selection/take into my hand / code: 1
- selection/upgrade / deepseek: 1
- shop/buy / code: 1
- shop/leave / code: 1
- shop/open / code: 1

### 兜底介入（Claude/DeepSeek）：25 次（推翻 Jev 13 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o0 @0.33 → o1）：精准剪刀删一张打击，是最稳的牌组优化；随机无色牌质量不确定，诅咒换药水更亏。
- [deepseek] 第 3 层 TNone event/choose: 同意 Jev（o0 @0.30 → o0）：地图遗物价值远超 8 点生命换一瓶随机药水；74/80 血充足，第 3 层应优先拿长期资源。
- [deepseek] 第 6 层 TNone shop/buy: 推翻 Jev（buy_card1 @0.17 → buy_card3）：Shrug It Off is the best card here (8 block + draw, great all run) at only 50g, leaving gold to remove a Strike for 75 n
- [deepseek] 第 6 层 TNone shop/buy: 推翻 Jev（buy_card1 @0.22 → buy_card2）：巨像A级防御牌，配合痛击易伤减半伤害，优于删牌和药水。
- [deepseek] 第 8 层 TNone event/choose: 同意 Jev（o0 @0.41 → o0）：At 93% HP healing 24 is nearly wasted; 92 gold funds a shop removal/core card while 8 HP loss is easily recovered via Bu
- [deepseek] 第 9 层 TNone selection/upgrade: 推翻 Jev（card11 @0.34 → card8）：升级痛击：易伤从2层变3层，配合上勾拳/无情猛攻在boss战放大所有输出；痛击是后期仍需保留的核心易伤源。
- [deepseek] 第 11 层 T4 reward/card: 推翻 Jev（skip @0.20 → card2）：坚毅 7 block beats Defend, and its random exhaust thins Strikes/wounds vs Vantom; deck needs block more than a second Setu
- [deepseek] 第 12 层 T1 combat/plan-choice: 同意 Jev（plan1 @0.02 → plan1）：Enemy sleeps so no damage either way; Vulnerable 3 amplifies 3 turns of attacks (~+50%), far outweighing 5 extra damage 
- [deepseek] 第 12 层 T3 combat/plan-choice: 推翻 Jev（plan1 @0.25 → plan2）：Same 15 HP cost, but 痛击+ extends Vulnerable to 5, boosting all later attacks ~+50% and ending this scaling elite (Str 10
- [deepseek] 第 12 层 T4 combat/plan-choice: 推翻 Jev（plan4 @0.12 → plan1）：Kills elite faster (36 dmg, enemy to 38) while 49 HP stays safe; enemy strength escalates, so racing beats slow grind.
- [deepseek] 第 12 层 T6 combat/plan-choice: 推翻 Jev（plan1 @0.24 → plan2）：Plays 无情猛攻 for 15 damage while gaining 5 block, preserving HP and leaving elite at 28, killable in two turns.
- [deepseek] 第 12 层 T7 combat/plan-choice: 同意 Jev（plan1 @0.16 → plan1）：Leaves enemy at 12 with Weak+Vulnerable; next turn kills before it acts. 8 extra HP lost is worth ending the elite a tur
- [deepseek] 第 15 层 T4 reward/card: 同意 Jev（card0 @0.40 → card0）：0-cost attack adds real damage; repeated cheap hits strip Vantom's 9 Slippery, and deck lacks offense. Taunt overlaps Ba
- [deepseek] 第 17 层 T1 combat/plan-choice+potion: 同意 Jev（plan1 @0.38 → plan1）：Full HP, takes 0 damage, applies Vulnerable+Weak; the extra 1 slippery-strip in plan2 costs 5 HP for negligible gain. Sa
- [deepseek] 第 17 层 T3 combat/plan-choice+potion: 同意 Jev（plan1 @0.43 → plan1）：At full HP, take the solid 12-block turn (66/80). Attack potion's free attack only chips 1 into Slippery 6; save it for 
- [deepseek] 第 17 层 T3 combat/plan-choice+potion: 同意 Jev（plan2 @0.31 → plan2）：Lose only 14 HP and keep Bash: Vulnerable now is wasted while 5 Slippery layers absorb all damage; save potion and Bash 
- [deepseek] 第 17 层 T4 combat/plan-choice+potion: 同意 Jev（plan1 @0.39 → plan1）：Free no-attack boss turn: Battle Trance cycles and Bash+ applies Vulnerable 3 while chipping Slippery, all at 0 HP lost.
- [deepseek] 第 17 层 T4 combat/plan-choice+potion: 同意 Jev（plan1 @0.24 → plan1）：Boss is on its non-attacking buff turn; strip Slippery and apply Vulnerable 3 for free while saving the Attack Potion fo
- [deepseek] 第 17 层 T5 combat/plan-choice+potion: 推翻 Jev（plan1 @0.45 → p0）：Boss fight, long grind vs 166 HP; potion is free now and adds damage while staying safe, per 'use potions boldly in boss
- [deepseek] 第 17 层 T6 combat/plan-choice: 推翻 Jev（plan1 @0.15 → plan2）：Apply Weak+Vulnerable while losing only 2 HP keeps 64 HP for the long 143-HP fight; extra 15 damage isn't worth 10 more 

### Jev 低置信度（<0.35）决策：18 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 树叶史莱姆（小）, 防御, 打击 -> 树叶史莱姆（小）) with confidence 0.23; code rank 1 (0.23)
- 第 2 层 combat/plan-choice: Jev chose plan 1/4 (防御, 痛击 -> 树枝史莱姆（中）) with confidence 0.13; code rank 1 (0.13)
- 第 4 层 combat/plan-choice: Jev chose plan 1/2 (防御, 痛击 -> 缩小甲虫) with confidence 0.22; code rank 1 (0.22)
- 第 4 层 combat/plan-choice: Jev chose plan 2/3 (预备打击 -> 缩小甲虫, 痛击 -> 缩小甲虫) with confidence 0.30; code rank 2 (0.30)
- 第 5 层 combat/plan-choice: Jev chose plan 1/2 (防御, 无情猛攻 -> 毛绒伏地虫) with confidence 0.24; code rank 1 (0.24)
- 第 11 层 combat/plan-choice: Jev chose plan 1/3 (耸肩无视, 痛击+ -> 方柱构装体) with confidence 0.16; code rank 1 (0.16)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (防御, 坚毅, 打击 -> 藤蔓蹒跚者) with confidence 0.25; code rank 1 (0.25)
- 第 14 层 combat/plan-choice: Jev chose plan 1/3 (上勾拳 -> 藤蔓蹒跚者) with confidence 0.17; code rank 1 (0.17)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (彼岸咆哮) with confidence 0.20; code rank 1 (0.20)
- 第 19 层 combat/plan-choice: Jev chose plan 1/4 (预备打击 -> 外骨骼虫, 愤怒 -> 外骨骼虫, 痛击+ -> 外骨骼虫) with confidence 0.22; code rank 1 (0.22)
- 第 21 层 combat/plan-choice: Jev chose plan 1/4 (potion 力量药水, 预备打击 -> 幼虫, 愤怒 -> 幼虫) with confidence 0.15; code rank 1 (0.15)
- 第 21 层 combat/plan-choice: Jev chose plan 1/4 (防御+, 上勾拳 -> 直飞产卵虫) with confidence 0.15; code rank 1 (0.15)
- 第 21 层 combat/plan-choice: Jev chose plan 1/2 (预备打击 -> 幼虫, 愤怒 -> 幼虫, 打击+ -> 幼虫) with confidence 0.33; code rank 1 (0.33)
- 第 22 层 combat/plan-choice+potion: Jev chose plan 1/2 (挑衅 -> 异螨, 无情猛攻 -> 异螨, potion 虚弱药水 -> 异螨) with confidence 0.29; code rank 1 (0.29)
- 第 22 层 combat/plan-choice+potion: Jev chose plan 2/3 (毒素, 毒素, 愤怒 -> 异螨, 战斗专注, 防御) with confidence 0.31; code rank 2 [calc mismatch: solver says ending now kills, mod says safe] (0.31)
