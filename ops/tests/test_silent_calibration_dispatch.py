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

    def test_periodic_refresh_only_after_threshold_and_then_deduplicates(self):
        live = Path(self.root, ".worktrees/live/knowledge/characters/silent")
        live.mkdir(parents=True)
        (live / "boss-trust.json").write_text(json.dumps({"character": "silent", "refresh": {"keys": [], "max_asc": 9}}))
        logs = Path(self.root, "logs")
        logs.mkdir()
        (logs / "runs.jsonl").write_text(json.dumps({"run_id": "s", "character": "SILENT", "ended": "date", "ascension": 9}) + "\n")
        events = [{"run_id": "s", "floor": n, "attempt": 1, "ended_at": str(n), "fight_kind": "boss", "result": "won"} for n in range(20)]
        scripts = str(Path(__file__).parents[1])
        (logs / "sl-attempts.jsonl").write_text("\n".join(json.dumps(r) for r in events[:19]))
        with patch.object(jobs, "start_learner") as start:
            self.assertIsNone(jobs.calibration_job(self.state, self.root, scripts, "silent", lambda pid: True, "nineteen"))
            self.assertIsNone(jobs.calibration_job(self.state, self.root, scripts, "ironclad", lambda pid: True, "iron"))
            start.assert_not_called()
        (logs / "sl-attempts.jsonl").write_text("\n".join(json.dumps(r) for r in events))
        with patch.object(jobs, "available_worktree", return_value=True), patch.object(jobs, "start_learner", return_value=(20, None)) as start:
            self.assertEqual(jobs.calibration_job(self.state, self.root, scripts, "silent", lambda pid: True, "twenty"), ("twenty-fix-batch", 20))
            self.assertIsNone(jobs.calibration_job(self.state, self.root, scripts, "silent", lambda pid: True, "repeat"))
            start.assert_called_once()
            batch = self.state["batches"]["twenty-fix-batch"]
            self.assertEqual(batch["reason"], "calibration-refresh")
            self.assertEqual(batch["learner_task"], "silent-boss-calibration")

    def test_periodic_refresh_starts_on_ascension_without_20_bosses(self):
        live = Path(self.root, ".worktrees/live/knowledge/characters/silent")
        live.mkdir(parents=True)
        (live / "boss-trust.json").write_text(json.dumps({"character": "silent", "refresh": {"keys": [], "max_asc": 9}}))
        logs = Path(self.root, "logs")
        logs.mkdir()
        (logs / "runs.jsonl").write_text(json.dumps({"run_id": "s", "character": "SILENT", "ended": "date", "ascension": 10}) + "\n")
        (logs / "sl-attempts.jsonl").write_text("")
        with patch.object(jobs, "available_worktree", return_value=True), patch.object(jobs, "start_learner", return_value=(20, None)):
            self.assertEqual(jobs.calibration_job(self.state, self.root, str(Path(__file__).parents[1]), "silent", lambda pid: True, "asc"), ("asc-fix-batch", 20))


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


class A10RegressionDispatch(CodexOnlyDispatch):
    task = "silent-a10-regression"
    request_file = "notes/silent-a10-regression-dispatch.json"

    def test_highest_priority_request_precedes_other_pending_features(self):
        task = "silent-double-boss"
        Path(self.root, jobs.FEATURE_REQUESTS[task]).write_text(json.dumps({
            **self.request, "task": task, "request_id": "older-double-boss-request"}))
        with patch.object(jobs, "available_worktree", return_value=True), patch.object(jobs, "start_learner", return_value=(20, None)) as start:
            self.assertEqual(self.launch(), ("first-fix-batch", 20))
            self.assertEqual(start.call_args.args[0][-1], self.task)
            self.assertIsNone(self.launch(stamp="duplicate"))
            start.assert_called_once()


class NewFeatureDispatch(unittest.TestCase):
    def test_a_first_then_independent_b4_beside_normal_fixes(self):
        with tempfile.TemporaryDirectory() as root:
            Path(root, "notes").mkdir()
            state = {"batches": {"normal": {"task": "fix-batch", "state": "running", "pid": 10}}}
            for task in ("boss-sim-automation", "silent-double-boss"):
                Path(root, jobs.FEATURE_REQUESTS[task]).write_text(json.dumps({
                    "state": "pending", "task": task, "character": "silent", "authorized_by": "Roy", "request_id": task}))
            with patch.object(jobs, "available_worktree", return_value=True), patch.object(jobs, "start_learner", return_value=(20, None)) as start:
                def dispatch(stamp):
                    return jobs.dispatch_write(state, root, "/scripts", "fix-batch", "silent", [], "ordinary", "ops", lambda pid: True, stamp)
                self.assertEqual(dispatch("a"), ("a-fix-batch", 20))
                self.assertEqual(start.call_args.args[0][-1], "silent-double-boss")
                self.assertIsNone(dispatch("duplicate"))
                request = Path(root, jobs.FEATURE_REQUESTS["silent-double-boss"])
                value = json.loads(request.read_text()); value["state"] = "dispatched"; request.write_text(json.dumps(value))
                self.assertEqual(dispatch("b"), ("b-fix-batch", 20))
                self.assertEqual(start.call_args.args[0][-3:], ["fix-batch", str(Path(root, ".worktrees/boss-sim-automation")), "boss-sim-automation"])
                self.assertEqual(state["batches"]["normal"]["pid"], 10)
                self.assertEqual(start.call_count, 2)
                del state["batches"]["normal"]
                self.assertFalse(jobs.busy(state, "fix-batch", lambda pid: True))

    def test_new_requests_refuse_dirty_tree_or_mismatched_scope(self):
        for task in ("silent-double-boss", "boss-sim-automation"):
            with self.subTest(task=task), tempfile.TemporaryDirectory() as root:
                Path(root, "notes").mkdir(); path = Path(root, jobs.FEATURE_REQUESTS[task])
                value = {"state": "pending", "task": task, "character": "silent", "authorized_by": "Roy", "request_id": task}
                path.write_text(json.dumps(value)); state = {"batches": {}}
                with patch.object(jobs, "available_worktree", return_value=False), patch.object(jobs, "start_learner") as start:
                    self.assertEqual(jobs.requested_feature(state, root, "/scripts", "silent", "ops", lambda pid: True, "dirty"), (True, None))
                    start.assert_not_called()
                for field, bad in (("task", "../../escape"), ("character", "ironclad"), ("authorized_by", "unknown"), ("request_id", "bad;command")):
                    path.write_text(json.dumps({**value, field: bad}))
                    with patch.object(jobs, "start_learner") as start:
                        self.assertEqual(jobs.requested_feature(state, root, "/scripts", "silent", "ops", lambda pid: True, "bad"), (False, None))
                        start.assert_not_called()


if __name__ == "__main__":
    unittest.main()
