"""HMVJKM56S4Q8 A9 F33 T2, silent-0009: a later release must not erase earlier post-release repeats."""
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


class RereleaseRepeatTimingTest(unittest.TestCase):
    def test_releases_preserve_prior_repeats_in_ledger_cli_and_curve(self):
        with tempfile.TemporaryDirectory() as directory:
            d = Path(directory)
            logs = d / "logs"
            logs.mkdir()
            before, during, between, after, unknown = (
                "SILENT000001", "SILENT000002", "HMVJKM56S4Q8", "SILENT000004", "SILENT000005",
            )
            run_times = [
                (unknown, None, None),
                (before, "2026-10-06T01:00:00+08:00", "2026-10-06T01:04:00+08:00"),
                (during, "2026-10-06T01:05:00+08:00", "2026-10-06T01:25:00+08:00"),
                (between, "2026-10-06T02:45:41.432+08:00", "2026-10-06T03:20:10.364+08:00"),
                (after, "2026-10-06T05:10:00+08:00", "2026-10-06T05:30:00+08:00"),
            ]
            write_rows(logs / "runs.jsonl", [
                {"run_id": run, "character": "SILENT", "ascension": 9, "floor": 33, "ended": ended}
                for run, _, ended in run_times
            ])
            write_rows(logs / "run-config.jsonl", [
                {"run_id": run, "ts": started} for run, started, _ in run_times if started
            ] + [
                # A later process restart cannot move a run past the second release.
                {"run_id": between, "ts": "2026-10-06T05:00:00+08:00"},
            ])
            ledger = d / "ledger.jsonl"
            archived = [
                {"op": "add", "id": "silent-0009", "ts": "2026-10-06T00:03:15+08:00", "by": "learner",
                 "character": "silent", "asc": 0, "kind": "fight", "claim": "fixed fixture", "prior": "unknown",
                 "first_run": before, "status": "observed", "where": {}, "evidence": [{"run": before}]},
                {"op": "update", "id": "silent-0009", "ts": "2026-10-06T00:17:50+08:00", "by": "learner",
                 "status": "proposed"},
                {"op": "update", "id": "silent-0009", "ts": "2026-10-06T01:13:01+08:00", "by": "ops",
                 "status": "shipped", "version": "S1.exp26"},
                {"op": "update", "id": "silent-0009", "ts": "2026-10-06T04:01:19+08:00", "by": "learner",
                 "evidence": [{"run": run, "floor": 33, "turn": 2, "role": "repeat"}
                              for run in (before, during, between, unknown)]},
                {"op": "update", "id": "silent-0009", "ts": "2026-10-06T04:18:55+08:00", "by": "learner",
                 "status": "proposed"},
                {"op": "update", "id": "silent-0009", "ts": "2026-10-06T04:35:35+08:00", "by": "ops",
                 "status": "shipped", "version": "S1.exp31"},
                {"op": "update", "id": "silent-0009", "ts": "2026-10-06T05:40:00+08:00", "by": "learner",
                 "evidence": [{"run": after, "floor": 33, "turn": 2, "role": "repeat"}]},
            ]
            write_rows(ledger, archived)
            before_bytes = ledger.read_bytes()
            mod = load("rerelease_ledger", ROOT / "learner/ledger.py")
            first_item = mod.fold(list(enumerate(archived[:4], 1)))["silent-0009"]
            item = mod.fold(mod.read_rows(str(ledger)))["silent-0009"]
            starts = mod.run_starts(
                [row for _, row in mod.read_rows(str(logs / "runs.jsonl"))],
                [row for _, row in mod.read_rows(str(logs / "run-config.jsonl"))],
            )
            expected = [between, after]
            self.assertEqual([e["run"] for e in mod.repeats(first_item, after_ship=True, starts=starts)], [between])
            self.assertEqual([e["run"] for e in mod.repeats(item, after_ship=True, starts=starts)], expected)
            self.assertEqual(item["shipped_at"], archived[-2]["ts"])
            self.assertEqual(item["version"], "S1.exp31")
            self.assertEqual(len(item["history"]), len(archived))
            self.assertEqual(item["evidence"][3]["added"], archived[3]["ts"])
            self.assertEqual(item["evidence"][-1]["added"], archived[-1]["ts"])
            env = {**os.environ, "LEDGER_FILE": str(ledger), "LEDGER_RUNS": str(logs / "runs.jsonl"),
                   "PYTHONDONTWRITEBYTECODE": "1"}
            result = subprocess.run([sys.executable, "-B", str(ROOT / "learner/ledger.py"), "find"],
                                    env=env, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("repeats=5 (after shipping 2)", result.stdout)
            curve = load("rerelease_curve", ROOT / "eval/learning-curve.py")
            rows = curve.curve("silent", str(logs), [item])
            self.assertEqual((rows[0]["repeats"], rows[0]["repeats_after_ship"]), (5, 2))
            self.assertEqual(ledger.read_bytes(), before_bytes)

    def test_only_valid_shipped_history_counts_and_boundary_is_inclusive(self):
        mod = load("rerelease_boundaries", ROOT / "learner/ledger.py")
        evidence = {"run": "HMVJKM56S4Q8", "role": "repeat"}
        started = mod.when("2026-10-06T01:13:01+08:00")
        starts = {evidence["run"]: started}
        item = {"shipped_at": "2026-10-06T04:35:35+08:00", "history": [
            {"status": "observed", "ts": "2026-10-06T00:03:15+08:00"},
            {"status": "proposed", "ts": "2026-10-06T00:17:50+08:00"},
            {"status": "shipped", "ts": "invalid"},
        ]}
        self.assertFalse(mod.evidence_after_ship(item, evidence, starts))
        item["history"].append({"status": "shipped", "ts": "2026-10-05T17:13:01Z"})
        self.assertTrue(mod.evidence_after_ship(item, evidence, starts))
        self.assertFalse(mod.evidence_after_ship(item, evidence, {}))
        self.assertFalse(mod.evidence_after_ship(item, evidence, {evidence["run"]: started - mod.dt.timedelta(seconds=1)}))
        self.assertTrue(mod.evidence_after_ship({"shipped_at": "2026-10-05T17:13:01Z"}, evidence, starts))


if __name__ == "__main__":
    unittest.main()
