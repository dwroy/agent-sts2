# Monster DB cross-check

DB: `src/knowledge/monster-db.json` from 7124 logged fights (2026-09-24T04:08:00.849Z .. 2026-10-04T16:09:03.920Z), fights by ascension {'0': 782, '1': 22, '2': 206, '3': 227, '4': 201, '5': 256, '6': 65, '7': 550, '8': 3376, '9': 1439}.
Regenerate: `python3 tools/build-monster-db.py && python3 tools/monster-db-check.py`.

Columns: DB value (n = fights), hand value, difference. `A<8` = the DB value at A7 (A0-A6 give the same max HP for every boss logged; A8 raises HP). Flagged (**bold**) when HP differs at all, or loss/turns/need differ by more than 20%.

## (a) boss-clock.ts `BOSSES`

| boss | DB HP A7 (n) | hand hp | DB HP A8 (n) | hand hpA8 | DB loss/turn p75 A8 (n) | hand lossPerTurn | DB won-fight turns p75 A8 (n) | hand scriptTurns | note |
|---|---|---|---|---|---|---|---|---|---|
| CEREMONIAL_BEAST | 252 (3) | 252 | 262 (32) | 262 | 5.7 (32) | 6.2 | 10 (29) | 12 |  |
| KAISER_CRAB | 408 (8) | 408 | 428 (46) | 428 | 11.1 (46) | 10 | 9 (17) | 8 |  |
| KNOWLEDGE_DEMON | 379 (5) | 379 | 399 (46) | 399 | 7.2 (46) | 6.3 | 9.5 (27) | 11 |  |
| LAGAVULIN_MATRIARCH | 222 (4) | 222 | 233 (38) | 233 | 5.9 (38) | 5.8 | 10 (31) | 12 |  |
| SOUL_FYSH | 211 (6) | 211 | 221 (38) | 221 | 5.1 (38) | 5.1 | 11 (33) | 12 |  |
| TEST_SUBJECT | 100 (3) | **600** | 111 (10) | **636** | 11.2 (10) | **7.5** | 8.5 (4) | **12** | hand hp = sum of 3 phases; DB = phase 1 (phases below) |
| THE_INSATIABLE | 321 (6) | 321 | 341 (42) | 341 | 8.9 (42) | 8.9 | 8 (19) | 8 |  |
| VANTOM | 173 (8) | 173 | 183 (38) | 183 | 6.6 (38) | 7.3 | 10 (34) | 11 |  |

Test Subject phases: hand A8 [111, 212, 313], A<8 [100, 200, 300]; DB (max_hp sequence of the one enemy, n fights): A0: 100 > 200 > 300 (n=2); A1: 100 > 200 > 300 (n=1); A2: 100 > 200 (n=1); A3: 100 > 200 > 300 (n=1); A5: 100 > 200 > 300 (n=1); A7: 100 > 200 > 300 (n=2), 100 > 200 (n=1); A8: 111 > 212 > 313 (n=6), 111 > 212 (n=3), 111 > 212 > 313 > 111 > 212 > 313 (n=1); A9: 111 > 212 (n=1), 111 > 212 > 313 > 111 > 212 > 313 > 111 > 212 > 313 > 111 > 212 > 313 > 111 > 212 > 313 > 111 > 212 > 313 (n=1), 111 > 212 > 313 > 111 > 212 > 313 (n=1), 111 > 212 > 313 > 111 > 212 > 111 > 212 > 111 > 212 > 111 > 212 > 313 > 111 > 212 > 313 (n=1). Phase 3 at A8 is still unlogged.

Loss/turn = (entry HP - HP at the end, all of it on a death) / our turns, 75th percentile over the A8 fights with a known outcome, as the boss-clock comment defines it. Won-fight turns = our turn count in A8 wins.

### Boss parts (DB, A7 / A8 median max HP, n instances)

- **AEONGLASS** — A7: AEONGLASS 512 (n=2, x1/fight); win 0 of 2, deaths 2 | A8: AEONGLASS 535 (n=13, x1/fight); win 0.5 of 13, deaths 7
- **CEREMONIAL_BEAST** — A7: CEREMONIAL_BEAST 252 (n=3, x1/fight); win 0.7 of 3, deaths 1 | A8: CEREMONIAL_BEAST 262 (n=32, x1/fight); win 0.9 of 32, deaths 3
- **KAISER_CRAB** — A7: CRUSHER 209 (n=8, x1/fight), ROCKET 199 (n=8, x1/fight); win 0.4 of 8, deaths 5 | A8: CRUSHER 219 (n=46, x1/fight), ROCKET 209 (n=46, x1/fight); win 0.4 of 46, deaths 29
- **KNOWLEDGE_DEMON** — A7: KNOWLEDGE_DEMON 379 (n=5, x1/fight); win 0.4 of 5, deaths 3 | A8: KNOWLEDGE_DEMON 399 (n=46, x1/fight); win 0.6 of 46, deaths 19
- **LAGAVULIN_MATRIARCH** — A7: LAGAVULIN_MATRIARCH 222 (n=4, x1/fight); win 0.8 of 4, deaths 1 | A8: LAGAVULIN_MATRIARCH 233 (n=38, x1/fight); win 0.8 of 38, deaths 7
- **QUEEN** — A7: QUEEN 400 (n=2, x1/fight), TORCH_HEAD_AMALGAM 199 (n=2, x1/fight); win 0.5 of 2, deaths 1 | A8: QUEEN 419 (n=22, x1/fight), TORCH_HEAD_AMALGAM 211 (n=22, x1/fight); win 0.1 of 22, deaths 19
- **SOUL_FYSH** — A7: SOUL_FYSH 211 (n=6, x1/fight); win 1 of 6, deaths 0 | A8: SOUL_FYSH 221 (n=38, x1/fight); win 0.9 of 38, deaths 5
- **TEST_SUBJECT** — A7: TEST_SUBJECT 100 (n=3, x1/fight); phases {'100 > 200 > 300 (TEST_SUBJECT)': 2, '100 > 200 (TEST_SUBJECT)': 1}; win 0 of 3, deaths 3 | A8: TEST_SUBJECT 111 (n=10, x1/fight); phases {'111 > 212 > 313 (TEST_SUBJECT)': 6, '111 > 212 (TEST_SUBJECT)': 3, '111 > 212 > 313 > 111 > 212 > 313 (TEST_SUBJECT)': 1}; win 0.4 of 10, deaths 6
- **THE_INSATIABLE** — A7: THE_INSATIABLE 321 (n=6, x1/fight); win 0.8 of 6, deaths 1 | A8: THE_INSATIABLE 341 (n=42, x1/fight); win 0.5 of 42, deaths 23
- **THE_KIN** — A7: KIN_FOLLOWER 58.5 (n=14, x2/fight), KIN_PRIEST 190 (n=7, x1/fight); win 0.6 of 7, deaths 3 | A8: KIN_FOLLOWER 62.5 (n=68, x2/fight), KIN_PRIEST 199 (n=34, x1/fight); win 0.7 of 34, deaths 10
- **VANTOM** — A7: VANTOM 173 (n=8, x1/fight); win 1 of 8, deaths 0 | A8: VANTOM 183 (n=38, x1/fight); win 0.9 of 38, deaths 4
- **WATERFALL_GIANT** — A7: WATERFALL_GIANT 240 (n=9, x1/fight); win 0.8 of 9, deaths 2 | A8: WATERFALL_GIANT 250 (n=43, x1/fight); win 0.6 of 43, deaths 16

