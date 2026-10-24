import errno
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent / 'kit'))
import board
from test_board import Fixture


class Boundaries(Fixture):
    def setUp(self):
        super().setUp()
        self.config['dispatcher']['claude_inbox'] = '.state/lead.md'
        self.write_config()
        self.registry = self.root / 'host.json'
        self.registry.write_text(json.dumps({'projects': [{'root': str(self.root)}]}))

    def cli(self, run=None):
        with patch.object(board, 'command', side_effect=run or self.fake_run), \
                patch.object(sys, 'argv', ['board', '--registry', str(self.registry)]), \
                patch('sys.stdout', new_callable=io.StringIO) as output:
            code = board.main()
        return code, json.loads(output.getvalue())

    def test_nonzero_retention_and_waiting_zero_through_command_adapter(self):
        self.issue(1, state='closed')
        self.register({'1': dict(state='active', pane='wF:p7')})
        raw_command = board.command
        replies = iter([(1, {'state': 'retained'}), (0, {'state': 'waiting-worktree'}),
                        (0, {'state': 'reclaimed'})])
        def run(argv, root):
            if 'reclaim' not in argv:
                return self.fake_run(argv, root)
            self.calls.append(argv)
            code, value = next(replies)
            with patch.object(board.subprocess, 'run', return_value=subprocess.CompletedProcess(
                    argv, code, json.dumps(value).encode(), b'')):
                return raw_command(argv, root)
        for expected in ('retained', 'retained', 'done'):
            code, rows = self.cli(run)
            self.assertEqual(code, 0)
            self.assertTrue(any(e['state'] == expected for r in rows for e in r.get('events', [])))
        self.assertEqual(self.cli(run)[0], 0)
        self.assertEqual(len(self.actions()), 3)
        self.assertFalse((self.root / '.state/inbox.md').exists())
        self.assertFalse((self.root / '.state/lead.md').exists())

    def test_exit75_retry_then_successful_single_spawn_through_adapter(self):
        self.issue(1)
        raw_command = board.command
        replies = iter([(75, {'state': 'retry', 'retryable': True}), (0, {'state': 'active'})])
        def run(argv, root):
            if 'spawn' not in argv:
                return self.fake_run(argv, root)
            self.calls.append(argv)
            code, value = next(replies)
            with patch.object(board.subprocess, 'run', return_value=subprocess.CompletedProcess(
                    argv, code, json.dumps(value).encode(), b'')):
                return raw_command(argv, root)
        for expected in ('queued', 'done'):
            code, rows = self.cli(run)
            self.assertEqual(code, 0)
            self.assertTrue(any(e['state'] == expected for r in rows for e in r.get('events', [])))
        self.assertEqual(self.cli(run)[0], 0)
        self.assertEqual(len(self.actions()), 2)
        self.assertFalse((self.root / '.state/inbox.md').exists())

    def test_lock_io_failure_is_failed_not_queued(self):
        with patch.object(board.fcntl, 'flock', side_effect=OSError(errno.EIO, 'fixed I/O failure')):
            code, rows = self.cli()
        self.assertEqual(code, 1)
        self.assertEqual(rows[0]['state'], 'failed')
        self.assertEqual(self.calls, [])
        self.assertTrue(self.registry.with_name('inbox.md').exists())

    def test_lead_lost_append_stays_failed_and_not_replayed(self):
        self.issue(1, owner='claude', status='in-progress')
        original = os.write
        def lost(fd, payload):
            original(fd, payload)
            raise OSError('fixed lost acknowledgement')
        with patch.object(board.os, 'write', side_effect=lost):
            self.assertEqual(self.cli()[0], 1)
        self.assertEqual(self.cli()[0], 1)
        self.assertEqual(self.cli()[0], 1)
        self.assertEqual(len((self.root / '.state/lead.md').read_text().splitlines()), 1)
        journal = json.loads((self.root / '.state/board.json').read_text())
        self.assertEqual(next(iter(journal['claude_notices'].values()))['phase'], 'uncertain')
        self.assertEqual(len((self.root / '.state/inbox.md').read_text().splitlines()), 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)
