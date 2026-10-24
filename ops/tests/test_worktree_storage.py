import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
import worktree_storage as storage


class Storage(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.directory = self.root / 'ops/codex-ops'
        self.directory.mkdir(parents=True)
        self.git('init', '-b', 'main')
        files = {'.gitignore': '.worktrees/\nops/codex-ops/\nlearner/runs/\n',
                 'agent/src/fixed.ts': 'export const fixed = 1;\n',
                 'knowledge/common/fixed.json': '{}\n',
                 'paper/materials/STATE-fixed.md': 'current state\n',
                 'paper/materials/decision-log.md': 'original decisions\n',
                 'paper/materials/learning/fixed.jsonl': '{"evidence":"original"}\n',
                 'paper/materials/old/a.json': '{"fixed":1}\n',
                 'paper/materials/old/b.json': '{"fixed":2}\n',
                 'paper/data/history/old.csv': 'fixed history\n',
                 'experiments/old/evidence.json': '{"role":"fixed"}\n'}
        for name, content in files.items():
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
        self.git('add', '.')
        self.git('commit', '-m', 'fixed storage baseline')
        self.head = self.git('rev-parse', 'HEAD').strip()
        self.tree = self.root / '.worktrees/codex-strategy-fixed'
        self.git('worktree', 'add', '-b', self.tree.name, str(self.tree))
        self.batch_id = '20260101-000001-strategy-proposal'
        self.scratch = self.tree / 'learner/runs/20260101-000002-strategy-proposal'
        self.scratch.mkdir(parents=True)
        self.batch = {'state': 'failed', 'task': 'strategy-proposal', 'worktree': str(self.tree),
                      'report': {'report': str(self.scratch / 'report.md')}}
        self.state = {'batches': {self.batch_id: self.batch}}
        storage.retention.atomic(self.directory / 'learn.json', self.state)
        self.event = self.scratch.with_suffix('.jsonl')
        self.event.write_text(json.dumps({'type': 'learner_launch', 'cwd': str(self.tree),
            'task': 'strategy-proposal', 'params': {'scratch': str(self.scratch)}}) + '\n')
        (self.scratch / 'report.md').write_text('unfinished original report\n')
        (self.scratch / 'original.jsonl').write_text('immutable source events\n')
        self.addCleanup(patch.stopall)
        patch.object(storage.retention, 'require_host_process_view').start()
        patch.object(storage.workspaces, 'active', return_value=False).start()

    def git(self, *args, tree=None):
        result = subprocess.run(['git', '-C', str(tree or self.root), *args], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def thin(self):
        return storage.thin(self.root, self.directory, self.tree)

    def copies(self):
        path = self.scratch / '.source-checkout/agent/src/fixed.ts'
        path.parent.mkdir(parents=True)
        path.write_bytes(b'fixed source copy\n' * 100)
        (self.scratch / 'source-archive.tar').write_bytes(b'fixed opaque archive\n' * 200)
        return path

    def compress(self):
        return storage.compress(self.root, self.directory, self.batch_id, self.scratch)

    def test_thin_keeps_code_knowledge_handoff_ledger_and_failed_state(self):
        before = (self.directory / 'learn.json').read_bytes()
        result = self.thin()
        self.assertGreater(result['removed_git_cache_files'], 0)
        for name in ('agent/src/fixed.ts', 'knowledge/common/fixed.json', 'paper/materials/STATE-fixed.md',
                     'paper/materials/decision-log.md', 'paper/materials/learning/fixed.jsonl'):
            self.assertTrue((self.tree / name).is_file(), name)
        self.assertFalse((self.tree / 'paper/materials/old/a.json').exists())
        self.assertEqual((self.directory / 'learn.json').read_bytes(), before)
        self.assertEqual(self.git('rev-parse', 'HEAD', tree=self.tree).strip(), self.head)
        self.assertEqual(self.git('status', '--porcelain', tree=self.tree), '')
        self.assertEqual(self.thin()['state'], 'already_thin')

    def test_dirty_staged_and_untracked_materials_and_logs_survive(self):
        a = self.tree / 'paper/materials/old/a.json'
        a.write_text('staged evidence\n')
        self.git('add', str(a), tree=self.tree)
        a.write_text('working evidence\n')
        unique = self.tree / 'paper/materials/old/unique.json'
        unique.write_text('unique evidence\n')
        before = storage.status(self.tree)
        self.thin()
        self.assertEqual(storage.status(self.tree), before)
        self.assertEqual(a.read_text(), 'working evidence\n')
        self.assertEqual(unique.read_text(), 'unique evidence\n')
        self.assertEqual((self.scratch / 'original.jsonl').read_text(), 'immutable source events\n')

    def test_positive_restore_preserves_previous_inputs_and_blob(self):
        self.thin()
        for name in ('paper/materials/old/a.json', 'paper/materials/old/b.json', 'experiments/old/evidence.json'):
            result = storage.materialize(self.root, self.directory, self.tree, [name])
            self.assertEqual(result['head'], self.head)
            self.assertEqual(self.git('hash-object', name, tree=self.tree).strip(), result['inputs'][0]['blob'])
        self.assertTrue((self.tree / 'paper/materials/old/a.json').is_file())
        self.assertTrue((self.tree / 'paper/materials/old/b.json').is_file())
        self.assertEqual(storage.status(self.tree), b'')

    def test_bad_or_untracked_input_path_does_not_change_profile(self):
        self.thin()
        before = storage.profile(self.tree).read_bytes()
        for name in ('../outside', 'paper/materials/*', 'paper/materials/no-file.json', 'agent/src/fixed.ts',
                     'paper/materials/old/../../outside', 'paper/materials/.env'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                storage.materialize(self.root, self.directory, self.tree, [name])
        self.assertEqual(storage.profile(self.tree).read_bytes(), before)

    def test_running_process_batch_and_persistent_instance_are_retained(self):
        with patch.object(storage.workspaces, 'active', return_value=True), self.assertRaisesRegex(ValueError, 'active'):
            self.thin()
        self.batch['state'] = 'running'
        storage.retention.atomic(self.directory / 'learn.json', self.state)
        with self.assertRaisesRegex(ValueError, 'running'):
            self.thin()
        self.batch['state'] = 'failed'
        storage.retention.atomic(self.directory / 'learn.json', self.state)
        marker = self.tree / 'ops/instance-binding.json'
        marker.parent.mkdir(exist_ok=True)
        marker.write_text('{}')
        with self.assertRaisesRegex(ValueError, 'persistent'):
            self.thin()

    def test_cache_budget_is_checked_before_restore(self):
        self.thin()
        before = storage.profile(self.tree).read_bytes()
        with patch.object(storage, 'MAX_INPUT_BYTES', 1), self.assertRaisesRegex(ValueError, '256 MiB'):
            storage.materialize(self.root, self.directory, self.tree, ['paper/materials/old/a.json'])
        self.assertEqual(storage.profile(self.tree).read_bytes(), before)

    def test_unmanaged_sparse_profile_is_not_replaced_on_read(self):
        self.thin()
        storage.profile(self.tree).write_text('/*\n!/experiments/*\n')
        with self.assertRaisesRegex(ValueError, 'unmanaged'):
            storage.materialize(self.root, self.directory, self.tree, ['paper/materials/old/a.json'])

    def test_compress_restore_preserves_all_originals_and_failed_task(self):
        source = self.copies()
        contents = source.read_bytes()
        state = (self.directory / 'learn.json').read_bytes()
        event = self.event.read_bytes()
        result = self.compress()
        self.assertEqual(result['state'], 'source_copies_compressed')
        self.assertFalse(source.exists())
        self.assertFalse((self.scratch / 'source-archive.tar').exists())
        self.assertTrue((self.scratch / 'report.md').exists())
        self.assertTrue((self.scratch / 'original.jsonl').exists())
        storage.restore_copies(self.root, self.directory, self.batch_id)
        self.assertEqual(source.read_bytes(), contents)
        self.assertEqual((self.directory / 'learn.json').read_bytes(), state)
        self.assertEqual(self.event.read_bytes(), event)

    def test_archive_tamper_and_changed_copy_never_delete_or_overwrite(self):
        source = self.copies()
        self.compress()
        storage.restore_copies(self.root, self.directory, self.batch_id)
        source.write_bytes(b'new unique research')
        with self.assertRaisesRegex(ValueError, 'changed'):
            self.compress()
        with self.assertRaisesRegex(ValueError, 'changed'):
            storage.restore_copies(self.root, self.directory, self.batch_id)
        self.assertEqual(source.read_bytes(), b'new unique research')
        manifest = storage.retention.load(self.directory / 'retention/storage/source-copies' / (self.batch_id + '.manifest.json'))
        (self.root / manifest['archive']).write_bytes(b'tampered archive')
        with self.assertRaisesRegex(ValueError, 'hash changed'):
            storage.restore_copies(self.root, self.directory, self.batch_id)

    def test_unbound_scratch_secret_and_symlink_are_retained(self):
        source = self.copies()
        self.batch['report']['report'] = str(self.scratch / 'other.md')
        storage.retention.atomic(self.directory / 'learn.json', self.state)
        with self.assertRaisesRegex(ValueError, 'binding'):
            self.compress()
        self.batch['report']['report'] = str(self.scratch / 'report.md')
        storage.retention.atomic(self.directory / 'learn.json', self.state)
        secret = self.scratch / '.source-checkout/.env'
        secret.write_text('fixed test secret placeholder')
        with self.assertRaisesRegex(ValueError, 'credential'):
            self.compress()
        secret.unlink()
        link = self.scratch / '.source-checkout/link'
        link.symlink_to(self.root)
        with self.assertRaisesRegex(ValueError, 'symlink'):
            self.compress()
        self.assertTrue(source.exists())

    def test_original_output_can_bind_missing_batch_report_without_finishing_task(self):
        source=self.copies(); self.batch.pop('report')
        storage.retention.atomic(self.directory/'learn.json',self.state)
        output=self.directory/'learner'/ (self.batch_id+'.out'); output.parent.mkdir()
        output.write_text('```json\n'+json.dumps(dict(task='strategy-proposal',report=str(self.scratch/'report.md')))+'\n```\n')
        before=(self.directory/'learn.json').read_bytes()
        self.assertEqual(self.compress()['state'],'source_copies_compressed')
        self.assertFalse(source.exists()); self.assertEqual(before,(self.directory/'learn.json').read_bytes())
        self.assertTrue((self.scratch/'report.md').exists()); self.assertTrue(self.event.exists())

    def test_output_report_cannot_override_wrong_launcher_binding(self):
        self.copies(); self.batch.pop('report')
        storage.retention.atomic(self.directory/'learn.json',self.state)
        output=self.directory/'learner'/(self.batch_id+'.out'); output.parent.mkdir()
        output.write_text('```json\n'+json.dumps(dict(task='strategy-proposal',report=str(self.scratch/'report.md')))+'\n```\n')
        value=json.loads(self.event.read_text()); value['cwd']=str(self.root)
        self.event.write_text(json.dumps(value)+'\n')
        with self.assertRaisesRegex(ValueError,'binding'):
            self.compress()
        self.assertTrue((self.scratch/'.source-checkout').exists())

    def test_interrupted_removal_reuses_verified_archive(self):
        source = self.copies()
        unlink = Path.unlink
        def interrupted(path, *args, **kwargs):
            if path == self.scratch / 'source-archive.tar':
                raise OSError('fixed interruption')
            return unlink(path, *args, **kwargs)
        with patch.object(Path, 'unlink', interrupted), self.assertRaisesRegex(OSError, 'interruption'):
            self.compress()
        self.assertEqual(self.compress()['state'], 'source_copies_compressed')
        storage.restore_copies(self.root, self.directory, self.batch_id)
        self.assertTrue(source.exists())

    def test_capacity_failure_preserves_archive_and_missing_originals(self):
        source = self.copies()
        self.compress()
        with patch('disk_capacity.require_capacity', side_effect=OSError('fixed no capacity')), self.assertRaisesRegex(OSError, 'capacity'):
            storage.restore_copies(self.root, self.directory, self.batch_id)
        self.assertFalse(source.exists())

    def test_new_checkout_uses_thin_profile_and_keeps_handoff(self):
        new = self.root / '.worktrees/new-fixture'
        record = storage.checkout.create(self.root, self.directory, new, 'main')
        self.assertEqual(record['base'], self.head)
        self.assertFalse((new / 'experiments/old/evidence.json').exists())
        self.assertTrue((new / 'paper/materials/STATE-fixed.md').exists())
        self.assertEqual(self.git('status', '--porcelain', tree=new), '')

    def test_retired_checkout_restoration_does_not_reinflate_history(self):
        new = self.root / '.worktrees/restored-fixture'
        storage.checkout.create(self.root, self.directory, new, 'main')
        self.git('worktree', 'remove', str(new))
        storage.checkout.restore_checkout(self.root, new, new.name)
        self.assertFalse((new / 'experiments/old/evidence.json').exists())
        self.assertTrue((new / 'paper/materials/STATE-fixed.md').is_file())
        self.assertEqual(self.git('rev-parse', 'HEAD', tree=new).strip(), self.head)
        self.assertEqual(self.git('status', '--porcelain', tree=new), '')

    def test_source_copy_local_dependency_link_is_kept_without_following(self):
        source = self.copies()
        target = self.tree / 'agent/node_modules'
        target.mkdir()
        (target / 'fixed.js').write_text('original dependency\n')
        link = self.scratch / '.source-checkout/agent/node_modules'
        link.symlink_to(target, target_is_directory=True)
        self.compress()
        self.assertTrue(link.is_symlink())
        self.assertEqual((target / 'fixed.js').read_text(), 'original dependency\n')
        storage.restore_copies(self.root, self.directory, self.batch_id)
        self.assertTrue(source.is_file())
        self.assertTrue(link.is_symlink())

    def test_hardlinked_source_copies_archive_and_restore_every_path(self):
        source = self.copies()
        other = self.scratch / '.before-checkout/agent/src/fixed.ts'
        other.parent.mkdir(parents=True)
        os.link(source, other)
        content = source.read_bytes()
        self.compress()
        self.assertFalse(source.exists())
        self.assertFalse(other.exists())
        storage.restore_copies(self.root, self.directory, self.batch_id)
        self.assertEqual(source.read_bytes(), content)
        self.assertEqual(other.read_bytes(), content)

    def test_cache_worker_shares_existing_total_action_limit(self):
        (self.root / 'ops/worktree_storage.py').write_text('# fixed installed marker\n')
        with patch.object(storage.retention, 'reclaim', side_effect=ValueError('fixed unfinished task')), \
                patch.object(storage.workspaces, 'sweep', return_value={'results': [{'state': 'eligible'}]}), \
                patch.object(storage, 'sweep') as cache:
            storage.retention.sweep(self.root, self.directory, False, 1)
        cache.assert_not_called()

    def test_allocated_feature_checks_live_leaves_even_after_main_contains_source(self):
        tree = self.root / '.worktrees/dev-allocation-fixture'
        live = self.root / '.worktrees/live'
        self.git('worktree', 'add', '-b', 'live', str(live), self.head)
        storage.checkout.create(self.root, self.directory, tree, 'main')
        (tree / 'agent/src/fixed.ts').write_text('export const fixed = 99;\n')
        self.git('add', 'agent/src/fixed.ts', tree=tree)
        self.git('commit', '-m', 'fixed feature source', tree=tree)
        source = self.git('rev-parse', 'HEAD', tree=tree).strip()
        self.git('cherry-pick', source)
        main = self.git('rev-parse', 'HEAD').strip()
        with self.assertRaisesRegex(ValueError, 'source leaf'):
            storage.workspaces.complete(self.root, self.directory, tree.name, source, main, self.head)
        self.git('cherry-pick', source, tree=live)
        publication = self.git('rev-parse', 'HEAD', tree=live).strip()
        proof = storage.workspaces.complete(self.root, self.directory, tree.name, source, main, publication)['acceptance']
        self.assertEqual(proof['base'], self.head)
        self.assertEqual(proof['verified_source_paths'], ['agent/src/fixed.ts'])
        allocation = self.directory / 'retention/allocations' / (tree.name + '.json')
        original = allocation.read_bytes()
        changed = json.loads(original);changed['base'] = source
        storage.retention.atomic(allocation, changed)
        with self.assertRaisesRegex(ValueError, 'allocation receipt changed'):
            storage.workspaces.reclaim(self.root, self.directory, tree.name, True)
        self.assertTrue((tree / '.git').is_file())
        allocation.write_bytes(original)
        self.assertEqual(storage.workspaces.reclaim(self.root, self.directory, tree.name, True)['state'], 'reclaimed')


if __name__ == '__main__':
    unittest.main()
