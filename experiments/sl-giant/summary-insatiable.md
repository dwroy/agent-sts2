# SL judge on the Insatiable boards (tools/sl-giant-replay.ts --boss insatiable)

81 fights, 91 attempts; 2912 decision boards; errors 0.
Phase: the Sandpit count on the board. Outcome: died = the attempt ended in that turn with GAME_OVER or an SL reload, won = the fight won in that turn, survived = a turn that was not the last, ? = the log ends there.

## end_turn boards (logged end_turn, logged label: the live end_turn judgment)

| | boards | certain before | certain after | after: died | after: WRONG (certain, not a death) |
|---|---|---|---|---|---|
| sandpit 1 | 16 ({'?': 1, 'died': 15}) | 5 | 13 | 13 | 0 |
| other | 586 ({'survived': 556, 'died': 28, 'won': 2}) | 25 | 25 | 25 | 0 |

not certain after, by outcome and reason:

| phase | outcome | reason | boards |
|---|---|---|---|
| other | survived | the mod does not flag ending the turn as lethal | 553 |
| other | survived | own count survives: N incoming - N block - N end-of-turn block - N Regen < N HP | 3 |
| sandpit 1 | died | N playable card(s) and N potion(s) left | 2 |
| other | won | the mod does not flag ending the turn as lethal | 2 |
| sandpit 1 | ? | N playable card(s) and N potion(s) left | 1 |
| other | died | N playable card(s) and N potion(s) left | 1 |
| other | died | the enemies may be hit before they act: 无厌沙虫 (招架盾 (N to a random enemy)) may die first, and the rest's N does not kill | 1 |
| other | died | a revive is left (LIZARD_TAIL) | 1 |

## end_turn boards (the current planner's end_turn and label)

| | boards | certain before | certain after | after: died | after: WRONG (certain, not a death) |
|---|---|---|---|---|---|
| sandpit 1 | 12 ({'died': 12}) | 5 | 12 | 12 | 0 |
| other | 413 ({'survived': 384, 'died': 27, 'won': 2}) | 26 | 26 | 26 | 0 |

not certain after, by outcome and reason:

| phase | outcome | reason | boards |
|---|---|---|---|
| other | survived | the mod does not flag ending the turn as lethal | 381 |
| other | survived | own count survives: N incoming - N block - N end-of-turn block - N Regen < N HP | 3 |
| other | won | the mod does not flag ending the turn as lethal | 2 |
| other | died | the enemies may be hit before they act: 无厌沙虫 (招架盾 (N to a random enemy)) may die first, and the rest's N does not kill | 1 |

## early reload (the current planner's least-loss card or potion: judgeLeastLossNow)

| | boards | certain before | certain after | after: died | after: WRONG (certain, not a death) |
|---|---|---|---|---|---|
| sandpit 1 | 44 ({'died': 43, 'survived': 1}) | 0 | 0 | 0 | 0 |
| other | 101 ({'died': 91, 'survived': 9, 'won': 1}) | 0 | 0 | 0 | 0 |

not certain after, by outcome and reason:

