#!/usr/bin/env python3
"""Fixtures for tests/mech-move-planner.test.ts (MECH_MOVE_RULES, docs/mechanics-learning.md §8): logged A8 Kaiser Crab
and Axebot boards.

For each board below: the state behind the first planning decision of that turn (logs/states.jsonl, found through the log
DB), the decision's label, decider, chosen action and rationale, and the Surrounded facing the loop had noted then (the
last targeted play or drink of the fight before it: combat-plan noteFacing). Also writes game-data.json (the mod's
collections trimmed to what these boards reference) and pinned-knowledge.json: the knowledge files the planner reads, from
v4 3488dc5's data (REV), trimmed to these enemies, with the monster DB's `observed` blocks for them as the 2026-10-02 build
(the move-change counters included) has them, read from OBSERVED_DB.

Reads the logs once, when run by hand from the repo root (python3 tests/mech-move-data/make-fixtures.py [OBSERVED_DB]);
the tests read only the files it writes.
"""
import json
import subprocess
import sys
import os
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[3])  # the project root (docs/layout.md)

REV = "3488dc5"
OBSERVED_DB = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "knowledge/common/monster-db.json")
P = os.path.join(ROOT, "data/logdb-venv/bin/python")
OUT = os.path.join(ROOT, "agent/tests/mech-move-data")
BOARDS = [
    # name, run, floor, turn
    # The Rocket dies this turn on the line played (Headbutt): the Crusher behind us shows Enlarging Strike 9 = (4 + 2) x 1.5.
    ("nx48-f33-t7-crab-death", "NX48MBG3SPRJ", 33, 7),
    # The Rocket died last turn: the Crusher alone (index 0), the noted facing still 1; Guarded Strike 20 lands as shown.
    ("8l29-f33-t5-crab-alone", "8L29N792FA45", 33, 5),
    # An Axebot with its last Stock: a kill brings it back in Boot Up (removed); one with Stock 2 (lowered).
    ("y3xt-f45-t5-axebot-stock1", "Y3XT9EBS7U8B", 45, 5),
    ("8l29-f39-t3-axebot-stock2", "8L29N792FA45", 39, 3),
]
ENEMIES = {"CRUSHER", "ROCKET", "AXEBOT"}
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

db, mm, ex, bd, pe = load("monster-db.json"), load("move-model.json"), load("experience.json"), load("boss-damage.json"), load("potion-equivalents.json")
observed = json.load(open(OBSERVED_DB))
keep = lambda key: any(part in ENEMIES for part in key.split("+"))
mons = {k: v for k, v in db["monsters"].items() if k in ENEMIES}
for k in mons:
    if observed["monsters"].get(k, {}).get("observed"):
        mons[k] = {**mons[k], "observed": observed["monsters"][k]["observed"]}
top = observed.get("observed") or {}
pinned = {
    "monster-db.json": {
        "meta": db["meta"],
        "bosses": {k: v for k, v in db["bosses"].items() if k == "KAISER_CRAB"},
        "encounters": {k: v for k, v in db["encounters"].items() if keep(k)},
        "monsters": mons,
        "observed": {**top, "powers_stripped": {k: v for k, v in (top.get("powers_stripped") or {}).items() if any(m in ENEMIES for m in v.get("monsters", {}))}},
    },
    "move-model.json": {k: v for k, v in mm.items() if k in ENEMIES},
    "experience.json": ex,
    "boss-damage.json": bd,
    "potion-equivalents.json": {**{k: v for k, v in pe.items() if k != "potions"}, "potions": {k: v for k, v in pe["potions"].items() if k in potions}},
}
json.dump(pinned, open(f"{OUT}/pinned-knowledge.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(BOARDS)} boards; {len(subset['cards'])} cards, {len(subset['monsters'])} monsters, {len(subset['powers'])} powers, {len(subset['relics'])} relics, {len(subset['potions'])} potions", file=sys.stderr)
