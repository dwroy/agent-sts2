"""Fixed continuation receipts; no real scheduler, network or model calls."""
import copy
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_strategy_implementation as fixtures
import strategy_implementation_jobs as implementation
import strategy_implementation_continuation as continuation
import learner_jobs as jobs

STAMP = "20260101-020101"
BATCH = STAMP + "-strategy-proposal"


class Continuation(unittest.TestCase):
    def setUp(self):
        self.f = fixtures.ImplementationBinding()
        self.f.setUp()
        self.addCleanup(self.f.doCleanups)
        self.prior = self.f.bound()
        self.prior["state"] = "done"
        self.prior["rc"] = 0
        self.prior_before = copy.deepcopy(self.prior)
        self.f.launches.clear()
        self.parent_raw = (self.f.root / implementation.REQUEST_PATH).read_bytes()
        self.queue = "paper/materials/learning/code-proposals.jsonl"
        for row in self.f.items:
            row["state"] = "waiting"
        self.f.write(self.queue, "".join(json.dumps(row) + "\n" for row in self.f.items))
        self.queue_raw = (self.f.root / self.queue).read_bytes()
        artifact = ".worktrees/codex-strategy-silent-" + fixtures.STAMP + "/learner/runs/prior/report.md"
        self.f.write(artifact, "Original partial coverage and missing evidence.\n")
        self.addendum = {
            "parent_request_id": implementation.REQUEST, "prior_batch": fixtures.BATCH,
            "original_ack_modified": False, "original_ack_sha256": self.prior["implementation_binding"]["ack_sha256"],
            "released_to_original_implementation_successor": implementation.WATCHER_FILES,
            "artifact_checks": [{"path": artifact, "sha256": implementation.digest((self.f.root / artifact).read_bytes()), "matches": True}],
        }
        self.request = {
            "request_id": continuation.ID, "parent_request_id": implementation.REQUEST, "prior_batch": fixtures.BATCH,
            "task": continuation.DIRECTORY + "quantitative-continuation-task.md",
            "ownership_addendum": continuation.DIRECTORY + "quantitative-ownership-addendum.json",
            "old_registration_modified": False, "final_delivery_complete": False,
            "state": "queued_for_existing_ordinary_fix", "actual_batch": None,
        }
        task = self.f.write(self.request["task"], "固定续办：复用原产物，六路径已释放。\n")
        addendum = self.f.write(self.request["ownership_addendum"], self.addendum)
        for name, value in (("PRIOR", fixtures.BATCH), ("TASK_SHA", implementation.digest(task.read_bytes())),
                            ("ADDENDUM_SHA", implementation.digest(addendum.read_bytes()))):
            replacement = patch.object(continuation, name, value)
            replacement.start()
            self.addCleanup(replacement.stop)
        self.request["task_sha256"] = continuation.TASK_SHA
        self.f.write(continuation.PATH, self.request)
        replacement = patch.object(continuation, "owner_alive", return_value=False)
        replacement.start()
        self.addCleanup(replacement.stop)

    def dispatch(self, stamp=STAMP, alive=lambda pid: False):
        with patch.object(jobs, "start_learner", side_effect=self.f.launch):
            return implementation.dispatch(self.f.state, str(self.f.root), str(fixtures.REPO / "ops"), "silent",
                alive, stamp, jobs.dispatch_write, continuation.ID)

    def args(self, stamp=STAMP):
        tree = self.f.root / ".worktrees" / ("codex-strategy-silent-" + stamp)
        return str(self.f.root), str(self.f.state_dir), stamp + "-strategy-proposal", "silent", str(tree), continuation.ID

    def assert_originals(self):
        self.assertEqual(self.f.state["batches"][fixtures.BATCH], self.prior_before)
        self.assertEqual((self.f.root / implementation.REQUEST_PATH).read_bytes(), self.parent_raw)
        self.assertEqual((self.f.root / self.queue).read_bytes(), self.queue_raw)
        self.assertEqual(self.f.state["batches"]["old-failure"]["rc"], 124)

    def test_continuation_reuses_waiting_inputs_and_returns_same_receipt(self):
        self.assertEqual(self.dispatch(), (BATCH, 101))
        self.f.save()
        receipt = copy.deepcopy(self.f.state["batches"][BATCH])
        self.assertEqual(self.dispatch(stamp="20260101-020102"), (BATCH, 101))
        self.assertEqual(len(self.f.launches), 1)
        self.assertEqual(self.f.state["batches"][BATCH], receipt)
        self.assertEqual(implementation.ready(*self.args()), receipt)
        self.f.state["batches"][BATCH]["state"] = "done"
        self.assertEqual(self.dispatch(stamp="20260101-020103"), (BATCH, 101))
        self.assert_originals()

    def test_active_original_owner_and_overlapping_leases_block(self):
        with self.assertRaisesRegex(ValueError, "owner"):
            self.dispatch(alive=lambda pid: True)
        for status in ("running", "lost"):
            self.f.state["batches"]["overlap"] = {"state": status, "pid": 202, "proposal_ids": implementation.PROPOSALS[:1]}
            with self.assertRaisesRegex(ValueError, "lease"):
                self.dispatch()
        self.assertEqual(self.f.launches, [])
        self.assert_originals()

    def test_input_drift_and_cross_request_binding_block_before_launch(self):
        for relative in (self.f.request["work_spec"], implementation.DIRECTORY + "ops-ack.json",
                         self.addendum["artifact_checks"][0]["path"], self.request["ownership_addendum"]):
            path = self.f.root / relative
            original = path.read_bytes()
            path.write_bytes(original + b"changed")
            with self.assertRaises((ValueError, OSError)):
                self.dispatch()
            path.write_bytes(original)
        changed = {**self.request, "parent_request_id": "different-request"}
        self.f.write(continuation.PATH, changed)
        with self.assertRaisesRegex(ValueError, "identity"):
            self.dispatch()
        self.assertEqual(self.f.launches, [])
        self.assert_originals()

    def test_retries_keep_failed_receipts_and_require_cooldown_with_three_attempt_limit(self):
        self.dispatch()
        first = self.f.state["batches"][BATCH]
        first.update(state="failed", rc=124, retry_at=time.time() + 3600)
        with self.assertRaisesRegex(ValueError, "retry"):
            self.dispatch(stamp="20260101-020102")
        first["retry_at"] = time.time() - 1
        frozen = copy.deepcopy(first)
        for stamp in ("20260101-020102", "20260101-020103"):
            self.assertEqual(self.dispatch(stamp=stamp), (stamp + "-strategy-proposal", 101))
            self.f.state["batches"][stamp + "-strategy-proposal"].update(state="failed", rc=1, retry_at=time.time() - 1)
        with self.assertRaisesRegex(ValueError, "retry"):
            self.dispatch(stamp="20260101-020104")
        self.assertEqual(first, frozen)
        self.assertEqual(len(json.loads((self.f.root / continuation.PATH).read_bytes())["actual_batches"]), 3)
        self.assert_originals()

    def test_prepared_input_and_completion_bind_the_addendum_and_original_artifacts(self):
        self.dispatch()
        self.f.save()
        args = self.args()
        self.f.git("worktree", "add", "-b", "fixed-continuation", args[4], self.f.base)
        path = Path(implementation.prepare(*args))
        self.assertIn("固定续办：复用原产物，六路径已释放。", path.read_text())
        self.assertIn(self.addendum["artifact_checks"][0]["sha256"], path.read_text())
        batch = self.f.state["batches"][BATCH]
        report = {"task": "strategy-proposal", "character": "silent", "batch": BATCH,
                  "request_id": implementation.REQUEST, "input_sha256": implementation.MANIFEST_SHA,
                  "work_spec_sha256": implementation.TASK_SHA, "continuation_id": continuation.ID,
                  "continuation_input_sha256": continuation.ADDENDUM_SHA}
        self.assertEqual(implementation.report_errors(report, batch, self.f.root), [])
        self.assertTrue(implementation.report_errors({**report, "continuation_id": "wrong"}, batch, self.f.root))
        artifact = self.f.root / self.addendum["artifact_checks"][0]["path"]
        artifact.write_text("drift after dispatch")
        with self.assertRaisesRegex(ValueError, "SHA"):
            implementation.ready(*args)
        self.assert_originals()

    def test_binding_write_failure_is_preserved_and_cannot_silently_restart(self):
        original = implementation.atomic_json
        def fail(path, value):
            if Path(path) == self.f.root / continuation.PATH:
                raise OSError("fixed continuation receipt failure")
            return original(path, value)
        with patch.object(implementation, "atomic_json", side_effect=fail):
            self.dispatch()
        self.assertIn("implementation_binding_error", self.f.state["batches"][BATCH])
        with self.assertRaisesRegex(ValueError, "history"):
            self.dispatch(stamp="20260101-020102")
        self.assertEqual(len(self.f.launches), 1)
        self.assert_originals()

    def test_host_wrapper_delivers_the_continuation_to_a_fixed_launcher(self):
        self.dispatch()
        self.f.save()
        for relative in ("ops/codex-ops-learner.sh", "ops/paths.sh", "ops/proposal_dispatch.py",
                         "ops/strategy_research_jobs.py", "learner/code_proposals.py"):
            self.f.write(relative, (fixtures.REPO / relative).read_bytes())
        for module, filename, names in (
                (implementation, "strategy_implementation_jobs.py", ("TASK_SHA", "MANIFEST_SHA", "AUTH_SHA")),
                (continuation, "strategy_implementation_continuation.py", ("TASK_SHA", "ADDENDUM_SHA", "PRIOR"))):
            source = (fixtures.REPO / "ops" / filename).read_text()
            for name in names:
                source = re.sub(name + r' = "[^"\n]+"', name + ' = "' + getattr(module, name) + '"', source)
            if module is continuation:
                source += "\n# Fixed fixture: the old owner has exited.\nowner_alive = lambda pid: False\n"
            self.f.write("ops/" + filename, source)
        self.f.write("ops/codex-ops-learn.py", "from pathlib import Path\nimport sys\nPath(__file__).with_name('finished.json').write_text(str(sys.argv[1:]))\n")
        fake = self.f.write("agent/node_modules/.bin/tsx", "#!/usr/bin/env python3\n"
            "import json,sys\nfrom pathlib import Path\n"
            "task=Path(sys.argv[sys.argv.index('--task')+1])\n"
            "Path(__file__).resolve().parents[3].joinpath('captured.json').write_text(json.dumps({'argv':sys.argv[1:],'task':task.read_text()}))\n")
        fake.chmod(0o755)
        result = subprocess.run(["bash", str(self.f.root / "ops/codex-ops-learner.sh"), BATCH, fixtures.RUN, "silent",
                                 "strategy-proposal", self.args()[4], "strategy-proposal", continuation.ID],
                                env={**os.environ, "CODEX_OPS_ROOT": str(self.f.root), "CODEX_OPS_DIR": str(self.f.state_dir),
                                     "CODEX_OPS_NO_DRAIN": "1", "LEARNER_CMD": "", "HERDR_HOST_LABEL": "",
                                     "LEARNER_CODEX_BIN": "/fixed/no-real-codex"},
                                capture_output=True, text=True, timeout=30)
        errors = self.f.state_dir / "learner" / (BATCH + ".err")
        self.assertEqual(result.returncode, 0, result.stderr + (errors.read_text() if errors.exists() else ""))
        captured = json.loads((self.f.root / "captured.json").read_text())
        self.assertIn("固定续办：复用原产物，六路径已释放。", captured["task"])
        self.assertIn(continuation.ID, captured["task"])
        self.assertIn("'--rc', '0'", (self.f.root / "ops/finished.json").read_text())
        self.assert_originals()


if __name__ == "__main__":
    unittest.main()
