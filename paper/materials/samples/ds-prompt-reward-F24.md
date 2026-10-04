# F24 选牌：发给 DeepSeek 的 prompt（2026-09-28 18:31 北京时间，对局 A8 二幕）

说明：question / options 的 key / memory 是日志原文；state 和 options 的 code_value 用当时的游戏状态按现行代码重建（日志没存 state 原文，所以 code_value 与当时 107 有出入）。system prompt 是固定文本：SYSTEM + 铁甲指南 + 经验手册（src/llm/deepseek.ts），每次都一样，这里不展开。

user message 顺序：state → memory → question → options。

## state
```json
{
 "run_brief": {
  "character": "铁甲战士",
  "act": "2",
  "floor": 24,
  "hp": "10/80 (13%)",
  "gold": 88,
  "ascension": 8,
  "deck": "29 cards | 18 attacks / 9 skills / 1 powers | 2 upgraded | 1 curses/statuses | avg cost 1.1",
  "relics": [
   "燃烧之血",
   "奥术卷轴",
   "招架盾",
   "灯笼",
   "佩尔之肉"
  ],
  "relic_effects": [
   "燃烧之血: 在战斗结束时，回复{Heal}点生命。",
   "奥术卷轴: 拾起时，将一张随机稀有牌加入你的牌组。",
   "招架盾: 如果你在回合结束时拥有至少{Block}点格挡，则对随机敌人造成{Damage}点伤害。",
   "灯笼: 在每场战斗的第一回合获得{Energy:energyIcons()}。",
   "佩尔之肉: 从你的第3回合开始，在回合开始时额外获得{Energy:energyIcons()}。"
  ],
  "potions": [
   "异鱼之油: 获得1点力量和1点敏捷。",
   "明耀酊剂: 获得1点能量。在你的下3个回合开始时，额外获得1点能量。"
  ],
  "notes": [],
  "relic_effects_note": "{X} marks a value the mod does not expose; the effect text around it is accurate"
 },
 "deck_stats": "29 cards | 18 attacks / 9 skills / 1 powers | 2 upgraded | 1 curses/statuses | avg cost 1.1",
 "deck_needs": {
  "act_boss": "THE_INSATIABLE_BOSS",
  "act": 2,
  "size": 29,
  "aoe_cards": 2,
  "draw_cards": 1,
  "scaling_cards": 1,
  "damage_cards": 8,
  "block_cards": 4
 },
 "deck": "打击 (Attack, 1E): 造成6点伤害。\n打击 (Attack, 1E): 造成6点伤害。\n打击 (Attack, 1E): 造成6点伤害。\n打击 (Attack, 1E): 造成6点伤害。\n防御 (Skill, 1E): 获得5点格挡。\n防御 (Skill, 1E): 获得5点格挡。\n防御 (Skill, 1E): 获得5点格挡。\n防御 (Skill, 1E): 获得5点格挡。\n痛击++ (Attack, 2E): 造成10点伤害。 给予3层易伤。\n进阶之灾 (Curse, -1E): 不能被打出。 虚无。 永恒。\n恶魔之焰 (Attack, 2E): 消耗所有手牌。 每张被消耗的牌造成7点伤害。 消耗。\n双重打击 (Attack, 1E): 造成7点伤害两次。\n挑衅 (Skill, 1E): 获得6点格挡。 给予1层易伤。\n双重打击 (Attack, 1E): 造成5点伤害两次。\n双重打击 (Attack, 1E): 造成5点伤害两次。\n预备打击 (Attack, 1E): 造成7点伤害。 在本回合内获得3点力量。\n双重打击 (Attack, 1E): 造成5点伤害两次。\n放血 (Skill, 0E): 失去3点生命。 获得res://images/packed/sprite_fonts/ironclad_energy_icon\n突破 (Attack, 1E): 失去1点生命。 对所有敌人造成9点伤害。\n血墙 (Skill, 2E): 失去2点生命。 获得16点格挡。\n完美打击 (Attack, 2E): 造成6点伤害。 你每有一张名字中含有“打击”的牌，伤害+2。\n痛殴 (Attack, 1E): 造成4点伤害两次。 消耗你的手牌中随机一张攻击牌，并将它的伤害添加给这张牌。\n燃烧 (Power, 1E): 获得2点力量。\n与我一战！ (Attack, 2E): 造成5点伤害两次。 获得3点力量。 该敌人获得1点力量。\n挑衅 (Skill, 1E): 获得6点格挡。 给予1层易伤。\n与我一战！ (Attack, 2E): 造成5点伤害两次。 获得3点力量。 该敌人获得1点力量。\n坚毅 (Skill, 1E): 获得7点格挡。 随机消耗1张牌。\n头槌++ (Attack, 1E): 造成12点伤害。 将你弃牌堆中的一张牌放到抽牌堆顶部。\n劫掠 (Attack, 1E): 造成6点伤害。 抽牌直到你抽到一张非攻击牌。",
 "note": "skipping is a legitimate choice: a card that does not fit the plan makes the deck worse.",
 "facts": {
  "act": 2,
  "floor": 24,
  "floors_to_act_boss": 9,
  "ascension": 8,
  "hp": "10/80",
  "gold": 88,
  "deck_size": 29,
  "deck": [
   "4x STRIKE_IRONCLAD 打击 (Attack, 1 energy): 造成6点伤害。",
   "4x DEFEND_IRONCLAD 防御 (Skill, 1 energy): 获得5点格挡。",
   "BASH+ 痛击+ (Attack, 2 energy): 造成10点伤害。 给予3层易伤。",
   "ASCENDERS_BANE 进阶之灾 (Curse, -1 energy): 不能被打出。 虚无。 永恒。",
   "FIEND_FIRE 恶魔之焰 (Attack, 2 energy): 消耗所有手牌。 每张被消耗的牌造成7点伤害。 消耗。",
   "4x TWIN_STRIKE 双重打击 (Attack, 1 energy): 造成7点伤害两次。",
   "2x TAUNT 挑衅 (Skill, 1 energy): 获得6点格挡。 给予1层易伤。",
   "SETUP_STRIKE 预备打击 (Attack, 1 energy): 造成7点伤害。 在本回合内获得3点力量。",
   "BLOODLETTING 放血 (Skill, 0 energy): 失去3点生命。 获得res://images/packed/sprite_fonts/ironclad_energy_icon",
   "BREAKTHROUGH 突破 (Attack, 1 energy): 失去1点生命。 对所有敌人造成9点伤害。",
   "BLOOD_WALL 血墙 (Skill, 2 energy): 失去2点生命。 获得16点格挡。",
   "PERFECTED_STRIKE 完美打击 (Attack, 2 energy): 造成6点伤害。 你每有一张名字中含有“打击”的牌，伤害+2。",
   "THRASH 痛殴 (Attack, 1 energy): 造成4点伤害两次。 消耗你的手牌中随机一张攻击牌，并将它的伤害添加给这张牌。",
   "INFLAME 燃烧 (Power, 1 energy): 获得2点力量。",
   "2x FIGHT_ME 与我一战！ (Attack, 2 energy): 造成5点伤害两次。 获得3点力量。 该敌人获得1点力量。",
   "TRUE_GRIT 坚毅 (Skill, 1 energy): 获得7点格挡。 随机消耗1张牌。",
   "HEADBUTT+ 头槌+ (Attack, 1 energy): 造成12点伤害。 将你弃牌堆中的一张牌放到抽牌堆顶部。",
   "PILLAGE 劫掠 (Attack, 1 energy): 造成6点伤害。 抽牌直到你抽到一张非攻击牌。"
  ],
  "relics": [
   "燃烧之血: 在战斗结束时，回复6点生命。",
   "奥术卷轴: 拾起时，将一张随机稀有牌加入你的牌组。",
   "招架盾: 如果你在回合结束时拥有至少?(数值未知)点格挡，则对随机敌人造成?(数值未知)点伤害。",
   "灯笼: 在每场战斗的第一回合获得?(数值未知)。",
   "佩尔之肉: 从你的第3回合开始，在回合开始时额外获得?(数值未知)。"
  ],
  "potions": [
   "FYSH_OIL 异鱼之油: 获得1点力量和1点敏捷。",
   "RADIANT_TINCTURE 明耀酊剂: 获得1点能量。在你的下3个回合开始时，额外获得1点能量。"
  ],
  "potion_slots": "2/2 used",
  "act_boss_clock": {
   "boss": "THE_INSATIABLE",
   "boss_hp": 341,
   "boss_hp_note": "341 (A8)",
   "expected_entry_hp": 68,
   "survivable_turns": 7,
   "fight_turns": 7,
   "fight_turns_note": "min(script 8, survive ~7 at 68 HP losing ~8.9/turn)",
   "need_damage_per_turn": 49,
   "deck_damage_per_turn_estimate": 49,
   "estimate_note": "calibrated on 160 logged A8 boss fights (9 + 1.04 x the card count; typical error ~25%): cards, energy, Strength growth averaged over the fight, Vulnerable, and the boss mechanic below",
   "gap_per_turn": 0,
   "harder_because": "Sandpit: the fight ends around T7 unless Frantic Escapes push it back",
   "boss_note": "Sandpit starts at 4, eaten at 0; each Frantic Escape adds a turn"
  },
  "your_run_plan": null,
  "deck_needs": {
   "act_boss": "THE_INSATIABLE_BOSS",
   "act": 2,
   "size": 29,
   "aoe_cards": 2,
   "draw_cards": 1,
   "scaling_cards": 1,
   "damage_cards": 8,
   "block_cards": 4
  },
  "unknown_value_note": "?(数值未知) marks a number the mod does not expose; the text around it is accurate"
 }
}
```

