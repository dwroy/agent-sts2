#!/usr/bin/env python3
"""Rebuild observed upgrade differences from states.jsonl, including text-only upgrades.

Numeric fields retain their modal base-value/cost contract. Text-only upgrades also
retain whole, unmodified out-of-combat deck faces and their actual source runs;
no rules, values or keyword effects are inferred from those faces.

Usage: build-card-upgrades.py [states.jsonl] [--cards ID ...] [--out FILE]
--cards updates only those ids in the destination, preserving every other entry.
"""
import argparse
import collections
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FACE_FIELDS = ("card_id", "name", "upgraded", "card_type", "rarity", "costs_x",
               "star_costs_x", "energy_cost", "star_cost", "rules_text",
               "resolved_rules_text", "dynamic_values")


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def cards(value):
    """Walk parsed objects: do not match across entries, field orders or text lengths."""
    if isinstance(value, dict):
        if isinstance(value.get("card_id"), str) and isinstance(value.get("upgraded"), bool):
            yield value
        else:
            for child in value.values():
                yield from cards(child)
    elif isinstance(value, list):
        for child in value:
            yield from cards(child)


def clean_face(card):
    """Only complete, unmodified deck faces can witness a text-only upgrade."""
    if (not isinstance(card.get("rules_text"), str)
            or not isinstance(card.get("resolved_rules_text"), str)
            or not card["resolved_rules_text"].strip()
            or not isinstance(card.get("energy_cost"), (int, float))
            or not isinstance(card.get("costs_x"), bool)
            or not isinstance(card.get("dynamic_values"), list)
            or card.get("enchantment") is not None):
        return None
    for value in card["dynamic_values"]:
        if (not isinstance(value, dict) or not isinstance(value.get("base_value"), (int, float))
                or value.get("is_modified") is True
                or any(value.get(k, value["base_value"]) != value["base_value"]
                       for k in ("current_value", "enchanted_value"))):
            return None
    return {key: card[key] for key in FACE_FIELDS if key in card}


def build(states, selected=None, audit=None):
    audit = audit if audit is not None else {}
    audit["invalid_json"] = []
    stats = collections.defaultdict(lambda: [collections.defaultdict(collections.Counter),
                                             collections.defaultdict(collections.Counter)])
    seen = collections.defaultdict(lambda: [set(), set()])
    faces = collections.defaultdict(lambda: [{}, {}])
    needles = [f'"{card}"'.encode() for card in sorted(selected)] if selected else None
    with Path(states).open("rb") as source:
        while True:
            off = source.tell()
            line = source.readline()
            if not line:
                break
            if needles and not any(needle in line for needle in needles):
                continue
            try:
                row = json.loads(line)
            except (json.JSONDecodeError, UnicodeDecodeError) as error:
                # Historical logs contain damaged rows. Never extract partial cards from them.
                audit["invalid_json"].append({"off": off, "sha256": hashlib.sha256(line).hexdigest(),
                                               "error": str(error)})
                continue
            state = row.get("state", row)
            run = state.get("run") or {}
            run_id = state.get("run_id") or run.get("run_id")
            for card in cards(state):
                card_id, side = card["card_id"], int(card["upgraded"])
                if selected and card_id not in selected:
                    continue
                # Count distinct payloads, not repeated state frames.
                key = canonical({k: v for k, v in card.items() if k != "index"})
                if key in seen[card_id][side]:
                    continue
                seen[card_id][side].add(key)
                if isinstance(card.get("energy_cost"), (int, float)):
                    stats[card_id][side]["__cost"][card["energy_cost"]] += 1
                for value in card.get("dynamic_values", []):
                    if isinstance(value.get("base_value"), (int, float)):
                        stats[card_id][side][value["name"]][value["base_value"]] += 1
            if state.get("in_combat") is not False or not run_id:
                continue
            for index, card in enumerate(run.get("deck", [])):
                card_id = card.get("card_id")
                if (not card_id or selected and card_id not in selected
                        or not isinstance(card.get("upgraded"), bool)):
                    continue
                face = clean_face(card)
                if face is None:
                    continue
                key, side = canonical(face), int(card["upgraded"])
                profile = faces[card_id][side].get(key)
                if profile is None:
                    # Frozen extracts retain the original raw source offset and hash.
                    evidence = row.get("source") or {
                        "file": "logs/states.jsonl", "off": off,
                        "sha256": hashlib.sha256(line).hexdigest(),
                        "path": f"state.run.deck[{index}]",
                    }
                    profile = {"card": face, "runs": set(), "evidence": {
                        **evidence, "run_id": run_id, "character": run.get("character_id"),
                        "ascension": run.get("ascension", run.get("ascension_level")),
                        "floor": run.get("floor"), "ts": row.get("ts"),
                    }}
                    faces[card_id][side][key] = profile
                profile["runs"].add(run_id)

    def mode(counter):
        return counter.most_common(1)[0][0] if counter else None

    out = {}
    for card_id in sorted(seen):
        plain, upgraded = stats[card_id]
        if not seen[card_id][0] or not seen[card_id][1]:
            continue
        entry = {"n": [len(s) for s in seen[card_id]], "vars": {}}
        for name in sorted(set(plain) | set(upgraded)):
            before, after = mode(plain.get(name)), mode(upgraded.get(name))
            if before is None or after is None or before == after:
                continue
            if name == "__cost":
                entry["cost"] = [before, after]
            else:
                entry["vars"][name] = [before, after]
        if entry["vars"] or "cost" in entry:
            out[card_id] = entry
            continue
        pair = []
        for side in faces[card_id]:
            if not side:
                break
            best = min(side.values(), key=lambda p: (-len(p["runs"]), p["evidence"]["off"]))
            pair.append({"card": best["card"], "evidence": best["evidence"],
                         "n_runs": len(best["runs"])})
        if (len(pair) == 2
                and pair[0]["card"]["rules_text"] == pair[1]["card"]["rules_text"]
                and pair[0]["card"]["resolved_rules_text"] != pair[1]["card"]["resolved_rules_text"]):
            entry["faces"] = pair
            out[card_id] = entry
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("states", nargs="?", type=Path, default=ROOT / "logs/states.jsonl")
    parser.add_argument("--cards", nargs="+", help="Refresh only these card ids")
    parser.add_argument("--out", type=Path, default=ROOT / "knowledge/common/card-upgrades.json")
    parser.add_argument("--audit", type=Path, help="Write excluded damaged-row offsets and hashes")
    args = parser.parse_args()
    audit = {}
    generated = build(args.states, set(args.cards) if args.cards else None, audit)
    if args.cards:
        previous = json.loads(args.out.read_text()) if args.out.exists() else {}
        for card_id in args.cards:
            previous.pop(card_id, None)
        generated = {**previous, **generated}
    args.out.write_text(json.dumps(generated, ensure_ascii=False, indent=1, sort_keys=True) + "\n")
    if args.audit:
        args.audit.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n")
    if audit["invalid_json"]:
        print(f"Excluded {len(audit['invalid_json'])} damaged JSON rows (no partial-card recovery)", file=sys.stderr)
    print(f"{len(generated)} observed card upgrades -> {args.out}")


if __name__ == "__main__":
    main()
