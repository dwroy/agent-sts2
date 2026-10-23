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
            {"type": "session_meta", "payload": {"id": "thread", "cwd": str(self.root)}},
            {"type": "event_msg", "payload": {"type": "task_started", "turn_id": "turn"}},
            {"type": "event_msg", "payload": {"type": "user_message", "message": "marker\noriginal task"}},
            {"type": "event_msg", "payload": {"type": "task_complete", "turn_id": "turn", "last_agent_message": "report"}},
        ]
        self.native.write_text("".join(json.dumps(r) + "\n" for r in self.rows))
        self.log = self.root / "launch.jsonl"
        self.log.write_text(json.dumps({"type": "learner_summary", "exit_code": 0, "summary": {"sessionId": "thread"}}) + "\n")
        self.receipt = self.root / "receipt.json"
        self.value = {"state": "session-ended", "retirement_authorized": True, "submitted": True, "cwd": str(self.root),
                      "submissions": [{"marker": "marker", "prompt_sha256": tui.prompt_hash("marker\noriginal task")}],
                      "bindings": [{"turn_id": "turn", "marker": "marker", "prompt_sha256": tui.prompt_hash("marker\noriginal task")}], "pid": os.getpid(), "birth": "older-process-birth",
                      "result": {"code": 0, "stopped": True, "session": "thread", "turn": "turn", "message": "report", "rollout": str(self.native)},
                      "artifacts": {"log": str(self.log), "sha256": hashlib.sha256(self.log.read_bytes()).hexdigest(), "summary": True}}
        self.save()

    def save(self):
        self.receipt.write_text(json.dumps(self.value))

    def test_persisted_native_and_output_gate(self):
        value = tui.verify(self.receipt, self.output)
        self.assertEqual(value["output"]["sha256"], tui.digest(self.output))
        self.assertFalse(value["artifacts"]["out_pending_wrapper_flush"])

    def test_bounded_agent_name_stays_bound_to_full_label_pane_and_cwd(self):
        self.value.update(label="learner-20261023-021302-s2-strategy-proposal", pane="w1:p2", agent_name_version=1)
        binding = json.dumps([self.value["label"], self.value["pane"], str(self.root)], ensure_ascii=False, separators=(",", ":"))
        self.value["agent_name"] = "learner-" + hashlib.sha256(binding.encode()).hexdigest()[:24]
        self.save()
        self.assertEqual(tui.verify(self.receipt, self.output)["agent_name"], self.value["agent_name"])
        for key, changed in (("label", "learner-other"), ("pane", "w1:p3"), ("cwd", "/foreign"),
                             ("agent_name", "learner-foreign"), ("agent_name_version", 2)):
            with self.subTest(key=key):
                bad = dict(self.value, **{key: changed})
                self.receipt.write_text(json.dumps(bad))
                with self.assertRaisesRegex(ValueError, "native agent name"):
                    tui.verify(self.receipt, self.output)

    def test_name_contract_matches_typescript_with_non_ascii_cwd(self):
        self.value.update(label="learner-20261023-021302-strategy-proposal", pane="w1:p2", cwd="/fixture/中文",
                          agent_name="learner-8f55a5ad47c4b2bb40b86574", agent_name_version=1,
                          state="not-started", models_started=0, result={"code": 3})
        self.save()
        self.assertEqual(tui.verify(self.receipt, self.output)["agent_name"], self.value["agent_name"])

    def bootstrap_rows(self):
        cwd = str(self.root)
        content = [{"type": "input_text", "text": f"# AGENTS.md instructions for {cwd}\n\n<INSTRUCTIONS>\nFixed project instructions.\n</INSTRUCTIONS>"},
                   {"type": "input_text", "text": f"<environment_context>\n  <cwd>{cwd}</cwd>\n  <shell>bash</shell>\n</environment_context>"}]
        prelude = {"type": "response_item", "payload": {"type": "message", "role": "user", "content": content}}
        context = {"type": "turn_context", "payload": {"turn_id": "turn", "cwd": cwd}}
        self.value.update(native_context_version=1, native_preludes=[{
            "turn_id": "turn", "cwd": cwd, "sha256": tui.prompt_hash("\n".join(part["text"] for part in content))}])
        return self.rows[:2] + [prelude, context] + self.rows[2:]

    def test_real_bootstrap_order_requires_context_before_the_exact_prompt(self):
        rows = self.bootstrap_rows()
        self.native.write_text("".join(json.dumps(r) + "\n" for r in rows))
        self.save()
        self.assertEqual(tui.verify(self.receipt, self.output)["native_preludes"], self.value["native_preludes"])

    def test_bootstrap_proof_is_independently_reconstructed(self):
        rows = self.bootstrap_rows()
        self.native.write_text("".join(json.dumps(r) + "\n" for r in rows))
        for changes in ({"native_context_version": 2}, {"native_preludes": []},
                        {"native_preludes": [{"turn_id": "turn", "cwd": str(self.root), "sha256": "0" * 64}]}):
            with self.subTest(changes=changes):
                self.receipt.write_text(json.dumps(dict(self.value, **changes)))
                with self.assertRaisesRegex(ValueError, "bootstrap proof"):
                    tui.verify(self.receipt, self.output)

    def test_unknown_or_misordered_bootstrap_cannot_hide_human_input(self):
        for kind in ("unknown", "wrong-cwd", "wrong-context-turn", "wrong-context-cwd", "no-context",
                     "event-user", "duplicate", "extra-part", "after-context", "after-prompt", "tool-before-prompt"):
            with self.subTest(kind=kind):
                rows = self.bootstrap_rows()
                if kind == "unknown": rows[2]["payload"]["content"] = [{"type": "input_text", "text": "Human task"}]
                if kind == "wrong-cwd": rows[2]["payload"]["content"][1]["text"] = "<environment_context>\n  <cwd>/foreign</cwd>\n</environment_context>"
                if kind == "wrong-context-turn": rows[3]["payload"]["turn_id"] = "foreign"
                if kind == "wrong-context-cwd": rows[3]["payload"]["cwd"] = "/foreign"
                if kind == "no-context": rows.pop(3)
                if kind == "event-user": rows[2] = {"type": "event_msg", "payload": {"type": "user_message", "message": "\n".join(p["text"] for p in rows[2]["payload"]["content"])}}
                if kind == "duplicate": rows.insert(3, rows[2])
                if kind == "extra-part": rows[2]["payload"]["content"].append({"type": "input_text", "text": "Human task"})
                if kind == "after-context": rows[2], rows[3] = rows[3], rows[2]
                if kind == "after-prompt": rows.insert(-1, rows[2])
                if kind == "tool-before-prompt": rows.insert(3, {"type": "response_item", "payload": {"type": "function_call", "name": "unexpected"}})
                self.native.write_text("".join(json.dumps(r) + "\n" for r in rows))
                self.save()
                with self.assertRaises(ValueError):
                    tui.verify(self.receipt, self.output)

    def unbound_activities(self):
        return [{"type": "response_item", "payload": payload} for payload in (
            {"type": "function_call", "name": "foreign"}, {"type": "custom_tool_call", "name": "foreign"},
            {"type": "local_shell_call", "call_id": "foreign"},
            {"type": "function_call_output", "output": "Earlier result"},
            {"type": "custom_tool_call_output", "output": "Earlier result"}, {"type": "reasoning", "summary": []},
            {"type": "message", "role": "assistant", "content": [{"type": "output_text", "text": "Earlier answer"}]})]

    def test_entire_unbound_window_rejects_activity_even_before_any_prelude(self):
        original = json.dumps(self.value)
        for activity in self.unbound_activities():
            for position in ("before-prelude", "after-prelude", "after-context", "no-prelude",
                             "continuation-before-context", "continuation-after-context"):
                with self.subTest(activity=activity["payload"]["type"], position=position):
                    self.value = json.loads(original)
                    rows = self.bootstrap_rows()
                    if position.startswith("continuation"):
                        proof = {"marker": "retry", "prompt_sha256": tui.prompt_hash("retry\ncontinue")}
                        self.value["submissions"].append(proof)
                        self.value["bindings"].append(dict(proof, turn_id="two"))
                        self.value["result"]["turn"] = "two"
                        rows.append({"type": "event_msg", "payload": {"type": "task_started", "turn_id": "two"}})
                        context = {"type": "turn_context", "payload": {"turn_id": "two", "cwd": str(self.root)}}
                        if position == "continuation-after-context": rows.append(context)
                        rows.append(activity)
                        if position == "continuation-before-context": rows.append(context)
                        rows.extend([{"type": "event_msg", "payload": {"type": "user_message", "message": "retry\ncontinue"}},
                                     {"type": "event_msg", "payload": {"type": "task_complete", "turn_id": "two", "last_agent_message": "report"}}])
                    else:
                        if position == "no-prelude":
                            rows.pop(2)
                            self.value["native_preludes"] = []
                        rows.insert(2 if position == "before-prelude" else 4 if position == "after-context" else 3, activity)
                    self.native.write_text("".join(json.dumps(r) + "\n" for r in rows))
                    with self.assertRaisesRegex(ValueError, "native activity precedes"):
                        tui.verify_native(self.value)

    def test_bound_model_activity_is_valid_in_first_and_continued_turns(self):
        original = json.dumps(self.value)
        for activity in self.unbound_activities():
            with self.subTest(activity=activity["payload"]["type"]):
                self.value = json.loads(original)
                rows = self.bootstrap_rows()
                rows.insert(-1, activity)
                self.native.write_text("".join(json.dumps(r) + "\n" for r in rows))
                tui.verify_native(self.value)
                proof = {"marker": "retry", "prompt_sha256": tui.prompt_hash("retry\ncontinue")}
                self.value["submissions"].append(proof)
                self.value["bindings"].append(dict(proof, turn_id="two"))
                self.value["result"]["turn"] = "two"
                rows.extend([{"type": "event_msg", "payload": {"type": "task_started", "turn_id": "two"}},
                             {"type": "turn_context", "payload": {"turn_id": "two", "cwd": str(self.root)}},
                             {"type": "event_msg", "payload": {"type": "user_message", "message": "retry\ncontinue"}}, activity,
                             {"type": "event_msg", "payload": {"type": "task_complete", "turn_id": "two", "last_agent_message": "report"}}])
                self.native.write_text("".join(json.dumps(r) + "\n" for r in rows))
                tui.verify_native(self.value)

    def test_resume_history_is_outside_the_active_dispatch_window(self):
        rows = self.bootstrap_rows()
        history = [{"type": "event_msg", "payload": {"type": "task_started", "turn_id": "historical"}},
                   *self.unbound_activities(),
                   {"type": "event_msg", "payload": {"type": "task_complete", "turn_id": "historical", "last_agent_message": "old"}}]
        rows[1:1] = history
        self.native.write_text("".join(json.dumps(r) + "\n" for r in rows))
        tui.verify_native(self.value)

    def test_zero_exit_alone_never_suffices(self):
        self.native.write_text("".join(json.dumps(r) + "\n" for r in self.rows[:-1]))
        with self.assertRaises(ValueError):
            tui.verify(self.receipt, self.output)

    def test_another_native_turn_after_completion_is_not_done(self):
        with self.native.open("a") as out:
            out.write(json.dumps({"type": "event_msg", "payload": {"type": "task_started", "turn_id": "other"}}) + "\n")
        with self.assertRaises(ValueError):
            tui.verify(self.receipt, self.output)

    def test_a_completed_human_turn_cannot_replace_batch_turn(self):
        rows = self.rows + [
            {"type": "event_msg", "payload": {"type": "task_started", "turn_id": "human"}},
            {"type": "event_msg", "payload": {"type": "user_message", "message": "human request"}},
            {"type": "event_msg", "payload": {"type": "task_complete", "turn_id": "human", "last_agent_message": "human answer"}},
        ]
        self.native.write_text("".join(json.dumps(r) + "\n" for r in rows))
        self.value["result"].update(turn="human", message="human answer")
        self.save()
        with self.assertRaises(ValueError):
            tui.verify(self.receipt, self.output)

    def test_disposal_authorization_is_required_for_every_exit_code(self):
        for code in (0, 1, 124, 75):
            self.value.update(retirement_authorized=False)
            self.value["result"]["code"] = code
            self.save()
            with self.assertRaises(ValueError):
                tui.verify(self.receipt, self.output)

    def test_native_acceptance_requires_the_exact_sent_prompt(self):
        for message in ("marker\nhuman task", "marker-extra\noriginal task", "human request", ""):
            rows = json.loads(json.dumps(self.rows))
            rows[2]["payload"]["message"] = message
            self.native.write_text("".join(json.dumps(r) + "\n" for r in rows))
            with self.assertRaises(ValueError):
                tui.verify(self.receipt, self.output)

    def test_a_real_continuation_needs_its_own_prompt_and_native_turn(self):
        proof = {"marker": "retry", "prompt_sha256": tui.prompt_hash("retry\ncontinue")}
        self.value["submissions"].append(proof)
        self.value["bindings"].append(dict(proof, turn_id="two"))
        self.value["result"].update(turn="two")
        self.save()
        rows = self.rows + [
            {"type": "event_msg", "payload": {"type": "task_started", "turn_id": "two"}},
            {"type": "event_msg", "payload": {"type": "user_message", "message": "retry\ncontinue"}},
            {"type": "event_msg", "payload": {"type": "task_complete", "turn_id": "two", "last_agent_message": "report"}},
        ]
        self.native.write_text("".join(json.dumps(r) + "\n" for r in rows))
        self.assertEqual(tui.verify(self.receipt, self.output)["result"]["turn"], "two")
        rows[-2]["payload"]["message"] = "marker\noriginal task"
        self.native.write_text("".join(json.dumps(r) + "\n" for r in rows))
        with self.assertRaises(ValueError):
            tui.verify(self.receipt, self.output)

    def test_failed_batch_still_rejects_foreign_native_activity(self):
        self.value["result"]["code"] = 124
        self.log.write_text(json.dumps({"type": "learner_summary", "exit_code": 124, "summary": {"sessionId": "thread"}}) + "\n")
        self.value["artifacts"]["sha256"] = tui.digest(self.log)
        self.save()
        self.assertEqual(tui.verify(self.receipt, self.output)["result"]["code"], 124)
        with self.native.open("a") as out:
            out.write(json.dumps({"type": "event_msg", "payload": {"type": "task_started", "turn_id": "human"}}) + "\n")
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
