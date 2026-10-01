#!/usr/bin/env python3
"""B5's report on tools/boss-sim/b5-lines.ts output (docs/boss-sim.md §14.7): on the logged turns of a boss's fights,
the line Jev chose against the whole-fight simulation's best line. Per version (V4.1 / V4.2 by the fight's time) and
overall: turns with numbers, turns where Jev's line was the best (or tied with it), within 2 standard errors of it, more
than 2 standard errors worse; the mean paired win-rate difference (raw samples) and the mean calibrated gap; and the
same on each fight's first turn with numbers. The mean gap over turns is an upper bound on what ranking by the
simulation would have added per decision, not a per-fight win-rate gain (the turns of a fight are not independent and
a later turn's state already carries the earlier choices).

Usage: python3 tools/boss-sim/b5-lines-report.py --in experiments/boss-sim/raw/b5-lines-crab.jsonl [--fights experiments/boss-sim/raw/fights-1002.jsonl]
         [--md experiments/boss-sim/b5-lines.md] [--json experiments/boss-sim/b5-lines.json] [--title 帝王蟹]
"""

import argparse
import json
import os
import statistics

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VERSIONS = [("V4.1", "2026-09-30 08:22:52", "2026-10-01 01:50:40"), ("V4.2", "2026-10-01 01:50:40", "9999")]


def block(rows):
    ok = [r for r in rows if r.get("available") and r.get("jev") and r.get("best")]
    if not ok:
        return None
    d = [r["jev"]["d"] for r in ok]
    worse = [r for r in ok if r["jev"]["d"] < -2 * r["jev"]["se"]]
    return {
        "turns": len(rows), "with_numbers": len(ok),
        "jev_best": sum(1 for r in ok if r["jev_is_best"]), "within_2se": sum(1 for r in ok if r["jev_within_2se"]), "worse_2se": len(worse),
        "mean_d": round(statistics.fmean(d), 4), "median_d": round(statistics.median(d), 4),
        "mean_cal_gap": round(statistics.fmean(r["best"]["cal"] - r["jev"]["cal"] for r in ok), 4),
        "mean_d_worse": round(statistics.fmean(r["jev"]["d"] for r in worse), 4) if worse else None,
        "timed_out": sum(1 for r in ok if r.get("timed_out")), "median_samples": statistics.median(r["samples"] for r in ok),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--in", dest="inp", required=True)
    parser.add_argument("--fights", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "fights-1002.jsonl"))
    parser.add_argument("--title", default="")
    parser.add_argument("--md")
    parser.add_argument("--json")
    args = parser.parse_args()
    when = {}
    with open(args.fights) as handle:
        for line in handle:
            if line.strip():
                r = json.loads(line)
                when[r["key"]] = r["first_ts"]
    rows = [json.loads(line) for line in open(args.inp) if line.strip()]
    groups = {name: [r for r in rows if lo <= when.get(r["key"], "") < hi] for name, lo, hi in VERSIONS}
    groups["合计"] = rows
    out = {"groups": {}, "first_turn": {}}
    for name, rs in groups.items():
        out["groups"][name] = block(rs)
        first = {}
        for r in sorted(rs, key=lambda r: (r["key"], r["turn"])):
            if r.get("available") and r.get("jev") and r["key"] not in first:
                first[r["key"]] = r
        out["first_turn"][name] = block(list(first.values()))
    lines = [f"# {args.title} Jev 选的线 vs 整场模拟的最优线（B5，{os.path.basename(args.inp)}）", "",
             "每个日志回合（Jev 规划过的第一个出牌决定），实盘规划器按 B5 的模拟重新出题，找到 Jev 当时选的线。差 = Jev 的线减最优线的配对胜率差（原始样本）；校准差 = 最优线减 Jev 的线的校准胜率。", "",
             "| 版本 | 回合（有数字） | Jev 选中最优或并列 | 2 个标准误内 | 差 2 个标准误以上（这些回合的平均差） | 平均差 / 中位差 | 平均校准差 | 每场第一个回合：平均校准差（场） |",
             "|---|---|---|---|---|---|---|---|"]
    for name, b in out["groups"].items():
        f = out["first_turn"][name]
        if not b:
            continue
        worse = f"{b['worse_2se']}（{b['mean_d_worse'] * 100:+.1f}）" if b["worse_2se"] else "0"
        lines.append(f"| {name} | {b['turns']}（{b['with_numbers']}） | {b['jev_best']} | {b['within_2se']} | {worse} | {b['mean_d'] * 100:+.1f} / {b['median_d'] * 100:+.1f} | "
                     f"{b['mean_cal_gap'] * 100:+.1f} | {f['mean_cal_gap'] * 100:+.1f}（{f['with_numbers']}） |")
    text = "\n".join(lines) + "\n"
    if args.md:
        with open(args.md, "w") as handle:
            handle.write(text)
    if args.json:
        with open(args.json, "w") as handle:
            json.dump(out, handle, ensure_ascii=False, indent=1)
    print(text)


if __name__ == "__main__":
    main()
