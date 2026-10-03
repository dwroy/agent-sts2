# SL judge with revives held, and Beating Remnant after a start-of-turn loss (tools/sl-revive-replay.ts)

ops 2026-10-03, ET3V5177HXSY F48 (docs/sl.md §2.7). 27 runs with boards (of the runs that held Fairy in a Bottle, Lizard Tail or Beating Remnant in a fight). Outcome: died = GAME_OVER after the end_turn; survived = the fight's next turn; won_in_enemy_turn = the fight over before it. "Before" = the judge as on v4 02e2ca8 (any revive held vetoes; Beating Remnant refused whenever the turn's start took HP: the `exact_lost` column).

| boards | n | outcomes | certain before | certain after | after: died | after: WRONG |
|---|---|---|---|---|---|---|
| end_turn, a revive held | 765 | {'survived': 754, 'won_in_enemy_turn': 11} | 0 | 0 | 0 | 0 |
| ... the revive fired | 25 (Fairy 17, tail 8) | {'survived': 23, 'won_in_enemy_turn': 2} | 0 | 0 | 0 | 0 |
| end_turn, Beating Remnant + start-of-turn loss | 45 | {'survived': 42, 'won_in_enemy_turn': 1, 'died': 2} | 0 | 2 | 2 | 0 |
| least-loss first card or potion, a revive held | 13 | {'survived': 10, 'won_in_enemy_turn': 3} | 0 | 0 | - | 0 |

Certain after: ET3V5177HXSY F48 T13 (died), 9XZX4ZJ1ZKUA F33 T7 (died).

## The revives played out against the game (the mod's flag forced on, every end_turn board with a revive)

691 boards played out (the rest refused: Tungsten Rod, Beating Remnant, the own count living without any revive); 0 end dead after the revives, 0 of them survived in the game.

Where the revive fired, the HP left against the next turn's first state:

| run | floor | turn | HP + block | revives held | used, back at | HP left (count) | next HP | outcome |
|---|---|---|---|---|---|---|---|---|
| V5S6QVVQYL37 | 17 | 11 | 6 + 7 | LIZARD_TAIL | LIZARD_TAIL 40 | 39 | 39 | survived |
| 2WUMK6PK5QHD | 48 | 7 | 10 + 19 | FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 35 | 30 | 30 | survived |
| 7MDJ256RY2UU | 17 | 16 | 2 + 5 | FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 30 | 30 | 30 | survived |
| V3UPVVLVMEJZ | 33 | 10 | 7 + 0 | FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 24 | 24 | 24 | survived |
| 63WBEEF2JVM5 | 28 | 3 | 6 + 0 | FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 25 | 24 | 24 | survived |
| ET3V5177HXSY | 33 | 5 | 11 + 0 | FAIRY_IN_A_BOTTLE, LIZARD_TAIL | FAIRY_IN_A_BOTTLE 24 | 24 | 24 | survived |
| ET3V5177HXSY | 48 | 9 | 12 + 7 | LIZARD_TAIL | refused: own count survives: 5 HP lost (Beating Remnant: at most 20 lost this t | - | 37 | survived |
| 3MDJW1UAD5M6 | 31 | 6 | 6 + 9 | FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 24 | 23 | 6 | survived |
| PU21Z67J65NE | 33 | 11 | 18 + 8 | LIZARD_TAIL | LIZARD_TAIL 44 | 44 | 44 | survived |
| G1Z0X3WBH4XQ | 48 | 7 | 15 + 5 | FAIRY_IN_A_BOTTLE | refused: a revive is left (FAIRY_IN_A_BOTTLE): Tungsten Rod's cut with a revive | - | 29 | survived |
| MZCG9T5G6TBZ | 17 | 8 | 17 + 10 | LIZARD_TAIL | LIZARD_TAIL 40 | 40 | 46 | won_in_enemy_turn |
| YQL8D59999AX | 31 | 4 | 10 + 10 | FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 26 | 11 | 11 | survived |
| VTREB5A9XWS7 | 23 | 2 | 17 + 6 | FAIRY_IN_A_BOTTLE, LIZARD_TAIL | FAIRY_IN_A_BOTTLE 24 | 24 | 24 | survived |
| VTREB5A9XWS7 | 23 | 4 | 19 + 0 | LIZARD_TAIL | LIZARD_TAIL 40 | 40 | 40 | survived |
| Y8E0KK4L7JBL | 48 | 3 | 14 + 0 | LIZARD_TAIL | LIZARD_TAIL 40 | 28 | 28 | survived |
| L3G50U6KX5ST | 33 | 6 | 21 + 0 | FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 24 | 24 | 24 | survived |
| 0NG27W8QBNYX | 24 | 2 | 17 + 0 | LIZARD_TAIL | LIZARD_TAIL 35 | 35 | 35 | survived |
| JR66CJ9T8H7W | 48 | 8 | 2 + 0 | FAIRY_IN_A_BOTTLE, FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 31, FAIRY_IN_A_BOTTLE 31 | 30 | 12 | survived |
| JR66CJ9T8H7W | 48 | 8 | 2 + 0 | FAIRY_IN_A_BOTTLE, FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 31 | 12 | 12 | survived |
| LSWUK6D2EV89 | 17 | 15 | 21 + 5 | FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 24 | 24 | 30 | won_in_enemy_turn |
| 2XWM27TZ7T12 | 37 | 4 | 24 + 5 | FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 24 | 24 | 24 | survived |
| HME0FA7VA0J6 | 33 | 6 | 4 + 0 | FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 24 | 18 | 18 | survived |
| LTKW24N3R9PG | 37 | 4 | 7 + 5 | LIZARD_TAIL | LIZARD_TAIL 37 | 37 | 37 | survived |
| BVJT7HFW6X2S | 31 | 4 | 12 + 0 | FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 24 | 24 | 24 | survived |
| RJZGFGNYK56W | 31 | 7 | 19 + 0 | FAIRY_IN_A_BOTTLE | FAIRY_IN_A_BOTTLE 24 | 4 | 4 | survived |

The count never left less than the game did (the direction a revive verdict of death needs). Higher: won in the enemy turn (Burning Blood +6 after it), JR66 F48 T8's first end_turn (pending; the turn ended on the second, which matches), 3MDJW1UAD5M6 F31 T6 (23 counted, 6 in the game: the Myte's bite looks to have landed twice; not explained).