## memory.now
```
现状: 第2幕 F24 | HP 10/80 | 金币 88
本幕 boss: 无厌沙虫 (THE_INSATIABLE_BOSS)
牌组 29 张: 打击×4, 防御×4, 痛击+, 进阶之灾, 恶魔之焰, 双重打击×4, 挑衅×2, 预备打击, 放血, 突破, 血墙, 完美打击, 痛殴, 燃烧, 与我一战！×2, 坚毅, 头槌+, 劫掠
构筑: 29 张 (攻击 18/技能 9/能力 1) | 力量来源 燃烧 | AOE 2 | 格挡牌 4 | 过牌 1 | 成长 1
遗物: 燃烧之血, 奥术卷轴, 招架盾, 灯笼, 佩尔之肉
药水 2/2: 异鱼之油, 明耀酊剂
boss 时钟: THE_INSATIABLE 约 341 血，约 7 回合，需 49/回合，牌组估 49/回合，缺口 0
你的本局计划 (F17 定): Strength-scaling multi-hit (Demon Form/Inflame) plus real block for Insatiable — HP 21% is the bottleneck: heal early, skip act-2 elites, then draft permanent Strength, real block, AOE and draw to close the 15/turn boss gap; enter Insatiable high with a defense potion. | want DEMON_FORM, INFLAME, WHIRLWIND, SHRUG_IT_OFF, CRIMSON_MANTLE, BATTLE_TRANCE | avoid HAVOC, CINDER, IRON_WAVE, RAMPAGE, EXPECT_A_FIGHT, BARRICADE
```

