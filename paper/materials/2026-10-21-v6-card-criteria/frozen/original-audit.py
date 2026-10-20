"""Read-only, reproducible R407 displayed-metric audit; never runs a simulation or model."""
import argparse
import gzip
import hashlib
import json
import math
import statistics
from pathlib import Path

RUNS = ("JPWMMV67SZCL", "9ZERN492CSHX")
HERE = Path(__file__).resolve().parent
METRICS = ("hp_loss", "turns", "damage_per_turn", "death_rate", "losing_enemy_hp_fraction")


def save(name, data):
    (HERE / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def freeze(root):
    manifest = []
    for name in ("jev-prompts", "decisions", "v6-card-results"):
        path = root / "logs" / (name + ".jsonl")
        limit = path.stat().st_size
        records = []
        with path.open("rb") as f:
            f.seek(max(0, limit - 100_000_000))
            if f.tell():
                f.readline()
            while f.tell() < limit:
                offset = f.tell()
                raw = f.readline()
                if not any(r.encode() in raw for r in RUNS):
                    continue
                row = json.loads(raw)
                if row.get("run_id") not in RUNS or name != "v6-card-results" and row.get("label") != "reward/card":
                    continue
                records.append(raw)
                manifest.append({"source": str(path), "offset": offset, "length": len(raw),
                                 "sha256": hashlib.sha256(raw).hexdigest(), "run": row["run_id"], "floor": row["floor"]})
        with gzip.GzipFile(str(HERE / "frozen" / (name + ".jsonl.gz")), "wb", mtime=0) as out:
            out.write(b"".join(records))
    save("checks/source-lines.json", manifest)


def read(name):
    with gzip.open(HERE / "frozen" / (name + ".jsonl.gz"), "rt") as f:
        return [json.loads(line) for line in f]


def pack(row, field, metric):
    a = row.get(field)
    if not isinstance(a, list):
        return None
    return a[METRICS.index(metric)]


def analyse():
    prompts, decisions, tables = read("jev-prompts"), read("decisions"), read("v6-card-results")
    assert len(prompts) == len(decisions) == len(tables) == 12
    detailed = []
    for p in prompts:
        state = p["request"]["state"]
        d = next(x for x in decisions if x["decision_id"] == p["decision_id"])
        t = next(x["table"] for x in tables if x["run_id"] == p["run_id"] and x["floor"] == p["floor"])
        answer = p["answers"]["pick"]
        expected_action = {"action": "skip_reward_cards"} if answer["choice"] == "skip" else {
            "action": "choose_reward_card", "option_index": int(answer["choice"].removeprefix("card"))}
        assert d["chosen"] == expected_action and d["result"] == "completed: Action completed."
        targets = [x for x in state["targets"] if x["kind"] in ("current", "elite")]
        boss = next(x["id"] for x in targets if x["kind"] == "current")
        elites = [x["id"] for x in targets if x["kind"] == "elite"]
        options = state["options"]
        assert all(v is not None and len(v["immediate"]) == len(targets) for v in options.values())
        target_id = lambda r: state["targets"][r["target"]]["id"] if isinstance(r["target"], int) else r["target"]
        by_option = {k: {target_id(r): r for r in v["immediate"]} for k, v in options.items()}
        variants = {}
        summary_options = {}
        for boss_weight in (0, .25, .5, .75, 1):
            weights = {boss: boss_weight, **{key: (1-boss_weight)/len(elites) for key in elites}}
            scores = {}
            for key, rows in by_option.items():
                aggregates = {}
                for metric in METRICS:
                    vals = [(weights[tid], pack(rows[tid], "vs_skip", metric)) for tid in weights if weights[tid] > 0]
                    aggregates[metric] = None if any(v is None for _, v in vals) else {
                        "mean": sum(w*v[0] for w, v in vals),
                        # A sum of SEs is a conservative covariance bound, not an independence assumption.
                        "se_upper_bound": None if any(v[1] is None for _, v in vals) else sum(w*v[1] for w, v in vals),
                        "n_min": min(v[2] for _, v in vals)}
                def value(m, sign=1):
                    return sign * aggregates[m]["mean"] if aggregates[m] is not None else math.inf
                # Loss margins are conditional, so use them as a tie-break only if every target is all-loss for every option.
                all_loss = all(pack(r, "result", "death_rate") and pack(r, "result", "death_rate")[0] == 1
                               for rs in by_option.values() for tid, r in rs.items() if weights.get(tid, 0) > 0)
                score = [value("death_rate"), value("hp_loss")]
                if all_loss:
                    score.append(value("losing_enemy_hp_fraction"))
                score.append(value("damage_per_turn", -1))
                scores[key] = {"sort": score, "aggregates": aggregates}
            order = sorted(scores, key=lambda key: tuple(round(v, 10) for v in scores[key]["sort"]) + (key,))
            best_score = [round(x, 10) for x in scores[order[0]]["sort"]]
            best = [k for k in order if [round(x, 10) for x in scores[k]["sort"]] == best_score]
            variants[str(boss_weight)] = {"best": best, "order": order, "chosen_is_best": answer["choice"] in best}
            if boss_weight == .5:
                summary_options = scores
        # Candidate/skip target-level dominance; do not manufacture cross-option paired SEs.
        dominance = {}
        for key, rows in by_option.items():
            if key == "skip":
                continue
            comparisons = []
            for tid, row in rows.items():
                estimates = {m: pack(row, "vs_skip", m) for m in METRICS}
                oriented = [(m, estimates[m], -1 if m == "damage_per_turn" else 1)
                            for m in ("death_rate", "hp_loss", "damage_per_turn")]
                known = all(v is not None for _, v, _ in oriented)
                comparisons.append({"target": tid,
                    "no_worse_three_metrics": known and all(sign*v[0] <= 1e-10 for _, v, sign in oriented),
                    "strictly_better_any": known and any(sign*v[0] < -1e-10 for _, v, sign in oriented),
                    "improvements_excluding_zero_1_96se": [m for m,v,sign in oriented if v is not None and v[1] is not None and sign*v[0]+1.96*v[1] < 0],
                    "paired": estimates})
            dominance[key] = comparisons
        # Verify exactly what reached the model against the full audit; no re-simulation/current knowledge.
        mismatches = []
        for key, rows in by_option.items():
            for tid, row in rows.items():
                original = next(x for x in t["immediate"] if x["option_id"] == key and x["target_id"] == tid)
                for m in METRICS:
                    for shown, raw in (("result", "metrics"), ("vs_skip", "paired_delta")):
                        value = original[raw][m]
                        expected = [value["mean"], value["se"], value["n"]] if value else None
                        actual = pack(row, shown, m)
                        # Display is deliberately rounded by the shared prompt summary.
                        def rounded_equal(a, b, index):
                            if a is None or b is None:
                                return a is None and b is None
                            if index == 2 or b == 0:
                                return a == b
                            digits = 5 if index == 0 else 3
                            tolerance = .50001 * 10 ** (math.floor(math.log10(abs(b))) - digits + 1)
                            return abs(a-b) <= tolerance
                        equivalent = actual is None and expected is None or actual is not None and expected is not None and all(
                            rounded_equal(a, b, i) for i,(a,b) in enumerate(zip(actual, expected)))
                        if not equivalent:
                            mismatches.append([key, tid, shown, m])
        detailed.append({"run": p["run_id"], "floor": p["floor"], "decision_id": p["decision_id"],
            "choice": answer["choice"], "cards": {k: v.get("card", "skip") for k,v in options.items()},
            "confidence": answer["confidence"], "probabilities": answer["probabilities"], "latency_ms": p["latency_ms"],
            "chosen_action": d["chosen"], "result": d.get("result"),
            "state_utf8_bytes": len(json.dumps(state, ensure_ascii=False, separators=(",", ":")).encode()),
            "direction_weights": state["direction_weights"], "long_term_cache": state["long_term_cache"],
            "B_rows_displayed": sum(len(c.get("outcomes", [])) for c in state["core_metrics"]),
            "B_rows_known": sum(any(cell is not None for cell in row[1]) for c in state["core_metrics"] for row in c.get("outcomes", [])),
            "B_rows_full": len(t["long_term"]), "cores_displayed": len(state["core_metrics"]),
            "progress": {k: v.get("advances", []) for k,v in options.items()},
            "A_rows_displayed": sum(len(v["immediate"]) for v in options.values()),
            "all_death_one_targets": [tid for tid in by_option["skip"] if all(pack(rows[tid], "result", "death_rate")[0] == 1 for rows in by_option.values())],
            "all_hp_equal_targets": [tid for tid in by_option["skip"] if len({pack(rows[tid], "result", "hp_loss")[0] for rows in by_option.values()}) == 1],
            "sample_n": sorted({pack(row, "result", "hp_loss")[2] for rows in by_option.values() for row in rows.values()}),
            "primary": summary_options, "sensitivity": variants, "skip_comparisons": dominance,
            "display_value_mismatches": mismatches, "prompt_budget": state.get("prompt_budget"),
            "telemetry": t["telemetry"]})
    for r in detailed:
        chosen = r["primary"][r["choice"]]["aggregates"]
        r["alternatives_dominating_weighted_means"] = []
        r["strong_primary_conflicts"] = []
        for key, data in r["primary"].items():
            if key == r["choice"]:
                continue
            better = data["aggregates"]
            oriented = {m: (-1 if m == "damage_per_turn" else 1) * (better[m]["mean"] - chosen[m]["mean"])
                        for m in ("death_rate", "hp_loss", "damage_per_turn")}
            if all(x <= 1e-10 for x in oriented.values()) and any(x < -1e-10 for x in oriented.values()):
                r["alternatives_dominating_weighted_means"].append(key)
            # Diagnostic screen, not a calibrated CI or independent cross-option paired test.
            if all(oriented[m] + 1.96 * (better[m]["se_upper_bound"] + chosen[m]["se_upper_bound"]) < 0
                   for m in ("death_rate", "hp_loss")) and oriented["damage_per_turn"] < 0:
                r["strong_primary_conflicts"].append(key)
    save("results.json", detailed)
    summary = {"n": len(detailed), "by_run": {run: {"n": sum(r["run"] == run for r in detailed),
        "matches_primary": sum(r["run"] == run and r["sensitivity"]["0.5"]["chosen_is_best"] for r in detailed)} for run in RUNS},
        "matches_by_boss_weight": {str(w): sum(r["sensitivity"][str(w)]["chosen_is_best"] for r in detailed) for w in (0,.25,.5,.75,1)},
        "skip_count": sum(r["choice"] == "skip" for r in detailed),
        "confidence_median": statistics.median(r["confidence"] for r in detailed),
        "display_mismatches": sum(len(r["display_value_mismatches"]) for r in detailed),
        "B_rows_displayed": sum(r["B_rows_displayed"] for r in detailed),
        "B_rows_full": sum(r["B_rows_full"] for r in detailed),
        "B_rows_known": sum(r["B_rows_known"] for r in detailed),
        "all_death_one_target_count": sum(len(r["all_death_one_targets"]) for r in detailed),
        "total_A_targets": sum(r["A_rows_displayed"]//len(r["cards"]) for r in detailed),
        "matches_DPT_only": sum(r["choice"] == max(r["primary"], key=lambda k: r["primary"][k]["aggregates"]["damage_per_turn"]["mean"]) for r in detailed),
        "weighted_mean_dominated_choices": sum(bool(r["alternatives_dominating_weighted_means"]) for r in detailed),
        "strong_conflict_questions": [{"run": r["run"], "floor": r["floor"], "alternatives": r["strong_primary_conflicts"]}
                                      for r in detailed if r["strong_primary_conflicts"]]}
    save("summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    for r in detailed:
        print(r["run"], r["floor"], r["cards"], "picked", r["choice"], "best", r["sensitivity"]["0.5"]["best"],
              "all1", len(r["all_death_one_targets"]), "B", r["B_rows_displayed"], "n", r["sample_n"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--freeze", type=Path)
    args = parser.parse_args()
    if args.freeze:
        freeze(args.freeze)
    analyse()
