#!/usr/bin/env python3
"""Authorized output-directory isolation; original coordinator/physics/seed stay frozen."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

TREE = Path(__file__).resolve().parents[3]
MATERIAL = Path(__file__).resolve().parent
OLD = TREE / ".artifacts/issue83/crusher-rocket/C-raw-once"
NEW = TREE / ".artifacts/issue83/crusher-rocket/C-raw-manual-r1"
CATALOG = TREE / ".artifacts/issue83/crusher-rocket/transition-candidate-source/data/game-data.json"
if __name__ == "__main__":
    assert hashlib.sha256(CATALOG.read_bytes()).hexdigest() == "8973610b44d41683ecc414299006df99decaf82e9017b9bf4ebb89c216268a69"
    assert (OLD / "old51/results-0.jsonl").read_bytes() == b""
    assert not (OLD / "new1").exists() and not (OLD / "completed.json").exists()
    receipt = json.loads((MATERIAL / "C-zero-output-failure.json").read_text())
    for item in receipt["preserved"].values():
        p = TREE / item["path"]
        assert p.stat().st_size == item["bytes"] and hashlib.sha256(p.read_bytes()).hexdigest() == item["sha256"]
    for name in ("old-keys.json", "new-keys.json"):
        assert (NEW / name).read_bytes() == (OLD / name).read_bytes()
    assert not (NEW / "started.json").exists(), "Only one manual retry authorized"
    spec = importlib.util.spec_from_file_location("issue83_original_coordinator", MATERIAL / "run-C-raw-once.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.OUT = NEW
    module.main()