## memory.boss_db
```
boss 数据库 无厌沙虫 (THE_INSATIABLE) A8: HP 无厌沙虫 341 (n=18)
我方战绩: 18 场，胜率 44% (n=18)，阵亡 10；赢局失血 中位/p75 55.5/62.8 (n=8)；赢局回合 8/8.2 (n=8)；每回合失血 7.6/8.8 (n=18)
无厌沙虫 招式: 液化地面 (Buff+StatusCard) 塞6张状态牌 → 撕扯 8×2 → 前扑啃咬 28 → 分泌唾液 (Buff) +2力 → THRASH_MOVE_2 8×2 →循环回 撕扯 | 能力: 沙坑 4, 力量 2
```

## memory.decisions
```
本局全部决策（DS=DeepSeek；未核实理由 = DeepSeek 当时所写，不是事实）:
第1幕:
F1 event/choose [DS]: 奥术卷轴: 获得一张随机稀有牌。 — 未核实理由: Random rare card is the best growth/value pick at floor 1 (A7 halves rare drops; stats 89% act-boss pass vs 62% for conch); conch only helps elite starts, and 99 gold is too little for Silken Tress.
F1 run-plan [DS]: (start) Strength + multi-hit damage race, light block — Clock says ~34 dmg/turn needed vs 20 now: prioritize permanent Strength and multi-hit/AOE over everything, add Shrug-tier block, remove Strikes, smith damage cards when HP is fine; race the boss to ~T9 and hold block for Pressure Gun and Eruption. | want INFLAME, DEMON_FORM, WHIRLWIND, THRASH, TWIN_STRIKE, SHRUG_IT_OFF | avoid HAVOC, CINDER, IRON_WAVE, RAMPAGE, EXPECT_A_FIGHT, SETUP_STRIKE
F1 map/route-plan [DS]: Monster -> Monster -> Shop -> Monster -> Monster -> Unknown -> Monster -> RestSite -> Treasure -> Elite -> Monster -> RestSite -> Unknown -> Monster -> RestSite -> Boss — 未核实理由: One elite (Act-1 max) with a rest after, 8 fights to close the 14 dmg/turn boss gap, boss arrival ~80/80.
F2 reward/card [DS]: 双重打击 — 未核实理由: 双重打击 is on the run plan, multi-hit scales with Strength, and closes the Giant damage gap; skip only if it were off-plan. Block still available via 4 Defends.
F3 reward/card [DS]: 挑衅 — 未核实理由: 挑舋 6 格挡+易伤契合格挡目标与巨兽压力炮/自爆回合；另两张低于跳过线且对单体 boss 弱。
F4 shop/buy [DS]: 双重打击 — 未核实理由: Twin Strike: 25g multi-hit, on run plan, closes the Giant's damage gap; leaves 96g to then buy a boss potion (Power Potion) for the potion slot.
F4 shop/buy [DS]: 能力药水 — 未核实理由: 能力药水是公认的一幕 boss 开局爆发核心（高置信 n=10），正好补我们缺失的永久力量；空药位趁现在填上，比留下 96 金更有价值。
F4 shop/buy [code]: only one legal option: stop shopping
F5 reward/card [DS]: 双重打击 — 未核实理由: Twin Strike is on-plan multi-hit frontload (best code value, +4/turn vs Giant); Rupture is dead with zero self-damage, Expect a Fight is 3E avoid-listed block we don't need yet.
F6 reward/card [DS]: 预备打击 — 未核实理由: 3x Twin Strike turn temp +3 Str adds ~12-18 burst damage, helping close the 8/turn Giant gap; beats Strike baseline. Skip leaves deck lean but short on damage.
F7 event/choose [DS]: 读下封底: 选择一张攻击牌附魔：锋利2。 — 未核实理由: Sharp 2 on an attack (Twin Strike, per-hit) closes our 8/turn boss damage gap; Nimble 2 block isn't the bottleneck vs Waterfall Giant.
F7 selection/enchant [DS]: 双重打击 — 未核实理由: Sharp 2 per hit on Twin Strike adds ~4 per play, best on-plan multi-hit target to close the Waterfall Giant damage gap.
F8 reward/card [DS]: 双重打击 — 未核实理由: 4th Twin Strike (10 dmg/1E) beats an average draw, on-plan multi-hit closes the Giant's 7/turn gap; Iron Wave is avoid-listed, Perfected Strike fights our Strike-removal plan.
F8 run-plan [DS]: (hp_drop) Strength + multi-hit burst; add AOE and real block — Clock gap 6/turn (28 vs 34): take Inflame/Demon Form and AOE, remove Strikes, heal now and skip the elite at 30 HP — enter the Giant ~60+ HP and race before the Eruption grows. | want INFLAME, DEMON_FORM, WHIRLWIND, THRASH, SHRUG_IT_OFF, CRIMSON_MANTLE | avoid HAVOC, CINDER, IRON_WAVE, RAMPAGE, EXPECT_A_FIGHT, SETUP_STRIKE
F9 rest/choose [DS]: 休息: 回复最大生命值的30%（24）。 — 未核实理由: 38% HP with an elite path and 3 fights before the next rest; heal to 54 for safety, smith at the two later fires per n=120 heal<40% evidence.
F10 chest/relic [code]: only one relic offered
F11 reward/card [DS]: 放血 — 未核实理由: 放血 is A-tier: +2 energy enables Fiend Fire/Bash and future Demon Form, closing the 6/turn boss gap; 3 HP is cheap with Burning Blood. Stats/plan favor it over below-line options.
F12 reward/card [DS]: 与我一战！ — 未核实理由: Fight Me!: permanent +3 Strength per play, amplified by 4 Twin Strikes, closing the Giant's 6/turn clock gap; knowledge rates it a strength engine.
F13 rest/choose [DS]: 锻造: 升级你牌组中的1张牌。 — 未核实理由: Heal is available at the pre-boss fire (F16); Giant losers averaged 0.3 upgrades vs winners 2.2 — smith now, heal before boss.
F13 selection/upgrade [DS]: 痛击 — 未核实理由: Bash+ (10 dmg, 3 Vulnerable) gives an extra +50% turn for our four Twin Strikes and strength burst — biggest damage gain for the Giant race.
F14 event/choose [DS]: 大快朵颐: 从8张随机普通牌中选择2张加入到你的牌组。 — 未核实理由: Skipping 14 HP for 天选芝士 (+1 max HP only) is right at 65% HP before a forced fight and the Giant; take 2 free commons for block/damage.
F14 selection/add [DS]: 突破 — 未核实理由: Breakthrough adds the AOE the deck lacks for the run; Blood Wall is real 16-block for Pressure Gun/Eruption turns, with the best observed stats (80% vs 62%).
F14 selection/add [DS]: 血墙 — 未核实理由: 血墙：牌组只有挑衅一张真格挡，16格挡正挡巨兽T5/T10压力炮与自爆回合；实测一幕通过率80% vs 62%，突破已补AOE，此选补防御。
F15 reward/card [DS]: 完美打击 — 未核实理由: Giant is single-target: 完美打击 hits 26 for 2E in this strike-heavy deck (10 打击 cards), best race damage; a 2nd AOE and Second Wind add less.
F16 rest/choose [DS]: 休息: 回复最大生命值的30%（24）。 — 未核实理由: Boss is next node; HP 56% < 85% rest-heal threshold — heal to 69/80 for Pressure Gun and Steam Eruption. Damage clock already ~met (33 vs 34), HP is the gap.
F16 run-plan [DS]: (review) Strength + multi-hit burst; add AOE and real block — Clock gap only 1/turn (33 vs 34) but no permanent Strength: take Inflame/Demon Form, AOE, real block, remove Strikes; burst early, block Pressure Gun T5/T10, stay above Eruption HP. | want INFLAME, DEMON_FORM, WHIRLWIND, THRASH, SHRUG_IT_OFF, CRIMSON_MANTLE | avoid HAVOC, CINDER, IRON_WAVE, RAMPAGE, EXPECT_A_FIGHT, SETUP_STRIKE
F17 reward/card [DS]: 痛殴 — 未核实理由: 痛殴: on-plan S-tier 1E multi-hit, scales with the strength build and closes the Giant/Eruption race; Barricade too costly with 2 block cards, second Fiend Fire redundant.
第2幕:
F17 run-plan [DS]: (act) Strength-scaling multi-hit (Demon Form/Inflame) plus real block for Insatiable — HP 21% is the bottleneck: heal early, skip act-2 elites, then draft permanent Strength, real block, AOE and draw to close the 15/turn boss gap; enter Insatiable high with a defense potion. | want DEMON_FORM, INFLAME, WHIRLWIND, SHRUG_IT_OFF, CRIMSON_MANTLE, BATTLE_TRANCE | avoid HAVOC, CINDER, IRON_WAVE, RAMPAGE, EXPECT_A_FIGHT, BARRICADE
F18 event/choose [DS]: 佩尔之肉: 从你的第3回合开始，在回合开始时额外获得。 — 未核实理由: 佩尔之肉 is a near-unconditional +1 energy from turn 3 onward every combat: funds Fiend Fire/Fight Me! and extra Frantic Escapes, closing the 15/turn Insatiable gap. Claw and Legion are marginal.
F18 map/route-plan [DS]: Monster -> Unknown -> Monster -> Monster -> Monster -> Monster -> RestSite -> Treasure -> Monster -> Shop -> RestSite -> Elite -> Unknown -> RestSite -> Boss — 未核实理由: Code's top path: shop right before the forced elite stocks potions, and its post-elite stretch is an unknown+rest, not p2's low-HP forced monster.
F19 reward/card [DS]: 燃烧 — 未核实理由: No permanent Strength in deck; Insatiable needs it (49/turn vs 42) and run plan targets Inflame. Shrug is decent but strength is the run-winning gap.
F20 shop/buy [DS]: 与我一战！ — 未核实理由: 2nd Fight Me! is the shop's only evidence-positive engine (n=5, 40% boss pass): repeatable +3 permanent Strength closes the 49/turn Insatiable race; removal is always available at the later shop.
F20 shop/buy [DS]: card removal — 未核实理由: Removal at 100g is the only above-bar buy: trims a Strike, boosts consistency, and strike-removal is high-confidence on-plan; all shop cards score below leave.
F20 selection/remove [DS]: 打击 — 未核实理由: Remove a Strike: on-plan high-confidence strike-removal, trims deck to 25; block is scarce (only 挑衅/血墙) so keep Defends, and Bash+ is our Vulnerable source.
F20 shop/buy [DS]: 挑衅 — 未核实理由: Non-basic block stuck at 2 (<3 lesson, n=11 high conf) before forced elite/Insatiable; 25g Taunt adds block+vulnerable, code ranks it closest to bar.
F20 shop/buy [code]: only one legal option: stop shopping
F21 reward/card [DS]: 坚毅 — 未核实理由: True Grit: 7 block for 1E, non-basic block still thin (3) before forced fights and LUNGING_BITE; knowledge n=5 positive, exhaust eats Bane/statuses. Molten Fist's stats negative and off-plan; skip loses real block.
F22 reward/card [DS]: 头槌+ — 未核实理由: 头槌+ is 12 dmg/1E frontload and recycles Inflame/Fight Me! to stack permanent Strength for the 341-HP Insatiable race; beats the other picks at 47 HP.
F23 reward/card [DS]: 劫掠 — 未核实理由: Deck has zero draw and must find Inflame/Fight Me!/block; Pillage is 6 damage plus ~2-3 cards for 1E. Vicious too conditional here, Anger bloats the 28-card deck.
```

