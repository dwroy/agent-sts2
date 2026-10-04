#!/usr/bin/env python3
"""Calibration of the whole boss fight simulator on the tune / validation split (docs/boss-sim.md B1.5).

For each results set (tools/boss-sim/backtest.ts output) and start point (t1, t5, pre), on the fights of one side of
experiments/boss-sim/split.json: Brier, AUC, the win-probability buckets (predicted vs actual), the mean predicted
win rate against the actual one, the won fights' HP-loss error (the sim's median over its won samples - actual), and
the per-turn leak: over the fights' turns 2-7 from the start (turns the log still fought), the HP the enemy turn took
through our block, the sim's mean over its samples still fighting against the log's (and all HP lost that turn).
Everything overall and by boss.

Usage: python3 tools/boss-sim/calib.py --results 'experiments/boss-sim/raw/NAME/results-*.jsonl' [--set val] [--json out.json] [--md out.md]
       python3 tools/boss-sim/calib.py --compare 'A=glob' 'B=glob' ... [--set tune]   (one summary line per results set)
"""

import argparse
import json
import math
import os
from pathlib import Path
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = str(Path(__file__).resolve().parents[3])  # the project root (docs/layout.md)
sys.path.insert(0, HERE)
from report import BOSS_NAMES, auc, brier, buckets, errs, load  # noqa: E402

LEAK_TURNS = range(2, 8)  # turns from the start point (1 = the start turn)


def turns_of(path):
    out = {}
    with open(path) as handle:
        for line in handle:
            if line.strip():
                r = json.loads(line)
                out[r["key"]] = {t[0]: t for t in r["turns"]}
    return out


def leak(rows, turns):
    """Sums over (fight, turn) of the sim's mean per-turn numbers and the log's, turns LEAK_TURNS from the start."""
    s_enemy = a_enemy = s_loss = a_loss = 0.0
    n = 0
    for r in rows:
        sim = r.get("sim")
        by = turns.get(r["key"], {})
        offset = 4 if r["start"] == "t5" else 0
        for k in LEAK_TURNS:
            here = by.get(k + offset)
            if not sim or not here or len(sim.get("perTurn", [])) < k or here[5] is None or here[3] is None:
                continue
            fighting, loss, _dmg, _inc, enemy = sim["perTurn"][k - 1][:5]
            if fighting == 0:
                continue
            s_enemy += enemy
            a_enemy += here[5]
            s_loss += loss
            a_loss += here[3]
            n += 1
    return {"n": n, "sim_enemy": round(s_enemy / n, 2) if n else None, "actual_enemy": round(a_enemy / n, 2) if n else None,
            "enemy_ratio": round(s_enemy / a_enemy, 3) if a_enemy else None,
            "sim_loss": round(s_loss / n, 2) if n else None, "actual_loss": round(a_loss / n, 2) if n else None,
            "loss_ratio": round(s_loss / a_loss, 3) if a_loss else None}


def logit(p, n):
    eps = 0.5 / (n + 1)
    p = min(1 - eps, max(eps, p))
    return math.log(p / (1 - p))


def sigmoid(z):
    z = max(-30.0, min(30.0, z))
    return 1 / (1 + math.exp(-z))


def fit_platt(rows):
    """Platt scaling of the sim's win rate, p' = sigmoid(a + b logit(p)), by Newton's method on the log loss."""
    xs = [logit(r["sim"]["winProb"], r["sim"]["samples"]) for r in rows]
    ys = [1 if r["actual"]["won"] else 0 for r in rows]
    a, b = 0.0, 1.0
    for _ in range(50):
        ga = gb = haa = hab = hbb = 0.0
        for x, y in zip(xs, ys):
            p = sigmoid(a + b * x)
            ga += p - y
            gb += (p - y) * x
            w = p * (1 - p)
            haa += w
            hab += w * x
            hbb += w * x * x
        det = haa * hbb - hab * hab
        if det <= 1e-12:
            break
        da = (hbb * ga - hab * gb) / det
        db = (haa * gb - hab * ga) / det
        step = max(abs(da), abs(db))
        if step > 1:
            da, db = da / step, db / step
        a, b = a - da, b - db
        if abs(da) + abs(db) < 1e-9:
            break
    return round(a, 4), round(b, 4)


def platt(rows, ab):
    """The rows with the sim's win rate mapped through (a, b)."""
    a, b = ab
    out = []
    for r in rows:
        if not r.get("sim"):
            continue
        p = sigmoid(a + b * logit(r["sim"]["winProb"], r["sim"]["samples"]))
        out.append({**r, "sim": {**r["sim"], "winProb": p}})
    return out


def block(rows, turns):
    rows = [r for r in rows if r.get("sim")]
    if not rows:
        return None
    pairs = [(r["sim"]["winProb"], 1 if r["actual"]["won"] else 0) for r in rows]
    won = [r for r in rows if r["actual"]["won"] and r["sim"].get("hpLossWon")]
    bk = buckets(pairs)
    worst = max((abs(b["pred"] - b["actual"]) for b in bk if b["n"] >= 20), default=None)
    return {
        "n": len(rows),
        "actual_win": round(statistics.fmean(y for _, y in pairs), 3),
        "mean_pred": round(statistics.fmean(p for p, _ in pairs), 3),
        "brier": round(brier(pairs), 4),
        "auc": round(auc(pairs), 3) if auc(pairs) is not None else None,
        "const_brier": round(brier([(statistics.fmean(y for _, y in pairs), y) for _, y in pairs]), 4),
        "buckets": bk,
        "worst_bucket_n20": round(worst, 3) if worst is not None else None,
        "won_loss_err": errs([r["sim"]["hpLossWon"]["median"] - r["actual"]["hpLoss"] for r in won]),
        "leak": leak(rows, turns),
    }