## (b) enemy dossiers (git redesign-end:src/knowledge/enemy-dossiers.json)

The dossier file is not in the step1-bugfix tree (removed with the pre-ablation restore 910671b); the last committed version is compared.

HP: the dossier `hp` is the sum of all bodies for multi-body fights. DB: the median starting HP total of the logged encounter made only of the dossier's ids whose HP is closest to the hand value (with spawned bodies counted when that is closer; bosses: the boss summary); a hand value is flagged when it is outside the logged [min-max] of that total and outside the main body's own range. Need: the dossier's need_damage_per_turn vs the DB's A8 HP / median turns of the A8 wins (what the winning decks actually dealt a turn; not a clock). Deaths: dossier count (runs.jsonl, 157 runs at the time) vs DB deaths at all ascensions.

| dossier id | kind | DB HP A7 median [range] (n) | hand a7 | DB HP A8 median [range] (n) | hand a8 | DB main body A8 | DB A8 HP/won turns (n wins) | hand need | DB deaths (all asc) | hand deaths | encounter used |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AEONGLASS | boss | 512 (2) | 512 | 535 (13) | 535 | 535 | 71.3 (6) | 75 | 20 | 8 | boss AEONGLASS |
| AXEBOT | hallway | - (0) | 249 | 82 [76-85] (15) | **262** | 82 [76-85] | 13.7 (13) | - | 8 | 2 | AXEBOT |
| BOWLBUG_ROCK | hallway | 83 [81-85] (9) | 84 | 85 [82-88] (45) | 88 | 47 [46-49] | 28.3 (45) | - | 16 | 0 | BOWLBUG_NECTAR+BOWLBUG_ROCK |
| BYGONE_EFFIGY | elite | 127 (6) | 127 | 132 (45) | **133** | 132 | 26.4 (41) | - | 5 | 1 | BYGONE_EFFIGY |
| BYRDONIS | elite | 82.5 [81-84] (8) | 84 | 90 (34) | **88** | 90 | 22.5 (34) | - | 2 | 0 | BYRDONIS |
| CEREMONIAL_BEAST | boss | 252 (3) | 252 | 262 (32) | 262 | 262 | 29.1 (29) | **20** | 8 | 2 | boss CEREMONIAL_BEAST |
| CHOMPER | hallway | 123 [121-126] (8) | 126 | 130 [127-133] (57) | 130 | 65 [63-67] | 26 (56) | - | 4 | 4 | CHOMPER+CHOMPER |
| DECIMILLIPEDE | elite | 132 [126-132] (11) | 130 | 150 [144-150] (37) | 150 | 50 [46-52] | 33.3 (30) | 30 | 15 | 6 | DECIMILLIPEDE_SEGMENT_BACK+DECIMILLIPEDE_SEGMENT_FRONT+DECIMILLIPEDE_SEGMENT_MIDDLE |
| DEVOTED_SCULPTOR | hallway | 162 (7) | 162 | 172 (46) | 172 | 172 | 43 (44) | 40 | 2 | 2 | DEVOTED_SCULPTOR |
| ENTOMANCER | elite | 145 (7) | 145 | 165 (46) | 165 | 165 | 33 (41) | 33 | 12 | 5 | ENTOMANCER |
| EXOSKELETON | hallway | 104.5 [102-106] (14) | 104 | 112 [110-114] (50) | **109** | 28 [26-30] | 28 (49) | - | 3 | 0 | EXOSKELETON+EXOSKELETON+EXOSKELETON+EXOSKELETON |
| FABRICATOR | hallway | 150 (3) | 150 | 155 (20) | **158** | 155 | 38.8 (19) | - | 2 | 1 | FABRICATOR |
| FLAIL_KNIGHT | elite | 276 (2) | 276 | 294 (11) | **290** | 108 | 65.3 (10) | - | 2 | 0 | FLAIL_KNIGHT+MAGI_KNIGHT+SPECTRAL_KNIGHT |
| FLYCONID | hallway | 80 (4) | 49 | 87 [85-89] (29) | 51 | 52 [51-53] | 21.8 (29) | - | 2 | 1 | FLYCONID+SNAPPING_JAXFRUIT |
| FROG_KNIGHT | hallway | 191 (4) | 191 | 199 (14) | 199 | 199 | 39.8 (12) | **30** | 4 | 2 | FROG_KNIGHT |
| FUZZY_WURM_CRAWLER | hallway | 56 [55-57] (13) | 56 | 59 [58-59] (85) | 59 | 59 [58-59] | 19.7 (85) | - | 1 | 1 | FUZZY_WURM_CRAWLER |
| GLOBE_HEAD | hallway | 148 (3) | 148 | 158 (16) | **155** | 158 | 39.5 (16) | - | 1 | 0 | GLOBE_HEAD |
| HUNTER_KILLER | hallway | 121 (8) | 121 | 126 (60) | **127** | 126 | 31.5 (57) | **25** | 8 | 3 | HUNTER_KILLER |
| INFESTED_PRISM | elite | 161 (3) | 161 | 171 (31) | 171 | 171 | 34.2 (27) | 35 | 7 | 4 | INFESTED_PRISM |
| KAISER_CRAB | boss | 408 (8) | 408 | 428 (46) | 428 | - | 53.5 (17) | 54 | 54 | 17 | boss KAISER_CRAB |
| KNOWLEDGE_DEMON | boss | 379 (5) | 379 | 399 (46) | 399 | 399 | 44.3 (27) | 51 | 40 | 17 | boss KNOWLEDGE_DEMON |
| LAGAVULIN_MATRIARCH | boss | 222 (4) | 222 | 233 (38) | 233 | 233 | 25.9 (31) | **19** | 20 | 9 | boss LAGAVULIN_MATRIARCH |
| LOUSE_PROGENITOR | hallway | 134 [134-136] (7) | 134 | 139 [138-141] (54) | 141 | 139 [138-141] | 27.8 (51) | 25 | 5 | 2 | LOUSE_PROGENITOR |
| MECHA_KNIGHT | elite | 300 (5) | 300 | 320 (12) | **315** | 320 | 53.3 (11) | **33** | 5 | 2 | MECHA_KNIGHT |
| MYTE | hallway | 128.5 [123-133] (8) | 130 | 133 [129-137] (59) | 137 | 67 [64-69] | 33.2 (56) | - | 5 | 2 | MYTE+MYTE |
| OVICOPTER | hallway | 126 [124-129] (6) | **130** | 129 [126-132] (48) | **137** | 129 [126-132] | 32.2 (46) | - | 3 | 0 | OVICOPTER |
| OWL_MAGISTRATE | hallway | 231 (3) | 231 | 247 (15) | **243** | 247 | 49.4 (13) | 40 | 4 | 0 | OWL_MAGISTRATE |
| PHANTASMAL_GARDENER | elite | 116 [115-118] (8) | 116 | 118 [114-122] (47) | 122 | 30 [27-32] | 23.6 (46) | - | 4 | 2 | PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER |
| PHROG_PARASITE | elite | 138 [135-141] (8) | **142** | 147 [145-150] (36) | 149 | 67 [66-68] | 22.6 (36) | - | 1 | 1 | PHROG_PARASITE (with spawned bodies) |
| PUNCH_CONSTRUCT | hallway | 185 (1) | 185 | 200 (20) | **194** | 60 | 50 (19) | - | 4 | 2 | CUBEX_CONSTRUCT+CUBEX_CONSTRUCT+PUNCH_CONSTRUCT |
| QUEEN | boss | 599 (2) | 599 | 630 (22) | **629** | 419 | 57.3 (3) | **69** | 26 | 5 | boss QUEEN |
| SKULKING_COLONY | elite | 75 (11) | 75 | 80 (42) | **79** | 80 | 16 (41) | **20** | 2 | 0 | SKULKING_COLONY |
| SLIMED_BERSERKER | hallway | 261 (2) | 261 | 281 (17) | 281 | 281 | 56.2 (16) | **40** | 2 | 1 | SLIMED_BERSERKER |
| SLUDGE_SPINNER | hallway | 38 [37-39] (17) | 38 | 41 [41-42] (93) | **40** | 41 [41-42] | 13.7 (93) | - | 1 | 1 | SLUDGE_SPINNER |
| SLUMBERING_BEETLE | hallway | 174 [172-176] (10) | 172 | 178.5 [176-182] (44) | 181 | 89 | 32.5 (40) | 30 | 14 | 7 | BOWLBUG_ROCK+BOWLBUG_SILK+SLUMBERING_BEETLE |
| SOUL_FYSH | boss | 211 (6) | 211 | 221 (38) | 221 | 221 | 24.6 (33) | 25 | 15 | 8 | boss SOUL_FYSH |
| SOUL_NEXUS | elite | 234 (1) | 234 | 254 (9) | **246** | 254 | 42.3 (5) | 45 | 8 | 1 | SOUL_NEXUS |
| SPINY_TOAD | hallway | 117 [116-119] (10) | 118 | 123 [121-124] (55) | 122 | 123 [121-124] | 30.8 (51) | - | 7 | 3 | SPINY_TOAD |
| TERROR_EEL | elite | 140 (8) | 140 | 150 (49) | 150 | 150 | 25 (48) | 30 | 3 | 1 | TERROR_EEL |
| TEST_SUBJECT | boss | 100 (3) | **600** | 111 (10) | **630** | 111 | 13.9 (4) | **43** | 16 | 7 | boss TEST_SUBJECT |
| THE_INSATIABLE | boss | 321 (6) | 321 | 341 (42) | 341 | 341 | 48.7 (19) | 49 | 35 | 6 | boss THE_INSATIABLE |
| THE_KIN | boss | 307 (7) | 307 | 324 (34) | **322** | - | 38.1 (24) | 31 | 18 | 4 | boss THE_KIN |
| THE_LOST | hallway | 199 (2) | 199 | 210 (19) | **209** | 99 | 42 (18) | - | 1 | 0 | THE_FORGOTTEN+THE_LOST |
| THE_OBSCURA | hallway | 123 (5) | 123 | 129 (60) | 129 | 129 | 32.2 (55) | 30 | 8 | 3 | THE_OBSCURA |
| THIEVING_HOPPER | hallway | 79 (14) | 79 | 84 (83) | 84 | 84 | 21 (83) | - | 0 | 0 | THIEVING_HOPPER |
| TUNNELER | hallway | 87 (17) | 87 | 92 (90) | **91** | 92 | 23 (90) | - | 1 | 1 | TUNNELER |
| VANTOM | boss | 173 (8) | 173 | 183 (38) | 183 | 183 | 22.9 (34) | 23 | 11 | 5 | boss VANTOM |
| WATERFALL_GIANT | boss | 240 (9) | 240 | 250 (43) | 250 | 250 | 27.8 (27) | 25 | 31 | 8 | boss WATERFALL_GIANT |

