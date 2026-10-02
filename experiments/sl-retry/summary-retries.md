# tools/sl-retry-summary.py on the logged retries (frozen clock; real clock for the timing)

## rows

31 decisions in 4 fights; known draws on 23/31 (74%) (next cards: median 11); errors 0
rooms: {'elite': 12, 'boss': 19}
no known draws: {'next 0': 3, 'T5': 2, 'T7': 3}

## chosen line changes (pairs; rows where both ran)

| pair | rows | rows with known draws | chosen line changes | action now changes | among rows with known draws: chosen / action |
|---|---|---|---|---|---|
| off -> draws | 31 | 23 | 14/31 (45%) | 5/31 (16%) | 14/23 (61%) / 5/23 (22%) |
| off -> compute | 31 | 23 | 8/31 (26%) | 5/31 (16%) | 6/23 (26%) / 3/23 (13%) |
| draws -> both | 31 | 23 | 10/31 (32%) | 8/31 (26%) | 8/23 (35%) / 6/23 (26%) |
| compute -> both | 31 | 23 | 13/31 (42%) | 10/31 (32%) | 13/23 (57%) / 10/23 (43%) |
| off -> both | 31 | 23 | 16/31 (52%) | 9/31 (29%) | 14/23 (61%) / 7/23 (30%) |

## ties (no single rollout best) per variant

- off: 2/24 (8%) of the questions tied
- draws: 4/24 (17%) of the questions tied
- compute: 3/24 (12%) of the questions tied
- both: 2/24 (8%) of the questions tied

## the chosen line's rollout numbers (questions with a chosen line in both variants)

| pair | rows | dead share a -> b | further HP loss a -> b | best survives (0 dead) a -> b | survivor first only in b | only in a | a surviving line shown: a -> b |
|---|---|---|---|---|---|---|---|
| off -> draws | 24 | 0.443 -> 0.432 | 43.7 -> 44.1 | 6 -> 5 | 2 | 3 | 6 -> 9 |
| off -> compute | 24 | 0.443 -> 0.490 | 43.7 -> 44.6 | 6 -> 3 | 0 | 3 | 6 -> 3 |
| draws -> both | 24 | 0.432 -> 0.434 | 44.1 -> 44.7 | 5 -> 3 | 0 | 2 | 9 -> 5 |
| compute -> both | 24 | 0.490 -> 0.434 | 44.6 -> 44.7 | 3 -> 3 | 2 | 2 | 3 -> 5 |
| off -> both | 24 | 0.443 -> 0.434 | 43.7 -> 44.7 | 6 -> 3 | 1 | 4 | 6 -> 5 |

## the board as the rollout sees it, off -> draws (questions with known draws)

| off | draws | questions |
|---|---|---|
| a line survives | a line survives | 6 |
| every line dies in every sample | every line dies in every sample | 6 |
| every line dies in some samples | every line dies in some samples | 5 |
| every line dies in some samples | a line survives | 3 |
| every line dies in some samples | every line dies in every sample | 1 |

chosen line changes off -> draws by the off board's status (questions with known draws):

- a line survives: 6 questions, chosen line changes 3/6 (50%), action now changes 2/6 (33%)
- every line dies in some samples: 9 questions, chosen line changes 7/9 (78%), action now changes 1/9 (11%)
- every line dies in every sample: 6 questions, chosen line changes 3/6 (50%), action now changes 1/6 (17%)

## code's own decisions (act) that change label between off and draws

- act combat/least-loss -> act combat/plan: 1

## by room: chosen line changes off -> draws (rows with known draws), and survivor first only with the draws

| room | rows with known draws | chosen changes | action changes | survivor first only with draws | only without |
|---|---|---|---|---|---|
| boss | 15 | 10/15 (67%) | 4/15 (27%) | 2 | 0 |
| elite | 8 | 4/8 (50%) | 1/8 (12%) | 0 | 3 |

## planning time per decision, s (frozen clock: every schedule run whole, so the time the samples need)

| variant | room | n | median | p90 | max |
|---|---|---|---|---|---|
| both | all | 31 | 1.0 | 17.3 | 344.3 |
| both | boss | 19 | 0.7 | 6.6 | 344.3 |
| both | elite | 12 | 5.9 | 20.4 | 44.6 |
| compute | all | 31 | 0.7 | 25.7 | 34.7 |
| compute | boss | 19 | 0.6 | 4.1 | 34.1 |
| compute | elite | 12 | 9.8 | 28.5 | 34.7 |
| draws | all | 31 | 0.4 | 7.0 | 385.5 |
| draws | boss | 19 | 0.2 | 1.7 | 385.5 |
| draws | elite | 12 | 3.2 | 7.6 | 10.4 |
| off | all | 31 | 0.5 | 8.0 | 34.3 |
| off | boss | 19 | 0.3 | 1.5 | 34.3 |
| off | elite | 12 | 4.6 | 11.6 | 13.0 |

## planning time per decision, s (real clock: the live budgets)

| variant | room | n | median | p90 | max |
|---|---|---|---|---|---|
| both | all | 51 | 0.7 | 8.9 | 16.7 |
| both | boss | 39 | 0.4 | 2.9 | 8.7 |
| both | elite | 12 | 5.1 | 12.8 | 16.7 |
| compute | all | 51 | 0.7 | 7.7 | 20.0 |
| compute | boss | 39 | 0.4 | 1.5 | 4.8 |
| compute | elite | 12 | 4.4 | 19.8 | 20.0 |
| off | all | 51 | 0.3 | 1.0 | 1.7 |
| off | boss | 39 | 0.2 | 0.5 | 1.7 |
| off | elite | 12 | 0.7 | 1.4 | 1.4 |

## real clock: rollout samples and horizon reached

- off: {'8x5': 27, 'NonexNone': 18, '4x3': 2, '2x3': 1, '3x3': 1, '1x3': 1, '3x5': 1}
- compute: {'24x5': 29, 'NonexNone': 18, '16x5': 3, '21x5': 1}
- both: {'24x5': 38, 'NonexNone': 13}
