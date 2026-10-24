"""Isolated completion callback controls; no production database or source publication."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("knowledge_runtime", Path(__file__).parents[1] / "knowledge_runtime.py")
runtime = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runtime)
AUDIT = runtime.audit_proposals


class CompletionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.tree = self.root / ".worktrees/candidate"
        self.path = self.tree / "learner/runs/fixed/knowledge-candidate.json"
        self.path.parent.mkdir(parents=True)
        self.path.write_text(json.dumps({"id": "fixed", "character": "silent"}))
        self.batch = {"worktree": str(self.tree), "character": "silent"}
        self.report = {"task": "experience-update", "knowledge_candidate": str(self.path), "base": "a" * 40,
                       "commit": None, "merged": None, "implementation_domains": []}
        self.events, self.inbox = [], []
        auditor = patch.object(runtime, "audit_proposals")
        self.addCleanup(auditor.stop)
        auditor.start()

    def finish(self):
        return runtime.complete("fixed", self.batch, self.report, 0, str(self.root),
                                lambda *event: self.events.append(event), self.inbox.append)

    @patch.dict("os.environ", {"STS2_KNOWLEDGE_RUNTIME": "/isolated/runtime"})
    def test_success_uses_only_runtime_publication_and_keeps_readback_pending(self):
        receipt = {"candidate": "fixed", "version": "K1-" + "b" * 64}
        with patch.object(runtime.subprocess, "run", side_effect=[
            subprocess.CompletedProcess([], 0, stdout=""),
            subprocess.CompletedProcess([], 0, stdout="a" * 40),
            subprocess.CompletedProcess([], 0, stdout="a" * 40),
            subprocess.CompletedProcess([], 0, stdout=json.dumps(receipt))]) as run:
            self.assertTrue(self.finish())
            self.assertEqual(self.batch["state"], "done")
            self.assertFalse(self.batch["checks_pending"])
            self.assertIn("complete", run.call_args.args[0])
            self.assertNotIn("merge", " ".join(run.call_args.args[0]))
            self.assertEqual(self.events[0][0], "knowledge-done")
            self.assertIn("待生产工具读回", self.events[0][1])
            self.assertEqual(self.inbox, [])

    @patch.dict("os.environ", {"STS2_KNOWLEDGE_RUNTIME": "/isolated/runtime"})
    def test_source_changes_cannot_bypass_original_delivery(self):
        with patch.object(runtime.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, stdout=" M agent/src/fixed.ts\n")) as run:
            self.finish()
            self.assertEqual(run.call_count, 1)
            self.assertEqual(self.batch["state"], "awaiting_review")
            self.assertTrue(self.batch["knowledge_pending"])
            self.assertEqual(self.events, [])

    @patch.dict("os.environ", {"STS2_KNOWLEDGE_RUNTIME": "/isolated/runtime"})
    def test_timeout_preserves_same_candidate_for_database_reconciliation(self):
        with patch.object(runtime.subprocess, "run", side_effect=[
            subprocess.CompletedProcess([], 0, stdout=""),
            subprocess.CompletedProcess([], 0, stdout="a" * 40),
            subprocess.CompletedProcess([], 0, stdout="a" * 40), subprocess.TimeoutExpired(["node"], 120)]):
            self.finish()
            self.assertTrue(self.path.is_file())
            self.assertTrue(self.batch["knowledge_pending"])
            self.assertIn("同一ID查实际结果", self.inbox[0])

    def test_legacy_output_uses_original_pipeline_and_invalid_identity_is_preserved(self):
        self.assertFalse(runtime.complete("fixed", {}, {}, 0, str(self.root), self.events.append, self.inbox.append))
        self.report["commit"] = "c" * 40
        with patch.object(runtime.subprocess, "run") as run:
            self.assertTrue(self.finish())
            run.assert_not_called()
            self.assertEqual(self.batch["state"], "awaiting_review")

    def test_gameplay_experience_still_requires_existing_evidence_code_proposal(self):
        entry = {"id": "isolated-unregistered", "scope": "general:deck", "status": "active", "evidence": ["FIXTURE00001"], "lesson": "格式夹具"}
        root = Path(__file__).parents[2]
        with self.assertRaisesRegex(ValueError, "proposal chain"):
            AUDIT({"code_proposals": [], "implementation_domains": []}, {"character": "silent"},
                  {"files": {"characters/silent/experience.json": json.dumps({"entries": [entry]})}}, {}, str(root))

    def test_new_run_gets_unique_key_and_restart_recovers_exact_binding(self):
        log = self.root / "run-config.jsonl"
        key = runtime.run_key("MAIN_MENU", "", "fixed-session", log)
        self.assertEqual(key, "launch:fixed-session")
        log.write_text(json.dumps({"run_id": "FIXTURE00001", "knowledge": {"runtime_version": "K1-" + "c" * 64, "runtime_binding": key}}) + "\n")
        self.assertEqual(runtime.run_key("MAP", "FIXTURE00001", "different-session", log), key)
        with self.assertRaises(ValueError):
            runtime.run_key("MAP", "MISSING00001", "different-session", log)
        with self.assertRaises(ValueError):
            runtime.run_key("UNKNOWN", "", "different-session", log)


if __name__ == "__main__":
    unittest.main()
