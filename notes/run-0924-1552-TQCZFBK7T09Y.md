## 复盘：run TQCZFBK7T09Y — 阵亡，最高第 31 层

- 决策 401 个；Jev 调用 33 次，Claude 0 次，DeepSeek 38 次；token 105,192 入 / 3,023 出，约 $0.0045；用时 14.1 分钟
- 决策者：code 288，deepseek 38，jev 29，jev-plan 23，deepseek-plan 19，code-fallback 4

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 80→68（-12），决策 code 7，jev-plan 2，jev 1，code-fallback 1
- 第 3 层 噬尸蛞蝓: HP 74→65（-9），决策 code 6，jev 2，jev-plan 1，code-fallback 1
- 第 4 层 海洋混混: HP 71→57（-14），决策 code 6，jev 1，jev-plan 1
- 第 5 层 噬尸蛞蝓: HP 63→55（-8），决策 code 13，code-fallback 2
- 第 8 层 花园幽灵鳗: HP 61→40（-21），决策 code 9，deepseek 2，deepseek-plan 1
- 第 11 层 鬼祟珊瑚群: HP 87→64（-23），决策 code 4，jev-plan 3，deepseek 3，deepseek-plan 2，jev 1
- 第 13 层 骇鳗: HP 70→50（-20），决策 code 8，deepseek 4，deepseek-plan 4
- 第 15 层 花园幽灵鳗: HP 56→46（-10），决策 code 7，deepseek 4，deepseek-plan 3
- 第 17 层 灵魂异鱼: HP 87→44（-43），决策 code 20，deepseek-plan 2，deepseek 1
- 第 19 层 外骨骼虫: HP 87→86（-1），决策 code 9，jev 1，jev-plan 1
- 第 20 层 地道虫: HP 87→80（-7），决策 code 10，jev-plan 3，jev 2
- 第 22 层 猎人杀手: HP 86→59（-27），决策 code 17，jev 2
- 第 23 层 棘刺蟾蜍: HP 65→39（-26），决策 code 8，jev 3，jev-plan 3
- 第 27 层 感染棱柱: HP 86→66（-20），决策 code 6，deepseek 4，deepseek-plan 4，jev-plan 3，jev 1
- 第 27 层 感染棱柱: HP 66→66（-0），决策 deepseek 1
- 第 27 层 感染棱柱: HP 66→36（-30），决策 code 5
- 第 28 层 虱虫之祖: HP 42→33（-9），决策 jev-plan 6，code 6，jev 3
- 第 30 层 幼虫/直飞产卵虫/结实的卵: HP 39→18（-21），决策 code 12，deepseek-plan 3，deepseek 1，jev 1
- 第 31 层 残杀千足虫: HP 24→10（-14），决策 code 11

### 死亡战斗：第 31 层 残杀千足虫
- T1 [code] combat/plan: code plan (only line): 坚定不移, 痛击+ -> 残杀千足虫, 打击 -> 残杀千足虫, 势不可当; hp -14, dmg 20
- T1 [code] combat/plan-continue: continuing the code-chosen plan: 痛击+ -> 残杀千足虫
- T1 [code] combat/plan-continue: continuing the code-chosen plan: 打击 -> 残杀千足虫
- T1 [code] combat/plan-continue: continuing the code-chosen plan: 势不可当
- T1 [code] combat/end_turn: no playable cards; ending the turn
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 开悟, 无惧疼痛, 欺凌+ -> 残杀千足虫, 剑柄打击 -> 残杀千足虫, 打击 -> 残杀千足虫
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 无惧疼痛
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 欺凌+ -> 残杀千足虫
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 剑柄打击 -> 残杀千足虫
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 打击 -> 残杀千足虫
- T2 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): end turn

### 各类决策由谁做
- combat/plan-continue / code: 53
- combat/plan / code: 47
- reward/claim / code: 46
- combat/end_turn / code: 42
- combat/plan-continue / jev-plan: 23
- map/route / code: 23
- combat/lethal / code: 19
- combat/plan-continue / deepseek-plan: 19
- combat/plan-choice / jev: 18
- combat/plan-choice / deepseek: 16
- reward/proceed / code: 16
- reward/card / code: 9
- event/leave / code: 6
- event/choose / deepseek: 5
- map/route / jev: 5
- reward/card / deepseek: 5
- shop/buy / deepseek: 5
- combat/plan-choice / code-fallback: 4
- combat/plan-choice+potion / deepseek: 4
- rest/proceed / code: 4
- combat/least-loss / code: 3
- selection/remove / code: 3
- shop/buy / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- map/route / deepseek: 2
- rest/choose / code: 2
- rest/choose / jev: 2
- reward/card / jev: 2
- shop/leave / code: 2
- shop/open / code: 2
- event/choose / jev: 1
- run/finalize / code: 1
- selection/choose / deepseek: 1
- selection/choose / jev: 1
- selection/upgrade / code: 1

