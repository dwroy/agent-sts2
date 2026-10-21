#!/usr/bin/env python3
"""Read-only #31 analysis. No game action, model call, configuration or journal write."""
import argparse
from collections import Counter, defaultdict
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path


def records(logs, name, ids=None):
    path = logs / (name + ".jsonl")
    if not path.exists():
        return
    with path.open("rb") as handle:
        for line_no, raw in enumerate(handle, 1):
            if ids is not None and not any(rid.encode() in raw for rid in ids):
                continue
            row = json.loads(raw)
            rid = row.get("run_id") or row.get("state", {}).get("run_id")
            if not rid and row.get("fingerprint"):
                rid = json.loads(row["fingerprint"]).get("run")
            if ids is not None and rid not in ids:
                continue
            yield rid, row, {"file": path.name, "line": line_no, "sha256": hashlib.sha256(raw).hexdigest()}


def percentile(values, p):
    return sorted(values)[max(0, math.ceil(len(values) * p) - 1)] if values else None


def millis(start, end):
    if not start or not end:
        return None
    return (datetime.fromisoformat(end.replace("Z", "+00:00")) - datetime.fromisoformat(start.replace("Z", "+00:00"))).total_seconds() * 1000


def action(answer):
    if not isinstance(answer, dict):
        return None
    result = {k: v for k, v in answer.items() if k in {"choice", "cards", "route", "plan", "discard", "drink"}}
    route = result.get("route")
    if isinstance(route, str) and route != "keep":
        result["route"] = [s.strip() for s in route.split(",") if s.strip()]
    return result


def primary(answer):
    fields = action(answer)
    if fields is not None:
        for key in ("choice", "plan", "route"):
            if key in fields:
                return {key: fields[key]}
    return None


def fixed_quality(rows):
    pairs = defaultdict(dict)
    for row in rows:
        if row["effort"] in pairs[row["id"]]:
            raise ValueError("duplicate replay arm")
        pairs[row["id"]][row["effort"]] = row
    results = []
    for ident, pair in pairs.items():
        high, xhigh = pair.get("high"), pair.get("xhigh")
        valid = bool(high and xhigh and all(r.get("accepted") and primary(r.get("answer")) is not None
                     and (r.get("native_receipt") or {}).get("effort") == e
                     for e, r in pair.items()))
        results.append({"id": ident, "label": (high or xhigh)["label"], "valid_pair": valid,
                        "same_action": primary(high["answer"]) == primary(xhigh["answer"]) if valid else None,
                        "all_action_fields_same": action(high["answer"]) == action(xhigh["answer"]) if valid else None,
                        "high_action": action(high.get("answer")) if high else None,
                        "xhigh_action": action(xhigh.get("answer")) if xhigh else None})
    valid = [r for r in results if r["valid_pair"]]
    return {"pairs": len(results), "valid_pairs": len(valid), "same_action": sum(r["same_action"] for r in valid),
            "agreement": sum(r["same_action"] for r in valid) / len(valid) if valid else None,
            "rows": results}


