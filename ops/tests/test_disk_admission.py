"""Approved boundary values and a fixed terminal shell loop; no live model/game."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ops"))
import disk_admission as disk


class Admission(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "ops").mkdir()
        shutil.copy2(ROOT / "ops/disk-policy.json", self.root / "ops/disk-policy.json")
        self.directory = self.root / "ops/codex-ops"

    def sample(self, at, free):
        return disk.snapshot(self.root, self.directory, record=True, now=at, available=free * disk.GiB)

    def test_100_and_60_are_inclusive_holds_without_reducing_current_turn(self):
        for value, jobs, next_run in [(101, True, True), (100, False, True), (61, False, True), (60, False, False), (59, False, False)]:
            with self.subTest(value=value):
                result = disk.evaluate(value * disk.GiB, [])
                self.assertEqual(result["new_jobs_allowed"], jobs)
                self.assertEqual(result["new_channel_allowed"], jobs)
                self.assertEqual(result["next_run_allowed"], next_run)
                self.assertNotIn("current_turn_budget", result)

    def test_regent_requires_both_200_and_48_hours_with_a_measured_rate(self):
        samples = [{"at": 0, "available_bytes": 210 * disk.GiB}, {"at": 3600, "available_bytes": 205 * disk.GiB}]
        self.assertFalse(disk.evaluate(200 * disk.GiB, samples)["regent_resume_allowed"])
        self.assertTrue(disk.evaluate(240 * disk.GiB, samples)["regent_resume_allowed"])
        self.assertFalse(disk.evaluate(199 * disk.GiB, [{"at": 0, "available_bytes": 201 * disk.GiB}, {"at": 3600, "available_bytes": 200 * disk.GiB}])["regent_resume_allowed"])
        self.assertFalse(disk.evaluate(300 * disk.GiB, [samples[0]])["regent_resume_allowed"])
        self.assertTrue(disk.evaluate(200 * disk.GiB, [{"at": 0, "available_bytes": 210 * disk.GiB}, {"at": 3600, "available_bytes": 210 * disk.GiB}])["regent_resume_allowed"])

    def test_reclamation_does_not_erase_consumption_and_unknown_does_not_pass(self):
        samples = [{"at": 0, "available_bytes": 300 * disk.GiB}, {"at": 3600, "available_bytes": 290 * disk.GiB}, {"at": 7200, "available_bytes": 400 * disk.GiB}]
        self.assertEqual(disk.rate(samples), 5 * disk.GiB)
        self.assertFalse(disk.evaluate(200 * disk.GiB, samples)["regent_resume_allowed"])
        self.assertIsNone(disk.rate([]))

    def test_original_tick_samples_are_small_and_only_bad_transition_needs_attention(self):
        healthy = self.sample(1000, 124)
        first = self.sample(2800, 100)
        repeated = self.sample(4600, 99)
        critical = self.sample(6400, 60)
        self.assertFalse(healthy["attention_transition"])
        self.assertTrue(first["attention_transition"])
        self.assertFalse(repeated["attention_transition"])
        self.assertTrue(critical["attention_transition"])
        self.assertEqual(len(critical["samples"]), 4)
        self.assertEqual(len((self.directory / "disk-capacity/measurements.jsonl").read_text().splitlines()), 4)
        self.assertFalse((self.root / "ops/STOP").exists())
        self.assertFalse((self.directory / "queue").exists())

    def test_clock_or_corrupt_state_failure_keeps_original(self):
        self.sample(1000, 124)
        path = self.directory / "disk-capacity/current.json"
        before = path.read_bytes()
        with self.assertRaises(ValueError):
            self.sample(999, 120)
        with self.assertRaises(ValueError):
            disk.snapshot(self.root, self.directory, now=999, available=120 * disk.GiB)
        self.assertEqual(path.read_bytes(), before)
        with self.assertRaises(ValueError):
            disk.snapshot(self.root, self.directory, record=True, now=2000, available=-1)
        self.assertEqual(path.read_bytes(), before)

    def test_regent_binding_wins_over_an_inherited_silent_environment(self):
        (self.root / "ops/regent-lane.json").write_text('{}')
        with patch.dict(os.environ, {"CHARACTER": "SILENT"}):
            self.assertEqual(disk.character(self.root), "regent")

    def test_existing_tick_keeps_victory_and_completion_paths_but_starts_no_jobs(self):
        spec = importlib.util.spec_from_file_location("fixed_capacity_tick", ROOT / "ops/codex-ops-learn.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        state = {"batches": {}, "runs": {}, "ascension": {}}
        events = []
        with patch.object(module, "ROOT", str(self.root)), patch.object(module, "DIR", str(self.directory)), \
             patch.object(module, "load_state", return_value=state), patch.object(module, "save_state"), \
             patch.object(module, "check_victories", return_value=["fixed-victory"]), \
             patch.object(module, "check_ascension", return_value=["fixed-ascension"]), \
             patch.object(module, "check_pending", return_value=None), \
             patch.object(module.learner_retention, "kick", return_value={"fixed_retention": True}), \
             patch.object(module, "enqueue", side_effect=lambda k, v: events.append(k)), \
             patch.object(disk.shutil, "disk_usage", return_value=SimpleNamespace(free=90 * disk.GiB)), \
             patch.object(module, "start_learner", side_effect=AssertionError("no model may start")):
            with contextlib.redirect_stdout(io.StringIO()) as stdout:
                module.cmd_tick(SimpleNamespace(character="silent"))
                module.cmd_tick(SimpleNamespace(character="silent"))
        rows = [json.loads(line) for line in stdout.getvalue().splitlines()]
        self.assertEqual(rows[0]["victory"], ["fixed-victory"])
        self.assertEqual(rows[0]["ascension"], ["fixed-ascension"])
        self.assertIsNone(rows[0]["dispatched"])
        self.assertTrue(rows[0]["write_jobs"]["disk_capacity_hold"])
        self.assertEqual(events, ["disk-capacity"])

    def test_terminal_loop_reports_then_holds_exactly_the_next_run(self):
        ops = self.root / "ops"
        (self.root / "logs/console").mkdir(parents=True)
        for name in ("autoplay.sh", "paths.sh"):
            shutil.copy2(ROOT / "ops" / name, ops / name)
        run_id = "SILENT000001"
        (self.root / "logs/decisions.jsonl").write_text(json.dumps({"fingerprint": json.dumps({"run": run_id})}) + "\n")
        (self.root / "logs/console/fixed.log").write_text("stopped: run 1 ended (death)\n")
        (ops / "run.sh").write_text('#!/bin/bash\necho started >> "$(dirname "$0")/started"\n')
        (ops / "run.sh").chmod(0o755)
        (ops / "report.py").write_text("from pathlib import Path\nimport json\nr=Path(__file__).parent.parent\n(r/'logs/runs.jsonl').write_text(json.dumps({'run_id':'SILENT000001'})+'\\n')\n(r/'reported').write_text('fixed')\n")
        (ops / "disk_admission.py").write_text("from pathlib import Path\nimport sys\nr=Path(__file__).parent.parent\nassert (r/'reported').exists(), 'capacity must follow reporting'\n(r/'gate').write_text('fixed 60GiB hold')\nsys.exit(75)\n")
        result = subprocess.run(["bash", str(ops / "autoplay.sh")], capture_output=True, text=True,
                                env={"PATH": "/usr/bin:/bin", "HOME": str(self.root)}, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((ops / "started").read_text().splitlines(), ["started"])
        self.assertTrue((self.root / "gate").exists())
        self.assertIn("natural terminal boundary", (ops / "autoplay.log").read_text())
        self.assertFalse((ops / "STOP").exists())


if __name__ == "__main__":
    unittest.main()
