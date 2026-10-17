"""Reproduce H1 natural-run timing from frozen projections, without gameplay or model calls."""
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime, timezone
import argparse
import gzip
import json
import math
import statistics

HERE = Path(__file__).resolve().parent
LIMITS = {"ordinary": 10000, "elite": 15000, "boss": 30000, "retry": 10000, "routine": 5000, "brain": 90000}


def stamp(s):
    value = datetime.fromisoformat(s.replace("Z", "+00:00"))
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def stats(values):
    xs = sorted(x for x in values if isinstance(x, (int, float)) and math.isfinite(x))
    if not xs:
        return {"n": 0, "p50": None, "p90": None, "max": None, "sum": 0}
    at = .9 * (len(xs) - 1)
    lo = int(at)
    return {"n": len(xs), "p50": statistics.median(xs), "p90": xs[lo] + (xs[min(lo + 1, len(xs)-1)] - xs[lo]) * (at-lo), "max": max(xs), "sum": sum(xs)}


def read(directory, name):
    with gzip.open(directory / f"{name}.jsonl.gz", "rt") as handle:
        return [json.loads(line) for line in handle]


def kind_for(d, rooms):
    if d.get("screen") != "COMBAT":
        return "routine"
    if (d.get("sl_attempt") or 1) > 1:
        return "retry"
    if d.get("floor") in rooms:
        return rooms[d["floor"]]
    budget = d.get("time_budget") or {}
    if budget.get("kind") in ("ordinary", "elite", "boss"):
        return budget["kind"]
    return "ordinary"


def simulation(rows, lane):
    sims = [r["boss_sim"] for r in rows if isinstance(r.get("boss_sim"), dict)
            and ("lines" in r["boss_sim"] if lane == "B2" else "options" in r["boss_sim"] or "diagnostics" in r["boss_sim"])]
    statuses = Counter((s.get("completion") or {}).get("status", "unlogged") for s in sims)
    budgeted = [s for s in sims if (s.get("completion") or {}).get("budgeted")]
    truncated = [s for s in budgeted if (s.get("completion") or {}).get("status") == "partial" and not (s.get("completion") or {}).get("failure")]
    unique = {s["completion"].get("attempt_id", f"row:{i}") for i, s in enumerate(truncated)}
    candidates, paired = [], []
    for s in sims:
        for item in (s.get("lines") or s.get("options") or {}).values():
            if isinstance(item, dict):
                if isinstance(item.get("samples"), (int, float)):
                    candidates.append(item["samples"])
                if isinstance(item.get("paired_samples"), (int, float)):
                    paired.append(item["paired_samples"])
    return {"rows": len(sims), "status_counts": dict(statuses), "budgeted_rows": len(budgeted),
            "budget_truncated_rows": len(truncated), "budget_truncated_unique_attempt_ids": len(unique),
            "budget_truncated_fraction": len(truncated)/len(budgeted) if budgeted else None,
            "timed_out_rows": sum(s.get("timed_out") is True for s in sims),
            "actual_samples": stats([s.get("samples") for s in sims]),
            "sample_histogram": dict(Counter(str(s.get("samples", "unknown")) for s in sims)),
            "candidate_samples": stats(candidates), "paired_samples": stats(paired),
            "requested_samples": stats([s.get("requested") for s in sims]),
            "low_trust_rows": sum(s.get("low_trust") is True or s.get("calibration") == "none" for s in sims),
            "wall_ms": stats([s.get("ms") for s in sims]),
            "memo_hit_rows": sum((s.get("completion") or {}).get("memoHit") is True for s in sims),
            "limits": "rows may reuse a cached completion; C2 complete_adaptive/complete_budget is not deadline truncation. Low-trust sample cap alone is not a timeout."}


