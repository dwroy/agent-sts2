# tools/sl-retry-summary.py on the logged deaths (frozen clock), with the noise rows and the real-clock rows

## rows

635 decisions in 212 fights; known draws on 445/635 (70%) (next cards: median 12); errors 0
rooms: {'hallway': 38, 'boss': 525, 'elite': 69, 'unknown_room': 3}
no known draws: {'next 0': 66, 'T2': 64, 'T3': 3, 'T1': 57}

## chosen line changes (pairs; rows where both ran)

| pair | rows | rows with known draws | chosen line changes | action now changes | among rows with known draws: chosen / action |
|---|---|---|---|---|---|
| off -> draws | 635 | 445 | 294/635 (46%) | 167/635 (26%) | 294/445 (66%) / 167/445 (38%) |
| off -> compute | 635 | 445 | 261/635 (41%) | 147/635 (23%) | 181/445 (41%) / 102/445 (23%) |
| draws -> both | 635 | 445 | 211/635 (33%) | 111/635 (17%) | 131/445 (29%) / 66/445 (15%) |
| compute -> both | 635 | 445 | 276/635 (43%) | 163/635 (26%) | 276/445 (62%) / 163/445 (37%) |
| off -> both | 635 | 445 | 374/635 (59%) | 212/635 (33%) | 294/445 (66%) / 167/445 (38%) |
| off -> off2 | 333 | 216 | 148/333 (44%) | 95/333 (29%) | 96/216 (44%) / 60/216 (28%) |
| draws -> draws2 | 333 | 216 | 120/333 (36%) | 74/333 (22%) | 68/216 (31%) / 39/216 (18%) |
| compute -> compute2 | 302 | 229 | 116/302 (38%) | 74/302 (25%) | 87/229 (38%) / 59/229 (26%) |
| both -> both2 | 302 | 229 | 100/302 (33%) | 63/302 (21%) | 71/229 (31%) / 48/229 (21%) |

## ties (no single rollout best) per variant

- off: 51/583 (9%) of the questions tied
- draws: 51/584 (9%) of the questions tied
- compute: 39/583 (7%) of the questions tied
- both: 55/584 (9%) of the questions tied

## the chosen line's rollout numbers (questions with a chosen line in both variants)

| pair | rows | dead share a -> b | further HP loss a -> b | best survives (0 dead) a -> b | survivor first only in b | only in a | a surviving line shown: a -> b |
|---|---|---|---|---|---|---|---|
| off -> draws | 507 | 0.413 -> 0.402 | 56.0 -> 56.1 | 189 -> 206 | 28 | 11 | 197 -> 210 |
| off -> compute | 504 | 0.410 -> 0.414 | 56.0 -> 56.2 | 190 -> 155 | 1 | 36 | 198 -> 156 |
| draws -> both | 518 | 0.407 -> 0.412 | 56.3 -> 56.3 | 211 -> 176 | 1 | 36 | 216 -> 177 |
| compute -> both | 516 | 0.422 -> 0.411 | 56.3 -> 56.2 | 156 -> 172 | 24 | 8 | 157 -> 173 |
| off -> both | 505 | 0.418 -> 0.413 | 56.3 -> 56.4 | 187 -> 169 | 17 | 35 | 195 -> 170 |
| off -> off2 | 275 | 0.437 -> 0.436 | 58.4 -> 58.4 | 88 -> 91 | 15 | 12 | 96 -> 95 |
| draws -> draws2 | 273 | 0.434 -> 0.438 | 58.7 -> 58.3 | 99 -> 98 | 10 | 11 | 102 -> 103 |
| compute -> compute2 | 232 | 0.391 -> 0.402 | 52.7 -> 52.7 | 86 -> 82 | 3 | 7 | 86 -> 84 |
| both -> both2 | 243 | 0.385 -> 0.392 | 53.5 -> 53.3 | 91 -> 94 | 4 | 1 | 92 -> 95 |

## the board as the rollout sees it, off -> draws (questions with known draws)

| off | draws | questions |
|---|---|---|
| a line survives | a line survives | 131 |
| every line dies in some samples | every line dies in some samples | 106 |
| every line dies in every sample | every line dies in every sample | 97 |
| every line dies in some samples | a line survives | 27 |
| every line dies in some samples | every line dies in every sample | 20 |
| a line survives | every line dies in some samples | 16 |
| every line dies in every sample | every line dies in some samples | 13 |
| every line dies in every sample | a line survives | 1 |
| a line survives | every line dies in every sample | 1 |

chosen line changes off -> draws by the off board's status (questions with known draws):

- a line survives: 150 questions, chosen line changes 91/150 (61%), action now changes 54/150 (36%)
- every line dies in every sample: 111 questions, chosen line changes 77/111 (69%), action now changes 42/111 (38%)
- every line dies in some samples: 153 questions, chosen line changes 123/153 (80%), action now changes 68/153 (44%)

## code's own decisions (act) that change label between off and draws

- act combat/plan -> ask combat/plan-choice: 3
- ask combat/plan-choice -> act combat/plan: 1
- ask combat/plan-choice+potion -> act combat/plan: 1

## by room: chosen line changes off -> draws (rows with known draws), and survivor first only with the draws

| room | rows with known draws | chosen changes | action changes | survivor first only with draws | only without |
|---|---|---|---|---|---|
| boss | 370 | 236/370 (64%) | 133/370 (36%) | 24 | 10 |
| elite | 43 | 33/43 (77%) | 20/43 (47%) | 1 | 1 |
| hallway | 29 | 24/29 (83%) | 13/29 (45%) | 2 | 0 |
| unknown_room | 3 | 1/3 (33%) | 1/3 (33%) | 1 | 0 |

