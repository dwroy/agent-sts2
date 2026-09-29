#!/usr/bin/env python3
"""The two follow-up runs: a second sample of the failure-origin questions (results-rep2.jsonl, arms A/B/C)
and arm C through a local plain-HTTP relay (results-c-relay.jsonl), which removes dsh's ~10 s stall."""
import json, statistics
from pathlib import Path

import analyze as an  # reuses the classifiers (prints the main tables first; that output is ignored by callers)

DATA = Path(__file__).resolve().parent / "data"
main = {(r["id"], r["arm"]): r for r in map(json.loads, open(DATA / "results.jsonl"))}
rep = {(r["id"], r["arm"]): r for r in map(json.loads, open(DATA / "results-rep2.jsonl"))}
relay = {r["id"]: r for r in map(json.loads, open(DATA / "results-c-relay.jsonl"))}

print("\n\n# follow-up runs\n")
ids = sorted({i for i, _ in rep})
rows = []
for arm in "ABC":
    have = [i for i in ids if (i, arm) in rep]
    raw = [an.category(*an.first_attempt(rep[(i, arm)])) for i in have]
    fin = [an.final_category(rep[(i, arm)]) for i in have]
    same = 0
    for i in have:
        k = an.choice_key(an.final_answer(rep[(i, arm)]), an.ds[i]["kind"])
        k0 = an.choice_key(an.final_answer(main[(i, arm)]), an.ds[i]["kind"])
        same += k is not None and k == k0
    rows.append([arm, len(have), sum(1 for c in raw if c and c != "minor"), sum(1 for c in raw if c == "minor"), sum(1 for c in fin if c and c != "minor"), f"{same}/{len(have)}"])
print("## second sample of the 16 failure-origin questions\n")
print(an.md_table(["arm", "n", "raw fail", "minor", "fail after recovery", "same answer as 1st sample"], rows))
for arm in "ABC":
    for i in ids:
        r = rep.get((i, arm))
        if r is None:
            continue
        c = an.category(*an.first_attempt(r))
        if c:
            print(f"- {arm} {i} {an.ds[i]['label']}: first answer {c}; after recovery {an.final_category(r)}")

print("\n## arm C through a local relay (no dsh stall) vs the main run on the same questions\n")
rids = sorted(relay)
def lat(r):
    return an.latency(r)
def out(r):
    return sum(c["out"] for c in an.calls_of(r))
series = {
    "A": [lat(main[(i, "A")]) for i in rids],
    "B": [lat(main[(i, "B")]) for i in rids],
    "C direct": [lat(main[(i, "C")]) for i in rids],
    "C relay": [relay[i]["runMs"] / 1000 for i in rids],
}
outs = {
    "A": [out(main[(i, "A")]) for i in rids],
    "B": [out(main[(i, "B")]) for i in rids],
    "C direct": [out(main[(i, "C")]) for i in rids],
    "C relay": [out(relay[i]) for i in rids],
}
rows = []
for name, xs in series.items():
    o = outs[name]
    tps = [oo / x for oo, x in zip(o, xs) if x > 0]
    rows.append([name, len(xs), f"{an.pct(xs, .5):.1f}", f"{an.pct(xs, .95):.1f}", f"{statistics.mean(o):,.0f}", f"{statistics.median(tps):.0f}"])
print(an.md_table(["run", "n", "p50 s", "p95 s", "mean output tokens", "median output tokens/s"], rows))
ok = sum(1 for i in rids if relay[i].get("accepted") is not None)
retries = sum(1 for i in rids if len([a for a in relay[i]["attempts"] if a["event"] in ("invalid", "no_tool_call")]) > 0)
print(f"\nC relay: accepted {ok}/{len(rids)}, needed a retry {retries}")
small = [(i, series["C direct"][k], series["C relay"][k], outs["C direct"][k], outs["C relay"][k]) for k, i in enumerate(rids) if outs["C direct"][k] < 800 or outs["C relay"][k] < 800]
for s in small:
    print(f"- short answer {s[0]}: direct {s[1]:.1f}s/{s[3]} tok, relay {s[2]:.1f}s/{s[4]} tok")
