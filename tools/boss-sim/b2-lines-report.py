#!/usr/bin/env python3
"""B2 acceptance report (docs/boss-sim.md §11.6) from tools/boss-sim/b2-lines.ts's output.

Per logged boss turn: the whole-fight lines' time, whether the best line changed (the 5-turn rollout's before, the
simulation's ranking after; low-trust bosses keep the rollout's), why, and where Jev's actual line ranks.

Usage: python3 tools/boss-sim/b2-lines-report.py [--in experiments/boss-sim/raw/b2-lines.jsonl] [--out-dir experiments/boss-sim-lines]
"""

import argparse
import json
import os
import statistics

NAMES = {
    "AEONGLASS": "永恒镜", "CEREMONIAL_BEAST": "仪式兽", "CRUSHER": "帝王蟹", "KIN_FOLLOWER": "同族", "KIN_PRIEST": "同族",
    "KNOWLEDGE_DEMON": "知识恶魔", "LAGAVULIN_MATRIARCH": "乐加维林族母", "QUEEN": "女王", "SOUL_FYSH": "灵魂鱼",
    "TEST_SUBJECT": "实验体", "THE_INSATIABLE": "贪得无厌者", "VANTOM": "幻影墨", "WATERFALL_GIANT": "瀑布巨兽",
}


def boss(enc):
    return NAMES.get(enc.split("+")[0], enc)


def pct(x):
    return "—" if x is None else f"{round(x * 100)}%"


