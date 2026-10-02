# SL_JUDGE_ANY_DRAW offline evaluation

984 least-loss decisions on flagged boards, errors 0

## end_turn boards (logged end_turn, planned end_turn: the live end_turn judgment)

- vetoed by unknown draws (switch off): 4 boards in 4 turns; outcomes {'died': 4}
- certain with the switch on: 3 boards in 3 turns; outcomes {'died': 3}
- how: {'nothing to draw (No Draw)': 1, "the drawing card's own cost": 2}
- WRONG (certain, not a death): 0

still not certain:

| why | boards |
|---|---|
| a relic or power draws or changes the pile mid-turn | 1 |

certain boards:

| fight | attempt | turn | logged | how | superset cards | positions | bound ms | outcome |
|---|---|---|---|---|---|---|---|---|
| W5PTC48C3B1H F33 A8 | 1 | T9 | end_turn | nothing to draw (No Draw) |  |  | 0 | died |
| R764HJWMJQ3V F33 A9 | 1 | T10 | end_turn | the drawing card's own cost |  |  | 0 | died |
| V1MF91VL7A2G F33 A8 | 1 | T6 | end_turn | the drawing card's own cost |  |  | 0 | died |

## early reload (least-loss card or potion boards: judgeLeastLossNow)

- vetoed by unknown draws (switch off): 227 boards in 125 turns; outcomes {'survived': 14, 'died': 207, 'won': 6}
- certain with the switch on: 4 boards in 3 turns; outcomes {'died': 4}
- how: {'superset board (exact)': 4}
- WRONG (certain, not a death): 0

still not certain:

| why | boards |
|---|---|
| a line lives on the superset board (a draw may save us) | 65 |
| a relic or power draws or changes the pile mid-turn | 50 |
| not exact, and a line lives past the draw | 49 |
| No Draw, but a card takes from a pile | 22 |
| Dark Embrace | 7 |
| not before the line is played: acting mid-turn without the planner: 遗忘 | 7 |
| a random potion | 6 |
| not before the line is played: cards were added to the draw pile at ra | 5 |
| a status in the pile with Feel No Pain / Cloak Clasp | 3 |
| not before the line is played: acting mid-turn without the planner: 风的 | 3 |
| not before the line is played: acting mid-turn without the planner: 地精 | 3 |
| the superset search was cut short | 1 |
| Tungsten Rod | 1 |
| not before the line is played: acting mid-turn without the planner: 精致 | 1 |

certain boards:

| fight | attempt | turn | logged | how | superset cards | positions | bound ms | outcome |
|---|---|---|---|---|---|---|---|---|
| 24UZ3PZNLKTQ F17 A8 | 1 | T12 | play_card | superset board (exact) | 5 | 31 | 1 | died |
| 24UZ3PZNLKTQ F17 A8 | 1 | T12 | play_card | superset board (exact) | 4 | 13 | 1 | died |
| GZ24W7LC496Q F17 A8 | 1 | T15 | play_card | superset board (exact) | 2 | 25 | 4 | died |
| 6FUF0MPRB8BT F17 A8 | 1 | T9 | play_card | superset board (exact) | 1 | 47 | 2 | died |

## bound time

- every bound worked out: 234, median 1 ms, p90 21 ms, max 2043 ms
- superset solves: 173, median 2 ms, p90 35 ms, max 2043 ms; cut short by time 2, by nodes 0
