"""Fixed admission proofs; no production state, model, terminal control or game."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "ops"))
sys.path.insert(0, str(REPO / "ops/tests"))
import own_learning_slot as slot
import learner_jobs as jobs
import learner_tui as tui
import strategy_backfill_jobs as shared
import test_strategy_external as external_fixtures
import test_learner_tabs as tab_fixtures


class OwnSlot(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.directory = self.root / "ops/codex-ops"
        (self.directory / "learner").mkdir(parents=True)
        self.batch = "20261025-024302-strategy-proposal"
        self.row = dict(task="strategy-proposal", state="awaiting_review", pid=999990,
                        pane="w1:p2", character="silent", runs=["FIXTURE000001"], key="original-demand",
                        worktree=str(self.root / ".worktrees/ordinary"), rc=None, report=None,
                        review_required="terminal-unverified-receipt")
        self.receipt = dict(label="learner-" + self.batch, cwd=self.row["worktree"], pane="w1:p2",
                            pid=999991, birth="202", session="fixed-session", turn="fixed-turn",
                            submitted=True, state="needs-attention", retirement_authorized=False)
        prompt = "[learner-batch:fixed]\nfixed task"
        binding = dict(marker=prompt.splitlines()[0], prompt_sha256=tui.prompt_hash(prompt))
        self.receipt.update(bindings=[dict(binding, turn_id="fixed-turn")], submissions=[binding])
        self.native = self.root / "sessions/native.jsonl"
        self.native.parent.mkdir()
        self.rows = [dict(type="session_meta", payload=dict(id="fixed-session", cwd=self.row["worktree"])),
                     dict(type="event_msg", payload=dict(type="task_started", turn_id="fixed-turn")),
                     dict(type="turn_context", payload=dict(turn_id="fixed-turn", cwd=self.row["worktree"])),
                     dict(type="event_msg", payload=dict(type="user_message", message=prompt)),
                     dict(type="event_msg", payload=dict(type="task_complete", turn_id="fixed-turn", last_agent_message="fixed result"))]
        self.native.write_text("".join(json.dumps(r) + "\n" for r in self.rows))
        self.receipt.update(rollout=str(self.native), result=dict(code=75, session="fixed-session", turn="fixed-turn",
                                                               rollout=str(self.native), stopped=False, message=""))
        self.live = {}
        self.activity_calls = []
        self.state = {"batches": {self.batch: self.row}}
        self.save()

    def save(self):
        self.path = self.directory / "learner" / (self.batch + ".verification-deferred.json")
        self.row["verification_deferred"] = str(self.path)
        self.deferred = dict(schema="learner-verification-deferred-v1", batch=self.batch,
                             at="2026-10-26T12:00:00+08:00",
                             supervisor=dict(pid=self.row["pid"], birth="101"),
                             registration={k: self.row.get(k) for k in tui.REGISTRATION_FIELDS},
                             finish_authorized=False, retirement_authorized=False, automatic_replay_authorized=False)
        self.path.write_text(json.dumps(self.deferred))
        self.receipt["label"] = "learner-" + self.batch + ("-postmortem" if self.row.get("task", "postmortem") == "postmortem" else "")
        self.receipt_path = self.directory / "learner" / (self.receipt["label"] + ".tui.json")
        self.receipt_path.write_text(json.dumps(self.receipt))

    def activity(self, *args):
        self.activity_calls.append(args[2])
        return dict(shell_pid=999992, shell_birth="303", revision=1)

    def snapshot(self, activity=None, birth=None):
        return slot.snapshot(self.state, lambda pid: pid in self.live, self.directory,
                             birth=birth or (lambda pid: self.live.get(pid)), activity=activity or self.activity)

    def test_review_release_is_readonly_across_all_ordinary_tasks(self):
        for task in ("strategy-proposal", "fix-batch", "experience-update", "mechanics-audit", "postmortem"):
            with self.subTest(task=task):
                self.row["task"] = task
                self.save()
                before = copy.deepcopy(self.state)
                files = {p: p.read_bytes() for p in (self.path, self.receipt_path, self.native)}
                result = self.snapshot()
                self.assertFalse(result["busy"])
                self.assertEqual(result["pending_review"][0]["reason"], "verified_inactive_pending_review")
                self.assertEqual(self.state, before)
                self.assertEqual({p: p.read_bytes() for p in files}, files)
                self.assertIsNone(self.row["report"])
                self.assertIsNone(self.row["rc"])

    def test_live_idle_or_working_native_and_supervisor_always_hold(self):
        for pid, original in ((999990, "101"), (999991, "202")):
            for current in (original, "pid-reused"):
                self.live = {pid: current}
                result = self.snapshot()
                self.assertTrue(result["busy"])
                role = "supervisor" if pid == 999990 else "native"
                self.assertEqual(result["blockers"][0][role]["observed_birth"], current)
                self.assertEqual(result["blockers"][0]["reason"], role + ("_active" if current == original else "_pid_reused_or_unknown"))
                self.assertEqual(self.activity_calls, [])

    def test_bound_abort_releases_compute_but_preserves_failure_and_missing_report(self):
        self.rows[-1]["payload"] = dict(type="turn_aborted", turn_id="fixed-turn")
        self.native.write_text("".join(json.dumps(r) + "\n" for r in self.rows))
        before = self.receipt_path.read_bytes()
        self.assertFalse(self.snapshot()["busy"])
        self.assertEqual(self.receipt_path.read_bytes(), before)
        self.assertIsNone(self.row["report"])
        self.assertEqual(self.row["state"], "awaiting_review")

    def test_unknown_missing_binding_and_partial_native_keep_review_and_slot(self):
        original = self.receipt_path.read_bytes()
        for broken in ("missing-receipt", "missing-deferral", "wrong-registration", "wrong-pane", "missing-birth", "unsubmitted", "partial-native", "later-turn"):
            with self.subTest(broken=broken):
                self.save()
                self.native.write_text("".join(json.dumps(r) + "\n" for r in self.rows))
                if broken == "missing-receipt": self.receipt_path.unlink()
                if broken == "missing-deferral": self.path.unlink()
                if broken == "wrong-registration": self.row["key"] = "changed"
                if broken == "wrong-pane":
                    value = json.loads(original); value["pane"] = "w1:p3"; self.receipt_path.write_text(json.dumps(value))
                if broken == "missing-birth":
                    value = json.loads(original); value.pop("birth"); self.receipt_path.write_text(json.dumps(value))
                if broken == "unsubmitted":
                    value = json.loads(original); value["submitted"] = False; self.receipt_path.write_text(json.dumps(value))
                if broken == "partial-native": self.native.write_text(self.native.read_text()[:-1])
                if broken == "later-turn": self.native.write_text(self.native.read_text() + json.dumps(dict(type="event_msg", payload=dict(type="task_started", turn_id="human"))) + "\n")
                self.assertTrue(self.snapshot()["busy"])
                self.assertEqual(self.row["state"], "awaiting_review")
                self.row["key"] = "original-demand"

    def test_process_probe_errors_and_inflight_work_are_specific_holds(self):
        for error, reason in ((PermissionError(), "workspace_activity_unverified"),
                              (ValueError("workspace command/model/test/write process is active"), "workspace_work_active"),
                              (ValueError("shared workspace activity cannot be scoped"), "shared_workspace_activity_unscoped"),
                              (ValueError("learner pane has background work"), "pane_background_work_active")):
            with self.subTest(reason=reason):
                def active(*args): raise error
                self.assertEqual(self.snapshot(activity=active)["blockers"][0]["reason"], reason)
        def unreadable(pid): raise PermissionError()
        self.assertEqual(self.snapshot(birth=unreadable)["blockers"][0]["reason"], "supervisor_identity_unverified")

    def test_repeated_crash_deferral_replay_does_not_complete_or_duplicate(self):
        self.row["state"] = "running"
        before = copy.deepcopy(self.row)
        self.assertTrue(tui.apply_deferrals(self.state, self.directory))
        self.assertFalse(tui.apply_deferrals(self.state, self.directory))
        held = copy.deepcopy(self.row)
        self.assertFalse(self.snapshot()["busy"])
        self.assertFalse(self.snapshot()["busy"])
        self.assertEqual(self.row, held)
        self.assertEqual(self.row["pid"], before["pid"])
        self.assertEqual(self.row["key"], before["key"])
        with patch.object(jobs, "start_learner") as start:
            self.assertIsNone(jobs.dispatch_write(self.state, str(self.root), str(REPO / "ops"), "strategy-proposal",
                                                 "silent", self.row["runs"], self.row["key"], "ops", lambda pid: False, "20261026-120000"))
        start.assert_not_called()

    def test_evidence_or_pid_change_during_idle_check_keeps_slot(self):
        def changed(*args):
            self.live[999991] = "new-birth"
            return self.activity(*args)
        self.assertEqual(self.snapshot(activity=changed)["blockers"][0]["reason"], "evidence_changed_unverified")

    def test_external_owners_do_not_consume_ordinary_slot_and_metadata_does_not_hold_backfill(self):
        self.state["batches"]["external"] = dict(external_source="plan", state="running", pid=5)
        self.live = {5: "external"}
        status = self.snapshot()
        self.assertFalse(status["busy"])
        self.assertEqual(len(status["pending_review"]), 1)
        with patch.object(jobs, "feature_worktree", return_value=None), patch("ascension_audit.priority_pending", return_value=False):
            self.assertFalse(shared.priority_hold({"batches": {}}, "silent", lambda _: False, {"own_learning": status}, self.root))
            self.assertTrue(shared.priority_hold({"batches": {}}, "silent", lambda _: False, {"own_learning": {"busy": True}}, self.root))


class ConcurrentExternal(unittest.TestCase):
    def test_real_four_lane_dispatch_continues_while_ordinary_hold_explains_owner(self):
        case = external_fixtures.External("runTest"); case.setUp()
        self.addCleanup(case.doCleanups)
        case.four_plans()
        case.state["batches"]["own-held"] = dict(state="awaiting_review", pid=999990, task="fix-batch", pane="w1:p9")
        result = case.tick("20260101-000001", case.writer, alive=lambda pid: pid == 10)
        self.assertEqual(len(result["strategy_external"]), 4)
        self.assertIsNone(result["experience"])
        self.assertEqual(result["own_learning"]["blockers"][0]["batch"], "own-held")
        self.assertEqual(result["own_learning"]["blockers"][0]["supervisor"]["pid"], 999990)
        self.assertEqual(case.state["batches"]["own-held"]["state"], "awaiting_review")

    def test_one_ordinary_launch_after_proven_release_keeps_external_lane_gates(self):
        case = external_fixtures.External("runTest"); case.setUp()
        self.addCleanup(case.doCleanups)
        case.four_plans()
        calls = []
        def writer(*args, **kwargs):
            if kwargs.get("external_source"):
                return case.writer(*args, **kwargs)
            calls.append(args[3])
            case.state["batches"]["new-own"] = dict(task=args[3], state="running", pid=11)
            return "new-own", 11
        result = case.tick("20260101-000001", writer, alive=lambda pid: pid in (10, 11))
        self.assertEqual(len(result["strategy_external"]), 4)
        self.assertEqual(calls, ["experience-update"])
        self.assertIsNone(case.tick("20260101-000010", writer, alive=lambda pid: pid in (10, 11))["experience"])
        self.assertEqual(calls, ["experience-update"])


class HostActivity(unittest.TestCase):
    def setUp(self):
        self.case = tab_fixtures.LearnerTabs("runTest")
        self.case.setUp()
        self.addCleanup(self.case.doCleanups)

    def check(self, processes=False):
        case = self.case
        import learner_tabs
        with patch.object(learner_tabs, "LearnerTabs", return_value=case.worker), \
                patch("issue_session_support.require_host_process_view"), \
                patch("issue_session.processes", return_value=processes):
            return slot.inactive_workspace(case.root, case.directory, case.batch, case.row, case.receipt)

    def test_present_empty_shell_and_absent_original_pane_are_readonly(self):
        case = self.case
        before = (case.directory / "learn.json").read_bytes()
        self.assertEqual(self.check()["shell_pid"], 333)
        case.present = False
        self.assertTrue(self.check()["pane_absent"])
        self.assertEqual((case.directory / "learn.json").read_bytes(), before)
        self.assertFalse(any(c[:2] in (("tab", "close"), ("agent", "send-keys")) for c in case.calls))
        self.assertFalse(case.worker.path.exists())

    def test_unowned_command_background_job_input_identity_and_detached_test_hold(self):
        case = self.case
        for mode in ("command", "background", "input", "identity", "detached"):
            with self.subTest(mode=mode):
                case.info["foreground_process_group_id"] = 444 if mode == "command" else 333
                case.screen = b"dw@host:~/fixture$ draft" if mode == "input" else b"dw@host:~/fixture$ "
                case.pane["terminal_id"] = "foreign" if mode == "identity" else "terminal-1"
                with patch("issue_session.process_children", return_value={444} if mode == "background" else set()):
                    with self.assertRaises(ValueError): self.check(processes=mode == "detached")

    def test_shared_project_workspace_retains_unknown_work(self):
        self.case.receipt["cwd"] = str(self.case.root)
        with self.assertRaisesRegex(ValueError, "shared workspace"):
            self.check()


if __name__ == "__main__":
    unittest.main()
