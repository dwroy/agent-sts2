#!/usr/bin/env python3
"""Monster database from our own logs: logs/states.jsonl (+ runs.jsonl) -> knowledge/common/monster-db.json.

DATA ONLY. Nothing in agent/src/ reads monster-db.json yet; it is the observed reference the hand tables
(boss-clock.ts, enemy dossiers, move-model.json) are checked against.

Per monster id: names, acts, kind (hallway/elite/boss/minion/event), encounter groups, max HP by
ascension, moves (intent, damage per hit and hits by ascension, Strength taken out where it is
computable, block and powers the move put on itself or on us, successor counts), powers seen on it with
the game's text, the threat to us by ascension (HP lost, win rate, deaths with run ids) and provenance.
Every number carries its sample size (n); an ascension that was never logged is absent, not guessed.
Also `bosses`: one summary per act boss (all parts and phases).

The move sequence is the move-model's (knowledge/builders/build-move-model.py): the move an enemy shows at the first
logged state of each turn, successors counted between consecutive turns. Here it is keyed per fight
(run, floor, enemy index), where the move-model keys per run, which lets an enemy met twice in a run mix
two fights. `--move-model-out PATH` writes the same data in move-model.json's format.

Usage:
  python3 knowledge/builders/build-monster-db.py [--states PATH] [--runs PATH] [--game-data PATH] [--out PATH]
                                    [--move-model-out PATH] [--quiet]
  python3 knowledge/builders/build-monster-db.py --self-test
Stdlib only; states.jsonl is streamed (the agent_view copy of each state is cut before parsing).
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


def _default_logs():
    return os.path.join(ROOT, "logs")


SCREEN_RE = re.compile(rb'"screen":"([A-Z_]+)"')
SKIP_SCREENS = {b"MAIN_MENU", b"CHARACTER_SELECT", b"TIMELINE", b"UNLOCK", b"SETTINGS"}
AGENT_VIEW = b',"agent_view":'
# Incoming-damage modifiers that make the shown intent differ from base + Strength. Vigor adds to the
# enemy's next attack (Terror Eel's Thrash -> Crash 16 + 6 at A8: base 22 was the most common "base").
ENEMY_DAMAGE_MODS = {"WEAK_POWER", "SHRINK_POWER", "VIGOR_POWER"}
PLAYER_DAMAGE_MODS = {"VULNERABLE_POWER", "INTANGIBLE_POWER", "TANK_POWER"}
# Surrounded (the Kaiser Crab: SURROUNDED_POWER on us, BACK_ATTACK_LEFT/RIGHT_POWER on the claws): an enemy
# behind us shows and hits for floor((base + Strength) x 1.5), and which one is behind is not in the state
# (a targeted card turns us). A turn's frame is a base sample only when the same turn also shows the other
# facing's number (a < b = floor(a x 1.5)): then a - Strength is the base.
BACK_ATTACK_POWERS = {"BACK_ATTACK_LEFT_POWER", "BACK_ATTACK_RIGHT_POWER"}
END_OF_COMBAT_HEAL = {"BURNING_BLOOD", "BLACK_BLOOD", "MEAT_ON_THE_BONE"}


# ---------------------------------------------------------------- reading


# One draw/discard/exhaust pile entry of agent_view.combat ('"line":"打击*3 [1费]：…","card_ids":["STRIKE_IRONCLAD"]'),
# and the count in its line.
PILE_ENTRY_RE = re.compile(rb'"line":"((?:[^"\\]|\\.)*)","card_ids":\["([A-Z0-9_]+)"')
PILE_COUNT_RE = re.compile(rb'^[^\[]*?\*(\d+)\s*\[')


def pile_statuses(raw, cut):
    """{pile: Counter(status card id)} of agent_view.combat's draw, discard and exhaust piles, or None without them."""
    if not STATUS_CARDS:
        return None
    view = raw[cut:]
    starts = [view.find(b'"%s":[' % name) for name in (b"draw", b"discard", b"exhaust", b"enemies")]
    if min(starts) < 0 or starts != sorted(starts):
        return None
    out = {}
    for name, a, b in zip(("draw", "discard", "exhaust"), starts, starts[1:]):
        counts = collections.Counter()
        for match in PILE_ENTRY_RE.finditer(view, a, b):
            card_id = match.group(2).decode()
            if card_id in STATUS_CARDS:
                count = PILE_COUNT_RE.match(match.group(1))
                counts[card_id] += int(count.group(1)) if count else 1
        out[name] = counts
    return out


def iter_entries(path):
    """Yield (screen, entry) for every state line worth reading, streaming the file.

    A combat state also carries `_piles`, the status cards in its draw/discard/exhaust piles (pile_statuses),
    read from the agent_view part that is otherwise cut before parsing."""
    with open(path, "rb") as handle:
        for raw in handle:
            match = SCREEN_RE.search(raw, 0, 20000)
            if not match or match.group(1) in SKIP_SCREENS:
                continue
            cut = raw.rfind(AGENT_VIEW)
            entry = None
            if cut > 0:
                try:
                    entry = json.loads(raw[:cut] + b"}}")
                except ValueError:
                    entry = None
                if entry is not None and match.group(1) == b"COMBAT":
                    entry["_piles"] = pile_statuses(raw, cut)
            if entry is None:
                try:
                    entry = json.loads(raw)
                except ValueError:
                    continue
            yield match.group(1).decode(), entry


def powers_of(entity):
    out = {}
    for power in (entity or {}).get("powers") or []:
        pid = power.get("power_id")
        if pid:
            out[pid] = out.get(pid, 0) + (power.get("amount") if isinstance(power.get("amount"), (int, float)) else 0)
    return out


def intent_total(intents):
    """Total attack damage of a move as the move-model computes it (damage x max(1, hits))."""
    total = 0
    for intent in intents or []:
        if intent.get("damage") is not None:
            total += int(intent["damage"]) * max(1, int(intent.get("hits") or 1))
    return total


def act_of(run):
    try:
        return int(run.get("act_id")) + 1
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------- fights


class Fight:
    def __init__(self, run_id, run, state, ts):
        self.run_id = run_id
        self.floor = run.get("floor")
        self.act = act_of(run)
        self.asc = run.get("ascension")
        self.boss_id = run.get("boss_id")
        self.relics = {r.get("relic_id") for r in run.get("relics") or [] if isinstance(r, dict)}
        self.first_ts = ts
        self.last_ts = ts
        player = (state.get("combat") or {}).get("player") or {}
        self.entry_hp = player.get("current_hp", run.get("current_hp"))
        self.last_hp = self.entry_hp
        self.max_turn = 0
        self.initial = None  # sorted ids of the enemies on the first state
        self.instances = {}  # (serial, id) -> {"hp": [distinct max_hp in order], "minion": bool, "powers": {}}
        self.turn_first = {}  # turn -> snapshot
        self.turn_last = {}
        self.post_hp = None
        self.outcome = None  # won / died / None
        self.room = None
        self.tracked = []
        self.tracked_turn = None
        # (turn, serial) -> {(per-hit damage, Strength, damage modifiers)} of a back-attack enemy while we are Surrounded
        self.turn_shown = collections.defaultdict(set)
        self.next_serial = 0
        self.initial_serials = set()

    @property
    def key(self):
        return (self.run_id, self.act, self.floor)


HUGE_HP = 100000  # Waterfall Giant's max_hp reads 999999999 while it erupts


def track(fight, turn, enemies):
    """Give each logged enemy a fight-wide serial number.

    The mod's `index` is the position in the current enemy list, and dead enemies drop out of it (Kin:
    a follower dies and the priest moves from index 2 to 1), so index is no identity. The survivors
    keep their order, spawns come in anywhere: match each enemy to the next unmatched instance of the
    same id at or after the previous match, preferring the closest HP; no candidate means a spawn.
    """
    previous = fight.tracked  # [(serial, id, hp, max_hp, alive)] in the last state's order
    out = []
    used = set()
    pointer = 0
    for enemy in enemies:
        eid = enemy.get("enemy_id")
        if not eid:
            continue
        hp = enemy.get("current_hp") if isinstance(enemy.get("current_hp"), int) else 0
        max_hp = enemy.get("max_hp")
        best = None
        for position in range(pointer, len(previous)):
            serial, pid, php, pmax, palive = previous[position]
            if pid != eid or serial in used:
                continue
            # HP does not go up while we play, unless it came back (a new phase, a respawn).
            if turn == fight.tracked_turn and hp > php and pmax == max_hp and palive:
                continue
            cost = abs(php - hp) + (0 if pmax == max_hp else 1000)
            if best is None or cost < best[0]:
                best = (cost, position, serial)
        if best is None:
            serial = fight.next_serial
            fight.next_serial += 1
        else:
            serial = best[2]
            pointer = best[1] + 1
        used.add(serial)
        out.append((serial, eid, hp, max_hp, enemy.get("is_alive", True), enemy))
    fight.tracked = [(serial, eid, hp, max_hp, alive) for serial, eid, hp, max_hp, alive, _ in out]
    fight.tracked_turn = turn
    return [(serial, enemy) for serial, _, _, _, _, enemy in out]


def status_counts(combat, piles):
    """{pile: Counter(status id)} with the hand (state.combat.hand), or None when the piles are not logged."""
    if piles is None:
        return None
    hand = collections.Counter(c.get("card_id") for c in combat.get("hand") or [] if isinstance(c, dict) and c.get("card_id") in STATUS_CARDS)
    return {**piles, "hand": hand}


def snapshot(combat, tracked, piles=None):
    player = combat.get("player") or {}
    enemies = {}
    for serial, enemy in tracked:
        enemies[serial] = {
            "id": enemy.get("enemy_id"),
            "move": enemy.get("move_id"),
            "intents": enemy.get("intents") or [],
            "powers": powers_of(enemy),
            "block": enemy.get("block") or 0,
            "hp": enemy.get("current_hp"),
            "max_hp": enemy.get("max_hp"),
            "alive": enemy.get("is_alive", True),
        }
    return {"player": {"powers": powers_of(player), "hp": player.get("current_hp"), "block": player.get("block") or 0}, "enemies": enemies,
            "statuses": status_counts(combat, piles)}


def observe_combat(fight, state, ts, piles=None, observed=False):
    combat = state.get("combat") or {}
    turn = state.get("turn")
    fight.last_ts = ts
    player = combat.get("player") or {}
    if player.get("current_hp") is not None:
        fight.last_hp = player["current_hp"]
    tracked = track(fight, turn, combat.get("enemies") or [])
    snap = snapshot(combat, tracked, piles)
    if fight.initial is None and snap["enemies"]:
        fight.initial = sorted(e["id"] for e in snap["enemies"].values())
        fight.initial_serials = set(snap["enemies"])
    for serial, raw in tracked:
        enemy = snap["enemies"][serial]
        inst = fight.instances.setdefault((serial, enemy["id"]), {"hp": [], "minion": False, "powers": {}, "power_turn": {},
                                                                   "spawned": serial not in fight.initial_serials})
        max_hp = raw.get("max_hp")
        if isinstance(max_hp, int) and 0 < max_hp < HUGE_HP and (not inst["hp"] or inst["hp"][-1] != max_hp):
            inst["hp"].append(max_hp)
        if "MINION_POWER" in enemy["powers"]:
            inst["minion"] = True
        for pid, amount in enemy["powers"].items():
            if pid not in inst["powers"] and isinstance(turn, int):
                inst["power_turn"][pid] = turn  # the turn it was first seen on
            inst["powers"].setdefault(pid, amount)  # first amount seen
            inst["powers"][pid + "#max"] = max(inst["powers"].get(pid + "#max", amount), amount)
    if not isinstance(turn, int):
        return
    fight.max_turn = max(fight.max_turn, turn)
    if "SURROUNDED_POWER" in snap["player"]["powers"]:
        for serial, enemy in snap["enemies"].items():
            if BACK_ATTACK_POWERS & set(enemy["powers"]):
                mods = damage_mods(enemy, snap["player"])
                for intent in enemy["intents"]:
                    if intent.get("damage") is not None:
                        fight.turn_shown[(turn, serial)].add((int(intent["damage"]), enemy["powers"].get("STRENGTH_POWER", 0), mods))
    first = fight.turn_first.setdefault(turn, {"player": snap["player"], "enemies": {}, "statuses": snap["statuses"]})
    for serial, enemy in snap["enemies"].items():
        # The move of a turn: the first logged state that shows one (the move-model's rule).
        if serial not in first["enemies"] and enemy["move"]:
            first["enemies"][serial] = enemy
    MECHANICS.frame(fight, turn, snap, ts, observed)
    fight.turn_last[turn] = snap


def damage_mods(enemy, player):
    """The damage modifiers up on a frame (enemy Weak/Shrink/Vigor, our Vulnerable/Intangible/Tank)."""
    return tuple(sorted(set(enemy["powers"]) & ENEMY_DAMAGE_MODS)) + tuple(sorted(set(player["powers"]) & PLAYER_DAMAGE_MODS))


