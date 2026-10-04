#!/usr/bin/env python3
"""DeepSeek overrides of Jev, grouped by decision type -> notes/corrections.md.

For turning recurring DeepSeek judgments into code rules: every escalation where the fallback model
disagreed with Jev, with the options, code's own ranking (when the screen has one) and the reason.
Usage: ops/corrections.py [--since 2026-09-24T07:05] [--by deepseek]
"""
import argparse
import collections
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import LOGS, ROOT  # noqa: E402
DEC = os.path.join(LOGS, "decisions.jsonl")
OUT = os.path.join(ROOT, "notes/corrections.md")

ap = argparse.ArgumentParser()
ap.add_argument("--since", default="2026-09-24T07:05")
ap.add_argument("--by", default="deepseek")
args = ap.parse_args()


def option_name(raw):
    try:
        d = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return str(raw)[:40]
    if not isinstance(d, dict):
        return str(d)[:40]
    name = d.get("card") or d.get("buy") or d.get("option") or d.get("node_type") or d.get("plan") or ""
    score = next((d[k] for k in ("code_value", "code_score", "score", "route_value") if isinstance(d.get(k), (int, float))), None)
    return f"{name}({score})" if score is not None else str(name)[:40]


groups = collections.defaultdict(list)
for line in open(DEC, encoding="utf8"):
    try:
        r = json.loads(line)
    except json.JSONDecodeError:
        continue
    e = r.get("escalation")
    if r.get("mode") != "play" or not e or r["ts"] < args.since or e.get("by", "deepseek") != args.by:
        continue
    choice = e.get("choice", e.get("deepseek_choice"))
    if choice == e.get("jev_choice"):
        continue
    qs = r.get("questions") or {}
    q = next(iter(qs.values()), None)
    crit = (q or {}).get("criteria", {})
    groups[r["label"]].append((r, e, choice, crit))

lines = [f"# {args.by} 纠正 Jev 的决策（{args.since} 起）", ""]
for label, items in sorted(groups.items(), key=lambda kv: -len(kv[1])):
    lines.append(f"## {label}（{len(items)} 次）")
    for r, e, choice, crit in items:
        opts = "；".join(f"{k}={option_name(v)}" for k, v in crit.items())
        lines.append(f"- {r['ts'][:16]} 第{r.get('floor')}层：Jev {e.get('jev_choice')}@{e.get('jev_confidence', 0):.2f} → {choice}。{e.get('reason', '')}")
        lines.append(f"  - 选项：{opts[:400]}")
    lines.append("")
with open(OUT, "w", encoding="utf8") as handle:
    handle.write("\n".join(lines))
print(f"{sum(len(v) for v in groups.values())} overrides in {len(groups)} labels -> {OUT}")