## memory.fights
```
本局全部战斗（每场一行: 层 敌人: HP 战前→战后 药水）:
第1幕:
F2 蟾蜍蝌蚪: 64→63/80
F3 噬尸蛞蝓: 63→48/80
F5 淤泥旋螺: 48→48/80
F6 活雾+气态炸弹: 48→43/80
F8 噬尸蛞蝓: 43→30/80
F11 花园幽灵鳗: 54→56/80 药:肌肉药水,能力药水
F12 幽灵船: 56→52/80
F15 拳击构装体: 52→45/80
F17 瀑布巨兽: 69→17/80 药:格挡药水
第2幕:
F19 外骨骼虫: 67→64/80
F21 偷窃草蜢: 64→58/80
F22 直飞产卵虫+结实的卵+幼虫: 58→47/80
F23 盛碗虫（石）+盛碗虫（蜜）+盛碗虫（卵）: 47→20/80
F24 胧光怪+寄生惧魔: 20→10/80
```

## memory.map_threats
```
第2幕的精英与危险小怪（monster DB 实测；失血 = 赢局 中位/p75；n = 场次）:
残杀千足虫+残杀千足虫+残杀千足虫 [精英] A8: HP 148 (n=16) | 16 场 胜率 69% 阵亡 5 | 赢局失血 中位/p75 43/53 (n=11) | 招式 残杀千足虫: 胀大 6 +2力 → 扭动 5×2 → 紧缠 8 →循环回 胀大；其他: 接续 (Heal)；残杀千足虫: 扭动 5×2 → 紧缠 8 → 胀大 6 +2力 →循环回 扭动；其他: 接续 (Heal)；残杀千足虫: 扭动 5×2 → 紧缠 8 → 胀大 6 +2力 →循环回 扭动；其他: 接续 (Heal)
蜂群术士 [精英] A8: HP 165 (n=22) | 22 场 胜率 82% 阵亡 4 | 赢局失血 中位/p75 37/48 (n=18) | 招式 蜂群术士: 蜜——蜂——！ 3×7 → 矛击！ 18 → 喷射信息素 (Buff) +1力 →循环回 蜜——蜂——！
感染棱柱 [精英] A8: HP 171 (n=13) | 13 场 胜率 69% 阵亡 4 | 赢局失血 中位/p75 29/51 (n=9) | 招式 感染棱柱: 刺击 15 → 辐射 11 → 旋风 5×3 → 脉动 8 +1力 →循环回 刺击
盛碗虫（石）+盛碗虫（丝）+熟睡甲虫 [小怪] A8: HP 178 (n=22) | 22 场 胜率 86% 阵亡 3 | 赢局失血 中位/p75 33/43.5 (n=19) | 招式 盛碗虫（石）: 头槌 15 →循环回 头槌；其他: STUNNED (Stun)；盛碗虫（丝）: 毒性喷吐 (Debuff) → 撕扯 4×2 →循环回 毒性喷吐；熟睡甲虫: 打鼾 (Sleep) →循环回 打鼾；其他: 出击 16 +2力
猎人杀手 [小怪] A8: HP 126 (n=27) | 27 场 胜率 89% 阵亡 3 | 赢局失血 中位/p75 19/27.8 (n=24) | 招式 猎人杀手: 嫩化黏液 (Debuff) → 刺穿 7×3 → 啃咬 17 →循环回 刺穿
棘刺蟾蜍 [小怪] A8: HP 123 (n=25) | 25 场 胜率 84% 阵亡 4 | 赢局失血 中位/p75 18/25 (n=21) | 招式 棘刺蟾蜍: 伸出尖刺 (Buff) → 尖刺爆破 23 → 吐舌 17 →循环回 伸出尖刺
胧光怪 [小怪] A8: HP 129 (n=22) | 22 场 胜率 82% 阵亡 4 | 赢局失血 中位/p75 22.5/31.5 (n=18) | 招式 胧光怪: 幻象 (Summon) → 硬化攻击 6 → 锐利凝视 10 →循环回 硬化攻击；其他: 起航 (Buff) +3力
啃咬机×2 [小怪] A8: HP 130 (n=26) | 26 场 胜率 96% 阵亡 1 | 赢局失血 中位/p75 20/27 (n=25) | 招式 啃咬机: 猛夹 8×2 → 尖锐鸣叫 (StatusCard) 塞3张状态牌 →循环回 猛夹
异螨×2 [小怪] A8: HP 133 (n=25) | 25 场 胜率 92% 阵亡 2 | 赢局失血 中位/p75 20/25.5 (n=23) | 招式 异螨: 浓毒 (StatusCard) 塞2张状态牌 → 啃咬 13 → 吸吮 4 +2力 →循环回 浓毒
虱虫之祖 [小怪] A8: HP 139 (n=22) | 22 场 胜率 91% 阵亡 2 | 赢局失血 中位/p75 20.5/23 (n=20) | 招式 虱虫之祖: 吐网炮 9 → 蜷身成长 (Buff+Defend) +5力 → 猛扑 14 →循环回 吐网炮
盛碗虫（蜜）+盛碗虫（石）+盛碗虫（丝） [小怪] A8: HP 128 (n=6) | 6 场 胜率 67% 阵亡 2 | 赢局失血 中位/p75 19/29.2 (n=4) | 招式 盛碗虫（蜜）: 撕扯 3 → 强化 (Buff) +15力 → THRASH2_MOVE 3 →循环回 THRASH2_MOVE；盛碗虫（石）: 头槌 15 →循环回 头槌；其他: STUNNED (Stun)；盛碗虫（丝）: 毒性喷吐 (Debuff) → 撕扯 4×2 →循环回 毒性喷吐
```

