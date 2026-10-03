# SL judge on the boards with our own HP loss at the next turn's start (tools/sl-start-loss-replay.ts)

985 fights with INFERNO_POWER or CRIMSON_MANTLE_POWER on us; 13864 decision boards with it up ({'Mantle only': 4018, 'Inferno x1': 8706, 'Inferno x2+': 626, 'Inferno x1 + Mantle': 514}); rows missing before: 0; errors 0.
Outcome of a board at turn T: survived = a later turn of the attempt acted; won = the fight ended won with no later action; died = GAME_OVER with no later action;
reloaded = an SL reload followed with no later action (the death not seen). WRONG = certain after, and the board did not die (survived, won, or EVENT / ?: the fight ended into an event, the log ends).

## end_turn boards (logged end_turn, logged label: the live end_turn judgment)

| | boards | certain before | certain after | after: died | after: reloaded | after: WRONG |
|---|---|---|---|---|---|---|
| Inferno x2+ | 158 ({'survived': 128, 'died': 5, 'won': 10, 'reloaded': 15}) | 15 | 16 | 5 | 11 | 0 |
| Inferno x1 | 2042 ({'survived': 1873, 'won': 100, 'died': 58, 'EVENT': 3, 'reloaded': 8}) | 55 | 55 | 48 | 7 | 0 |
| Inferno x1 + Mantle | 127 ({'survived': 106, 'died': 9, 'won': 7, 'reloaded': 5}) | 14 | 14 | 9 | 5 | 0 |
| Mantle only | 968 ({'survived': 928, '?': 1, 'died': 22, 'won': 9, 'EVENT': 1, 'reloaded': 7}) | 21 | 21 | 17 | 4 | 0 |

Newly certain: 1 ({'died': 1}); no longer certain: 0 ({}).

| change | fight | A | attempt | turn | HP | block | Inferno | Mantle | outcome | before | after |
|---|---|---|---|---|---|---|---|---|---|---|---|
| new | C4F14F3XPN0N F33 | 9 | 5 | T6 | 14 | 9 | 18 | 0 | died | not: the mod does not flag ending the turn as lethal | certain (rules): nk; 21 incoming vs 14 HP + 9 block + 0 end-of-turn block, then 2 HP lost at the next turn's start (Inferno x2) |

Not certain after, the reason changed (timings aside):

