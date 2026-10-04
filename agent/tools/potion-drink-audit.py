"""Every logged potion drink Jev chose outside a boss fight since the potion cost went live (its options carry a potion_cost
fact, Dai 2026-09-30): the path that offered it, the cost the chosen option paid, whether DeepSeek's run plan had words on
potions in the question (run_plan_on_potions, Jev's prompt), and whether it saved a death (the no-potion line died more
often in the rollout). Reads logs/decisions.jsonl, logs/jev-prompts.jsonl and the log DB's fights (room, outcome). No model.

Usage: python3 tools/potion-drink-audit.py [--case RUN:FLOOR ...] > experiments/potion-drink-audit/summary.md
"""
import json
import re
import subprocess
import sys
from collections import Counter
import os
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])  # the project root (docs/layout.md)

CASES = [arg for i, arg in enumerate(sys.argv) if i > 0 and sys.argv[i - 1] == "--case"]
DEAD = re.compile(r"dead within \d+ turns in (\d+)/(\d+)")
COST = re.compile(r"potion cost ([\d.]+) HP")
SAMPLES = re.compile(r"\((\d+) samples?\)")


def fights():
    out = subprocess.run([os.path.join(ROOT, "data/logdb-venv/bin/python"), os.path.join(ROOT, "agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "1000000", "--timeout", "300",
                          "SELECT run_id, floor, room, outcome FROM fights"], capture_output=True, text=True, check=True)
    return {(r[0], r[1]): {"room": r[2], "outcome": r[3]} for r in json.loads(out.stdout)["rows"]}


def deaths(option):
    text = str(option.get("rollout") or "")
    m = DEAD.search(text)
    if m:
        return int(m.group(1)), int(m.group(2))
    s = SAMPLES.search(text)
    return (0, int(s.group(1))) if s else None


def drinks_of(plays):
    if plays.startswith("drink "):
        m = re.match(r"drink (.+?)(?: now| on |,|$)", plays)
        return [m.group(1) if m else plays[6:30]]
    return re.findall(r"potion ([^,(]+?)(?: ->|,|$| \()", plays)


def main():
    rooms = fights()
    rows = []
    with open(os.path.join(ROOT, "logs/decisions.jsonl"), encoding="utf8") as fh:
        for line in fh:
            if '"COMBAT"' not in line or "potion_cost" not in line:
                continue
            d = json.loads(line)
            label = d.get("label") or ""
            if d.get("screen") != "COMBAT" or not label.startswith("combat/plan-choice") or d.get("decider") not in ("jev", "deepseek", "claude"):
                continue
            criteria = ((d.get("questions") or {}).get("plan") or {}).get("criteria") or {}
            key = ((d.get("answers") or {}).get("plan") or {}).get("choice")
            if key not in criteria:
                continue
            try:
                chosen = json.loads(criteria[key])
            except (TypeError, ValueError):
                continue
            plays = str(chosen.get("plays") or "")
            drunk = drinks_of(plays)
            if not drunk:
                continue
            fight = rooms.get((d.get("run_id"), d.get("floor")), {})
            options = {}
            for k, v in criteria.items():
                try:
                    options[k] = json.loads(v)
                except (TypeError, ValueError):
                    pass
            no_potion = next((o for o in options.values() if o.get("no_potion_fight")), None)
            cost_text = str(chosen.get("potion_cost") or "")
            m = COST.search(cost_text) or re.search(r"drinking it costs ([\d.]+) HP", cost_text)
            rows.append({
                "run": d.get("run_id"), "floor": d.get("floor"), "turn": d.get("turn"), "room": fight.get("room"), "outcome": fight.get("outcome"),
                "id": d.get("decision_id"), "drunk": drunk, "random": plays.startswith("drink "), "added": "rollout's best line, added" in (d.get("rationale") or ""),
                "rollout_best": chosen.get("rollout_best") is True, "cost": float(m.group(1)) if m else None, "boss_cost": "boss fight" in cost_text,
                "saturated": "every line loses all our HP" in str(chosen.get("rollout") or ""), "deaths": deaths(chosen),
                "no_potion_deaths": deaths(no_potion) if no_potion else None, "plays": plays[:160], "cost_text": cost_text[:220],
            })
    ids = {r["id"] for r in rows}
    plans = {}
    with open(os.path.join(ROOT, "logs/jev-prompts.jsonl"), encoding="utf8") as fh:
        for line in fh:
            if "run_plan_on_potions" not in line:
                continue
            m = re.search(r'"decision_id": ?"([^"]+)"', line)
            if m and m.group(1) in ids:
                t = re.search(r'run_plan_on_potions\\?": ?\\?"(.*?)\\?"(?:,|\})', line)
                plans[m.group(1)] = t.group(1) if t else "?"
    for r in rows:
        r["run_plan"] = plans.get(r["id"])
    out = [r for r in rows if r["room"] != "boss" and not r["boss_cost"]]
    paid = [r for r in out if (r["cost"] or 0) > 0]
    free = [r for r in out if (r["cost"] or 0) == 0]
    saving = [r for r in out if r["deaths"] and r["no_potion_deaths"] and r["deaths"][0] / r["deaths"][1] < r["no_potion_deaths"][0] / r["no_potion_deaths"][1]]
    sat = [r for r in out if r["saturated"]]
    sat_fights = {(r["run"], r["floor"]): r["outcome"] for r in sat}
    print("# Potions Jev drank outside a boss fight, and what each paid (tools/potion-drink-audit.py)\n")
    print(f"Chosen options that drink, with a potion_cost fact (potion cost live): {len(rows)}; outside a boss fight {len(out)}.\n")
    print(f"- Offered by: a solver line {sum(1 for r in out if not r['random'] and not r['added'])}, the rollout's added best line {sum(1 for r in out if r['added'])}, a random potion's \"drink now\" {sum(1 for r in out if r['random'])}; flagged rollout_best {sum(1 for r in out if r['rollout_best'])}.")
    print(f"- Paid the table's held value (cost > 0 in the chosen option's total): {len(paid)}; 0: {len(free)}, every one on a board where the line's samples all die or every line loses all our HP ({sum(1 for r in free if r['saturated'] or (r['deaths'] and r['deaths'][0] == r['deaths'][1]))} of {len(free)}): rollout.ts valueAt / pickRolloutBest, no later for the potion there (decision log 2026-09-30 15:24, open for Dai).")
    print(f"- Saturated boards (every line loses all our HP: ranked without costs): {len(sat)} choices in {len(sat_fights)} fights, {sum(1 for o in sat_fights.values() if o == 'won')} of them won.")
    print(f"- The run plan's words on potions were in the question (run_plan_on_potions): {sum(1 for r in out if r['run_plan'])}.")
    print(f"- Death-saving (the chosen line died less often than the no-potion line within the horizon): {len(saving)}.\n")
    if CASES:
        print("## Cases\n")
        print("| run F | T | potion | path | cost paid | chosen: deaths | no-potion line: deaths | run plan on potions |")
        print("|---|---|---|---|---|---|---|---|")
        for case in CASES:
            run, floor = case.split(":")
            for r in [r for r in rows if r["run"].startswith(run) and str(r["floor"]) == floor]:
                d = f"{r['deaths'][0]}/{r['deaths'][1]}" if r["deaths"] else "?"
                n = f"{r['no_potion_deaths'][0]}/{r['no_potion_deaths'][1]}" if r["no_potion_deaths"] else "-"
                path = "random potion" if r["random"] else "rollout's added line" if r["added"] else "solver line"
                print(f"| {r['run'][:4]} F{r['floor']} | {r['turn']} | {', '.join(r['drunk'])} | {path} | {r['cost_text']} | {d} | {n} | {(r['run_plan'] or '-')[:200].replace('|', '/')} |")


main()
