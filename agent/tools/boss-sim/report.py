#!/usr/bin/env python3
"""Report of the whole boss fight simulator's backtest (tools/boss-sim/backtest.ts output; docs/boss-sim.md).

Per start point (turn 1, turn 5) and predictor (sim = src/sim/boss-sim.ts; rollout = the live 5-turn rollout's
"expected further HP loss" / win probability with the gated terminal; rollout-model = the same with the fight-value
model as terminal, w = 1; clock = the boss clock recomputed at turn 1):
  - win: Brier score (and the constant base rate's), AUC, calibration buckets of the predicted win probability;
    the clock has no probability: "enough" (gap 0) is its prediction, -gap its score for the AUC;
  - HP loss in won fights: predicted - actual (the sim's median over its won samples; the rollout's expected loss;
    the clock's loss a turn x its fight turns);
  - turns in won fights: predicted - actual (the sim's median over won samples; the rollout's turns to the end; the
    clock's fight turns); lost fights: the turn of death (the sim's median death turn; the clock's survivable turns);
  - the same by boss.
Plain python3, no dependencies. Usage:
  python3 tools/boss-sim/report.py --results 'experiments/boss-sim/raw/v1/results-*.jsonl' [--ablation 'experiments/boss-sim/raw/noscripts/results-*.jsonl']
         [--conclusion FILE] [--md experiments/boss-sim/report.md] [--json experiments/boss-sim/summary.json]
"""

import argparse
import glob
import json
import math
import os
import statistics
import sys
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[3])  # the project root (docs/layout.md)

BUCKETS = [(0.0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.0001)]
BOSS_NAMES = {
    "CEREMONIAL_BEAST": "仪式兽", "KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST": "同族", "LAGAVULIN_MATRIARCH": "乐加维林族母",
    "SOUL_FYSH": "灵魂鱼", "VANTOM": "幻影墨", "WATERFALL_GIANT": "瀑布巨兽", "CRUSHER+ROCKET": "帝王蟹",
    "KNOWLEDGE_DEMON": "知识恶魔", "THE_INSATIABLE": "贪得无厌者", "AEONGLASS": "永恒镜", "QUEEN+TORCH_HEAD_AMALGAM": "女王",
    "TEST_SUBJECT": "实验体",
}
BOSS_ACT = {"CEREMONIAL_BEAST": 1, "KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST": 1, "LAGAVULIN_MATRIARCH": 1, "SOUL_FYSH": 1, "VANTOM": 1,
            "WATERFALL_GIANT": 1, "CRUSHER+ROCKET": 2, "KNOWLEDGE_DEMON": 2, "THE_INSATIABLE": 2, "AEONGLASS": 3,
            "QUEEN+TORCH_HEAD_AMALGAM": 3, "TEST_SUBJECT": 3}


def load(pattern):
    rows = []
    for path in sorted(glob.glob(pattern)):
        with open(path) as handle:
            rows.extend(json.loads(line) for line in handle if line.strip())
    return rows


def brier(pairs):
    return sum((p - y) ** 2 for p, y in pairs) / len(pairs) if pairs else None


def auc(pairs):
    """P(score of a random won fight > a random lost one), ties half."""
    pos = [p for p, y in pairs if y == 1]
    neg = [p for p, y in pairs if y == 0]
    if not pos or not neg:
        return None
    wins = 0.0
    for a in pos:
        for b in neg:
            wins += 1.0 if a > b else 0.5 if a == b else 0.0
    return wins / (len(pos) * len(neg))


def buckets(pairs):
    out = []
    for lo, hi in BUCKETS:
        mine = [(p, y) for p, y in pairs if lo <= p < hi]
        out.append({"bucket": f"{int(lo * 100)}–{min(100, int(round(hi * 100)))}%", "n": len(mine),
                    "pred": round(sum(p for p, _ in mine) / len(mine), 3) if mine else None,
                    "actual": round(sum(y for _, y in mine) / len(mine), 3) if mine else None})
    return out


