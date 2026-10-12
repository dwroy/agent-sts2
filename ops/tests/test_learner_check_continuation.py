"""Fixed host-continuation protocol tests; engines and test runners are mocked."""
import ast
import contextlib
import copy
import fcntl
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location("continuation", SOURCE / "learner_check_continuation.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class Continuation(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.out = self.root / "ops/codex-ops/learner"
        self.out.mkdir(parents=True)
        self.owner = self.root / ".worktrees/codex-fix-silent-20261011-181302"
        self.owner.mkdir(parents=True)
        self.live = self.root / ".worktrees/live"
        for name in ("broken", "passed", "unrun"):
            path = self.live / f"agent/tests/{name}.test.ts"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('it("fails", () => {});\n')
        self.batch_id = "20261011-181302-fix-batch"
        self.log = self.out / (self.batch_id + ".fallback-" + "b" * 40 + ".checks.log")
        self.log.write_text(" ✓ tests/passed.test.ts (10 tests)\n ❯ tests/broken.test.ts (2 tests | 1 failed)\n"
                            " FAIL tests/broken.test.ts > suite > fails\n Test Files 1 failed | 1 passed (2)\n Tests 1 failed | 11 passed (12)\n")
        self.batch = {"task": "fix-batch", "state": "failed", "rc": 124, "worktree": str(self.owner), "checks_pending": True,
                      "fallback_checks": [{"merged": "a" * 40, "tree": "b" * 40, "rc": 1,
                                           "log": str(self.log), "commits": ["e" * 40]}]}
        self.manifest = {"schema": 1, "batch": self.batch_id, "task": "fix-batch", "worktree": str(self.owner),
                         "original": {"merged": "a" * 40, "tree": "b" * 40, "log_sha256": m.digest(self.log.read_bytes()),
                                      "coverage": m.coverage(self.log.read_bytes())},
                         "live": {"commit": "c" * 40, "tree": "d" * 40}, "sources": ["e" * 40, "f" * 40],
                         "inputs": [{"path": "agent/tests/broken.test.ts", "source": "f" * 40}],
                         "selection": [{"file": "tests/broken.test.ts", "tests": ["suite fails"], "reason": "failed"}],
                         "receipts": []}
        self.events, self.inbox, self.calls = [], [], []
        self.changed, self.dirty, self.stale = [], False, False
        self.code, self.timeout, self.zero_tests = 0, False, False
        self.environment_limited = False
        self.git_patch = patch.object(m, "git", side_effect=self.git)
        self.git_patch.start()
        self.addCleanup(self.git_patch.stop)
        self.run_patch = patch.object(m.subprocess, "run", side_effect=self.execute)
        self.run_patch.start()
        self.addCleanup(self.run_patch.stop)

    def git(self, live, *args):
        self.assertEqual(Path(live), self.live)
        if args == ("rev-parse", "HEAD", "HEAD^{tree}"):
            return ("0" if self.stale else "c") * 40 + "\n" + "d" * 40
        if args[0] == "rev-parse":
            return "b" * 40
        if args[0] == "status":
            return " M agent/src/core/config.ts" if self.dirty else ""
        if args[0] == "diff":
            return "\n".join(self.changed)
        if args[0] == "ls-files":
            return args[-1]
        self.assertEqual(args[0], "merge-base")
        return ""

    def execute(self, argv, **kwargs):
        self.calls.append(argv)
        self.assertEqual(argv[:3], ["nice", "-n", "19"])
        self.assertEqual(kwargs["cwd"], self.live / "agent")
        self.assertLessEqual(kwargs["timeout"], 3600)
        self.assertNotIn("shell", kwargs)
        if "node_modules/typescript/bin/tsc" in argv:
            return subprocess.CompletedProcess(argv, 0)
        self.assertIn("--maxWorkers=1", argv)
        self.assertIn("--pool=forks", argv)
        self.assertNotIn("--exclude", argv)
        if self.timeout:
            raise subprocess.TimeoutExpired(argv, 3600)
        path = Path(next(a.removeprefix("--outputFile=") for a in argv if a.startswith("--outputFile=")))
        names = next(item["tests"] for item in self.manifest["selection"] if item["file"] in argv) or ["suite fails"]
        data = {"numTotalTests": len(names), "numPassedTests": 0 if self.zero_tests or self.code else len(names),
                "numFailedTests": len(names) if self.code else 0,
                "testResults": [{"assertionResults": [{"fullName": name, "status": "pending" if self.zero_tests else "failed" if self.code else "passed"}
                                                      for name in names]}]}
        if self.environment_limited:
            data["testResults"][0]["message"] = "Error: spawn fixed-child EPERM"
        path.write_text(json.dumps(data))
        kwargs["stdout"].write("fake runner stderr retained\n")
        return subprocess.CompletedProcess(argv, self.code)

    def save(self):
        raw = json.dumps(self.manifest).encode()
        sha = m.digest(raw)
        (self.out / f"{self.batch_id}.continuation-{sha}.json").write_bytes(raw)
        return sha

    def run_check(self, sha=None):
        return m.run(self.batch_id, self.batch, str(self.root), str(self.out), sha or self.save(),
                     lambda kind, message: self.events.append((kind, message)), self.inbox.append)

    def test_scoped_recheck_preserves_original_failure_and_deduplicates_completed_claim(self):
        original = copy.deepcopy(self.batch)
        original_log = self.log.read_bytes()
        sha = self.save()
        self.assertEqual(self.run_check(sha), 0)
        self.assertEqual(self.run_check(sha), 0)
        self.assertEqual(len(self.calls), 2)
        self.assertEqual(len(self.events), 1)
        self.assertEqual(self.events[0][0], "learner-checks")
        for key, value in original.items():
            self.assertEqual(self.batch[key], value)
        self.assertEqual(self.log.read_bytes(), original_log)
        receipt = self.batch["check_supplements"][0]
        self.assertFalse(receipt["full_suite"])
        self.assertEqual(len(self.batch["check_supplements"]), 1)
        self.assertIn("stderr retained", Path(receipt["log"]).read_text())

    def test_existing_recheck_entry_delegates_to_the_bounded_supplement(self):
        spec = importlib.util.spec_from_file_location("checks_entry", SOURCE / "learner_checks.py")
        checks = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(checks)
        isolated = SimpleNamespace(loader=SimpleNamespace(exec_module=lambda module: None))
        with patch.object(checks.importlib.util, "spec_from_file_location", return_value=isolated), \
                patch.object(checks.importlib.util, "module_from_spec", return_value=m):
            result = checks.recheck_write_batch(self.batch_id, self.batch, str(self.root), str(self.out),
                                                lambda kind, message: self.events.append((kind, message)), self.inbox.append,
                                                continuation=self.save())
        self.assertEqual(result, 0)
        self.assertEqual(len(self.calls), 2)
        self.assertFalse(self.batch["check_supplements"][0]["full_suite"])

    def test_rejects_batch_owner_sha_path_command_and_coverage_drift(self):
        edits = [lambda x: x.update(batch="20261011-175450-experience-update"),
                 lambda x: x.update(task="experience-update"), lambda x: x.update(worktree="/elsewhere"),
                 lambda x: x.update(command="echo unsafe"),
                 lambda x: x["original"].update(log_sha256="0" * 64),
                 lambda x: x["original"].update(tree="0" * 40),
                 lambda x: x["original"]["coverage"]["passed"].append("tests/fake.test.ts"),
                 lambda x: x.update(sources=["f" * 40]),
                 lambda x: x.update(sources=["main"]),
                 lambda x: x["selection"][0].update(file="../tests/broken.test.ts"),
                 lambda x: x["selection"][0].update(file="tests/broken.test.ts;exit"),
                 lambda x: x["selection"][0].update(command="echo unsafe"),
                 lambda x: x["selection"][0].update(tests=["suite passed"])]
        valid = copy.deepcopy(self.manifest)
        for edit in edits:
            self.manifest = copy.deepcopy(valid)
            edit(self.manifest)
            with self.subTest(manifest=self.manifest):
                self.assertEqual(self.run_check(), 2)
                self.assertFalse(self.calls)
        self.manifest = valid
        sha = self.save()
        path = self.out / f"{self.batch_id}.continuation-{sha}.json"
        path.write_text(path.read_text() + " ")
        self.assertEqual(self.run_check(sha), 2)
        self.assertEqual(self.run_check("../bad"), 2)

    def test_stale_dirty_active_and_missing_source_refuse_without_a_full_rerun(self):
        self.stale = True
        self.assertEqual(self.run_check(), 2)
        self.stale, self.dirty = False, True
        self.assertEqual(self.run_check(), 2)
        self.dirty = False
        self.batch["state"] = "running"
        self.assertEqual(self.run_check(), 2)
        self.batch["state"] = "failed"
        with patch.object(m, "git", side_effect=ValueError("source absent")):
            self.assertEqual(self.run_check(), 2)
        self.assertFalse(self.calls)

    def test_symlinked_inputs_and_unregistered_original_log_are_rejected(self):
        path = self.live / "agent/tests/broken.test.ts"
        path.unlink()
        path.symlink_to(self.live / "agent/tests/passed.test.ts")
        self.assertEqual(self.run_check(), 2)
        path.unlink()
        path.write_text("fixed test")
        self.batch["fallback_checks"][0]["log"] = str(self.root / "outside.checks.log")
        self.assertEqual(self.run_check(), 2)
        self.assertFalse(self.calls)

    def test_previously_passed_file_requires_a_real_changed_dependency(self):
        self.manifest["selection"] = [{"file": "tests/passed.test.ts", "tests": [], "reason": "unrun"}]
        self.manifest["inputs"] = [{"path": "agent/tests/passed.test.ts", "source": "f" * 40}]
        self.assertEqual(self.run_check(), 2)
        self.manifest["selection"][0]["reason"] = "affected"
        self.assertEqual(self.run_check(), 2)
        self.changed = ["agent/tests/passed.test.ts"]
        self.assertEqual(self.run_check(), 0)

    def test_changed_implementation_module_is_eligible_for_affected_supplement(self):
        name = "tests/strategy-implementation.test.ts"
        dependency = "ops/strategy_implementation_jobs.py"
        self.assertTrue((SOURCE / "strategy_implementation_jobs.py").is_file())
        (self.live / "agent" / name).write_text('it("fixed binding", () => {});\n')
        self.changed = [dependency]
        self.manifest["selection"] = [{"file": name, "tests": [], "reason": "affected"}]
        self.manifest["inputs"] = [{"path": path, "source": "f" * 40}
                                   for path in ["agent/" + name, dependency]]
        self.assertEqual(self.run_check(), 0)
        self.assertEqual(len(self.calls), 2)
        self.assertIn(name, self.calls[-1])

    def test_unrun_and_newly_affected_files_have_separate_supplement_receipts(self):
        self.assertEqual(self.run_check(), 0)
        self.manifest["selection"] = [{"file": "tests/unrun.test.ts", "tests": [], "reason": "unrun"}]
        self.manifest["inputs"] = [{"path": "agent/tests/unrun.test.ts", "source": "f" * 40}]
        self.assertEqual(self.run_check(), 0)
        self.assertEqual(len(self.batch["check_supplements"]), 2)
        self.assertNotEqual(*[entry["log"] for entry in self.batch["check_supplements"]])

    def test_evidence_receipts_are_content_bound_and_cannot_choose_arbitrary_paths(self):
        path = self.root / "paper/materials/fixed/coverage.json"
        path.parent.mkdir(parents=True)
        path.write_text('{"source": "fixed evidence"}')
        receipt = {"path": str(path.relative_to(self.root)), "sha256": m.digest(path.read_bytes())}
        self.manifest["receipts"] = [receipt]
        receipt["sha256"] = "0" * 64
        self.assertEqual(self.run_check(), 2)
        receipt["sha256"] = m.digest(path.read_bytes())
        receipt["path"] = "paper/materials/../../ops/file.json"
        self.assertEqual(self.run_check(), 2)
        receipt["path"] = str(path.relative_to(self.root))
        self.assertEqual(self.run_check(), 0)

    def test_timeout_preserves_completed_segment_and_does_not_reset_or_repeat(self):
        self.timeout = True
        sha = self.save()
        self.assertEqual(self.run_check(sha), 124)
        self.assertEqual(self.run_check(sha), 124)
        receipt = self.batch["check_supplements"][0]
        self.assertEqual([row["status"] for row in receipt["results"]], ["passed", "timeout"])
        self.assertEqual(len(self.calls), 2)
        self.assertEqual(self.batch["rc"], 124)

    def test_failed_assertion_and_zero_matching_tests_are_not_success(self):
        self.code = 1
        self.assertEqual(self.run_check(), 1)
        self.assertEqual(self.batch["check_supplements"][0]["results"][-1]["status"], "failed")
        self.code, self.zero_tests = 0, True
        self.manifest["selection"] = [{"file": "tests/unrun.test.ts", "tests": [], "reason": "unrun"}]
        self.manifest["inputs"] = [{"path": "agent/tests/unrun.test.ts", "source": "f" * 40}]
        self.assertEqual(self.run_check(), 2)

    def test_ancestry_does_not_accept_a_reverted_source_snapshot(self):
        def reverted(live, *args):
            if args[:2] == ("rev-parse", "--verify") and args[-1].startswith("f" * 40):
                return "0" * 40
            return self.git(live, *args)
        with patch.object(m, "git", side_effect=reverted):
            self.assertEqual(self.run_check(), 2)
        self.assertFalse(self.calls)

    def test_changing_metadata_cannot_repeat_a_passed_supplement(self):
        self.assertEqual(self.run_check(), 0)
        self.manifest["sources"].append("9" * 40)
        self.assertEqual(self.run_check(), 2)
        self.assertEqual(len(self.calls), 2)

    def test_permission_limit_is_distinct_from_an_assertion_failure(self):
        self.code, self.environment_limited = 1, True
        self.assertEqual(self.run_check(), 1)
        self.assertEqual(self.batch["check_supplements"][0]["results"][-1]["status"], "environment-limited")

    def test_source_drift_during_execution_cannot_claim_a_verified_pass(self):
        def mutate(argv, **kwargs):
            result = self.execute(argv, **kwargs)
            self.dirty = True
            return result
        with patch.object(m.subprocess, "run", side_effect=mutate):
            self.assertEqual(self.run_check(), 2)
        self.assertEqual(self.batch["check_supplements"][0]["results"][-1]["status"], "source-drift")

    def test_incomplete_claim_refuses_rerun(self):
        sha = self.save()
        path = self.out / f"{self.batch_id}.supplement-{sha}.json"
        path.write_text(json.dumps({"manifest_sha256": sha, "state": "running"}))
        self.assertEqual(self.run_check(sha), 2)
        self.assertFalse(self.calls)

    def test_original_timeout_log_retains_partial_coverage(self):
        self.batch["fallback_checks"][0]["rc"] = 124
        self.log.write_text(" ✓ tests/passed.test.ts (10 tests)\nTimeoutExpired: before remaining files\n")
        self.manifest["original"].update(log_sha256=m.digest(self.log.read_bytes()), coverage=m.coverage(self.log.read_bytes()))
        self.manifest["selection"][0]["reason"] = "unrun"
        self.assertEqual(self.run_check(), 0)
        self.assertEqual(self.batch["check_supplements"][0]["original"]["coverage"]["passed"], ["tests/passed.test.ts"])

    def test_sparse_summary_cannot_misclassify_passed_files_as_unrun(self):
        self.log.write_text(" ❯ tests/broken.test.ts (2 tests | 1 failed)\n Test Files 1 failed | 324 passed (325)\n")
        self.manifest["original"].update(log_sha256=m.digest(self.log.read_bytes()), coverage=m.coverage(self.log.read_bytes()))
        self.manifest["selection"] = [{"file": "tests/unrun.test.ts", "tests": [], "reason": "unrun"}]
        self.manifest["inputs"] = [{"path": "agent/tests/unrun.test.ts", "source": "f" * 40}]
        self.assertEqual(self.run_check(), 2)
        self.assertFalse(self.calls)

    def scheduler(self, state):
        source = ast.parse((SOURCE / "codex-ops-learn.py").read_text())
        function = next(node for node in source.body if isinstance(node, ast.FunctionDef) and node.name == "cmd_recheck")
        namespace = {"re": m.re, "os": m.os, "fcntl": fcntl, "json": json, "DIR": str(self.out.parent), "ROOT": str(self.root),
                     "state_lock": contextlib.nullcontext, "load_state": lambda: copy.deepcopy(state),
                     "save_state": lambda saved: state.update(saved), "enqueue": lambda *args: None, "inbox": lambda *args: None}
        calls = []
        def recheck(*args, **kwargs):
            calls.append((args, kwargs))
            args[1]["check_supplements"] = [{"rc": 0, "scope": "selected tests only"}]
            return 0
        namespace["recheck_write_batch"] = recheck
        exec(compile(ast.Module(body=[function], type_ignores=[]), "scheduler-fixture", "exec"), namespace)
        return namespace["cmd_recheck"], calls

    def test_scheduler_rejects_active_owner_and_keeps_original_checks_pending(self):
        state = {"batches": {self.batch_id: self.batch, "new-owner": {"state": "running", "worktree": str(self.owner)}}}
        call, calls = self.scheduler(state)
        token = self.batch_id + ":" + "a" * 64
        self.assertEqual(call(SimpleNamespace(batch=token)), 2)
        self.assertFalse(calls)
        state["batches"].pop("new-owner")
        with open(self.out.parent / (self.batch_id + ".checks.lock"), "a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assertEqual(call(SimpleNamespace(batch=token)), 2)
        self.assertEqual(call(SimpleNamespace(batch=token)), 0)
        self.assertEqual(calls[0][1], {"continuation": "a" * 64})
        self.assertTrue(state["batches"][self.batch_id]["checks_pending"])
        self.assertEqual(state["batches"][self.batch_id]["fallback_checks"], self.batch["fallback_checks"])


if __name__ == "__main__":
    unittest.main()
