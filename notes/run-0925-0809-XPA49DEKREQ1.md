## 复盘：run XPA49DEKREQ1 — 阵亡，最高第 17 层

- 决策 290 个；Jev 调用 33 次，Claude 0 次，DeepSeek 31 次；token 84,119 入 / 2,766 出，约 $0.0036；用时 23.1 分钟
- 决策者：code 193，deepseek 31，jev 27，deepseek-plan 18，jev-plan 15，code-fallback 6

### 战斗掉血（按层）
- 第 2 层 海洋混混: HP 80→71（-9），决策 code 6，code-fallback 2
- 第 3 层 蟾蜍蝌蚪: HP 77→71（-6），决策 code 6，jev 1，jev-plan 1，code-fallback 1
- 第 4 层 淤泥旋螺: HP 73→70（-3），决策 code 7，code-fallback 1，jev 1
- 第 5 层 卑鄙地精/地精佣兵/胖地精: HP 76→59（-17），决策 code 16，jev-plan 7，jev 5
- 第 6 层 海洋混混/钙化邪教徒: HP 65→60（-5），决策 code 6，jev 5，jev-plan 3
- 第 6 层 海洋混混: HP 60→60（-0），决策 jev 1，code 1，code-fallback 1
- 第 6 层 海洋混混: HP 60→60（-0），决策 code 3，jev 1，jev-plan 1
- 第 8 层 鬼祟珊瑚群: HP 80→71（-9），决策 deepseek 3，deepseek-plan 3，code 1
- 第 8 层 鬼祟珊瑚群: HP 71→48（-23），决策 deepseek 5，code 3，deepseek-plan 2
- 第 11 层 骇鳗: HP 54→51（-3），决策 code 3，deepseek 2，deepseek-plan 1
- 第 11 层 骇鳗: HP 51→33（-18），决策 code 10，deepseek 2，deepseek-plan 1
- 第 11 层 骇鳗: HP 33→33（-0），决策 code 1
- 第 12 层 双尾鼠: HP 39→32（-7），决策 code 9，jev 1，jev-plan 1，code-fallback 1
- 第 15 层 花园幽灵鳗: HP 54→54（-0），决策 deepseek 3
- 第 15 层 花园幽灵鳗: HP 54→37（-17），决策 code 16，deepseek 6，deepseek-plan 4，jev 1，jev-plan 1
- 第 17 层 灵魂异鱼: HP 67→67（-0），决策 code 1
- 第 17 层 灵魂异鱼: HP 67→67（-0），决策 code 3
- 第 17 层 灵魂异鱼: HP 67→15（-52），决策 code 25，deepseek-plan 7，deepseek 5，jev 2，jev-plan 1
- 第 17 层 灵魂异鱼: HP 15→15（-0），决策 code 7

### 死亡战斗：第 17 层 灵魂异鱼
- T11 [code] combat/plan: code plan (only distinct line): 剑柄打击 -> 灵魂异鱼, 双重打击 -> 灵魂异鱼; hp -0, dmg 28
- T11 [code] combat/plan: code plan (+11.8 over next): 双重打击 -> 灵魂异鱼; hp -0, dmg 16
- T11 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): 呼唤, 呼唤, 防御
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 呼唤
- T12 [code] combat/plan-continue: continuing the code-chosen plan: 防御
- T12 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-4): end turn

### 各类决策由谁做
- combat/plan / code: 87
- reward/claim / code: 23
- combat/plan-continue / code: 21
- combat/plan-choice / jev: 18
- combat/plan-continue / deepseek-plan: 18
- combat/plan-choice / deepseek: 15
- combat/plan-continue / jev-plan: 15
- combat/lethal / code: 14
- combat/plan-choice+potion / deepseek: 11
- map/route / code: 10
- reward/proceed / code: 9
- combat/plan-choice / code-fallback: 6
- map/route / jev: 6
- reward/card / code: 6
- rest/choose / code: 4
- rest/proceed / code: 4
- selection/exhaust / code: 4
- combat/least-loss / code: 2
- event/choose / deepseek: 2
- event/leave / code: 2
- reward/card / deepseek: 2
- selection/add / code: 2
- chest/open / code: 1
- chest/proceed / code: 1
- chest/relic / code: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/add / deepseek: 1
- selection/add / jev: 1
- selection/take into my hand / jev: 1
- selection/upgrade / code: 1