def errs(values):
    values = [v for v in values if v is not None and not math.isnan(v)]
    if not values:
        return {"n": 0}
    s = sorted(values)
    q = lambda f: s[min(len(s) - 1, max(0, int(round(f * (len(s) - 1)))))]
    return {"n": len(s), "median": round(statistics.median(s), 1), "mean": round(statistics.fmean(s), 1), "mae": round(statistics.fmean(abs(v) for v in s), 1),
            "p10": round(q(0.1), 1), "p90": round(q(0.9), 1), "within5": round(sum(1 for v in s if abs(v) <= 5) / len(s), 3)}


def win_preds(row):
    """{predictor: probability} for one row."""
    out = {}
    sim = row.get("sim")
    if sim:
        out["sim"] = sim["winProb"]
    ro = row.get("rollout")
    if ro:
        out["rollout"] = ro["winProb"]
        if ro.get("modelWinProb") is not None:
            out["rollout-model"] = ro["modelWinProb"]
    clock = row.get("clock")
    if clock:
        out["clock"] = 1.0 if clock["gap"] == 0 else 0.0
    return out


def clock_score(row):
    clock = row.get("clock")
    return -clock["gap"] if clock else None


def loss_preds(row):
    out = {}
    sim = row.get("sim")
    if sim and sim.get("hpLossWon"):
        out["sim"] = sim["hpLossWon"]["median"]
    ro = row.get("rollout")
    if ro:
        out["rollout"] = ro["hpLoss"]
        if ro.get("modelHpLoss") is not None:
            out["rollout-model"] = ro["modelHpLoss"]
    clock = row.get("clock")
    if clock:
        out["clock"] = min(row["actual"]["hp"], clock["lossPerTurn"] * clock["fightTurns"])
    return out


def turn_preds(row):
    out = {}
    sim = row.get("sim")
    if sim and sim.get("turnsWon"):
        out["sim"] = sim["turnsWon"]["median"]
    ro = row.get("rollout")
    if ro and ro.get("turnsToWin") is not None:
        out["rollout"] = ro["turnsToWin"]
    clock = row.get("clock")
    if clock:
        out["clock"] = clock["fightTurns"]
    return out


def death_preds(row):
    out = {}
    sim = row.get("sim")
    if sim and sim.get("deathTurn"):
        out["sim"] = sim["deathTurn"]["median"]
    clock = row.get("clock")
    if clock:
        out["clock"] = clock["survivableTurns"]
    return out


PREDICTORS = ["sim", "rollout", "rollout-model", "clock"]


def section(rows):
    """Every measure for a set of rows (one start point)."""
    ok = [r for r in rows if r.get("sim")]
    base = sum(1 for r in ok if r["actual"]["won"]) / len(ok) if ok else 0
    out = {"n": len(ok), "won": sum(1 for r in ok if r["actual"]["won"]), "base_rate": round(base, 3), "win": {}, "loss_won": {}, "turns_won": {}, "death_turn": {}}
    common = [r for r in ok if all(k in win_preds(r) for k in ("sim", "rollout"))]
    out["base_brier"] = round(brier([(base, 1 if r["actual"]["won"] else 0) for r in ok]), 4) if ok else None
    for name in PREDICTORS:
        pairs = [(win_preds(r)[name], 1 if r["actual"]["won"] else 0) for r in ok if name in win_preds(r)]
        if not pairs:
            continue
        score_pairs = [(clock_score(r), 1 if r["actual"]["won"] else 0) for r in ok if clock_score(r) is not None] if name == "clock" else pairs
        out["win"][name] = {"n": len(pairs), "brier": round(brier(pairs), 4), "auc": round(auc(score_pairs), 3) if auc(score_pairs) is not None else None,
                            "mean_pred": round(sum(p for p, _ in pairs) / len(pairs), 3), "buckets": buckets(pairs),
                            "accuracy": round(sum(1 for p, y in pairs if (p >= 0.5) == (y == 1)) / len(pairs), 3)}
    out["common_n"] = len(common)
    won = [r for r in ok if r["actual"]["won"]]
    lost = [r for r in ok if not r["actual"]["won"]]
    for name in PREDICTORS:
        e = errs([loss_preds(r)[name] - r["actual"]["hpLoss"] for r in won if name in loss_preds(r)])
        if e["n"]:
            out["loss_won"][name] = e
        e = errs([turn_preds(r)[name] - r["actual"]["turnsLeft"] for r in won if name in turn_preds(r)])
        if e["n"]:
            out["turns_won"][name] = e
        e = errs([death_preds(r)[name] - r["actual"]["turnsLeft"] for r in lost if name in death_preds(r)])
        if e["n"]:
            out["death_turn"][name] = e
    # The sim's whole-sample HP loss (a death = all HP) against the actual, every fight.
    out["loss_all_sim"] = errs([r["sim"]["hpLoss"]["mean"] - r["actual"]["hpLoss"] for r in ok])
    out["capped"] = sum(r["sim"].get("capped", 0) for r in ok)
    out["samples"] = sum(r["sim"]["samples"] for r in ok)
    out["sim_ms"] = errs([r["sim"].get("ms", 0) / max(1, r["sim"]["samples"]) for r in ok])
    return out


