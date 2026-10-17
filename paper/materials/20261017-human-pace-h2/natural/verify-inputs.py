"""Verify each frozen projection against its original byte range and recomputed projection."""
from pathlib import Path
import argparse
import gzip
import hashlib
import importlib.util
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
spec = importlib.util.spec_from_file_location("h2_freezer", HERE / "freeze-inputs.py")
freezer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(freezer)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inputs", default="inputs-final")
    args = parser.parse_args()
    directory = HERE / args.inputs
    manifest = json.loads((directory / "manifest.json").read_bytes())
    verified = {}
    for item in manifest["files"]:
        path = directory / item["path"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"], item
        name = path.name.removesuffix(".jsonl.gz")
        count = 0
        with gzip.open(path, "rt") as handle, (ROOT / "logs" / f"{name}.jsonl").open("rb") as source:
            for line in handle:
                row = json.loads(line)
                ref = row["_source"]
                source.seek(ref["off"])
                raw = source.read(ref["len"])
                assert hashlib.sha256(raw).hexdigest() == ref["sha256"], ref
                actual = json.loads(raw)
                assert freezer.project(name, actual, raw, ref["off"]) == row, ref
                count += 1
        verified[name] = count
    report = {"all_original_row_SHA_verified": True, "all_projections_recomputed_equal": True,
              "counts": verified, "input_manifest_sha256": hashlib.sha256((directory / "manifest.json").read_bytes()).hexdigest(),
              "scope": "byte and deterministic projection provenance only; no gameplay/models/tests of production"}
    (directory / "provenance-verification.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