### 兜底介入（Claude/DeepSeek）：31 次（推翻 Jev 12 次）
- [deepseek] 第 1 层 TNone event/choose: 同意 Jev（o1 @0.36 → o1）：Random rare card is the biggest immediate power spike for act 1 elites; Fishing Rod is slow and Leaf Salve costs 12 max 
- [deepseek] 第 5 层 T7 reward/card: 同意 Jev（card0 @0.16 → card0）：燃烧契约抽2并消耗牌：可清灵魂异鱼的Beckon与状态牌，还能触发邪眼额外格挡，比随机消耗的坚毅更稳。
- [deepseek] 第 8 层 T1 combat/plan-choice: 同意 Jev（plan3 @0.26 → plan3）：Same 9 HP lost as plan1 but deals 14 not 8; hardened shell caps damage so extra hits are fine. Better than plan2/4 (more
- [deepseek] 第 8 层 T2 combat/plan-choice: 推翻 Jev（plan2 @0.15 → plan1）：Trading 5 HP for 9 damage speeds the elite kill; plan3 wastes damage to the 20 shell cap. Headbutt also sets up next tur
- [deepseek] 第 8 层 T2 combat/plan-choice: 同意 Jev（plan1 @0.05 → plan1）：Only 5 extra HP to deal 9 damage; ending the capped-damage elite sooner saves a full 14-damage turn, and 71 HP gives buf
- [deepseek] 第 8 层 T3 combat/plan-choice: 推翻 Jev（plan3 @0.14 → plan2）：Enemy's 20-damage cap means plan1's extra 5 isn't worth 8 HP; plan2 deals 15 for 1 HP, same 3-turn kill, best economy.
- [deepseek] 第 8 层 T3 combat/plan-choice: 同意 Jev（plan1 @0.35 → plan1）：Pommel Strike+Evil Eye deals damage while losing only 1 HP and gaining 8 block; best value against damage-capped colony.
- [deepseek] 第 8 层 T3 combat/plan-choice: 推翻 Jev（plan2 @0.04 → plan1）：Deal 9 damage to progress kill; enemy buffs each turn, so stalling with block costs more HP next turn than the 8 block s
- [deepseek] 第 8 层 T4 combat/plan-choice+potion: 同意 Jev（plan3 @0.29 → plan3）：Blocks 5 and deals 12, same HP loss as plan1 but more damage; keeps 48 HP and enemy at 13, likely killing next turn with
- [deepseek] 第 8 层 T4 combat/plan-choice+potion: 推翻 Jev（p0 @0.18 → plan1）：0 energy means potions can't reliably kill the 13 HP elite; eating 13 at 61/80 is fine, save potions for the act boss.
- [deepseek] 第 11 层 T1 combat/plan-choice: 同意 Jev（plan3 @0.30 → plan3）：Deals 6 while losing only 3 HP (dominates plan1/2); blocking 13 of 16 keeps chip damage minimal and advances the elite k
- [deepseek] 第 11 层 T1 combat/plan-choice: 同意 Jev（plan1 @0.41 → plan1）：9 damage plus a draw for only 3 HP is a good trade; racing the 140-HP elite matters more than blocking 3.
- [deepseek] 第 11 层 T3 combat/plan-choice+potion: 同意 Jev（plan1 @0.39 → plan1）：Keeps 28 HP with 8 block and still deals 20; our attack-heavy deck can cross the 70 stun threshold next turn, and this l
- [deepseek] 第 11 层 T3 combat/plan-choice+potion: 同意 Jev（plan1 @0.19 → plan1）：Trade 10 damage for only 14 HP while gaining 8 block; 28 HP survives a 22-hit, and the 70-HP stun is still reachable nex
- [deepseek] 第 12 层 T3 reward/card: 同意 Jev（card2 @0.29 → card2）：Colossus halves damage from vulnerable foes, a huge mitigation with Bash++ already applying 3 vulnerable; Taunt duplicat
- [deepseek] 第 14 层 TNone event/choose: 同意 Jev（o0 @0.34 → o0）：8 HP is cheap at 78% with Burning Blood healing; a relic outvalues 100 gold plus a random card that might dilute the dec
- [deepseek] 第 15 层 T1 combat/plan-choice+potion: 同意 Jev（plan4 @0.39 → plan4）：Best balance: 17 damage while losing only 10 HP and gaining 5 block, preserving HP in this long 4-enemy elite attrition 
- [deepseek] 第 15 层 T1 combat/plan-choice+potion: 推翻 Jev（plan3 @0.22 → plan2）：Most damage (17) at the same 15 HP cost as Bash; racing to kill the skittish eels before their buffs stack.
- [deepseek] 第 15 层 T1 combat/plan-choice+potion: 推翻 Jev（plan1 @0.39 → p2）：Long 4-enemy elite: a free power (Demon Form/Inflame/Combust) scales this attritional fight; free play stacks with Defen
- [deepseek] 第 15 层 T1 combat/plan-choice+potion: 同意 Jev（plan1 @0.48 → plan1）：Cheapest safe line: block with Defend+Rock Armor, lose only 10 HP at 54 HP, and save both potions for the act boss.

### Jev 低置信度（<0.35）决策：10 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/2 (打击 -> 蟾蜍蝌蚪, 剑柄打击 -> 蟾蜍蝌蚪, 防御) with confidence 0.16; code rank 1 (0.16)
- 第 4 层 combat/plan-choice: Jev chose plan 1/2 (痛殴 -> 淤泥旋螺, 邪眼, 打击 -> 淤泥旋螺) with confidence 0.06; code rank 1 (0.06)
- 第 5 层 combat/plan-choice: Jev chose plan 1/3 (剑柄打击 -> 地精佣兵, 防御, 防御) with confidence 0.31; code rank 1 (0.31)
- 第 5 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御) with confidence 0.26; code rank 1 (0.26)
- 第 5 层 combat/plan-choice: Jev chose plan 1/4 (邪眼, 防御, 防御) with confidence 0.28; code rank 1 (0.28)
- 第 5 层 combat/plan-choice: Jev chose plan 1/3 (防御, 防御, 打击 -> 地精佣兵) with confidence 0.14; code rank 1 (0.14)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (邪眼, 剑柄打击 -> 钙化邪教徒, 防御) with confidence 0.25; code rank 1 (0.25)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (防御) with confidence 0.23; code rank 1 (0.23)
- 第 6 层 combat/plan-choice: Jev chose plan 1/2 (防御, 燃烧契约, 邪眼) with confidence 0.18; code rank 1 (0.18)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (防御, 邪眼) with confidence 0.31; code rank 1 (0.31)