def analyse(logs, trial_id, reanswers=()):
    configs = defaultdict(list)
    refs = defaultdict(list)
    for rid, row, ref in records(logs, "run-config"):
        if row.get("brain", {}).get("run_profile", {}).get("trial_id") == trial_id:
            configs[rid].append(row)
            refs[rid].append(ref)
    ids = set(configs)
    # All rows of an enrolled run are checked, including foreign restart configurations.
    all_configs = defaultdict(list)
    for rid, row, ref in records(logs, "run-config", ids):
        all_configs[rid].append(row)
    data = {name: defaultdict(list) for name in ["runs", "brain", "codex-calls", "brain-wait", "decisions", "states", "sl-attempts"]}
    for name, runs in data.items():
        for rid, row, ref in records(logs, name, ids):
            if name == "states":
                st = row.get("state") or {}
                row = {"ts": row.get("ts"), "state": {"run": {k: (st.get("run") or {}).get(k) for k in
                       ("act_id", "floor", "boss_id", "current_hp")}, "in_combat": st.get("in_combat"),
                       "combat": {"enemies": [{"enemy_id": e.get("enemy_id") or e.get("id")} for e in
                                   (st.get("combat") or {}).get("enemies") or []]}}}
            elif name == "decisions":
                row = {"time_budget": row.get("time_budget")}
            elif name == "brain":
                row = {k: v for k, v in row.items() if k not in {"question", "payload", "memory", "options", "raw", "tool_calls"}}
            elif name == "sl-attempts":
                row = {k: row.get(k) for k in ("ts", "act", "floor", "encounter", "fight_kind", "attempt", "result", "end_hp", "reload")}
            runs[rid].append(row)
            refs[rid].append(ref)
    results = []
    quality = []
    replays = {(r["run_id"], r["question_id"]): r for r in reanswers}
    for rid, cfgs in configs.items():
        c = cfgs[0]
        profile = c["brain"]["run_profile"]
        outcome_rows = data["runs"][rid]
        outcome = outcome_rows[-1] if outcome_rows else {}
        brain = data["brain"][rid]
        trace = data["codex-calls"][rid]
        wait = data["brain-wait"][rid]
        issues = []
        if any(x.get("brain", {}).get("run_profile") != profile for x in all_configs[rid]):
            issues.append("mixed_run_profile")
        if len({x.get("ascension") for x in all_configs[rid]}) != 1:
            issues.append("mixed_ascension")
        if type(c.get("ascension")) is not int:
            issues.append("unknown_ascension")
        if outcome.get("ascension") is not None and outcome["ascension"] != c.get("ascension"):
            issues.append("outcome_ascension_mismatch")
        if not brain:
            issues.append("no_brain_rows")
        unknown = sum(not b.get("native_receipt") for b in brain)
        mismatch = sum(bool(b.get("native_receipt")) and
                       (b["native_receipt"].get("effort") != profile["effort"]
                        or b["native_receipt"].get("model") != "gpt-6.1-sol") for b in brain)
        if unknown:
            issues.append("missing_native_receipt")
        if mismatch:
            issues.append("native_mismatch")
        if any(b.get("engine") != profile["engine"] or b.get("requested_effort") != profile["effort"]
               or b.get("run_brain") != profile for b in brain):
            issues.append("request_profile_mismatch")
        if not isinstance(outcome.get("victory"), bool):
            issues.append("unfinished")
        if any(t.get("native_receipt") and t["native_receipt"].get("effort") != profile["effort"] for t in trace):
            issues.append("physical_call_effort_mismatch")
        by_question = defaultdict(list)
        for b in brain:
            by_question[b.get("question_id", "missing:" + str(len(by_question)))].append(b)
        latency = defaultdict(list)
        questions = []
        for qid, bs in by_question.items():
            ms = sum(b.get("latency_ms", 0) + b.get("primary_ms", 0) for b in bs)
            latency[bs[0]["label"]].append(ms)
            questions.append({"question_id": qid, "label": bs[0]["label"], "ms": ms,
                              "accepted": any(b.get("accepted") is True for b in bs)})
            replay = replays.get((rid, qid))
            if replay:
                original = next((b for b in reversed(bs) if b.get("accepted")), None)
                quality.append({"run_id": rid, "question_id": qid, "label": bs[0]["label"],
                                "valid_pair": bool(original and replay.get("accepted") and (replay.get("native_receipt") or {}).get("effort") == "xhigh"),
                                "same_action": action(original["answer"]) == action(replay.get("answer")) if original else None,
                                "original_action": action(original["answer"]) if original else None,
                                "replay_action": action(replay.get("answer"))})
        bosses = []
        for entry in data["states"][rid]:
            state = entry.get("state") or {}
            run = state.get("run") or {}
            combat = state.get("combat") or {}
            enemy_ids = {e.get("enemy_id") or e.get("id") for e in combat.get("enemies") or []}
            for boss in bosses:
                try:
                    if int(run["act_id"]) > int(boss["act_id"]):
                        boss["passed"] = True
                except (ValueError, TypeError, KeyError):
                    pass
            if state.get("in_combat") and run.get("boss_id") and run["boss_id"] in enemy_ids:
                key = (run.get("act_id"), run.get("floor"), run["boss_id"])
                if not any((b["act_id"], b["floor"], b["boss_id"]) == key for b in bosses):
                    bosses.append({"act_id": key[0], "floor": key[1], "boss_id": key[2],
                                   "entry_hp": run.get("current_hp"), "passed": None, "entry_ts": entry.get("ts")})
        if outcome.get("victory") is True:
            for boss in bosses:
                boss["passed"] = True
        elif outcome.get("victory") is False:
            for boss in bosses:
                if outcome.get("death_fight_floor") == boss["floor"] and boss["boss_id"] in (outcome.get("death_enemy_ids") or []):
                    boss["passed"] = False
        budgets = [d["time_budget"] for d in data["decisions"][rid] if d.get("time_budget")]
        usage = Counter()
        for b in brain:
            for u in (b.get("usage") or {}, b.get("primary_usage") or {}):
                for k, v in u.items():
                    if isinstance(v, (int, float)):
                        usage[k] += v
        duration = millis(c.get("ts"), outcome.get("ended"))
        sl_attempts = data["sl-attempts"][rid]
        reloads = sum((a.get("reload") or {}).get("ok") is True for a in sl_attempts)
        result = {"run_id": rid, "profile": profile, "ascension": c.get("ascension"), "character": c.get("character"),
                  "eligible": not issues, "issues": issues, "victory": outcome.get("victory"), "floor": outcome.get("floor"),
                  "death_fight": outcome.get("death_fight"), "bosses": bosses,
                  "sl_attempts": sl_attempts, "observed_successful_reloads": reloads,
                  "boss_first_attempt_results": [a for a in sl_attempts if a.get("fight_kind") == "boss" and a.get("attempt") == 1],
                  "sl_coverage": "observed_attempts_only; absence_does_not_prove_no_reload",
                  "duration_ms": duration, "brain_ms": sum(q["ms"] for q in questions),
                  "questions": questions, "latency_by_label": {label: {"n": len(v), "p50_ms": percentile(v, .5), "p90_ms": percentile(v, .9)} for label, v in latency.items()},
                  "reasks": sum(b.get("reasks", 0) for b in brain),
                  "fallbacks": sum(bool(b.get("fell_back_from")) for b in brain),
                  "timeouts": sum(b.get("error_kind") == "timeout" for b in brain),
                  "physical_stalls": sum(t.get("outcome") == "stalled" for t in trace),
                  "physical_retries": sum(len(t.get("retries") or []) for t in trace),
                  "capacity_events": sum(b.get("error_kind") in {"quota", "overloaded", "rate_limit", "budget"} for b in brain),
                  "wait_events": dict(Counter(w.get("state") for w in wait)),
                  "brain_budget_overruns": sum(q["ms"] > 90000 for q in questions),
                  "decision_budget_timeouts": sum(b.get("timed_out") is True for b in budgets),
                  "decision_fallbacks": dict(Counter(b.get("fallback") for b in budgets if b.get("fallback"))),
                  "usage": dict(usage), "native_unknown": unknown, "native_mismatch": mismatch,
                  "unknown_usage_rows": sum(not b.get("usage") or
                                            (bool(b.get("error")) and not any((b.get("usage") or {}).values())) for b in brain),
                  "code": sorted({x.get("code", {}).get("commit", "unknown") for x in cfgs}),
                  "config_shas": sorted({x.get("config_sha", "unknown") for x in all_configs[rid]}),
                  "knowledge_prefix_shas": sorted({b.get("knowledge", {}).get("prefix_sha") for b in brain
                                                   if b.get("knowledge", {}).get("prefix_sha")}),
                  "knowledge": c.get("knowledge"), "sources": refs[rid]}
        results.append(result)
    groups = []
    grouped = defaultdict(list)
    for r in results:
        grouped[(r["character"], r["ascension"], r["profile"]["engine"], r["profile"]["effort"])].append(r)
    for (character, ascension, engine, effort), runs in grouped.items():
        valid = [r for r in runs if r["eligible"]]
        qs = defaultdict(list)
        for r in valid:
            for q in r["questions"]:
                qs[q["label"]].append(q["ms"])
        completed = [r for r in runs if isinstance(r["victory"], bool)]
        boss_groups = defaultdict(list)
        for r in valid:
            for boss in r["bosses"]:
                boss_groups[str(boss["act_id"])].append(boss)
        counts = {k: sum(r[k] for r in valid) for k in ("reasks", "fallbacks", "timeouts", "physical_stalls", "physical_retries",
                                                       "capacity_events", "brain_budget_overruns", "decision_budget_timeouts", "unknown_usage_rows")}
        token_totals = Counter()
        for r in valid:
            token_totals.update(r["usage"])
        groups.append({"character": character, "ascension": ascension, "engine": engine, "effort": effort, "allocated": len(runs),
                       "eligible": len(valid), "wins": sum(r["victory"] is True for r in valid),
                       "intention_to_treat": {"completed": len(completed), "wins": sum(r["victory"] is True for r in completed),
                                              "floor_p50": percentile([r["floor"] for r in completed if r["floor"] is not None], .5)},
                       "floor_p50": percentile([r["floor"] for r in valid if r["floor"] is not None], .5),
                       "brain_ms_p50": percentile([r["brain_ms"] for r in valid], .5),
                       "duration_ms_p50": percentile([r["duration_ms"] for r in valid if r["duration_ms"] is not None], .5),
                       "unaccepted_questions": sum(not q["accepted"] for r in valid for q in r["questions"]),
                       "questions": sum(len(r["questions"]) for r in valid), "counts": counts, "usage": dict(token_totals),
                       "bosses_by_observed_act_id": {act: {"observed": len(bs), "passed": sum(b["passed"] is True for b in bs),
                                                           "unknown": sum(b["passed"] is None for b in bs),
                                                           "entry_hp_p50": percentile([b["entry_hp"] for b in bs if b["entry_hp"] is not None], .5)}
                                                     for act, bs in boss_groups.items()},
                       "latency_by_label": {k: {"n": len(v), "p50_ms": percentile(v, .5), "p90_ms": percentile(v, .9)} for k, v in qs.items()}})
    # Operational stop signals use allocated completed outcomes (intention-to-treat), including receipt failures.
    stops = []
    ascensions = {(r["character"], r["ascension"]) for r in results}
    for character, ascension in ascensions:
        arms = {e: [r for r in results if r["character"] == character and r["ascension"] == ascension
                    and r["profile"]["effort"] == e and isinstance(r["victory"], bool)] for e in ("high", "xhigh")}
        n = min(len(arms["high"]), len(arms["xhigh"]))
        if n >= 4:
            early = {e: sum(r["victory"] is False and r["floor"] is not None and r["floor"] <= 17
                            for r in sorted(rs, key=lambda r: r["profile"]["sequence"])[:n]) for e, rs in arms.items()}
            if early["high"] - early["xhigh"] >= 3:
                stops.append({"reason": "early_death_gap", "character": character, "ascension": ascension, "n_per_arm": n, "early_deaths": early})
    if any("native_mismatch" in r["issues"] or "request_profile_mismatch" in r["issues"] or "mixed_run_profile" in r["issues"] for r in results):
        stops.append({"reason": "configuration_integrity"})
    for r in results:
        if r["profile"]["effort"] == "high" and r["questions"] and sum(not q["accepted"] for q in r["questions"]) / len(r["questions"]) >= .2:
            stops.append({"reason": "high_unaccepted_at_least_20pct", "run_id": r["run_id"]})
    counts = {(g["character"], g["ascension"], g["effort"]): g["eligible"] for g in groups if g["engine"] == "codex"}
    sample_ready = any(counts.get((character, ascension, "high"), 0) >= 10 and
                       counts.get((character, ascension, "xhigh"), 0) >= 10 for character, ascension in ascensions)
    return {"schema": "brain-trial-report-v1", "trial_id": trial_id,
            "status": "samples_ready_for_review" if sample_ready else "pending_ops_and_samples",
            "groups": groups, "runs": sorted(results, key=lambda r: r["profile"]["sequence"]), "quality": quality,
            "stop_signals": stops, "recommendation": "Roy decision required; no automatic full switch"}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--logs", type=Path, required=True)
    p.add_argument("--trial-id", required=True)
    p.add_argument("--reanswers", type=Path)
    p.add_argument("--fixed-replay", type=Path, help="issue31-quality-replay.ts results.jsonl")
    args = p.parse_args()
    reanswers = [json.loads(line) for line in args.reanswers.read_text().splitlines() if line.strip()] if args.reanswers else []
    result = analyse(args.logs, args.trial_id, reanswers)
    if args.fixed_replay:
        result["fixed_replay"] = fixed_quality([json.loads(line) for line in args.fixed_replay.read_text().splitlines() if line.strip()])
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
