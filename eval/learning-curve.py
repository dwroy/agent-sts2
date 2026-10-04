#!/usr/bin/env python3
"""Per-ascension learning curve for the paper (paper/materials/learning/README.md; docs/learning-protocol.md §6, §8).

One CSV per character, paper/data/learning-curve-<character>.csv, one row per ascension the character played:

  character, ascension, runs, wins, first_try_wins, sl_wins, mean_floor, mean_first_try_floor,
  first_run, last_run, started, ended,
  items_found, items_found_prior_yes, items_shipped, items_shipped_ids, repeats, repeats_after_ship

- runs / wins / mean_floor: finished runs in logs/runs.jsonl at that ascension (its "ascension"), wins with SL counted.
- first-try (docs/sl.md §5, eval/metrics.py first_attempt): a run whose SL log (logs/sl-attempts.jsonl) has a
  predicted_death row was lost on its first attempt at that row's floor; first_try_wins = wins without one, sl_wins =
  wins with one; mean_first_try_floor = that floor, else the final floor.
- items_found: ledger items (learner/ledger.py fold) whose "asc" (discovery) is this ascension; items_found_prior_yes:
  those the agent already handled right before any learning ("prior": "yes", the pretraining confounder).
- items_shipped: ledger items now shipped whose shipping (the update row's ts) came before the start of a run at this
  ascension and after the start of every earlier run, i.e. the first run that could use them played this ascension
  (a run's start: its first logs/run-config.jsonl row, else the previous run's end). Shipped after the last run: a row
  with an empty ascension ("not played yet").
- repeats: "repeat" evidence (the same mistake again) in runs at this ascension; repeats_after_ship: those logged after
  the item shipped.

Usage: python3 eval/learning-curve.py [--character silent] [--logs DIR] [--ledger FILE] [--out-dir DIR] [--print]
Default: every character with a run in runs.jsonl. Python 3 stdlib only (paper_dataset.py runs it).
"""
import argparse
import csv
import datetime as dt
import importlib.util
import json
import os
import statistics
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "knowledge", "builders"))
from characters import character_key, run_character  # noqa: E402


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


metrics = load("eval_metrics", os.path.join(ROOT, "eval", "metrics.py"))

COLUMNS = ["character", "ascension", "runs", "wins", "first_try_wins", "sl_wins", "mean_floor", "mean_first_try_floor",
           "first_run", "last_run", "started", "ended", "items_found", "items_found_prior_yes", "items_shipped",
           "items_shipped_ids", "repeats", "repeats_after_ship"]


def jsonl(path):
    if not os.path.exists(path):
        return
    with open(path, encoding="utf8") as handle:
        for line in handle:
            try:
                row = json.loads(line)
            except ValueError:
                continue
            if isinstance(row, dict):
                yield row


def when(text):
    """An aware datetime from an ISO time ("Z" or an offset); None when missing or bad."""
    if not isinstance(text, str) or not text:
        return None
    try:
        value = dt.datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    return value if value.tzinfo else value.replace(tzinfo=dt.timezone.utc)


def mean(values):
    values = [v for v in values if isinstance(v, (int, float))]
    return round(statistics.mean(values), 2) if values else None