### 兜底介入（Claude/DeepSeek）：38 次（推翻 Jev 13 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.08 → o2）：Two relics early is huge value; the added Strike/Defend is a minor cost for a strong run-long boost.
- [deepseek] 第 5 层 T4 reward/card: 同意 Jev（card1 @0.28 → card1）：Act 1 boss needs damage; Twin Strike adds 10 dmg for 1E, better than block or skip.
- [deepseek] 第 5 层 T4 map/route: 同意 Jev（n2 @0.27 → n2）：Shop lets me spend 159 gold on key cards/relics before elites; highest route value and avoids early elite risk.
- [deepseek] 第 6 层 TNone shop/buy: 同意 Jev（leave @0.22 → leave）：No card here meaningfully improves a 15-card starter deck; save gold for a stronger shop or card removal later.
- [deepseek] 第 7 层 TNone event/choose: 推翻 Jev（o0 @0.29 → o1）：Card removal is stronger long-term; deck has 15 cards with basics, trimming improves consistency for the whole run.
- [deepseek] 第 8 层 T2 combat/plan-choice: 推翻 Jev（plan2 @0.21 → plan1）：Kills the 13 HP eel, removing a buffing enemy; 10 HP loss is acceptable with Burning Blood healing after combat.
- [deepseek] 第 8 层 T3 combat/plan-choice: 同意 Jev（plan1 @0.42 → plan1）：Kill threat faster; Bash applies Vulnerable to both, boosting future damage. Only 3 HP lost, acceptable.
- [deepseek] 第 11 层 T2 combat/plan-choice: 同意 Jev（plan1 @0.14 → plan1）：Deal 20 damage while taking only 9; faster kill saves more HP over the fight than turtling.
- [deepseek] 第 11 层 T2 combat/plan-choice: 同意 Jev（plan1 @0.28 → plan1）：Best balance: 12 damage, only 9 HP lost, keeps tempo. Plan2 loses 5 more HP for 7 damage; not worth it.
- [deepseek] 第 11 层 T3 combat/plan-choice: 推翻 Jev（plan3 @0.15 → plan1）：痛击易伤后剑柄打击，20伤害最高，下回合易伤仍可爆发，9血损失可接受。
- [deepseek] 第 13 层 T1 combat/plan-choice: 推翻 Jev（plan1 @0.17 → plan2）：Saves 5 HP for only 8 less damage; early elite, preserving HP matters more than racing.
- [deepseek] 第 13 层 T2 combat/plan-choice: 同意 Jev（plan1 @0.05 → plan1）：Deal max damage now; 9 HP loss is fine with Burning Blood healing and 59 HP. Faster kill reduces future elite damage.
- [deepseek] 第 13 层 T2 combat/plan-choice: 同意 Jev（plan1 @0.11 → plan1）：Deal damage now; 9 HP loss is fine with Burning Blood healing and high HP. Racing the elite beats blocking.
- [deepseek] 第 13 层 T4 combat/plan-choice: 推翻 Jev（plan2 @0.12 → plan1）：痛击+ applies Vulnerable 3, boosting all later attacks; 20 now beats 24 without setup for the remaining 34 HP.
- [deepseek] 第 13 层 T5 reward/card: 同意 Jev（card0 @0.38 → card0）：拆卸 synergizes with 痛击++ vulnerable; strong single-target damage for boss, better than other options.
- [deepseek] 第 14 层 TNone event/choose: 同意 Jev（o0 @0.19 → o0）：Treasure map gives future gold/relic value with no HP cost; 8 HP for a random potion is worse.
- [deepseek] 第 15 层 T1 combat/plan-choice: 同意 Jev（plan1 @0.45 → plan1）：Potion adds strength for whole fight; kills one eel and deals 35, no HP lost. Best tempo vs 4 enemies.
- [deepseek] 第 15 层 T1 combat/plan-choice: 推翻 Jev（plan1 @0.36 → plan2）：Zero HP loss, preserves block; 6 Strength already makes future attacks lethal, no need to chip now.
- [deepseek] 第 15 层 T2 combat/plan-choice: 推翻 Jev（plan2 @0.33 → plan1）：Kills two eels, removes 14 incoming damage, best HP trade and board state for the fight.
- [deepseek] 第 15 层 T2 combat/plan-choice: 同意 Jev（plan1 @0.20 → plan1）：Kills one eel, removes 7-damage attacker; only 10 HP lost and faster fight clear.

### Jev 低置信度（<0.35）决策：5 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (防御, 打击 -> 蟾蜍蝌蚪, 打击 -> 蟾蜍蝌蚪) with confidence 0.09; code rank 1 (0.09)
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (防御) with confidence 0.04; code rank 1 (0.04)
- 第 19 层 combat/plan-choice: Jev chose plan 1/4 (防御, 剑柄打击 -> 外骨骼虫, 双重打击 -> 外骨骼虫) with confidence 0.26; code rank 1 (0.26)
- 第 23 层 combat/plan-choice: Jev chose plan 1/4 (剑柄打击 -> 棘刺蟾蜍, 防御, 防御) with confidence 0.34; code rank 1 (0.34)
- 第 23 层 combat/plan-choice: Jev chose plan 1/3 (防御, 双重打击 -> 棘刺蟾蜍, 防御) with confidence 0.25; code rank 1 (0.25)