def vulnerable_base(shown):
    """The hit before our Vulnerable (base + Strength) behind a shown one: the x with floor(x * 1.5) == shown (unique when it
    exists: floor(1.5x) rises by 1 or 2 per step of x), else None (the Queen's Off With Your Head 7 = floor(5 x 1.5): base 3
    with her Strength 2; 9, 10, 12, 16 with Strength 3, 4, 5, 8 all give 3 at A8)."""
    x = -(-2 * shown // 3)  # ceil(shown / 1.5)
    return x if (3 * x) // 2 == shown else None


def back_pair_base(shown, damage, strength, mods):
    """A back-attack enemy's base on a turn that showed both facings' numbers (see BACK_ATTACK_POWERS), else None."""
    same = {d for d, s, m in shown if s == strength and m == mods}
    for a in same:
        b = int(a * 1.5)
        if b != a and b in same and damage in (a, b):
            return a - strength
    return None


# ---------------------------------------------------------------- aggregation


def new_monster():
    return {
        "acts": collections.Counter(),
        "rooms": collections.Counter(),
        "minion_instances": 0,
        "instances": 0,
        "encounters": collections.Counter(),
        "hp": collections.defaultdict(list),  # asc -> [first max_hp]
        "phases": collections.defaultdict(collections.Counter),  # asc -> Counter(tuple of max_hp)
        "moves": collections.defaultdict(new_move),
        "powers": collections.defaultdict(lambda: {"fights": 0, "start": collections.Counter(), "max": collections.Counter(),
                                                   "start_by_asc": collections.defaultdict(collections.Counter),
                                                   "turn_by_asc": collections.defaultdict(collections.Counter)}),
        "threat": collections.defaultdict(list),  # asc -> [fight result]
        "runs": set(),
        "first": None,
        "last": None,
        "spawned": 0,
    }


def new_move():
    return {
        "n": 0,
        "intents": collections.Counter(),
        "shown": collections.defaultdict(collections.Counter),  # asc -> Counter("dmg x hits")
        "base": collections.defaultdict(collections.Counter),  # asc -> Counter(base damage per hit)
        # asc -> Counter(base damage per hit) from turns whose only damage modifier was our Vulnerable (shown = floor((base +
        # Strength) x 1.5), inverted): used only for a move with no clean turn at any ascension (vulnerable_base).
        "vbase": collections.defaultdict(collections.Counter),
        "hits": collections.defaultdict(collections.Counter),
        "totals": [],
        "next": collections.Counter(),
        "block": collections.Counter(),
        # asc -> Counter(block): the same blocks split by ascension (the Matriarch's Slash 2: 12 up to A7, 14 from A8).
        "block_by_asc": collections.defaultdict(collections.Counter),
        "self": collections.defaultdict(collections.Counter),
        "player": collections.defaultdict(collections.Counter),
        # asc -> pid -> Counter(delta): the same deltas split by ascension.
        "self_by_asc": collections.defaultdict(lambda: collections.defaultdict(collections.Counter)),
        # asc -> [(per-hit damage shown, Strength)] of the turns a back-attack enemy used it while we were Surrounded
        "back_frames": collections.defaultdict(list),
        "player_by_asc": collections.defaultdict(lambda: collections.defaultdict(collections.Counter)),
        "status_cards": collections.Counter(),
        # The status cards a StatusCard move put in our piles (Counter(card id)) and where they landed
        # (Counter("draw" / "discard")), from the piles across its enemy turn when it was the only one adding any.
        "status_ids": collections.Counter(),
        "status_pile": collections.Counter(),
        # asc -> Counter(HP healed): a Heal move's HP gain across its enemy turn (Siphon 15 at A8, Ponder).
        "heal_by_asc": collections.defaultdict(collections.Counter),
        "turns": collections.Counter(),
    }


class Builder:
    def __init__(self, runs=None):
        self.monsters = collections.defaultdict(new_monster)
        self.bosses = collections.defaultdict(lambda: collections.defaultdict(list))
        self.encounters = collections.defaultdict(lambda: collections.defaultdict(list))
        self.runs = runs or {}
        self.open = {}  # run_id -> Fight
        self.await_map = collections.defaultdict(list)  # run_id -> [Fight]
        self.fights = 0
        self.first_ts = None
        self.last_ts = None
        self.asc_seen = collections.Counter()

    # -- stream
    def feed(self, screen, entry):
        state = entry.get("state") or {}
        run_id = state.get("run_id")
        if not run_id or run_id == "run_unknown":
            return
        run = state.get("run") or {}
        ts = entry.get("ts")
        if screen == "COMBAT" and state.get("combat") and run:
            fight = self.open.get(run_id)
            key = (run_id, act_of(run), run.get("floor"))
            if fight is not None and fight.key != key:
                self.close(fight, None, None)
                fight = None
            if fight is None:
                # A different run left open: its fight has no logged end.
                for other in [r for r in self.open if r != run_id]:
                    self.close(self.open[other], None, None)
                fight = Fight(run_id, run, state, ts)
                self.open[run_id] = fight
            observe_combat(fight, state, ts, entry.get("_piles"), bool(entry.get("observed")))
            return
        fight = self.open.get(run_id)
        if fight is not None and (screen == "GAME_OVER" or not state.get("in_combat")):
            game_over = state.get("game_over") if screen == "GAME_OVER" else None
            self.close(fight, run, game_over)
        # The reward screen after a fight (before the next map frame commits it): what the fight gave.
        if screen == "REWARD" and self.await_map.get(run_id):
            MECHANICS.reward(self.await_map[run_id][-1], state.get("reward"))
        if screen == "MAP" and self.await_map.get(run_id):
            self.assign_rooms(run_id, state)

    def assign_rooms(self, run_id, state):
        map_ = state.get("map") or {}
        current = map_.get("current_node") or {}
        act = act_of(state.get("run") or {})
        node_type = None
        for node in map_.get("nodes") or []:
            if node.get("row") == current.get("row") and node.get("col") == current.get("col"):
                node_type = node.get("node_type")
                break
        for fight in self.await_map.pop(run_id):
            if fight.act == act and node_type and node_type not in ("Ancient",):
                fight.room = node_type
            self.commit(fight)

    def close(self, fight, run, game_over):
        self.open.pop(fight.run_id, None)
        if run:
            fight.post_hp = run.get("current_hp")
        if game_over is not None:
            fight.outcome = "won" if game_over.get("is_victory") else "died"
        elif fight.post_hp is not None:
            fight.outcome = "died" if fight.post_hp <= 0 else "won"
        self.await_map[fight.run_id].append(fight)

    def finish(self):
        for fight in list(self.open.values()):
            self.close(fight, None, None)
        for run_id in list(self.await_map):
            for fight in self.await_map.pop(run_id):
                self.commit(fight)

    # -- one fight into the tables
    def room_kind(self, fight, game_types):
        if fight.room == "Boss":
            return "boss"
        if fight.room == "Elite":
            return "elite"
        if fight.room == "Monster":
            return "hallway"
        if fight.room in ("Unknown", "Event"):
            return "unknown_room"
        types = {game_types.get(i) for i in fight.initial or []}
        boss = (fight.boss_id or "").upper()
        if "Boss" in types or any(i in boss for i in fight.initial or []):
            return "boss"
        if "Elite" in types:
            return "elite"
        return "hallway" if types else None

    def commit(self, fight):
        if not fight.initial:
            return
        run = self.runs.get(fight.run_id)
        if fight.outcome is None and run is not None and run.get("floor") == fight.floor and not run.get("victory") and run.get("death_fight"):
            fight.outcome = "died"
        self.fights += 1
        asc = fight.asc if isinstance(fight.asc, int) else None
        if asc is not None:
            self.asc_seen[asc] += 1
        for ts in (fight.first_ts, fight.last_ts):
            if ts:
                self.first_ts = min(self.first_ts or ts, ts)
                self.last_ts = max(self.last_ts or ts, ts)
        kind = self.room_kind(fight, GAME_TYPES)
        encounter = "+".join(fight.initial)
        turns = fight.max_turn
        loss = None if fight.entry_hp is None else fight.entry_hp - (0 if fight.outcome == "died" else fight.last_hp)
        net = None
        if fight.entry_hp is not None and fight.post_hp is not None:
            net = fight.entry_hp - fight.post_hp
        elif fight.outcome == "died" and fight.entry_hp is not None:
            net = fight.entry_hp
        result = {"run": fight.run_id, "floor": fight.floor, "outcome": fight.outcome, "loss": loss, "net_loss": net,
                  "turns": turns, "entry_hp": fight.entry_hp, "encounter": encounter, "heal_relic": bool(fight.relics & END_OF_COMBAT_HEAL)}
        ids_in_fight = set()
        for (index, eid), inst in fight.instances.items():
            mon = self.monsters[eid]
            mon["instances"] += 1
            if inst["minion"]:
                mon["minion_instances"] += 1
            if inst["hp"] and asc is not None:
                mon["hp"][asc].append(inst["hp"][0])
                if len(inst["hp"]) > 1:
                    mon["phases"][asc][tuple(inst["hp"])] += 1
            if inst["spawned"]:
                mon["spawned"] += 1
            if eid not in ids_in_fight:
                ids_in_fight.add(eid)
                for pid in inst["powers"]:
                    if pid.endswith("#max"):
                        continue
                    power = mon["powers"][pid]
                    power["fights"] += 1
                    power["start"][inst["powers"][pid]] += 1
                    power["max"][inst["powers"][pid + "#max"]] += 1
                    if asc is not None:
                        power["start_by_asc"][asc][inst["powers"][pid]] += 1
                        if pid in inst["power_turn"]:
                            power["turn_by_asc"][asc][inst["power_turn"][pid]] += 1
        for eid in ids_in_fight:
            mon = self.monsters[eid]
            if fight.act:
                mon["acts"][fight.act] += 1
            if kind:
                mon["rooms"][kind] += 1
            mon["encounters"][encounter] += 1
            mon["runs"].add(fight.run_id)
            mon["first"] = min(mon["first"] or fight.first_ts, fight.first_ts)
            mon["last"] = max(mon["last"] or fight.last_ts, fight.last_ts)
            if asc is not None:
                mon["threat"][asc].append(result)
        self.moves_of(fight, asc)
        start_hp = sum(inst["hp"][0] for inst in fight.instances.values() if not inst["spawned"] and inst["hp"])
        all_hp = sum(inst["hp"][0] for inst in fight.instances.values() if inst["hp"])
        if asc is not None:
            self.encounters[encounter][asc].append({**result, "start_hp": start_hp, "all_hp": all_hp, "kind": kind, "act": fight.act})
        if kind == "boss" and asc is not None:
            boss_key = boss_key_of(fight.boss_id, ids_in_fight)
            parts = collections.defaultdict(list)
            for (index, eid), inst in sorted(fight.instances.items(), key=lambda kv: (kv[0][0] if isinstance(kv[0][0], int) else 99)):
                parts[eid].append({"hp": inst["hp"], "spawned": inst["spawned"], "minion": inst["minion"]})
            self.bosses[boss_key][asc].append({**result, "parts": dict(parts), "start_hp": start_hp, "ids": sorted(ids_in_fight)})
        MECHANICS.commit(fight, ids_in_fight)

    def moves_of(self, fight, asc):
        turns = sorted(fight.turn_first)
        for turn in turns:
            first = fight.turn_first[turn]
            nxt = fight.turn_first.get(turn + 1)
            last = fight.turn_last.get(turn)
            status_added = status_delta(last, nxt, first)
            for index, enemy in first["enemies"].items():
                eid, move_id = enemy["id"], enemy["move"]
                move = self.monsters[eid]["moves"][move_id]
                move["n"] += 1
                move["turns"][turn] += 1
                types = tuple(sorted({i.get("intent_type") for i in enemy["intents"] if i.get("intent_type")}))
                move["intents"]["+".join(types) or "None"] += 1
                move["totals"].append(intent_total(enemy["intents"]))
                strength = enemy["powers"].get("STRENGTH_POWER", 0)
                clean = not (set(enemy["powers"]) & ENEMY_DAMAGE_MODS) and not (set(first["player"]["powers"]) & PLAYER_DAMAGE_MODS)
                vulnerable_only = not (set(enemy["powers"]) & ENEMY_DAMAGE_MODS) and set(first["player"]["powers"]) & PLAYER_DAMAGE_MODS == {"VULNERABLE_POWER"}
                back = bool(BACK_ATTACK_POWERS & set(enemy["powers"])) and "SURROUNDED_POWER" in first["player"]["powers"]
                akey = asc if asc is not None else "?"
                for intent in enemy["intents"]:
                    if intent.get("damage") is not None:
                        hits = max(1, int(intent.get("hits") or 1))
                        dmg = int(intent["damage"])
                        move["shown"][akey][f"{dmg}x{hits}"] += 1
                        move["hits"][akey][hits] += 1
                        if back:
                            move["back_frames"][akey].append((dmg, strength))
                            base = back_pair_base(fight.turn_shown.get((turn, index), ()), dmg, strength, damage_mods(enemy, first["player"])) if clean else None
                            if base is not None:
                                move["base"][akey][base] += 1
                        elif clean:
                            move["base"][akey][dmg - strength] += 1
                        elif vulnerable_only and vulnerable_base(dmg) is not None:
                            move["vbase"][akey][vulnerable_base(dmg) - strength] += 1
                    if intent.get("status_card_count"):
                        move["status_cards"][int(intent["status_card_count"])] += 1
                        if status_added is not None and status_added[0] == index:
                            move["status_ids"].update(status_added[1])
                            move["status_pile"].update(status_added[2])
                if nxt is None:
                    continue
                after = nxt["enemies"].get(index)
                if after is not None and after["id"] == eid:
                    move["next"][after["move"]] += 1
                if last is None or index not in last["enemies"]:
                    continue
                before = last["enemies"][index]
                # nxt opens the next turn: the enemy turn has resolved, our turn has not started.
                if after is None:
                    continue
                if "Heal" in types and isinstance(after.get("hp"), int) and isinstance(before.get("hp"), int) and after["hp"] > before["hp"]:
                    move["heal_by_asc"][akey][after["hp"] - before["hp"]] += 1
                if "Defend" in types and after["block"]:
                    move["block"][after["block"]] += 1
                    move["block_by_asc"][akey][after["block"]] += 1
                if "Buff" in types:
                    temporary = any(pid in TEMPORARY_POWERS for pid in before["powers"])
                    for pid, amount in after["powers"].items():
                        delta = amount - before["powers"].get(pid, 0)
                        # Our Dark Shackles and the like wear off at the end of the turn: that Strength is not the move's.
                        if temporary and pid in DRAINED:
                            continue
                        if delta > 0 and GAME_POWER_TYPES.get(pid) != "Debuff":
                            move["self"][pid][delta] += 1
                            move["self_by_asc"][akey][pid][delta] += 1
                if types and set(types) & {"Debuff", "DebuffStrong", "CardDebuff"}:
                    p_before = last["player"]["powers"]
                    p_after = nxt["player"]["powers"]
                    temporary = any(pid in TEMPORARY_POWERS for pid in p_before)
                    for pid in set(p_after) | set(p_before):
                        delta = p_after.get(pid, 0) - p_before.get(pid, 0)
                        # A debuff that appears with no positive amount lasts the fight (the Shrinker Beetle's
                        # SHRINK_POWER -1): recorded as that amount.
                        if pid not in p_before and GAME_POWER_TYPES.get(pid) == "Debuff" and p_after[pid] <= 0 and pid not in DRAINED:
                            delta = p_after[pid]
                        # Debuffs put on us, and Strength/Dexterity drained (our own buffs are left out).
                        if (GAME_POWER_TYPES.get(pid) == "Debuff" and pid not in DRAINED and (delta > 0 or (pid not in p_before and delta < 0))) or (delta < 0 and pid in DRAINED and not temporary):
                            move["player"][pid][delta] += 1
                            move["player_by_asc"][akey][pid][delta] += 1


def status_delta(last, nxt, first):
    """The status cards one enemy's StatusCard move added over this enemy turn: (serial, Counter(id), Counter(pile)).

    None unless exactly one enemy showed a StatusCard intent and both our last state of the turn and the next
    turn's first carry the piles. New = the rise in hand + draw + discard + exhaust (the hand is discarded
    or exhausted at the end of the turn, nothing leaves the four); where they landed: the draw pile when
    they are in the next turn's draw pile or hand beyond the last state's draw pile, else the discard pile."""
    if last is None or nxt is None:
        return None
    movers = [serial for serial, enemy in first["enemies"].items() if any(i.get("status_card_count") for i in enemy["intents"])]
    before, after = last.get("statuses"), nxt.get("statuses")
    if len(movers) != 1 or before is None or after is None:
        return None
    total = lambda piles: sum((piles[name] for name in ("hand", "draw", "discard", "exhaust")), collections.Counter())
    added = total(after) - total(before)
    if not added:
        return None
    drawn_side = (after["draw"] + after["hand"]) - before["draw"]
    piles = collections.Counter()
    for card_id, n in added.items():
        piles["draw" if drawn_side.get(card_id, 0) >= n else "discard"] += n
    return movers[0], added, piles


# ---------------------------------------------------------------- observed mechanics
#
# Rules the game text does not state, mined generically from the logged frames (Dai 2026-10-02: learned from the logs,
# written into the DB, used by the solver through data-driven rules; docs/mechanics-learning.md). The Thieving Hopper's
# Flutter says only 「从攻击牌中受到的伤害减少50%」, yet stripping its last stack stuns it and cancels that turn's move
# (MCK9SMSK40ZY F19 T4: Nab 14 dealt nothing). Nothing below names an enemy or a power: every power, Escape move and
# reward goes through the same counting. A failure anywhere in it drops the `observed` fields and nothing else.

STUN_MOVE = "STUNNED"
# Evidence run ids kept per pattern.
EVIDENCE = 3
# A reward differs between killed and left when it was on this share of the kill fights and on none of the leaves.
REWARD_KILLED_SHARE = 0.5
# A reward belongs to a monster when at most this share of the fights without it had it.
REWARD_ELSEWHERE_SHARE = 0.02
# Rewards seen fewer times than this are not compared at all (a random relic, a rare potion).
REWARD_MIN_N = 3


def reward_key(reward):
    """A reward screen item as a key: its type and its text with the numbers taken out (「25金币（偷回）」 -> 「N金币（偷回）」)."""
    return f"{reward.get('reward_type') or '?'}:{re.sub(r'[0-9]+', 'N', str(reward.get('description') or ''))}"


def where(fight, turn):
    return f"{fight.run_id} F{fight.floor} T{turn}"


def living(enemy):
    return bool(enemy["alive"]) and (enemy["hp"] or 0) > 0


# (run id, ts) of the decision frames that ended our turn (decisions.jsonl, chosen action end_turn); None without the file.
END_TURNS = None
END_TURN_RE = re.compile(rb'^\{"ts":"([^"]+)"')


def load_end_turns(path):
    """The (run id, frame ts) of every end-turn decision: the frame a decision was made on has the decision's ts."""
    if not path or not os.path.exists(path):
        return None
    out = set()
    with open(path, "rb") as handle:
        for raw in handle:
            if b'"chosen":{"action":"end_turn"' not in raw:
                continue
            ts = END_TURN_RE.match(raw)
            # The run id, else (the first days' rows) the fingerprint's run.
            run = re.search(rb'"run_id":"([A-Za-z0-9_]+)"', raw) or re.search(rb'\\"run\\":\\"([A-Za-z0-9_]+)\\"', raw)
            if ts and run:
                out.add((run.group(1).decode(), ts.group(1).decode()))
    return out


def _evidence(lst, item):
    if len(lst) < EVIDENCE and item not in lst:
        lst.append(item)


def move_change_tally():
    """The class-B counters of a stripped power (MECH_MOVE_RULES; docs/mechanics-learning.md §8): the enemy's move on the
    frame before the strip and on its own frame, what it shows at our turn's end and at the next turn's first frame."""
    return {"move_before": collections.Counter(), "move_changed": 0, "changed_to": collections.Counter(), "changed_evidence": [],
            "end_move": collections.Counter(), "next_move": collections.Counter(), "changed_next": collections.Counter(), "revived": 0}


def death_tally():
    """MECH_DEATH_MOVE (docs/mechanics-learning.md §9): a survivor's move when an ally dies on our turn (one monster id for
    the survivor, one for the ally): its move just before the death and on the death's own frame (by the move before), what
    it shows at our end-turn decision and on the next turn's first frame; and, as the baseline, the turns it lived beside a
    living ally of that id: the moves it started them with and the move it showed the turn after (the ally still alive), and
    the turns it started after such an ally died earlier in the attempt with none of that id alive: the moves it showed."""
    return {"n": 0, "fights": set(), "move_before": collections.Counter(), "move_changed": 0, "changed_to": collections.Counter(),
            "by_move": collections.defaultdict(lambda: {"n": 0, "changed_to": collections.Counter()}), "changed_evidence": [],
            "attack_changed": 0, "co_deaths": 0, "end_move": collections.Counter(), "next_n": 0, "next_move": collections.Counter(),
            "next_after": collections.defaultdict(collections.Counter), "next_evidence": [], "alive_turns": 0,
            "alive_moves": collections.Counter(), "alive_next": collections.defaultdict(collections.Counter), "dead_turns": 0,
            "dead_moves": collections.Counter()}


def death_obj(t):
    seen = set(t["next_after"])
    return {"n": t["n"], "fights": len(t["fights"]), "move_before": dict(t["move_before"].most_common()), "move_changed": t["move_changed"],
            "move_changed_share": round(t["move_changed"] / t["n"], 3) if t["n"] else None, "changed_to": dict(t["changed_to"].most_common()),
            "by_move": {move: {"n": by["n"], "changed_to": dict(by["changed_to"].most_common())} for move, by in sorted(t["by_move"].items())},
            "changed_evidence": t["changed_evidence"], "attack_changed": t["attack_changed"], "co_deaths": t["co_deaths"],
            "end_move": dict(t["end_move"].most_common()), "next_n": t["next_n"], "next_move": dict(t["next_move"].most_common()),
            "next_after": {move: dict(c.most_common()) for move, c in sorted(t["next_after"].items())}, "next_evidence": t["next_evidence"],
            "alive": {"turns": t["alive_turns"], "moves": dict(t["alive_moves"].most_common()),
                      "next": {move: dict(c.most_common()) for move, c in sorted(t["alive_next"].items()) if move in seen}},
            "dead": {"turns": t["dead_turns"], "moves": dict(t["dead_moves"].most_common())}}


# A (survivor, ally) pair is written to the DB with at least this many logged deaths (fewer: noise, and the DB stays small).
DEATH_MIN_WRITE = 2


def move_change_obj(t):
    return {"move_before": dict(t["move_before"].most_common()), "move_changed": t["move_changed"],
            "move_changed_share": round(t["move_changed"] / t["n"], 3) if t["n"] else None,
            "changed_to": dict(t["changed_to"].most_common()), "changed_evidence": t["changed_evidence"],
            "end_move": dict(t["end_move"].most_common()), "next_move": dict(t["next_move"].most_common()),
            "changed_next": dict(t["changed_next"].most_common()), "revived": t["revived"]}


class Mechanics:
    """The observed-mechanics counters of one build (frames -> per-fight events -> per-monster tallies)."""

    def __init__(self, quiet=False):
        self.ok = True
        self.error = None
        self.quiet = quiet
        # (monster, power) -> tallies of the power stripped to 0 on our turn while the enemy lived
        self.strips = collections.defaultdict(lambda: {"n": 0, "fights": set(), "amount_before": collections.Counter(), "move_after": collections.Counter(),
                                                      "co_removed": collections.Counter(), "died_same_turn": 0, "end_unclear": 0,
                                                      "alive_end": 0, "stunned_end": 0, "attack_before": 0, "attack_cancelled": 0,
                                                      "hp_check": 0, "hp_landed": 0, "evidence": [], **move_change_tally()})
        # (monster, power) -> the class-B counters of the power lowered (still > 0) on our turn while the enemy lived (an
        # Axebot's Stock 2 -> 1 on its first revive: TQX5JJX3UD39 F37 T1, HAMMER_UPPERCUT -> BOOT_UP)
        self.lowers = collections.defaultdict(lambda: {"n": 0, "fights": set(), **move_change_tally()})
        # (survivor monster, ally monster) -> its move when such an ally dies on our turn, and the baseline beside a living one
        self.deaths = collections.defaultdict(death_tally)
        # (monster, move) -> tallies of the enemy turns after an Escape intent
        self.escapes = collections.defaultdict(lambda: {"n": 0, "gone": 0, "gone_stunned": 0, "stayed": 0, "stayed_stunned": 0, "killed_first": 0,
                                                       "killed_last_card": 0, "we_died": 0, "unclear": 0,
                                                       "next_after_stay": collections.Counter(), "gone_evidence": [], "stay_evidence": []})
        # monster -> tallies of its move turning STUNNED mid-turn, with what changed on that frame
        self.stuns = collections.defaultdict(lambda: {"n": 0, "fights": set(), "triggers": collections.Counter(), "unexplained": 0, "evidence": []})
        # rewards: monster -> status (killed / left) -> fights, and -> reward key -> fights; reward key -> fights it was in
        self.reward_fights = collections.defaultdict(collections.Counter)
        self.reward_with = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))
        self.reward_evidence = collections.defaultdict(list)
        self.reward_total = collections.Counter()
        self.rewarded_fights = 0
        self.monster_reward_fights = collections.Counter()

    def fail(self, error):
        if self.ok:
            self.ok = False
            self.error = f"{type(error).__name__}: {error}"
            if not self.quiet:
                    print(f"build-monster-db: observed-mechanics mining failed, `observed` skipped: {self.error}", file=sys.stderr)

    # -- frames (observe_combat). Only decision frames: an `observed` frame can be one taken in the enemy turn, still
    # labelled with our turn (MCK9SMSK40ZY F19 T1: block 28 -> 11 and SWIPE_POWER up after the end-turn decision).
    def frame(self, fight, turn, snap, ts, observed):
        if not self.ok or observed or not isinstance(turn, int):
            return
        try:
            mech = fight.__dict__.setdefault("_mech", {"strips": [], "lowers": [], "first": {}, "last": {}, "last_ts": {}})
            prev = mech["last"].get(turn)
            mech["first"].setdefault(turn, snap)
            mech["last"][turn] = snap
            mech["last_ts"][turn] = ts
            if prev is not None:
                self._frame(fight, turn, prev, snap, mech)
            self.death_frame(fight, turn, snap, ts)
        except Exception as error:  # noqa: BLE001 - the mining never breaks the DB build
            self.fail(error)

    @staticmethod
    def death_frame(fight, turn, snap, ts):
        """MECH_DEATH_MOVE: an enemy dying on our turn while others live, and each survivor's move just before and on that
        frame (enemies do not advance their moves on our turn, so a change there is the death's doing: the Queen's Burn
        Bright For Me -> Enrage on the frame the Torch Head Amalgam dies, 0U96U4D9Z3PP F48 T5). Kept per attempt: an SL
        reload (back to the room-entry save, turn 1, through screens the stream skips) goes on in the same fight, and its
        turn 1 against the last attempt's would read every enemy back at full HP as a new one and the old one as dead
        (7PWU4CD3QCP3 F48: four such "deaths")."""
        attempts = fight.__dict__.setdefault("_attempts", [])
        if not attempts or turn < attempts[-1]["turn"]:
            attempts.append({"turn": turn, "first": {}, "last": {}, "last_ts": {}, "deaths": []})
        att = attempts[-1]
        att["turn"] = turn
        prev = att["last"].get(turn)
        att["first"].setdefault(turn, snap)
        att["last"][turn] = snap
        att["last_ts"][turn] = ts
        if prev is None:
            return
        alive_before = {s for s, e in prev["enemies"].items() if living(e)}
        died = sorted(s for s in alive_before if s not in snap["enemies"] or not living(snap["enemies"][s]))
        if not died:
            return
        # An id back under a serial the last frame did not have (its HP up: the tracker's "came back") is no death of it.
        fresh = {e["id"] for s, e in snap["enemies"].items() if s not in prev["enemies"] and living(e)}
        died = [s for s in died if prev["enemies"][s]["id"] not in fresh]
        for serial, enemy in snap["enemies"].items():
            before = prev["enemies"].get(serial)
            if serial not in alive_before or before is None or before["id"] != enemy["id"] or not living(enemy):
                continue
            for dead in died:
                att["deaths"].append({"turn": turn, "serial": serial, "id": enemy["id"], "ally": dead, "ally_id": prev["enemies"][dead]["id"],
                                      "move_before": before["move"], "move_after": enemy["move"], "attack_before": intent_total(before["intents"]),
                                      "attack_after": intent_total(enemy["intents"]), "co": len(died)})

    def _frame(self, fight, turn, prev, snap, mech):
        alive_before = {s for s, e in prev["enemies"].items() if living(e)}
        for serial, enemy in snap["enemies"].items():
            before = prev["enemies"].get(serial)
            if before is None or before["id"] != enemy["id"] or not living(enemy):
                continue
            removed, lowered = [], []
            for pid, amount in before["powers"].items():
                if amount < 0:
                    continue
                now = enemy["powers"].get(pid)
                # Stripped: gone from the list, or a positive amount down to 0 (a flag power at 0 only by going away).
                if now is None or (amount > 0 and now <= 0):
                    removed.append((pid, amount))
                elif now < amount:
                    lowered.append(pid)
            # Revived or transformed on this frame: its max HP changed, or its HP went up (an Axebot back from 0 with more
            # max HP, a Waterfall Giant turned husk; HP does not go up on our turn otherwise).
            revived = (before.get("max_hp") != enemy.get("max_hp")) or (isinstance(enemy["hp"], int) and isinstance(before["hp"], int) and enemy["hp"] > before["hp"])
            for pid, amount in removed:
                mech["strips"].append({"turn": turn, "serial": serial, "id": enemy["id"], "pid": pid, "amount": amount,
                                       "move_before": before["move"], "move_after": enemy["move"], "attack_before": intent_total(before["intents"]),
                                       "with": [other for other, _ in removed if other != pid], "revived": revived})
            for pid in lowered:
                mech["lowers"].append({"turn": turn, "serial": serial, "id": enemy["id"], "pid": pid, "move_before": before["move"],
                                       "move_after": enemy["move"], "revived": revived})
            if enemy["move"] == STUN_MOVE and before["move"] != STUN_MOVE:
                triggers = [f"power_removed:{pid}" for pid, _ in removed] + [f"power_down:{pid}" for pid in lowered]
                if before["block"] > 0 and enemy["block"] <= 0:
                    triggers.append("block_broken")
                if any(s not in snap["enemies"] or not living(snap["enemies"][s]) for s in alive_before - {serial}):
                    triggers.append("ally_died")
                explained = bool(triggers)
                if isinstance(enemy["hp"], int) and isinstance(before["hp"], int) and enemy["hp"] < before["hp"]:
                    triggers.append("hp_lost")
                tally = self.stuns[enemy["id"]]
                tally["n"] += 1
                tally["fights"].add(fight.key)
                tally["triggers"].update(triggers)
                if not explained:
                    tally["unexplained"] += 1
                _evidence(tally["evidence"], where(fight, turn))

    # -- the reward screen after the fight
    def reward(self, fight, reward):
        if not self.ok or fight is None:
            return
        try:
            if getattr(fight, "_rewards", None) is None and isinstance(reward, dict):
                fight._rewards = sorted({reward_key(r) for r in reward.get("rewards") or [] if isinstance(r, dict)})
        except Exception as error:  # noqa: BLE001
            self.fail(error)

    # -- one fight into the tallies (Builder.commit)
    def commit(self, fight, ids_in_fight):
        if not self.ok:
            return
        try:
            self._commit(fight, ids_in_fight)
        except Exception as error:  # noqa: BLE001
            self.fail(error)

    def ended(self, fight, mech, turn):
        """Whether turn's last decision frame is where we ended the turn: its enemies were alive into the enemy turn (a
        card that killed the last enemy leaves no frame after it, so a frame before it would read as the turn's end).
        Without decisions.jsonl the last decision frame is taken as the end."""
        if END_TURNS is None:
            return True
        return (fight.run_id, mech["last_ts"].get(turn)) in END_TURNS

    def _commit(self, fight, ids_in_fight):
        mech = fight.__dict__.get("_mech")
        if mech is None:
            mech = {"strips": [], "lowers": [], "first": {}, "last": {}, "last_ts": {}}
        died = fight.outcome == "died"
        for event in mech["strips"]:
            turn, serial = event["turn"], event["serial"]
            tally = self.strips[(event["id"], event["pid"])]
            tally["n"] += 1
            tally["fights"].add(fight.key)
            tally["amount_before"][event["amount"]] += 1
            tally["move_after"][event["move_after"] or "?"] += 1
            tally["co_removed"].update(event["with"])
            # Class B (MECH_MOVE_RULES): did its move change on the strip's own frame (move_change)?
            moved = self.move_change(tally, event, fight, turn)
            last = mech["last"].get(turn)
            end = (last or {"enemies": {}})["enemies"].get(serial)
            if end is None or not living(end):
                tally["died_same_turn"] += 1
                continue
            if not self.ended(fight, mech, turn):
                # The turn's last frame is not where we ended it: a card after it ended the fight (a kill) or the frame is missing.
                tally["died_same_turn" if turn + 1 not in mech["first"] and not died else "end_unclear"] += 1
                continue
            tally["alive_end"] += 1
            stunned = end["move"] == STUN_MOVE
            tally["stunned_end"] += stunned
            self.move_after_turn(tally, event, mech, end, moved)
            if event["attack_before"] > 0:
                tally["attack_before"] += 1
                tally["attack_cancelled"] += intent_total(end["intents"]) <= 0
                # Did the attack it showed before the strip take HP on the enemy turn? Only when it was the one attacker
                # left and would have got past our block: our HP from the turn's end to the next turn's first frame. Landed:
                # at least half of what it would have taken (a Crimson Mantle's 1 HP at the turn's start is no hit:
                # XMY29WWQDC1Y F19 T5 45 -> 44, the Hopper's Escape cancelled).
                nxt = mech["first"].get(turn + 1)
                others = any(intent_total(e["intents"]) > 0 for s, e in last["enemies"].items() if s != serial and living(e))
                hp_l = last["player"]["hp"]
                hp_n = nxt["player"]["hp"] if nxt else None
                expected = event["attack_before"] - (last["player"]["block"] or 0)
                if not others and expected > 0 and isinstance(hp_l, int):
                    if isinstance(hp_n, int):
                        tally["hp_check"] += 1
                        tally["hp_landed"] += hp_l - hp_n >= expected / 2
                    elif died:
                        tally["hp_check"] += 1
                        tally["hp_landed"] += 1
            if stunned:
                _evidence(tally["evidence"], where(fight, turn))
        # Powers lowered (not to 0): the same class-B counters.
        for event in mech["lowers"]:
            turn, serial = event["turn"], event["serial"]
            tally = self.lowers[(event["id"], event["pid"])]
            tally["n"] += 1
            tally["fights"].add(fight.key)
            moved = self.move_change(tally, event, fight, turn)
            end = (mech["last"].get(turn) or {"enemies": {}})["enemies"].get(serial)
            if end is not None and living(end) and self.ended(fight, mech, turn):
                self.move_after_turn(tally, event, mech, end, moved)
        for attempt in fight.__dict__.get("_attempts") or []:
            self.commit_deaths(fight, attempt)
        # Escape intents (at the turn's first decision frame): is it still there at the next turn's first frame?
        left_ids = set()
        for turn in sorted(mech["first"]):
            for serial, enemy in mech["first"][turn]["enemies"].items():
                if not living(enemy) or not any(i.get("intent_type") == "Escape" for i in enemy["intents"]):
                    continue
                tally = self.escapes[(enemy["id"], enemy["move"])]
                tally["n"] += 1
                end = (mech["last"].get(turn) or {"enemies": {}})["enemies"].get(serial)
                if end is None or not living(end):
                    tally["killed_first"] += 1
                    continue
                nxt = mech["first"].get(turn + 1)
                if not self.ended(fight, mech, turn):
                    # No end-turn decision on its last frame: a card after it won the fight (the kill leaves no frame), or unclear.
                    tally["killed_last_card" if nxt is None and fight.outcome == "won" else "unclear"] += 1
                    continue
                if nxt is not None:
                    after = nxt["enemies"].get(serial)
                    if after is not None and after["id"] == enemy["id"] and living(after):
                        tally["stayed"] += 1
                        tally["stayed_stunned"] += end["move"] == STUN_MOVE
                        tally["next_after_stay"][after["move"] or "?"] += 1
                        _evidence(tally["stay_evidence"], where(fight, turn))
                        continue
                elif died:
                    tally["we_died"] += 1
                    continue
                tally["gone"] += 1
                tally["gone_stunned"] += end["move"] == STUN_MOVE
                left_ids.add(enemy["id"])
                _evidence(tally["gone_evidence"], where(fight, turn))
        # Rewards: which monsters of a won fight were killed and which left.
        rewards = getattr(fight, "_rewards", None)
        if rewards is None or fight.outcome != "won":
            return
        self.rewarded_fights += 1
        self.reward_total.update(rewards)
        for eid in ids_in_fight:
            status = "left" if eid in left_ids else "killed"
            self.monster_reward_fights[eid] += 1
            self.reward_fights[eid][status] += 1
            for key in rewards:
                self.reward_with[eid][status][key] += 1
                if status == "killed":
                    _evidence(self.reward_evidence[(eid, key)], f"{fight.run_id} F{fight.floor}")

    def commit_deaths(self, fight, mech):
        """MECH_DEATH_MOVE: one attempt's ally deaths (death_frame) into the (survivor, ally) tallies, and its baseline turns."""
        for event in mech["deaths"]:
            turn, serial = event["turn"], event["serial"]
            t = self.deaths[(event["id"], event["ally_id"])]
            t["n"] += 1
            t["fights"].add(fight.key)
            before = event["move_before"] or "?"
            t["move_before"][before] += 1
            by = t["by_move"][before]
            by["n"] += 1
            if event["move_before"] and event["move_after"] and event["move_after"] != event["move_before"]:
                t["move_changed"] += 1
                t["changed_to"][event["move_after"]] += 1
                by["changed_to"][event["move_after"]] += 1
                _evidence(t["changed_evidence"], where(fight, turn))
            t["attack_changed"] += event["attack_after"] != event["attack_before"]
            t["co_deaths"] += event["co"] > 1
            end = (mech["last"].get(turn) or {"enemies": {}})["enemies"].get(serial)
            if end is None or not living(end) or end["id"] != event["id"] or not self.ended(fight, mech, turn):
                continue
            t["end_move"][end["move"] or "?"] += 1
            following = (mech["first"].get(turn + 1) or {"enemies": {}})["enemies"].get(serial)
            if following is None or following["id"] != event["id"] or not living(following):
                continue
            t["next_n"] += 1
            t["next_move"][following["move"] or "?"] += 1
            t["next_after"][end["move"] or "?"][following["move"] or "?"] += 1
            _evidence(t["next_evidence"], where(fight, turn))
        # The baseline: each turn a survivor started beside a living ally (another enemy, any id), its move then; and when
        # that ally (every one of its id) still lived at the turn's end and on the next turn's first frame, the move after.
        # And the turns it started after such an ally died on an earlier turn of the attempt, none of that id alive: its moves.
        died_at = {}
        for event in mech["deaths"]:
            died_at[event["ally_id"]] = min(died_at.get(event["ally_id"], event["turn"]), event["turn"])
        for turn in sorted(mech["first"]):
            first = mech["first"][turn]
            last = mech["last"].get(turn) or {"enemies": {}}
            nxt = mech["first"].get(turn + 1) if self.ended(fight, mech, turn) else None
            for serial, enemy in first["enemies"].items():
                if not living(enemy) or not enemy["move"]:
                    continue
                allies = {}
                for other, ally in first["enemies"].items():
                    if other != serial and living(ally):
                        allies.setdefault(ally["id"], set()).add(other)
                following = (nxt or {"enemies": {}})["enemies"].get(serial)
                for ally_id, since in died_at.items():
                    if since < turn and ally_id not in allies:
                        t = self.deaths[(enemy["id"], ally_id)]
                        t["dead_turns"] += 1
                        t["dead_moves"][enemy["move"]] += 1
                for ally_id, serials in allies.items():
                    t = self.deaths[(enemy["id"], ally_id)]
                    t["alive_turns"] += 1
                    t["alive_moves"][enemy["move"]] += 1
                    lived = all(s in last["enemies"] and living(last["enemies"][s]) and nxt is not None and s in nxt["enemies"] and living(nxt["enemies"][s])
                                for s in serials)
                    if lived and following is not None and following["id"] == enemy["id"] and living(following) and following["move"]:
                        t["alive_next"][enemy["move"]][following["move"]] += 1

    @staticmethod
    def move_change(tally, event, fight, turn):
        """Class B (MECH_MOVE_RULES): the move on the event's own frame against the one just before it. Enemies do not
        advance their moves during our turn, so a change on that frame is the event's doing, or the one behind it (an
        Axebot's Stock taken on its revive: HAMMER_UPPERCUT -> BOOT_UP, TQX5JJX3UD39 F37 T5). Returns whether it changed."""
        moved = bool(event["move_before"] and event["move_after"] and event["move_after"] != event["move_before"])
        tally["move_before"][event["move_before"] or "?"] += 1
        tally["revived"] += bool(event.get("revived"))
        if moved:
            tally["move_changed"] += 1
            tally["changed_to"][event["move_after"]] += 1
            _evidence(tally["changed_evidence"], where(fight, turn))
        return moved

    @staticmethod
    def move_after_turn(tally, event, mech, end, moved):
        """... and what it shows at our turn's end (`end`, the end-turn frame) and on the next turn's first frame."""
        tally["end_move"][end["move"] or "?"] += 1
        following = (mech["first"].get(event["turn"] + 1) or {"enemies": {}})["enemies"].get(event["serial"])
        if following is not None and following["id"] == event["id"] and living(following):
            tally["next_move"][following["move"] or "?"] += 1
            if moved:
                tally["changed_next"][following["move"] or "?"] += 1

    # -- output
    def monster(self, eid):
        """The `observed` entry of one monster, or None when it has nothing notable."""
        out = {}
        strips = {pid: self.strip_obj(tally) for (mid, pid), tally in sorted(self.strips.items()) if mid == eid}
        if strips:
            out["powers_stripped"] = strips
        lowers = {pid: {"n": t["n"], "fights": len(t["fights"]), **move_change_obj(t)} for (mid, pid), t in sorted(self.lowers.items()) if mid == eid}
        if lowers:
            out["powers_lowered"] = lowers
        escapes = {}
        for (mid, move), t in sorted(self.escapes.items(), key=lambda kv: (kv[0][0], str(kv[0][1]))):
            if mid != eid:
                continue
            settled = t["gone"] + t["stayed"]
            escapes[move or "?"] = {"n": t["n"], "gone": t["gone"], "gone_stunned": t["gone_stunned"], "stayed": t["stayed"], "stayed_stunned": t["stayed_stunned"],
                                    "killed_first": t["killed_first"], "killed_last_card": t["killed_last_card"], "we_died": t["we_died"], "unclear": t["unclear"],
                                    "gone_share": round(t["gone"] / settled, 3) if settled else None,
                                    "next_after_stay": dict(t["next_after_stay"].most_common()),
                                    "evidence_gone": t["gone_evidence"], "evidence_stayed": t["stay_evidence"]}
        if escapes:
            out["escape_moves"] = escapes
        rewards = self.rewards_of(eid)
        if rewards:
            out["kill_rewards"] = rewards
        deaths = {ally: death_obj(t) for (mid, ally), t in sorted(self.deaths.items()) if mid == eid and t["n"] >= DEATH_MIN_WRITE}
        if deaths:
            out["ally_deaths"] = deaths
        stun = self.stuns.get(eid)
        if stun and stun["n"]:
            out["mid_turn_stuns"] = {"n": stun["n"], "fights": len(stun["fights"]), "triggers": dict(stun["triggers"].most_common()),
                                     "unexplained": stun["unexplained"], "evidence": stun["evidence"]}
        return out or None

    @staticmethod
    def strip_obj(t):
        stunned = t["move_after"].get(STUN_MOVE, 0)
        return {"n": t["n"], "fights": len(t["fights"]) if isinstance(t["fights"], set) else t["fights"],
                "amount_before": counter_obj(t["amount_before"]), "move_after": dict(t["move_after"].most_common()),
                "stunned_share": round(stunned / t["n"], 3) if t["n"] else None,
                # Other powers gone on the same frame (the Matriarch's Plating with its Asleep): a strip always paired
                # with another may be that one's doing.
                "co_removed": dict(t["co_removed"].most_common()),
                "died_same_turn": t["died_same_turn"], "turn_end_unclear": t["end_unclear"],
                "alive_at_turn_end": t["alive_end"], "stunned_at_turn_end": t["stunned_end"],
                "attack_before": t["attack_before"], "attack_cancelled": t["attack_cancelled"],
                "hp_check": {"n": t["hp_check"], "landed": t["hp_landed"]}, "evidence": t["evidence"],
                **move_change_obj(t)}

    def rewards_of(self, eid):
        """Reward items that come with killing this monster: on the kill fights' reward screens and never when it left,
        or (it never left) rare in the fights without it."""
        fights = self.reward_fights.get(eid)
        if not fights:
            return []
        killed, left = fights["killed"], fights["left"]
        without = self.rewarded_fights - self.monster_reward_fights[eid]
        out = []
        for key, total in sorted(self.reward_total.items()):
            if total < REWARD_MIN_N:
                continue
            with_killed = self.reward_with[eid]["killed"][key]
            with_left = self.reward_with[eid]["left"][key]
            elsewhere = total - with_killed - with_left
            if not killed or with_killed / killed < REWARD_KILLED_SHARE:
                continue
            exclusive = without > 0 and elsewhere / without <= REWARD_ELSEWHERE_SHARE
            only_killed = left >= 1 and with_left == 0
            if not (exclusive or only_killed):
                continue
            out.append({"reward": key, "killed": [with_killed, killed], "left": [with_left, left], "elsewhere": [elsewhere, without],
                        "only_when_killed": only_killed, "exclusive": exclusive, "evidence": self.reward_evidence[(eid, key)]})
        return out

    def pooled(self):
        """Top-level `observed`: each stripped power over every monster that carried it (the rule is the power's)."""
        powers = {}
        for (eid, pid), t in self.strips.items():
            pool = powers.setdefault(pid, {"n": 0, "fights": 0, "amount_before": collections.Counter(), "move_after": collections.Counter(),
                                          "co_removed": collections.Counter(), "died_same_turn": 0, "end_unclear": 0, "alive_end": 0, "stunned_end": 0, "attack_before": 0, "attack_cancelled": 0,
                                          "hp_check": 0, "hp_landed": 0, "evidence": [], "monsters": collections.Counter(), **move_change_tally()})
            for key in ("n", "died_same_turn", "end_unclear", "alive_end", "stunned_end", "attack_before", "attack_cancelled", "hp_check", "hp_landed", "move_changed", "revived"):
                pool[key] += t[key]
            pool["fights"] += len(t["fights"])
            for key in ("amount_before", "move_after", "co_removed", "move_before", "changed_to", "end_move", "next_move", "changed_next"):
                pool[key].update(t[key])
            pool["monsters"][eid] += t["n"]
            for item in t["evidence"]:
                _evidence(pool["evidence"], item)
            for item in t["changed_evidence"]:
                _evidence(pool["changed_evidence"], item)
        out = {}
        for pid in sorted(powers):
            pool = powers[pid]
            out[pid] = {**self.strip_obj(pool), "monsters": dict(pool["monsters"].most_common())}
        return {"powers_stripped": out}


