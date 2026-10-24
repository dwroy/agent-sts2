"""Fixed repositories only: issue #23's runtime identity and publication boundaries."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
import instance_binding_backup as backup
import worktree_retention as resource
import test_worktree_retention as fixtures


class ReclaimGates(unittest.TestCase):
    setUp = fixtures.WorkspaceRetention.setUp
    git = fixtures.WorkspaceRetention.git
    reclaim = fixtures.WorkspaceRetention.reclaim

    def publish(self, path, content):
        (self.tree / path).write_text(content)
        self.git('add', path, tree=self.tree)
        self.git('commit', '-m', 'fixed task delta', tree=self.tree)
        self.git('merge', '--ff-only', self.tree.name)
        return self.git('rev-parse', 'HEAD', tree=self.tree).strip()

    def binding(self):
        raw = json.dumps({'process_id': 12345, 'base_url': 'http://127.0.0.1:8080',
                          'native_profile_id': 1, 'scope': 'primary runtime'}) + '\n'
        (self.root / 'ops/instance-binding.json').write_text(raw)
        self.git('add', 'ops/instance-binding.json')
        self.git('commit', '-m', 'historical tracked identity')
        for tree in (self.tree, self.live):
            self.git('merge', '--ff-only', 'main', tree=tree)
        (self.directory / 'session-id').write_text('fixed-primary-session')
        self.addCleanup(patch.stopall)
        patch.object(resource.retention, 'require_host_process_view').start()
        patch.object(resource, 'active', side_effect=lambda path, **kw: path == self.root / 'ops').start()
        return raw.encode()

    def test_main_only_documentation_can_retire_preserving_all_originals(self):
        head = self.publish('README.md', 'fixed research result\n')
        proof, _ = resource.admission(self.root, self.directory, self.tree)
        self.assertFalse(proof['source_acceptance']['live_required'])
        self.assertEqual(self.reclaim()['state'], 'reclaimed')
        self.assertEqual(self.git('rev-parse', self.tree.name).strip(), head)
        self.assertEqual((self.scratch / 'original.jsonl').read_bytes(), self.raw)

    def test_main_only_executable_or_knowledge_delta_requires_live(self):
        self.publish('agent/src/example.ts', 'export const fixed = 2;\n')
        with self.assertRaisesRegex(ValueError, 'source leaf not in recorded publication'):
            self.reclaim()
        self.git('merge', '--ff-only', 'main', tree=self.live)
        self.assertEqual(self.reclaim(False)['state'], 'eligible')

    def test_unmerged_document_or_code_still_requires_acceptance(self):
        (self.tree / 'README.md').write_text('unaccepted report\n')
        self.git('add', 'README.md', tree=self.tree)
        self.git('commit', '-m', 'unaccepted source', tree=self.tree)
        with self.assertRaisesRegex(ValueError, 'unpublished in main'):
            self.reclaim()

    def test_committed_research_report_needs_main_but_claims_no_ingestion(self):
        tree = self.root / '.worktrees/codex-strategy-silent-20260101-000001'
        self.git('worktree', 'move', str(self.tree), str(tree))
        self.tree = tree
        self.git('branch', '-m', tree.name, tree=tree)
        scratch = tree / 'learner/runs/20260101-000001-strategy-proposal'
        (tree / 'learner/runs/fixed-result').rename(scratch)
        head = self.publish('README.md', 'fixed committed research report\n')
        batch = '20260101-000001-strategy-proposal'
        state = {'batches': {batch: {'task': 'strategy-proposal', 'character': 'silent', 'state': 'done',
                                    'rc': 0, 'worktree': str(tree)}}}
        resource.retention.atomic(self.directory / 'learn.json', state)
        out = self.directory / 'learner' / (batch + '.out')
        out.parent.mkdir()
        out.write_text(json.dumps({'task': 'strategy-proposal', 'commit': head, 'fixes': [], 'merged': None,
                                   'report': str(scratch / 'report.json')}))
        proof = resource.retention.admission(self.root, self.directory, state, batch)[3]
        self.assertEqual(proof['kind'], 'settled-report-only')
        self.assertFalse(proof['compact_scratch'])
        self.assertTrue(proof['no_experience_claim'])
        state['batches'][batch]['checks_pending'] = True
        with self.assertRaisesRegex(ValueError, 'unfinished verification'):
            resource.retention.admission(self.root, self.directory, state, batch)

    def test_publication_evolution_after_merge_does_not_strand_old_source(self):
        self.publish('agent/src/example.ts', 'export const fixed = 2;\n')
        self.git('merge', '--ff-only', 'main', tree=self.live)
        (self.root / 'agent/src/example.ts').write_text('export const fixed = 3;\n')
        self.git('add', 'agent/src/example.ts')
        self.git('commit', '-m', 'later published evolution')
        self.git('merge', '--ff-only', 'main', tree=self.live)
        self.assertEqual(self.reclaim(False)['state'], 'eligible')

    def test_original_allocation_does_not_charge_inherited_pending_code_to_report(self):
        (self.root / 'agent/src/example.ts').write_text('export const fixed = 3;\n')
        self.git('add', 'agent/src/example.ts')
        self.git('commit', '-m', 'separate pending code')
        self.git('merge', '--ff-only', 'main', tree=self.tree)
        base = self.git('rev-parse', 'HEAD').strip()
        self.publish('README.md', 'only this task report\n')
        with self.assertRaisesRegex(ValueError, 'not in recorded publication'):
            self.reclaim(False)
        resource.retention.atomic(self.directory / 'retention/allocations' / (self.tree.name + '.json'), {
            'schema': 'workspace-allocation-v1', 'root': str(self.root), 'worktree': str(self.tree),
            'branch': self.tree.name, 'state': 'allocated', 'base': base})
        # A published report may settle from its original allocation without charging inherited code.
        proof, _ = resource.admission(self.root, self.directory, self.tree)
        self.assertEqual(proof['source_acceptance']['base'], base)
        self.assertEqual(proof['source_acceptance']['verified_source_paths'], [])
        self.assertFalse(proof['source_acceptance']['live_required'])
        self.assertEqual(self.reclaim(False)['state'], 'eligible')
        head = self.git('rev-parse', 'HEAD', tree=self.tree).strip()
        resource.complete(self.root, self.directory, self.tree.name, head, head, self.head)
        self.assertEqual(self.reclaim(False)['state'], 'eligible')

    def test_tracked_unchanged_primary_copy_is_not_a_local_instance(self):
        self.binding()
        # These directories hold research/cache, not controller identity.
        (self.tree / 'data').mkdir()
        (self.tree / 'logs').mkdir()
        proof, _ = resource.admission(self.root, self.directory, self.tree)
        self.assertEqual(proof['instance']['kind'], 'inherited-primary-binding')
        self.assertEqual(self.reclaim(False)['state'], 'eligible')

    def test_changed_untracked_and_unknown_canonical_bindings_are_retained(self):
        raw = self.binding()
        local = self.tree / 'ops/instance-binding.json'
        value = json.loads(raw)
        value['process_id'] = 23456
        local.write_text(json.dumps(value))
        with self.assertRaisesRegex(ValueError, 'local or conflicting'):
            self.reclaim(False)
        local.write_bytes(raw)
        self.git('rm', '--cached', 'ops/instance-binding.json', tree=self.tree)
        with self.assertRaisesRegex(ValueError, 'local or conflicting'):
            self.reclaim(False)
        self.git('reset', 'HEAD', '--', 'ops/instance-binding.json', tree=self.tree)
        (self.root / 'ops/instance-binding.json').write_text(json.dumps(value))
        (self.live / 'ops/instance-binding.json').unlink()
        with self.assertRaisesRegex(ValueError, 'unknown or conflicting'):
            self.reclaim(False)

    def test_candidate_local_scope_or_controller_lease_is_retained(self):
        self.binding()
        local = self.tree / 'ops/instance-binding.json'
        value = json.loads(local.read_bytes())
        value['worktree'] = str(self.tree)
        raw = json.dumps(value)
        # Even identical tracked bytes on main cannot override explicit candidate scope.
        for tree in (self.tree, self.root):
            (tree / 'ops/instance-binding.json').write_text(raw)
            self.git('add', 'ops/instance-binding.json', tree=tree)
            self.git('commit', '-m', 'fixed explicit scope', tree=tree)
        with self.assertRaisesRegex(ValueError, 'local or conflicting'):
            self.reclaim(False)
        value.pop('worktree')
        for tree in (self.tree, self.root):
            (tree / 'ops/instance-binding.json').write_text(json.dumps(value))
            self.git('add', 'ops/instance-binding.json', tree=tree)
            self.git('commit', '-m', 'remove fixed scope', tree=tree)
        state = self.tree / 'ops/codex-ops'
        state.mkdir()
        (state / 'session-id').write_text('private controller')
        with self.assertRaisesRegex(ValueError, 'independent runtime'):
            self.reclaim(False)

    def test_missing_session_host_visibility_or_active_candidate_is_retained(self):
        self.binding()
        (self.directory / 'session-id').unlink()
        with self.assertRaisesRegex(ValueError, 'identity unknown'):
            self.reclaim(False)
        (self.directory / 'session-id').write_text('primary')
        with patch.object(resource.retention, 'require_host_process_view', side_effect=ValueError('no host visibility')):
            with self.assertRaisesRegex(ValueError, 'no host visibility'):
                self.reclaim(False)
        with patch.object(resource, 'active', return_value=True):
            with self.assertRaisesRegex(ValueError, 'active'):
                self.reclaim(False)

    def test_real_active_cwd_is_protected_without_binding(self):
        proc = subprocess.Popen(['nice', '-n', '19', sys.executable, '-c', 'import time; time.sleep(30)'], cwd=self.tree)
        try:
            with self.assertRaisesRegex(ValueError, 'active'):
                self.reclaim(False)
        finally:
            proc.terminate()
            proc.wait(timeout=5)

    def test_dirty_copy_and_regent_marker_are_retained(self):
        self.binding()
        (self.tree / 'README.md').write_text('dirty report')
        with self.assertRaisesRegex(ValueError, 'dirty'):
            self.reclaim(False)
        (self.tree / 'ops/regent-lane.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'persistent'):
            self.reclaim(False)

    def test_binding_symlink_and_malformed_identity_are_retained(self):
        self.binding()
        local = self.tree / 'ops/instance-binding.json'
        local.unlink()
        local.symlink_to(self.root / 'ops/instance-binding.json')
        with self.assertRaisesRegex(ValueError, 'symlink'):
            self.reclaim(False)
        local.unlink()
        local.write_text('{}')
        with self.assertRaisesRegex(ValueError, 'binding'):
            self.reclaim(False)

    def test_main_and_live_binding_survive_real_git_tracking_removal(self):
        raw = self.binding()
        self.git('rm', 'ops/instance-binding.json', tree=self.tree)
        with (self.tree / '.gitignore').open('a') as stream:
            stream.write('/ops/instance-binding.json\n')
        self.git('add', '.gitignore', tree=self.tree)
        self.git('commit', '-m', 'remove tracked runtime identity', tree=self.tree)
        for target in (self.root, self.live):
            backup.preserve(target, 'backup')
            backup.preserve(target, 'backup')
            self.git('merge', '--ff-only', self.tree.name, tree=target)
            self.assertFalse((target / 'ops/instance-binding.json').exists())
            with self.assertRaisesRegex(ValueError, 'missing or changed'):
                backup.preserve(target, 'verify')
            backup.preserve(target, 'restore')
            backup.preserve(target, 'verify')
            self.assertEqual((target / 'ops/instance-binding.json').read_bytes(), raw)
            self.assertEqual(self.git('status', '--porcelain', tree=target), '')

    def test_backup_never_invents_missing_binding_or_overwrites_rebind(self):
        with self.assertRaisesRegex(ValueError, 'absent binding'):
            backup.preserve(self.root, 'backup')
        self.binding()
        backup.preserve(self.root, 'backup')
        target = self.root / 'ops/instance-binding.json'
        new = json.loads(target.read_bytes())
        new['process_id'] += 1
        target.write_text(json.dumps(new))
        for command in ('backup', 'restore', 'verify'):
            with self.assertRaises(ValueError):
                backup.preserve(self.root, command)
            self.assertEqual(json.loads(target.read_bytes()), new)

    def test_original_worker_continues_in_bounded_ticks(self):
        names = []
        for index in range(6):
            tree = self.root / '.worktrees' / ('ops-fixed-' + str(index))
            self.git('worktree', 'add', '-b', tree.name, str(tree))
            os.utime(tree / '.git', (time.time() - 7200,) * 2)
            names.append(tree.name)
        first = resource.retention.sweep(self.root, self.directory, True, 32)
        self.assertEqual(len(first['workspaces']['results']), 4)
        second = resource.retention.sweep(self.root, self.directory, True, 4)
        self.assertEqual(len(second['workspaces']['results']), 3)
        third = resource.retention.sweep(self.root, self.directory, True, 4)
        self.assertEqual(third['workspaces']['results'], [])
        for name in names:
            self.assertEqual(self.git('rev-parse', name).strip(), self.head)
        self.assertEqual((self.scratch / 'original.jsonl').read_bytes(), self.raw)


if __name__ == '__main__':
    unittest.main()
