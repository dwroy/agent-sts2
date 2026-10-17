#!/usr/bin/env python3
"""Recompute timing attribution from frozen offsets; no simulation, game, or model calls."""
import argparse
import hashlib
import gzip
import json
import statistics
from collections import Counter
from datetime import datetime
from pathlib import Path


def stats(values):
    ordered = sorted(values)
    if not ordered:
        return {"n": 0}
    def quantile(p):
        at = (len(ordered) - 1) * p
        lo = int(at)
        hi = min(lo + 1, len(ordered) - 1)
        return ordered[lo] + (ordered[hi] - ordered[lo]) * (at - lo)
    return {"n": len(values), "sum": sum(values), "p50": statistics.median(values),
            "p90": quantile(.9), "min": min(values), "max": max(values)}


def read_rows(root, directory, index_name):
    index = json.loads((directory / index_name).read_text())
    if index.get("truncated"):
        raise ValueError("truncated input index")
    frozen = (json.loads(gzip.decompress((directory / "timing-extract.json.gz").read_bytes()))
              if index_name == "decision-index.json"
              else json.loads((directory / "b3-timing-projection.json").read_text()))
    expected = {row["off"]: row["sha256"] for row in frozen}
    result = []
    with (root / "logs/decisions.jsonl").open("rb") as source:
        for values in index["rows"]:
            entry = dict(zip(index["columns"], values))
            source.seek(entry["off"])
            raw = source.read(entry["len"])
            row = json.loads(raw)
            digest = hashlib.sha256(raw).hexdigest()
            if entry["off"] in expected and digest != expected[entry["off"]]:
                raise ValueError(f"changed original at {entry['off']}")
            if row.get("run_id") != entry["run_id"] or row.get("floor") != entry["floor"]:
                raise ValueError("index identity mismatch")
            result.append(row)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[3])
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent
    floor_rows = read_rows(args.root, directory, "decision-index.json")
    other_rows = read_rows(args.root, directory, "noncombat-index.json")
    entries = json.loads((directory / "f48-entry-r2.json").read_text())
    entry_by_run = {row[0]: dict(zip(entries["columns"], row)) for row in entries["rows"]}
    summary = {}
    for run in ("N9GKED3PMEV3", "CVJ4MLQF4CSY"):
        rows = [row for row in floor_rows if row["run_id"] == run]
        b2 = [row for row in rows if row.get("boss_sim")]
        b3 = [row for row in other_rows if row["run_id"] == run and row.get("boss_sim")]
        get_time = lambda section, key: stats([row[section][key] for row in rows
            if isinstance((row.get(section) or {}).get(key), (int, float))])
        actual = sum(row["boss_sim"]["adaptive"]["work"]["actual"] for row in b2)
        full = sum(row["boss_sim"]["adaptive"]["work"]["full"] for row in b2)
        b2_ms = sum(row["boss_sim"]["ms"] for row in b2)
        end = datetime.fromisoformat(rows[-1]["ts"].replace("Z", "+00:00"))
        begin = datetime.fromisoformat(rows[0]["ts"].replace("Z", "+00:00"))
        entry = datetime.fromisoformat(entry_by_run[run]["first_ts"] + "+00:00")
        summary[run] = {
            "decisions": len(rows), "first_decision": rows[0]["ts"], "last_decision": rows[-1]["ts"],
            "decision_span_ms": (end - begin).total_seconds() * 1000,
            "entry_frame_to_last_decision_ms": (end - entry).total_seconds() * 1000,
            "entry": entry_by_run[run],
            "b2_questions": len(b2), "bosses": dict(Counter(row["boss_sim"].get("boss") for row in b2)),
            "b2_ms": stats([row["boss_sim"]["ms"] for row in b2]),
            "actual_outcomes": actual, "full_outcomes": full, "c2_saved_fraction": 1 - actual / full,
            "line_count": stats([len(row["boss_sim"].get("lines", {})) for row in b2]),
            "line_order_pairs": sum(row["timing"]["boss_sim"]["pairs"] for row in b2),
            "orders": dict(Counter(row["boss_sim"]["orders"] for row in b2)),
            "b2_wall_ms_per_outcome": b2_ms / actual,
            "planner_cpu_ms_per_outcome_includes_rollout": sum(row["timing"]["cpu_ms"] for row in b2) / actual,
            "joint_records": sum(bool(row["boss_sim"].get("f48_joint_shadow")) for row in b2),
            "joint_separate_wall_ms": None,
            "joint_aggregation_plus_all_other_planning_upper_ms": sum(row["timing"]["other_ms"] for row in b2),
            "joint_json_bytes": sum(len(json.dumps(row["boss_sim"].get("f48_joint_shadow", {}),
                ensure_ascii=False, separators=(",", ":")).encode()) for row in b2),
            "timing": {key: get_time("timing", key) for key in
                ("planner_ms", "solve_ms", "rollout_ms", "boss_sim_ms", "other_ms", "cpu_ms", "load1", "probe_ms")},
            "latency": {key: get_time("latency_ms", key) for key in ("jev", "action", "planner", "pre")},
            "b3_elsewhere": {"questions": len(b3), "current_b3_ms": sum(row["boss_sim"].get("ms", 0) for row in b3),
                "global_wall_ms": sum(row["boss_sim"].get("global_build", {}).get("wall_ms", 0) for row in b3),
                "b3_plus_shadow_wall_ms": sum(row["boss_sim"].get("global_build", {}).get("b3_plus_shadow_wall_ms", 0) for row in b3)},
            "f48_b3_questions": 0,
        }
        assert all(not row.get("boss_sim", {}).get("global_build") for row in rows)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
