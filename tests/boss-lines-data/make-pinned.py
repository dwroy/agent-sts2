#!/usr/bin/env python3
"""Pinned knowledge for tests/boss-lines-planner.test.ts: every knowledge file the planner reads on its logged boards,
trimmed to what those boards use, so the questions it pins do not move when the knowledge data is refreshed (every
run). Taken from the knowledge data of a fixed commit (REV, default below: the data the digests were captured on), not
from the working tree, so running it again gives the same file. Run from the repo root:
python3 tests/boss-lines-data/make-pinned.py [REV]

- monster-db.json, move-model.json: the boards' enemies, and the monsters of the lessons shown (a mechanics lesson is
  matched through its monster's powers in the DB).
- experience.json: whole (a mechanics lesson is matched by how rare a power's name is across the whole base, so a
  trimmed base would show other lessons).
- boss-damage.json: the bosses whose records fill those lessons' placeholders ({BOSS_RECORD:ID}, {GIANT_KILLS_A8}, ...).
- potion-equivalents.json: the table's meta and rates, and the potions held on the boards (potion_worth_in_act_boss).
"""
import json
import subprocess
import sys

REV = sys.argv[1] if len(sys.argv) > 1 else "69a33f9"
# The boards' enemies (and The Kin's boss key).
ENEMIES = {"VANTOM", "KIN_FOLLOWER", "KIN_PRIEST", "CEREMONIAL_BEAST", "WATERFALL_GIANT", "CUBEX_CONSTRUCT", "TORCH_HEAD_AMALGAM", "QUEEN"}
BOSSES = {"VANTOM", "THE_KIN", "CEREMONIAL_BEAST", "WATERFALL_GIANT", "QUEEN", "AEONGLASS"}
# The monsters of the lessons shown that are not on a board (aeon-clock, mecha-knight, chomper).
LESSON_MONSTERS = {"AEONGLASS", "MECHA_KNIGHT", "CHOMPER"}
POTIONS = {"FLEX_POTION", "SNECKO_OIL", "MAZALETHS_GIFT", "GAMBLERS_BREW", "BLOOD_POTION", "FORTIFIER", "CURE_ALL", "RADIANT_TINCTURE", "SWIFT_POTION"}


def load(name):
    return json.loads(subprocess.run(["git", "show", f"{REV}:src/knowledge/{name}"], check=True, capture_output=True, text=True).stdout)


db = load("monster-db.json")
mm = load("move-model.json")
ex = load("experience.json")
bd = load("boss-damage.json")
pe = load("potion-equivalents.json")
monsters = ENEMIES | LESSON_MONSTERS
keep = lambda key: any(part in ENEMIES for part in key.split("+"))
pinned = {
    "monster-db.json": {
        "meta": db["meta"],
        "bosses": {k: v for k, v in db["bosses"].items() if k in ENEMIES or k in BOSSES},
        "encounters": {k: v for k, v in db["encounters"].items() if keep(k)},
        "monsters": {k: v for k, v in db["monsters"].items() if k in monsters},
    },
    "move-model.json": {k: v for k, v in mm.items() if k in monsters},
    "experience.json": ex,
    "boss-damage.json": {k: v for k, v in bd.items() if k in BOSSES},
    "potion-equivalents.json": {**{k: v for k, v in pe.items() if k != "potions"}, "potions": {k: v for k, v in pe["potions"].items() if k in POTIONS}},
}
json.dump(pinned, open("tests/boss-lines-data/pinned-knowledge.json", "w"), ensure_ascii=False, separators=(",", ":"))
