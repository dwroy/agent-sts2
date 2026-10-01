# B4: the synthetic start (B3) against the logged pre-fight start, the four bosses

tools/boss-sim/backtest.ts --starts pre,syn --set val_ext --enc CRUSHER,QUEEN,THE_INSATIABLE,KNOWLEDGE_DEMON, 200 samples, B4 code
(raw: experiments/boss-sim/raw/b4-syn). Calibrated with the refitted pre map (0.6425, 0.6369).

| boss | n | raw win rate syn − pre: mean / mean abs | Brier pre / syn |
|---|---|---|---|
| 帝王蟹 | 14 | +0.003 / 0.043 | 0.100 / 0.117 |
| 女王 | 9 | −0.002 / 0.002 | 0.100 / 0.097 |
| 无厌沙虫 | 17 | −0.052 / 0.066 | 0.181 / 0.179 |
| 知识恶魔 | 19 | −0.018 / 0.044 | 0.058 / 0.051 |

The Insatiable's Sandpit and Frantic Escapes come from Liquify Ground in both starts (the synthetic start has no Sandpit
yet, as the log's turn 1 has none).
