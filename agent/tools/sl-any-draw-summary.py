#!/usr/bin/env python3
"""Summary of tools/sl-any-draw-replay.ts (SL_JUDGE_ANY_DRAW, docs/sl.md section 2.3).

Usage: python3 tools/sl-any-draw-summary.py experiments/sl-any-draw/any-draw-[0-9].jsonl

Reads the replay rows (one per least-loss decision on a board the mod flags as lethal, planned again by the current code)
and prints, for the end_turn judgment and the early reload apart: the boards the draw veto kept from certain (switch off),
how many the bound makes certain (and how: nothing to draw, the drawing card's own cost, the superset board), the turn's
outcome in the logs for each (a certain verdict where the game did not kill us would be wrong), why the others stay not
certain, and the bound's solve times.
"""
import collections
import glob
import json
import sys


def load(patterns):
    rows = []
    for pattern in patterns:
        for path in sorted(glob.glob(pattern)):
            rows += [json.loads(line) for line in open(path)]
    return rows


def how(row):
    bound = row.get("bound") or {}
    if bound.get("no_draw"):
        return "nothing to draw (" + bound["no_draw"] + ")"
    if bound.get("fatal"):
        return "the drawing card's own cost"
    if bound.get("superset"):
        return "superset board" + (" (no line past the draw)" if bound["superset"]["inexact"] else " (exact)")
    return "?"


def why_not(reason):
    rest = reason.split("not with any draw: ")[-1]
    for key, name in [("drawing or changing the draw pile mid-turn", "a relic or power draws or changes the pile mid-turn"),
                      ("a line lives on the superset board", "a line lives on the superset board (a draw may save us)"),
                      ("cut short", "the superset search was cut short"), ("Dark Embrace", "Dark Embrace"), ("a random potion", "a random potion"),
                      ("not simulated exactly, and a line has HP left", "not exact, and a line lives past the draw"),
                      ("not a plain draw", "No Draw, but a card takes from a pile"), ("Tungsten Rod", "Tungsten Rod"), ("Beating Remnant", "Beating Remnant"),
                      ("Feel No Pain or Cloak Clasp", "a status in the pile with Feel No Pain / Cloak Clasp"), ("acts when", "something acts on draws"),
                      ("Intangible", "Intangible"), ("not listed", "the pile is not listed"), ("no bound", "no bound")]:
        if key in rest:
            return name
    return rest[:70]


def section(title, rows, off_key, on_key):
    vetoed = [r for r in rows if off_key in r and "draws (unknown cards)" in r[off_key]["reason"] and not r[off_key]["certain"]]
    if off_key == "early_off":
        vetoed = [r for r in rows if off_key in r and not r[off_key]["certain"] and ("draws (unknown cards)" in r[off_key]["reason"] or "a line draws cards not exactly known" in r[off_key]["reason"])]
    certain = [r for r in vetoed if r[on_key]["certain"]]
    print(f"\n## {title}\n")
    print(f"- vetoed by unknown draws (switch off): {len(vetoed)} boards in {len({(r['run'], r['floor'], r['attempt'], r['turn']) for r in vetoed})} turns; outcomes {dict(collections.Counter(r['outcome'] for r in vetoed))}")
    print(f"- certain with the switch on: {len(certain)} boards in {len({(r['run'], r['floor'], r['attempt'], r['turn']) for r in certain})} turns; outcomes {dict(collections.Counter(r['outcome'] for r in certain))}")
    print(f"- how: {dict(collections.Counter(how(r) for r in certain))}")
    wrong = [r for r in certain if r["outcome"] != "died"]
    print(f"- WRONG (certain, not a death): {len(wrong)}")
    for r in wrong:
        print(f"  - {r['run']} F{r['floor']} attempt {r['attempt']} T{r['turn']} {r['outcome']}: {r[on_key]['reason'][-200:]}")
    missed = collections.Counter(why_not(r[on_key]["reason"]) for r in vetoed if not r[on_key]["certain"])
    print("\nstill not certain:\n")
    print("| why | boards |\n|---|---|")
    for key, n in missed.most_common():
        print(f"| {key} | {n} |")
    print("\ncertain boards:\n")
    print("| fight | attempt | turn | logged | how | superset cards | positions | bound ms | outcome |\n|---|---|---|---|---|---|---|---|---|")
    for r in certain:
        sup = (r.get("bound") or {}).get("superset") or {}
        print(f"| {r['run']} F{r['floor']} A{r['asc']} | {r['attempt']} | T{r['turn']} | {r['logged']['action']} | {how(r)} | {sup.get('cards', '')} | {sup.get('nodes', '')} | {(r.get('bound') or {}).get('ms', '')} | {r['outcome']} |")


def main():
    rows = load(sys.argv[1:] or ["experiments/sl-any-draw/any-draw-[0-9].jsonl"])
    print(f"# SL_JUDGE_ANY_DRAW offline evaluation\n\n{len(rows)} least-loss decisions on flagged boards, errors {sum(1 for r in rows if r.get('error') or r.get('bound_error'))}")
    end_turn = [r for r in rows if r["logged"]["action"] == "end_turn" and r["planned"]["action"] == "end_turn"]
    section("end_turn boards (logged end_turn, planned end_turn: the live end_turn judgment)", end_turn, "end_off", "end_on")
    section("early reload (least-loss card or potion boards: judgeLeastLossNow)", rows, "early_off", "early_on")
    times = sorted(r["bound"]["ms"] for r in rows if r.get("bound"))
    sup = sorted(r["bound"]["ms"] for r in rows if r.get("bound") and r["bound"].get("superset"))
    if times:
        pct = lambda xs, p: xs[min(len(xs) - 1, int(p * len(xs)))]
        print(f"\n## bound time\n\n- every bound worked out: {len(times)}, median {pct(times, 0.5)} ms, p90 {pct(times, 0.9)} ms, max {times[-1]} ms")
        if sup:
            print(f"- superset solves: {len(sup)}, median {pct(sup, 0.5)} ms, p90 {pct(sup, 0.9)} ms, max {sup[-1]} ms; cut short by time {sum(1 for r in rows if r.get('bound') and (r['bound'].get('superset') or {}).get('timedOut'))}, by nodes {sum(1 for r in rows if r.get('bound') and (r['bound'].get('superset') or {}).get('truncated') and not r['bound']['superset'].get('timedOut'))}")


main()
