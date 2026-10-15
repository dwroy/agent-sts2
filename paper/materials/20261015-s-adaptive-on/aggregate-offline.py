"""Summarize the original frozen C2 cases without rerunning simulations or enabling a switch."""
import argparse
from datetime import datetime
import hashlib
import json
from pathlib import Path


def read(path):
    raw = path.read_bytes()
    return json.loads(raw), {"path": str(path), "sha256": hashlib.sha256(raw).hexdigest()}


def quantile(values, p):
    values = sorted(values)
    if not values:
        return None
    at = (len(values) - 1) * p
    lo = int(at)
    hi = min(lo + 1, len(values) - 1)
    return values[lo] + (values[hi] - values[lo]) * (at - lo)


def aggregate(initial_path, manifest_path, extra_directory):
    initial, initial_ref = read(initial_path)
    manifest, manifest_ref = read(manifest_path)
    rows = [dict(case, evidence=initial_ref) for case in initial["cases"]]
    expected = {case["id"] for case in manifest["cases"]}
    assert len(expected) == len(manifest["cases"]), "duplicate frozen case identity"
    assert not expected.intersection(row["id"] for row in rows), "overlapping case identities"
    missing = []
    for case in manifest["cases"]:
        source = case["source"]
        assert hashlib.sha256(Path(source["path"]).read_bytes()).hexdigest() == source["sha256"]
        path = extra_directory / (case["id"] + ".json")
        if not path.exists():
            missing.append(case["id"])
            continue
        result, ref = read(path)
        assert result["id"] == case["id"] and result["source"] == source
        assert result["run_id"] == case["run_id"] and result["floor"] == case["floor"]
        comparison = result.get("comparison") or {}
        work = (result.get("adaptive") or {}).get("work") or {}
        rows.append({"id": case["id"], "lane": "b2", "source": source,
                     "boss": result.get("boss"), "ascension": result.get("ascension"),
                     "floor": result["floor"], "agreement": comparison.get("agreement"),
                     "full": comparison.get("full"), "partial": comparison.get("partial"),
                     "work": work, "excluded": result.get("excluded"), "evidence": ref})
    for row in rows:
        source = row["source"]
        assert hashlib.sha256(Path(source["path"]).read_bytes()).hexdigest() == source["sha256"]
        if type(row.get("agreement")) is bool:
            assert isinstance(row.get("full"), list) and isinstance(row.get("partial"), list)
            assert row["agreement"] == (sorted(row["full"]) == sorted(row["partial"]))
    evaluated = [row for row in rows if type(row.get("agreement")) is bool and not row.get("excluded")]
    unresolved = [row["id"] for row in rows if row not in evaluated]
    agreement = sum(row["agreement"] for row in evaluated) / len(evaluated) if evaluated else None
    savings = [row["work"]["savedFraction"] for row in evaluated]
    assert all(type(value) in (int, float) and 0 <= value <= 1 for value in savings)
    complete = not missing and not unresolved and len(rows) == len(initial["cases"]) + len(expected)
    return {"at": datetime.now().astimezone().isoformat(), "parent": "roy-20261014-s-decision",
            "source_refs": [initial_ref, manifest_ref], "expected_questions": len(initial["cases"]) + len(expected),
            "evaluated_questions": len(evaluated), "missing": missing, "unresolved": unresolved,
            "coverage_complete": complete, "observed_agreement": agreement,
            "offline_threshold_met": complete and agreement is not None and agreement >= .95,
            "saved_fraction": {"p50": quantile(savings, .5), "p90": quantile(savings, .9)},
            "mismatches": [row for row in evaluated if row["agreement"] is False], "cases": rows,
            "limits": "Only this frozen offline set. Missing/excluded cases prevent full-coverage admission. "
                      "No natural-run acceptance, runtime saving, game calibration, or automatic on switch."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("initial", type=Path)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("extra_directory", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    result = aggregate(args.initial, args.manifest, args.extra_directory)
    with args.output.open("x") as handle:
        handle.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: result[key] for key in ("expected_questions", "evaluated_questions", "missing",
                                                 "coverage_complete", "offline_threshold_met")}))
