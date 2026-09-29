#!/usr/bin/env python3
"""One streaming pass over logs/states.jsonl, logs/decisions.jsonl and logs/run-plans.jsonl: the rows of
the target runs, one file per run and log (data/runs/<run>.<log>.jsonl), so each replay reads only its run.
Decision rows without a run_id (before 09-28 ~15:00) go with the run whose state row has the same ts."""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOGS = HERE.parents[1] / "logs"
OUT = HERE / "data" / "runs"
OUT.mkdir(parents=True, exist_ok=True)
runs = sorted({t["run_id"] for t in json.load(open(HERE / "data" / "targets.json"))})
want = set(runs)
RUN = re.compile(rb'"run_id":"([^"]*)"')
TS = re.compile(rb'^\{"ts":"([^"]+)"')

files = {}
def out(run, log):
    key = (run, log)
    if key not in files:
        files[key] = open(OUT / f"{run}.{log}.jsonl", "wb")
    return files[key]

ts_run = {}  # state-row ts -> run, for decision rows without run_id
n = 0
with open(LOGS / "states.jsonl", "rb") as f:
    for line in f:
        m = RUN.search(line, 0, 4000)
        if not m:
            continue
        run = m.group(1).decode()
        if run in want:
            out(run, "states").write(line)
            t = TS.match(line)
            if t:
                ts_run[t.group(1)] = run
            n += 1
print(f"states: {n} rows", file=sys.stderr)
n = 0
with open(LOGS / "decisions.jsonl", "rb") as f:
    for line in f:
        m = RUN.search(line)
        run = m.group(1).decode() if m else None
        if run is None:
            t = TS.match(line)
            run = ts_run.get(t.group(1)) if t else None
        if run in want:
            out(run, "decisions").write(line)
            n += 1
print(f"decisions: {n} rows", file=sys.stderr)
n = 0
RUNP = re.compile(rb'"run":"([^"]*)"')
with open(LOGS / "run-plans.jsonl", "rb") as f:
    for line in f:
        m = RUNP.search(line)
        if m and m.group(1).decode() in want:
            out(m.group(1).decode(), "runplans").write(line)
            n += 1
print(f"run plans: {n} rows", file=sys.stderr)
for fh in files.values():
    fh.close()
