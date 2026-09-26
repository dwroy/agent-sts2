## 复盘：run 9NE1DHFGZC2K — 阵亡，最高第 33 层

- 决策 438 个；Jev 调用 57 次，Claude 0 次，DeepSeek 50 次；token 149,609 入 / 4,665 出，约 $0.0065；用时 27.0 分钟
- 决策者：code 288，deepseek 50，jev 47，jev-plan 30，deepseek-plan 13，code-fallback 10

### 战斗掉血（按层）
- 第 2 层 蟾蜍蝌蚪: HP 80→73（-7），决策 code 9，code-fallback 1，jev 1，jev-plan 1
- 第 3 层 淤泥旋螺: HP 79→78（-1），决策 code 7，code-fallback 2
- 第 4 层 海洋混混: HP 80→80（-0），决策 jev-plan 4，code 4，jev 2，code-fallback 1
- 第 5 层 下水道蚌: HP 80→80（-0），决策 code 11，jev 4，code-fallback 2，jev-plan 2
- 第 8 层 海洋混混/钙化邪教徒: HP 80→59（-21），决策 code 9，code-fallback 1
- 第 12 层 卑鄙地精/地精佣兵/胖地精: HP 63→54（-9），决策 code 5，jev 3，jev-plan 2，code-fallback 1
- 第 15 层 噬尸蛞蝓: HP 58→55（-3），决策 code 10，code-fallback 1
- 第 17 层 瀑布巨兽: HP 80→65（-15），决策 deepseek 15，code 15，deepseek-plan 6，jev 5，jev-plan 4
- 第 19 层 地道虫: HP 80→68（-12），决策 code 4，jev 3，jev-plan 3
- 第 21 层 外骨骼虫: HP 60→47（-13），决策 code 13，jev 1
- 第 23 层 盛碗虫（丝）/盛碗虫（石）/盛碗虫（蜜）: HP 54→24（-30），决策 code 12，jev 6，jev-plan 3，deepseek 1
- 第 27 层 幼虫/直飞产卵虫/结实的卵: HP 55→40（-15），决策 code 14，jev-plan 5，jev 4
- 第 30 层 蜂群术士: HP 71→66（-5），决策 deepseek 5，jev 4，jev-plan 4，code 3，deepseek-plan 2
- 第 31 层 棘刺蟾蜍: HP 53→39（-14），决策 code 7，jev 2，jev-plan 2，deepseek 1，deepseek-plan 1，code-fallback 1
- 第 33 层 知识恶魔: HP 71→71（-0），决策 jev 1，deepseek 1
- 第 33 层 知识恶魔: HP 71→65（-6），决策 code 3，deepseek 2，deepseek-plan 2
- 第 33 层 知识恶魔: HP 65→45（-20），决策 code 10，deepseek 3，deepseek-plan 2
- 第 33 层 知识恶魔: HP 45→9（-36），决策 code 13，deepseek 2
- 第 33 层 知识恶魔: HP 9→9（-0），决策 code 3

### 死亡战斗：第 33 层 知识恶魔
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 耸肩无视, 打击+ -> 知识恶魔
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): 打击+ -> 知识恶魔
- T10 [code] combat/least-loss: every simulated line dies; playing the one that keeps the most HP (-2): end turn

