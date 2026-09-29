#!/usr/bin/env python3
"""M1 replay (2026-09-29): arms A (DeepSeek, v3 prompt), B (DeepSeek, full knowledge), C (Claude Opus, full knowledge).

Reads results.jsonl (raw, not committed) and the dsh dataset (logged choices), writes compare.md: agreement between the
arms and with the logged choice, and every question where B or C differs from A with each arm's decision and reason.
The prose analysis is in notes.md.

    python3 experiments/brain-replay/m1-0929/compare.py
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
DATASET = "/home/dw/Projects/sts2-jev/jev-sts2-dsh/experiments/dsh/data/dataset.jsonl"
ARMS = {"A": ("deepseek", "off"), "B": ("deepseek", "full"), "C": ("claude", "full")}


def order():
    text = re.sub(r"#.*", "", open(os.path.join(HERE, "questions.txt"), encoding="utf8").read())
    return re.findall(r"q\d+", text)


def strip_leave(plan):
    plan = plan if isinstance(plan, list) else []
    return plan[: plan.index("leave")] if "leave" in plan else plan


def decision(kind, answer):
    """As tools/brain-replay.ts decisionKey: a route repeating the choice adds nothing; a shop list is its set of buys."""
    if not answer:
        return None
    if kind == "pick":
        route = answer.get("route")
        return str(answer.get("choice")) + (f"|{route}" if route and route != answer.get("choice") else "")
    if kind == "shop-plan":
        return json.dumps(sorted(str(step) for step in strip_leave(answer.get("plan"))), ensure_ascii=False)
    return f"{answer.get('elites')}|{answer.get('rest')}"


def logged_answer(row):
    logged = row.get("logged") or {}
    if row["kind"] == "run-plan":
        raw = logged.get("raw") if isinstance(logged.get("raw"), dict) else logged
        return raw if isinstance(raw.get("elites"), str) else None
    if row["kind"] == "shop-plan":
        return {"plan": logged["plan"], "reason": logged.get("reason")} if isinstance(logged.get("plan"), list) else None
    if not isinstance(logged.get("choice"), str):
        return None
    return {"choice": logged["choice"], "reason": logged.get("reason"), **({"route": logged["route"]} if logged.get("route") else {})}


def reason_of(kind, answer):
    if not answer:
        return "-"
    if kind == "run-plan":
        text = f"{answer.get('archetype', '')}; elites {answer.get('elites')}, rest {answer.get('rest')}; {answer.get('summary', '')}"
    else:
        text = str(answer.get("reason") or "")
        if answer.get("route_reason"):
            text += f" / route: {answer['route_reason']}"
    return text.replace("|", "/").replace("\n", " ")


def option_text(row, key):
    """A short description of a pick option (its card / option name), for the tables."""
    if not key:
        return ""
    base = key.split("|")[0].split(":")[0]
    raw = (row.get("criteria") or {}).get(base)
    try:
        crit = json.loads(raw) if raw else {}
    except (TypeError, ValueError):
        crit = {}
    name = crit.get("card") or crit.get("option") or crit.get("title") or crit.get("text") or crit.get("name") or ""
    return str(name)[:40]


def main():
    rows = {}
    for line in open(DATASET, encoding="utf8"):
        row = json.loads(line)
        if "label" in row:
            rows[row["id"]] = row
    results = [json.loads(line) for line in open(os.path.join(HERE, "results.jsonl"), encoding="utf8") if line.strip()]
    ids = order()
    by = {arm: {} for arm in ARMS}
    for r in results:
        for arm, (engine, knowledge) in ARMS.items():
            if r["engine"] == engine and (r.get("knowledge") or "off") == knowledge and r["id"] in ids:
                by[arm][r["id"]] = r  # the last row of a question wins
    out = ["# M1 回放：三组答案对照（compare.py 生成）", ""]
    out.append("A = DeepSeek deepseek-flash、v3 问法（KNOWLEDGE_PREFIX=off，今天的攻略+手册）；B = DeepSeek、全量知识；C = Claude claude-opus-5-5、全量知识、不带工具。")
    out.append("")
    # Agreement.
    def agree(x, y):
        both = same = 0
        for qid in ids:
            rx, ry = by[x].get(qid), by[y].get(qid)
            if not rx or not ry or not rx.get("answer") or not ry.get("answer"):
                continue
            both += 1
            same += decision(rx["kind"], rx["answer"]) == decision(ry["kind"], ry["answer"])
        return same, both
    out += ["## 一致率（同一决定；pick 比较 choice 和 route（与 choice 相同的 route 不算），商店比较 leave 之前买的东西（不计顺序），run plan 比较 elites|rest）", "", "| 对照 | 一致 |", "|---|---|"]
    for x, y in (("A", "B"), ("A", "C"), ("B", "C")):
        same, both = agree(x, y)
        out.append(f"| {x} ~ {y} | {same}/{both} ({round(100 * same / both) if both else '-'}%) |")
    for arm in ARMS:
        both = same = 0
        for qid in ids:
            r = by[arm].get(qid)
            logged = logged_answer(rows[qid])
            if not r or not r.get("answer") or not logged:
                continue
            both += 1
            if r["kind"] == "pick":
                same += r["answer"].get("choice") == logged.get("choice")
            else:
                same += decision(r["kind"], r["answer"]) == decision(r["kind"], logged)
        out.append(f"| {arm} ~ 日志原选择（pick 只比 choice） | {same}/{both} ({round(100 * same / both) if both else '-'}%) |")
    out.append("")
    # Per question.
    out += ["## 逐题决定", "", "| id | 题型 | 日志 | A | B | C |", "|---|---|---|---|---|---|"]
    for qid in ids:
        row = rows[qid]
        cells = []
        for arm in ARMS:
            r = by[arm].get(qid)
            if not r:
                cells.append("（未跑）")
            elif r.get("error"):
                cells.append(f"错误: {r['error'][:40]}")
            else:
                key = decision(r["kind"], r.get("answer"))
                cells.append(f"{key} {option_text(row, key)}".strip() + ("" if r.get("ok") else "（不合法）"))
        logged = logged_answer(row)
        lkey = decision(row["kind"], logged) if logged else "-"
        out.append(f"| {qid} | {row['label']} | {lkey} {option_text(row, lkey) if logged else ''} | {' | '.join(cells)} |")
    out.append("")
    # Differences with reasons.
    for other in ("B", "C"):
        out += [f"## {other} 和 A 不一致的题（各组理由原文）", ""]
        n = 0
        for qid in ids:
            ra, ro = by["A"].get(qid), by[other].get(qid)
            if not ra or not ro or not ra.get("answer") or not ro.get("answer"):
                continue
            kind = ra["kind"]
            if decision(kind, ra["answer"]) == decision(kind, ro["answer"]):
                continue
            n += 1
            row = rows[qid]
            logged = logged_answer(row)
            out.append(f"### {qid} {row['label']}（{row['run_id']} F{row['floor']}）")
            out.append(f"- 日志: {decision(kind, logged) if logged else '-'} {option_text(row, decision(kind, logged)) if logged else ''} — {reason_of(kind, logged) if logged else ''}")
            for arm in ARMS:
                r = by[arm].get(qid)
                if r and r.get("answer"):
                    key = decision(kind, r["answer"])
                    out.append(f"- {arm}: {key} {option_text(row, key)} — {reason_of(kind, r['answer'])}")
            out.append("")
        if n == 0:
            out += ["（无）", ""]
    with open(os.path.join(HERE, "compare.md"), "w", encoding="utf8") as f:
        f.write("\n".join(out) + "\n")
    print(f"compare.md: {sum(len(v) for v in by.values())} results over {len(ids)} questions")


if __name__ == "__main__":
    main()
