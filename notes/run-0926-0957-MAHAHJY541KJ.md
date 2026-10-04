## 复盘：run MAHAHJY541KJ — 阵亡，最高第 33 层

- 决策 420 个；Jev 调用 48 次，Claude 0 次，DeepSeek 13 次；token 89,576 入 / 2,507 出，约 $0.0039；用时 22.9 分钟
- 决策者：code 327，jev 38，jev-plan 32，deepseek 13，code-fallback 10

### 战斗掉血（按层）
- 第 2 层 噬尸蛞蝓: HP 64→56（-8），决策 code 10，jev-plan 2，code-fallback 1，jev 1
- 第 3 层 蟾蜍蝌蚪: HP 62→56（-6），决策 code 5，jev-plan 2，jev 1
- 第 5 层 淤泥旋螺: HP 60→56（-4），决策 code 8，jev 1，jev-plan 1
- 第 6 层 化石追踪者: HP 62→47（-15），决策 jev-plan 4，code 3，jev 2，code-fallback 1
- 第 8 层 双尾鼠: HP 53→35（-18），决策 code 9，jev 3，jev-plan 3
- 第 12 层 卑鄙地精/地精佣兵/胖地精: HP 41→30（-11），决策 code 14，code-fallback 1
- 第 14 层 气态炸弹/活雾: HP 60→58（-2），决策 code 12，jev 1，jev-plan 1
- 第 15 层 下水道蚌: HP 64→64（-0），决策 code 8，jev 1
- 第 17 层 灵魂异鱼: HP 70→70（-0），决策 code 1
- 第 17 层 灵魂异鱼: HP 70→54（-16），决策 code 21，jev 3，jev-plan 3
- 第 19 层 外骨骼虫: HP 76→69（-7），决策 code 8，code-fallback 2，jev 1
- 第 20 层 盛碗虫（石）/盛碗虫（蜜）: HP 75→70（-5），决策 code 13，jev 1
- 第 22 层 外骨骼虫: HP 76→74（-2），决策 code 13，jev 1
- 第 24 层 感染棱柱: HP 80→49（-31），决策 code 13，jev-plan 7，jev 6
- 第 28 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 55→50（-5），决策 code 9，code-fallback 1
- 第 28 层 盛碗虫（丝）/盛碗虫（蜜）: HP 50→50（-0），决策 code 5，jev 2，jev-plan 1
- 第 31 层 寄生惧魔/胧光怪: HP 56→31（-25），决策 code 19，jev-plan 4，jev 3，code-fallback 1
- 第 33 层 无厌沙虫: HP 61→61（-0），决策 code 6，jev-plan 2，jev 1
- 第 33 层 无厌沙虫: HP 61→15（-46），决策 code 13，jev 4，code-fallback 3，jev-plan 2

### 死亡战斗：第 33 层 无厌沙虫
- T5 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 耸肩无视
- T5 [code-fallback] combat/plan-choice+potion: Jev chose a potion at 0.15 in a boss fight while a potion-free line loses no more HP; using the code-best plan
- T5 [code] combat/plan-continue: continuing the code-chosen plan: 剑柄打击 -> 无厌沙虫
- T5 [jev] combat/plan-choice+potion: Jev chose to drink 镣铐药水 (confidence 0.56) conf 0.56
- T5 [code] combat/plan: code plan (only line): end turn; hp -0, dmg 0
- T6 [code] combat/plan: code plan (only line): 狂乱逃离, 狂乱逃离; hp -20, dmg 0 [calc mismatch: solver says ending now kills, mod says safe]
- T6 [code] combat/plan-continue: continuing the code-chosen plan: 狂乱逃离
- T7 [code] combat/lethal: lethal: 拆卸 -> 无厌沙虫, 打击+ -> 无厌沙虫, 痛殴 -> 无厌沙虫, 愤怒 -> 无厌沙虫
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 打击+ -> 无厌沙虫
- T7 [code] combat/plan-continue: continuing the code-chosen plan: 痛殴 -> 无厌沙虫
- T7 [code] combat/least-loss: every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg 0): 耸肩无视
- T7 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-3): end turn

