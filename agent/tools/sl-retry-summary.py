#!/usr/bin/env python3
"""Tables for notes/sl-retry-report.md from tools/sl-retry-replay.ts's rows (docs/sl.md §10).

Usage: python3 tools/sl-retry-summary.py experiments/sl-retry/deaths-*.jsonl [--noise <rows with off2/draws2/...>] [--real <real-clock rows>]
--noise: rows of the same decisions on other random numbers (the rollout's seed salted), merged by run, floor, attempt, turn: the
sampling noise of the chosen line (off vs off2: two 8-sample runs; both vs both2: two 24-sample runs with the known draws).

Per pair of variants (off -> draws, off -> compute, draws -> both, compute -> both): how often the decision's chosen line
changes (an ask: the question's rollout_best, or the set of lines tied for it; an act: code's label and first action),
how often the action taken now changes, the rollout's numbers for the chosen line (dead samples, expected further HP
loss), and the turns where a line no sample dies on is first in one variant and not in the other. Then the planning time
of each variant (with the frozen clock: the whole schedule, i.e. the time the samples need).
"""
import json
import statistics
import sys
from collections import Counter, defaultdict

PAIRS = [("off", "draws"), ("off", "compute"), ("draws", "both"), ("compute", "both"), ("off", "both"), ("off", "off2"), ("draws", "draws2"), ("compute", "compute2"), ("both", "both2")]


def load(paths):
    rows = []
    for path in paths:
        with open(path) as f:
            rows += [json.loads(line) for line in f if line.strip()]
    return rows


def chosen(arm):
    if arm is None:
        return None
    if arm["kind"] == "ask":
        if arm["best"]:
            return "BEST " + arm["best"]
        if arm.get("tied"):
            return "TIED " + " | ".join(sorted(arm["tied"]))
        return "NONE"
    return f"ACT {arm['label']} {arm['firstStep']}"


def first_action(arm):
    if arm is None:
        return None
    if arm["kind"] == "ask":
        if arm["best"]:
            return arm["best"].split(", ")[0]
        if arm.get("tied"):
            return " | ".join(sorted({t.split(", ")[0] for t in arm["tied"]}))
        return "NONE"
    return f"ACT {arm['firstStep']}"


def pct(n, d):
    return f"{n}/{d} ({100 * n / d:.0f}%)" if d else "0/0"


def best_line(arm):
    """The chosen line's rollout numbers: the best, else the first tied line's."""
    if arm is None or arm["kind"] != "ask":
        return None
    key = arm["best"] or (sorted(arm.get("tied") or []) or [None])[0]
    return arm["lines"].get(key) if key else None


def q(xs, p):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(p * len(xs)))] if xs else None


