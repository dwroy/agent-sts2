#!/usr/bin/env python3
"""Sensitive per-run metrics, grouped, for judging whether changes help (more signal than wins alone).

Per finished run (paper/data/runs.csv for the list; jev-sts2/logs/decisions.jsonl for the fights):
  floor reached; passed act 1 / act 2 boss; reached the final boss; win;
  HP% and potions carried into each act boss; HP lost per boss / elite / hallway fight;
  potions carried into elites.
Elite fights are known from logs/fight-plans.jsonl (the new architecture only; older runs show "-").

Groups: by ascension, and by era (before/after --split, default the fight-plan launch). Several
--split values give several eras.

Usage: python3 ops/metrics.py [--split 2026-09-26T02:00] [--asc 5] [--last 20] [--out paper/data/metrics.md]
"""
import argparse
import collections
import csv
import json
import os
import re
import statistics

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGS = os.path.join(ROOT, "logs")
BOSS_FLOORS = (17, 33, 48)
ARCH_START = "2026-09-25T12:10"  # FIGHT_PLAN=v1 went live (UTC)


def load_runs():
    rows = list(csv.DictReader(open(os.path.join(ROOT, "paper", "data", "runs.csv"))))
    return [r for r in rows if r.get("finished") == "1" and r.get("floor_max")]


def load_elites():
    elites = collections.defaultdict(set)
    path = os.path.join(LOGS, "fight-plans.jsonl")
    if os.path.exists(path):
        for line in open(path):
            try:
                x = json.loads(line)
            except json.JSONDecodeError:
                continue
            if x.get("kind") == "elite" and x.get("floor") is not None:
                elites[x.get("run")].add(int(x["floor"]))
    return elites


def scan_fights(run_ids):
    """Per run and floor: HP at the first and last combat decision, potions at the first."""
    fights = collections.defaultdict(dict)
    rx = re.compile(r'\\"run\\":\\"([A-Z0-9]{12})\\"')
    with open(os.path.join(LOGS, "decisions.jsonl"), "rb") as fh:
        for raw in fh:
            m = rx.search(raw.decode("utf8", "ignore")[:3000])
            if not m or m.group(1) not in run_ids:
                continue
            try:
                x = json.loads(raw)
                fp = json.loads(x["fingerprint"])
            except (json.JSONDecodeError, KeyError):
                continue
            if not fp.get("combat") or fp.get("hp") is None or x.get("floor") in (None, ""):
                continue
            floor = int(x["floor"])
            potions = sum(1 for p in (fp.get("potions") or "").split("|") if p and not p.startswith(":"))
            f = fights[m.group(1)].setdefault(floor, {"hp0": fp["hp"], "hp1": fp["hp"], "potions": potions})
            f["hp1"] = fp["hp"]
    return fights


def mean(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.mean(xs), 1) if xs else None


def pct(n, d):
    return f"{n}/{d} ({round(100 * n / d)}%)" if d else "-"


def summarize(runs, fights, elites):
    n = len(runs)
    floors = [int(r["floor_max"]) for r in runs]
    out = {
        "runs": n,
        "mean floor": mean(floors),
        "past act 1 boss": pct(sum(f > 17 for f in floors), n),
        "past act 2 boss": pct(sum(f > 33 for f in floors), n),
        "reached final boss": pct(sum(f >= 48 for f in floors), n),
        "wins": pct(sum(r.get("victory") == "1" for r in runs), n),
    }
    for boss in BOSS_FLOORS:
        entry_hp, entry_pot, loss = [], [], []
        for r in runs:
            f = fights.get(r["run_id"], {}).get(boss)
            max_hp = float(r.get("max_hp") or 0) or None
            if not f:
                continue
            if max_hp:
                entry_hp.append(100 * f["hp0"] / max_hp)
            entry_pot.append(f["potions"])
            loss.append(f["hp0"] - f["hp1"])
        out[f"F{boss} boss: HP% in / potions in / HP lost"] = f"{mean(entry_hp)} / {mean(entry_pot)} / {mean(loss)}  (n={len(entry_pot)})"
    elite_loss, elite_pot, hall_loss = [], [], []
    for r in runs:
        rid = r["run_id"]
        for floor, f in fights.get(rid, {}).items():
            if floor in BOSS_FLOORS:
                continue
            if floor in elites.get(rid, set()):
                elite_loss.append(f["hp0"] - f["hp1"])
                elite_pot.append(f["potions"])
            else:
                hall_loss.append(f["hp0"] - f["hp1"])
    out["elite fights: HP lost / potions in"] = f"{mean(elite_loss)} / {mean(elite_pot)}  (n={len(elite_loss)})"
    out["other fights: HP lost"] = f"{mean(hall_loss)}  (n={len(hall_loss)})"
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--split", action="append", default=[], help="UTC time(s) splitting eras, e.g. 2026-09-26T02:00")
    ap.add_argument("--asc", type=int, default=None, help="only this ascension")
    ap.add_argument("--last", type=int, default=None, help="only the last N runs of each group")
    ap.add_argument("--out", default=os.path.join(ROOT, "paper", "data", "metrics.md"))
    args = ap.parse_args()

    runs = load_runs()
    splits = sorted([ARCH_START] + args.split)
    ids = {r["run_id"] for r in runs}
    fights = scan_fights(ids)
    elites = load_elites()

    def era(r):
        name = "before " + splits[0]
        for s in splits:
            if r["start_ts"] >= s:
                name = "from " + s
        return name

    groups = collections.OrderedDict()
    for r in sorted(runs, key=lambda r: r["start_ts"]):
        if args.asc is not None and str(args.asc) != r["ascension"]:
            continue
        groups.setdefault((era(r), r["ascension"]), []).append(r)
    lines = ["# Run metrics", "", f"Generated by ops/metrics.py; eras split at {', '.join(splits)} (UTC).", ""]
    for (name, asc), rs in groups.items():
        if args.last:
            rs = rs[-args.last:]
        s = summarize(rs, fights, elites)
        lines.append(f"## A{asc} · {name}")
        lines += [f"- {k}: {v}" for k, v in s.items()]
        lines.append("")
    text = "\n".join(lines)
    print(text)
    with open(args.out, "w") as fh:
        fh.write(text + "\n")


if __name__ == "__main__":
    main()
