"""Summarize frozen audit files only; no models, simulation or actions."""
import gzip
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PRIOR = HERE.parent / "2026-10-21-v6-card-criteria"
ARTIFACTS = ROOT / ".artifacts/core-cache-r1"


def read(path):
    data = path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix == ".gz" else data)


def reasons(rows):
    return dict(Counter(reason for row in rows for reason in set(row["unknown_reasons"])))


def numeric(row):
    return any(cell is not None for cell in row["metrics"].values())


old = read(PRIOR / "frozen/v6-card-results.json.gz")
old_rows = [row for entry in old for row in entry["table"]["long_term"]]
old_summary = {
    "questions": len(old), "stored_B_rows": len(old_rows),
    "numeric_B_rows": sum(map(numeric, old_rows)), "reason_counts_overlapping": reasons(old_rows),
    "cache_states": dict(Counter(e["table"]["telemetry"]["long_term_cache"] for e in old)),
    "per_question": [{"run": e["run_id"], "floor": e["floor"],
                      "cache": e["table"]["telemetry"]["long_term_cache"],
                      "rows": len(e["table"]["long_term"]),
                      "reasons_overlapping": reasons(e["table"]["long_term"])} for e in old],
}

warm = read(ARTIFACTS / "warm-results.json")
repacked = {e["key"]: e for e in read(ARTIFACTS / "format-replay-r2.json")}
warm_summary = []
for entry in warm:
    rows = entry["table"]["long_term"]
    formatted = repacked[entry["key"]]
    cores = formatted["request"]["state"]["core_metrics"]
    shared = [row for core in cores for row in core.get("outcomes", [])]
    # The executed format-replay's B_numeric_in_shared_state counts all rows, including unknowns.
    # Preserve that raw output; compute actual numeric rows separately here.
    numeric_shared = sum(any(isinstance(c, list) and c[0] is not None for c in row[1]) for row in shared)
    warm_summary.append({
        "key": entry["key"], "before": entry["before"],
        "model_wait_ms": entry["model_wait_ms"], "background_events": entry["events"],
        "stored_B_rows": len(rows), "numeric_B_rows": sum(map(numeric, rows)),
        "numeric_B_cores": len({row["combo_id"] for row in rows if numeric(row)}),
        "numeric_sample_sizes": sorted({row["samples"] for row in rows if numeric(row)}),
        "reasons_overlapping": reasons(rows),
        "foreground_A_ms_original": entry["A_ms"],
        "format_ms_original": entry["format_ms"],
        "foreground_plus_format_ms_original": entry["A_ms"] + entry["format_ms"],
        "known_options": entry["known"],
        "latest_format_only": {
            "format_ms": formatted["format_ms"], "wire_bytes": formatted["wire_bytes"],
            "core_catalog_count": len(cores), "A_targets_per_choice": formatted["A_targets_per_choice"],
            "shared_B_rows_total": len(shared), "shared_B_rows_numeric": numeric_shared,
            "criteria_B_rows_numeric": formatted["B_numeric_in_criteria"],
        },
    })

analysis = read(PRIOR / "analysis-results.json")
answers = {row["key"]: row for row in read(PRIOR / "frozen/answers-r2.json.gz")}
residuals = []
for key in ["JPWMMV67SZCL-f2", "JPWMMV67SZCL-f12", "JPWMMV67SZCL-f15"]:
    row = next(item for item in analysis if item["key"] == key)
    answer = answers[key]
    residuals.append({
        "key": key, "choice": row["choice"], "confidence": row["confidence"],
        "probabilities": answer["answers"]["pick"]["probabilities"],
        "diagnostic_best": row["primary"]["best"],
        "diagnostic_three_mean_dominated_by": row["primary"]["mean_dominated_by"],
        "strong_conflicts": row["primary"]["strong_conflicts"],
        "per_option_aggregates": {option: item["aggregates"] for option, item in row["primary"]["options"].items()},
        "natural_language_reason_available": False,
        "raw_choice_fields": sorted(answer["answers"]["pick"]["raw"]),
    })

output = {
    "old_R407": old_summary, "warm_frozen_replay": warm_summary,
    "residual_choices": residuals,
    "limitations": [
        "Unknown-reason counts overlap; rows are not independent battles.",
        "Historical generic opening_unavailable cannot be attributed to a particular card or budget after the fact.",
        "No new Nova requests or game actions; old Nova replies contain no natural-language reason.",
        "Diagnostic Boss=.5, six elites=.5/6 aggregates and SE upper bounds are audit-only, never a production scoring formula.",
        "Frozen replay uses current worktree models, mostly n=2 for B, not calibration or Jev quality acceptance.",
        "Latest format-only run must not be added to earlier A timing as if it were the same end-to-end measurement.",
        "V6_CARD_DECIDER stays brain; production cache adoption and future Jev acceptance remain unmeasured.",
    ],
}
(HERE / "analysis.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"old": {k: v for k, v in old_summary.items() if k != "per_question"},
                  "warm": [{k: v for k, v in e.items() if k != "background_events"} for e in warm_summary]}, ensure_ascii=False))
