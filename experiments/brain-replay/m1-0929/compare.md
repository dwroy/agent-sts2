# M1 回放：三组答案对照（compare.py 生成）

A = DeepSeek deepseek-flash、v3 问法（KNOWLEDGE_PREFIX=off，今天的攻略+手册）；B = DeepSeek、全量知识；C = Claude claude-opus-5-5、全量知识、不带工具。

## 一致率（同一决定；pick 比较 choice 和 route（与 choice 相同的 route 不算），商店比较 leave 之前买的东西（不计顺序），run plan 比较 elites|rest）

| 对照 | 一致 |
|---|---|
| A ~ B | 24/30 (80%) |
| A ~ C | 23/30 (77%) |
| B ~ C | 21/30 (70%) |
| A ~ 日志原选择（pick 只比 choice） | 24/30 (80%) |
| B ~ 日志原选择（pick 只比 choice） | 26/30 (87%) |
| C ~ 日志原选择（pick 只比 choice） | 22/30 (73%) |

## 逐题决定

| id | 题型 | 日志 | A | B | C |
|---|---|---|---|---|---|
| q013 | reward/card | card1 与我一战！ | card1|p1 与我一战！ | card1|p1 与我一战！ | card1|p1 与我一战！ |
| q039 | event/act-plan | o2|p2 选择悖论 | o2|p2 选择悖论 | o2|p2 选择悖论 | o2|p2 选择悖论 |
| q016 | reward/card | card1 耸肩无视 | card1|keep 耸肩无视 | card1|keep 耸肩无视 | card1|keep 耸肩无视 |
| q018 | reward/card | card1 拆卸 | card1|keep 拆卸 | card1|keep 拆卸 | card1|keep 拆卸 |
| q021 | reward/card | card2 愤怒 | skip skip | card2 愤怒 | card2 愤怒 |
| q042 | rest/plan | o0 休息 | o0|keep 休息 | o0|keep 休息 | o0|keep 休息 |
| q043 | rest/plan | o1:c19  | o1:c19|keep | o1:c19|keep | o1:c19|keep |
| q044 | rest/plan | o1:c11  | o1:c11|keep | o1:c11|keep | o1:c0|keep |
| q047 | rest/plan | o0 休息 | o0 休息 | o0 休息 | o0 休息 |
| q072 | selection/upgrade | card6 痛击 | card6 痛击 | card6 痛击 | card7 狱火 |
| q073 | selection/remove | card0 打击 | card0 打击 | card0 打击 | card5 防御 |
| q077 | selection/add | card7 突破 | card7 突破 | card1 飞剑回旋镖 | card7 突破 |
| q079 | selection/enchant | card7 双重打击 | card7 双重打击 | card7 双重打击 | card7 双重打击 |
| q026 | event/choose | o1 铅制镇纸 | o1 铅制镇纸 | o1 铅制镇纸 | o1 铅制镇纸 |
| q029 | event/plan | o0 交换金币 | o0 交换金币 | o0 交换金币 | o0 交换金币 |
| q032 | event/plan | o0:c9  | o0:c9 | o0:c9 | o0:c9 |
| q035 | event/plan | o0 抵抗诱惑 | o1:c14 | o0 抵抗诱惑 | o1:c20 |
| q027 | event/act-plan | o1 烘焙手套 | o1|p1 烘焙手套 | o1|p1 烘焙手套 | o1|p1 烘焙手套 |
| q037 | event/act-plan | o0|p3 低语耳环 | o1|p1 原初之爪 | o1|p1 原初之爪 | o2|p1 领主阳伞 |
| q040 | event/act-plan | o1|p1 大～抱抱 | o1|p2 大～抱抱 | o1|p2 大～抱抱 | o1|p2 大～抱抱 |
| q065 | map/route-plan | p1  | p2 | p3 | p2 |
| q067 | map/route-plan | p1  | p1 | p1 | p1 |
| q069 | map/route-plan | p1  | p3 | p1 | p3 |
| q050 | shop/plan | ["buy_card2"]  | ["buy_card2"] | ["buy_card2"] | ["buy_card2"] |
| q053 | shop/plan | ["buy_card0", "buy_potion0", "buy_potion2", "discard_potion0"]  | ["buy_potion1", "remove:c0"] | ["buy_card0", "remove:c0"] | ["buy_card0", "buy_potion2"] |
| q056 | shop/plan | ["buy_card0", "buy_card4"]  | ["buy_card0", "buy_card4"] | ["buy_card0", "buy_card4"] | ["buy_card0", "buy_card4"] |
| q058 | shop/plan | ["buy_card1", "buy_card2", "remove:c0"]  | ["buy_card1", "buy_card2", "remove:c0"] | ["buy_card1", "buy_card2", "remove:c0"] | ["buy_card1", "buy_card2", "remove:c0"] |
| q090 | run-plan | normal|auto  | normal|auto | normal|auto | normal|auto |
| q092 | run-plan | avoid|heal  | avoid|heal | avoid|heal | avoid|heal |
| q094 | run-plan | normal|auto  | normal|auto | normal|auto | normal|auto |

