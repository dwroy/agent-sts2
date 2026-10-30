"""Real Linux OFD/EOF/admission races; fixed inputs and at most one fixture child."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT / 'ops'))
import board_queue_checks as checks
import board_queue_control as control
import board_queue_custody as custody
import board_refresh_queue as refresh
from issue_session_support import Board


class Custody(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        environment = patch.dict(os.environ, CODEX_OPS_DIR=str(self.root / 'ops/codex-ops'))
        environment.start()
        self.addCleanup(environment.stop)
        self.put('.agents/merge-queue.json', json.dumps(dict(custody=dict(
            enabled=True, schema=custody.SCHEMA, handshake_seconds=3))))
        self.put('.agents/board-kit-pin.json', json.dumps(dict(commit='c' * 40, project_control_contracts=[control.SCHEMA])))
        board = Board(PROJECT).data
        board['dispatcher']['heavy'] = dict(enabled=False, machine_state=str(self.root / 'machine'))
        self.put('.agents/board.yaml', json.dumps(board))
        self.job_path = self.root / '.state/batch/job.json'
        self.job = dict(root=str(self.root), candidate='a' * 40)
        self.put(str(self.job_path.relative_to(self.root)), json.dumps(self.job))
        self.context = dict(job=self.job, job_path=str(self.job_path))
        self.processes = []
        original = subprocess.Popen
        def launch(*args, **kwargs):
            process = original(*args, **kwargs)
            self.processes.append(process)
            return process
        self.launcher = patch.object(custody.subprocess, 'Popen', launch)
        self.launcher.start()
        self.addCleanup(self.launcher.stop)
        self.addCleanup(self.stop)

    def put(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value)
        return path

    def stop(self):
        for fd in custody.fds(self.context):
            try:
                os.close(fd)
            except OSError:
                pass
        for process in self.processes:
            if process.poll() is None:
                process.terminate()
            process.wait(timeout=5)

    def test_actual_kernel_k_and_same_ofd_survive_keeper_interruption_but_batch_fails(self):
        custody.start(self.context)
        custody.verify(self.context)
        row = custody.observe(self.root)
        self.assertEqual(row['phase'], 'holding')
        self.assertEqual(custody.descriptor(self.context['custody']['k_fd']), row['k_identity'])
        with (self.root / 'ops/knowledge-refresh.lock').open('a') as independent:
            with self.assertRaises(BlockingIOError):
                fcntl.flock(independent, fcntl.LOCK_EX | fcntl.LOCK_NB)
            process = self.processes[0]
            os.kill(process.pid, signal.SIGTERM)
            self.assertEqual(process.wait(timeout=5), 143)
            # EOF/failure is explicit even though the worker's duplicate still holds K.
            with self.assertRaises(custody.CustodyError):
                custody.verify(self.context)
            with self.assertRaises(BlockingIOError):
                fcntl.flock(independent, fcntl.LOCK_EX | fcntl.LOCK_NB)
        decision = control.evaluate(self.root, 'post-result')
        self.assertEqual(decision['decision'], 'failed-custody')
        self.assertFalse(decision['cleanup_complete'])
        self.assertTrue((self.job_path.parent / 'custody-failure.json').is_file())

    def test_busy_k_refuses_before_assembly_or_full_once(self):
        key_path = self.put('ops/knowledge-refresh.lock', '')
        recorded = []
        fake_kit = SimpleNamespace(atomic=custody.atomic,
                                  complete_check=lambda *args, **kwargs: recorded.append((args, kwargs)))
        fake_board = SimpleNamespace(data=dict(dispatcher=dict(install='ops/kit')))
        with key_path.open('a') as key, patch.object(checks, 'Board', return_value=fake_board), \
                patch.object(checks, 'verify'), patch.object(checks, 'policy', return_value={}), \
                patch('board_heavy.inherited', return_value=(1, 2)), \
                patch.dict(sys.modules, {'merge_queue': fake_kit}), \
                patch.object(checks, 'assemble', side_effect=AssertionError('assembly must not start')):
            fcntl.flock(key, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assertEqual(checks.run(self.job_path), 1)
        self.assertEqual(recorded[0][0][1], 'failed')
        self.assertEqual(recorded[0][1]['evidence']['full_runs'], 0)
        self.assertFalse((self.job_path.parent / 'full.once').exists())
        self.assertEqual(json.loads((self.job_path.parent / 'custody.json').read_text())['phase'], 'failed')

    def test_old_pin_cannot_enable_custody_and_default_off_has_no_process(self):
        self.put('.agents/board-kit-pin.json', '{}')
        with self.assertRaisesRegex(ValueError, 'lifecycle capability'):
            custody.start(self.context)
        self.put('.agents/merge-queue.json', '{}')
        custody.start(self.context)
        self.assertFalse(self.processes)
        self.assertFalse((self.root / 'ops/codex-ops/refresh-queue').exists())

    def test_lifeline_eof_stops_the_actual_node_process(self):
        reader, writer = os.pipe()
        handles = [tempfile.TemporaryFile() for _ in range(4)]
        try:
            context = dict(full_lock_fd=handles[3].fileno(), custody=dict(k_fd=handles[0].fileno(), life_fd=reader))
            path = self.put('.state/node-context.json', json.dumps(context))
            env = dict(os.environ, MAS_QUEUE_LEASE_FDS=','.join(str(h.fileno()) for h in handles[:3]),
                       STS2_BOARD_CHECK_CONTEXT=str(path))
            node = str(Path.home() / '.local/node/bin/node')
            process = subprocess.Popen([node, '--import', str(PROJECT / 'ops/board_queue_leases.mjs'),
                '--eval', 'setInterval(() => {}, 1000)'], env=env, pass_fds=(reader, *(h.fileno() for h in handles)),
                stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            os.close(writer)
            writer = None
            out, error = process.communicate(timeout=5)
            self.assertEqual(process.returncode, 75, error.decode())
        finally:
            os.close(reader)
            if writer is not None:
                os.close(writer)
            for handle in handles:
                handle.close()

    def test_new_waiter_before_release_is_term_cancelled_and_debt_precedes_release(self):
        source = self.put('ops/refresh-costs.py', '# Fixed ordinary source, never executed.\n')
        command = [sys.executable, str(source), '--root', str(self.root), '--code-root', str(self.root / '.worktrees/live')]
        machine = self.root / 'machine'
        for part in ('leases', 'slots', 'records'):
            (machine / part).mkdir(parents=True)
        claim_id = 'a' * 32
        claim = machine / 'leases' / claim_id
        slot = machine / 'slots/0'
        code = ('import fcntl,os,pathlib,sys; '
                'a=open(sys.argv[1],"a"); b=open(sys.argv[2],"a"); '
                'fcntl.flock(a,fcntl.LOCK_EX); fcntl.flock(b,fcntl.LOCK_EX); '
                'k=open(sys.argv[3],"a"); print("ready",flush=True); fcntl.flock(k,fcntl.LOCK_EX); '
                'pathlib.Path(sys.argv[4]).write_text("must never execute")')
        key = self.put('ops/knowledge-refresh.lock', '')
        forbidden = self.root / 'forbidden-write'
        argv = [sys.executable, '-u', '-c', code, str(claim), str(slot), str(key), str(forbidden)]
        with key.open('a') as guard:
            fcntl.flock(guard, fcntl.LOCK_EX)
            process = subprocess.Popen(argv, stdout=subprocess.PIPE)
            self.assertEqual(process.stdout.readline(), b'ready\n')
            actor = custody.identity(process.pid)
            self.put(str((machine / 'records' / (claim_id + '.json')).relative_to(self.root)), json.dumps(dict(
                root=str(self.root), role='other', runner_pid=actor['pid'], runner_start=actor['start'],
                boot_id=actor['boot_id'], command_sha256=hashlib.sha256(json.dumps(argv).encode()).hexdigest())))
            ident = 'b' * 32
            row = dict(schema=refresh.SCHEMA, root=str(self.root), id=ident, actor=actor, ordinary=refresh.classify(self.root, command),
                       command=command, stage='waiting-k', command_started=False, admission_argv=argv,
                       runner_argv=argv, bindings=refresh.bindings(self.root), claims=[str(claim), str(slot)])
            refresh.hold(self.root, 'fixture-epoch')
            # The kernel wait arrow can appear just after the stdout handshake.
            for _ in range(100):
                if refresh.cancellable(self.root, row):
                    break
                time.sleep(.01)
            try:
                self.assertTrue(refresh.cancellable(self.root, row))
                unknown = refresh.drain(self.root, 'fixture-epoch')
                self.assertFalse(unknown['clear'])
                self.assertIn('unregistered-k-waiter:' + str(process.pid), unknown['unknown'])
                self.assertIsNone(process.poll())
                self.put('ops/codex-ops/refresh-queue/requests/' + ident + '.json', json.dumps(row))
                changed = dict(row, bindings={})
                self.assertFalse(refresh.cancellable(self.root, changed))
                first = refresh.drain(self.root, 'fixture-epoch')
                self.assertFalse(first['clear'])
                self.assertEqual(first['cancelled'], [ident])
                self.assertEqual(process.wait(timeout=5), -signal.SIGTERM)
                debt = refresh.directory(self.root) / 'debts' / (ident + '.json')
                self.assertEqual(json.loads(debt.read_text())['state'], 'pending')
                with refresh.releasing(self.root, 'fixture-epoch') as final:
                    self.assertTrue(final['clear'])
                self.assertFalse(forbidden.exists())
                self.assertFalse((refresh.directory(self.root) / 'hold.json').exists())
            finally:
                if process.poll() is None:
                    process.terminate()
                process.wait(timeout=5)
                process.stdout.close()

    def test_node_lifeline_monitor_keeps_all_descriptors_through_finalizer_exec(self):
        reader, writer = os.pipe()
        handles = [tempfile.TemporaryFile() for _ in range(4)]
        descriptors = tuple(fcntl.fcntl(fd, fcntl.F_DUPFD, 100) for fd in (*(h.fileno() for h in handles), reader))
        try:
            context = dict(full_lock_fd=descriptors[3], custody=dict(k_fd=descriptors[0], life_fd=descriptors[4]))
            path = self.put('.state/node-exec-context.json', json.dumps(context))
            env = dict(os.environ, MAS_QUEUE_LEASE_FDS=','.join(map(str, descriptors[:3])),
                       STS2_BOARD_CHECK_CONTEXT=str(path), FIXTURE_PYTHON=sys.executable,
                       FIXTURE_DESCRIPTORS=','.join(map(str, descriptors)))
            body = ('import os; print([os.fstat(int(fd)).st_ino for fd in os.environ["FIXTURE_DESCRIPTORS"].split(",")])')
            script = 'process.execve(process.env.FIXTURE_PYTHON, [process.env.FIXTURE_PYTHON,"-c",' + json.dumps(body) + '],process.env)'
            process = subprocess.Popen([str(Path.home() / '.local/node/bin/node'), '--import',
                str(PROJECT / 'ops/board_queue_leases.mjs'), '--eval', script], env=env,
                pass_fds=descriptors, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            output, error = process.communicate(timeout=5)
            self.assertEqual(process.returncode, 0, error.decode())
            self.assertEqual(json.loads(output), [os.fstat(fd).st_ino for fd in descriptors])
        finally:
            os.close(reader)
            os.close(writer)
            for fd in descriptors:
                os.close(fd)
            for handle in handles:
                handle.close()

    def test_hold_defers_before_machine_claim_and_explicit_cutoff_is_not_ordinary(self):
        source = self.put('knowledge/builders/refresh_driver.py', '# fixed\n')
        command = [sys.executable, str(source), '--all', '--ops-root', str(self.root)]
        self.assertEqual(refresh.classify(self.root, command)['kind'], 'all')
        self.assertIsNone(refresh.classify(self.root, [*command, '--request', 'fixed-request']))
        self.assertIsNone(refresh.classify(self.root, [*command, '--outcome-since', 'fixed-cutoff']))
        refresh.hold(self.root, 'fixture')
        with patch('board_heavy.queued_argv', side_effect=lambda root, role, argv: argv):
            self.assertEqual(refresh.submit(self.root, command), 75)
        rows = list(refresh.records(self.root))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][1]['stage'], 'deferred')
        self.assertFalse((self.root / 'machine').exists())


if __name__ == '__main__':
    unittest.main()
