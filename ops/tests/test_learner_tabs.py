"""Fixed learner tab reclamation boundaries; no real terminal or model is used."""
import copy
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
import learner_tabs as tabs


class LearnerTabs(unittest.TestCase):
    fixture_batch = "20261023-032433-s2-strategy-proposal"
    fixture_task = "strategy-proposal"
    fixture_label = "learner-20261023-032433-s2-strategy-proposal"
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.directory = self.root / "ops/codex-ops"
        self.files = self.directory / "learner"; self.files.mkdir(parents=True)
        (self.root / ".agents").mkdir()
        (self.root / ".agents/board.yaml").write_bytes((Path(tabs.__file__).parents[1] / ".agents/board.yaml").read_bytes())
        self.batch = self.fixture_batch
        self.label = self.fixture_label
        self.tree = self.root / ".worktrees/fixture"; self.tree.mkdir(parents=True)
        self.row = dict(state="failed", rc=3, finished="2026-10-23T03:46:00+08:00", pid=222, pane="wR:p1", worktree=str(self.tree), task=self.fixture_task)
        self.host = dict(workspace_label="sts2-run", workspace_id="wR", panes={self.label: dict(pane_id="wR:p1", title="学习大脑 · fixture")})
        self.pane = dict(pane_id="wR:p1", tab_id="wR:t1", workspace_id="wR", terminal_id="terminal-1", revision=1, cwd=str(self.root), foreground_cwd=str(self.root))
        self.tab = dict(tab_id="wR:t1", label="学习大脑 · fixture", pane_count=1)
        self.present = True; self.calls = []; self.screen = b"dw@host:~/fixture$ "
        self.info = dict(shell_pid=333, foreground_process_group_id=333, foreground_processes=[])
        self.births = {222:"owner-birth", 333:"shell-birth"}
        self.receipt = dict(state="not-started", models_started=0, pane=self.row["pane"], label=self.label, cwd=str(self.tree), identity=self.pane.copy(), result=dict(code=3), submitted=False, bindings=[], submissions=[])
        self.write_state(); self.write_receipt()
        (self.files / (self.batch + ".out")).write_text("")
        (self.files / (self.batch + ".err")).write_text("fixed failure\n")
        for obj, name, kwargs in [
            (tabs, "birth", dict(side_effect=lambda pid:self.births.get(pid))),
            (tabs, "require_host_process_view", dict()),
            (tabs.os, "getppid", dict(return_value=222)),
            (tabs.issue_session, "process_children", dict(return_value=set())),
            (tabs.issue_session, "idle_codex_helpers", dict(return_value=set())),
            (tabs.issue_session, "run", dict(side_effect=lambda argv:self.screen if "visible" in argv else b"fixed tail\n")),
        ]:
            mock = patch.object(obj, name, **kwargs); mock.start(); self.addCleanup(mock.stop)
        self.worker = tabs.LearnerTabs(self.root, self.directory, herdr=self.herdr)

    def write_state(self):
        tabs.atomic(self.directory / "learn.json", dict(batches={self.batch:self.row}))
        tabs.atomic(self.directory / "herdr.json", self.host)

    def write_receipt(self):
        tabs.atomic(self.files / (self.label + ".tui.json"), self.receipt)

    def herdr(self, *args):
        self.calls.append(args)
        if args == ("workspace", "list"):
            return dict(workspaces=[dict(workspace_id="wR", label="sts2-run"), dict(workspace_id="wD", label="other")])
        if args[:2] == ("tab", "list"):
            return dict(tabs=[copy.deepcopy(self.tab)] if self.present else [])
        if args[:2] == ("pane", "list"):
            return dict(panes=[copy.deepcopy(self.pane)] if self.present else [])
        if args[:2] == ("pane", "get"):
            return dict(pane=copy.deepcopy(self.pane))
        if args[:2] == ("pane", "process-info"):
            return dict(process_info=copy.deepcopy(self.info))
        if args[:2] == ("agent", "get"):
            return dict(agent=dict(agent="codex", name=self.receipt.get("agent_name"), pane_id="wR:p1", agent_status="done", foreground_cwd=str(self.tree)))
        if args[:2] == ("tab", "close"):
            self.present = False; return {}
        raise AssertionError(args)

    def seal(self):
        self.worker.seal(self.batch)
        self.births.pop(222, None)

    def tick(self):
        return self.worker.tick()["results"]

    def test_unstarted_terminal_reclaimed_and_slot_freed_without_ops_or_model(self):
        self.seal(); original = (self.directory / "learn.json").read_bytes()
        self.assertEqual(self.tick()[0]["state"], "reclaimed")
        self.assertFalse(self.present)
        self.assertNotIn(self.label, tabs.load(self.directory / "herdr.json")["panes"])
        self.assertEqual(self.worker.data["events"][self.batch]["phase"], "done")
        self.assertEqual((self.directory / "learn.json").read_bytes(), original)
        self.assertTrue(self.tree.is_dir())
        self.assertEqual(self.tick(), [])
        self.assertEqual(sum(c[:2] == ("tab", "close") for c in self.calls), 1)
        self.assertFalse(self.worker.inbox.exists())
        self.assertTrue(all(c[0] in ("pane", "tab", "workspace") for c in self.calls))

    def started(self, rc=0, state="done", live=False):
        self.row.update(rc=rc, state=state); self.write_state()
        marker = dict(marker="marker", prompt_sha256=hashlib.sha256(b"marker\noriginal task").hexdigest())
        native = self.files / "native.jsonl"
        rows = [dict(type="session_meta", payload=dict(id="session", cwd=str(self.tree))),
                dict(type="event_msg", payload=dict(type="task_started", turn_id="turn")),
                dict(type="event_msg", payload=dict(type="user_message", message="marker\noriginal task")),
                dict(type="event_msg", payload=dict(type="task_complete" if rc==0 else "turn_aborted", turn_id="turn", last_agent_message="report"))]
        native.write_text("".join(json.dumps(r)+"\n" for r in rows))
        log = self.files / "launch.jsonl"
        log.write_text(json.dumps(dict(type="learner_summary", exit_code=rc, summary=dict(sessionId="session")))+"\n")
        (self.files / (self.batch + ".out")).write_text("persisted report\n")
        self.receipt.update(state="turn-ended" if live else "session-ended", retirement_authorized=True, submitted=True,
            agent_name="learner-bound", pid=444, birth="native-birth", bindings=[dict(marker, turn_id="turn")], submissions=[marker],
            result=dict(code=rc, session="session", turn="turn", message="report", rollout=str(native), stopped=not live),
            artifacts=dict(log=str(log), sha256=tabs.sha(log), summary=True))
        name_binding=json.dumps([self.label,self.row["pane"],str(self.tree)],ensure_ascii=False,separators=(",",":"))
        self.receipt.update(agent_name="learner-"+hashlib.sha256(name_binding.encode()).hexdigest()[:24],agent_name_version=1)
        self.write_receipt()
        if live:
            self.births[444] = "native-birth"; self.pane["agent"] = "codex"
            self.info.update(foreground_process_group_id=444, foreground_processes=[dict(pid=444, name="codex")])
            self.screen = "› ".encode()
        # Unit tests isolate the #36 native verifier; integration also runs these with its exact Git source.
        verifier = Path(os.environ.get("LEARNER_TABS_NATIVE_FIXTURE", str(Path(tabs.__file__).parent / "learner_tui.py")))
        if verifier.is_file():
            target = self.root / "ops/learner_tui.py"; target.write_bytes(verifier.read_bytes())
        else:
            mock = patch.object(tabs, "native_verifier", return_value=lambda r:None); mock.start(); self.addCleanup(mock.stop)

    def mapped_sessions(self, recovery=False, sample=None):
        """Projection of both #20 original seal failures; no game text or credentials."""
        evidence = self.recovery_fixture() if recovery else None
        if not recovery:
            self.started()
        relative = (Path(sample["rollout_relative"]).relative_to("ops/codex-ops/accounts/codex1/learner/sessions")
                    if sample else Path("2026/10/25/rollout-2026-10-25T10-13-57-01a170d6-0818-7fe1-8976-9f00546d39c1.jsonl"))
        session = relative.name[-42:-6]
        source = self.files / "native.jsonl"
        raw = source.read_text().replace('"session"', '"' + session + '"')
        account = self.directory / "accounts/codex1"
        home = account / "learner"; home.mkdir(parents=True)
        personal_tmp = tempfile.TemporaryDirectory(); self.addCleanup(personal_tmp.cleanup)
        personal = Path(personal_tmp.name)
        target = personal / ".codex1/sessions"
        target.mkdir(parents=True)
        self.target = target
        self.native = target / relative
        self.native.parent.mkdir(parents=True); self.native.write_text(raw)
        self.link = home / "sessions"; self.link.symlink_to(target)
        self.receipt.update(session=session, turn="turn", rollout=str(self.link / self.native.relative_to(target)))
        self.receipt["result"].update(session=session, rollout=self.receipt["rollout"])
        log = self.files / "launch.jsonl"
        rows = [dict(type="learner_launch", engine="codex", cwd=str(self.tree), params=dict(batch=self.batch)),
                dict(type="learner_tui_session", pane=self.row["pane"], session=session, rollout=self.receipt["rollout"]),
                dict(type="learner_summary", exit_code=0, summary=dict(sessionId=session))]
        log.write_text("".join(json.dumps(r)+"\n" for r in rows))
        self.receipt["artifacts"]["sha256"] = tabs.sha(log)
        self.profile = account / "profile.json"
        tabs.atomic(self.profile, dict(engine="codex", account="codex1", learner_home=str(home)))
        self.write_receipt()
        mock = patch.object(tabs, "account_sessions", return_value=personal); mock.start(); self.addCleanup(mock.stop)
        return evidence

    def test_both_original_failure_projections_reproduce_and_recover(self):
        data = json.loads((Path(__file__).parent / "fixtures/issue63-seal-failures.json").read_bytes())
        self.assertEqual(len(data["samples"]), 2)
        for sample in data["samples"]:
            with self.subTest(batch=sample["batch"]):
                fixture = LearnerTabs()
                fixture.fixture_batch = sample["batch"]
                fixture.fixture_label = "learner-" + sample["batch"]
                fixture.setUp()
                try:
                    fixture.mapped_sessions(sample=sample)
                    with self.assertRaisesRegex(ValueError, sample["original_error"]):
                        tabs.safe_path(fixture.root, fixture.receipt["rollout"])
                    fixture.seal()
                    self.assertEqual(fixture.tick()[0]["state"], "reclaimed")
                    self.assertEqual(fixture.tick(), [])
                    self.assertEqual(sum(c[:2] == ("tab", "close") for c in fixture.calls), 1)
                finally:
                    fixture.doCleanups()

    def ordinary_fix_sessions(self, recovery=False):
        """Sanitized #65 successor: failed/rc0, a complete native turn, no params.batch."""
        self.batch = "20261025-134331-fix-batch"
        self.label = "learner-" + self.batch
        self.tree = self.root / ".worktrees/codex-fix-silent-20261025-134331"
        self.tree.mkdir()
        self.row.update(task="fix-batch", character="silent", worktree=str(self.tree))
        self.host["panes"] = {self.label: dict(pane_id=self.row["pane"], title=self.tab["label"])}
        self.receipt.update(label=self.label, cwd=str(self.tree))
        self.write_state(); self.write_receipt()
        (self.files / (self.batch + ".err")).write_text("original failed finish audit\n")
        evidence = self.mapped_sessions(recovery=recovery)
        self.row.update(state="failed", rc=0); self.write_state()
        if recovery:
            self.receipt["wrapper"].update(state="failed", batch_sha256=hashlib.sha256(
                json.dumps(self.row, sort_keys=True, separators=(",", ":")).encode()).hexdigest())
        scratch = self.root / "learner/runs/20261025-134352-49f6dd05-5c0d-4b3a-9753-57c2d6b462dd-fix-batch"
        scratch.mkdir(parents=True)
        (scratch / "report.md").write_text("Original candidate; checks incomplete.\n")
        log = scratch.with_suffix(".jsonl")
        launch = dict(type="learner_launch", engine="codex", task="fix-batch", transport="herdr-interactive",
                      cwd=str(self.tree), params=dict(worktree=str(self.tree), project_root=str(self.root),
                      scratch=str(scratch), character="silent"))
        rows = [launch, dict(type="learner_tui_session", pane=self.row["pane"], session=self.receipt["session"],
                             rollout=self.receipt["rollout"], marker="marker"),
                dict(type="learner_summary", exit_code=0, summary=dict(sessionId=self.receipt["session"]))]
        self.receipt["artifacts"]["log"] = str(log)
        self.fix_log(rows)
        return evidence

    def fix_log(self, rows):
        log = Path(self.receipt["artifacts"]["log"])
        log.write_text("".join(json.dumps(row) + "\n" for row in rows))
        self.receipt["artifacts"]["sha256"] = tabs.sha(log)
        self.write_receipt()

    def test_ordinary_fix_wrapper_ops_and_scheduler_recover_without_rewriting_history(self):
        for mode in ("wrapper", "ops", "scheduler"):
            with self.subTest(mode=mode):
                fixture = LearnerTabs(); fixture.setUp()
                try:
                    evidence = fixture.ordinary_fix_sessions(recovery=mode != "wrapper")
                    paths = [fixture.directory / "learn.json", fixture.files / (fixture.batch + ".out"),
                             fixture.files / (fixture.batch + ".err"), fixture.files / (fixture.label + ".tui.json"),
                             Path(fixture.receipt["artifacts"]["log"]), fixture.native,
                             Path(fixture.receipt["artifacts"]["log"]).with_suffix("") / "report.md"]
                    before = {p: p.read_bytes() for p in paths}
                    if mode == "wrapper":
                        fixture.seal()
                    elif mode == "ops":
                        fixture.worker.dry = True
                        self.assertEqual(fixture.worker.recover_seal(fixture.batch, evidence)["state"], "eligible")
                        self.assertFalse((fixture.files / (fixture.label + ".tab-retirement.json")).exists())
                        fixture.worker.dry = False
                        fixture.worker.recover_seal(fixture.batch, evidence)
                        sealed = fixture.files / (fixture.label + ".tab-retirement.json")
                        original_seal = sealed.read_bytes()
                        fixture.worker = tabs.LearnerTabs(fixture.root, fixture.directory, herdr=fixture.herdr)
                        fixture.worker.recover_seal(fixture.batch, evidence)
                        self.assertEqual(sealed.read_bytes(), original_seal)
                    else:
                        fixture.scheduler_finish()
                    fixture.worker = tabs.LearnerTabs(fixture.root, fixture.directory, herdr=fixture.herdr)
                    self.assertEqual(fixture.tick()[0]["state"], "reclaimed")
                    self.assertEqual(fixture.tick(), [])
                    self.assertEqual(sum(c[:2] == ("tab", "close") for c in fixture.calls), 1)
                    self.assertEqual(before, {p: p.read_bytes() for p in paths})
                    proof = tabs.load(fixture.files / (fixture.label + ".tab-retirement.json"))
                    binding = proof["files"]["rollout"]["sessions_mapping"]["launch_binding"]
                    self.assertEqual(binding["kind"], "ordinary-fix-v1")
                    self.assertEqual(binding["batch"], fixture.batch)
                    self.assertTrue(fixture.tree.is_dir())
                finally:
                    fixture.doCleanups()

    def test_ordinary_fix_missing_or_contradictory_binding_is_retained(self):
        self.ordinary_fix_sessions()
        original_receipt = copy.deepcopy(self.receipt)
        rows = [json.loads(line) for line in Path(self.receipt["artifacts"]["log"]).read_text().splitlines()]
        row = copy.deepcopy(self.row)
        for bad in ("task", "worktree", "project-root", "character", "scratch", "foreign-batch", "null-batch",
                    "missing-params", "transport", "cwd", "duplicate-launch", "duplicate-session", "no-session",
                    "marker", "no-bindings", "registration-task", "registration-character", "feature-task", "pane"):
            with self.subTest(bad=bad):
                self.receipt = copy.deepcopy(original_receipt); self.row = copy.deepcopy(row)
                changed = copy.deepcopy(rows); launch = changed[0]; params = launch["params"]
                if bad == "task": launch["task"] = "strategy-proposal"
                if bad == "worktree": params["worktree"] = str(self.root)
                if bad == "project-root": params["project_root"] = str(self.tree)
                if bad == "character": params["character"] = "ironclad"
                if bad == "scratch": params["scratch"] += "-foreign"
                if bad == "foreign-batch": params["batch"] = "20261025-134332-fix-batch"
                if bad == "null-batch": params["batch"] = None
                if bad == "missing-params": launch["params"] = None
                if bad == "transport": launch["transport"] = "stdio"
                if bad == "cwd": launch["cwd"] = str(self.root)
                if bad == "duplicate-launch": changed.insert(0, copy.deepcopy(launch))
                if bad == "duplicate-session": changed.insert(1, copy.deepcopy(changed[1]))
                if bad == "no-session": changed.pop(1)
                if bad == "marker": changed[1]["marker"] = "foreign"
                if bad == "no-bindings": self.receipt["bindings"] = []
                if bad == "registration-task": self.row["task"] = "strategy-proposal"
                if bad == "registration-character": self.row["character"] = "ironclad"
                if bad == "feature-task": self.row["learner_task"] = "silent-boss-calibration"
                if bad == "pane": changed[1]["pane"] = "wR:p2"
                self.write_state(); self.fix_log(changed)
                with self.assertRaises(ValueError):
                    self.worker.seal(self.batch)
                self.assertTrue(self.present)
                self.assertFalse((self.files / (self.label + ".tab-retirement.json")).exists())
        self.assertFalse(any(c[:2] == ("tab", "close") for c in self.calls))

    def test_ordinary_fix_sealed_busy_or_changed_evidence_never_closes(self):
        self.ordinary_fix_sessions(); self.seal()
        original = self.native.read_bytes()
        for bad in ("draft", "foreground", "background", "native", "wrong-terminal", "running", "authority"):
            with self.subTest(bad=bad):
                self.screen = b"dw@host:~/fixture$ "
                self.info["foreground_process_group_id"] = 333
                self.pane["terminal_id"] = "terminal-1"
                self.row["state"] = "failed"
                self.receipt["retirement_authorized"] = True
                self.native.write_bytes(original)
                context = patch.object(tabs.issue_session, "process_children", return_value=set())
                if bad == "draft": self.screen += b"echo pending"
                if bad == "foreground": self.info["foreground_process_group_id"] = 555
                if bad == "background": context = patch.object(tabs.issue_session, "process_children", return_value={"777"})
                if bad == "native": self.native.write_bytes(original + b"{}\n")
                if bad == "wrong-terminal": self.pane["terminal_id"] = "foreign"
                if bad == "running": self.row["state"] = "running"
                if bad == "authority": self.receipt["retirement_authorized"] = False
                self.write_state(); self.write_receipt()
                with context:
                    self.assertIn(self.tick()[0]["state"], ("retained", "running"))
                self.assertTrue(self.present)
        self.assertFalse(any(c[:2] == ("tab", "close") for c in self.calls))

    def test_explicit_batch_layouts_and_existing_seals_stay_compatible(self):
        for batch, task in (("20261025-121312-strategy-proposal", "strategy-proposal"),
                            ("20261025-121312", "postmortem")):
            with self.subTest(task=task):
                fixture = LearnerTabs()
                fixture.fixture_batch, fixture.fixture_task = batch, task
                fixture.fixture_label = "learner-" + batch + ("-postmortem" if task == "postmortem" else "")
                fixture.setUp()
                try:
                    fixture.mapped_sessions(); fixture.seal()
                    path = fixture.files / (fixture.label + ".tab-retirement.json")
                    original = path.read_bytes()
                    self.assertNotIn("launch_binding", tabs.load(path)["files"]["rollout"]["sessions_mapping"])
                    fixture.worker = tabs.LearnerTabs(fixture.root, fixture.directory, herdr=fixture.herdr)
                    self.assertEqual(fixture.tick()[0]["state"], "reclaimed")
                    self.assertEqual(path.read_bytes(), original)
                    self.assertEqual(fixture.tick(), [])
                finally:
                    fixture.doCleanups()

    def test_missing_batch_does_not_enable_other_task_layouts(self):
        self.mapped_sessions()
        rows = [json.loads(line) for line in Path(self.receipt["artifacts"]["log"]).read_text().splitlines()]
        rows[0]["params"].pop("batch")
        self.fix_log(rows)
        with self.assertRaisesRegex(ValueError, "original account/thread binding missing"):
            self.worker.seal(self.batch)
        self.assertTrue(self.present)

    def test_original_sessions_failure_then_wrapper_seal_and_reclaim(self):
        self.mapped_sessions()
        # This is the original #20 failure, retained as the strict general guard.
        with self.assertRaisesRegex(ValueError, "symlink path retained"):
            tabs.safe_path(self.root, self.receipt["rollout"])
        before = (self.directory / "learn.json").read_bytes()
        self.seal()
        proof = tabs.load(self.files / (self.label + ".tab-retirement.json"))
        self.assertEqual(proof["files"]["rollout"]["sessions_mapping"]["account"], "codex1")
        # Re-instantiation exercises persisted proof readback, then only one close.
        self.worker = tabs.LearnerTabs(self.root, self.directory, herdr=self.herdr)
        self.assertEqual(self.tick()[0]["state"], "reclaimed")
        self.assertEqual(self.tick(), [])
        self.assertFalse(self.present)
        self.assertEqual(sum(c[:2] == ("tab", "close") for c in self.calls), 1)
        self.assertEqual(before, (self.directory / "learn.json").read_bytes())
        self.assertTrue(self.native.is_file()); self.assertTrue(self.tree.is_dir())

    def test_original_sessions_failure_recovered_by_ops_and_scheduler(self):
        for mode in ("ops", "scheduler"):
            with self.subTest(mode=mode):
                # Independent fixture, including terminal process absence and empty pane.
                fixture = LearnerTabs(); fixture.setUp()
                try:
                    evidence = fixture.mapped_sessions(recovery=True)
                    if mode == "ops":
                        fixture.worker.dry = True
                        self.assertEqual(fixture.worker.recover_seal(fixture.batch, evidence)["state"], "eligible")
                        self.assertFalse((fixture.files / (fixture.label + ".tab-retirement.json")).exists())
                        fixture.worker.dry = False
                        fixture.worker.recover_seal(fixture.batch, evidence)
                    else:
                        fixture.scheduler_finish()
                    self.assertEqual(fixture.tick()[0]["state"], "reclaimed")
                    self.assertEqual(fixture.tick(), [])
                finally:
                    fixture.doCleanups()

    def test_sessions_path_and_identity_negative_gates(self):
        self.mapped_sessions()
        self.assert_sessions_path_and_identity_negative_gates()

    def test_ordinary_fix_keeps_account_path_native_and_busy_guards(self):
        self.ordinary_fix_sessions()
        self.assert_sessions_path_and_identity_negative_gates()

    def assert_sessions_path_and_identity_negative_gates(self):
        good_receipt = copy.deepcopy(self.receipt)
        good_profile = self.profile.read_bytes()
        native_raw = self.native.read_bytes()
        log = Path(self.receipt["artifacts"]["log"]); log_raw = log.read_bytes()
        for bad in ("unknown-account", "wrong-profile", "profile-link", "unknown-target", "leaf-link", "nested-link",
                    "wrong-thread", "wrong-turn", "wrong-pane", "missing-bindings", "missing-end", "partial-line",
                    "unbound-log", "changed-log", "live-native", "busy", "draft", "extra-child"):
            with self.subTest(bad=bad):
                self.receipt = copy.deepcopy(good_receipt)
                self.profile.unlink(missing_ok=True); self.profile.write_bytes(good_profile)
                self.link.unlink(); self.link.symlink_to(self.target)
                if self.native.is_symlink(): self.native.unlink()
                self.native.write_bytes(native_raw)
                self.screen = b"dw@host:~/fixture$ "
                log.write_bytes(log_raw)
                self.births.pop(444, None)
                self.info["foreground_process_group_id"] = 333
                context = patch.object(tabs.issue_session, "process_children", return_value=set())
                if bad == "unknown-account": self.profile.unlink()
                if bad == "wrong-profile": tabs.atomic(self.profile, dict(engine="codex", account="codex3", learner_home=str(self.link.parent)))
                if bad == "profile-link": self.profile.unlink(); self.profile.symlink_to(log)
                if bad == "unknown-target": self.link.unlink(); self.link.symlink_to(self.files)
                if bad == "leaf-link": self.native.unlink(); self.native.symlink_to(self.files / "native.jsonl")
                if bad == "nested-link":
                    moved = self.target / "moved"; self.native.parent.rename(moved)
                    self.native.parent.symlink_to(moved)
                if bad == "wrong-thread": self.receipt["result"]["session"] = "00000000-0000-0000-0000-000000000000"
                if bad == "wrong-turn": self.receipt["result"]["turn"] = "foreign"
                if bad == "wrong-pane": self.receipt["pane"] = "wR:p2"
                if bad == "missing-bindings": self.receipt["bindings"] = []
                if bad == "missing-end": self.native.write_bytes(b"\n".join(native_raw.splitlines()[:-1])+b"\n")
                if bad == "partial-line": self.native.write_bytes(native_raw.rstrip(b"\n"))
                if bad == "unbound-log":
                    log.write_text(log_raw.decode().replace('"learner_tui_session"', '"foreign"'))
                    self.receipt["artifacts"]["sha256"] = tabs.sha(log)
                if bad == "changed-log": log.write_bytes(log_raw+b"{}\n")
                if bad == "live-native": self.births[444] = "native-birth"
                if bad == "busy": self.info["foreground_process_group_id"] = 555
                if bad == "draft": self.screen = b"dw@host:~/fixture$ echo human"
                if bad == "extra-child": context = patch.object(tabs.issue_session, "process_children", return_value={"777"})
                self.write_receipt()
                with context, self.assertRaises((ValueError, OSError)):
                    self.worker.seal(self.batch)
                self.assertTrue(self.present)
                self.assertFalse((self.files / (self.label + ".tab-retirement.json")).exists())
                if bad == "nested-link":
                    self.native.parent.unlink(); moved.rename(self.native.parent)
        self.assertFalse(any(c[:2] == ("tab", "close") for c in self.calls))

    def test_sealed_mapping_replacement_and_preclose_race_are_retained(self):
        self.mapped_sessions(); self.seal()
        self.link.unlink(); self.link.symlink_to(self.target)
        self.assertEqual(self.tick()[0]["state"], "retained")
        self.assertTrue(self.present)

    def test_mapping_changed_after_tail_read_never_closes(self):
        self.mapped_sessions(); self.seal()
        original = tabs.issue_session.run
        def replaced(argv):
            result = original(argv)
            if "recent-unwrapped" in argv:
                self.link.unlink(); self.link.symlink_to(self.target)
            return result
        with patch.object(tabs.issue_session, "run", side_effect=replaced):
            self.assertEqual(self.tick()[0]["state"], "retained")
        self.assertTrue(self.present)
        self.assertFalse(any(c[:2] == ("tab", "close") for c in self.calls))

    def test_recovery_retry_preserves_original_seal_and_does_not_close(self):
        evidence = self.mapped_sessions(recovery=True)
        self.worker.recover_seal(self.batch, evidence)
        seal = self.files / (self.label + ".tab-retirement.json")
        before = seal.read_bytes()
        self.worker = tabs.LearnerTabs(self.root, self.directory, herdr=self.herdr)
        self.worker.recover_seal(self.batch, evidence)
        self.assertEqual(before, seal.read_bytes())
        self.assertTrue(self.present)
        self.assertEqual(self.tick()[0]["state"], "reclaimed")
        self.assertEqual(self.tick(), [])

    def test_sessions_mapping_replaced_during_verification_never_seals(self):
        self.mapped_sessions()
        verifier = tabs.native_verifier(self.root)
        def replaced(receipt, **kwargs):
            verifier(receipt, **kwargs)
            self.link.unlink(); self.link.symlink_to(self.target)
        with patch.object(tabs, "native_verifier", return_value=replaced), self.assertRaises(ValueError):
            self.worker.seal(self.batch)
        self.assertTrue(self.present)

    def test_completed_native_receipts_reclaimed(self):
        self.started(); self.seal()
        self.assertEqual(self.tick()[0]["state"], "reclaimed")

    def test_cancelled_native_turn_reclaimed(self):
        self.started(rc=1, state="cancelled"); self.seal()
        self.assertEqual(self.tick()[0]["state"], "reclaimed")

    def test_owned_done_codex_with_ended_native_turn_reclaimed(self):
        self.started(live=True); self.seal()
        self.assertEqual(self.tick()[0]["state"], "reclaimed")

    def test_running_is_untouched_even_without_receipts(self):
        self.row.update(state="running"); self.write_state()
        (self.files / (self.label + ".tui.json")).unlink()
        self.assertEqual(self.tick()[0]["state"], "running")
        self.assertTrue(self.present); self.assertFalse(self.worker.inbox.exists())
        self.assertFalse(any(c[:2] in (("pane", "get"), ("tab", "close")) for c in self.calls))

    def test_supervisor_still_retiring_is_queued_without_warning(self):
        self.worker.seal(self.batch)
        self.assertEqual(self.tick()[0]["state"], "queued")
        self.assertFalse(self.worker.inbox.exists())
        self.assertTrue(self.present)

    def test_bad_receipt_identity_artifact_input_and_authority_retained_once(self):
        self.seal()
        proofpath = self.files / (self.label + ".tab-retirement.json")
        original = proofpath.read_bytes()
        for bad in ("missing", "authority", "binding", "terminal", "input", "artifact", "extra-pane", "foreground", "unknown-title", "revision"):
            with self.subTest(bad=bad):
                self.pane["revision"]=1
                self.present=True; self.screen=b"dw@host:~/fixture$ "; self.tab["pane_count"]=1
                self.tab["label"]="学习大脑 · fixture"; self.info["foreground_process_group_id"]=333
                proofpath.write_bytes(original); proof=tabs.load(proofpath)
                if bad=="missing":
                    proofpath.unlink()
                    self.assertEqual(self.tick()[0]["state"], "queued")
                    self.assertEqual(self.tick()[0]["state"], "queued")
                if bad=="authority": proof["authority"]="human"; tabs.atomic(proofpath,proof)
                if bad=="binding": proof["binding"]["pid"]=123; tabs.atomic(proofpath,proof)
                if bad=="terminal": proof["identity"]["terminal_id"]="foreign"; tabs.atomic(proofpath,proof)
                if bad=="input": self.screen=b"dw@host:~/fixture$ echo human"
                if bad=="artifact": (self.files/(self.batch+".err")).write_text("changed")
                if bad=="extra-pane": self.tab["pane_count"]=2
                if bad=="foreground": self.info["foreground_process_group_id"]=555
                if bad=="revision": self.pane["revision"]=2
                if bad=="unknown-title": self.tab["label"]="学习大脑 · foreign"
                self.assertEqual(self.tick()[0]["state"],"retained"); self.assertTrue(self.present)
                count=len(self.worker.inbox.read_text().splitlines()) if self.worker.inbox.exists() else 0
                self.tick(); self.assertEqual(len(self.worker.inbox.read_text().splitlines()) if self.worker.inbox.exists() else 0,count)
                (self.files/(self.batch+".err")).write_text("fixed failure\n")
        self.assertFalse(any(c[:2]==("tab","close") for c in self.calls))

    def test_dry_run_does_not_write_close_or_consume(self):
        self.seal(); before=self.worker.path.exists()
        self.worker.dry=True
        self.assertEqual(self.tick()[0]["state"],"eligible")
        self.assertEqual(before,self.worker.path.exists()); self.assertTrue(self.present)
        self.assertFalse((self.directory/"learner-tab-tails").exists())

    def test_background_work_and_unknown_composer_retained(self):
        self.seal()
        with patch.object(tabs.issue_session,"process_children",return_value={"777"}):
            self.assertEqual(self.tick()[0]["state"],"retained")
        self.started(live=True)
        # Resealing a changed batch is forbidden; preserve the original seal.
        with self.assertRaises(ValueError): self.worker.seal(self.batch)

    def test_running_only_protection_and_permanent_roles(self):
        row=dict(self.row,label=self.label)
        self.worker.board.protect(row)
        with self.assertRaises(ValueError): self.worker.board.protect(dict(row,state="running"))
        with self.assertRaises(ValueError): self.worker.board.protect(dict(row,pane="w1H:p8"))

    def test_seal_refuses_wrong_supervisor_or_native_authority(self):
        with patch.object(tabs.os,"getppid",return_value=999):
            with self.assertRaises(ValueError): self.worker.seal(self.batch)
        self.started(); self.receipt["retirement_authorized"]=False; self.write_receipt()
        with self.assertRaises(ValueError): self.worker.seal(self.batch)

    def test_zero_model_launcher_code_one_is_explicit_failure_not_success(self):
        self.row["rc"]=1; self.write_state(); self.seal()
        self.assertEqual(self.tick()[0]["state"],"reclaimed")
        self.assertEqual(tabs.load(self.directory/"learn.json")["batches"][self.batch]["state"],"failed")

    def test_unknown_unregistered_inactive_learning_tab_is_retained_locally(self):
        tabs.atomic(self.directory/"learn.json",dict(batches={}))
        self.assertEqual(self.tick()[0]["state"],"retained")
        self.assertFalse(self.worker.inbox.exists()); self.assertTrue(self.present)

    def test_shell_input_parser_rejects_drafts_and_unknown_prompts(self):
        for value in ("dw@host:~/repo$ ","$ ","# ","\x1b[32mdw@host:~/repo\x1b[0m$ "):
            self.assertTrue(tabs.shell_empty(value),value)
        for value in ("dw@host:~/repo$ echo $", "dw@host:~/repo$ echo", "> ","output", "dw@host:~/repo$ \necho human"):
            self.assertFalse(tabs.shell_empty(value),value)

    def test_native_turn_and_artifact_gate_refuses_missing_end_or_changed_log(self):
        self.started(); native=self.files/"native.jsonl"
        native.write_text("\n".join(native.read_text().splitlines()[:-1])+"\n")
        with self.assertRaises(ValueError): self.worker.seal(self.batch)
        self.started(); (self.files/"launch.jsonl").write_text("changed")
        with self.assertRaises(ValueError): self.worker.seal(self.batch)

    def test_close_uncertain_not_repeated(self):
        self.seal()
        original=self.worker.herdr
        def fail(*args):
            if args[:2]==("tab","close"): raise ValueError("lost reply")
            return original(*args)
        self.worker.herdr=fail
        self.assertEqual(self.tick()[0]["state"],"retained")
        self.worker.herdr=original
        self.assertEqual(self.tick()[0]["state"],"retained")
        self.assertTrue(self.present)
        self.assertFalse(any(c[:2]==("tab","close") for c in self.calls))

    def test_missing_receipt_dry_run_preserves_every_file(self):
        before={str(p.relative_to(self.root)):p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        self.worker.dry=True
        self.assertEqual(self.tick()[0]['state'],'queued')
        after={str(p.relative_to(self.root)):p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        self.assertEqual(before,after); self.assertTrue(self.present)

    def test_symlink_receipt_never_read_or_followed(self):
        self.seal()
        receipt=self.files/(self.label+'.tab-retirement.json'); receipt.unlink()
        external=self.root/'outside.json'; external.write_text('{"private":"fixture"}')
        receipt.symlink_to(external)
        self.assertEqual(self.tick()[0]['state'],'retained')
        self.assertTrue(self.present); self.assertTrue(receipt.is_symlink())

    def test_lost_ack_after_actual_close_is_reported_without_reclose(self):
        self.seal(); original=self.worker.herdr
        def close_lost(*args):
            result=original(*args)
            if args[:2]==('tab','close'): raise ValueError('reply lost')
            return result
        self.worker.herdr=close_lost
        self.assertEqual(self.tick()[0]['state'],'retained')
        self.assertFalse(self.present)
        self.worker.herdr=original
        self.assertEqual(self.tick()[0]['state'],'retained')
        self.assertEqual(sum(c[:2]==('tab','close') for c in self.calls),1)
        self.assertEqual(self.worker.data['events'][self.batch]['phase'],'sending')

    def test_original_registration_and_birth_change_cannot_be_hidden(self):
        self.seal(); self.row['pid']=999; self.write_state()
        self.assertEqual(self.tick()[0]['state'],'retained'); self.assertTrue(self.present)

    def test_cli_lock_busy_is_queued_and_bad_journal_not_overwritten_or_spammed(self):
        import contextlib,fcntl,io
        argv=['tick','--root',str(self.root),'--state-dir',str(self.directory)]
        with (self.directory/'learn.lock').open('a') as lock, contextlib.redirect_stdout(io.StringIO()):
            fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            self.assertEqual(tabs.main(argv),0)
        self.assertFalse(self.worker.inbox.exists())
        self.worker.path.write_text('broken original')
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(tabs.main(argv),1)
            self.assertEqual(tabs.main(argv),1)
        self.assertEqual(self.worker.path.read_text(),'broken original')
        self.assertEqual(len(self.worker.inbox.read_text().splitlines()),1)

    def test_legacy_tab_label_is_included_and_other_tabs_are_ignored(self):
        self.tab['label']=self.label
        self.seal(); self.assertEqual(self.tick()[0]['state'],'reclaimed')
        self.present=True; self.tab['label']='ops'
        self.assertEqual(self.tick(),[])

    def test_native_process_still_live_and_incomplete_zero_model_receipt_cannot_seal(self):
        self.started(); self.births[444]='native-birth'
        with self.assertRaises(ValueError): self.worker.seal(self.batch)
        self.births.pop(444)
        self.receipt.update(state='not-started',models_started=0,result=dict(code=3),bindings=[],submissions=[])
        self.receipt.pop('submitted',None); self.write_receipt()
        self.row.update(state='failed',rc=3); self.write_state()
        with self.assertRaises(ValueError): self.worker.seal(self.batch)

    def test_actual_io_blocking_error_is_failed_not_expected_lock_queue(self):
        import contextlib,io
        argv=['tick','--root',str(self.root),'--state-dir',str(self.directory)]
        for error in (BlockingIOError('real I/O error'), AttributeError('malformed API/state shape')):
            with patch.object(tabs.LearnerTabs,'tick',side_effect=error), contextlib.redirect_stdout(io.StringIO()) as output:
                self.assertEqual(tabs.main(argv),1)
            self.assertEqual(json.loads(output.getvalue())['state'],'failed')
            self.assertTrue(self.worker.inbox.exists())

    def test_awaiting_review_is_retained_without_close_or_original_rewrite(self):
        self.row.update(state='awaiting_review', review_required='tui-verification-timeout')
        self.row.pop('rc'); self.row.pop('finished'); self.write_state()
        original={path:path.read_bytes() for path in self.files.iterdir()}
        state=(self.directory/'learn.json').read_bytes()
        self.assertEqual(self.tick()[0]['state'],'retained')
        self.assertTrue(self.present); self.assertFalse(self.worker.inbox.exists())
        self.assertFalse(any(c[:2] in (('tab','close'),('pane','get')) for c in self.calls))
        self.assertEqual(state,(self.directory/'learn.json').read_bytes())
        self.assertEqual(original,{path:path.read_bytes() for path in original})
        with self.assertRaises(ValueError): self.worker.board.protect(dict(self.row,label=self.label))

    def test_running_role_preserves_legacy_error_classification_and_terminal_gate(self):
        for state in (None,'running','awaiting_review'):
            with self.subTest(state=state), self.assertRaisesRegex(ValueError,'protected board role') as error:
                self.worker.board.protect(dict(self.row,state=state,label=self.label))
            self.assertIn('running learner pane retained',str(error.exception))
        for state in ('done','failed','rejected','cancelled'):
            with self.subTest(state=state):
                self.worker.board.protect(dict(self.row,state=state,label=self.label))

    def recovery_fixture(self, state='done'):
        self.started(state=state)
        output=self.files/(self.batch+'.out')
        self.receipt['output']=dict(path=str(output),sha256=tabs.sha(output))
        self.receipt['wrapper']=dict(version=1,batch=self.batch,state=self.row['state'],rc=self.row['rc'],
            launcher_rc=0,finished=self.row['finished'],supervisor=dict(pid=222,birth='12345'),
            batch_sha256=hashlib.sha256(json.dumps(self.row,sort_keys=True,separators=(',',':')).encode()).hexdigest())
        self.write_receipt(); self.births.pop(222,None)
        self.births[os.getpid()]='67890'
        evidence=self.root/'paper/materials/recovery-review.json'
        evidence.parent.mkdir(parents=True,exist_ok=True); evidence.write_text('{"review":"fixed evidence"}\n')
        return evidence

    def scheduler_finish(self):
        (self.directory/'scheduler.log').write_text(f'2026-10-23 03:46:00 learner batch {self.batch} (fixed) exit {self.row["rc"]}\n')

    def test_three_missing_ticks_are_local_and_persist_across_worker_restarts(self):
        self.births.pop(222)
        for n in range(1, 5):
            self.worker=tabs.LearnerTabs(self.root,self.directory,herdr=self.herdr)
            result=self.tick()[0]
            self.assertEqual(result['ticks'], n)
            self.assertEqual(result['state'], 'queued' if n < 3 else 'retained')
            self.assertFalse(self.worker.inbox.exists()); self.assertTrue(self.present)
        self.scheduler_finish()
        self.assertEqual(self.tick()[0]['state'],'reclaimed')
        self.assertNotIn(self.batch,self.worker.data['retries'])

    def test_automatic_recovery_uses_original_evidence_without_ops_or_historical_birth(self):
        self.recovery_fixture(); self.receipt.pop('wrapper'); self.write_receipt(); self.scheduler_finish()
        original=(self.directory/'learn.json').read_bytes()
        self.assertEqual(self.tick()[0]['state'],'reclaimed')
        proof=tabs.load(self.files/(self.label+'.tab-retirement.json'))
        self.assertEqual(proof['authority'],'scheduler-recovery'); self.assertIsNone(proof['owner_birth'])
        self.assertEqual(original,(self.directory/'learn.json').read_bytes())
        self.assertFalse(self.worker.inbox.exists()); self.assertTrue(self.tree.is_dir())

    def test_automatic_recovery_dry_run_checks_without_seal_close_or_journal(self):
        self.recovery_fixture(); self.scheduler_finish(); self.worker.dry=True
        before={p:p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        self.assertEqual(self.tick()[0]['state'],'eligible')
        self.assertEqual(before,{p:p.read_bytes() for p in self.root.rglob('*') if p.is_file()})
        self.assertTrue(self.present)

    def test_automatic_recovery_missing_legacy_birth_uses_absence_not_invented_birth(self):
        self.recovery_fixture(); self.receipt['wrapper']['supervisor'].pop('birth')
        self.write_receipt(); self.scheduler_finish()
        self.assertEqual(self.tick()[0]['state'],'reclaimed')
        proof=tabs.load(self.files/(self.label+'.tab-retirement.json'))
        self.assertIsNone(proof['owner_birth']); self.assertFalse(self.worker.inbox.exists())

    def test_automatic_recovery_requires_unique_matching_scheduler_and_absent_processes(self):
        self.recovery_fixture(); self.scheduler_finish()
        path=self.directory/'scheduler.log'; original=path.read_bytes()
        for data in (original.replace(b'exit 0',b'exit 1'),original+original):
            path.write_bytes(data)
            self.assertEqual(self.tick()[0]['state'],'retained'); self.assertTrue(self.present)
            self.assertEqual(len(self.worker.inbox.read_text().splitlines()),1)
        path.write_bytes(original); self.births[222]='reused'
        self.assertEqual(self.tick()[0]['state'],'queued'); self.assertTrue(self.present)
        self.births.pop(222); self.births[444]='reused'
        self.assertEqual(self.tick()[0]['state'],'retained'); self.assertTrue(self.present)
        self.assertEqual(len(self.worker.inbox.read_text().splitlines()),1)

    def test_binding_failure_with_live_native_is_reported_once(self):
        self.started(live=True); tabs.atomic(self.directory/'learn.json',dict(batches={}))
        self.assertEqual(self.tick()[0]['state'],'retained')
        self.assertEqual(self.tick()[0]['state'],'retained')
        self.assertEqual(len(self.worker.inbox.read_text().splitlines()),1); self.assertTrue(self.present)

    def test_automatic_recovery_rechecks_scheduler_before_close(self):
        self.recovery_fixture(); self.scheduler_finish()
        original=self.worker.herdr
        def changed(*args):
            result=original(*args)
            if args[:2]==('pane','get') and (self.files/(self.label+'.tab-retirement.json')).exists():
                (self.directory/'scheduler.log').write_text('changed\n')
            return result
        self.worker.herdr=changed
        self.assertEqual(self.tick()[0]['state'],'queued'); self.assertTrue(self.present)
        self.assertFalse(any(c[:2]==('tab','close') for c in self.calls))

    def test_automatic_recovery_preserves_host_native_artifact_and_input_gates(self):
        self.recovery_fixture(); self.scheduler_finish()
        with patch.object(tabs,'require_host_process_view',side_effect=ValueError('host process visibility required')):
            self.assertEqual(self.tick()[0]['state'],'retained'); self.assertTrue(self.present)
        self.screen=b'dw@host:~/fixture$ unfinished command'
        self.assertEqual(self.tick()[0]['state'],'retained'); self.assertTrue(self.present)
        self.screen=b'dw@host:~/fixture$ '
        native=self.files/'native.jsonl'; before=native.read_bytes()
        native.write_bytes(b'\n'.join(before.splitlines()[:-1])+b'\n')
        self.assertEqual(self.tick()[0]['state'],'retained'); self.assertTrue(self.present)
        self.assertFalse((self.files/(self.label+'.tab-retirement.json')).exists())

    def test_missing_sequence_resets_after_expected_retention_gate(self):
        self.births.pop(222); self.assertEqual(self.tick()[0]['ticks'],1)
        self.births[222]='owner-birth'; self.assertEqual(self.tick()[0]['state'],'queued')
        self.births.pop(222); self.assertEqual(self.tick()[0]['ticks'],1)

    def test_day_accounting_is_read_only_and_excludes_window_end(self):
        self.seal()
        with patch.object(tabs,'stamp',return_value='2026-10-24T12:00:00+08:00'):
            self.tick(); self.worker.warn('wR:p2','fixed contradiction')
        self.worker.warn('wR:p2','fixed contradiction')
        self.worker.data['activity'].append(dict(at='2026-10-25T00:00:00+08:00',kind='closed',key='future'))
        self.worker.save()
        start='2000-01-01T00:00:00+00:00'; end='2026-10-25T00:00:00+08:00'
        before=self.worker.path.read_bytes(); report=self.worker.report(start,end)
        self.assertEqual(report['automatic_tabs_closed'],1)
        self.assertEqual(report['inbox_reminders'],1); self.assertEqual(report['cases_needing_ops'],1)
        self.assertEqual(before,self.worker.path.read_bytes())

    def test_ops_recovery_seals_only_then_original_tick_reclaims(self):
        evidence=self.recovery_fixture()
        originals={path:path.read_bytes() for path in self.files.iterdir()}
        state=(self.directory/'learn.json').read_bytes()
        host=(self.directory/'herdr.json').read_bytes()
        with self.assertRaisesRegex(ValueError,'registered supervisor'):
            self.worker.seal(self.batch)
        self.assertEqual(self.worker.recover_seal(self.batch,evidence)['state'],'sealed')
        self.assertTrue(self.present); self.assertFalse(any(c[:2]==('tab','close') for c in self.calls))
        proofpath=self.files/(self.label+'.tab-retirement.json'); proof=tabs.load(proofpath)
        self.assertEqual(proof['authority'],'ops-recovery')
        self.assertEqual((proof['owner_pid'],proof['owner_birth']),(222,'12345'))
        self.assertEqual(proof['recovery']['operator_pid'],os.getpid())
        self.assertEqual(proof['recovery']['operator_birth'],'67890')
        self.assertEqual(proof['recovery']['evidence']['sha256'],tabs.sha(evidence))
        before=proofpath.read_bytes()
        self.worker.recover_seal(self.batch,evidence)
        self.assertEqual(proofpath.read_bytes(),before)
        self.assertEqual(originals,{path:path.read_bytes() for path in originals})
        self.assertEqual(host,(self.directory/'herdr.json').read_bytes())
        self.assertEqual(self.tick()[0]['state'],'reclaimed')
        event=self.worker.data['events'][self.batch]
        tail=self.root/event['tail']
        self.assertIn(tabs.sha(tail),tail.name); self.assertEqual(event['phase'],'done')
        self.assertNotIn(self.label,tabs.load(self.directory/'herdr.json')['panes'])
        self.assertEqual(state,(self.directory/'learn.json').read_bytes())
        self.assertEqual(originals,{path:path.read_bytes() for path in originals})
        self.assertTrue(self.tree.is_dir()); self.assertFalse(self.worker.inbox.exists())

    def test_recovery_cli_defaults_read_only_and_apply_never_closes(self):
        import contextlib,io
        evidence=self.recovery_fixture()
        argv=['recover-seal','--root',str(self.root),'--batch',self.batch,'--evidence',str(evidence.relative_to(self.root))]
        original={path:path.read_bytes() for path in self.root.rglob('*') if path.is_file()}
        with patch.object(tabs.issue_session,'herdr',side_effect=self.herdr), contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(tabs.main(argv),0)
        self.assertEqual(json.loads(output.getvalue())['state'],'eligible')
        self.assertEqual(original,{path:path.read_bytes() for path in self.root.rglob('*') if path.is_file()})
        with patch.object(tabs.issue_session,'herdr',side_effect=self.herdr), contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(tabs.main(argv+['--apply']),0)
        self.assertEqual(json.loads(output.getvalue())['state'],'sealed')
        self.assertTrue(self.present); self.assertFalse(any(c[:2]==('tab','close') for c in self.calls))

    def test_recovery_failed_rc_zero_remains_failed_after_original_tick(self):
        evidence=self.recovery_fixture(state='failed')
        self.worker.recover_seal(self.batch,evidence)
        self.assertEqual(self.tick()[0]['state'],'reclaimed')
        row=tabs.load(self.directory/'learn.json')['batches'][self.batch]
        self.assertEqual((row['state'],row['rc']),('failed',0))

    def test_recovery_cli_lock_queue_retention_and_real_failure(self):
        import contextlib,fcntl,io
        evidence=self.recovery_fixture()
        argv=['recover-seal','--root',str(self.root),'--batch',self.batch,'--evidence',str(evidence),'--apply']
        for name in ('learn.lock','herdr.json.lock','learner-tabs.lock'):
            with (self.directory/name).open('a') as lock, contextlib.redirect_stdout(io.StringIO()) as output:
                fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
                self.assertEqual(tabs.main(argv),0)
            self.assertEqual(json.loads(output.getvalue())['state'],'queued')
        self.assertEqual(self.calls,[]); self.assertFalse(self.worker.inbox.exists())
        self.receipt['wrapper']['supervisor'].pop('birth'); self.write_receipt()
        with contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(tabs.main(argv),0)
        self.assertEqual(json.loads(output.getvalue())['state'],'retained')
        self.assertFalse((self.files/(self.label+'.tab-retirement.json')).exists())
        for error in (OSError('fixed I/O failure'),json.JSONDecodeError('bad receipt','broken',0)):
            with patch.object(tabs.LearnerTabs,'recover_seal',side_effect=error), contextlib.redirect_stdout(io.StringIO()) as output:
                self.assertEqual(tabs.main(argv),1)
            self.assertEqual(json.loads(output.getvalue())['state'],'failed')
        self.assertEqual(len(self.worker.inbox.read_text().splitlines()),1)

    def test_recovery_missing_old_wrapper_or_supervisor_birth_retains(self):
        evidence=self.recovery_fixture()
        wrapper=copy.deepcopy(self.receipt['wrapper'])
        for bad in ('missing-wrapper','missing-birth','wrong-pid','wrong-hash'):
            self.receipt['wrapper']=copy.deepcopy(wrapper)
            if bad=='missing-wrapper': self.receipt.pop('wrapper')
            if bad=='missing-birth': self.receipt['wrapper']['supervisor'].pop('birth')
            if bad=='wrong-pid': self.receipt['wrapper']['supervisor']['pid']=999
            if bad=='wrong-hash': self.receipt['wrapper']['batch_sha256']='0'*64
            self.write_receipt()
            with self.subTest(bad=bad), self.assertRaisesRegex(ValueError,'original wrapper'):
                self.worker.recover_seal(self.batch,evidence)
        self.assertFalse((self.files/(self.label+'.tab-retirement.json')).exists())

    def test_recovery_rejects_live_reused_pids_and_nonterminal_batches(self):
        evidence=self.recovery_fixture()
        for pid,value in ((222,'12345'),(222,'reused'),(444,'native-birth'),(444,'reused')):
            self.births[pid]=value
            with self.subTest(pid=pid,value=value), self.assertRaises(ValueError):
                self.worker.recover_seal(self.batch,evidence)
            self.births.pop(pid)
        for state in ('running','awaiting_review'):
            self.row['state']=state; self.write_state(); self.calls=[]
            with self.subTest(state=state), self.assertRaisesRegex(ValueError,'safely terminal'):
                self.worker.recover_seal(self.batch,evidence)
            self.assertFalse(any(c[:2]==('pane','get') for c in self.calls))
        self.assertFalse((self.files/(self.label+'.tab-retirement.json')).exists())

    def test_recovery_rechecks_original_output_and_whole_batch(self):
        evidence=self.recovery_fixture()
        self.row['checks']='changed after original wrapper'; self.write_state()
        with self.assertRaisesRegex(ValueError,'wrapper'):
            self.worker.recover_seal(self.batch,evidence)
        self.row.pop('checks'); self.write_state()
        (self.files/(self.batch+'.out')).write_text('changed output\n')
        with self.assertRaisesRegex(ValueError,'output proof'):
            self.worker.recover_seal(self.batch,evidence)
        self.assertFalse((self.files/(self.label+'.tab-retirement.json')).exists())

    def test_recovery_preserves_native_authority_identity_and_empty_input_gates(self):
        evidence=self.recovery_fixture()
        original=copy.deepcopy(self.receipt)
        for bad in ('authority','native-end','summary','identity','input','background','permanent-pane','live-cwd'):
            self.receipt=copy.deepcopy(original); self.write_receipt()
            native=self.files/'native.jsonl'; native_before=native.read_bytes()
            log=self.files/'launch.jsonl'; log_before=log.read_bytes()
            if bad=='authority': self.receipt['retirement_authorized']=False; self.write_receipt()
            if bad=='native-end': native.write_text('\n'.join(native.read_text().splitlines()[:-1])+'\n')
            if bad=='summary': log.write_text('changed\n')
            if bad=='identity': self.pane['terminal_id']='other'
            if bad=='input': self.screen=b'dw@host:~/fixture$ human draft'
            if bad=='background': self.info['foreground_process_group_id']=777
            if bad=='permanent-pane':
                self.row['pane']='w1H:p8'; self.host['panes'][self.label]['pane_id']='w1H:p8'; self.write_state()
            if bad=='live-cwd': self.row['worktree']=str(self.root/'.worktrees/live'); self.write_state()
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                self.worker.recover_seal(self.batch,evidence)
            native.write_bytes(native_before); log.write_bytes(log_before)
            self.pane['terminal_id']='terminal-1'; self.screen=b'dw@host:~/fixture$ '
            self.info['foreground_process_group_id']=333
            self.row.update(pane='wR:p1',worktree=str(self.tree)); self.host['panes'][self.label]['pane_id']='wR:p1'; self.write_state()
        self.assertFalse((self.files/(self.label+'.tab-retirement.json')).exists())

    def test_recovery_never_resolves_sending_or_done_events(self):
        evidence=self.recovery_fixture()
        for phase in ('sending','done'):
            self.worker.data['events'][self.batch]=dict(phase=phase,pane=self.row['pane'],tab=self.pane['tab_id'])
            with self.subTest(phase=phase), self.assertRaisesRegex(ValueError,'uncertain'):
                self.worker.recover_seal(self.batch,evidence)
        self.assertFalse((self.files/(self.label+'.tab-retirement.json')).exists())

    def test_recovery_rechecks_changes_before_seal_and_never_overwrites(self):
        evidence=self.recovery_fixture()
        original_idle=self.worker.idle
        original_row=copy.deepcopy(self.row); original_host=copy.deepcopy(self.host)
        stderr=self.files/(self.batch+'.err'); stderr_before=stderr.read_bytes()
        for bad in ('evidence','batch','host','pane','artifact'):
            def changed(*args):
                result=original_idle(*args)
                if bad=='evidence': evidence.write_text('changed during verification\n')
                if bad=='batch': self.row['checks']='new result'; self.write_state()
                if bad=='host': self.host['panes'][self.label]['title']='changed'; self.write_state()
                if bad=='pane': self.pane['revision']+=1
                if bad=='artifact': stderr.write_text('changed during verification\n')
                return result
            with self.subTest(bad=bad), patch.object(self.worker,'idle',side_effect=changed), self.assertRaisesRegex(ValueError,'changed'):
                self.worker.recover_seal(self.batch,evidence)
            self.row=copy.deepcopy(original_row); self.host=copy.deepcopy(original_host); self.write_state()
            self.pane['revision']=1; stderr.write_bytes(stderr_before)
            evidence.write_text('{"review":"fixed evidence"}\n')
        proofpath=self.files/(self.label+'.tab-retirement.json')
        self.assertFalse(proofpath.exists())
        self.worker.recover_seal(self.batch,evidence); before=proofpath.read_bytes()
        self.pane['revision']+=1
        with self.assertRaisesRegex(ValueError,'seal changed'):
            self.worker.recover_seal(self.batch,evidence)
        self.assertEqual(proofpath.read_bytes(),before)

    def test_recovery_cannot_replace_original_supervisor_seal(self):
        evidence=self.recovery_fixture(); self.births[222]='12345'
        self.worker.seal(self.batch); self.births.pop(222)
        proofpath=self.files/(self.label+'.tab-retirement.json'); before=proofpath.read_bytes()
        with self.assertRaisesRegex(ValueError,'seal changed'):
            self.worker.recover_seal(self.batch,evidence)
        self.assertEqual(before,proofpath.read_bytes())

    def test_recovery_evidence_symlink_missing_and_sensitive_paths_rejected(self):
        evidence=self.recovery_fixture()
        link=evidence.with_name('link.json'); link.symlink_to(evidence)
        sensitive=self.root/'.env'; sensitive.write_text('fixed harmless fixture\n')
        for path in (link,sensitive,evidence.with_name('missing.json')):
            with self.subTest(path=path.name), self.assertRaises((ValueError,FileNotFoundError)):
                self.worker.recover_seal(self.batch,path)
        self.assertFalse((self.files/(self.label+'.tab-retirement.json')).exists())

    def test_recovered_seal_tick_rechecks_evidence_and_provenance(self):
        evidence=self.recovery_fixture(); self.worker.recover_seal(self.batch,evidence)
        proofpath=self.files/(self.label+'.tab-retirement.json'); original=proofpath.read_bytes()
        for bad in ('evidence','operator','wrapper','input','supervisor-reused','native-reused'):
            proofpath.write_bytes(original)
            before=evidence.read_bytes(); receipt_before=copy.deepcopy(self.receipt)
            if bad=='evidence': evidence.write_text('changed review\n')
            if bad=='operator':
                proof=tabs.load(proofpath); proof['recovery'].pop('operator_birth'); tabs.atomic(proofpath,proof)
            if bad=='wrapper': self.receipt['wrapper']['supervisor']['birth']='99999'; self.write_receipt()
            if bad=='input': self.screen=b'dw@host:~/fixture$ human draft'
            if bad=='supervisor-reused': self.births[222]='reused'
            if bad=='native-reused': self.births[444]='reused'
            with self.subTest(bad=bad):
                self.assertEqual(self.tick()[0]['state'],'retained'); self.assertTrue(self.present)
            self.receipt=receipt_before; self.write_receipt(); evidence.write_bytes(before)
            self.screen=b'dw@host:~/fixture$ '; self.births.pop(222,None); self.births.pop(444,None)
        self.assertFalse(any(c[:2]==('tab','close') for c in self.calls))


class PostmortemContract(LearnerTabs):
    # The scheduler batch key is timestamp-only; only its host label/receipts carry this suffix.
    fixture_batch = "20261023-032433"
    fixture_task = "postmortem"
    fixture_label = "learner-20261023-032433-postmortem"

    def test_timestamp_postmortem_paths_seal_owner_exit_and_tick(self):
        originals={path:path.read_bytes() for path in self.files.iterdir()}
        state=(self.directory/'learn.json').read_bytes()
        self.worker.seal(self.batch)
        proof=self.files/(self.label+'.tab-retirement.json')
        self.assertTrue(proof.is_file())
        self.assertFalse((self.files/('learner-'+self.batch+'.tab-retirement.json')).exists())
        self.assertEqual(self.worker.receipt_path(self.batch,'.tui.json'),self.files/(self.label+'.tui.json'))
        self.assertEqual(tabs.load(proof)['batch'],self.batch)
        self.assertEqual(tabs.load(proof)['label'],self.label)
        self.assertEqual(self.tick()[0]['state'],'queued')
        self.assertTrue(self.present)
        self.births.pop(222)
        self.assertEqual(self.tick()[0]['state'],'reclaimed')
        self.assertNotIn(self.label,tabs.load(self.directory/'herdr.json')['panes'])
        self.assertEqual(state,(self.directory/'learn.json').read_bytes())
        self.assertEqual(originals,{path:path.read_bytes() for path in originals})

    def test_legacy_missing_task_uses_the_same_postmortem_default_as_writer(self):
        self.row.pop('task'); self.write_state()
        self.seal()
        self.assertEqual(self.tick()[0]['state'],'reclaimed')
        self.assertEqual(list(tabs.load(self.directory/'learn.json')['batches']),[self.batch])
        self.assertNotIn(self.label,tabs.load(self.directory/'herdr.json')['panes'])

    def test_unsuffixed_receipt_is_not_guessed_or_rewritten(self):
        original=self.files/(self.label+'.tui.json')
        unsuffixed=self.files/('learner-'+self.batch+'.tui.json')
        original.rename(unsuffixed); before=unsuffixed.read_bytes()
        with self.assertRaises(FileNotFoundError): self.worker.seal(self.batch)
        self.assertEqual(before,unsuffixed.read_bytes())
        self.assertFalse(original.exists()); self.assertTrue(self.present)


if __name__ == "__main__": unittest.main()
