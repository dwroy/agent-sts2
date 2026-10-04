#!/usr/bin/env python3
"""B3: the synthetic boss start (--starts syn) against the logged pre-fight start (--starts pre) on the validation fights
(tools/boss-sim/backtest.ts output of both on the same seeds): Brier raw and through B1.5's fixed "pre" Platt map
(src/sim/boss-sim.ts BOSS_SIM_PLATT.pre, fitted on the tune fights only), AUC, mean predicted vs actual win rate, the
buckets and the worst n>=20 bucket, the won fights' HP-loss error, per boss, and the paired gap between the two starts.

Usage: python3 tools/boss-sim/syn-calib.py --results 'experiments/boss-sim-build/raw/val-syn/results-*.jsonl' [--json out.json] [--md out.md]
"""

import argparse
import json
import math
import os
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from report import BOSS_NAMES, auc, brier, buckets, errs, load  # noqa: E402

PRE = (0.7084, 0.5189)


def cal(p, n):
    eps = 0.5 / (n + 1)
    p = min(1 - eps, max(eps, p))
    z = max(-30, min(30, PRE[0] + PRE[1] * math.log(p / (1 - p))))
    return 1 / (1 + math.exp(-z))


def block(rows, calibrated):
    pairs = [((cal(r["sim"]["winProb"], r["sim"]["samples"]) if calibrated else r["sim"]["winProb"]), 1 if r["actual"]["won"] else 0) for r in rows]
    bk = buckets(pairs)
    worst = max((abs(b["pred"] - b["actual"]) for b in bk if b["n"] >= 20), default=None)
    won = [r for r in rows if r["actual"]["won"] and r["sim"].get("hpLossWon")]
    a = auc(pairs)
    return {
        "n": len(rows),
        "actual_win": round(statistics.fmean(y for _, y in pairs), 3),
        "mean_pred": round(statistics.fmean(p for p, _ in pairs), 3),
        "brier": round(brier(pairs), 4),
        "auc": round(a, 3) if a is not None else None,
        "buckets": bk,
        "worst_bucket_n20": round(worst, 3) if worst is not None else None,
        "won_loss_err": errs([r["sim"]["hpLossWon"]["median"] - r["actual"]["hpLoss"] for r in won]),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True)
    ap.add_argument("--json")
    ap.add_argument("--md")
    args = ap.parse_args()
    rows = [r for r in load(args.results) if r.get("sim")]
    by = {s: {r["key"]: r for r in rows if r["start"] == s} for s in ("pre", "syn")}
    keys = sorted(set(by["pre"]) & set(by["syn"]))
    out = {"fights": len(keys), "starts": {}}
    for s in ("pre", "syn"):
        mine = [by[s][k] for k in keys]
        out["starts"][s] = {"raw": block(mine, False), "calibrated": block(mine, True)}
        per = {}
        for r in mine:
            per.setdefault(r["enc"], []).append(r)
        out["starts"][s]["by_boss"] = {BOSS_NAMES.get(e, e): {"n": len(v), "brier_cal": round(brier([(cal(r["sim"]["winProb"], r["sim"]["samples"]), 1 if r["actual"]["won"] else 0) for r in v]), 3),
                                                            "pred_cal": round(statistics.fmean(cal(r["sim"]["winProb"], r["sim"]["samples"]) for r in v), 2), "actual": round(statistics.fmean(1 if r["actual"]["won"] else 0 for r in v), 2)} for e, v in sorted(per.items())}
    gaps = [by["syn"][k]["sim"]["winProb"] - by["pre"][k]["sim"]["winProb"] for k in keys]
    out["paired_raw_gap"] = {"mean": round(statistics.fmean(gaps), 4), "mean_abs": round(statistics.fmean(abs(g) for g in gaps), 4), "p90_abs": round(sorted(abs(g) for g in gaps)[int(0.9 * (len(gaps) - 1))], 4),
                             "largest": sorted(({"key": k, "enc": by["pre"][k]["enc"], "pre": by["pre"][k]["sim"]["winProb"], "syn": by["syn"][k]["sim"]["winProb"]} for k in keys), key=lambda x: -abs(x["syn"] - x["pre"]))[:8]}
    if args.json:
        with open(args.json, "w") as h:
            json.dump(out, h, ensure_ascii=False, indent=1)
    lines = [f"# 合成开场 vs 日志战前起点（验证集 {len(keys)} 场，各 200 样本，同一组种子）", "",
             "| 起点 | 版本 | Brier | AUC | 预测平均 / 实际 | n ≥ 20 的桶最大误差 | 赢局掉血误差 中位 / MAE |", "|---|---|---|---|---|---|---|"]
    for s, label in (("pre", "日志战前（B1.5）"), ("syn", "合成开场（B3）")):
        for v, vl in (("raw", "原始"), ("calibrated", "校准")):
            b = out["starts"][s][v]
            w = b["won_loss_err"]
            lines.append(f"| {label} | {vl} | {b['brier']:.4f} | {b['auc']} | {b['mean_pred']:.3f} / {b['actual_win']:.3f} | {'' if b['worst_bucket_n20'] is None else round(b['worst_bucket_n20'] * 100, 1)} 个百分点 | {w.get('median')} / {w.get('mae')} |")
    lines += ["", "分桶（校准后，预测 → 实际，场数）：", "", "| 桶 | 日志战前 | 合成开场 |", "|---|---|---|"]
    for a, b in zip(out["starts"]["pre"]["calibrated"]["buckets"], out["starts"]["syn"]["calibrated"]["buckets"]):
        f = lambda x: "—" if not x["n"] else f"{x['pred'] * 100:.1f}% → {x['actual'] * 100:.1f}%（{x['n']}）"
        lines.append(f"| {a['bucket']} | {f(a)} | {f(b)} |")
    lines += ["", "按 boss（校准后 Brier；预测平均 / 实际）：", "", "| boss | n | 日志战前 | 合成开场 |", "|---|---|---|---|"]
    for name, a in out["starts"]["pre"]["by_boss"].items():
        b = out["starts"]["syn"]["by_boss"][name]
        lines.append(f"| {name} | {a['n']} | {a['brier_cal']}（{a['pred_cal']} / {a['actual']}） | {b['brier_cal']}（{b['pred_cal']} / {b['actual']}） |")
    g = out["paired_raw_gap"]
    lines += ["", f"同一场两种起点的原始胜率差（合成 − 日志）：平均 {g['mean'] * 100:+.1f} 个百分点，平均绝对值 {g['mean_abs'] * 100:.1f}，90% 分位 {g['p90_abs'] * 100:.1f}。差得最多的："]
    for x in g["largest"]:
        lines.append(f"- {x['key']} {BOSS_NAMES.get(x['enc'], x['enc'])}：日志 {x['pre']:.2f}，合成 {x['syn']:.2f}")
    text = "\n".join(lines) + "\n"
    if args.md:
        with open(args.md, "w") as h:
            h.write(text)
    print(text)


main()
