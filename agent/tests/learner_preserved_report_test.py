import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('checks', Path(__file__).resolve().parents[2] / 'ops/learner_checks.py')
checks = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checks)


class PreservedCalibration(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.tree = self.root / '.worktrees/silent-boss-calibration'
        self.scratch = self.tree / 'learner/runs/20261007-154303-silent-boss-calibration'
        self.scratch.mkdir(parents=True)
        (self.root / 'ops').mkdir()
        self.out = self.root / 'reports'
        self.out.mkdir()
        self.batch_id = '20261007-154302-fix-batch'
        self.output = self.out / (self.batch_id + '.out')
        self.output.write_text('Runner ended without completion JSON.\n')
        self.batch = dict(task='fix-batch', learner_task='silent-boss-calibration', character='silent',
                          feature_request='silent-calibration-' + '1' * 24, worktree=str(self.tree),
                          state='failed', rc=124, report={}, merged=None)
        self.launch_path = self.scratch.with_suffix('.jsonl')
        self.launch = dict(type='learner_launch', task='silent-boss-calibration', cwd=str(self.tree),
                           params=dict(character='silent', merge='live', worktree=str(self.tree),
                                       scratch=str(self.scratch), project_root=str(self.root),
                                       merge_dir=str(self.root / '.worktrees/live')))
        self.launch_path.write_text(json.dumps(self.launch) + '\n')
        self.report_path = self.scratch / 'final-report.json'
        self.report = dict(task='fix-batch', base='a' * 40, fixes=[dict(commit='c' * 40, source_parent='b' * 40)],
                           merged='d' * 40, published_commit='e' * 40, published_tree='f' * 40,
                           code_proposals=[], tests=dict(tsc=0, vitest=0))
        self.report_path.write_text(json.dumps(self.report))
        self.calls = []
        self.events = []
        self.inbox = []

    def run_command(self, argv, **kwargs):
        self.calls.append(argv)
        if 'merge-base' in argv:
            return subprocess.CompletedProcess(argv, 0)
        if 'rev-parse' in argv:
            output = {'e' * 40 + '^{tree}': 'f' * 40 + '\n', 'a' * 40 + '^{commit}': 'a' * 40 + '\n', 'c' * 40 + '^': 'b' * 40 + '\n'}.get(argv[-1], '2' * 40 + '\n' + '3' * 40 + '\n')
            return subprocess.CompletedProcess(argv, 0, output)
        self.assertEqual(argv[0], 'bash')
        return subprocess.CompletedProcess(argv, 0)

    def recheck(self):
        with patch.object(checks.subprocess, 'run', side_effect=self.run_command):
            return checks.recheck_write_batch(self.batch_id, self.batch, str(self.root), str(self.out),
                                              lambda kind, message: self.events.append(kind), self.inbox.append)

    def test_rechecks_launch_bound_report_without_rewriting_failed_completion(self):
        before = copy.deepcopy(self.batch)
        original = self.output.read_bytes()
        self.assertEqual(self.recheck(), 0)
        self.assertEqual(self.recheck(), 0)
        self.assertEqual(self.output.read_bytes(), original)
        self.assertEqual({k: self.batch[k] for k in before}, before)
        self.assertEqual(len([argv for argv in self.calls if argv[0] == 'bash']), 1)
        proof = self.batch['fallback_checks'][0]['report_proof']
        self.assertEqual(proof['path'], str(self.report_path))
        self.assertEqual(len(proof['sha256']), 64)
        self.assertEqual(self.events, ['learner-checks'])

    def test_rejects_later_launch_and_mismatched_or_external_paths(self):
        original = self.launch_path.read_bytes()
        for changes in [dict(cwd=str(self.root)), dict(task='other'),
                        dict(params=dict(self.launch['params'], scratch=str(self.root)) )]:
            with self.subTest(changes=changes):
                self.launch_path.write_text(json.dumps(dict(self.launch, **changes)) + '\n')
                self.assertEqual(self.recheck(), 2)
        self.launch_path.write_bytes(original)
        self.report_path.unlink()
        external = self.root / 'external.json'
        external.write_text(json.dumps(self.report))
        self.report_path.symlink_to(external)
        self.assertEqual(self.recheck(), 2)
        self.report_path.unlink()
        self.report_path.write_text(json.dumps(self.report))
        self.launch_path.rename(self.launch_path.with_name('20261007-164303-silent-boss-calibration.jsonl'))
        self.assertEqual(self.recheck(), 2)
        self.assertFalse(self.calls)

    def test_rejects_running_batches_and_unpublished_or_failed_reports(self):
        for changes in [dict(task='strategy-proposal'), dict(batch='other'), dict(published_tree='bad'),
                        dict(tests=dict(tsc=0, vitest=1)), dict(fixes=[dict(commit='c' * 7)])]:
            with self.subTest(changes=changes):
                self.report_path.write_text(json.dumps(dict(self.report, **changes)))
                self.assertEqual(self.recheck(), 2)
        self.report_path.write_text(json.dumps(self.report))
        self.batch['state'] = 'running'
        self.assertEqual(self.recheck(), 2)
        self.assertFalse(self.calls)

    def test_requires_exact_published_tree_and_source_ancestry(self):
        normal = self.run_command
        for failure in ['tree', 'source', 'parent']:
            def invalid(argv, **kwargs):
                if failure == 'tree' and argv[-1] == 'e' * 40 + '^{tree}':
                    return subprocess.CompletedProcess(argv, 0, '9' * 40 + '\n')
                if failure == 'parent' and argv[-1] == 'c' * 40 + '^':
                    return subprocess.CompletedProcess(argv, 0, '9' * 40 + '\n')
                if failure == 'source' and 'merge-base' in argv and 'c' * 40 in argv:
                    return subprocess.CompletedProcess(argv, 1)
                return normal(argv, **kwargs)
            with self.subTest(failure=failure), patch.object(checks.subprocess, 'run', side_effect=invalid):
                result = checks.recheck_write_batch(self.batch_id, self.batch, str(self.root), str(self.out),
                                                    lambda kind, message: self.events.append(kind), self.inbox.append)
                self.assertEqual(result, 2)
        self.assertFalse([argv for argv in self.calls if argv[0] == 'bash'])
        self.assertNotIn('fallback_checks', self.batch)


if __name__ == '__main__':
    unittest.main()
