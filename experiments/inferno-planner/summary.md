# Inferno's start-of-turn loss per copy on the planner: replay (tools/inferno-planner-replay.ts)

v4 02e2ca8 (base) against v4-inferno-planner, each run on the same 2501 logged planning decisions (the rollout and the random
potions' Monte Carlo on a frozen clock: the full 5 turns x 8 samples; B2 off): every planning decision of the 116 fights with
two or more Infernos in the deck or INFERNO_POWER at 12 or more on some frame, each turn's first planning decision of 150
fights with one Inferno and 50 A8+ fights with none. The full comparison, with every board whose played line or shown lines
changed: compare.md. Raw rows: raw/ (not committed). Errors: 0 on both sides.

| board (Infernos up + in hand / draw / discard) | boards | byte-identical | decision changed | code's own play changed | lines shown changed | same lines, hp_lost changed | rollout best changed |
|---|---|---|---|---|---|---|---|
| no Inferno | 212 | 212 | 0 | 0 | 0 | 0 | 0 |
| 0 up, 1 in hand / piles | 461 | 461 | 0 | 0 | 0 | 0 | 0 |
| 1 up, none other | 229 | 229 | 0 | 0 | 0 | 0 | 0 |
| one or none, a potion that may add a copy (Power Potion, Duplicator) | 72 | 61 | 11 | 0 | 0 | 3 | 0 |
| 0 up, 2+ in hand / piles | 696 | 300 | 396 | 0 | 12 | 12 | 22 |
| 1 up + more in hand / piles | 490 | 267 | 223 | 2 | 42 | 34 | 40 |
| 2+ up | 341 | 58 | 283 | 2 | 3 | 130 | 13 |

- One Inferno or none and nothing that adds a copy: 902 of 902 byte-identical (the question, Jev's view, every answer's
  resolution, or code's own act).
- The 11 that moved with one or none all hold a copy source: a Power Potion (its random Power may be Inferno: EHJZSGVU0VQ9
  F11 T3, one up, the Monte Carlo's lasting value 4.8 -> 4.7) or a Duplicator (PCGH29GVGSCE F17 T2: Inferno played twice is two
  copies, hp -1 -> -2).

Two or more up, by the attempt's outcome (the rollout's deaths of its samples; the solver's lines that die this turn, the next
turn's start loss included):

| outcome | boards | rollout deaths before | after | dying lines before | after | decision changed |
|---|---|---|---|---|---|---|
| died at the next turn (its start or later in it) | 3 | 96 / 128 | 75 / 96 | 189 / 322 | 191 / 322 | 3 |
| died later in the fight | 10 | 16 / 16 | 16 / 16 | 159 / 162 | 159 / 162 | 10 |
| reloaded (SL) | 101 | 1070 / 1072 | 1016 / 1016 | 561 / 903 | 567 / 903 | 87 |
| won | 227 | 339 / 5312 | 440 / 5296 | 431 / 7448 | 462 / 7452 | 183 |

- C4F14F3XPN0N F33 attempt 5 T6 (15 HP, two Inferno+, the Slap 21): before, Jev was asked between Breakthrough, Defend,
  Pillage+ (hp -14, the rollout's best, the line played: 2 HP after the enemy turn, T7's start took them) and Defend, Pillage+;
  now the first dies (hp -15), dying lines 4/8 -> 6/8, and code plays Defend, Pillage+ (hp -14: 1 HP past T7's start).
  Attempts 1 and 2 T6 (17 HP): dying lines 2/8 -> 4/8; attempt 3 T6 (11 HP): 11/14 -> 13/14, code plays Defend, Shrug It Off.
- JGJS7QE62GLD F24 T2 (16 HP, one up and the second in the hand, every line dying): least-loss played the second Inferno;
  now it ends the turn (the Inferno line costs 1 more).
- A8ENYFR4ZWKG F33 T6 (34 HP, two up, won): rollout deaths 16/48 -> 27/48, its best Defend, Uppercut+, Strike -> Blood
  Wall+, Uppercut+. FH3MZ3G0HECD F30 T2 (8 HP, Inferno 15, died at T3): 64/96 -> 75/96, its best Colossus, Shrug It Off ->
  Defend, Colossus, Pommel Strike.
- The boards already lost (reloaded, died later) had the rollout dying in nearly every sample before; they still do.