## memory.hp_timeline
```
每层结束时 层+房间+HP(/上限，变化时标出)+¥金币 (怪/精/问/休/店/宝/王/古=房间，·=未知):
第1幕: F1·64/80¥99 F2怪63¥110 F3怪48¥121 F4店48¥44 F5怪48¥59 F6怪43¥68 F7问43¥68 F8怪30¥80 F9休54¥80 F10宝54¥115 F11精56¥143 F12怪52¥156 F13休52¥156 F14问52¥156 F15怪45¥170 F16休69¥170
第2幕: F17王17¥245 F18古67¥245 F19怪64¥253 F20问64¥51 F21怪58¥60 F22怪47¥70 F23怪20¥80 F24怪10¥88
```

## memory.resources
```
牌组/遗物/药水/上限变化（起始牌组与起始遗物不计）:
第1幕: F1 +卡 恶魔之焰(事件); F1 +遗物 奥术卷轴(事件); F2 +卡 双重打击(奖励); F3 +药 肌肉药水(奖励); F3 +卡 挑衅(奖励); F4 +卡 双重打击(商店); F4 +药 能力药水(商店); F5 +卡 双重打击(奖励); F6 +卡 预备打击(奖励); F8 +卡 双重打击(奖励); F10 +遗物 招架盾(宝箱); F11 用药 肌肉药水(战斗); F11 用药 能力药水(战斗); F11 +遗物 灯笼(奖励); F11 +卡 放血(奖励); F12 +药 格挡药水(奖励); F12 +卡 与我一战！(奖励); F13 升级 痛击(休息); F14 +卡 突破(事件); F14 +卡 血墙(事件); F15 +卡 完美打击(奖励); F17 用药 格挡药水(战斗); F17 +药 异鱼之油(奖励); F17 +卡 痛殴(奖励)
第2幕: F18 +遗物 佩尔之肉(事件); F19 +药 明耀酊剂(奖励); F19 +卡 燃烧(奖励); F20 +卡 与我一战！(商店); F20 -卡 打击(商店); F20 +卡 挑衅(商店); F21 -卡 与我一战！(战斗); F21 +卡 与我一战！(奖励); F21 +卡 坚毅(奖励); F22 +卡 头槌+(奖励); F23 +卡 劫掠(奖励)
```

