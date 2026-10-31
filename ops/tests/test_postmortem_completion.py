"""Fixed scheduler completion cases; never launch learners or touch live state."""
import importlib.util
import copy
import hashlib
import json
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
    def finish(self, rc, done=(), report=None, attempts=1, receipt=None, output_bytes=0):
        batch = {"state": "running", "character": "silent", "runs": RUNS[:],
                 "proposal_policy": "Roy-2026-10-07-learning"}
        history = {"state": "failed", "rc": 1,
                   "proposal_audit_errors": ["missing string code_proposals array"]}
        state = {"batches": {BATCH: batch, "old-failure": history.copy()},
                 "runs": {run: {"attempts": attempts} for run in RUNS}}
        events, notices = [], []
        with patch.object(learn, "load_state", return_value=state), \
                patch.object(learn, "ROOT", "/fixture"), \
                patch.object(learn, "DIR", "/fixture/ops/codex-ops"), \
                patch.object(learn.os, "stat", return_value=SimpleNamespace(st_size=output_bytes)), \
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
                patch("builtins.open", mock_open(read_data=json.dumps(receipt) if receipt is not None else "Selected model is at capacity")), \
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

    def refusal_receipt(self):
        # Fixed 214311 receipt shape; no production state, credentials or model calls.
        return {"schema": "learner-tui-v1", "label": f"learner-{BATCH}-postmortem", "cwd": "/fixture",
                "state": "not-started", "models_started": 0, "submitted": False,
                "submissions": [], "bindings": [], "retirement_authorized": True,
                "result": {"code": 3, "reason": "ops-authorized-registration-timeout-before-model", "stopped": True},
                "output": {"path": f"/fixture/ops/codex-ops/learner/{BATCH}.out", "sha256": hashlib.sha256(b"").hexdigest()}}

    def test_exit_three_displays_bound_registration_refusal_and_preserves_failure(self):
        state, batch, events, notices, calls = self.finish(3, receipt=self.refusal_receipt())
        text = events[0][1]
        self.assertIn("exit 3（登记锁等待超时；已核未启动模型（not-started））", text)
        self.assertNotIn("key 隔离自检没过", text)
        self.assertIn("本次完成时的重试快照", text)
        self.assertIn("后续以当前 learn.json 的授权处置为准", text)
        self.assertEqual((batch["state"], batch["rc"], calls, notices), ("failed", 3, 0, []))
        for run in RUNS:
            self.assertEqual(state["runs"][run], {"attempts": 1, "retry_at": 4600})

    def test_unknown_exit_three_does_not_claim_key_or_engine_failure(self):
        for receipt in (None, [], {}, {"result": None}):
            with self.subTest(receipt=receipt):
                _, _, events, _, _ = self.finish(3, receipt=receipt)
                self.assertIn("启动前检查或准入失败，具体原因待核", events[0][1])
                self.assertNotIn("key 隔离自检没过", events[0][1])
                self.assertNotIn("codex 不可用", events[0][1])

    def test_foreign_or_unverified_receipt_cannot_supply_the_cause(self):
        for changes in ({"label": "learner-other-postmortem"}, {"cwd": "/foreign"},
                        {"schema": "unknown"}, {"submitted": True}, {"models_started": 1},
                        {"state": "session-ended"}, {"retirement_authorized": False},
                        {"bindings": [{"turn_id": "other"}]}, {"pid": 123},
                        {"output": {"path": "/foreign", "sha256": hashlib.sha256(b"").hexdigest()}},
                        {"output": {"path": f"/fixture/ops/codex-ops/learner/{BATCH}.out", "sha256": "0" * 64}},
                        {"result": {"code": 1, "reason": "ops-authorized-registration-timeout-before-model", "stopped": True}},
                        {"result": {"code": 3, "reason": "ops-authorized-registration-timeout-before-model", "stopped": False}},
                        {"result": {"code": 3, "reason": "unknown-refusal", "stopped": True}},
                        {"result": {"code": 3, "reason": "ops-authorized-registration-timeout-before-model", "stopped": True, "session": "other"}}):
            with self.subTest(changes=changes):
                receipt = dict(copy.deepcopy(self.refusal_receipt()), **changes)
                _, _, events, _, _ = self.finish(3, receipt=receipt)
                self.assertIn("具体原因待核", events[0][1])
                self.assertNotIn("已核未启动模型", events[0][1])
        _, _, events, _, _ = self.finish(3, receipt=self.refusal_receipt(), output_bytes=1)
        self.assertNotIn("已核未启动模型", events[0][1])

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