def per_turn(rows, turns, start, upto=8):
    """Turn by turn, over the fights still fighting that turn in the log: the sim's mean HP lost / damage dealt that turn
    (over its samples still fighting) against the log's (HP lost; damage = the living enemies' HP drop to the next turn,
    left out where a phase, a husk or a heal makes it no damage measure: Test Subject, a 999999999 husk, a rise)."""
    offset = 0 if start == "t1" else 4
    out = []
    for k in range(1, upto + 1):
        sim_loss, act_loss, sim_dmg, act_dmg, sim_in, act_in, sim_enemy, act_enemy = [], [], [], [], [], [], [], []
        for r in rows:
            sim = r.get("sim")
            by = {t[0]: t for t in turns.get(r["key"], [])}
            here = by.get(k + offset)
            if not sim or not here or len(sim.get("perTurn", [])) < k:
                continue
            fighting, loss, dmg = sim["perTurn"][k - 1][:3]
            if fighting == 0:
                continue
            sim_loss.append(loss)
            act_loss.append(here[3] if here[3] is not None else 0)
            if len(sim["perTurn"][k - 1]) >= 5 and len(here) >= 6 and here[4] is not None and here[5] is not None:
                sim_in.append(sim["perTurn"][k - 1][3])
                sim_enemy.append(sim["perTurn"][k - 1][4])
                act_in.append(here[4])
                act_enemy.append(here[5])
            nxt = by.get(k + offset + 1)
            if nxt and r["enc"] != "TEST_SUBJECT" and here[2] is not None and nxt[2] is not None and here[2] < 100000 and nxt[2] <= here[2]:
                sim_dmg.append(dmg)
                act_dmg.append(here[2] - nxt[2])
        if sim_loss:
            out.append({"turn": k + offset, "n": len(sim_loss), "sim_loss": round(statistics.fmean(sim_loss), 1), "actual_loss": round(statistics.fmean(act_loss), 1),
                        "n_dmg": len(sim_dmg), "sim_dmg": round(statistics.fmean(sim_dmg), 1) if sim_dmg else None, "actual_dmg": round(statistics.fmean(act_dmg), 1) if act_dmg else None,
                        "n_in": len(sim_in), "sim_in": round(statistics.fmean(sim_in), 1) if sim_in else None, "actual_in": round(statistics.fmean(act_in), 1) if act_in else None,
                        "sim_enemy": round(statistics.fmean(sim_enemy), 1) if sim_enemy else None, "actual_enemy": round(statistics.fmean(act_enemy), 1) if act_enemy else None})
    return out