MECHANICS = Mechanics()

OBSERVED_NOTE = (
    "Mined from the logged frames (build-monster-db.py, observed mechanics; docs/mechanics-learning.md). Decision frames only (an "
    "`observed` frame can be one taken in the enemy turn). powers_stripped: an enemy power going from present (amount >= 0) to gone, "
    "or from > 0 to <= 0, between two decision frames of our turn while the enemy lives; move_after = its move on the frame right "
    "after (STUNNED = stunned), stunned_share = STUNNED / n, co_removed = other powers gone on that same frame; alive_at_turn_end / stunned_at_turn_end / attack_before / "
    "attack_cancelled: of the strips whose enemy lived to the turn's end-turn decision, the ones still STUNNED there, the ones "
    "that showed an attack before the strip and showed none at the turn's end; hp_check: the ones where it was the only attacker "
    "and its attack would have got past our block, and those in which we lost at least half of that over the enemy turn (landed); "
    "move_before = its move on the frame before the strip, move_changed / changed_to = the strips whose own frame shows another move "
    "(STUNNED included) and which, end_move / next_move = its move at our turn's end-turn decision and at the next turn's first frame "
    "(changed_next: of the changed ones), revived = the ones whose frame shows its max HP changed or its HP up (a revive, a husk). "
    "powers_lowered (per monster): the same move counters for a power down but still > 0. escape_moves: the turns "
    "an enemy showed an Escape intent at our turn's start: gone = alive when we ended the turn and not on the next turn's first "
    "frame (or the fight over), stayed = still there (*_stunned: STUNNED at our turn's end), killed_first / killed_last_card = "
    "killed on our turn (seen dead, or the fight won on a card after the turn's last frame). kill_rewards: reward "
    "screen items (numbers as N) on at least half of the won fights in which the monster was killed and on none in which it "
    "left (only_when_killed), or on at most 2% of the fights without it (exclusive). mid_turn_stuns: its move turning STUNNED "
    "between two decision frames, with what changed on that frame (powers removed / down, block broken, an ally died, HP lost). "
    "ally_deaths (per monster, by the dying ally's id; pairs with at least 2 deaths): an ally dying between two decision frames of our "
    "turn while this monster lives: move_before / by_move = its move on the frame before and, by it, the move on the death's own frame "
    "(move_changed / changed_to), attack_changed = its intent total changed on that frame, co_deaths = other enemies died on the same "
    "frame; end_move = its move at our end-turn decision, next_n / next_move = the ones alive on the next turn's first frame and that "
    "move, next_after = the same by the end move; alive = the baseline: the turns it started beside a living ally of that id (turns, "
    "the moves it showed) and, by the move, the move on the next turn's first frame when every such ally still lived then (only for "
    "the moves in next_after); dead = the turns it started after such an ally died earlier in the attempt with none of that id "
    "alive (turns, the moves it showed). Kept per SL attempt (a reload starts again at turn 1). The top-level powers_stripped "
    "pools every monster carrying the power."
)


