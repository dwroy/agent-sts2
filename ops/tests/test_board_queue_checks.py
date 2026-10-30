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
import board_queue_strict as strict
import board_queue_custody as custody


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

    def strict_fixture(self):
        assembly = self.assemble()
        context = dict(self.context(assembly), full_runs=1)
        (self.directory / 'sts2-context.json').write_text(json.dumps(context))
        (self.directory / 'full.once').touch()
        full = self.directory / 'vitest-result.json'
        full.write_text('{"success":true,"numFailedTests":0}')
        evidence = dict(context, vitest=dict(sha256=checks.sha(full.read_bytes())))
        (self.directory / 'result.json').write_text(json.dumps(dict(schema='mas-check-result-v1',
            job=custody.digest(self.job), candidate=self.job['candidate'], outcome='passed',
            checks=dict.fromkeys(checks.NAMES, 'passed'), evidence=evidence)))
        record = self.directory / 'custody.json'
        record.write_text(json.dumps(dict(schema=custody.SCHEMA, phase='awaiting-adoption',
            job_sha256=custody.digest(self.job), candidate=self.job['candidate'])))
        self.git('update-ref', 'refs/heads/main', self.job['candidate'], self.baseline)
        receipt = strict.before(record, tuple(handle.fileno() for handle in self.handles))
        target = self.live / 'agent/src/value.ts'
        target.write_bytes((Path(assembly['runtime']) / 'agent/src/value.ts').read_bytes())
        checks.git(self.live, 'add', '--', 'agent/src/value.ts')
        checks.git(self.live, 'commit', '-qm', 'exact installed runtime fixture')
        return record, receipt

    def test_delegated_strict_checks_exact_installed_runtime_and_preserves_single_full(self):
        record, receipt = self.strict_fixture()
        result = strict.after(record, receipt, tuple(handle.fileno() for handle in self.handles))
        self.assertEqual(result['candidate'], self.job['candidate'])
        self.assertEqual(json.loads((self.directory / 'sts2-context.json').read_text())['full_runs'], 1)

    def test_delegated_strict_rejects_unreceipted_knowledge_drift(self):
        record, receipt = self.strict_fixture()
        (self.live / 'knowledge/characters/silent/fixture.json').write_text('{"drift":true}')
        with self.assertRaisesRegex(ValueError, 'LIVE bytes'):
            strict.after(record, receipt, tuple(handle.fileno() for handle in self.handles))

    def test_delegated_strict_rejects_rebound_context(self):
        record, receipt = self.strict_fixture()
        path = self.directory / 'sts2-context.json'
        value = json.loads(path.read_text())
        value['full_runs'] = 2
        path.write_text(json.dumps(value))
        with self.assertRaisesRegex(ValueError, 'single full'):
            strict.after(record, receipt, tuple(handle.fileno() for handle in self.handles))

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

    def test_view_checkout_modes_are_fixed_under_group_writable_umask(self):
        name = 'ops/fake-herdr.py'
        self.candidate_fixture(name, '#!/usr/bin/env python3\n')
        (self.candidate / name).chmod(0o755)
        checks.git(self.candidate, 'add', '--', name)
        checks.git(self.candidate, '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'executable fixture')
        self.job.update(candidate=checks.text(self.candidate, 'rev-parse', 'HEAD'),
                        tree=checks.text(self.candidate, 'rev-parse', 'HEAD^{tree}'))
        previous = os.umask(0o002)
        try:
            result = self.assemble()
            self.assertEqual(os.umask(0o002), 0o002)
        finally:
            os.umask(previous)
        fixture = Path(result['root']) / name
        self.assertEqual(fixture.stat().st_mode & 0o777, 0o755)
        fixture.chmod(0o755)
        checks.verify_after(self.context(result))
        fixture.chmod(0o775)
        with self.assertRaisesRegex(ValueError, 'frozen tree/input/index drift: root'):
            checks.verify_after(self.context(result))

    def candidate_fixture(self, name, value='fixed ROOT fixture\n'):
        path = self.candidate / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value)
        checks.git(self.candidate, 'add', '--', name)
        checks.git(self.candidate, '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'ROOT fixture')
        self.job.update(candidate=checks.text(self.candidate, 'rev-parse', 'HEAD'),
                        tree=checks.text(self.candidate, 'rev-parse', 'HEAD^{tree}'))
        self.options['root_only_prefixes'].append('paper/')

    def live_fixture(self, name):
        path = self.live / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('fixed LIVE fixture\n')
        checks.git(self.live, 'add', '--', name)
        checks.git(self.live, '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'LIVE fixture')

    def test_root_only_fixture_uses_candidate_blob_without_requiring_live_entry(self):
        name = 'paper/materials/issue29-brain-speed/results.jsonl'
        self.candidate_fixture(name)
        self.options.update(fixtures=[name], live_fixtures=[])
        result = self.assemble()
        self.assertEqual((Path(result['root']) / name).read_text(), 'fixed ROOT fixture\n')
        self.assertFalse((Path(result['runtime']) / name).exists())
        self.assertEqual(result['fixture_sources']['live'], [])
        row = result['fixture_sources']['root'][0]
        self.assertEqual(row['commit'], self.job['candidate'])
        self.assertEqual(row['blob'], checks.text(self.candidate, 'rev-parse', 'HEAD:' + name))
        # The current delivery's older host verifier also accepts this context:
        # this ROOT-only path has no Git entry in the actual LIVE baseline.
        self.assertTrue(checks.unchanged(Path(result['runtime']), result['runtime_inputs'], [name]))
        checks.verify_after(self.context(result))
        (Path(result['root']) / name).write_text('changed\n')
        with self.assertRaisesRegex(ValueError, 'drift'):
            checks.verify_after(self.context(result))

    def test_required_root_fixture_is_not_silently_skipped(self):
        self.options.update(fixtures=['paper/materials/absent/input.json'], live_fixtures=[])
        with self.assertRaisesRegex(ValueError, 'required fixed fixture not materialized'):
            self.assemble()

    def test_materialized_fixture_must_match_the_declared_git_blob(self):
        name = 'paper/materials/issue29-brain-speed/results.jsonl'
        self.candidate_fixture(name)
        self.options.update(fixtures=[name], live_fixtures=[])
        original_git = checks.git

        def replaced(tree, *args, **kwargs):
            result = original_git(tree, *args, **kwargs)
            if args[0] == 'read-tree' and (Path(tree) / name).is_file():
                (Path(tree) / name).write_text('wrong source\n')
            return result

        with patch.object(checks, 'git', side_effect=replaced):
            with self.assertRaisesRegex(ValueError, 'fixture differs from Git source'):
                self.assemble()

    def test_required_live_fixture_cannot_be_borrowed_from_candidate(self):
        name = 'paper/materials/issue29-brain-speed/results.jsonl'
        self.candidate_fixture(name)
        self.options.update(fixtures=[name], live_fixtures=[name])
        with self.assertRaisesRegex(ValueError, 'required fixed fixture not materialized'):
            self.assemble()

    def test_legacy_policy_keeps_both_views_required(self):
        name = 'paper/materials/issue29-brain-speed/results.jsonl'
        self.candidate_fixture(name)
        self.options['fixtures'] = [name]
        with self.assertRaisesRegex(ValueError, 'required fixed fixture not materialized'):
            self.assemble()

    def test_explicit_live_fixture_freezes_live_blob_and_detects_actual_source_drift(self):
        name = 'paper/materials/live-consumer/input.json'
        self.live_fixture(name)
        self.options['live_fixtures'] = [name]
        result = self.assemble()
        self.assertEqual(result['fixture_sources']['live'][0]['commit'], result['live_commit'])
        self.assertFalse((Path(result['root']) / name).exists())
        self.assertEqual((Path(result['runtime']) / name).read_text(), 'fixed LIVE fixture\n')
        checks.verify_after(self.context(result))
        (self.live / name).write_text('dirty fixture\n')
        with self.assertRaisesRegex(ValueError, 'drift: live'):
            checks.verify_after(self.context(result))

    def test_dirty_live_fixture_is_not_accepted_as_the_committed_fixture(self):
        name = 'paper/materials/live-consumer/input.json'
        self.live_fixture(name)
        (self.live / name).write_text('dirty fixture\n')
        self.options['live_fixtures'] = [name]
        with self.assertRaisesRegex(ValueError, 'LIVE fixture differs from Git source'):
            self.assemble()

    def test_live_fixture_accepts_checkout_permissions_and_freezes_actual_mode(self):
        name = 'paper/materials/live-consumer/input.json'
        self.live_fixture(name)
        source = self.live / name
        source.chmod(0o664)
        self.options['live_fixtures'] = [name]
        result = self.assemble()
        self.assertEqual((Path(result['runtime']) / name).stat().st_mode & 0o777, 0o664)
        checks.verify_after(self.context(result))
        source.chmod(0o644)
        with self.assertRaisesRegex(ValueError, 'drift: live'):
            checks.verify_after(self.context(result))

    def test_live_fixture_executable_change_is_not_a_checkout_permission(self):
        name = 'paper/materials/live-consumer/input.json'
        self.live_fixture(name)
        (self.live / name).chmod(0o755)
        self.options['live_fixtures'] = [name]
        with self.assertRaisesRegex(ValueError, 'LIVE fixture differs from Git source'):
            self.assemble()

    def test_fixture_scopes_reject_invalid_and_credential_paths(self):
        for names in (None, ['same', 'same'], [1], ['/absolute'], ['../escape'], ['.env']):
            with self.subTest(names=names), self.assertRaises(ValueError):
                checks.fixture_scopes(self.root, dict(fixtures=[], live_fixtures=names))

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
