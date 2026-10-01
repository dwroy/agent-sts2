#!/usr/bin/env python3
"""The tune / validation split of the boss-sim backtest (docs/boss-sim.md B1.5): by time, whole runs on one side.

Runs are ordered by their first boss fight; the earliest runs holding about 2/3 of the fights are the tune set (every
parameter of the simulator's policy is chosen on it), the later runs the validation set (the numbers reported). A run's
boss fights all fall on the same side, so a deck seen in tuning is never judged in validation.

Usage: python3 tools/boss-sim/split.py [--in experiments/boss-sim/raw/fights.jsonl] [--out experiments/boss-sim/split.json] [--tune 0.667]
       python3 tools/boss-sim/split.py --extend --in experiments/boss-sim/raw/fights-1001.jsonl
--extend (B4, docs/boss-sim.md §13): keep the stored split (tune, val, cutoff) and add the fights logged since, all of them
from runs that started after the cutoff: "val_new" (those fights) and "val_ext" (val + val_new). The tune set never changes.
"""

import argparse
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def split(rows, share):
    first = {}
    for r in rows:
        first[r["run_id"]] = min(first.get(r["run_id"], r["first_ts"]), r["first_ts"])
    runs = sorted(first, key=lambda run: (first[run], run))
    per_run = {}
    for r in rows:
        per_run.setdefault(r["run_id"], []).append(r["key"])
    tune, val = [], []
    target = share * len(rows)
    cutoff = None
    for run in runs:
        if len(tune) < target:
            tune.extend(sorted(per_run[run]))
        else:
            cutoff = cutoff or first[run]
            val.extend(sorted(per_run[run]))
    return tune, val, cutoff


def extend(rows, path):
    stored = json.load(open(path))
    listed = set(stored["tune"]) | set(stored["val"])
    first = {}
    for r in rows:
        first[r["run_id"]] = min(first.get(r["run_id"], r["first_ts"]), r["first_ts"])
    new = sorted(r["key"] for r in rows if r["key"] not in listed)
    late = [k for k in new if first[k.split(":")[0]] < stored["cutoff_ts"]]
    if late:
        raise SystemExit(f"fights of runs before the cutoff not in the split: {late}")
    won = {r["key"]: r["outcome"] == "won" for r in rows}
    stored["val_new"] = new
    stored["val_ext"] = sorted(stored["val"]) + new
    stored["val_new_n"] = len(new)
    stored["val_ext_n"] = len(stored["val_ext"])
    stored["val_ext_win_rate"] = round(sum(won[k] for k in stored["val_ext"]) / max(1, len(stored["val_ext"])), 3)
    stored["extended_to"] = max(r["first_ts"] for r in rows)
    with open(path, "w") as handle:
        json.dump(stored, handle, indent=0)
        handle.write("\n")
    print(json.dumps({k: v for k, v in stored.items() if k not in ("tune", "val", "val_new", "val_ext")}))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--in", dest="inp", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "fights.jsonl"))
    parser.add_argument("--out", default=os.path.join(ROOT, "experiments", "boss-sim", "split.json"))
    parser.add_argument("--tune", type=float, default=2 / 3)
    parser.add_argument("--extend", action="store_true", help="keep the stored split, add the later fights as val_new / val_ext")
    args = parser.parse_args()
    rows = [json.loads(line) for line in open(args.inp) if line.strip()]
    if args.extend:
        return extend(rows, args.out)
    tune, val, cutoff = split(rows, args.tune)
    won = {r["key"]: r["outcome"] == "won" for r in rows}
    out = {
        "rule": "runs by first boss fight time; the earliest runs holding ~2/3 of the fights tune, the rest validate",
        "cutoff_ts": cutoff,
        "tune_n": len(tune), "val_n": len(val),
        "tune_win_rate": round(sum(won[k] for k in tune) / max(1, len(tune)), 3),
        "val_win_rate": round(sum(won[k] for k in val) / max(1, len(val)), 3),
        "tune": tune, "val": val,
    }
    with open(args.out, "w") as handle:
        json.dump(out, handle, indent=0)
        handle.write("\n")
    print(json.dumps({k: v for k, v in out.items() if k not in ("tune", "val")}))


if __name__ == "__main__":
    main()
