#!/usr/bin/env python3
"""What the live whole-fight simulation forecast in play, against what happened (B5, docs/boss-sim.md §14).

From V4.2 on, every boss-fight question runs the whole-fight simulation on each line (src/sim/boss-lines.ts) and the
decision log keeps it as `boss_sim` (low-trust bosses too, `low_trust: true`, not shown to Jev). This reads those
records (decisions.jsonl, streamed, only lines holding "boss_sim"), takes per fight and turn the first record of the
turn, and compares the line Jev chose (its calibrated win rate `cal`, the median HP lost in its won samples `won_loss`)
with the fight's outcome (tools/boss-sim/extract.py output: won / died, the end HP; the turn's start HP from the turns
view). Nothing is simulated here.

Per boss: fights, the turn-1 forecast (mean, Brier) against the actual win rate, the same over every turn's record
(pooled, each turn one forecast), the best line's forecast beside the chosen one's, and for the won fights the forecast
median HP lost against the HP actually lost from that turn. And how Jev's chosen line stood against the simulation's own
best line (its ranking's first; a low-trust boss's question did not show it): chosen that line (or one tied with it),
within 2 standard errors of it, the mean paired win-rate difference and the mean calibrated gap.

Usage: python3 tools/boss-sim/live-check.py [--decisions logs/decisions.jsonl] [--fights experiments/boss-sim/raw/fights-1002.jsonl]
         [--turns experiments/boss-sim/raw/turns-1002.jsonl] [--since 2026-10-01T01:50:40Z] [--json OUT] [--md OUT]
"""

import argparse
import json
import os
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from report import brier  # noqa: E402

NAMES = {
    "KAISER_CRAB": "帝王蟹", "QUEEN": "女王", "THE_INSATIABLE": "无厌沙虫", "KNOWLEDGE_DEMON": "知识恶魔", "AEONGLASS": "永世沙漏",
    "TEST_SUBJECT": "实验体", "WATERFALL_GIANT": "瀑布巨兽", "CEREMONIAL_BEAST": "仪式兽", "THE_KIN": "同族",
    "LAGAVULIN_MATRIARCH": "乐加维林族母", "SOUL_FYSH": "灵魂异鱼", "VANTOM": "墨影幻灵",
}


def records(path, since):
    """(run, floor, turn, ts, boss, low_trust, chosen key, lines) of every combat boss_sim record with numbers."""
    out = []
    with open(path, "rb") as handle:
        for raw in handle:
            if b'"boss_sim"' not in raw or b'"COMBAT"' not in raw:
                continue
            d = json.loads(raw)
            bs = d.get("boss_sim")
            if d.get("screen") != "COMBAT" or not isinstance(bs, dict) or not bs.get("available") or d.get("ts", "") < since:
                continue
            choice = None
            for ans in (d.get("answers") or {}).values():
                if isinstance(ans, dict) and "choice" in ans:
                    choice = ans["choice"]
            out.append({"run": d.get("run_id"), "floor": d.get("floor"), "turn": d.get("turn"), "ts": d.get("ts"), "boss": bs.get("boss"),
                        "low_trust": bool(bs.get("low_trust")), "chosen": choice, "best": bs.get("best"), "tied": bs.get("tied") or [],
                        "ranked": bs.get("ranked") or [], "lines": bs.get("lines") or {}, "samples": bs.get("samples")})
    return out


def fights_of(path):
    """{(run, floor): row} without the states (outcome, end HP, entry HP, encounter, key)."""
    out = {}
    with open(path) as handle:
        for line in handle:
            if not line.strip():
                continue
            r = json.loads(line)
            out[(r["run_id"], r["floor"])] = {k: r[k] for k in ("key", "encounter", "outcome", "end_hp", "entry_hp", "turns", "first_ts")}
    return out


def turns_of(path):
    out = {}
    with open(path) as handle:
        for line in handle:
            if line.strip():
                r = json.loads(line)
                out[r["key"]] = {t[0]: t for t in r["turns"]}
    return out


