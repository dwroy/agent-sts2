# Monster DB cross-check

DB: `src/knowledge/monster-db.json` from 8404 logged fights (2026-09-24T04:08:00.849Z .. 2026-10-07T02:44:05.789Z), fights by ascension {'0': 860, '1': 66, '2': 245, '3': 249, '4': 278, '5': 275, '6': 249, '7': 683, '8': 3401, '9': 1487, '10': 611}.
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

Test Subject phases: hand A8 [111, 212, 313], A<8 [100, 200, 300]; DB (max_hp sequence of the one enemy, n fights): A0: 100 > 200 > 300 (n=2), 100 > 200 > 100 > 200 > 100 > 200 > 100 > 200 > 100 > 200 > 100 > 200 > 300 (n=1), 100 > 200 > 100 > 200 > 100 (n=1), 100 > 200 > 300 > 100 > 200 > 300 (n=1); A1: 100 > 200 > 300 (n=1); A2: 100 > 200 (n=1); A3: 100 > 200 > 300 (n=2); A5: 100 > 200 > 300 (n=1); A6: 100 > 200 > 300 > 100 > 200 > 300 > 100 > 200 > 300 > 100 > 200 > 100 > 200 > 100 > 200 (n=1), 100 > 200 > 100 > 200 > 100 > 200 (n=1); A7: 100 > 200 > 300 (n=2), 100 > 200 (n=1); A8: 111 > 212 > 313 (n=6), 111 > 212 (n=3), 111 > 212 > 313 > 111 > 212 > 313 (n=1); A9: 111 > 212 (n=1), 111 > 212 > 313 > 111 > 212 > 313 > 111 > 212 > 313 > 111 > 212 > 313 > 111 > 212 > 313 > 111 > 212 > 313 (n=1), 111 > 212 > 313 > 111 > 212 > 313 (n=1), 111 > 212 > 313 > 111 > 212 > 111 > 212 > 111 > 212 > 111 > 212 > 313 > 111 > 212 > 313 (n=1); A10: 111 > 212 > 111 > 212 > 111 > 212 > 111 > 212 > 111 > 212 > 111 > 212 (n=2), 111 > 212 > 111 > 212 > 111 > 212 > 111 > 212 > 313 (n=1), 111 > 212 > 111 > 212 > 313 (n=1), 111 > 212 > 111 > 212 > 111 > 212 (n=1), 111 > 212 > 111 (n=1). Phase 3 at A8 is still unlogged.

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
| WEAK_POWER | 742 (119) | MULTI_CLAW_MOVE 33, PLOW_MOVE 32, BITE_MOVE 29 | 0 | 15/548 | 170/286 | POISON_POWER 117, VULNERABLE_POWER 98, STRENGTH_POWER 26, STRANGLE_POWER 22, PIERCING_WAIL_POWER 17, STOCK_POWER 5, DARK_SHACKLES_POWER 5, STEAM_ERUPTION_POWER 3, ENRAGE_POWER 3, PAINFUL_STABS_POWER 2, ADAPTABLE_POWER 1 | no | LAGAVULIN_MATRIARCH 91, WATERFALL_GIANT 85, TEST_SUBJECT 76 |
| STRENGTH_POWER | 403 (258) | STUNNED 76, BITE_MOVE 44, BOOT_UP_MOVE 37 | 76 | 138/362 | 60/290 | PLOW_POWER 76, STOCK_POWER 33, VULNERABLE_POWER 30, WEAK_POWER 26, POISON_POWER 20, ENRAGE_POWER 4, STRANGLE_POWER 3, DEMISE_POWER 2, INTANGIBLE_POWER 1 | no | CEREMONIAL_BEAST 83, TEST_SUBJECT 55, AXEBOT 42 |
| VULNERABLE_POWER | 376 (138) | ABOUT_TO_BLOW_MOVE 46, BOOT_UP_MOVE 45, THRASH_MOVE 20 | 0 | 76/298 | 71/169 | WEAK_POWER 98, STRENGTH_POWER 30, STOCK_POWER 22, POISON_POWER 20, PIERCING_WAIL_POWER 5, SHRINK_POWER 1, CRAB_RAGE_POWER 1 | no | WATERFALL_GIANT 69, CRUSHER 50, AXEBOT 48 |
| POISON_POWER | 354 (82) | EYE_LASERS_MOVE 23, BITE_MOVE 17, THRASH_MOVE 16 | 0 | 8/225 | 74/115 | WEAK_POWER 117, VULNERABLE_POWER 20, STRENGTH_POWER 20, PIERCING_WAIL_POWER 18, STRANGLE_POWER 9, STOCK_POWER 2, ENRAGE_POWER 2, STEAM_ERUPTION_POWER 1, NEMESIS_POWER 1 | no | AEONGLASS 47, ROCKET 36, TEST_SUBJECT 33 |
| SLIPPERY_POWER | 295 (158) | JAB_MOVE 102, WHIRLWIND_MOVE 79, PIERCING_GAZE_MOVE 35 | 0 | 0/171 | 56/62 | - | no | INKLET 216, VANTOM 79 |
| ARTIFACT_POWER | 285 (206) | READY_MOVE 43, CHARGE_UP_MOVE 41, SCREECH_MOVE 32 | 0 | 0/125 | 64/84 | - | no | CUBEX_CONSTRUCT 74, PUNCH_CONSTRUCT 74, AEONGLASS 71 |
| BURROWED_POWER | 149 (146) | STUNNED 149 | 149 | 126/126 | 1/118 | - | **yes** | TUNNELER 149 |
| PIERCING_WAIL_POWER | 146 (38) | EYE_LASERS_MOVE 15, MULTI_CLAW_MOVE 14, THRASH_MOVE 12 | 0 | 0/90 | 33/56 | POISON_POWER 18, WEAK_POWER 17, VULNERABLE_POWER 5, STRANGLE_POWER 2, PAINFUL_STABS_POWER 1 | no | THE_INSATIABLE 19, TEST_SUBJECT 19, QUEEN 17 |
| CURL_UP_POWER | 126 (126) | WEB_CANNON_MOVE 120, CURL_AND_GROW_MOVE 6 | 0 | 0/120 | 49/64 | - | no | LOUSE_PROGENITOR 126 |
| SHRIEK_POWER | 115 (115) | STUNNED 115 | 115 | 114/114 | 0/111 | - | **yes** | TERROR_EEL 115 |
| ASLEEP_POWER | 89 (71) | STUNNED 89 | 89 | 0/0 | 0/0 | PLATING_POWER 89 | **yes** | LAGAVULIN_MATRIARCH 89 |
| PLATING_POWER | 89 (71) | STUNNED 89 | 89 | 0/0 | 0/0 | ASLEEP_POWER 89 | **yes** | LAGAVULIN_MATRIARCH 89 |
| PLOW_POWER | 80 (67) | STUNNED 80 | 80 | 71/80 | 4/80 | STRENGTH_POWER 76 | **yes** | CEREMONIAL_BEAST 80 |
| FLUTTER_POWER | 57 (57) | STUNNED 57 | 57 | 18/18 | 0/15 | - | **yes** | THIEVING_HOPPER 57 |
| STRANGLE_POWER | 48 (14) | PLOW_MOVE 6, SLEEP_MOVE 5, ORB_OF_FRAILTY_MOVE 5 | 0 | 0/24 | 10/12 | WEAK_POWER 22, POISON_POWER 9, STRENGTH_POWER 3, PIERCING_WAIL_POWER 2 | no | LAGAVULIN_MATRIARCH 12, CEREMONIAL_BEAST 9, KIN_PRIEST 8 |
| CRAB_RAGE_POWER | 42 (38) | ENLARGING_STRIKE_MOVE 13, ADAPT_MOVE 11, TARGETING_RETICLE_MOVE 4 | 0 | 0/26 | 14/16 | VULNERABLE_POWER 1 | no | CRUSHER 31, ROCKET 11 |
| STOCK_POWER | 37 (36) | BOOT_UP_MOVE 36, HAMMER_UPPERCUT_MOVE 1 | 0 | 33/34 | 2/32 | STRENGTH_POWER 33, VULNERABLE_POWER 22, WEAK_POWER 5, POISON_POWER 2, DARK_SHACKLES_POWER 1 | no | AXEBOT 37 |
| SLUMBER_POWER | 22 (20) | STUNNED 22 | 22 | 0/0 | 0/0 | - | **yes** | SLUMBERING_BEETLE 22 |
| PAINFUL_STABS_POWER | 10 (6) | PHASE3_LACERATE_MOVE 5, BITE_MOVE 3, SKULL_BASH_MOVE 2 | 0 | 0/4 | 0/2 | ADAPTABLE_POWER 5, WEAK_POWER 2, DARK_SHACKLES_POWER 1, PIERCING_WAIL_POWER 1 | no | TEST_SUBJECT 10 |
| DARK_SHACKLES_POWER | 6 (2) | MULTI_CLAW_MOVE 4, BOOT_UP_MOVE 1, BITE_MOVE 1 | 0 | 1/1 | 0/0 | WEAK_POWER 5, STOCK_POWER 1, PAINFUL_STABS_POWER 1 | no | TEST_SUBJECT 5, AXEBOT 1 |
| DEMISE_POWER | 6 (2) | MULTI_CLAW_MOVE 3, BITE_MOVE 2, ABOUT_TO_BLOW_MOVE 1 | 0 | 1/5 | 2/5 | STRENGTH_POWER 2 | no | TEST_SUBJECT 5, WATERFALL_GIANT 1 |
| STEAM_ERUPTION_POWER | 6 (5) | EXPLODE_MOVE 6 | 0 | 0/3 | 1/1 | WEAK_POWER 3, POISON_POWER 1 | no | WATERFALL_GIANT 6 |
| ADAPTABLE_POWER | 5 (4) | PHASE3_LACERATE_MOVE 5 | 0 | 0/1 | 0/1 | PAINFUL_STABS_POWER 5, WEAK_POWER 1 | no | TEST_SUBJECT 5 |
| ENRAGE_POWER | 4 (4) | MULTI_CLAW_MOVE 4 | 0 | 0/4 | 3/3 | STRENGTH_POWER 4, WEAK_POWER 3, POISON_POWER 2 | no | TEST_SUBJECT 4 |
| INTANGIBLE_POWER | 4 (3) | BIG_POUNCE 3, MULTI_CLAW_MOVE 1 | 0 | 0/4 | 2/3 | STRENGTH_POWER 1, NEMESIS_POWER 1 | no | TEST_SUBJECT 4 |
| MANGLE_POWER | 4 (2) | ONE_TWO_MOVE 3, MULTI_CLAW_MOVE 1 | 0 | 0/4 | 0/1 | - | no | AXEBOT 3, TEST_SUBJECT 1 |
| NEMESIS_POWER | 2 (1) | MULTI_CLAW_MOVE 2 | 0 | 0/2 | 1/2 | INTANGIBLE_POWER 1, POISON_POWER 1 | no | TEST_SUBJECT 2 |
| SHACKLING_POTION_POWER | 1 (1) | KNOWLEDGE_OVERWHELMING_MOVE 1 | 0 | 0/1 | 1/1 | - | no | KNOWLEDGE_DEMON 1 |
| SHRINK_POWER | 1 (1) | ABOUT_TO_BLOW_MOVE 1 | 0 | 1/1 | 0/1 | VULNERABLE_POWER 1 | no | WATERFALL_GIANT 1 |

