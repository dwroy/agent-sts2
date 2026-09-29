#!/usr/bin/env python3
"""How much of the act bosses' shown damage got through our block, from logs/states.jsonl ->
src/knowledge/boss-damage.json (and, with --fights, one JSON line per boss fight for the backtest).

For every logged boss fight (every ascension): the frame at the start of each of our turns gives our HP
and the boss's shown attack for the coming enemy turn (its intents' damage x hits, Strength and our
Vulnerable in). The HP lost from one turn's start to the next (our own HP costs and heals included), over
the attack shown, summed over the fights, is the share of the boss's damage that got through: our play,
not the monster. The boss clock multiplies the boss's own damage at the current ascension (monster DB)
by it (strategy/boss-clock.ts bossLossPerTurn).

The fight rows (--fights FILE) carry: key, boss, ascension, outcome (won when the run got past the boss's
floor, or the run was won on it: a win ends on the final boss's floor), turns, entry_hp, final_hp,
loss_per_turn ((entry - final) / turns), for tools/boss-loss-backtest.ts.

Also per boss, by ascension (the counts the guides and boss notes quote, filled from here by strategy/boss-clock.ts
instead of hand-written: 2026-09-29 knowledge check): by_asc {fights, won, entry_pct_won, entry_pct_lost};
KAISER_CRAB.first_death (the claw that died first while the other lived, or null); LAGAVULIN_MATRIARCH.sleep
(the turn it woke, the share of its HP lost by then, the deck's lasting-Strength cards); WATERFALL_GIANT.kills.

Only states that name a boss enemy are read (grep), not the whole file.

Usage: tools/build-boss-damage.py [--logs DIR] [--fights FILE] [--out FILE]
"""
import argparse
import collections
import json
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src/knowledge/boss-damage.json")

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
    parser.add_argument("--out", default=OUT)
    args = parser.parse_args()

    runs = {}
    with open(os.path.join(args.logs, "runs.jsonl"), encoding="utf8") as handle:
        for line in handle:
            try:
                run = json.loads(line)
            except ValueError:
                continue
            runs[run.get("run_id")] = run

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
    for line in grep.stdout:
        try:
            state = json.loads(line)["state"]
        except (ValueError, KeyError):
            continue
        combat = state.get("combat") or {}
        run = state.get("run") or {}
        if not state.get("in_combat") or not combat:
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
    with open(args.out, "w", encoding="utf8") as handle:
        json.dump(out, handle, ensure_ascii=False, indent=1, sort_keys=True)
        handle.write("\n")
    print(f"{len(out)} bosses, {len(rows)} fights -> {args.out}")
    if args.fights:
        with open(args.fights, "w", encoding="utf8") as handle:
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
