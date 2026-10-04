#!/usr/bin/env python3
"""B4's before / after table (docs/boss-sim.md §13): two backtests (tools/boss-sim/backtest.ts output) on the validation
fights, Platt map fitted on the tune fights of each (calib.py --platt), overall and by boss, at turn 1, turn 5 and the
pre-fight start: n, calibrated Brier, mean forecast against the actual win rate, HP through block simulated / logged
(turns 2-7 from the start). Also the raw (unmapped) Brier and the Platt maps.

Usage: python3 tools/boss-sim/b4-report.py --before 'experiments/boss-sim/raw/b4-base/results-*.jsonl'
         --after 'experiments/boss-sim/raw/b4-final/results-*.jsonl' [--sets val,val_ext] [--md OUT.md] [--json OUT.json]
"""

import argparse
import json
import os
from pathlib import Path
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = str(Path(__file__).resolve().parents[3])  # the project root (docs/layout.md)
sys.path.insert(0, HERE)
from calib import summarize, turns_of  # noqa: E402
from report import load  # noqa: E402

NAMES = {
    "CRUSHER+ROCKET": "帝王蟹", "QUEEN+TORCH_HEAD_AMALGAM": "女王", "THE_INSATIABLE": "无厌沙虫", "KNOWLEDGE_DEMON": "知识恶魔",
    "AEONGLASS": "永世沙漏", "TEST_SUBJECT": "实验体", "WATERFALL_GIANT": "瀑布巨兽", "CEREMONIAL_BEAST": "仪式兽",
    "KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST": "同族", "LAGAVULIN_MATRIARCH": "乐加维林族母", "SOUL_FYSH": "灵魂异鱼", "VANTOM": "墨影幻灵",
}
FOCUS = ["CRUSHER+ROCKET", "QUEEN+TORCH_HEAD_AMALGAM", "THE_INSATIABLE", "KNOWLEDGE_DEMON"]


def brief(b):
    return {"n": b["n"], "brier": b["brier"], "mean_pred": b["mean_pred"], "actual_win": b["actual_win"],
            "leak": b["leak"].get("enemy_ratio"), "leak_sim": b["leak"].get("sim_enemy"), "leak_log": b["leak"].get("actual_enemy")}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--before", required=True)
    parser.add_argument("--after", required=True)
    parser.add_argument("--sets", default="val,val_ext")
    parser.add_argument("--split", default=os.path.join(ROOT, "experiments", "boss-sim", "split.json"))
    parser.add_argument("--turns", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "turns-1001.jsonl"))
    parser.add_argument("--md")
    parser.add_argument("--json")
    args = parser.parse_args()
    split = json.load(open(args.split))
    turns = turns_of(args.turns)
    runs = {"before": load(args.before), "after": load(args.after)}
    out = {"before": args.before, "after": args.after, "sets": {}}
    md = []
    for set_name in args.sets.split(","):
        keys = set(split[set_name])
        one = {}
        for name, rows in runs.items():
            cal = summarize(rows, turns, keys, set(split["tune"]))
            raw = summarize(rows, turns, keys)
            one[name] = {start: {"overall": {**brief(cal[start]), "raw_brier": raw[start]["brier"], "auc": cal[start]["auc"],
                                             "worst_bucket_n20": cal[start]["worst_bucket_n20"], "platt": cal[start].get("platt")},
                                 "by_boss": {enc: {**brief(b), "raw_brier": raw[start]["by_boss"][enc]["brier"], "raw_mean_pred": raw[start]["by_boss"][enc]["mean_pred"]}
                                             for enc, b in cal[start]["by_boss"].items()}}
                         for start in cal}
        out["sets"][set_name] = one
        md += [f"## {set_name}（{len(keys)} 场）", "", "整体（校准后 Brier；原始 Brier；AUC；预测平均 / 实际；第 2–7 回合被打穿 模拟/实际）：", "",
               "| 起点 | 修前 | 修后 |", "|---|---|---|"]
        for start in ("t1", "t5", "pre"):
            cells = []
            for name in ("before", "after"):
                o = one[name][start]["overall"]
                cells.append(f"{o['brier']:.4f}；{o['raw_brier']:.4f}；{o['auc']}；{o['mean_pred']:.3f} / {o['actual_win']:.3f}；{o['leak']}")
            md.append(f"| {start} | {cells[0]} | {cells[1]} |")
        md += ["", "按 boss（校准后 Brier，预测平均 / 实际，被打穿 模拟/实际；修前 → 修后）：", "",
               "| boss | 起点 | n | Brier | 预测 / 实际 | 原始预测 | 被打穿比 |", "|---|---|---|---|---|---|---|"]
        encs = FOCUS + sorted(e for e in one["after"]["t1"]["by_boss"] if e not in FOCUS)
        for enc in encs:
            for start in ("t1", "t5", "pre"):
                a = one["before"][start]["by_boss"].get(enc)
                b = one["after"][start]["by_boss"].get(enc)
                if not a or not b:
                    continue
                md.append(f"| {NAMES.get(enc, enc)} | {start} | {b['n']} | {a['brier']:.3f} → {b['brier']:.3f} | "
                          f"{a['mean_pred']:.2f} → {b['mean_pred']:.2f} / {b['actual_win']:.2f} | {a['raw_mean_pred']:.2f} → {b['raw_mean_pred']:.2f} | {a['leak']} → {b['leak']} |")
        md.append("")
    if args.json:
        with open(args.json, "w") as handle:
            json.dump(out, handle, ensure_ascii=False, indent=1)
    if args.md:
        with open(args.md, "w") as handle:
            handle.write("\n".join(md) + "\n")
    else:
        print("\n".join(md))


if __name__ == "__main__":
    main()
