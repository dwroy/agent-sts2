#!/usr/bin/env python3
"""Summary of tools/sl-early-replay.ts (SL_RELOAD_EARLY, SL_JUDGE_KNOWN_DRAWS; notes/sl-retry-report.md section 9).

Usage: python3 tools/sl-early-summary.py experiments/sl-early/early-[0-9].jsonl [--self experiments/sl-early/early-self-*.jsonl]

Reads the replay rows (one per logged decision on a board the mod flags as lethal, planned again by the current code) and
prints: the least-loss boards and what kept the early reload from them; every early-certain board and the turn's outcome
in the logs (an early reload where the game did not kill us would have been wrong); the SL death turns (A8+ boss fights
and the listed ones) the early reload catches, how many steps and seconds before the turn's end_turn (the decisions'
timestamps from the log DB, read-only); and the end_turn verdicts SL_JUDGE_KNOWN_DRAWS changes.
"""
import collections
import glob
import json
import subprocess
import sys
from datetime import datetime
import os
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])  # the project root (docs/layout.md)

PY = os.path.join(ROOT, "data/logdb-venv/bin/python")


def load(patterns):
    rows = []
    for pattern in patterns:
        for path in sorted(glob.glob(pattern)):
            rows += [json.loads(line) for line in open(path)]
    return rows


