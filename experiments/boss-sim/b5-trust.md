# Boss trust: val_ext, B5 backtest: the Kaiser Crab's faced hit and the policy's one-turn lookahead (experiments/boss-sim/raw/b5-final, 200 samples a fight; val_ext through V4.2; docs/boss-sim.md §14)

Criteria: n ≥ 10; calibrated Brier ≤ 1.25 × overall; |mean forecast − actual| ≤ 15%; HP through block sim/log in [0.7, 1.3].

## B2 (t1): overall n 210, Brier 0.1197, forecast 0.630 / actual 0.624, leak 1.074

| boss | n | Brier | forecast / actual | leak sim/log | failed |
|---|---|---|---|---|---|
| 乐加维林族母 | 13 | 0.045 | 0.69 / 0.77 | 0.88 | — |
| 仪式兽 | 13 | 0.049 | 0.82 / 0.85 | 1.108 | — |
| 同族 | 14 | 0.126 | 0.84 / 0.79 | 0.826 | — |
| 墨影幻灵 | 21 | 0.079 | 0.81 / 0.91 | 0.934 | — |
| 女王 | 14 | 0.091 | 0.09 / 0.14 | 1.324 | leak |
| 实验体 | 6 | 0.304 | 0.07 / 0.33 | 2.302 | n, brier, gap, leak |
| 帝王蟹 | 23 | 0.147 | 0.45 / 0.39 | 1.266 | — |
| 无厌沙虫 | 21 | 0.154 | 0.60 / 0.48 | 1.059 | brier |
| 永世沙漏 | 7 | 0.171 | 0.50 / 0.57 | 0.988 | n, brier |
| 瀑布巨兽 | 26 | 0.215 | 0.64 / 0.46 | 1.056 | brier, gap |
| 灵魂异鱼 | 29 | 0.099 | 0.90 / 0.90 | 0.8 | — |
| 知识恶魔 | 23 | 0.047 | 0.57 / 0.65 | 1.004 | — |

## B3 (pre): overall n 210, Brier 0.1205, forecast 0.622 / actual 0.624, leak 1.07

| boss | n | Brier | forecast / actual | leak sim/log | failed |
|---|---|---|---|---|---|
| 乐加维林族母 | 13 | 0.051 | 0.71 / 0.77 | 0.886 | — |
| 仪式兽 | 13 | 0.068 | 0.82 / 0.85 | 1.1 | — |
| 同族 | 14 | 0.091 | 0.82 / 0.79 | 0.855 | — |
| 墨影幻灵 | 21 | 0.076 | 0.79 / 0.91 | 0.922 | — |
| 女王 | 14 | 0.117 | 0.09 / 0.14 | 1.327 | leak |
| 实验体 | 6 | 0.242 | 0.08 / 0.33 | 2.165 | n, brier, gap, leak |
| 帝王蟹 | 23 | 0.139 | 0.44 / 0.39 | 1.24 | — |
| 无厌沙虫 | 21 | 0.182 | 0.58 / 0.48 | 1.06 | brier |
| 永世沙漏 | 7 | 0.182 | 0.50 / 0.57 | 0.978 | n, brier |
| 瀑布巨兽 | 26 | 0.200 | 0.62 / 0.46 | 1.081 | brier, gap |
| 灵魂异鱼 | 29 | 0.097 | 0.88 / 0.90 | 0.816 | — |
| 知识恶魔 | 23 | 0.063 | 0.59 / 0.65 | 0.988 | — |
