# follow-up runs

## second sample of the 16 failure-origin questions

| arm | n | raw fail | minor | fail after recovery | same answer as 1st sample |
|---|---|---|---|---|---|
| A | 16 | 0 | 1 | 0 | 11/16 |
| B | 15 | 0 | 0 | 0 | 10/15 |
| C | 15 | 0 | 0 | 0 | 9/15 |
- A q086 run-plan: first answer minor; after recovery minor

## arm C through a local relay (no dsh stall) vs the main run on the same questions

| run | n | p50 s | p95 s | mean output tokens | median output tokens/s |
|---|---|---|---|---|---|
| A | 31 | 17.8 | 106.1 | 6,435 | 192 |
| B | 31 | 29.7 | 83.5 | 6,342 | 188 |
| C direct | 31 | 23.0 | 112.5 | 8,005 | 189 |
| C relay | 31 | 21.1 | 91.6 | 5,799 | 187 |

C relay: accepted 31/31, needed a retry 1
- short answer q016: direct 10.3s/227 tok, relay 2.2s/367 tok
- short answer q046: direct 10.3s/307 tok, relay 2.0s/318 tok
- short answer q075: direct 10.3s/94 tok, relay 1.6s/160 tok