def line_text(line):
    if not line:
        return "—"
    r = line.get("rollout") or {}
    won = line.get("won_loss")
    return (f"{line['key']}（{line.get('plays')}）：模拟胜率 {pct(line.get('cal'))}（原始 {pct(line.get('win'))}），"
            f"赢局掉血中位 {won if won is not None else '—'}；5 回合推演 预期再掉 {r.get('loss')}，死 {r.get('dead')}；本回合掉血 {line.get('turn_loss')}、伤害 {line.get('damage')}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", default="experiments/boss-sim/raw/b2-lines.jsonl")
    ap.add_argument("--out-dir", default="experiments/boss-sim-lines")
    args = ap.parse_args()
    rows = [json.loads(l) for l in open(args.inp) if l.strip()]
    os.makedirs(args.out_dir, exist_ok=True)
    ms = sorted(r["sim_ms"] for r in rows)
    plan_ms = sorted(r["plan_ms"] for r in rows)
    trusted = [r for r in rows if not r["low_trust"]]
    low = [r for r in rows if r["low_trust"]]
    differs = [r for r in trusted if r["differs"]]
    jev = [r for r in rows if r["jev_rank"]]
    jev_trusted = [r for r in trusted if r["jev_rank"]]
    ranks = [r["jev_rank"] for r in jev]
    summary = {
        "states": len(rows),
        "bosses": sorted({boss(r["enc"]) for r in rows}),
        "sim_ms": {"median": statistics.median(ms), "max": max(ms), "p90": ms[int(0.9 * (len(ms) - 1))]},
        "plan_ms": {"median": statistics.median(plan_ms), "max": max(plan_ms)},
        "timed_out": sum(1 for r in rows if r["timed_out"]),
        "samples_median": statistics.median(r["samples"] for r in rows),
        "trusted": len(trusted),
        "low_trust": len(low),
        "best_differs": len(differs),
        "no_single_best_after": sum(1 for r in trusted if not r["new_best"]),
        "jev_found": len(jev),
        "jev_rank": {str(k): ranks.count(k) for k in sorted(set(ranks))},
        "jev_rank1": sum(1 for r in jev if r["jev_rank"] == 1),
        "jev_tied_with_best": sum(1 for r in jev if r["jev_tied"]),
        "jev_chose_new_best_trusted": sum(1 for r in jev_trusted if r["jev"] in r["new_best"]),
        "jev_chose_old_best_trusted": sum(1 for r in jev_trusted if r["jev"] in (r["old_best"] or []) or (r.get("old_line") and r["jev"] == r["old_line"]["key"])),
    }
    json.dump(summary, open(os.path.join(args.out_dir, "summary.json"), "w"), ensure_ascii=False, indent=1)
    keep = ["key", "enc", "turn", "options", "sim_ms", "plan_ms", "samples", "requested", "timed_out", "orders", "low_trust", "old_best", "new_best", "differs", "sim_best", "jev", "jev_rank", "jev_tied", "ranked", "old_line", "new_line", "jev_line", "plan"]
    with open(os.path.join(args.out_dir, "states.jsonl"), "w") as f:
        for r in rows:
            f.write(json.dumps({k: r.get(k) for k in keep}, ensure_ascii=False) + "\n")
    md = [
        "# B2 验收：30 个 boss 战中途局面（docs/boss-sim.md §11.6）",
        "",
        "tools/boss-sim/b2-lines.ts：验证集的 boss 战，第 2–8 回合，每场一个回合，按 boss 轮流取；每个局面让实盘规划器各出一次题，BOSS_SIM_LINES 关 / 开（worker 池 12 个、每条线 600 样本、截止 25 秒）。不调用 Jev 或 DeepSeek，Jev 的选择取自日志，按出牌文字对到新题面的选项。原始输出 experiments/boss-sim/raw/b2-lines.jsonl（gitignore），每个局面的要点在 states.jsonl。",
        "",
        f"- 局面 {len(rows)} 个，boss：{'、'.join(summary['bosses'])}。其中可信 boss {len(trusted)} 个，低可信 {len(low)} 个（排序仍按 5 回合推演）。",
        f"- 整场模拟每回合耗时：中位 {summary['sim_ms']['median'] / 1000:.1f} 秒，p90 {summary['sim_ms']['p90'] / 1000:.1f} 秒，最慢 {summary['sim_ms']['max'] / 1000:.1f} 秒；到截止时间的 {summary['timed_out']} 个。整个出题（含推演、药水蒙特卡洛）中位 {summary['plan_ms']['median'] / 1000:.1f} 秒，最慢 {summary['plan_ms']['max'] / 1000:.1f} 秒。每条线实际样本数中位 {summary['samples_median']}。",
        f"- 可信 boss 的 {len(trusted)} 个局面里，新排序的最优线和原来（5 回合推演）不同的 {len(differs)} 个；新排序没有单一最优（并列）的 {summary['no_single_best_after']} 个。",
        f"- Jev 实际选的线（对上 {len(jev)} 个）在新数字下的名次：{', '.join(f'第 {k} 名 {v} 次' for k, v in summary['jev_rank'].items())}；和最优线在 2 个标准误以内的 {summary['jev_tied_with_best']} 个。可信 boss 里 Jev 选的正是新最优线的 {summary['jev_chose_new_best_trusted']} 个。",
        "",
        "## 每个局面",
        "",
        "| 局面 | boss | 回合 | 选项 | 耗时（秒） | 样本 | 原最优 → 新最优 | Jev 选 | Jev 名次 | 与最优并列 |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        tag = "（低可信）" if r["low_trust"] else ""
        md.append(f"| {r['key']} | {boss(r['enc'])}{tag} | T{r['turn']} | {r['options']} | {r['sim_ms'] / 1000:.1f} | {r['samples']}/{r['requested']} | {','.join(r['old_best']) or '并列'} → {','.join(r['new_best']) or '并列'}{' **变**' if r['differs'] and not r['low_trust'] else ''} | {r['jev'] or '—'} | {r['jev_rank'] or '—'}/{len(r['ranked'] or [])} | {'是' if r['jev_tied'] else '否' if r['jev_tied'] is not None else '—'} |")
    md += ["", "## 最优线变了的局面（可信 boss）", ""]
    for r in differs:
        md += [f"**{r['key']} {boss(r['enc'])} T{r['turn']}**", "", f"- 原最优（推演）：{line_text(r['old_line'])}", f"- 新最优（整场模拟）：{line_text(r['new_line'])}", f"- Jev 选：{line_text(r['jev_line'])}", ""]
    plans = [r for r in rows if r.get("plan")]
    if plans:
        md += ["## 整场计划样例", ""]
        for r in plans[:4]:
            md.append(f"- {r['key']} {boss(r['enc'])} T{r['turn']}：{r['plan']}")
    open(os.path.join(args.out_dir, "report.md"), "w").write("\n".join(md) + "\n")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
