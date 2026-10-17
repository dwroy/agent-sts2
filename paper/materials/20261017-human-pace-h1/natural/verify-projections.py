"""Verify frozen projections against original byte ranges, without rerunning gameplay."""
from pathlib import Path
import argparse
import gzip
import hashlib
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory")
    args = parser.parse_args()
    directory = HERE / args.directory
    manifest = json.loads((directory / "manifest.json").read_bytes())
    verified = {}
    for item in manifest["files"]:
        path = HERE / item["path"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"]
        name = path.name.removesuffix(".jsonl.gz")
        count = 0
        with gzip.open(path, "rt") as projections, (ROOT / "logs" / f"{name}.jsonl").open("rb") as original:
            for line in projections:
                row = json.loads(line)
                ref = row["_source"]
                original.seek(ref["off"])
                raw = original.read(ref["len"])
                assert hashlib.sha256(raw).hexdigest() == ref["sha256"], ref
                actual = json.loads(raw)
                run = actual.get("run_id") or (actual.get("state") or {}).get("run_id")
                assert run == row["run_id"]
                count += 1
        verified[name] = count
    for item in manifest.get("invalid_rows", []):
        with (ROOT / item["path"]).open("rb") as original:
            original.seek(item["off"])
            assert hashlib.sha256(original.read(item["len"])).hexdigest() == item["sha256"]
    report = {"all_selected_original_ranges_match": True, "counts": verified,
              "invalid_original_rows_preserved": len(manifest.get("invalid_rows", [])),
              "source_manifest_sha256": hashlib.sha256((directory / "manifest.json").read_bytes()).hexdigest(),
              "scope": "byte provenance only, no production tests or scientific mechanism checks"}
    (directory / "provenance-verification.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
