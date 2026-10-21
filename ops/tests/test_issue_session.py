import copy
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
        return {'state': 'CLOSED' if self.closed else 'OPEN', 'author': {'login': 'dwroy'}, 'comments': []}

    def cli(self, args, **kwargs):
        self.events.append(tuple(map(str, args)))
        if args[:3] == ['herdr', 'pane', 'read']:
            return self.screen.encode() if 'visible' in args else b'fixed tail\n'
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
            return {'workspaces': [dict(workspace_id='wF', label='agent-sts2')]}
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
        if args[:2] in (('agent', 'start'), ('tab', 'rename')):
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
        with patch.object(resource.workspaces, 'active', return_value=False):
            self.assertEqual(resource.workspaces.reclaim(self.root, self.directory, self.tree.name, True)['state'], 'reclaimed')
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
        self.processes_mock.assert_called_once_with(self.tree, {101, 102, 103})

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
        (self.tree / 'ops').mkdir()
        (self.tree / 'ops/instance-binding.json').write_text('{}')
        self.assert_retained('persistent game instance')

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
            resource.workspaces.reclaim(self.root, self.directory, self.tree.name, True)

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
        self.assertIn('notification failed', (self.root / 'ops/inbox-dev.md').read_text())

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
        with patch.object(resource.checkout, 'create') as allocate, patch.object(os, 'setpriority') as priority:
            self.assertEqual(self.sessions.spawn(17, 'fixture')['state'], 'active')
            self.assertTrue(self.sessions.spawn(17, 'fixture')['existing'])
            allocate.assert_called_once_with(self.root, self.directory, self.tree, self.head)
            priority.assert_called_once_with(os.PRIO_PROCESS, 101, 19)
        starts = [e for e in self.events if e[:2] == ('agent', 'start')]
        self.assertEqual(len(starts), 1)
        self.assertIn('gpt-6.1-sol', starts[0]); self.assertIn('model_reasoning_effort=high', starts[0])
        self.assertIn('gh issue view 17', starts[0][-1])
        self.assertTrue(any(f'CODEX_HOME={home}' in e for e in self.events))

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
        with patch.object(resource.checkout, 'create'), patch.object(os, 'setpriority'):
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


class Composer(unittest.TestCase):
    def test_fixed_ansi_states(self):
        for ansi, expected in [('› ', 'empty'), ('› typed', 'text'), ('menu', 'none'),
                               ('› \x1b[38;2;1;2;3mtyped', 'text'), ('› \x1b[2mplaceholder', 'empty'),
                               ('› \x1b[2m\x1b[22mtyped', 'text'), ('output › example', 'none')]:
            with self.subTest(ansi=repr(ansi)):
                self.assertEqual(resource.composer_state(ansi), expected)

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
                       CODEX_OPS_RETENTION='on')
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


if __name__ == '__main__':
    unittest.main()
