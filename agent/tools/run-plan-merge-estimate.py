#!/usr/bin/env python3
"""RUN_PLAN_MERGE from the logs (notes/run-plan-merge.md). Read-only; calls no model.

1. Separate run-plan calls (rows of run-plans.jsonl with latency_ms): per trigger their latency, the DeepSeek question
   that came next in the run (brain.jsonl), how many floors later, the decisions in between (decisions.jsonl) and the
   fights among them (Jev calls), and the ones whose next room was the act boss (still asked on their own).
2. Merged run plans (rows with merged_into, after RUN_PLAN_MERGE went live): per trigger and carrier, stored or not, and
   the carrier's output tokens and latency against the same label's questions that carried no run plan: the
   reasoning the plan added to the question, to set against the separate call it replaced.

Usage: nice python3 tools/run-plan-merge-estimate.py [--logs logs] [--since 2026-10-01T23:27] [--until ...]
(--since default: V4.3, decision-log 2026-10-02 07:27 local = 23:27 UTC.)
"""

import argparse
import collections
import json
import os
import statistics
from datetime import datetime, timedelta
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])  # the project root (docs/layout.md)


def parse_ts(text):
    return datetime.fromisoformat(text.replace("Z", "+00:00"))


def rows(path, since, until, prefix='{"ts":"'):
    """The rows of a JSONL log with since <= ts < until (ts is the first field of every row of these logs)."""
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            if not line.startswith(prefix):
                continue
            ts = line[len(prefix):line.find('"', len(prefix))]
            if ts < since or (until and ts >= until):
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue  # a torn line


BOSS_FLOORS = (17, 33, 48)


def floor_of(payload):
    if not isinstance(payload, dict):
        return None
    for key in ("facts", "run_state", "run_brief"):
        block = payload.get(key)
        if isinstance(block, dict) and isinstance(block.get("floor"), int):
            return block["floor"]
    return None


def pct(values, q):
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(q * len(ordered)))] if ordered else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--logs", default=os.path.join(ROOT, "logs"))
    ap.add_argument("--since", default="2026-10-01T23:27")
    ap.add_argument("--until", default="")
    args = ap.parse_args()
    join = lambda name: os.path.join(args.logs, name)

    plans = list(rows(join("run-plans.jsonl"), args.since, args.until))
    brain = []
    for row in rows(join("brain.jsonl"), args.since, args.until):
        usage = row.get("usage") or {}
        payload = row.get("payload")
        brain.append({
            "ts": row["ts"], "run": row.get("run_id"), "label": row.get("label"), "lat": (row.get("latency_ms") or 0) / 1000,
            "out": usage.get("outputTokens") or 0, "floor": floor_of(payload), "reasks": row.get("reasks") or 0,
            "carries": isinstance(payload, dict) and isinstance(payload.get("run_plan_task"), dict),
        })
    decisions = collections.defaultdict(list)
    for row in rows(join("decisions.jsonl"), args.since, args.until):
        decisions[row.get("run_id")].append((parse_ts(row.get("observed_ts") or row["ts"]), row.get("label") or "", row.get("decider")))
    by_run = collections.defaultdict(list)
    for row in sorted(brain, key=lambda b: b["ts"]):
        by_run[row["run"]].append(row)

    # ---- 1. separate calls ------------------------------------------------------------------------
    separate = [p for p in plans if "plan" in p and "merged_into" not in p and p.get("latency_ms")]
    found = []
    for plan in separate:
        end = parse_ts(plan["ts"])
        seen = parse_ts(plan.get("observed_ts") or plan["ts"])
        carrier = None
        for question in by_run[plan["run"]]:
            if question["label"] in ("run-plan", "fight-plan"):
                continue
            if parse_ts(question["ts"]) - timedelta(seconds=question["lat"]) >= end - timedelta(seconds=1):
                carrier = question
                break
        between = []
        if carrier:
            start = parse_ts(carrier["ts"]) - timedelta(seconds=carrier["lat"])
            between = [d for d in decisions[plan["run"]] if seen <= d[0] < start]
        found.append({"trigger": plan.get("trigger"), "lat": plan["latency_ms"] / 1000, "floor": plan.get("floor"), "carrier": carrier,
                      "decisions": len(between), "jev": sum(1 for d in between if d[2] == "jev")})
    runs = {p["run"] for p in separate}
    print(f"# separate run-plan calls since {args.since}: {len(separate)} in {len(runs)} runs, {sum(f['lat'] for f in found):.0f} s")
    for trigger in ("start", "act", "hp_drop", "review", None):
        group = [f for f in found if trigger is None or f["trigger"] == trigger]
        if not group:
            continue
        lat = [f["lat"] for f in group]
        carried = [f for f in group if f["carrier"]]
        later = collections.Counter(f["carrier"]["floor"] - f["floor"] if f["carrier"] and f["carrier"]["floor"] is not None and f["floor"] is not None else "none" for f in group)
        print(f"{trigger or 'all':8s} n={len(group):3d}  latency median {statistics.median(lat):5.1f} s  p90 {pct(lat, .9):5.1f}  max {max(lat):5.1f}  sum {sum(lat):6.0f}")
        print(f"         next question: {collections.Counter(f['carrier']['label'] if f['carrier'] else None for f in group).most_common()}")
        # The act boss fought between the plan and the next question (its card reward on a boss floor): still asked on its own.
        boss = [f for f in carried if f["jev"] > 0 and f["carrier"]["label"] == "reward/card" and f["carrier"]["floor"] in BOSS_FLOORS]
        print(f"         floors later: {dict(later)}; decisions between: median {statistics.median([f['decisions'] for f in carried]) if carried else '-'}, max {max([f['decisions'] for f in carried], default='-')}; with a fight between: {sum(1 for f in carried if f['jev'] > 0)} ({sum(f['jev'] for f in carried)} Jev calls), the act boss {len(boss)} ({sum(f['lat'] for f in boss):.0f} s)")

    # ---- 2. merged plans --------------------------------------------------------------------------
    merged = [p for p in plans if "merged_into" in p]
    print(f"\n# merged run plans: {len(merged)} rows ({sum(1 for p in merged if 'plan' in p)} stored, {sum(1 for p in merged if 'error' in p)} without a usable plan)")
    if not merged:
        return
    print("by trigger and carrier:", collections.Counter((p.get("trigger"), p.get("merged_into"), "stored" if "plan" in p else "missing") for p in merged).most_common())
    plain = collections.defaultdict(list)
    for question in brain:
        if not question["carries"] and question["reasks"] == 0:
            plain[question["label"]].append(question)
    print("carrier vs the same label without a run plan (single-attempt questions):")
    for label in sorted({p.get("merged_into") for p in merged}):
        carriers = [p["question"] for p in merged if p.get("merged_into") == label and isinstance(p.get("question"), dict)]
        base = plain.get(label, [])
        if not carriers or not base:
            continue
        out = statistics.median([c.get("output_tokens") or 0 for c in carriers])
        lat = statistics.median([(c.get("latency_ms") or 0) / 1000 for c in carriers])
        base_out = statistics.median([b["out"] for b in base])
        base_lat = statistics.median([b["lat"] for b in base])
        print(f"  {label:18s} n={len(carriers):3d} output median {out:7.0f} vs {base_out:7.0f} (n={len(base)})  latency median {lat:5.1f} s vs {base_lat:5.1f} s  -> the plan added ~{lat - base_lat:+.1f} s")


if __name__ == "__main__":
    main()