# ---------------------------------------------------------------- output


def dist(values):
    values = [v for v in values if isinstance(v, (int, float))]
    if not values:
        return None
    values = sorted(values)
    return {"min": values[0], "median": statistics.median(values), "max": values[-1], "n": len(values)}


def pct(values, q):
    values = sorted(v for v in values if isinstance(v, (int, float)))
    if not values:
        return None
    pos = (len(values) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(values) - 1)
    return round(values[lo] + (values[hi] - values[lo]) * (pos - lo), 1)


def counter_obj(counter):
    """Counter -> {value: n} with keys sorted numerically when they are numbers."""
    def sort_key(item):
        k = item[0]
        return (0, k) if isinstance(k, (int, float)) else (1, str(k))
    return {str(k): v for k, v in sorted(counter.items(), key=sort_key)}


def by_asc_obj(table):
    """asc -> pid -> Counter -> {"asc": {pid: {value: n}}}, ascensions in numeric order ("?" last)."""
    return {str(asc): {pid: counter_obj(c) for pid, c in sorted(pids.items())}
            for asc, pids in sorted(table.items(), key=lambda kv: (isinstance(kv[0], str), kv[0]))}


def fill_description(text, amount):
    if not text:
        return text
    if amount is not None:
        text = text.replace("{Amount}", str(amount))
    return text