Dossier A8 HP outside the logged range in 20 of 48 logged entries: AXEBOT (hand 262 vs DB 82), BYGONE_EFFIGY (hand 133 vs DB 132), BYRDONIS (hand 88 vs DB 90), EXOSKELETON (hand 109 vs DB 112), FABRICATOR (hand 158 vs DB 155), FLAIL_KNIGHT (hand 290 vs DB 294), GLOBE_HEAD (hand 155 vs DB 158), HUNTER_KILLER (hand 127 vs DB 126), MECHA_KNIGHT (hand 315 vs DB 320), OVICOPTER (hand 137 vs DB 129), OWL_MAGISTRATE (hand 243 vs DB 247), PUNCH_CONSTRUCT (hand 194 vs DB 200), QUEEN (hand 629 vs DB 630), SKULKING_COLONY (hand 79 vs DB 80), SLUDGE_SPINNER (hand 40 vs DB 41), SOUL_NEXUS (hand 246 vs DB 254), TEST_SUBJECT (hand 630 vs DB 111), THE_KIN (hand 322 vs DB 324), THE_LOST (hand 209 vs DB 210), TUNNELER (hand 91 vs DB 92).

Dossier need_damage_per_turn more than 20% off what A8 winners dealt: CEREMONIAL_BEAST (hand 20 vs DB 29.1), FROG_KNIGHT (hand 30 vs DB 39.8), HUNTER_KILLER (hand 25 vs DB 31.5), LAGAVULIN_MATRIARCH (hand 19 vs DB 25.9), MECHA_KNIGHT (hand 33 vs DB 53.3), QUEEN (hand 69 vs DB 57.3), SKULKING_COLONY (hand 20 vs DB 16), SLIMED_BERSERKER (hand 40 vs DB 56.2), TEST_SUBJECT (hand 43 vs DB 13.9).

## (c) move-model.json

move-model.json comes from the same logs (tools/build-move-model.py) but keys moves per (run, enemy index, id): an enemy met twice in a run mixes two fights, and the mod's index shifts when an enemy dies (Kin: the priest moves from index 2 to 1), which mixes enemies of the same id and drops turns. The DB keys per fight and tracks enemies across index shifts. Listed: enemies/moves in one and not the other, average shown damage (all ascensions) differing by more than max(2, 15%), and successors the move-model has that the DB never saw.

