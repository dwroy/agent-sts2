"""Fixed-data concurrency, ownership and shared-environment bootstrap checks."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

jobs = load('parallel_jobs', 'ops/learner_jobs.py')
dispatch = load('parallel_dispatch', 'ops/proposal_dispatch.py')
RUN = 'SILENT000001'

class StrategyConcurrency(unittest.TestCase):
    def setUp(self):
        self.state = {'batches': {}}
        self.calls = []
        self.items = {f'p{i}': {'id': f'p{i}', 'character': 'silent', 'target_task': 'strategy-proposal',
                     'state': 'pending', 'runs': [RUN]} for i in range(24)}
        self.library = SimpleNamespace(QUEUE='queue.jsonl', fold=lambda _: self.items)

    def start(self, argv, *args):
        self.calls.append(argv)
        return 100 + len(self.calls), None

    def consume(self, stamp='20261009-120000'):
        with patch.object(dispatch, 'library', return_value=self.library), \
             patch.object(dispatch, 'finished_count', return_value=181), \
             patch.object(jobs, 'available', return_value=True), \
             patch.object(jobs, 'start_learner', side_effect=self.start):
            return dispatch.dispatch(self.state, '/fixture', str(ROOT/'ops'), 'silent', lambda pid: True,
                                     stamp, jobs.dispatch_write)

    def test_two_disjoint_batches_are_filled_and_third_is_blocked(self):
        result = self.consume()
        self.assertEqual(result[0], '20261009-120000-strategy-proposal')
        batches = list(self.state['batches'].values())
        self.assertEqual(len(batches), 2)
        self.assertEqual([len(b['proposal_ids']) for b in batches], [10, 10])
        self.assertFalse(set(batches[0]['proposal_ids']) & set(batches[1]['proposal_ids']))
        self.assertNotEqual(batches[0]['worktree'], batches[1]['worktree'])
        self.assertTrue(batches[1]['worktree'].endswith('-s2'))
        self.assertIsNone(self.consume('20261009-120001'))
        self.assertEqual(len(self.calls), 2)

    def test_old_running_batch_keeps_ownership_while_other_ids_are_claimed(self):
        original = {'task': 'strategy-proposal', 'state': 'running', 'pid': 77,
                    'proposal_ids': list(self.items)[:10], 'worktree': '/old', 'key': 'old'}
        self.state['batches']['old'] = dict(original)
        self.consume()
        self.assertEqual(self.state['batches']['old'], original)
        new = next(b for k, b in self.state['batches'].items() if k != 'old')
        self.assertEqual(new['proposal_ids'], list(self.items)[10:20])
        self.assertEqual(len(self.calls), 1)

    def test_same_manual_strategy_key_cannot_take_both_slots(self):
        with patch.object(jobs, 'available', return_value=True), \
             patch.object(jobs, 'start_learner', side_effect=self.start):
            def call(key, stamp):
                return jobs.dispatch_write(self.state, '/fixture', str(ROOT/'ops'), 'strategy-proposal',
                    'silent', [RUN], key, 'ops', lambda pid: True, stamp)
            self.assertIsNotNone(call('same', '20261009-120000'))
            self.assertIsNone(call('same', '20261009-120001'))
            self.assertIsNotNone(call('different', '20261009-120002'))
            self.assertIsNone(call('third', '20261009-120003'))

    def test_running_repair_is_not_dispatched_twice(self):
        self.state['proposal_repairs'] = {'repair': {'state': 'pending', 'character': 'silent', 'runs': [RUN]}}
        self.state['batches']['repair'] = {'task': 'strategy-proposal', 'state': 'running', 'pid': 77,
                                         'key': 'repair', 'proposal_repair': 'repair'}
        self.consume()
        self.assertEqual(len(self.calls), 1)
        new = next(b for k, b in self.state['batches'].items() if k != 'repair')
        self.assertNotIn('proposal_repair', new)
        self.assertEqual(len(new['proposal_ids']), 10)

    def test_other_writer_types_stay_single(self):
        self.state['batches']['fix'] = {'task': 'fix-batch', 'state': 'running', 'pid': 77}
        self.assertTrue(jobs.busy(self.state, 'fix-batch', lambda pid: True))
        self.state['batches']['core'] = {'task': 'fix-batch', 'learner_task': 'silent-historical-core-builds',
                                       'state': 'running', 'pid': 78}
        self.assertFalse(jobs.busy(self.state, 'strategy-proposal', lambda pid: True))

    def test_second_slot_wrapper_links_existing_python_environment(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root/'ops').mkdir()
            (root/'agent/node_modules').mkdir(parents=True)
            (root/'agent/.keep').write_text('fixture agent directory\n')
            (root/'data/logdb-venv/bin').mkdir(parents=True)
            (root/'data/logdb-venv/bin/python').write_text('existing fixture dependency\n')
            (root/'.gitignore').write_text('.worktrees/\nops/codex-ops/\nagent/node_modules\ndata/logdb-venv\n')
            for name in ['paths.sh', 'codex-ops-learner.sh']:
                shutil.copyfile(ROOT/'ops'/name, root/'ops'/name)
            (root/'ops/codex-ops-learn.py').write_text('raise SystemExit(0)\n')
            env = dict(os.environ)
            env.update(GIT_AUTHOR_NAME='Fixture', GIT_AUTHOR_EMAIL='fixture@example.test',
                       GIT_COMMITTER_NAME='Fixture', GIT_COMMITTER_EMAIL='fixture@example.test')
            subprocess.run(['git', 'init', '-b', 'main', str(root)], check=True, capture_output=True, env=env)
            subprocess.run(['git', '-C', str(root), 'add', '.gitignore', 'ops', 'agent/.keep'], check=True, capture_output=True, env=env)
            subprocess.run(['git', '-C', str(root), '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'fixture'],
                           check=True, capture_output=True, env=env)
            batch = '20261009-120000-s2-strategy-proposal'
            tree = root/'.worktrees/codex-strategy-silent-20261009-120000-s2'
            state_dir = root/'ops/codex-ops'
            env.update(CODEX_OPS_ROOT=str(root), CODEX_OPS_DIR=str(state_dir), CODEX_OPS_NO_DRAIN='1',
                       FIXTURE_TREE=str(tree), LEARNER_CMD='readlink "$FIXTURE_TREE/data/logdb-venv"')
            result = subprocess.run(['bash', str(root/'ops/codex-ops-learner.sh'), batch, RUN,
                                     'silent', 'strategy-proposal', str(tree)], env=env, capture_output=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((tree/'data/logdb-venv').resolve(), root/'data/logdb-venv')
            self.assertIn('../../../data/logdb-venv', (state_dir/'learner'/(batch+'.out')).read_text())

if __name__ == '__main__':
    unittest.main()
