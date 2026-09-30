# Monster DB cross-check

DB: `src/knowledge/monster-db.json` from 5238 logged fights (2026-09-24T04:08:00.849Z .. 2026-09-30T06:00:13.431Z), fights by ascension {'0': 737, '1': 22, '2': 206, '3': 227, '4': 201, '5': 256, '6': 65, '7': 550, '8': 2392, '9': 582}.
Regenerate: `python3 tools/build-monster-db.py && python3 tools/monster-db-check.py`.

Columns: DB value (n = fights), hand value, difference. `A<8` = the DB value at A7 (A0-A6 give the same max HP for every boss logged; A8 raises HP). Flagged (**bold**) when HP differs at all, or loss/turns/need differ by more than 20%.

## (a) boss-clock.ts `BOSSES`

| boss | DB HP A7 (n) | hand hp | DB HP A8 (n) | hand hpA8 | DB loss/turn p75 A8 (n) | hand lossPerTurn | DB won-fight turns p75 A8 (n) | hand scriptTurns | note |
|---|---|---|---|---|---|---|---|---|---|
| CEREMONIAL_BEAST | 252 (3) | 252 | 262 (27) | 262 | 5.9 (27) | 6.2 | 10.2 (24) | 12 |  |
| KAISER_CRAB | 408 (8) | 408 | 428 (29) | 428 | 11.2 (29) | 10 | 9.5 (7) | 8 |  |
| KNOWLEDGE_DEMON | 379 (5) | 379 | 399 (30) | 399 | 7.3 (30) | 6.3 | 9 (14) | **11** |  |
| LAGAVULIN_MATRIARCH | 222 (4) | 222 | 233 (27) | 233 | 6 (27) | 5.8 | 11.2 (20) | 12 |  |
| SOUL_FYSH | 211 (6) | 211 | 221 (26) | 221 | 5.3 (26) | 5.1 | 11 (21) | 12 |  |
| TEST_SUBJECT | 100 (3) | **600** | 111 (5) | **636** | 11.5 (5) | **7.5** | 8 (2) | **12** | hand hp = sum of 3 phases; DB = phase 1 (phases below) |
| THE_INSATIABLE | 321 (6) | 321 | 341 (29) | 341 | 8.8 (29) | 8.9 | 8 (11) | 8 |  |
| VANTOM | 173 (8) | 173 | 183 (27) | 183 | 6.5 (27) | 7.3 | 11 (23) | 11 |  |

Test Subject phases: hand A8 [111, 212, 313], A<8 [100, 200, 300]; DB (max_hp sequence of the one enemy, n fights): A0: 100 > 200 > 300 (n=2); A1: 100 > 200 > 300 (n=1); A2: 100 > 200 (n=1); A3: 100 > 200 > 300 (n=1); A5: 100 > 200 > 300 (n=1); A7: 100 > 200 > 300 (n=2), 100 > 200 (n=1); A8: 111 > 212 > 313 (n=3), 111 > 212 (n=2); A9: 111 > 212 (n=1). Phase 3 at A8 is still unlogged.

Loss/turn = (entry HP - HP at the end, all of it on a death) / our turns, 75th percentile over the A8 fights with a known outcome, as the boss-clock comment defines it. Won-fight turns = our turn count in A8 wins.

### Boss parts (DB, A7 / A8 median max HP, n instances)