## B 和 A 不一致的题（各组理由原文）

### q021 reward/card（AD5P89DBLM22 F15）
- 日志: card2 愤怒 — Anger: 0-cost 6 dmg scales with Fight Me! strength, strong boss-pass history; Iron Wave/Cinder are run-plan avoids and weaker value.
- A: skip skip — 伤害时钟缺口0；三张都不补格挡核心，愤怒会复制并稀释牌组，对抗呼唤堵塞更要精简，跳过。
- B: card2 愤怒 — 0-cost 6 dmg scales with our 3 Strength and copies multiply; best logged boss-pass (91%, n=11). Block options are below bar and off-plan.
- C: card2 愤怒 — Anger is free damage that grows with Fight Me! Strength and helps win the race against Soul Fysh. Iron Wave and Cinder are on the avoid list, and Cinder could exhaust key cards at random.

### q077 selection/add（7KDMKN16GD6B F11）
- 日志: card7 突破 — 突破: 9 AoE for 1 energy, doubles our AOE to 2 (run plan top priority) and best code value/rank; boss clock needs damage.
- A: card7 突破 — Breakthrough: 1-cost 9 AOE closes the AOE gap (only 1 true AOE) for hallway fights and future multi-enemy acts; highest code value, only 1 HP cost.
- B: card1 飞剑回旋镖 — 飞剑回旋镖：多段伤害契合计划的力量成长（对易伤/滑溜/无实体也更稳），实测带它过一幕boss 80% 对 62%，本幕缺伤害；血墙下一张再拿。
- C: card7 突破 — Breakthrough deals 9 damage for 1 energy and hits every enemy. That is the best damage per card offered, and it has the highest code value. Sword Boomerang is next in line for the second pick.

### q035 event/plan（KTRT1M2SVVL3 F20）
- 日志: o0 抵抗诱惑 — Two targeted Strike removals beat an unknown enchant: winners run ≤1 Strike; Normality's cap overlaps with Sloth, which we take vs Knowledge Demon anyway.
- A: o1:c14  — Normality's 3-play cap wrecks our mittens/Rupture multi-play scaling and the enchant is free; enchant 上勾拳+, our best per-play hit under Knowledge Demon's Sloth cap.
- B: o0 抵抗诱惑 — Remove 2 Strikes per plan; Toasty Mittens converts the curse into Strength fuel, and the boss's 3-play cap makes one dead card cheap.
- C: o1:c20  — Avoid adding the 凡庸 curse, which likely caps card plays. Perfect Fit likely puts Pyre on top of the draw pile, so it comes out early for +1 energy each turn.

### q065 map/route-plan（TYZH5GB5N2UL F1）
- 日志: p1  — Top value: shop + 2 rests + 7 fights build the deck; boss entry ~80/80 needed since the 7-turn clock matches survivable turns. Elite paths' ~59 HP likely fatal.
- A: p2  — Two elites at high HP entries, shop converts gold into a Strike removal and fills empty potion slots, boss ~85%; avoids p1's three-elite risk.
- B: p3  — Two elites entered ~full HP, 4 rests with free early smith and pre-boss heal, short fight chains, best boss entry ~87%; shop gold buys less.
- C: p2  — Shop for removal/potions, both elites preceded by rests, projected 68/80 at Kin; forks allow skipping second elite if HP low. / route: Shop plus rest-buffered elites; flexible forks.

