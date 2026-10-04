#!/usr/bin/env python3
"""Fixtures for tests/lizard-tail.test.ts (combat-plan trackLizardTail): logged frames around Lizard Tail's logged triggers,
a Fairy revive in a run holding the tail, and lethal reads survived without any revive (runs that never held the tail; the
test puts it in their relics).

Each sequence is a list of frames (logs/states.jsonl at the byte offsets below, found through the log DB) with the decision
logged on each (label, action) when there is one. `agent_view` is kept only on the frames the SL judge is asked about (it
reads the exhaust pile there); the tracker reads run, combat, turn and screen.

Reads the logs once, when run by hand from the repo root (python3 tests/lizard-tail-data/make-fixtures.py); the tests read
only the files it writes.
"""
import json
import subprocess
import os
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[3])  # the project root (docs/layout.md)

P = os.path.join(ROOT, "data/logdb-venv/bin/python")
OUT = os.path.join(ROOT, "agent/tests/lizard-tail-data")
SEQUENCES = {
    # V4.5 A9, the Queen + Torch Head Amalgam: T3 ends at 14 HP against the Amalgam's 12x3 (2 -> 0 -> revive 40 -> 28),
    # T4 opens at 28 of 80 (outside the old 35-40 window), T6 ends at 14 against 30 with nothing to play: died. T1's first
    # frame stands for the fight's first turn again (an SL reload).
    "y8e0-f48": [("t1", 5694374150, False), ("t3-end", 5695347663, False), ("t4-start", 5695398540, False), ("t6-end", 5696220486, True)],
    # A8, the Waterfall Giant: T8 ends at 17 HP + 10 block against its 30 explosion; the fight ends in the enemy turn,
    # 46 HP after it = 40 + Burning Blood's 6. F33 T4: the boss turn that killed the run (5 HP + 6 block against 33).
    "mzcg-f17": [("t8-end", 2743804272, False), ("reward", 2743832272, False), ("f33-t4-end", 2751100696, True)],
    # A9, Lizard Tail and a Fairy held: T2 ends at 17 + 6 against 26, the Fairy fires (a logged enemy-turn frame at 0 HP,
    # the Fairy gone), T3 opens at 24 (30% of 80); T4 ends at 19 against 5+5+18 and T5 opens at 40: the tail.
    "vtreb-f23": [("t2-end", 3804569242, False), ("fairy-0hp", 3804604862, False), ("t3-start", 3804637192, False), ("t4-end", 3804990961, False), ("t5-start", 3805024344, False)],
    # Lethal reads survived without any revive (no tail held in these runs).
    # 36 HP against 38: T5 opened at 2 (the hits through a revive would leave 40).
    "u6ru-f33": [("t4-end", 3579221137, False), ("t5-start", 3579266750, False)],
    # 33 HP against 5x8: T8 opened at 5 (through a revive: 35).
    "7kdm-f27": [("t7-end", 3701750301, False), ("t8-start", 3701787087, False)],
    # 3 HP + 13 block against 38, end_turn sent, the fight won in the enemy turn: 9 after it = 3 + Burning Blood's 6.
    "7dxa-f23": [("t7-end", 856703819, False), ("reward", 856734289, False)],
    # 28 HP against 32, the fight won by our own last card: 35 after it (more than 28 + 6), no end_turn on the last frame.
    "2wum-f33": [("t13-last", 310684983, False), ("reward", 310722934, False)],
}


def query(sql):
    out = subprocess.run([P, os.path.join(ROOT, "agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "100", sql], check=True, capture_output=True, text=True).stdout
    data = json.loads(out)
    if "error" in data:
        raise SystemExit(data["error"])
    return [dict(zip(data["columns"], row)) for row in data["rows"]]


def raw(off):
    with open(os.path.join(ROOT, "logs/states.jsonl"), "rb") as f:
        f.seek(off)
        return json.loads(f.readline())


for name, frames in SEQUENCES.items():
    out = []
    for label, off, judge in frames:
        row = raw(off)
        state = row["state"]
        if not judge:
            state.pop("agent_view", None)
        decisions = query(f"SELECT label, action FROM decisions WHERE run_id = '{state['run_id']}' AND ts = '{row['ts'][:-1]}'") if not row.get("observed") else []
        out.append({
            "name": label,
            "source": f"{state['run_id']} F{(state.get('run') or {}).get('floor')} T{state.get('turn')} {row['ts']} off {off}{' observed' if row.get('observed') else ''}",
            "decision": decisions[0] if decisions else None,
            "state": state,
        })
    with open(f"{OUT}/{name}.json", "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(name, len(out))
