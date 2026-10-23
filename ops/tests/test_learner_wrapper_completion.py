"""Real shell wrapper with frozen receipts and finish/seal stubs; no model or Herdr calls."""
import json
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import unittest
import time
from unittest.mock import patch

from ops.tests import test_learner_tui as fixtures

tui = fixtures.tui

REPO = Path(__file__).resolve().parents[2]


class WrapperCompletion(unittest.TestCase):
    setUp = fixtures.CompletionGate.setUp
    save = fixtures.CompletionGate.save

    def prepare(self, task="experience-update"):
        self.batch = "20261023-120000" + ("" if task == "postmortem" else "-experience-update")
        label = "learner-" + self.batch + ("-postmortem" if task == "postmortem" else "")
        self.directory = self.root / "ops/codex-ops"
        self.directory.mkdir(parents=True)
        (self.directory / "learner").mkdir()
        for name in ("paths.sh", "codex-ops-learner.sh", "learner_tui.py"):
            shutil.copy2(REPO / "ops" / name, self.root / "ops" / name)
        self.value.update(pane="w1:p2", label=label,
                          identity={"pane_id": "w1:p2", "label": label,
                                    "tab_id": "w1:t2", "terminal_id": "terminal", "workspace_id": "w1"})
        self.save()
        # A pending ops turn/notification cannot be consumed or gate this code-only completion.
        (self.directory / "queue").mkdir()
        (self.directory / "queue/old-event.md").write_text("ops busy: original pending event\n")
        (self.root / "ops/codex-ops-learn.py").write_text('''import json,os,sys
from pathlib import Path
root=Path(os.environ["CODEX_OPS_ROOT"])
batch=sys.argv[sys.argv.index("--batch")+1]
rc=int(sys.argv[sys.argv.index("--rc")+1])
row={"state":os.environ.get("FIXTURE_FINISH_STATE", "done" if rc==0 else "failed"), "rc":rc,
     "task":os.environ["FIXTURE_TASK"],
     "finished":"2026-10-23T12:00:00+08:00", "pid":os.getppid(), "pane":"w1:p2", "worktree":str(root)}
(root/"ops/codex-ops/learn.json").write_text(json.dumps({"batches":{batch:row}}))
''')
        (self.root / "ops/learner_tabs.py").write_text('''import json,os,sys
from pathlib import Path
root=Path(os.environ["CODEX_OPS_ROOT"])
(root/"seal-args.json").write_text(json.dumps(sys.argv[1:]))
sys.exit(int(os.environ.get("FIXTURE_SEAL_RC", "0")))
''')
        sleep = self.root / "home/.local/node/bin/sleep"
        sleep.parent.mkdir(parents=True)
        # End only this fixture's wrapper after its first deferred verification, without a 30s wait.
        sleep.write_text("#!/usr/bin/python3\nimport os,signal\nos.kill(os.getppid(),signal.SIGTERM)\n")
        sleep.chmod(0o755)
        return {"HOME": str(self.root / "home"), "PATH": "/usr/bin:/bin", "CODEX_OPS_ROOT": str(self.root),
                "CODEX_OPS_NO_DRAIN": "1", "FIXTURE_TASK":task, "LEARNER_HERDR_PANE": "w1:p2", "LEARNER_HERDR_LABEL": label,
                "LEARNER_TUI_RECEIPT": str(self.receipt), "LEARNER_CMD": "printf 'fixed report\\n'"}

    def run_wrapper(self, env):
        result = subprocess.run(["bash", str(self.root / "ops/codex-ops-learner.sh"), self.batch,
                                 "FIXTURE000001", "silent", env["FIXTURE_TASK"], str(self.root)],
                                env=env, capture_output=True, text=True, timeout=10)
        self.assertEqual((self.directory / "queue/old-event.md").read_text(), "ops busy: original pending event\n")
        return result

    def attention_files(self):
        return list((self.directory / "queue").glob("*learner-tui-attention.md"))

    def test_clean_finish_seals_without_ops_attention_or_pane_commands(self):
        env = self.prepare()
        result = self.run_wrapper(env)
        self.assertEqual(result.returncode, 0, result.stderr)
        value = json.loads(self.receipt.read_text())
        self.assertEqual(value["wrapper"]["state"], "done")
        self.assertEqual(value["wrapper"]["batch"], self.batch)
        self.assertEqual(value["wrapper"]["launcher_rc"], 0)
        self.assertEqual(value["wrapper"]["supervisor"]["pid"], json.loads((self.directory / "learn.json").read_text())["batches"][self.batch]["pid"])
        self.assertTrue(value["wrapper"]["supervisor"]["birth"])
        self.assertEqual(value["output"]["sha256"], tui.digest(self.directory / "learner" / (self.batch + ".out")))
        self.assertEqual(json.loads((self.root / "seal-args.json").read_text()),
                         ["seal", "--root", str(self.root), "--state-dir", str(self.directory), "--batch", self.batch])
        self.assertEqual(self.attention_files(), [])
        self.assertEqual(self.receipt.stat().st_mode & 0o777, 0o600)

    def test_zero_model_refusal_is_terminal_code_three_not_success(self):
        env = self.prepare()
        self.value.update(state="not-started", models_started=0, submitted=False, submissions=[], bindings=[], result={"code": 3})
        self.value.pop("pid")
        self.save()
        result = self.run_wrapper(dict(env, LEARNER_CMD="exit 1"))
        self.assertEqual(result.returncode, 3, result.stderr)
        value = json.loads(self.receipt.read_text())
        self.assertEqual(value["wrapper"]["state"], "failed")
        self.assertEqual(value["wrapper"]["rc"], 3)
        self.assertEqual(value["wrapper"]["launcher_rc"], 1)
        self.assertEqual(value["output"]["sha256"], tui.digest(self.directory / "learner" / (self.batch + ".out")))
        self.assertTrue((self.root / "seal-args.json").exists())
        self.assertEqual(self.attention_files(), [])

    def test_invalid_native_binding_preserves_original_and_never_finishes_or_seals(self):
        env = self.prepare()
        self.value["bindings"] = []
        self.save()
        before = self.receipt.read_bytes()
        result = self.run_wrapper(env)
        self.assertEqual(result.returncode, -15)
        self.assertEqual(self.receipt.read_bytes(), before)
        self.assertFalse((self.directory / "learn.json").exists())
        self.assertFalse((self.root / "seal-args.json").exists())
        self.assertEqual(len(self.attention_files()), 1)
        self.assertRegex(self.attention_files()[0].name, r"^[0-9]+-[a-z][a-z0-9-]*\.md$")

    def test_artifact_audit_failure_retains_pane_and_emits_attention(self):
        env = self.prepare()
        result = self.run_wrapper(dict(env, FIXTURE_FINISH_STATE="failed"))
        self.assertEqual(result.returncode, 75)
        self.assertNotIn("wrapper", json.loads(self.receipt.read_text()))
        self.assertFalse((self.root / "seal-args.json").exists())
        self.assertEqual(len(self.attention_files()), 1)

    def test_seal_failure_keeps_verified_finish_but_reports_retained_handoff(self):
        env = self.prepare()
        result = self.run_wrapper(dict(env, FIXTURE_SEAL_RC="75"))
        self.assertEqual(result.returncode, 75)
        self.assertEqual(json.loads(self.receipt.read_text())["wrapper"]["state"], "done")
        self.assertEqual(len(self.attention_files()), 1)
        notification = self.attention_files()[0].read_bytes()
        tui.attention(self.directory, self.batch, "seal")
        self.assertEqual(self.attention_files()[0].read_bytes(), notification)
        self.assertEqual(len(self.attention_files()), 1)

    def test_missing_seal_adapter_never_falls_back_to_closing(self):
        env = self.prepare()
        (self.root / "ops/learner_tabs.py").unlink()
        self.assertEqual(self.run_wrapper(env).returncode, 75)
        self.assertEqual(len(self.attention_files()), 1)

    def test_mismatched_launcher_exit_is_not_silently_replaced(self):
        env = self.prepare()
        result = self.run_wrapper(dict(env, LEARNER_CMD="printf 'fixed report\\n'; exit 1"))
        self.assertEqual(result.returncode, -15)
        self.assertFalse((self.directory / "learn.json").exists())
        self.assertFalse((self.root / "seal-args.json").exists())
        self.assertEqual(len(self.attention_files()), 1)

    def test_not_started_cannot_launder_model_activity(self):
        for extra in ({"submitted": True}, {"pid": 123}, {"bindings": [{"turn_id": "turn"}]},
                      {"submissions": [{"marker": "sent"}]}, {"session": "thread"}, {"result": {"code": 3, "session": "thread"}}):
            with self.subTest(extra=extra):
                value = {"state": "not-started", "models_started": 0, "result": {"code": 3}, **extra}
                self.receipt.write_text(json.dumps(value))
                before = self.receipt.read_bytes()
                with self.assertRaises(ValueError):
                    tui.verified_code(self.receipt, self.output, "1")
                self.assertEqual(self.receipt.read_bytes(), before)

    def test_terminal_record_requires_original_supervisor_pane_worktree_and_audit(self):
        self.prepare()
        state = self.directory / "learn.json"
        original = {"pid": os.getpid(), "pane": "w1:p2", "state": "done", "rc": 0,
                    "finished": "fixed", "worktree": str(self.root), "task": "experience-update"}
        for changed in ({"pid": 1}, {"pane": "w1:p3"}, {"state": "failed"}, {"state": "running"},
                        {"finished": None}, {"rc": 75}, {"worktree": "/foreign"}):
            with self.subTest(changed=changed), patch.object(tui.os, "getppid", return_value=os.getpid()):
                state.write_text(json.dumps({"batches": {self.batch: {**original, **changed}}}))
                with self.assertRaises(ValueError):
                    tui.finished(state, self.batch, self.receipt, self.output, "0", str(os.getpid()))
                self.assertNotIn("wrapper", json.loads(self.receipt.read_text()))


    def timeout_fixture(self):
        env = self.prepare()
        self.value["bindings"] = []
        self.save()
        (self.root / "home/.local/node/bin/sleep").write_text('#!/bin/bash\nexec /bin/sleep "$1"\n')
        (self.root / "ops/fixture-initial.py").write_text('''import json,os
from pathlib import Path
root=Path(os.environ["CODEX_OPS_ROOT"])
batch="20261023-120000-experience-update"
row={"state":"running", "pid":os.getppid(), "pane":"w1:p2", "worktree":str(root),
     "task":"experience-update", "character":"silent", "runs":["FIXTURE000001"], "key":"original-key"}
(root/"ops/codex-ops/learn.json").write_text(json.dumps({"batches":{batch:row},"runs":{}}))
print("original fixed output")
''')
        return dict(env, LEARNER_TUI_VERIFY_TIMEOUT_S="1",
                    LEARNER_CMD='exec python3 "$CODEX_OPS_ROOT/ops/fixture-initial.py"')

    def test_timeout_releases_only_the_supervisor_slot_and_holds_original_demand(self):
        env = self.timeout_fixture()
        before = self.receipt.read_bytes()
        started = time.monotonic()
        result = self.run_wrapper(env)
        self.assertEqual(result.returncode, 75)
        self.assertLess(time.monotonic() - started, 6)
        state = json.loads((self.directory / "learn.json").read_text())
        batch = state["batches"][self.batch]
        self.assertEqual(batch["state"], "awaiting_review")
        self.assertNotIn("finished", batch)
        self.assertNotIn("rc", batch)
        self.assertEqual(self.receipt.read_bytes(), before)
        self.assertFalse((self.root / "seal-args.json").exists())
        notice = (self.directory / "inbox-claude.md").read_text()
        self.assertEqual(notice.count(self.batch), 2)  # batch label and journal name in the same line
        self.assertEqual(len(notice.splitlines()), 1)
        record = json.loads((self.directory / "learner" / (self.batch + ".verification-deferred.json")).read_text())
        self.assertFalse(record["finish_authorized"])
        self.assertFalse(record["retirement_authorized"])
        self.assertFalse(record["automatic_replay_authorized"])
        module_spec = importlib.util.spec_from_file_location("jobs_under_test", REPO / "ops/learner_jobs.py")
        jobs = importlib.util.module_from_spec(module_spec)
        module_spec.loader.exec_module(jobs)
        self.assertFalse(jobs.busy(state, "experience-update", lambda _: True))
        self.assertFalse(jobs.retryable(state, "experience-update", "original-key"))
        self.assertTrue(jobs.retryable(state, "experience-update", "unrelated-key"))
        self.assertIsNone(jobs.dispatch_write(state, str(self.root), str(REPO / "ops"), "experience-update", "silent",
                                             ["FIXTURE000001"], "original-key", "ops", lambda _: False, "20261023-130000"))

    def test_pending_hold_survives_lock_contention_without_infinite_wait(self):
        self.prepare()
        state_file = self.directory / "learn.json"
        state = {"batches": {self.batch: {"state":"running", "pid":os.getpid(), "pane":"w1:p2",
                                         "task":"experience-update", "key":"original-key"}}}
        state_file.write_text(json.dumps(state))
        with patch.object(tui.os, "getppid", return_value=os.getpid()), \
             patch.object(tui.fcntl, "flock", side_effect=BlockingIOError), \
             patch.object(tui.time, "monotonic", side_effect=[0,3]):
            tui.defer(state_file, self.batch, self.receipt, self.output, "75", str(os.getpid()))
        self.assertEqual(json.loads(state_file.read_text())["batches"][self.batch]["state"], "running")
        self.assertTrue(tui.apply_deferrals(state, self.directory))
        self.assertEqual(state["batches"][self.batch]["state"], "awaiting_review")
        self.assertFalse(tui.apply_deferrals(state, self.directory))
        self.assertEqual(len((self.directory / "inbox-claude.md").read_text().splitlines()), 1)

    def test_postmortem_keeps_its_real_label_suffix_and_receipt_identity(self):
        env = self.prepare("postmortem")
        self.assertEqual(self.run_wrapper(env).returncode, 0)
        value = json.loads(self.receipt.read_text())
        self.assertEqual(value["label"], "learner-20261023-120000-postmortem")
        self.assertEqual(value["wrapper"]["batch"], "20261023-120000")
        self.assertEqual(self.attention_files(), [])


    def test_one_hung_verifier_is_bounded_by_the_same_deadline(self):
        env = self.timeout_fixture()
        helper = self.root / "ops/learner_tui.py"
        helper.write_text(helper.read_text().replace('if __name__ == "__main__":',
            'if __name__ == "__main__" and sys.argv[1:2] == ["verified-code"]: time.sleep(60)\nif __name__ == "__main__":'))
        started = time.monotonic()
        self.assertEqual(self.run_wrapper(env).returncode, 75)
        self.assertLess(time.monotonic() - started, 6)
        self.assertEqual(json.loads((self.directory / "learn.json").read_text())["batches"][self.batch]["state"], "awaiting_review")
        self.assertTrue((self.directory / "inbox-claude.md").is_file())

    def test_deferral_does_not_take_over_another_supervisor_or_duplicate_notice(self):
        self.prepare()
        state_file = self.directory / "learn.json"
        state = {"batches": {self.batch: {"state":"running", "pid":123456789, "pane":"w1:p2"}}}
        state_file.write_text(json.dumps(state))
        with patch.object(tui.os, "getppid", return_value=os.getpid()):
            for _ in range(2):
                tui.defer(state_file, self.batch, self.receipt, self.output, "75", str(os.getpid()))
        self.assertEqual(json.loads(state_file.read_text()), state)
        self.assertEqual(len((self.directory / "inbox-claude.md").read_text().splitlines()), 1)

    def test_postmortem_admission_skips_held_inputs_but_dispatches_unrelated_work(self):
        self.prepare()
        module_spec = importlib.util.spec_from_file_location("scheduler_under_test", REPO / "ops/codex-ops-learn.py")
        scheduler = importlib.util.module_from_spec(module_spec)
        with patch.dict(os.environ, {"CODEX_OPS_ROOT":str(self.root), "CODEX_OPS_DIR":str(self.directory)}):
            module_spec.loader.exec_module(scheduler)
        held, fresh = "FIXTURE000001", "FIXTURE000002"
        state = {"batches": {self.batch: {"state":"awaiting_review", "runs":[held], "pid":os.getpid()}},
                 "runs":{held:{"attempts":1,"retry_at":0},fresh:{"attempts":1,"retry_at":0}}}
        with patch.object(scheduler,"postmortem_ids",return_value=set()), \
             patch.object(scheduler,"finished_runs",return_value=[{"run_id":held},{"run_id":fresh}]), \
             patch.object(scheduler,"dispatch",return_value=("new",123)) as dispatch:
            self.assertIsNone(scheduler.running_batch(state))
            self.assertEqual(scheduler.check_postmortems(state,"silent"),("new",123))
            self.assertEqual(dispatch.call_args.args[1],[fresh])
        self.assertEqual(state["batches"][self.batch]["state"],"awaiting_review")


if __name__ == "__main__":
    unittest.main()