### q069 map/route-plan（KTRT1M2SVVL3 F1）
- 日志: p1  — Both elites have rests before them and ~90% projected entry; extra relic closes the 8/turn damage gap; 3 rests keep boss entry ≥75%.
- A: p3  — One elite at full HP right after a rest, far from boss; 4 unknowns plus late shop/rest; avoids double-elite and pre-boss-elite risk; boss ~72/80.
- B: p1  — Both elites enter ≥92% HP (safe ≥78% line), 8 fights feed the +8/turn damage gap, 3 rests + shop at 249 gold, boss ~85%.
- C: p3  — One elite after a rest at ~full HP; the ? room breaks the early fight chain. Same card count as p4, then shop and rest before the boss, ~72/80 at Vantom.

### q053 shop/plan（7MDJ256RY2UU F8）
- 日志: ["buy_card0", "buy_potion0", "buy_potion2", "discard_potion0"]  — HP 30% and boss in 9: blood potion first (heals 20). Hemokinesis is the frontload that closes the Giant's 20/turn clock gap. Trade colorless for block potion to survive the eruption; ~13g left.
- A: ["buy_potion1", "remove:c0"]  — Powder first (low-HP shop rule) then Strike removal: its ~9 dmg/enemy-turn closes the Giant's 9/turn clock gap, forcing a T7-T8 kill and smaller eruption; 172/188 gold.
- B: ["buy_card0", "remove:c0"]  — Next node is a rest so path HP is covered; the Giant is a damage race (deck short ~9/turn). Hemokinesis is the shop's only real damage fix (rank 2, best boss-pass stats) and deleting a Strike matches the plan.
- C: ["buy_card0", "buy_potion2"]  — At 30% HP with an empty potion slot, I'm buying the Blood Potion first as HP for the eruption turn. Hemokinesis is 15 damage for 1 energy, which helps close the Giant gap. Total 125 of 188 gold.

## C 和 A 不一致的题（各组理由原文）

### q021 reward/card（AD5P89DBLM22 F15）
- 日志: card2 愤怒 — Anger: 0-cost 6 dmg scales with Fight Me! strength, strong boss-pass history; Iron Wave/Cinder are run-plan avoids and weaker value.
- A: skip skip — 伤害时钟缺口0；三张都不补格挡核心，愤怒会复制并稀释牌组，对抗呼唤堵塞更要精简，跳过。
- B: card2 愤怒 — 0-cost 6 dmg scales with our 3 Strength and copies multiply; best logged boss-pass (91%, n=11). Block options are below bar and off-plan.
- C: card2 愤怒 — Anger is free damage that grows with Fight Me! Strength and helps win the race against Soul Fysh. Iron Wave and Cinder are on the avoid list, and Cinder could exhaust key cards at random.

### q044 rest/plan（7XK6DUJYMYY3 F11）
- 日志: o1:c11  — Two later rests (F13/F16) can heal to full before boss, so forge now; Infernal Blade at 0 cost adds free attack tempo to close the ~6 dmg/turn gap.
- A: o1:c11|keep  — No combat before the F13 rest, so the heal is only deferred; upgrade 地狱之刃 (0-cost, kept long-term; Strikes will be deleted). / route: No fight before the F13 rest and two rests remain; smith now is free.
- B: o1:c11|keep  — Damage gap ~6/turn; 0-cost Infernal Blade+ adds free attacks to strip Slippery, and two rests ahead still heal to full. / route: Next node is a free shop; both later rests heal to full, boss entry stays ~87.
- C: o1:c0|keep  — Next rest heals before any fight; Micro Cannon boosts upgraded attacks, so Strike+ best closes the 6/turn damage gap versus Vantom. / route: No second elite near boss; shop for potions, full HP entry.

### q072 selection/upgrade（ETYCESZQ6BWZ F7）
- 日志: card6 痛击 — Bash+ (10 dmg, 3 Vulnerable) amplifies every attack vs the Kin priest and followers; it's the code's top upgrade and the guide's stated priority.
- A: card6 痛击 — Bash+ (10 dmg, 3 Vulnerable) is our only Vulnerable source and multiplies every attack plus Inferno into the priest — best fix for the 23/turn damage gap.
- B: card6 痛击 — Bash+: 10 dmg + 3 Vulnerable turns is the best damage multiplier vs Kin priest (need 43/turn, gap 23); block/damage upgrades don't close the gap.
- C: card7 狱火 — Inferno+ raises the AoE from 6 to 9 each turn for the whole fight. That is about +18 on the priest, plus the same on the followers and in multi-enemy hallways, which best closes the 23/turn gap.