def summarize(rows, turns, keys, calibrate=None):
    """calibrate: the tune fights' keys, a Platt map per start point fitted on them and applied to `keys`' rows."""
    rows = [r for r in rows if keys is None or r["key"] in keys or (calibrate and r["key"] in calibrate)]
    out = {}
    for start in ("t1", "t5", "pre"):
        mine = [r for r in rows if r["start"] == start and r.get("sim")]
        if not mine:
            continue
        ab = None
        if calibrate:
            ab = fit_platt([r for r in mine if r["key"] in calibrate])
            mine = platt([r for r in mine if keys is None or r["key"] in keys], ab)
        one = block(mine, turns)
        if ab:
            one["platt"] = ab
        one["by_boss"] = {}
        for enc in sorted({r["enc"] for r in mine}):
            b = block([r for r in mine if r["enc"] == enc], turns)
            if b:
                b.pop("buckets", None)
                one["by_boss"][enc] = b
        out[start] = one
    return out


def line(name, s):
    parts = [name]
    for start, one in s.items():
        lk = one["leak"]
        parts.append(f"{start}: n {one['n']} brier {one['brier']:.4f} auc {one['auc']} pred {one['mean_pred']:.3f}/act {one['actual_win']:.3f} "
                     f"worstB {one['worst_bucket_n20']} wonLossErr {one['won_loss_err'].get('median')}/{one['won_loss_err'].get('mae')} "
                     f"leak {lk['sim_enemy']}/{lk['actual_enemy']} ({lk['enemy_ratio']})" + (f" platt {one['platt']}" if one.get("platt") else ""))
    return " | ".join(parts)


def render(s, title):
    out = [f"### {title}", ""]
    for start, one in s.items():
        lk = one["leak"]
        out.append(f"**{start}**：{one['n']} 场，实际胜率 {one['actual_win']:.3f}，预测平均 {one['mean_pred']:.3f}；Brier {one['brier']:.4f}（常数基线 {one['const_brier']:.4f}），AUC {one['auc']}；"
                   f"赢局掉血误差中位 {one['won_loss_err'].get('median')}、MAE {one['won_loss_err'].get('mae')}；"
                   f"第 2–7 回合敌人回合打穿 模拟 {lk['sim_enemy']} / 实际 {lk['actual_enemy']}（比 {lk['enemy_ratio']}），每回合掉血 {lk['sim_loss']} / {lk['actual_loss']}（比 {lk['loss_ratio']}）。")
        out.append("")
        out.append("| 桶 | n | 预测 | 实际 |")
        out.append("|---|---|---|---|")
        for b in one["buckets"]:
            out.append(f"| {b['bucket']} | {b['n']} | {b['pred'] if b['pred'] is not None else '—'} | {b['actual'] if b['actual'] is not None else '—'} |")
        out.append("")
        out.append("| boss | n | 实际胜率 | 预测平均 | Brier | 赢局掉血误差中位 | 打穿 模拟/实际 |")
        out.append("|---|---|---|---|---|---|---|")
        for enc, b in one["by_boss"].items():
            lk = b["leak"]
            out.append(f"| {BOSS_NAMES.get(enc, enc)} | {b['n']} | {b['actual_win']:.2f} | {b['mean_pred']:.2f} | {b['brier']:.3f} | {b['won_loss_err'].get('median', '—')} | "
                       f"{lk['sim_enemy']} / {lk['actual_enemy']} |")
        out.append("")
    return "\n".join(out)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--results")
    parser.add_argument("--compare", nargs="*")
    parser.add_argument("--set", default="val", help="tune, val or all")
    parser.add_argument("--split", default=os.path.join(ROOT, "experiments", "boss-sim", "split.json"))
    parser.add_argument("--turns", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "turns.jsonl"))
    parser.add_argument("--json")
    parser.add_argument("--md")
    parser.add_argument("--title", default="")
    parser.add_argument("--platt", action="store_true", help="map the win rates through a Platt fit on the tune fights (per start point)")
    args = parser.parse_args(argv)
    split = json.load(open(args.split))
    keys = None if args.set == "all" else set(split[args.set])
    turns = turns_of(args.turns)
    if args.compare:
        for item in args.compare:
            name, pattern = item.split("=", 1)
            print(line(name, summarize(load(pattern), turns, keys, set(split["tune"]) if args.platt else None)))
        return 0
    s = summarize(load(args.results), turns, keys, set(split["tune"]) if args.platt else None)
    if args.json:
        with open(args.json, "w") as handle:
            json.dump(s, handle, ensure_ascii=False, indent=1)
    if args.md:
        with open(args.md, "w") as handle:
            handle.write(render(s, args.title or args.set) + "\n")
    print(line(args.set, s))
    return 0


if __name__ == "__main__":
    sys.exit(main())
