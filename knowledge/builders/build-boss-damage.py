#!/usr/bin/env python3
"""How much of the act bosses' shown damage got through our block, from logs/states.jsonl ->
knowledge/characters/<id>/boss-damage.json (and, with --fights, one JSON line per boss fight for the backtest).
One character's fights only (--character, default ironclad; a state's run.character_id, none = the Ironclad): how
much got through is our play, and the Silent plays another game.

For every logged boss fight (every ascension): the frame at the start of each of our turns gives our HP
and the boss's shown attack for the coming enemy turn (its intents' damage x hits, Strength and our
Vulnerable in). The HP lost from one turn's start to the next (our own HP costs and heals included), over
the attack shown, summed over the fights, is the share of the boss's damage that got through: our play,
not the monster. The boss clock multiplies the boss's own damage at the current ascension (monster DB)
by it (strategy/boss-clock.ts bossLossPerTurn).

The fight rows (--fights FILE) carry: key, boss, ascension, outcome (won when the run got past the boss's
floor, or the run was won on it: a win ends on the final boss's floor), turns, entry_hp, final_hp,
loss_per_turn ((entry - final) / turns), for agent/tools/boss-loss-backtest.ts.

Also per boss, by ascension (the counts the guides and boss notes quote, filled from here by strategy/boss-clock.ts
instead of hand-written: 2026-09-29 knowledge check): by_asc {fights, won, entry_pct_won, entry_pct_lost};
KAISER_CRAB.first_death (the claw that died first while the other lived, or null); LAGAVULIN_MATRIARCH.sleep
(the turn it woke, the share of its HP lost by then, the deck's lasting-Strength cards); WATERFALL_GIANT.kills;
QUEEN.amalgam (the turn the Torch Head Amalgam died while the Queen lived, or null; the HP each lost by the first frame
of turn 3); THE_INSATIABLE.deaths (a lost fight's death line: HP with the Sandpit at 2+, the Sandpit with HP and block
over the shown attack, or both at once; from the fight's last frame).

Only states that name a boss enemy are read (grep), not the whole file.

Usage: knowledge/builders/build-boss-damage.py [--logs DIR] [--character ID] [--fights FILE] [--out FILE]
A character with no row in runs.jsonl gets no file (the TS loaders read a missing file as "no knowledge yet").
"""
import argparse
import collections
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])  # the project root (docs/layout.md)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from characters import character_dir, character_key, run_character  # noqa: E402

# Boss clock key (strategy/boss-clock.ts BOSSES) -> the enemy ids of its bodies.
BOSSES = {
    "KAISER_CRAB": ["CRUSHER", "ROCKET"],
    "KNOWLEDGE_DEMON": ["KNOWLEDGE_DEMON"],
    "THE_INSATIABLE": ["THE_INSATIABLE"],
    "AEONGLASS": ["AEONGLASS"],
    "QUEEN": ["QUEEN", "TORCH_HEAD_AMALGAM"],
    "TEST_SUBJECT": ["TEST_SUBJECT"],
    "LAGAVULIN_MATRIARCH": ["LAGAVULIN_MATRIARCH"],
    "SOUL_FYSH": ["SOUL_FYSH"],
    "THE_KIN": ["KIN_PRIEST", "KIN_FOLLOWER"],
    "VANTOM": ["VANTOM"],
    "WATERFALL_GIANT": ["WATERFALL_GIANT"],
    "CEREMONIAL_BEAST": ["CEREMONIAL_BEAST"],
}
BOSS_OF = {enemy: boss for boss, enemies in BOSSES.items() for enemy in enemies}
# The Waterfall Giant's husk after the kill shows this HP (999999999) until it blows up.
GIANT_HUSK_HP = 100000000
# Lasting Strength cards: strategy/card-value.ts damageRole's "scaling" set (keep the two in step). The Matriarch's
# sleep rows carry the deck's ones (experience lag-sleep: A9 decks with none sat through the sleep and lost).
STRENGTH_CARDS = {"DEMON_FORM", "INFLAME", "RUPTURE", "DOMINATE", "FEED", "PYRE", "HELLRAISER", "JUGGERNAUT", "FIGHT_ME"}