## planning time per decision, s (frozen clock: every schedule run whole, so the time the samples need)

| variant | room | n | median | p90 | max |
|---|---|---|---|---|---|
| both | all | 635 | 1.4 | 15.7 | 364.2 |
| both | boss | 525 | 1.2 | 13.0 | 97.5 |
| both | elite | 69 | 1.4 | 33.8 | 364.2 |
| both | hallway | 38 | 6.8 | 53.5 | 87.5 |
| both | unknown_room | 3 | 1.6 | 5.2 | 5.2 |
| both2 | all | 302 | 1.2 | 20.5 | 288.4 |
| both2 | boss | 228 | 1.1 | 13.2 | 77.6 |
| both2 | elite | 50 | 0.9 | 57.8 | 288.4 |
| both2 | hallway | 24 | 7.4 | 44.3 | 64.5 |
| compute | all | 635 | 1.4 | 14.4 | 275.9 |
| compute | boss | 525 | 1.2 | 13.0 | 68.1 |
| compute | elite | 69 | 1.4 | 30.1 | 275.9 |
| compute | hallway | 38 | 6.7 | 38.6 | 50.4 |
| compute | unknown_room | 3 | 1.5 | 2.0 | 2.0 |
| compute2 | all | 302 | 1.3 | 15.8 | 401.4 |
| compute2 | boss | 228 | 1.1 | 13.4 | 74.9 |
| compute2 | elite | 50 | 1.2 | 51.2 | 401.4 |
| compute2 | hallway | 24 | 6.2 | 34.4 | 52.5 |
| draws | all | 635 | 0.5 | 5.3 | 127.6 |
| draws | boss | 525 | 0.5 | 4.5 | 93.5 |
| draws | elite | 69 | 0.6 | 10.8 | 127.6 |
| draws | hallway | 38 | 2.5 | 21.8 | 34.6 |
| draws | unknown_room | 3 | 0.5 | 1.2 | 1.2 |
| draws2 | all | 333 | 0.5 | 4.6 | 126.0 |
| draws2 | boss | 297 | 0.5 | 4.4 | 94.3 |
| draws2 | elite | 19 | 1.0 | 6.1 | 126.0 |
| draws2 | hallway | 14 | 1.7 | 8.1 | 15.4 |
| draws2 | unknown_room | 3 | 1.7 | 3.7 | 3.7 |
| off | all | 635 | 0.6 | 5.4 | 138.0 |
| off | boss | 525 | 0.5 | 4.5 | 51.4 |
| off | elite | 69 | 0.6 | 9.0 | 138.0 |
| off | hallway | 38 | 2.3 | 13.7 | 20.4 |
| off | unknown_room | 3 | 0.6 | 0.8 | 0.8 |
| off2 | all | 333 | 0.6 | 5.1 | 129.3 |
| off2 | boss | 297 | 0.5 | 5.0 | 27.9 |
| off2 | elite | 19 | 1.2 | 8.4 | 129.3 |
| off2 | hallway | 14 | 1.7 | 7.3 | 13.3 |
| off2 | unknown_room | 3 | 1.6 | 2.2 | 2.2 |

## planning time per decision, s (real clock: the live budgets)

| variant | room | n | median | p90 | max |
|---|---|---|---|---|---|
| both | all | 641 | 1.1 | 10.8 | 22.1 |
| both | boss | 531 | 1.0 | 8.7 | 20.0 |
| both | elite | 69 | 1.1 | 14.2 | 20.5 |
| both | hallway | 38 | 5.8 | 20.0 | 22.1 |
| both | unknown_room | 3 | 1.5 | 4.4 | 4.4 |
| compute | all | 641 | 1.1 | 9.8 | 20.0 |
| compute | boss | 531 | 1.0 | 8.4 | 20.0 |
| compute | elite | 69 | 1.3 | 15.5 | 20.0 |
| compute | hallway | 38 | 5.1 | 17.4 | 20.0 |
| compute | unknown_room | 3 | 1.4 | 4.1 | 4.1 |
| off | all | 641 | 0.4 | 1.4 | 4.4 |
| off | boss | 531 | 0.4 | 1.4 | 4.4 |
| off | elite | 69 | 0.5 | 1.5 | 3.3 |
| off | hallway | 38 | 1.0 | 1.4 | 2.2 |
| off | unknown_room | 3 | 0.6 | 1.1 | 1.1 |

## real clock: rollout samples and horizon reached

- off: {'8x5': 373, 'NonexNone': 134, '4x5': 27, '2x3': 21, '4x3': 18, '6x5': 18, '1x3': 15, '8x3': 10, '3x5': 6, '1x5': 6, '3x3': 5, '7x5': 3, '2x5': 2, '7x3': 1, '5x3': 1, '5x5': 1}
- compute: {'24x5': 505, 'NonexNone': 97, '16x5': 16, '8x5': 4, '12x5': 4, '6x5': 3, '22x5': 2, '2x3': 2, '21x5': 2, '3x5': 1, '20x5': 1, '19x5': 1, '18x5': 1, '4x3': 1, '15x5': 1}
- both: {'24x5': 498, 'NonexNone': 107, '16x5': 15, '8x5': 5, '12x5': 5, '6x5': 2, '2x3': 2, '3x3': 1, '11x5': 1, '14x5': 1, '23x5': 1, '15x5': 1, '20x5': 1, '18x5': 1}