def game_move_name(game_monster, move_id):
    if not game_monster or not move_id:
        return None
    wanted = move_id[:-5] if move_id.endswith("_MOVE") else move_id
    for move in game_monster.get("moves") or []:
        if move.get("id") in (wanted, move_id):
            return move.get("name")
    return None


def threat_obj(results):
    known = [r for r in results if r["outcome"] in ("won", "died")]
    won = [r for r in known if r["outcome"] == "won"]
    losses = [r["loss"] for r in won if r["loss"] is not None]
    nets = [r["net_loss"] for r in won if r["net_loss"] is not None]
    deaths = sorted({r["run"] for r in known if r["outcome"] == "died"})
    turns = [r["turns"] for r in won if r["turns"]]
    return {
        "fights": len(results),
        "n_outcome_known": len(known),
        "win_rate": round(len(won) / len(known), 3) if known else None,
        "hp_loss_won": {"median": pct(losses, 0.5), "p75": pct(losses, 0.75), "n": len(losses)},
        "net_hp_loss_won": {"median": pct(nets, 0.5), "p75": pct(nets, 0.75), "n": len(nets)},
        "turns_won": {"median": pct(turns, 0.5), "p75": pct(turns, 0.75), "n": len(turns)},
        "deaths": len(deaths),
        "death_runs": deaths,
    }


def build_output(builder, game):
    per_monster, pooled = observed_output(sorted(builder.monsters))
    monsters_game = {m["id"]: m for m in game.get("monsters") or []}
    powers_game = {p["id"]: p for p in game.get("powers") or []}
    out = {}
    for eid in sorted(builder.monsters):
        mon = builder.monsters[eid]
        if not mon["instances"]:
            continue
        gm = monsters_game.get(eid)
        kinds = mon["rooms"]
        kind = kinds.most_common(1)[0][0] if kinds else None
        if mon["minion_instances"] * 2 > mon["instances"]:
            kind = "minion"
        moves = {}
        for move_id, move in sorted(mon["moves"].items()):
            by_asc = {}
            # A move never shown on a clean turn at any ascension (every turn under our Vulnerable: You Are Mine's 99 in the
            # Queen's fight) takes its base from the Vulnerable-only turns, marked so (base_from).
            under_vulnerable = not any(sum(c.values()) for c in move["base"].values()) and any(sum(c.values()) for c in move["vbase"].values())
            bases = move["vbase"] if under_vulnerable else move["base"]
            for akey in sorted(set(move["shown"]) | set(bases), key=lambda a: (isinstance(a, str), a)):
                base_counter = bases.get(akey, collections.Counter())
                by_asc[str(akey)] = {
                    "shown": counter_obj(move["shown"].get(akey, collections.Counter())),
                    "base_per_hit": counter_obj(base_counter),
                    "hits": counter_obj(move["hits"].get(akey, collections.Counter())),
                    "n_base": sum(base_counter.values()),
                    **({"base_from": "vulnerable"} if under_vulnerable and base_counter else {}),
                }
            entry = {
                "name": game_move_name(gm, move_id),
                "n_seen": move["n"],
                "intents": dict(move["intents"].most_common()),
                "turns_seen": counter_obj(move["turns"]),
                "next": dict(move["next"].most_common()),
                "avg_total_shown": round(sum(move["totals"]) / len(move["totals"]), 1) if move["totals"] else None,
            }
            if by_asc:
                entry["damage_by_asc"] = by_asc
            # Back-attack enemies: how many of the logged turns it came from behind (x1.5) or from in front,
            # judged against the base at that ascension.
            back = {}
            for akey, frames in sorted(move["back_frames"].items(), key=lambda kv: (isinstance(kv[0], str), kv[0])):
                base_counter = move["base"].get(akey)
                if not base_counter:
                    continue
                base = base_counter.most_common(1)[0][0]
                behind = sum(1 for dmg, st in frames if dmg == int((base + st) * 1.5) and dmg != base + st)
                facing = sum(1 for dmg, st in frames if dmg == base + st)
                if behind + facing > 0:
                    back[str(akey)] = {"behind": behind, "facing": facing}
            if back:
                entry["back_attack_by_asc"] = back
            if move["block"]:
                entry["block_gained"] = counter_obj(move["block"])
                entry["block_gained_by_asc"] = {str(asc): counter_obj(c) for asc, c in sorted(move["block_by_asc"].items(), key=lambda kv: (isinstance(kv[0], str), kv[0]))}
            if move["self"]:
                entry["self_powers_gained"] = {pid: counter_obj(c) for pid, c in sorted(move["self"].items())}
                entry["self_powers_gained_by_asc"] = by_asc_obj(move["self_by_asc"])
            if move["player"]:
                entry["player_powers_applied"] = {pid: counter_obj(c) for pid, c in sorted(move["player"].items())}
                entry["player_powers_applied_by_asc"] = by_asc_obj(move["player_by_asc"])
            if move["status_cards"]:
                entry["status_cards"] = counter_obj(move["status_cards"])
            if move["status_ids"]:
                entry["status_card_ids"] = counter_obj(move["status_ids"])
                entry["status_card_pile"] = counter_obj(move["status_pile"])
            if move["heal_by_asc"]:
                entry["heal_by_asc"] = {str(asc): counter_obj(c) for asc, c in sorted(move["heal_by_asc"].items(), key=lambda kv: (isinstance(kv[0], str), kv[0]))}
            moves[move_id] = entry
        powers = {}
        for pid, power in sorted(mon["powers"].items()):
            gp = powers_game.get(pid) or {}
            common = power["start"].most_common(1)[0][0] if power["start"] else None
            powers[pid] = {
                "name": gp.get("name"),
                "type": gp.get("type"),
                "description": fill_description(gp.get("description"), common),
                "n_fights": power["fights"],
                "amount_at_first_sight": counter_obj(power["start"]),
                "amount_max_in_fight": counter_obj(power["max"]),
                "amount_at_first_sight_by_asc": {str(asc): counter_obj(c) for asc, c in sorted(power["start_by_asc"].items())},
                "turn_at_first_sight_by_asc": {str(asc): counter_obj(c) for asc, c in sorted(power["turn_by_asc"].items())},
            }
        hp = {}
        for asc in sorted(mon["hp"]):
            d = dist(mon["hp"][asc])
            if d:
                hp[str(asc)] = d
        entry = {
            "name": {"zh": (gm or {}).get("name")},
            "game_type": (gm or {}).get("type"),
            "game_hp_range": [gm.get("min_hp"), gm.get("max_hp")] if gm else None,
            "kind": kind,
            "rooms": dict(kinds.most_common()),
            "acts": {str(a): n for a, n in sorted(mon["acts"].items())},
            "encounters": dict(mon["encounters"].most_common()),
            "hp_by_asc": hp,
            "moves": moves,
            "powers": powers,
            "threat_by_asc": {str(asc): threat_obj(mon["threat"][asc]) for asc in sorted(mon["threat"])},
            "provenance": {"first_seen": mon["first"], "last_seen": mon["last"], "n_runs": len(mon["runs"]),
                           "n_instances": mon["instances"], "n_spawned_mid_fight": mon["spawned"],
                           "n_minion_instances": mon["minion_instances"]},
        }
        if mon["phases"]:
            entry["phases_by_asc"] = {str(asc): {" > ".join(map(str, k)): n for k, n in c.most_common()} for asc, c in sorted(mon["phases"].items())}
        if per_monster.get(eid):
            entry["observed"] = per_monster[eid]
        out[eid] = entry
    bosses = {}
    for boss_key in sorted(builder.bosses):
        by_asc = {}
        for asc in sorted(builder.bosses[boss_key]):
            fights = builder.bosses[boss_key][asc]
            part_hp = collections.defaultdict(list)
            phase_seqs = collections.Counter()
            for f in fights:
                for pid, insts in f["parts"].items():
                    for inst in insts:
                        if inst["hp"] and not inst["spawned"]:
                            part_hp[pid].append(inst["hp"][0])
                        if len(inst["hp"]) > 1:
                            phase_seqs[(pid,) + tuple(inst["hp"])] += 1
            known = [f for f in fights if f["outcome"] in ("won", "died")]
            per_turn = [f["loss"] / f["turns"] for f in known if f["loss"] is not None and f["turns"]]
            won = [f for f in known if f["outcome"] == "won"]
            by_asc[str(asc)] = {
                "fights": len(fights),
                "parts": {pid: {**dist(v), "count_per_fight": round(len(v) / len(fights), 2)} for pid, v in sorted(part_hp.items())},
                "phases": {" > ".join(map(str, k[1:])) + f" ({k[0]})": n for k, n in phase_seqs.most_common()},
                "start_hp_total": dist([f["start_hp"] for f in fights]),
                "encounters": dict(collections.Counter(f["encounter"] for f in fights).most_common()),
                "turns_won": {"median": pct([f["turns"] for f in won], 0.5), "p75": pct([f["turns"] for f in won], 0.75), "n": len(won)},
                "hp_loss_per_turn": {"median": pct(per_turn, 0.5), "p75": pct(per_turn, 0.75), "n": len(per_turn)},
                "win_rate": round(len(won) / len(known), 3) if known else None,
                "n_outcome_known": len(known),
                "death_runs": sorted({f["run"] for f in known if f["outcome"] == "died"}),
                "hp_loss_won": {"median": pct([f["loss"] for f in won if f["loss"] is not None], 0.5),
                                "p75": pct([f["loss"] for f in won if f["loss"] is not None], 0.75), "n": len(won)},
            }
        bosses[boss_key] = by_asc
    encounters = {}
    for key in sorted(builder.encounters):
        by_asc = {}
        for asc in sorted(builder.encounters[key]):
            fights = builder.encounters[key][asc]
            by_asc[str(asc)] = {**threat_obj(fights), "start_hp_total": dist([f["start_hp"] for f in fights]),
                                "hp_total_incl_spawned": dist([f["all_hp"] for f in fights])}
        rooms = collections.Counter(f["kind"] for fs in builder.encounters[key].values() for f in fs if f["kind"])
        acts = collections.Counter(f["act"] for fs in builder.encounters[key].values() for f in fs if f["act"])
        encounters[key] = {"rooms": dict(rooms.most_common()), "acts": {str(a): n for a, n in sorted(acts.items())}, "by_asc": by_asc}
    meta = {
        "note": "Generated by tools/build-monster-db.py from logs/states.jsonl and runs.jsonl. DATA ONLY: not read by the player code. "
                "n / n_seen on every number; an ascension that was not logged is absent. hp_by_asc = the first max_hp of each instance (phase 1 for "
                "multi-phase enemies; see phases_by_asc). damage_by_asc.shown = intent as displayed at the first logged state of the turn ('dmg x hits', "
                "after Strength, Weak, Vulnerable); base_per_hit = shown - enemy Strength, only from turns without enemy Weak/Shrink or our "
                "Vulnerable/Intangible. self_powers_gained/player_powers_applied/block_gained = power and block deltas across the enemy turn after a "
                "move with a Buff/Debuff/Defend intent (other effects of that enemy turn can leak in); *_by_asc = the same split by ascension. "
                "heal_by_asc = a Heal move's HP gain across its enemy turn (less near max HP). status_card_ids / status_card_pile = the status "
                "cards a StatusCard move added to our piles over its enemy turn and the pile they landed in (turns with one such move). "
                "powers.amount_at_first_sight_by_asc / turn_at_first_sight_by_asc = each instance's first logged amount and the turn it was on. "
                "Surrounded (Kaiser Crab): a back-attack enemy's frame is a base sample only when its turn also showed the other facing's "
                "number (behind = floor((base + Strength) x 1.5)); back_attack_by_asc counts the turns it came from behind or in front. threat: hp_loss_won = entry HP - HP on the last "
                "combat state (includes self-damage cards), net_hp_loss_won = entry HP - HP after the fight (after Burning Blood and other end-of-combat "
                "heals). kind from the map node of the fight (Monster=hallway, Elite, Boss, Unknown=event), minion when MINION_POWER is on most instances.",
        "generated_from": {"fights": builder.fights, "first_seen": builder.first_ts, "last_seen": builder.last_ts,
                           "fights_by_asc": {str(k): v for k, v in sorted(builder.asc_seen.items())}},
    }
    result = {"meta": meta, "bosses": bosses, "encounters": encounters, "monsters": out}
    if pooled is not None:
        result["observed"] = pooled
    return result