### 各类决策由谁做
- combat/plan / code: 92
- combat/plan-continue / code: 41
- reward/claim / code: 39
- combat/plan-continue / jev-plan: 30
- map/route / code: 25
- combat/plan-choice / jev: 23
- combat/plan-choice+potion / deepseek: 19
- combat/lethal / code: 15
- reward/proceed / code: 14
- combat/plan-choice+potion / jev: 13
- combat/plan-continue / deepseek-plan: 13
- combat/plan-choice / deepseek: 11
- combat/plan-choice / code-fallback: 10
- reward/card / code: 9
- shop/buy / deepseek: 8
- event/leave / code: 7
- map/route / jev: 7
- event/choose / deepseek: 6
- rest/proceed / code: 6
- selection/remove / code: 6
- shop/buy / code: 6
- rest/choose / code: 5
- reward/card / deepseek: 4
- combat/least-loss / code: 3
- selection/curse / code: 3
- shop/leave / code: 3
- shop/open / code: 3
- chest/open / code: 2
- chest/proceed / code: 2
- chest/relic / code: 2
- selection/remove / deepseek: 2
- selection/upgrade / code: 2
- combat/end_turn / code: 1
- event/choose / jev: 1
- rest/choose / jev: 1
- reward/card / jev: 1
- run/finalize / code: 1
- selection/take into my hand / code: 1
- shop/buy / jev: 1

### 兜底介入（Claude/DeepSeek）：50 次（推翻 Jev 27 次）
- [deepseek] 第 1 层 TNone event/choose: 推翻 Jev（o1 @0.20 → o0）：Floor 1: a random relic is guaranteed value with no deck dilution; transforming one Strike is a coin flip and adding See
- [deepseek] 第 5 层 T6 reward/card: 推翻 Jev（card2 @0.26 → card1）：御血术1费15伤，是前期高效输出；加速击杀瀑布巨兽可减少蒸汽层数和自爆伤害，牌组正缺输出牌。
- [deepseek] 第 6 层 TNone event/choose: 同意 Jev（o1 @0.33 → o1）：Random upgrade beats 4 max HP for 40g early; gold is better saved for shop removals, and deck has fresh attacks worth up
- [deepseek] 第 9 层 TNone event/choose: 同意 Jev（o0 @0.28 → o0）：藏宝图价值更高：能带来额外宝藏（遗物+金币），比随机一瓶药水划算；当前 63 血无需靠掉血换资源。
- [deepseek] 第 17 层 T1 combat/plan-choice+potion: 同意 Jev（plan1 @0.15 → plan1）：Full HP, enemy only buffing and 0 energy left this turn; no benefit from potions now, save them for when damage matters.
- [deepseek] 第 17 层 T2 combat/plan-choice+potion: 同意 Jev（plan1 @0.22 → plan1）：Full 80 HP: race the growing-explosion boss. Trade 6 more HP for 9 more damage now, shortening the fight and the eventua
- [deepseek] 第 17 层 T2 combat/plan-choice+potion: 同意 Jev（plan2 @0.31 → plan2）：At full HP vs Waterfall Giant, guide says don't trade HP for damage; block to keep HP above steam eruption stacks.
- [deepseek] 第 17 层 T2 combat/plan-choice+potion: 同意 Jev（plan1 @0.28 → plan1）：Full HP, only 2 damage at risk; 0 energy makes potions near-useless now—save Regen/Oil for the explosion phase and burst
- [deepseek] 第 17 层 T3 combat/plan-choice+potion: 同意 Jev（plan1 @0.35 → plan1）：Near-full HP; saving potions for the explosion turn and emergencies. Regen would be wasted, and no card plan avoids the 
- [deepseek] 第 17 层 T4 combat/plan-choice+potion: 推翻 Jev（plan2 @0.29 → plan1）：Enemy isn't attacking, so maximize damage. 1 HP for +13 damage is a great trade and shortens the fight before Steam Erup
- [deepseek] 第 17 层 T4 combat/plan-choice+potion: 推翻 Jev（plan1 @0.32 → p0）：No attack incoming, so regen heals 6 now plus later turns for free; Snecko Oil with 0 energy is a wasteful gamble, bette
- [deepseek] 第 17 层 T5 combat/plan-choice+potion: 同意 Jev（plan2 @0.12 → plan2）：Blocks most of the 20 hit while chipping 15; keeps HP high for the scaling self-destruct, unlike plan1's costly race.
- [deepseek] 第 17 层 T5 combat/plan-choice+potion: 推翻 Jev（plan1 @0.14 → plan2）：Blocks, chips 13, draws 2 cards; Waterfall Giant guide says keep HP above steam explosion, don't trade HP for damage.
- [deepseek] 第 17 层 T5 combat/plan-choice+potion: 推翻 Jev（plan2 @0.29 → plan1）：Deal 13 and draw (13 dmg ~5% boss) for only 8 more HP than Defend+; ending the 123 HP boss sooner outweighs the HP cost,
- [deepseek] 第 17 层 T5 combat/plan-choice+potion: 推翻 Jev（plan1 @0.25 → p1）：Snecko Oil can draw cards and randomize costs, letting us use our dead 0-energy hand to damage or kill the boss now, red
- [deepseek] 第 17 层 T6 combat/plan-choice: 同意 Jev（plan1 @0.39 → plan1）：Max damage now; Hemokinesis trades only 2 HP for 15 dmg (more with Vulnerable). Killing faster shrinks the growing self-
- [deepseek] 第 17 层 T8 combat/plan-choice: 推翻 Jev（plan1 @0.23 → plan2）：Maximizes damage and applies Vulnerable 4, setting up a kill next turn; the 8 HP cost is worth avoiding an extra turn of
- [deepseek] 第 17 层 T10 combat/plan-choice: 同意 Jev（plan1 @0.19 → plan1）：Explosion turn: damage to the corpse is wasted, so minimize HP loss. Plan1 takes only 23 damage and survives at 42/80.
- [deepseek] 第 17 层 T10 combat/plan-choice: 同意 Jev（plan1 @0.35 → plan1）：Enemy is the 999999999-HP wreckage about to self-destruct; damage is wasted. Blocking loses least HP (18) and keeps me s
- [deepseek] 第 17 层 T10 reward/card: 推翻 Jev（card1 @0.41 → card2）：祭品是S级0费引擎：+2能量抽3张，补足这套牌严重缺乏的过牌与爆发，且消耗不污染牌组；对巨型喷发战与整场爬升都最优。

