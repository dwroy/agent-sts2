"""Fixed #42 CLI contract: register/read/update without touching the research ledger."""
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).with_name("external-strategy-data")
ENTRY = json.loads((BASE / "external-strategy.json").read_text())["entries"][0]
CASES = json.loads((BASE / "contract-cases.json").read_text())


def mutate(case):
    entry = copy.deepcopy(ENTRY)
    for path, value in case["set"].items():
        parts = path.split(".")
        target = entry
        for part in parts[:-1]:
            target = target[int(part)] if isinstance(target, list) else target[part]
        target[parts[-1]] = copy.deepcopy(value)
    for path in case["delete"]:
        parts = path.split(".")
        target = entry
        for part in parts[:-1]:
            target = target[int(part)] if isinstance(target, list) else target[part]
        del target[parts[-1]]
    return entry


def item(entry):
    row = {"character": "silent", "kind": "other", "claim": entry["strategy"],
           "evidence": entry["evidence"], "prior": "unknown", "status": "observed",
           "confidence": entry["confidence"], "by": "fixture:issue42"}
    if "evidence_status" in entry:
        row["evidence_status"] = entry["evidence_status"]
    if any(e.get("type") != "external_aggregate" for e in entry["evidence"]):
        row.update(first_run="SILENT000001", asc=10)
    return row


class ExternalLedgerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "ledger.jsonl"
        self.env = {**os.environ, "LEDGER_FILE": str(self.path), "LEDGER_RUNS": "none"}

    def tearDown(self):
        self.tmp.cleanup()

    def cli(self, *args, row=None):
        return subprocess.run([sys.executable, str(ROOT / "learner/ledger.py"), *args],
                              input=json.dumps(row) if row else None, env=self.env,
                              capture_output=True, text=True)

    def add(self, row):
        result = self.cli("add", row=row)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout.strip()

    def test_all_required_fields_and_types(self):
        for case in CASES:
            with self.subTest(case=case["name"]):
                # Source agreement and mandatory positive floors belong to strategies; legacy ledger floors stay compatible.
                if case["name"] in ("external mislabeled own", "own zero floor rejected"):
                    continue
                before = self.path.read_bytes() if self.path.exists() else b""
                result = self.cli("add", row=item(mutate(case)))
                self.assertEqual(result.returncode, 0 if case["valid"] else 2, result.stderr)
                if not case["valid"]:
                    self.assertEqual(self.path.read_bytes(), before)

    def test_external_readback_and_no_pseudo_first_run(self):
        row = item(ENTRY)
        key = self.add(row)
        shown = json.loads(self.cli("show", key).stdout)
        self.assertNotIn("first_run", shown)
        self.assertNotIn("asc", shown)
        self.assertEqual(shown["evidence_summary"]["own_runs"], 0)
        self.assertEqual(shown["evidence_summary"]["external"][0]["denominator"]["n"], 13307)
        self.assertIn("runs=0 external=", self.cli("find").stdout)
        self.assertEqual(json.loads(self.cli("find", "--run", "SILENT000001", "--json").stdout), [])
        for extra in ({"first_run": "SILENT000001"}, {"asc": 10}, {"prior_runs": ["SILENT000001"]}):
            self.assertEqual(self.cli("add", row={**row, **extra}).returncode, 2)
        self.assertEqual(self.cli("check").returncode, 0)

    def test_updates_keep_conflicts_and_denominators(self):
        key = self.add(item(ENTRY))
        change = {"id": key, "by": "fixture", "evidence": [{"run": "SILENT000001", "floor": 4, "role": "contradict"}],
                  "first_run": "SILENT000001", "asc": 10}
        self.assertEqual(self.cli("update", row=change).returncode, 2)
        self.assertEqual(self.cli("update", row={**change, "evidence_status": "aligned"}).returncode, 2)
        self.assertEqual(self.cli("update", row={**change, "evidence_status": "conflict", "confidence": .8}).returncode, 2)
        self.assertEqual(self.cli("update", row={**change, "evidence_status": "conflict"}).returncode, 0)
        shown = json.loads(self.cli("show", key).stdout)
        self.assertEqual(shown["evidence_status"], "conflict")
        self.assertEqual(len(shown["evidence"]), 2)
        self.assertEqual(shown["evidence_summary"]["own_runs"], 1)
        self.assertEqual(shown["evidence_summary"]["own_support_runs"], 0)
        self.assertEqual(self.cli("update", row={"id": key, "by": "fixture", "evidence_status": "aligned"}).returncode, 2)
        self.assertEqual(self.cli("check").returncode, 0)


if __name__ == "__main__":
    unittest.main()