def by_boss(rows):
    out = []
    for enc in sorted({r["enc"] for r in rows}, key=lambda e: (BOSS_ACT.get(e, 9), e)):
        mine = [r for r in rows if r["enc"] == enc and r.get("sim")]
        if not mine:
            continue
        won = [r for r in mine if r["actual"]["won"]]
        lost = [r for r in mine if not r["actual"]["won"]]
        row = {"enc": enc, "name": BOSS_NAMES.get(enc, enc), "act": BOSS_ACT.get(enc), "n": len(mine), "won": len(won),
               "sim_win": round(statistics.fmean(r["sim"]["winProb"] for r in mine), 3)}
        for name in ("sim", "rollout", "clock"):
            pairs = [(win_preds(r)[name], 1 if r["actual"]["won"] else 0) for r in mine if name in win_preds(r)]
            row[f"brier_{name}"] = round(brier(pairs), 3) if pairs else None
            if name == "rollout" and pairs:
                row["rollout_win"] = round(statistics.fmean(p for p, _ in pairs), 3)
        row["loss_err_sim"] = errs([loss_preds(r)["sim"] - r["actual"]["hpLoss"] for r in won if "sim" in loss_preds(r)])
        row["loss_err_rollout"] = errs([loss_preds(r)["rollout"] - r["actual"]["hpLoss"] for r in won if "rollout" in loss_preds(r)])
        row["turn_err_sim"] = errs([turn_preds(r)["sim"] - r["actual"]["turnsLeft"] for r in won if "sim" in turn_preds(r)])
        row["death_err_sim"] = errs([death_preds(r)["sim"] - r["actual"]["turnsLeft"] for r in lost if "sim" in death_preds(r)])
        row["actual_turns_won"] = round(statistics.median(r["actual"]["turnsLeft"] for r in won), 1) if won else None
        row["sim_turns_won"] = round(statistics.median(r["sim"]["turnsWon"]["median"] for r in mine if r["sim"].get("turnsWon")), 1) if any(r["sim"].get("turnsWon") for r in mine) else None
        out.append(row)
    return out


def fmt(x, digits=3):
    if x is None:
        return "–"
    if isinstance(x, float):
        return f"{x:.{digits}f}".rstrip("0").rstrip(".") if digits else str(round(x))
    return str(x)


