#!/usr/bin/env python3
"""B5's policy grid on the tune fights (docs/boss-sim.md §14): for each backtest of the grid (tools/boss-sim/backtest.ts
--set tune, one policy setting each), at turn 1, turn 5 and the pre-fight start: the raw Brier (B1.5 / B4's rule), the
calibrated Brier with the Platt map fitted out of fold (5 folds by run, so the tune fights score a map they were not fit
on), the mean forecast against the actual win rate, and the HP through block simulated / logged on turns 2-7 (overall
and on the bosses the lookahead is for). Nothing here touches the validation fights.

Usage: python3 tools/boss-sim/b5-grid.py --run 'g0=experiments/boss-sim/raw/g0/results-*.jsonl' --run ... [--md OUT.md]
"""

import argparse
import json
import math
import os
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from calib import fit_platt, platt, summarize, turns_of  # noqa: E402
from report import load  # noqa: E402

FOCUS = {"CRUSHER+ROCKET": "帝王蟹", "QUEEN+TORCH_HEAD_AMALGAM": "女王", "THE_INSATIABLE": "无厌沙虫", "WATERFALL_GIANT": "瀑布巨兽"}
STARTS = ("t1", "t5", "pre")
FOLDS = 5


def cv_brier(rows, tune):
    """{start: Brier} on the tune fights, each fold's rows mapped by a Platt fit on the other folds (folds by run)."""
    out = {}
    for start in STARTS:
        mine = [r for r in rows if r["start"] == start and r.get("sim") and r["key"] in tune]
        fold = lambda r: zlib.crc32(r["key"].split(":")[0].encode()) % FOLDS  # noqa: E731
        pairs = []
        for f in range(FOLDS):
            ab = fit_platt([r for r in mine if fold(r) != f])
            pairs += [(r["sim"]["winProb"], 1 if r["actual"]["won"] else 0) for r in platt([r for r in mine if fold(r) == f], ab)]
        out[start] = sum((p - y) ** 2 for p, y in pairs) / len(pairs)
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--run", action="append", required=True)
    parser.add_argument("--split", default=os.path.join(ROOT, "experiments", "boss-sim", "split.json"))
    parser.add_argument("--turns", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "turns-1002.jsonl"))
    parser.add_argument("--md")
    args = parser.parse_args()
    split = json.load(open(args.split))
    tune = set(split["tune"])
    turns = turns_of(args.turns)
    lines = ["| 配置 | 原始 Brier t1 / t5 / 战前（和） | 折外校准 Brier t1 / t5 / 战前（和） | 预测平均 / 实际（t1） | 被打穿比 t1 整体 | "
             + " | ".join(f"{name} t1 被打穿比" for name in FOCUS.values()) + " | 四个 boss 的 Σ|ln 比| |",
             "|---|---|---|---|---|" + "---|" * len(FOCUS) + "---|"]
    for item in args.run:
        name, pattern = item.split("=", 1)
        rows = load(pattern)
        s = summarize(rows, turns, tune)
        cv = cv_brier(rows, tune)
        raw = [s[st]["brier"] for st in STARTS]
        leaks = [s["t1"]["by_boss"][enc]["leak"]["enemy_ratio"] for enc in FOCUS]
        dist = sum(abs(math.log(x)) for x in leaks if x)
        lines.append(f"| {name} | {' / '.join(f'{b:.4f}' for b in raw)}（{sum(raw):.4f}） | {' / '.join(f'{cv[st]:.4f}' for st in STARTS)}（{sum(cv.values()):.4f}） | "
                     f"{s['t1']['mean_pred']:.3f} / {s['t1']['actual_win']:.3f} | {s['t1']['leak']['enemy_ratio']} | " + " | ".join(str(x) for x in leaks) + f" | {dist:.3f} |")
    text = "\n".join(lines) + "\n"
    if args.md:
        with open(args.md, "w") as handle:
            handle.write(text)
    print(text)


if __name__ == "__main__":
    main()
