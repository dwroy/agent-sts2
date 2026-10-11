"""Fixed priority and registration fixtures; no production dispatch or models."""
import copy
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
IDENT = "roy-20261010-silent-deck-size-value"
STAMP = "20260101-000001"
RUNS = ["SILENT000001", "SILENT000002"]
spec = importlib.util.spec_from_file_location("scheduling_learner_jobs", REPO / "ops/learner_jobs.py")
jobs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(jobs)


class ResearchScheduling(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "notes").mkdir()
        (self.root / "paper/frozen").mkdir(parents=True)
        (self.root / "agent").mkdir()
        (self.root / "agent/.keep").write_text("fixed fixture\n")
        self.git("init", "-b", "main")
        self.git("add", "agent/.keep")
        self.git("commit", "-m", "Fixed scheduling baseline")
        self.base = self.git("rev-parse", "main").stdout.strip()
        self.manifest = {"request_id": IDENT, "character": "silent", "run_count": 2,
                         "dispatch_runs": RUNS, "runs": [{"run_id": run, "ended_at": "2026-01-01T00:00:00Z"}
                                                          for run in RUNS]}
        self.request = {"request_id": IDENT, "authorized_by": "Roy", "state": "pending", "batch": None,
                        "task": "strategy-proposal", "character": "silent", "dispatch_runs": RUNS,
                        "evidence_run_count": 2, "required_sections": ["size_outcome", "limitations"],
                        "work_spec": "paper/frozen/task.md", "input_manifest": "paper/frozen/input.json",
                        "last_dispatch_attempt": {"dispatched": None, "error": "preserved fixed failure"}}
        (self.root / self.request["work_spec"]).write_text("Fixed authorized research fixture.\n")
        self.refresh_manifest()
        self.request["work_spec_sha256"] = self.digest(self.root / self.request["work_spec"])
        self.save_request()
        self.state = {"batches": {}, "proposal_repairs": {}, "ascension": {"silent": 0}}
        self.launched = []
        self.launch_action = None

    def git(self, *args):
        result = subprocess.run(["git", "-C", str(self.root), *args], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result

    def digest(self, path):
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def refresh_manifest(self):
        path = self.root / self.request["input_manifest"]
        path.write_text(json.dumps(self.manifest))
        self.request["input_manifest_sha256"] = self.digest(path)

    def save_request(self):
        self.request_path = self.root / "notes/strategy-research-silent.json"
        self.request_path.write_text(json.dumps(self.request))

    def read_request(self):
        return json.loads(self.request_path.read_text())

    def launch(self, argv, root, scripts, state_dir, label):
        self.launched.append(argv)
        if self.launch_action:
            self.launch_action()
        return 100 + len(self.launched), "fixture:pane"

    def check(self, stamp=STAMP):
        with patch.object(jobs, "pending", return_value=[]), patch.object(jobs, "fix_key", return_value=None), \
                patch.object(jobs, "strategy_job", return_value=None), patch.object(jobs, "calibration_job", return_value=None), \
                patch.object(jobs, "start_learner", side_effect=self.launch), \
                patch("boss_sim_jobs.check", return_value=None), patch.dict(os.environ, {}, clear=False):
            with patch.dict(os.environ, {"CODEX_OPS_DIR": str(self.root / "ops/codex-ops")}):
                return jobs.check_jobs(self.state, str(self.root), str(REPO / "ops"), "silent", lambda pid: True, stamp)

    def active(self, count):
        for i in range(count):
            self.state["batches"]["existing-" + str(i)] = {
                "task": "strategy-proposal", "character": "silent", "pid": 90 + i, "state": "running"}

    def pending_proposal(self):
        self.state["proposal_repairs"]["fixed-repair"] = {
            "character": "silent", "state": "pending", "runs": RUNS}

    def test_priority_over_auto_proposal(self):
        self.active(1)
        self.pending_proposal()
        result = self.check()
        request = self.read_request()
        self.assertEqual(request["state"], "running")
        self.assertEqual(request["dispatch_base"], self.base)
        self.assertEqual(request["batch"], STAMP + "-strategy-proposal")
        self.assertEqual(result["strategy_research"][0], request["batch"])
        self.assertEqual(len(self.launched), 1)
        self.assertEqual(self.launched[0][-2:], ["strategy-proposal", IDENT])
        self.assertNotIn("proposal_repair", self.state["batches"][request["batch"]])

    def test_second_slot_fills_on_next_tick_without_displacing_research(self):
        self.pending_proposal()
        self.check()
        self.check("20260101-000002")
        self.check("20260101-000003")
        self.assertEqual(len(self.launched), 2)
        self.assertEqual(sum(batch.get("research_request") == IDENT for batch in self.state["batches"].values()), 1)
        self.assertEqual(sum(batch.get("proposal_repair") == "fixed-repair" for batch in self.state["batches"].values()), 1)

    def test_full_slots_are_read_only(self):
        self.active(2)
        self.pending_proposal()
        before = self.request_path.read_bytes(), copy.deepcopy(self.state)
        self.check()
        self.assertEqual(self.request_path.read_bytes(), before[0])
        self.assertEqual(self.state, before[1])
        self.assertEqual(self.launched, [])
        self.assertFalse((self.root / "ops/codex-ops/strategy-research-history").exists())

    def test_registered_and_terminal_requests_do_not_repeat(self):
        for state in ("running", "done", "failed", "lost"):
            with self.subTest(state=state):
                self.state["batches"] = {"prior": {"task": "strategy-proposal", "research_request": IDENT,
                                                   "state": state, "pid": 99}}
                self.check()
                self.assertEqual(self.launched, [])
        self.state["batches"] = {}
        for state in ("running", "done"):
            self.request["state"] = state
            self.save_request()
            self.check()
            self.assertEqual(self.launched, [])

    def test_retry_backoff_and_invalid_frozen_input_do_not_launch(self):
        original = copy.deepcopy(self.request)
        for changes in ({"retry_at": time.time() + 3600}, {"authorized_by": "other"},
                        {"request_id": "other"}, {"character": "ironclad"}, {"task": "fix-batch"},
                        {"batch": "prior"}, {"dispatch_runs": ["OTHER0000001"]},
                        {"input_manifest_sha256": "0" * 64}, {"work_spec_sha256": "0" * 64},
                        {"work_spec": "../outside.md"}, {"evidence_run_count": 3},
                        {"required_sections": ["size_outcome", "size_outcome"]}):
            with self.subTest(changes=changes):
                self.request = {**original, **changes}
                self.save_request()
                self.check()
                self.assertEqual(self.launched, [])
                self.assertEqual(self.read_request(), self.request)

    def test_changed_request_after_launch_is_preserved_and_registered_batch_deduplicates(self):
        def replace():
            value = self.read_request()
            value["state"] = "done"
            value["external_update"] = "preserve this concurrent fixture update"
            self.request_path.write_text(json.dumps(value))
        self.launch_action = replace
        result = self.check()
        self.assertEqual(self.read_request()["state"], "done")
        batch = self.state["batches"][result["strategy_research"][0]]
        self.assertEqual(batch["research_request"], IDENT)
        self.assertIn("research_binding_error", batch)
        self.launch_action = None
        self.check("20260101-000002")
        self.assertEqual(len(self.launched), 1)
        receipts = list((self.root / "ops/codex-ops/strategy-research-history").glob("*.receipt.json"))
        self.assertEqual(len(receipts), 1)
        self.assertEqual(json.loads(receipts[0].read_text())["batch"], result["strategy_research"][0])

    def test_changed_manifest_after_launch_does_not_bind_running(self):
        self.launch_action = lambda: (self.root / self.request["input_manifest"]).write_text("{}")
        result = self.check()
        self.assertEqual(self.read_request()["state"], "pending")
        self.assertIsNone(self.read_request()["batch"])
        self.assertIn("research_binding_error", self.state["batches"][result["strategy_research"][0]])

    def test_null_dispatch_keeps_pending_and_original_history(self):
        self.state["batches"][STAMP + "-strategy-proposal"] = {"state": "done", "task": "strategy-proposal"}
        self.check()
        request = self.read_request()
        self.assertEqual(request["state"], "pending")
        self.assertIsNone(request["batch"])
        self.assertEqual(request["last_dispatch_attempt"], self.request["last_dispatch_attempt"])
        self.assertEqual(self.launched, [])

    def test_atomic_binding_failure_preserves_actual_batch_and_does_not_repeat(self):
        import strategy_research_jobs as research
        original = research.atomic_json
        def fail_binding(path, value):
            if Path(path) == self.request_path and value.get("state") == "running":
                raise OSError("fixed atomic binding failure")
            original(path, value)
        with patch.object(research, "atomic_json", side_effect=fail_binding):
            result = self.check()
        batch = self.state["batches"][result["strategy_research"][0]]
        self.assertEqual(batch["research_request"], IDENT)
        self.assertEqual(batch["research_dispatch_receipt"]["batch"], result["strategy_research"][0])
        self.assertEqual(batch["research_binding_error"], "fixed atomic binding failure")
        self.assertEqual(self.read_request()["state"], "pending")
        self.check("20260101-000002")
        self.assertEqual(len(self.launched), 1)

    def test_receipt_write_failure_does_not_prevent_actual_batch_save(self):
        import strategy_research_jobs as research
        original = research.atomic_json
        def fail_receipt(path, value):
            if str(path).endswith(".receipt.json"):
                raise OSError("fixed receipt failure")
            original(path, value)
        with patch.object(research, "atomic_json", side_effect=fail_receipt):
            result = self.check()
        batch = self.state["batches"][result["strategy_research"][0]]
        self.assertEqual(batch["research_request"], IDENT)
        self.assertEqual(batch["research_receipt_error"], "fixed receipt failure")
        self.assertEqual(batch["research_dispatch_receipt"]["status"], "running_bound")
        self.check("20260101-000002")
        self.assertEqual(len(self.launched), 1)

    def test_baseline_is_actual_main_not_checkout_head(self):
        self.git("branch", "older-checkout")
        (self.root / "agent/.keep").write_text("new fixed main baseline\n")
        self.git("add", "agent/.keep")
        self.git("commit", "-m", "Advance fixed main")
        main = self.git("rev-parse", "main").stdout.strip()
        self.git("switch", "older-checkout")
        self.assertNotEqual(main, self.git("rev-parse", "HEAD").stdout.strip())
        self.check()
        self.assertEqual(self.read_request()["dispatch_base"], main)

    def test_manual_cmd_write_routes_exact_anchors_and_deduplicates_running(self):
        spec = importlib.util.spec_from_file_location("research_manual_ops", REPO / "ops/codex-ops-learn.py")
        ops = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ops)
        args = SimpleNamespace(task="strategy-proposal", character="silent", runs=",".join(RUNS))
        saved = []
        with patch.object(ops, "ROOT", str(self.root)), patch.object(ops, "SCRIPTS", str(REPO / "ops")), \
                patch.object(ops, "load_state", return_value=self.state), \
                patch.object(ops, "finished_runs", return_value=[{"run_id": run} for run in RUNS]), \
                patch.object(ops, "save_state", side_effect=lambda state: saved.append(copy.deepcopy(state))), \
                patch.object(ops, "alive", return_value=True), patch.object(ops, "dispatch_write", jobs.dispatch_write), \
                patch.object(jobs, "start_learner", side_effect=self.launch), \
                patch.dict(os.environ, {"CODEX_OPS_DIR": str(self.root / "ops/codex-ops")}):
            self.assertEqual(ops.cmd_write(args), 0)
            self.assertEqual(ops.cmd_write(args), 1)
            self.assertEqual(len(self.launched), 1)
            request = self.read_request()
            self.assertEqual(saved[0]["batches"][request["batch"]]["research_request"], IDENT)
            self.request_path.unlink()
            self.assertEqual(ops.cmd_write(args), 1)
            self.assertEqual(len(self.launched), 1)

    def test_outer_state_save_failure_keeps_actual_receipt_and_blocks_second_launch(self):
        import strategy_research_jobs as research
        spec = importlib.util.spec_from_file_location("research_failed_save_ops", REPO / "ops/codex-ops-learn.py")
        ops = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ops)
        args = SimpleNamespace(task="strategy-proposal", character="silent", runs=",".join(RUNS))
        disk_state = {"batches": {}}
        with patch.object(ops, "ROOT", str(self.root)), patch.object(ops, "SCRIPTS", str(REPO / "ops")), \
                patch.object(ops, "load_state", side_effect=lambda: copy.deepcopy(disk_state)), \
                patch.object(ops, "finished_runs", return_value=[{"run_id": run} for run in RUNS]), \
                patch.object(ops, "save_state", side_effect=OSError("fixed outer state save failure")), \
                patch.object(ops, "alive", return_value=True), patch.object(ops, "dispatch_write", jobs.dispatch_write), \
                patch.object(jobs, "start_learner", side_effect=self.launch), \
                patch.dict(os.environ, {"CODEX_OPS_DIR": str(self.root / "ops/codex-ops")}):
            with self.assertRaisesRegex(OSError, "outer state save"):
                ops.cmd_write(args)
            request = self.read_request()
            state_dir = self.root / "ops/codex-ops"
            (state_dir / "learn.json").write_text(json.dumps(disk_state))
            self.assertFalse(research.ready(str(self.root), str(state_dir), request["batch"], "silent", request["worktree"], IDENT))
            self.assertFalse(research.registered(str(self.root), str(state_dir), request["batch"], "silent", request["worktree"], IDENT))
            receipt = json.loads(Path(request["research_dispatch_receipt"]).read_bytes())
            self.assertEqual(receipt["pid"], 101)
            self.assertEqual(receipt["batch"], request["batch"])
            with self.assertRaisesRegex(OSError, "outer state save"):
                ops.cmd_write(args)
            self.assertEqual(len(self.launched), 1)

    def test_final_report_matches_independent_registered_baseline_and_input(self):
        spec = importlib.util.spec_from_file_location("fixed_report_fixture", REPO / "ops/tests/test_strategy_research.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        fixture = module.StrategyResearch("test_bound_clean_report_is_accepted_with_frozen_proof")
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        fixture.manifest["request_id"] = IDENT
        fixture.write_json(fixture.manifest_path, fixture.manifest)
        fixture.request.update(request_id=IDENT, input_manifest_sha256=fixture.digest(fixture.manifest_path))
        fixture.write_json(fixture.request_path, fixture.request)
        fixture.batch.update(research_request=IDENT, research_dispatch_base=fixture.base,
                             research_input_sha256=fixture.request["input_manifest_sha256"])
        fixture.report.update(request_id=IDENT, input_sha256=fixture.request["input_manifest_sha256"])
        self.assertIsNotNone(fixture.accept())
        for key, value in (("research_request", "other"), ("research_dispatch_base", "0" * 40),
                           ("research_input_sha256", "0" * 64)):
            self.assertIsNone(fixture.accept(batch={**fixture.batch, key: value}))

    def test_ordinary_dispatch_argv_and_registry_are_unchanged(self):
        self.request_path.unlink()
        self.pending_proposal()
        result = self.check()
        self.assertIsNone(result["strategy_research"])
        self.assertEqual(len(self.launched[0]), 7)
        batch = self.state["batches"][result["code_proposal"][0]]
        self.assertEqual(batch["proposal_repair"], "fixed-repair")
        self.assertNotIn("research_request", batch)

    def test_registered_gate_requires_bound_request_and_saved_batch(self):
        import strategy_research_jobs as research
        result = self.check()
        batch_id = result["strategy_research"][0]
        tree = self.read_request()["worktree"]
        state_dir = self.root / "ops/codex-ops"
        self.assertFalse(research.registered(str(self.root), str(state_dir), batch_id, "silent", tree, IDENT))
        (state_dir / "learn.json").write_text(json.dumps(self.state))
        self.assertTrue(research.ready(str(self.root), str(state_dir), batch_id, "silent", tree, IDENT))
        for key, value in (("batch", "other"), ("character", "ironclad"), ("state", "pending"),
                           ("dispatch_base", "0" * 40), ("worktree", "/other")):
            before = self.read_request()
            self.request_path.write_text(json.dumps({**before, key: value}))
            self.assertFalse(research.ready(str(self.root), str(state_dir), batch_id, "silent", tree, IDENT))
            self.request_path.write_text(json.dumps(before))

    def test_host_wrapper_waits_for_registration_before_model_and_finishes_only_registered(self):
        (self.root / "ops").mkdir(exist_ok=True)
        for name in ("paths.sh", "codex-ops-learner.sh", "strategy_research_jobs.py"):
            shutil.copy2(REPO / "ops" / name, self.root / "ops" / name)
        (self.root / "agent/node_modules").mkdir()
        (self.root / "ops/codex-ops-learn.py").write_text(
            'from pathlib import Path\nPath("finish.called").write_text("fixed completion stub")\n')
        state_dir = self.root / "ops/codex-ops"
        state_dir.mkdir()
        lock = (state_dir / "learn.lock").open("w")
        fcntl.flock(lock, fcntl.LOCK_EX)
        self.addCleanup(lock.close)
        batch_id = STAMP + "-strategy-proposal"
        tree = str(self.root / ".worktrees" / ("codex-strategy-silent-" + STAMP))
        argv = ["bash", str(self.root / "ops/codex-ops-learner.sh"), batch_id, ",".join(RUNS),
                "silent", "strategy-proposal", tree, "strategy-proposal", IDENT]
        env = {"HOME": os.environ["HOME"], "PATH": "/usr/bin:/bin", "CODEX_OPS_ROOT": str(self.root),
               "CODEX_OPS_NO_DRAIN": "1", "LEARNER_CMD": "printf fixed-model-output"}
        proc = subprocess.Popen(argv, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.addCleanup(lambda: proc.kill() if proc.poll() is None else None)
        time.sleep(0.1)
        self.assertIsNone(proc.poll())
        self.assertFalse((state_dir / "learner" / (batch_id + ".out")).exists())
        self.check()
        (state_dir / "learn.json").write_text(json.dumps(self.state))
        (self.root / "agent/.keep").write_text("main advanced after actual dispatch\n")
        self.git("add", "agent/.keep")
        self.git("commit", "-m", "Advance main while wrapper waits")
        fcntl.flock(lock, fcntl.LOCK_UN)
        stdout, stderr = proc.communicate(timeout=10)
        self.assertEqual(proc.returncode, 0, stdout + stderr)
        self.assertTrue((self.root / "finish.called").exists())
        self.assertEqual((state_dir / "learner" / (batch_id + ".out")).read_text(), "fixed-model-output")
        self.assertNotEqual(self.git("rev-parse", "main").stdout.strip(), self.base)
        actual_head = subprocess.run(["git", "-C", tree, "rev-parse", "HEAD"], capture_output=True, text=True)
        self.assertEqual(actual_head.stdout.strip(), self.base)
        receipt = json.loads((state_dir / "learner" / (batch_id + ".research-registration.json")).read_text())
        self.assertEqual(receipt["dispatch_base"], self.base)
        self.assertEqual(receipt["status"], "registered_bound")
        (self.root / "finish.called").unlink()
        (state_dir / "learn.json").write_text('{"batches": {}}')
        second = subprocess.run(argv, env=env, capture_output=True, text=True, timeout=10)
        self.assertEqual(second.returncode, 1)
        self.assertFalse((self.root / "finish.called").exists())
        self.assertIn("research registration", (state_dir / "learner" / (batch_id + ".err")).read_text())

    def test_wrapper_rejects_unknown_research_marker_and_extra_arguments(self):
        env = {"HOME": os.environ["HOME"], "PATH": "/usr/bin:/bin", "CODEX_OPS_ROOT": str(self.root),
               "CODEX_OPS_NO_DRAIN": "1", "LEARNER_CMD": "exit 99"}
        tree = str(self.root / ".worktrees" / ("codex-strategy-silent-" + STAMP))
        base = ["bash", str(REPO / "ops/codex-ops-learner.sh"), STAMP + "-strategy-proposal",
                ",".join(RUNS), "silent", "strategy-proposal", tree, "strategy-proposal"]
        for extra in (["other"], [IDENT, "extra"]):
            result = subprocess.run(base + extra, env=env, capture_output=True, text=True, timeout=5)
            self.assertEqual(result.returncode, 2)


if __name__ == "__main__":
    unittest.main()
