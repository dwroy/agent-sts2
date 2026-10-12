# Route projection against what happened (2026-10-04)

How far the route projection that the act-start candidate routes use (`projectPath`: each room at its median measured
cost, rest sites heal) is from the HP the runs actually had. Below, "real − projected" is in HP, and negative means
the projection was optimistic. `tools/eval/calibration.py` reports the opposite sign (predicted − actual).

Sources:

- `tools/eval/route-projection-split.py`: every logged route plan, at each node the run walked on it, with the node
  after a death counted as 0. Outputs: `projection-split-all.txt` (all V4 runs, 582 plans, 6157 nodes) and
  `projection-split-v45-a9.txt` (the V4.5 A9 window).
- `tools/eval/calibration.py --ascension 9 --since 2026-10-03T03:00:23Z [--until | --since 2026-10-03T09:58:49Z] --no-boss`
  for the two segments of the V4.5 window.

## Findings

1. **Before any rest site, the projection is pessimistic, not optimistic.**
   - DeepSeek plans, real − projected median: +1 (1 room), +3 (2–3 rooms), +4.6 (4–6 rooms); n = 482 / 870 / 959.
   - GPT (codex) plans: +7 / +8 / +3; n = 19 / 31 / 30.
   - The V4.5 note's "GPT segment −6 at 2–3 floors" is `calibration.py`'s predicted − actual. So it means the
     projection was 6 HP *below* what happened. Its "低估 <−2" (underestimate) column is 56–62% at 2–5 floors in that
     segment. `paper/materials/v45-a9-metrics.md` line 64 ("投影比实际多 6 血", the projection 6 HP above reality)
     reads the sign backwards. The DeepSeek segment's −1.5 is the same direction.
2. **The optimism is after rest sites: the projection heals at every one.**
   - After a rest that was smithed, DeepSeek plans: −19 (2–3 rooms), −9 (4–6), −6 (7+).
   - With every rest healed: about 0 up to 6 rooms, then −5 at 7+ rooms.
   - At 9–12 floors, `calibration.py` gives +4.5 to +5.5 (optimistic) for both segments.
3. **Per room, from walked plan steps with deaths counted.**

   | Room | n | Real loss (median / mean) | Projected median |
   |---|---|---|---|
   | Act-2 hallway | 672 | 5 / 7.4 | 8.7 |
   | Act-3 hallway | 273 | 9 / 11.5 | 9.8 |
   | Act-3 elite | 31 | 46 / 43.4 | 34.2 |
   | "?" room | — | mean +1.5 to +2.4 | about 0 |

   The act-3 elite is the one room type clearly costlier than projected. The live, refreshed `room-costs.json`
   (v4-live worktree, 10-03, 475 runs) already moved its A9 act-3 elite median to 46 (n=9).
4. **Act-3 hallway chains.** The real loss per hallway does not grow with its place in the chain since the last rest
   site:
   - act 3 DeepSeek: 9 / 6 / 13 / 5.5 median for the 1st / 2nd / 3rd / 4th+ fight;
   - act 2: 5 / 4 / 8.5 / 6.

   What wears runs down is the HP sliding with no heal: median entry HP falls from 0.88 to 0.63 of max HP by the
   4th fight, and the deaths cluster there (act 2: 3 of 41 at the 4th; act 3 codex: 2 of 3). The summed projection
   already shows that slide. The bad-stretch p75 line in `candidate_routes` shows its tail (PEGLM9PFY97U F25–F31:
   seven rooms with no rest site, p75 12 on reaching F32; the run died at F30).

## Proposal (not applied)

No global correction is supported: the error changes sign with horizon and with what is done at the rest sites. Two
narrow changes for Roy to choose from:

- **Rest sites.** For each candidate route, show the boss-entry HP if every rest site is smithed instead of healed. A
  smith costs 9–25 HP against the projection. The candidate routes say "锻造就少这一次回血" (smithing loses that
  rest's heal) but give no number.
- **Act-3 elites.** Use the elite's p75 for act-3 elite entries until the A9 sample grows. The repo's 09-29
  `room-costs.json` has A8 at 41 / A9 at 68.5 (n=2). The live file is already at 46 (n=9). This is a data question,
  not a code one.
