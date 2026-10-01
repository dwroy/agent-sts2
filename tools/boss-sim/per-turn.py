#!/usr/bin/env python3
"""Turn by turn, the simulated boss fights against the logged ones, per boss (B4, docs/boss-sim.md §13).

For one results set (tools/boss-sim/backtest.ts output) and one start point, on the fights of one side of
experiments/boss-sim/split.json: for each fight turn k (from the start), over the fights the log still fought on turn k
and the sim still had samples fighting, the mean of
  - the enemies' attack shown at the start of the turn (log: intent_damage; sim: the attack its policy faced),
  - the HP the enemy turn took through our block (log: enemy_turn_hp_lost; sim: enemyLoss),
  - the HP lost that turn, and the enemies' HP at the start of the turn (log: enemy_hp; sim: the HP left at the end of
    the turn before, backtest perTurn[5]),
  - the sim's samples still fighting (share).
Each fight counts once per turn (the sim's number is its mean over the samples still fighting).

Usage: python3 tools/boss-sim/per-turn.py --results 'experiments/boss-sim/raw/NAME/results-*.jsonl' [--set val_ext]
         [--start t1] [--enc CRUSHER] [--turns experiments/boss-sim/raw/turns-1001.jsonl] [--max-turn 12] [--json out.json]
"""

import argparse
import glob
import json
import os
import statistics

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load(pattern):
    rows = []
    for path in sorted(glob.glob(pattern)):
        with open(path) as handle:
            rows.extend(json.loads(line) for line in handle if line.strip())
    return rows


def table(rows, turns, start, max_turn):
    out = []
    for k in range(1, max_turn + 1):
        acc = {key: [] for key in ("a_inc", "a_thru", "a_loss", "a_ehp", "s_inc", "s_thru", "s_loss", "s_ehp", "s_fight")}
        for r in rows:
            sim = r.get("sim")
            by = turns.get(r["key"], {})
            offset = 4 if start == "t5" else 0
            here = by.get(k + offset)
            if not sim or not here:
                continue
            per = sim.get("perTurn", [])
            if len(per) < k or per[k - 1][0] == 0:
                continue
            p = per[k - 1]
            acc["a_inc"].append(here[4] or 0)
            if here[5] is not None:
                acc["a_thru"].append(here[5])
                acc["s_thru"].append(p[4])
            acc["a_loss"].append(here[3] or 0)
            acc["a_ehp"].append(here[2] or 0)
            acc["s_inc"].append(p[3])
            acc["s_loss"].append(p[1])
            if k >= 2 and len(p) > 5 and len(per[k - 2]) > 5:
                acc["s_ehp"].append(per[k - 2][5])
            acc["s_fight"].append(p[0] / sim["samples"])
        n = len(acc["a_inc"])
        if n == 0:
            continue
        mean = lambda xs: round(statistics.fmean(xs), 1) if xs else None  # noqa: E731
        out.append({"turn": k, "n": n, **{key: mean(xs) for key, xs in acc.items()}})
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--results", required=True)
    parser.add_argument("--set", default="val_ext")
    parser.add_argument("--start", default="t1")
    parser.add_argument("--enc", default="")
    parser.add_argument("--split", default=os.path.join(ROOT, "experiments", "boss-sim", "split.json"))
    parser.add_argument("--turns", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "turns-1001.jsonl"))
    parser.add_argument("--max-turn", type=int, default=12)
    parser.add_argument("--json")
    args = parser.parse_args()
    split = json.load(open(args.split))
    keys = None if args.set == "all" else set(split[args.set])
    turns = {}
    with open(args.turns) as handle:
        for line in handle:
            if line.strip():
                r = json.loads(line)
                turns[r["key"]] = {t[0]: t for t in r["turns"]}
    rows = [r for r in load(args.results) if r["start"] == args.start and (keys is None or r["key"] in keys)
            and (not args.enc or any(e in r["enc"] for e in args.enc.split(",")))]
    out = table(rows, turns, args.start, args.max_turn)
    print(f"{len(rows)} fights, start {args.start}, set {args.set}, enc {args.enc or 'all'}")
    print("turn  n | incoming log/sim | through block log/sim | HP lost log/sim | enemy HP log/sim | sim fighting")
    for t in out:
        print(f"{t['turn']:>4} {t['n']:>3} | {t['a_inc']:>6} {t['s_inc']:>6} | {t['a_thru']!s:>6} {t['s_thru']!s:>6} | "
              f"{t['a_loss']:>6} {t['s_loss']:>6} | {t['a_ehp']:>6} {t['s_ehp']!s:>6} | {t['s_fight']:.2f}")
    if args.json:
        with open(args.json, "w") as handle:
            json.dump(out, handle, indent=1)


if __name__ == "__main__":
    main()
