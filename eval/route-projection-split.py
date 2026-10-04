#!/usr/bin/env python3
"""Route projection against what happened, split the way the act-start route question needs it (Dai 2026-10-04).

Every logged route plan (decisions.jsonl `route_plan`: map/route-plan, event/act-plan, map/route-change,
map/route-review) projects the HP on arriving at each node of its path (hpOnArrival x max HP). While the run walked the
plan node by node (map_choices), each node's projection is set against the HP the run entered it with
(floors.entry_hp); the node after a room the run died in counts as 0. Split by act, engine (the plan's decider: codex =
GPT, else DeepSeek), rooms between the plan and the node (1, 2-3, 4-6, 7+), and the rest sites passed on the way:
none yet, all healed, or one smithed (the projection assumes every rest site heals). Then each room's own cost:
the projection's step against the real step.

Differences are real minus projected, in HP: negative = the projection said more HP than the run had (optimistic).
eval/calibration.py reports the other way round (predicted minus actual).

Usage (worktree root): data/logdb-venv/bin/python eval/route-projection-split.py [--since 2026-10-03T03:00Z] [--asc 9]
"""
import argparse
import collections
import json
import os
import statistics as st
import subprocess
import sys
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = str(Path(__file__).resolve().parents[1])  # the project root (docs/layout.md)
FIRST = {1: 1, 2: 18, 3: 34}


def query(sql):
    out = subprocess.run([sys.executable, os.path.join(ROOT, "agent", "tools", "logdb", "query.py"), "--no-sync", "--json", "--max-rows", "500000", sql],
                         capture_output=True, text=True, cwd=ROOT).stdout
    data = json.loads(out)
    if "error" in data:
        raise SystemExit(data["error"])
    return [dict(zip(data["columns"], row)) for row in data["rows"]]


def steps(since, asc):
    where = [f"d.label IN ('map/route-plan','event/act-plan','map/route-change','map/route-review')"]
    if since:
        where.append(f"d.ts >= '{since}'")
    if asc is not None:
        where.append(f"r.ascension = {int(asc)}")
    plans = query(f"SELECT d.run_id, d.floor, d.label, d.decider, d.ts, d.off, d.len FROM decisions d JOIN runs r USING (run_id) WHERE {' AND '.join(where)} ORDER BY d.ts")
    if not plans:
        return []
    runs = ",".join(f"'{r}'" for r in sorted({p["run_id"] for p in plans}))
    walked = {(c["run_id"], c["floor"] + 1): (c["row"], c["col"]) for c in query(f"SELECT run_id, floor, node.row AS row, node.col AS col FROM map_choices WHERE run_id IN ({runs})")}
    floors = {(f["run_id"], f["floor"]): f for f in query(f"SELECT run_id, floor, entry_hp, entry_max_hp, exit_hp, died FROM floors WHERE run_id IN ({runs})")}
    out = []
    with open(os.path.join(ROOT, "logs", "decisions.jsonl"), "rb") as fh:
        for p in plans:
            fh.seek(p["off"])
            plan = json.loads(fh.read(p["len"])).get("route_plan")
            if not plan or not plan.get("path"):
                continue
            first, path = FIRST.get(plan["act"], 1), plan["path"]
            base = {"run": p["run_id"], "label": p["label"], "engine": "codex" if p["decider"] == "codex" else "deepseek", "act": plan["act"], "plan_floor": plan.get("floor")}
            rest, smithed = False, False
            for k, step in enumerate(path):
                floor = first + step["row"]
                real = floors.get((p["run_id"], floor))
                if walked.get((p["run_id"], floor)) != (step["row"], step["col"]) or real is None or real["entry_hp"] is None:
                    break
                mx = real["entry_max_hp"] or 80
                out.append({**base, "k": k, "type": step["type"], "rest": rest, "smithed": smithed, "proj": step["hpOnArrival"] * mx, "real": real["entry_hp"]})
                if step["type"] in ("RestSite", "Rest"):
                    rest = True
                    smithed = smithed or (real["exit_hp"] is not None and real["exit_hp"] <= real["entry_hp"])
                if real.get("died"):
                    if k + 1 < len(path):
                        out.append({**base, "k": k + 1, "type": path[k + 1]["type"], "rest": rest, "smithed": smithed, "proj": path[k + 1]["hpOnArrival"] * mx, "real": 0})
                    break
    return out


def summary(values):
    xs = sorted(values)
    if not xs:
        return "-"
    return f"n={len(xs):5d}  median {st.median(xs):+6.1f}  mean {st.mean(xs):+6.1f}  p25 {xs[int(0.25 * len(xs))]:+5.0f}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--since")
    parser.add_argument("--asc", type=int)
    args = parser.parse_args()
    rows = steps(args.since, args.asc)
    bucket = lambda k: "1" if k == 1 else "2-3" if k <= 3 else "4-6" if k <= 6 else "7+"
    rest = lambda r: ("one smithed" if r["smithed"] else "all healed") if r["rest"] else "no rest yet"
    print(f"plan steps walked: {len(rows)} (real - projected, HP; negative = optimistic)\n")
    groups = collections.defaultdict(list)
    for r in rows:
        if r["k"] == 0:
            continue
        groups[(r["engine"], bucket(r["k"]), rest(r))].append(r["real"] - r["proj"])
        groups[(f"act {r['act']} {r['engine']}", bucket(r["k"]), rest(r))].append(r["real"] - r["proj"])
    for key in sorted(groups):
        print(f"{key[0]:16s} rooms {key[1]:4s} {key[2]:12s} {summary(groups[key])}")
    print("\neach room's cost (real loss | projected loss), the next node walked or the death after it:")
    by_plan = collections.defaultdict(list)
    for r in rows:
        by_plan[(r["run"], r["plan_floor"], r["label"])].append(r)
    rooms = collections.defaultdict(list)
    for plan in by_plan.values():
        plan.sort(key=lambda r: r["k"])
        for a, b in zip(plan, plan[1:]):
            if b["k"] == a["k"] + 1 and a["type"] not in ("RestSite", "Rest"):
                rooms[(a["act"], a["type"], a["engine"])].append((a["real"] - b["real"], a["proj"] - b["proj"]))
    for key in sorted(rooms):
        pairs = rooms[key]
        if len(pairs) < 5:
            continue
        real, proj = [x for x, _ in pairs], [y for _, y in pairs]
        print(f"act {key[0]} {key[1]:9s} {key[2]:8s} n={len(pairs):4d}  real median {st.median(real):5.1f} mean {st.mean(real):5.1f}  | projected median {st.median(proj):5.1f}")


if __name__ == "__main__":
    main()
