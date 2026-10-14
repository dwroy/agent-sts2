#!/usr/bin/env python3
"""Describe prompt sensitivity/cost only; explicitly no simulated-rank accuracy metric."""
import argparse
import gzip
import hashlib
import json
import statistics
from collections import Counter
from pathlib import Path
from prepare import ARMS, encoded, parse_options


def average(values):
    return statistics.mean(values) if values else None


def summary(packet):
    cases = json.loads((packet / "cases.json").read_bytes())
    request_path = packet / "requests.jsonl"
    request_bytes = request_path.read_bytes() if request_path.exists() else gzip.decompress((packet / "requests.jsonl.gz").read_bytes())
    jobs = [json.loads(line) for line in request_bytes.splitlines()]
    results = [json.loads(line) for line in (packet / "results.jsonl").read_bytes().splitlines()]
    if len({r["id"] for r in results}) != len(results):
        raise ValueError("duplicate response")
    by_id = {r["id"]: r for r in results}
    if not set(by_id).issubset({j["id"] for j in jobs}):
        raise ValueError("response has no matching request")
    for job in jobs:
        result = by_id.get(job["id"])
        if result and result["request_sha256"] != job["request_sha256"]:
            raise ValueError("request/result binding mismatch")
    ok = {r["id"]: r for r in results if r["status"] == "ok" and r["resolved_model"] == "jev-1.13.0"}

    def get(case, arm, order="original", repeat=0):
        return ok.get(f"{case['id']}/{arm}/{order}/{repeat}")

    def pick(result):
        return result["answers"]["plan"]["choice"] if result else None

    arms = {}
    for arm in ARMS:
        base = [get(c, arm) for c in cases if get(c, arm)]
        unique = [c for c in cases if c["direct"]["choice"] is not None and get(c, arm)]
        probe = [c for c in cases if c["probe"] and get(c, arm) and get(c, arm, repeat=1) and get(c, arm, order="reversed")]
        latencies = sorted(r["latency_ms"] for r in base)
        arms[arm] = {"base_responses": len(base), "mean_input_tokens": average([r["input_tokens"] for r in base]),
                     "mean_latency_ms": average(latencies), "median_latency_ms": statistics.median(latencies) if latencies else None,
                     "unique_model_rank_agreement": {"matches": sum(pick(get(c, arm)) == c["direct"]["choice"] for c in unique), "denominator": len(unique)},
                     "probes": {"denominator": len(probe),
                       "identical_repeat_changed": sum(pick(get(c, arm)) != pick(get(c, arm, repeat=1)) for c in probe),
                       "reversed_order_changed": sum(pick(get(c, arm)) != pick(get(c, arm, order="reversed")) for c in probe)},
                     "historical_choice_agreement": sum(pick(get(c, arm)) == c["case"]["choice"] for c in cases if get(c, arm))}
    pairs = {}
    for a, b in [("full", "full_unlabelled"), ("full_unlabelled", "compact_unlabelled"), ("full", "compact_unlabelled")]:
        cs = [c for c in cases if get(c, a) and get(c, b)]
        pairs[a + "_vs_" + b] = {"denominator": len(cs), "changed_choices": sum(pick(get(c, a)) != pick(get(c, b)) for c in cs),
            "mean_input_token_change_b_minus_a": average([get(c, b)["input_tokens"] - get(c, a)["input_tokens"] for c in cs]),
            "mean_latency_change_ms_b_minus_a": average([get(c, b)["latency_ms"] - get(c, a)["latency_ms"] for c in cs])}
    followup = []
    for case in cases:
        original = next(o for o in case["originals"] if o["path"].endswith("-prompt.jsonl.gz"))
        raw = gzip.decompress((packet / original["path"]).read_bytes())
        if hashlib.sha256(raw).hexdigest() != original["raw_sha256"]:
            raise ValueError("original changed")
        request = json.loads(raw)["request"]
        options = parse_options(request)
        picks = {arm: pick(get(case, arm)) for arm in ARMS}
        followup.append({"case_id": case["id"], "run": case["case"]["run"], "floor": case["case"]["floor"],
            "turn": case["case"]["turn"], "source": case["case"]["source"], "stratum": case["stratum"],
            "direct_baseline": case["direct"], "fresh_choices": picks, "historical_choice": case["case"]["choice"],
            "guard_sl_audit": case["historical_guard"],
            "chosen_option_model_facts": {arm: options.get(key) for arm, key in picks.items()},
            "actual_counterfactual_quality": None,
            "next": "Original learner R3: bind executed action trajectory and calibrated paired alternatives; no claim that raw Jev answer executed or that simulator rank is truth."})
    result = {"schema": "silent-jev-prompt-pilot-results-v1", "complete": len(ok) == len(jobs),
        "planned": len(jobs), "received": len(results), "ok": len(ok),
        "response_status": dict(Counter(r["status"] for r in results)), "resolved_models": sorted({r.get("resolved_model") or "unknown" for r in results}),
        "cases": len(cases), "runs": len({c["case"]["run"] for c in cases}), "arms": arms, "paired": pairs,
        "direct_baseline": {"eligible": sum(c["direct"]["choice"] is not None for c in cases),
                            "abstained": sum(c["direct"]["choice"] is None for c in cases)},
        "usage": {"input_tokens": sum(r["input_tokens"] for r in ok.values()),
                  "output_tokens": sum(r["output_tokens"] or 0 for r in ok.values()),
                  "sum_request_latency_ms": sum(r["latency_ms"] for r in ok.values()),
                  "failed_usage_unknown": sum(r["status"] != "ok" for r in results)},
        "gameplay_quality": {"measured": False, "win_rate_delta": None, "hp_saved_delta": None,
                             "online_change_authorized_by_this_result": False},
        "limits": ["32 balanced diagnostic questions from 13 correlated runs; not population incidence or a clean unseen holdout.",
                   "Direct choice abstains on ties/no rank; simulator rank agreement is descriptive, not accuracy.",
                   "Historical latest responses are not a same-version paired baseline; all fresh arms resolve to the pinned model.",
                   "Reversing insertion order leaves option IDs and other option-reference arrays unchanged; name bias is not isolated.",
                   "Repeated responses may vary; one reversed pair cannot prove causal position bias.",
                   "Compaction intentionally removes intermediate realization traces; it is not lossless or a proof of semantic equivalence.",
                   "Explicit rank flags are removed; numerical scores and their limitations remain. No independent outcome labels exist here.",
                   "Token/latency comparisons reflect these paired calls, including provider load/cache effects; not whole-run speedup.",
                   "Guard/SL and actual dispatched actions must be evaluated separately before gameplay attribution."]}
    (packet / "analysis.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    (packet / "learner-followup.jsonl").write_bytes(b"".join(encoded(row) + b"\n" for row in followup))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("packet", type=Path)
    args = parser.parse_args()
    summary(args.packet)