def render(summary, conclusion):
    lines = []
    lines.append("# boss 战整场模拟器回测（B1）\n")
    if conclusion:
        lines.append(conclusion.strip() + "\n")
    meta = summary["meta"]
    lines.append(f"数据：{meta['fights']} 场 A{'/'.join(map(str, meta['ascensions']))} boss 战（日志库 fights 视图 room = boss，{meta['first']} – {meta['last']}）；"
                 f"每个起点 {meta['samples']} 个样本，最多 {meta['max_turns']} 回合。模拟 = src/sim/boss-sim.ts（起点这回合用 solver 的最优线，之后每回合 solver 出牌，"
                 "伤害权重 ×0.5，抽牌抽到的牌可打，女王战按先杀火炬头；docs/boss-sim.md）；"
                 "推演 = 现有 5 回合推演（8 样本、不限时）+ 门控终值，「推演-模型」= 同一推演换成 fight-value 模型终值（w=1，模型在这些战斗上训练过，偏乐观）；"
                 "时钟 = boss-clock.ts 按实际进场血量重算（只有第 1 回合）。误差一律 预测 − 实际。\n")
    for start in ("t1", "t5"):
        s = summary["starts"].get(start)
        if not s or not s["n"]:
            continue
        title = "第 1 回合起" if start == "t1" else "第 5 回合起（打到第 5 回合的场次）"
        lines.append(f"\n## {title}\n")
        lines.append(f"{s['n']} 场，实际赢 {s['won']} 场（{fmt(s['base_rate'])}）；常数基线（都报总胜率）的 Brier = {fmt(s['base_brier'], 4)}。"
                     f"模拟共 {s['samples']} 个样本，到上限回合没分胜负的 {s['capped']} 个；每样本耗时中位 {fmt(s['sim_ms'].get('median'), 1)} ms（单线程）。\n")
        lines.append("\n**胜负**\n")
        lines.append("| 预测 | n | Brier | AUC | 预测平均胜率 | 按 50% 判对 |\n|---|---|---|---|---|---|")
        for name in PREDICTORS:
            w = s["win"].get(name)
            if w:
                lines.append(f"| {name} | {w['n']} | {fmt(w['brier'], 4)} | {fmt(w['auc'])} | {fmt(w['mean_pred'])} | {fmt(w['accuracy'])} |")
        lines.append("\n**胜率分桶（预测胜率 → 实际胜率）**\n")
        names = [n for n in ("sim", "rollout", "rollout-model") if n in s["win"]]
        lines.append("| 桶 | " + " | ".join(f"{n} 场数 | {n} 预测 | {n} 实际" for n in names) + " |")
        lines.append("|---|" + "---|" * (3 * len(names)))
        for k in range(len(BUCKETS)):
            cells = []
            for n in names:
                b = s["win"][n]["buckets"][k]
                cells += [str(b["n"]), fmt(b["pred"]), fmt(b["actual"])]
            lines.append(f"| {s['win'][names[0]]['buckets'][k]['bucket']} | " + " | ".join(cells) + " |")
        if "clock" in s["win"]:
            c = s["win"]["clock"]
            lines.append(f"\n时钟报「够」（gap 0）的 {c['buckets'][-1]['n']} 场实际胜率 {fmt(c['buckets'][-1]['actual'])}；报「不够」的 {c['buckets'][0]['n']} 场实际胜率 {fmt(c['buckets'][0]['actual'])}。\n")
        for key, label in (("loss_won", "赢局掉血（预测 − 实际，HP）"), ("turns_won", "赢局回合数（预测 − 实际）"), ("death_turn", "输局死亡回合（预测 − 实际）")):
            lines.append(f"\n**{label}**\n")
            lines.append("| 预测 | n | 中位 | 平均 | MAE | p10 | p90 | ±5 以内 |\n|---|---|---|---|---|---|---|---|")
            for name in PREDICTORS:
                e = s[key].get(name)
                if e:
                    lines.append(f"| {name} | {e['n']} | {fmt(e['median'], 1)} | {fmt(e['mean'], 1)} | {fmt(e['mae'], 1)} | {fmt(e['p10'], 1)} | {fmt(e['p90'], 1)} | {fmt(e['within5'])} |")
        e = s["loss_all_sim"]
        lines.append(f"\n模拟的整体掉血（样本均值，死了算全部血）对实际（死了算全部血），全部 {e['n']} 场：中位误差 {fmt(e['median'], 1)}，平均 {fmt(e['mean'], 1)}，MAE {fmt(e['mae'], 1)}。\n")
    for start in ("t1", "t5"):
        pt = summary.get("per_turn", {}).get(start)
        if not pt:
            continue
        lines.append(f"\n## 逐回合：模拟对实际（{'第 1 回合起' if start == 't1' else '第 5 回合起'}；这回合在日志里还在打的场次）\n")
        lines.append("模拟的数 = 这回合还在打的样本的平均；实际伤害 = 活着的敌人合计血量到下回合的降幅（实验体、巨兽空壳、回血的回合不算）；"
                     "来袭 = 敌人显示的攻击合计（实际：回合开始时活着的；模拟：我方回合结束时还活着的）；敌人回合掉血 = 来袭打穿格挡的部分（实际：本回合最后一帧到下回合开始）。\n")
        lines.append("| 回合 | 场 | 掉血 模拟 | 掉血 实际 | 来袭 模拟 | 来袭 实际 | 敌人回合掉血 模拟 | 敌人回合掉血 实际 | 场（伤害） | 伤害 模拟 | 伤害 实际 |\n|---|---|---|---|---|---|---|---|---|---|---|")
        for t in pt:
            lines.append(f"| {t['turn']} | {t['n']} | {fmt(t['sim_loss'], 1)} | {fmt(t['actual_loss'], 1)} | {fmt(t.get('sim_in'), 1)} | {fmt(t.get('actual_in'), 1)} | {fmt(t.get('sim_enemy'), 1)} | {fmt(t.get('actual_enemy'), 1)} | {t['n_dmg']} | {fmt(t['sim_dmg'], 1)} | {fmt(t['actual_dmg'], 1)} |")
    held = summary.get("heldout")
    if held:
        lines.append(f"\n## 留出集：fight-value 模型训练时还没有的局（{held['runs_trained']} 局训练；只看这些局的 boss 战）\n")
        lines.append("「推演-模型」的终值模型在全集上是样本内的；这里只算它没见过的局，比较才公平。\n")
        lines.append("| 起点 | 预测 | n | Brier | AUC | 预测平均胜率 | 实际胜率 | 赢局掉血误差中位 (n) |\n|---|---|---|---|---|---|---|---|")
        for start in ("t1", "t5"):
            s = held["starts"].get(start)
            if not s or not s["n"]:
                continue
            for name in PREDICTORS:
                w = s["win"].get(name)
                if w:
                    e = s["loss_won"].get(name, {})
                    lines.append(f"| {start} | {name} | {w['n']} | {fmt(w['brier'], 4)} | {fmt(w['auc'])} | {fmt(w['mean_pred'])} | {fmt(s['base_rate'])} | {fmt(e.get('median'), 1)} ({e.get('n', 0)}) |")
    boss = summary.get("bosses", {})
    for start in ("t1", "t5"):
        rows = boss.get(start)
        if not rows:
            continue
        lines.append(f"\n## 按 boss（{'第 1 回合起' if start == 't1' else '第 5 回合起'}）\n")
        lines.append("| 幕 | boss | 场 | 实际胜率 | 模拟平均胜率 | 推演平均胜率 | Brier 模拟 | Brier 推演 | Brier 时钟 | 赢局掉血误差中位 模拟 / 推演 (n) | 赢局回合 实际中位 / 模拟中位 | 输局死亡回合误差中位 (n) |")
        lines.append("|---|---|---|---|---|---|---|---|---|---|---|---|")
        for r in rows:
            lines.append(f"| {r['act']} | {r['name']} | {r['n']} | {fmt(r['won'] / r['n'])} | {fmt(r['sim_win'])} | {fmt(r.get('rollout_win'))} | {fmt(r['brier_sim'])} | {fmt(r['brier_rollout'])} | {fmt(r['brier_clock'])} | "
                         f"{fmt(r['loss_err_sim'].get('median'), 1)} / {fmt(r['loss_err_rollout'].get('median'), 1)} ({r['loss_err_sim']['n']}) | {fmt(r['actual_turns_won'], 1)} / {fmt(r['sim_turns_won'], 1)} | "
                         f"{fmt(r['death_err_sim'].get('median'), 1)} ({r['death_err_sim']['n']}) |")
    ab = summary.get("ablation")
    if ab:
        lines.append("\n## 消融：不加整场脚本（只去掉 5 回合窗口）\n")
        lines.append("| 起点 | n | Brier 有脚本 | Brier 无脚本 | AUC 有 / 无 | 赢局掉血误差中位 有 / 无 | 赢局回合误差中位 有 / 无 |\n|---|---|---|---|---|---|---|")
        for start, a in ab.items():
            lines.append(f"| {start} | {a['n']} | {fmt(a['brier_on'], 4)} | {fmt(a['brier_off'], 4)} | {fmt(a['auc_on'])} / {fmt(a['auc_off'])} | {fmt(a['loss_on'], 1)} / {fmt(a['loss_off'], 1)} | {fmt(a['turn_on'], 1)} / {fmt(a['turn_off'], 1)} |")
        if summary.get("ablation_bosses"):
            lines.append("\n| boss | 场 | Brier 有脚本 | Brier 无脚本 | 模拟平均胜率 有 / 无 | 实际胜率 |\n|---|---|---|---|---|---|")
            for r in summary["ablation_bosses"]:
                lines.append(f"| {r['name']} | {r['n']} | {fmt(r['brier_on'])} | {fmt(r['brier_off'])} | {fmt(r['win_on'])} / {fmt(r['win_off'])} | {fmt(r['actual'])} |")
    return "\n".join(lines) + "\n"


