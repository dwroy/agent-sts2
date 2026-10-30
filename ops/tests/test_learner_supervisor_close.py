"""Fixed supervisor decisions, native logs and fake process groups; never signal real processes."""
import copy
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import signal
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / 'ops'))
import learner_supervisor_close as close
import learner_tabs
import learner_tui
import own_learning_slot as slot
import learner_jobs


class SupervisorClose(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.directory = self.root / 'ops/codex-ops'
        self.files = self.directory / 'learner'; self.files.mkdir(parents=True)
        (self.root / '.agents').mkdir()
        (self.root / '.agents/board.yaml').write_bytes((REPO / '.agents/board.yaml').read_bytes())
        self.tree = self.root / '.worktrees/fixture'; self.tree.mkdir(parents=True)
        self.batch = '20261025-234303-strategy-proposal'
        self.label = 'learner-' + self.batch
        self.url = 'https://github.com/dwroy/agent-sts2/issues/77#issuecomment-123456'
        self.comment = dict(id=123456, user=dict(login='dwroy'),
                            issue_url='https://api.github.com/repos/dwroy/agent-sts2/issues/77', html_url=self.url,
                            body='[Claude] #77 裁决\n| ' + self.batch + ' | 作废收尾 |', updated_at='2026-10-30T01:00:00Z')
        self.row = dict(state='awaiting_review', pid=222, pane='wR:p1', worktree=str(self.tree),
                        task='strategy-proposal', key='original-demand', runs=['FIXTURE000001'],
                        rc=None, review_required='terminal-unverified-receipt')
        self.state = dict(batches={self.batch:self.row}, runs={'FIXTURE000001':dict(attempts=1)})
        self.pane = dict(pane_id='wR:p1', tab_id='wR:t1', workspace_id='wR', terminal_id='term-1', revision=1)
        self.present = False; self.draft = False; self.calls = []; self.signals = []; self.saves = 0
        self.host_registration = dict(workspace_id='wR', panes={self.label:dict(pane_id='wR:p1', title='fixture')})
        self.receipt = dict(label=self.label, pane=self.row['pane'], cwd=str(self.tree), pid=444, birth='404',
                            identity=self.pane.copy(), submitted=True, session='fixed-session', turn='fixed-turn',
                            agent_name='fixed-agent', state='needs-attention', retirement_authorized=False)
        self.native = self.root / 'native.jsonl'
        self.native_rows = [dict(type='session_meta', payload=dict(id='fixed-session', cwd=str(self.tree))),
            dict(type='event_msg', payload=dict(type='task_started', turn_id='fixed-turn')),
            dict(type='event_msg', timestamp='2026-10-25T01:00:00Z', payload=dict(type='task_complete', turn_id='fixed-turn'))]
        self.receipt.update(rollout=str(self.native), result=dict(code=75, failure_reason='foreign-native-activity',
                            session='fixed-session', turn='fixed-turn', rollout=str(self.native)))
        self.tui = self.files / (self.label + '.tui.json')
        self.deferred = self.files / (self.batch + '.verification-deferred.json')
        self.row['verification_deferred'] = str(self.deferred)
        self.plan = self.files / (self.batch + '.supervisor-close.json')
        self.processes = {333:dict(birth='303', ppid=1, pgid=333, sid=333, uid=os.getuid())}
        self.host = close.Host()
        self.host.processes = lambda: copy.deepcopy(self.processes)
        self.now = 1793318400  # 2026-10-30T00:00:00Z.
        self.write_originals()
        self.originals = {p:p.read_bytes() for p in (self.tui, self.deferred, self.native)}
        for target, name, kwargs in [
            (close, 'require_host_process_view', dict()),
            (slot, 'process_birth', dict(side_effect=self.birth)),
            (close, 'LearnerTabs', dict(side_effect=lambda root,directory,**kw: learner_tabs.LearnerTabs(root,directory,herdr=self.herdr,**kw))),
            (close.os, 'killpg', dict(side_effect=self.killpg)),
            (learner_tabs.issue_session, 'run', dict(side_effect=self.screen)),
            (learner_tabs.issue_session, 'process_children', dict(side_effect=self.children)),
            (learner_tabs.issue_session, 'processes', dict(return_value=False)),
        ]:
            mock = patch.object(target, name, **kwargs); mock.start(); self.addCleanup(mock.stop)

    def birth(self, pid):
        if type(pid) is not int or pid <= 1: raise ValueError('invalid process identity')
        return self.processes.get(pid, {}).get('birth')

    def children(self, proc):
        return {str(p) for p, row in self.processes.items() if row['ppid'] == int(proc.name)}

    def killpg(self, group, sig):
        self.signals.append((group, sig))
        self.assertEqual(sig, signal.SIGTERM)
        for pid in list(self.processes):
            if self.processes[pid]['pgid'] == group: del self.processes[pid]

    def screen(self, argv):
        return ('› ' + ('human draft' if self.draft else '')).encode() if 444 in self.processes else b'dw@host:~/fixture$ '

    def herdr(self, *args):
        self.calls.append(args)
        if args == ('workspace','list'): return dict(workspaces=[dict(workspace_id='wR', label='sts2-run')])
        if args[:2] == ('pane','list'): return dict(panes=[copy.deepcopy(self.pane)] if self.present else [])
        if args[:2] == ('pane','get'): return dict(pane=copy.deepcopy(self.pane))
        if args[:2] == ('tab','list'): return dict(tabs=[dict(tab_id='wR:t1', label=self.label, pane_count=1)])
        if args[:2] == ('pane','process-info'):
            return dict(process_info=dict(shell_pid=333, foreground_process_group_id=444 if 444 in self.processes else 333,
                        foreground_processes=[dict(pid=p) for p in self.processes if p != 333]))
        if args[:2] == ('agent','get'):
            return dict(agent=dict(agent='codex', name='fixed-agent', agent_status='done', foreground_cwd=str(self.tree)))
        raise AssertionError(args)

    def write_originals(self, deferred_pid=None):
        self.native.write_text(''.join(json.dumps(r)+'\n' for r in self.native_rows))
        self.tui.write_text(json.dumps(self.receipt))
        registration = {k:self.row.get(k) for k in learner_tui.REGISTRATION_FIELDS}
        registration['pid'] = deferred_pid or self.row['pid']
        self.deferred.write_text(json.dumps(dict(schema='learner-verification-deferred-v1', batch=self.batch,
                    registration=registration, supervisor=dict(pid=registration['pid'], birth='202'))))
        (self.directory / 'learn.json').write_text(json.dumps(self.state))
        (self.directory / 'herdr.json').write_text(json.dumps(self.host_registration))

    def save(self, state):
        self.saves += 1
        (self.directory / 'learn.json').write_text(json.dumps(state))

    def apply(self, **kwargs):
        return close.close(self.root, self.directory, self.state, self.batch, self.url, self.save,
                           fetch=lambda _:copy.deepcopy(self.comment), host=self.host, now=self.now, **kwargs)

    def live(self):
        self.present=True; self.pane['agent']='codex'
        self.processes.update({
            444:dict(birth='404', ppid=333, pgid=444, sid=333, uid=os.getuid()),
            445:dict(birth='405', ppid=444, pgid=444, sid=333, uid=os.getuid()),
            446:dict(birth='406', ppid=445, pgid=444, sid=333, uid=os.getuid()),
            447:dict(birth='407', ppid=445, pgid=447, sid=333, uid=os.getuid())})
        self.write_originals()

    def test_supervisor_authority_is_bound_to_comment_issue_batch_and_explicit_void(self):
        changes = [dict(user=dict(login='outsider')),dict(body='[ops] '+self.batch+' 作废收尾'),
                   dict(issue_url='https://api.github.com/repos/dwroy/agent-sts2/issues/56'),
                   dict(body='[Claude] other-batch 作废收尾'),dict(body='[Claude] '+self.batch+' 不要作废收尾'),
                   dict(id=999),dict(html_url=self.url+'0')]
        for changed in changes:
            with self.subTest(changed=changed):
                with self.assertRaises(ValueError): close.verdict(self.url,self.batch,lambda _:dict(self.comment,**changed))
        for url in [self.url.replace('/77#','/56#'),self.url+'?fake',self.url.replace('https:','http:')]:
            with self.assertRaises(ValueError): close.verdict(url,self.batch,lambda _:self.comment)
        self.assertEqual(close.verdict(self.url,self.batch,lambda _:self.comment)['url'],self.url)
        self.assertFalse(self.plan.exists()); self.assertFalse(self.signals)

    def test_pane_absence_preserves_original_failures_and_releases_only_compute(self):
        before=copy.deepcopy(self.row)
        result=self.apply()
        self.assertEqual(result['exceptions'],['pane_absent'])
        self.assertEqual(close.original(self.row),before)
        self.assertEqual({p:p.read_bytes() for p in self.originals},self.originals)
        report=json.loads(self.plan.read_text())
        self.assertEqual(report['state'],'supervisor_voided')
        for key in ['retry_authorized','success','published','retirement_authorized']:self.assertIs(report[key],False)
        status=slot.snapshot(self.state,lambda pid:self.birth(pid) is not None,self.directory)
        self.assertFalse(status['busy']); self.assertFalse(status['pending_review'])
        self.assertEqual(status['closed'][0]['reason'],'supervisor_voided')
        self.assertFalse(learner_jobs.retryable(self.state,self.row['task'],self.row['key']))
        self.assertFalse(self.signals)
        self.assertFalse(any('close' in call for call in self.calls))

    def test_idle_native_with_descendants_terms_child_group_then_native_group(self):
        self.live()
        self.assertEqual(self.apply()['state'],'supervisor_voided')
        self.assertEqual(self.signals,[(447,signal.SIGTERM),(444,signal.SIGTERM)])
        self.assertEqual(set(self.processes),{333})
        self.assertEqual(self.receipt['result']['code'],75)
        self.assertFalse(json.loads(self.plan.read_text())['latest_turn']['prompt_verified'])

    def test_active_turn_queued_input_and_recent_terminal_refuse_before_term(self):
        self.live()
        base=copy.deepcopy(self.native_rows)
        for tail in [dict(type='event_msg',payload=dict(type='task_started',turn_id='next')),
                     dict(type='event_msg',payload=dict(type='user_message',message='new work'))]:
            self.native_rows=base+[tail];self.write_originals()
            with self.assertRaisesRegex(ValueError,'active|pending input'):self.apply()
        self.native_rows=base;self.native_rows[-1]['timestamp']='2026-10-29T23:45:00Z';self.write_originals()
        with self.assertRaisesRegex(ValueError,'30 minutes'):self.apply()
        self.assertFalse(self.signals);self.assertFalse(self.plan.exists())

    def test_source_writer_and_publication_transaction_refuse_before_term(self):
        self.live()
        for name in ['knowledge-refresh.lock','live-merge.lock']:
            with (self.root/'ops'/name).open('a') as owner:
                fcntl.flock(owner,fcntl.LOCK_EX|fcntl.LOCK_NB)
                with self.assertRaises(BlockingIOError):self.apply()
        with patch.object(close.publication_gate,'read',return_value=dict(phase='publishing')):
            with self.assertRaisesRegex(ValueError,'write transaction'):self.apply()
        self.assertFalse(self.signals);self.assertFalse(self.plan.exists())

    def test_d1_release_lock_and_unfinished_attempt_refuse_without_database_mutation(self):
        self.live()
        data=self.root/'data/fixed';data.mkdir(parents=True)
        db=sqlite3.connect(data/'learning.sqlite');db.execute('CREATE TABLE data_attempts(payload TEXT)');db.commit();db.close()
        selection=dict(read_directories=[str(data)],enabled=True,directory=str(data))
        with patch('learning_runtime.capture',return_value=selection):
            with (data/'data-publication.lock').open('a') as owner:
                fcntl.flock(owner,fcntl.LOCK_EX|fcntl.LOCK_NB)
                with self.assertRaises(BlockingIOError):self.apply()
            journal=data/'refresh-journal-fixture.json'
            journal.write_text(json.dumps(dict(schema='fixed-data-journal-v1',status='preparing')))
            before=(data/'learning.sqlite').read_bytes()
            with self.assertRaisesRegex(ValueError,'D1 attempt/release'):self.apply()
            self.assertEqual((data/'learning.sqlite').read_bytes(),before)
            journal.write_text(json.dumps(dict(schema='fixed-data-journal-v1',status='committed')))
            self.apply()
            self.assertEqual((data/'learning.sqlite').read_bytes(),before)

    def test_repeat_is_idempotent_and_reuses_durable_completion_after_state_save_crash(self):
        self.live();self.apply()
        receipt=self.plan.read_bytes();state=copy.deepcopy(self.state)
        self.assertTrue(self.apply()['already_closed'])
        self.assertEqual(self.plan.read_bytes(),receipt);self.assertEqual(self.state,state)
        self.assertEqual(len(self.signals),2);self.assertEqual(self.saves,1)
        self.row.pop('supervisor_close')
        self.assertTrue(self.apply()['already_closed']);self.assertEqual(len(self.signals),2)
        self.assertEqual(self.saves,2)

    def test_pane_absence_allows_only_stopped_recovery_supervisor_pid_difference(self):
        self.write_originals(deferred_pid=223)
        self.processes[223]=dict(birth='203',ppid=1,pgid=223,sid=223,uid=os.getuid())
        with self.assertRaisesRegex(ValueError,'supervisor is active'):self.apply()
        self.processes.pop(223)
        self.assertIn('pane_absent_recovery_supervisor',self.apply()['exceptions'])
        self.assertEqual(json.loads(self.plan.read_text())['supervisor_pids'],[222,223])

    def test_shared_root_postmortem_missing_pane_and_recovery_supervisor(self):
        self.batch='20261025-071302';self.label='learner-'+self.batch+'-postmortem'
        self.comment['body']='[Claude] #77 裁决\n| '+self.batch+' postmortem | 作废收尾 |'
        self.row.pop('task');self.row.pop('worktree');self.row.pop('key')
        self.state['batches']={self.batch:self.row}
        self.receipt.update(label=self.label,cwd=str(self.root))
        self.native_rows[0]['payload']['cwd']=str(self.root)
        self.tui=self.files/(self.label+'.tui.json');self.deferred=self.files/(self.batch+'.verification-deferred.json')
        self.row['verification_deferred']=str(self.deferred)
        self.plan=self.files/(self.batch+'.supervisor-close.json')
        self.write_originals(deferred_pid=223)
        with patch.object(learner_tabs.issue_session,'processes',side_effect=AssertionError('shared ROOT is not this learner')):
            self.assertIn('pane_absent_recovery_supervisor',self.apply()['exceptions'])
        self.assertFalse(slot.snapshot(self.state,lambda _:False,self.directory)['busy'])

    def test_nonreview_registration_keeps_original_recovery_and_cannot_retry_after_void(self):
        self.row['state']='running'
        with self.assertRaisesRegex(ValueError,'awaiting_review'):self.apply()
        self.assertFalse(self.plan.exists());self.assertFalse(self.signals)

    def test_identity_reuse_unrelated_group_and_nonempty_composer_refuse(self):
        self.live();saved=copy.deepcopy(self.processes)
        self.processes[444]['birth']='reused'
        with self.assertRaisesRegex(ValueError,'PID reused'):self.apply()
        self.processes=copy.deepcopy(saved)
        self.processes[777]=dict(birth='777',ppid=1,pgid=447,sid=333,uid=os.getuid())
        with self.assertRaisesRegex(ValueError,'unrelated'):self.apply()
        self.processes=copy.deepcopy(saved);self.draft=True
        with self.assertRaisesRegex(ValueError,'input'):self.apply()
        self.assertFalse(self.signals)

    def test_unrelated_workspace_writer_or_replaced_pane_keeps_slot(self):
        self.live()
        with patch.object(learner_tabs.issue_session,'processes',return_value=True):
            with self.assertRaisesRegex(ValueError,'workspace.*work'):self.apply()
        self.pane['terminal_id']='replacement'
        with self.assertRaisesRegex(ValueError,'pane identity'):self.apply()
        self.assertFalse(self.signals)

    def test_host_term_timeout_never_uses_kill_or_finishes(self):
        self.live()
        def ignored(group,sig):self.signals.append((group,sig))
        with patch.object(close.os,'killpg',side_effect=ignored),patch.object(close.time,'monotonic',side_effect=[0,0,11]),patch.object(close.time,'sleep'):
            with self.assertRaisesRegex(ValueError,'no KILL'):self.apply()
        self.assertEqual(self.signals,[(447,signal.SIGTERM),(444,signal.SIGTERM)])
        self.assertNotIn('supervisor_close',self.row)
        self.assertEqual(json.loads(self.plan.read_text())['state'],'attention')

    def test_term_timeout_and_crash_leave_slot_held_and_never_escalate(self):
        self.live()
        def fail(members): raise ValueError('TERM did not stop every native descendant; no KILL')
        with patch.object(self.host,'stop',side_effect=fail):
            with self.assertRaisesRegex(ValueError,'no KILL'):self.apply()
        self.assertNotIn('supervisor_close',self.row)
        self.assertEqual(json.loads(self.plan.read_text())['state'],'attention')
        self.assertTrue(slot.snapshot(self.state,lambda pid:self.birth(pid) is not None,self.directory)['busy'])
        self.apply()
        self.assertEqual(len(self.signals),2)

    def test_receipt_tamper_or_reused_closed_pid_keeps_compute_slot(self):
        self.apply()
        self.row['key']='changed'
        self.assertTrue(slot.snapshot(self.state,lambda _:False,self.directory)['busy'])
        self.row['key']='original-demand'
        self.processes[444]=dict(birth='reused',ppid=1,pgid=444,sid=444,uid=os.getuid())
        self.assertTrue(slot.snapshot(self.state,lambda p:self.birth(p) is not None,self.directory,birth=self.birth)['busy'])
        with self.assertRaisesRegex(ValueError,'PID is active'):self.apply()

    def test_late_finish_and_busy_learn_lock_do_not_turn_void_into_success(self):
        spec=importlib.util.spec_from_file_location('scheduler_close_fixture',REPO/'ops/codex-ops-learn.py')
        scheduler=importlib.util.module_from_spec(spec);spec.loader.exec_module(scheduler)
        self.apply();before=copy.deepcopy(self.state)
        from types import SimpleNamespace
        with patch.object(scheduler,'load_state',return_value=self.state),patch.object(scheduler,'save_state') as save:
            self.assertEqual(scheduler.cmd_finish(SimpleNamespace(batch=self.batch,rc=0)),75)
        save.assert_not_called();self.assertEqual(self.state,before)
        env={**os.environ,'CODEX_OPS_ROOT':str(self.root),'CODEX_OPS_DIR':str(self.directory)}
        with (self.directory/'learn.lock').open('a') as owner:
            fcntl.flock(owner,fcntl.LOCK_EX|fcntl.LOCK_NB)
            result=subprocess.run([sys.executable,'-B',str(REPO/'ops/codex-ops-learn.py'),'close','--batch',self.batch,'--verdict',self.url],
                                  env=env,capture_output=True,text=True,timeout=5)
        self.assertEqual(result.returncode,75,result.stderr)
        self.assertEqual(json.loads(result.stdout)['reason'],'learn_state_transaction_active')


if __name__=='__main__':unittest.main()
