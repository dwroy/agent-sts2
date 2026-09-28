# Monster DB cross-check

DB: `src/knowledge/monster-db.json` from 3792 logged fights (2026-09-24T04:08:00.849Z .. 2026-09-28T07:51:32.001Z), fights by ascension {'0': 737, '1': 22, '2': 206, '3': 227, '4': 201, '5': 256, '6': 65, '7': 550, '8': 1528}.
Regenerate: `python3 tools/build-monster-db.py && python3 tools/monster-db-check.py`.

Columns: DB value (n = fights), hand value, difference. `A<8` = the DB value at A7 (A0-A6 give the same max HP for every boss logged; A8 raises HP). Flagged (**bold**) when HP differs at all, or loss/turns/need differ by more than 20%.

## (a) boss-clock.ts `BOSSES`

| boss | DB HP A7 (n) | hand hp | DB HP A8 (n) | hand hpA8 | DB loss/turn p75 A8 (n) | hand lossPerTurn | DB won-fight turns p75 A8 (n) | hand scriptTurns | note |
|---|---|---|---|---|---|---|---|---|---|
| AEONGLASS | 512 (2) | **578** | 535 (2) | **601** | 8.6 (2) | 8.6 | - (0) | 9 | hand hp adds 2x33 Ebb block on purpose |
| CEREMONIAL_BEAST | 252 (3) | 252 | 262 (19) | 262 | 6.3 (19) | 6.2 | 11 (16) | 12 |  |
| KAISER_CRAB | 408 (8) | 408 | 428 (19) | 428 | 11.6 (19) | 10 | 10 (4) | 8 |  |
| KNOWLEDGE_DEMON | 379 (5) | 379 | 399 (12) | 399 | 6.3 (12) | 6.3 | 8 (3) | **11** |  |
| LAGAVULIN_MATRIARCH | 222 (4) | 222 | 233 (20) | 233 | 5.9 (20) | 5.8 | 12 (13) | 12 |  |
| QUEEN | 599 (2) | **460** | 630 (4) | **480** | 13 (4) | 13.3 | - (0) | 8 | hand hp = Queen + ~60 block, Amalgam left out on purpose; DB = Queen + Amalgam |
| SOUL_FYSH | 211 (6) | 211 | 221 (15) | 221 | 5.1 (15) | 5.1 | 11 (12) | 12 |  |
| TEST_SUBJECT | 100 (3) | **600** | 111 (1) | **641** | 8.5 (1) | 7.5 | - (0) | 12 | hand hp = sum of 3 phases; DB = phase 1 (phases below) |
| THE_INSATIABLE | 321 (6) | 321 | 341 (18) | 341 | 8.8 (18) | 8.9 | 8.2 (8) | 8 |  |
| THE_KIN | 307 (7) | **250** | 324 (19) | **260** | 9.3 (19) | 10.1 | 10.5 (11) | 10 | hand hp = priest + ~60 into followers on purpose; DB = priest + 2 followers |
| VANTOM | 173 (8) | 173 | 183 (20) | 183 | 6.7 (20) | 7.3 | 10.2 (16) | 11 |  |
| WATERFALL_GIANT | 240 (9) | **260** | 250 (21) | **270** | 5.1 (21) | 5.1 | 14 (16) | 14 | hand hp adds ~20 Siphon heal on purpose |

Test Subject phases: hand A8 [111, 212, 318], A<8 [100, 200, 300]; DB (max_hp sequence of the one enemy, n fights): A0: 100 > 200 > 300 (n=2); A1: 100 > 200 > 300 (n=1); A2: 100 > 200 (n=1); A3: 100 > 200 > 300 (n=1); A5: 100 > 200 > 300 (n=1); A7: 100 > 200 > 300 (n=2), 100 > 200 (n=1); A8: 111 > 212 (n=1). Phase 3 at A8 is still unlogged.

Loss/turn = (entry HP - HP at the end, all of it on a death) / our turns, 75th percentile over the A8 fights with a known outcome, as the boss-clock comment defines it. Won-fight turns = our turn count in A8 wins.

### Boss parts (DB, A7 / A8 median max HP, n instances)

