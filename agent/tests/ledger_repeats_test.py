"""Late post-mortems: XYYQYBRM2A01 F33 T3, silent-0052. Fixed timestamps and isolated files only."""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def write_rows(path, rows):
    path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf8")


class RepeatTimingTest(unittest.TestCase):
    def test_late_postmortem_uses_run_time_in_ledger_cli_and_curve(self):
        with tempfile.TemporaryDirectory() as directory:
            d = Path(directory)
            logs = d / "logs"
            logs.mkdir()
            old, during, later, restart = "XYYQYBRM2A01", "SILENT000002", "SILENT000003", "SILENT000004"
            write_rows(logs / "runs.jsonl", [
                {"run_id": old, "character": "SILENT", "ascension": 1, "floor": 33, "ended": "2026-10-04T21:05:41.432Z"},
                {"run_id": during, "character": "SILENT", "ascension": 1, "floor": 33, "ended": "2026-10-04T21:30:00Z"},
                {"run_id": later, "character": "SILENT", "ascension": 1, "floor": 33, "ended": "2026-10-04T22:00:00Z"},
                {"run_id": restart, "character": "SILENT", "ascension": 1, "floor": 33, "ended": "2026-10-04T22:05:00Z"},
            ])
            write_rows(logs / "run-config.jsonl", [
                {"run_id": old, "ts": "2026-10-04T20:17:30.702Z"},
                {"run_id": during, "ts": "2026-10-04T21:10:00Z"},
                # A run that was already underway cannot use the next-run release, even if it ends after shipping.
                {"run_id": later, "ts": "2026-10-04T21:22:46Z"},
                # Reversed log order: the earliest config is still the run's start, not its later restart.
                {"run_id": restart, "ts": "2026-10-04T22:00:00Z"},
                {"run_id": restart, "ts": "2026-10-04T21:20:00Z"},
            ])
            ledger = d / "ledger.jsonl"
            archived = [
                {"op": "add", "id": "silent-0008", "ts": "2026-10-04T20:00:00Z", "by": "learner", "character": "silent",
                 "asc": 1, "kind": "bug-infra", "claim": "test", "status": "observed", "where": {}, "evidence": [{"run": old}]},
                {"op": "update", "id": "silent-0008", "ts": "2026-10-05T05:22:46+08:00", "by": "ops", "status": "shipped", "version": "S1.fix3"},
                {"op": "update", "id": "silent-0008", "ts": "2026-10-05T05:34:03+08:00", "by": "learner",
                 "evidence": [{"run": run, "floor": 33, "turn": 3, "role": "repeat"} for run in [old, during, later, restart]]},
            ]
            write_rows(ledger, archived)
            before = ledger.read_bytes()
            env = {**os.environ, "LEDGER_FILE": str(ledger), "LEDGER_RUNS": str(logs / "runs.jsonl"), "PYTHONDONTWRITEBYTECODE": "1"}
            result = subprocess.run([sys.executable, str(ROOT / "learner/ledger.py"), "find"], env=env, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("repeats=4 (after shipping 1)", result.stdout)
            mod = load("repeat_ledger", ROOT / "learner/ledger.py")
            item = mod.fold(mod.read_rows(str(ledger)))["silent-0008"]
            curve = load("repeat_curve", ROOT / "eval/learning-curve.py")
            rows = curve.curve("silent", str(logs), [item])
            self.assertEqual((rows[0]["repeats"], rows[0]["repeats_after_ship"]), (4, 1))
            self.assertEqual(len(mod.repeats(item)), 4)
            self.assertEqual(item["evidence"][-1]["added"], archived[-1]["ts"])
            self.assertEqual(ledger.read_bytes(), before)

    def test_unknown_times_and_other_character_do_not_supply_post_release_evidence(self):
        mod = load("repeat_unknown", ROOT / "learner/ledger.py")
        item = {"shipped_at": "2026-10-05T05:22:46+08:00", "evidence": [
            {"run": "SILENT000001", "role": "repeat", "added": "2026-10-05T06:00:00+08:00"},
            {"run": "SILENT000002", "role": "repeat", "added": "2026-10-05T06:00:00+08:00"},
        ]}
        starts = mod.run_starts([
            {"run_id": "IRON00000001", "character": "IRONCLAD", "ended": "2026-10-04T22:00:00Z"},
            {"run_id": "SILENT000001", "character": "SILENT", "ended": "2026-10-04T23:00:00Z"},
            {"run_id": "SILENT000002", "character": "SILENT", "ended": "2026-10-04T23:30:00Z"},
        ], [{"run_id": "SILENT000001", "ts": "invalid"}])
        self.assertNotIn("SILENT000001", starts)
        self.assertEqual([e["run"] for e in mod.repeats(item, after_ship=True, starts=starts)], ["SILENT000002"])
        self.assertEqual(mod.repeats(item, after_ship=True, starts={}), [])
        self.assertFalse(mod.evidence_after_ship({"shipped_at": "invalid"}, item["evidence"][1], starts))


if __name__ == "__main__":
    unittest.main()
