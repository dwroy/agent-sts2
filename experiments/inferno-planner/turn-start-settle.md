# Turn-start settle: the loop's first action of a turn, on the logged frames (tools/turn-start-settle.py)

25327 turn starts (T2+, the first combat decision of each turn and SL attempt), 2026-09-24 to 2026-10-03. early = the board moved after the frame the loop acted on (draw / hp / sel, see the tool's doc); caught = the re-read before dispatch saw it move and the turn was planned again; judged = the next frame is in the same turn and the action a card or a potion.

The mod's readiness on the frames the loop acted on (can_use_combat_actions, actions_settled, snapshot_stable, running_action_type): (True, True, True, None): 25327.

| powers up | period | turn starts | judged | early | draw | hp | sel | caught | early: deciding ms (max) |
|---|---|---|---|---|---|---|---|---|---|
| Hellraiser | to 09-27 | 93 | 78 | 3 | 2 | 0 | 1 | 0 | - |
| Hellraiser | 09-28 on | 88 | 77 | 2 | 2 | 0 | 1 | 1 | 2 |
| Hellraiser+Inferno | to 09-27 | 8 | 8 | 1 | 1 | 1 | 0 | 0 | - |
| Hellraiser+Inferno | 09-28 on | 6 | 5 | 1 | 1 | 1 | 1 | 0 | 3 |
| Inferno | to 09-27 | 945 | 857 | 51 | 0 | 17 | 34 | 0 | - |
| Inferno | 09-28 on | 1048 | 964 | 4 | 0 | 4 | 0 | 6 | 2 |
| neither | to 09-27 | 11875 | 10941 | 149 | 137 | 0 | 20 | 0 | - |
| neither | 09-28 on | 11264 | 10468 | 5 | 4 | 0 | 1 | 18 | 2 |

Inferno or Hellraiser up: 2188 turn starts; with the read time logged 982. Early among them: 5, deciding times [1, 2, 2, 2, 3] ms. Early with the deciding time at 500 ms or more: 0; turn starts decided in 500 ms or more: 564.

## The settle's cost (from the read: INFERNO_POWER 500 ms, HELLRAISER_POWER 1000 ms; the turn's first combat action)

- turn starts that would wait: 448 of 982 (46%); the others were decided in their settle time or more
- the wait: mean 0.23 s over every turn start holding them, 0.51 s over those that wait (median 0.50 s, p90 0.50 s); total 227 s over 338 fights (0.7 s a fight)
- by wait (ms): 0: 534, 1-100: 21, 101-300: 13, 301-500: 374, 501-1000: 40
- INFERNO_POWER up: 910 turn starts, 383 wait, mean 0.20 s a turn start
- HELLRAISER_POWER up: 78 turn starts, 70 wait, mean 0.63 s a turn start
- by the decision's label: combat/plan-choice 510 (mean 0.02 s); combat/lethal 241 (mean 0.51 s); combat/plan 116 (mean 0.59 s); combat/plan-choice+potion 71 (mean 0.01 s); combat/least-loss 40 (mean 0.54 s); combat/end_turn 2 (mean 0.75 s); combat/phase-setup 1 (mean 0.50 s); combat/plan-choice+potion-lethal 1 (mean 0.00 s)
- turn starts with neither power: 9293 with the read time logged, not held (0 s)

## The early turn starts (Inferno or Hellraiser up)

deciding ms: the read to the re-read before dispatch (ts - observed_ts); "≥ N" where the read time is not logged (the planning, Jev and DeepSeek latencies).

| run | floor | turn | ts | powers | first action (label) | result | deciding ms | moved after | HP | hand | draw pile |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0NG27W8QBNYX | 9 | 3 | 2026-09-24T10:28:25 | HELLRAISER_POWER | play_card UNRELENTING (combat/plan) | completed: Action completed. | ≥ 0 | draw | 61 -> 61 | 1 -> 2 | 5 -> 3 |
| 0NG27W8QBNYX | 23 | 4 | 2026-09-24T10:42:58 | HELLRAISER_POWER | play_card FLAME_BARRIER (combat/plan) | completed: Action completed. | ≥ 0 | draw | 23 -> 23 | 4 -> 4 | 1 -> 0 |
| VC4LRL945UEF | 17 | 4 | 2026-09-25T10:15:16 | HELLRAISER_POWER, INFERNO_POWER | play_card SPITE (combat/plan-choice+potion) | completed: Action completed. | ≥ 646 | draw+hp | 75 -> 74 | 3 -> 3 | 18 -> 17 |
| 7DXAW0ZBDFHP | 29 | 5 | 2026-09-25T14:39:06 | INFERNO_POWER | play_card TEAR_ASUNDER (combat/lethal) | pending (unstable): Action queued but st | ≥ 0 | sel | 13 -> 13 | 5 -> 5 | 7 -> 7 |
| QBRNKXZR2A4P | 48 | 5 | 2026-09-25T15:47:40 | INFERNO_POWER | play_card DEFEND_IRONCLAD (combat/plan) | completed: Action completed. | ≥ 0 | hp | 70 -> 69 | 5 -> 4 | 3 -> 3 |
| QBRNKXZR2A4P | 48 | 6 | 2026-09-25T15:47:58 | INFERNO_POWER | play_card STRIKE_IRONCLAD (combat/plan) | completed: Action completed. | ≥ 0 | hp | 54 -> 53 | 5 -> 4 | 30 -> 30 |
| QBRNKXZR2A4P | 48 | 8 | 2026-09-25T15:48:20 | INFERNO_POWER | play_card TAUNT (combat/least-loss) | completed: Action completed. | ≥ 0 | hp | 19 -> 18 | 5 -> 5 | 18 -> 18 |
| JR66CJ9T8H7W | 28 | 6 | 2026-09-25T16:10:52 | INFERNO_POWER | play_card STRIKE_IRONCLAD (combat/lethal) | pending (unstable): Action queued but st | ≥ 0 | sel | 65 -> 65 | 5 -> 5 | 11 -> 11 |
| JR66CJ9T8H7W | 29 | 3 | 2026-09-25T16:11:46 | INFERNO_POWER | play_card BREAKTHROUGH (combat/lethal) | pending (unstable): Action queued but st | ≥ 0 | sel | 61 -> 61 | 5 -> 5 | 11 -> 11 |
| JR66CJ9T8H7W | 33 | 8 | 2026-09-25T16:15:39 | INFERNO_POWER | play_card TAUNT (combat/lethal) | pending (unstable): Action queued but st | ≥ 0 | sel | 60 -> 60 | 5 -> 5 | 9 -> 9 |
| JR66CJ9T8H7W | 35 | 2 | 2026-09-25T16:16:28 | INFERNO_POWER | play_card TAUNT (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 73 -> 73 | 5 -> 5 | 15 -> 15 |
| JR66CJ9T8H7W | 42 | 3 | 2026-09-25T16:21:30 | INFERNO_POWER | play_card TAUNT (combat/lethal) | pending (unstable): Action queued but st | ≥ 0 | sel | 78 -> 78 | 6 -> 6 | 10 -> 10 |
| JR66CJ9T8H7W | 48 | 4 | 2026-09-25T16:28:16 | INFERNO_POWER | play_card DEFEND_IRONCLAD (combat/plan-guarded) | pending (unstable): Action queued but st | ≥ 0 | sel | 73 -> 73 | 5 -> 5 | 7 -> 7 |
| JR66CJ9T8H7W | 48 | 5 | 2026-09-25T16:28:31 | INFERNO_POWER | play_card WHIRLWIND (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 57 -> 57 | 5 -> 5 | 2 -> 2 |
| JR66CJ9T8H7W | 48 | 6 | 2026-09-25T16:28:46 | INFERNO_POWER | play_card SETUP_STRIKE (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 28 -> 28 | 5 -> 5 | 17 -> 17 |
| JR66CJ9T8H7W | 48 | 7 | 2026-09-25T16:29:00 | INFERNO_POWER | play_card TAUNT (combat/plan) | pending (unstable): Action queued but st | ≥ 1 | sel | 26 -> 26 | 5 -> 5 | 12 -> 12 |
| JR66CJ9T8H7W | 48 | 9 | 2026-09-25T16:29:31 | INFERNO_POWER | play_card WHIRLWIND (combat/lethal) | pending (unstable): Action queued but st | ≥ 0 | sel | 12 -> 12 | 5 -> 5 | 2 -> 2 |
| JF99S7FY4WFU | 20 | 5 | 2026-09-25T18:22:35 | INFERNO_POWER | play_card TWIN_STRIKE (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 71 -> 71 | 5 -> 5 | 5 -> 5 |
| JF99S7FY4WFU | 21 | 4 | 2026-09-25T18:23:43 | INFERNO_POWER | play_card BASH (combat/lethal) | pending (unstable): Action queued but st | ≥ 1 | sel | 70 -> 70 | 5 -> 5 | 9 -> 9 |
| JF99S7FY4WFU | 24 | 5 | 2026-09-25T18:25:29 | INFERNO_POWER | play_card BLOOD_WALL (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 35 -> 34 | 5 -> 5 | 4 -> 4 |
| JF99S7FY4WFU | 30 | 8 | 2026-09-25T18:31:51 | INFERNO_POWER | play_card BASH (combat/lethal) | pending (unstable): Action queued but st | ≥ 1 | sel | 22 -> 22 | 5 -> 5 | 2 -> 2 |
| JF99S7FY4WFU | 33 | 3 | 2026-09-25T18:34:31 | INFERNO_POWER | play_card FLAME_BARRIER (combat/plan-guarded) | pending (unstable): Action queued but st | ≥ 0 | sel | 45 -> 45 | 5 -> 5 | 11 -> 11 |
| JF99S7FY4WFU | 33 | 4 | 2026-09-25T18:34:48 | INFERNO_POWER | play_card BLOOD_WALL (combat/plan-guarded) | pending (unstable): Action queued but st | ≥ 0 | sel | 44 -> 44 | 5 -> 5 | 6 -> 6 |
| JF99S7FY4WFU | 33 | 6 | 2026-09-25T18:35:25 | INFERNO_POWER | play_card TAUNT (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 29 -> 29 | 5 -> 5 | 8 -> 8 |
| JF99S7FY4WFU | 33 | 7 | 2026-09-25T18:35:41 | INFERNO_POWER | play_card SHRUG_IT_OFF (combat/plan-guarded) | pending (unstable): Action queued but st | ≥ 0 | sel | 28 -> 28 | 5 -> 5 | 3 -> 3 |
| JF99S7FY4WFU | 33 | 8 | 2026-09-25T18:35:59 | INFERNO_POWER | play_card BLOOD_WALL (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 13 -> 13 | 5 -> 5 | 10 -> 10 |
| JF99S7FY4WFU | 33 | 9 | 2026-09-25T18:36:16 | INFERNO_POWER | play_card SHRUG_IT_OFF (combat/least-loss) | pending (unstable): Action queued but st | ≥ 0 | sel | 10 -> 10 | 5 -> 5 | 5 -> 5 |
| WY41FADPAGTW | 35 | 3 | 2026-09-25T23:38:51 | INFERNO_POWER | play_card THUNDERCLAP (combat/plan) | completed: Action completed. | ≥ 0 | hp | 73 -> 72 | 5 -> 4 | 2 -> 2 |
| WY41FADPAGTW | 35 | 4 | 2026-09-25T23:39:06 | INFERNO_POWER | play_card HEADBUTT (combat/lethal) | completed: Action completed. | ≥ 0 | hp | 70 -> 69 | 5 -> 4 | 13 -> 13 |
| WY41FADPAGTW | 36 | 3 | 2026-09-25T23:39:52 | INFERNO_POWER | play_card INFLAME (combat/lethal) | completed: Action completed. | ≥ 0 | hp | 58 -> 57 | 5 -> 4 | 10 -> 10 |
| WY41FADPAGTW | 39 | 7 | 2026-09-25T23:42:51 | INFERNO_POWER | play_card DEFEND_IRONCLAD (combat/lethal) | completed: Action completed. | ≥ 0 | hp | 14 -> 13 | 5 -> 4 | 12 -> 12 |
| WY41FADPAGTW | 42 | 5 | 2026-09-25T23:45:24 | INFERNO_POWER | play_card THUNDERCLAP (combat/lethal) | completed: Action completed. | ≥ 0 | hp | 20 -> 19 | 5 -> 4 | 12 -> 12 |
| 92MWCWJCFDAE | 17 | 11 | 2026-09-26T00:36:54 | INFERNO_POWER | play_card BASH (combat/lethal) | completed: Action completed. | ≥ 0 | hp | 32 -> 31 | 5 -> 4 | 1 -> 1 |
| 92MWCWJCFDAE | 27 | 4 | 2026-09-26T00:40:40 | INFERNO_POWER | play_card THRUMMING_HATCHET (combat/lethal) | completed: Action completed. | ≥ 0 | hp | 47 -> 46 | 5 -> 6 | 17 -> 15 |
| MAHAHJY541KJ | 17 | 5 | 2026-09-26T01:42:58 | INFERNO_POWER | play_card DEFEND_IRONCLAD (combat/plan) | completed: Action completed. | ≥ 0 | hp | 59 -> 58 | 5 -> 4 | 13 -> 13 |
| MAHAHJY541KJ | 17 | 7 | 2026-09-26T01:43:25 | INFERNO_POWER | play_card ANGER (combat/lethal) | completed: Action completed. | ≥ 0 | hp | 55 -> 54 | 5 -> 4 | 4 -> 4 |
| L34T7HND7EL8 | 33 | 10 | 2026-09-26T15:10:52 | INFERNO_POWER | play_card BASH (combat/plan) | completed: Action completed. | ≥ 0 | hp | 42 -> 41 | 5 -> 6 | 18 -> 16 |
| P2E43JJVFGMK | 48 | 4 | 2026-09-26T18:39:21 | INFERNO_POWER | play_card BLOODLETTING (combat/plan) | completed: Action completed. | ≥ 0 | hp | 42 -> 38 | 5 -> 4 | 13 -> 13 |
| P2E43JJVFGMK | 48 | 6 | 2026-09-26T18:39:54 | INFERNO_POWER | play_card POMMEL_STRIKE (combat/least-loss) | completed: Action completed. | ≥ 0 | hp | 9 -> 8 | 5 -> 5 | 0 -> 20 |
| P2E43JJVFGMK | 48 | 7 | 2026-09-26T18:40:11 | INFERNO_POWER | play_card TAUNT (combat/plan) | completed: Action completed. | ≥ 0 | hp | 7 -> 6 | 5 -> 4 | 14 -> 14 |
| P2E43JJVFGMK | 48 | 8 | 2026-09-26T18:40:27 | INFERNO_POWER | play_card STRIKE_IRONCLAD (combat/least-loss) | completed: Action completed. | ≥ 0 | hp | 4 -> 3 | 5 -> 4 | 9 -> 9 |
| YN4ETG9Z8ERN | 43 | 6 | 2026-09-26T20:48:38 | HELLRAISER_POWER | play_card DISMANTLE (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 18 -> 18 | 5 -> 8 | 20 -> 17 |
| M6P7KAWMF6BC | 31 | 4 | 2026-09-27T00:21:50 | INFERNO_POWER | play_card COLOSSUS (combat/plan) | pending (unstable): Action queued but st | ≥ 1 | sel | 43 -> 43 | 5 -> 5 | 2 -> 2 |
| M6P7KAWMF6BC | 33 | 6 | 2026-09-27T00:24:49 | INFERNO_POWER | play_card STRIKE_IRONCLAD (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 49 -> 49 | 5 -> 5 | 13 -> 13 |
| M6P7KAWMF6BC | 33 | 8 | 2026-09-27T00:25:12 | INFERNO_POWER | play_card POMMEL_STRIKE (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 7 -> 7 | 5 -> 5 | 3 -> 3 |
| M6P7KAWMF6BC | 45 | 3 | 2026-09-27T00:33:44 | INFERNO_POWER | play_card STRIKE_IRONCLAD (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 65 -> 65 | 5 -> 5 | 17 -> 17 |
| VE975EGP2G3V | 19 | 4 | 2026-09-27T01:10:55 | INFERNO_POWER | play_card STRIKE_IRONCLAD (combat/lethal) | pending (unstable): Action queued but st | ≥ 0 | sel | 68 -> 68 | 5 -> 5 | 10 -> 10 |
| VE975EGP2G3V | 20 | 5 | 2026-09-27T01:12:39 | INFERNO_POWER | play_card BASH (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 49 -> 49 | 5 -> 5 | 10 -> 10 |
| VE975EGP2G3V | 20 | 6 | 2026-09-27T01:12:52 | INFERNO_POWER | play_card BREAKTHROUGH (combat/lethal) | pending (unstable): Action queued but st | ≥ 0 | sel | 48 -> 48 | 5 -> 5 | 5 -> 5 |
| VE975EGP2G3V | 28 | 3 | 2026-09-27T01:20:58 | INFERNO_POWER | play_card INFLAME (combat/plan) | pending (unstable): Action queued but st | ≥ 0 | sel | 62 -> 62 | 5 -> 5 | 7 -> 7 |
| VE975EGP2G3V | 28 | 4 | 2026-09-27T01:21:16 | INFERNO_POWER | play_card THUNDERCLAP (combat/lethal) | pending (unstable): Action queued but st | ≥ 0 | sel | 58 -> 58 | 5 -> 5 | 2 -> 2 |
| VE975EGP2G3V | 44 | 8 | 2026-09-27T01:35:17 | INFERNO_POWER | play_card SETUP_STRIKE (combat/lethal) | pending (unstable): Action queued but st | ≥ 0 | sel | 26 -> 26 | 5 -> 5 | 18 -> 18 |
| 2Q370C5EW0EU | 23 | 3 | 2026-09-27T02:00:31 | INFERNO_POWER | play_card POMMEL_STRIKE (combat/lethal) | pending (unstable): Action queued but st | ≥ 0 | sel | 54 -> 54 | 5 -> 5 | 7 -> 7 |
| 2Q370C5EW0EU | 24 | 5 | 2026-09-27T02:01:55 | INFERNO_POWER | play_card SHRUG_IT_OFF (combat/lethal) | pending (unstable): Action queued but st | ≥ 0 | sel | 45 -> 45 | 5 -> 5 | 11 -> 11 |
| 2Q370C5EW0EU | 27 | 4 | 2026-09-27T02:03:49 | INFERNO_POWER | play_card POMMEL_STRIKE (combat/plan-guarded) | pending (unstable): Action queued but st | ≥ 0 | sel | 51 -> 51 | 5 -> 5 | 3 -> 3 |
| XA8CMSK1V9H3 | 30 | 3 | 2026-09-28T02:00:17 | INFERNO_POWER | play_card STRIKE_IRONCLAD (combat/plan-choice+potion) | completed: Action completed. | ≥ 308 | hp | 44 -> 43 | 5 -> 4 | 3 -> 3 |
| XA8CMSK1V9H3 | 30 | 4 | 2026-09-28T02:00:28 | INFERNO_POWER | play_card BASH (combat/plan-choice+potion) | completed: Action completed. | ≥ 246 | hp | 30 -> 29 | 5 -> 4 | 17 -> 17 |
| V1Y4D9Y9GMVK | 20 | 4 | 2026-09-30T18:26:55 | HELLRAISER_POWER | play_card BASH (combat/plan) | completed: Action completed. | 1 | draw | 46 -> 46 | 3 -> 3 | 14 -> 13 |
| 63WBEEF2JVM5 | 27 | 4 | 2026-10-02T11:18:54 | INFERNO_POWER | play_card POMMEL_STRIKE (combat/lethal) | completed: Action completed. | 2 | hp | 14 -> 13 | 5 -> 6 | 16 -> 14 |
| R1QJUBVBSSB2 | 4 | 2 | 2026-10-02T15:05:06 | INFERNO_POWER | play_card BREAKTHROUGH (combat/lethal) | completed: Action completed. | 2 | hp | 57 -> 55 | 5 -> 4 | 3 -> 3 |
| C4F14F3XPN0N | 21 | 2 | 2026-10-03T14:25:15 | HELLRAISER_POWER | play_card BASH (combat/plan) | pending (unstable): Action queued but st | 2 | draw+sel | 55 -> 55 | 2 -> 3 | 16 -> 15 |
| C4F14F3XPN0N | 33 | 7 | 2026-10-03T14:38:20 | HELLRAISER_POWER, INFERNO_POWER | play_card ANGER (combat/least-loss) | pending (unstable): Action queued but st | 3 | draw+hp+sel | 4 -> 2 | 1 -> 3 | 10 -> 8 |

## The settle's cost at other lengths (turn starts with the read time logged, Inferno or Hellraiser up)

| settle ms | turn starts that wait | mean wait, every turn start holding them (s) | mean, those that wait (s) | a fight (s) | early ones it covers (deciding time known or bounded under it) |
|---|---|---|---|---|---|
| 300 | 397 of 982 | 0.12 | 0.29 | 0.3 | 60 of 62 |
| 500 | 418 of 982 | 0.20 | 0.47 | 0.6 | 61 of 62 |
| 750 | 703 of 982 | 0.34 | 0.48 | 1.0 | 62 of 62 |
| 1000 | 816 of 982 | 0.54 | 0.65 | 1.6 | 62 of 62 |
| 1500 | 898 of 982 | 0.98 | 1.07 | 2.8 | 62 of 62 |
| Inferno 500, Hellraiser 1000 | 448 of 982 | 0.23 | 0.51 | 0.7 | 62 of 62 |
- INFERNO_POWER: 910 turn starts with the read time logged, 319 fights
- HELLRAISER_POWER: 78 turn starts with the read time logged, 21 fights