def one_run(run, streams):
    get = lambda name: [r for r in streams[name] if r.get("run_id") == run]
    cfgs, ends, ds, fs, brains, native, sl = (get(n) for n in ("run-config", "runs", "decisions", "states", "brain", "codex-calls", "sl-attempts"))
    assert cfgs and len(ends) == 1, (run, len(cfgs), len(ends))
    cfg, end = cfgs[0], ends[0]
    rooms = {}
    for f in fs:
        node = (f.get("map_node") or "").lower()
        if node in ("boss", "elite", "monster"):
            rooms[f.get("floor")] = {"boss": "boss", "elite": "elite", "monster": "ordinary"}[node]
    for s in sl:
        if s.get("fight_kind") in ("boss", "elite"):
            rooms[s.get("floor")] = s["fight_kind"]
    entry, budget_entries, turns, exact_turns = defaultdict(list), defaultdict(list), defaultdict(float), {}
    timeouts, fallbacks, stage_timeouts = Counter(), Counter(), Counter()
    gaps, b2_refs, b3_refs = [], [], []
    missing_budget = 0
    for i, d in enumerate(ds):
        kind = kind_for(d, rooms)
        lat = d.get("latency_ms") or {}
        # Same additive latency-field definition before and after H1, excluding dispatch/action.
        compute = sum(lat.get(k, 0) or 0 for k in ("pre", "planner", "plan", "jev", "deepseek"))
        entry[kind].append(compute)
        key = f"{d.get('floor')}:{d.get('turn')}:{d.get('sl_attempt') or 1}" if d.get("screen") == "COMBAT" else d.get("decision_id", f"row:{i}")
        turns[(kind, key)] += compute
        tb = d.get("time_budget")
        if tb:
            budget_entries[kind].append(tb.get("actual_ms"))
            old = exact_turns.get(tb["key"])
            if old is None or tb.get("turn_actual_ms", 0) >= old[1].get("turn_actual_ms", 0):
                exact_turns[tb["key"]] = (kind, tb)
            if tb.get("timed_out"):
                timeouts[kind] += 1
            if tb.get("fallback"):
                fallbacks[tb["fallback"]] += 1
            for stage in tb.get("stages", []):
                if stage.get("timed_out"):
                    stage_timeouts[stage["stage"]] += 1
        else:
            missing_budget += 1
        if i:
            gap = (stamp(d["observed_ts"] if d.get("observed_ts") else d["ts"]) - stamp(ds[i-1]["ts"])).total_seconds()*1000
            if gap > 60000:
                gaps.append({"ms": gap, "previous": ds[i-1]["_source"], "next": d["_source"], "floor": d.get("floor"), "label": d.get("label"), "cause": "unattributed inter-decision gap; may include transport, animation, SL or interruption"})
    exact_by_kind = defaultdict(list)
    for kind, tb in exact_turns.values():
        exact_by_kind[kind].append(tb.get("turn_actual_ms"))
    bosses = []
    by_boss = defaultdict(list)
    for s in sl:
        if s.get("fight_kind") == "boss":
            by_boss[(s.get("floor"), s.get("encounter"))].append(s)
    first_deaths = [s for s in sl if s.get("attempt") == 1 and s.get("result") in ("died", "predicted_death")]
    first_stop = min((s["floor"] for s in first_deaths), default=None)
    for (floor, encounter), rows in sorted(by_boss.items()):
        first = next((s for s in rows if s.get("attempt") == 1), None)
        outcomes = {s.get("result") for s in rows}
        final = True if "won" in outcomes else False if outcomes.intersection(("died", "predicted_death")) else None
        first_result = (True if first["result"] == "won" else False if first["result"] in ("died", "predicted_death") else None) if first else None
        bosses.append({"floor": floor, "encounter": encounter, "final_pass": final, "first_attempt_pass": first_result,
                       "reachable_in_first_attempt_funnel": first_stop is None or floor <= first_stop,
                       "attempts": len(rows), "source_refs": [s["_source"] for s in rows]})
    start = min([stamp(cfg["ts"])] + [stamp(f["ts"]) for f in fs])
    duration = (stamp(end["ended"]) - start).total_seconds()/60
    native_keys = {(r.get("thread_id"), r.get("turn_id")) for r in native if r.get("thread_id") and r.get("turn_id")}
    native_questions, brain_questions = defaultdict(list), defaultdict(list)
    for row in native:
        native_questions[row.get("question_id") or f"off:{row['_source']['off']}"] .append(row)
    for row in brains:
        brain_questions[row.get("question_id") or f"off:{row['_source']['off']}"] .append(row)
    question_latencies = []
    for qid in set(native_questions) | set(brain_questions):
        logged = [r.get("latency_ms") for r in brain_questions[qid] if isinstance(r.get("latency_ms"), (int, float))]
        cumulative = [r.get("call_ms", r.get("ms")) for r in native_questions[qid] if isinstance(r.get("call_ms", r.get("ms")), (int, float))]
        if logged or cumulative:
            question_latencies.append(max(logged) if logged else max(cumulative))
    first_floor = min((f.get("floor") for f in fs if f.get("floor") is not None), default=None)
    exact_timeout_turns = sum(tb.get("timed_out") is True for _, tb in exact_turns.values())
    compute_total = sum(sum(v) for v in entry.values())
    slowest = sorted(ds, key=lambda d: sum((d.get("latency_ms") or {}).get(k, 0) or 0 for k in ("pre", "planner", "plan", "jev", "deepseek")), reverse=True)[:12]
    return {"run_id": run, "startup_ts": cfg["ts"], "first_raw_frame": fs[0]["ts"] if fs else None,
            "ended": end["ended"], "duration_minutes": duration, "over_90_minutes": duration > 90,
            "victory": end["victory"], "end_floor": end["floor"], "decision_count": len(ds),
            "terminal_decision_count": end.get("decisions"), "decision_count_matches": len(ds) == end.get("decisions"),
            "first_logged_floor": first_floor, "config_segments": [{"ts": c["ts"], "code": c.get("code"), "human_pace": c.get("human_pace"), "restart": c.get("restart"), "source": c["_source"]} for c in cfgs],
            "decision_compute_proxy_ms": {k: stats(entry[k]) for k in ("ordinary", "elite", "boss", "retry", "routine")},
            "turn_compute_proxy_ms": {k: stats(v for (kind, _), v in turns.items() if kind == k) for k in ("ordinary", "elite", "boss", "retry")},
            "decision_budget_actual_ms": {k: stats(budget_entries[k]) for k in ("ordinary", "elite", "boss", "retry", "routine")},
            "turn_budget_actual_ms": {k: stats(exact_by_kind[k]) for k in ("ordinary", "elite", "boss", "retry", "routine")},
            "budget_entries": len(ds)-missing_budget, "missing_budget_entries": missing_budget,
            "overbudget_entries": dict(timeouts) if exact_turns else None,
            "overbudget_distinct_keys": exact_timeout_turns if exact_turns else None,
            "budget_fallbacks": dict(fallbacks) if exact_turns else None, "stage_timeout_counts": dict(stage_timeouts),
            "all_decision_fallbacks": sum(d.get("fallback") is True for d in ds),
            "L2": {"brain_logged_questions": len({(r.get("question_id"), r.get("engine")) for r in brains}),
                   "questions_including_failed_traces": len(set(native_questions) | set(brain_questions)),
                   "question_latency_ms_including_failed_traces": stats(question_latencies),
                   "brain_rows": len(brains), "brain_latency_ms": stats(r.get("latency_ms") for r in brains),
                   "native_call_rows": len(native), "native_unique_thread_turns": len(native_keys),
                   "native_attempt_latency_ms": stats(r.get("ms") for r in native),
                   "native_cumulative_call_latency_ms": stats(r.get("call_ms", r.get("ms")) for r in native),
                   "over_90000_ms_native_rows": sum((r.get("call_ms", r.get("ms")) or 0) > 90000 for r in native),
                   "model_effort": dict(Counter(f"{r.get('model')}/{r.get('effort')}" for r in native)),
                   "outcomes": dict(Counter(r.get("outcome", "unknown") for r in native))},
            "B2": simulation(ds, "B2"), "B3": simulation(ds, "B3"),
            "funnel": {"final_floor": end["floor"], "first_attempt_stop_floor": first_stop if first_stop is not None else end["floor"],
                       "first_attempt_victory": bool(end["victory"]) and first_stop is None,
                       "entered_acts": sorted({f["act"] for f in fs if f.get("act") is not None}), "bosses": bosses,
                       "limits": "first-attempt funnel stops at first logged predicted/actual death; later SL Bosses are excluded from that funnel"},
            "attribution": {"compute_proxy_minutes": compute_total/60000,
                            "slowest_decisions": [{k: d[k] for k in ("floor", "turn", "label", "decider", "sl_attempt", "latency_ms", "time_budget", "timing", "_source") if k in d} for d in slowest],
                            "action_dispatch_minutes": sum((d.get("latency_ms") or {}).get("action", 0) or 0 for d in ds)/60000,
                            "B2_minutes": sum((d.get("boss_sim") or {}).get("ms", 0) or 0 for d in ds if "lines" in (d.get("boss_sim") or {}))/60000,
                            "B3_minutes": sum((d.get("boss_sim") or {}).get("ms", 0) or 0 for d in ds if "options" in (d.get("boss_sim") or {}))/60000,
                            "brain_logged_minutes": sum(r.get("latency_ms", 0) or 0 for r in brains)/60000,
                            "inter_decision_gaps_over_60s": sorted(gaps, key=lambda g: -g["ms"]),
                            "limits": "components overlap: brain/run-plan can live inside pre, B2/B3 inside planner. Do not sum attribution components. No retrospective IO or outage attribution from current host measurements."}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inputs", nargs="+", default=["baseline-r2"])
    parser.add_argument("--output", default="baseline-analysis.json")
    args = parser.parse_args()
    names = ("run-config", "runs", "decisions", "states", "brain", "codex-calls", "sl-attempts")
    streams = {name: [] for name in names}
    for item in args.inputs:
        for name in names:
            streams[name].extend(read(HERE / item, name))
    # Frozen directories must be disjoint runs. Never inflate timing by repeated projections.
    for name, rows in streams.items():
        assert len({r["_source"]["off"] for r in rows}) == len(rows), name
    runs = sorted({r["run_id"] for r in streams["runs"]})
    output = {"schema": "human-pace-natural-analysis-v1", "inputs": args.inputs,
              "baseline_run_ids": json.loads((HERE / "data-cut.json").read_bytes())["baseline_run_ids"],
              "quantiles": "linear p90 interpolation over (n-1); p50 median; milliseconds",
              "run_duration": "earliest logged run frame/startup-config to original terminal timestamp, includes game/SL/waits; no menu gap between runs",
              "comparison_latency": "sum(pre,planner,plan,jev,deepseek) per decision; excludes action; same field definition before/after. Actual H1 budget fields separately reported, never backfilled into baseline",
              "runs": {run: one_run(run, streams) for run in runs}}
    (HERE / args.output).write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({run: {k: r[k] for k in ("duration_minutes", "end_floor", "decision_count_matches", "budget_entries")} for run, r in output["runs"].items()}))


if __name__ == "__main__":
    main()
