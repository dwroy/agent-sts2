"""Candidate-to-ROOT/LIVE mapping and input drift use tiny, real Git worktrees."""
import json
import importlib.util
import os
from pathlib import Path
import shutil
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

    def refresh_contract(self, name='knowledge/characters/silent/fixture.json', script=None):
        script = script or (
            "import json,pathlib; p=pathlib.Path.cwd().parent / " + repr(name) + "; "
            "assert json.loads(p.read_text())['fixed'].startswith('refreshed'); print('new bytes consumed')")
        self.options['natural_refresh'] = dict(schema='sts2-natural-refresh-v1',
            paths=[dict(pattern=name, checks=['actual-reader'])],
            checks={'actual-reader': dict(kind='consumer', argv=['python3', '-c', script], timeout=5),
                    'unaffected': dict(kind='consumer', argv=['python3', '-c', 'raise SystemExit(19)'], timeout=5)})

    def refreshed(self, name='knowledge/characters/silent/fixture.json', value='refreshed'):
        (self.live / name).write_text(json.dumps(dict(fixed=value)) + '\n')

    def test_disjoint_refresh_rechecks_new_data_without_mutating_old_views_or_full(self):
        name = 'knowledge/characters/silent/fixture.json'
        self.refresh_contract()
        assembly = self.assemble()
        original = json.dumps(assembly, sort_keys=True)
        context = {**self.context(assembly), 'checks': {'full': 'passed'}, 'full_runs': 1}
        self.refreshed()
        checks.verify_after(context)
        self.assertEqual(json.dumps(assembly, sort_keys=True), original)
        self.assertEqual(context['checks'], {'full': 'passed'})
        self.assertEqual(context['full_runs'], 1)
        accepted = context['refresh_accepted']
        self.assertEqual(json.loads((Path(accepted['view']) / name).read_text())['fixed'], 'refreshed')
        self.assertEqual(json.loads((Path(assembly['runtime']) / name).read_text())['fixed'], 'baseline')
        event = json.loads(Path(accepted['evidence']).read_text())
        self.assertEqual(event['state'], 'passed')
        self.assertEqual(event['gate_result'], 'accepted')
        self.assertEqual(event['full_runs'], 0)
        self.assertEqual([row['id'] for row in event['checks']], ['actual-reader'])
        self.assertEqual(event['checks'][0]['exit_code'], 0)
        self.assertNotEqual(event['differences'][0]['before'], event['differences'][0]['after'])
        self.assertEqual(self.git('rev-parse', 'main'), self.baseline)
        checks.verify_after(context)
        reused = json.loads(Path(context['refresh_revalidations'][-1]).read_text())
        self.assertEqual(reused['state'], 'reused')
        self.assertEqual(reused['checks'], [])

    def test_refresh_intersecting_any_candidate_target_is_rejected(self):
        name = 'knowledge/characters/silent/fixture.json'
        self.refresh_contract()
        self.candidate_fixture(name, '{"fixed":"candidate"}\n')
        self.options['root_only_prefixes'].append('knowledge/')
        context = self.context(self.assemble())
        self.refreshed()
        with self.assertRaisesRegex(ValueError, 'intersects candidate target'):
            checks.verify_after(context)
        event = json.loads(Path(context['refresh_revalidations'][-1]).read_text())
        self.assertEqual(event['state'], 'rejected')
        self.assertEqual(event['checks'], [])

    def test_live_source_drift_remains_strict_with_refresh_enabled(self):
        self.refresh_contract()
        context = self.context(self.assemble())
        (self.live / 'agent/package.json').write_text('{"source":"changed"}\n')
        with self.assertRaisesRegex(ValueError, 'undeclared.*affected set unknown'):
            checks.verify_after(context)

    def test_declared_refresh_does_not_relax_fixture_freeze(self):
        name = 'knowledge/common/fixture.json'
        self.live_fixture(name)
        self.options['live_fixtures'] = [name]
        self.refresh_contract(name)
        context = self.context(self.assemble())
        self.refreshed(name)
        with self.assertRaisesRegex(ValueError, 'strict LIVE fixture'):
            checks.verify_after(context)

    def test_unknown_refresh_mapping_is_rejected_with_reason(self):
        context = self.context(self.assemble())
        self.refreshed()
        with self.assertRaisesRegex(ValueError, 'affected set unknown'):
            checks.verify_after(context)
        event = json.loads(Path(context['refresh_revalidations'][-1]).read_text())
        self.assertIn('affected set unknown', event['reason'])

    def test_failed_supplemental_reader_does_not_accept_refresh(self):
        self.refresh_contract(script='raise SystemExit(7)')
        context = self.context(self.assemble())
        self.refreshed()
        with self.assertRaisesRegex(ValueError, 'revalidation failed'):
            checks.verify_after(context)
        event = json.loads(Path(context['refresh_revalidations'][-1]).read_text())
        self.assertEqual(event['checks'][0]['exit_code'], 7)
        self.assertEqual(event['state'], 'rejected')
        self.assertNotIn('refresh_accepted', context)

    def test_refresh_changed_again_during_recheck_is_rejected(self):
        target = self.live / 'knowledge/characters/silent/fixture.json'
        self.refresh_contract(script='from pathlib import Path; Path(' + repr(str(target)) + ').write_text("changed again")')
        context = self.context(self.assemble())
        self.refreshed()
        with self.assertRaisesRegex(ValueError, 'changed again'):
            checks.verify_after(context)
        self.assertNotIn('refresh_accepted', context)

    def test_second_refresh_creates_new_evidence_not_a_second_full(self):
        self.refresh_contract()
        context = self.context(self.assemble())
        self.refreshed()
        checks.verify_after(context)
        first = context['refresh_accepted']['evidence']
        self.refreshed(value='refreshed-again')
        checks.verify_after(context)
        self.assertNotEqual(context['refresh_accepted']['evidence'], first)
        self.assertEqual(json.loads(Path(first).read_text())['state'], 'passed')

    def test_live_index_drift_is_not_a_natural_refresh(self):
        self.refresh_contract()
        context = self.context(self.assemble())
        self.refreshed()
        checks.git(self.live, 'add', 'knowledge')
        with self.assertRaisesRegex(ValueError, 'metadata changed'):
            checks.verify_after(context)

    def test_refresh_policy_rejects_unknown_checks_or_implicit_full(self):
        self.refresh_contract()
        contract = self.options['natural_refresh']
        contract['paths'][0]['checks'] = ['unknown']
        with self.assertRaisesRegex(ValueError, 'affected set'):
            self.assemble()
        contract['paths'][0]['checks'] = ['actual-reader']
        contract['checks']['actual-reader'] = dict(kind='vitest', files=[], timeout=5)
        with self.assertRaisesRegex(ValueError, 'explicit affected test'):
            self.assemble()

    def test_actual_refresh_consumer_reads_fixed_data_and_rejects_invalid_new_json(self):
        project = Path(__file__).resolve().parents[2]
        view = self.root / 'consumer-fixture'
        shutil.copytree(project / 'agent/tests/gkb-data/knowledge', view / 'knowledge')
        (view / 'agent').mkdir()
        (view / 'agent/src').symlink_to(project / 'agent/src', target_is_directory=True)
        (view / 'agent/node_modules').symlink_to(project / 'agent/node_modules', target_is_directory=True)
        name = 'knowledge/characters/ironclad/room-costs.json'
        manifest = self.root / 'changes.json'
        program = project / 'ops/board_refresh_readers.mjs'
        def run():
            manifest.write_text(json.dumps([dict(path=name, after=dict(sha256=checks.sha((view / name).read_bytes())))]))
            return subprocess.run(['node', '--import', 'tsx', str(program), str(view), str(manifest)],
                                  cwd=view / 'agent', text=True, capture_output=True, timeout=30)
        result = run()
        self.assertEqual(result.returncode, 0, result.stderr)
        consumed = json.loads(result.stdout)['consumed']
        self.assertEqual(consumed[0]['path'], name)
        self.assertEqual(consumed[0]['reader'], 'queryKnowledgeCatalog')
        (view / name).write_text('{invalid new data')
        result = run()
        self.assertNotEqual(result.returncode, 0)

    def test_recheck_cannot_mutate_original_views_or_dependencies(self):
        dependency = self.root / 'agent/node_modules/pinned/index.js'
        self.refresh_contract(script='from pathlib import Path; Path(' + repr(str(dependency)) + ').write_text("modified")')
        context = self.context(self.assemble())
        self.refreshed()
        with self.assertRaisesRegex(ValueError, 'dependency'):
            checks.verify_after(context)
        self.assertNotIn('refresh_accepted', context)
        event = json.loads(Path(context['refresh_revalidations'][-1]).read_text())
        self.assertEqual(event['state'], 'passed')
        self.assertEqual(event['gate_result'], 'rejected')

    def test_declared_data_mode_change_is_still_strict(self):
        self.refresh_contract()
        context = self.context(self.assemble())
        self.refreshed()
        (self.live / 'knowledge/characters/silent/fixture.json').chmod(0o755)
        with self.assertRaisesRegex(ValueError, 'identity/mode'):
            checks.verify_after(context)

    def test_later_publication_can_load_checker_without_registering_sys_modules(self):
        self.refresh_contract()
        context = self.context(self.assemble())
        self.refreshed()
        path = Path(checks.__file__)
        spec = importlib.util.spec_from_file_location('publication_checker_fixture', path)
        checker = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(checker)
        self.assertNotIn('publication_checker_fixture', sys.modules)
        checker.verify_after(context)
        self.assertIn('refresh_accepted', context)

    def test_tampered_accepted_view_cannot_reuse_old_supplemental_result(self):
        self.refresh_contract()
        context = self.context(self.assemble())
        self.refreshed()
        checks.verify_after(context)
        view = Path(context['refresh_accepted']['view'])
        (view / 'knowledge/characters/silent/fixture.json').write_text('tampered')
        with self.assertRaisesRegex(ValueError, 'accepted refresh validation view changed'):
            checks.verify_after(context)

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
