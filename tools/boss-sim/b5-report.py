#!/usr/bin/env python3
"""B5's table (docs/boss-sim.md §14): several backtests (tools/boss-sim/backtest.ts output) on the validation fights,
each with its Platt map fitted on its tune fights (calib.py --platt), overall and by boss, at turn 1, turn 5 and the
pre-fight start: n, calibrated and raw Brier, mean forecast against the actual win rate, the HP through block simulated /
logged on turns 2-7 from the start; and the paired bootstrap of the overall calibrated Brier between the first run and
each later one (the same fights, resampled together).

A run is NAME=GLOB, or NAME=GLOB1|GLOB2|... where each later glob's rows replace the earlier ones' for the same fight and
start (a re-run of some bosses only, --enc, over a full run).

Usage: python3 tools/boss-sim/b5-report.py --run 'base=experiments/boss-sim/raw/b5-base/results-*.jsonl' --run 'final=...'
         [--sets val_ext,val,val_new] [--turns experiments/boss-sim/raw/turns-1002.jsonl] [--md OUT.md] [--json OUT.json]
         [--boot 4000]
"""

import argparse
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from calib import fit_platt, platt, summarize, turns_of  # noqa: E402
from report import load  # noqa: E402

NAMES = {
    "CRUSHER+ROCKET": "帝王蟹", "QUEEN+TORCH_HEAD_AMALGAM": "女王", "THE_INSATIABLE": "无厌沙虫", "WATERFALL_GIANT": "瀑布巨兽",
    "AEONGLASS": "永世沙漏", "TEST_SUBJECT": "实验体", "KNOWLEDGE_DEMON": "知识恶魔", "CEREMONIAL_BEAST": "仪式兽",
    "KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST": "同族", "LAGAVULIN_MATRIARCH": "乐加维林族母", "SOUL_FYSH": "灵魂异鱼", "VANTOM": "墨影幻灵",
}
FOCUS = ["CRUSHER+ROCKET", "QUEEN+TORCH_HEAD_AMALGAM", "THE_INSATIABLE", "WATERFALL_GIANT", "AEONGLASS", "TEST_SUBJECT"]
STARTS = ("t1", "t5", "pre")


def load_run(spec):
    """Rows of NAME=GLOB1|GLOB2|...: later globs replace earlier rows by (key, start)."""
    rows = {}
    for pattern in spec.split("|"):
        for r in load(pattern):
            rows[(r["key"], r["start"])] = r
    return list(rows.values())


def calibrated(rows, keys, tune):
    """{start: {key: (p, y)}} on `keys`, each start's Platt map fitted on the tune rows."""
    out = {}
    for start in STARTS:
        mine = [r for r in rows if r["start"] == start and r.get("sim")]
        ab = fit_platt([r for r in mine if r["key"] in tune])
        out[start] = {r["key"]: (r["sim"]["winProb"], 1 if r["actual"]["won"] else 0) for r in platt([r for r in mine if r["key"] in keys], ab)}
    return out


def bootstrap(a, b, n, seed=7):
    """Paired bootstrap of Brier(b) - Brier(a) over the fights both have: the difference and its 95% interval."""
    common = sorted(set(a) & set(b))
    if not common:
        return None
    da = [(a[k][0] - a[k][1]) ** 2 for k in common]
    db = [(b[k][0] - b[k][1]) ** 2 for k in common]
    diff = sum(db) / len(db) - sum(da) / len(da)
    rnd = random.Random(seed)
    m = len(common)
    stats = []
    for _ in range(n):
        idx = [rnd.randrange(m) for _ in range(m)]
        stats.append(sum(db[i] - da[i] for i in idx) / m)
    stats.sort()
    return {"n": m, "diff": round(diff, 5), "lo": round(stats[int(0.025 * n)], 5), "hi": round(stats[int(0.975 * n) - 1], 5)}


