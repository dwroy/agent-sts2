import copy
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
import issue_session as resource
import worktree_checkout as checkout
import worktree_retention as workspaces


class IssueSessions(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.directory = self.root / 'ops/codex-ops'
        self.directory.mkdir(parents=True)
        self.git('init', '-b', 'main')
        self.git('config', 'commit.gpgsign', 'false')
        (self.root / '.gitignore').write_text('.worktrees/\nops/codex-ops/\nagent/node_modules\n**/__pycache__/\n')
        (self.root / 'agent/src').mkdir(parents=True)
        (self.root / 'agent/src/example.ts').write_text('export const fixed = 1;\n')
        (self.root / 'README.md').write_text('fixed\n')
        (self.root / '.agents').mkdir()
        (self.root / '.agents/board.yaml').write_bytes((Path(resource.__file__).parents[1] / '.agents/board.yaml').read_bytes())
        (self.root / 'ops/issue_session_project.py').write_bytes((Path(resource.__file__).parent / 'issue_session_project.py').read_bytes())
        self.git('add', '.')
        self.git('commit', '-m', 'fixed source')
        self.head = self.git('rev-parse', 'HEAD').strip()
        self.live = self.root / '.worktrees/live'
        self.git('worktree', 'add', '-b', 'live', str(self.live))
        self.tree = self.root / '.worktrees/issue-17-fixture'
        self.git('worktree', 'add', '-b', self.tree.name, str(self.tree))
        self.sessions = resource.Sessions(self.root, self.directory)
        self.row = dict(issue=17, slug='fixture', branch=self.tree.name, label='issue-17',
                        worktree=str(self.tree), base=self.head, started_at='2026-10-21T00:00:00+08:00',
                        state='active', workspace='wF', tab='wF:t1', pane='wF:p1', terminal='term_fixed')
        self.sessions.data['sessions']['17'] = self.row
        self.sessions.save()
        self.closed = True
        self.status = 'idle'
        self.present = True
        self.screen = '\x1b[1m›\x1b[0m \x1b[2mAsk Codex to do anything\x1b[0m'
        self.events = []
        self.actual_run = resource.run
        self.pane = dict(pane_id='wF:p1', tab_id='wF:t1', workspace_id='wF', terminal_id='term_fixed',
                         cwd=str(self.tree), foreground_cwd=str(self.tree), agent='codex')
        self.tab = dict(tab_id='wF:t1', workspace_id='wF', label='issue-17', pane_count=1)
        self.info = dict(shell_pid=101, foreground_process_group_id=102,
                         foreground_processes=[dict(pid=102, name='codex')])
        for target, options in (
            ('herdr', dict(side_effect=self.herdr)), ('run', dict(side_effect=self.cli)),
            ('processes', dict(return_value=False)),
        ):
            mock = patch.object(resource, target, **options).start()
            self.addCleanup(patch.stopall)
            setattr(self, target + '_mock', mock)
        self.issue_mock = patch.object(self.sessions, 'issue', side_effect=self.issue).start()
        self.notice_mock = patch.object(self.sessions, 'notice').start()
        patch.object(resource.retention, 'require_host_process_view').start()

    def git(self, *args, tree=None):
        result = subprocess.run(['git', '-C', str(tree or self.root), *args], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def issue(self, number):
        return {'state': 'CLOSED' if self.closed else 'OPEN',
                'author': {'login': self.sessions.board.owner}, 'comments': []}

    def cli(self, args, **kwargs):
        self.events.append(tuple(map(str, args)))
        if args[:3] == ['herdr', 'pane', 'read']:
            return self.screen.encode() if 'visible' in args else b'fixed tail\n'
        if args[:2] == ['python3', 'ops/worktree_checkout.py']:
            return (checkout.create(self.root, self.directory, Path(args[3]), args[4]) and b'') or b''
        if args[:3] == ['python3', 'ops/issue_session_project.py', 'prepare']:
            dependency = Path(args[4]) / 'agent/node_modules'
            if not dependency.is_symlink() or dependency.resolve() != (self.root / 'agent/node_modules').resolve():
                raise ValueError('dependency verification failed')
            return b'{"prepared":true}'
        if args[:3] == ['python3', 'ops/worktree_retention.py', 'complete']:
            flags = dict(zip(args[3::2], args[4::2]))
            return json.dumps(workspaces.complete(self.root, self.directory, flags['--workspace'],
                              flags['--source'], flags['--main-commit'], flags['--live-commit'])).encode()
        raise AssertionError('unexpected external CLI in fixed-data test')

    def herdr(self, *args):
        self.events.append(args)
        if args[:2] == ('tab', 'list'):
            return {'tabs': [self.tab] if self.present else []}
        if args[:2] == ('pane', 'list'):
            return {'panes': [self.pane] if self.present else []}
        if args[:2] == ('pane', 'get'):
            return {'pane': self.pane}
        if args[:2] == ('tab', 'get'):
            return {'tab': self.tab}
        if args[:2] == ('pane', 'process-info'):
            return {'process_info': self.info}
        if args[:2] == ('agent', 'get'):
            return {'agent': dict(self.pane, name='issue-17', agent_status=self.status)}
        if args[:2] == ('workspace', 'list'):
            return {'workspaces': [dict(workspace_id='wF', label=self.sessions.board.workspace)]}
        if args[:2] == ('agent', 'list'):
            return {'agents': []}
        if args[:2] == ('tab', 'close'):
            self.assertTrue(list((self.directory / 'issue-session-tails').glob('17-*.log')))
            self.assertFalse((self.directory / 'retention/workspaces' / (self.tree.name + '.json')).exists())
            self.present = False
            return {}
        if args[:2] in (('tab', 'create'), ('workspace', 'create')):
            self.pane.update(cwd=str(self.tree), foreground_cwd=str(self.tree))
            self.info.update(foreground_process_group_id=101, foreground_processes=[])
            return {'workspace': {'workspace_id': 'wF'}, 'tab': self.tab, 'root_pane': self.pane}
        if args[:2] in (('agent', 'start'), ('agent', 'rename'), ('agent', 'prompt'), ('tab', 'rename')):
            return {}
        raise AssertionError('unexpected Herdr action: ' + str(args))

    def assert_retained(self, reason):
        result = self.sessions.reclaim(17, True)
        self.assertEqual(result['state'], 'retained', result)
        self.assertIn(reason, result['reason'])
        self.assertTrue(self.present)
        self.assertTrue((self.tree / '.git').is_file())

    def test_dry_run_is_read_only_and_unregistered_does_not_discover_tabs(self):
        before = self.sessions.path.read_bytes()
        self.assertEqual(self.sessions.reclaim(17)['state'], 'eligible')
        self.assertEqual(before, self.sessions.path.read_bytes())
        self.assertFalse((self.directory / 'issue-session-tails').exists())
        self.notice_mock.assert_not_called()
        self.events.clear()
        self.assertEqual(self.sessions.reclaim(99, True)['state'], 'unregistered')
        self.assertEqual(self.events, [])

    def test_full_lifecycle_uses_original_worker_and_keeps_branch_and_unique_artifact(self):
        unique = self.tree / 'logs/original.jsonl'
        unique.parent.mkdir()
        unique.write_text('original fixed event\n')
        self.git('config', 'core.excludesfile', str(self.root / 'excludes'))
        (self.root / 'excludes').write_text('logs/\n')
        result = self.sessions.reclaim(17, True)
        self.assertEqual(result['state'], 'waiting-worktree', result)
        self.assertFalse(self.present)
        self.assertTrue((self.tree / '.git').exists())
        with patch.object(workspaces, 'active', return_value=False):
            self.assertEqual(workspaces.reclaim(self.root, self.directory, self.tree.name, True)['state'], 'reclaimed')
        self.assertEqual(self.sessions.reclaim(17, True)['state'], 'reclaimed')
        self.assertEqual(self.sessions.reclaim(17, True)['state'], 'reclaimed')
        self.assertFalse((self.tree / '.git').exists())
        self.assertEqual(unique.read_text(), 'original fixed event\n')
        self.assertEqual(self.git('rev-parse', self.tree.name).strip(), self.head)
        self.assertEqual(sum(e[:2] == ('tab', 'close') for e in self.events), 1)

    def test_open_issue_is_not_reclaimed(self):
        self.closed = False
        self.assert_retained('not closed')

    def test_busy_blocked_and_unknown_agents_are_not_reclaimed(self):
        for status in ('working', 'blocked', 'unknown'):
            with self.subTest(status=status):
                self.status = status
                self.assert_retained('working, blocked, unknown')

    def test_background_process_blocks_reclaim(self):
        self.processes_mock.return_value = True
        self.assert_retained('active processes')

    def test_incomplete_host_visibility_keeps_the_session(self):
        with patch.object(resource.retention, 'require_host_process_view', side_effect=ValueError('host process view required')):
            self.assert_retained('host process view')

    def test_unexpected_foreground_process_blocks_reclaim(self):
        self.info['foreground_processes'].append(dict(pid=103, name='play'))
        self.assert_retained('unexpected foreground')

    def test_only_verified_idle_ui_processes_are_exempted(self):
        self.info['foreground_processes'].append(dict(pid=103, name='node', argv=['node', '/fixed/bin/codex']))
        self.assertEqual(self.sessions.reclaim(17)['state'], 'eligible')
        self.processes_mock.assert_called_once_with(self.tree, {101, 102, 103}, self.sessions.process_cwd)

    def test_unsent_draft_or_missing_composer_blocks_reclaim(self):
        for screen in ('› do not lose this draft', 'menu, not a prompt'):
            with self.subTest(screen=screen):
                self.screen = screen
                self.assert_retained('composer')

    def test_replaced_relabelled_split_or_moved_pane_is_not_reclaimed(self):
        original_tab, original_pane = copy.deepcopy(self.tab), copy.deepcopy(self.pane)
        for target, key, value in ((self.tab, 'label', 'watcher'), (self.tab, 'pane_count', 2),
                                   (self.pane, 'terminal_id', 'replacement'), (self.pane, 'pane_id', 'wF:p2'),
                                   (self.pane, 'cwd', str(self.live))):
            with self.subTest(key=key):
                target[key] = value
                self.assert_retained('changed' if target is self.tab else 'identity')
                self.tab.clear(); self.tab.update(original_tab)
                self.pane.clear(); self.pane.update(original_pane)

    def test_active_learner_or_pending_request_prevents_tab_close(self):
        resource.retention.atomic(self.directory / 'learn.json', {'batches': {'fixed': {'worktree': str(self.tree), 'state': 'running'}}})
        self.assert_retained('active learner')
        (self.directory / 'learn.json').unlink()
        folder = self.root / 'notes/learning-requests'
        folder.mkdir(parents=True)
        resource.retention.atomic(folder / 'fixed.json', {'input': str(self.tree / 'evidence')})
        self.assert_retained('original request')

    def test_game_instance_binding_is_not_eligible(self):
        (self.tree / 'ops').mkdir(exist_ok=True)
        (self.tree / 'ops/instance-binding.json').write_text('{}')
        self.assert_retained('persistent game instance')

    def test_inherited_binding_allows_tab_close_but_requires_primary_proof_for_deletion(self):
        marker = self.tree / 'ops/instance-binding.json'
        marker.parent.mkdir(exist_ok=True)
        marker.write_text('{"process_id": 12345, "base_url": "http://127.0.0.1:12345", "native_profile_id": "fixture"}\n')
        self.git('add', 'ops/instance-binding.json', tree=self.tree)
        self.git('commit', '-m', 'fixed allocation metadata', tree=self.tree)
        base = self.git('rev-parse', 'HEAD', tree=self.tree).strip()
        self.sessions.data['sessions'].clear()
        self.assertEqual(self.sessions.register(17, 'fixture', 'wF:p1', base,
                         self.row['started_at'])['state'], 'registered')
        self.assertEqual(self.sessions.reclaim(17)['state'], 'eligible')
        self.assertTrue(self.present)
        result = self.sessions.reclaim(17, True)
        self.assertEqual(result['state'], 'retained', result)
        # Issue #23 admits inherited copies only after independently proving the primary runtime.
        self.assertIn('unknown or conflicting instance identity', result['reason'])
        self.assertFalse(self.present)
        self.assertEqual(self.sessions.data['sessions']['17']['state'], 'waiting-worktree')
        self.assertTrue(marker.is_file())
        self.assertTrue(list((self.directory / 'issue-session-tails').glob('17-*.log')))
        self.assertFalse((self.directory / 'retention/workspaces' / (self.tree.name + '.json')).exists())
        # A new/changed game binding is still a session gate, before any close.
        self.present = True
        marker.write_text('{"process_id": 99999, "base_url": "http://127.0.0.1:12345", "native_profile_id": "fixture"}\n')
        self.assert_retained('binding changed')

    def test_register_cli_reports_specific_mismatch_to_stdout_and_inbox(self):
        self.sessions.data['sessions'].clear()
        self.sessions.save()
        self.pane['cwd'] = str(self.live)
        args = ['issue_session.py', '--root', str(self.root), 'register', '17', 'fixture',
                '--pane', 'wF:p1', '--base', self.head, '--started-at', self.row['started_at']]
        with patch.object(sys, 'argv', args), patch.object(sys, 'stdout', io.StringIO()) as output:
            self.assertEqual(resource.main(), 1)
        result = json.loads(output.getvalue())
        self.assertEqual(result['stage'], 'register')
        self.assertIn('pane cwd mismatch', result['reason'])
        self.assertIn(result['reason'], (self.root / 'ops/inbox-dev.md').read_text())
        self.assertEqual(resource.retention.load(self.sessions.path)['sessions'], {})

    def test_failure_diagnostics_do_not_disclose_subprocess_output_or_os_filename(self):
        error = subprocess.TimeoutExpired(['tool', 'private-token'], 90, output=b'private-output')
        self.assertNotIn('private', resource.failure_reason(error))
        error = PermissionError(13, 'Permission denied', '/private-key')
        self.assertEqual(resource.failure_reason(error), 'system operation failed: Permission denied')
        self.assertIn('field: pane', resource.failure_reason(KeyError('pane')))

    def test_process_probe_checks_namespace_and_pid_start_time(self):
        proc = Path('/proc') / str(os.getpid())
        namespace = os.readlink('/proc/self/ns/pid')
        started = resource.retention_process_start(proc)
        reply = dict(pid=os.getpid(), pid_namespace=namespace, start_time=started, cwd='/')
        with patch.object(resource, 'run', return_value=json.dumps(reply).encode()):
            self.assertEqual(self.sessions.process_cwd(proc), '/')
            for field, value in [('pid', 1), ('pid_namespace', 'other'), ('start_time', '0'), ('cwd', None)]:
                changed = dict(reply, **{field: value})
                with patch.object(resource, 'run', return_value=json.dumps(changed).encode()):
                    with self.assertRaisesRegex(ValueError, 'identity mismatch'):
                        self.sessions.process_cwd(proc)
        helper = Path(resource.__file__).parent / 'issue_process_cwd.py'
        result = subprocess.run([sys.executable, str(helper), str(os.getpid()), namespace, started], capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['cwd'], os.getcwd())
        result = subprocess.run([sys.executable, str(helper), str(os.getpid()), 'wrong-host', started], capture_output=True)
        self.assertNotEqual(result.returncode, 0)

    def test_dirty_index_worktree_and_untracked_are_patched_without_reset(self):
        (self.tree / 'README.md').write_text('staged draft\n')
        self.git('add', 'README.md', tree=self.tree)
        (self.tree / 'README.md').write_text('unstaged revision\n')
        (self.tree / 'new.txt').write_text('untracked draft\n')
        self.assertTrue(self.sessions.reclaim(17)['patch_required'])
        result = self.sessions.reclaim(17, True)
        self.assertEqual(result['state'], 'retained', result)
        self.assertFalse(self.present)
        self.assertIn('dirty changes patched', result['reason'])
        folder = self.root / 'paper/materials/issue-session/17'
        self.assertIn('staged draft', next(folder.glob('index-*.patch')).read_text())
        self.assertIn('unstaged revision', next(folder.glob('worktree-*.patch')).read_text())
        self.assertIn('untracked draft', next(folder.glob('untracked-*.patch')).read_text())
        self.assertEqual((self.tree / 'README.md').read_text(), 'unstaged revision\n')
        self.assertEqual((self.tree / 'new.txt').read_text(), 'untracked draft\n')
        with self.assertRaisesRegex(ValueError, 'dirty'):
            workspaces.reclaim(self.root, self.directory, self.tree.name, True)

    def test_sensitive_filename_and_symlink_patch_are_refused_before_close(self):
        (self.tree / '.env').write_text('opaque fixture')
        self.assert_retained('credential-named')
        (self.tree / '.env').unlink()
        (self.tree / 'foreign').symlink_to(self.root / 'README.md')
        self.assert_retained('symlink')

    def test_unpublished_source_ref_is_preserved_and_original_gate_still_blocks_worktree(self):
        (self.tree / 'agent/src/example.ts').write_text('export const fixed = 2;\n')
        self.git('add', '.', tree=self.tree)
        self.git('commit', '-m', 'unpublished fixed change', tree=self.tree)
        source = self.git('rev-parse', 'HEAD', tree=self.tree).strip()
        result = self.sessions.reclaim(17, True)
        self.assertEqual(result['state'], 'retained', result)
        self.assertIn('not in recorded publication', result['reason'])
        self.assertFalse(self.present)
        self.assertEqual(self.git('rev-parse', self.tree.name).strip(), source)
        self.assertTrue((self.tree / '.git').exists())

    def test_tab_close_transport_failure_reconciles_absence_before_retry(self):
        original = self.herdr
        def ambiguous(*args):
            if args[:2] == ('tab', 'close'):
                original(*args)
                raise ValueError('injected lost close acknowledgement')
            return original(*args)
        self.herdr_mock.side_effect = ambiguous
        self.assertEqual(self.sessions.reclaim(17, True)['state'], 'retained')
        self.herdr_mock.side_effect = original
        self.assertEqual(self.sessions.reclaim(17, True)['state'], 'waiting-worktree')
        self.assertEqual(sum(e[:2] == ('tab', 'close') for e in self.events), 1)

    def test_tail_failure_or_last_moment_turn_does_not_close_tab(self):
        self.run_mock.side_effect = ValueError('injected read failure')
        self.assert_retained('injected read')
        self.run_mock.side_effect = self.cli
        original = self.sessions.terminal
        calls = []
        def changed(row):
            calls.append(1)
            if len(calls) == 2:
                self.status = 'working'
            return original(row)
        with patch.object(self.sessions, 'terminal', side_effect=changed):
            self.assert_retained('working, blocked, unknown')

    def test_reopened_issue_is_rechecked_before_close(self):
        states = iter(['CLOSED', 'OPEN'])
        self.issue_mock.side_effect = lambda n: {'state': next(states)}
        self.assert_retained('issue or source changed')

    def test_registry_corruption_and_protected_bindings_are_not_overwritten(self):
        for raw in (b'{broken', b'[]', b'{"schema":"unknown"}'):
            self.sessions.path.write_bytes(raw)
            with self.assertRaises((ValueError, TypeError)):
                resource.Sessions(self.root, self.directory)
            self.assertEqual(self.sessions.path.read_bytes(), raw)
        for key, value in (('worktree', str(self.live)), ('label', 'ops'), ('pane', 'wF:p9\n'), ('base', 'main')):
            row = copy.deepcopy(self.row); row[key] = value
            self.sessions.data['sessions']['17'] = row
            with self.assertRaises(ValueError):
                self.sessions.save()

    def test_corrupt_cli_registry_writes_inbox_and_never_calls_herdr(self):
        self.sessions.path.write_bytes(b'{broken registry')
        args = ['issue_session.py', '--root', str(self.root), '--state-dir', str(self.directory), 'tick']
        with patch.object(sys, 'argv', args), patch.object(sys, 'stdout', io.StringIO()) as output:
            self.assertEqual(resource.main(), 1)
            self.assertEqual(json.loads(output.getvalue())['state'], 'retained')
        self.assertEqual(self.sessions.path.read_bytes(), b'{broken registry')
        self.assertIn('tick 失败', (self.root / 'ops/inbox-dev.md').read_text())
        self.herdr_mock.assert_not_called()

    def test_duplicate_terminal_binding_is_rejected(self):
        second = copy.deepcopy(self.row)
        second.update(issue=18, branch='issue-18-fixture', label='issue-18',
                      worktree=str(self.root / '.worktrees/issue-18-fixture'))
        self.sessions.data['sessions']['18'] = second
        with self.assertRaisesRegex(ValueError, 'duplicate terminal'):
            self.sessions.save()

    def test_missing_tab_transport_error_is_not_treated_as_absence(self):
        self.herdr_mock.side_effect = ValueError('injected transport failure')
        self.assert_retained('transport failure')

    def test_tick_checks_registered_closed_only_and_deduplicates_inbox(self):
        self.closed = False
        self.assertEqual(self.sessions.tick(), [])
        self.closed = True
        self.status = 'working'
        self.assertEqual(self.sessions.tick()[0]['state'], 'retained')
        before = (self.root / 'ops/inbox-dev.md').read_bytes()
        self.sessions.tick()
        self.assertEqual((self.root / 'ops/inbox-dev.md').read_bytes(), before)
        self.assertTrue(all(call.args[0] == 17 for call in self.issue_mock.call_args_list))

    def test_failed_notification_is_reported_to_inbox(self):
        self.notice_mock.side_effect = ValueError('injected notification error')
        self.status = 'working'
        self.assertEqual(self.sessions.tick()[0]['state'], 'retained')
        self.assertIn('injected notification error', (self.root / 'ops/inbox-dev.md').read_text())

    def test_one_failed_issue_does_not_skip_other_registered_issues(self):
        second = copy.deepcopy(self.row)
        second.update(issue=18, branch='issue-18-fixture', label='issue-18', tab='wF:t2', pane='wF:p2',
                      worktree=str(self.root / '.worktrees/issue-18-fixture'))
        self.sessions.data['sessions']['18'] = second; self.sessions.save()
        def state(number):
            if number == 17:
                raise ValueError('injected failed lookup')
            return {'state': 'OPEN'}
        self.issue_mock.side_effect = state
        self.assertEqual(self.sessions.tick()[0]['state'], 'retained')
        self.assertEqual([c.args[0] for c in self.issue_mock.call_args_list], [17, 18])

    def test_spawn_uses_allocator_exact_account_and_launch_args_and_is_idempotent(self):
        self.sessions.data['sessions'].clear(); self.sessions.save()
        self.closed = False
        home = self.root / 'fixture-home'; home.mkdir(); (home / 'auth.json').touch()
        (self.directory / 'codex-home').write_text(str(home))
        (self.root / 'agent/node_modules').mkdir()
        (self.tree / 'agent/node_modules').symlink_to(self.root / 'agent/node_modules', target_is_directory=True)
        with patch.object(checkout, 'create') as allocate, patch.object(os, 'setpriority') as priority:
            self.assertEqual(self.sessions.spawn(17, 'fixture')['state'], 'active')
            self.assertTrue(self.sessions.spawn(17, 'fixture')['existing'])
            allocate.assert_called_once_with(self.root, self.directory, self.tree, self.head)
            priority.assert_called_once_with(os.PRIO_PROCESS, 101, 19)
        starts = [e for e in self.events if e[:2] == ('agent', 'start')]
        self.assertEqual(len(starts), 1)
        self.assertIn('gpt-6.1-sol', starts[0]); self.assertIn('model_reasoning_effort=high', starts[0])
        self.assertNotIn('gh issue view 17', starts[0][-1])
        prompts = [e for e in self.events if e[:2] == ('agent', 'prompt')]
        self.assertEqual(len(prompts), 1)
        self.assertIn('gh issue view 17', prompts[0][-1])
        self.assertLess(next(i for i, e in enumerate(self.events) if e[:2] == ('agent', 'rename')),
                        next(i for i, e in enumerate(self.events) if e[:2] == ('agent', 'prompt')))
        self.assertTrue(any(f'CODEX_HOME={home}' in e for e in self.events))

    def prepare_spawn(self):
        self.sessions.data['sessions'].clear(); self.sessions.save()
        self.closed = False
        home = self.root / 'fixture-home'; home.mkdir(); (home / 'auth.json').touch()
        (self.directory / 'codex-home').write_text(str(home))
        (self.root / 'agent/node_modules').mkdir()
        (self.tree / 'agent/node_modules').symlink_to(self.root / 'agent/node_modules', target_is_directory=True)

    def test_start_error_after_detection_reconciles_name_before_single_prompt(self):
        self.prepare_spawn()
        original = self.herdr
        named = False
        def detected(*args):
            nonlocal named
            if args[:2] == ('agent', 'start'):
                self.events.append(args)
                raise ValueError('herdr command failed (exit 1); Herdr reason: agent_start_timeout')
            if args[:2] == ('agent', 'rename'):
                named = True
            reply = original(*args)
            if args[:2] == ('agent', 'get') and not named:
                reply['agent']['name'] = None
            return reply
        self.herdr_mock.side_effect = detected
        with patch.object(checkout, 'create'), patch.object(os, 'setpriority'):
            self.assertEqual(self.sessions.spawn(17, 'fixture')['state'], 'active')
            self.sessions.spawn(17, 'fixture')
        self.assertEqual(sum(e[:2] == ('agent', 'start') for e in self.events), 1)
        self.assertEqual(sum(e[:2] == ('agent', 'prompt') for e in self.events), 1)
        self.assertIn('agent_start_timeout', self.sessions.data['sessions']['17']['start_warning'])

    def test_name_failure_is_precise_and_never_resends_task(self):
        self.prepare_spawn()
        original = self.herdr
        def failure(*args):
            if args[:2] == ('agent', 'rename'):
                raise ValueError('herdr command failed (exit 1); Herdr reason: connection refused')
            return original(*args)
        self.herdr_mock.side_effect = failure
        with patch.object(checkout, 'create'), patch.object(os, 'setpriority'):
            with self.assertRaisesRegex(ValueError, 'spawn name:.*connection refused'):
                self.sessions.spawn(17, 'fixture')
            self.sessions.spawn(17, 'fixture')
        self.assertEqual(self.sessions.data['sessions']['17']['state'], 'starting')
        self.assertFalse(any(e[:2] == ('agent', 'prompt') for e in self.events))

    def test_start_cannot_reconcile_a_replaced_terminal_or_busy_agent(self):
        for target in ('terminal', 'busy'):
            with self.subTest(target=target):
                # Each case receives an isolated allocation, without touching real Herdr.
                self.sessions.data['sessions'].clear(); self.sessions.save()
                self.closed = False
                home = self.root / 'fixture-home'; home.mkdir(exist_ok=True); (home / 'auth.json').touch()
                (self.directory / 'codex-home').write_text(str(home))
                original = self.herdr
                def mismatch(*args):
                    reply = original(*args)
                    if args[:2] == ('pane', 'get') and target == 'terminal':
                        reply = {'pane': dict(self.pane, terminal_id='replaced')}
                    if args[:2] == ('agent', 'get') and target == 'busy':
                        reply['agent']['agent_status'] = 'working'
                    return reply
                self.herdr_mock.side_effect = mismatch
                with patch.object(self.sessions, 'command'), patch.object(os, 'setpriority'):
                    with self.assertRaisesRegex(ValueError, 'identity/readiness mismatch'):
                        self.sessions.spawn(17, 'fixture')
                self.assertFalse(any(e[:2] == ('agent', 'prompt') for e in self.events))

    def test_herdr_failure_has_known_reason_without_disclosing_stderr(self):
        reply = subprocess.CompletedProcess([], 1, stdout=b'',
                                            stderr=b'agent_start_timeout secret-token /private/auth.json')
        with patch.object(subprocess, 'run', return_value=reply):
            with self.assertRaisesRegex(ValueError, 'Herdr reason: agent_start_timeout') as caught:
                self.actual_run(['herdr', 'agent', 'start'])
        self.assertNotIn('secret-token', str(caught.exception))
        self.assertNotIn('/private', str(caught.exception))

    def test_cli_lock_contention_returns_retry_before_any_session_action(self):
        before = self.sessions.path.read_bytes()
        with patch.object(sys, 'argv', ['issue_session', '--root', str(self.root), 'spawn', '17', 'fixture']), \
                patch.object(resource.retention, 'locks', side_effect=BlockingIOError()), \
                patch.object(resource, 'Sessions') as sessions, patch('sys.stdout', new_callable=io.StringIO) as output:
            self.assertEqual(resource.main(), 75)
        reply = json.loads(output.getvalue())
        self.assertEqual(reply['state'], 'retry'); self.assertTrue(reply['retryable'])
        self.assertEqual(reply['stage'], 'session lock')
        sessions.assert_not_called()
        self.assertEqual(self.sessions.path.read_bytes(), before)

    def test_uncertain_spawn_never_restarts_and_explicit_register_can_reconcile(self):
        self.row['state'] = 'starting'; self.sessions.save()
        self.assertTrue(self.sessions.spawn(17, 'fixture')['existing'])
        self.assertFalse(any(e[:2] == ('agent', 'start') for e in self.events))
        self.assertEqual(self.sessions.register(17, 'fixture', 'wF:p1', self.head, self.row['started_at'])['state'], 'registered')
        with self.assertRaisesRegex(ValueError, 'existing registration'):
            self.sessions.register(17, 'fixture', 'wF:p1', self.head, self.row['started_at'])

    def test_spawn_creates_one_workspace_tab_without_an_orphan_shell(self):
        self.sessions.data['sessions'].clear(); self.sessions.save()
        self.closed = False
        home = self.root / 'fixture-home'; home.mkdir(); (home / 'auth.json').touch()
        (self.directory / 'codex-home').write_text(str(home))
        (self.root / 'agent/node_modules').mkdir()
        (self.tree / 'agent/node_modules').symlink_to(self.root / 'agent/node_modules', target_is_directory=True)
        original = self.herdr
        def no_workspace(*args):
            if args[:2] == ('workspace', 'list'):
                return {'workspaces': []}
            return original(*args)
        self.herdr_mock.side_effect = no_workspace
        with patch.object(checkout, 'create'), patch.object(os, 'setpriority'):
            self.sessions.spawn(17, 'fixture')
        self.assertEqual(sum(e[:2] == ('workspace', 'create') for e in self.events), 1)
        self.assertFalse(any(e[:2] == ('tab', 'create') for e in self.events))
        self.assertTrue(any(e[:2] == ('tab', 'rename') for e in self.events))

    def test_foreign_owner_and_unknown_account_cannot_spawn(self):
        self.sessions.data['sessions'].clear(); self.sessions.save()
        self.issue_mock.side_effect = lambda n: {'state': 'OPEN', 'author': {'login': 'external'}}
        with self.assertRaisesRegex(ValueError, 'owner-authored'):
            self.sessions.spawn(17, 'fixture')
        self.issue_mock.side_effect = self.issue
        self.closed = False
        with patch.dict(os.environ, {'LEARNER_CODEX_HOME': ''}):
            with self.assertRaisesRegex(ValueError, 'home selector'):
                self.sessions.spawn(17, 'fixture')
        self.herdr_mock.assert_not_called()

    def test_comment_scan_precedes_post_and_marker_reconciles_uncertain_post(self):
        posted = []
        def cli(args, **kwargs):
            posted.append(list(map(str, args)))
            return b''
        with patch.object(resource, 'run', side_effect=cli):
            resource.Sessions.notice(self.sessions, 17, 'fixed', '固定数据回执')
        self.assertEqual(posted[0][0], 'gitleaks')
        self.assertEqual(posted[1][:3], ['gh', 'issue', 'comment'])
        body = next((self.directory / 'issue-session-comments').glob('*.md')).read_text()
        self.assertTrue(body.startswith('[ops] '))
        self.issue_mock.side_effect = lambda n: {'comments': [{'author': {'login': 'dwroy'}, 'body': body}]}
        with patch.object(resource, 'run') as cli_mock:
            resource.Sessions.notice(self.sessions, 17, 'fixed', '固定数据回执')
            cli_mock.assert_not_called()
        self.issue_mock.side_effect = self.issue
        with patch.object(resource, 'run', side_effect=ValueError('scanner refused')) as cli_mock:
            with self.assertRaises(ValueError):
                resource.Sessions.notice(self.sessions, 17, 'other', '固定数据回执')
            self.assertEqual(cli_mock.call_count, 1)

    def test_board_configuration_drives_another_project_spawn_and_retire(self):
        # A second project supplies its own adapter and commands, with no STS2 paths.
        config = copy.deepcopy(self.sessions.board.data)
        config.update(repo='fixture/portable', herdr_workspace='portable')
        config['worktree'].update(root='sandboxes', adapter='ops/fixed_adapter.py',
                                 allocate=['allocate-fixture', '{path}', '{ref}', '{state_dir}'],
                                 prepare=['prepare-fixture "{path}"'],
                                 retire=['retire-fixture', '{branch}', '{source}', '{main_commit}', '{live_commit}'])
        config['session'].update(state_dir='runtime', inbox='messages.md', materials='evidence',
                                 prompt='#{issue} {repo} {worktree} {base} nice={nice}', comment_prefix='[fixture]',
                                 command_env={'PORTABLE_STATE': '{state_dir}'})
        config['resource_gate']['nice'] = 7
        home = self.root / 'fixture home'; home.mkdir(); (home / 'auth.json').touch()
        config['roles']['dev'].update(codex_home=str(home), model='fixture-model', effort='medium')
        (self.root / '.agents/board.yaml').write_text(json.dumps(config))
        (self.root / 'ops/fixed_adapter.py').write_text(
            'class Project:\n'
            ' def __init__(self, root, directory): self.root=root\n'
            ' def checked_tree(self, branch): return self.root/"sandboxes"/branch\n'
            ' def guard(self, row): pass\n'
            ' def reclaimed(self, row): return False\n'
            ' def publication(self, row): return dict(source=row["source"], main_commit=row["base"], live_commit=row["base"])\n')
        (self.root / 'sandboxes').mkdir()
        target = self.root / 'sandboxes' / self.tree.name
        self.git('worktree', 'move', str(self.tree), str(target)); self.tree = target
        self.pane.update(cwd=str(target), foreground_cwd=str(target))
        self.directory = self.root / 'runtime'; self.directory.mkdir()
        self.sessions = resource.Sessions(self.root)
        self.closed = False
        original = self.cli
        def configured_cli(args, **kwargs):
            if args[0] in ('allocate-fixture', 'prepare-fixture', 'retire-fixture'):
                self.events.append(tuple(args))
                self.assertEqual(kwargs['cwd'], self.root)
                self.assertEqual(kwargs['env']['PORTABLE_STATE'], str(self.directory))
                return b'{}'
            return original(args, **kwargs)
        with patch.object(self.sessions, 'issue', side_effect=self.issue), patch.object(self.sessions, 'notice'), \
                patch.object(resource, 'run', side_effect=configured_cli), patch.object(os, 'setpriority') as priority:
            self.assertEqual(self.sessions.spawn(17, 'fixture')['state'], 'active')
            priority.assert_called_once_with(os.PRIO_PROCESS, 101, 7)
            self.assertIn(('allocate-fixture', str(target), self.head, str(self.directory)), self.events)
            self.assertIn(('prepare-fixture', str(target)), self.events)
            start = next(e for e in self.events if e[:2] == ('agent', 'start'))
            self.assertIn('fixture-model', start); self.assertIn('model_reasoning_effort=medium', start)
            prompt = next(e for e in self.events if e[:2] == ('agent', 'prompt'))
            self.assertIn('fixture/portable sandboxes/issue-17-fixture', prompt[-1])
            self.assertTrue(any(f'CODEX_HOME={home}' in e for e in self.events))
            self.closed = True
            self.info.update(foreground_process_group_id=102, foreground_processes=[dict(pid=102, name='codex')])
            self.assertEqual(self.sessions.reclaim(17, True)['state'], 'waiting-worktree')
            self.assertIn(('retire-fixture', self.tree.name, self.head, self.head, self.head), self.events)

    def test_board_repo_change_cannot_rebind_existing_registry(self):
        data = self.sessions.board.data
        data['repo'] = 'fixture/different'
        (self.root / '.agents/board.yaml').write_text(json.dumps(data))
        before = self.sessions.path.read_bytes()
        with self.assertRaisesRegex(ValueError, 'invalid issue session registry'):
            resource.Sessions(self.root)
        self.assertEqual(before, self.sessions.path.read_bytes())

    def test_existing_tail_is_read_back_before_closing_the_tab(self):
        folder = self.directory / 'issue-session-tails'; folder.mkdir()
        digest = hashlib.sha256(b'fixed tail\n').hexdigest()
        (folder / f'17-{digest}.log').write_bytes(b'corrupted prior tail')
        self.assert_retained('tail readback failed')

    def test_board_role_pane_and_path_protection_is_applied_before_actions(self):
        self.sessions.board.data['roles']['ops']['pane'] = self.row['pane']
        self.assert_retained('protected board role')
        self.sessions.board.data['roles']['ops'].clear()
        self.sessions.board.data['never_reclaim'].append('.worktrees/issue-17-*')
        self.assert_retained('protected board worktree')
        self.herdr_mock.assert_not_called()

    def test_board_concurrency_limit_includes_unregistered_issue_agents(self):
        self.sessions.data['sessions'].clear(); self.sessions.save()
        self.closed = False
        home = self.root / 'fixture-home'; home.mkdir(); (home / 'auth.json').touch()
        self.sessions.board.dev['codex_home'] = str(home)
        self.sessions.board.dev['max_parallel'] = 1
        original = self.herdr
        def agents(*args):
            if args[:2] == ('agent', 'list'):
                return {'agents': [dict(agent='codex', name='issue-99')]}
            return original(*args)
        self.herdr_mock.side_effect = agents
        with self.assertRaisesRegex(ValueError, 'concurrency limit'):
            self.sessions.spawn(17, 'fixture')
        self.assertFalse(self.sessions.data['sessions'])
        self.assertFalse(any(e[:2] in (('tab', 'create'), ('agent', 'start')) for e in self.events))

    def test_board_invalid_missing_remote_or_unsafe_configuration_has_no_actions(self):
        path = self.root / '.agents/board.yaml'
        original = path.read_text()
        for text in ('worktree: [\n', '[]', '{}', original + '\nmachine: remote\n',
                     original.replace('root: .worktrees', 'root: ../outside'),
                     original.replace('max_procs_per_task: 2', 'max_procs_per_task: 0')):
            with self.subTest(text=text[:30]), self.assertRaises((ValueError, KeyError)):
                path.write_text(text)
                resource.Sessions(self.root)
        path.unlink()
        with self.assertRaises(OSError):
            resource.Sessions(self.root)
        self.herdr_mock.assert_not_called(); self.run_mock.assert_not_called()

    def test_configured_project_prepare_checks_actual_dependency_target(self):
        script = Path(resource.__file__).parent / 'issue_session_project.py'
        (self.root / 'agent/node_modules').mkdir()
        dependency = self.tree / 'agent/node_modules'
        dependency.symlink_to(self.root / 'agent/node_modules', target_is_directory=True)
        args = [sys.executable, str(script), 'prepare', str(self.root), str(self.tree)]
        self.assertEqual(subprocess.run(args, capture_output=True).returncode, 0)
        dependency.unlink()
        other = self.root / 'wrong-dependency'; other.mkdir()
        dependency.symlink_to(other, target_is_directory=True)
        self.assertNotEqual(subprocess.run(args, capture_output=True).returncode, 0)

    def test_configured_commands_do_not_evaluate_shell_and_unknown_fields_refuse(self):
        board = self.sessions.board
        values = {'path': '/tmp/fixed path; $(unsafe)', 'ref': self.head}
        self.assertEqual(board.argv('tool "{path}" {ref}', values), ['tool', values['path'], self.head])
        with self.assertRaisesRegex(ValueError, 'placeholder'):
            board.argv(['tool', '{unknown}'], values)
        with self.assertRaisesRegex(ValueError, 'nonempty argv'):
            board.argv([], values)


class Composer(unittest.TestCase):
    def test_fixed_ansi_states(self):
        for ansi, expected in [('› ', 'empty'), ('› typed', 'text'), ('menu', 'none'),
                               ('› \x1b[38;2;1;2;3mtyped', 'text'), ('› \x1b[2mplaceholder', 'empty'),
                               ('› \x1b[2m\x1b[22mtyped', 'text'), ('output › example', 'none')]:
            with self.subTest(ansi=repr(ansi)):
                self.assertEqual(resource.composer_state(ansi), expected)

    def test_idle_helper_requires_bundled_executable_parent_and_no_tool_children(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            parent = root/'101'; child = root/'102'
            for proc in (parent, child):
                (proc/'task'/proc.name).mkdir(parents=True)
                (proc/'task'/proc.name/'children').write_text('')
            (parent/'exe').symlink_to('/fixed/bin/codex')
            (parent/'task/201').mkdir()
            (parent/'task/201/children').write_text('102')
            (child/'exe').symlink_to('/fixed/bin/codex-code-mode-host')
            (child/'stat').write_text('102 (codex-code-mode) S 101 1 1')
            (child/'cmdline').write_bytes(b'/fixed/bin/codex-code-mode-host\0')
            self.assertEqual(resource.idle_codex_helpers({101}, root), {102})
            (child/'task/102/children').write_text('103')
            self.assertEqual(resource.idle_codex_helpers({101}, root), set())
            (child/'task/102/children').write_text('')
            (child/'exe').unlink(); (child/'exe').symlink_to('/other/bin/codex-code-mode-host')
            self.assertEqual(resource.idle_codex_helpers({101}, root), set())

    def test_process_cwd_argv_boundaries_and_allowlist_with_fixed_proc_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            proc = root / '41'; proc.mkdir()
            tree = root / 'issue-tree'; tree.mkdir()
            (proc / 'cwd').symlink_to(root, target_is_directory=True)
            (proc / 'cmdline').write_bytes(os.fsencode(str(tree) + '-other/script') + b'\0')
            with patch.object(resource.Path, 'iterdir', return_value=[proc]):
                self.assertFalse(resource.processes(tree, set()))
                (proc / 'cmdline').write_bytes(b'python\0' + os.fsencode(tree / 'worker.py') + b'\0')
                self.assertTrue(resource.processes(tree, set()))
                self.assertFalse(resource.processes(tree, {41}))
                (proc / 'cmdline').write_bytes(b'shell\0')
                (proc / 'cwd').unlink(); (proc / 'cwd').symlink_to(tree, target_is_directory=True)
                self.assertTrue(resource.processes(tree, set()))
                with patch.object(resource.os, 'readlink', side_effect=PermissionError()):
                    with self.assertRaisesRegex(ValueError, 'visibility'):
                        resource.processes(tree, set())
                    self.assertTrue(resource.processes(tree, set(), lambda p: str(tree)))
                    self.assertFalse(resource.processes(tree, set(), lambda p: str(root)))


class Scheduler(unittest.TestCase):
    def test_all_tick_jobs_reconcile_after_primary_job_and_respect_pause_and_disable(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            ops = root / 'ops'; ops.mkdir()
            directory = ops / 'codex-ops'; directory.mkdir()
            (root / 'paper/materials').mkdir(parents=True)
            (ops / 'codex-ops.sh').write_bytes((Path(resource.__file__).parent / 'codex-ops.sh').read_bytes())
            (ops / 'paths.sh').write_text('OPS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"\nROOT="$CODEX_OPS_ROOT"\n')
            record = 'import os\nfrom pathlib import Path\np=Path(os.environ["CODEX_OPS_ROOT"])/"calls"\n'
            for script, name in [('codex-ops-learn.py', 'learn'), ('paper_dataset.py', 'snapshot'),
                                  ('module_health.py', 'health'), ('issue_session.py', 'issues')]:
                (ops / script).write_text(record + f'with p.open("a") as h: h.write("{name}\\n")\n' +
                                         ('raise SystemExit(5 if (p.parent/"fail-issues").exists() else 0)\n' if name == 'issues' else ''))
            stall = ops / 'stall-check.sh'
            stall.write_text('#!/bin/bash\necho stall >> "$CODEX_OPS_ROOT/calls"\necho "OK fixed"\n')
            engine = ops / 'fake-tsx'
            engine.write_text('#!/bin/bash\nexit 0\n'); engine.chmod(0o755)
            env = dict(os.environ, CODEX_OPS_ROOT=str(root), CODEX_OPS_DIR=str(directory),
                       CODEX_OPS_NO_DRAIN='1', CODEX_OPS_TSX=str(engine), CODEX_OPS_STALL_CHECK=str(stall),
                       CODEX_OPS_RETENTION='on', CODEX_AGENT_BOARD='off')
            def tick(job):
                result = subprocess.run(['bash', str(ops / 'codex-ops.sh'), 'tick', job],
                                        capture_output=True, text=True, env=env, timeout=15)
                self.assertEqual(result.returncode, 0, result.stderr)
            tick('learn'); tick('snapshot'); tick('stall')
            self.assertEqual((root / 'calls').read_text().splitlines(),
                             ['learn', 'issues', 'snapshot', 'issues', 'stall', 'health', 'issues'])
            before = (root / 'calls').read_bytes()
            (directory / 'PAUSE').touch(); tick('learn')
            self.assertEqual((root / 'calls').read_bytes(), before)
            (directory / 'PAUSE').unlink()
            env['CODEX_OPS_RETENTION'] = 'off'; tick('learn')
            self.assertEqual((root / 'calls').read_text().splitlines()[-1], 'learn')
            env['CODEX_OPS_RETENTION'] = 'on'; (root / 'fail-issues').touch(); tick('learn')
            self.assertIn('tick 未完成', (ops / 'inbox-dev.md').read_text())
            (ops / 'agent_board.py').write_text(record + 'with p.open("a") as h: h.write("board\\n")\n')
            env['CODEX_AGENT_BOARD'] = 'on'
            before = (root / 'calls').read_text()
            tick('learn'); tick('snapshot'); tick('stall')
            self.assertEqual((root / 'calls').read_text()[len(before):].splitlines(),
                             ['learn', 'snapshot', 'stall', 'health', 'board'])
            (directory / 'PAUSE').touch(); before = (root / 'calls').read_bytes(); tick('stall')
            self.assertEqual(before, (root / 'calls').read_bytes())


class BoardLauncher(unittest.TestCase):
    def test_launcher_replaces_process_and_passes_retention_disable_and_dry_run(self):
        import agent_board
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            install = root / 'kit'; install.mkdir(); (install / 'board.py').write_text('')
            (root / 'registry.json').write_text('{"projects":[]}')
            from types import SimpleNamespace
            config = SimpleNamespace(data={'dispatcher': {'install': 'kit', 'registry': 'registry.json'}})
            with patch.object(agent_board, 'Board', return_value=config), \
                    patch.object(agent_board.os, 'execv') as execute, \
                    patch.object(sys, 'argv', ['launcher', '--root', str(root), '--dry-run']), \
                    patch.dict(os.environ, {'CODEX_OPS_RETENTION': 'off'}):
                agent_board.main()
            self.assertEqual(execute.call_args.args[1], [sys.executable, str(install / 'board.py'),
                             '--registry', str(root / 'registry.json'), '--dry-run', '--no-reclaim'])


if __name__ == '__main__':
    unittest.main()
