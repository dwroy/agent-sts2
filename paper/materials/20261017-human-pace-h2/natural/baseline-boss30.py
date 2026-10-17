"""Group the already frozen two H1 natural runs, without rereading live logs."""
from pathlib import Path
import gzip
import hashlib
import importlib.util
import json

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
H1 = ROOT / "paper/materials/20261017-human-pace-h1/natural"
spec = importlib.util.spec_from_file_location("h1", H1 / "analyze.py")
h1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h1)


def main():
    result = {"scope": "two previously accepted full H1 natural runs, Boss30; predeclared before H2 outcomes; not causal policy-fixed comparison",
              "runs": {}, "inputs": [], "tools": []}
    for run in ("25MFNPAE37R2", "2PQK67ULZY90"):
        inp = H1 / f"inputs-{run}"
        streams = {}
        for name in ("decisions", "sl-attempts", "run-config"):
            path = inp / (name + ".jsonl.gz")
            with gzip.open(path, "rt") as handle:
                streams[name] = [json.loads(line) for line in handle]
            result["inputs"].append({"path": str(path.relative_to(ROOT)), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
        floors = {r["floor"] for r in streams["sl-attempts"] if r.get("fight_kind") == "boss"}
        rows = [d for d in streams["decisions"] if d.get("screen") == "COMBAT" and d.get("floor") in floors
                and (d.get("sl_attempt") or 1) == 1]
        result["runs"][run] = {"code": streams["run-config"][0]["code"],
                              "all_B2": h1.simulation(streams["decisions"], "B2"),
                              "SL_retry_B2": h1.simulation([d for d in streams["decisions"] if (d.get("sl_attempt") or 1) > 1], "B2"),
                              "Boss_first_attempt_B2": h1.simulation(rows, "B2"),
                              "by_Boss_floor": {str(f): h1.simulation([d for d in rows if d["floor"] == f], "B2") for f in sorted(floors)},
                              "first_attempt_Boss_decisions": len(rows),
                              "known_comparison_limit": "Boss30;2PQK had a C1 sample-ID episode fixed byR384; later H0, knowledge and encounter composition also change"}
    result["tools"] = [{"path": str(p.relative_to(ROOT)), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                       for p in (Path(__file__), H1 / "analyze.py")]
    output = HERE / "baseline-boss30-by-floor.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"output": output.name, "runs": list(result["runs"])}))


if __name__ == "__main__":
    main()