- **AEONGLASS** — A7: AEONGLASS 512 (n=2, x1/fight); win 0 of 2, deaths 2 | A8: AEONGLASS 535 (n=7, x1/fight); win 0.3 of 7, deaths 5
- **CEREMONIAL_BEAST** — A7: CEREMONIAL_BEAST 252 (n=3, x1/fight); win 0.7 of 3, deaths 1 | A8: CEREMONIAL_BEAST 262 (n=27, x1/fight); win 0.9 of 27, deaths 3
- **KAISER_CRAB** — A7: CRUSHER 209 (n=8, x1/fight), ROCKET 199 (n=8, x1/fight); win 0.4 of 8, deaths 5 | A8: CRUSHER 219 (n=29, x1/fight), ROCKET 209 (n=29, x1/fight); win 0.2 of 29, deaths 22
- **KNOWLEDGE_DEMON** — A7: KNOWLEDGE_DEMON 379 (n=5, x1/fight); win 0.4 of 5, deaths 3 | A8: KNOWLEDGE_DEMON 399 (n=30, x1/fight); win 0.5 of 30, deaths 16
- **LAGAVULIN_MATRIARCH** — A7: LAGAVULIN_MATRIARCH 222 (n=4, x1/fight); win 0.8 of 4, deaths 1 | A8: LAGAVULIN_MATRIARCH 233 (n=27, x1/fight); win 0.7 of 27, deaths 7
- **QUEEN** — A7: QUEEN 400 (n=2, x1/fight), TORCH_HEAD_AMALGAM 199 (n=2, x1/fight); win 0.5 of 2, deaths 1 | A8: QUEEN 419 (n=10, x1/fight), TORCH_HEAD_AMALGAM 211 (n=10, x1/fight); win 0.2 of 10, deaths 8
- **SOUL_FYSH** — A7: SOUL_FYSH 211 (n=6, x1/fight); win 1 of 6, deaths 0 | A8: SOUL_FYSH 221 (n=26, x1/fight); win 0.8 of 26, deaths 5
- **TEST_SUBJECT** — A7: TEST_SUBJECT 100 (n=3, x1/fight); phases {'100 > 200 > 300 (TEST_SUBJECT)': 2, '100 > 200 (TEST_SUBJECT)': 1}; win 0 of 3, deaths 3 | A8: TEST_SUBJECT 111 (n=5, x1/fight); phases {'111 > 212 > 313 (TEST_SUBJECT)': 3, '111 > 212 (TEST_SUBJECT)': 2}; win 0.4 of 5, deaths 3
- **THE_INSATIABLE** — A7: THE_INSATIABLE 321 (n=6, x1/fight); win 0.8 of 6, deaths 1 | A8: THE_INSATIABLE 341 (n=29, x1/fight); win 0.4 of 29, deaths 18
- **THE_KIN** — A7: KIN_FOLLOWER 58.5 (n=14, x2/fight), KIN_PRIEST 190 (n=7, x1/fight); win 0.6 of 7, deaths 3 | A8: KIN_FOLLOWER 62.5 (n=60, x2/fight), KIN_PRIEST 199 (n=30, x1/fight); win 0.7 of 30, deaths 10
- **VANTOM** — A7: VANTOM 173 (n=8, x1/fight); win 1 of 8, deaths 0 | A8: VANTOM 183 (n=27, x1/fight); win 0.9 of 27, deaths 4
- **WATERFALL_GIANT** — A7: WATERFALL_GIANT 240 (n=9, x1/fight); win 0.8 of 9, deaths 2 | A8: WATERFALL_GIANT 250 (n=33, x1/fight); win 0.6 of 33, deaths 13

## (b) enemy dossiers (git redesign-end:src/knowledge/enemy-dossiers.json)

The dossier file is not in the step1-bugfix tree (removed with the pre-ablation restore 910671b); the last committed version is compared.

HP: the dossier `hp` is the sum of all bodies for multi-body fights. DB: the median starting HP total of the logged encounter made only of the dossier's ids whose HP is closest to the hand value (with spawned bodies counted when that is closer; bosses: the boss summary); a hand value is flagged when it is outside the logged [min-max] of that total and outside the main body's own range. Need: the dossier's need_damage_per_turn vs the DB's A8 HP / median turns of the A8 wins (what the winning decks actually dealt a turn; not a clock). Deaths: dossier count (runs.jsonl, 157 runs at the time) vs DB deaths at all ascensions.

