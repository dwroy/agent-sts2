#!/usr/bin/env python3
"""The logged Insatiable (The Insatiable, act-2 boss) plan questions with rollout facts, for tools/insatiable-replay.ts
and the Frantic Escape calibration (does the rollout undervalue Escape against the Sandpit).

One row per logged combat/plan-choice[+potion] decision on THE_INSATIABLE with the rollout available: its states.jsonl
offset (the frame logged at the decision's timestamp), its decisions.jsonl offset, the run / floor / turn / attempt, the
board's Sandpit and Frantic Escapes (in hand: count, cheapest cost, energy; in the draw and discard piles), the option
Jev picked, and for each option shown its logged facts: the plays, whether they play Frantic Escape, the Sandpit after
the enemy turn, and the rollout's numbers as logged (win chance, value, wins and deaths within the horizon, samples).

The outcome is the attempt's: with save/load retries (sl_attempts) the result of the attempt the decision belongs to
(won, else lost), otherwise the fight's.

Reads the log database (tools/logdb/query.py --no-sync) and logs/states.jsonl / logs/decisions.jsonl at the rows'
byte offsets, all read-only.
Usage: data/logdb-venv/bin/python tools/insatiable-lines.py OUT.jsonl
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])  # the project root (docs/layout.md)
QUERY = os.path.join(ROOT, "agent", "tools", "logdb", "query.py")
STATES = os.path.join(ROOT, "logs", "states.jsonl")
DECISIONS = os.path.join(ROOT, "logs", "decisions.jsonl")
ESCAPE_NAME = "狂乱逃离"


def q(sql):
    out = subprocess.run([sys.executable, QUERY, "--no-sync", "--json", "--max-rows", "1000000", "--timeout", "300", sql], capture_output=True, text=True, cwd=ROOT)
    d = json.loads(out.stdout)
    if "error" in d:
        raise SystemExit(d["error"])
    return [dict(zip(d["columns"], r)) for r in d["rows"]]


def line_at(path, off):
    with open(path, "rb") as h:
        h.seek(off)
        return json.loads(h.readline())


def num(pattern, text, cast=float):
    m = re.search(pattern, text or "")
    return cast(m.group(1)) if m else None


def rollout_numbers(text):
    """The logged rollout sentence of one option (rollout-live rolloutFacts) as numbers."""
    if not text:
        return None
    samples = num(r"\((\d+) samples", text, int)
    return {
        "horizon": num(r"(\d+)-turn rollout", text, int),
        "samples": samples,
        "win": num(r"win chance ~(\d+)%", text),
        "value": num(r"value (-?[\d.]+)", text),
        "loss": num(r"expected further HP loss (-?[\d.]+)", text),
        "wins": num(r"fight over within \d+ turns in (\d+)/", text, int),
        "deaths": num(r"dead within \d+ turns in (\d+)/", text, int),
    }


def sandpit_of(enemy):
    for p in enemy.get("powers") or []:
        if p.get("power_id") == "SANDPIT_POWER":
            return p.get("amount")
    return None


def pile_escapes(view, pile):
    n = 0
    costs = []
    for entry in (view or {}).get(pile) or []:
        if "FRANTIC_ESCAPE" not in (entry.get("card_ids") or []):
            continue
        line = entry.get("line") or ""
        count = int((re.search(r"^[^\[：:]*?\*(\d+)\s*\[", line) or [None, 1])[1])
        cost = re.search(r"\[(-?\d+)费\]", line)
        n += count
        costs += [int(cost.group(1)) if cost else None] * count
    return n, costs


def board(state):
    combat = state.get("combat") or {}
    player = combat.get("player") or {}
    boss = next((e for e in combat.get("enemies") or [] if e.get("enemy_id") == "THE_INSATIABLE"), {})
    hand = [c for c in combat.get("hand") or [] if c.get("card_id") == "FRANTIC_ESCAPE"]
    view = (state.get("agent_view") or {}).get("combat") or {}
    draw_n, draw_costs = pile_escapes(view, "draw")
    disc_n, disc_costs = pile_escapes(view, "discard")
    return {
        "hp": player.get("current_hp"),
        "maxHp": player.get("max_hp"),
        "block": player.get("block"),
        "energy": player.get("energy"),
        "bossHp": boss.get("current_hp"),
        "bossMove": boss.get("move_id"),
        "sandpit": sandpit_of(boss),
        "handEscapes": len(hand),
        "handEscapeCosts": [c.get("energy_cost") for c in hand],
        "drawEscapes": draw_n,
        "drawEscapeCosts": draw_costs,
        "discardEscapes": disc_n,
        "discardEscapeCosts": disc_costs,
    }


def main(out_path):
    fights = q("SELECT run_id, floor, ascension, outcome, first_ts, last_ts FROM fights WHERE encounter = 'THE_INSATIABLE' ORDER BY first_ts")
    attempts = q("SELECT run_id, floor, attempt, result, started_at, ended_at FROM sl_attempts WHERE encounter = 'THE_INSATIABLE' ORDER BY ts")
    rows = []
    for fight in fights:
        decs = q(f"""SELECT d.off doff, d.ts, d.turn, d.label, d.rollout_best, f.off foff FROM decisions d
          LEFT JOIN frames f ON f.run_id = d.run_id AND f.ts = d.ts
          WHERE d.run_id = '{fight['run_id']}' AND d.floor = {fight['floor']} AND d.screen = 'COMBAT'
            AND d.label LIKE 'combat/plan-choice%' AND d.rollout_available ORDER BY d.off""")
        mine = [a for a in attempts if a["run_id"] == fight["run_id"] and a["floor"] == fight["floor"]]
        seen_turns = set()
        for d in decs:
            if d["foff"] is None:
                continue
            attempt = next((a for a in mine if a["started_at"] <= d["ts"] <= (a["ended_at"] or "9999")), None)
            won = (attempt["result"] == "won") if attempt else (fight["outcome"] == "won")
            raw = line_at(DECISIONS, d["doff"])
            question = (raw.get("questions") or {}).get("plan") or {}
            answer = ((raw.get("answers") or {}).get("plan") or {}).get("choice")
            options = {}
            for key, text in (question.get("criteria") or {}).items():
                try:
                    fact = json.loads(text)
                except (TypeError, ValueError):
                    continue
                plays = fact.get("plays") or ""
                options[key] = {
                    "plays": plays,
                    "escapes": plays.count(ESCAPE_NAME),
                    "sandpitAfter": fact.get("sandpit_after_enemy_turn"),
                    "hpAfter": fact.get("hp_after"),
                    "dealt": fact.get("damage_dealt"),
                    "rolloutBest": fact.get("rollout_best") is True,
                    "rolloutText": fact.get("rollout"),
                    "rollout": rollout_numbers(fact.get("rollout")),
                }
            state = line_at(STATES, d["foff"])["state"]
            key = (attempt["attempt"] if attempt else 0, d["turn"])
            rows.append({
                "run": fight["run_id"], "floor": fight["floor"], "asc": fight["ascension"], "turn": d["turn"], "ts": d["ts"],
                "attempt": attempt["attempt"] if attempt else None, "firstOfTurn": key not in seen_turns,
                "off": d["foff"], "decisionOff": d["doff"], "label": d["label"], "won": won,
                "chosen": answer, "board": board(state), "options": options,
            })
            seen_turns.add(key)
    with open(out_path, "w") as out:
        for r in rows:
            out.write(json.dumps(r, ensure_ascii=False) + "\n")
    with_escape = sum(1 for r in rows if any(o["escapes"] > 0 for o in r["options"].values()))
    print(len(rows), "questions from", len(fights), "fights;", with_escape, "with an Escape option")


if __name__ == "__main__":
    main(sys.argv[1])
