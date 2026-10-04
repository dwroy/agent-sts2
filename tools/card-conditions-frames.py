#!/usr/bin/env python3
"""Frames for tools/card-conditions-replay.ts (CARD_CONDITIONS, 2026-10-04): every fresh combat planning decision (not a
plan-continue) whose hand holds one of the cards, or (--without N) a seeded sample of N whose hand holds none of them. For
each: the states.jsonl offsets of the decision's frame and of the turn's first combat frame, the line the log then played
from it (its plays up to end_turn, as indices of this frame's hand; it stops at a card this hand did not hold), whether that
line ended the turn, the energy at end_turn and our HP at the next turn's first frame.

Read only: logs/decisions.jsonl (the hands from each decision's fingerprint), logs/states.jsonl at the frames' offsets and
the log database (tools/logdb, --no-sync) for the frame index and the runs' ascension.

  .cache/logdb-venv/bin/python tools/card-conditions-frames.py --cards RESTLESSNESS,SPITE --out frames.json [--without 300]
"""
import argparse
import collections
import json
import os
import random
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FRESH = {
    "combat/plan", "combat/plan-choice", "combat/lethal", "combat/plan-choice+potion", "combat/end_turn", "combat/least-loss",
    "combat/plan-guarded", "combat/plan-potion", "combat/plan-choice+potion-lethal", "combat/potion-now",
}


def query(sql):
    out = subprocess.run([sys.executable, os.path.join(HERE, "logdb", "query.py"), "--no-sync", "--json", "--max-rows", "100000", "--timeout", "120", sql], capture_output=True, text=True)
    data = json.loads(out.stdout)
    if "error" in data:
        raise SystemExit(data["error"])
    if data.get("truncated"):
        raise SystemExit(f"truncated: {sql[:80]}")
    return [dict(zip(data["columns"], row)) for row in data["rows"]]


def norm(ts):
    """A timestamp as 'YYYY-MM-DD HH:MM:SS.ffffff' (decisions.jsonl's ISO 'Z' and the database's microseconds alike)."""
    text = str(ts).replace("T", " ").replace("Z", "")
    if "." not in text:
        return text + ".000000"
    head, frac = text.split(".")
    return head + "." + (frac + "000000")[:6]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cards", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--without", type=int, default=0, help="a sample of this many decisions holding none of the cards")
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()
    cards = set(args.cards.split(","))
    ascension = {row["run_id"]: row["ascension"] for row in query("SELECT run_id, ascension FROM runs")}

    decisions = collections.defaultdict(list)
    with open("logs/decisions.jsonl", "rb") as handle:
        for line in handle:
            if b"COMBAT" not in line:
                continue
            try:
                row = json.loads(line)
            except ValueError:
                continue
            if row.get("screen") != "COMBAT":
                continue
            try:
                fingerprint = json.loads(row.get("fingerprint") or "{}")
            except ValueError:
                fingerprint = {}
            # Rows before run_id was logged carry the run in the fingerprint (as tools/logdb/extract.py reads them).
            run = row.get("run_id") or fingerprint.get("run")
            if not run or run == "run_unknown":
                continue
            hand = [part.split(":") for part in (fingerprint.get("hand") or "").split("|") if part]
            decisions[run].append({
                "ts": row["ts"], "floor": row.get("floor"), "turn": row.get("turn"), "label": row.get("label"), "decider": row.get("decider"),
                "chosen": row.get("chosen") or {}, "hand_ids": [entry[1] for entry in hand if len(entry) >= 2], "result": str(row.get("result") or ""),
            })

    targets = []
    for run, rows in decisions.items():
        for i, row in enumerate(rows):
            if row["label"] not in FRESH or not row["hand_ids"]:
                continue
            holds = any(card in cards for card in row["hand_ids"])
            if holds != (args.without == 0):
                continue
            targets.append((run, i))
    if args.without:
        random.Random(args.seed).shuffle(targets)
        targets = targets[: args.without]

    runs = sorted({run for run, _ in targets})
    frames = collections.defaultdict(list)
    for at in range(0, len(runs), 10):
        listed = ",".join(f"'{run}'" for run in runs[at:at + 10])
        for frame in query(f"SELECT run_id, off, len, ts, screen, turn, floor FROM state_index WHERE run_id IN ({listed}) ORDER BY run_id, ts, off"):
            frame["ts"] = norm(frame["ts"])
            frames[frame["run_id"]].append(frame)

    states = open("logs/states.jsonl", "rb")

    def load(frame):
        states.seek(frame["off"])
        return json.loads(states.read(frame["len"]))["state"]

    def combat(state):
        return (state or {}).get("combat") or {}

    rows_out = []
    for run, i in targets:
        decision = decisions[run][i]
        listed = frames[run]
        ts = norm(decision["ts"])
        upto = [frame for frame in listed if frame["ts"] <= ts]
        if not upto or upto[-1]["ts"] != ts or upto[-1]["screen"] != "COMBAT":
            continue
        frame = upto[-1]
        first = frame
        for earlier in reversed(upto):
            if earlier["floor"] != frame["floor"] or earlier["turn"] != frame["turn"]:
                break
            if earlier["screen"] == "COMBAT":
                first = earlier
        state = load(frame)
        hand = combat(state).get("hand") or []
        used, steps, complete, end_energy = set(), [], False, None
        for later in decisions[run][i:]:
            if later["floor"] != decision["floor"] or later["turn"] != decision["turn"]:
                break
            if later["result"].startswith(("failed", "not dispatched")):
                continue
            chosen = later["chosen"]
            at_frame = [entry for entry in listed if entry["ts"] == norm(later["ts"])]
            if chosen.get("action") == "end_turn":
                if at_frame:
                    end_energy = (combat(load(at_frame[-1])).get("player") or {}).get("energy")
                complete = True
                break
            if chosen.get("action") != "play_card" or not at_frame:
                break
            played = next((card for card in combat(load(at_frame[-1])).get("hand") or [] if card.get("index") == chosen.get("card_index")), None)
            if played is None:
                break
            match = next((card for card in hand if card["card_id"] == played["card_id"] and bool(card.get("upgraded")) == bool(played.get("upgraded")) and card["index"] not in used), None)
            if match is None:
                break
            used.add(match["index"])
            steps.append({"cardIndex": match["index"], "cardId": match["card_id"], "target": chosen.get("target_index")})
        hp_next = None
        for later in listed:
            if later["ts"] <= ts:
                continue
            if later["floor"] != frame["floor"]:
                break
            if later["screen"] == "COMBAT" and later["turn"] != frame["turn"]:
                hp_next = (combat(load(later)).get("player") or {}).get("current_hp")
                break
        player = combat(state).get("player") or {}
        rows_out.append({
            "off": frame["off"], "len": frame["len"], "first_off": first["off"], "first_len": first["len"], "ts": decision["ts"], "run": run,
            "asc": ascension.get(run), "floor": decision["floor"], "turn": decision["turn"], "label": decision["label"], "decider": decision["decider"],
            "chosen": decision["chosen"], "cards": sorted(set(decision["hand_ids"]) & cards), "executed": steps, "complete": complete,
            "end_energy": end_energy, "hp": player.get("current_hp"), "hp_next": hp_next, "energy": player.get("energy"),
        })
    with open(args.out, "w") as handle:
        json.dump(rows_out, handle)
    print(len(targets), len(rows_out), dict(collections.Counter(card for row in rows_out for card in row["cards"])))


if __name__ == "__main__":
    main()