| dossier id | kind | DB HP A7 median [range] (n) | hand a7 | DB HP A8 median [range] (n) | hand a8 | DB main body A8 | DB A8 HP/won turns (n wins) | hand need | DB deaths (all asc) | hand deaths | encounter used |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AEONGLASS | boss | 512 (2) | 512 | 535 (7) | 535 | 535 | 76.4 (2) | 75 | 12 | 8 | boss AEONGLASS |
| AXEBOT | hallway | - (0) | 249 | 79 [76-84] (8) | **262** | 79 [76-84] | 12.2 (8) | - | 2 | 2 | AXEBOT |
| BOWLBUG_ROCK | hallway | 83 [81-85] (9) | 84 | 85 [82-88] (33) | 88 | 47 [46-49] | 28.3 (33) | - | 15 | 0 | BOWLBUG_NECTAR+BOWLBUG_ROCK |
| BYGONE_EFFIGY | elite | 127 (6) | 127 | 132 (33) | **133** | 132 | 26.4 (29) | - | 5 | 1 | BYGONE_EFFIGY |
| BYRDONIS | elite | 82.5 [81-84] (8) | 84 | 90 (23) | **88** | 90 | 22.5 (23) | - | 1 | 0 | BYRDONIS |
| CEREMONIAL_BEAST | boss | 252 (3) | 252 | 262 (27) | 262 | 262 | 29.1 (24) | **20** | 7 | 2 | boss CEREMONIAL_BEAST |
| CHOMPER | hallway | 123 [121-126] (8) | 126 | 130 [127-133] (41) | 130 | 65 [63-67] | 26 (40) | - | 4 | 4 | CHOMPER+CHOMPER |
| DECIMILLIPEDE | elite | 132 [126-132] (11) | 130 | 148 [144-150] (22) | 150 | 50 [46-52] | 29.6 (16) | 30 | 14 | 6 | DECIMILLIPEDE_SEGMENT_BACK+DECIMILLIPEDE_SEGMENT_FRONT+DECIMILLIPEDE_SEGMENT_MIDDLE |
| DEVOTED_SCULPTOR | hallway | 162 (7) | 162 | 172 (25) | 172 | 172 | 43 (23) | 40 | 2 | 2 | DEVOTED_SCULPTOR |
| ENTOMANCER | elite | 145 (7) | 145 | 165 (28) | 165 | 165 | 33 (23) | 33 | 12 | 5 | ENTOMANCER |
| EXOSKELETON | hallway | 104.5 [102-106] (14) | 104 | 111 [110-114] (35) | **109** | 28 [26-30] | 37 (35) | - | 1 | 0 | EXOSKELETON+EXOSKELETON+EXOSKELETON+EXOSKELETON |
| FABRICATOR | hallway | 150 (3) | 150 | 155 (7) | **158** | 155 | 38.8 (7) | - | 1 | 1 | FABRICATOR |
| FLAIL_KNIGHT | elite | 276 (2) | 276 | 294 (3) | **290** | 108 | 73.5 (3) | - | 1 | 0 | FLAIL_KNIGHT+MAGI_KNIGHT+SPECTRAL_KNIGHT |
| FLYCONID | hallway | 80 (4) | 49 | 87 [85-89] (26) | 51 | 52 [51-53] | 21.8 (26) | - | 1 | 1 | FLYCONID+SNAPPING_JAXFRUIT |
| FROG_KNIGHT | hallway | 191 (4) | 191 | 199 (5) | 199 | 199 | 33.2 (3) | 30 | 3 | 2 | FROG_KNIGHT |
| FUZZY_WURM_CRAWLER | hallway | 56 [55-57] (13) | 56 | 59 [58-59] (71) | 59 | 59 [58-59] | 19.7 (71) | - | 1 | 1 | FUZZY_WURM_CRAWLER |
| GLOBE_HEAD | hallway | 148 (3) | 148 | 158 (7) | **155** | 158 | 39.5 (7) | - | 0 | 0 | GLOBE_HEAD |
| HUNTER_KILLER | hallway | 121 (8) | 121 | 126 (42) | **127** | 126 | 31.5 (39) | **25** | 8 | 3 | HUNTER_KILLER |
| INFESTED_PRISM | elite | 161 (3) | 161 | 171 (21) | 171 | 171 | 34.2 (17) | 35 | 7 | 4 | INFESTED_PRISM |
| KAISER_CRAB | boss | 408 (8) | 408 | 428 (29) | 428 | - | 53.5 (7) | 54 | 42 | 17 | boss KAISER_CRAB |
| KNOWLEDGE_DEMON | boss | 379 (5) | 379 | 399 (30) | 399 | 399 | 44.3 (14) | 51 | 33 | 17 | boss KNOWLEDGE_DEMON |
| LAGAVULIN_MATRIARCH | boss | 222 (4) | 222 | 233 (27) | 233 | 233 | 24.5 (20) | **19** | 19 | 9 | boss LAGAVULIN_MATRIARCH |
| LOUSE_PROGENITOR | hallway | 134 [134-136] (7) | 134 | 139 [138-141] (34) | 141 | 139 [138-141] | 27.8 (32) | 25 | 4 | 2 | LOUSE_PROGENITOR |
| MECHA_KNIGHT | elite | 300 (5) | 300 | 320 (6) | **315** | 320 | 40 (5) | 33 | 4 | 2 | MECHA_KNIGHT |
| MYTE | hallway | 128.5 [123-133] (8) | 130 | 133 [129-137] (44) | 137 | 67 [64-69] | 33.2 (41) | - | 5 | 2 | MYTE+MYTE |
| OVICOPTER | hallway | 126 [124-129] (6) | **130** | 129 [126-132] (37) | **137** | 129 [126-132] | 32.2 (35) | - | 3 | 0 | OVICOPTER |
| OWL_MAGISTRATE | hallway | 231 (3) | 231 | 247 (6) | **243** | 247 | 49.4 (5) | 40 | 1 | 0 | OWL_MAGISTRATE |
| PHANTASMAL_GARDENER | elite | 116 [115-118] (8) | 116 | 118 [114-122] (26) | 122 | 29.5 [27-32] | 29.5 (25) | - | 4 | 2 | PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER |
| PHROG_PARASITE | elite | 138 [135-141] (8) | **142** | 147.5 [145-150] (26) | 149 | 67 [66-68] | 24.6 (26) | - | 1 | 1 | PHROG_PARASITE (with spawned bodies) |
| PUNCH_CONSTRUCT | hallway | 185 (1) | 185 | 200 (12) | **194** | 60 | 40 (12) | - | 2 | 2 | CUBEX_CONSTRUCT+CUBEX_CONSTRUCT+PUNCH_CONSTRUCT |
| QUEEN | boss | 599 (2) | 599 | 630 (10) | **629** | 419 | 70 (2) | 69 | 13 | 5 | boss QUEEN |
| SKULKING_COLONY | elite | 75 (11) | 75 | 80 (23) | **79** | 80 | 16 (22) | **20** | 2 | 0 | SKULKING_COLONY |
| SLIMED_BERSERKER | hallway | 261 (2) | 261 | 281 (5) | 281 | 281 | 56.2 (4) | **40** | 1 | 1 | SLIMED_BERSERKER |
| SLUDGE_SPINNER | hallway | 38 [37-39] (17) | 38 | 41.5 [41-42] (68) | **40** | 41.5 [41-42] | 13.8 (68) | - | 1 | 1 | SLUDGE_SPINNER |
| SLUMBERING_BEETLE | hallway | 174 [172-176] (10) | 172 | 178 [176-182] (34) | 181 | 89 | 29.7 (31) | 30 | 13 | 7 | BOWLBUG_ROCK+BOWLBUG_SILK+SLUMBERING_BEETLE |
| SOUL_FYSH | boss | 211 (6) | 211 | 221 (26) | 221 | 221 | 20.1 (21) | **25** | 15 | 8 | boss SOUL_FYSH |
| SOUL_NEXUS | elite | 234 (1) | 234 | 254 (6) | **246** | 254 | 36.3 (3) | **45** | 4 | 1 | SOUL_NEXUS |
| SPINY_TOAD | hallway | 117 [116-119] (10) | 118 | 123 [121-124] (40) | 122 | 123 [121-124] | 30.8 (36) | - | 7 | 3 | SPINY_TOAD |
| TERROR_EEL | elite | 140 (8) | 140 | 150 (31) | 150 | 150 | 25 (30) | 30 | 3 | 1 | TERROR_EEL |
| TEST_SUBJECT | boss | 100 (3) | **600** | 111 (5) | **630** | 111 | 13.9 (2) | **43** | 11 | 7 | boss TEST_SUBJECT |
| THE_INSATIABLE | boss | 321 (6) | 321 | 341 (29) | 341 | 341 | 42.6 (11) | 49 | 27 | 6 | boss THE_INSATIABLE |
| THE_KIN | boss | 307 (7) | 307 | 324 (30) | **322** | - | 40.5 (20) | **31** | 17 | 4 | boss THE_KIN |
| THE_LOST | hallway | 199 (2) | 199 | 210 (11) | **209** | 99 | 42 (11) | - | 0 | 0 | THE_FORGOTTEN+THE_LOST |
| THE_OBSCURA | hallway | 123 (5) | 123 | 129 (43) | 129 | 129 | 32.2 (38) | 30 | 8 | 3 | THE_OBSCURA |
| THIEVING_HOPPER | hallway | 79 (14) | 79 | 84 (62) | 84 | 84 | 21 (62) | - | 0 | 0 | THIEVING_HOPPER |
| TUNNELER | hallway | 87 (17) | 87 | 92 (65) | **91** | 92 | 18.4 (65) | - | 1 | 1 | TUNNELER |
| VANTOM | boss | 173 (8) | 173 | 183 (27) | 183 | 183 | 22.9 (23) | 23 | 11 | 5 | boss VANTOM |
| WATERFALL_GIANT | boss | 240 (9) | 240 | 250 (33) | 250 | 250 | 26.3 (20) | 25 | 26 | 8 | boss WATERFALL_GIANT |

