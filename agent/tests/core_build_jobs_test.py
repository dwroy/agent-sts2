import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

OPS = Path(__file__).resolve().parents[2] / "ops"
sys.path.insert(0, str(OPS))
import core_build_jobs as core
import learner_jobs as jobs


class CoreJobs(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / ".git").mkdir()
        (self.root / "logs").mkdir()
        (self.root / "notes").mkdir()
        self.state_dir = self.root / "ops/codex-ops"
        self.parent = {"request_id": core.REQUEST, "task": core.TASK, "state": "pending",
                       "authorized_by": "Roy", "character": "silent", "old_failure": "preserve"}
        core.atomic_json(self.root / core.REQUEST_FILE, self.parent)
        rows = [{"run_id": f"SILENT{i:06}", "character": "SILENT", "ended": f"2026-10-09T01:{i:02}:00Z",
                 "ascension": 10, "floor": 17, "victory": False} for i in range(25)]
        rows += [{"run_id": "IRON00000001", "character": "IRONCLAD", "ended": "2026-10-09T01:00:00Z"}]
        (self.root / "logs/runs.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows))
        (self.root / "logs/states.jsonl").write_text('{}\n{"partial":')
        self.batch_id = "20261009-210000-fix-batch"

    def report(self):
        evidence = core.freeze(self.root, self.state_dir, self.batch_id, core.REQUEST)
        manifest = json.loads(Path(evidence).read_text())
        tree = self.root / ".worktrees" / core.TASK
        path = tree / "learner/runs/fixed/report.md"
        path.parent.mkdir(parents=True)
        path.write_text("Fixed evidence-limited historical report.\n" * 8)
        batch = {"task": "fix-batch", "learner_task": core.TASK, "feature_request": core.REQUEST,
                 "state": "running", "worktree": str(tree), "core_evidence": evidence,
                 "core_evidence_sha256": core.digest(evidence)}
        report = {"task": core.TASK, "batch": self.batch_id, "request_id": core.REQUEST,
                  "character": "silent", "complete": True, "status": "insufficient_evidence",
                  "input_sha256": core.digest(evidence), "covered_runs": [r["run_id"] for r in manifest["runs"]],
                  "candidate_builds": [], "coverage": {k: True for k in core.SECTIONS},
                  "limitations": ["No claimed universal combination."], "report": str(path)}
        return report, batch

    def test_full_history_freeze_excludes_other_character_and_partial_line(self):
        report, batch = self.report()
        manifest = json.loads(Path(batch["core_evidence"]).read_text())
        self.assertEqual(len(manifest["runs"]), 25)
        self.assertEqual(manifest["log_byte_limits"]["states.jsonl"], 3)
        self.assertEqual(core.validate(report, batch, self.root)["status"], "insufficient_evidence")
        with self.assertRaises(ValueError):
            core.freeze(self.root, self.state_dir, self.batch_id, core.REQUEST)

    def test_report_identity_scope_and_path_are_required(self):
        report, batch = self.report()
        for field, value in [("character", "ironclad"), ("batch", "other"), ("complete", False),
                             ("input_sha256", "0" * 64), ("covered_runs", report["covered_runs"][:10]),
                             ("report", str(self.root / "outside.md")), ("limitations", []), ("coverage", [])]:
            bad = dict(report, **{field: value})
            with self.subTest(field=field), self.assertRaises(ValueError):
                core.validate(bad, batch, self.root)

    def test_finish_without_merge_and_notification_dedup(self):
        report, batch = self.report()
        events = []
        with patch("learner_checks.read_report", return_value=report):
            core.finish(self.batch_id, batch, 0, self.root, self.state_dir, lambda k, t: events.append(k))
        self.assertEqual(batch["state"], "done")
        self.assertEqual(events, ["core-builds-done"])
        calls = []
        def notify(argv, **kwargs):
            calls.append(argv)
            return subprocess.CompletedProcess(argv, 0)
        first = core.notify(self.batch_id, batch, self.root, self.state_dir, run=notify)
        second = core.notify(self.batch_id, batch, self.root, self.state_dir, run=notify)
        self.assertEqual(first, second)
        self.assertEqual(first["state"], "sent")
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0][:3], ["herdr", "notification", "show"])
        self.assertEqual(json.loads((self.root / core.REQUEST_FILE).read_text())["old_failure"], "preserve")
        Path(report["report"]).write_text("Changed after acceptance.\n" * 8)
        with self.assertRaises(ValueError):
            core.notify(self.batch_id, batch, self.root, self.state_dir, run=notify)

    def test_invalid_report_keeps_failure_and_never_notifies(self):
        report, batch = self.report()
        report["covered_runs"] = []
        events = []
        with patch("learner_checks.read_report", return_value=report):
            core.finish(self.batch_id, batch, 0, self.root, self.state_dir, lambda k, t: events.append(k))
        self.assertEqual(batch["state"], "failed")
        self.assertEqual(events, ["core-builds-failed"])
        with self.assertRaises(ValueError):
            core.notify(self.batch_id, batch, self.root, self.state_dir)

    def test_dirty_legacy_tree_does_not_block_separate_writers(self):
        legacy = self.root / ".worktrees/codex-dev"
        legacy.mkdir(parents=True)
        (legacy / "candidate.patch").write_text("Keep the failed candidate byte-for-byte.")
        old = {"task": "strategy-proposal", "state": "failed", "worktree": str(legacy), "rc": 124}
        state = {"batches": {"old": old}}
        before = copy.deepcopy(old)
        with patch.object(jobs, "start_learner", return_value=(123, None)):
            fix = jobs.dispatch_write(state, str(self.root), str(OPS), "fix-batch", "silent", [], "fix", "tick", lambda p: True, "20261009-210000")
            strategy = jobs.dispatch_write(state, str(self.root), str(OPS), "strategy-proposal", "silent", [], "strategy", "proposal", lambda p: True, "20261009-210000")
        self.assertIsNotNone(fix)
        self.assertIsNotNone(strategy)
        self.assertNotEqual(state["batches"][fix[0]]["worktree"], state["batches"][strategy[0]]["worktree"])
        self.assertEqual(old, before)
        self.assertEqual((legacy / "candidate.patch").read_text(), "Keep the failed candidate byte-for-byte.")

    def test_core_registration_does_not_use_dirty_codex_dev_or_cap_ten_runs(self):
        state = {"batches": {}}
        with patch.object(jobs, "start_learner", return_value=(123, None)):
            handled, first = jobs.requested_feature(state, str(self.root), str(OPS), "silent", "core-builds", lambda p: True,
                                                   "20261009-210000", request=self.parent)
            _, second = jobs.requested_feature(state, str(self.root), str(OPS), "silent", "core-builds", lambda p: True,
                                               "20261009-210001", request=self.parent)
        self.assertTrue(handled)
        self.assertIsNotNone(first)
        self.assertIsNone(second)
        batch = state["batches"][first[0]]
        self.assertEqual(len(json.loads(Path(batch["core_evidence"]).read_text())["runs"]), 25)
        self.assertTrue(batch["worktree"].endswith(core.TASK))

    def test_status_does_not_mark_host_jobs_lost_or_save_state(self):
        spec = importlib.util.spec_from_file_location("status_readonly", OPS / "codex-ops-learn.py")
        learn = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(learn)
        state = {"batches": {"running": {"state": "running", "pid": 999, "runs": ["SILENT000001"]}}, "ascension": {}}
        before = copy.deepcopy(state)
        with patch.object(learn, "load_state", return_value=state), patch.object(learn, "save_state") as save, \
             patch.object(learn, "alive", return_value=False), patch.object(learn, "postmortem_ids", return_value=set()), \
             patch.object(learn, "finished_runs", return_value=[]):
            learn.cmd_status(SimpleNamespace(character="silent"))
        save.assert_not_called()
        self.assertEqual(state, before)


if __name__ == "__main__":
    unittest.main()
