"""Fixed implementation binding fixtures; never start a real model or scheduler."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "ops"))
import learner_jobs as jobs
import strategy_implementation_jobs as implementation
import strategy_research_jobs as research
import proposal_dispatch as proposals
import learner_checks as checks

STAMP = "20260101-010101"
BATCH = STAMP + "-strategy-proposal"
RUN = "SILENT000001"


class ImplementationBinding(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.state_dir = self.root / "ops/codex-ops"
        (self.state_dir / "learner").mkdir(parents=True)
        self.tree = self.root / ".worktrees" / ("codex-strategy-silent-" + STAMP)
        self.state = {"batches": {"old-failure": {"state": "failed", "rc": 124, "task": "strategy-proposal"}}}
        self.write("learner/tasks/strategy-proposal.md", (REPO / "learner/tasks/strategy-proposal.md").read_text())
        self.write("agent/.keep", "Fixed empty agent package for the fake launcher.\n")
        self.git("init", "-b", "main")
        self.git("add", "learner", "agent")
        self.git("commit", "-m", "Fixed implementation baseline")
        self.base = self.git("rev-parse", "HEAD").stdout.strip()
        prefix = implementation.DIRECTORY
        files = []
        for index in range(9):
            path = prefix + "inputs/fixed-" + str(index) + ".md"
            content = ("Fixed evidence " + str(index) + "\n").encode()
            self.write(path, content)
            files.append({"path": path, "sha256": implementation.digest(content), "bytes": len(content)})
        self.manifest = {"request_id": implementation.REQUEST, "character": "silent", "files": files}
        self.write(prefix + "input-manifest.json", self.manifest)
        self.write(prefix + "task.md", "固定实现正文：只读取本角色证据。\n")
        self.write(prefix + "authorization-upgrade-20261011.md", "固定扩授权：实际代码实现，保留随机误差。\n")
        for name, path in (("TASK_SHA", "task.md"), ("MANIFEST_SHA", "input-manifest.json"),
                           ("AUTH_SHA", "authorization-upgrade-20261011.md")):
            replacement = patch.object(implementation, name, implementation.digest((self.root / (prefix + path)).read_bytes()))
            replacement.start()
            self.addCleanup(replacement.stop)
        self.items = []
        for ident, row in zip(implementation.PROPOSALS, files[-3:]):
            self.items.append({"op": "add", "id": ident, "character": "silent", "target_task": "strategy-proposal",
                               "state": "pending", "proposal": str(self.root / row["path"]),
                               "proposal_sha256": row["sha256"], "runs": [RUN]})
        self.write("paper/materials/learning/code-proposals.jsonl", "".join(json.dumps(p) + "\n" for p in self.items))
        self.write("logs/runs.jsonl", json.dumps({"run_id": RUN, "character": "SILENT"}) + "\n")
        self.request = {"request_id": implementation.REQUEST, "authorized_by": "Roy", "character": "silent",
                        "kind": "ops_learning_handoff", "parent_completion_preserved": True,
                        "parent_request_id": "roy-20261010-silent-core-reuse-experience-integration",
                        "work_spec": prefix + "task.md", "work_spec_sha256": implementation.TASK_SHA,
                        "input_manifest": prefix + "input-manifest.json", "input_manifest_sha256": implementation.MANIFEST_SHA,
                        "linked_code_proposals": implementation.PROPOSALS, "state": "queued_for_ops", "actual_batches": []}
        self.write(implementation.REQUEST_PATH, self.request)
        self.ack = {"request_id": implementation.REQUEST,
                    "file_responsibilities": {"watcher": implementation.WATCHER_FILES, "learner": ["固定校准"]},
                    "frozen_task": {"path": self.request["work_spec"], "sha256": implementation.TASK_SHA},
                    "input_manifest": {"sha256": implementation.MANIFEST_SHA},
                    "proposal_deduplication": [{"id": p["id"], "proposal_sha256": p["proposal_sha256"]} for p in self.items],
                    "supplemental_inputs": [{"path": prefix + "authorization-upgrade-20261011.md",
                                             "sha256": implementation.AUTH_SHA, "immutable": True}]}
        self.write(prefix + "ops-ack.json", self.ack)
        self.old = self.write("notes/strategy-research-core-output-silent.json", {"state": "done", "request_id": "old"})
        self.old_raw = self.old.read_bytes()
        self.launches = []
        env = patch.dict(os.environ, {"CODEX_OPS_DIR": str(self.state_dir)})
        env.start()
        self.addCleanup(env.stop)

    def write(self, relative, value):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(value, (dict, list)):
            value = json.dumps(value, ensure_ascii=False)
        path.write_bytes(value.encode() if isinstance(value, str) else value)
        return path

    def git(self, *args):
        result = subprocess.run(["git", "-C", str(self.root), *args], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result

    def launch(self, argv, *args):
        self.launches.append(argv)
        return 101, "fixed:pane"

    def dispatch(self, ident=None, stamp=STAMP):
        with patch.object(jobs, "start_learner", side_effect=self.launch):
            return implementation.dispatch(self.state, str(self.root), str(REPO / "ops"), "silent",
                lambda pid: True, stamp, jobs.dispatch_write, ident or implementation.REQUEST)

    def save(self):
        self.write("ops/codex-ops/learn.json", self.state)

    def args(self):
        return str(self.root), str(self.state_dir), BATCH, "silent", str(self.tree), implementation.REQUEST

    def bound(self):
        self.assertEqual(self.dispatch(), (BATCH, 101))
        self.save()
        return self.state["batches"][BATCH]

    def test_correct_binding_claims_originals_and_preserves_old_history(self):
        batch = self.bound()
        self.assertEqual(implementation.ready(*self.args()), batch)
        self.assertEqual(batch["proposal_ids"], implementation.PROPOSALS)
        self.assertNotIn("research_request", batch)
        self.assertEqual(self.launches[0][-1], implementation.REQUEST)
        self.assertEqual(self.state["batches"]["old-failure"]["rc"], 124)
        self.assertEqual(self.old.read_bytes(), self.old_raw)
        self.assertTrue(list((self.state_dir / "strategy-implementation-history").glob("*.request.json")))

    def test_sha_change_and_missing_input_block_before_launch(self):
        paths = [self.request["work_spec"], self.request["input_manifest"],
                 self.manifest["files"][0]["path"], implementation.DIRECTORY + "authorization-upgrade-20261011.md"]
        for relative in paths:
            path = self.root / relative
            raw = path.read_bytes()
            for content in (b"changed", None):
                with self.subTest(path=relative, content=content):
                    if content is None:
                        path.unlink()
                    else:
                        path.write_bytes(content)
                    with self.assertRaises((ValueError, OSError)):
                        self.dispatch()
                    self.assertEqual(self.launches, [])
                    path.write_bytes(raw)

    def test_no_duplicate_or_active_or_unclosed_lost_lease(self):
        for pid in (101, None):
            self.state["batches"]["owner"] = {"state": "running", "pid": pid, "proposal_ids": implementation.PROPOSALS[:1]}
            with self.assertRaisesRegex(ValueError, "leased"):
                self.dispatch()
        del self.state["batches"]["owner"]
        self.bound()
        for status in ("running", "done", "failed", "lost"):
            self.state["batches"][BATCH]["state"] = status
            with self.assertRaisesRegex(ValueError, "registered"):
                self.dispatch(stamp="20260101-010102")
        self.assertEqual(len(self.launches), 1)

    def test_full_slots_and_unavailable_proposals_do_not_launch(self):
        for index in range(2):
            self.state["batches"][str(index)] = {"state": "running", "task": "strategy-proposal", "pid": 10 + index}
        self.assertIsNone(self.dispatch())
        self.assertEqual(self.launches, [])
        self.state["batches"] = {}
        self.items[0]["state"] = "implemented"
        self.write("paper/materials/learning/code-proposals.jsonl", "".join(json.dumps(p) + "\n" for p in self.items))
        with self.assertRaisesRegex(ValueError, "unavailable"):
            self.dispatch()

    def test_unsaved_registration_changed_sha_and_lease_conflict_reject_host(self):
        self.dispatch()
        self.write("ops/codex-ops/learn.json", {"batches": {}})
        with self.assertRaisesRegex(ValueError, "not saved"):
            implementation.ready(*self.args())
        self.save()
        implementation.ready(*self.args())
        self.ack["file_responsibilities"]["learner"] = ["changed responsibility"]
        self.write(implementation.DIRECTORY + "ops-ack.json", self.ack)
        with self.assertRaisesRegex(ValueError, "binding changed"):
            implementation.ready(*self.args())
        self.ack["file_responsibilities"]["learner"] = ["固定校准"]
        self.write(implementation.DIRECTORY + "ops-ack.json", self.ack)
        self.state["batches"]["other"] = {"state": "running", "proposal_ids": implementation.PROPOSALS}
        self.save()
        with self.assertRaisesRegex(ValueError, "lease conflict"):
            implementation.ready(*self.args())

    def test_binding_write_failure_keeps_registered_claim_and_original_request(self):
        original = implementation.atomic_json
        def fail(path, value):
            if Path(path) == self.root / implementation.REQUEST_PATH:
                raise OSError("fixed failed binding write")
            return original(path, value)
        with patch.object(implementation, "atomic_json", side_effect=fail):
            batch = self.bound()
        self.assertEqual(json.loads((self.root / implementation.REQUEST_PATH).read_bytes())["state"], "queued_for_ops")
        self.assertIn("implementation_binding_error", batch)
        with self.assertRaises(ValueError):
            implementation.ready(*self.args())
        with self.assertRaises(ValueError):
            self.dispatch(stamp="20260101-010102")
        self.assertEqual(self.state["batches"]["old-failure"]["rc"], 124)

    def test_pure_research_cannot_claim_implementation_or_fall_back(self):
        with self.assertRaisesRegex(ValueError, "unknown"):
            self.dispatch(ident=research.REQUEST)
        self.assertNotIn(implementation.REQUEST, research.REQUEST_PATHS)
        self.assertIsNone(research.dispatch(self.state, str(self.root), str(REPO / "ops"), "silent",
            lambda pid: True, STAMP, jobs.dispatch_write, ident=implementation.REQUEST))
        batch = self.bound()
        batch["research_request"] = research.REQUEST
        self.save()
        with self.assertRaises(ValueError):
            implementation.ready(*self.args())

    def test_exact_task_authorization_and_ownership_reach_prepared_model_input(self):
        self.bound()
        self.git("worktree", "add", "-b", "fixed-worker", str(self.tree), self.base)
        path = Path(implementation.prepare(*self.args()))
        content = path.read_text()
        self.assertIn((self.root / self.request["work_spec"]).read_text(), content)
        self.assertIn("固定扩授权：实际代码实现", content)
        for ident in implementation.PROPOSALS:
            self.assertIn(ident, content)
        for file in implementation.WATCHER_FILES:
            self.assertIn(file, content)
        receipt = json.loads((self.state_dir / "learner" / (BATCH + ".implementation-input.json")).read_text())
        self.assertEqual(receipt["task_sha256"], implementation.digest(path.read_bytes()))
        self.assertEqual(receipt["status"], "input_prepared")
        self.assertIn("pending", receipt["model_delivery"])
        self.assertEqual(implementation.prepare(*self.args()), str(path))

    def test_normal_code_completion_is_accepted_without_pure_research_contract(self):
        batch = self.bound()
        self.git("worktree", "add", "-b", "fixed-worker", str(self.tree), self.base)
        implementation.prepare(*self.args())
        report = {"task": "strategy-proposal", "character": "silent", "batch": BATCH,
                  "request_id": implementation.REQUEST, "input_sha256": implementation.MANIFEST_SHA,
                  "work_spec_sha256": implementation.TASK_SHA, "fixes": [{"commit": self.base}],
                  "merged": self.base, "tests": {"tsc": 0, "vitest": 0, "cases": 1}}
        self.assertEqual(implementation.report_errors(report, batch, self.root), [])
        self.assertIsNone(proposals.research_proof(report, batch, str(self.root)))
        for key, value in (("research_complete", True), ("input_sha256", "0" * 64), ("request_id", research.REQUEST)):
            self.assertTrue(implementation.report_errors({**report, key: value}, batch, self.root))
        self.write("ops/codex-ops/learner/" + BATCH + ".out", "```json\n" + json.dumps(report) + "\n```\n")
        events = []
        with patch.object(checks.subprocess, "run", return_value=SimpleNamespace(returncode=0)), \
                patch.object(checks, "proposal_tools", return_value=SimpleNamespace(
                    links=lambda r, b, root, scripts: implementation.report_errors(r, b, root),
                    experience_audit=lambda *args: [], resolve=lambda *args: None)):
            checks.finish_write_batch(BATCH, batch, 0, str(self.root), str(self.state_dir / "learner"),
                                      lambda *args: events.append(args), lambda message: None, run_checks=False)
        self.assertEqual(batch["state"], "done")
        self.assertEqual(events[0][0], "strategy-done")
        self.assertEqual(self.old.read_bytes(), self.old_raw)
        self.assertEqual(self.state["batches"]["old-failure"]["rc"], 124)

    def test_manual_request_routes_once_and_blocks_unknown_identity(self):
        spec = importlib.util.spec_from_file_location("implementation_manual_ops", REPO / "ops/codex-ops-learn.py")
        ops = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ops)
        args = SimpleNamespace(task="strategy-proposal", character="silent", runs="", request=implementation.REQUEST)
        with patch.object(ops, "ROOT", str(self.root)), patch.object(ops, "SCRIPTS", str(REPO / "ops")), \
                patch.object(ops, "load_state", return_value=self.state), patch.object(ops, "save_state", side_effect=lambda state: self.save()), \
                patch.object(ops, "alive", return_value=True), patch.object(ops, "dispatch_write", jobs.dispatch_write), \
                patch.object(jobs, "start_learner", side_effect=self.launch):
            self.assertEqual(ops.cmd_write(args), 0)
            self.assertEqual(ops.cmd_write(args), 1)
            self.assertEqual(len(self.launches), 1)
            args.request = research.REQUEST
            self.assertEqual(ops.cmd_write(args), 1)

    def test_host_wrapper_supplies_bound_task_to_fake_launcher_and_finishes_normally(self):
        self.bound()
        # Copy only the host code used by this fixture. No real launcher or model is present.
        for relative in ("ops/codex-ops-learner.sh", "ops/paths.sh", "ops/proposal_dispatch.py",
                         "ops/strategy_research_jobs.py", "learner/code_proposals.py"):
            self.write(relative, (REPO / relative).read_bytes())
        source = (REPO / "ops/strategy_implementation_jobs.py").read_text()
        import re
        for name in ("TASK_SHA", "MANIFEST_SHA", "AUTH_SHA"):
            source = re.sub(name + r' = "[0-9a-f]{64}"', name + ' = "' + getattr(implementation, name) + '"', source)
        self.write("ops/strategy_implementation_jobs.py", source)
        self.write("ops/codex-ops-learn.py", "from pathlib import Path\nimport sys\nPath(__file__).with_name('finished.json').write_text(str(sys.argv[1:]))\n")
        fake = self.write("agent/node_modules/.bin/tsx", "#!/usr/bin/env python3\n"
            "import json,sys\nfrom pathlib import Path\n"
            "task=Path(sys.argv[sys.argv.index('--task')+1])\n"
            "Path(__file__).resolve().parents[3].joinpath('captured.json').write_text(json.dumps({'argv':sys.argv[1:],'task':task.read_text()}))\n")
        fake.chmod(0o755)
        result = subprocess.run(["bash", str(self.root / "ops/codex-ops-learner.sh"), BATCH, RUN, "silent",
                                 "strategy-proposal", str(self.tree), "strategy-proposal", implementation.REQUEST],
                                env={**os.environ, "CODEX_OPS_ROOT": str(self.root), "CODEX_OPS_DIR": str(self.state_dir),
                                     "CODEX_OPS_NO_DRAIN": "1", "LEARNER_CMD": "", "HERDR_HOST_LABEL": "",
                                     "LEARNER_CODEX_BIN": "/fixed/no-real-codex"},
                                capture_output=True, text=True, timeout=30)
        errors = self.state_dir / "learner" / (BATCH + ".err")
        self.assertEqual(result.returncode, 0, result.stderr + (errors.read_text() if errors.exists() else ""))
        captured = json.loads((self.root / "captured.json").read_text())
        self.assertIn("固定实现正文：只读取本角色证据。", captured["task"])
        self.assertIn("固定扩授权：实际代码实现", captured["task"])
        self.assertIn("batch=" + BATCH, captured["argv"])
        self.assertIn("merge=live", captured["argv"])
        self.assertIn("'--rc', '0'", (self.root / "ops/finished.json").read_text())
        registration = json.loads((self.state_dir / "learner" / (BATCH + ".implementation-registration.json")).read_text())
        self.assertEqual(registration["status"], "registered_bound")


if __name__ == "__main__":
    unittest.main()
