# B4: a policy threat term for the Kaiser Crab and the Queen (tried, not adopted)

Run on top of the two bosses' mechanism fixes (branch v4-sim-crabqueen; raw/b4-final is that code); v4-sim has neither.

The whole-fight policy's HP weight times (1 + T x the enemies' attack this turn / our HP) in these two fights only
(src/sim/boss-sim.ts BOSS_POLICY_THREAT; tools/boss-sim/backtest.ts --boss-threat). B1.5's one-turn replay on the tune fights:
the policy (x0.5) lost 13.7 HP a turn on the Crab against the log's 10.0, 12.7 on the Queen against 10.6; with T = 2,
10.9 and 10.4. Rule, fixed before the runs: take the T with the lowest raw Brier over t1 + t5 + pre on the tune fights of the
two bosses (40). Tune fights, raw Brier per boss; leak = HP through block simulated / logged, turns 2-7 from the start.

| T | start | Crab Brier | Crab forecast / actual | Crab leak | Queen Brier | Queen forecast / actual | Queen leak | overall tune Brier (calibrated) |
|---|---|---|---|---|---|---|---|---|
| 0 | t1 | 0.038 | 0.23 / 0.25 | 1.147 | 0.250 | 0.00 / 0.25 | 1.499 | 0.1249 |
| 0 | t5 | 0.022 | 0.30 / 0.30 | 1.35 | 0.153 | 0.06 / 0.25 | 2.662 | 0.0712 |
| 0 | pre | 0.062 | 0.22 / 0.25 | 1.152 | 0.250 | 0.00 / 0.25 | 1.536 | 0.1273 |
| 1 | t1 | 0.045 | 0.22 / 0.25 | 1.047 | 0.250 | 0.00 / 0.25 | 1.422 | 0.1253 |
| 1 | t5 | 0.034 | 0.30 / 0.30 | 1.123 | 0.149 | 0.06 / 0.25 | 2.537 | 0.0724 |
| 1 | pre | 0.069 | 0.22 / 0.25 | 1.039 | 0.250 | 0.00 / 0.25 | 1.463 | 0.1278 |
| 2 | t1 | 0.052 | 0.21 / 0.25 | 0.997 | 0.250 | 0.00 / 0.25 | 1.403 | 0.1254 |
| 2 | t5 | 0.042 | 0.30 / 0.30 | 1.032 | 0.149 | 0.06 / 0.25 | 2.501 | 0.0729 |
| 2 | pre | 0.078 | 0.22 / 0.25 | 0.987 | 0.250 | 0.00 / 0.25 | 1.437 | 0.1285 |
| 4 | t1 | 0.071 | 0.19 / 0.25 | 0.948 | 0.250 | 0.00 / 0.25 | 1.364 | 0.1262 |
| 4 | t5 | 0.047 | 0.28 / 0.30 | 0.977 | 0.153 | 0.06 / 0.25 | 2.503 | 0.0729 |
| 4 | pre | 0.085 | 0.20 / 0.25 | 0.931 | 0.250 | 0.00 / 0.25 | 1.398 | 0.1285 |

T = 0 has the lowest Brier on the tune fights (the Crab worse at every T > 0, the Queen's forecasts hardly move: 0 wins
forecast at every T while 2 of 8 won). Not adopted. With T = 2 the Crab's turns match the log (turn-5 start, tune: HP through block
6.2 / 10.2 / 3.0 against the log's 6.1 / 9.5 / 3.2, the enemies' HP 245 / 214 / 178 against 247 / 218 / 182; b4-per-turn.md),
but its forecasts get worse. The validation fights (calibrated, val_ext), for the record:

| variant | t1 | t5 | pre | Crab t1 / t5 / pre | Queen t1 / t5 / pre |
|---|---|---|---|---|---|
| T = 0 (adopted) | 0.1209 | 0.0870 | 0.1207 | 0.079 / 0.042 / 0.100 | 0.106 / 0.128 / 0.100 |
| Queen T = 2 | 0.1209 | 0.0870 | 0.1207 | 0.079 / 0.042 / 0.100 | 0.105 / 0.128 / 0.100 |
| Crab and Queen T = 2 | 0.1216 | 0.0880 | 0.1212 | 0.088 / 0.056 / 0.105 | 0.105 / 0.128 / 0.099 |