def ablation(rows, off_rows):
    off = {(r["key"], r["start"]): r for r in off_rows if r.get("sim")}
    out, per_boss = {}, []
    for start in ("t1", "t5"):
        pairs = [(r, off[(r["key"], start)]) for r in rows if r["start"] == start and r.get("sim") and (r["key"], start) in off]
        if not pairs:
            continue
        y = lambda r: 1 if r["actual"]["won"] else 0
        won = [(a, b) for a, b in pairs if a["actual"]["won"]]
        med = lambda xs: round(statistics.median(xs), 1) if xs else None
        out[start] = {
            "n": len(pairs),
            "brier_on": brier([(a["sim"]["winProb"], y(a)) for a, _ in pairs]), "brier_off": brier([(b["sim"]["winProb"], y(b)) for _, b in pairs]),
            "auc_on": auc([(a["sim"]["winProb"], y(a)) for a, _ in pairs]), "auc_off": auc([(b["sim"]["winProb"], y(b)) for _, b in pairs]),
            "loss_on": med([a["sim"]["hpLossWon"]["median"] - a["actual"]["hpLoss"] for a, _ in won if a["sim"].get("hpLossWon")]),
            "loss_off": med([b["sim"]["hpLossWon"]["median"] - b["actual"]["hpLoss"] for _, b in won if b["sim"].get("hpLossWon")]),
            "turn_on": med([a["sim"]["turnsWon"]["median"] - a["actual"]["turnsLeft"] for a, _ in won if a["sim"].get("turnsWon")]),
            "turn_off": med([b["sim"]["turnsWon"]["median"] - b["actual"]["turnsLeft"] for _, b in won if b["sim"].get("turnsWon")]),
        }
        if start == "t1":
            for enc in sorted({a["enc"] for a, _ in pairs}, key=lambda e: (BOSS_ACT.get(e, 9), e)):
                mine = [(a, b) for a, b in pairs if a["enc"] == enc]
                per_boss.append({"enc": enc, "name": BOSS_NAMES.get(enc, enc), "n": len(mine),
                                 "brier_on": brier([(a["sim"]["winProb"], y(a)) for a, _ in mine]), "brier_off": brier([(b["sim"]["winProb"], y(b)) for _, b in mine]),
                                 "win_on": statistics.fmean(a["sim"]["winProb"] for a, _ in mine), "win_off": statistics.fmean(b["sim"]["winProb"] for _, b in mine),
                                 "actual": statistics.fmean(y(a) for a, _ in mine)})
    return out, per_boss


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--results", default=os.path.join(ROOT, "experiments/boss-sim/raw/v1/results-*.jsonl"))
    parser.add_argument("--ablation")
    parser.add_argument("--fights", default="experiments/boss-sim/raw/fights.jsonl", help="for the date range only (read line by line)")
    parser.add_argument("--turns", default="experiments/boss-sim/raw/turns.jsonl", help="tools/boss-sim/extract.py --turns-out")
    parser.add_argument("--fv-rows", default=os.path.join(ROOT, "data/fight-value-rows.jsonl"),
                        help="the fight-value model's training rows: fights of runs not in them are held out for the rollout's model terminal")
    parser.add_argument("--conclusion")
    parser.add_argument("--md")
    parser.add_argument("--json")
    args = parser.parse_args(argv)
    rows = load(args.results)
    errors = [r for r in rows if not r.get("sim")]
    first = last = None
    if os.path.exists(args.fights):
        with open(args.fights) as handle:
            for line in handle:
                ts = json.loads(line[:2000].split(', "t1"')[0] + "}")["first_ts"] if '"first_ts"' in line[:2000] else None
                if ts:
                    first = min(first or ts, ts)
                    last = max(last or ts, ts)
    samples = max((r["sim"]["samples"] for r in rows if r.get("sim")), default=0)
    turns_cap = max((r["sim"]["turns"]["max"] for r in rows if r.get("sim")), default=0)
    summary = {
        "meta": {"fights": len({r["key"] for r in rows}), "ascensions": sorted({r["asc"] for r in rows}), "samples": samples, "max_turns": 30,
                 "first": (first or "")[:16], "last": (last or "")[:16], "errors": [{"key": r["key"], "start": r["start"], "error": r.get("error") or r.get("simError")} for r in errors],
                 "longest_sample": turns_cap},
        "starts": {start: section([r for r in rows if r["start"] == start]) for start in ("t1", "t5")},
        "bosses": {start: by_boss([r for r in rows if r["start"] == start]) for start in ("t1", "t5")},
    }
    turns = {}
    if os.path.exists(args.turns):
        with open(args.turns) as handle:
            for line in handle:
                row = json.loads(line)
                turns[row["key"]] = row["turns"]
    summary["per_turn"] = {start: per_turn([r for r in rows if r["start"] == start], turns, start) for start in ("t1", "t5")}
    train = set()
    if args.fv_rows and os.path.exists(args.fv_rows):
        with open(args.fv_rows) as handle:
            for line in handle:
                train.add(json.loads(line)["run"])
    if train:
        held = [r for r in rows if r["run"] not in train]
        summary["heldout"] = {"runs_trained": len(train), "starts": {start: section([r for r in held if r["start"] == start]) for start in ("t1", "t5")}}
    if args.ablation:
        summary["ablation"], summary["ablation_bosses"] = ablation(rows, load(args.ablation))
    conclusion = open(args.conclusion).read() if args.conclusion else ""
    if args.json:
        with open(args.json, "w") as handle:
            json.dump(summary, handle, ensure_ascii=False, indent=1)
    text = render(summary, conclusion)
    if args.md:
        with open(args.md, "w") as handle:
            handle.write(text)
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
