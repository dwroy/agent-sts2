#!/usr/bin/env python3
"""The logged combat lines played while we were Shrunk (SHRINK_POWER on us, the Shrinker Beetle's), for tools/shrink-replay.ts.

One row per fresh combat decision (not a plan-continue) at A8+ with Shrink on us that played a card or a potion: its
states.jsonl offset, the line (the decision's play and the plan-continue plays after it, in the same turn: card or potion
id, target as the decision frame's enemy index, found by enemy id and max HP since a death renumbers the enemies), the
enemies' HP lost over it (at the next fresh decision's frame; no combat frame after a line on its floor: the fight was won,
every enemy dead), and our HP lost to the enemy turn when the line ended the turn (decision HP - next turn's first frame).

Reads the log database (tools/logdb/query.py --no-sync) and logs/states.jsonl, both read-only.
Usage: .cache/logdb-venv/bin/python tools/shrink-lines.py OUT.jsonl
"""
import collections
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUERY = os.path.join(ROOT, "tools", "logdb", "query.py")
STATES = os.path.join(ROOT, "logs", "states.jsonl")
SHRUNK = "list_contains(list_transform(f.player_powers, x -> x.id), 'SHRINK_POWER')"


def q(sql):
    out = subprocess.run([sys.executable, QUERY, "--no-sync", "--json", "--max-rows", "1000000", "--timeout", "300", sql], capture_output=True, text=True, cwd=ROOT)
    d = json.loads(out.stdout)
    if "error" in d:
        raise SystemExit(d["error"])
    return [dict(zip(d["columns"], r)) for r in d["rows"]]


def raw(off):
    with open(STATES, "rb") as h:
        h.seek(off)
        return json.loads(h.readline())["state"]


def ident(e):
    return (e["enemy_id"], e["max_hp"])


def main(out_path):
    runs = [r["run_id"] for r in q(f"SELECT DISTINCT f.run_id FROM frames f WHERE f.in_combat AND f.ascension >= 8 AND {SHRUNK}")]
    rows = []
    for run in runs:
        decs = q(f"""SELECT d.ts, d.label, d.action, d.card_id, d.potion_id, d.target_index, f.off, f.floor, f.turn, {SHRUNK} shrunk
          FROM decisions d JOIN frames f ON f.run_id = d.run_id AND f.ts = d.ts WHERE d.run_id = '{run}' AND d.screen = 'COMBAT' ORDER BY d.ts""")
        frames = q(f"SELECT off, floor, turn FROM frames WHERE run_id = '{run}' AND in_combat ORDER BY off")
        for i, d in enumerate(decs):
            if not d["shrunk"] or d["label"] == "combat/plan-continue" or d["action"] not in ("play_card", "use_potion"):
                continue
            line = [d]
            j = i + 1
            while j < len(decs) and decs[j]["label"] == "combat/plan-continue" and decs[j]["floor"] == d["floor"] and decs[j]["turn"] == d["turn"]:
                line.append(decs[j])
                j += 1
            end = decs[j] if j < len(decs) else None
            if end is not None and (end["floor"] != d["floor"] or end["turn"] != d["turn"]):
                end = None
            start = raw(d["off"])
            if end is not None:
                after = raw(end["off"])["combat"]["enemies"]
            elif any(f["off"] > line[-1]["off"] and f["floor"] == d["floor"] for f in frames):
                continue
            else:
                after = []
            enemies = start["combat"]["enemies"]
            steps = []
            ok = True
            for s in line:
                target = None
                if s["target_index"] is not None:
                    at = [e for e in raw(s["off"])["combat"]["enemies"] if e["index"] == s["target_index"]]
                    same = [e["index"] for e in enemies if at and ident(e) == ident(at[0])]
                    if len(same) != 1:
                        ok = False
                        break
                    target = same[0]
                steps.append({"card": s["card_id"] if s["action"] == "play_card" else None, "potion": s["potion_id"] if s["action"] == "use_potion" else None, "target": target})
            dealt, kills = 0, []
            for e in enemies:
                if not e.get("is_alive", True):
                    continue
                left = [x for x in after if ident(x) == ident(e) and x.get("is_alive", True)]
                if len(left) > 1:
                    ok = False
                hp_after = left[0]["current_hp"] if len(left) == 1 else 0
                dealt += e["current_hp"] - hp_after
                if hp_after <= 0:
                    kills.append(e["index"])
            if not ok:
                continue
            hp_lost = None
            if end is not None and end["action"] == "end_turn":
                nxt = [f for f in frames if f["floor"] == d["floor"] and f["turn"] == d["turn"] + 1]
                if nxt:
                    hp_lost = start["combat"]["player"]["current_hp"] - raw(nxt[0]["off"])["combat"]["player"]["current_hp"]
            rows.append({"off": d["off"], "run": run, "floor": d["floor"], "turn": d["turn"], "label": d["label"], "steps": steps, "dealt": dealt, "kills": kills,
                         "hpLost": hp_lost, "endsTurn": end is not None and end["action"] == "end_turn", "endsFight": end is None})
    with open(out_path, "w") as out:
        for r in rows:
            out.write(json.dumps(r) + "\n")
    print(len(rows), "lines from", len(runs), "runs;", dict(collections.Counter(r["label"] for r in rows)))


if __name__ == "__main__":
    main(sys.argv[1])