Dossier A8 HP outside the logged range in 20 of 48 logged entries: AXEBOT (hand 262 vs DB 79), BYGONE_EFFIGY (hand 133 vs DB 132), BYRDONIS (hand 88 vs DB 90), EXOSKELETON (hand 109 vs DB 111), FABRICATOR (hand 158 vs DB 155), FLAIL_KNIGHT (hand 290 vs DB 294), GLOBE_HEAD (hand 155 vs DB 158), HUNTER_KILLER (hand 127 vs DB 126), MECHA_KNIGHT (hand 315 vs DB 320), OVICOPTER (hand 137 vs DB 129), OWL_MAGISTRATE (hand 243 vs DB 247), PUNCH_CONSTRUCT (hand 194 vs DB 200), QUEEN (hand 629 vs DB 630), SKULKING_COLONY (hand 79 vs DB 80), SLUDGE_SPINNER (hand 40 vs DB 41.5), SOUL_NEXUS (hand 246 vs DB 254), TEST_SUBJECT (hand 630 vs DB 111), THE_KIN (hand 322 vs DB 324), THE_LOST (hand 209 vs DB 210), TUNNELER (hand 91 vs DB 92).

Dossier need_damage_per_turn more than 20% off what A8 winners dealt: CEREMONIAL_BEAST (hand 20 vs DB 29.1), HUNTER_KILLER (hand 25 vs DB 31.5), LAGAVULIN_MATRIARCH (hand 19 vs DB 24.5), SKULKING_COLONY (hand 20 vs DB 16), SLIMED_BERSERKER (hand 40 vs DB 56.2), SOUL_FYSH (hand 25 vs DB 20.1), SOUL_NEXUS (hand 45 vs DB 36.3), TEST_SUBJECT (hand 43 vs DB 13.9), THE_KIN (hand 31 vs DB 40.5).

## (c) move-model.json

move-model.json comes from the same logs (tools/build-move-model.py) but keys moves per (run, enemy index, id): an enemy met twice in a run mixes two fights, and the mod's index shifts when an enemy dies (Kin: the priest moves from index 2 to 1), which mixes enemies of the same id and drops turns. The DB keys per fight and tracks enemies across index shifts. Listed: enemies/moves in one and not the other, average shown damage (all ascensions) differing by more than max(2, 15%), and successors the move-model has that the DB never saw.

- enemies only in move-model: none; only in the DB: none
- moves differing: 0 enemies

Average shown attack damage (all ascensions, Strength included) differing:

| enemy | move | DB avg (n turns) | move-model avg |
|---|---|---|---|

Successors in move-model never seen per fight in the DB (0; mostly index-shift or cross-fight artefacts):