- **AEONGLASS** — A7: AEONGLASS 512 (n=2, x1/fight); win 0 of 2, deaths 2 | A8: AEONGLASS 535 (n=2, x1/fight); win 0 of 2, deaths 2
- **CEREMONIAL_BEAST** — A7: CEREMONIAL_BEAST 252 (n=3, x1/fight); win 0.7 of 3, deaths 1 | A8: CEREMONIAL_BEAST 262 (n=19, x1/fight); win 0.8 of 19, deaths 3
- **KAISER_CRAB** — A7: CRUSHER 209 (n=8, x1/fight), ROCKET 199 (n=8, x1/fight); win 0.4 of 8, deaths 5 | A8: CRUSHER 219 (n=19, x1/fight), ROCKET 209 (n=19, x1/fight); win 0.2 of 19, deaths 15
- **KNOWLEDGE_DEMON** — A7: KNOWLEDGE_DEMON 379 (n=5, x1/fight); win 0.4 of 5, deaths 3 | A8: KNOWLEDGE_DEMON 399 (n=12, x1/fight); win 0.2 of 12, deaths 9
- **LAGAVULIN_MATRIARCH** — A7: LAGAVULIN_MATRIARCH 222 (n=4, x1/fight); win 0.8 of 4, deaths 1 | A8: LAGAVULIN_MATRIARCH 233 (n=20, x1/fight); win 0.7 of 20, deaths 7
- **QUEEN** — A7: QUEEN 400 (n=2, x1/fight), TORCH_HEAD_AMALGAM 199 (n=2, x1/fight); win 0.5 of 2, deaths 1 | A8: QUEEN 419 (n=4, x1/fight), TORCH_HEAD_AMALGAM 211 (n=4, x1/fight); win 0 of 4, deaths 4
- **SOUL_FYSH** — A7: SOUL_FYSH 211 (n=6, x1/fight); win 1 of 6, deaths 0 | A8: SOUL_FYSH 221 (n=15, x1/fight); win 0.8 of 15, deaths 3
- **TEST_SUBJECT** — A7: TEST_SUBJECT 100 (n=3, x1/fight); phases {'100 > 200 > 300 (TEST_SUBJECT)': 2, '100 > 200 (TEST_SUBJECT)': 1}; win 0 of 3, deaths 3 | A8: TEST_SUBJECT 111 (n=1, x1/fight); phases {'111 > 212 (TEST_SUBJECT)': 1}; win 0 of 1, deaths 1
- **THE_INSATIABLE** — A7: THE_INSATIABLE 321 (n=6, x1/fight); win 0.8 of 6, deaths 1 | A8: THE_INSATIABLE 341 (n=18, x1/fight); win 0.4 of 18, deaths 10
- **THE_KIN** — A7: KIN_FOLLOWER 58.5 (n=14, x2/fight), KIN_PRIEST 190 (n=7, x1/fight); win 0.6 of 7, deaths 3 | A8: KIN_FOLLOWER 62.5 (n=38, x2/fight), KIN_PRIEST 199 (n=19, x1/fight); win 0.6 of 19, deaths 8
- **VANTOM** — A7: VANTOM 173 (n=8, x1/fight); win 1 of 8, deaths 0 | A8: VANTOM 183 (n=20, x1/fight); win 0.8 of 20, deaths 4
- **WATERFALL_GIANT** — A7: WATERFALL_GIANT 240 (n=9, x1/fight); win 0.8 of 9, deaths 2 | A8: WATERFALL_GIANT 250 (n=21, x1/fight); win 0.8 of 21, deaths 5

## (b) enemy dossiers (git redesign-end:src/knowledge/enemy-dossiers.json)

The dossier file is not in the step1-bugfix tree (removed with the pre-ablation restore 910671b); the last committed version is compared.

HP: the dossier `hp` is the sum of all bodies for multi-body fights. DB: the median starting HP total of the logged encounter made only of the dossier's ids whose HP is closest to the hand value (with spawned bodies counted when that is closer; bosses: the boss summary); a hand value is flagged when it is outside the logged [min-max] of that total and outside the main body's own range. Need: the dossier's need_damage_per_turn vs the DB's A8 HP / median turns of the A8 wins (what the winning decks actually dealt a turn; not a clock). Deaths: dossier count (runs.jsonl, 157 runs at the time) vs DB deaths at all ascensions.

