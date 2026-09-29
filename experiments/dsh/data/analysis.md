questions with all three arms: 93

## overall

| arm | n | raw fail (excl. minor) | no object | outside valid set | missing field | run plan not a plan | minor (extra field/empty reason) | fail after own recovery | live resolver accepts | calls | p50 s | p95 s | cost $ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 93 | 0/93 (0%) | 0/93 (0%) | 0/93 (0%) | 0/93 (0%) | 0/93 (0%) | 1/93 (1%) | 0/93 (0%) | 93/93 (100%) | 93 | 18.4 | 83.2 | 0.895 |
| B | 93 | 1/93 (1%) | 1/93 (1%) | 0/93 (0%) | 0/93 (0%) | 0/93 (0%) | 0/93 (0%) | 0/93 (0%) | 93/93 (100%) | 94 | 24.1 | 122.2 | 1.101 |
| C | 93 | 2/93 (2%) | 2/93 (2%) | 0/93 (0%) | 0/93 (0%) | 0/93 (0%) | 0/93 (0%) | 0/93 (0%) | 93/93 (100%) | 95 | 25.7 | 110.7 | 1.140 |

## per label group (raw fail / fail after recovery / live accept / p50 s / mean cost $)

| group | n | A | B | C |
|---|---|---|---|---|
| event/act-plan | 10 | 0 / 0 / 10 / 41 / 0.0178 | 1 / 0 / 10 / 78 / 0.0228 | 0 / 0 / 10 / 82 / 0.0235 |
| event/choose+plan | 13 | 0 / 0 / 13 / 19 / 0.0083 | 0 / 0 / 13 / 37 / 0.0114 | 0 / 0 / 13 / 26 / 0.0102 |
| map/route-plan | 8 | 0 / 0 / 8 / 47 / 0.0149 | 0 / 0 / 8 / 75 / 0.0211 | 2 / 0 / 8 / 82 / 0.0250 |
| rest/plan | 13 | 0 / 0 / 13 / 6 / 0.0063 | 0 / 0 / 13 / 6 / 0.0058 | 0 / 0 / 13 / 10 / 0.0059 |
| reward/card | 13 | 0 / 0 / 13 / 8 / 0.0044 | 0 / 0 / 13 / 9 / 0.0052 | 0 / 0 / 13 / 10 / 0.0052 |
| run-plan | 13 | 0 / 0 / 13 / 26 / 0.0092 | 0 / 0 / 13 / 44 / 0.0135 | 0 / 0 / 13 / 42 / 0.0143 |
| selection/* | 13 | 0 / 0 / 13 / 13 / 0.0069 | 0 / 0 / 13 / 5 / 0.0050 | 0 / 0 / 13 / 10 / 0.0063 |
| shop/plan | 10 | 0 / 0 / 10 / 38 / 0.0144 | 0 / 0 / 10 / 41 / 0.0171 | 0 / 0 / 10 / 53 / 0.0159 |

## raw failure classes (first answer, before recovery)

- A: {'minor': 1}
- B: {'parse:no_tool_call': 1}
- C: {'parse:no_tool_call': 2}

## final failure classes (after the arm's own recovery)

- A: {'minor': 1}
- B: {}
- C: {}

## recovery paths

- A: {'first': 93}
- B: {'first': 92, 'repaired': 1}
- C: {'accepted_at_1': 91, 'accepted_at_2': 2}

## tokens (sums over the questions)

| arm | calls | input | cache hit | output | reasoning | output / question | cost $ | cost / question $ |
|---|---|---|---|---|---|---|---|---|
| A | 93 | 2,084,996 | 1,221,888 (59%) | 524,312 | 516,017 | 5,638 | 0.895 | 0.0096 |
| B | 94 | 2,168,196 | 1,149,952 (53%) | 657,259 | 643,439 | 7,067 | 1.101 | 0.0118 |
| C | 95 | 2,211,572 | 1,195,648 (54%) | 690,045 | n/a (in output) | 7,420 | 1.140 | 0.0123 |

## truncation and long answers

- A: finish_reason=length 0
- B: finish_reason=length 0
- A slowest: q040 event/act-plan 169s, q078 selection/enchant 135s, q057 shop/plan 124s, q024 event/act-plan 110s, q059 shop/plan 89s
- B slowest: q024 event/act-plan 171s, q023 event/act-plan 153s, q060 map/route-plan 135s, q053 shop/plan 125s, q059 shop/plan 123s
- C slowest: q061 map/route-plan 191s, q060 map/route-plan 148s, q023 event/act-plan 135s, q065 map/route-plan 129s, q024 event/act-plan 115s

## agreement

| kind | n | A~logged | B~logged | C~logged | A~B | A~C | B~C |
|---|---|---|---|---|---|---|---|
| pick | 70 | 52/63 (83%) | 51/63 (81%) | 53/63 (84%) | 59/70 (84%) | 57/70 (81%) | 54/70 (77%) |
| shop-plan | 10 | 7/10 (70%) | 7/10 (70%) | 5/10 (50%) | 6/10 (60%) | 7/10 (70%) | 5/10 (50%) |
| run-plan | 13 | 6/7 (86%) | 6/7 (86%) | 6/7 (86%) | 10/13 (77%) | 12/13 (92%) | 11/13 (85%) |

route ~ logged (questions with a route review / act route and a logged route):
| arm | route ~ logged |
|---|---|
| A | 2/6 (33%) |
| B | 0/6 (0%) |
| C | 0/6 (0%) |

## instruction violations (usable answers that break an explicit instruction)

- A: {}
- B: {}
- C: {}

## route answers (questions with a route field)

| route kind | n | A | B | C | A~B | A~C | B~C |
|---|---|---|---|---|---|---|---|
| review | 20 | 20/20 given, 18 keep | 20/20 given, 18 keep | 20/20 given, 18 keep | 20/20 | 20/20 | 20/20 |
| act | 10 | 10/10 given, 0 keep | 10/10 given, 0 keep | 10/10 given, 0 keep | 6/10 | 5/10 | 9/10 |
