"""Score frozen H2 observations. No gameplay, simulation, model calls, or online mutation."""
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime
import argparse
import csv
import gzip
import hashlib
import importlib.util
import json
import math

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
H1 = ROOT / "paper/materials/20261017-human-pace-h1/natural"
spec = importlib.util.spec_from_file_location("h1_analysis", H1 / "analyze.py")
h1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h1)
stats = h1.stats


def read(directory, name):
    path = directory / f"{name}.jsonl.gz"
    if not path.exists(): return []
    with gzip.open(path, "rt") as handle:
        return [json.loads(line) for line in handle]


def numeric(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def proportion(a, n):
    return {"agree": a, "n": n, "fraction": a / n if n else None}


def agreement(rows, a, b):
    valid = [r for r in rows if r.get(a) is not None and r.get(b) is not None]
    return proportion(sum(r[a] == r[b] for r in valid), len(valid))


def difficulty(facts):
    rows = facts.get("rows") or []
    if not rows or facts.get("module_first_basis") != "raw_Act2_weighted_win_S_excluded":
        return "comparison_unknown", None
    if any(not isinstance(r.get("target_delta_win"), dict)
           or not numeric(r["target_delta_win"].get("mean"))
           or not numeric(r["target_delta_win"].get("se")) for r in rows):
        return "comparison_unknown", None
    ordered = sorted(rows, key=lambda r: -r["target_delta_win"]["mean"])
    top = ordered[0]
    contrasts = [{"rival": r["key"],
                  "gap": top["target_delta_win"]["mean"] - r["target_delta_win"]["mean"],
                  "two_SE_conservative_bound": 2 * (top["target_delta_win"]["se"] + r["target_delta_win"]["se"])}
                 for r in ordered[1:]]
    clear = bool(contrasts) and all(r["gap"] > r["two_SE_conservative_bound"] for r in contrasts)
    return "clear_lead" if clear else "close", {"leader": top["key"], "contrasts": contrasts,
        "error_scope": "MC conservative covariance bound only; no model quality claim"}


def all_unknowns(facts):
    flags = set()
    if not facts.get("rows"): flags.add("card_facts_unavailable")
    for r in facts.get("rows", []):
        for key in ("target_delta_win", "target_delta_S", "next_boss_delta_win", "core_component", "support_component"):
            if r.get(key) is None: flags.add(key)
        if r.get("next_boss_trust"): flags.add("next_boss_low_trust")
        if (r.get("wake") or {}).get("uncovered_by_plan") is None: flags.add("plan_coverage_unknown")
        if (r.get("dilution") or {}).get("added_slot_fraction") is None: flags.add("resource_or_dilution_unknown")
    for p in facts.get("predictions", []):
        if p.get("target", {}).get("unknown"):
            flags.add(f"target_act{p['target'].get('act')}_unknown")
    return sorted(flags)


def make_card(d, side, run_info):
    facts = side.get("card_facts") or {}
    jev = side.get("jev_shadow") or {}
    intent = d.get("chosen") or {}
    actual = "skip" if intent.get("action") == "skip_reward_cards" else (
        f"card{intent['option_index']}" if intent.get("action") == "choose_reward_card" and "option_index" in intent else None)
    if actual is None: actual = jev.get("actual_brain_choice")
    successful_jev = bool(jev) and jev.get("fallback") is None and jev.get("jev_choice") is not None
    is_brain = d.get("decider") in ("codex", "deepseek", "claude", "brain")
    numerical = facts.get("module_first_basis") == "raw_Act2_weighted_win_S_excluded"
    group, gap = difficulty(facts)
    next_boss = next((b for b in run_info["funnel"]["bosses"] if b["floor"] > d.get("floor", -1)), None)
    wakes = [{"key": r.get("key"), "card": r.get("card"), **(r.get("wake") or {})}
             for r in facts.get("rows", [])]
    return {"run_id": d["run_id"], "decision_id": d.get("decision_id"), "ts": d.get("ts"),
            "floor": d.get("floor"), "act": side.get("act"), "actual_decider": d.get("decider"),
            "actual_action": actual, "brain_actual": actual if is_brain else None,
            "brain_take_skip": ("skip" if actual == "skip" else "take") if actual is not None and is_brain else "not_accepted_brain",
            "jev_success": successful_jev, "jev_success_choice": jev.get("jev_choice") if successful_jev else None,
            "jev_recorded_choice_including_fallback": jev.get("jev_choice"), "jev_fallback": jev.get("fallback"),
            "module_first": facts.get("module_first"), "module_first_basis": facts.get("module_first_basis"),
            "numerical_module_first": facts.get("module_first") if numerical else None,
            "difficulty": group, "difficulty_contrasts": gap, "fact_unknowns": all_unknowns(facts),
            "direction": facts.get("primary"), "prior_plan_sha256": facts.get("prior_plan_sha256"),
            "offers_and_facts": facts.get("rows"), "wakes": wakes,
            "wake_any_direction_change": any(r.get("possible_direction_change") is True for r in wakes),
            "wake_any_uncovered": any(r.get("uncovered_by_plan") is True for r in wakes),
            "wake_selected_direction_change": next((r.get("possible_direction_change") for r in wakes if r.get("key") == actual), None),
            "wake_selected_uncovered": next((r.get("uncovered_by_plan") for r in wakes if r.get("key") == actual), None),
            "card_time_budget": facts.get("time_budget"), "jev_time_budget": jev.get("time_budget"),
            "jev_latency_ms": jev.get("latency_ms"), "jev_meta": jev.get("meta"),
            "next_observed_boss": next_boss, "run_end_floor": run_info["end_floor"],
            "run_victory": run_info["victory"], "result": d.get("result"),
            "next_boss_missing_reason": None if next_boss else "no_later_boss_outcome_in_original_attempt_records; not a counterfactual outcome",
            "sources": {"decision": d["_source"], "shadow": side.get("_source")},
            "limits": "observed successor under actual brain choice; correlated questions share run/Boss outcome; no causal card-value label"}


def card_agreements(rows):
    output = {"all": {}, "by_brain_take_skip": {}, "by_difficulty": {}, "by_take_skip_and_difficulty": {}}
    def one(rs):
        return {"questions": len(rs), "accepted_brain": sum(r["brain_actual"] is not None for r in rs),
                "jev_success": sum(r["jev_success"] for r in rs),
                "jev_success_vs_brain": agreement(rs, "jev_success_choice", "brain_actual"),
                "module_recorded_vs_brain": agreement(rs, "module_first", "brain_actual"),
                "numerical_module_vs_brain": agreement(rs, "numerical_module_first", "brain_actual"),
                "jev_success_vs_module_recorded": agreement(rs, "jev_success_choice", "module_first"),
                "jev_success_vs_numerical_module": agreement(rs, "jev_success_choice", "numerical_module_first"),
                "jev_recorded_including_fallback_vs_actual": agreement(rs, "jev_recorded_choice_including_fallback", "actual_action")}
    output["all"] = one(rows)
    for key, field in (("by_brain_take_skip", "brain_take_skip"), ("by_difficulty", "difficulty")):
        for value in sorted({r[field] for r in rows}): output[key][value] = one([r for r in rows if r[field] == value])
    for take in ("take", "skip", "not_accepted_brain"):
        for diff in ("clear_lead", "close", "comparison_unknown"):
            output["by_take_skip_and_difficulty"][f"{take}/{diff}"] = one([r for r in rows if r["brain_take_skip"] == take and r["difficulty"] == diff])
    matrix = Counter()
    for r in rows:
        if r["jev_success"] and r["brain_actual"] is not None:
            matrix[f"brain_{r['brain_take_skip']}/jev_{'skip' if r['jev_success_choice']=='skip' else 'take'}"] += 1
    output["take_skip_confusion_success_only"] = dict(matrix)
    output["fallback_reasons"] = dict(Counter(r["jev_fallback"] for r in rows if r["jev_fallback"] is not None))
    output["unknown_fields"] = dict(Counter(f for r in rows for f in r["fact_unknowns"]))
    output["any_broad_fact_unknown"] = sum(bool(r["fact_unknowns"]) for r in rows)
    return output


def timing(rows, field, default_limit):
    budgets = [r[field] for r in rows if isinstance(r.get(field), dict)]
    return {"calls_with_budget": len(budgets), "actual_ms": stats(b.get("actual_ms") for b in budgets),
            "timed_out_flag": sum(b.get("timed_out") is True for b in budgets),
            "wall_over_limit": sum(numeric(b.get("actual_ms")) and b["actual_ms"] > b.get("budget_ms", default_limit) for b in budgets),
            "overshoot_ms": stats(max(0, b["actual_ms"] - b.get("budget_ms", default_limit)) for b in budgets if numeric(b.get("actual_ms"))),
            "stage_timeouts": dict(Counter(s.get("stage") for b in budgets for s in b.get("stages", []) if s.get("timed_out"))),
            "missing_budget_rows": len(rows) - len(budgets)}


def direction_analysis(rows):
    coverage, reasons, checkpoints = defaultdict(Counter), Counter(), []
    distinct = {}
    for row in rows:
        direction = row["direction"]
        act = row.get("act")
        checkpoints.append({"run_id": row["run_id"], "act": act, "floor": row.get("floor"),
                            "decision_id": row.get("decision_id"), "checkpoint": direction.get("checkpoint"),
                            "time_budget": direction.get("time_budget"), "status": direction.get("status"),
                            "reason": direction.get("reason"), "source": row["_source"]})
        if not direction.get("predictions"):
            reasons[direction.get("reason", "direction_predictions_missing")] += 1
        for pred in direction.get("predictions", []):
            target, result = pred.get("target", {}), pred.get("result", {})
            key = f"current_act{act}/target_act{target.get('act')}"
            known = result.get("status") == "computed" and not result.get("reason") and numeric(result.get("win"))
            coverage[key]["variant_target_rows"] += 1
            coverage[key]["known" if known else "unknown_or_partial"] += 1
            coverage[key][f"status:{result.get('status', 'unlogged')}"] += 1
            coverage[key]["numeric_win_present"] += numeric(result.get("win"))
            coverage[key]["numeric_S_present"] += isinstance(result.get("s"), dict)
            if result.get("reason"): reasons[result["reason"]] += 1
            unit = (row["run_id"], row.get("decision_id"), target.get("act"), target.get("boss"))
            distinct.setdefault(unit, []).append(known)
        if direction.get("final_sequence"):
            coverage[f"current_act{act}/target_final_sequence"][direction["final_sequence"].get("status", "unknown")] += 1
    target_units = defaultdict(Counter)
    for (run, qid, target_act, boss), known in distinct.items():
        source = next(r for r in rows if r["run_id"] == run and r.get("decision_id") == qid)
        key = f"current_act{source.get('act')}/target_act{target_act}"
        target_units[key]["unique_checkpoint_boss_units"] += 1
        target_units[key]["all_variants_known" if all(known) else "some_or_all_variants_unknown"] += 1
    return {"checkpoints": checkpoints, "variant_target_coverage": {k: dict(v) for k, v in coverage.items()},
            "checkpoint_boss_coverage": {k: dict(v) for k, v in target_units.items()},
            "unknown_reasons": dict(reasons),
            "functional_core_and_casts": "inventory requirements/added components logged only; actual casts, qualification and joint outcome not certified"}


def plan_analysis(plans, sides):
    projections = [r for r in sides if isinstance(r.get("act_plan"), dict)]
    plan_fields = ("direction", "take_priority", "avoid", "rest_and_upgrade", "route_preference", "wake")
    records = []
    for row in plans:
        p = row.get("plan") or {}
        matches = [s for s in projections if s["run_id"] == row["run_id"]
                   and s["act_plan"].get("act") == p.get("act")
                   and s["act_plan"].get("floor") == p.get("floor")
                   and s["act_plan"].get("trigger") == p.get("trigger")
                   and s["act_plan"].get("summary") == p.get("summary")]
        shadow = matches[0]["act_plan"] if matches else {}
        wake = shadow.get("wake") or {}
        content = {"direction_specified": shadow.get("direction") not in (None, "uncommitted"),
                   "take_priority_nonempty": bool(shadow.get("take_priority")),
                   "avoid_nonempty": bool(shadow.get("avoid")),
                   "rest_and_upgrade_valid": shadow.get("rest_and_upgrade") in ("auto", "heal", "smith"),
                   "route_preference_valid": (shadow.get("route_preference") or {}).get("elites") in ("seek", "normal", "avoid"),
                   "wake_checkpoint_numeric": numeric(wake.get("checkpoint")),
                   "wake_pivot_if_nonempty": bool(wake.get("pivot_if"))}
        records.append({"run_id": row["run_id"], "act": p.get("act"), "floor": row.get("floor"), "trigger": row.get("trigger"),
                        "projection_matches": len(matches), "structure_fields_present": all(k in shadow for k in plan_fields),
                        "content_flags": content, "all_content_flags": all(content.values()),
                        "plan_source": row["_source"], "shadow_sources": [s["_source"] for s in matches]})
    groups = defaultdict(list)
    for row in records: groups[f"act{row.get('act')}"] .append(row)
    return {"original_accepted_plan_updates": len(plans), "sidecar_plan_projections": len(projections),
            "records": records, "by_act": {k: {"original_updates": len(rs),
                "projection_coverage": proportion(sum(bool(r["projection_matches"]) for r in rs), len(rs)),
                "structure_complete": proportion(sum(r["structure_fields_present"] for r in rs), len(rs)),
                "content_complete": proportion(sum(r["all_content_flags"] for r in rs), len(rs)),
                "field_content_counts": dict(Counter(key for r in rs for key, value in r["content_flags"].items() if value))}
                for k, rs in groups.items()},
            "limits": "An empty avoid list may be intentional; content completeness is field availability, not proof the plan is valid or optimal."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inputs", default="inputs-final")
    args = parser.parse_args()
    inp = HERE / args.inputs
    manifest = json.loads((inp / "manifest.json").read_bytes())
    names = ("run-config", "runs", "decisions", "states", "brain", "codex-calls", "sl-attempts", "run-plans", "human-pace-shadow")
    streams = {n: read(inp, n) for n in names}
    for name, rows in streams.items():
        assert len({r["_source"]["off"] for r in rows}) == len(rows), name
    infos = {run: h1.one_run(run, streams) for run in manifest["runs"]}
    side_by_id, duplicate = defaultdict(list), []
    for row in streams["human-pace-shadow"]:
        if "card_facts" in row: side_by_id[(row["run_id"], row.get("decision_id"))].append(row)
    cards, missing = [], []
    for d in streams["decisions"]:
        if d.get("label") != "reward/card": continue
        matches = side_by_id.get((d["run_id"], d.get("decision_id")), [])
        if len(matches) > 1: duplicate.append({"decision": d["_source"], "shadows": [s["_source"] for s in matches]})
        if not matches: missing.append({"run": d["run_id"], "decision_id": d.get("decision_id"), "source": d["_source"]})
        cards.append(make_card(d, matches[0] if matches else {}, infos[d["run_id"]]))
    directions = [r for r in streams["human-pace-shadow"] if isinstance(r.get("direction"), dict)]
    divergence = [r for r in cards if r["brain_actual"] is not None and
                  (r["jev_success_choice"] is not None and r["jev_success_choice"] != r["brain_actual"]
                   or r["module_first"] is not None and r["module_first"] != r["brain_actual"])]
    per_run = {}
    for run, info in infos.items():
        rs = [r for r in cards if r["run_id"] == run]
        ds = [r["direction"] for r in directions if r["run_id"] == run]
        card_time, jev_time, dir_time = timing(rs, "card_time_budget", 5000), timing(rs, "jev_time_budget", 1000), timing(ds, "time_budget", 60000)
        jev_tokens = [r["jev_meta"] for r in rs if isinstance(r["jev_meta"], dict)]
        success_tokens = sum(m.get("input_tokens", 0) or 0 for m in jev_tokens)
        boss_ds = [d for d in streams["decisions"] if d["run_id"] == run and (d.get("sl_attempt") or 1) == 1
                   and d.get("screen") == "COMBAT" and (d.get("time_budget") or {}).get("kind") == "boss"]
        per_run[run] = {"pacing": info, "card_agreements": card_agreements(rs),
                        "time": {"card_module": card_time, "Jev": jev_time, "direction_module": dir_time,
                                 "Jev_latency_ms": stats(r.get("jev_latency_ms") for r in rs),
                                 "recorded_increment_ms": sum(t["actual_ms"]["sum"] for t in (card_time, jev_time, dir_time)),
                                 "limits": "sum disjoint H2 outer budgets only; unmeasured overhead and counterfactual net slowdown unknown"},
                        "cost": {"Jev_shadow_observations": len(rs), "successful_usage_records": len(jev_tokens),
                                 "input_tokens_recorded": success_tokens,
                                 "output_tokens_recorded": sum(m.get("output_tokens", 0) or 0 for m in jev_tokens),
                                 "fallback_without_usage_records": sum(r["jev_fallback"] is not None and not r["jev_meta"] for r in rs),
                                 "request_ids": [m.get("request_id") for m in jev_tokens],
                                 "estimated_USD_recorded_input_only": success_tokens / 1_000_000 * .042,
                                 "rate_scope": "frozen repository pricing.ts $0.042/MTok input, output free; estimate not bill or current external quote; failed request usage unknown"},
                        "Boss_first_attempt_B2": h1.simulation(boss_ds, "B2"),
                        "wake": {"any_direction_change_questions": sum(r["wake_any_direction_change"] for r in rs),
                                 "any_uncovered_questions": sum(r["wake_any_uncovered"] for r in rs),
                                 "either_condition_questions": sum(r["wake_any_direction_change"] or r["wake_any_uncovered"] for r in rs),
                                 "plan_coverage_unknown_questions": sum("plan_coverage_unknown" in r["fact_unknowns"] for r in rs)}}
    output = {"at": datetime.now().astimezone().isoformat(), "schema": "H2-natural-analysis-v1",
              "input_manifest": args.inputs + "/manifest.json", "input_manifest_sha256": hashlib.sha256((inp / "manifest.json").read_bytes()).hexdigest(),
              "runs": per_run, "card_questions": cards, "agreements": card_agreements(cards),
              "disagreements": divergence, "missing_card_sidecar": missing, "duplicate_card_sidecars": duplicate,
              "shadow_errors": [r for r in streams["human-pace-shadow"] if r.get("status") == "unknown"],
              "direction": direction_analysis(directions),
              "plans": plan_analysis(streams["run-plans"], streams["human-pace-shadow"]),
              "wake_questions": [r for r in cards if r["wake_any_direction_change"] or r["wake_any_uncovered"]],
              "definitions": "analysis-definitions.md frozen before any admitted startup",
              "no_causal_or_mechanism_claim": True}
    (HERE / "analysis-final.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    fields = ["run_id", "floor", "act", "decision_id", "actual_decider", "brain_actual", "jev_success_choice", "jev_fallback",
              "module_first", "module_first_basis", "difficulty", "wake_any_direction_change", "wake_any_uncovered", "jev_latency_ms"]
    with (HERE / "per-question.csv").open("w") as handle:
        writer = csv.DictWriter(handle, fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(cards)
    print(json.dumps({"runs": list(infos), "card_questions": len(cards), "agreements": output["agreements"]["all"],
                      "missing_sidecar": len(missing), "duplicate_sidecar": len(duplicate)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
