#!/usr/bin/env python3
"""Which bosses the whole-fight simulator is trusted on, from its validation numbers (B4, docs/boss-sim.md §13).

For each boss, on the validation fights (experiments/boss-sim/split.json, `--set`, default val_ext) of one backtest
(tools/boss-sim/backtest.ts output, Platt map fitted on the tune fights as calib.py --platt does), at the start point
each consumer uses (B2's line numbers: turn 1, `t1`; B3's build questions: the pre-fight start, `pre`), a boss is trusted
when all of these hold:

  - n:     at least MIN_FIGHTS validation fights;
  - brier: its calibrated Brier at most BRIER_RATIO x the overall calibrated Brier at that start;
  - gap:   the mean calibrated forecast within MAX_GAP of its actual win rate;
  - leak:  the HP the enemy turns took through our block (turns 2-7 from the start, calib.py leak) within LEAK_RANGE of
           the log's, simulated / logged.

The criteria were fixed before the B4 fixes were validated. Writes the numbers, the criteria and the two lists (B2:
LOW_TRUST_BOSSES in English, B3: LOW_CONFIDENCE in Chinese, the failed criteria as the reason) to src/sim/boss-trust.json,
which src/sim/boss-trust.ts reads, and a table to --md.

Usage: python3 tools/boss-sim/trust.py --results 'experiments/boss-sim/raw/NAME/results-*.jsonl' [--set val_ext]
         [--out src/sim/boss-trust.json] [--md experiments/boss-sim/b4-trust.md] [--source 'text naming the run']
"""

import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from calib import summarize, turns_of  # noqa: E402
from report import load  # noqa: E402

MIN_FIGHTS = 10
BRIER_RATIO = 1.25
MAX_GAP = 0.15
LEAK_RANGE = (0.70, 1.30)
STARTS = {"b2": "t1", "b3": "pre"}

# The encounter (fights view) to the boss key the live code uses (boss-lines bossKeyOf, boss-start bossKey).
BOSS_KEYS = {
    "CRUSHER+ROCKET": "KAISER_CRAB", "KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST": "THE_KIN", "QUEEN+TORCH_HEAD_AMALGAM": "QUEEN",
    "AEONGLASS": "AEONGLASS", "CEREMONIAL_BEAST": "CEREMONIAL_BEAST", "KNOWLEDGE_DEMON": "KNOWLEDGE_DEMON",
    "LAGAVULIN_MATRIARCH": "LAGAVULIN_MATRIARCH", "SOUL_FYSH": "SOUL_FYSH", "TEST_SUBJECT": "TEST_SUBJECT",
    "THE_INSATIABLE": "THE_INSATIABLE", "VANTOM": "VANTOM", "WATERFALL_GIANT": "WATERFALL_GIANT",
}


# The game's names (monster DB); the older reports call some of them 永恒镜 / 贪得无厌者 / 幻影墨 / 灵魂鱼.
NAMES = {
    "CRUSHER+ROCKET": "帝王蟹", "QUEEN+TORCH_HEAD_AMALGAM": "女王", "THE_INSATIABLE": "无厌沙虫", "KNOWLEDGE_DEMON": "知识恶魔",
    "AEONGLASS": "永世沙漏", "TEST_SUBJECT": "实验体", "WATERFALL_GIANT": "瀑布巨兽", "CEREMONIAL_BEAST": "仪式兽",
    "KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST": "同族", "LAGAVULIN_MATRIARCH": "乐加维林族母", "SOUL_FYSH": "灵魂异鱼", "VANTOM": "墨影幻灵",
}


