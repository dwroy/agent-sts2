"""Real kernel lease inheritance and synthetic project resource observations."""
import ast
import contextlib
import fcntl
import json
import os
from pathlib import Path
import sys
import subprocess
import tempfile
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import board_heavy
import board_resources
from issue_session_support import Board


PROJECT = Path(__file__).resolve().parents[2]


class ResourceBridge(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / '.agents').mkdir()
        self.data = Board(PROJECT).data
        self.machine = self.root / 'machine'
        self.data['dispatcher']['heavy'] = dict(enabled=False, machine_state=str(self.machine))
        self.save()
        self.env = patch.dict(os.environ, {}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)

    def save(self):
        (self.root / '.agents/board.yaml').write_text(json.dumps(self.data))

    def enabled(self):
        self.data['dispatcher']['heavy']['enabled'] = True
        self.save()

    def test_disabled_keeps_original_argv_and_does_not_initialize_machine_state(self):
        argv = ['flock', '-F', str(self.root / 'lock'), 'python3', 'fixed.py']
        self.assertEqual(board_heavy.queued_argv(self.root, 'other', argv), argv)
        self.assertFalse(self.machine.exists())

    def test_enabled_wraps_before_business_lock_with_no_shell(self):
        self.enabled()
        argv = ['flock', '-F', str(self.root / 'lock'), 'python3', 'fixed.py']
        with patch.object(board_heavy, 'verify') as verify:
            wrapped = board_heavy.queued_argv(self.root, 'other', argv)
        self.assertEqual(wrapped[-len(argv):], argv)
        self.assertEqual(wrapped[2:6], ['--root', str(self.root), 'other', '--'])
        self.assertEqual(wrapped[1], str(self.root / 'ops/board_heavy.py'))
        verify.assert_called_once()
        self.assertFalse(self.machine.exists())

    def test_environment_claim_alone_cannot_bypass_admission(self):
        os.environ['MAS_QUEUE_LEASE_FDS'] = '1,2,3'
        with self.assertRaisesRegex(ValueError, 'incomplete'):
            board_heavy.inherited(self.root)

    def test_ops_bootstrap_publishes_before_enable_without_changing_control(self):
        (self.root / '.git').mkdir()
        before = (self.root / '.agents/board.yaml').read_bytes()
        observed = dict(running=True, pids=[dict(pid=10, start='20')], legacy=[])
        with patch.object(board_resources, 'probe', return_value=observed), \
                patch.object(board_resources, 'verify'), patch.object(board_resources, '_publish') as publish:
            result = board_resources.publish(self.root)
        self.assertFalse(result['heavy_enabled'])
        self.assertTrue(result['published'])
        self.assertEqual(publish.call_args.args[1], observed)
        self.assertEqual((self.root / '.agents/board.yaml').read_bytes(), before)

    def test_unknown_bootstrap_cannot_initialize_machine_state(self):
        (self.root / '.git').mkdir()
        with patch.object(board_resources, 'probe', side_effect=ValueError('unknown facts')), \
                patch.object(board_resources, '_publish') as publish:
            with self.assertRaises(ValueError):
                board_resources.publish(self.root)
            publish.assert_not_called()
        self.assertFalse(self.machine.exists())

    def test_linked_development_tree_cannot_publish_production_observations(self):
        (self.root / '.git').write_text('gitdir: fixture\n')
        with patch.object(board_resources, '_publish') as publish:
            with self.assertRaises(ValueError):
                board_resources.publish(self.root)
            publish.assert_not_called()

    def test_business_lock_owner_cannot_wait_for_a_machine_slot(self):
        self.enabled()
        path = self.root / 'ops/codex-ops/learn.lock'
        path.parent.mkdir(parents=True)
        with path.open('a') as handle, patch.object(board_heavy, 'verify'):
            fcntl.flock(handle, fcntl.LOCK_EX)
            with self.assertRaisesRegex(ValueError, 'business lock'):
                board_heavy.queued_argv(self.root, 'integrator', ['fixed-check'])
        self.assertFalse(self.machine.exists())

    def test_fallback_admission_is_before_original_live_lock(self):
        self.enabled()
        (self.root / 'ops').mkdir()
        order = []
        @contextlib.contextmanager
        def claim(root):
            self.assertFalse((root / 'ops/live-merge.lock').exists())
            order.append('admitted-before-live-lock')
            yield ()
            order.append('original-body-complete')
        with patch.object(board_heavy, 'source_claim', side_effect=claim):
            with board_heavy.source_lock(self.root) as lock:
                fcntl.flock(lock, fcntl.LOCK_EX)
                self.assertTrue((self.root / 'ops/integrator-full-check.lock').is_file())
                self.assertEqual(len(lock.queue_fds), 1)
                order.append('original-verification-and-full')
        self.assertEqual(order, ['admitted-before-live-lock', 'original-verification-and-full', 'original-body-complete'])

    def test_actual_inherited_locked_descriptors_avoid_nested_admission(self):
        self.enabled()
        ident = 'a' * 32
        for name in ('leases', 'slots', 'records'):
            (self.machine / name).mkdir(parents=True)
        row = dict(root=str(self.root), repo=self.data['repo'], state='running', slot=0,
                   boot_id=Path('/proc/sys/kernel/random/boot_id').read_text().strip(),
                   runner_pid=os.getpid(), runner_start=Path('/proc/self/stat').read_text().rsplit(')', 1)[1].split()[19])
        record = self.machine / 'records' / (ident + '.json')
        record.write_text(json.dumps(row))
        with contextlib.ExitStack() as stack:
            descriptors = []
            for path in (self.machine / 'leases' / ident, self.machine / 'slots/0'):
                handle = stack.enter_context(path.open('a'))
                fcntl.flock(handle, fcntl.LOCK_EX)
                descriptors.append(handle.fileno())
            self.assertEqual(set(board_heavy.inherited(self.root)), set(descriptors))
            with patch.object(board_heavy, 'verify'):
                self.assertEqual(board_heavy.queued_argv(self.root, 'integrator', ['fixed-check']), ['fixed-check'])
            row['root'] = str(self.root / 'foreign')
            record.write_text(json.dumps(row))
            with self.assertRaisesRegex(ValueError, 'foreign'):
                board_heavy.inherited(self.root)
        self.assertEqual(board_heavy.inherited(self.root), ())

    def test_background_statistics_retains_resources_until_actual_child_exit(self):
        self.enabled()
        (self.root / 'ops').mkdir()
        ident = 'b' * 32
        for name in ('leases', 'slots', 'records'):
            (self.machine / name).mkdir(parents=True)
        birth = lambda pid: Path('/proc', str(pid), 'stat').read_text().rsplit(')', 1)[1].split()[19]
        row = dict(root=str(self.root), repo=self.data['repo'], state='running', slot=0,
                   boot_id=Path('/proc/sys/kernel/random/boot_id').read_text().strip(),
                   runner_pid=os.getpid(), runner_start=birth(os.getpid()))
        (self.machine / 'records' / (ident + '.json')).write_text(json.dumps(row))
        paths = [self.machine / 'leases' / ident, self.machine / 'slots/0']
        node = next(n for n in ast.parse((PROJECT / 'ops/report.py').read_text()).body
                    if isinstance(n, ast.FunctionDef) and n.name == 'background_statistics')
        namespace = dict(ROOT=str(self.root), os=os, subprocess=subprocess)
        exec(compile(ast.Module(body=[node], type_ignores=[]), 'report.py', 'exec'), namespace)
        ready, stop = self.root / 'ready.json', self.root / 'stop'
        script = self.root / 'child.py'
        script.write_text('''from pathlib import Path
import json, os, sys, time
root = Path(sys.argv[1])
fds = {}
for p in Path('/proc/self/fd').iterdir():
    try: fds[p.name] = os.readlink(p)
    except FileNotFoundError: pass
(root / 'ready.json').write_text(json.dumps(fds))
deadline = time.monotonic() + 10
while not (root / 'stop').exists() and time.monotonic() < deadline:
    time.sleep(.01)
''')
        with contextlib.ExitStack() as stack:
            handles = [stack.enter_context(path.open('a')) for path in paths]
            for handle in handles:
                fcntl.flock(handle, fcntl.LOCK_EX)
            with patch.object(board_heavy, 'verify'), (self.root / 'child.log').open('w') as log:
                child = namespace['background_statistics']([sys.executable, str(script), str(self.root)], log)
            try:
                deadline = time.monotonic() + 5
                while not ready.exists() and child.poll() is None and time.monotonic() < deadline:
                    time.sleep(.01)
                self.assertTrue(ready.exists())
                inherited = json.loads(ready.read_text())
                original_birth = birth(child.pid)
                for handle in handles:
                    handle.close()
                self.assertIsNone(child.poll())
                self.assertEqual(birth(child.pid), original_birth)
                for path in paths:
                    self.assertIn(str(path), inherited.values())
                    with path.open('a') as probe:
                        with self.assertRaises(BlockingIOError):
                            fcntl.flock(probe, fcntl.LOCK_EX | fcntl.LOCK_NB)
            finally:
                stop.touch()
                self.assertEqual(child.wait(timeout=10), 0)
            self.assertFalse(Path('/proc', str(child.pid)).exists())
            for path in paths:
                with path.open('a') as probe:
                    fcntl.flock(probe, fcntl.LOCK_EX | fcntl.LOCK_NB)


