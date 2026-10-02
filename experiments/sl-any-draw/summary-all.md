# SL_JUDGE_ANY_DRAW offline evaluation

1674 least-loss decisions on flagged boards, errors 0

## end_turn boards (logged end_turn, planned end_turn: the live end_turn judgment)

- vetoed by unknown draws (switch off): 9 boards in 9 turns; outcomes {'died': 9}
- certain with the switch on: 7 boards in 7 turns; outcomes {'died': 7}
- how: {"the drawing card's own cost": 4, 'nothing to draw (No Draw)': 2, 'superset board (no line past the draw)': 1}
- WRONG (certain, not a death): 0

still not certain:

| why | boards |
|---|---|
| not exact, and a line lives past the draw | 1 |
| a relic or power draws or changes the pile mid-turn | 1 |

certain boards:

| fight | attempt | turn | logged | how | superset cards | positions | bound ms | outcome |
|---|---|---|---|---|---|---|---|---|
| TXLHYU13L102 F33 A2 | 1 | T5 | end_turn | the drawing card's own cost |  |  | 0 | died |
| W5PTC48C3B1H F33 A8 | 1 | T9 | end_turn | nothing to draw (No Draw) |  |  | 0 | died |
| R764HJWMJQ3V F33 A9 | 1 | T10 | end_turn | the drawing card's own cost |  |  | 0 | died |
| WM2XPDZ02BNF F27 A7 | 1 | T10 | end_turn | nothing to draw (No Draw) |  |  | 0 | died |
| SCBC3F0QT8BC F21 A8 | 1 | T5 | end_turn | the drawing card's own cost |  |  | 1 | died |
| X4QRH94TSFG2 F23 A8 | 1 | T4 | end_turn | superset board (no line past the draw) | 7 | 2 | 0 | died |
| V1MF91VL7A2G F33 A8 | 1 | T6 | end_turn | the drawing card's own cost |  |  | 0 | died |

## early reload (least-loss card or potion boards: judgeLeastLossNow)

- vetoed by unknown draws (switch off): 433 boards in 235 turns; outcomes {'survived': 37, 'died': 380, 'won': 16}
- certain with the switch on: 9 boards in 8 turns; outcomes {'died': 9}
- how: {'superset board (exact)': 7, "the drawing card's own cost": 1, 'nothing to draw (Fiddle)': 1}
- WRONG (certain, not a death): 0

still not certain:

| why | boards |
|---|---|
| a line lives on the superset board (a draw may save us) | 146 |
| not exact, and a line lives past the draw | 105 |
| a relic or power draws or changes the pile mid-turn | 73 |
| No Draw, but a card takes from a pile | 24 |
| a random potion | 17 |
| Dark Embrace | 15 |
| not before the line is played: cards were added to the draw pile at ra | 8 |
| not before the line is played: acting mid-turn without the planner: 遗忘 | 7 |
| Tungsten Rod | 5 |
| a status in the pile with Feel No Pain / Cloak Clasp | 5 |
| not before the line is played: acting mid-turn without the planner: 百年 | 4 |
| not before the line is played: chance in the verdict (a line draws car | 3 |
| not before the line is played: acting mid-turn without the planner: 风的 | 3 |
| not before the line is played: acting mid-turn without the planner: 地精 | 3 |
| not before the line is played: chance in the verdict (神化 is not modell | 2 |
| the superset search was cut short | 1 |
| not before the line is played: acting mid-turn without the planner: 不安 | 1 |
| not before the line is played: acting mid-turn without the planner: 开信 | 1 |
| not before the line is played: acting mid-turn without the planner: 精致 | 1 |

certain boards:

| fight | attempt | turn | logged | how | superset cards | positions | bound ms | outcome |
|---|---|---|---|---|---|---|---|---|
| G7EJ07RPR1NX F17 A0 | 1 | T10 | play_card | superset board (exact) | 3 | 14 | 1 | died |
| 24UZ3PZNLKTQ F17 A8 | 1 | T12 | play_card | superset board (exact) | 5 | 31 | 1 | died |
| 24UZ3PZNLKTQ F17 A8 | 1 | T12 | play_card | superset board (exact) | 4 | 13 | 1 | died |
| WFR4AUP2CWDT F17 A0 | 1 | T7 | play_card | superset board (exact) | 1 | 5 | 1 | died |
| TXLHYU13L102 F33 A2 | 1 | T5 | play_card | the drawing card's own cost |  |  | 5 | died |
| GMT2Q5L6BVL0 F39 A5 | 1 | T3 | play_card | nothing to draw (Fiddle) |  |  | 0 | died |
| ZZA7PCSRYTNM F17 A0 | 1 | T7 | play_card | superset board (exact) | 1 | 83 | 4 | died |
| GZ24W7LC496Q F17 A8 | 1 | T15 | play_card | superset board (exact) | 2 | 25 | 4 | died |
| 6FUF0MPRB8BT F17 A8 | 1 | T9 | play_card | superset board (exact) | 1 | 47 | 2 | died |

## bound time

- every bound worked out: 445, median 1 ms, p90 13 ms, max 2043 ms
- superset solves: 339, median 2 ms, p90 17 ms, max 2043 ms; cut short by time 2, by nodes 0