## memory.route
```
第1幕 F1 规划，当时 HP 80%: 怪→怪→店→怪→怪→问→怪→休→宝→精→怪→休→问→怪→休→王
第2幕 F18 规划，当时 HP 84%: 怪→问→怪→怪→怪→怪→休→宝→怪→店→休→精→问→休→王
本幕进度: 已走 6/15 [怪问怪怪怪怪] | 下一步 休（预计 HP 15%） | 剩余 9: 休→宝→怪→店→休→精→问→休→王
```

## memory.lookahead
```
距 boss 9 层 | 到 boss 前各路线: 精英 1–2, 休息 1–3, 商店 0–1, 问号 0–3, 宝箱 1 | 下一个节点可选: RestSite/Unknown | boss 要点: (A8)，沙坑每敌方回合 −1，归零即死：打不死它就尽早打狂乱逃离（每张多一回合），不要等沙坑 ≤2。
```

## memory.knowledge
```
经验库（过往对局复盘提炼；置信 高/中/低，n=支持局数，反例=相反证据局数；是证据不是命令，与状态里的事实和代码算出的数字一起权衡）:
- [boss:THE_INSATIABLE | 置信高 n=18] A8 沙虫 341 血，两条时钟都要求 ≥38–49/回合：<30/回合的牌组靠逃离只是换种死法。二幕必须拿到永久力量（恶魔形态/燃烧/仪式），T1–T2 喝输出/能力药水爆发（RVR6 T1 打 118、D3X1 T1 109）；一次逃离只值牌组那一回合的伤害。
- [boss:THE_INSATIABLE | 置信高 n=12 反例2] 无厌沙虫的沙坑数就是剩余回合（LIQUIFY 后 4，每个敌方回合 −1，归零即被吞，与 HP/格挡无关）：每张打得起的狂乱逃离都立刻打（沙坑 4 时也打），除非本回合斩杀；「沙坑 ≤2 再逃」是错的，已 5 次带血被吞。
- [boss:THE_INSATIABLE | 置信高 n=6] 进场血量：满血进场的赢局最多，≤45% 进场逃离也救不回；另备 1 瓶减伤药（镣铐/格挡）给 LUNGING_BITE 28–30，最大生命偏低时尤其要格挡牌。
- [card:ARMAMENTS 武装 | 置信中 n=2] 武装：bot 的求解器不会用它的升级效果，实战只当 5 格挡，不要买/不要选。
- [general:deck | 置信高 n=29] 一幕 boss 统计（41 局）：赢局与输局的牌组张数、格挡数相同，差在 AOE（81% vs 47%）、永久力量（50% vs 27%，恶魔形态 6:0）、升级（1.6 vs 1.1）和进场血量。构筑优先 AOE + 永久力量（燃烧/恶魔形态/撕裂/烙印/手套），预备打击的临时力量不算。
- [general:deck | 置信高 n=15] boss 时钟对牌组输出的估计两头都会错：一次性力量被当永久、能力牌按 T1 起算 → 高估（普通牌组实测约 0.45–0.8）；手套/撕裂/薪火/狱火/水银沙漏等成长和遗物伤害被漏掉 → 低估约 2 倍。时钟说「已达标」时按仍缺 ~30% 处理，并自己核对这些项。
- [general:deck | 置信高 n=12] 按本幕 boss 构筑：帝王蟹要真 AOE + 力量；知识恶魔/族母是单体，要单体大伤 + 力量，AOE 减分；灵魂异鱼要能消耗手牌的牌；沙漏要少而大；实验体/女王要力量成长。刚打完 boss 的奖励按下一幕 boss 估值。
- [general:deck | 置信高 n=11] 格挡也不能太少：二幕起非基础格挡 <3 张，或低血（<50%）且格挡远少于目标时，格挡牌（血墙、坚毅、耸肩无视）优先于抽牌/攻击；三幕格挡 ≤3 张时降低跳过门槛。
- [general:deck | 置信高 n=10] boss 伤害缺口 ≥20/回合（或 ≥需求的 25%）时，选牌优先 AOE/多段/永久力量；已有 ≥2 张非防御格挡后格挡牌大幅降分。多局死于「必备格挡压过伤害」（UP1C 10 张格挡 0 力量、T86W 17 张只有 6 张攻击）。
- [general:deck | 置信高 n=8] 删牌优先打击（两胜局打击删到 0–1 张），能删的进阶之灾先删；别删痛击（唯一稳定的易伤来源）；run plan 写了删打击就要在商店执行（64ZB 整局没删过牌）。
- [general:deck | 置信中 n=4] 三幕牌组已大（≥28 张）时倾向跳过、避免加诅咒的选项；带宾邦（每张牌加两张）或转经轮（双倍奖励）时更要跳过，只拿关键牌。
- [general:deck | 置信中 n=4] 随机奖励/事件按期望值估，不按最好结果：「随机能力牌」拿到的是第二张燃烧+，宝石面具不是必得恶魔形态，随机稀有牌可能与牌组无配合（黑暗之拥 0 消耗来源）。
- [general:deck | 置信中 n=3] 卡牌奖励最高分 ≥60 且代码不建议跳过时不要跳过；三幕别让跳过门槛把格挡/主力奖励（完美打击+、狱火+、坚毅+）挡掉大半。
- [hallway:SLUMBERING_BEETLE | 置信高 n=26] 熟睡甲虫组（甲虫 86–89 血 + 两只盛碗虫，代码按精英打）是二幕头号走廊杀手（4+ 次致死，常掉 30–58）：二幕 ≤45 血/<60% 时路线避开可能遇到它的走廊/问号；≥60% 进场能赢但代价 30–50。打法：3 回合睡眠内先清盛碗虫，醒来那回合上能力/喝药。
- [hallway:HUNTER_KILLER | 置信高 n=25] 猎人杀手（二幕走廊 121–126 血）嫩化后每打一张牌本回合 −1 力量 −1 敏捷，已 5+ 次大掉血/致死（常 −20~−40）；<40% 血时避开可能遇到它的走廊链。
- [hallway:BOWLBUG_ROCK | 置信高 n=21] 多只盛碗虫组合（石/丝/蜜/卵）是二幕高危走廊，按 −25~−55 估，进场不宜 <60%；石盛碗虫的头槌 15 被完全挡住会让它晕一回合（挡满线约省 20 血）。
- [elite:DECIMILLIPEDE | 置信高 n=20] 残杀千足虫（二幕，A8 三节约 150 血）三节必须同回合死（单杀一节会以 25 血接回）：需要 ≥3 张 AOE/多段；每场掉 36–56（0.4–0.7 最大生命），预计进场 <45 血（~56%）不要进，可选的只在 ≥90% 时打。
- [act:2 | 置信高 n=18] A8 二幕开头（先古后）常是 2–3 场强制走廊才到第一个火堆，每场实测 −27~−33% 最大生命（中位 31%、p75 42%），第三场常致死：一幕 boss 前后保药保血，二幕选路优先早有火堆/商店的列，别连走廊。
- [elite:ENTOMANCER | 置信高 n=16] 蜂群术士（二幕常见的第一只强制精英，A8 165 血）已 7+ 次拖垮/致死：每段攻击命中往牌堆塞晕眩，要在约 T7 前打完（≥24–33/回合）。打它用单段大伤害、虚弱、火焰屏障，多段攻击/AOE 是负收益；二幕第一只精英前按它准备并至少带 1 瓶药。
- [elite:INFESTED_PRISM | 置信高 n=16] 感染棱柱（二幕，A8 171 血）：我方每打一张技能牌，它本回合每段攻击 +2~6，堆技能格挡反而更痛；已 4 次致死、常掉 40–70。必经时进场 ≥70–85% 且牌组 ≥35/回合，用攻击快杀，别为它买技能格挡。
- [elite:ENTOMANCER | 置信高 n=14] 满血进场也常掉 40–60（M812 77→6、B98 104→14、W8JD 68→8）：二幕 boss 前遇到它按 −50 估，留给本幕 boss 的药不要在它身上喝。
- [hallway:SPINY_TOAD | 置信高 n=12] 棘刺蟾蜍（二幕走廊，A8 ~122 血，荆棘 5，尖刺爆发 23 + 舌鞭 17）：四次死局都是 ≤40% 进场且在二幕开头连续走廊之后；低血绝不再撞它，多段攻击每段吃 5 荆棘。
- [hallway:LOUSE_PROGENITOR | 置信高 n=11] 虱虫之祖（二幕走廊/问号，134–140 血）每 3 回合 +5 力量，按精英对待：常掉 14–40，低血进场已 3 次被打死；低血时绕开问号链。
- [hallway:THE_OBSCURA | 置信高 n=10] 胧光怪 + 寄生惧魔（二幕走廊/问号，已 4 次致死）：幻象被打死下回合满血复活，伤害要打胧光怪（~129 血），牌组对它 <20/回合时很贵（−40~−53）；≤38% 进场必死，要 50+ 血。
- [act:2 | 置信高 n=8] 先古之民（A2+）只回已损失生命的 80%：一幕 boss 多掉的血进二幕只剩约 1/5，所以一幕 boss 可以大胆用药用血；但一幕 boss 打剩个位数时，二幕开头只回到 60–72，仍要尽快找火堆。
结果统计（日志自动统计，观察数据：混有「在什么局面下选它」的因素；n<5 标「少」）:
基线 A8 全部 126 局: 均终层 26.7，到达第2幕的局过本幕boss 17% (n=87)
卡 耸肩无视(SHRUG_IT_OFF) 第2幕: 拿了 n=25 均终层32.8 过本幕boss 24% | 给了没拿 n=5 均终层29.2 过本幕boss 0%
卡 武装(ARMAMENTS) 第2幕: 拿了 无记录 | 给了没拿 n=26 均终层32.8 过本幕boss 23%
卡 岩石铠甲(STONE_ARMOR) 第2幕: 拿了 n=7 均终层32.6 过本幕boss 14% | 给了没拿 n=7 均终层31.3 过本幕boss 14%
```

