#!/usr/bin/env python3
"""V4 M2 build-facts replay (2026-09-30): the same 20 logged build questions asked of DeepSeek once with the old
question (v4 0c82444: code_value / code_rank / why on every option) and once with the new one (facts only: outcome
statistics, copies in the deck, upgrade previews), both with KNOWLEDGE_PREFIX=full.

Reads old/results.jsonl, new/results.jsonl (tools/brain-replay.ts; raw, not committed) and old/dataset.jsonl,
new/dataset.jsonl (tools/build-facts-replay.ts renders; raw), writes summary.md: valid answers per arm, agreement on
the build decision, and every question where the two differ, with each side's choice and reason. Describes, does not
judge.

    python3 experiments/build-facts-m2/compare.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ARMS = ("old", "new")


def rows(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def strip_leave(plan):
    plan = plan if isinstance(plan, list) else []
    return plan[: plan.index("leave")] if "leave" in plan else plan


def build_decision(kind, answer):
    """The build decision only (a route kept or changed on the same question is reported apart): a pick's choice and
    the cards it names; a shop list's buys before "leave" as a set."""
    if not answer:
        return None
    if kind == "shop-plan":
        return json.dumps(sorted(str(step) for step in strip_leave(answer.get("plan"))), ensure_ascii=False)
    cards = answer.get("cards") or []
    return str(answer.get("choice")) + (f" cards={sorted(map(str, cards))}" if cards else "")


def option_name(criteria, key):
    """What an option key names, from the question's own options (card / item / rest action and card / event option)."""
    text = (criteria or {}).get(str(key).split("|")[0])
    if text is None:
        return str(key)
    try:
        option = json.loads(text)
    except ValueError:
        return text[:60]
    parts = [str(option[field]) for field in ("card", "buy", "option", "relic", "discard", "end") if option.get(field)]
    if option.get("then") and option.get("then") not in parts:
        parts.append(str(option["then"]))
    return " / ".join(parts) or str(key)


def describe(row, dataset, kind):
    answer = row.get("answer") if row else None
    if not answer:
        return "-", (row or {}).get("error") or "; ".join((row or {}).get("problems") or []) or "no answer"
    if not row.get("ok"):
        return f"不合法：{json.dumps(answer.get('plan', answer.get('choice')), ensure_ascii=False)}", "; ".join(row.get("problems") or [])[:160]
    criteria = dataset.get("criteria") or {}
    if kind == "shop-plan":
        steps = strip_leave(answer.get("plan"))
        what = ", ".join(option_name(criteria, step) if not str(step).startswith("remove:") else str(step) for step in steps) or "buy nothing"
    else:
        what = f"{answer.get('choice')} ({option_name(criteria, answer.get('choice'))})"
        if answer.get("cards"):
            what += f" cards {answer.get('cards')}"
    return what, str(answer.get("reason") or "").replace("|", "/")


def main():
    results = {arm: {r["id"]: r for r in rows(os.path.join(HERE, arm, "results.jsonl"))} for arm in ARMS}
    data = {arm: {r["id"]: r for r in rows(os.path.join(HERE, arm, "dataset.jsonl"))} for arm in ARMS}
    ids = sorted(set(results["old"]) | set(results["new"]))
    lines = ["# V4 M2 构筑事实回放：旧题面 vs 新题面（DeepSeek，KNOWLEDGE_PREFIX=full）", ""]
    lines.append("由 compare.py 从 old/、new/ 的 results.jsonl 生成（原始文件不提交）。只描述，不评判。")
    lines.append("")
    lines.append("| 组 | n | 合法（首答） | 合法（含补问） | 出错 | 中位耗时 s | 平均输入 token | 平均输出 token |")
    lines.append("|---|---|---|---|---|---|---|---|")
    for arm in ARMS:
        rs = [results[arm][i] for i in ids if i in results[arm]]
        n = len(rs)
        lat = sorted(r["latency_ms"] / 1000 for r in rs if not r.get("error"))
        med = lat[len(lat) // 2] if lat else 0
        inp = sum(r["usage"].get("inputTokens") or 0 for r in rs) / max(1, n)
        out = sum(r["usage"].get("outputTokens") or 0 for r in rs) / max(1, n)
        lines.append(f"| {arm} | {n} | {sum(1 for r in rs if r.get('first_ok'))}/{n} | {sum(1 for r in rs if r.get('ok'))}/{n} | {sum(1 for r in rs if r.get('error'))} | {med:.1f} | {inp:.0f} | {out:.0f} |")
    # Compared where both answers are valid (a plan step the question does not offer, or an unknown option, is not).
    both = [i for i in ids if results["old"].get(i, {}).get("ok") and results["new"].get(i, {}).get("ok")]
    same = [i for i in both if build_decision(results["old"][i]["kind"], results["old"][i]["answer"]) == build_decision(results["new"][i]["kind"], results["new"][i]["answer"])]
    routes = [i for i in both if (results["old"][i]["answer"].get("route") or None) != (results["new"][i]["answer"].get("route") or None)]
    lines += ["", f"构筑决定一致：{len(same)}/{len(both)}（两边答案都合法的题；商店按所买物品的集合比，选项带牌的连牌一起比）。"]
    lines.append(f"同一题里附带的路线（保留/换路）答得不同：{len(routes)} 题（{', '.join(routes) or '无'}）；路线块是 v4-brain 的，未改。")
    by_label = {}
    for i in both:
        label = results["new"][i]["label"]
        by_label.setdefault(label, [0, 0])
        by_label[label][1] += 1
        by_label[label][0] += i in same
    lines += ["", "按题型：" + "；".join(f"{label} {a}/{b}" for label, (a, b) in sorted(by_label.items())), ""]
    lines += ["## 不一致的题", "", "| id | 题型 | 旧题面的选择 | 旧理由 | 新题面的选择 | 新理由 |", "|---|---|---|---|---|---|"]
    for i in ids:
        if i in same:
            continue
        kind = (results["new"].get(i) or results["old"].get(i))["kind"]
        label = (results["new"].get(i) or results["old"].get(i))["label"]
        old_what, old_why = describe(results["old"].get(i), data["old"].get(i, {}), kind)
        new_what, new_why = describe(results["new"].get(i), data["new"].get(i, {}), kind)
        lines.append(f"| {i} | {label} | {old_what} | {old_why} | {new_what} | {new_why} |")
    lines += ["", "## 全部 20 题", "", "| id | 题型 | 层 | 旧 | 新 | 一致 |", "|---|---|---|---|---|---|"]
    for i in ids:
        kind = (results["new"].get(i) or results["old"].get(i))["kind"]
        label = (results["new"].get(i) or results["old"].get(i))["label"]
        floor = data["new"].get(i, {}).get("floor", "?")
        old_what, _ = describe(results["old"].get(i), data["old"].get(i, {}), kind)
        new_what, _ = describe(results["new"].get(i), data["new"].get(i, {}), kind)
        lines.append(f"| {i} | {label} | {floor} | {old_what} | {new_what} | {'是' if i in same else '否'} |")
    with open(os.path.join(HERE, "summary.md"), "w", encoding="utf8") as handle:
        handle.write("\n".join(lines) + "\n")
    print(f"{len(same)}/{len(both)} same; summary.md written")


if __name__ == "__main__":
    main()
