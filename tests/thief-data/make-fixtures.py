#!/usr/bin/env python3
"""Fixtures for tests/thief.test.ts (THIEF_FACTS, docs/thief.md): logged A8+ Thieving Hopper and Gremlin Merc boards.

For each board below: the state behind the first combat/plan-choice decision of that turn (logs/states.jsonl, found
through the log DB), the decision's label, decider, chosen action and rationale, and the fight's first combat frame's
deck and gold (what screen memory notes at the fight's start: thief.ts noteFightStart). Also writes game-data.json: the
mod's collections (.cache/game-data.json) trimmed to what these boards reference, and pinned-knowledge.json: the
knowledge files the planner reads, from a fixed commit's data (REV), trimmed to these enemies.

Reads the logs once, when run by hand from the repo root (python3 tests/thief-data/make-fixtures.py); the tests read
only the files it writes.
"""
import json
import subprocess
import sys

REV = "894f245"
P = ".cache/logdb-venv/bin/python"
BOARDS = [
    # name, run, floor, turn
    ("rpc6-f20-t2-hopper", "RPC6X61N9FQ0", 20, 2),
    ("rpc6-f20-t3-hopper", "RPC6X61N9FQ0", 20, 3),
    ("rpc6-f20-t4-hopper", "RPC6X61N9FQ0", 20, 4),
    ("rpc6-f20-t5-hopper-escape", "RPC6X61N9FQ0", 20, 5),
    ("8v0h-f19-t5-hopper-escape", "8V0HD9Y207WY", 19, 5),
    ("4lc3-f21-t4-hopper", "4LC3YKCZV218", 21, 4),
    ("rpc6-f8-t2-merc", "RPC6X61N9FQ0", 8, 2),
    ("rpc6-f8-t4-gremlins", "RPC6X61N9FQ0", 8, 4),
    ("jf8n-f9-t3-gremlins", "JF8NMA78VE0Y", 9, 3),
]
ENEMIES = {"THIEVING_HOPPER", "GREMLIN_MERC", "FAT_GREMLIN", "SNEAKY_GREMLIN"}


def query(sql):
    out = subprocess.run([P, "tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "10000", sql], check=True, capture_output=True, text=True).stdout
    data = json.loads(out)
    if "error" in data:
        raise SystemExit(data["error"])
    return [dict(zip(data["columns"], row)) for row in data["rows"]]


def raw(off):
    with open("logs/states.jsonl", "rb") as f:
        f.seek(off)
        return json.loads(f.readline())


def load(name):
    return json.loads(subprocess.run(["git", "show", f"{REV}:src/knowledge/{name}"], check=True, capture_output=True, text=True).stdout)


cards, monsters, powers, relics, potions = set(), set(), set(), set(), set()
for name, run, floor, turn in BOARDS:
    d = query(f"SELECT ts, label, decider, chosen, rationale FROM decisions WHERE run_id='{run}' AND floor={floor} AND turn={turn} AND label LIKE 'combat/plan-choice%' ORDER BY ts LIMIT 1")[0]
    s = query(f"SELECT off FROM state_index WHERE run_id='{run}' AND floor={floor} AND ts='{d['ts']}' AND NOT coalesce(observed, false) ORDER BY off LIMIT 1")[0]
    row = raw(s["off"])
    first = query(f"SELECT off FROM state_index WHERE run_id='{run}' AND floor={floor} AND screen='COMBAT' ORDER BY off LIMIT 1")[0]
    start = raw(first["off"])["state"]
    state = row["state"]
    deck = [{"card_id": c["card_id"], "name": c["name"], "upgraded": bool(c.get("upgraded"))} for c in start["run"]["deck"]]
    fight = f"{run}:{state['run'].get('act_id')}:{state['run'].get('floor')}"
    out = {
        "source": f"{run} F{floor} T{turn} {d['ts']}Z {d['label']}",
        "decision": {"label": d["label"], "decider": d["decider"], "chosen": json.loads(d["chosen"]) if d["chosen"] else None, "rationale": d["rationale"]},
        "state": state,
        "fightStart": {"fight": fight, "deck": deck, "gold": start["run"].get("gold")},
    }
    json.dump(out, open(f"tests/thief-data/{name}.json", "w"), ensure_ascii=False, indent=1)
    for c in state["run"]["deck"] + start["run"]["deck"]:
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

gd = json.load(open(".cache/game-data.json"))["collections"]
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
json.dump(subset, open("tests/thief-data/game-data.json", "w"), ensure_ascii=False, separators=(",", ":"))

db, mm, ex, bd, pe = load("monster-db.json"), load("move-model.json"), load("experience.json"), load("boss-damage.json"), load("potion-equivalents.json")
keep = lambda key: any(part in ENEMIES for part in key.split("+"))
pinned = {
    "monster-db.json": {
        "meta": db["meta"],
        "bosses": {},
        "encounters": {k: v for k, v in db["encounters"].items() if keep(k)},
        "monsters": {k: v for k, v in db["monsters"].items() if k in ENEMIES},
    },
    "move-model.json": {k: v for k, v in mm.items() if k in ENEMIES},
    "experience.json": ex,
    "boss-damage.json": bd,
    "potion-equivalents.json": {**{k: v for k, v in pe.items() if k != "potions"}, "potions": {k: v for k, v in pe["potions"].items() if k in potions}},
}
json.dump(pinned, open("tests/thief-data/pinned-knowledge.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(BOARDS)} boards; {len(subset['cards'])} cards, {len(subset['monsters'])} monsters, {len(subset['powers'])} powers, {len(subset['relics'])} relics, {len(subset['potions'])} potions", file=sys.stderr)