### 各类决策由谁做
- combat/plan / code: 91
- combat/plan-continue / code: 68
- reward/claim / code: 38
- combat/plan-continue / jev-plan: 32
- combat/plan-choice / jev: 27
- map/route / code: 26
- combat/lethal / code: 18
- reward/proceed / code: 16
- reward/card / code: 12
- combat/end_turn / code: 9
- selection/remove / code: 8
- combat/plan-choice / code-fallback: 7
- event/leave / code: 7
- event/choose / deepseek: 6
- combat/plan-choice+potion / jev: 5
- map/route / jev: 5
- rest/proceed / code: 4
- reward/card / deepseek: 4
- shop/buy / code: 4
- combat/plan-choice+potion / code-fallback: 3
- shop/leave / code: 3
- sphere/clear / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- combat/least-loss / code: 2
- combat/plan-potion / code: 2
- event/only / code: 2
- rest/choose / code: 2
- rest/choose / deepseek: 2
- selection/add / code: 2
- shop/open / code: 2
- run/finalize / code: 1
- selection/take into my hand / jev: 1
- shop/buy / deepseek: 1
- sphere/proceed / code: 1

### 兜底介入（Claude/DeepSeek）：13 次（推翻 Jev 7 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.27 → o2）：Two random relics at floor 1 give lasting power and a chance at strength/energy; the added Strike and Defend are removab
- [deepseek] 第 3 层 T3 reward/card: 同意 Jev（card0 @0.10 → card0）：0-cost 6 damage fixes early output, fuels 双截棍, scales with future strength; 3E block without strength is off-curve and S
- [deepseek] 第 4 层 TNone shop/buy: 推翻 Jev（buy_potion1 @0.18 → buy_card1）：Deck lacks damage; Bully at 35g combos with Bash's 2 vulnerable (8 base, ~12 effective) and beats a one-shot random colo
- [deepseek] 第 11 层 TNone event/choose: 推翻 Jev（o0 @0.00 → o1）：Trade situational Ash Water for an upgraded uncommon skill — deck badly needs block/draw; Strength Potion kept for Soul 
- [deepseek] 第 11 层 TNone reward/card: 同意 Jev（card2 @0.20 → card2）：Second Wind+ gives sorely needed block (only 1 block card) and exhausts Beckons, Clumsy, Ascender's Bane for the Soul Fy
- [deepseek] 第 16 层 TNone rest/choose: 同意 Jev（o2 @0.19 → o2）：满血附近治疗只回10点，浪费；牌组零力量来源，锻炼+1永久力量在灵魂异鱼长战中收益超过升级单张牌。
- [deepseek] 第 17 层 T7 reward/card: 同意 Jev（card0 @0.22 → card0）：Thrash gives efficient multi-hit damage and thins weak attacks; Unmovable is too slow with few block cards, and Beckon i
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o0 @0.37 → o1）：Pael's Tooth gives 5 upgrades plus temporary deck thinning; other relics weak with 1 block card and cheap deck.
- [deepseek] 第 21 层 TNone event/choose: 同意 Jev（o1 @0.11 → o1）：Removal beats two Enlightenment cards: deck is bloated (23) with no strength source; cutting a Strike/curse raises quali
- [deepseek] 第 25 层 TNone rest/choose: 推翻 Jev（o0 @0.28 → o2）：牌组零力量来源，永久+1力量配合15张攻击与易伤长期收益最高；69%血且boss前仍有休息点，回血可留到那时。
- [deepseek] 第 27 层 TNone event/choose: 同意 Jev（o0 @0.28 → o0）：51 gold beats a permanent Debt curse in a 25-card deck with no exhaust; gold is the cheaper resource, and 117 remaining 
- [deepseek] 第 30 层 TNone event/choose: 推翻 Jev（o0 @0.09 → o1）：锚只给一次性10格挡，长战价值最低；护喉甲每回合覆甲与折扇的每3攻击4格挡对本套15攻击、缺格挡更关键，留它们、换出锚。
- [deepseek] 第 31 层 T6 reward/card: 推翻 Jev（skip @0.21 → card2）：18-damage AOE that replays from the exhaust pile adds the damage this scaling-less deck needs for Insatiable's race and 

