#!/usr/bin/env python3
"""Learn enemy move sequences from logs/states.jsonl -> knowledge/common/move-model.json.

For every enemy id: which move follows which (counts), and the average total attack damage of each
move, and which moves carry a Buff intent (a ramping enemy: Sludge Spinner's Rage, +3 Strength). The solver uses it to estimate next turn's incoming damage (save defensive potions for a bigger
hit, value kills by the attack they prevent next turn). Re-run after new runs to refine it.
"""
import collections
import json
import os
import re
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])  # the project root (docs/layout.md)
STATES = os.path.join(ROOT, "logs/states.jsonl")
OUT = os.path.join(ROOT, "knowledge/common/move-model.json")

# (run, enemy index, enemy id) -> {turn: move}
seen = collections.defaultdict(dict)
damage = collections.defaultdict(lambda: collections.defaultdict(list))
buffs = collections.defaultdict(set)
for line in open(STATES, encoding="utf8"):
    try:
        entry = json.loads(line)
    except json.JSONDecodeError:
        continue
    state = entry.get("state") or {}
    combat = state.get("combat")
    if not combat or state.get("screen") != "COMBAT":
        continue
    turn = state.get("turn")
    for enemy in combat.get("enemies", []):
        eid, move = enemy.get("enemy_id"), enemy.get("move_id")
        if not eid or not move or turn is None:
            continue
        key = (state.get("run_id"), enemy.get("index"), eid)
        if turn not in seen[key]:
            seen[key][turn] = move
            total = 0
            for intent in enemy.get("intents", []):
                if intent.get("damage") is not None:
                    total += int(intent["damage"]) * max(1, int(intent.get("hits") or 1))
            damage[eid][move].append(total)
            if any(intent.get("intent_type") == "Buff" for intent in enemy.get("intents", [])):
                buffs[eid].add(move)

transitions = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))
for (run, index, eid), turns in seen.items():
    ordered = sorted(turns)
    for a, b in zip(ordered, ordered[1:]):
        if b == a + 1:
            transitions[eid][turns[a]][turns[b]] += 1

model = {}
for eid in set(list(transitions) + list(damage)):
    model[eid] = {
        "next": {move: dict(counter) for move, counter in transitions[eid].items()},
        "damage": {move: round(sum(v) / len(v), 1) for move, v in damage[eid].items() if v},
    }
    if buffs[eid]:
        model[eid]["buffs"] = sorted(buffs[eid])
with open(OUT, "w", encoding="utf8") as handle:
    json.dump(model, handle, ensure_ascii=False, indent=1, sort_keys=True)
print(f"{len(model)} enemies, {sum(len(m['next']) for m in model.values())} moves with successors -> {OUT}")