## Reasons, the mod flagging the end of the turn lethal with a revive held

| run | floor | turn | outcome | next HP | reason after |
|---|---|---|---|---|---|
| V5S6QVVQYL37 | 17 | 11 | survived | 39 | a revive is left (LIZARD_TAIL): back at 40 HP, the rest of the turn leaves 39 |
| 2WUMK6PK5QHD | 48 | 7 | survived | 30 | a revive is left (FAIRY_IN_A_BOTTLE): back at 35 HP, the rest of the turn leaves 30 |
| 7MDJ256RY2UU | 17 | 16 | survived | 30 | a revive is left (FAIRY_IN_A_BOTTLE): back at 30 HP, the rest of the turn leaves 30 |
| V3UPVVLVMEJZ | 33 | 10 | survived | 24 | a revive is left (FAIRY_IN_A_BOTTLE): back at 24 HP, the rest of the turn leaves 24 |
| 63WBEEF2JVM5 | 28 | 3 | survived | 24 | a revive is left (FAIRY_IN_A_BOTTLE): back at 25 HP, the rest of the turn leaves 24 |
| ET3V5177HXSY | 33 | 5 | survived | 24 | a revive is left (FAIRY_IN_A_BOTTLE, LIZARD_TAIL): FAIRY_IN_A_BOTTLE back at 24 HP, the rest of the turn leaves 24 |
| ET3V5177HXSY | 48 | 8 | survived | 12 | own count survives: 20 HP lost (Beating Remnant: at most 20 lost this turn, at most 1 lost so far (the turn's start took HP)) - 0 Regen < 32 HP |
| 3MDJW1UAD5M6 | 31 | 6 | survived | 6 | a revive is left (FAIRY_IN_A_BOTTLE): back at 24 HP, the rest of the turn leaves 23 |
| PU21Z67J65NE | 33 | 11 | survived | 44 | a revive is left (LIZARD_TAIL): back at 44 HP, the rest of the turn leaves 44 |
| G1Z0X3WBH4XQ | 48 | 7 | survived | 29 | a revive is left (FAIRY_IN_A_BOTTLE): Tungsten Rod's cut with a revive in the turn is not judged |
| MZCG9T5G6TBZ | 17 | 8 | won_in_enemy_turn | 46 | a revive is left (LIZARD_TAIL): back at 40 HP, the rest of the turn leaves 40 |
| YQL8D59999AX | 31 | 4 | survived | 11 | a revive is left (FAIRY_IN_A_BOTTLE): back at 26 HP, the rest of the turn leaves 11 |
| VTREB5A9XWS7 | 23 | 2 | survived | 24 | a revive is left (FAIRY_IN_A_BOTTLE, LIZARD_TAIL): FAIRY_IN_A_BOTTLE back at 24 HP, the rest of the turn leaves 24 |
| VTREB5A9XWS7 | 23 | 4 | survived | 40 | a revive is left (LIZARD_TAIL): back at 40 HP, the rest of the turn leaves 40 |
| Y8E0KK4L7JBL | 48 | 3 | survived | 28 | a revive is left (LIZARD_TAIL): back at 40 HP, the rest of the turn leaves 28 |
| L3G50U6KX5ST | 33 | 6 | survived | 24 | a revive is left (FAIRY_IN_A_BOTTLE): back at 24 HP, the rest of the turn leaves 24 |
| 0NG27W8QBNYX | 24 | 2 | survived | 35 | a revive is left (LIZARD_TAIL): back at 35 HP, the rest of the turn leaves 35 |
| JR66CJ9T8H7W | 48 | 8 | survived | 12 | a revive is left (FAIRY_IN_A_BOTTLE, FAIRY_IN_A_BOTTLE): FAIRY_IN_A_BOTTLE back at 31, then FAIRY_IN_A_BOTTLE back at 31 HP, the rest of the turn leaves 30 |
| JR66CJ9T8H7W | 48 | 8 | survived | 12 | a revive is left (FAIRY_IN_A_BOTTLE, FAIRY_IN_A_BOTTLE): FAIRY_IN_A_BOTTLE back at 31 HP, the rest of the turn leaves 12 |
| LSWUK6D2EV89 | 17 | 15 | won_in_enemy_turn | 30 | a revive is left (FAIRY_IN_A_BOTTLE): back at 24 HP, the rest of the turn leaves 24 |
| 2XWM27TZ7T12 | 37 | 4 | survived | 24 | a revive is left (FAIRY_IN_A_BOTTLE): back at 24 HP, the rest of the turn leaves 24 |
| HME0FA7VA0J6 | 33 | 6 | survived | 18 | a revive is left (FAIRY_IN_A_BOTTLE): back at 24 HP, the rest of the turn leaves 18 |
| LTKW24N3R9PG | 37 | 4 | survived | 37 | a revive is left (LIZARD_TAIL): back at 37 HP, the rest of the turn leaves 37 |
| BVJT7HFW6X2S | 31 | 4 | survived | 24 | a revive is left (FAIRY_IN_A_BOTTLE): back at 24 HP, the rest of the turn leaves 24 |
| RJZGFGNYK56W | 31 | 7 | survived | 4 | a revive is left (FAIRY_IN_A_BOTTLE): back at 24 HP, the rest of the turn leaves 4 |

## The Lizard Tail tracker (tools/lizard-tail-replay.ts on this code)

--mode tail (the 8 runs that held it; "old" is the 70cee12 tracker the tool carries, "new" this one):

```
V5S6QVVQYL37: old F17 T12 2026-09-24T04:37:11.232000 | new F17 T12 2026-09-24T04:37:11.232000 (HP rose 6 -> 39 after a lethal read)
0NG27W8QBNYX: old F24 T3 2026-09-24T10:44:13.591000 | new F24 T3 2026-09-24T10:44:13.591000 (HP rose 17 -> 35 after a lethal read)
PU21Z67J65NE: old F33 T12 2026-09-24T22:02:15.867000 | new F33 T12 2026-09-24T22:02:15.867000 (HP rose 18 -> 44 after a lethal read)
MZCG9T5G6TBZ: old - | new F17 T8 2026-09-27T22:35:34.080000 (the fight was won in the enemy turn after a lethal read: HP rose 17 -> 40 after a lethal read (less 6 healed at the fight's end))
VTREB5A9XWS7: old F23 T5 2026-09-29T12:17:10.943000 | new F23 T5 2026-09-29T12:17:10.943000 (HP rose 19 -> 40 after a lethal read)
LTKW24N3R9PG: old F37 T5 2026-10-02T10:36:42.208000 | new F37 T5 2026-10-02T10:36:42.208000 (HP rose 7 -> 37 after a lethal read)
Y8E0KK4L7JBL: old - | new F48 T4 2026-10-03T03:55:33.092000 (HP rose 14 -> 28 after a lethal read)
ET3V5177HXSY: old - | new F48 T10 2026-10-03T16:17:45.582000 (HP rose 12 -> 37 after a lethal read)
{"runs":8,"frames":2932,"oldUsed":5,"newUsed":8,"disagree":160,"slChanged":2,"planChanged":0}
```

Before this change the current tracker read 7 of the 8 (ET3V5177HXSY: "new -"; the intents alone at F48 T9 read not lethal).

--mode pretend (the runs that never held it, the tail put in every state's relics; any "used" is a false positive):

```
{"runs":233,"frames":69569,"oldUsed":0,"newUsed":0,"disagree":0,"slChanged":0,"planChanged":0}
{"runs":232,"frames":69715,"oldUsed":0,"newUsed":0,"disagree":0,"slChanged":0,"planChanged":0}
```

465 runs, 139,284 frames: 0 false positives.