- enemies only in move-model: none; only in the DB: none
- moves differing: 0 enemies

Average shown attack damage (all ascensions, Strength included) differing:

| enemy | move | DB avg (n turns) | move-model avg |
|---|---|---|---|

Successors in move-model never seen per fight in the DB (0; mostly index-shift or cross-fight artefacts):


## (d) observed mechanics (`observed`)

| power | strips (fights) | move after | stunned | attack cancelled | attack landed | co-removed | stun rule | monsters |
|---|---|---|---|---|---|---|---|---|
| VULNERABLE_POWER | 282 (112) | ABOUT_TO_BLOW_MOVE 46, BOOT_UP_MOVE 41, PRECISION_BEAM_MOVE 13 | 0 | 72/225 | 57/148 | WEAK_POWER 65, STRENGTH_POWER 29, STOCK_POWER 21, SHRINK_POWER 1, CRAB_RAGE_POWER 1, PIERCING_WAIL_POWER 1 | no | WATERFALL_GIANT 69, AXEBOT 43, CRUSHER 35 |
| SLIPPERY_POWER | 270 (145) | JAB_MOVE 96, WHIRLWIND_MOVE 70, PIERCING_GAZE_MOVE 32 | 0 | 0/153 | 51/55 | - | no | INKLET 198, VANTOM 72 |
| ARTIFACT_POWER | 174 (149) | READY_MOVE 29, CHARGE_UP_MOVE 25, SCREECH_MOVE 18 | 0 | 0/69 | 36/46 | - | no | CUBEX_CONSTRUCT 54, PUNCH_CONSTRUCT 54, CHOMPER 32 |
| STRENGTH_POWER | 166 (130) | STUNNED 57, BOOT_UP_MOVE 35, ABOUT_TO_BLOW_MOVE 10 | 57 | 98/139 | 10/131 | PLOW_POWER 57, STOCK_POWER 31, VULNERABLE_POWER 29, WEAK_POWER 3, DEMISE_POWER 2, INTANGIBLE_POWER 1 | no | CEREMONIAL_BEAST 57, AXEBOT 36, TEST_SUBJECT 11 |
| BURROWED_POWER | 143 (140) | STUNNED 143 | 143 | 121/121 | 1/114 | - | **yes** | TUNNELER 143 |
| CURL_UP_POWER | 114 (114) | WEB_CANNON_MOVE 108, CURL_AND_GROW_MOVE 6 | 0 | 0/108 | 45/58 | - | no | LOUSE_PROGENITOR 114 |
| WEAK_POWER | 105 (32) | ORB_OF_FRAILTY_MOVE 10, BOOT_UP_MOVE 9, PRECISION_BEAM_MOVE 9 | 0 | 9/85 | 12/29 | VULNERABLE_POWER 65, STRANGLE_POWER 7, POISON_POWER 6, STOCK_POWER 4, STRENGTH_POWER 3, STEAM_ERUPTION_POWER 1 | no | KIN_PRIEST 16, ROCKET 15, THE_INSATIABLE 13 |
| SHRIEK_POWER | 97 (97) | STUNNED 97 | 97 | 96/96 | 0/95 | - | **yes** | TERROR_EEL 97 |
| ASLEEP_POWER | 72 (67) | STUNNED 72 | 72 | 0/0 | 0/0 | PLATING_POWER 72 | **yes** | LAGAVULIN_MATRIARCH 72 |
| PLATING_POWER | 72 (67) | STUNNED 72 | 72 | 0/0 | 0/0 | ASLEEP_POWER 72 | **yes** | LAGAVULIN_MATRIARCH 72 |
| PLOW_POWER | 61 (57) | STUNNED 61 | 61 | 57/61 | 1/61 | STRENGTH_POWER 57 | **yes** | CEREMONIAL_BEAST 61 |
| FLUTTER_POWER | 46 (46) | STUNNED 46 | 46 | 12/12 | 0/11 | - | **yes** | THIEVING_HOPPER 46 |
| CRAB_RAGE_POWER | 39 (35) | ENLARGING_STRIKE_MOVE 13, ADAPT_MOVE 9, TARGETING_RETICLE_MOVE 4 | 0 | 0/26 | 14/16 | VULNERABLE_POWER 1 | no | CRUSHER 29, ROCKET 10 |
| POISON_POWER | 35 (4) | POWER_DANCE_MOVE 6, BOOMERANG_MOVE 5, QUICK_SLASH_MOVE 4 | 0 | 0/22 | 3/9 | WEAK_POWER 6, STRANGLE_POWER 2, STOCK_POWER 1 | no | KIN_FOLLOWER 15, THE_INSATIABLE 11, KIN_PRIEST 8 |
| STOCK_POWER | 33 (33) | BOOT_UP_MOVE 33 | 0 | 30/30 | 2/29 | STRENGTH_POWER 31, VULNERABLE_POWER 21, WEAK_POWER 4, POISON_POWER 1 | no | AXEBOT 33 |
| SLUMBER_POWER | 18 (18) | STUNNED 18 | 18 | 0/0 | 0/0 | - | **yes** | SLUMBERING_BEETLE 18 |
| STRANGLE_POWER | 8 (1) | ORB_OF_FRAILTY_MOVE 5, BEAM_MOVE 2, RITUAL_MOVE 1 | 0 | 0/7 | 0/0 | WEAK_POWER 7, POISON_POWER 2 | no | KIN_PRIEST 8 |
| PIERCING_WAIL_POWER | 7 (3) | THRASH_MOVE 4, BURN_BRIGHT_FOR_ME_MOVE 2, PLOW_MOVE 1 | 0 | 0/5 | 1/5 | VULNERABLE_POWER 1 | no | THE_INSATIABLE 4, QUEEN 2, CEREMONIAL_BEAST 1 |
| DEMISE_POWER | 5 (1) | MULTI_CLAW_MOVE 3, BITE_MOVE 2 | 0 | 0/4 | 2/4 | STRENGTH_POWER 2 | no | TEST_SUBJECT 5 |
| MANGLE_POWER | 4 (2) | ONE_TWO_MOVE 3, MULTI_CLAW_MOVE 1 | 0 | 0/4 | 0/1 | - | no | AXEBOT 3, TEST_SUBJECT 1 |
| ADAPTABLE_POWER | 3 (2) | PHASE3_LACERATE_MOVE 3 | 0 | 0/0 | 0/0 | PAINFUL_STABS_POWER 3 | no | TEST_SUBJECT 3 |
| PAINFUL_STABS_POWER | 3 (2) | PHASE3_LACERATE_MOVE 3 | 0 | 0/0 | 0/0 | ADAPTABLE_POWER 3 | no | TEST_SUBJECT 3 |
| INTANGIBLE_POWER | 2 (2) | BIG_POUNCE 2 | 0 | 0/2 | 0/1 | STRENGTH_POWER 1 | no | TEST_SUBJECT 2 |
| STEAM_ERUPTION_POWER | 2 (2) | EXPLODE_MOVE 2 | 0 | 0/2 | 0/0 | WEAK_POWER 1 | no | WATERFALL_GIANT 2 |
| SHACKLING_POTION_POWER | 1 (1) | KNOWLEDGE_OVERWHELMING_MOVE 1 | 0 | 0/1 | 1/1 | - | no | KNOWLEDGE_DEMON 1 |
| SHRINK_POWER | 1 (1) | ABOUT_TO_BLOW_MOVE 1 | 0 | 1/1 | 0/1 | VULNERABLE_POWER 1 | no | WATERFALL_GIANT 1 |

