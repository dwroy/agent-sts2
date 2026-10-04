#!/usr/bin/env python3
"""Jev's plan choices in logged boss fights (docs/boss-sim.md B1.5): what the whole-fight simulator's policy is tuned
against, and the mid-fight states the line comparison (tools/boss-sim/lines.ts) starts from.

Every `combat/plan-choice*` decision Jev made in a boss fight at the chosen ascensions, with the lines it was shown
(the decision's criteria: plan k is the solver's k-th line, "code rank k"), each line's HP lost, damage dealt and block
this turn, the choice, and the byte offset of the decision's state in states.jsonl (fight_frames at the decision's ts).
Nothing is simulated here; the decision and state lines are read by offset (never the whole file).

Usage: data/logdb-venv/bin/python tools/boss-sim/choices.py [--ascension 7 8 9] [--out experiments/boss-sim/raw/choices.jsonl] [--no-sync]
"""

import argparse
import json
import os
import sys
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = str(Path(__file__).resolve().parents[3])  # the project root (docs/layout.md)
sys.path.insert(0, os.path.join(ROOT, "agent", "tools", "logdb"))

SQL = """
SELECT f.run_id, f.fight_no, f.encounter, f.first_ts, d.turn, d.ts, d.off AS d_off, d.len AS d_len, d.choice, d.rollout_best,
       ff.off AS s_off, ff.len AS s_len, ff.player_hp, ff.max_hp, ff.incoming, ff.block
FROM decisions d
JOIN fights f ON d.run_id = f.run_id AND d.ts BETWEEN f.first_ts AND f.last_ts
JOIN fight_frames ff ON ff.run_id = d.run_id AND ff.ts = d.ts AND ff.fight_no = f.fight_no
WHERE f.room = 'boss' AND f.ascension IN (SELECT unnest(?::INTEGER[])) AND d.decider = 'jev' AND d.label LIKE 'combat/plan-choice%'
ORDER BY d.ts
"""

NUM = ("hp_lost", "damage_dealt", "block_gained", "hp_after", "enemy_threat_next", "energy_unused")


def dicts(cursor):
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def line_of(raw):
    try:
        c = json.loads(raw)
    except (TypeError, ValueError):
        return None
    out = {k: c.get(k) for k in NUM if isinstance(c.get(k), (int, float))}
    out["lethal"] = c.get("lethal_now") == "yes"
    out["potions"] = c.get("potions_used") or ""
    out["plays"] = c.get("plays") or ""
    out["kills"] = "killed" in (c.get("enemies_after") or "") or "dead" in (c.get("enemies_after") or "")
    return out


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ascension", type=int, nargs="*", default=[7, 8, 9])
    parser.add_argument("--out", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "choices.jsonl"))
    parser.add_argument("--no-sync", action="store_true")
    args = parser.parse_args(argv)
    import query as logquery  # noqa: E402
    import sync as logsync  # noqa: E402
    db = os.path.abspath(os.environ.get("LOGDB_DIR", logsync.DEFAULT_DB))
    logs = os.path.abspath(os.environ.get("LOGDB_LOGS", logsync.DEFAULT_LOGS))
    logsync.be_gentle()
    if not args.no_sync:
        logsync.sync(logs, db, quiet=True, wait=True)
    with logsync.read_lock(db, shared=True):
        con = logquery.connect(db, threads=2)
        rows = dicts(con.execute(SQL, [args.ascension]))
    kept = 0
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(os.path.join(logs, "decisions.jsonl"), "rb") as dec, open(args.out, "w") as out:
        for r in rows:
            dec.seek(r["d_off"])
            try:
                d = json.loads(dec.read(r["d_len"]))
            except ValueError:
                continue
            criteria = ((d.get("questions") or {}).get("plan") or {}).get("criteria") or {}
            lines = {}
            for k, v in criteria.items():
                if k.startswith("plan"):
                    one = line_of(v)
                    if one is not None and "hp_lost" in one:
                        lines[k] = one
            if not lines:
                continue
            out.write(json.dumps({
                "key": f"{r['run_id']}:{r['fight_no']}", "enc": r["encounter"], "fight_ts": str(r["first_ts"]), "turn": r["turn"],
                "ts": str(r["ts"]), "choice": r["choice"], "rollout_best": r["rollout_best"], "hp": r["player_hp"], "max_hp": r["max_hp"],
                "incoming": r["incoming"], "block": r["block"], "s_off": r["s_off"], "s_len": r["s_len"], "lines": lines,
            }, ensure_ascii=False) + "\n")
            kept += 1
    print(json.dumps({"decisions": len(rows), "written": kept, "out": os.path.relpath(args.out, ROOT)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