| reason after | boards |
|---|---|
| only our own loss at the next turn's start makes it lethal (then N HP lost at the next turn's start (Crimson Mantle)), and 势不可当 (p | 1 |

Not certain after, by kind, outcome and reason (top 25):

| kind | outcome | reason | boards |
|---|---|---|---|
| Inferno x1 | survived | the mod does not flag ending the turn as lethal | 1864 |
| Mantle only | survived | the mod does not flag ending the turn as lethal | 923 |
| Inferno x2+ | survived | the mod does not flag ending the turn as lethal | 128 |
| Inferno x1 + Mantle | survived | the mod does not flag ending the turn as lethal | 106 |
| Inferno x1 | won | the mod does not flag ending the turn as lethal | 100 |
| Inferno x2+ | won | the mod does not flag ending the turn as lethal | 10 |
| Mantle only | won | the mod does not flag ending the turn as lethal | 9 |
| Inferno x1 + Mantle | won | the mod does not flag ending the turn as lethal | 7 |
| Inferno x1 | survived | own count survives: N incoming - N block - N end-of-turn block - N Regen < N HP | 4 |
| Inferno x2+ | reloaded | the mod does not flag ending the turn as lethal | 4 |
| Mantle only | died | N playable card(s) and N potion(s) left | 3 |
| Inferno x1 | EVENT | the mod does not flag ending the turn as lethal | 3 |
| Mantle only | survived | a revive is left (LIZARD_TAIL) | 2 |
| Inferno x1 | died | the mod does not flag ending the turn as lethal | 2 |
| Inferno x1 | survived | a revive is left (FAIRY_IN_A_BOTTLE, FAIRY_IN_A_BOTTLE) | 2 |
| Inferno x1 | died | N playable card(s) and N potion(s) left | 2 |
| Inferno x1 | survived | a revive is left (FAIRY_IN_A_BOTTLE) | 2 |
| Mantle only | reloaded | own count survives: N incoming - N block - N end-of-turn block - N Regen < N HP | 2 |
| Mantle only | survived | a revive is left (FAIRY_IN_A_BOTTLE) | 1 |
| Mantle only | ? | N playable card(s) and N potion(s) left | 1 |
| Mantle only | died | a revive is left (LIZARD_TAIL) | 1 |
| Inferno x1 | died | own count not exact: Beating Remnant caps the HP lost this turn at N and the HP lost so far this turn is not known exactly | 1 |
| Inferno x1 | died | the planner sees every line die, but 战斗专注+ draws (unknown cards); not with any draw: a line lives on the superset board (the hand  | 1 |
| Mantle only | EVENT | the mod does not flag ending the turn as lethal | 1 |
| Mantle only | survived | own count survives: N HP lost (Tungsten Rod: each HP loss N less) - N Regen < N HP | 1 |

## end_turn boards (the current planner's end_turn and label; planned where the mod flags or our count dies)

| | boards | certain before | certain after | after: died | after: reloaded | after: WRONG |
|---|---|---|---|---|---|---|
| Inferno x2+ | 16 ({'died': 5, 'reloaded': 11}) | 15 | 16 | 5 | 11 | 0 |
| Inferno x1 | 67 ({'died': 56, 'survived': 4, 'reloaded': 7}) | 58 | 58 | 51 | 7 | 0 |
| Inferno x1 + Mantle | 12 ({'died': 7, 'reloaded': 5}) | 12 | 12 | 7 | 5 | 0 |
| Mantle only | 29 ({'survived': 3, 'died': 20, 'reloaded': 6}) | 22 | 22 | 18 | 4 | 0 |

Newly certain: 1 ({'died': 1}); no longer certain: 0 ({}).

| change | fight | A | attempt | turn | HP | block | Inferno | Mantle | outcome | before | after |
|---|---|---|---|---|---|---|---|---|---|---|---|
| new | C4F14F3XPN0N F33 | 9 | 5 | T6 | 14 | 9 | 18 | 0 | died | - | certain (rules): nk; 21 incoming vs 14 HP + 9 block + 0 end-of-turn block, then 2 HP lost at the next turn's start (Inferno x2) |

Not certain after, the reason changed (timings aside):

| reason after | boards |
|---|---|
| only our own loss at the next turn's start makes it lethal (then N HP lost at the next turn's start (Crimson Mantle)), and 势不可当 (p | 1 |

Not certain after, by kind, outcome and reason (top 25):

| kind | outcome | reason | boards |
|---|---|---|---|
| Inferno x1 | survived | own count survives: N incoming - N block - N end-of-turn block - N Regen < N HP | 3 |
| Mantle only | survived | a revive is left (LIZARD_TAIL) | 2 |
| Mantle only | reloaded | own count survives: N incoming - N block - N end-of-turn block - N Regen < N HP | 2 |
| Mantle only | died | own count survives: N incoming - N block - N end-of-turn block - N Regen < N HP | 1 |
| Inferno x1 | died | own count not exact: Beating Remnant caps the HP lost this turn at N and the HP lost so far this turn is not known exactly | 1 |
| Mantle only | survived | own count survives: N HP lost (Tungsten Rod: each HP loss N less) - N Regen < N HP | 1 |
| Inferno x1 | died | the planner sees every line die, but 疯狂科学 draws (unknown cards); not with any draw: 头槌 touches the draw pile; 狂宴 may heal or shiel | 1 |
| Inferno x1 | died | the planner sees every line die, but 劫掠 draws (unknown cards); not with any draw: 地狱之刃 is not modelled; 坚毅 has a random effect; PA | 1 |
| Inferno x1 | died | the enemies may be hit before they act: 惊逃 in hand acts on the enemies at the end of the turn | 1 |
| Inferno x1 | died | the enemies may be hit before they act: 无厌沙虫 (招架盾 (N to a random enemy)) may die first, and the rest's N does not kill | 1 |
| Mantle only | died | only our own loss at the next turn's start makes it lethal (then N HP lost at the next turn's start (Crimson Mantle)), and 势不可当 (p | 1 |
| Inferno x1 | survived | a revive is left (FAIRY_IN_A_BOTTLE) | 1 |

## early reload (the current planner's least-loss card or potion: judgeLeastLossNow)

| | boards | certain before | certain after | after: died | after: reloaded | after: WRONG |
|---|---|---|---|---|---|---|
| Inferno x2+ | 44 ({'died': 9, 'reloaded': 32, 'won': 1, 'survived': 2}) | 5 | 5 | 1 | 4 | 0 |
| Inferno x1 | 223 ({'died': 175, 'won': 6, 'survived': 10, 'reloaded': 32}) | 33 | 33 | 27 | 6 | 0 |
| Inferno x1 + Mantle | 39 ({'died': 23, 'survived': 1, 'reloaded': 15}) | 3 | 3 | 3 | 0 | 0 |
| Mantle only | 78 ({'died': 52, 'won': 3, 'survived': 8, 'reloaded': 15}) | 7 | 7 | 4 | 3 | 0 |

Newly certain: 0 ({}); no longer certain: 0 ({}).

Not certain after, the reason changed (timings aside):

| reason after | boards |
|---|---|
| the planner sees every line die, but 疯狂科学 draws (unknown cards); not with any draw: 头槌 touches the draw pile; 狂宴 may heal or shiel | 1 |

Not certain after, by kind, outcome and reason (top 25):

| kind | outcome | reason | boards |
|---|---|---|---|
| Inferno x1 | died | not before the line is played: cards were added to the draw pile at random places this attempt | 22 |
| Mantle only | died | not before the line is played: cards were added to the draw pile at random places this attempt | 16 |
| Mantle only | reloaded | not before the line is played: acting mid-turn without the planner: 双截棍 (relic), 冻结之蛋 (relic) | 12 |
| Inferno x1 | died | not before the line is played: acting mid-turn without the planner: 金纸 (relic) | 10 |
| Inferno x1 + Mantle | reloaded | not before the line is played: acting mid-turn without the planner: 百年积木 (relic) | 10 |
| Inferno x1 | reloaded | not before the line is played: cards were added to the draw pile at random places this attempt | 10 |
| Inferno x1 | died | not before the line is played: acting mid-turn without the planner: 百年积木 (relic) | 9 |
| Inferno x2+ | reloaded | not before the line is played: cards were added to the draw pile at random places this attempt | 8 |
| Inferno x1 | died | not before the line is played: chance in the verdict (坚毅 has a random effect) | 6 |
| Inferno x1 | died | the planner sees every line die, but 战斗专注+ draws (unknown cards); not with any draw: a line lives on the superset board (the hand  | 5 |
| Inferno x1 | died | not before the line is played: acting mid-turn without the planner: 音叉 (relic) | 5 |
| Inferno x1 | died | Ripple Basin (no attack played): its block is not counted here | 5 |
| Inferno x1 + Mantle | reloaded | the planner sees every line die, but 耸肩无视 draws (unknown cards); not with any draw: drawing or changing the draw pile mid-turn: 百年 | 5 |
| Mantle only | died | not before the line is played: acting mid-turn without the planner: 地精之角 (relic) | 5 |
| Inferno x2+ | reloaded | not before the line is played: acting mid-turn without the planner: 百年积木 (relic), 遗忘之魂 (relic) | 5 |
| Mantle only | died | not before the line is played: chance in the verdict (痛殴 has a random effect) | 4 |
| Inferno x1 | died | own count not exact: Beating Remnant caps the HP lost this turn at N and the HP lost so far this turn is not known exactly | 4 |
| Inferno x1 | died | the planner sees every line die, but 耸肩无视 draws (unknown cards); not with any draw: a line lives on the superset board (the hand + | 4 |
| Inferno x1 | died | not before the line is played: chance in the verdict (a random potion (能力药水): its samples) | 4 |
| Inferno x1 | died | not before the line is played: acting mid-turn without the planner: 精致折扇 (relic) | 4 |
| Inferno x1 + Mantle | died | not before the line is played: acting mid-turn without the planner: 精致折扇 (relic) | 4 |
| Inferno x1 | reloaded | not before the line is played: acting mid-turn without the planner: 彩虹戒指 (relic) | 4 |
| Mantle only | died | not before the line is played: acting mid-turn without the planner: 双截棍 (relic), 冻结之蛋 (relic) | 4 |
| Inferno x2+ | reloaded | the planner sees every line die, but 耸肩无视 draws (unknown cards); not with any draw: Vambrace may double the first card Block not s | 4 |
| Inferno x1 | reloaded | not before the line is played: acting mid-turn without the planner: 百年积木 (relic), 遗忘之魂 (relic) | 4 |

## Each logged end_turn with the loss up that ended in a death (the enemy turn or the next turn's start)

| fight | A | attempt | turn | HP | block | incoming | Inferno | Mantle | before | after |
|---|---|---|---|---|---|---|---|---|---|---|
| NSWFREAAWMXQ F13 | 0 | 1 | T8 | 1 | 7 | 0 | 0 | 7 | not: 1 playable card(s) and 0 potion(s) left | not: 1 playable card(s) and 0 potion(s) left |
| 3RWJX25LB2CD F24 | 0 | 1 | T3 | 8 | 7 | 14 | 0 | 7 | not: 0 playable card(s) and 2 potion(s) left | not: 0 playable card(s) and 2 potion(s) left |
| 0NG27W8QBNYX F31 | 0 | 1 | T3 | 1 | 20 | 16 | 0 | 7 | not: a revive is left (LIZARD_TAIL) | not: a revive is left (LIZARD_TAIL) |
| YP9CGPJE19GP F33 | 0 | 1 | T4 | 1 | 7 | 0 | 0 | 7 | certain | certain (rules) |
| 39J9KFKGKEXA F29 | 0 | 1 | T1 | 10 | 0 | 24 | 0 | 7 | certain | certain (rules) |
| UJS25W5ARGBV F28 | 2 | 1 | T4 | 10 | 0 | 16 | 9 | 0 | certain | certain (rules) |
| 9XZX4ZJ1ZKUA F33 | 2 | 1 | T7 | 5 | 17 | 26 | 6 | 0 | not: own count not exact: Beating Remnant caps the HP lost this t | not: own count not exact: Beating Remnant caps the HP lost this turn at 20 and the HP lost so far this tu |
| 24DPW2ED71QM F33 | 2 | 1 | T11 | 17 | 0 | 36 | 6 | 0 | certain | certain (least-loss) |
| VP5FZC9UCP63 F48 | 2 | 1 | T8 | 12 | 5 | 50 | 6 | 0 | not: the planner sees every line die, but 战斗专注+ draws (unknown ca | not: the planner sees every line die, but 战斗专注+ draws (unknown cards); not with any draw: a line lives on |
| THMGB35RGDSD F33 | 2 | 1 | T7 | 22 | 21 | 30 | 0 | 7 | certain | certain (least-loss) |
| VC4LRL945UEF F23 | 3 | 1 | T2 | 17 | 0 | 16 | 6 | 0 | not: the mod does not flag ending the turn as lethal | not: the mod does not flag ending the turn as lethal |
| JGJS7QE62GLD F24 | 3 | 1 | T2 | 16 | 0 | 23 | 12 | 0 | certain | certain (least-loss) |
| Y0KJC2MQ57Z4 F48 | 3 | 1 | T8 | 1 | 18 | 26 | 0 | 7 | certain | certain (rules) |
| MGJ8W6C8L1DG F17 | 3 | 1 | T10 | 3 | 17 | 20 | 0 | 7 | certain | certain (rules) |
| VQSA3FRA2ML9 F33 | 3 | 1 | T17 | 3 | 25 | 48 | 0 | 10 | certain | certain (rules) |
| QBRNKXZR2A4P F48 | 3 | 1 | T8 | 18 | 23 | 36 | 6 | 7 | certain | certain (rules) |
| JF99S7FY4WFU F33 | 4 | 1 | T9 | 10 | 6 | 35 | 9 | 0 | certain | certain (rules) |
| 5TQX4PBBB9ZU F33 | 4 | 1 | T4 | 16 | 8 | 33 | 6 | 0 | certain | certain (rules) |
| M75JX3KS80NB F48 | 5 | 1 | T7 | 17 | 11 | 45 | 6 | 0 | certain | certain (rules) |
| 92MWCWJCFDAE F33 | 5 | 1 | T8 | 4 | 10 | 13 | 6 | 0 | certain | certain (rules) |
| YVWAWAPXJXGV F48 | 5 | 1 | T8 | 8 | 18 | 36 | 6 | 7 | certain | certain (least-loss) |
| M8123JA75Y1G F33 | 6 | 1 | T8 | 4 | 0 | 0 | 6 | 0 | certain | certain (rules) |
| 24HMNKB4N32V F33 | 7 | 1 | T14 | 17 | 26 | 42 | 0 | 10 | not: 0 playable card(s) and 2 potion(s) left | not: 0 playable card(s) and 2 potion(s) left |
| 7DFB21JE2DTK F48 | 7 | 1 | T7 | 1 | 25 | 49 | 0 | 10 | certain | certain (least-loss) |
| L34T7HND7EL8 F48 | 7 | 1 | T7 | 24 | 8 | 29 | 6 | 0 | not: only the held cards make it lethal (held 凋萎+2: 9 damage), an | not: only the held cards make it lethal (held 凋萎+2: 9 damage), and INFERNO_POWER hits the enemies when th |
| YFG53EZ372D7 F48 | 7 | 1 | T10 | 1 | 0 | 0 | 6 | 0 | not: the planner sees every line die, but 疯狂科学 draws (unknown car | not: the planner sees every line die, but 疯狂科学 draws (unknown cards); not with any draw: 头槌 touches the d |
| P2E43JJVFGMK F48 | 7 | 1 | T8 | 3 | 11 | 25 | 9 | 7 | certain | certain (rules) |
| PPKTGCDHJHM9 F17 | 7 | 1 | T11 | 6 | 5 | 21 | 6 | 0 | certain | certain (least-loss) |
| 5BXMTT63VBBA F33 | 8 | 1 | T11 | 8 | 11 | 36 | 9 | 0 | certain | certain (rules) |
| X4QRH94TSFG2 F23 | 8 | 1 | T4 | 4 | 0 | 16 | 6 | 0 | certain | certain (least-loss) |
| MX8KZU7ABQBQ F33 | 8 | 1 | T9 | 6 | 10 | 41 | 6 | 0 | certain | certain (rules) |
| T4PYMNJJFSU6 F33 | 8 | 1 | T4 | 29 | 10 | 49 | 9 | 0 | certain | certain (rules) |
| 2Q370C5EW0EU F33 | 8 | 1 | T11 | 11 | 7 | 36 | 6 | 0 | certain | certain (rules) |
| NMLV5SYCFL8X F33 | 8 | 1 | T7 | 17 | 14 | 36 | 6 | 0 | certain | certain (rules) |
| N28LRAMJ9SST F17 | 8 | 1 | T12 | 21 | 1 | 23 | 6 | 0 | certain | certain (rules) |
| XWPVR2NK3M5K F48 | 8 | 1 | T11 | 2 | 34 | 46 | 0 | 10 | certain | certain (least-loss) |
| ZWX5F97BUFVB F33 | 8 | 1 | T4 | 32 | 0 | 49 | 6 | 0 | certain | certain (least-loss) |
| X8HF0SB0XGJ1 F33 | 8 | 1 | T6 | 21 | 24 | 20 | 6 | 7 | certain | certain (least-loss) |
| H7W047ZCEBSA F48 | 8 | 1 | T6 | 3 | 22 | 24 | 0 | 7 | certain | certain (rules) |
| FH3MZ3G0HECD F30 | 8 | 1 | T3 | 4 | 10 | 16 | 15 | 0 | certain | certain (rules) |
| 9V09G0TKK5EQ F33 | 8 | 1 | T5 | 29 | 13 | 0 | 6 | 0 | not: 0 playable card(s) and 1 potion(s) left | not: 0 playable card(s) and 1 potion(s) left |
| VQ7JT9W2V287 F11 | 8 | 1 | T6 | 9 | 11 | 23 | 6 | 0 | certain | certain (rules) |
| VF5CMUAQV4G4 F27 | 8 | 1 | T5 | 2 | 0 | 14 | 6 | 0 | not: 0 playable card(s) and 1 potion(s) left | not: 0 playable card(s) and 1 potion(s) left |
| HCBJ887UWCNE F17 | 8 | 1 | T9 | 18 | 3 | 22 | 6 | 0 | certain | certain (least-loss) |
| YG3HAFACLMAR F33 | 8 | 1 | T9 | 2 | 10 | 24 | 0 | 7 | certain | certain (least-loss) |
| PKB0Z630CLXT F17 | 8 | 1 | T8 | 2 | 9 | 21 | 6 | 0 | certain | certain (rules) |
| PCGH29GVGSCE F33 | 8 | 1 | T6 | 12 | 0 | 19 | 6 | 0 | certain | certain (rules) |
| FEY65PFTP8BH F17 | 8 | 1 | T8 | 15 | 3 | 21 | 6 | 0 | certain | certain (rules) |
| EHJZSGVU0VQ9 F33 | 8 | 1 | T5 | 7 | 0 | 14 | 6 | 0 | certain | certain (rules) |
| 94FPBTS15SQT F33 | 8 | 1 | T10 | 1 | 17 | 21 | 6 | 7 | certain | certain (rules) |
| RUUBXYZV5064 F33 | 8 | 1 | T4 | 26 | 8 | 49 | 6 | 0 | certain | certain (rules) |
| W8JDDTMSYA6T F31 | 8 | 1 | T5 | 1 | 13 | 16 | 6 | 0 | certain | certain (rules) |
| XA8CMSK1V9H3 F33 | 8 | 1 | T6 | 1 | 5 | 20 | 6 | 0 | certain | certain (rules) |
| ZW9SQYC7KBC3 F22 | 8 | 1 | T5 | 1 | 25 | 15 | 0 | 7 | certain | certain (rules) |
| AGF0UBDPV7F1 F17 | 8 | 1 | T8 | 1 | 6 | 0 | 6 | 0 | certain | certain (rules) |
| TEK4MLSEGC4P F33 | 8 | 1 | T10 | 1 | 13 | 22 | 6 | 0 | certain | certain (rules) |
| H3E7XSQ8JRY8 F9 | 8 | 1 | T6 | 17 | 0 | 23 | 6 | 0 | certain | certain (least-loss) |
| RA3QYBLN7RJF F33 | 8 | 1 | T17 | 3 | 10 | 48 | 0 | 10 | certain | certain (rules) |
| LMTA6JC86RCC F17 | 8 | 1 | T7 | 2 | 10 | 24 | 9 | 0 | not: the enemies may be hit before they act: 惊逃 in hand acts on t | not: the enemies may be hit before they act: 惊逃 in hand acts on the enemies at the end of the turn |
| EZ2LP1P5VRPT F48 | 8 | 1 | T6 | 2 | 37 | 75 | 6 | 0 | certain | certain (rules) |
| FA82FQHSJG2F F27 | 8 | 1 | T10 | 12 | 19 | 46 | 6 | 0 | certain | certain (least-loss) |
| Z6AMPPWHQ5CV F33 | 8 | 1 | T7 | 19 | 12 | 30 | 0 | 7 | certain | certain (least-loss) |
| VQKX9AD1YHKS F48 | 8 | 1 | T7 | 2 | 16 | 0 | 9 | 0 | not: the mod does not flag ending the turn as lethal | not: the mod does not flag ending the turn as lethal |
| WFDBEQ0GD60Z F15 | 9 | 1 | T4 | 9 | 11 | 24 | 6 | 0 | certain | certain (rules) |
| ETYCESZQ6BWZ F24 | 9 | 1 | T4 | 3 | 4 | 20 | 9 | 0 | certain | certain (rules) |
| SK1USHSB1U7U F45 | 9 | 1 | T7 | 31 | 0 | 50 | 6 | 0 | certain | certain (least-loss) |
| XMK1JFZ0VD2Q F33 | 9 | 1 | T6 | 24 | 0 | 28 | 6 | 0 | not: the enemies may be hit before they act: 无厌沙虫 (招架盾 (6 to a ra | not: the enemies may be hit before they act: 无厌沙虫 (招架盾 (6 to a random enemy)) may die first, and the rest |
| 9GRPS5DC8KHN F29 | 9 | 1 | T4 | 14 | 9 | 24 | 6 | 0 | certain | certain (rules) |
| 3SBPKG9603WD F17 | 9 | 1 | T10 | 11 | 5 | 22 | 6 | 0 | certain | certain (rules) |
| 842N6N604DVX F33 | 8 | 1 | T10 | 4 | 10 | 21 | 6 | 0 | certain | certain (rules) |
| 06S86JU88EG5 F33 | 8 | 1 | T7 | 42 | 7 | 30 | 0 | 7 | certain | certain (rules) |
| CDR0Q6929CKR F33 | 8 | 1 | T7 | 14 | 5 | 30 | 9 | 0 | certain | certain (least-loss) |
| FYQUP0GVWNUU F33 | 8 | 1 | T7 | 1 | 21 | 12 | 9 | 0 | certain | certain (rules) |
| Z3DFG85QDRCD F48 | 8 | 1 | T8 | 13 | 16 | 30 | 0 | 7 | not: the planner sees every line die, but 头槌+ draws (unknown card | not: only our own loss at the next turn's start makes it lethal (then 1 HP lost at the next turn's start  |
| QWXKQVYQGGCJ F30 | 8 | 1 | T2 | 3 | 5 | 8 | 6 | 0 | certain | certain (rules) |
| HME0FA7VA0J6 F33 | 8 | 1 | T8 | 15 | 5 | 28 | 15 | 0 | certain | certain (rules) |
| 8TF4SPG3M5RP F24 | 8 | 1 | T3 | 10 | 0 | 20 | 6 | 0 | certain | certain (rules) |
| 5CWLPJLYJKRL F33 | 8 | 1 | T9 | 6 | 0 | 35 | 9 | 0 | certain | certain (rules) |
| GSFSFQ3JWGEL F48 | 8 | 1 | T8 | 11 | 26 | 36 | 9 | 10 | certain | certain (least-loss) |
| R6V3T4KSDABE F48 | 8 | 1 | T5 | 4 | 9 | 24 | 6 | 0 | certain | certain (least-loss) |
| W5PTC48C3B1H F33 | 8 | 1 | T9 | 14 | 10 | 26 | 6 | 0 | certain | certain (least-loss) |
| RPC6X61N9FQ0 F33 | 8 | 1 | T7 | 19 | 0 | 30 | 15 | 0 | certain | certain (rules) |
| KXG79NARS0LT F48 | 8 | 1 | T7 | 5 | 16 | 50 | 9 | 10 | certain | certain (least-loss) |
| 1HF7GR4PZAPC F48 | 8 | 1 | T7 | 9 | 16 | 33 | 6 | 0 | certain | certain (rules) |
| R6E82S94VB0A F43 | 8 | 1 | T7 | 3 | 28 | 60 | 0 | 10 | certain | certain (rules) |
| TMNFVW6DRQ20 F48 | 8 | 1 | T8 | 15 | 28 | 38 | 9 | 14 | certain | certain (rules) |
| 63WBEEF2JVM5 F33 | 9 | 6 | T7 | 9 | 25 | 36 | 9 | 7 | certain | certain (rules) |
| 610BBERH4SPP F33 | 9 | 1 | T3 | 1 | 12 | 10 | 9 | 0 | certain | certain (least-loss) |
| 9V7K1P899R5N F45 | 9 | 4 | T4 | 15 | 26 | 46 | 0 | 10 | certain | certain (rules) |
| B3PJGKHAQGK6 F17 | 9 | 6 | T4 | 12 | 5 | 24 | 6 | 0 | certain | certain (rules) |
| HYQW47E7CBSC F38 | 9 | 1 | T5 | 5 | 19 | 28 | 0 | 7 | certain | certain (rules) |
| JKP66TF39633 F17 | 9 | 6 | T9 | 3 | 20 | 24 | 6 | 0 | certain | certain (rules) |
| P68P7CDJRDH3 F48 | 9 | 6 | T6 | 1 | 25 | 45 | 9 | 0 | certain | certain (rules) |
| C4F14F3XPN0N F33 | 9 | 5 | T6 | 14 | 9 | 21 | 18 | 0 | not: the mod does not flag ending the turn as lethal | certain (rules) |
