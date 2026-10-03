# SL judge on the Waterfall Giant husk boards (tools/sl-giant-replay.ts)

76 fights reached the husk; 442 decisions on husk turns ({'about': 124, 'blast': 318}); errors 0.
Outcome: died = GAME_OVER after the blast turn, won = the rewards after it, survived = a turn that was not the last.

## end_turn boards (logged end_turn, logged label: the live end_turn judgment)

| | boards | certain before | certain after | after: died | after: WRONG (certain, not a death) |
|---|---|---|---|---|---|
| blast | 76 ({'won': 53, 'died': 23}) | 0 | 20 | 20 | 0 |
| about | 76 ({'survived': 76}) | 0 | 0 | 0 | 0 |

not certain after, by outcome and reason:

| phase | outcome | reason | boards |
|---|---|---|---|
| about | survived | the mod does not flag ending the turn as lethal | 76 |
| blast | won | the mod does not flag ending the turn as lethal | 50 |
| blast | died | Ripple Basin (no attack played): its block is not counted here | 1 |
| blast | won | a revive is left (FAIRY_IN_A_BOTTLE) | 1 |
| blast | won | a revive is left (LIZARD_TAIL) | 1 |
| blast | won | Ripple Basin (no attack played): its block is not counted here | 1 |
| blast | died | the enemies may be hit before they act: 惊逃 plays an Attack in hand at a random enemy at the end of the turn | 1 |
| blast | died | the planner sees every line die, but 头槌 draws (unknown cards); not with any draw: a draw may reach the reshuffle (up to  | 1 |

## end_turn boards (the current planner's end_turn and label)

| | boards | certain before | certain after | after: died | after: WRONG (certain, not a death) |
|---|---|---|---|---|---|
| blast | 84 ({'won': 60, 'died': 24}) | 0 | 21 | 21 | 0 |
| about | 82 ({'survived': 82}) | 0 | 0 | 0 | 0 |

not certain after, by outcome and reason:

| phase | outcome | reason | boards |
|---|---|---|---|
| about | survived | the mod does not flag ending the turn as lethal | 82 |
| blast | won | the mod does not flag ending the turn as lethal | 56 |
| blast | won | a revive is left (LIZARD_TAIL) | 2 |
| blast | died | Ripple Basin (no attack played): its block is not counted here | 1 |
| blast | won | a revive is left (FAIRY_IN_A_BOTTLE) | 1 |
| blast | won | Ripple Basin (no attack played): its block is not counted here | 1 |
| blast | died | the enemies may be hit before they act: 惊逃 plays an Attack in hand at a random enemy at the end of the turn | 1 |
| blast | died | the planner sees every line die, but 头槌 draws (unknown cards); not with any draw: a draw may reach the reshuffle (up to  | 1 |

## early reload (the current planner's least-loss card or potion: judgeLeastLossNow)

| | boards | certain before | certain after | after: died | after: WRONG (certain, not a death) |
|---|---|---|---|---|---|
| blast | 66 ({'died': 63, 'won': 3}) | 0 | 20 | 20 | 0 |

not certain after, by outcome and reason:

| phase | outcome | reason | boards |
|---|---|---|---|
| blast | died | not before the line is played: chance in the verdict (坚毅 has a random effect) | 5 |
| blast | died | the planner sees every line die, but 头槌 draws (unknown cards); not with any draw: a draw may reach the reshuffle (up to  | 4 |
| blast | died | the planner sees every line die, but 剑柄打击 draws (unknown cards); not with any draw: 劫掠 acts on draws; a draw may reach t | 3 |
| blast | died | Ripple Basin (no attack played): its block is not counted here | 3 |
| blast | won | Ripple Basin (no attack played): its block is not counted here | 3 |
| blast | died | the planner sees every line die, but 剑柄打击 draws (unknown cards); not with any draw: a draw may reach the reshuffle (up t | 3 |
| blast | died | the planner sees every line die, but 头槌 draws (unknown cards); not with any draw: drawing or changing the draw pile mid- | 3 |
| blast | died | not before the line is played: acting mid-turn without the planner: 百年积木 (relic) | 3 |
| blast | died | the planner sees every line die, but 耸肩无视 draws (unknown cards); not with any draw: a line lives on the superset board ( | 2 |
| blast | died | the planner sees every line die, but 耸肩无视 draws (unknown cards); not with any draw: 跃跃欲试's number is worked out in play; | 2 |
| blast | died | the planner sees every line die, but 头槌 draws (unknown cards); not with any draw: 头槌 touches the draw pile not simulated | 2 |
| blast | died | the enemies may be hit before they act: 惊逃 plays an Attack in hand at a random enemy at the end of the turn | 2 |
| blast | died | the planner sees every line die, but 耸肩无视 draws (unknown cards); not with any draw: 剑柄打击 is enchanted not simulated exac | 1 |
| blast | died | the planner sees every line die, but 耸肩无视 draws (unknown cards); not with any draw: a draw may reach the reshuffle (up t | 1 |
| blast | died | the planner sees every line die, but 剑柄打击 draws (unknown cards); not with any draw: 坚毅 has a random effect not simulated | 1 |
| blast | died | the planner sees every line die, but 耸肩无视+ draws (unknown cards); not with any draw: 坚毅 has a random effect; 扯碎 is encha | 1 |
| blast | died | the planner sees every line die, but 剑柄打击 draws (unknown cards); not with any draw: drawing or changing the draw pile mi | 1 |
| blast | died | the planner sees every line die, but 耸肩无视 draws (unknown cards); not with any draw: 劫难 has a random effect not simulated | 1 |
| blast | died | not before the line is played: chance in the verdict (劫难 has a random effect) | 1 |
| blast | died | the planner sees every line die, but 头槌 draws (unknown cards); not with any draw: a line lives on the superset board (th | 1 |
| blast | died | the planner sees every line die, but 头槌 draws (unknown cards); not with any draw: 燃烧契约 reads or changes the hand; a draw | 1 |
| blast | died | the planner sees every line die, but 战斗专注 draws (unknown cards); not with any draw: drawing or changing the draw pile mi | 1 |
| blast | died | the planner sees every line die, but 弹回 draws (unknown cards); not with any draw: a draw may reach the reshuffle (up to  | 1 |

## Each blast turn that ended in a death

| fight | A | turn | HP | block | blast | certain after | how / why not |
|---|---|---|---|---|---|---|---|
| 1VX145UJM8RZ F17 | 9 | T12 | 18 | 5 | 47 | no | not: the enemies may be hit before they act: 惊逃 plays an Attack in hand at a random enemy at the end of the turn |
| 1ZQJXQ53KSBG F17 | 0 | T16 | 21 | 17 | 54 | yes | end_turn: rules |
| 2WRUNPS2ZSM4 F17 | 8 | T16 | 12 | 33 | 54 | yes | end_turn: rules |
| 2ZCKFSKXTL4E F17 | 9 | T11 | 20 | 13 | 44 | yes | end_turn: least-loss |
| 5NFGDU7BQPD3 F17 | 9 | T10 | 14 | 0 | 41 | no | not: the planner sees every line die, but 头槌 draws (unknown cards); not with any draw: a draw may reach the reshuff |
| 5PHF3ML3XMJN F17 | 8 | T11 | 25 | 0 | 39 | yes | end_turn: least-loss |
| 5SSRC26ZFKWC F17 | 8 | T11 | 19 | 13 | 39 | yes | early at 09:05:00 (before 愤怒+ -> 瀑布巨兽, 打击 -> 瀑布巨兽, 愤怒+ -> 瀑布巨兽, 防御); end_turn: least-loss |
| 6189FSNEN1MZ F17 | 8 | T10 | 26 | 5 | 36 | yes | early at 19:52:02 (before 痛击 -> 瀑布巨兽, 防御); end_turn: rules |
| 7048QYLLYJLS F17 | 8 | T11 | 9 | 23 | 39 | no | not: Ripple Basin (no attack played): its block is not counted here |
| 7MDJ256RY2UU F17 | 9 | T20 | 26 | 12 | 71 | yes | end_turn: rules |
| 9Q7VBZ7TP29K F17 | 9 | T15 | 29 | 21 | 56 | yes | early at 01:39:45 (before 血墙, 防御); end_turn: rules |
| ERPHN3SRCRC3 F17 | 8 | T15 | 25 | 22 | 51 | yes | early at 04:30:49 (before 武装, 坚毅+, 防御); end_turn: rules |
| HFNEL0CRKF96 F17 | 8 | T21 | 9 | 18 | 69 | yes | end_turn: rules |
| J8E47LUXEV0Q F17 | 7 | T12 | 3 | 12 | 42 | yes | end_turn: rules |
| KSPL33MEKV68 F17 | 8 | T11 | 31 | 5 | 39 | yes | early at 09:08:08 (before 防御, 痛击+ -> 瀑布巨兽); end_turn: least-loss |
| N7SAK31B9ZZZ F17 | 8 | T15 | 24 | 18 | 51 | yes | end_turn: least-loss |
| NBCDUAYLWKVK F17 | 8 | T14 | 5 | 13 | 48 | yes | end_turn: rules |
| QLL4VM0WZKW3 F17 | 9 | T13 | 33 | 0 | 50 | yes | early at 07:21:26 (before 打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 痛击+ -> 瀑布巨兽); end_turn: rules |
| UP1CS059LCLT F17 | 8 | T19 | 15 | 0 | 63 | yes | end_turn: rules |
| WCC7RMRLWLZK F17 | 8 | T18 | 6 | 19 | 60 | yes | early at 17:46:02 (before 耸肩无视+, 血墙); end_turn: rules |
| WQTRXBJY0Q1S F17 | 0 | T10 | 21 | 8 | 36 | yes | early at 10:23:13 (before 剑柄打击 -> 瀑布巨兽); end_turn: rules |
| XKKNWSZMMSZN F17 | 7 | T13 | 11 | 16 | 45 | yes | end_turn: rules |
| Y0CWCD0C03FL F17 | 8 | T21 | 2 | 8 | 69 | yes | end_turn: rules |

## Blast turns flagged lethal by the mod that we lived through

| fight | turn | HP | block | blast | outcome | after: verdict at end_turn |
|---|---|---|---|---|---|---|
| LSWUK6D2EV89 F17 | T15 | 21 | 5 | 38 | won | False: a revive is left (FAIRY_IN_A_BOTTLE) |
| MZCG9T5G6TBZ F17 | T8 | 17 | 10 | 30 | won | False: a revive is left (LIZARD_TAIL) |
| 8V0HD9Y207WY F17 | T13 | 30 | 20 | 50 | won | False: Ripple Basin (no attack played): its block is not counted here |
