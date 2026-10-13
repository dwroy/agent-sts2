"""Fixed scheduler completion cases; never launch learners or touch live state."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import mock_open, patch


OPS = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("postmortem_learn", OPS / "codex-ops-learn.py")
learn = importlib.util.module_from_spec(spec)
spec.loader.exec_module(learn)
lib = learn.proposal_dispatch.library(str(OPS))
RUNS = ["V4BTVFPS9XHV", "3DW2DM7EY22W"]
BATCH = "20261013-144301"


class PostmortemCompletionTests(unittest.TestCase):
    def finish(self, rc, done=(), report=None, attempts=1):
        batch = {"state": "running", "character": "silent", "runs": RUNS[:],
                 "proposal_policy": "Roy-2026-10-07-learning"}
        history = {"state": "failed", "rc": 1,
                   "proposal_audit_errors": ["missing string code_proposals array"]}
        state = {"batches": {BATCH: batch, "old-failure": history.copy()},
                 "runs": {run: {"attempts": attempts} for run in RUNS}}
        events, notices = [], []
        with patch.object(learn, "load_state", return_value=state), \
                patch.object(learn, "save_state"), \
                patch.object(learn, "postmortem_ids", return_value=set(done)), \
                patch.object(learn, "read_report", return_value=report or {}), \
                patch.object(learn, "now_local", return_value="fixed-completion"), \
                patch.object(learn.time, "time", return_value=1000), \
                patch.object(learn, "enqueue", side_effect=lambda k, v: events.append((k, v))), \
                patch.object(learn, "inbox", side_effect=notices.append), \
                patch.object(learn, "ledger_lines", return_value=[]), \
                patch.object(learn, "account_draining", return_value=True), \
                patch.object(learn.proposal_dispatch, "library", return_value=lib), \
                patch.object(lib, "fold", return_value={}), \
                patch.object(learn.proposal_dispatch, "links", wraps=learn.proposal_dispatch.links) as audit, \
                patch("builtins.open", mock_open(read_data="Selected model is at capacity")), \
                patch("builtins.print"):
            self.assertEqual(learn.cmd_finish(SimpleNamespace(batch=BATCH, rc=rc, character="silent")), 0)
        self.assertEqual(state["batches"]["old-failure"], history)
        return state, batch, events, notices, audit.call_count

    def test_failed_attempt_without_output_does_not_create_proposal_repair(self):
        for rc in (1, 3, 124):
            with self.subTest(rc=rc):
                state, batch, events, notices, calls = self.finish(rc)
                self.assertEqual(batch["state"], "failed")
                self.assertEqual(batch["rc"], rc)
                self.assertEqual(batch["done"], [])
                self.assertEqual(batch["missing"], RUNS)
                self.assertEqual(batch["proposal_audit_errors"], [])
                self.assertTrue(batch["proposal_audit_skipped"])
                self.assertNotIn("proposal_repairs", state)
                self.assertEqual(calls, 0)
                self.assertEqual(notices, [])
                self.assertEqual([k for k, _ in events], ["learner-done"])
                self.assertIn("代码提案链：未运行", events[0][1])
                for run in RUNS:
                    self.assertEqual(state["runs"][run], {"attempts": 1, "retry_at": 4600})

    def test_exhausted_failed_attempt_keeps_original_retry_limit(self):
        state, _, _, _, _ = self.finish(1, attempts=3)
        self.assertNotIn("proposal_repairs", state)
        for run in RUNS:
            self.assertEqual(state["runs"][run], {"attempts": 3})

    def test_failed_attempt_with_preserved_partial_postmortem_still_repairs_links(self):
        state, batch, _, notices, calls = self.finish(1, done=RUNS[:1])
        self.assertFalse(batch["proposal_audit_skipped"])
        self.assertEqual(calls, 1)
        self.assertTrue(batch["proposal_audit_errors"])
        self.assertEqual(state["proposal_repairs"][BATCH]["runs"], RUNS[:1])
        self.assertEqual(state["proposal_repairs"][BATCH]["state"], "pending")
        self.assertEqual(len(notices), 1)
        self.assertNotIn("retry_at", state["runs"][RUNS[0]])
        self.assertEqual(state["runs"][RUNS[1]]["retry_at"], 4600)

    def test_nonzero_attempt_with_report_still_checks_proposal_contract(self):
        _, batch, _, notices, calls = self.finish(1, report={"task": "postmortem"})
        self.assertFalse(batch["proposal_audit_skipped"])
        self.assertEqual(calls, 1)
        self.assertTrue(batch["proposal_audit_errors"])
        self.assertEqual(len(notices), 1)

    def test_zero_exit_without_report_does_not_bypass_audit(self):
        state, batch, _, notices, calls = self.finish(0, done=RUNS)
        self.assertEqual(batch["state"], "failed")
        self.assertFalse(batch["proposal_audit_skipped"])
        self.assertEqual(calls, 1)
        self.assertIn(BATCH, state["proposal_repairs"])
        self.assertEqual(len(notices), 1)

    def test_complete_report_with_valid_empty_links_is_done(self):
        report = {"task": "postmortem", "code_proposals": [], "implementation_domains": []}
        state, batch, _, notices, calls = self.finish(0, done=RUNS, report=report)
        self.assertEqual(batch["state"], "done")
        self.assertFalse(batch["proposal_audit_skipped"])
        self.assertEqual(calls, 1)
        self.assertEqual(batch["proposal_audit_errors"], [])
        self.assertNotIn("proposal_repairs", state)
        self.assertEqual(notices, [])


if __name__ == "__main__":
    unittest.main()