## (e) move changes on a power's removal (`move_changed`, class B)

| monster | power | how | changed / n | to | next (after a change) | revived | move rule |
|---|---|---|---|---|---|---|---|
| AXEBOT | DARK_SHACKLES_POWER | removed | 1/1 | BOOT_UP_MOVE 1 | HAMMER_UPPERCUT_MOVE 1 | 1 | no |
| AXEBOT | PIERCING_WAIL_POWER | removed | 1/1 | HAMMER_UPPERCUT_MOVE 1 | BOOT_UP_MOVE 1 | 1 | no |
| AXEBOT | POISON_POWER | removed | 5/7 | BOOT_UP_MOVE 4, HAMMER_UPPERCUT_MOVE 1 | HAMMER_UPPERCUT_MOVE 3, ONE_TWO_MOVE 1 | 7 | no |
| AXEBOT | STOCK_POWER | removed | 35/37 | BOOT_UP_MOVE 34, HAMMER_UPPERCUT_MOVE 1 | HAMMER_UPPERCUT_MOVE 32, ONE_TWO_MOVE 1 | 37 | **yes** |
| AXEBOT | STRENGTH_POWER | removed | 37/42 | BOOT_UP_MOVE 37 | HAMMER_UPPERCUT_MOVE 35, ONE_TWO_MOVE 1 | 37 | **yes** |
| AXEBOT | VULNERABLE_POWER | removed | 45/48 | BOOT_UP_MOVE 44, HAMMER_UPPERCUT_MOVE 1 | HAMMER_UPPERCUT_MOVE 43, ONE_TWO_MOVE 1 | 47 | **yes** |
| AXEBOT | WEAK_POWER | removed | 12/15 | BOOT_UP_MOVE 10, HAMMER_UPPERCUT_MOVE 1, ONE_TWO_MOVE 1 | HAMMER_UPPERCUT_MOVE 11, BOOT_UP_MOVE 1 | 14 | no |
| AXEBOT | POISON_POWER | lowered | 2/2 | BOOT_UP_MOVE 1, HAMMER_UPPERCUT_MOVE 1 | ONE_TWO_MOVE 1, BOOT_UP_MOVE 1 | 2 | no |
| AXEBOT | STOCK_POWER | lowered | 40/40 | BOOT_UP_MOVE 39, HAMMER_UPPERCUT_MOVE 1 | HAMMER_UPPERCUT_MOVE 38, ONE_TWO_MOVE 1 | 40 | **yes** |
| AXEBOT | VULNERABLE_POWER | lowered | 1/2 | BOOT_UP_MOVE 1 | HAMMER_UPPERCUT_MOVE 1 | 1 | no |
| CEREMONIAL_BEAST | PLOW_POWER | removed | 80/80 | STUNNED 80 | BEAST_CRY_MOVE 73, CRUSH_MOVE 3 | 0 | no |
| CEREMONIAL_BEAST | POISON_POWER | removed | 12/22 | CRUSH_MOVE 4, PLOW_MOVE 4, BEAST_CRY_MOVE 2, STOMP_MOVE 2 | BEAST_CRY_MOVE 6, STOMP_MOVE 2 | 21 | no |
| CEREMONIAL_BEAST | STRANGLE_POWER | removed | 5/9 | PLOW_MOVE 3, CRUSH_MOVE 2 | PLOW_MOVE 3, BEAST_CRY_MOVE 2 | 9 | no |
| CEREMONIAL_BEAST | STRENGTH_POWER | removed | 80/83 | STUNNED 76, CRUSH_MOVE 4 | BEAST_CRY_MOVE 71, CRUSH_MOVE 4 | 4 | no |
| CEREMONIAL_BEAST | WEAK_POWER | removed | 20/71 | PLOW_MOVE 8, STOMP_MOVE 6, BEAST_CRY_MOVE 4, CRUSH_MOVE 2 | BEAST_CRY_MOVE 7, CRUSH_MOVE 7 | 63 | no |
| CEREMONIAL_BEAST | POISON_POWER | lowered | 6/17 | BEAST_CRY_MOVE 3, STOMP_MOVE 2, PLOW_MOVE 1 | BEAST_CRY_MOVE 2, STOMP_MOVE 2 | 14 | no |
| CEREMONIAL_BEAST | STRENGTH_POWER | lowered | 3/4 | CRUSH_MOVE 3 | BEAST_CRY_MOVE 2, STOMP_MOVE 1 | 2 | no |
| DECIMILLIPEDE_SEGMENT_MIDDLE | STRENGTH_POWER | removed | 1/3 | BULK_MOVE 1 | - | 1 | no |
| LAGAVULIN_MATRIARCH | ASLEEP_POWER | removed | 89/89 | STUNNED 89 | SLASH_MOVE 89 | 0 | no |
| LAGAVULIN_MATRIARCH | PIERCING_WAIL_POWER | removed | 2/9 | DISEMBOWEL_MOVE 1, SLASH_MOVE 1 | DISEMBOWEL_MOVE 2 | 7 | no |
| LAGAVULIN_MATRIARCH | PLATING_POWER | removed | 89/89 | STUNNED 89 | SLASH_MOVE 89 | 0 | no |
| LAGAVULIN_MATRIARCH | POISON_POWER | removed | 4/12 | SLEEP_MOVE 4 | SLASH_MOVE 4 | 11 | no |
| LAGAVULIN_MATRIARCH | STRANGLE_POWER | removed | 5/12 | SLEEP_MOVE 5 | SLASH_MOVE 5 | 11 | no |
| LAGAVULIN_MATRIARCH | STRENGTH_POWER | removed | 1/9 | SOUL_SIPHON_MOVE 1 | SLASH_MOVE 1 | 0 | no |
| LAGAVULIN_MATRIARCH | WEAK_POWER | removed | 17/91 | SLEEP_MOVE 8, SOUL_SIPHON_MOVE 4, SLASH_MOVE 2, SLASH2_MOVE 2, DISEMBOWEL_MOVE 1 | SLASH_MOVE 11, SLASH2_MOVE 2 | 55 | no |
| LAGAVULIN_MATRIARCH | POISON_POWER | lowered | 15/32 | SLASH2_MOVE 5, SOUL_SIPHON_MOVE 4, SLASH_MOVE 3, DISEMBOWEL_MOVE 3 | SLASH_MOVE 5, SOUL_SIPHON_MOVE 4 | 24 | no |
| LAGAVULIN_MATRIARCH | STRENGTH_POWER | lowered | 1/1 | SOUL_SIPHON_MOVE 1 | SLASH_MOVE 1 | 0 | no |
| OVICOPTER | POISON_POWER | removed | 1/4 | LAY_EGGS_MOVE 1 | SMASH_MOVE 1 | 4 | no |
| OVICOPTER | WEAK_POWER | removed | 1/7 | NUTRITIONAL_PASTE_MOVE 1 | SMASH_MOVE 1 | 4 | no |
| OVICOPTER | POISON_POWER | lowered | 1/5 | NUTRITIONAL_PASTE_MOVE 1 | SMASH_MOVE 1 | 4 | no |
| QUEEN | STRENGTH_POWER | removed | 2/8 | BURN_BRIGHT_FOR_ME_MOVE 2 | EXECUTION_MOVE 1, OFF_WITH_YOUR_HEAD_MOVE 1 | 0 | no |
| QUEEN | VULNERABLE_POWER | removed | 1/4 | BURN_BRIGHT_FOR_ME_MOVE 1 | - | 4 | no |
| QUEEN | STRENGTH_POWER | lowered | 1/2 | ENRAGE_MOVE 1 | BURN_BRIGHT_FOR_ME_MOVE 1 | 0 | no |
| SLUMBERING_BEETLE | SLUMBER_POWER | removed | 22/22 | STUNNED 22 | ROLL_OUT_MOVE 22 | 0 | no |
| TERROR_EEL | SHRIEK_POWER | removed | 115/115 | STUNNED 115 | TERROR_MOVE 114 | 0 | no |
| TEST_SUBJECT | ADAPTABLE_POWER | removed | 5/5 | PHASE3_LACERATE_MOVE 5 | PHASE3_LACERATE_MOVE 3, MULTI_CLAW_MOVE 1 | 5 | **yes** |
| TEST_SUBJECT | DARK_SHACKLES_POWER | removed | 1/5 | BITE_MOVE 1 | - | 5 | no |
| TEST_SUBJECT | ENRAGE_POWER | removed | 4/4 | MULTI_CLAW_MOVE 4 | MULTI_CLAW_MOVE 3 | 4 | no |
| TEST_SUBJECT | INTANGIBLE_POWER | removed | 4/4 | BIG_POUNCE 3, MULTI_CLAW_MOVE 1 | PHASE3_LACERATE_MOVE 2, BIG_POUNCE 2 | 1 | no |
| TEST_SUBJECT | NEMESIS_POWER | removed | 2/2 | MULTI_CLAW_MOVE 2 | PHASE3_LACERATE_MOVE 1, BIG_POUNCE 1 | 2 | no |
| TEST_SUBJECT | PAINFUL_STABS_POWER | removed | 10/10 | PHASE3_LACERATE_MOVE 5, BITE_MOVE 3, SKULL_BASH_MOVE 2 | MULTI_CLAW_MOVE 4, PHASE3_LACERATE_MOVE 3 | 10 | no |
| TEST_SUBJECT | PIERCING_WAIL_POWER | removed | 1/19 | BITE_MOVE 1 | - | 14 | no |
| TEST_SUBJECT | POISON_POWER | removed | 3/33 | MULTI_CLAW_MOVE 3 | MULTI_CLAW_MOVE 1, BIG_POUNCE 1 | 31 | no |
| TEST_SUBJECT | STRENGTH_POWER | removed | 5/55 | MULTI_CLAW_MOVE 4, BIG_POUNCE 1 | MULTI_CLAW_MOVE 3, BIG_POUNCE 1 | 47 | no |
| TEST_SUBJECT | VULNERABLE_POWER | removed | 1/23 | BURNING_GROWL_MOVE 1 | PHASE3_LACERATE_MOVE 1 | 21 | no |
| TEST_SUBJECT | WEAK_POWER | removed | 5/76 | MULTI_CLAW_MOVE 3, PHASE3_LACERATE_MOVE 1, BITE_MOVE 1 | MULTI_CLAW_MOVE 2, BIG_POUNCE 1 | 66 | no |
| TEST_SUBJECT | POISON_POWER | lowered | 2/55 | PHASE3_LACERATE_MOVE 1, MULTI_CLAW_MOVE 1 | BIG_POUNCE 1, MULTI_CLAW_MOVE 1 | 39 | no |
| TEST_SUBJECT | WEAK_POWER | lowered | 1/13 | SKULL_BASH_MOVE 1 | MULTI_CLAW_MOVE 1 | 8 | no |
| THIEVING_HOPPER | FLUTTER_POWER | removed | 57/57 | STUNNED 57 | ESCAPE_MOVE 27, NAB_MOVE 4 | 0 | no |
| TUNNELER | BURROWED_POWER | removed | 149/149 | STUNNED 149 | BITE_MOVE 119 | 0 | no |
| WATERFALL_GIANT | DEMISE_POWER | removed | 1/1 | ABOUT_TO_BLOW_MOVE 1 | EXPLODE_MOVE 1 | 1 | no |
| WATERFALL_GIANT | POISON_POWER | removed | 4/11 | ABOUT_TO_BLOW_MOVE 3, EXPLODE_MOVE 1 | EXPLODE_MOVE 3, RAM_MOVE 1 | 11 | no |
| WATERFALL_GIANT | SHRINK_POWER | removed | 1/1 | ABOUT_TO_BLOW_MOVE 1 | EXPLODE_MOVE 1 | 1 | no |
| WATERFALL_GIANT | STEAM_ERUPTION_POWER | removed | 6/6 | EXPLODE_MOVE 6 | PRESSURE_UP_MOVE 2, EXPLODE_MOVE 2 | 4 | **yes** |
| WATERFALL_GIANT | STRENGTH_POWER | removed | 10/10 | ABOUT_TO_BLOW_MOVE 10 | EXPLODE_MOVE 10 | 10 | **yes** |
| WATERFALL_GIANT | VULNERABLE_POWER | removed | 46/69 | ABOUT_TO_BLOW_MOVE 46 | EXPLODE_MOVE 42, PRESSURE_UP_MOVE 4 | 63 | no |
| WATERFALL_GIANT | WEAK_POWER | removed | 8/85 | ABOUT_TO_BLOW_MOVE 5, EXPLODE_MOVE 3 | EXPLODE_MOVE 3, PRESSURE_GUN_MOVE 2 | 78 | no |

