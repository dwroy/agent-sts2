# SL judge bounds: replay before / after (2026-10-04, v4-judge-bounds)

Every logged end_turn board (logs/states.jsonl through the log DB to 2026-10-03 17:43 UTC: 476 runs, 26,851 end_turn
boards, the 85 that SL reloaded instead of sending among them), judged by the v4 judge (cbf6895, `--base`) and by this
branch's, in one process: `tools/sl-judge-bounds-replay.ts --base src/sl/judge-base.ts --replan` (4 shards), then
`python3 tools/sl-judge-bounds-summary.py experiments/sl-judge-bounds`. The least-loss boards were planned again for the
planner's facts (the any-draw bound, as live). `live`: the logged label; `open`: the least-loss label with every draw
taken as known (the tier forced open), so an `open` certain on a board we lived through is a wrong verdict whatever the
label. Outcome: died (GAME_OVER after it, the next turn's start included), survived (an action completed on a later
turn), won_in_enemy_turn, sl_reloaded (not sent: the judge was certain then), reloaded / unknown. Rows written: the
boards where the mod flags it, our own count dies on either code, a verdict is certain, or the turn ended in a death.

Both sides use this branch's controller (turnStartLoss): YNMB8X87UEH1 F17 T9 (A8 boss, Bread with Beating Remnant), "own
count not exact" with the v4 controller, is certain on both here; it adds one more death to the 15 below.