### Jev 低置信度（<0.35）决策：14 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/4 (打击 -> 蟾蜍蝌蚪, 狱火, 防御) with confidence 0.17; code rank 1 (0.17)
- 第 5 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 淤泥旋螺, 防御) with confidence 0.08; code rank 1 (0.08)
- 第 6 层 combat/plan-choice: Jev chose plan 1/3 (双重打击 -> 化石追踪者, 防御, 防御) with confidence 0.13; code rank 1 (0.13)
- 第 6 层 combat/plan-choice: Jev chose plan 1/4 (痛击 -> 化石追踪者, 打击 -> 化石追踪者, 欺凌 -> 化石追踪者) with confidence 0.32; code rank 1 (0.32)
- 第 8 层 combat/plan-choice: Jev chose plan 1/2 (双重打击 -> 双尾鼠, 愤怒 -> 双尾鼠, 打击 -> 双尾鼠) with confidence 0.26; code rank 1 (0.26)
- 第 15 层 combat/plan-choice: Jev chose plan 1/3 (剑柄打击 -> 下水道蚌, 打击 -> 下水道蚌, 狱火) with confidence 0.19; code rank 1 (0.19)
- 第 24 层 combat/plan-choice: Jev chose plan 2/3 (熔融之拳 -> 感染棱柱, 恶魔之焰 -> 感染棱柱) with confidence 0.30; code rank 2; HP guard: plan 2 (熔融之拳 -> 感染棱柱, 恶魔之焰 -> 感染棱柱) loses 8 HP, more than (0.30)
- 第 24 层 combat/plan-choice: Jev chose plan 3/3 (欺凌 -> 感染棱柱, 打击+ -> 感染棱柱, 防御, 拆卸 -> 感染棱柱) with confidence 0.16; code rank 3 (0.16)
- 第 24 层 combat/plan-choice: Jev chose plan 2/3 (痛殴 -> 感染棱柱, 打击+ -> 感染棱柱) with confidence 0.29; code rank 2; HP guard: plan 2 (痛殴 -> 感染棱柱, 打击+ -> 感染棱柱) loses 12 HP, more than 6 ov (0.29)
- 第 31 层 combat/plan-choice: Jev chose plan 1/2 (头槌 -> 胧光怪, 打击+ -> 胧光怪, 痛殴 -> 胧光怪) with confidence 0.22; code rank 1 (0.22)
- 第 31 层 combat/plan-choice: Jev chose plan 1/3 (打击+ -> 胧光怪) with confidence 0.30; code rank 1 (0.30)
- 第 31 层 combat/plan-choice: Jev chose plan 2/2 (防御, 愤怒 -> 寄生惧魔, 熔融之拳 -> 寄生惧魔, 防御) with confidence 0.19; code rank 2 (0.19)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 3/4 (预备打击 -> 无厌沙虫, 狂乱逃离, 痛殴 -> 无厌沙虫, 愤怒 -> 无厌沙虫) with confidence 0.06; code rank 3; HP guard: plan 3 (预备打击 -> 无厌沙虫, 狂乱逃离, 痛殴 -> 无厌沙虫, 愤 (0.06)
- 第 33 层 combat/plan-choice+potion: Jev chose plan 1/4 (预备打击 -> 无厌沙虫, 痛殴 -> 无厌沙虫, 愤怒 -> 无厌沙虫) with confidence 0.17; code rank 1 (0.17)