## (f) a survivor's move when an ally dies (`ally_deaths`, class D)

| survivor | ally | deaths (fights) | same-frame changes | next turn / n | turns beside a living ally | death's own moves | rule |
|---|---|---|---|---|---|---|---|
| AXE_RUBY_RAIDER | ASSASSIN_RUBY_RAIDER | 22 (22) | - | SWING_2 12, BIG_SWING 8 / 21 | 38 | - | no |
| AXE_RUBY_RAIDER | BRUTE_RUBY_RAIDER | 5 (5) | - | SWING_2 3, SWING_1 2 / 5 | 44 | - | no |
| AXE_RUBY_RAIDER | CROSSBOW_RUBY_RAIDER | 12 (12) | - | BIG_SWING 9, SWING_2 2 / 11 | 36 | - | no |
| AXE_RUBY_RAIDER | TRACKER_RUBY_RAIDER | 11 (11) | - | BIG_SWING 5, SWING_1 4 / 11 | 51 | - | no |
| BOWLBUG_EGG | BOWLBUG_NECTAR | 6 (6) | - | BITE_MOVE 6 / 6 | 54 | - | no |
| BOWLBUG_EGG | BOWLBUG_ROCK | 39 (39) | - | BITE_MOVE 35 / 35 | 299 | - | no |
| BOWLBUG_EGG | BOWLBUG_SILK | 3 (3) | - | BITE_MOVE 2 / 2 | 66 | - | no |
| BOWLBUG_NECTAR | BOWLBUG_EGG | 22 (22) | - | BUFF_MOVE 17, THRASH2_MOVE 3 / 20 | 54 | - | no |
| BOWLBUG_NECTAR | BOWLBUG_ROCK | 80 (80) | - | THRASH2_MOVE 33, BUFF_MOVE 26 / 59 | 383 | - | no |
| BOWLBUG_NECTAR | BOWLBUG_SILK | 7 (7) | - | THRASH2_MOVE 5 / 5 | 98 | - | no |
| BOWLBUG_ROCK | BOWLBUG_EGG | 121 (121) | - | HEADBUTT_MOVE 99, STUNNED 16 / 115 | 299 | - | no |
| BOWLBUG_ROCK | BOWLBUG_NECTAR | 64 (64) | - | HEADBUTT_MOVE 52, STUNNED 7 / 59 | 383 | - | no |
| BOWLBUG_ROCK | BOWLBUG_SILK | 30 (30) | - | HEADBUTT_MOVE 17, STUNNED 5 / 22 | 520 | - | no |
| BOWLBUG_ROCK | SLUMBERING_BEETLE | 3 (3) | - | HEADBUTT_MOVE 3 / 3 | 341 | - | no |
| BOWLBUG_SILK | BOWLBUG_EGG | 31 (31) | - | THRASH_MOVE 20, TOXIC_SPIT_MOVE 11 / 31 | 66 | - | no |
| BOWLBUG_SILK | BOWLBUG_NECTAR | 22 (22) | - | THRASH_MOVE 15, TOXIC_SPIT_MOVE 4 / 19 | 98 | - | no |
| BOWLBUG_SILK | BOWLBUG_ROCK | 133 (129) | - | THRASH_MOVE 67, TOXIC_SPIT_MOVE 45 / 112 | 520 | - | no |
| BOWLBUG_SILK | SLUMBERING_BEETLE | 6 (6) | - | THRASH_MOVE 4, TOXIC_SPIT_MOVE 1 / 5 | 459 | - | no |
| BRUTE_RUBY_RAIDER | ASSASSIN_RUBY_RAIDER | 19 (19) | - | ROAR_MOVE 10, BEAT_MOVE 8 / 18 | 33 | - | no |
| BRUTE_RUBY_RAIDER | AXE_RUBY_RAIDER | 11 (11) | - | ROAR_MOVE 7, BEAT_MOVE 2 / 9 | 44 | - | no |
| BRUTE_RUBY_RAIDER | CROSSBOW_RUBY_RAIDER | 15 (15) | - | BEAT_MOVE 9, ROAR_MOVE 3 / 12 | 47 | - | no |
| BRUTE_RUBY_RAIDER | TRACKER_RUBY_RAIDER | 13 (13) | - | BEAT_MOVE 8, ROAR_MOVE 4 / 12 | 43 | - | no |
| CALCIFIED_CULTIST | SEAPUNK | 5 (5) | - | DARK_STRIKE_MOVE 5 / 5 | 220 | - | no |
| CHOMPER | CHOMPER | 114 (114) | - | CLAMP_MOVE 67, SCREECH_MOVE 25 / 92 | 862 | - | no |
| CORPSE_SLUG | CORPSE_SLUG | 455 (306) | GLOMP_MOVE: STUNNED 166 of 166; GOOP_MOVE: STUNNED 130 of 130; WHIP_SLAP_MOVE: STUNNED 156 of 156 | GLOMP_MOVE 155, WHIP_SLAP_MOVE 147 / 428 | 1886 | - | no |
| CROSSBOW_RUBY_RAIDER | ASSASSIN_RUBY_RAIDER | 14 (14) | - | FIRE_MOVE 13, RELOAD_MOVE 1 / 14 | 29 | - | no |
| CROSSBOW_RUBY_RAIDER | AXE_RUBY_RAIDER | 4 (4) | - | FIRE_MOVE 4 / 4 | 36 | - | no |
| CROSSBOW_RUBY_RAIDER | BRUTE_RUBY_RAIDER | 3 (3) | - | FIRE_MOVE 2 / 2 | 47 | - | no |
| CROSSBOW_RUBY_RAIDER | TRACKER_RUBY_RAIDER | 8 (8) | - | RELOAD_MOVE 5, FIRE_MOVE 3 / 8 | 46 | - | no |
| CRUSHER | ROCKET | 29 (27) | - | BUG_STING_MOVE 12, GUARDED_STRIKE_MOVE 10 / 25 | 1091 | - | no |
| CUBEX_CONSTRUCT | CUBEX_CONSTRUCT | 40 (40) | - | EXPEL_MOVE 12, REPEATER_BLAST_MOVE_2 11 / 29 | 300 | - | no |
| CUBEX_CONSTRUCT | PUNCH_CONSTRUCT | 22 (14) | - | EXPEL_MOVE 11, REPEATER_BLAST_MOVE 2 / 14 | 328 | - | no |
| DAMP_CULTIST | CALCIFIED_CULTIST | 94 (94) | - | DARK_STRIKE_MOVE 94 / 94 | 238 | - | no |
| DECIMILLIPEDE_SEGMENT_BACK | DECIMILLIPEDE_SEGMENT_FRONT | 44 (41) | - | WRITHE_MOVE 17, BULK_MOVE 15 / 35 | 341 | - | no |
| DECIMILLIPEDE_SEGMENT_BACK | DECIMILLIPEDE_SEGMENT_MIDDLE | 49 (38) | - | WRITHE_MOVE 24, BULK_MOVE 7 / 37 | 347 | - | no |
| DECIMILLIPEDE_SEGMENT_FRONT | DECIMILLIPEDE_SEGMENT_BACK | 40 (36) | - | WRITHE_MOVE 21, CONSTRICT_MOVE 10 / 32 | 341 | - | no |
| DECIMILLIPEDE_SEGMENT_FRONT | DECIMILLIPEDE_SEGMENT_MIDDLE | 40 (34) | - | BULK_MOVE 14, CONSTRICT_MOVE 9 / 32 | 338 | - | no |
| DECIMILLIPEDE_SEGMENT_MIDDLE | DECIMILLIPEDE_SEGMENT_BACK | 39 (38) | - | BULK_MOVE 17, WRITHE_MOVE 8 / 28 | 347 | - | no |
| DECIMILLIPEDE_SEGMENT_MIDDLE | DECIMILLIPEDE_SEGMENT_FRONT | 47 (41) | - | WRITHE_MOVE 14, CONSTRICT_MOVE 13 / 33 | 338 | - | no |
| EXOSKELETON | EXOSKELETON | 1123 (315) | - | MANDIBLES_MOVE 389, ENRAGE_MOVE 304 / 921 | 2948 | - | no |
| FABRICATOR | GUARDBOT | 16 (12) | - | FABRICATE_MOVE 5, FABRICATING_STRIKE_MOVE 4 / 9 | 62 | - | no |
| FABRICATOR | NOISEBOT | 17 (15) | - | FABRICATE_MOVE 7, FABRICATING_STRIKE_MOVE 7 / 14 | 55 | - | no |
| FABRICATOR | STABBOT | 38 (28) | - | FABRICATE_MOVE 20, FABRICATING_STRIKE_MOVE 10 / 31 | 80 | - | no |
| FABRICATOR | ZAPBOT | 44 (32) | - | FABRICATING_STRIKE_MOVE 13, FABRICATE_MOVE 13 / 32 | 81 | - | no |
| FAT_GREMLIN | SNEAKY_GREMLIN | 67 (67) | - | FLEE_MOVE 11 / 11 | 95 | - | no |
| FLAIL_KNIGHT | MAGI_KNIGHT | 3 (3) | - | WAR_CHANT 2, FLAIL_MOVE 1 / 3 | 115 | - | no |
| FLYCONID | LEAF_SLIME_M | 18 (18) | - | VULNERABLE_SPORES_MOVE 7, SMASH_MOVE 6 / 17 | 80 | - | no |
| FLYCONID | SNAPPING_JAXFRUIT | 61 (61) | - | SMASH_MOVE 29, VULNERABLE_SPORES_MOVE 19 / 60 | 152 | - | no |
| FLYCONID | TWIG_SLIME_M | 21 (21) | - | VULNERABLE_SPORES_MOVE 7, SMASH_MOVE 7 / 20 | 58 | - | no |
| FOGMOG | EYE_WITH_TEETH | 63 (44) | - | HEADBUTT_MOVE 16, SWIPE_MOVE 12 / 38 | 195 | - | no |
| FUZZY_WURM_CRAWLER | SHRINKER_BEETLE | 46 (46) | - | ACID_GOOP 18, FIRST_ACID_GOOP 18 / 46 | 186 | - | no |
| GUARDBOT | STABBOT | 12 (7) | - | GUARD_MOVE 6 / 6 | 45 | - | no |
| GUARDBOT | ZAPBOT | 18 (15) | - | GUARD_MOVE 10 / 10 | 38 | - | no |
| INKLET | INKLET | 220 (80) | - | WHIRLWIND_MOVE 65, JAB_MOVE 65 / 188 | 517 | - | no |
| KIN_FOLLOWER | KIN_FOLLOWER | 52 (52) | - | POWER_DANCE_MOVE 22, QUICK_SLASH_MOVE 16 / 47 | 994 | - | no |
| KIN_PRIEST | KIN_FOLLOWER | 106 (57) | - | ORB_OF_FRAILTY_MOVE 31, ORB_OF_WEAKNESS_MOVE 29 / 102 | 611 | - | no |
| LEAF_SLIME_M | FLYCONID | 8 (8) | - | CLUMP_SHOT 7 / 7 | 80 | - | no |
| LEAF_SLIME_M | LEAF_SLIME_S | 126 (126) | - | CLUMP_SHOT 64, STICKY_SHOT 57 / 121 | 411 | - | no |
| LEAF_SLIME_M | SLITHERING_STRANGLER | 4 (4) | - | CLUMP_SHOT 2, STICKY_SHOT 2 / 4 | 16 | - | no |
| LEAF_SLIME_M | TWIG_SLIME_M | 59 (59) | - | STICKY_SHOT 45, CLUMP_SHOT 9 / 54 | 166 | - | no |
| LEAF_SLIME_M | TWIG_SLIME_S | 155 (155) | - | CLUMP_SHOT 125, STICKY_SHOT 29 / 154 | 220 | - | no |
| LEAF_SLIME_S | LEAF_SLIME_M | 31 (31) | - | TACKLE_MOVE 13, GOOP_MOVE 10 / 23 | 411 | - | no |
| LEAF_SLIME_S | LEAF_SLIME_S | 3 (3) | - | TACKLE_MOVE 2, GOOP_MOVE 1 / 3 | 14 | - | no |
| LEAF_SLIME_S | SLITHERING_STRANGLER | 3 (2) | - | TACKLE_MOVE 2 / 2 | 23 | - | no |
| LEAF_SLIME_S | TWIG_SLIME_M | 83 (83) | - | TACKLE_MOVE 44, GOOP_MOVE 30 / 74 | 334 | - | no |
| LEAF_SLIME_S | TWIG_SLIME_S | 198 (198) | - | TACKLE_MOVE 94, GOOP_MOVE 89 / 183 | 348 | - | no |
| LIVING_FOG | GAS_BOMB | 92 (60) | - | BLOAT_MOVE 74 / 74 | 133 | - | no (next BLOAT_MOVE: its move table gives it already) |
| LIVING_SHIELD | TURRET_OPERATOR | 10 (10) | - | SMASH_MOVE 9 / 9 | 264 | SMASH_MOVE | **next SMASH_MOVE** |
| MAGI_KNIGHT | FLAIL_KNIGHT | 22 (22) | - | RAM_MOVE 8, MAGIC_BOMB 5 / 17 | 115 | - | no |
| MAGI_KNIGHT | SPECTRAL_KNIGHT | 16 (16) | - | RAM_MOVE 4, MAGIC_BOMB 3 / 9 | 144 | - | no |
| MYTE | MYTE | 111 (111) | - | TOXIC_MOVE 58, SUCK_MOVE 24 / 105 | 792 | - | no |
| NIBBIT | NIBBIT | 68 (68) | - | BUTT_MOVE 39, SLICE_MOVE 22 / 67 | 404 | - | no |
| NOISEBOT | STABBOT | 9 (7) | - | NOISE_MOVE 6 / 6 | 29 | - | no |
| NOISEBOT | ZAPBOT | 13 (9) | - | NOISE_MOVE 10 / 10 | 28 | - | no |
| OVICOPTER | TOUGH_EGG | 245 (95) | - | TENDERIZER_MOVE 89, LAY_EGGS_MOVE 71 / 198 | 388 | - | no |
| PHANTASMAL_GARDENER | PHANTASMAL_GARDENER | 589 (110) | - | BITE_MOVE 184, ENLARGE_MOVE 148 / 522 | 1812 | - | no |
| PUNCH_CONSTRUCT | CUBEX_CONSTRUCT | 58 (35) | - | STRONG_PUNCH_MOVE 22, READY_MOVE 15 / 48 | 186 | - | no |
| PUNCH_CONSTRUCT | PUNCH_CONSTRUCT | 8 (8) | STRONG_PUNCH_MOVE: FAST_PUNCH_MOVE 1 of 3 | STRONG_PUNCH_MOVE 4, FAST_PUNCH_MOVE 2 / 8 | 60 | - | no |
| QUEEN | TORCH_HEAD_AMALGAM | 30 (28) | BURN_BRIGHT_FOR_ME_MOVE: ENRAGE_MOVE 28 of 28 | OFF_WITH_YOUR_HEAD_MOVE 30 / 30 | 459 | ENRAGE_MOVE, OFF_WITH_YOUR_HEAD_MOVE | **now BURN_BRIGHT_FOR_ME_MOVE -> ENRAGE_MOVE; next OFF_WITH_YOUR_HEAD_MOVE** |
| ROCKET | CRUSHER | 11 (11) | - | PRECISION_BEAM_MOVE 4, TARGETING_RETICLE_MOVE 3 / 10 | 1091 | - | no |
| SCROLL_OF_BITING | SCROLL_OF_BITING | 383 (121) | - | CHEW 167, CHOMP 57 / 267 | 926 | - | no |
| SEAPUNK | CALCIFIED_CULTIST | 80 (80) | - | BUBBLE_BURP_MOVE 43, SEA_KICK_MOVE 26 / 77 | 220 | - | no |
| SHRINKER_BEETLE | FUZZY_WURM_CRAWLER | 6 (6) | - | STOMP_MOVE 3, CHOMP_MOVE 3 / 6 | 186 | - | no |
| SLITHERING_STRANGLER | LEAF_SLIME_M | 3 (3) | - | THWACK 2, CONSTRICT 1 / 3 | 16 | - | no |
| SLITHERING_STRANGLER | LEAF_SLIME_S | 8 (6) | - | CONSTRICT 4, LASH 2 / 7 | 16 | - | no |
| SLITHERING_STRANGLER | SNAPPING_JAXFRUIT | 23 (23) | - | CONSTRICT 14, THWACK 5 / 23 | 51 | - | no |
| SLITHERING_STRANGLER | TWIG_SLIME_M | 16 (16) | - | CONSTRICT 9, LASH 4 / 15 | 31 | - | no |
| SLITHERING_STRANGLER | TWIG_SLIME_S | 14 (9) | - | THWACK 8, LASH 5 / 14 | 10 | - | no |
| SLUMBERING_BEETLE | BOWLBUG_ROCK | 107 (103) | SNORE_MOVE: STUNNED 4 of 75 | ROLL_OUT_MOVE 65, SNORE_MOVE 36 / 101 | 341 | - | no |
| SLUMBERING_BEETLE | BOWLBUG_SILK | 89 (89) | SNORE_MOVE: STUNNED 2 of 40 | ROLL_OUT_MOVE 73, SNORE_MOVE 10 / 83 | 459 | - | no |
| SNAPPING_JAXFRUIT | FLYCONID | 4 (4) | - | ENERGY_ORB_MOVE 4 / 4 | 152 | - | no |
| SNEAKY_GREMLIN | FAT_GREMLIN | 8 (8) | - | TACKLE_MOVE 4 / 4 | 95 | - | no |
| SPECTRAL_KNIGHT | FLAIL_KNIGHT | 21 (21) | - | SOUL_SLASH 10, SOUL_FLAME 6 / 16 | 120 | - | no |
| SPECTRAL_KNIGHT | MAGI_KNIGHT | 8 (8) | - | SOUL_SLASH 3, SOUL_FLAME 2 / 5 | 144 | - | no |
| STABBOT | STABBOT | 3 (3) | - | STAB_MOVE 2 / 2 | 16 | - | no |
| STABBOT | ZAPBOT | 4 (4) | - | STAB_MOVE 2 / 2 | 24 | - | no |
| THE_FORGOTTEN | THE_LOST | 27 (27) | - | DREAD 15, MIASMA 10 / 25 | 144 | - | no |
| THE_LOST | THE_FORGOTTEN | 7 (7) | - | DEBILITATING_SMOG 4, EYE_LASERS 3 / 7 | 144 | - | no |
| THE_OBSCURA | PARAFRIGHT | 259 (107) | - | SAIL_MOVE 80, PIERCING_GAZE_MOVE 78 / 232 | 530 | - | no |
| TOADPOLE | TOADPOLE | 218 (218) | - | SPIKE_SPIT_MOVE 159, WHIRL_MOVE 30 / 209 | 946 | - | no |
| TOUGH_EGG | TOUGH_EGG | 218 (73) | - | NIBBLE_MOVE 116, HATCH_MOVE 8 / 124 | 1074 | - | no |
| TRACKER_RUBY_RAIDER | ASSASSIN_RUBY_RAIDER | 22 (22) | - | HOUNDS_MOVE 21 / 21 | 35 | - | no |
| TRACKER_RUBY_RAIDER | AXE_RUBY_RAIDER | 10 (10) | - | HOUNDS_MOVE 9 / 9 | 51 | - | no |
| TRACKER_RUBY_RAIDER | CROSSBOW_RUBY_RAIDER | 12 (12) | - | HOUNDS_MOVE 11 / 11 | 46 | - | no |
| TURRET_OPERATOR | LIVING_SHIELD | 80 (80) | - | RELOAD_MOVE 36, UNLOAD_MOVE_2 26 / 72 | 264 | - | no |
| TWIG_SLIME_M | FLYCONID | 5 (5) | - | POKEY_POUNCE_MOVE 5 / 5 | 58 | - | no |
| TWIG_SLIME_M | LEAF_SLIME_M | 3 (3) | - | POKEY_POUNCE_MOVE 1 / 1 | 166 | - | no |
| TWIG_SLIME_M | LEAF_SLIME_S | 68 (68) | - | POKEY_POUNCE_MOVE 52, STICKY_SHOT_MOVE 13 / 65 | 334 | - | no |
| TWIG_SLIME_M | TWIG_SLIME_S | 121 (121) | - | POKEY_POUNCE_MOVE 112, STICKY_SHOT_MOVE 6 / 118 | 219 | - | no |
| TWIG_SLIME_S | LEAF_SLIME_M | 3 (3) | - | TACKLE_MOVE 3 / 3 | 220 | - | no |
| TWIG_SLIME_S | LEAF_SLIME_S | 39 (39) | - | TACKLE_MOVE 26 / 26 | 348 | - | no |
| TWIG_SLIME_S | TWIG_SLIME_M | 27 (27) | - | TACKLE_MOVE 22 / 22 | 219 | - | no |
| TWIG_SLIME_S | TWIG_SLIME_S | 3 (3) | - | TACKLE_MOVE 1 / 1 | 10 | - | no |
| TWO_TAILED_RAT | TWO_TAILED_RAT | 245 (75) | - | SCRATCH_MOVE 64, DISEASE_BITE_MOVE 59 / 216 | 579 | - | no |
| WRIGGLER | WRIGGLER | 565 (104) | - | NASTY_BITE_MOVE 316, WRIGGLE_MOVE 170 / 486 | 1106 | - | no |
| ZAPBOT | ZAPBOT | 4 (4) | - | ZAP 3 / 3 | 8 | - | no |

