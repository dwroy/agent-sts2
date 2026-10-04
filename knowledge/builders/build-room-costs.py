#!/usr/bin/env python3
"""Measured HP change per map room -> knowledge/characters/<id>/room-costs.json (the route facts' HP projection).
One character's runs only (--character, default ironclad: an Ironclad room's cost says nothing of the Silent's).

For every logged run, the HP on the last MAP frame of floor f-1 (the HP the room of floor f was entered
with) minus the HP on the first MAP frame of floor f (after that room: fight, Burning Blood, event, rest,
potions drunk in it), keyed by ascension, act (floors 1-17 / 18-33 / 34+) and the room's map type
(Monster, Elite, Unknown, RestSite, Shop, Treasure). Positive = HP lost. A room the run died in counts
as losing all its entry HP (its type from the map node chosen into it, decisions.jsonl), so the numbers
are not survivors-only; rooms that crossed an act are not counted.

The ? rooms that turned out to be a fight (a combat decision on that floor, decisions.jsonl) are counted again
as "UnknownFight" (Unknown keeps all of them). Rooms with a fight (Monster, Elite, UnknownFight) also carry
fight_median / fight_p75: the HP lost inside the fight (first to last combat decision on the floor; the room
the run died in: all its entry HP), without Burning Blood's heal after it (2026-09-29 knowledge check: the
guide sent low-HP routes through ? rooms with no word of the fights they open, strategy/boss-clock.ts
unknownFightsText).

Output: {"meta": {...}, "by_asc": {"8": {"2": {"Monster": {"n", "deaths", "median", "p75", "p90", "mean"}, ...}}}}.

Usage:
  python3 knowledge/builders/build-room-costs.py [--logs DIR] [--character ID] [--out PATH]
Refresh (after new runs): python3 knowledge/builders/build-room-costs.py   (seconds: only MAP frames are parsed)
"""
import argparse
import collections
import json
import os
import re
import statistics
import sys
import time
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])  # the project root (docs/layout.md)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from characters import character_dir, character_key, run_character  # noqa: E402
MAP_MARK = b'"screen":"MAP"'
OVER_MARK = b'"screen":"GAME_OVER"'


def act_of(floor):
    return 1 if floor <= 17 else 2 if floor <= 33 else 3


def quantile(values, p):
    xs = sorted(values)
    k = (len(xs) - 1) * p
    i = int(k)
    j = min(i + 1, len(xs) - 1)
    return xs[i] + (xs[j] - xs[i]) * (k - i)


def scan(states_path, character=None):
    """run id -> floor -> {first, last, type, asc, avail} from the MAP frames; run id -> death floor. With `character`,
    only that character's MAP frames (a death floor is kept for every run: it only counts for a run with frames)."""
    runs = collections.defaultdict(dict)
    deaths = {}
    first_ts = last_ts = None
    with open(states_path, "rb") as handle:
        for line in handle:
            head = line[:4000]
            is_map = MAP_MARK in head
            if not is_map and OVER_MARK not in head:
                continue
            try:
                row = json.loads(line)
            except ValueError:
                continue
            state = row.get("state") or {}
            run = state.get("run") or {}
            run_id = state.get("run_id")
            if not run_id or run_id == "run_unknown":
                continue
            if state.get("screen") == "GAME_OVER":
                over = state.get("game_over") or {}
                if over.get("is_victory") is False and over.get("floor") is not None:
                    deaths[run_id] = over.get("floor")
                continue
            if state.get("screen") != "MAP":
                continue
            if character and run_character(run) != character:
                continue
            floor = run.get("floor")
            hp = run.get("current_hp")
            if floor is None or hp is None:
                continue
            first_ts = first_ts or row.get("ts")
            last_ts = row.get("ts") or last_ts
            themap = state.get("map") or {}
            current = themap.get("current_node") or {}
            room = None
            for node in themap.get("nodes") or []:
                if node.get("row") == current.get("row") and node.get("col") == current.get("col"):
                    room = node.get("node_type")
                    break
            mark = runs[run_id].setdefault(floor, {"first": hp, "last": hp, "type": room, "asc": run.get("ascension"), "avail": {}})
            mark["last"] = hp
            mark["type"] = room or mark["type"]
            avail = {node.get("index"): node.get("node_type") for node in themap.get("available_nodes") or []}
            if avail:
                mark["avail"] = avail
    return runs, deaths, first_ts, last_ts


FLOOR_RE = re.compile(rb'"floor":(\d+)')
FP_RUN_RE = re.compile(rb'\\"run\\":\\"([A-Z0-9]+)\\"')
FP_HP_RE = re.compile(rb'\\"hp\\":(-?\d+)')


