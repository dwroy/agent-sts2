## 复盘：run T4PYMNJJFSU6 — 阵亡，最高第 33 层

- 决策 358 个；Jev 调用 53 次，Claude 0 次，DeepSeek 10 次；token 97,893 入 / 2,837 出，约 $0.0042；用时 18.5 分钟
- 决策者：code 262，jev 45，jev-plan 33，deepseek 10，code-fallback 8

### 战斗掉血（按层）
- 第 2 层 树叶史莱姆（中）/树叶史莱姆（小）/树枝史莱姆（小）: HP 64→56（-8），决策 code 8，code-fallback 1，jev 1
- 第 3 层 毛绒伏地虫: HP 62→57（-5），决策 code 8，jev 1，jev-plan 1
- 第 4 层 缩小甲虫: HP 63→62（-1），决策 code 4，code-fallback 1，jev 1，jev-plan 1
- 第 6 层 劫掠者斧手/劫掠者暴徒/劫掠者追踪手: HP 60→46（-14），决策 code 6，jev-plan 2，jev 1，code-fallback 1
- 第 8 层 蛮兽: HP 52→43（-9），决策 code 6，jev 1，jev-plan 1，code-fallback 1
- 第 9 层 多尼斯异鸟: HP 49→21（-28），决策 code 10，jev 4，jev-plan 1
- 第 12 层 树叶史莱姆（中）/飞蝇菌子: HP 51→49（-2），决策 code 8，jev-plan 2，jev 1
- 第 14 层 方柱构装体: HP 55→51（-4），决策 jev-plan 5，code 5，jev 3
- 第 17 层 仪式兽: HP 80→41（-39），决策 code 15，jev-plan 7，jev 5
- 第 19 层 地道虫: HP 70→70（-0），决策 jev 2，jev-plan 1
- 第 19 层 地道虫: HP 69→65（-4），决策 code 6，jev 1
- 第 19 层 地道虫: HP 64→64（-0），决策 code 6
- 第 20 层 外骨骼虫: HP 70→70（-0），决策 code 2
- 第 20 层 外骨骼虫: HP 69→69（-0），决策 code 2
- 第 28 层 蜂群术士: HP 80→57（-23），决策 jev 3，jev-plan 2，code 1
- 第 28 层 蜂群术士: HP 56→40（-16），决策 code 6，jev 1，jev-plan 1
- 第 30 层 熟睡甲虫/盛碗虫（丝）/盛碗虫（石）: HP 46→16（-30），决策 code 9，jev 6，jev-plan 4
- 第 31 层 幼虫/直飞产卵虫/结实的卵: HP 22→26（+4），决策 jev 4，code-fallback 3，code 3，jev-plan 2
- 第 31 层 幼虫/直飞产卵虫: HP 25→25（-0），决策 code 4，code-fallback 1，jev 1
- 第 33 层 火箭/碾碎爪: HP 55→55（-0），决策 code 1，jev 1，jev-plan 1
- 第 33 层 火箭/碾碎爪: HP 54→29（-25），决策 code 10，jev 3，jev-plan 2

### 死亡战斗：第 33 层 火箭/碾碎爪
- T2 [jev] combat/plan-choice: Jev chose plan 1/4 (战斗专注+, 防御, 燃烧+, potion 肌肉药水, 剑柄打击 -> 火箭) with confidence 0.87; code rank 1 conf 0.87
- T2 [code] combat/plan-guarded: code plan 燃烧+, potion 肌肉药水, 突破, 飞剑回旋镖 loses 32 HP, over the HP guard bound; playing 燃烧+, 耸肩无视, potion 肌肉药水, 剑柄打击 -> 火箭 instead (hp -16, dmg 18)
- T2 [code] combat/plan-continue: continuing the code-chosen plan: 耸肩无视
- T2 [code] combat/plan-continue: continuing the code-chosen plan: potion 肌肉药水
- T2 [code] combat/plan-guarded: code plan 飞剑回旋镖 loses 23 HP, over the HP guard bound; playing 剑柄打击 -> 火箭 instead (hp -16, dmg 18)
- T2 [code] combat/plan: code plan (only line): end turn; hp -16, dmg 0
- T3 [jev] combat/plan-choice: Jev chose plan 2/4 (痛击+ -> 碾碎爪, 狱火+) with confidence 0.33; code rank 2 conf 0.33
- T3 [jev-plan] combat/plan-continue: continuing the Jev-chosen plan: 狱火+
- T3 [code] combat/plan: code plan (only line): end turn; hp -9, dmg 0
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-11): 防御+, 旋风斩
- T4 [code] combat/plan-continue: continuing the code-chosen plan: 旋风斩
- T4 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-11): end turn

