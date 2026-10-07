"""Codex performance cohort v1: successful brain.jsonl answers, never ds_* compatibility counters.

An explicit accepted verdict wins. Historical rows need a non-null answer, no error and no problems.
Known successful engines classify as codex/deepseek/mixed/other; missing successful engine labels or
no successful answers classify as unknown. Repeated (question_id, engine) rows count once; rows
without an id count individually. Costs, failed calls and learning evidence are never filtered here.
"""
import argparse
import collections
import json
from pathlib import Path

POLICY = "codex-successful-brain-v1"
ENGINES = {"codex", "deepseek", "claude", "dsh"}


def jsonl(path, limit=None):
    try:
        handle = open(path, "rb")
    except FileNotFoundError:
        return
    with handle:
        used = 0
        for raw in handle:
            used += len(raw)
            if limit is not None and used > limit:
                break
            try:
                row = json.loads(raw)
            except ValueError:
                continue
            if isinstance(row, dict):
                yield row


def successful(row):
    if row.get("answer") is None or row.get("error"):
        return False
    if isinstance(row.get("accepted"), bool):
        return row["accepted"]
    problems = row.get("problems")
    return problems is None or isinstance(problems, list) and len(problems) == 0


def classify(rows):
    counts = collections.Counter()
    kinds = {}
    embedded = collections.Counter()
    seen = set()
    rejected = set()
    answered = set()
    total = failed = unknown = 0
    first = last = None
    for row in rows:
        total += 1
        if not successful(row):
            failed += 1
            rejected.add(row.get("question_id") or f"unidentified-row-{total}")
            continue
        if row.get("question_id"):
            answered.add(row["question_id"])
        engine = row.get("engine") if row.get("engine") in ENGINES else "unknown"
        qid = row.get("question_id")
        if qid and (qid, engine) in seen:
            continue
        if qid:
            seen.add((qid, engine))
        counts[engine] += 1
        label = row.get("label") or "unknown"
        kinds.setdefault(label, collections.Counter())[engine] += 1
        answer = row.get("answer")
        if isinstance(answer, dict):
            if isinstance(answer.get("run_plan"), dict):
                embedded["run-plan"] += 1
            if answer.get("route") and label not in ("map/route-plan", "map/route-review"):
                embedded["map/route"] += 1
        unknown += int(engine == "unknown")
        stamp = row.get("ts")
        if stamp:
            first = min(first, stamp) if first else stamp
            last = max(last, stamp) if last else stamp
    known = sorted(e for e in counts if e != "unknown")
    unresolved = len(rejected - answered)
    source = "mixed" if len(known) > 1 else "unknown" if unknown or unresolved or not known else known[0] if known[0] in ("codex", "deepseek") else "other"
    reason = None if source == "codex" else {
        "deepseek": "successful_deepseek_brain", "mixed": "successful_mixed_brain",
        "other": "successful_non_codex_brain", "unknown": "missing_successful_brain_engine" if total else "missing_brain_log",
    }[source]
    if source == "unknown" and unresolved:
        reason = "unresolved_brain_questions"
    return {"policy": POLICY, "source": source, "eligible": source == "codex", "exclusion_reason": reason,
            "successful_answers": dict(sorted(counts.items())), "successful_by_label": {k: dict(sorted(v.items())) for k, v in sorted(kinds.items())},
            "embedded_answers": dict(embedded), "brain_rows": total, "failed_or_unaccepted_rows": failed,
            "unknown_successes": unknown, "first_success": first, "last_success": last,
            "unresolved_questions": unresolved, "coverage": "all_logged_questions_resolved" if total and not unresolved else "missing_or_unresolved_logged_questions",
            "basis": "brain.jsonl accepted verdict; legacy answer != null, no error/problems; unique question_id+engine"}


def load_sources(logs, run_ids=(), limit=None):
    # Retain only classification fields, so multi-hundred-MB prompts/answers do not accumulate in memory.
    by_run = collections.defaultdict(list)
    for row in jsonl(Path(logs) / "brain.jsonl", limit):
        rid = row.get("run_id")
        if not rid:
            continue
        answer = row.get("answer")
        lean = {k: row.get(k) for k in ("engine", "ts", "question_id", "label", "error", "problems", "accepted")}
        lean["answer"] = None if answer is None else {k: answer.get(k) for k in ("route", "run_plan")} if isinstance(answer, dict) else True
        by_run[rid].append(lean)
    return {rid: classify(by_run.get(rid, [])) for rid in sorted(set(run_ids) | set(by_run))}


def annotate(runs, sources):
    for run in runs:
        run["brain_source"] = sources.get(run["run_id"], classify([]))
    return runs


def eligible(run, include_non_codex=False):
    return include_non_codex or bool(run.get("brain_source", {}).get("eligible"))


def cohorts(runs):
    result = {}
    for source in ("codex", "deepseek", "mixed", "unknown", "other"):
        rows = [r for r in runs if r.get("brain_source", {}).get("source", "unknown") == source]
        result[source] = {"runs": len(rows), "wins": sum(r.get("victory") in (True, 1) for r in rows), "run_ids": [r["run_id"] for r in rows]}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--logs", required=True)
    parser.add_argument("--out")
    args = parser.parse_args()
    runs = list(jsonl(Path(args.logs) / "runs.jsonl"))
    sources = load_sources(args.logs, [r["run_id"] for r in runs])
    annotate(runs, sources)
    result = {"policy": POLICY, "cohorts": cohorts(runs), "runs": [{"run_id": r["run_id"], "character": r.get("character") or "IRONCLAD", "ascension": r.get("ascension"), "floor": r.get("floor"), "victory": r.get("victory"), "ended": r.get("ended"), "brain_source": r["brain_source"]} for r in runs]}
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        Path(args.out).write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
