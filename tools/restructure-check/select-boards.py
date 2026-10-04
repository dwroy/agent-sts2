#!/usr/bin/env python3
"""Pick the fixed sample of logged boards the restructure check digests (run once; boards.json is committed).

Spread over every logged run and screen: the decisions that have their own (non-observed) state in
logs/states.jsonl, evenly spaced in log order per screen. Each board is kept as its byte range in
logs/states.jsonl plus the sha256 of those bytes, so a later run reads the same line (the log is append-only).

  <python with duckdb> select-boards.py --db <data/logdb> --logs <logs> --out boards.json
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
QUERY = os.path.join(os.path.dirname(HERE), "logdb", "query.py")

# Boards per screen (combat: the planning steps; the rest: every decision label of that screen).
TARGETS = {"COMBAT": 260, "REWARD": 45, "MAP": 40, "CARD_SELECTION": 30, "EVENT": 30, "SHOP": 30, "REST": 25, "CHEST": 12, "CRYSTAL_SPHERE": 6, "BUNDLE_SELECTION": 6, "FAKE_MERCHANT": 6}
COMBAT_LABELS = ("combat/plan", "combat/plan-choice", "combat/plan-choice+potion", "combat/lethal", "combat/least-loss", "combat/plan-guarded", "combat/plan-potion", "combat/end_turn", "combat/plan-choice+potion-lethal", "combat/potion-now")


def query(db, sql):
    out = subprocess.run([sys.executable, QUERY, "--no-sync", "--db", db, "--json", "--max-rows", "10000000", "--timeout", "600", sql], check=True, capture_output=True, text=True).stdout
    data = json.loads(out)
    if data.get("error"):
        raise SystemExit(data["error"])
    return [dict(zip(data["columns"], row)) for row in data["rows"]]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True)
    parser.add_argument("--logs", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    labels = ", ".join(f"'{label}'" for label in COMBAT_LABELS)
    rows = query(args.db, f"""
        SELECT d.screen, d.label, d.run_id, d.floor, d.turn, CAST(d.ts AS VARCHAR) AS ts, s.off, s.len
        FROM decisions d JOIN state_index s ON s.run_id = d.run_id AND s.ts = d.ts AND NOT coalesce(s.observed, false)
        WHERE d.run_id IS NOT NULL AND d.screen IN ({", ".join(f"'{s}'" for s in TARGETS)})
          AND (d.screen <> 'COMBAT' OR d.label IN ({labels}))
        QUALIFY row_number() OVER (PARTITION BY d.run_id, d.ts ORDER BY s.off) = 1
        ORDER BY d.ts, s.off""")
    boards = []
    states = open(os.path.join(args.logs, "states.jsonl"), "rb")
    for screen, target in TARGETS.items():
        pool = [row for row in rows if row["screen"] == screen]
        if not pool:
            continue
        step = len(pool) / min(target, len(pool))
        for i in range(min(target, len(pool))):
            row = pool[int(i * step)]
            states.seek(row["off"])
            raw = states.read(row["len"])
            boards.append({"name": f"{row['run_id']} F{row['floor']} T{row['turn']} {row['label']} {row['ts']}", "screen": screen, "label": row["label"], "run": row["run_id"], "ts": row["ts"],
                           "off": row["off"], "len": row["len"], "sha": hashlib.sha256(raw).hexdigest()})
    with open(args.out, "w", encoding="utf8") as handle:
        json.dump(boards, handle, indent=0)
        handle.write("\n")
    runs = len({board["run"] for board in boards})
    print(f"{len(boards)} boards over {runs} runs: " + ", ".join(f"{s} {sum(1 for b in boards if b['screen'] == s)}" for s in TARGETS))


if __name__ == "__main__":
    main()
