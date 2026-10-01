# B4: the synthetic start (B3) against the logged pre-fight start

tools/boss-sim/backtest.ts --starts pre,syn --set val_ext, 200 samples (raw: experiments/boss-sim/raw/b4-syn). The
Insatiable and the Knowledge Demon (the fixes in v4-sim) calibrated with v4-sim's refitted pre map (0.7573, 0.5783);
the Kaiser Crab and the Queen with their fixes (branch v4-sim-crabqueen) and that branch's pre map (0.6425, 0.6369).

| boss | n | raw win rate syn − pre: mean / mean abs | Brier pre / syn |
|---|---|---|---|
| 无厌沙虫 | 17 | −0.052 / 0.066 | 0.187 / 0.183 |
| 知识恶魔 | 19 | −0.018 / 0.044 | 0.062 / 0.054 |
| 帝王蟹（分支） | 14 | +0.003 / 0.043 | 0.100 / 0.117 |
| 女王（分支） | 9 | −0.002 / 0.002 | 0.100 / 0.097 |

The Insatiable's Sandpit and Frantic Escapes come from Liquify Ground in both starts (the synthetic start has no Sandpit
yet, as the log's turn 1 has none).
