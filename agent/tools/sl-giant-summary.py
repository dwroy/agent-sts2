"""Summary of tools/sl-giant-replay.ts: the SL judge on the logged Waterfall Giant husk boards, before and after a change.

Usage: python3 tools/sl-giant-summary.py [experiments/sl-giant] [giant|insatiable] > experiments/sl-giant/summary[-insatiable].md
Reads <dir>/<boss>-before.jsonl and <dir>/<boss>-after.jsonl (tools/sl-giant-replay.ts --boss: one row per decision on a
husk turn, or in an Insatiable fight).
"""
import json
import re
import sys
from collections import Counter

DIR = sys.argv[1] if len(sys.argv) > 1 else "experiments/sl-giant"
BOSS = sys.argv[2] if len(sys.argv) > 2 else "giant"


def load(tag):
    with open(f"{DIR}/{BOSS}-{tag}.jsonl", encoding="utf8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def short(reason):
    return re.sub(r"\d+", "N", reason or "")[:120]


before, after = load("before"), load("after")
key = lambda r: (r["run"], r["attempt"], r["ts"])
b_by = {key(r): r for r in before}
fights = sorted({(r["run"], r["floor"]) for r in after})
if BOSS == "giant":
    print("# SL judge on the Waterfall Giant husk boards (tools/sl-giant-replay.ts)\n")
    print(f"{len(fights)} fights reached the husk; {len(after)} decisions on husk turns ({dict(Counter(r['phase'] for r in after))}); errors {sum(1 for r in after if r.get('error'))}.")
    print("Outcome: died = GAME_OVER after the blast turn, won = the rewards after it, survived = a turn that was not the last.\n")
else:
    print("# SL judge on the Insatiable boards (tools/sl-giant-replay.ts --boss insatiable)\n")
    print(f"{len(fights)} fights, {len({(r['run'], r['floor'], r['attempt']) for r in after})} attempts; {len(after)} decision boards; errors {sum(1 for r in after if r.get('error'))}.")
    print("Phase: the Sandpit count on the board. Outcome: died = the attempt ended in that turn with GAME_OVER or an SL reload, won = the fight won in that turn, survived = a turn that was not the last, ? = the log ends there.\n")
    for r in after:
        r["phase"] = "sandpit 1" if r.get("sandpit") == 1 else "other"

for field, title in (("end_logged", "end_turn boards (logged end_turn, logged label: the live end_turn judgment)"), ("end_planned", "end_turn boards (the current planner's end_turn and label)"), ("early", "early reload (the current planner's least-loss card or potion: judgeLeastLossNow)")):
    rows = [r for r in after if r[field]]
    print(f"## {title}\n")
    print("| | boards | certain before | certain after | after: died | after: WRONG (certain, not a death) |")
    print("|---|---|---|---|---|---|")
    for phase in (("blast", "about") if BOSS == "giant" else ("sandpit 1", "other")):
        sel = [r for r in rows if r["phase"] == phase]
        if not sel:
            continue
        cb = sum(1 for r in sel if b_by.get(key(r)) and b_by[key(r)][field] and b_by[key(r)][field]["certain"])
        ca = [r for r in sel if r[field]["certain"]]
        print(f"| {phase} | {len(sel)} ({dict(Counter(r['outcome'] for r in sel))}) | {cb} | {len(ca)} | {sum(1 for r in ca if r['outcome'] == 'died')} | {sum(1 for r in ca if r['outcome'] != 'died')} |")
    print("\nnot certain after, by outcome and reason:\n")
    print("| phase | outcome | reason | boards |")
    print("|---|---|---|---|")
    for (phase, outcome, reason), n in Counter((r["phase"], r["outcome"], short(r[field]["reason"])) for r in rows if not r[field]["certain"]).most_common():
        print(f"| {phase} | {outcome} | {reason} | {n} |")
    print()

if BOSS != "giant":
    print("## Each end_turn at Sandpit 1\n")
    print("| fight | A | attempt | turn | HP | block | incoming | outcome | before | after |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for r in after:
        if r["end_logged"] and r.get("sandpit") == 1:
            b = b_by[key(r)]["end_logged"]
            a = r["end_logged"]
            print(f"| {r['run']} F{r['floor']} | {r['asc']} | {r['attempt']} | T{r['turn']} | {r['hp']} | {r['block']} | {r['end_logged']['incoming']} | {r['outcome']} | {'certain' if b['certain'] else 'not'}: {b['reason'][:60]} | {'certain (' + str(a['tier']) + ')' if a['certain'] else 'not: ' + a['reason'][:80]} |")
    changed = [r for r in after if any(r[f] and b_by[key(r)][f] and r[f]["reason"] != b_by[key(r)][f]["reason"] for f in ("end_logged", "end_planned", "early"))]
    print(f"\nBoards whose verdict or reason changed: {len(changed)}, all at Sandpit 1: {all(r.get('sandpit') == 1 for r in changed)}.")
    sys.exit(0)
print("## Each blast turn that ended in a death\n")
print("| fight | A | turn | HP | block | blast | certain after | how / why not |")
print("|---|---|---|---|---|---|---|---|")
for run, floor in fights:
    rows = [r for r in after if r["run"] == run and r["phase"] == "blast"]
    if not rows or rows[-1]["outcome"] != "died":
        continue
    end = next((r for r in rows if r["end_logged"]), rows[-1])
    early = next((r for r in rows if r["early"] and r["early"]["certain"]), None)
    certain_end = end["end_logged"] and end["end_logged"]["certain"]
    how = []
    if early:
        how.append(f"early at {early['ts'][11:19]} (before {', '.join(early['facts']['line']) if early.get('facts') else '?'})")
    if certain_end:
        how.append(f"end_turn: {end['end_logged']['tier']}")
    if not how:
        how.append(f"not: {end['end_logged']['reason'][:110] if end['end_logged'] else '?'}")
    print(f"| {run} F{floor} | {end['asc']} | T{end['turn']} | {end['hp']} | {end['block']} | {end['blast']} | {'yes' if early or certain_end else 'no'} | {'; '.join(how)} |")
print()
print("## Blast turns flagged lethal by the mod that we lived through\n")
print("| fight | turn | HP | block | blast | outcome | after: verdict at end_turn |")
print("|---|---|---|---|---|---|---|")
for r in after:
    if r["phase"] == "blast" and r["end_logged"] and r["flag"] and r["outcome"] != "died":
        print(f"| {r['run']} F{r['floor']} | T{r['turn']} | {r['hp']} | {r['block']} | {r['blast']} | {r['outcome']} | {r['end_logged']['certain']}: {r['end_logged']['reason'][:100]} |")