def map_choices(decisions_path, fights=None):
    """(run id, floor) -> the option index of the last map node chosen on that floor. With `fights` (a dict), also
    (run id, floor) -> [HP at the first, HP at the last combat decision] for every floor with a fight."""
    chosen = {}
    if not os.path.exists(decisions_path):
        return chosen
    with open(decisions_path, "rb") as handle:
        for line in handle:
            if fights is not None and b'"screen":"COMBAT"' in line[:400]:
                head = line[:3000]
                floor, run, hp = FLOOR_RE.search(head), FP_RUN_RE.search(head), FP_HP_RE.search(head)
                if floor and run and hp:
                    key = (run.group(1).decode(), int(floor.group(1)))
                    value = int(hp.group(1))
                    fights.setdefault(key, [value, value])[1] = value
                continue
            if b"choose_map_node" not in line:
                continue
            try:
                row = json.loads(line)
                intent = row.get("chosen") or {}
                run_id = json.loads(row.get("fingerprint") or "{}").get("run")
            except (ValueError, AttributeError):
                continue
            if intent.get("action") == "choose_map_node" and run_id and row.get("floor") is not None:
                chosen[(run_id, row["floor"])] = intent.get("option_index")
    return chosen


def build(runs, deaths, chosen, fights=None):
    fights = fights or {}
    losses = collections.defaultdict(list)
    fight_losses = collections.defaultdict(list)
    died = collections.Counter()

    def add(key, loss, fight_loss):
        losses[key].append(loss)
        if fight_loss is not None and key[2] in ("Monster", "Elite", "UnknownFight"):
            fight_losses[key].append(fight_loss)

    for run_id, floors in runs.items():
        for floor, mark in floors.items():
            before = floors.get(floor - 1)
            if not before or mark["type"] is None or mark["asc"] is None or act_of(floor) != act_of(floor - 1):
                continue
            key = (str(mark["asc"]), str(act_of(floor)), mark["type"])
            fight = fights.get((run_id, floor))
            fight_loss = fight[0] - fight[1] if fight else None
            add(key, before["last"] - mark["first"], fight_loss)
            if mark["type"] == "Unknown" and fight:
                add((key[0], key[1], "UnknownFight"), before["last"] - mark["first"], fight_loss)
        # The room the run died in: entered from the last map of the floor before, lost all its entry HP.
        death_floor = deaths.get(run_id)
        before = floors.get(death_floor - 1) if death_floor is not None else None
        if before is None or death_floor in floors or before["asc"] is None or act_of(death_floor) != act_of(death_floor - 1):
            continue
        room = before["avail"].get(chosen.get((run_id, death_floor - 1)))
        if room in (None, "Boss"):
            continue
        key = (str(before["asc"]), str(act_of(death_floor)), room)
        add(key, before["last"], before["last"])
        died[key] += 1
        if room == "Unknown" and (run_id, death_floor) in fights:
            fight_key = (key[0], key[1], "UnknownFight")
            add(fight_key, before["last"], before["last"])
            died[fight_key] += 1
    by_asc = {}
    for (asc, act, room), values in sorted(losses.items()):
        by_asc.setdefault(asc, {}).setdefault(act, {})[room] = {
            "n": len(values),
            "deaths": died[(asc, act, room)],
            "median": round(quantile(values, 0.5), 1),
            "p75": round(quantile(values, 0.75), 1),
            "p90": round(quantile(values, 0.9), 1),
            "mean": round(statistics.mean(values), 1),
        }
        inside = fight_losses.get((asc, act, room))
        if inside:
            by_asc[asc][act][room]["fight_median"] = round(quantile(inside, 0.5), 1)
            by_asc[asc][act][room]["fight_p75"] = round(quantile(inside, 0.75), 1)
    return by_asc


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--logs", default=os.path.join(ROOT, "logs"))
    parser.add_argument("--character", default="ironclad", help="the character's knowledge id (default ironclad)")
    parser.add_argument("--out", default=None, help="default knowledge/characters/<character>/room-costs.json")
    args = parser.parse_args()
    character = character_key(args.character)
    out_path = args.out or os.path.join(character_dir(ROOT, character), "room-costs.json")
    started = time.time()
    runs, deaths, first_ts, last_ts = scan(os.path.join(args.logs, "states.jsonl"), character)
    if not runs:
        # A character with no logged run yet: no file (the TS loaders read a missing file as "no knowledge yet").
        print(f"room costs: no {character} runs; nothing written", file=sys.stderr)
        return
    fights = {}
    chosen = map_choices(os.path.join(args.logs, "decisions.jsonl"), fights)
    out = {
        "meta": {
            "note": "Generated by tools/build-room-costs.py from logs/states.jsonl MAP frames. HP lost in each map room "
            "(entry HP minus HP on the next floor's first MAP frame; negative = healed), by ascension, act and room type. "
            "A room the run died in counts as losing all its entry HP (deaths = how many); rooms that crossed an act are not counted. "
            "UnknownFight: the ? rooms that were a fight (also in Unknown). fight_median/fight_p75: HP lost inside the fight "
            "(first to last combat decision; a death: all the entry HP).",
            "runs": len(runs),
            "first_seen": first_ts,
            "last_seen": last_ts,
        },
        "by_asc": build(runs, deaths, chosen, fights),
    }
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    tmp = out_path + ".tmp"
    with open(tmp, "w", encoding="utf8") as handle:
        json.dump(out, handle, indent=1, sort_keys=True)
        handle.write("\n")
    os.replace(tmp, out_path)
    print(f"room costs: {len(runs)} runs -> {out_path} ({time.time() - started:.1f} s)", file=sys.stderr)


if __name__ == "__main__":
    main()