## question
```
Which of these card rewards should I take, if any? You decide this yourself; no other model is asked first. Each option carries code's value and why (a heuristic score: advice, not an order; higher is better, 0 or the skip/leave line is the bar). facts are exact: the deck, relics, potions, HP, gold, the act boss clock (damage a turn needed vs this deck's estimate) and your own run plan. Weigh them for the whole run. code_value below the skip line (50) means code would skip it.
```

## options
```json
{
 "card0": {
  "code_value": 81,
  "why": "little draw",
  "card": "耸肩无视",
  "type": "Skill",
  "rarity": "Common",
  "cost": 1,
  "text": "获得8点格挡。 抽1张牌。",
  "code_rank": 1
 },
 "card1": {
  "code_value": 38,
  "why": "deck is 29 cards",
  "card": "武装",
  "type": "Skill",
  "rarity": "Common",
  "cost": 1,
  "text": "获得5点格挡。 升级你手牌中的一张牌。",
  "code_rank": 4
 },
 "card2": {
  "code_value": 50,
  "why": "deck is 29 cards",
  "card": "岩石铠甲",
  "type": "Power",
  "rarity": "Uncommon",
  "cost": 1,
  "text": "获得4层覆甲。",
  "code_rank": 2
 },
 "skip": {
  "card": "skip",
  "code_value": 50,
  "note": "take nothing; the deck stays lean",
  "code_rank": 3
 }
}
```

