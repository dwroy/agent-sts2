#!/usr/bin/env python3
"""Monster database from our own logs: logs/states.jsonl (+ runs.jsonl) -> src/knowledge/monster-db.json.

DATA ONLY. Nothing in src/ reads monster-db.json yet; it is the observed reference the hand tables
(boss-clock.ts, enemy dossiers, move-model.json) are checked against.

Per monster id: names, acts, kind (hallway/elite/boss/minion/event), encounter groups, max HP by
ascension, moves (intent, damage per hit and hits by ascension, Strength taken out where it is
computable, block and powers the move put on itself or on us, successor counts), powers seen on it with
the game's text, the threat to us by ascension (HP lost, win rate, deaths with run ids) and provenance.
Every number carries its sample size (n); an ascension that was never logged is absent, not guessed.
Also `bosses`: one summary per act boss (all parts and phases).

The move sequence is the move-model's (tools/build-move-model.py): the move an enemy shows at the first
logged state of each turn, successors counted between consecutive turns. Here it is keyed per fight
(run, floor, enemy index), where the move-model keys per run, which lets an enemy met twice in a run mix
two fights. `--move-model-out PATH` writes the same data in move-model.json's format.

Usage:
  python3 tools/build-monster-db.py [--states PATH] [--runs PATH] [--game-data PATH] [--out PATH]
                                    [--move-model-out PATH] [--quiet]
  python3 tools/build-monster-db.py --self-test
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

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _default_logs():
    for base in (os.path.join(ROOT, "logs"), os.path.expanduser("~/Projects/sts2-jev/jev-sts2/logs")):
        if os.path.exists(os.path.join(base, "states.jsonl")):
            return base
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


def iter_entries(path):
    """Yield (screen, entry) for every state line worth reading, streaming the file."""
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


def snapshot(combat, tracked):
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
            "alive": enemy.get("is_alive", True),
        }
    return {"player": {"powers": powers_of(player), "hp": player.get("current_hp"), "block": player.get("block") or 0}, "enemies": enemies}


def observe_combat(fight, state, ts):
    combat = state.get("combat") or {}
    turn = state.get("turn")
    fight.last_ts = ts
    player = combat.get("player") or {}
    if player.get("current_hp") is not None:
        fight.last_hp = player["current_hp"]
    tracked = track(fight, turn, combat.get("enemies") or [])
    snap = snapshot(combat, tracked)
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
    first = fight.turn_first.setdefault(turn, {"player": snap["player"], "enemies": {}})
    for serial, enemy in snap["enemies"].items():
        # The move of a turn: the first logged state that shows one (the move-model's rule).
        if serial not in first["enemies"] and enemy["move"]:
            first["enemies"][serial] = enemy
    fight.turn_last[turn] = snap


def damage_mods(enemy, player):
    """The damage modifiers up on a frame (enemy Weak/Shrink/Vigor, our Vulnerable/Intangible/Tank)."""
    return tuple(sorted(set(enemy["powers"]) & ENEMY_DAMAGE_MODS)) + tuple(sorted(set(player["powers"]) & PLAYER_DAMAGE_MODS))


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
            observe_combat(fight, state, ts)
            return
        fight = self.open.get(run_id)
        if fight is not None and (screen == "GAME_OVER" or not state.get("in_combat")):
            game_over = state.get("game_over") if screen == "GAME_OVER" else None
            self.close(fight, run, game_over)
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
            boss_key = (fight.boss_id or "").upper().replace("_BOSS", "") or "+".join(sorted(ids_in_fight))
            parts = collections.defaultdict(list)
            for (index, eid), inst in sorted(fight.instances.items(), key=lambda kv: (kv[0][0] if isinstance(kv[0][0], int) else 99)):
                parts[eid].append({"hp": inst["hp"], "spawned": inst["spawned"], "minion": inst["minion"]})
            self.bosses[boss_key][asc].append({**result, "parts": dict(parts), "start_hp": start_hp, "ids": sorted(ids_in_fight)})

    def moves_of(self, fight, asc):
        turns = sorted(fight.turn_first)
        for turn in turns:
            first = fight.turn_first[turn]
            nxt = fight.turn_first.get(turn + 1)
            last = fight.turn_last.get(turn)
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
                    if intent.get("status_card_count"):
                        move["status_cards"][int(intent["status_card_count"])] += 1
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
                        # Debuffs put on us, and Strength/Dexterity drained (our own buffs are left out).
                        if (delta > 0 and GAME_POWER_TYPES.get(pid) == "Debuff") or (delta < 0 and pid in DRAINED and not temporary):
                            move["player"][pid][delta] += 1
                            move["player_by_asc"][akey][pid][delta] += 1


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
            for akey in sorted(set(move["shown"]) | set(move["base"]), key=lambda a: (isinstance(a, str), a)):
                base_counter = move["base"].get(akey, collections.Counter())
                by_asc[str(akey)] = {
                    "shown": counter_obj(move["shown"].get(akey, collections.Counter())),
                    "base_per_hit": counter_obj(base_counter),
                    "hits": counter_obj(move["hits"].get(akey, collections.Counter())),
                    "n_base": sum(base_counter.values()),
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
                "powers.amount_at_first_sight_by_asc / turn_at_first_sight_by_asc = each instance's first logged amount and the turn it was on. "
                "Surrounded (Kaiser Crab): a back-attack enemy's frame is a base sample only when its turn also showed the other facing's "
                "number (behind = floor((base + Strength) x 1.5)); back_attack_by_asc counts the turns it came from behind or in front. threat: hp_loss_won = entry HP - HP on the last "
                "combat state (includes self-damage cards), net_hp_loss_won = entry HP - HP after the fight (after Burning Blood and other end-of-combat "
                "heals). kind from the map node of the fight (Monster=hallway, Elite, Boss, Unknown=event), minion when MINION_POWER is on most instances.",
        "generated_from": {"fights": builder.fights, "first_seen": builder.first_ts, "last_seen": builder.last_ts,
                           "fights_by_asc": {str(k): v for k, v in sorted(builder.asc_seen.items())}},
    }
    return {"meta": meta, "bosses": bosses, "encounters": encounters, "monsters": out}


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
DRAINED = {"STRENGTH_POWER", "DEXTERITY_POWER", "FOCUS_POWER"}
# Powers that give or take Strength/Dexterity until the end of the turn ("在本回合结束前"): their expiry is
# not the enemy move's doing.
TEMPORARY_POWERS = set()


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


def build(states, runs_path, game_path):
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
    parser.add_argument("--game-data", default=os.path.join(ROOT, ".cache/game-data.json"))
    parser.add_argument("--out", default=os.path.join(ROOT, "src/knowledge/monster-db.json"))
    parser.add_argument("--move-model-out", default=None)
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    start = time.time()
    db = build(args.states, args.runs, args.game_data)
    tmp = args.out + ".tmp"
    with open(tmp, "w", encoding="utf8") as handle:
        json.dump(db, handle, ensure_ascii=False, indent=1, sort_keys=False)
        handle.write("\n")
    os.replace(tmp, args.out)
    if args.move_model_out:
        with open(args.move_model_out, "w", encoding="utf8") as handle:
            json.dump(move_model_view(db), handle, ensure_ascii=False, indent=1, sort_keys=True)
    if not args.quiet:
        meta = db["meta"]["generated_from"]
        print(f"{len(db['monsters'])} monsters, {len(db['bosses'])} bosses, {meta['fights']} fights "
              f"(by ascension {meta['fights_by_asc']}) in {time.time() - start:.1f}s -> {args.out}")
    return 0


# ---------------------------------------------------------------- self-test


def _synthetic_lines():
    """A two-fight run: a hallway fight won at A8, then an elite fight we die in."""
    def state(screen, run_id, turn, floor, hp, enemies=None, in_combat=False, map_=None, game_over=None, player_powers=None):
        run = {"ascension": 8, "act_id": "0", "floor": floor, "current_hp": hp, "max_hp": 80, "boss_id": "VANTOM_BOSS",
               "relics": [{"relic_id": "BURNING_BLOOD"}]}
        combat = None
        if enemies is not None:
            combat = {"player": {"current_hp": hp, "powers": player_powers or []}, "enemies": enemies}
        s = {"run_id": run_id, "screen": screen, "turn": turn, "in_combat": in_combat, "combat": combat, "run": run,
             "map": map_, "game_over": game_over, "agent_view": {"big": "x" * 10}}
        return json.dumps({"ts": f"2026-09-28T00:00:{len(lines):02d}Z", "fingerprint": "{\"screen\":\"X\"}", "screen": screen, "state": s},
                          separators=(",", ":"), ensure_ascii=False)

    def enemy(index, eid, hp, max_hp, move, dmg=None, hits=None, powers=None, block=0, types=("Attack",)):
        intents = []
        for t in types:
            intents.append({"intent_type": t, "damage": dmg if t == "Attack" else None, "hits": hits if t == "Attack" else None})
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
    # Run R4, floor 2: a guard's Defend turn; our next turn opens with its 12 block.
    lines.append(state("COMBAT", "R4", 1, 2, 80, [enemy(0, "GUARD", 50, 50, "SHIELD_MOVE", types=("Defend",))], True))
    lines.append(state("COMBAT", "R4", 2, 2, 80, [enemy(0, "GUARD", 50, 50, "SWIPE_MOVE", 5, 1, block=12)], True))
    return lines


def self_test():
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        states = os.path.join(tmp, "states.jsonl")
        with open(states, "w", encoding="utf8") as handle:
            handle.write("\n".join(_synthetic_lines()) + "\n")
        game = os.path.join(tmp, "game.json")
        with open(game, "w", encoding="utf8") as handle:
            json.dump({"collections": {
                "monsters": [{"id": "SLIME", "name": "史莱姆", "type": "Normal", "min_hp": 40, "max_hp": 40, "moves": [{"id": "HIT", "name": "撞"}]},
                             {"id": "BRUTE", "name": "蛮", "type": "Elite", "min_hp": 100, "max_hp": 100, "moves": []}],
                "powers": [{"id": "STRENGTH_POWER", "name": "力量", "description": "+{Amount}", "type": "Buff"},
                           {"id": "WEAK_POWER", "name": "虚弱", "description": "-25%", "type": "Debuff"}]}}, handle)
        db = build(states, None, game)
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
    # Block a Defend move gives, pooled and by ascension.
    shield = db["monsters"]["GUARD"]["moves"]["SHIELD_MOVE"]
    assert shield["block_gained"] == {"12": 1}, shield
    assert shield["block_gained_by_asc"] == {"8": {"12": 1}}, shield
    print("self-test ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