### q073 selection/remove（8V0HD9Y207WY F15）
- 日志: card0 打击 — Remove a Strike: 5 Strikes clog the boss race, run plan says delete Strikes first, and Strike is strictly worse than every remaining attack.
- A: card0 打击 — Remove a Strike: run plan and every lesson say delete Strikes first; 5 copies clog boss draws, and Battle Trunk puppet already boosts remaining 'Strike' hits.
- B: card0 打击 — Remove a Strike: run plan's top deletion, 5 Strikes clog the boss race; keep Defends (only 4 block cards) and 燃烧/双重打击.
- C: card5 防御 — Strike Dummy makes Strikes our efficient damage for the Giant race; Defend's 5 block is weakest, and 7 block cards remain for Gun/eruption.

### q035 event/plan（KTRT1M2SVVL3 F20）
- 日志: o0 抵抗诱惑 — Two targeted Strike removals beat an unknown enchant: winners run ≤1 Strike; Normality's cap overlaps with Sloth, which we take vs Knowledge Demon anyway.
- A: o1:c14  — Normality's 3-play cap wrecks our mittens/Rupture multi-play scaling and the enchant is free; enchant 上勾拳+, our best per-play hit under Knowledge Demon's Sloth cap.
- B: o0 抵抗诱惑 — Remove 2 Strikes per plan; Toasty Mittens converts the curse into Strength fuel, and the boss's 3-play cap makes one dead card cheap.
- C: o1:c20  — Avoid adding the 凡庸 curse, which likely caps card plays. Perfect Fit likely puts Pyre on top of the draw pile, so it comes out early for +1 energy each turn.

### q037 event/act-plan（2XWM27TZ7T12 F34）
- 日志: o0|p3 低语耳环 — Earring's +1 energy every turn funds our expensive Demon Form+/Fiend Fire engine; Wish+max-HP loss and parasol deck bloat are worse. Route p3 gives the safest elite approach (56/80) and best Queen entry (~48/80).
- A: o1|p1 原初之爪 — 原初之爪：9 点上限换 3 张许愿，补力量成长与女王战缺口；耳环让瓦库接管 T1（还喝过保命药水），阳伞在 0 商店的 p1 是白板。路线 p1：唯一不耗尽 HP 的路。
- B: o1|p1 原初之爪 — Earring loses turn 1/potions (prior A9 F34 earring run died); Parasol worthless (0 shops here). Claw's -9 max HP is cheap for 3 Wish. Route p1: only path reaching boss.
- C: o2|p1 领主阳伞 — Earring killed this run's first turns before; Claw costs 9 max HP. Parasol is harmless on p1 (no shops), which is the only route that survives. / route: Only route keeping HP; one elite, two rests.

### q053 shop/plan（7MDJ256RY2UU F8）
- 日志: ["buy_card0", "buy_potion0", "buy_potion2", "discard_potion0"]  — HP 30% and boss in 9: blood potion first (heals 20). Hemokinesis is the frontload that closes the Giant's 20/turn clock gap. Trade colorless for block potion to survive the eruption; ~13g left.
- A: ["buy_potion1", "remove:c0"]  — Powder first (low-HP shop rule) then Strike removal: its ~9 dmg/enemy-turn closes the Giant's 9/turn clock gap, forcing a T7-T8 kill and smaller eruption; 172/188 gold.
- B: ["buy_card0", "remove:c0"]  — Next node is a rest so path HP is covered; the Giant is a damage race (deck short ~9/turn). Hemokinesis is the shop's only real damage fix (rank 2, best boss-pass stats) and deleting a Strike matches the plan.
- C: ["buy_card0", "buy_potion2"]  — At 30% HP with an empty potion slot, I'm buying the Blood Potion first as HP for the eruption turn. Hemokinesis is 15 damage for 1 energy, which helps close the Giant gap. Total 125 of 188 gold.

