#!/usr/bin/env python3
"""Fixtures for tests/death-move-planner.test.ts (MECH_DEATH_MOVE, docs/mechanics-learning.md §9): logged boards with a
learned death rule on the board (the Queen beside the Torch Head Amalgam, the Living Shield beside the Turret Operator) and
one rule-free two-enemy board (the Kaiser Crab, as the control).

For each board below: the state behind the first planning decision of that turn (logs/states.jsonl, found through the log
DB), the decision's label, decider, chosen action and rationale, and the Surrounded facing the loop had noted then (the last
targeted play or drink of the fight before it). Also writes game-data.json (the mod's collections trimmed to what these
boards reference) and pinned-knowledge.json: the knowledge files the planner reads, trimmed to these enemies: the monster DB
and the move model as the 2026-10-03 build has them (DB, MM: build-monster-db.py with the ally-death counters, on the logs of
2026-10-03 11:10), the rest from v4 0f63d28 (REV).

Reads the logs once, when run by hand from the repo root (python3 tests/death-move-data/make-fixtures.py [DB] [MM]); the
tests read only the files it writes.
"""
import json
import subprocess
import sys
import os
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[3])  # the project root (docs/layout.md)

REV = "0f63d28"
DB = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "knowledge/common/monster-db.json")
MM = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "knowledge/common/move-model.json")
P = os.path.join(ROOT, "data/logdb-venv/bin/python")
OUT = os.path.join(ROOT, "agent/tests/death-move-data")
BOARDS = [
    # name, run, floor, turn
    # A8, HP 12 + 3 block, the Amalgam at 11 showing Tackle 24, the Queen on Burn Bright For Me: the kill turn; the next
    # turn's Off With Your Head (7x5) killed us.
    ("0u96-f48-t5-queen-kill", "0U96U4D9Z3PP", 48, 5),
    # A8, the Queen on You Are Mine (turn 2), the Amalgam at 77: killed on this turn in the log, the head-chop (9x5) next.
    ("5gka-f48-t2-queen-mine", "5GKAR00L5AYV", 48, 2),
    # A8, the Turret Operator at 51 beside the Living Shield (Shield Slam 6): Smash next once it dies.
    ("y3xt-f37-t1-shield", "Y3XT9EBS7U8B", 37, 1),
    # The control: no rule on the Kaiser Crab's claws (the Rocket dies this turn on the line played).
    ("nx48-f33-t7-crab", "NX48MBG3SPRJ", 33, 7),
]
ENEMIES = {"QUEEN", "TORCH_HEAD_AMALGAM", "LIVING_SHIELD", "TURRET_OPERATOR", "CRUSHER", "ROCKET"}
PLANNING = ("combat/plan-choice", "combat/plan", "combat/plan-guarded", "combat/lethal", "combat/least-loss", "combat/mod-lethal")