| dossier id | kind | DB HP A7 median [range] (n) | hand a7 | DB HP A8 median [range] (n) | hand a8 | DB main body A8 | DB A8 HP/won turns (n wins) | hand need | DB deaths (all asc) | hand deaths | encounter used |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AEONGLASS | boss | 512 (2) | 512 | 535 (2) | 535 | 535 | - (0) | 75 | 9 | 8 | boss AEONGLASS |
| AXEBOT | hallway | - (0) | 249 | 81 (1) | **262** | 81 | 9 (1) | - | 2 | 2 | AXEBOT |
| BOWLBUG_ROCK | hallway | 83 [81-85] (9) | 84 | 85 [82-88] (24) | 88 | 47 [46-49] | 24.3 (24) | - | 12 | 0 | BOWLBUG_NECTAR+BOWLBUG_ROCK |
| BYGONE_EFFIGY | elite | 127 (6) | 127 | 132 (20) | **133** | 132 | 26.4 (16) | - | 5 | 1 | BYGONE_EFFIGY |
| BYRDONIS | elite | 82.5 [81-84] (8) | 84 | 90 (11) | **88** | 90 | 22.5 (11) | - | 0 | 0 | BYRDONIS |
| CEREMONIAL_BEAST | boss | 252 (3) | 252 | 262 (19) | 262 | 262 | 26.2 (16) | **20** | 5 | 2 | boss CEREMONIAL_BEAST |
| CHOMPER | hallway | 123 [121-126] (8) | 126 | 130 [128-133] (26) | 130 | 65 [63-67] | 26 (25) | - | 4 | 4 | CHOMPER+CHOMPER |
| DECIMILLIPEDE | elite | 132 [126-132] (11) | 130 | 148 [146-150] (16) | 150 | 50 [46-52] | 29.6 (11) | 30 | 9 | 6 | DECIMILLIPEDE_SEGMENT_BACK+DECIMILLIPEDE_SEGMENT_FRONT+DECIMILLIPEDE_SEGMENT_MIDDLE |
| DEVOTED_SCULPTOR | hallway | 162 (7) | 162 | 172 (12) | 172 | 172 | 43 (10) | 40 | 2 | 2 | DEVOTED_SCULPTOR |
| ENTOMANCER | elite | 145 (7) | 145 | 165 (21) | 165 | 165 | 33 (17) | 33 | 9 | 5 | ENTOMANCER |
| EXOSKELETON | hallway | 104.5 [102-106] (14) | 104 | 111 [110-114] (19) | **109** | 28 [26-30] | 37 (19) | - | 0 | 0 | EXOSKELETON+EXOSKELETON+EXOSKELETON+EXOSKELETON |
| FABRICATOR | hallway | 150 (3) | 150 | 155 (2) | **158** | 155 | 31 (2) | - | 1 | 1 | FABRICATOR |
| FLAIL_KNIGHT | elite | 276 (2) | 276 | 294 (1) | **290** | 108 | 58.8 (1) | - | 0 | 0 | FLAIL_KNIGHT+MAGI_KNIGHT+SPECTRAL_KNIGHT |
| FLYCONID | hallway | 80 (4) | 49 | 87 [85-89] (21) | 51 | 52 [51-53] | 21.8 (21) | - | 1 | 1 | FLYCONID+SNAPPING_JAXFRUIT |
| FROG_KNIGHT | hallway | 191 (4) | 191 | 199 (2) | 199 | 199 | - (0) | 30 | 3 | 2 | FROG_KNIGHT |
| FUZZY_WURM_CRAWLER | hallway | 56 [55-57] (13) | 56 | 59 [58-59] (53) | 59 | 59 [58-59] | 19.7 (53) | - | 1 | 1 | FUZZY_WURM_CRAWLER |
| GLOBE_HEAD | hallway | 148 (3) | 148 | 158 (1) | **155** | 158 | 31.6 (1) | - | 0 | 0 | GLOBE_HEAD |
| HUNTER_KILLER | hallway | 121 (8) | 121 | 126 (26) | **127** | 126 | 25.2 (23) | 25 | 6 | 3 | HUNTER_KILLER |
| INFESTED_PRISM | elite | 161 (3) | 161 | 171 (12) | 171 | 171 | 34.2 (9) | 35 | 5 | 4 | INFESTED_PRISM |
| KAISER_CRAB | boss | 408 (8) | 408 | 428 (19) | 428 | - | 50.4 (4) | 54 | 30 | 17 | boss KAISER_CRAB |
| KNOWLEDGE_DEMON | boss | 379 (5) | 379 | 399 (12) | 399 | 399 | 57 (3) | 51 | 25 | 17 | boss KNOWLEDGE_DEMON |
| LAGAVULIN_MATRIARCH | boss | 222 (4) | 222 | 233 (20) | 233 | 233 | 23.3 (13) | 19 | 16 | 9 | boss LAGAVULIN_MATRIARCH |
| LOUSE_PROGENITOR | hallway | 134 [134-136] (7) | 134 | 139 [138-141] (22) | 141 | 139 [138-141] | 27.8 (20) | 25 | 4 | 2 | LOUSE_PROGENITOR |
| MECHA_KNIGHT | elite | 300 (5) | 300 | 320 (3) | **315** | 320 | 40 (2) | 33 | 3 | 2 | MECHA_KNIGHT |
| MYTE | hallway | 128.5 [123-133] (8) | 130 | 133 [130-136] (24) | **137** | 67 [64-69] | 33.2 (22) | - | 4 | 2 | MYTE+MYTE |
| OVICOPTER | hallway | 126 [124-129] (6) | **130** | 129 [126-132] (24) | **137** | 129 [126-132] | 32.2 (22) | - | 2 | 0 | OVICOPTER |
| OWL_MAGISTRATE | hallway | 231 (3) | 231 | 247 (3) | **243** | 247 | 38 (2) | 40 | 1 | 0 | OWL_MAGISTRATE |
| PHANTASMAL_GARDENER | elite | 116 [115-118] (8) | 116 | 119 [114-122] (16) | 122 | 30 [27-32] | 29.8 (15) | - | 3 | 2 | PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER |
| PHROG_PARASITE | elite | 138 [135-141] (8) | **142** | 147 [145-150] (15) | 149 | 67 [66-68] | 24.5 (15) | - | 1 | 1 | PHROG_PARASITE (with spawned bodies) |
| PUNCH_CONSTRUCT | hallway | 185 (1) | 185 | 200 (4) | **194** | 60 | 36.4 (4) | - | 2 | 2 | CUBEX_CONSTRUCT+CUBEX_CONSTRUCT+PUNCH_CONSTRUCT |
| QUEEN | boss | 599 (2) | 599 | 630 (4) | **629** | 419 | - (0) | 69 | 9 | 5 | boss QUEEN |
| SKULKING_COLONY | elite | 75 (11) | 75 | 80 (11) | **79** | 80 | 13.3 (11) | **20** | 0 | 0 | SKULKING_COLONY |
| SLIMED_BERSERKER | hallway | 261 (2) | 261 | 281 (1) | 281 | 281 | - (0) | 40 | 1 | 1 | SLIMED_BERSERKER |
| SLUDGE_SPINNER | hallway | 38 [37-39] (17) | 38 | 41.5 [41-42] (42) | **40** | 41.5 [41-42] | 13.8 (42) | - | 1 | 1 | SLUDGE_SPINNER |
| SLUMBERING_BEETLE | hallway | 174 [172-176] (10) | 172 | 178 [176-180] (22) | **181** | 89 | 29.7 (19) | 30 | 10 | 7 | BOWLBUG_ROCK+BOWLBUG_SILK+SLUMBERING_BEETLE |
| SOUL_FYSH | boss | 211 (6) | 211 | 221 (15) | 221 | 221 | 20.1 (12) | **25** | 10 | 8 | boss SOUL_FYSH |
| SOUL_NEXUS | elite | 234 (1) | 234 | 254 (3) | **246** | 254 | 33.9 (2) | **45** | 2 | 1 | SOUL_NEXUS |
| SPINY_TOAD | hallway | 117 [116-119] (10) | 118 | 123.5 [121-124] (24) | 122 | 123.5 [121-124] | 30.9 (20) | - | 6 | 3 | SPINY_TOAD |
| TERROR_EEL | elite | 140 (8) | 140 | 150 (17) | 150 | 150 | 27.3 (16) | 30 | 1 | 1 | TERROR_EEL |
| TEST_SUBJECT | boss | 100 (3) | **600** | 111 (1) | **630** | 111 | - (0) | 43 | 8 | 7 | boss TEST_SUBJECT |
| THE_INSATIABLE | boss | 321 (6) | 321 | 341 (18) | 341 | 341 | 42.6 (8) | 49 | 16 | 6 | boss THE_INSATIABLE |
| THE_KIN | boss | 307 (7) | 307 | 324 (19) | **322** | - | 40.5 (11) | **31** | 12 | 4 | boss THE_KIN |
| THE_LOST | hallway | 199 (2) | 199 | 210 (3) | **209** | 99 | 35 (3) | - | 0 | 0 | THE_FORGOTTEN+THE_LOST |
| THE_OBSCURA | hallway | 123 (5) | 123 | 129 (20) | 129 | 129 | 25.8 (16) | 30 | 5 | 3 | THE_OBSCURA |
| THIEVING_HOPPER | hallway | 79 (14) | 79 | 84 (39) | 84 | 84 | 21 (39) | - | 0 | 0 | THIEVING_HOPPER |
| TUNNELER | hallway | 87 (17) | 87 | 92 (45) | **91** | 92 | 18.4 (45) | - | 1 | 1 | TUNNELER |
| VANTOM | boss | 173 (8) | 173 | 183 (20) | 183 | 183 | 22.9 (16) | 23 | 9 | 5 | boss VANTOM |
| WATERFALL_GIANT | boss | 240 (9) | 240 | 250 (21) | 250 | 250 | 25 (16) | 25 | 11 | 8 | boss WATERFALL_GIANT |

