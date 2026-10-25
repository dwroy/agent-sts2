"""Candidate-to-ROOT/LIVE mapping and input drift use tiny, real Git worktrees."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import board_queue_checks as checks
import board_queue_admission as admission


class CandidateChecks(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.handles = [tempfile.TemporaryFile() for _ in range(3)]
        for handle in self.handles:
            self.addCleanup(handle.close)
        self.env = patch.dict(os.environ, dict(MAS_QUEUE_LEASE_FDS=','.join(str(h.fileno()) for h in self.handles),
            GIT_AUTHOR_NAME='Queue fixture', GIT_COMMITTER_NAME='Queue fixture',
            GIT_AUTHOR_EMAIL='fixture@localhost', GIT_COMMITTER_EMAIL='fixture@localhost'))
        self.env.start()
        self.addCleanup(self.env.stop)
        self.git('init', '-q', '-b', 'main')
        (self.root / '.gitignore').write_text('.state/\n.worktrees/\nagent/node_modules/\n')
        self.put('agent/src/value.ts', '\n'.join('line' + str(i) for i in range(12)) + '\n')
        self.put('agent/package.json', json.dumps(dict(devDependencies=dict(pinned='1'))))
        packages = {'node_modules/pinned': dict(version='1', integrity='fixed')}
        self.put('agent/package-lock.json', json.dumps(dict(packages=packages)))
        self.put('agent/node_modules/.package-lock.json', json.dumps(dict(packages=packages)))
        self.put('agent/node_modules/pinned/index.js', 'export const fixture = true;\n')
        self.put('knowledge/characters/silent/fixture.json', '{"fixed":"baseline"}\n')
        self.git('add', '.')
        self.git('commit', '-qm', 'baseline')
        self.baseline = self.git('rev-parse', 'HEAD')
        self.live = self.root / '.worktrees/live'
        self.git('worktree', 'add', '--detach', str(self.live), self.baseline)
        self.git('checkout', '-qb', 'delivery')
        self.put('ops/fixture.py', 'answer = 42\n')
        source = self.root / 'agent/src/value.ts'
        source.write_text(source.read_text().replace('line1\n', 'changed1\n'))
        self.git('add', '.')
        self.git('commit', '-qm', 'fixed delivery')
        self.head = self.git('rev-parse', 'HEAD')
        self.git('checkout', '-q', 'main')
        self.directory = self.root / '.state/batch'
        self.directory.mkdir(parents=True)
        self.candidate = self.directory / 'tree'
        self.git('worktree', 'add', '--detach', str(self.candidate), self.head)
        (self.directory / 'manifest.json').write_text(json.dumps(dict(baseline=self.baseline)))
        self.job = dict(root=str(self.root), cwd=str(self.candidate), candidate=self.head,
                        tree=self.git('rev-parse', self.head + '^{tree}'), policy_sha256={})
        self.options = dict(fixtures=[], runtime_install_paths=['agent/src/value.ts'], root_only_prefixes=['ops/'])

    def put(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value)

    def git(self, *args):
        return subprocess.check_output(['git', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false',
                                       '-C', str(self.root), *args], text=True, stderr=subprocess.PIPE).strip()

    def assemble(self):
        return checks.assemble(self.root, self.job, self.options, self.directory)

    def context(self, assembly):
        return dict(job=self.job, assembly=assembly)

    def test_runtime_patch_preserves_actual_live_differences_and_main(self):
        source = self.live / 'agent/src/value.ts'
        source.write_text(source.read_text().replace('line11\n', 'live11\n'))
        actual = source.read_bytes()
        result = self.assemble()
        runtime = Path(result['runtime'])
        self.assertIn('changed1\n', (runtime / 'agent/src/value.ts').read_text())
        self.assertIn('live11\n', (runtime / 'agent/src/value.ts').read_text())
        self.assertEqual(source.read_bytes(), actual)
        self.assertEqual(self.git('rev-parse', 'main'), self.baseline)
        self.assertEqual(self.git('symbolic-ref', 'HEAD'), 'refs/heads/main')
        self.assertEqual(result['deployment'][0]['path'], 'agent/src/value.ts')
        checks.verify_after(self.context(result))

    def test_actual_data_baseline_is_frozen_separately_from_candidate(self):
        name = 'knowledge/characters/silent/fixture.json'
        self.put(name, '{"fixed":"current-root"}\n')
        (self.live / name).write_text('{"fixed":"current-live"}\n')
        result = self.assemble()
        self.assertEqual((Path(result['root']) / name).read_text(), '{"fixed":"current-root"}\n')
        self.assertEqual((Path(result['runtime']) / name).read_text(), '{"fixed":"current-live"}\n')
        self.assertEqual(checks.text(self.candidate, 'rev-parse', 'HEAD'), self.head)
        self.assertEqual((self.candidate / name).read_text(), '{"fixed":"baseline"}\n')
        self.put(name, '{"fixed":"drift"}\n')
        with self.assertRaisesRegex(ValueError, 'data preimage'):
            checks.verify_after(self.context(result))

    def test_unmapped_runtime_code_is_rejected_before_allocation(self):
        self.options['runtime_install_paths'] = []
        with self.assertRaisesRegex(ValueError, 'mapping'):
            self.assemble()
        self.assertFalse((self.directory / 'validation-root').exists())

    def test_conflicting_live_preimage_is_preserved(self):
        source = self.live / 'agent/src/value.ts'
        source.write_text(source.read_text().replace('line1\n', 'conflicting-live1\n'))
        before = source.read_bytes()
        with self.assertRaises(subprocess.CalledProcessError):
            self.assemble()
        self.assertEqual(source.read_bytes(), before)
        self.assertEqual(self.git('rev-parse', 'main'), self.baseline)

    def test_concurrent_main_change_invalidates_without_mutating_candidate(self):
        self.git('update-ref', 'refs/heads/main', self.head, self.baseline)
        with self.assertRaisesRegex(ValueError, 'main advanced'):
            self.assemble()
        self.assertEqual(checks.text(self.candidate, 'rev-parse', 'HEAD'), self.head)

    def test_existing_view_does_not_start_a_second_check(self):
        self.assemble()
        with self.assertRaisesRegex(ValueError, 'already exists'):
            self.assemble()

    def test_source_dependency_and_index_drift_are_rejected(self):
        result = self.assemble()
        context = self.context(result)
        tree = Path(result['root'])
        original = (tree / 'agent/src/value.ts').read_bytes()
        (tree / 'agent/src/value.ts').write_text('drift\n')
        with self.assertRaisesRegex(ValueError, 'drift'):
            checks.verify_after(context)
        (tree / 'agent/src/value.ts').write_bytes(original)
        self.put('agent/node_modules/pinned/index.js', 'changed executable\n')
        with self.assertRaisesRegex(ValueError, 'dependency'):
            checks.verify_after(context)

    def test_check_executable_drift_invalidates_a_completed_projection(self):
        result = self.assemble()
        context = {**self.context(result), 'tools': {'node': 'frozen-executable'}}
        with patch.object(checks, 'tool_snapshot', return_value={'node': 'replaced-executable'}):
            with self.assertRaisesRegex(ValueError, 'executable'):
                checks.verify_after(context)

    def test_capacity_refusal_is_before_first_checkout(self):
        with patch.object(checks, 'require_worktree_capacity', side_effect=OSError('ENOSPC')):
            with self.assertRaises(OSError):
                self.assemble()
        self.assertFalse((self.directory / 'validation-root').exists())

    def test_large_new_cold_materials_are_refused_without_checkout(self):
        self.git('checkout', '-q', 'delivery')
        self.put('paper/materials/new-large-snapshot/fixed.txt', 'x' * 4097)
        self.git('add', 'paper')
        self.git('commit', '-qm', 'cold fixture')
        head = self.git('rev-parse', 'HEAD')
        self.git('checkout', '-q', 'main')
        with self.assertRaisesRegex(ValueError, 'cold snapshot'):
            admission.admission(self.root, [head], dict(exclude=[], new_materials_max_bytes=4096))
        self.assertFalse((self.directory / 'validation-root').exists())

    def test_unlocked_or_duplicate_queue_descriptors_are_rejected(self):
        os.environ['MAS_QUEUE_LEASE_FDS'] = '1,1,1'
        with self.assertRaises(ValueError):
            checks.fds()


if __name__ == '__main__':
    unittest.main()