def summarize(items):
    if not items:
        return None
    pairs = [(x["p"], x["y"]) for x in items]
    best_pairs = [(x["p_best"], x["y"]) for x in items if x["p_best"] is not None]
    won = [x for x in items if x["y"] == 1 and x["won_loss"] is not None and x["actual_loss"] is not None]
    errs = [x["won_loss"] - x["actual_loss"] for x in won]
    return {
        "n": len(items),
        "actual_win": round(statistics.fmean(y for _, y in pairs), 3),
        "mean_pred": round(statistics.fmean(p for p, _ in pairs), 3),
        "brier": round(brier(pairs), 4),
        "mean_pred_best": round(statistics.fmean(p for p, _ in best_pairs), 3) if best_pairs else None,
        "brier_best": round(brier(best_pairs), 4) if best_pairs else None,
        "won_n": len(won),
        "won_loss_pred_median": statistics.median(x["won_loss"] for x in won) if won else None,
        "won_loss_actual_median": statistics.median(x["actual_loss"] for x in won) if won else None,
        "won_loss_err_median": statistics.median(errs) if errs else None,
        "won_loss_err_mae": round(statistics.fmean(abs(e) for e in errs), 1) if errs else None,
        "chose_top": sum(1 for x in items if x["chose_top"]),
        "within_2se": sum(1 for x in items if x["d"] is not None and x["d"] >= -2 * (x["se"] or 0)),
        "mean_d": round(statistics.fmean(x["d"] for x in items if x["d"] is not None), 4) if any(x["d"] is not None for x in items) else None,
        "mean_cal_gap": round(statistics.fmean(x["top_cal"] - x["p"] for x in items if x["top_cal"] is not None), 4) if any(x["top_cal"] is not None for x in items) else None,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--decisions", default=os.path.join(ROOT, "logs", "decisions.jsonl"))
    parser.add_argument("--fights", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "fights-1002.jsonl"))
    parser.add_argument("--turns", default=os.path.join(ROOT, "experiments", "boss-sim", "raw", "turns-1002.jsonl"))
    parser.add_argument("--since", default="2026-10-01T01:50:40Z", help="V4.2's start")
    parser.add_argument("--json")
    parser.add_argument("--md")
    args = parser.parse_args()
    fights = fights_of(args.fights)
    turns = turns_of(args.turns)
    first = {}
    unmatched = 0
    for r in records(args.decisions, args.since):
        f = fights.get((r["run"], r["floor"]))
        if f is None or r["chosen"] not in r["lines"]:
            unmatched += 1
            continue
        first.setdefault((f["key"], r["turn"]), (r, f))
    items = []
    for (key, turn), (r, f) in sorted(first.items(), key=lambda kv: (kv[0][0], kv[0][1] or 0)):
        line = r["lines"][r["chosen"]]
        best = r["lines"].get(r["best"]) if r["best"] else (r["lines"].get(r["ranked"][0]) if r["ranked"] else None)
        start = turns.get(key, {}).get(turn)
        start_hp = start[1] if start else None
        top = r["lines"].get(r["ranked"][0]) if r["ranked"] else None
        items.append({"key": key, "turn": turn, "boss": r["boss"], "low_trust": r["low_trust"], "y": 1 if f["outcome"] == "won" else 0,
                      "d": line.get("d"), "se": line.get("se"), "top_cal": top["cal"] if top else None,
                      "chose_top": bool(r["ranked"]) and (r["chosen"] == r["ranked"][0] or r["chosen"] in r["tied"]),
                      "p": line["cal"], "p_best": best["cal"] if best else None, "won_loss": line.get("won_loss"),
                      "actual_loss": (start_hp - f["end_hp"]) if start_hp is not None and f["outcome"] == "won" else None,
                      "chosen_is_best": r["chosen"] == r["best"] or r["chosen"] in r["tied"], "samples": r["samples"]})
    out = {"since": args.since, "records_unmatched": unmatched, "groups": {}, "items": items}
    groups = {"low_trust": [x for x in items if x["low_trust"]], "trusted": [x for x in items if not x["low_trust"]]}
    for boss in sorted({x["boss"] for x in items}):
        groups[boss] = [x for x in items if x["boss"] == boss]
    for name, rows in groups.items():
        t1 = [x for x in rows if x["turn"] == 1]
        out["groups"][name] = {"fights": len({x["key"] for x in rows}), "t1": summarize(t1), "all_turns": summarize(rows),
                               "low_trust": rows[0]["low_trust"] if rows and name not in ("low_trust", "trusted") else None}
    if args.json:
        with open(args.json, "w") as handle:
            json.dump(out, handle, ensure_ascii=False, indent=1)
    lines = [f"# 实盘整场模拟的预测 vs 实际（{args.since} 起，决策日志 boss_sim）", "",
             "每场每回合取第一条记录，Jev 选的线的校准胜率；Brier 按（预测，实际胜负）。赢局掉血：选的线的赢局掉血中位 vs 这回合起实际掉血。", "",
             "选线：每回合 Jev 选的线 vs 模拟自己排第一的线（低可信 boss 的题面没给 Jev 看）：选中或并列的回合数、和最优线在 2 个标准误内的回合数、配对胜率差的平均（百分点）。", "",
             "| boss | 低可信 | 场 | 第 1 回合：n，预测 / 实际，Brier（最优线预测） | 全部回合：n，预测 / 实际，Brier | 赢局掉血 预测中位 / 实际中位（误差中位，MAE；n） | 选线：选中最优 / 2 SE 内 / 回合，平均差 |",
             "|---|---|---|---|---|---|---|"]
    for name, g in out["groups"].items():
        label = NAMES.get(name, {"low_trust": "低可信合计", "trusted": "可信合计"}.get(name, name))
        t1, al = g["t1"], g["all_turns"]
        lt = "—" if g["low_trust"] is None else ("是" if g["low_trust"] else "否")
        c1 = f"{t1['n']}，{t1['mean_pred']:.2f} / {t1['actual_win']:.2f}，{t1['brier']:.3f}（{t1['mean_pred_best']:.2f}）" if t1 else "—"
        ca = f"{al['n']}，{al['mean_pred']:.2f} / {al['actual_win']:.2f}，{al['brier']:.3f}" if al else "—"
        cw = (f"{al['won_loss_pred_median']} / {al['won_loss_actual_median']}（{al['won_loss_err_median']:+}，{al['won_loss_err_mae']}；{al['won_n']}）"
              if al and al["won_n"] else "—")
        cl = f"{al['chose_top']} / {al['within_2se']} / {al['n']}，{al['mean_d'] * 100:+.1f}" if al and al["mean_d"] is not None else "—"
        lines.append(f"| {label} | {lt} | {g['fights']} | {c1} | {ca} | {cw} | {cl} |")
    text = "\n".join(lines) + "\n"
    if args.md:
        with open(args.md, "w") as handle:
            handle.write(text)
    print(text)
    print(json.dumps({"items": len(items), "unmatched": unmatched}))


if __name__ == "__main__":
    main()