### Jev 低置信度（<0.35）决策：10 个
- 第 2 层 combat/plan-choice: Jev chose plan 1/3 (防御+, 痛击 -> 蟾蜍蝌蚪) with confidence 0.29; code rank 1 (0.29)
- 第 4 层 combat/plan-choice: Jev chose plan 1/3 (打击 -> 海洋混混, 防御+) with confidence 0.31; code rank 1 (0.31)
- 第 12 层 combat/plan-choice: Jev chose plan 1/3 (痛击+ -> 地精佣兵, 剑柄打击 -> 地精佣兵, 防御) with confidence 0.24; code rank 1 (0.24)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (耸肩无视, 打击+ -> 地道虫, 打击+ -> 地道虫) with confidence 0.05; code rank 1 (0.05)
- 第 19 层 combat/plan-choice: Jev chose plan 1/2 (打击+ -> 地道虫, 打击+ -> 地道虫) with confidence 0.32; code rank 1 (0.32)
- 第 23 层 combat/plan-choice+potion: Jev chose plan 1/4 (突破, 剑柄打击 -> 盛碗虫（蜜）, 防御+) with confidence 0.33; code rank 1 (0.33)
- 第 23 层 combat/plan-choice+potion: Jev chose plan 1/2 (防御+) with confidence 0.33; code rank 1 (0.33)
- 第 23 层 combat/plan-choice+potion: Jev chose plan 1/1 (end turn) with confidence 0.06; code rank 1 (0.06)
- 第 23 层 combat/plan-choice+potion: Jev chose plan 1/4 (御血术 -> 盛碗虫（石）, 耸肩无视, 打击+ -> 盛碗虫（蜜）, 双重打击 -> 盛碗虫（蜜）) with confidence 0.27; code rank 1 (0.27)
- 第 31 层 combat/plan-choice: Jev chose plan 1/4 (拆卸 -> 棘刺蟾蜍, 挑衅 -> 棘刺蟾蜍, 耸肩无视, 防御+) with confidence 0.33; code rank 1 (0.33)