def observed_output(ids):
    """({monster: its `observed` entry}, the top-level `observed` block), or ({}, None) when the mining failed anywhere:
    then no `observed` field is written at all, and the rest of the DB is as before."""
    if not MECHANICS.ok:
        return {}, None
    try:
        per_monster = {eid: MECHANICS.monster(eid) for eid in ids}
        pooled = {"note": OBSERVED_NOTE, "end_turn_check": END_TURNS is not None, **MECHANICS.pooled()}
        return {eid: entry for eid, entry in per_monster.items() if entry}, pooled
    except Exception as error:  # noqa: BLE001 - the mining never breaks the DB build
        MECHANICS.fail(error)
        return {}, None


def move_model_view(db):
    """The DB's moves in move-model.json's format ({id: {next, damage, buffs?}})."""
    model = {}
    for eid, mon in db["monsters"].items():
        entry = {"next": {}, "damage": {}}
        buffs = []
        for move_id, move in mon["moves"].items():
            if move["next"]:
                entry["next"][move_id] = move["next"]
            if move["avg_total_shown"] is not None:
                entry["damage"][move_id] = move["avg_total_shown"]
            if any("Buff" in k.split("+") for k in move["intents"]):
                buffs.append(move_id)
        if buffs:
            entry["buffs"] = sorted(buffs)
        model[eid] = entry
    return model


GAME_TYPES = {}
GAME_POWER_TYPES = {}
STATUS_CARDS = set()
DRAINED = {"STRENGTH_POWER", "DEXTERITY_POWER", "FOCUS_POWER"}
# Powers that give or take Strength/Dexterity until the end of the turn ("在本回合结束前"): their expiry is
# not the enemy move's doing.
TEMPORARY_POWERS = set()


# Boss key -> the enemy ids of its bodies (as knowledge/builders/build-boss-damage.py; a boss whose only body has the
# boss's own id needs no entry).
BOSS_BODIES = {
    "KAISER_CRAB": ["CRUSHER", "ROCKET"],
    "QUEEN": ["QUEEN", "TORCH_HEAD_AMALGAM"],
    "THE_KIN": ["KIN_PRIEST", "KIN_FOLLOWER"],
}
BOSS_OF_BODY = {body: boss for boss, bodies in BOSS_BODIES.items() for body in bodies}


def boss_key_of(boss_id, ids):
    """The boss a boss fight is filed under: run.boss_id when one of its bodies is on the board; else the
    boss the bodies on the board belong to; else the enemy ids joined. run.boss_id alone is not trusted:
    at A10 it may still name the first act-3 boss during the second, whose fights would then land in the
    first's entry and break its HP, damage and win rate."""
    ids = set(ids)
    named = (boss_id or "").upper().replace("_BOSS", "")
    if named:
        bodies = BOSS_BODIES.get(named, [named])
        if any(i == body or i.startswith(body + "_") for i in ids for body in bodies):
            return named
    owners = {BOSS_OF_BODY.get(i, i) for i in ids if i in BOSS_OF_BODY or GAME_TYPES.get(i) == "Boss"}
    if len(owners) == 1:
        return owners.pop()
    return "+".join(sorted(ids))


def load_runs(path):
    runs = {}
    if path and os.path.exists(path):
        for line in open(path, encoding="utf8"):
            try:
                row = json.loads(line)
            except ValueError:
                continue
            if row.get("run_id"):
                runs[row["run_id"]] = row
    return runs


def build(states, runs_path, game_path, decisions_path=None):
    global MECHANICS, END_TURNS
    MECHANICS = Mechanics()
    try:
        END_TURNS = load_end_turns(decisions_path)
    except Exception as error:  # noqa: BLE001 - the mining never breaks the DB build
        END_TURNS = None
        MECHANICS.fail(error)
    game = {}
    if game_path and os.path.exists(game_path):
        raw = json.load(open(game_path, encoding="utf8"))
        game = raw.get("collections", raw)
    GAME_TYPES.clear()
    GAME_TYPES.update({m["id"]: m.get("type") for m in game.get("monsters") or []})
    GAME_POWER_TYPES.clear()
    GAME_POWER_TYPES.update({p["id"]: p.get("type") for p in game.get("powers") or []})
    TEMPORARY_POWERS.clear()
    TEMPORARY_POWERS.update(p["id"] for p in game.get("powers") or [] if "本回合结束前" in (p.get("description") or ""))
    STATUS_CARDS.clear()
    STATUS_CARDS.update(c["id"] for c in game.get("cards") or [] if c.get("type") == "Status")
    builder = Builder(load_runs(runs_path))
    for screen, entry in iter_entries(states):
        builder.feed(screen, entry)
    builder.finish()
    return build_output(builder, game)


def main(argv=None):
    logs = _default_logs()
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--states", default=os.path.join(logs, "states.jsonl"))
    parser.add_argument("--runs", default=os.path.join(logs, "runs.jsonl"))
    # The end-turn decisions (observed mechanics: which turn ends were real ends); optional.
    parser.add_argument("--decisions", default=os.path.join(logs, "decisions.jsonl"))
    parser.add_argument("--game-data", default=os.path.join(ROOT, "data/game-data.json"))
    parser.add_argument("--out", default=os.path.join(ROOT, "knowledge/common/monster-db.json"))
    parser.add_argument("--move-model-out", default=None)
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    start = time.time()
    db = build(args.states, args.runs, args.game_data, args.decisions)
    # The tmp name is this process's: ops/report.py and ops/wait-run.sh both refresh after a run, at once, and with
    # one shared "monster-db.json.tmp" the second rename failed (ops/refresh.log, FileNotFoundError) after both had
    # written into the same file.
    tmp = f"{args.out}.{os.getpid()}.tmp"
    with open(tmp, "w", encoding="utf8") as handle:
        json.dump(db, handle, ensure_ascii=False, indent=1, sort_keys=False)
        handle.write("\n")
    os.replace(tmp, args.out)
    if args.move_model_out:
        tmp = f"{args.move_model_out}.{os.getpid()}.tmp"
        with open(tmp, "w", encoding="utf8") as handle:
            json.dump(move_model_view(db), handle, ensure_ascii=False, indent=1, sort_keys=True)
        os.replace(tmp, args.move_model_out)
    if not args.quiet:
        meta = db["meta"]["generated_from"]
        print(f"{len(db['monsters'])} monsters, {len(db['bosses'])} bosses, {meta['fights']} fights "
              f"(by ascension {meta['fights_by_asc']}) in {time.time() - start:.1f}s -> {args.out}")
    return 0


# ---------------------------------------------------------------- self-test


