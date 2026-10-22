"""Integrator boundary checks against the separately checked-out private kit."""
import contextlib
import fcntl
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.environ['REVIEW_KIT'])
import board
import test_board as fixtures

COMMIT_TOKENS = board.watchdog.commit_tokens


class IndependentContract(fixtures.Fixture):
    def test_host_delegation_skips_locked_corrupt_project_state(self):
        self.config['dispatcher']['consumer'] = 'maintenance'
        self.write_config()
        state = self.root / '.state'
        state.mkdir()
        (state / 'board.json').write_text('corrupt journal must never be consumed')
        registry = self.root / 'projects.json'
        registry.write_text(json.dumps({'projects': [{'root': str(self.root)}]}))
        with (state / 'board.lock').open('w') as held:
            fcntl.flock(held, fcntl.LOCK_EX | fcntl.LOCK_NB)
            before = {str(p): p.read_bytes() for p in state.iterdir()}
            output = io.StringIO()
            with patch.object(sys, 'argv', ['board.py', '--registry', str(registry)]), \
                    patch.object(board, 'command', side_effect=AssertionError('external call forbidden')), \
                    contextlib.redirect_stdout(output):
                self.assertEqual(0, board.main())
            self.assertEqual([{'repo': 'owner/project', 'state': 'delegated'}],
                             json.loads(output.getvalue()))
            self.assertEqual(before, {str(p): p.read_bytes() for p in state.iterdir()})

    def test_uncertain_known_area_holds_overlap_but_allows_disjoint_work(self):
        self.config['roles']['dev']['max_parallel'] = 10
        self.write_config()
        for number, area in ((1, 'shared'), (2, 'shared'), (3, 'other')):
            self.issue(number)['labels'].append({'name': 'area:' + area})
        original = self.fake_run
        failed = False

        def run(argv, root):
            nonlocal failed
            if 'spawn' in argv and not failed:
                failed = True
                self.calls.append(argv)
                raise subprocess.TimeoutExpired('fixed-fixture', 1)
            return original(argv, root)

        result = board.Dispatcher(board.Board(self.root), False, run).tick()
        self.assertEqual(['1', '3'], [a[-2] for a in self.actions() if 'spawn' in a])
        self.assertTrue(any(r.get('waiting_for') == [1] for r in result))
        journal = json.loads(board.Board(self.root).state.read_text())
        first = journal['events']['1:status:ready:10']
        self.assertEqual(('uncertain', ['area:shared']), (first['phase'], first['areas']))

    def test_real_git_namespace_progress_ignores_unrelated_main(self):
        def git(*args):
            return subprocess.check_output(['git', *args], cwd=self.root, stderr=subprocess.PIPE).decode().strip()

        git('init', '--initial-branch=main')
        git('commit', '--allow-empty', '-m', 'unrelated main fixture')
        git('switch', '-c', 'codex/issue-9-task')
        git('commit', '--allow-empty', '-m', 'development fixture without issue token')
        expected = git('rev-parse', 'HEAD')
        git('switch', 'main')
        git('commit', '--allow-empty', '-m', 'another unrelated shared-main fixture')
        config = board.Board(self.root)
        config.data['worktree'] = {'base_ref': 'refs/heads/main', 'branch_prefix': 'codex/'}
        actual = COMMIT_TOKENS(config, 9, 'dev', {'9': {'branch': 'issue-9-task'}})
        self.assertEqual({'refs/heads/codex/issue-9-task': expected}, actual)


if __name__ == '__main__':
    unittest.main(verbosity=2)
