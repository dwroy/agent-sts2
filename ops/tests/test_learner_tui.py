"""Fixed persisted-session/output receipts; no live model or terminal is touched."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("learner_tui", Path(__file__).parents[1] / "learner_tui.py")
tui = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tui)


class CompletionGate(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.output = self.root / "batch.out"
        self.output.write_text('{"status":"done"}\n')
        self.native = self.root / "native.jsonl"
        self.rows = [
            {"type": "session_meta", "payload": {"id": "thread"}},
            {"type": "event_msg", "payload": {"type": "task_started", "turn_id": "turn"}},
            {"type": "event_msg", "payload": {"type": "task_complete", "turn_id": "turn", "last_agent_message": "report"}},
        ]
        self.native.write_text("".join(json.dumps(r) + "\n" for r in self.rows))
        self.log = self.root / "launch.jsonl"
        self.log.write_text(json.dumps({"type": "learner_summary", "exit_code": 0, "summary": {"sessionId": "thread"}}) + "\n")
        self.receipt = self.root / "receipt.json"
        self.value = {"state": "session-ended", "pid": os.getpid(), "birth": "older-process-birth",
                      "result": {"code": 0, "stopped": True, "session": "thread", "turn": "turn", "message": "report", "rollout": str(self.native)},
                      "artifacts": {"log": str(self.log), "sha256": hashlib.sha256(self.log.read_bytes()).hexdigest(), "summary": True}}
        self.save()

    def save(self):
        self.receipt.write_text(json.dumps(self.value))

    def test_persisted_native_and_output_gate(self):
        value = tui.verify(self.receipt, self.output)
        self.assertEqual(value["output"]["sha256"], tui.digest(self.output))
        self.assertFalse(value["artifacts"]["out_pending_wrapper_flush"])

    def test_zero_exit_alone_never_suffices(self):
        self.native.write_text("".join(json.dumps(r) + "\n" for r in self.rows[:-1]))
        with self.assertRaises(ValueError):
            tui.verify(self.receipt, self.output)

    def test_another_native_turn_after_completion_is_not_done(self):
        with self.native.open("a") as out:
            out.write(json.dumps({"type": "event_msg", "payload": {"type": "task_started", "turn_id": "other"}}) + "\n")
        with self.assertRaises(ValueError):
            tui.verify(self.receipt, self.output)

    def test_changed_original_log_or_missing_output_blocks_finish(self):
        self.log.write_text("changed")
        with self.assertRaises(ValueError):
            tui.verify(self.receipt, self.output)
        self.output.unlink()
        with self.assertRaises(ValueError):
            tui.verify(self.receipt, self.output)

    def test_active_native_pid_blocks_finish(self):
        self.value["birth"] = Path(f"/proc/{os.getpid()}/stat").read_text().rsplit(")", 1)[1].split()[19]
        self.save()
        with self.assertRaises(ValueError):
            tui.verify(self.receipt, self.output)

    def test_uncertain_retirement_blocks_finish(self):
        self.value["state"] = "needs-attention"
        self.save()
        with self.assertRaises(ValueError):
            tui.verify(self.receipt, self.output)

    def test_model_unavailable_remains_classified_without_starting(self):
        self.receipt.write_text(json.dumps({"state": "not-started", "models_started": 0, "result": {"code": 3}}))
        self.assertEqual(tui.verify(self.receipt, self.output)["result"]["code"], 3)

    def test_original_batch_finish_transaction_must_exist_before_close(self):
        state = self.root / "learn.json"
        state.write_text(json.dumps({"batches": {"batch": {"state": "running", "rc": 0}}}))
        with patch.object(tui.subprocess, "run") as run:
            with self.assertRaises(ValueError):
                tui.close(self.root, state, "batch", self.receipt, self.output)
            run.assert_not_called()

    def test_foreign_or_busy_pane_is_never_closed(self):
        state = self.root / "learn.json"
        state.write_text(json.dumps({"batches": {"batch": {"state": "done", "rc": 0}}}))
        self.value.update(pane="w1:p2", label="learner-batch", identity={"pane_id": "w1:p2", "label": "learner-batch", "tab_id": "w1:t2", "terminal_id": "t"})
        self.save()
        for changed in (True, False):
            info = dict(self.value["identity"], label="foreign") if changed else self.value["identity"]
            with patch.object(tui.subprocess, "check_output", side_effect=[json.dumps({"result": {"pane": info}}).encode(), json.dumps({"result": {"process_info": {"shell_pid": 1, "foreground_process_group_id": 2}}}).encode()]), patch.object(tui.subprocess, "run") as run:
                with self.assertRaises(ValueError):
                    tui.close(self.root, state, "batch", self.receipt, self.output)
                run.assert_not_called()

    def test_only_verified_successful_idle_pane_closes(self):
        state = self.root / "learn.json"
        state.write_text(json.dumps({"batches": {"batch": {"state": "done", "rc": 0}}}))
        self.value.update(pane="w1:p2", label="learner-batch", identity={"pane_id": "w1:p2", "label": "learner-batch", "tab_id": "w1:t2", "terminal_id": "t"})
        self.save()
        with patch.object(tui.subprocess, "check_output", side_effect=[json.dumps({"result": {"pane": self.value["identity"]}}).encode(), json.dumps({"result": {"process_info": {"shell_pid": 1, "foreground_process_group_id": 1}}}).encode()]), patch.object(tui.subprocess, "run") as run:
            self.assertEqual(tui.main(["close", str(self.root), str(state), "batch", str(self.receipt), str(self.output)]), 0)
            self.assertEqual(run.call_args.args[0][-1], "--require-idle")


class HostedLaunch(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.state = self.root / "ops/codex-ops"
        self.state.mkdir(parents=True)
        spec = importlib.util.spec_from_file_location("learner_jobs", Path(__file__).parents[1] / "learner_jobs.py")
        self.jobs = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.jobs)

    def test_detached_supervisor_owns_pid_and_interactive_pane_has_no_auto_close_wrapper(self):
        with patch.dict(os.environ, {"CODEX_OPS_LEARNER_HOST": "herdr", "LEARNER_HERDR_PANE": "old:pane"}, clear=True), patch.object(self.jobs.subprocess, "run", return_value=type("R", (), {"returncode": 0, "stdout": "w1:p2\n"})()) as command, patch.object(self.jobs.subprocess, "Popen") as spawn:
            spawn.return_value.pid = 34567
            self.assertEqual(self.jobs.start_learner(["bash", "batch.sh"], str(self.root), str(self.root / "ops"), str(self.state), "learner-batch"), (34567, "w1:p2"))
            self.assertIn("open-pane", command.call_args.args[0])
            self.assertNotIn("--close-on-exit", command.call_args.args[0])
            self.assertEqual(spawn.call_args.kwargs["env"]["LEARNER_HERDR_PANE"], "w1:p2")
            self.assertTrue(spawn.call_args.kwargs["start_new_session"])
            self.assertEqual(spawn.call_args.args[0][:3], ["nice", "-n", "19"])
            self.assertEqual((self.state / "learner/learner-batch.pid").read_text(), "34567\n")

    def test_busy_pane_never_falls_back_to_another_model(self):
        with patch.dict(os.environ, {"CODEX_OPS_LEARNER_HOST": "herdr"}, clear=True), patch.object(self.jobs.subprocess, "run", return_value=type("R", (), {"returncode": 4, "stdout": ""})()), patch.object(self.jobs.subprocess, "Popen") as spawn:
            with self.assertRaises(RuntimeError):
                self.jobs.start_learner(["bash", "batch.sh"], str(self.root), str(self.root / "ops"), str(self.state), "learner-batch")
            spawn.assert_not_called()

    def test_headless_fallback_does_not_inherit_an_old_batch_transport(self):
        with patch.dict(os.environ, {"CODEX_OPS_LEARNER_HOST": "setsid", "LEARNER_HERDR_PANE": "old:pane", "LEARNER_TUI_RECEIPT": "old.json"}, clear=True), patch.object(self.jobs.subprocess, "Popen") as spawn:
            spawn.return_value.pid = 34567
            self.jobs.start_learner(["bash", "batch.sh"], str(self.root), str(self.root / "ops"), str(self.state), "learner-batch")
            self.assertNotIn("LEARNER_HERDR_PANE", spawn.call_args.kwargs["env"])
            self.assertNotIn("LEARNER_TUI_RECEIPT", spawn.call_args.kwargs["env"])


if __name__ == "__main__":
    unittest.main()