### 各类决策由谁做
- combat/plan / code: 63
- reward/claim / code: 35
- combat/plan-continue / jev-plan: 33
- combat/plan-choice / jev: 32
- combat/plan-continue / code: 32
- map/route / code: 26
- combat/lethal / code: 19
- reward/proceed / code: 15
- reward/card / code: 13
- combat/plan-choice+potion / jev: 7
- rest/choose / code: 7
- rest/proceed / code: 7
- shop/buy / code: 7
- event/leave / code: 6
- selection/exhaust / code: 6
- selection/remove / code: 6
- combat/plan-choice / code-fallback: 5
- event/choose / deepseek: 5
- map/route / jev: 5
- combat/plan-choice+potion / code-fallback: 3
- combat/plan-guarded / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- combat/least-loss / code: 2
- selection/upgrade / deepseek: 2
- chest/relic / code: 1
- combat/end_turn / code: 1
- combat/play / jev: 1
- map/route / deepseek: 1
- reward/card / deepseek: 1
- run/finalize / code: 1
- selection/add / code: 1
- selection/upgrade / code: 1
- shop/buy / deepseek: 1

### 兜底介入（Claude/DeepSeek）：10 次（推翻 Jev 4 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.32 → o2）：A8 keeps upgrades scarce; three guaranteed upgraded rewards now (later picks are chosen anyway) beat one random relic, a
- [deepseek] 第 7 层 TNone map/route: 同意 Jev（n1 @0.32 → n1）：Monster gives a guaranteed Silver-Furnace-upgraded card reward and gold; at 52 HP a normal Act 1 fight is safe, and Unkn
- [deepseek] 第 13 层 TNone event/choose: 同意 Jev（o0 @0.22 → o0）：Free pick from 5 cards, no HP cost; deck still needs block/strength and HP is better saved for the boss 4 floors away.
- [deepseek] 第 18 层 TNone event/choose: 推翻 Jev（o0 @0.07 → o1）：佩尔之牙：移除5张最弱牌（多余打击）暂时精简卡组，距boss还有15层，每场战斗后随机返还并升级1张，等于战前白得5次升级——长期收益最高。
- [deepseek] 第 19 层 T4 reward/card: 同意 Jev（skip @0.01 → skip）：完美打击在此牌组仅约12伤2费（3张口口相关牌），远弱于熔融之拳；牌组急需格挡，跳过保持精简。
- [deepseek] 第 21 层 TNone event/choose: 推翻 Jev（o1 @0.21 → o2）：石头的+1敏捷对只有1张格挡牌的卡组收益很低；用它换2件随机遗物，为12层后的帝王蟹boss积累战力更划算。
- [deepseek] 第 23 层 TNone event/choose: 同意 Jev（o1 @0.21 → o1）：5 HP is cheap for a two-relic choice and recovers at the four rest sites before Kaiser Crab; avoids the worst random dol
- [deepseek] 第 24 层 TNone shop/buy: 同意 Jev（buy_card0 @0.19 → buy_card0）：No shops left before boss, so 29 gold is dead; Boomerang is a cheap multi-hit strength payoff for this Inflame deck.
- [deepseek] 第 25 层 TNone selection/upgrade: 同意 Jev（card7 @0.19 → card7）：升级燃烧=永久3力量，本局力量来源稀缺（无恶魔形态），帝皇蟹408血+AOE多段攻击全靠力量放大；手册也要求第一次锻造升力量牌。
- [deepseek] 第 29 层 TNone selection/upgrade: 推翻 Jev（card5 @0.12 → card9）：本局无恶魔形态，永久力量是短板；燃烧升级+1力量放大拆卸/旋风斩/剑柄等多段输出，为帝皇蟹同回合秒双钳做准备。

### Jev 低置信度（<0.35）决策：11 个
- 第 3 层 combat/plan-choice: Jev chose plan 1/3 (痛击 -> 毛绒伏地虫, 打击 -> 毛绒伏地虫) with confidence 0.33; code rank 1 (0.33)
- 第 6 层 combat/plan-choice: Jev chose plan 1/4 (狱火+, 防御, 打击 -> 劫掠者追踪手) with confidence 0.23; code rank 1 (0.23)
- 第 8 层 combat/plan-choice: Jev chose plan 1/4 (痛击+ -> 蛮兽, 剑柄打击 -> 蛮兽) with confidence 0.12; code rank 1 (0.12)
- 第 12 层 combat/plan-choice: Jev chose plan 2/4 (防御, 燃烧, 旋风斩) with confidence 0.34; code rank 2 (0.34)
- 第 14 层 combat/plan-choice: Jev chose plan 1/4 (防御, 燃烧, 突破) with confidence 0.27; code rank 1 (0.27)
- 第 17 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 仪式兽, 突破, 打击 -> 仪式兽) with confidence 0.13; code rank 1; HP guard: plan 1 (打击 -> 仪式兽, 突破, 打击 -> 仪式兽) loses 22 HP, more than 6  (0.13)
- 第 19 层 combat/plan-choice: Jev chose plan 2/4 (燃烧, 烙印, 剑柄打击 -> 地道虫) with confidence 0.32; code rank 2 (0.32)
- 第 28 层 combat/plan-choice: Jev chose plan 1/4 (燃烧+, 痛击+ -> 蜂群术士) with confidence 0.33; code rank 1 (0.33)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 3/4 (痛击+ -> 熟睡甲虫, 防御) with confidence 0.05; code rank 3 (0.05)
- 第 30 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.11; code rank 1 (0.11)
- 第 33 层 combat/plan-choice: Jev chose plan 2/4 (痛击+ -> 碾碎爪, 狱火+) with confidence 0.33; code rank 2 (0.33)