| phase | outcome | reason | boards |
|---|---|---|---|
| other | died | not before the line is played: cards were added to the draw pile at random places this attempt | 53 |
| sandpit 1 | died | not before the line is played: cards were added to the draw pile at random places this attempt | 25 |
| other | died | the planner sees every line die, but 探寻打击 draws (unknown cards); not with any draw: 探寻打击 is not a plain draw (No Draw ma | 12 |
| other | survived | not before the line is played: cards were added to the draw pile at random places this attempt | 9 |
| other | died | not before the line is played: chance in the verdict (羽化 has a random effect) | 4 |
| sandpit 1 | died | not before the line is played: chance in the verdict (a random potion (能力药水): its samples) | 4 |
| other | died | the planner sees every line die, but 耸肩无视 draws (unknown cards); not with any draw: Vambrace may double the first card B | 4 |
| other | died | not before the line is played: chance in the verdict (痛殴 has a random effect) | 3 |
| sandpit 1 | died | not before the line is played: chance in the verdict (坚毅 has a random effect) | 3 |
| sandpit 1 | died | the planner sees every line die, but 耸肩无视 draws (unknown cards); not with any draw: a line lives on the superset board ( | 3 |
| other | died | the planner sees every line die, but 战斗专注 draws (unknown cards); not with any draw: 余烬+ has a random effect; 探寻打击 has a  | 3 |
| sandpit 1 | died | Ripple Basin (no attack played): its block is not counted here | 2 |
| sandpit 1 | died | the planner sees every line die, but 祭品 draws (unknown cards); not with any draw: drawing or changing the draw pile mid- | 2 |
| other | died | not before the line is played: chance in the verdict (a random potion (能力药水): its samples) | 2 |
| other | died | the planner sees every line die, but 耸肩无视 draws (unknown cards); not with any draw: drawing or changing the draw pile mi | 1 |
| sandpit 1 | survived | the planner sees every line die, but 妙计 draws (unknown cards); not with any draw: a line lives on the superset board (th | 1 |
| sandpit 1 | died | the planner sees every line die, but 剑柄打击 draws (unknown cards); not with any draw: drawing or changing the draw pile mi | 1 |
| sandpit 1 | died | the planner sees every line die, but 剑柄打击+ draws (unknown cards); not with any draw: a line lives on the superset board  | 1 |
| other | died | the planner sees every line die, but 剑柄打击 draws (unknown cards); not with any draw: a line lives on the superset board ( | 1 |
| other | died | the planner sees every line die, but 耸肩无视 draws (unknown cards); not with any draw: a line lives on the superset board ( | 1 |
| other | died | not before the line is played: chance in the verdict (狂怒+ is not modelled) | 1 |
| sandpit 1 | died | the planner sees every line die, but 燃烧契约 draws (unknown cards); not with any draw: 狂宴 may heal or shield us beyond the  | 1 |
| other | died | the planner sees every line die, but 头槌 draws (unknown cards); not with any draw: a line lives on the superset board (th | 1 |
| other | died | the enemies may be hit before they act: 无厌沙虫 (招架盾 (N to a random enemy)) may die first, and the rest's N does not kill | 1 |
| other | died | the planner sees every line die, but 祭品 draws (unknown cards); not with any draw: drawing or changing the draw pile mid- | 1 |
| other | died | the planner sees every line die, but 剑柄打击 draws (unknown cards); not with any draw: drawing or changing the draw pile mi | 1 |
| other | died | the planner sees every line die, but 战斗专注 draws (unknown cards); not with any draw: drawing or changing the draw pile mi | 1 |
| sandpit 1 | died | the planner sees every line die, but 祭品 draws (unknown cards); not with any draw: a random potion (能力药水): its samples ar | 1 |
| other | died | the planner sees every line die, but 战斗专注 draws (unknown cards); not with any draw: Tungsten Rod takes N off each HP los | 1 |
| other | won | the planner sees every line die, but 头槌 draws (unknown cards); not with any draw: drawing or changing the draw pile mid- | 1 |

## Each end_turn at Sandpit 1

| fight | A | attempt | turn | HP | block | incoming | outcome | before | after |
|---|---|---|---|---|---|---|---|---|---|
| 3MDJW1UAD5M6 F33 | 0 | 1 | T5 | 19 | 21 | 20 | ? | not: the mod does not flag ending the turn as lethal | not: 0 playable card(s) and 2 potion(s) left |
| TTVYCS2ADZRM F33 | 0 | 1 | T6 | 33 | 20 | 20 | died | not: the mod does not flag ending the turn as lethal | not: 0 playable card(s) and 2 potion(s) left |
| THMGB35RGDSD F33 | 2 | 1 | T7 | 22 | 21 | 30 | died | not: the mod does not flag ending the turn as lethal | certain (least-loss) |
| M8123JA75Y1G F33 | 6 | 1 | T8 | 4 | 0 | 0 | died | not: the mod does not flag ending the turn as lethal | certain (rules) |
| Y08TU00D9VLH F33 | 7 | 1 | T5 | 48 | 14 | 20 | died | not: the mod does not flag ending the turn as lethal | certain (least-loss) |
| WB023SWBTUU3 F33 | 8 | 1 | T7 | 17 | 5 | 30 | died | certain: nothing left to play or drink; 30 incoming vs 17 HP + 5 bloc | certain (rules) |
| X8HF0SB0XGJ1 F33 | 8 | 1 | T6 | 21 | 24 | 20 | died | not: the mod does not flag ending the turn as lethal | certain (least-loss) |
| EJXCAQ56PWLK F33 | 8 | 1 | T7 | 15 | 14 | 30 | died | certain: nothing left to play or drink; 30 incoming vs 15 HP + 14 blo | certain (rules) |
| 9V09G0TKK5EQ F33 | 8 | 1 | T5 | 29 | 13 | 0 | died | not: the mod does not flag ending the turn as lethal | not: 0 playable card(s) and 1 potion(s) left |
| FN0HCB4DVKZK F33 | 8 | 1 | T12 | 5 | 6 | 0 | died | not: the mod does not flag ending the turn as lethal | certain (least-loss) |
| LXB3B2WT9E0W F33 | 8 | 1 | T5 | 81 | 18 | 18 | died | not: the mod does not flag ending the turn as lethal | certain (rules) |
| 981WMX8MQ7DK F33 | 8 | 1 | T10 | 7 | 10 | 26 | died | certain: nothing left to play or drink; 26 incoming vs 7 HP + 10 bloc | certain (rules) |
| KY3YZ0DMRY0G F33 | 9 | 1 | T9 | 14 | 10 | 32 | died | certain: nothing left to play or drink; 32 incoming vs 14 HP + 10 blo | certain (rules) |
| 06S86JU88EG5 F33 | 8 | 1 | T7 | 42 | 7 | 30 | died | not: the mod does not flag ending the turn as lethal | certain (rules) |
| CDR0Q6929CKR F33 | 8 | 1 | T7 | 14 | 5 | 30 | died | certain: the turn planner: every simulated line dies and ending the t | certain (least-loss) |
| BVJT7HFW6X2S F33 | 9 | 1 | T5 | 21 | 12 | 24 | died | not: the mod does not flag ending the turn as lethal | certain (rules) |

Boards whose verdict or reason changed: 31, all at Sandpit 1: True.
