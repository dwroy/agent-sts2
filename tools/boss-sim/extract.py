#!/usr/bin/env python3
"""Boss fights for the whole-fight simulator's backtest (tools/boss-sim/backtest.ts, docs/boss-sim.md).

Every logged boss fight (fights view, room = 'boss') at the chosen ascensions, with what happened (won/died, the
fight's end HP, turns) and the raw state of two start points read by byte offset from states.jsonl (never the whole
file): the first decision frame of turn 1 and of turn 5 when the fight got there. Nothing is simulated here.

End HP (docs/eval.md 7.2): died = 0; otherwise min(last combat frame, first frame after the fight): a Waterfall Giant's
death blast only shows after the fight, a Burning Blood heal (higher) does not count. HP loss from a start point = its
HP - end HP.

Usage: .cache/logdb-venv/bin/python tools/boss-sim/extract.py [--ascension 7 8 9] [--room boss|elite] [--out experiments/boss-sim/raw/fights.jsonl]
       [--no-sync] [--db DIR] [--logs DIR]
"""

import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools", "logdb"))

FIGHTS_SQL = """
SELECT f.run_id, f.fight_no, f.ascension, f.act, f.floor, f.encounter, f.monsters, f.entry_hp, f.max_hp, f.last_hp,
       f.post_hp, f.turns, f.outcome, f.first_off, f.first_ts, f.potions_in, f.potions_used, f.deck_size
FROM fights f WHERE f.room = ? AND f.ascension IN (SELECT unnest(?::INTEGER[]))
ORDER BY f.first_ts
"""

# The first decision frame of turns 1 and 5 (not an `observed` frame: a fight's very first frame can be one taken before
# the hand is drawn, 164 of 424 boss fights, with no hand to play).
TURNS_SQL = """
SELECT ff.run_id, ff.fight_no, ff.turn, min(ff.off) AS first_off, arg_min(ff.player_hp, ff.off) AS start_hp
FROM fight_frames ff JOIN fights f USING (run_id, fight_no)
WHERE f.room = ? AND f.ascension IN (SELECT unnest(?::INTEGER[])) AND ff.is_combat AND NOT coalesce(ff.observed, false) AND ff.turn IN (1, 5)
GROUP BY ALL
"""

LEN_SQL = "SELECT off, len, turn, screen FROM state_index WHERE off IN (SELECT unnest(?::BIGINT[]))"

# Every turn of every boss fight (turns view): what the report compares the simulated turns with.
BY_TURN_SQL = """
SELECT t.run_id, t.fight_no, t.turn, t.start_hp, t.enemy_hp, t.hp_lost, t.intent_damage, t.enemy_turn_hp_lost
FROM turns t JOIN fights f USING (run_id, fight_no)
WHERE f.room = ? AND f.ascension IN (SELECT unnest(?::INTEGER[]))
ORDER BY t.run_id, t.fight_no, t.turn
"""


def dicts(cursor):
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def read_lines(path, spans):
    """{off: raw bytes} for [(off, len)] of a JSONL file, read in file order."""
    out = {}
    with open(path, "rb") as handle:
        for off, length in sorted(set(spans)):
            handle.seek(off)
            out[off] = handle.read(length)
    return out


def end_hp(fight):
    if fight["outcome"] == "died":
        return 0
    hps = [h for h in (fight["last_hp"], fight["post_hp"]) if h is not None]
    return min(hps) if hps else None


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ascension", type=int, nargs="*", default=[7, 8, 9])
    parser.add_argument("--room", default="boss", help="the fights view's room (boss; elite for the passive-pieces replay's control boards)")
    parser.add_argument("--out", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "fights.jsonl"))
    parser.add_argument("--turns-out", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "turns.jsonl"),
                        help="per fight, every turn's start HP, enemy HP and HP lost")
    parser.add_argument("--turns-only", action="store_true", help="write only --turns-out")
    parser.add_argument("--no-sync", action="store_true")
    parser.add_argument("--db")
    parser.add_argument("--logs")
    args = parser.parse_args(argv)
    import query as logquery  # noqa: E402
    import sync as logsync  # noqa: E402
    db = os.path.abspath(args.db or os.environ.get("LOGDB_DIR", logsync.DEFAULT_DB))
    logs = os.path.abspath(args.logs or os.environ.get("LOGDB_LOGS", logsync.DEFAULT_LOGS))
    logsync.be_gentle()
    if not args.no_sync:
        logsync.sync(logs, db, quiet=True, wait=True)
    with logsync.read_lock(db, shared=True):
        con = logquery.connect(db, threads=2)
        fights = dicts(con.execute(FIGHTS_SQL, [args.room, args.ascension]))
        turns = dicts(con.execute(TURNS_SQL, [args.room, args.ascension]))
        by_turn = {}
        for t in dicts(con.execute(BY_TURN_SQL, [args.room, args.ascension])):
            by_turn.setdefault(f"{t['run_id']}:{t['fight_no']}", []).append([t["turn"], t["start_hp"], t["enemy_hp"], t["hp_lost"], t["intent_damage"], t["enemy_turn_hp_lost"]])
        t5 = {(t["run_id"], t["fight_no"]): t for t in turns if t["turn"] == 5}
        t1 = {(t["run_id"], t["fight_no"]): t for t in turns if t["turn"] == 1}
        offs = [t["first_off"] for t in t1.values()] + [t["first_off"] for t in t5.values()]
        index = {r["off"]: r for r in dicts(con.execute(LEN_SQL, [offs]))}
    os.makedirs(os.path.dirname(os.path.abspath(args.turns_out)), exist_ok=True)
    with open(args.turns_out, "w") as out:
        for key, rows in by_turn.items():
            out.write(json.dumps({"key": key, "turns": rows}) + "\n")
    if args.turns_only:
        print(json.dumps({"fights": len(by_turn), "out": os.path.relpath(args.turns_out, ROOT)}))
        return 0
    raw = read_lines(os.path.join(logs, "states.jsonl"), [(off, index[off]["len"]) for off in offs if off in index])
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    kept = skipped = 0
    with open(args.out, "w") as out:
        for f in fights:
            key = f"{f['run_id']}:{f['fight_no']}"
            one = t1.get((f["run_id"], f["fight_no"]))
            end = end_hp(f)
            if one is None or one["first_off"] not in raw or end is None:
                skipped += 1
                continue
            line = json.loads(raw[one["first_off"]])
            row = {
                "key": key, "run_id": f["run_id"], "fight_no": f["fight_no"], "asc": f["ascension"], "act": f["act"], "floor": f["floor"],
                "encounter": f["encounter"], "entry_hp": f["entry_hp"], "max_hp": f["max_hp"], "end_hp": end, "outcome": f["outcome"],
                "turns": f["turns"], "first_ts": str(f["first_ts"]), "potions_in": f["potions_in"], "potions_used": f["potions_used"],
                "deck_size": f["deck_size"], "t1": {"turn": 1, "hp": one["start_hp"], "state": line.get("state")},
            }
            five = t5.get((f["run_id"], f["fight_no"]))
            if five and five["first_off"] in raw:
                row["t5"] = {"turn": 5, "hp": five["start_hp"], "state": json.loads(raw[five["first_off"]]).get("state")}
            out.write(json.dumps(row, ensure_ascii=False) + "\n")
            kept += 1
    print(json.dumps({"fights": len(fights), "written": kept, "skipped": skipped, "with_t5": sum(1 for f in fights if (f["run_id"], f["fight_no"]) in t5), "out": os.path.relpath(args.out, ROOT)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