Dossier A8 HP outside the logged range in 22 of 48 logged entries: AXEBOT (hand 262 vs DB 81), BYGONE_EFFIGY (hand 133 vs DB 132), BYRDONIS (hand 88 vs DB 90), EXOSKELETON (hand 109 vs DB 111), FABRICATOR (hand 158 vs DB 155), FLAIL_KNIGHT (hand 290 vs DB 294), GLOBE_HEAD (hand 155 vs DB 158), HUNTER_KILLER (hand 127 vs DB 126), MECHA_KNIGHT (hand 315 vs DB 320), MYTE (hand 137 vs DB 133), OVICOPTER (hand 137 vs DB 129), OWL_MAGISTRATE (hand 243 vs DB 247), PUNCH_CONSTRUCT (hand 194 vs DB 200), QUEEN (hand 629 vs DB 630), SKULKING_COLONY (hand 79 vs DB 80), SLUDGE_SPINNER (hand 40 vs DB 41.5), SLUMBERING_BEETLE (hand 181 vs DB 178), SOUL_NEXUS (hand 246 vs DB 254), TEST_SUBJECT (hand 630 vs DB 111), THE_KIN (hand 322 vs DB 324), THE_LOST (hand 209 vs DB 210), TUNNELER (hand 91 vs DB 92).

Dossier need_damage_per_turn more than 20% off what A8 winners dealt: CEREMONIAL_BEAST (hand 20 vs DB 26.2), SKULKING_COLONY (hand 20 vs DB 13.3), SOUL_FYSH (hand 25 vs DB 20.1), SOUL_NEXUS (hand 45 vs DB 33.9), THE_KIN (hand 31 vs DB 40.5).

## (c) move-model.json

move-model.json comes from the same logs (tools/build-move-model.py) but keys moves per (run, enemy index, id): an enemy met twice in a run mixes two fights, and the mod's index shifts when an enemy dies (Kin: the priest moves from index 2 to 1), which mixes enemies of the same id and drops turns. The DB keys per fight and tracks enemies across index shifts. Listed: enemies/moves in one and not the other, average shown damage (all ascensions) differing by more than max(2, 15%), and successors the move-model has that the DB never saw.

- enemies only in move-model: none; only in the DB: none
- moves differing: 0 enemies

Average shown attack damage (all ascensions, Strength included) differing:

| enemy | move | DB avg (n turns) | move-model avg |
|---|---|---|---|

Successors in move-model never seen per fight in the DB (0; mostly index-shift or cross-fight artefacts):