## DeepSeek 的回答
选择 card0（耸肩无视）

理由：Shrug It Off: 8 block + draw, on run plan, fixes thin block (4/6) and draw gap before Insatiable; best code value. Armaments/Stone Armor too slow at 29 cards.

### 思考过程
```
Let me analyze this decision.

We're at F24, HP 10/80 (13%), Act 2, 9 floors to boss (The Insatiable). Deck is 29 cards, strength-scaling. Run plan explicitly wants SHRUG_IT_OFF. Block cards: 4 (Taunt×2, Blood Wall, True Grit) — deck_needs says block_cards 4, target 6 (block_target:6 in run plan).

Options:
- 耸肩无视 Shrug It Off: 1E, 8 block + draw 1. code_value 107, rank 1. On run plan want list. This is a great card: block + draw, exactly what the deck needs (draw_cards: 1, block thin at 4/6).
- 武装 Armaments: 38, below skip line (50). Knowledge says solver doesn't use upgrade effect; skip.
- 岩石铠甲 Stone Armor: 56, above skip. 4 覆甲 (metallicize-like: gain 4 block at end of turn? Actually 覆甲 = Plated Armor — gain block at end of turn; in STS2 it's "Plated Armor" style). Actually 岩石铠甲 gives 4 层覆甲 — Plated Armor, which gives block at end of turn. With our deck with Barricade-less, plated armor is decent but slow.
- skip: 50.

Shrug It Off is clearly the best: highest code value, on run plan, fills the draw gap and block gap, 1E. With HP at 10/80, we need block. Also Shrug draws into strength cards.

Wait — HP is 10/80 and next node is RestSite (expected HP 15%). But this is a card reward from the F24 fight. Deck is 29 cards; adding a 30th is a slight concern but Shrug It Off is a top-tier card (block + draw), and lesson: [general:deck | 置信高 n=11] block cards priority. Also results stats: Shrug It Off taken n=25 均终层32.8 过本幕boss 24% vs not taken 0%.

Choose card0 耸肩无视.

Reason max 25 words: Shrug It Off: block+draw on run plan, fixes thin block (4/6) and draw before boss; skip Barricade-less Stone Armor and Armaments.

Let me write concise JSON.
```