def _synthetic_lines(end_turns=None):
    """A two-fight run: a hallway fight won at A8, then an elite fight we die in. Then more runs, one per feature below.
    `end_turns` gets the (run, ts) of the frames marked as end-turn decisions (the decisions.jsonl rows)."""
    def state(screen, run_id, turn, floor, hp, enemies=None, in_combat=False, map_=None, game_over=None, player_powers=None, piles=None, hand=None,
              block=0, reward=None, observed=False, end_turn=False):
        run = {"ascension": 8, "act_id": "0", "floor": floor, "current_hp": hp, "max_hp": 80, "boss_id": "VANTOM_BOSS",
               "relics": [{"relic_id": "BURNING_BLOOD"}]}
        combat = None
        if enemies is not None:
            combat = {"player": {"current_hp": hp, "block": block, "powers": player_powers or []}, "enemies": enemies, "hand": [{"card_id": c} for c in hand or []]}
        ts = f"2026-09-28T00:00:{len(lines):02d}Z"
        if end_turn and end_turns is not None:
            end_turns.append((run_id, ts))
        view = {"big": "x" * 10}
        if piles is not None:
            line = lambda card_id, n: {"line": f"{card_id}{'*' + str(n) if n > 1 else ''} [1费]：…", "card_ids": [card_id], "keywords": [], "mods": []}
            view = {"combat": {"hand": [], **{name: [line(c, n) for c, n in piles.get(name, {}).items()] for name in ("draw", "discard", "exhaust")}, "enemies": []}}
        s = {"run_id": run_id, "screen": screen, "turn": turn, "in_combat": in_combat, "combat": combat, "run": run,
             "map": map_, "game_over": game_over, "reward": reward, "agent_view": view}
        return json.dumps({"ts": ts, **({"observed": True} if observed else {}), "fingerprint": "{\"screen\":\"X\"}", "screen": screen, "state": s},
                          separators=(",", ":"), ensure_ascii=False)

    def enemy(index, eid, hp, max_hp, move, dmg=None, hits=None, powers=None, block=0, types=("Attack",), status_cards=None):
        intents = []
        for t in types:
            intents.append({"intent_type": t, "damage": dmg if t == "Attack" else None, "hits": hits if t == "Attack" else None,
                            **({"status_card_count": status_cards} if t == "StatusCard" else {})})
        return {"index": index, "enemy_id": eid, "current_hp": hp, "max_hp": max_hp, "block": block, "is_alive": hp > 0,
                "powers": [{"power_id": p, "amount": a} for p, a in (powers or {}).items()], "move_id": move, "intents": intents}

    node_map = lambda row, col, t: {"current_node": {"row": row, "col": col}, "nodes": [{"row": row, "col": col, "node_type": t}]}
    lines = []
    lines.append(state("MAP", "R1", None, 1, 80))
    # Fight 1, floor 2: a slime with 2 Strength shows 8 (base 6), then Buff (+3 Strength), then 11.
    lines.append(state("COMBAT", "R1", 1, 2, 80, [enemy(0, "SLIME", 40, 40, "HIT_MOVE", 8, 1, {"STRENGTH_POWER": 2})], True))
    lines.append(state("COMBAT", "R1", 1, 2, 80, [enemy(0, "SLIME", 30, 40, "HIT_MOVE", 8, 1, {"STRENGTH_POWER": 2})], True))
    lines.append(state("COMBAT", "R1", 2, 2, 72, [enemy(0, "SLIME", 30, 40, "GROW_MOVE", powers={"STRENGTH_POWER": 2}, types=("Buff",))], True))
    lines.append(state("COMBAT", "R1", 3, 2, 72, [enemy(0, "SLIME", 30, 40, "HIT_MOVE", 11, 1, {"STRENGTH_POWER": 5})], True,
                       player_powers=[{"power_id": "VULNERABLE_POWER", "amount": 1}]))
    lines.append(state("COMBAT", "R1", 3, 2, 70, [enemy(0, "SLIME", 0, 40, "HIT_MOVE", 11, 1, {"STRENGTH_POWER": 5})], True))
    lines.append(state("REWARD", "R1", None, 2, 76))
    lines.append(state("MAP", "R1", None, 2, 76, map_=node_map(1, 3, "Monster")))
    # Fight 2, floor 3: an elite with a minion; we die on turn 2.
    # The first pup dies and drops out of the list: the second keeps its identity at index 1.
    lines.append(state("COMBAT", "R1", 1, 3, 76, [enemy(0, "PUP", 10, 10, "BITE_MOVE", 2, 1, {"MINION_POWER": 1}),
                                                  enemy(1, "PUP", 11, 11, "BITE_MOVE", 2, 1, {"MINION_POWER": 1}),
                                                  enemy(2, "BRUTE", 100, 100, "SMASH_MOVE", 5, 3, types=("Attack", "Debuff"))], True,
                       player_powers=[{"power_id": "STRENGTH_POWER", "amount": 2}]))
    lines.append(state("COMBAT", "R1", 1, 3, 76, [enemy(0, "PUP", 11, 11, "BITE_MOVE", 2, 1, {"MINION_POWER": 1}),
                                                  enemy(1, "BRUTE", 100, 100, "SMASH_MOVE", 5, 3, types=("Attack", "Debuff"))], True,
                       player_powers=[{"power_id": "STRENGTH_POWER", "amount": 2}]))
    lines.append(state("COMBAT", "R1", 2, 3, 20, [enemy(0, "PUP", 11, 11, "BITE_MOVE", 2, 1, {"MINION_POWER": 1}),
                                                  enemy(1, "BRUTE", 100, 100, "ROAR_MOVE", types=("Buff",))], True,
                       player_powers=[{"power_id": "STRENGTH_POWER", "amount": 3}, {"power_id": "WEAK_POWER", "amount": 2}]))
    lines.append(state("GAME_OVER", "R1", None, 3, 0, game_over={"is_victory": False}))
    # Run R2, floor 2: an eel whose Thrash gives it Vigor 6; the Crash after it shows 16 + 6 = 22, the next
    # Crash (Vigor spent) 16. Only the second is a base-damage sample.
    lines.append(state("COMBAT", "R2", 1, 2, 80, [enemy(0, "EEL", 150, 150, "THRASH_MOVE", 3, 3, types=("Attack", "Buff"))], True))
    lines.append(state("COMBAT", "R2", 2, 2, 71, [enemy(0, "EEL", 140, 150, "CRASH_MOVE", 22, 1, {"VIGOR_POWER": 6})], True))
    lines.append(state("COMBAT", "R2", 3, 2, 49, [enemy(0, "EEL", 130, 150, "CRASH_MOVE", 16, 1)], True))
    # Run R3, floor 2: Surrounded by a crab. T1 opens with the Rocket behind (Laser 49 = (31 + 2) x 1.5) and
    # the Crusher in front (10); a Strike into the Rocket turns us: 33 and 15. T2 the Rocket is behind all
    # turn (49, no pair: no base sample), T3 in front all turn (33).
    sur = [{"power_id": "SURROUNDED_POWER", "amount": 1}]
    rocket = lambda dmg, move="LASER_MOVE": enemy(1, "ROCKET", 200, 200, move, dmg, 1, {"BACK_ATTACK_RIGHT_POWER": 1, "STRENGTH_POWER": 2})
    crusher = lambda dmg: enemy(0, "CRUSHER", 210, 210, "BITE_MOVE", dmg, 1, {"BACK_ATTACK_LEFT_POWER": 1})
    lines.append(state("COMBAT", "R3", 1, 2, 80, [crusher(10), rocket(49)], True, player_powers=sur))
    lines.append(state("COMBAT", "R3", 1, 2, 80, [crusher(15), rocket(33)], True, player_powers=sur))
    lines.append(state("COMBAT", "R3", 2, 2, 70, [crusher(10), rocket(49)], True, player_powers=sur))
    lines.append(state("COMBAT", "R3", 3, 2, 60, [crusher(10), rocket(33)], True, player_powers=sur))
    # Run R5, floor 17: a boss fight while run.boss_id names another boss (VANTOM_BOSS): filed under the
    # boss on the board, the Queen with her Amalgam; then R6 fights Vantom itself, filed under VANTOM.
    lines.append(state("COMBAT", "R5", 1, 17, 80, [enemy(0, "QUEEN", 419, 419, "PUPPET_STRINGS_MOVE", types=("Debuff",)),
                                                   enemy(1, "TORCH_HEAD_AMALGAM", 211, 211, "STRONG_TACKLE_MOVE", 26, 1)], True))
    lines.append(state("COMBAT", "R6", 1, 17, 80, [enemy(0, "VANTOM", 183, 183, "INK_BLOT_MOVE", 7, 1)], True))
    # Run R4, floor 2: a guard's Defend turn; our next turn opens with its 12 block.
    lines.append(state("COMBAT", "R4", 1, 2, 80, [enemy(0, "GUARD", 50, 50, "SHIELD_MOVE", types=("Defend",))], True))
    lines.append(state("COMBAT", "R4", 2, 2, 80, [enemy(0, "GUARD", 50, 50, "SWIPE_MOVE", 5, 1, block=12)], True))
    # Run R7, floor 17: a Siphon (Buff + Heal) takes the Giant from 200 to 215.
    lines.append(state("COMBAT", "R7", 1, 17, 80, [enemy(0, "GIANT", 200, 250, "SIPHON_MOVE", types=("Buff", "Heal"))], True))
    lines.append(state("COMBAT", "R7", 2, 17, 80, [enemy(0, "GIANT", 215, 250, "STOMP_MOVE", 15, 1)], True))
    # Run R8, floor 3: a Goop adds 2 Slimed to the discard pile (a Dazed held at the end of the turn goes to the
    # exhaust pile: not new); the next Goop's turn has no piles logged, so it is not a sample.
    goop = lambda: [enemy(0, "SLIMER", 30, 30, "GOOP_MOVE", types=("StatusCard",), status_cards=2)]
    lines.append(state("COMBAT", "R8", 1, 3, 80, goop(), True, piles={"draw": {"STRIKE": 3}}, hand=["DAZED"]))
    lines.append(state("COMBAT", "R8", 2, 3, 80, goop(), True, piles={"draw": {"STRIKE": 3}, "discard": {"SLIMED": 2}, "exhaust": {"DAZED": 1}}))
    lines.append(state("COMBAT", "R8", 3, 3, 80, goop(), True))
    # Run R9, floor 4: the Shrinker's move leaves SHRINK_POWER -1 on us (for the fight).
    lines.append(state("COMBAT", "R9", 1, 4, 80, [enemy(0, "SHRINKER", 40, 40, "SHRINK_MOVE", types=("DebuffStrong",))], True))
    lines.append(state("COMBAT", "R9", 2, 4, 80, [enemy(0, "SHRINKER", 40, 40, "CHOMP_MOVE", 7, 1)], True,
                       player_powers=[{"power_id": "SHRINK_POWER", "amount": -1}]))
    # Observed mechanics. Run R10, floor 19: T4 a Hopper's last Flutter stripped stuns it (Nab 14 cancelled: no HP lost
    # over the enemy turn); an observed frame taken in the enemy turn is ignored. T5 its Escape resolves: gone, the
    # reward screen without the card.
    hop = lambda hp, move, powers, types=("Attack",), dmg=None: enemy(0, "HOPPER", hp, 84, move, dmg, 1 if dmg else None, powers, types=types)
    lines.append(state("COMBAT", "R10", 4, 19, 50, [hop(40, "NAB_MOVE", {"ESCAPE_ARTIST_POWER": 2, "FLUTTER_POWER": 1}, dmg=14)], True))
    lines.append(state("COMBAT", "R10", 4, 19, 50, [hop(35, "STUNNED", {"ESCAPE_ARTIST_POWER": 2}, types=("Stun",))], True, end_turn=True))
    lines.append(state("COMBAT", "R10", 4, 19, 50, [hop(35, "STUNNED", {"ESCAPE_ARTIST_POWER": 2, "FLUTTER_POWER": 3}, types=("Stun",))], True, observed=True, block=9))
    lines.append(state("COMBAT", "R10", 5, 19, 50, [hop(35, "ESCAPE_MOVE", {"ESCAPE_ARTIST_POWER": 1}, types=("Escape",))], True))
    lines.append(state("COMBAT", "R10", 5, 19, 50, [hop(35, "ESCAPE_MOVE", {"ESCAPE_ARTIST_POWER": 1}, types=("Escape",))], True, end_turn=True))
    lines.append(state("REWARD", "R10", 5, 19, 50, reward={"rewards": [{"reward_type": "Potion", "description": "火焰药水"}, {"reward_type": "Card", "description": "将一张牌添加到你的牌组。"}]}))
    lines.append(state("MAP", "R10", None, 19, 50, map_=node_map(1, 1, "Monster")))
    # Run R11, floor 19: on the Escape turn its last Flutter goes (2 -> 1 -> gone): stunned, it stays and escapes again
    # on T6, where a card after the turn's last frame kills it (no end-turn decision there): the card comes back.
    lines.append(state("COMBAT", "R11", 5, 19, 60, [hop(10, "ESCAPE_MOVE", {"ESCAPE_ARTIST_POWER": 1, "FLUTTER_POWER": 2}, types=("Escape",))], True))
    lines.append(state("COMBAT", "R11", 5, 19, 60, [hop(5, "ESCAPE_MOVE", {"ESCAPE_ARTIST_POWER": 1, "FLUTTER_POWER": 1}, types=("Escape",))], True))
    lines.append(state("COMBAT", "R11", 5, 19, 60, [hop(2, "STUNNED", {"ESCAPE_ARTIST_POWER": 1}, types=("Stun",))], True, end_turn=True))
    lines.append(state("COMBAT", "R11", 6, 19, 60, [hop(2, "ESCAPE_MOVE", {"ESCAPE_ARTIST_POWER": 1}, types=("Escape",))], True))
    lines.append(state("REWARD", "R11", 6, 19, 60, reward={"rewards": [{"reward_type": "Gold", "description": "20金币"},
                                                                       {"reward_type": "SpecialCard", "description": "取回你被偷走的牌。"},
                                                                       {"reward_type": "Card", "description": "将一张牌添加到你的牌组。"}]}))
    lines.append(state("MAP", "R11", None, 19, 60, map_=node_map(1, 1, "Monster")))
    # Run R12, floor 37 (class B): a bot with Stock 2 is killed twice. T1: back at more max HP with Stock 1 and its move
    # Boot Up (lowered); T2 Hammer; T3 killed again: Stock and Strength gone, Boot Up (stripped); T4 Hammer again.
    bot = lambda hp, max_hp, move, powers, dmg=None, types=("Attack",): enemy(0, "BOT", hp, max_hp, move, dmg, 1 if dmg else None, powers, types=types)
    lines.append(state("COMBAT", "R12", 1, 37, 70, [bot(13, 73, "HAMMER_MOVE", {"STOCK_POWER": 2}, dmg=14)], True))
    lines.append(state("COMBAT", "R12", 1, 37, 70, [bot(81, 81, "BOOT_MOVE", {"STOCK_POWER": 1}, types=("Buff", "Defend"))], True, end_turn=True))
    lines.append(state("COMBAT", "R12", 2, 37, 70, [bot(81, 81, "HAMMER_MOVE", {"STOCK_POWER": 1, "STRENGTH_POWER": 3}, dmg=17)], True, end_turn=True))
    lines.append(state("COMBAT", "R12", 3, 37, 55, [bot(5, 81, "ONE_TWO_MOVE", {"STOCK_POWER": 1, "STRENGTH_POWER": 3}, dmg=13)], True))
    lines.append(state("COMBAT", "R12", 3, 37, 55, [bot(90, 90, "BOOT_MOVE", {}, types=("Buff", "Defend"))], True, end_turn=True))
    lines.append(state("COMBAT", "R12", 4, 37, 55, [bot(90, 90, "HAMMER_MOVE", {"STRENGTH_POWER": 3}, dmg=17)], True))
    # Run R13, floor 48 (class D): the Torch dies on T2, the Matron's Pray becomes Rage on that frame, Chop 7x5 next turn
    # (her Strength 2, our Vulnerable 99: base 3). Then an SL reload back to T1 (the Torch at full HP again: no death of
    # the first attempt's Torch), and the same death again on T2.
    vul = [{"power_id": "VULNERABLE_POWER", "amount": 99}]
    matron = lambda move, powers=None, dmg=None, hits=None, types=("Buff",): enemy(0, "MATRON", 400, 400, move, dmg, hits, powers, types=types)
    torch = lambda hp: enemy(1, "TORCH", hp, 211, "TACKLE_MOVE", 20, 1)
    for _attempt in range(2):
        lines.append(state("COMBAT", "R13", 1, 48, 80, [matron("PRAY_MOVE"), torch(211)], True, player_powers=vul))
        lines.append(state("COMBAT", "R13", 1, 48, 80, [matron("PRAY_MOVE"), torch(150)], True, player_powers=vul, end_turn=True))
        lines.append(state("COMBAT", "R13", 2, 48, 60, [matron("PRAY_MOVE"), torch(40)], True, player_powers=vul))
        lines.append(state("COMBAT", "R13", 2, 48, 60, [matron("RAGE_MOVE"), torch(0)], True, player_powers=vul, end_turn=True))
        lines.append(state("COMBAT", "R13", 3, 48, 60, [matron("CHOP_MOVE", {"STRENGTH_POWER": 2}, 7, 5, ("Attack",))], True, player_powers=vul))
    return lines