def judge(b, overall_brier):
    """The criteria a boss's block fails, as (key, English, Chinese) reasons; [] when trusted."""
    fails = []
    n = b["n"]
    if n < MIN_FIGHTS:
        fails.append(("n", f"only {n} validation fights (at least {MIN_FIGHTS} needed)", f"验证集只有 {n} 场（至少要 {MIN_FIGHTS} 场）"))
    limit = round(BRIER_RATIO * overall_brier, 4)
    if b["brier"] > limit:
        fails.append(("brier", f"calibrated Brier {b['brier']:.3f} over {limit:.3f} ({BRIER_RATIO}x the overall {overall_brier:.3f})",
                      f"校准 Brier {b['brier']:.3f}，高于整体 {overall_brier:.3f} 的 {BRIER_RATIO} 倍 {limit:.3f}"))
    gap = b["mean_pred"] - b["actual_win"]
    if abs(gap) > MAX_GAP:
        side = "too optimistic" if gap > 0 else "too pessimistic"
        side_zh = "偏乐观" if gap > 0 else "偏悲观"
        fails.append(("gap", f"{side}: forecast {b['mean_pred']:.0%} won, {b['actual_win']:.0%} won in the log",
                      f"{side_zh}：预测平均胜率 {b['mean_pred']:.0%}，实际 {b['actual_win']:.0%}"))
    ratio = b["leak"].get("enemy_ratio")
    if ratio is not None and not (LEAK_RANGE[0] <= ratio <= LEAK_RANGE[1]):
        more = "more" if ratio > 1 else "less"
        fails.append(("leak", f"the simulated play takes {ratio:.2f}x the logged HP through block ({more} than our play)",
                      f"模拟每回合被打穿的血是实际的 {ratio:.2f} 倍"))
    return fails


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--results", required=True)
    parser.add_argument("--set", default="val_ext")
    parser.add_argument("--split", default=os.path.join(ROOT, "experiments", "boss-sim", "split.json"))
    parser.add_argument("--turns", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "turns-1001.jsonl"))
    parser.add_argument("--out", default=os.path.join(ROOT, "src", "sim", "boss-trust.json"))
    parser.add_argument("--md")
    parser.add_argument("--source", default="")
    args = parser.parse_args()
    split = json.load(open(args.split))
    s = summarize(load(args.results), turns_of(args.turns), set(split[args.set]), set(split["tune"]))
    out = {
        "note": "Generated by tools/boss-sim/trust.py (docs/boss-sim.md §13); do not edit by hand.",
        "source": args.source or args.results,
        "set": args.set,
        "criteria": {"min_fights": MIN_FIGHTS, "brier_ratio": BRIER_RATIO, "max_gap": MAX_GAP, "leak_range": list(LEAK_RANGE),
                     "starts": STARTS},
        "overall": {},
        "bosses": {},
        "low_trust_b2": {},
        "low_confidence_b3": {},
    }
    for use, start in STARTS.items():
        one = s[start]
        out["overall"][start] = {"n": one["n"], "brier": one["brier"], "mean_pred": one["mean_pred"], "actual_win": one["actual_win"],
                                 "leak_ratio": one["leak"].get("enemy_ratio"), "platt": one.get("platt")}
        for enc, key in BOSS_KEYS.items():
            b = one["by_boss"].get(enc, {"n": 0, "brier": 1.0, "mean_pred": 0.0, "actual_win": 0.0, "leak": {}})
            fails = judge(b, one["brier"])
            entry = out["bosses"].setdefault(key, {"name": NAMES.get(enc, enc)})
            entry[start] = {"n": b["n"], "brier": b["brier"], "mean_pred": b["mean_pred"], "actual_win": b["actual_win"],
                            "leak_ratio": b["leak"].get("enemy_ratio"), "failed": [f[0] for f in fails]}
            if fails:
                if use == "b2":
                    out["low_trust_b2"][key] = f"validation fights from turn 1 ({b['n']}): " + "; ".join(f[1] for f in fails)
                else:
                    out["low_confidence_b3"][key] = f"验证集 {b['n']} 场（战前起点）：" + "；".join(f[2] for f in fails)
    with open(args.out, "w") as handle:
        json.dump(out, handle, ensure_ascii=False, indent=1)
        handle.write("\n")
    if args.md:
        lines = [f"# Boss trust (B4): {args.set}, {out['source']}", "",
                 f"Criteria: n ≥ {MIN_FIGHTS}; calibrated Brier ≤ {BRIER_RATIO} × overall; |mean forecast − actual| ≤ {MAX_GAP:.0%}; "
                 f"HP through block sim/log in [{LEAK_RANGE[0]}, {LEAK_RANGE[1]}].", ""]
        for use, start in STARTS.items():
            o = out["overall"][start]
            lines += [f"## {use.upper()} ({start}): overall n {o['n']}, Brier {o['brier']:.4f}, forecast {o['mean_pred']:.3f} / actual {o['actual_win']:.3f}, leak {o['leak_ratio']}", "",
                      "| boss | n | Brier | forecast / actual | leak sim/log | failed |", "|---|---|---|---|---|---|"]
            for key, entry in sorted(out["bosses"].items(), key=lambda kv: kv[1]["name"]):
                b = entry[start]
                lines.append(f"| {entry['name']} | {b['n']} | {b['brier']:.3f} | {b['mean_pred']:.2f} / {b['actual_win']:.2f} | {b['leak_ratio']} | {', '.join(b['failed']) or '—'} |")
            lines.append("")
        with open(args.md, "w") as handle:
            handle.write("\n".join(lines))
    print(json.dumps({"low_trust_b2": sorted(out["low_trust_b2"]), "low_confidence_b3": sorted(out["low_confidence_b3"])}))


if __name__ == "__main__":
    main()