def query(sql):
    out = subprocess.run([P, os.path.join(ROOT, "agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "10000", sql], check=True, capture_output=True, text=True).stdout
    data = json.loads(out)
    if "error" in data:
        raise SystemExit(data["error"])
    return [dict(zip(data["columns"], row)) for row in data["rows"]]


def raw(off):
    with open(os.path.join(ROOT, "logs/states.jsonl"), "rb") as f:
        f.seek(off)
        return json.loads(f.readline())


def load(name):
    return json.loads(subprocess.run(["git", "show", f"{REV}:src/knowledge/{name}"], check=True, capture_output=True, text=True).stdout)


def planning(label):
    return any(label == p or label.startswith(p + "+") or (p != "combat/plan" and label.startswith(p)) for p in PLANNING)


cards, monsters, powers, relics, potions = set(), set(), set(), set(), set()
for name, run, floor, turn in BOARDS:
    rows = query(f"SELECT ts, turn, label, decider, chosen, rationale, action, target_index FROM decisions WHERE run_id='{run}' AND floor={floor} AND screen='COMBAT' ORDER BY ts")
    d = next(r for r in rows if planning(r["label"]) and r["turn"] == turn)
    earlier = [r for r in rows if r["ts"] < d["ts"] and r["target_index"] is not None and r["action"] in ("play_card", "use_potion")]
    s = query(f"SELECT off FROM state_index WHERE run_id='{run}' AND floor={floor} AND ts='{d['ts']}' AND NOT coalesce(observed, false) ORDER BY off LIMIT 1")[0]
    state = raw(s["off"])["state"]
    fight = f"{run}:{state['run'].get('act_id')}:{state['run'].get('floor')}"
    out = {
        "source": f"{run} F{floor} T{turn} {d['ts']}Z {d['label']}",
        "decision": {"label": d["label"], "decider": d["decider"], "chosen": json.loads(d["chosen"]) if d["chosen"] else None, "rationale": d["rationale"]},
        "state": state,
        "screenMemory": {"facing": earlier[-1]["target_index"], "facingFight": fight} if earlier else {},
    }
    json.dump(out, open(f"{OUT}/{name}.json", "w"), ensure_ascii=False, indent=1)
    for c in state["run"]["deck"]:
        cards.add(c["card_id"])
    combat = state.get("combat") or {}
    for c in combat.get("hand") or []:
        cards.add(c["card_id"])
    view = (state.get("agent_view") or {}).get("combat") or {}
    for pile in ("draw", "discard", "exhaust"):
        for line in view.get(pile) or []:
            cards.update(line.get("card_ids") or [])
    for e in combat.get("enemies") or []:
        monsters.add(e["enemy_id"])
        powers.update(p["power_id"] for p in e.get("powers") or [])
    powers.update(p["power_id"] for p in (combat.get("player") or {}).get("powers") or [])
    relics.update(r["relic_id"] for r in state["run"].get("relics") or [])
    potions.update(p["potion_id"] for p in state["run"].get("potions") or [] if p.get("potion_id"))

gd = json.load(open(os.path.join(ROOT, "data/game-data.json")))["collections"]
monsters |= ENEMIES
subset = {
    "cards": [c for c in gd["cards"] if c["id"] in cards],
    "monsters": [m for m in gd["monsters"] if m["id"] in monsters],
    "relics": [r for r in gd["relics"] if r["id"] in relics],
    "potions": [p for p in gd["potions"] if p["id"] in potions],
    "powers": [p for p in gd["powers"] if p["id"] in powers],
    "events": [],
    "characters": [c for c in gd["characters"] if c.get("id") == "IRONCLAD"],
}
json.dump(subset, open(f"{OUT}/game-data.json", "w"), ensure_ascii=False, separators=(",", ":"))

db, mm = json.load(open(DB)), json.load(open(MM))
ex, bd, pe = load("experience.json"), load("boss-damage.json"), load("potion-equivalents.json")
keep = lambda key: any(part in ENEMIES for part in key.split("+"))
top = db.get("observed") or {}
pinned = {
    "monster-db.json": {
        "meta": db["meta"],
        "bosses": {k: v for k, v in db["bosses"].items() if k in ("KAISER_CRAB", "QUEEN")},
        "encounters": {k: v for k, v in db["encounters"].items() if keep(k)},
        "monsters": {k: v for k, v in db["monsters"].items() if k in ENEMIES},
        "observed": {**top, "powers_stripped": {k: v for k, v in (top.get("powers_stripped") or {}).items() if any(m in ENEMIES for m in v.get("monsters", {}))}},
    },
    "move-model.json": {k: v for k, v in mm.items() if k in ENEMIES},
    "experience.json": ex,
    "boss-damage.json": bd,
    "potion-equivalents.json": {**{k: v for k, v in pe.items() if k != "potions"}, "potions": {k: v for k, v in pe["potions"].items() if k in potions}},
}
json.dump(pinned, open(f"{OUT}/pinned-knowledge.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(BOARDS)} boards; {len(subset['cards'])} cards, {len(subset['monsters'])} monsters, {len(subset['powers'])} powers, {len(subset['relics'])} relics, {len(subset['potions'])} potions", file=sys.stderr)