def self_test():
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        states = os.path.join(tmp, "states.jsonl")
        end_turns = []
        with open(states, "w", encoding="utf8") as handle:
            handle.write("\n".join(_synthetic_lines(end_turns)) + "\n")
        decisions = os.path.join(tmp, "decisions.jsonl")
        with open(decisions, "w", encoding="utf8") as handle:
            for run_id, ts in end_turns:
                handle.write(json.dumps({"ts": ts, "screen": "COMBAT", "label": "combat/plan", "run_id": run_id, "chosen": {"action": "end_turn"}}, separators=(",", ":")) + "\n")
        game = os.path.join(tmp, "game.json")
        with open(game, "w", encoding="utf8") as handle:
            json.dump({"collections": {
                "monsters": [{"id": "SLIME", "name": "史莱姆", "type": "Normal", "min_hp": 40, "max_hp": 40, "moves": [{"id": "HIT", "name": "撞"}]},
                             {"id": "QUEEN", "name": "女王", "type": "Boss", "min_hp": 419, "max_hp": 419, "moves": []},
                             {"id": "VANTOM", "name": "墨影幻灵", "type": "Boss", "min_hp": 183, "max_hp": 183, "moves": []},
                             {"id": "BRUTE", "name": "蛮", "type": "Elite", "min_hp": 100, "max_hp": 100, "moves": []}],
                "powers": [{"id": "STRENGTH_POWER", "name": "力量", "description": "+{Amount}", "type": "Buff"},
                           {"id": "WEAK_POWER", "name": "虚弱", "description": "-25%", "type": "Debuff"},
                           {"id": "SHRINK_POWER", "name": "缩小", "description": "-30%", "type": "Debuff"}],
                "cards": [{"id": "SLIMED", "type": "Status"}, {"id": "DAZED", "type": "Status"}, {"id": "STRIKE", "type": "Attack"}]}}, handle)
        # One fight with a reward is enough here (the live floor is REWARD_MIN_N).
        min_n = globals()["REWARD_MIN_N"]
        globals()["REWARD_MIN_N"] = 1
        try:
            db = build(states, None, game, decisions)
        finally:
            globals()["REWARD_MIN_N"] = min_n
    slime = db["monsters"]["SLIME"]
    assert slime["kind"] == "hallway", slime["kind"]
    assert slime["hp_by_asc"]["8"] == {"min": 40, "median": 40, "max": 40, "n": 1}, slime["hp_by_asc"]
    hit = slime["moves"]["HIT_MOVE"]
    assert hit["name"] == "撞"
    assert hit["n_seen"] == 2 and hit["next"] == {"GROW_MOVE": 1}, hit
    # Turn 1: 8 shown with 2 Strength -> base 6; turn 3: 11 shown but we are Vulnerable -> no base sample.
    assert hit["damage_by_asc"]["8"]["base_per_hit"] == {"6": 1}, hit["damage_by_asc"]
    assert hit["damage_by_asc"]["8"]["shown"] == {"11x1": 1, "8x1": 1}, hit["damage_by_asc"]
    grow = slime["moves"]["GROW_MOVE"]
    assert grow["self_powers_gained"] == {"STRENGTH_POWER": {"3": 1}}, grow
    assert grow["self_powers_gained_by_asc"] == {"8": {"STRENGTH_POWER": {"3": 1}}}, grow
    assert slime["powers"]["STRENGTH_POWER"]["amount_at_first_sight_by_asc"] == {"8": {"2": 1}}, slime["powers"]
    assert slime["powers"]["STRENGTH_POWER"]["turn_at_first_sight_by_asc"] == {"8": {"1": 1}}, slime["powers"]
    assert slime["powers"]["STRENGTH_POWER"]["description"] == "+2", slime["powers"]
    threat = slime["threat_by_asc"]["8"]
    assert threat["win_rate"] == 1.0 and threat["hp_loss_won"]["median"] == 10 and threat["net_hp_loss_won"]["median"] == 4, threat
    brute = db["monsters"]["BRUTE"]
    assert brute["kind"] == "elite" and brute["threat_by_asc"]["8"]["death_runs"] == ["R1"], brute
    smash = brute["moves"]["SMASH_MOVE"]
    assert smash["damage_by_asc"]["8"]["hits"] == {"3": 1} and smash["next"] == {"ROAR_MOVE": 1}, smash
    # Weak put on us is the move's; our own Strength gain is not.
    assert smash["player_powers_applied"] == {"WEAK_POWER": {"2": 1}}, smash
    assert smash["player_powers_applied_by_asc"] == {"8": {"WEAK_POWER": {"2": 1}}}, smash
    pup = db["monsters"]["PUP"]
    assert pup["kind"] == "minion" and pup["hp_by_asc"]["8"]["n"] == 2, pup
    # The surviving pup (11 HP) is one instance across the index shift: BITE -> BITE once, not twice.
    assert pup["moves"]["BITE_MOVE"]["next"] == {"BITE_MOVE": 1}, pup["moves"]
    assert brute["encounters"] == {"BRUTE+PUP+PUP": 1}
    assert db["encounters"]["BRUTE+PUP+PUP"]["by_asc"]["8"]["start_hp_total"]["median"] == 121
    eel = db["monsters"]["EEL"]["moves"]
    assert eel["THRASH_MOVE"]["self_powers_gained"] == {"VIGOR_POWER": {"6": 1}}, eel["THRASH_MOVE"]
    # The Crash under Vigor is shown, not a base sample.
    assert eel["CRASH_MOVE"]["damage_by_asc"]["8"]["base_per_hit"] == {"16": 1}, eel["CRASH_MOVE"]["damage_by_asc"]
    assert eel["CRASH_MOVE"]["damage_by_asc"]["8"]["shown"] == {"16x1": 1, "22x1": 1}, eel["CRASH_MOVE"]["damage_by_asc"]
    # Surrounded: only the turn that showed both facings is a base sample (31, not the 49 behind us).
    laser = db["monsters"]["ROCKET"]["moves"]["LASER_MOVE"]
    assert laser["damage_by_asc"]["8"]["base_per_hit"] == {"31": 1}, laser["damage_by_asc"]
    assert laser["back_attack_by_asc"] == {"8": {"behind": 2, "facing": 1}}, laser
    bite = db["monsters"]["CRUSHER"]["moves"]["BITE_MOVE"]
    assert bite["damage_by_asc"]["8"]["base_per_hit"] == {"10": 1}, bite["damage_by_asc"]
    assert bite["back_attack_by_asc"] == {"8": {"behind": 0, "facing": 3}}, bite
    # A boss fight is filed under the boss on the board, not a run.boss_id naming another one.
    assert sorted(db["bosses"]) == ["QUEEN", "VANTOM"], sorted(db["bosses"])
    assert sorted(db["bosses"]["QUEEN"]["8"]["parts"]) == ["QUEEN", "TORCH_HEAD_AMALGAM"], db["bosses"]["QUEEN"]
    assert db["bosses"]["VANTOM"]["8"]["fights"] == 1, db["bosses"]["VANTOM"]
    assert boss_key_of("KAISER_CRAB_BOSS", ["CRUSHER", "ROCKET"]) == "KAISER_CRAB"
    assert boss_key_of("VANTOM_BOSS", ["CRUSHER", "ROCKET"]) == "KAISER_CRAB"
    assert boss_key_of("QUEEN_BOSS", ["TEST_SUBJECT"]) == "TEST_SUBJECT"
    assert boss_key_of(None, ["MYSTERY", "OTHER"]) == "MYSTERY+OTHER"
    # Block a Defend move gives, pooled and by ascension.
    shield = db["monsters"]["GUARD"]["moves"]["SHIELD_MOVE"]
    assert shield["block_gained"] == {"12": 1}, shield
    assert shield["block_gained_by_asc"] == {"8": {"12": 1}}, shield
    # A Heal move's HP gain, by ascension.
    siphon = db["monsters"]["GIANT"]["moves"]["SIPHON_MOVE"]
    assert siphon["heal_by_asc"] == {"8": {"15": 1}}, siphon
    assert "heal_by_asc" not in db["monsters"]["GIANT"]["moves"]["STOMP_MOVE"]
    # The status cards a move adds, and where: 2 Slimed into the discard pile, once (the unlogged turn is no sample).
    goop = db["monsters"]["SLIMER"]["moves"]["GOOP_MOVE"]
    assert goop["status_cards"] == {"2": 3}, goop
    assert goop["status_card_ids"] == {"SLIMED": 2} and goop["status_card_pile"] == {"discard": 2}, goop
    # A debuff that appears at -1 (lasts the fight) is the move's, at -1.
    shrink = db["monsters"]["SHRINKER"]["moves"]["SHRINK_MOVE"]
    assert shrink["player_powers_applied"] == {"SHRINK_POWER": {"-1": 1}}, shrink
    # Observed mechanics: Flutter stripped twice (R10 T4, R11 T5), stunned both times; the T4 Nab cancelled, no HP lost.
    flutter = db["observed"]["powers_stripped"]["FLUTTER_POWER"]
    assert flutter["n"] == 2 and flutter["move_after"] == {"STUNNED": 2} and flutter["stunned_share"] == 1.0, flutter
    assert flutter["alive_at_turn_end"] == 2 and flutter["stunned_at_turn_end"] == 2, flutter
    assert flutter["attack_before"] == 1 and flutter["attack_cancelled"] == 1 and flutter["hp_check"] == {"n": 1, "landed": 0}, flutter
    assert flutter["monsters"] == {"HOPPER": 2} and flutter["evidence"] == ["R10 F19 T4", "R11 F19 T5"], flutter
    # The observed frame of the enemy turn (Flutter 3 again, our block 9) is no strip and no frame of ours.
    assert "ESCAPE_ARTIST_POWER" not in db["observed"]["powers_stripped"], db["observed"]["powers_stripped"]
    hopper = db["monsters"]["HOPPER"]["observed"]
    escape = hopper["escape_moves"]["ESCAPE_MOVE"]
    assert (escape["n"], escape["gone"], escape["stayed"], escape["stayed_stunned"], escape["killed_last_card"]) == (3, 1, 1, 1, 1), escape
    assert escape["next_after_stay"] == {"ESCAPE_MOVE": 1} and escape["evidence_gone"] == ["R10 F19 T5"], escape
    rewards = {r["reward"]: r for r in hopper["kill_rewards"]}
    assert sorted(rewards) == ["Gold:N金币", "SpecialCard:取回你被偷走的牌。"], rewards
    assert rewards["SpecialCard:取回你被偷走的牌。"]["killed"] == [1, 1] and rewards["SpecialCard:取回你被偷走的牌。"]["left"] == [0, 1], rewards
    assert rewards["SpecialCard:取回你被偷走的牌。"]["only_when_killed"] is True, rewards
    stuns = hopper["mid_turn_stuns"]
    assert stuns["n"] == 2 and stuns["unexplained"] == 0 and stuns["triggers"]["power_removed:FLUTTER_POWER"] == 2, stuns
    # Class B: the bot's Stock lowered on its first revive and stripped on its second, Boot Up both times, Hammer next.
    bot = db["monsters"]["BOT"]["observed"]
    stock = bot["powers_stripped"]["STOCK_POWER"]
    assert (stock["n"], stock["move_changed"], stock["changed_to"], stock["revived"]) == (1, 1, {"BOOT_MOVE": 1}, 1), stock
    assert stock["move_before"] == {"ONE_TWO_MOVE": 1} and stock["changed_next"] == {"HAMMER_MOVE": 1} and stock["end_move"] == {"BOOT_MOVE": 1}, stock
    assert stock["changed_evidence"] == ["R12 F37 T3"] and stock["co_removed"] == {"STRENGTH_POWER": 1}, stock
    lowered = bot["powers_lowered"]["STOCK_POWER"]
    assert (lowered["n"], lowered["move_changed"], lowered["changed_to"], lowered["changed_next"], lowered["revived"]) == (1, 1, {"BOOT_MOVE": 1}, {"HAMMER_MOVE": 1}, 1), lowered
    pooled_stock = db["observed"]["powers_stripped"]["STOCK_POWER"]
    assert pooled_stock["move_changed"] == 1 and pooled_stock["changed_to"] == {"BOOT_MOVE": 1} and pooled_stock["monsters"] == {"BOT": 1}, pooled_stock
    # The Hopper's Flutter strips changed its move to STUNNED (counted here too) and never revived it.
    assert flutter["move_changed"] == 2 and flutter["changed_to"] == {"STUNNED": 2} and flutter["revived"] == 0, flutter
    # Class D: two deaths (one per attempt; the reload's Torch back at full HP is no third), Rage on the frame, Chop next;
    # the baseline turns beside a living Torch and after its death. The Chop's base from the Vulnerable-only turns: 3.
    death = db["monsters"]["MATRON"]["observed"]["ally_deaths"]["TORCH"]
    assert (death["n"], death["by_move"], death["next_n"], death["next_move"]) == (2, {"PRAY_MOVE": {"n": 2, "changed_to": {"RAGE_MOVE": 2}}}, 2, {"CHOP_MOVE": 2}), death
    assert death["alive"]["turns"] == 4 and death["alive"]["moves"] == {"PRAY_MOVE": 4} and death["dead"] == {"turns": 2, "moves": {"CHOP_MOVE": 2}}, death
    assert death["changed_evidence"] == ["R13 F48 T2"] and death["attack_changed"] == 0 and death["co_deaths"] == 0, death
    # (The move tables read each turn's first frame of the fight, the first attempt's: one Chop.)
    chop = db["monsters"]["MATRON"]["moves"]["CHOP_MOVE"]["damage_by_asc"]["8"]
    assert chop["base_per_hit"] == {"3": 1} and chop["base_from"] == "vulnerable" and chop["shown"] == {"7x5": 1}, chop
    assert "base_from" not in db["monsters"]["SLIME"]["moves"]["HIT_MOVE"]["damage_by_asc"]["8"], "a move with clean turns keeps its own base"
    assert vulnerable_base(7) == 5 and vulnerable_base(16) == 11 and vulnerable_base(8) is None
    # A slime without anything notable has no `observed` entry.
    assert "observed" not in slime, slime.get("observed")
    # A failure in the mining drops every `observed` field and nothing else.
    failing = Mechanics(quiet=True)
    failing.fail(RuntimeError("test"))
    global MECHANICS
    saved = MECHANICS
    MECHANICS = failing
    try:
        assert observed_output(["HOPPER"]) == ({}, None)
    finally:
        MECHANICS = saved
    print("self-test ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
