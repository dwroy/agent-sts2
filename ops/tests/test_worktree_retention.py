import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
import worktree_retention as resource
import worktree_checkout as checkout


class WorkspaceRetention(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.directory = self.root / 'ops/codex-ops'
        self.directory.mkdir(parents=True)
        self.git('init', '-b', 'main')
        (self.root / '.gitignore').write_text('.worktrees/\nops/codex-ops/\nlearner/runs/\nlogs/\nagent/node_modules\n**/__pycache__/\n')
        (self.root / 'README.md').write_text('fixed committed source\n')
        history = self.root / 'paper/data/history/old.csv'
        history.parent.mkdir(parents=True)
        history.write_text('derived historical data, canonical copy remains\n')
        (self.root / 'agent/src').mkdir(parents=True)
        (self.root / 'agent/src/example.ts').write_text('export const fixed = 1;\n')
        (self.root / 'ops/fixture.py').write_text('fixed = 1\n')
        self.git('add', '.')
        self.git('commit', '-m', 'fixed source')
        self.head = self.git('rev-parse', 'HEAD').strip()
        self.live = self.root / '.worktrees/live'
        self.git('worktree', 'add', '-b', 'live', str(self.live))
        self.tree = self.root / '.worktrees/ops-fixture'
        self.git('worktree', 'add', '-b', self.tree.name, str(self.tree))
        os.utime(self.tree / '.git', (time.time() - 7200,) * 2)
        self.scratch = self.tree / 'learner/runs/fixed-result'
        self.scratch.mkdir(parents=True)
        self.raw = b'fixed original event and token accounting\n' * 7000
        (self.scratch / 'original.jsonl').write_bytes(self.raw)
        (self.scratch / 'report.json').write_text('{"scope": "fixed"}\n')
        self.cache = self.tree / 'ops/__pycache__/fixture.cpython-314.pyc'
        self.cache.parent.mkdir(parents=True)
        self.cache.write_bytes(b'rebuildable bytecode')
        (self.root / 'agent/node_modules').mkdir()
        (self.tree / 'agent/node_modules').symlink_to(self.root / 'agent/node_modules', target_is_directory=True)
        resource.retention.atomic(self.directory / 'learn.json', {'batches': {}})

    def git(self, *args, tree=None):
        r = subprocess.run(['git', '-C', str(tree or self.root), *args], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        return r.stdout

    def reclaim(self, apply=True):
        return resource.reclaim(self.root, self.directory, self.tree.name, apply)

    def test_retirement_keeps_sources_original_events_and_restores_workspace(self):
        self.assertEqual(self.reclaim(False)['state'], 'eligible')
        self.assertTrue((self.tree / '.git').exists())
        self.assertEqual(self.reclaim()['state'], 'reclaimed')
        self.assertFalse((self.tree / '.git').exists())
        self.assertEqual((self.scratch / 'original.jsonl').read_bytes(), self.raw)
        self.assertFalse(self.cache.exists())
        self.assertEqual(self.git('rev-parse', self.tree.name).strip(), self.head)
        self.assertTrue((self.root / 'agent/node_modules').is_dir())
        self.assertEqual(resource.restore(self.root, self.directory, self.tree.name)['state'], 'restored')
        self.assertTrue((self.tree / '.git').exists())
        self.assertEqual((self.scratch / 'original.jsonl').read_bytes(), self.raw)
        self.assertTrue((self.tree / 'agent/node_modules').is_symlink())

    def test_unpublished_dirty_or_protected_workspaces_are_retained(self):
        (self.tree / 'README.md').write_text('dirty change')
        with self.assertRaisesRegex(ValueError, 'dirty'):
            self.reclaim()
        self.git('add', 'README.md', tree=self.tree)
        self.git('commit', '-m', 'unpublished code', tree=self.tree)
        with self.assertRaisesRegex(ValueError, 'unpublished'):
            self.reclaim()
        for name in ('live', 'exp', 'regent-climb'):
            with self.assertRaisesRegex(ValueError, 'protected'):
                resource.reclaim(self.root, self.directory, name)

    def test_live_or_pending_request_reference_is_retained(self):
        with patch.object(resource, 'active', return_value=True):
            with self.assertRaisesRegex(ValueError, 'active'):
                self.reclaim()
        folder = self.root / 'notes/learning-requests'
        folder.mkdir(parents=True)
        resource.retention.atomic(folder / 'original.json', {'state': 'pending', 'input': str(self.scratch / 'report.json')})
        with self.assertRaisesRegex(ValueError, 'original request'):
            self.reclaim()

    def test_unknown_symlink_and_key_named_path_are_not_read(self):
        link = self.scratch / 'foreign.json'
        link.symlink_to(self.root / 'README.md')
        with self.assertRaisesRegex(ValueError, 'unknown workspace symlink'):
            self.reclaim()
        link.unlink()
        (self.scratch / '.env').write_text('opaque fixture sentinel')
        with patch.object(resource.retention, 'sha_file', side_effect=AssertionError('must not read credentials')):
            with self.assertRaisesRegex(ValueError, 'credential-named'):
                self.reclaim()

    def test_explicit_acceptance_handles_leaf_integration_without_source_ancestry(self):
        tree = self.root / '.worktrees/developer-feature'
        self.git('worktree', 'add', '-b', tree.name, str(tree))
        (tree / 'agent/src/example.ts').write_text('export const fixed = 2;\n')
        self.git('add', '.', tree=tree)
        self.git('commit', '-m', 'feature source', tree=tree)
        source = self.git('rev-parse', 'HEAD', tree=tree).strip()
        with self.assertRaisesRegex(ValueError, 'explicit workspace acceptance'):
            resource.reclaim(self.root, self.directory, tree.name)
        for target in (self.root, self.live):
            (target / 'agent/src/example.ts').write_text('export const fixed = 2;\n')
            self.git('add', 'agent/src/example.ts', tree=target)
            self.git('commit', '-m', 'leaf integration', tree=target)
        accepted = resource.complete(self.root, self.directory, tree.name, source,
                                     self.git('rev-parse', 'HEAD').strip(), self.git('rev-parse', 'HEAD', tree=self.live).strip())
        self.assertEqual(accepted['acceptance']['verified_source_paths'], ['agent/src/example.ts'])
        self.assertEqual(resource.reclaim(self.root, self.directory, tree.name, True)['state'], 'reclaimed')

    def test_bad_publication_cannot_mark_workspace_complete(self):
        (self.tree / 'agent/src/example.ts').write_text('export const fixed = 3;\n')
        self.git('add', '.', tree=self.tree)
        self.git('commit', '-m', 'unpublished source', tree=self.tree)
        source = self.git('rev-parse', 'HEAD', tree=self.tree).strip()
        with self.assertRaisesRegex(ValueError, 'not in recorded publication'):
            resource.complete(self.root, self.directory, self.tree.name, source, self.head, self.head)

    def test_retry_reuses_verified_archive_after_removal_failure(self):
        original = resource.git
        def fail_remove(root, *args):
            if args[:2] == ('worktree', 'remove'):
                raise ValueError('fixed injected removal failure')
            return original(root, *args)
        with patch.object(resource, 'git', side_effect=fail_remove):
            with self.assertRaisesRegex(ValueError, 'injected'):
                self.reclaim()
        manifest_path = self.directory / 'retention/worktree-archives/ops-fixture.manifest.json'
        before = resource.retention.load(manifest_path)
        self.assertEqual(self.reclaim()['state'], 'reclaimed')
        after = resource.retention.load(manifest_path)
        self.assertEqual(after['archive_sha256'], before['archive_sha256'])

    def test_restart_recovers_evidence_projection_after_checkout_was_removed(self):
        original = resource.os.replace
        def fail_projection(src, dest):
            if 'workspace-ops-fixture' in str(src) and str(dest).startswith(str(self.tree)):
                raise OSError('fixed injected projection failure')
            return original(src, dest)
        with patch.object(resource.os, 'replace', side_effect=fail_projection):
            with self.assertRaisesRegex(OSError, 'projection'):
                self.reclaim()
        self.assertFalse((self.tree / '.git').exists())
        result = resource.sweep(self.root, self.directory, True, 1)
        self.assertTrue(result['results'][0]['recovered_after_checkout_removal'])
        self.assertEqual((self.scratch / 'original.jsonl').read_bytes(), self.raw)

    def test_restore_rejects_changed_or_unknown_retained_evidence(self):
        self.reclaim()
        (self.scratch / 'new-user-file.md').write_text('must be preserved')
        with self.assertRaisesRegex(ValueError, 'unknown existing projection'):
            resource.restore(self.root, self.directory, self.tree.name)
        self.assertEqual((self.scratch / 'new-user-file.md').read_text(), 'must be preserved')

    def test_sparse_allocation_avoids_history_copies_and_pins_pending_owner(self):
        new = self.root / '.worktrees/ops-new-owner'
        record = checkout.create(self.root, self.directory, new, 'main')
        self.assertEqual(record['state'], 'allocated')
        self.assertFalse((new / 'paper/data/history/old.csv').exists())
        self.assertTrue((self.root / 'paper/data/history/old.csv').exists())
        self.assertEqual(self.git('status', '--porcelain', tree=new), '')
        with self.assertRaisesRegex(ValueError, 'explicit completion acceptance'):
            resource.reclaim(self.root, self.directory, new.name)

    def test_failed_initial_allocation_is_reclaimed_without_model_start(self):
        new = self.root / '.worktrees/ops-failed-allocation'
        original = checkout.retention.git
        def fail_checkout(root, *args):
            if args[0] == 'read-tree':
                raise ValueError('fixed checkout failure')
            return original(root, *args)
        with patch.object(checkout.retention, 'git', side_effect=fail_checkout):
            with self.assertRaisesRegex(ValueError, 'checkout failure'):
                checkout.create(self.root, self.directory, new, 'main')
        receipt = resource.retention.load(self.directory / 'retention/allocations/ops-failed-allocation.json')
        self.assertTrue(receipt['failed_checkout_reclaimed'])
        self.assertFalse((new / '.git').exists())

    def test_capacity_failure_leaves_no_checkout_or_allocation_receipt(self):
        new = self.root / '.worktrees/ops-no-capacity'
        with patch.object(checkout, 'require_worktree_capacity', side_effect=OSError('fixed capacity refusal')), \
                patch.object(checkout.retention, 'git', side_effect=AssertionError('no git after refusal')):
            with self.assertRaisesRegex(OSError, 'capacity'):
                checkout.create(self.root, self.directory, new, 'main')
        self.assertFalse(new.exists())
        self.assertFalse((self.directory / 'retention/allocations/ops-no-capacity.json').exists())

    def test_invalid_dependency_manifest_is_rejected_before_restore_mutates_workspace(self):
        self.reclaim()
        path = self.directory / 'retention/worktree-archives/ops-fixture.manifest.json'
        manifest = resource.retention.load(path)
        manifest['proof']['links'][0]['target'] = '/unknown/external-resource'
        resource.retention.atomic(path, manifest)
        with patch.object(resource, 'git', side_effect=AssertionError('must validate before git')):
            with self.assertRaisesRegex(ValueError, 'unsafe restored dependency'):
                resource.restore(self.root, self.directory, self.tree.name)
        self.assertFalse((self.tree / '.git').exists())
        self.assertEqual((self.scratch / 'original.jsonl').read_bytes(), self.raw)

    def test_sandbox_process_view_cannot_authorize_production_cleanup(self):
        with patch.object(Path, 'read_text', return_value='codex\n'):
            with self.assertRaisesRegex(ValueError, 'host process visibility'):
                resource.retention.require_host_process_view()
        with patch.object(Path, 'read_text', return_value='systemd\n'):
            resource.retention.require_host_process_view()

    def test_report_only_learner_keeps_all_pending_process_files_at_original_paths(self):
        tree = self.root / '.worktrees/codex-strategy-silent-20260101-000001'
        self.git('worktree', 'move', str(self.tree), str(tree))
        scratch = tree / 'learner/runs/20260101-000001-strategy-proposal'
        (tree / 'learner/runs/fixed-result').rename(scratch)
        raw = b'fixed pending simulation data\n' * 9000
        (scratch / 'unresolved.bin').write_bytes(raw)
        batch = '20260101-000001-strategy-proposal'
        resource.retention.atomic(self.directory / 'learn.json', {'batches': {batch: {
            'task': 'strategy-proposal', 'character': 'silent', 'state': 'done', 'rc': 0, 'worktree': str(tree)}}})
        out = self.directory / 'learner' / (batch + '.out')
        out.parent.mkdir()
        out.write_text(json.dumps({'task': 'strategy-proposal', 'fixes': [], 'merged': None,
                                  'report': str(scratch / 'report.json')}))
        with patch.object(resource.retention, 'kick', return_value={'state': 'fixture'}):
            resource.retention.request_cleanup(self.root, self.directory, batch)
        self.assertEqual(resource.reclaim(self.root, self.directory, tree.name, True)['state'], 'reclaimed')
        self.assertEqual((scratch / 'unresolved.bin').read_bytes(), raw)
        receipt = self.directory / 'retention/requests' / (batch + '.json')
        self.assertEqual(resource.retention.load(receipt)['state'], 'checkout_reclaimed')
        resource.retention.sweep(self.root, self.directory, True, 4)
        self.assertEqual(resource.retention.load(receipt)['state'], 'checkout_reclaimed')


if __name__ == '__main__':
    unittest.main()