def curve(character, logs, items):
    """The rows for one character (oldest ascension first)."""
    runs = [r for r in jsonl(os.path.join(logs, "runs.jsonl")) if r.get("run_id") and run_character(r) == character]
    sl = {}
    for row in jsonl(os.path.join(logs, "sl-attempts.jsonl")):
        if row.get("run_id"):
            sl.setdefault(row["run_id"], []).append(row)
    starts = {}
    for row in jsonl(os.path.join(logs, "run-config.jsonl")):
        t = when(row.get("ts"))
        if row.get("run_id") and t and (row["run_id"] not in starts or t < starts[row["run_id"]]):
            starts[row["run_id"]] = t
    # Each run's start (run-config, else the previous run's end) and ascension, in file order.
    previous_end = None
    timeline = []
    for run in runs:
        start = starts.get(run["run_id"]) or previous_end
        timeline.append((start, run))
        previous_end = when(run.get("ended")) or previous_end
    asc_of = {run["run_id"]: run.get("ascension") for run in runs}

    by_asc = {}
    for start, run in timeline:
        asc = run.get("ascension")
        if not isinstance(asc, int):
            continue
        first = metrics.first_attempt(sl.get(run["run_id"], []), run.get("floor"), run.get("victory"), {1: False, 2: False}, {})
        g = by_asc.setdefault(asc, {"runs": [], "first": [], "starts": []})
        g["runs"].append(run)
        g["first"].append(first)
        g["starts"].append(start)

    mine = [item for item in items if item.get("character") == character]
    shipped_at = {}
    for item in mine:
        if item.get("status") == "shipped" and when(item.get("shipped_at")):
            t = when(item["shipped_at"])
            later = [run for start, run in timeline if start and start >= t and isinstance(run.get("ascension"), int)]
            shipped_at[item["id"]] = later[0]["ascension"] if later else ""

    rows = []
    for asc in sorted(by_asc):
        g = by_asc[asc]
        wins = [r for r in g["runs"] if r.get("victory") is True]
        first_wins = sum(1 for f in g["first"] if f["victory"])
        found = [i for i in mine if i.get("asc") == asc]
        shipped = sorted(i for i, a in shipped_at.items() if a == asc)
        reps = [(item, e) for item in mine for e in item.get("evidence", []) if e.get("role") == "repeat" and asc_of.get(e.get("run")) == asc]
        late = [1 for item, e in reps if item.get("shipped_at") and (e.get("added") or "") > item["shipped_at"]]
        starts_known = [s for s in g["starts"] if s]
        ends = [when(r.get("ended")) for r in g["runs"] if when(r.get("ended"))]
        rows.append({
            "character": character, "ascension": asc, "runs": len(g["runs"]), "wins": len(wins),
            "first_try_wins": first_wins, "sl_wins": len(wins) - first_wins,
            "mean_floor": mean([r.get("floor") for r in g["runs"]]), "mean_first_try_floor": mean([f["floor"] for f in g["first"]]),
            "first_run": g["runs"][0]["run_id"], "last_run": g["runs"][-1]["run_id"],
            "started": min(starts_known).isoformat(timespec="seconds") if starts_known else "",
            "ended": max(ends).isoformat(timespec="seconds") if ends else "",
            "items_found": len(found), "items_found_prior_yes": sum(1 for i in found if i.get("prior") == "yes"),
            "items_shipped": len(shipped), "items_shipped_ids": " ".join(shipped),
            "repeats": len(reps), "repeats_after_ship": len(late),
        })
    pending = sorted(i for i, a in shipped_at.items() if a == "")
    if pending:
        rows.append({**{c: "" for c in COLUMNS}, "character": character, "runs": 0, "items_shipped": len(pending), "items_shipped_ids": " ".join(pending)})
    return rows


def write(rows, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: ("" if row.get(k) is None else row.get(k)) for k in COLUMNS})


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--character")
    parser.add_argument("--logs", default=os.path.join(ROOT, "logs"))
    parser.add_argument("--ledger", default=os.environ.get("LEDGER_FILE") or os.path.join(ROOT, "paper", "materials", "learning", "ledger.jsonl"))
    parser.add_argument("--out-dir", default=os.path.join(ROOT, "paper", "data"))
    parser.add_argument("--print", action="store_true", help="print the rows as well")
    args = parser.parse_args(argv)
    os.environ["LEDGER_FILE"] = args.ledger
    ledger = load("ledger", os.path.join(ROOT, "learner", "ledger.py"))
    items = list(ledger.fold(ledger.read_rows(args.ledger)).values())
    if args.character:
        characters = [character_key(args.character)]
    else:
        characters = sorted({run_character(r) for r in jsonl(os.path.join(args.logs, "runs.jsonl")) if r.get("run_id")})
    for character in characters:
        rows = curve(character, args.logs, items)
        path = os.path.join(args.out_dir, f"learning-curve-{character}.csv")
        write(rows, path)
        print(f"{path}: {len(rows)} row(s)")
        if args.print:
            for row in rows:
                print("  " + ", ".join(f"{k}={row[k]}" for k in COLUMNS if row.get(k) not in (None, "")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