## (e) move changes on a power's removal (`move_changed`, class B)

| monster | power | how | changed / n | to | next (after a change) | revived | move rule |
|---|---|---|---|---|---|---|---|
| AXEBOT | STOCK_POWER | removed | 31/33 | BOOT_UP_MOVE 31 | HAMMER_UPPERCUT_MOVE 30 | 33 | **yes** |
| AXEBOT | STRENGTH_POWER | removed | 35/36 | BOOT_UP_MOVE 35 | HAMMER_UPPERCUT_MOVE 34 | 35 | **yes** |
| AXEBOT | VULNERABLE_POWER | removed | 40/43 | BOOT_UP_MOVE 40 | HAMMER_UPPERCUT_MOVE 40 | 42 | **yes** |
| AXEBOT | WEAK_POWER | removed | 7/9 | BOOT_UP_MOVE 7 | HAMMER_UPPERCUT_MOVE 7 | 9 | no |
| AXEBOT | STOCK_POWER | lowered | 34/34 | BOOT_UP_MOVE 34 | HAMMER_UPPERCUT_MOVE 34 | 34 | **yes** |
| AXEBOT | VULNERABLE_POWER | lowered | 1/1 | BOOT_UP_MOVE 1 | HAMMER_UPPERCUT_MOVE 1 | 1 | no |
| CEREMONIAL_BEAST | PLOW_POWER | removed | 61/61 | STUNNED 61 | BEAST_CRY_MOVE 61 | 0 | no |
| CEREMONIAL_BEAST | STRENGTH_POWER | removed | 57/57 | STUNNED 57 | BEAST_CRY_MOVE 57 | 0 | no |
| CEREMONIAL_BEAST | WEAK_POWER | removed | 1/7 | PLOW_MOVE 1 | BEAST_CRY_MOVE 1 | 5 | no |
| DECIMILLIPEDE_SEGMENT_MIDDLE | STRENGTH_POWER | removed | 1/1 | BULK_MOVE 1 | - | 1 | no |
| LAGAVULIN_MATRIARCH | ASLEEP_POWER | removed | 72/72 | STUNNED 72 | SLASH_MOVE 72 | 0 | no |
| LAGAVULIN_MATRIARCH | PLATING_POWER | removed | 72/72 | STUNNED 72 | SLASH_MOVE 72 | 0 | no |
| QUEEN | VULNERABLE_POWER | removed | 1/3 | BURN_BRIGHT_FOR_ME_MOVE 1 | - | 3 | no |
| QUEEN | STRENGTH_POWER | lowered | 1/2 | ENRAGE_MOVE 1 | BURN_BRIGHT_FOR_ME_MOVE 1 | 0 | no |
| SLUMBERING_BEETLE | SLUMBER_POWER | removed | 18/18 | STUNNED 18 | ROLL_OUT_MOVE 18 | 0 | no |
| TERROR_EEL | SHRIEK_POWER | removed | 97/97 | STUNNED 97 | TERROR_MOVE 96 | 0 | no |
| TEST_SUBJECT | ADAPTABLE_POWER | removed | 3/3 | PHASE3_LACERATE_MOVE 3 | PHASE3_LACERATE_MOVE 2, MULTI_CLAW_MOVE 1 | 3 | no |
| TEST_SUBJECT | INTANGIBLE_POWER | removed | 2/2 | BIG_POUNCE 2 | PHASE3_LACERATE_MOVE 1, BIG_POUNCE 1 | 0 | no |
| TEST_SUBJECT | PAINFUL_STABS_POWER | removed | 3/3 | PHASE3_LACERATE_MOVE 3 | PHASE3_LACERATE_MOVE 2, MULTI_CLAW_MOVE 1 | 3 | no |
| TEST_SUBJECT | STRENGTH_POWER | removed | 1/11 | BIG_POUNCE 1 | BIG_POUNCE 1 | 8 | no |
| TEST_SUBJECT | VULNERABLE_POWER | removed | 1/11 | BURNING_GROWL_MOVE 1 | PHASE3_LACERATE_MOVE 1 | 10 | no |
| THIEVING_HOPPER | FLUTTER_POWER | removed | 46/46 | STUNNED 46 | ESCAPE_MOVE 19, NAB_MOVE 3 | 0 | no |
| TUNNELER | BURROWED_POWER | removed | 143/143 | STUNNED 143 | BITE_MOVE 115 | 0 | no |
| WATERFALL_GIANT | SHRINK_POWER | removed | 1/1 | ABOUT_TO_BLOW_MOVE 1 | EXPLODE_MOVE 1 | 1 | no |
| WATERFALL_GIANT | STEAM_ERUPTION_POWER | removed | 2/2 | EXPLODE_MOVE 2 | PRESSURE_UP_MOVE 1, STOMP_MOVE 1 | 2 | no |
| WATERFALL_GIANT | STRENGTH_POWER | removed | 10/10 | ABOUT_TO_BLOW_MOVE 10 | EXPLODE_MOVE 10 | 10 | **yes** |
| WATERFALL_GIANT | VULNERABLE_POWER | removed | 46/69 | ABOUT_TO_BLOW_MOVE 46 | EXPLODE_MOVE 42, PRESSURE_UP_MOVE 4 | 63 | no |
| WATERFALL_GIANT | WEAK_POWER | removed | 4/7 | ABOUT_TO_BLOW_MOVE 3, EXPLODE_MOVE 1 | EXPLODE_MOVE 2, PRESSURE_GUN_MOVE 1 | 7 | no |

## (f) a survivor's move when an ally dies (`ally_deaths`, class D)

