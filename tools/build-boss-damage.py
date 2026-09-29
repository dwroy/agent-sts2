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

    out = {}
    for boss in sorted(pooled):
        acc = pooled[boss]
        if acc["shown"] <= 0:
            continue
        out[boss] = {"unblocked_share": round(acc["lost"] / acc["shown"], 3), "fights": acc["fights"], "turns": acc["turns"],
                     "shown": acc["shown"], "hp_lost": acc["lost"]}
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