Rerun 2026-10-04 after the Disintegration follow-up (its end-of-turn damage counted with the held cards'): against v4
5d42d6d (this branch's first two commits) it makes 2 more deaths certain, 79YRPJ8TCCZ5 F33 T6 (A8) and JRSF34UJJND4 F33
T5; 377JPY9LPG1L F33 T7 now stops at "the enemies may be hit before they act" (Howl from Beyond and Thorns may kill the
demon after 2 of its 3 hits); no wrong verdict.

## Summary output

```
601 boards written; outcomes {'survived': 67, 'unknown': 3, 'died': 438, 'won_in_enemy_turn': 6, 'sl_reloaded': 85, 'reloaded': 2}

## before: reasons (open: the tier forced open) on the 600 lethal boards (flag or own count dies) / on the deaths
  certain                                          lethal   507  died  418  lived     1  sl_reloaded  85
  not flagged                                      lethal     5  died    6  lived     0  sl_reloaded   0
  end hits: an enemy may die first (computed)      lethal     7  died    2  lived     5  sl_reloaded   0
  Ripple Basin (refused)                           lethal     6  died    2  lived     4  sl_reloaded   0
  end hits: Stampede                               lethal     2  died    2  lived     0  sl_reloaded   0
  held: acting by chance                           lethal     2  died    2  lived     0  sl_reloaded   0
  end hits: held card acts on enemies              lethal     2  died    2  lived     0  sl_reloaded   0
  end hits: Ethereal exhaust relic                 lethal     2  died    2  lived     0  sl_reloaded   0
  held: on-HP-loss power                           lethal     1  died    1  lived     0  sl_reloaded   0
  start: power hits on the opening                 lethal     1  died    1  lived     0  sl_reloaded   0
  own count survives                               lethal    41  died    0  lived    39  sl_reloaded   0
  revive: saves us                                 lethal    23  died    0  lived    23  sl_reloaded   0
  revive: Tungsten Rod                             lethal     1  died    0  lived     1  sl_reloaded   0
  live verdict on the deaths: {'certain': 393, 'tier: cards or potions left': 19, 'least-loss: draws (any-draw refused)': 6, 'not flagged': 6, 'end hits: Stampede': 2, 'held: acting by chance': 2, 'end hits: an enemy may die first (computed)': 2, 'Ripple Basin (refused)': 2, 'end hits: held card acts on enemies': 2, 'end hits: Ethereal exhaust relic': 2, 'held: on-HP-loss power': 1, 'start: power hits on the opening': 1}

## after: reasons (open: the tier forced open) on the 600 lethal boards (flag or own count dies) / on the deaths
  certain                                          lethal   524  died  436  lived     0  sl_reloaded  85
  end hits: an enemy may die first (computed)      lethal     5  died    1  lived     4  sl_reloaded   0
  not flagged                                      lethal     0  died    1  lived     0  sl_reloaded   0
  own count survives                               lethal    45  died    0  lived    43  sl_reloaded   0
  revive: saves us                                 lethal    24  died    0  lived    24  sl_reloaded   0
  end hits: an ally's death may change the others' moves lethal     2  died    0  lived     2  sl_reloaded   0
  live verdict on the deaths: {'certain': 408, 'tier: cards or potions left': 21, 'least-loss: draws (any-draw refused)': 7, 'not flagged': 1, 'end hits: an enemy may die first (computed)': 1}

## changes (before -> after)
  live:
    not flagged                                      -> certain                        died               3
    end hits: Stampede                               -> certain                        died               2
    held: acting by chance                           -> certain                        died               2
    end hits: an enemy may die first (computed)      -> certain                        died               2
    Ripple Basin (refused)                           -> certain                        died               2
    end hits: held card acts on enemies              -> certain                        died               2
    certain                                          -> end hits: an ally's death may change the others' moves survived           1
    end hits: Ethereal exhaust relic                 -> certain                        died               1
    held: on-HP-loss power                           -> certain                        died               1
  open:
    not flagged                                      -> certain                        died               4
    end hits: Stampede                               -> certain                        died               2
    held: acting by chance                           -> certain                        died               2
    end hits: an enemy may die first (computed)      -> certain                        died               2
    Ripple Basin (refused)                           -> certain                        died               2
    end hits: held card acts on enemies              -> certain                        died               2
    end hits: Ethereal exhaust relic                 -> certain                        died               2
    certain                                          -> end hits: an ally's death may change the others' moves survived           1
    held: on-HP-loss power                           -> certain                        died               1
    start: power hits on the opening                 -> certain                        died               1

  deaths that become certain (live), by the reason before: {'not flagged': 3, 'end hits: Stampede': 2, 'held: acting by chance': 2, 'end hits: an enemy may die first (computed)': 2, 'Ripple Basin (refused)': 2, 'end hits: held card acts on enemies': 2, 'end hits: Ethereal exhaust relic': 1, 'held: on-HP-loss power': 1} = 15
  deaths whose open reason moved:
    not flagged                                      -> certain                                  4
    end hits: Stampede                               -> certain                                  2
    held: acting by chance                           -> certain                                  2
    end hits: an enemy may die first (computed)      -> certain                                  2
    Ripple Basin (refused)                           -> certain                                  2
    end hits: held card acts on enemies              -> certain                                  2
    end hits: Ethereal exhaust relic                 -> certain                                  2
    not flagged                                      -> end hits: an enemy may die first (computed) 1
    held: on-HP-loss power                           -> certain                                  1
    start: power hits on the opening                 -> certain                                  1

## before: wrong verdicts (certain, open or live, on a board we lived through): 1
  D4JGCNEL40VL F33 T5 combat/end_turn hp 7 block 11 -> survived 1: live True | nothing left to play or drink; 21 incoming vs 7 HP + 11 block + 3 end-of-turn block; even if 火箭 (彼岸咆哮+ (plays itself from the exhaust pile)) may die first

## after: wrong verdicts (certain, open or live, on a board we lived through): 0
```

## Presence on the lethal boards (whether the relic / power is there, not only as the first veto)

```
601 rows, 600 lethal, deaths 438
  Ripple Basin, no Attack played       lethal    6  died   2  lived   4
  Buffer                               lethal    0  died   0  lived   0
  Intangible                           lethal    0  died   0  lived   0
  Tungsten Rod                         lethal    7  died   4  lived   3
  Tungsten Rod + a revive              lethal    1  died   0  lived   1
  Beating Remnant                      lethal   17  died   9  lived   5
  Beating Remnant + a revive           lethal    1  died   0  lived   1
  Stampede (power)                     lethal    2  died   2  lived   0
  Juggernaut                           lethal   22  died  11  lived   1
  Inferno                              lethal  103  died  73  lived   8
  Parrying Shield                      lethal   25  died  18  lived   1
  Forgotten Soul                       lethal   18  died  11  lived   1
  Charon's Ashes                       lethal    0  died   0  lived   0
  Screaming Flagon                     lethal    0  died   0  lived   0
  Stone Calendar                       lethal   17  died   9  lived   3
  Mummified Hand                       lethal   16  died  11  lived   5
  Hellraiser                           lethal   12  died   8  lived   1
  History Course                       lethal    0  died   0  lived   0
  Mr Struggles                         lethal   21  died  14  lived   3
  Insatiable's Sandpit                 lethal   47  died  33  lived   3
  Sandpit + a revive                   lethal    0  died   0  lived   0
  a revive held                        lethal   25  died   0  lived  25
  Surrounded (Kaiser Crab)             lethal   87  died  54  lived   8
  special phase (1M HP / DeathBlow)    lethal   26  died  23  lived   3
  Bread                                lethal    2  died   2  lived   0
```