| survivor | ally | deaths (fights) | same-frame changes | next turn / n | turns beside a living ally | death's own moves | rule |
|---|---|---|---|---|---|---|---|
| AXE_RUBY_RAIDER | ASSASSIN_RUBY_RAIDER | 20 (20) | - | SWING_2 11, BIG_SWING 8 / 20 | 35 | - | no |
| AXE_RUBY_RAIDER | BRUTE_RUBY_RAIDER | 5 (5) | - | SWING_2 3, SWING_1 2 / 5 | 43 | - | no |
| AXE_RUBY_RAIDER | CROSSBOW_RUBY_RAIDER | 9 (9) | - | BIG_SWING 7, SWING_2 2 / 9 | 29 | - | no |
| AXE_RUBY_RAIDER | TRACKER_RUBY_RAIDER | 11 (11) | - | BIG_SWING 5, SWING_1 4 / 11 | 42 | - | no |
| BOWLBUG_EGG | BOWLBUG_NECTAR | 6 (6) | - | BITE_MOVE 6 / 6 | 46 | - | no |
| BOWLBUG_EGG | BOWLBUG_ROCK | 36 (36) | - | BITE_MOVE 32 / 32 | 246 | - | no |
| BOWLBUG_EGG | BOWLBUG_SILK | 3 (3) | - | BITE_MOVE 2 / 2 | 55 | - | no |
| BOWLBUG_NECTAR | BOWLBUG_EGG | 19 (19) | - | BUFF_MOVE 15, THRASH2_MOVE 3 / 18 | 46 | - | no |
| BOWLBUG_NECTAR | BOWLBUG_ROCK | 75 (75) | - | THRASH2_MOVE 33, BUFF_MOVE 24 / 57 | 311 | - | no |
| BOWLBUG_NECTAR | BOWLBUG_SILK | 7 (7) | - | THRASH2_MOVE 5 / 5 | 79 | - | no |
| BOWLBUG_ROCK | BOWLBUG_EGG | 106 (106) | - | HEADBUTT_MOVE 90, STUNNED 12 / 102 | 246 | - | no |
| BOWLBUG_ROCK | BOWLBUG_NECTAR | 54 (54) | - | HEADBUTT_MOVE 46, STUNNED 4 / 50 | 311 | - | no |
| BOWLBUG_ROCK | BOWLBUG_SILK | 24 (24) | - | HEADBUTT_MOVE 16, STUNNED 2 / 18 | 420 | - | no |
| BOWLBUG_ROCK | SLUMBERING_BEETLE | 3 (3) | - | HEADBUTT_MOVE 3 / 3 | 261 | - | no |
| BOWLBUG_SILK | BOWLBUG_EGG | 28 (28) | - | THRASH_MOVE 19, TOXIC_SPIT_MOVE 9 / 28 | 55 | - | no |
| BOWLBUG_SILK | BOWLBUG_NECTAR | 19 (19) | - | THRASH_MOVE 14, TOXIC_SPIT_MOVE 3 / 17 | 79 | - | no |
| BOWLBUG_SILK | BOWLBUG_ROCK | 119 (119) | - | THRASH_MOVE 61, TOXIC_SPIT_MOVE 43 / 104 | 420 | - | no |
| BOWLBUG_SILK | SLUMBERING_BEETLE | 6 (6) | - | THRASH_MOVE 4, TOXIC_SPIT_MOVE 1 / 5 | 361 | - | no |
| BRUTE_RUBY_RAIDER | ASSASSIN_RUBY_RAIDER | 18 (18) | - | ROAR_MOVE 9, BEAT_MOVE 8 / 17 | 31 | - | no |
| BRUTE_RUBY_RAIDER | AXE_RUBY_RAIDER | 10 (10) | - | ROAR_MOVE 6, BEAT_MOVE 2 / 8 | 43 | - | no |
| BRUTE_RUBY_RAIDER | CROSSBOW_RUBY_RAIDER | 13 (13) | - | BEAT_MOVE 7, ROAR_MOVE 3 / 10 | 36 | - | no |
| BRUTE_RUBY_RAIDER | TRACKER_RUBY_RAIDER | 12 (12) | - | BEAT_MOVE 8, ROAR_MOVE 4 / 12 | 40 | - | no |
| CALCIFIED_CULTIST | SEAPUNK | 5 (5) | - | DARK_STRIKE_MOVE 5 / 5 | 188 | - | no |
| CHOMPER | CHOMPER | 105 (105) | - | CLAMP_MOVE 63, SCREECH_MOVE 23 / 86 | 708 | - | no |
| CORPSE_SLUG | CORPSE_SLUG | 405 (266) | GLOMP_MOVE: STUNNED 149 of 149; GOOP_MOVE: STUNNED 118 of 118; WHIP_SLAP_MOVE: STUNNED 135 of 135 | GLOMP_MOVE 140, WHIP_SLAP_MOVE 129 / 384 | 1611 | - | no |
| CROSSBOW_RUBY_RAIDER | ASSASSIN_RUBY_RAIDER | 12 (12) | - | FIRE_MOVE 12 / 12 | 23 | - | no |
| CROSSBOW_RUBY_RAIDER | AXE_RUBY_RAIDER | 3 (3) | - | FIRE_MOVE 3 / 3 | 29 | - | no |
| CROSSBOW_RUBY_RAIDER | BRUTE_RUBY_RAIDER | 3 (3) | - | FIRE_MOVE 2 / 2 | 36 | - | no |
| CROSSBOW_RUBY_RAIDER | TRACKER_RUBY_RAIDER | 7 (7) | - | RELOAD_MOVE 5, FIRE_MOVE 2 / 7 | 35 | - | no |
| CRUSHER | ROCKET | 27 (25) | - | BUG_STING_MOVE 12, GUARDED_STRIKE_MOVE 8 / 23 | 752 | - | no |
| CUBEX_CONSTRUCT | CUBEX_CONSTRUCT | 32 (32) | - | REPEATER_BLAST_MOVE_2 10, EXPEL_MOVE 9 / 23 | 224 | - | no |
| CUBEX_CONSTRUCT | PUNCH_CONSTRUCT | 17 (11) | - | EXPEL_MOVE 10, REPEATER_BLAST_MOVE 2 / 13 | 243 | - | no |
| DAMP_CULTIST | CALCIFIED_CULTIST | 86 (86) | - | DARK_STRIKE_MOVE 86 / 86 | 208 | - | no |
| DECIMILLIPEDE_SEGMENT_BACK | DECIMILLIPEDE_SEGMENT_FRONT | 40 (37) | - | WRITHE_MOVE 17, BULK_MOVE 12 / 32 | 269 | - | no |
| DECIMILLIPEDE_SEGMENT_BACK | DECIMILLIPEDE_SEGMENT_MIDDLE | 43 (33) | - | WRITHE_MOVE 24, BULK_MOVE 5 / 34 | 269 | - | no |
| DECIMILLIPEDE_SEGMENT_FRONT | DECIMILLIPEDE_SEGMENT_BACK | 36 (32) | - | WRITHE_MOVE 21, CONSTRICT_MOVE 7 / 29 | 269 | - | no |
| DECIMILLIPEDE_SEGMENT_FRONT | DECIMILLIPEDE_SEGMENT_MIDDLE | 33 (28) | - | BULK_MOVE 12, WRITHE_MOVE 8 / 27 | 267 | - | no |
| DECIMILLIPEDE_SEGMENT_MIDDLE | DECIMILLIPEDE_SEGMENT_BACK | 35 (34) | - | BULK_MOVE 17, WRITHE_MOVE 7 / 27 | 269 | - | no |
| DECIMILLIPEDE_SEGMENT_MIDDLE | DECIMILLIPEDE_SEGMENT_FRONT | 42 (37) | - | WRITHE_MOVE 12, CONSTRICT_MOVE 12 / 30 | 267 | - | no |
| EXOSKELETON | EXOSKELETON | 1005 (274) | - | MANDIBLES_MOVE 348, ENRAGE_MOVE 274 / 833 | 2504 | - | no |
| FABRICATOR | GUARDBOT | 14 (10) | - | FABRICATE_MOVE 5, FABRICATING_STRIKE_MOVE 2 / 7 | 35 | - | no |
| FABRICATOR | NOISEBOT | 15 (13) | - | FABRICATE_MOVE 7, FABRICATING_STRIKE_MOVE 5 / 12 | 42 | - | no |
| FABRICATOR | STABBOT | 35 (26) | - | FABRICATE_MOVE 18, FABRICATING_STRIKE_MOVE 9 / 28 | 56 | - | no |
| FABRICATOR | ZAPBOT | 38 (27) | - | FABRICATE_MOVE 12, FABRICATING_STRIKE_MOVE 10 / 27 | 56 | - | no |
| FAT_GREMLIN | SNEAKY_GREMLIN | 61 (61) | - | FLEE_MOVE 9 / 9 | 75 | - | no |
| FLAIL_KNIGHT | MAGI_KNIGHT | 3 (3) | - | WAR_CHANT 2, FLAIL_MOVE 1 / 3 | 92 | - | no |
| FLYCONID | LEAF_SLIME_M | 14 (14) | - | VULNERABLE_SPORES_MOVE 5, SMASH_MOVE 5 / 13 | 58 | - | no |
| FLYCONID | SNAPPING_JAXFRUIT | 55 (55) | - | SMASH_MOVE 26, VULNERABLE_SPORES_MOVE 18 / 54 | 130 | - | no |
| FLYCONID | TWIG_SLIME_M | 18 (18) | - | VULNERABLE_SPORES_MOVE 6, SMASH_MOVE 6 / 17 | 43 | - | no |
| FOGMOG | EYE_WITH_TEETH | 52 (36) | - | HEADBUTT_MOVE 12, SWIPE_MOVE 9 / 28 | 160 | - | no |
| FUZZY_WURM_CRAWLER | SHRINKER_BEETLE | 41 (41) | - | ACID_GOOP 16, FIRST_ACID_GOOP 16 / 41 | 154 | - | no |
| GUARDBOT | STABBOT | 11 (6) | - | GUARD_MOVE 5 / 5 | 27 | - | no |
| GUARDBOT | ZAPBOT | 13 (11) | - | GUARD_MOVE 7 / 7 | 19 | - | no |
| INKLET | INKLET | 208 (74) | - | JAB_MOVE 61, WHIRLWIND_MOVE 60 / 178 | 474 | - | no |
| KIN_FOLLOWER | KIN_FOLLOWER | 50 (50) | - | POWER_DANCE_MOVE 21, QUICK_SLASH_MOVE 15 / 45 | 798 | - | no |
| KIN_PRIEST | KIN_FOLLOWER | 100 (55) | - | ORB_OF_FRAILTY_MOVE 28, ORB_OF_WEAKNESS_MOVE 27 / 96 | 506 | - | no |
| LEAF_SLIME_M | FLYCONID | 8 (8) | - | CLUMP_SHOT 7 / 7 | 58 | - | no |
| LEAF_SLIME_M | LEAF_SLIME_S | 111 (111) | - | CLUMP_SHOT 57, STICKY_SHOT 50 / 107 | 343 | - | no |
| LEAF_SLIME_M | SLITHERING_STRANGLER | 4 (4) | - | CLUMP_SHOT 2, STICKY_SHOT 2 / 4 | 13 | - | no |
| LEAF_SLIME_M | TWIG_SLIME_M | 53 (53) | - | STICKY_SHOT 40, CLUMP_SHOT 9 / 49 | 138 | - | no |
| LEAF_SLIME_M | TWIG_SLIME_S | 137 (137) | - | CLUMP_SHOT 112, STICKY_SHOT 25 / 137 | 189 | - | no |
| LEAF_SLIME_S | LEAF_SLIME_M | 25 (25) | - | TACKLE_MOVE 9, GOOP_MOVE 9 / 18 | 343 | - | no |
| LEAF_SLIME_S | LEAF_SLIME_S | 3 (3) | - | TACKLE_MOVE 2, GOOP_MOVE 1 / 3 | 14 | - | no |
| LEAF_SLIME_S | SLITHERING_STRANGLER | 3 (2) | - | TACKLE_MOVE 2 / 2 | 20 | - | no |
| LEAF_SLIME_S | TWIG_SLIME_M | 74 (74) | - | TACKLE_MOVE 39, GOOP_MOVE 28 / 67 | 284 | - | no |
| LEAF_SLIME_S | TWIG_SLIME_S | 172 (172) | - | TACKLE_MOVE 80, GOOP_MOVE 79 / 159 | 297 | - | no |
| LIVING_FOG | GAS_BOMB | 81 (53) | - | BLOAT_MOVE 63 / 63 | 116 | - | no (next BLOAT_MOVE: its move table gives it already) |
| LIVING_SHIELD | TURRET_OPERATOR | 7 (7) | - | SMASH_MOVE 7 / 7 | 185 | SMASH_MOVE | **next SMASH_MOVE** |
| MAGI_KNIGHT | FLAIL_KNIGHT | 21 (21) | - | RAM_MOVE 8, MAGIC_BOMB 5 / 17 | 92 | - | no |
| MAGI_KNIGHT | SPECTRAL_KNIGHT | 15 (15) | - | RAM_MOVE 4, MAGIC_BOMB 3 / 8 | 113 | - | no |
| MYTE | MYTE | 104 (104) | - | TOXIC_MOVE 56, SUCK_MOVE 22 / 99 | 656 | - | no |
| NIBBIT | NIBBIT | 62 (62) | - | BUTT_MOVE 36, SLICE_MOVE 20 / 62 | 352 | - | no |
| NOISEBOT | STABBOT | 9 (7) | - | NOISE_MOVE 6 / 6 | 22 | - | no |
| NOISEBOT | ZAPBOT | 10 (7) | - | NOISE_MOVE 8 / 8 | 22 | - | no |
| OVICOPTER | TOUGH_EGG | 212 (84) | - | TENDERIZER_MOVE 77, LAY_EGGS_MOVE 65 / 170 | 316 | - | no |
| PHANTASMAL_GARDENER | PHANTASMAL_GARDENER | 511 (92) | - | BITE_MOVE 156, ENLARGE_MOVE 131 / 453 | 1419 | - | no |
| PUNCH_CONSTRUCT | CUBEX_CONSTRUCT | 48 (29) | - | STRONG_PUNCH_MOVE 21, READY_MOVE 11 / 41 | 137 | - | no |
| PUNCH_CONSTRUCT | PUNCH_CONSTRUCT | 7 (7) | STRONG_PUNCH_MOVE: FAST_PUNCH_MOVE 1 of 2 | STRONG_PUNCH_MOVE 4, FAST_PUNCH_MOVE 2 / 7 | 54 | - | no |
| QUEEN | TORCH_HEAD_AMALGAM | 26 (24) | BURN_BRIGHT_FOR_ME_MOVE: ENRAGE_MOVE 25 of 25 | OFF_WITH_YOUR_HEAD_MOVE 26 / 26 | 243 | ENRAGE_MOVE, OFF_WITH_YOUR_HEAD_MOVE | **now BURN_BRIGHT_FOR_ME_MOVE -> ENRAGE_MOVE; next OFF_WITH_YOUR_HEAD_MOVE** |
| ROCKET | CRUSHER | 10 (10) | - | PRECISION_BEAM_MOVE 4, TARGETING_RETICLE_MOVE 3 / 9 | 752 | - | no |
| SCROLL_OF_BITING | SCROLL_OF_BITING | 309 (94) | - | CHEW 135, CHOMP 47 / 221 | 661 | - | no |
| SEAPUNK | CALCIFIED_CULTIST | 73 (73) | - | BUBBLE_BURP_MOVE 38, SEA_KICK_MOVE 26 / 70 | 188 | - | no |
| SHRINKER_BEETLE | FUZZY_WURM_CRAWLER | 6 (6) | - | STOMP_MOVE 3, CHOMP_MOVE 3 / 6 | 154 | - | no |
| SLITHERING_STRANGLER | LEAF_SLIME_S | 7 (5) | - | CONSTRICT 4, LASH 1 / 6 | 13 | - | no |
| SLITHERING_STRANGLER | SNAPPING_JAXFRUIT | 20 (20) | - | CONSTRICT 11, THWACK 5 / 20 | 43 | - | no |
| SLITHERING_STRANGLER | TWIG_SLIME_M | 16 (16) | - | CONSTRICT 9, LASH 4 / 15 | 31 | - | no |
| SLITHERING_STRANGLER | TWIG_SLIME_S | 11 (7) | - | THWACK 7, LASH 3 / 11 | 8 | - | no |
| SLUMBERING_BEETLE | BOWLBUG_ROCK | 92 (92) | SNORE_MOVE: STUNNED 3 of 71 | ROLL_OUT_MOVE 57, SNORE_MOVE 33 / 90 | 261 | - | no |
| SLUMBERING_BEETLE | BOWLBUG_SILK | 82 (82) | SNORE_MOVE: STUNNED 2 of 35 | ROLL_OUT_MOVE 68, SNORE_MOVE 8 / 76 | 361 | - | no |
| SNAPPING_JAXFRUIT | FLYCONID | 3 (3) | - | ENERGY_ORB_MOVE 3 / 3 | 130 | - | no |
| SNEAKY_GREMLIN | FAT_GREMLIN | 4 (4) | - | TACKLE_MOVE 1 / 1 | 75 | - | no |
| SPECTRAL_KNIGHT | FLAIL_KNIGHT | 20 (20) | - | SOUL_SLASH 10, SOUL_FLAME 6 / 16 | 97 | - | no |
| SPECTRAL_KNIGHT | MAGI_KNIGHT | 8 (8) | - | SOUL_SLASH 3, SOUL_FLAME 2 / 5 | 113 | - | no |
| STABBOT | STABBOT | 3 (3) | - | STAB_MOVE 2 / 2 | 10 | - | no |
| STABBOT | ZAPBOT | 3 (3) | - | STAB_MOVE 1 / 1 | 12 | - | no |
| THE_FORGOTTEN | THE_LOST | 25 (25) | - | DREAD 14, MIASMA 9 / 23 | 105 | - | no |
| THE_LOST | THE_FORGOTTEN | 7 (7) | - | DEBILITATING_SMOG 4, EYE_LASERS 3 / 7 | 105 | - | no |
| THE_OBSCURA | PARAFRIGHT | 240 (95) | - | SAIL_MOVE 75, PIERCING_GAZE_MOVE 73 / 215 | 460 | - | no |
| TOADPOLE | TOADPOLE | 189 (189) | - | SPIKE_SPIT_MOVE 142, WHIRL_MOVE 22 / 182 | 774 | - | no |
| TOUGH_EGG | TOUGH_EGG | 184 (64) | - | NIBBLE_MOVE 95, HATCH_MOVE 6 / 101 | 875 | - | no |
| TRACKER_RUBY_RAIDER | ASSASSIN_RUBY_RAIDER | 20 (20) | - | HOUNDS_MOVE 19 / 19 | 32 | - | no |
| TRACKER_RUBY_RAIDER | AXE_RUBY_RAIDER | 8 (8) | - | HOUNDS_MOVE 7 / 7 | 42 | - | no |
| TRACKER_RUBY_RAIDER | CROSSBOW_RUBY_RAIDER | 9 (9) | - | HOUNDS_MOVE 8 / 8 | 35 | - | no |
| TURRET_OPERATOR | LIVING_SHIELD | 68 (68) | - | RELOAD_MOVE 30, UNLOAD_MOVE_2 23 / 61 | 185 | - | no |
| TWIG_SLIME_M | FLYCONID | 5 (5) | - | POKEY_POUNCE_MOVE 5 / 5 | 43 | - | no |
| TWIG_SLIME_M | LEAF_SLIME_M | 3 (3) | - | POKEY_POUNCE_MOVE 1 / 1 | 138 | - | no |
| TWIG_SLIME_M | LEAF_SLIME_S | 60 (60) | - | POKEY_POUNCE_MOVE 46, STICKY_SHOT_MOVE 12 / 58 | 284 | - | no |
| TWIG_SLIME_M | TWIG_SLIME_S | 106 (106) | - | POKEY_POUNCE_MOVE 101, STICKY_SHOT_MOVE 3 / 104 | 185 | - | no |
| TWIG_SLIME_S | LEAF_SLIME_M | 3 (3) | - | TACKLE_MOVE 3 / 3 | 189 | - | no |
| TWIG_SLIME_S | LEAF_SLIME_S | 33 (33) | - | TACKLE_MOVE 21 / 21 | 297 | - | no |
| TWIG_SLIME_S | TWIG_SLIME_M | 22 (22) | - | TACKLE_MOVE 19 / 19 | 185 | - | no |
| TWO_TAILED_RAT | TWO_TAILED_RAT | 218 (66) | - | SCRATCH_MOVE 58, DISEASE_BITE_MOVE 52 / 195 | 502 | - | no |
| WRIGGLER | WRIGGLER | 530 (96) | - | NASTY_BITE_MOVE 298, WRIGGLE_MOVE 157 / 455 | 997 | - | no |

