#!/usr/bin/env python3
"""PASSIVE_PIECES (src/reflex/passive-pieces.ts) on the whole-fight boss sim: two tools/boss-sim/backtest.ts runs on
the same fights and seeds (PASSIVE_PIECES=off and on), compared start by start: the Brier score of the raw and the
calibrated win rate (boss-sim BOSS_SIM_PLATT, the map B2 and B3 show) against the actual outcome, the mean predicted
against the actual win rate, the won fights' HP loss (the sim's median over its won samples - the log's), with a paired
bootstrap of the Brier difference over fights; and whether the two runs are the same sample for sample.

Plain python3. Usage:
  python3 tools/boss-sim/pp-calib.py --off 'experiments/boss-sim/raw/b2-pp-off/results-*.jsonl' --on 'experiments/boss-sim/raw/b2-pp-on/results-*.jsonl' [--by-boss]
"""

import argparse
import glob
import json
import math
import random

PLATT = {"t1": (0.7496, 0.5992), "t5": (0.6491, 0.8506), "pre": (0.7007, 0.6174), "syn": (0.7007, 0.6174)}


def load(pattern):
    out = {}
    for path in sorted(glob.glob(pattern)):
        with open(path) as handle:
            for line in handle:
                if line.strip():
                    r = json.loads(line)
                    if r.get("sim"):
                        out[(r["key"], r["start"])] = r
    return out


def calibrated(p, samples, start):
    eps = 0.5 / (samples + 1)
    p = min(1 - eps, max(eps, p))
    a, b = PLATT[start]
    z = max(-30.0, min(30.0, a + b * math.log(p / (1 - p))))
    return 1 / (1 + math.exp(-z))


def same(a, b):
    strip = lambda r: json.dumps({k: v for k, v in r["sim"].items() if k != "ms"}, sort_keys=True)
    return strip(a) == strip(b)


def summary(rows, side):
    def pred(r):
        s = r[side]["sim"]
        return s["winProb"], calibrated(s["winProb"], s["samples"], r[side]["start"])
    ys = [1.0 if r["off"]["actual"]["won"] else 0.0 for r in rows]
    raw = [pred(r)[0] for r in rows]
    cal = [pred(r)[1] for r in rows]
    brier = lambda ps: sum((p - y) ** 2 for p, y in zip(ps, ys)) / len(ys)
    won_err = [r[side]["sim"]["hpLossWon"]["median"] - r["off"]["actual"]["hpLoss"] for r in rows if r["off"]["actual"]["won"] and (r[side]["sim"].get("hpLossWon") or {}).get("median") is not None]
    return {"brier_raw": brier(raw), "brier_cal": brier(cal), "pred_cal": sum(cal) / len(cal), "pred_raw": sum(raw) / len(raw), "actual": sum(ys) / len(ys),
            "won_hp_err": sorted(won_err)[len(won_err) // 2] if won_err else None, "won_n": len(won_err)}


def bootstrap(rows, n=4000, seed=1):
    rng = random.Random(seed)
    ys = [1.0 if r["off"]["actual"]["won"] else 0.0 for r in rows]
    c = lambda r, side: calibrated(r[side]["sim"]["winProb"], r[side]["sim"]["samples"], r[side]["start"])
    d = [(c(r, "on") - y) ** 2 - (c(r, "off") - y) ** 2 for r, y in zip(rows, ys)]
    means = sorted(sum(rng.choice(d) for _ in d) / len(d) for _ in range(n))
    return sum(d) / len(d), means[int(0.025 * n)], means[int(0.975 * n)]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--off", required=True)
    parser.add_argument("--on", required=True)
    parser.add_argument("--by-boss", action="store_true")
    args = parser.parse_args()
    off, on = load(args.off), load(args.on)
    keys = sorted(set(off) & set(on))
    print(f"paired (fight, start): {len(keys)}; the same sample for sample: {sum(1 for k in keys if same(off[k], on[k]))}")
    print("| start | n | actual win | pred (cal) off / on | Brier raw off / on | Brier cal off / on | cal diff [95%] | won fights' HP loss err off / on |")
    print("|---|---|---|---|---|---|---|---|")
    for start in ("t1", "t5", "pre", "syn"):
        rows = [{"off": off[k], "on": on[k]} for k in keys if k[1] == start]
        if not rows:
            continue
        a, b = summary(rows, "off"), summary(rows, "on")
        diff, lo, hi = bootstrap(rows)
        print(f"| {start} | {len(rows)} | {a['actual']:.3f} | {a['pred_cal']:.3f} / {b['pred_cal']:.3f} | {a['brier_raw']:.4f} / {b['brier_raw']:.4f} | {a['brier_cal']:.4f} / {b['brier_cal']:.4f} | "
              f"{diff:+.4f} [{lo:+.4f}, {hi:+.4f}] | {a['won_hp_err']} / {b['won_hp_err']} (n {a['won_n']}) |")
        if args.by_boss:
            for boss in sorted({r["off"]["enc"] for r in rows}):
                g = [r for r in rows if r["off"]["enc"] == boss]
                a, b = summary(g, "off"), summary(g, "on")
                print(f"|   {boss} | {len(g)} | {a['actual']:.2f} | {a['pred_cal']:.2f} / {b['pred_cal']:.2f} | {a['brier_raw']:.3f} / {b['brier_raw']:.3f} | {a['brier_cal']:.3f} / {b['brier_cal']:.3f} | | {a['won_hp_err']} / {b['won_hp_err']} |")


if __name__ == "__main__":
    main()
