"""Summary of tools/sl-start-loss-replay.ts: the SL judge on the logged boards with our own HP loss at the next turn's start up
(Inferno, Crimson Mantle), before and after a change.

Usage: python3 tools/sl-start-loss-summary.py [experiments/sl-start-loss] > experiments/sl-start-loss/summary.md
Reads <dir>/start-loss-before.jsonl and <dir>/start-loss-after.jsonl (one row per decision board with the power up).
Outcome of a board at turn T: survived (a later turn of the attempt acted), won (the fight ended won, no later action), died
(GAME_OVER, no later action), reloaded (an SL reload followed, no later action: the death not seen). WRONG: certain, and
the board did not die (survived, won, or an event / the log's end after it).
"""
import json
import re
import sys
from collections import Counter

DIR = sys.argv[1] if len(sys.argv) > 1 else "experiments/sl-start-loss"


def load(tag):
    with open(f"{DIR}/start-loss-{tag}.jsonl", encoding="utf8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def short(reason):
    return re.sub(r"\d+", "N", reason or "")[:130]


def timeless(reason):
    """The reason without its timings (the any-draw bound's "N positions, N ms"): those differ run to run."""
    return re.sub(r"\d+ positions, \d+ ms|\d+ ms", "", reason or "")


def kind(r):
    if r["inferno"] > 9:
        return "Inferno x2+"
    if r["inferno"] > 0:
        return "Inferno x1" + (" + Mantle" if r["mantle"] > 0 else "")
    return "Mantle only"


before, after = load("before"), load("after")
key = lambda r: (r["run"], r["floor"], r["attempt"], r["ts"])
b_by = {key(r): r for r in before}
missing = [r for r in after if key(r) not in b_by]
fights = sorted({(r["run"], r["floor"]) for r in after})
print("# SL judge on the boards with our own HP loss at the next turn's start (tools/sl-start-loss-replay.ts)\n")
print(f"{len(fights)} fights with INFERNO_POWER or CRIMSON_MANTLE_POWER on us; {len(after)} decision boards with it up ({dict(Counter(kind(r) for r in after))}); "
      f"rows missing before: {len(missing)}; errors {sum(1 for r in after if r.get('error'))}.")
print("Outcome of a board at turn T: survived = a later turn of the attempt acted; won = the fight ended won with no later action; died = GAME_OVER with no later action;")
print("reloaded = an SL reload followed with no later action (the death not seen). WRONG = certain after, and the board did not die (survived, won, or EVENT / ?: the fight ended into an event, the log ends).\n")

KINDS = ("Inferno x2+", "Inferno x1", "Inferno x1 + Mantle", "Mantle only")
for field, title in (
    ("end_logged", "end_turn boards (logged end_turn, logged label: the live end_turn judgment)"),
    ("end_planned", "end_turn boards (the current planner's end_turn and label; planned where the mod flags or our count dies)"),
    ("early", "early reload (the current planner's least-loss card or potion: judgeLeastLossNow)"),
):
    rows = [r for r in after if r[field]]
    print(f"## {title}\n")
    print("| | boards | certain before | certain after | after: died | after: reloaded | after: WRONG |")
    print("|---|---|---|---|---|---|---|")
    for k in KINDS:
        sel = [r for r in rows if kind(r) == k]
        if not sel:
            continue
        cb = sum(1 for r in sel if b_by.get(key(r)) and b_by[key(r)][field] and b_by[key(r)][field]["certain"])
        ca = [r for r in sel if r[field]["certain"]]
        print(f"| {k} | {len(sel)} ({dict(Counter(r['outcome'] for r in sel))}) | {cb} | {len(ca)} | {sum(1 for r in ca if r['outcome'] == 'died')} | "
              f"{sum(1 for r in ca if r['outcome'] == 'reloaded')} | {sum(1 for r in ca if r['outcome'] not in ('died', 'reloaded'))} |")
    new = [r for r in rows if r[field]["certain"] and not (b_by.get(key(r)) and b_by[key(r)][field] and b_by[key(r)][field]["certain"])]
    lost = [r for r in rows if not r[field]["certain"] and b_by.get(key(r)) and b_by[key(r)][field] and b_by[key(r)][field]["certain"]]
    print(f"\nNewly certain: {len(new)} ({dict(Counter(r['outcome'] for r in new))}); no longer certain: {len(lost)} ({dict(Counter(r['outcome'] for r in lost))}).\n")
    if new or lost:
        print("| change | fight | A | attempt | turn | HP | block | Inferno | Mantle | outcome | before | after |")
        print("|---|---|---|---|---|---|---|---|---|---|---|---|")
        for tagname, sel in (("new", new), ("lost", lost)):
            for r in sel:
                b = b_by[key(r)][field] if b_by.get(key(r)) else None
                a = r[field]
                print(f"| {tagname} | {r['run']} F{r['floor']} | {r['asc']} | {r['attempt']} | T{r['turn']} | {r['hp']} | {r['block']} | {r['inferno']} | {r['mantle']} | {r['outcome']} | "
                      f"{('certain' if b['certain'] else 'not: ' + b['reason'][:70]) if b else '-'} | {('certain (' + str(a['tier']) + '): ' + a['reason'][-110:]) if a['certain'] else 'not: ' + a['reason'][:110]} |")
        print()
    changed = Counter(short(r[field]["reason"]) for r in rows if b_by.get(key(r)) and b_by[key(r)][field] and timeless(r[field]["reason"]) != timeless(b_by[key(r)][field]["reason"]) and not r[field]["certain"])
    if changed:
        print("Not certain after, the reason changed (timings aside):\n")
        print("| reason after | boards |")
        print("|---|---|")
        for reason, n in changed.most_common():
            print(f"| {reason} | {n} |")
        print()
    print("Not certain after, by kind, outcome and reason (top 25):\n")
    print("| kind | outcome | reason | boards |")
    print("|---|---|---|---|")
    for (k, outcome, reason), n in Counter((kind(r), r["outcome"], short(r[field]["reason"])) for r in rows if not r[field]["certain"]).most_common(25):
        print(f"| {k} | {outcome} | {reason} | {n} |")
    print()

# Each logged end_turn with the loss up that ended in a death (in the enemy turn or at the next turn's start).
print("## Each logged end_turn with the loss up that ended in a death (the enemy turn or the next turn's start)\n")
print("| fight | A | attempt | turn | HP | block | incoming | Inferno | Mantle | before | after |")
print("|---|---|---|---|---|---|---|---|---|---|---|")
for r in after:
    if r["end_logged"] and r["outcome"] == "died":
        b = b_by[key(r)]["end_logged"] if b_by.get(key(r)) else None
        a = r["end_logged"]
        print(f"| {r['run']} F{r['floor']} | {r['asc']} | {r['attempt']} | T{r['turn']} | {r['hp']} | {r['block']} | {a['incoming']} | {r['inferno']} | {r['mantle']} | "
              f"{('certain' if b['certain'] else 'not: ' + b['reason'][:60]) if b else '-'} | {('certain (' + str(a['tier']) + ')') if a['certain'] else 'not: ' + a['reason'][:100]} |")
