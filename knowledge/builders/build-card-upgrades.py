#!/usr/bin/env python3
"""What upgrading a card changes, learned from logs/states.jsonl -> knowledge/common/card-upgrades.json.

The game data (data/game-data.json) has no upgraded numbers: its `upgrade.description` repeats the base
text. The logged states do: every card entry (deck, hand, piles, selections) carries `upgraded` and its
dynamic values' `base_value` (Strength, Weak and enchantments are in current/enchanted values, not in
the base) and its `energy_cost`. For every card id seen both plain and upgraded: the most common base
value of each dynamic value and the most common energy cost, each way; only what differs is kept.

Blessing of the Forge ("upgrade every card in your hand for this combat") is simulated from it
(card-model upgradeDelta). Re-run after new runs to cover more cards.

Usage: knowledge/builders/build-card-upgrades.py [states.jsonl]   (default: logs/states.jsonl)
"""
import collections
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])  # the project root (docs/layout.md)
STATES = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "logs/states.jsonl")
OUT = os.path.join(ROOT, "knowledge/common/card-upgrades.json")

# One card entry: id, name, upgraded flag, then (within the entry) its energy cost and dynamic values.
ENTRY = r'"card_id":"[A-Z0-9_]+","name":"[^"]*","upgraded":(true|false),.{0,900}?"dynamic_values":\[[^\]]*\]'

# grep, not a JSON parse of every row: the file is several GB and the entries repeat in every state.
found = subprocess.run(["grep", "-oP", ENTRY, STATES], capture_output=True, text=True, check=False).stdout
entries = set(found.splitlines())

stats = collections.defaultdict(lambda: {False: collections.defaultdict(collections.Counter), True: collections.defaultdict(collections.Counter)})
seen = collections.defaultdict(lambda: {False: 0, True: 0})
for text in entries:
    head = re.match(r'"card_id":"([A-Z0-9_]+)","name":"[^"]*","upgraded":(true|false),', text)
    if not head:
        continue
    card, upgraded = head.group(1), head.group(2) == "true"
    seen[card][upgraded] += 1
    side = stats[card][upgraded]
    cost = re.search(r'"energy_cost":(-?\d+)', text)
    if cost:
        side["__cost"][int(cost.group(1))] += 1
    for value in re.finditer(r'\{"name":"(\w+)","base_value":(-?[\d.]+)', text):
        number = float(value.group(2))
        side[value.group(1)][int(number) if number.is_integer() else number] += 1


def mode(counter):
    return counter.most_common(1)[0][0] if counter else None


out = {}
for card in sorted(stats):
    plain, upgraded = stats[card][False], stats[card][True]
    if not plain or not upgraded:
        continue
    entry = {"n": [seen[card][False], seen[card][True]], "vars": {}}
    for name in sorted(set(plain) | set(upgraded)):
        before, after = mode(plain.get(name, collections.Counter())), mode(upgraded.get(name, collections.Counter()))
        if before is None or after is None or before == after:
            continue
        if name == "__cost":
            entry["cost"] = [before, after]
        else:
            entry["vars"][name] = [before, after]
    if entry["vars"] or "cost" in entry:
        out[card] = entry

with open(OUT, "w", encoding="utf8") as handle:
    json.dump(out, handle, ensure_ascii=False, indent=1, sort_keys=True)
    handle.write("\n")
print(f"{len(out)} cards with an upgrade difference ({len(entries)} distinct card entries) -> {OUT}")