def brief(b):
    return {"n": b["n"], "brier": b["brier"], "mean_pred": b["mean_pred"], "actual_win": b["actual_win"],
            "leak": b["leak"].get("enemy_ratio"), "leak_sim": b["leak"].get("sim_enemy"), "leak_log": b["leak"].get("actual_enemy")}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--run", action="append", required=True)
    parser.add_argument("--sets", default="val_ext,val,val_new")
    parser.add_argument("--split", default=os.path.join(ROOT, "experiments", "boss-sim", "split.json"))
    parser.add_argument("--turns", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "turns-1002.jsonl"))
    parser.add_argument("--boot", type=int, default=4000)
    parser.add_argument("--md")
    parser.add_argument("--json")
    args = parser.parse_args()
    split = json.load(open(args.split))
    turns = turns_of(args.turns)
    tune = set(split["tune"])
    runs = {}
    for item in args.run:
        name, spec = item.split("=", 1)
        runs[name] = load_run(spec)
    names = list(runs)
    out = {"runs": {k: v for k, v in (item.split("=", 1) for item in args.run)}, "sets": {}}
    md = []
    for set_name in args.sets.split(","):
        keys = set(split[set_name])
        one = {"overall": {}, "by_boss": {}, "bootstrap": {}}
        cal = {name: summarize(rows, turns, keys, tune) for name, rows in runs.items()}
        raw = {name: summarize(rows, turns, keys) for name, rows in runs.items()}
        pairs = {name: calibrated(rows, keys, tune) for name, rows in runs.items()}
        for name in names:
            one["overall"][name] = {start: {**brief(cal[name][start]), "raw_brier": raw[name][start]["brier"], "auc": cal[name][start]["auc"],
                                            "worst_bucket_n20": cal[name][start]["worst_bucket_n20"], "platt": cal[name][start].get("platt"),
                                            "won_loss_err": cal[name][start]["won_loss_err"]}
                                    for start in STARTS if start in cal[name]}
            one["by_boss"][name] = {start: {enc: {**brief(b), "raw_brier": raw[name][start]["by_boss"][enc]["brier"], "raw_mean_pred": raw[name][start]["by_boss"][enc]["mean_pred"],
                                                  "won_loss_err": b["won_loss_err"]}
                                            for enc, b in cal[name][start]["by_boss"].items()}
                                    for start in STARTS if start in cal[name]}
            if name != names[0]:
                one["bootstrap"][name] = {start: bootstrap(pairs[names[0]][start], pairs[name][start], args.boot) for start in STARTS}
        out["sets"][set_name] = one
        md += [f"## {set_name}（{len(keys)} 场）", "", "整体：校准 Brier（原始 Brier；AUC；预测平均 / 实际；第 2–7 回合被打穿 模拟/实际）", "",
               "| 起点 | " + " | ".join(names) + " |", "|---|" + "---|" * len(names)]
        for start in STARTS:
            cells = []
            for name in names:
                o = one["overall"][name][start]
                cells.append(f"{o['brier']:.4f}（{o['raw_brier']:.4f}；{o['auc']}；{o['mean_pred']:.3f} / {o['actual_win']:.3f}；{o['leak']}）")
            md.append(f"| {start} | " + " | ".join(cells) + " |")
        if one["bootstrap"]:
            md += ["", f"配对 bootstrap（{args.boot} 次，校准 Brier 的差，相对 {names[0]}）：", ""]
            for name, by in one["bootstrap"].items():
                md.append(f"- {name}：" + "；".join(f"{s} {b['diff']:+.4f}（95% {b['lo']:+.4f} 到 {b['hi']:+.4f}）" for s, b in by.items() if b))
        md += ["", "按 boss（校准 Brier；预测平均 / 实际；被打穿比）：", "", "| boss | 起点 | n | " + " | ".join(names) + " |", "|---|---|---|" + "---|" * len(names)]
        encs = FOCUS + sorted(e for e in one["by_boss"][names[-1]]["t1"] if e not in FOCUS)
        for enc in encs:
            for start in STARTS:
                cells = []
                n = None
                for name in names:
                    b = one["by_boss"][name].get(start, {}).get(enc)
                    if not b:
                        cells.append("—")
                        continue
                    n = b["n"]
                    cells.append(f"{b['brier']:.3f}；{b['mean_pred']:.2f} / {b['actual_win']:.2f}；{b['leak']}")
                if n is not None:
                    md.append(f"| {NAMES.get(enc, enc)} | {start} | {n} | " + " | ".join(cells) + " |")
        md.append("")
    if args.json:
        with open(args.json, "w") as handle:
            json.dump(out, handle, ensure_ascii=False, indent=1)
    text = "\n".join(md) + "\n"
    if args.md:
        with open(args.md, "w") as handle:
            handle.write(text)
    else:
        print(text)


if __name__ == "__main__":
    main()
