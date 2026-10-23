"""Explicit same-native completion recovery, using fixed records and an injected terminal."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ops"))
SPEC = importlib.util.spec_from_file_location("recovery_tui", ROOT / "ops/learner_tui.py")
tui = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tui)
FIXTURE = json.loads((ROOT / "agent/tests/fixtures/learner-midnight.json").read_text())


class CompletedRecovery(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.directory = self.root / "ops/codex-ops"
        (self.directory / "learner").mkdir(parents=True)
        self.batch = "20261023-234301"
        self.receipt = copy.deepcopy(FIXTURE["receipt"])
        self.receipt.update(pid=99999998, birth="123456", retirement_authorized=False,
                            identity=dict(pane_id="w1:p2", workspace_id="w1", tab_id="w1:t2", terminal_id="original-terminal"))
        self.native = self.root / "sessions/native.jsonl"
        self.native.parent.mkdir()
        self.native.write_text("".join(json.dumps(row) + "\n" for row in FIXTURE["rows"]))
        self.receipt.update(rollout=str(self.native))
        self.receipt["result"].update(code=75, message="", rollout=str(self.native), stopped=False)
        self.receipt.pop("native_environment_version"); self.receipt.pop("native_environment_updates")
        self.path = self.directory / "learner" / (self.receipt["label"] + ".tui.json")
        self.path.write_text(json.dumps(self.receipt))
        self.sha = tui.digest(self.path)
        self.output = self.directory / "learner" / (self.batch + ".out")
        self.output.write_text("original failed output\n")
        self.old_output = self.output.read_bytes()
        self.state = self.directory / "learn.json"
        self.row = dict(state="lost", pid=99999997, pane="w1:p2", worktree=self.receipt["cwd"], runs=["fixed"], key="original-key")
        self.state.write_text(json.dumps(dict(batches={self.batch: self.row})))
        self.live, self.clock, self.calls, self.stages = True, 0, [], []

    def birth(self, pid):
        return self.receipt["birth"] if pid == self.receipt["pid"] and self.live else None

    def h(self, args):
        self.calls.append(args)
        if args[:2] == ["pane", "get"]:
            return dict(pane=dict(self.receipt["identity"]))
        if args[:2] == ["pane", "process-info"]:
            return dict(process_info=dict(shell_pid=123, foreground_process_group_id=self.receipt["pid"] if self.live else 123))
        if args[:2] == ["agent", "get"]:
            return dict(agent=dict(agent="codex", name=self.receipt["agent_name"], pane_id="w1:p2", foreground_cwd=self.receipt["cwd"], agent_status="idle"))
        if args[:2] == ["pane", "read"]:
            return "header\n› \x1b[2mAsk Codex to do anything\x1b[0m\n"
        if args[:2] == ["agent", "send-keys"]:
            self.assertEqual(args, ["agent", "send-keys", "w1:p2", "ctrl+c"])
            self.live = False
            return {}
        self.fail("unexpected model or terminal action")

    def finish(self, stage, argv):
        self.stages.append(stage)
        if stage == "finish":
            # Native rc0 must not turn a semantic failure into done.
            value = json.loads(self.state.read_text())
            value["batches"][self.batch].update(state="failed", rc=0, finished="fixed-finish", acceptance_errors=["fixed semantic failure"])
            self.state.write_text(json.dumps(value))
        else:
            self.assertEqual(stage, "finished")
            with patch.object(tui.os, "getppid", return_value=os.getpid()):
                tui.finished(*argv[1:])

    def pause(self, seconds):
        self.clock += seconds

    def recover(self, apply=True, h=None, birth=None, finish=None):
        return tui.recover_completed(self.root, self.directory, self.batch, self.sha, apply=apply,
                                     h=h or self.h, birth_fn=birth or self.birth, finish_runner=finish or self.finish,
                                     clock=lambda: self.clock, pause=self.pause)

    def test_default_is_readonly_preflight(self):
        state = self.state.read_bytes()
        self.assertEqual(self.recover(False)["state"], "eligible-for-identity-check")
        self.assertEqual(self.calls, [])
        self.assertEqual(tui.digest(self.path), self.sha)
        self.assertEqual(self.state.read_bytes(), state)

    def test_new_supervisor_epoch_preserves_original75_and_semantic_failure(self):
        report = self.recover()
        self.assertEqual(report["state"], "finished")
        self.assertEqual(report["batch_state"], "failed")
        archive = Path(report["archive"])
        self.assertEqual(tui.digest(archive / "original.tui.json"), self.sha)
        self.assertEqual(json.loads((archive / "original.tui.json").read_text())["result"]["code"], 75)
        self.assertEqual((archive / "original.out").read_bytes(), self.old_output)
        self.assertTrue(self.output.read_bytes().startswith(self.old_output))
        result = json.loads(self.path.read_text())
        self.assertEqual(result["bindings"], self.receipt["bindings"])
        self.assertEqual(result["result"]["code"], 0)
        self.assertTrue(result["result"]["stopped"])
        self.assertEqual(result["native_environment_updates"], [FIXTURE["proof"]])
        self.assertEqual(result["wrapper"]["state"], "failed")
        self.assertEqual(self.stages, ["finish", "finished"])
        self.assertEqual(len([call for call in self.calls if call[:2] == ["agent", "send-keys"]]), 1)

    def test_live_original_supervisor_blocks_takeover(self):
        with self.assertRaises(ValueError):
            self.recover(birth=lambda pid: "still-alive")
        self.assertEqual(self.calls, [])
        self.assertEqual(tui.digest(self.path), self.sha)

    def test_pending_human_input_prevents_every_key_and_preserves_old_failure(self):
        def h(args):
            return "› Human draft not sent" if args[:2] == ["pane", "read"] else self.h(args)
        with self.assertRaises(ValueError):
            self.recover(h=h)
        self.assertFalse(any(call[:2] == ["agent", "send-keys"] for call in self.calls))
        self.assertEqual(tui.digest(self.path), self.sha)
        self.assertEqual(json.loads(self.state.read_text())["batches"][self.batch]["state"], "awaiting_review")

    def test_foreign_native_input_blocks_before_registration_or_control(self):
        self.native.write_text(self.native.read_text() + json.dumps(dict(type="event_msg", payload=dict(type="task_started", turn_id="human"))) + "\n")
        before = self.state.read_bytes()
        with self.assertRaises(ValueError):
            self.recover()
        self.assertEqual(self.calls, [])
        self.assertEqual(self.state.read_bytes(), before)

    def test_unacknowledged_exit_cannot_publish_success_or_finish(self):
        def h(args):
            if args[:2] == ["agent", "send-keys"]:
                self.calls.append(args)
                raise ValueError("acknowledgement lost")
            return self.h(args)
        with self.assertRaises(ValueError):
            self.recover(h=h)
        self.assertEqual(tui.digest(self.path), self.sha)
        self.assertEqual(self.stages, [])
        self.assertEqual(json.loads(self.state.read_text())["batches"][self.batch]["state"], "awaiting_review")

    def test_identity_change_blocks_control(self):
        for kind in ("pane", "agent", "process", "pid-reuse", "queued"):
            with self.subTest(kind=kind):
                # Each refusal creates a retained transaction, so use a fresh fixture.
                self.setUp()
                def h(args):
                    result = self.h(args)
                    if kind == "pane" and args[:2] == ["pane", "get"]: result["pane"]["terminal_id"] = "foreign"
                    if kind == "agent" and args[:2] == ["agent", "get"]: result["agent"]["name"] = "foreign"
                    if kind == "process" and args[:2] == ["pane", "process-info"]: result["process_info"]["foreground_process_group_id"] = 999
                    if kind == "queued" and args[:2] == ["pane", "read"]: result = "Queued follow-up inputs\n› \x1b[2mAsk Codex\x1b[0m"
                    return result
                with self.assertRaises(ValueError):
                    self.recover(h=h, birth=(lambda pid: "reused" if pid == self.receipt["pid"] else None) if kind == "pid-reuse" else None)
                self.assertFalse(any(call[:2] == ["agent", "send-keys"] for call in self.calls))
                self.assertEqual(tui.digest(self.path), self.sha)

    def test_finish_failure_keeps_retirement_evidence_but_cannot_claim_wrapper_completion(self):
        with self.assertRaises(ValueError):
            self.recover(finish=lambda stage, argv: (_ for _ in ()).throw(ValueError("finish unavailable")))
        state = json.loads(self.state.read_text())["batches"][self.batch]
        self.assertEqual(state["state"], "awaiting_review")
        self.assertEqual(state["review_required"], "tui-recovery-unverified")
        archive = Path(state["tui_recovery"]["archive"])
        self.assertEqual(tui.digest(archive / "original.tui.json"), self.sha)
        fresh = json.loads(self.path.read_text())
        self.assertTrue(fresh["result"]["stopped"])
        self.assertNotIn("wrapper", fresh)

    def test_uncertain_retirement_never_replays_or_reclaims(self):
        def h(args):
            if args[:2] == ["agent", "send-keys"]:
                self.calls.append(args)
                return {}
            return self.h(args)
        with self.assertRaises(ValueError):
            self.recover(h=h)
        self.assertEqual(tui.digest(self.path), self.sha)
        self.assertEqual(self.stages, [])
        self.assertFalse(any("prompt" in call or "close" in call for call in self.calls))

    def test_armed_deferral_waits_for_the_original_recovery_owner_then_freezes_before_lost(self):
        value = dict(self.row, state="running", pid=os.getpid(), external_source="keep-original-source")
        guard = dict(batch=self.batch, wait_for_owner_exit=True, at="fixed", supervisor=dict(pid=os.getpid(), birth=tui.process_birth(os.getpid())),
                     registration=copy.deepcopy(value))
        tui.persist(self.directory / "learner/armed.verification-deferred.json", guard)
        state = dict(batches={self.batch: value})
        self.assertFalse(tui.apply_deferrals(state, self.directory))
        with patch.object(tui, "process_birth", return_value=None):
            self.assertTrue(tui.apply_deferrals(state, self.directory))
        self.assertEqual(value["state"], "awaiting_review")
        self.assertEqual(value["external_source"], "keep-original-source")
        self.assertTrue(list((self.directory / "queue").glob("*.md")))


if __name__ == "__main__":
    unittest.main()