def query(sql):
    out = subprocess.run([PY, os.path.join(ROOT, "agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "500000", "--timeout", "300", sql], capture_output=True, text=True, check=True).stdout
    data = json.loads(out)
    return [dict(zip(data["columns"], row)) for row in data["rows"]]


def ts(text):
    return datetime.fromisoformat(text)


def is_least_loss_step(row):
    return row["planned"] and row["planned"]["label"] == "combat/least-loss" and row["planned"]["action"] != "end_turn"


def category(reason):
    prefix = "not before the line is played: "
    if reason.startswith(prefix):
        rest = reason[len(prefix):]
        for key, name in [("chance in the verdict (a random potion", "a random potion"), ("chance in the verdict (a line draws", "a line draws unknown cards"),
                          ("has a random effect", "a random card"), ("is not modelled", "an unmodelled card"), ("plays or makes a card", "a card played from the top / made"),
                          ("Juggernaut", "Juggernaut"), ("Kusarigama", "Kusarigama"), ("Hellraiser", "Hellraiser"),
                          ("a line draws cards not exactly known", "a line draws unknown cards"), ("cards were added", "cards added to the pile"),
                          ("acting by chance", "a relic or power acting by chance"), ("acting mid-turn", "a relic or power the planner does not model"),
                          ("hitting the enemies at the end", "end-of-turn damage relic or power"), ("shows no intent", "intent not shown"), ("is not a plain one", "intent not shown"),
                          ("facts", "no facts")]:
            if key in rest:
                return "early only: " + name
        return "early only: " + rest[:50]
    for key, name in [("draws (unknown cards)", "judge: a playable card draws"), ("special phase", "judge: special phase"), ("Ripple Basin", "judge: Ripple Basin"),
                      ("own count survives", "judge: own count survives"), ("revive", "judge: a revive"), ("up", "judge: Buffer / Intangible"),
                      ("does not flag", "judge: the mod does not flag it")]:
        if key in reason:
            return name
    return "judge: " + reason[:50]


def main():
    args = sys.argv[1:]
    self_patterns = []
    if "--self" in args:
        at = args.index("--self")
        self_patterns = args[at + 1:]
        args = args[:at]
    rows = load(args)
    print(f"## rows\n\n{len(rows)} decisions on flagged boards, errors {sum(1 for r in rows if r.get('error'))}\n")

    steps = [r for r in rows if is_least_loss_step(r)]
    early = [r for r in steps if r["early"] and r["early"]["certain"]]
    sl = lambda r: r["listed"] and r["asc"] >= 8
    print("## least-loss boards (a card or potion first)\n")
    print(f"- all fights: {len(steps)} boards, early-certain {len(early)}; SL fights (A8+ boss and listed): {sum(1 for r in steps if sl(r))} boards, early-certain {sum(1 for r in early if sl(r))}")
    print(f"- outcome of the turn after an early-certain board: {dict(collections.Counter(r['outcome'] for r in early))}")
    wrong = [r for r in early if r["outcome"] != "died"]
    for r in wrong:
        print(f"  - WRONG: {r['run']} F{r['floor']} {r['room']} A{r['asc']} attempt {r['attempt']} T{r['turn']} ({r['outcome']}): {r['early']['reason'][:160]}")
    print("\nwhat kept the early reload from the other least-loss boards (all fights / SL fights):\n")
    cats = collections.Counter(category(r["early"]["reason"]) for r in steps if not (r["early"] and r["early"]["certain"]))
    cats_sl = collections.Counter(category(r["early"]["reason"]) for r in steps if sl(r) and not (r["early"] and r["early"]["certain"]))
    print("| reason | all | SL |\n|---|---|---|")
    for key, n in cats.most_common():
        print(f"| {key} | {n} | {cats_sl.get(key, 0)} |")

    # Turns: (run, floor, attempt, turn).
    turns = collections.defaultdict(list)
    for r in rows:
        turns[(r["run"], r["floor"], r["attempt"], r["turn"])].append(r)
    death = {k: v for k, v in turns.items() if v[0]["outcome"] == "died" and sl(v[0])}
    print(f"\n## SL death turns (A8+ boss and listed fights; the attempt ended in that turn with a death or an SL reload)\n\n{len(death)} turns with a flagged board")

    def end_row(group):
        ends = [r for r in group if r["planned"] and r["planned"]["action"] == "end_turn"]
        return ends[-1] if ends else None

    stats = collections.Counter()
    saved = []
    for key, group in sorted(death.items()):
        group = sorted(group, key=lambda r: r["ts"])
        end = end_row(group)
        end_certain = end is not None and end["end_turn"]["certain"]
        first = next((r for r in group if is_least_loss_step(r) and r["early"]["certain"]), None)
        stats["end_turn judge certain"] += 1 if end_certain else 0
        if first is None:
            stats["no early reload"] += 1
            continue
        stats["early reload"] += 1
        if not end_certain:
            stats["early reload, end_turn judge not certain (a new catch)"] += 1
        saved.append((key, first, end))
    for k, v in stats.items():
        print(f"- {k}: {v}")

    if saved:
        # Steps and seconds from the early decision to the turn's end (its end_turn or the SL reload row), from the log DB.
        runs = sorted({k[0] for k, _, _ in saved})
        decisions = query(
            "SELECT run_id, floor, turn, ts, action, label, result FROM decisions WHERE run_id IN (" + ", ".join(f"'{r}'" for r in runs) + ") AND turn IS NOT NULL AND screen IN ('COMBAT', 'CARD_SELECTION') ORDER BY ts"
        )
        by = collections.defaultdict(list)
        for d in decisions:
            by[(d["run_id"], d["floor"])].append(d)
        lines = []
        for (run, floor, attempt, turn), first, end in saved:
            start = ts(first["ts"])
            later = [d for d in by[(run, floor)] if ts(str(d["ts"])) >= start]
            stop = next((d for d in later if d["action"] == "end_turn" or d["turn"] != turn), None)
            if stop is None or stop["turn"] != turn:
                continue
            acts = [d for d in later if ts(str(d["ts"])) < ts(str(stop["ts"])) and d["action"] in ("play_card", "use_potion", "select_deck_card", "select_card")]
            seconds = (ts(str(stop["ts"])) - start).total_seconds()
            lines.append((run, floor, attempt, turn, len(acts), seconds, str(stop["result"] or "")[:40]))
        print("\nper caught death turn: actions skipped and seconds from the early decision to the turn's end_turn\n")
        print("| fight | attempt | turn | actions skipped | seconds saved | end |\n|---|---|---|---|---|---|")
        for run, floor, attempt, turn, n, s, res in lines:
            print(f"| {run} F{floor} | {attempt} | T{turn} | {n} | {s:.1f} | {res} |")
        if lines:
            ns = sorted(x[4] for x in lines)
            ss = sorted(x[5] for x in lines)
            print(f"\n{len(lines)} turns: actions skipped median {ns[len(ns)//2]}, total {sum(ns)}; seconds median {ss[len(ss)//2]:.1f}, mean {sum(ss)/len(ss):.1f}, max {max(ss):.1f}, total {sum(ss):.0f}")

    lifted = [r for r in rows if r["end_turn"]["certain"] and not r["end_turn_old"]["certain"]]
    print(f"\n## SL_JUDGE_KNOWN_DRAWS (the logged retries' known draws)\n\nend_turn verdicts the known draws make certain: {len(lifted)}; outcomes {dict(collections.Counter(r['outcome'] for r in lifted))}")
    if self_patterns:
        selfrows = load(self_patterns)
        ends = [r for r in selfrows if r["planned"] and r["planned"]["action"] == "end_turn"]
        lifted = [r for r in ends if r["end_turn"]["certain"] and not r["end_turn_old"]["certain"]]
        print(f"\nthe SL fights as their own retries (--known self): {len(ends)} end_turn boards flagged lethal; the draw veto lifted on {len(lifted)}, outcomes {dict(collections.Counter(r['outcome'] for r in lifted))}")
        for r in lifted[:20]:
            print(f"  - {r['run']} F{r['floor']} T{r['turn']} ({r['outcome']}): known {r['known']}; {r['end_turn']['reason'][-110:]}")
        early_self = [r for r in selfrows if is_least_loss_step(r) and r["early"]["certain"]]
        print(f"- early-certain boards as retries: {len(early_self)}, outcomes {dict(collections.Counter(r['outcome'] for r in early_self))}")


if __name__ == "__main__":
    main()