def main():
    args = sys.argv[1:]
    real, noise = [], []
    if "--real" in args:
        at = args.index("--real")
        real = load(args[at + 1 :])
        args = args[:at]
    if "--noise" in args:
        at = args.index("--noise")
        noise = load(args[at + 1 :])
        args = args[:at]
    rows = load(args)
    key = lambda r: (r["run"], r["floor"], r["attempt"], r["turn"])
    extra = {key(r): r["arms"] for r in noise}
    for r in rows:
        r["arms"].update(extra.get(key(r), {}))
    errors = [(r["run"], r["floor"], r["turn"], v, a["error"]) for r in rows for v, a in r["arms"].items() if a.get("error")]
    known = [r for r in rows if r["known"] and r["known"].get("ok") and r["known"].get("next", 0) > 0]
    fights = {(r["run"], r["floor"]) for r in rows}
    print(f"## rows\n\n{len(rows)} decisions in {len(fights)} fights; known draws on {pct(len(known), len(rows))} (next cards: median {statistics.median([r['known']['next'] for r in known]) if known else 0}); errors {len(errors)}")
    rooms = Counter(r["room"] for r in rows)
    print("rooms:", dict(rooms))
    off_reasons = Counter((r["known"] or {}).get("reason", "next 0" if (r["known"] or {}).get("ok") else "no known order").split(":")[0][:60] for r in rows if r not in known)
    print("no known draws:", dict(off_reasons))
    if errors:
        print("errors:", errors[:5])

    print("\n## chosen line changes (pairs; rows where both ran)\n")
    print("| pair | rows | rows with known draws | chosen line changes | action now changes | among rows with known draws: chosen / action |")
    print("|---|---|---|---|---|---|")
    for a, b in PAIRS:
        both = [r for r in rows if a in r["arms"] and b in r["arms"]]
        if not both:
            continue
        k = [r for r in both if r in known]
        ch = sum(chosen(r["arms"][a]) != chosen(r["arms"][b]) for r in both)
        fa = sum(first_action(r["arms"][a]) != first_action(r["arms"][b]) for r in both)
        chk = sum(chosen(r["arms"][a]) != chosen(r["arms"][b]) for r in k)
        fak = sum(first_action(r["arms"][a]) != first_action(r["arms"][b]) for r in k)
        print(f"| {a} -> {b} | {len(both)} | {len(k)} | {pct(ch, len(both))} | {pct(fa, len(both))} | {pct(chk, len(k))} / {pct(fak, len(k))} |")

    print("\n## ties (no single rollout best) per variant\n")
    for v in ["off", "draws", "compute", "both"]:
        arms = [r["arms"][v] for r in rows if v in r["arms"] and r["arms"][v]["kind"] == "ask"]
        if not arms:
            continue
        print(f"- {v}: {pct(sum(1 for x in arms if not x['best'] and x.get('tied')), len(arms))} of the questions tied")

    print("\n## the chosen line's rollout numbers (questions with a chosen line in both variants)\n")
    print("| pair | rows | dead share a -> b | further HP loss a -> b | best survives (0 dead) a -> b | survivor first only in b | only in a | a surviving line shown: a -> b |")
    print("|---|---|---|---|---|---|---|---|")
    for a, b in PAIRS:
        sel = [r for r in rows if best_line(r["arms"].get(a)) and best_line(r["arms"].get(b))]
        if not sel:
            continue
        la = [best_line(r["arms"][a]) for r in sel]
        lb = [best_line(r["arms"][b]) for r in sel]
        da = statistics.mean(x["deaths"] / max(1, x["samples"]) for x in la)
        db = statistics.mean(x["deaths"] / max(1, x["samples"]) for x in lb)
        ha = statistics.mean(x["hpLoss"] for x in la)
        hb = statistics.mean(x["hpLoss"] for x in lb)
        sa = sum(x["deaths"] == 0 for x in la)
        sb = sum(x["deaths"] == 0 for x in lb)
        only_b = sum(x["deaths"] > 0 and y["deaths"] == 0 for x, y in zip(la, lb))
        only_a = sum(x["deaths"] == 0 and y["deaths"] > 0 for x, y in zip(la, lb))
        anya = sum(r["arms"][a]["surviving"] > 0 for r in sel)
        anyb = sum(r["arms"][b]["surviving"] > 0 for r in sel)
        print(f"| {a} -> {b} | {len(sel)} | {da:.3f} -> {db:.3f} | {ha:.1f} -> {hb:.1f} | {sa} -> {sb} | {only_b} | {only_a} | {anya} -> {anyb} |")

    def status(arm):
        """The board as the rollout sees it: some shown line no sample dies on; every line dies in some samples; every line dies in every sample (saturated)."""
        lines = list((arm or {}).get("lines", {}).values())
        if not lines:
            return "no rollout"
        if any(x["deaths"] == 0 for x in lines):
            return "a line survives"
        if all(x["deaths"] >= x["samples"] for x in lines):
            return "every line dies in every sample"
        return "every line dies in some samples"

    print("\n## the board as the rollout sees it, off -> draws (questions with known draws)\n")
    trans = Counter()
    for r in known:
        if r["arms"].get("off", {}).get("kind") == "ask" and r["arms"].get("draws", {}).get("kind") == "ask":
            trans[(status(r["arms"]["off"]), status(r["arms"]["draws"]))] += 1
    print("| off | draws | questions |")
    print("|---|---|---|")
    for (x, y), n in sorted(trans.items(), key=lambda kv: -kv[1]):
        print(f"| {x} | {y} | {n} |")
    print("\nchosen line changes off -> draws by the off board's status (questions with known draws):\n")
    by = defaultdict(lambda: [0, 0, 0])
    for r in known:
        x, y = r["arms"].get("off"), r["arms"].get("draws")
        if not x or not y or x["kind"] != "ask":
            continue
        k = by[status(x)]
        k[0] += 1
        k[1] += chosen(x) != chosen(y)
        k[2] += first_action(x) != first_action(y)
    for st, (n, c, f) in by.items():
        print(f"- {st}: {n} questions, chosen line changes {pct(c, n)}, action now changes {pct(f, n)}")

    print("\n## code's own decisions (act) that change label between off and draws\n")
    trans = Counter()
    for r in known:
        x, y = r["arms"].get("off"), r["arms"].get("draws")
        if x and y and (x["kind"] == "act" or y["kind"] == "act") and (x["label"], x["kind"]) != (y["label"], y["kind"]):
            trans[f"{x['kind']} {x['label']} -> {y['kind']} {y['label']}"] += 1
    for t, n in trans.most_common():
        print(f"- {t}: {n}")

    print("\n## by room: chosen line changes off -> draws (rows with known draws), and survivor first only with the draws\n")
    print("| room | rows with known draws | chosen changes | action changes | survivor first only with draws | only without |")
    print("|---|---|---|---|---|---|")
    for room in sorted({r["room"] for r in known}):
        k = [r for r in known if r["room"] == room and "off" in r["arms"] and "draws" in r["arms"]]
        ch = sum(chosen(r["arms"]["off"]) != chosen(r["arms"]["draws"]) for r in k)
        fa = sum(first_action(r["arms"]["off"]) != first_action(r["arms"]["draws"]) for r in k)
        sel = [r for r in k if best_line(r["arms"]["off"]) and best_line(r["arms"]["draws"])]
        ob = sum(best_line(r["arms"]["off"])["deaths"] > 0 and best_line(r["arms"]["draws"])["deaths"] == 0 for r in sel)
        oa = sum(best_line(r["arms"]["off"])["deaths"] == 0 and best_line(r["arms"]["draws"])["deaths"] > 0 for r in sel)
        print(f"| {room} | {len(k)} | {pct(ch, len(k))} | {pct(fa, len(k))} | {ob} | {oa} |")

    def timing(rs, title):
        print(f"\n## planning time per decision, s ({title})\n")
        print("| variant | room | n | median | p90 | max |")
        print("|---|---|---|---|---|---|")
        by = defaultdict(list)
        for r in rs:
            for v, a in r["arms"].items():
                by[(v, r["room"])].append(a["ms"] / 1000)
                by[(v, "all")].append(a["ms"] / 1000)
        for (v, room), xs in sorted(by.items()):
            print(f"| {v} | {room} | {len(xs)} | {statistics.median(xs):.1f} | {q(xs, 0.9):.1f} | {max(xs):.1f} |")

    timing(rows, "frozen clock: every schedule run whole, so the time the samples need")
    if real:
        timing(real, "real clock: the live budgets")
        print("\n## real clock: rollout samples and horizon reached\n")
        by = defaultdict(Counter)
        for r in real:
            for v, a in r["arms"].items():
                by[v][f"{a['samples']}x{a['horizon']}"] += 1
        for v, c in by.items():
            print(f"- {v}: {dict(c.most_common())}")


main()
