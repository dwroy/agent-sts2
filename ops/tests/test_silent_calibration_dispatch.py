"""Fixed dispatch fixtures; no engines, Git mutations or network calls."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("jobs", Path(__file__).parents[1] / "learner_jobs.py")
jobs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(jobs)


class CalibrationDispatch(unittest.TestCase):
    task = "silent-boss-calibration"
    request_file = jobs.FEATURE_REQUEST
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = self.temp.name
        self.request = {"state": "pending", "task": self.task, "character": "silent",
                        "authorized_by": "Roy", "request_id": "fixed-roy-request"}
        path = Path(self.root, self.request_file)
        path.parent.mkdir()
        path.write_text(json.dumps(self.request))
        self.state = {"batches": {"old-fix": {"task": "fix-batch", "state": "running", "pid": 10,
                          "worktree": str(Path(self.root, ".worktrees/codex-dev"))}}}

    def launch(self, character="silent", reason="ops", stamp="first"):
        return jobs.dispatch_write(self.state, self.root, "/scripts", "fix-batch", character, [],
                                   "ordinary-key", reason, lambda pid: True, stamp)

    def test_dedicated_prompt_and_tree_beside_busy_bug_batch(self):
        with patch.object(jobs, "available_worktree", return_value=True), patch.object(jobs, "start_learner", return_value=(20, "pane")) as start:
            self.assertEqual(self.launch(), ("first-fix-batch", 20))
            argv = start.call_args.args[0]
            self.assertEqual(argv[-3:], ["fix-batch", str(Path(self.root, ".worktrees", self.task)), self.task])
            batch = self.state["batches"]["first-fix-batch"]
            self.assertEqual(batch["learner_task"], self.task)
            self.assertEqual(batch["feature_request"], "fixed-roy-request")
            self.assertEqual(batch["pane"], "pane")
            self.assertIsNone(self.launch(stamp="second"))
            start.assert_called_once()

    def test_feature_does_not_own_normal_bug_or_strategy_tree(self):
        with patch.object(jobs, "available_worktree", return_value=True), patch.object(jobs, "start_learner", return_value=(20, None)):
            self.launch()
        del self.state["batches"]["old-fix"]
        self.assertFalse(jobs.busy(self.state, "fix-batch", lambda pid: True))
        self.assertFalse(jobs.busy(self.state, "strategy-proposal", lambda pid: True))

    def test_dirty_or_other_writer_feature_tree_refuses_without_fallback(self):
        with patch.object(jobs, "available_worktree", return_value=False), patch.object(jobs, "start_learner") as start:
            self.assertIsNone(self.launch())
            start.assert_not_called()
        self.state["batches"]["other"] = {"task": "fix-batch", "state": "running", "pid": 30,
                       "worktree": str(Path(self.root, ".worktrees", self.task))}
        with patch.object(jobs, "available_worktree", return_value=True), patch.object(jobs, "start_learner") as start:
            self.assertIsNone(self.launch())
            start.assert_not_called()

    def test_ironclad_and_ticks_cannot_dispatch_roy_silent_feature(self):
        with patch.object(jobs, "available_worktree") as available, patch.object(jobs, "start_learner") as start:
            self.assertIsNone(self.launch(character="ironclad"))
            self.assertIsNone(self.launch(reason="tick"))
            available.assert_not_called()
            start.assert_not_called()

    def test_completed_and_backoff_and_maximum_attempts_refuse(self):
        prior = {"feature_request": "fixed-roy-request", "task": "fix-batch", "learner_task": self.task,
                 "state": "done", "pid": 20}
        self.state["batches"]["prior"] = prior
        with patch.object(jobs, "start_learner") as start:
            self.assertIsNone(self.launch())
            prior.update(state="failed", retry_at=jobs.time.time() + 3600)
            self.assertIsNone(self.launch())
            prior["retry_at"] = 0
            self.state["batches"].update(prior2=dict(prior), prior3=dict(prior))
            self.assertIsNone(self.launch())
            start.assert_not_called()

    def test_request_cannot_choose_another_template_or_character(self):
        path = Path(self.root, self.request_file)
        for field, value in (("task", "../../other"), ("character", "ironclad"), ("authorized_by", "unknown"), ("request_id", "bad;command")):
            path.write_text(json.dumps({**self.request, field: value}))
            with patch.object(jobs, "start_learner") as start:
                self.assertIsNone(self.launch())
                start.assert_not_called()


class CodexOnlyDispatch(CalibrationDispatch):
    task = "codex-only-brain"
    request_file = jobs.FEATURE_REQUESTS[task]

    def test_independent_of_running_calibration_and_normal_fixes(self):
        self.state["batches"]["boss"] = {
            "task": "fix-batch", "learner_task": "silent-boss-calibration",
            "feature_request": "boss-request", "state": "running", "pid": 30,
            "worktree": str(Path(self.root, ".worktrees/silent-boss-calibration"))}
        with patch.object(jobs, "available_worktree", return_value=True), patch.object(jobs, "start_learner", return_value=(20, None)):
            self.assertEqual(self.launch(), ("first-fix-batch", 20))
        self.assertEqual(self.state["batches"]["boss"]["pid"], 30)
        self.assertEqual(self.state["batches"]["old-fix"]["pid"], 10)

    def test_mismatched_whitelisted_template_does_not_use_another_tree(self):
        Path(self.root, self.request_file).write_text(json.dumps({**self.request, "task": "silent-boss-calibration"}))
        with patch.object(jobs, "start_learner") as start:
            self.assertIsNone(self.launch())
            start.assert_not_called()


if __name__ == "__main__":
    unittest.main()
