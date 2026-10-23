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
                if bad=="missing": proofpath.unlink()
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
                count=len(self.worker.inbox.read_text().splitlines())
                self.tick(); self.assertEqual(len(self.worker.inbox.read_text().splitlines()),count)
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

    def test_unknown_unregistered_learning_tab_is_retained_and_reported(self):
        tabs.atomic(self.directory/"learn.json",dict(batches={}))
        self.assertEqual(self.tick()[0]["state"],"retained")
        self.assertTrue(self.worker.inbox.exists()); self.assertTrue(self.present)

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
        self.assertEqual(self.tick()[0]['state'],'retained')
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
        self.assertTrue(self.present); self.assertTrue(self.worker.inbox.exists())
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