def fight_won(run, floor):
    """The run got past the fight's floor, or ended on it with a victory (the final boss: every win ends on
    its floor, F48 up to A9; runs.jsonl `victory` is game_over.is_victory)."""
    last = (run or {}).get("floor") or 0
    return last > (floor or 0) or (bool((run or {}).get("victory")) and last == (floor or 0))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--logs", default=os.path.join(ROOT, "logs"))
    parser.add_argument("--fights", default=None)
    parser.add_argument("--character", default="ironclad", help="the character's knowledge id (default ironclad)")
    parser.add_argument("--out", default=None, help="default knowledge/characters/<character>/boss-damage.json")
    args = parser.parse_args()
    character = character_key(args.character)
    args.out = args.out or os.path.join(character_dir(ROOT, character), "boss-damage.json")

    runs = {}
    with open(os.path.join(args.logs, "runs.jsonl"), encoding="utf8") as handle:
        for line in handle:
            try:
                run = json.loads(line)
            except ValueError:
                continue
            runs[run.get("run_id")] = run
    if not any(run_character(run) == character for run in runs.values()):
        print(f"no {character} runs; nothing written -> {args.out}")
        return

    patterns = []
    for enemy in BOSS_OF:
        patterns += ["-e", f'"enemy_id":"{enemy}"']
    grep = subprocess.Popen(["grep", "-F", *patterns, os.path.join(args.logs, "states.jsonl")], stdout=subprocess.PIPE)
    # (run, floor) -> {turn: (hp, shown attack)} from the turn's first logged frame
    fights = collections.defaultdict(dict)
    meta = {}
    # (run, floor) -> (turn, our HP, eruption stacks) at the Waterfall Giant's kill: the first frame showing its
    # husk (the kill leaves a body of 999999999 HP that blows up for the stacks; Y36HXZ80A8LL T9: 36 HP, 41).
    giant_kills = {}
    # (run, floor) -> our max HP on the fight's first turn (the entry HP as a share of it, by_asc).
    entry_max = {}
    # (run, floor) -> (claw, turn) of the Kaiser Crab's first claw to die while the other lived (None: neither).
    crab_first = {}
    # (run, floor) -> the Matriarch's sleep: {"max", "woke_turn", "woke_hp", "strength"} (the first frame without
    # Asleep: the turn and its HP then; strength: the deck's Strength cards on the fight's first frame).
    lag_sleep = {}
    # (run, floor) -> the Queen fight: the bodies' HP on the first frame, on the first frame of turn 3 (or the last
    # frame before it), and the turn the Amalgam was first seen dead while the Queen lived (queen-plan: 5LRZ, Q8XR A8
    # put their T1 burst into the Queen and lost; queenAmalgamRecord).
    queen_track = {}
    # (run, floor) -> the Insatiable fight's last frame: (Sandpit, our HP, our block, the attack it shows) (a loss's
    # death line: NH8A A8 died on HP with the Sandpit at 2 after an Escape over damage; sandpitDeathRecord).
    sand_last = {}
    for line in grep.stdout:
        try:
            state = json.loads(line)["state"]
        except (ValueError, KeyError):
            continue
        combat = state.get("combat") or {}
        run = state.get("run") or {}
        if not state.get("in_combat") or not combat:
            continue
        if run_character(run) != character:
            continue
        bodies = [e for e in combat.get("enemies", []) if e.get("enemy_id") in BOSS_OF]
        if not bodies:
            continue
        boss = BOSS_OF[bodies[0]["enemy_id"]]
        key = (state.get("run_id"), run.get("floor"))
        turn = state.get("turn")
        for enemy in bodies:
            if enemy.get("enemy_id") == "WATERFALL_GIANT" and (enemy.get("max_hp") or 0) >= GIANT_HUSK_HP and key not in giant_kills and turn is not None:
                stacks = next((p.get("amount") for p in enemy.get("powers") or [] if p.get("power_id") == "STEAM_ERUPTION_POWER"), None)
                giant_kills[key] = (turn, (combat.get("player") or {}).get("current_hp"), stacks)
        if turn == 1 and key not in entry_max:
            entry_max[key] = (combat.get("player") or {}).get("max_hp")
        if boss == "KAISER_CRAB" and key not in crab_first and turn is not None:
            claws = {e.get("enemy_id"): e for e in combat.get("enemies", []) if e.get("enemy_id") in ("ROCKET", "CRUSHER")}
            dead = {claw: claws.get(claw) is None or claws[claw].get("is_alive") is False or (claws[claw].get("current_hp") or 0) <= 0
                    for claw in ("ROCKET", "CRUSHER")}
            if dead["ROCKET"] != dead["CRUSHER"]:
                crab_first[key] = ("ROCKET" if dead["ROCKET"] else "CRUSHER", turn)
        if boss == "LAGAVULIN_MATRIARCH" and turn is not None:
            body = next((e for e in bodies if e.get("enemy_id") == "LAGAVULIN_MATRIARCH"), None)
            sleep = lag_sleep.get(key)
            if sleep is None and body is not None:
                deck = [card.get("card_id") for card in run.get("deck") or []]
                sleep = lag_sleep[key] = {"max": body.get("max_hp"), "woke_turn": None, "woke_hp": None,
                                          "strength": sorted({card for card in deck if card in STRENGTH_CARDS})}
            asleep = any(p.get("power_id") == "ASLEEP_POWER" and (p.get("amount") or 0) > 0 for p in (body or {}).get("powers") or [])
            if sleep is not None and body is not None and sleep["woke_turn"] is None and not asleep:
                sleep["woke_turn"], sleep["woke_hp"] = turn, body.get("current_hp")
        if boss == "QUEEN" and turn is not None:
            def body_hp(enemy_id):
                body = next((e for e in bodies if e.get("enemy_id") == enemy_id), None)
                return 0 if body is None or body.get("is_alive") is False else max(0, body.get("current_hp") or 0)
            queen_hp, amalgam_hp = body_hp("QUEEN"), body_hp("TORCH_HEAD_AMALGAM")
            track = queen_track.get(key)
            if track is None:
                track = queen_track[key] = {"q0": queen_hp, "a0": amalgam_hp, "q3": None, "a3": None, "q_last": queen_hp, "a_last": amalgam_hp, "dead": None}
            if turn >= 3 and track["q3"] is None:
                track["q3"], track["a3"] = queen_hp, amalgam_hp
            if turn < 3:
                track["q_last"], track["a_last"] = queen_hp, amalgam_hp
            if track["dead"] is None and queen_hp > 0 and amalgam_hp <= 0:
                track["dead"] = turn
        if boss == "THE_INSATIABLE" and turn is not None:
            body = bodies[0]
            sandpit = next((p.get("amount") for p in body.get("powers") or [] if p.get("power_id") == "SANDPIT_POWER"), None)
            player = combat.get("player") or {}
            shown_attack = sum((i.get("damage") or 0) * max(1, i.get("hits") or 1) for i in body.get("intents") or [] if i.get("damage") is not None)
            sand_last[key] = (sandpit, player.get("current_hp"), player.get("block") or 0, shown_attack)
        if turn is None or turn in fights[key]:
            continue
        hp = (combat.get("player") or {}).get("current_hp")
        if hp is None:
            continue
        shown = 0
        for enemy in bodies:
            if enemy.get("is_alive") is False:
                continue
            for intent in enemy.get("intents") or []:
                if intent.get("damage") is not None:
                    shown += (intent.get("damage") or 0) * max(1, intent.get("hits") or 1)
        fights[key][turn] = (hp, shown)
        meta.setdefault(key, (boss, run.get("ascension")))
    grep.wait()

    pooled = collections.defaultdict(lambda: {"shown": 0, "lost": 0, "turns": 0, "fights": 0})
    rows = []
    # The Waterfall Giant's fights by ascension: kill turn (None: not killed), outcome, HP and stacks at the kill
    # (strategy/boss-clock.ts giantKillRecord: the kill-turn record the notes quote, from the data).
    kills = collections.defaultdict(list)
    # Every boss by ascension: fights, won, and the mean entry HP (% of max) of the won and the lost ones
    # (strategy/boss-clock.ts bossRecord, act1EntryHp: the counts the guides quote, from the data).
    by_asc = collections.defaultdict(lambda: collections.defaultdict(lambda: {"fights": 0, "won": 0, "entry_won": [], "entry_lost": []}))
    # The Kaiser Crab's claw that died first, and the Matriarch's sleep, by ascension (crabKillRecord, lagSleepRecord).
    crab_rows = collections.defaultdict(list)
    lag_rows = collections.defaultdict(list)
    # The Queen's Amalgam and the Insatiable's death line, by ascension (queenAmalgamRecord, sandpitDeathRecord).
    queen_rows = collections.defaultdict(list)
    sand_rows = collections.defaultdict(list)
    for key, turns in fights.items():
        boss, asc = meta[key]
        run_id, floor = key
        order = sorted(turns)
        if not order or order[0] != 1:
            continue  # the fight's first turn not logged: no entry HP
        won = fight_won(runs.get(run_id), floor)
        last = order[-1]
        final = turns[last][0] if won else 0
        entry = turns[1][0]
        acc = pooled[boss]
        acc["fights"] += 1
        for t in order:
            hp, shown = turns[t]
            nxt = turns.get(t + 1)
            if nxt is not None:
                lost = hp - nxt[0]
            elif t == last and not won:
                lost = hp  # the enemy turn that killed us
            else:
                continue
            acc["shown"] += shown
            acc["lost"] += max(0, lost)
            acc["turns"] += 1
        rows.append({"key": run_id, "floor": floor, "boss": boss, "ascension": asc, "outcome": "won" if won else "died", "turns": last,
                     "entry_hp": entry, "final_hp": final, "loss_per_turn": round((entry - final) / max(1, last), 2)})
        cell = by_asc[boss][str(asc)]
        cell["fights"] += 1
        cell["won"] += 1 if won else 0
        if entry_max.get(key):
            cell["entry_won" if won else "entry_lost"].append(100.0 * entry / entry_max[key])
        if boss == "KAISER_CRAB":
            first = crab_first.get(key)
            crab_rows[str(asc)].append({"run": (run_id or "")[:4], "first": first[0] if first else None, "turn": first[1] if first else None, "won": won})
        if boss == "LAGAVULIN_MATRIARCH" and key in lag_sleep:
            sleep = lag_sleep[key]
            woke_pct = round(100.0 * (sleep["max"] - sleep["woke_hp"]) / sleep["max"]) if sleep["woke_hp"] is not None and sleep["max"] else None
            lag_rows[str(asc)].append({"run": (run_id or "")[:4], "won": won, "woke_turn": sleep["woke_turn"], "woke_pct": woke_pct, "strength": sleep["strength"]})
        if boss == "QUEEN" and key in queen_track:
            track = queen_track[key]
            q3 = track["q3"] if track["q3"] is not None else track["q_last"]
            a3 = track["a3"] if track["a3"] is not None else track["a_last"]
            queen_rows[str(asc)].append({"run": (run_id or "")[:4], "won": won, "killed_turn": track["dead"],
                                         "t12_queen": track["q0"] - q3, "t12_amalgam": track["a0"] - a3})
        if boss == "THE_INSATIABLE" and key in sand_last:
            sandpit, hp, block, attack = sand_last[key]
            death = None
            if not won:
                # The Sandpit drops by 1 each enemy turn and eats us at 0: at 2+ on the last frame the HP line ended it.
                if sandpit is None or sandpit >= 2:
                    death = "hp"
                elif (hp or 0) + block >= attack:
                    death = "sandpit"
                else:
                    death = "both"
            sand_rows[str(asc)].append({"run": (run_id or "")[:4], "won": won, "death": death, "sandpit": sandpit, "hp": hp})
        if boss == "WATERFALL_GIANT":
            kill = giant_kills.get(key)
            kills[str(asc)].append({"run": (run_id or "")[:4], "turn": kill[0] if kill else None, "won": won,
                                    "hp": kill[1] if kill else None, "stacks": kill[2] if kill else None})

    out = {}
    for boss in sorted(pooled):
        acc = pooled[boss]
        if acc["shown"] <= 0:
            continue
        out[boss] = {"unblocked_share": round(acc["lost"] / acc["shown"], 3), "fights": acc["fights"], "turns": acc["turns"],
                     "shown": acc["shown"], "hp_lost": acc["lost"]}
        out[boss]["by_asc"] = {
            asc: {"fights": cell["fights"], "won": cell["won"],
                  "entry_pct_won": round(sum(cell["entry_won"]) / len(cell["entry_won"]), 1) if cell["entry_won"] else None,
                  "entry_pct_lost": round(sum(cell["entry_lost"]) / len(cell["entry_lost"]), 1) if cell["entry_lost"] else None}
            for asc, cell in sorted(by_asc[boss].items(), key=lambda item: (item[0] == "None", int(item[0]) if item[0].isdigit() else 0))
        }
        if boss == "KAISER_CRAB":
            out[boss]["first_death"] = {asc: sorted(rows_, key=lambda r: r["run"]) for asc, rows_ in sorted(crab_rows.items())}
        if boss == "LAGAVULIN_MATRIARCH":
            out[boss]["sleep"] = {asc: sorted(rows_, key=lambda r: r["run"]) for asc, rows_ in sorted(lag_rows.items())}
        if boss == "WATERFALL_GIANT":
            out[boss]["kills"] = {asc: sorted(rows_, key=lambda r: (r["turn"] is None, r["turn"] or 0, r["run"])) for asc, rows_ in sorted(kills.items())}
        if boss == "QUEEN":
            out[boss]["amalgam"] = {asc: sorted(rows_, key=lambda r: r["run"]) for asc, rows_ in sorted(queen_rows.items())}
        if boss == "THE_INSATIABLE":
            out[boss]["deaths"] = {asc: sorted(rows_, key=lambda r: r["run"]) for asc, rows_ in sorted(sand_rows.items())}
    # Written whole, then moved into place: a run starting during the refresh reads the old file or the new one, never
    # half of one (boss-clock reads it once a process; unreadable, every record read "no logged fights" for the run,
    # and the first render of a day froze that for the day). The tmp name is this process's: two refreshes at once
    # (ops/report.py and ops/wait-run.sh) do not write into one file.
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    tmp = f"{args.out}.{os.getpid()}.tmp"
    with open(tmp, "w", encoding="utf8") as handle:
        json.dump(out, handle, ensure_ascii=False, indent=1, sort_keys=True)
        handle.write("\n")
    os.replace(tmp, args.out)
    print(f"{len(out)} bosses, {len(rows)} fights -> {args.out}")
    if args.fights:
        with open(args.fights, "w", encoding="utf8") as handle:
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