class Probe(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.proc = self.root / 'proc'
        (self.proc / 'sys/kernel/random').mkdir(parents=True)
        (self.proc / 'sys/kernel/random/boot_id').write_text('fixture-boot')
        (self.proc / 'locks').write_text('')
        self.state = self.root / 'ops/codex-ops'
        (self.state / 'game-admissions').mkdir(parents=True)
        self.value = dict(schema='sts2-board-resource-bindings-v1', root=str(self.root), owner='ops',
                          boot_id='fixture-boot', complete=True, inventory_sha256='a' * 64, legacy=[])
        self.save()

    def save(self):
        (self.state / 'board-resource-bindings.json').write_text(json.dumps(self.value))

    def process(self, pid, parent=1, start='10', state='S'):
        (self.proc / str(pid)).mkdir(exist_ok=True)
        fields = [state, str(parent), *(['0'] * 17), start, '0']
        (self.proc / str(pid) / 'stat').write_text(str(pid) + ' (fixed fixture) ' + ' '.join(fields))

    def probe(self):
        return board_resources.probe(self.root, self.proc)

    def test_missing_incomplete_old_boot_or_foreign_declaration_is_unknown(self):
        for change in (dict(complete=False), dict(boot_id='old-boot'), dict(root='/other'), dict(owner='dev')):
            original = dict(self.value)
            self.value.update(change)
            self.save()
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.probe()
            self.value = original
        self.save()
        (self.state / 'board-resource-bindings.json').unlink()
        with self.assertRaises(FileNotFoundError):
            self.probe()

    def test_two_game_reservations_are_observed_without_heavy_claims(self):
        for pid in (10, 20):
            self.process(pid)
            (self.state / 'game-admissions' / (str(pid) + '.json')).write_text(json.dumps(dict(pid=pid, pid_birth='10')))
        reply = self.probe()
        self.assertTrue(reply['running'])
        self.assertEqual(len(reply['pids']), 2)
        self.assertEqual(reply['legacy'], [])
        self.assertFalse((self.root / 'machine').exists())

    def test_dead_reused_and_zombie_game_identity_is_not_running(self):
        for pid, state, start in ((10, 'Z', '10'), (20, 'S', '11')):
            self.process(pid, state=state, start=start)
        for pid in (10, 20, 30):
            (self.state / 'game-admissions' / (str(pid) + '.json')).write_text(json.dumps(dict(pid=pid, pid_birth='10')))
        self.assertEqual(self.probe(), dict(running=False, pids=[], legacy=[]))

    def test_legacy_parent_child_count_as_one_task(self):
        self.process(10)
        self.process(20, parent=10)
        self.value['legacy'] = [dict(pid=pid, start='10', boot_id='fixture-boot', role='integrator', task='#66')
                                for pid in (10, 20)]
        self.save()
        self.assertEqual([row['pid'] for row in self.probe()['legacy']], [10])

    def test_kernel_lock_waiter_does_not_consume_a_second_slot(self):
        lock = self.root / 'ops/knowledge-refresh.lock'
        lock.touch()
        info = lock.stat()
        inode = f'{os.major(info.st_dev):02x}:{os.minor(info.st_dev):02x}:{info.st_ino}'
        self.process(10)
        self.process(20)
        (self.proc / 'locks').write_text(f'1: FLOCK ADVISORY WRITE 10 {inode} 0 EOF\n'
                                        f'1: -> FLOCK ADVISORY WRITE 20 {inode} 0 EOF\n')
        self.assertEqual([row['pid'] for row in self.probe()['legacy']], [10])

    def test_unreadable_or_partial_process_identity_fails_closed(self):
        self.process(10)
        (self.proc / '10/stat').write_text('10 (truncated) S')
        (self.state / 'game-admissions/10.json').write_text(json.dumps(dict(pid=10, pid_birth='10')))
        with self.assertRaises(ValueError):
            self.probe()


if __name__ == '__main__':
    unittest.main()
