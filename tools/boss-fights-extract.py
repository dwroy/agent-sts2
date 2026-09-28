#!/usr/bin/env python3
"""Logged fights against one boss -> the JSONL tools/boss-clock-calibrate.ts reads.

One line per fight: {key, outcome, turns, entry_hp, realised, escapes, state}, where `state` is the
first logged combat state of the fight (deck, relics, boss id, ascension), `realised` the boss HP
removed / turns (the whole max HP for a won fight: its last hit is not logged), `escapes` the times the
Sandpit counter went up (Frantic Escapes, Insatiable only). Outcome: won when the run got past the
boss's floor, else died (HP or the Sandpit).

Usage:
  python3 tools/boss-fights-extract.py THE_INSATIABLE [--asc 8] [--logs DIR] > fights.jsonl
  npx tsx tools/boss-clock-calibrate.ts fights.jsonl --rows
"""
import argparse
import collections
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("enemy_id")
    parser.add_argument("--asc", type=int, default=8)
    parser.add_argument("--logs", default=os.path.join(ROOT, "logs"))
    args = parser.parse_args()
    mark = f'"enemy_id":"{args.enemy_id}"'.encode()

    runs = {}
    with open(os.path.join(args.logs, "runs.jsonl"), encoding="utf8") as handle:
        for line in handle:
            try:
                run = json.loads(line)
            except ValueError:
                continue
            runs[run.get("run_id")] = run

    frames = collections.defaultdict(list)  # run -> [(ts, turn, boss hp, boss max, sandpit)]
    first = {}
    with open(os.path.join(args.logs, "states.jsonl"), "rb") as handle:
        for line in handle:
            if mark not in line:
                continue
            try:
                state = json.loads(line)["state"]
            except (ValueError, KeyError):
                continue
            run = state.get("run") or {}
            if not state.get("in_combat") or run.get("ascension") != args.asc:
                continue
            boss = [e for e in (state.get("combat") or {}).get("enemies", []) if e.get("enemy_id") == args.enemy_id]
            if not boss:
                continue
            run_id = state.get("run_id")
            sandpit = [p.get("amount") for p in boss[0].get("powers", []) if p.get("power_id") == "SANDPIT_POWER"]
            frames[run_id].append((state.get("turn") or 0, boss[0].get("current_hp"), boss[0].get("max_hp"), sandpit[0] if sandpit else None))
            first.setdefault(run_id, (state, run.get("floor")))

    for run_id, rows in frames.items():
        state, floor = first[run_id]
        turns = max(row[0] for row in rows)
        max_hp = rows[0][2]
        won = (runs.get(run_id, {}).get("floor") or 0) > (floor or 0)
        dealt = max_hp if won else max_hp - min(row[1] for row in rows)
        pits = [row[3] for row in rows if row[3] is not None]
        escapes = sum(1 for a, b in zip(pits, pits[1:]) if b > a)
        entry = ((state.get("combat") or {}).get("player") or {}).get("current_hp")
        out = {"key": run_id, "outcome": "won" if won else "died", "turns": turns, "entry_hp": entry,
               "realised": round(dealt / max(1, turns), 2), "escapes": escapes, "state": state}
        sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
