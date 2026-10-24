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

    def pin_allocation(self):
        path=self.directory/'retention/allocations'/(self.tree.name+'.json')
        record=dict(schema='workspace-allocation-v1',root=str(self.root),worktree=str(self.tree),
                    branch=self.tree.name,state='allocated',base=self.git('rev-parse','HEAD',tree=self.tree).strip(),
                    publication_boundaries=resource.snapshot_publications(self.root))
        resource.retention.atomic(path,record)
        return path,record

    def source_leaf(self, name, content, *, pin=True):
        if pin: self.pin_allocation()
        (self.tree/name).write_text(content)
        self.git('add',name,tree=self.tree); self.git('commit','-m','independent source',tree=self.tree)
        return self.git('rev-parse','HEAD',tree=self.tree).strip()

    def published_leaf(self, tree, name, content, message='actual leaf publication'):
        (tree/name).write_text(content)
        self.git('add',name,tree=tree); self.git('commit','-m',message,tree=tree)
        return self.git('rev-parse','HEAD',tree=tree).strip()

    def settle_source(self, source):
        return resource.complete(self.root,self.directory,self.tree.name,source,
            self.git('rev-parse','HEAD').strip(),self.git('rev-parse','HEAD',tree=self.live).strip())

    def test_leaf_publication_then_evolution_or_revert_remains_reclaimable(self):
        name='agent/src/example.ts'; source=self.source_leaf(name,'export const fixed = 2;\n')
        witnesses={}
        for target in (self.root,self.live):
            witnesses[str(target)]=self.published_leaf(target,name,'export const fixed = 2;\n')
            self.published_leaf(target,name,'export const fixed = 1;\n','later intentional revert')
        from issue_session_project import Project
        publication=Project(self.root,self.directory).publication(dict(branch=self.tree.name,worktree=str(self.tree),
            source=source,base=resource.allocation_base(self.root,self.directory,self.tree)))
        self.assertTrue(all(r['boundary'] for r in publication['publication_witnesses']))
        record=self.settle_source(source)
        proof=record['acceptance']['publication_witnesses']
        self.assertEqual({r['commit'] for r in proof},set(witnesses.values()))
        self.assertTrue(all(r['kind']=='historical-leaf' for r in proof))
        self.assertEqual(self.reclaim()['state'],'reclaimed')
        self.assertEqual(self.git('rev-parse',self.tree.name).strip(),source)

    def test_narrow_publication_preserves_unrelated_file_changes_and_later_evolution(self):
        name='ops/fixture.py'
        baseline='header = 1\n'+''.join('# context '+str(n)+'\n' for n in range(20))+'feature = 1\n'
        self.published_leaf(self.root,name,baseline,'new shared baseline')
        for target in (self.tree,self.live): self.git('merge','--ff-only','main',tree=target)
        source=self.source_leaf(name,baseline.replace('feature = 1','feature = 2'))
        for target in (self.root,self.live):
            independent=baseline.replace('header = 1','header = 3')
            self.published_leaf(target,name,independent,'unrelated runtime edit')
            self.published_leaf(target,name,independent.replace('feature = 1','feature = 2'))
            self.published_leaf(target,name,independent.replace('feature = 1','feature = 4'),'later evolution')
        record=self.settle_source(source)
        proof=record['acceptance']['publication_witnesses']
        self.assertTrue(all(r['kind']=='verbatim-leaf-patch' for r in proof))
        self.assertEqual(len({r['patch_id'] for r in proof}),1)
        self.assertEqual(self.reclaim()['state'],'reclaimed')

    def test_main_history_cannot_substitute_for_unpublished_live(self):
        name='agent/src/example.ts'; source=self.source_leaf(name,'export const fixed = 2;\n')
        self.published_leaf(self.root,name,'export const fixed = 2;\n')
        self.published_leaf(self.root,name,'export const fixed = 3;\n','later main edit')
        with self.assertRaisesRegex(ValueError,'not in recorded publication'):
            self.settle_source(source)
        self.assertTrue((self.tree/'.git').exists())

    def test_dropped_side_branch_and_preallocation_blob_do_not_prove_publication(self):
        name='agent/src/example.ts'
        self.published_leaf(self.root,name,'export const fixed = 2;\n','old state')
        self.published_leaf(self.root,name,'export const fixed = 1;\n','allocation baseline')
        for target in (self.tree,self.live): self.git('merge','--ff-only','main',tree=target)
        source=self.source_leaf(name,'export const fixed = 2;\n')
        self.git('checkout','-b','discarded')
        self.published_leaf(self.root,name,'export const fixed = 2;\n','side branch only')
        self.git('checkout','main'); self.git('merge','-s','ours','discarded','-m','discard branch content')
        self.git('merge','--ff-only','main',tree=self.live)
        with self.assertRaisesRegex(ValueError,'not in recorded publication'):
            self.settle_source(source)
        self.assertFalse((self.directory/'retention/workspaces/ops-fixture.json').exists())

    def test_patch_adoption_requires_whitespace_identical_change(self):
        name='ops/fixture.py'; source=self.source_leaf(name,'fixed = 2\n')
        for target in (self.root,self.live):
            self.published_leaf(target,name,' fixed = 2\n','different whitespace is different code')
        with self.assertRaisesRegex(ValueError,'not in recorded publication'):
            self.settle_source(source)

    def test_history_limit_retains_unknown_publication(self):
        name='agent/src/example.ts'; source=self.source_leaf(name,'export const fixed = 2;\n')
        for value in (2,3,4):
            self.published_leaf(self.root,name,f'export const fixed = {value};\n')
        with patch.object(resource,'PUBLICATION_HISTORY_LIMIT',1), self.assertRaisesRegex(ValueError,'history scan limit'):
            self.settle_source(source)

    def test_diverged_live_preallocation_leaf_is_not_task_adoption(self):
        name='agent/src/example.ts'
        # All dates are identical and deliberately unrelated to allocation order.
        with patch.dict(os.environ,dict(GIT_AUTHOR_DATE='2035-01-01T00:00:00+00:00',
                                       GIT_COMMITTER_DATE='2035-01-01T00:00:00+00:00')):
            self.published_leaf(self.live,name,'export const fixed = 2;\n','old independent live')
            self.published_leaf(self.root,name,'export const fixed = 0;\n','allocation baseline')
            self.git('merge','--ff-only','main',tree=self.tree)
            source=self.source_leaf(name,'export const fixed = 2;\n')
            for value in (2,3): self.published_leaf(self.root,name,f'export const fixed = {value};\n')
            self.published_leaf(self.live,name,'export const fixed = 3;\n','live never adopted task')
        with self.assertRaisesRegex(ValueError,'not in recorded publication'):
            self.settle_source(source)
        self.assertTrue((self.tree/'.git').exists())
        self.assertFalse((self.directory/'retention/workspaces/ops-fixture.json').exists())

    def test_diverged_channels_accept_real_adoption_after_each_snapshot(self):
        name='agent/src/example.ts'
        old=self.published_leaf(self.live,name,'export const fixed = 9;\n','independent preallocation live')
        self.published_leaf(self.root,name,'export const fixed = 0;\n','main allocation baseline')
        self.git('merge','--ff-only','main',tree=self.tree)
        source=self.source_leaf(name,'export const fixed = 2;\n')
        for target in (self.root,self.live):
            self.published_leaf(target,name,'export const fixed = 2;\n','new task adoption')
            self.published_leaf(target,name,'export const fixed = 3;\n','later evolution')
        record=self.settle_source(source)
        live=[r for r in record['acceptance']['publication_witnesses'] if r['channel']=='live']
        self.assertEqual(live[0]['boundary'],old)
        self.assertNotEqual(live[0]['commit'],old)
        self.assertEqual(self.reclaim()['state'],'reclaimed')

    def test_diverged_live_preallocation_complete_patch_is_not_task_adoption(self):
        name='ops/fixture.py'
        baseline='header = 1\n'+''.join('# context '+str(n)+'\n' for n in range(20))+'feature = 0\n'
        self.published_leaf(self.root,name,baseline,'shared baseline')
        for target in (self.tree,self.live): self.git('merge','--ff-only','main',tree=target)
        independent=baseline.replace('header = 1','header = 7')
        self.published_leaf(self.live,name,independent,'live compatibility before allocation')
        old=self.published_leaf(self.live,name,independent.replace('feature = 0','feature = 2'),'old identical task patch')
        parent=self.git('rev-parse',old+'^').strip()
        source=self.source_leaf(name,baseline.replace('feature = 0','feature = 2'))
        base=resource.allocation_base(self.root,self.directory,self.tree)
        self.assertEqual(resource.leaf_patch(self.root,base,source,name),resource.leaf_patch(self.root,parent,old,name))
        for value in (2,3): self.published_leaf(self.root,name,baseline.replace('feature = 0',f'feature = {value}'))
        self.published_leaf(self.live,name,independent.replace('feature = 0','feature = 3'),'no task adoption')
        with self.assertRaisesRegex(ValueError,'not in recorded publication'):
            self.settle_source(source)

    def test_legacy_allocation_without_live_boundary_retains_history(self):
        name='agent/src/example.ts';source=self.source_leaf(name,'export const fixed = 2;\n')
        path=self.directory/'retention/allocations'/(self.tree.name+'.json')
        record=resource.retention.load(path);record['publication_boundaries'].pop('live')
        resource.retention.atomic(path,record)
        for target in (self.root,self.live):
            self.published_leaf(target,name,'export const fixed = 2;\n')
            self.published_leaf(target,name,'export const fixed = 3;\n')
        with self.assertRaisesRegex(ValueError,'boundary unavailable: live'):
            self.settle_source(source)
        record.pop('publication_boundaries');resource.retention.atomic(path,record)
        with self.assertRaisesRegex(ValueError,'boundary unavailable: main'):
            self.settle_source(source)

    def test_forked_boundary_cannot_substitute_for_channel_snapshot(self):
        name='agent/src/example.ts'
        self.published_leaf(self.root,name,'export const fixed = 0;\n','main allocation base')
        self.git('merge','--ff-only','main',tree=self.tree)
        source=self.source_leaf(name,'export const fixed = 2;\n')
        path=self.directory/'retention/allocations'/(self.tree.name+'.json');record=resource.retention.load(path)
        record['publication_boundaries']['live']['commit']=record['base'];resource.retention.atomic(path,record)
        for target in (self.root,self.live):
            self.published_leaf(target,name,'export const fixed = 2;\n')
            self.published_leaf(target,name,'export const fixed = 3;\n')
        with self.assertRaisesRegex(ValueError,'boundary is not on channel first-parent: live'):
            self.settle_source(source)

    def test_allocator_records_real_channel_tips_before_return(self):
        self.published_leaf(self.live,'agent/src/example.ts','export const fixed = 9;\n','independent live')
        tree=self.root/'.worktrees/ops-channel-snapshot'
        record=checkout.create(self.root,self.directory,tree,'main')
        bounds=record['publication_boundaries']
        self.assertEqual(bounds['main']['commit'],record['base'])
        self.assertEqual(bounds['live']['commit'],self.git('rev-parse','HEAD',tree=self.live).strip())
        self.assertNotEqual(bounds['live']['commit'],record['base'])
        saved=resource.retention.load(self.directory/'retention/allocations'/ (tree.name+'.json'))
        self.assertEqual(saved['publication_boundaries'],bounds)

    def test_boundary_binding_and_accepted_allocation_hash_are_enforced(self):
        name='agent/src/example.ts';source=self.source_leaf(name,'export const fixed = 2;\n')
        path=self.directory/'retention/allocations'/(self.tree.name+'.json')
        original=path.read_bytes()
        for target in (self.root,self.live):
            self.published_leaf(target,name,'export const fixed = 2;\n')
            self.published_leaf(target,name,'export const fixed = 3;\n')
        for bad in ('root','runtime'):
            record=json.loads(original)
            if bad=='root': record['publication_boundaries']['root']=str(self.root/'foreign')
            if bad=='runtime': record['publication_boundaries']['live']['worktree']='.worktrees/other'
            resource.retention.atomic(path,record)
            with self.assertRaisesRegex(ValueError,'boundary unavailable'):
                self.settle_source(source)
        path.write_bytes(original);self.settle_source(source)
        record=json.loads(original);record['publication_boundaries']['live']['commit']=self.git('rev-parse','HEAD',tree=self.live).strip()
        resource.retention.atomic(path,record)
        with self.assertRaisesRegex(ValueError,'accepted allocation receipt changed'):
            self.reclaim()

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

    def test_allocated_ops_tree_settles_only_after_changed_source_reaches_main_and_live(self):
        tree=self.root/'.worktrees/ops-self-settled'
        checkout.create(self.root,self.directory,tree,'main')
        (tree/'agent/src/example.ts').write_text('export const fixed = 20;\n')
        self.git('add','agent/src/example.ts',tree=tree)
        self.git('commit','-m','self settled fix',tree=tree)
        source=self.git('rev-parse','HEAD',tree=tree).strip()
        with self.assertRaisesRegex(ValueError,'not in recorded publication'):
            resource.reclaim(self.root,self.directory,tree.name,True)
        self.git('merge','--ff-only',source)
        with self.assertRaisesRegex(ValueError,'not in recorded publication'):
            resource.reclaim(self.root,self.directory,tree.name,True)
        self.git('merge','--ff-only',source,tree=self.live)
        result=resource.reclaim(self.root,self.directory,tree.name,True)
        self.assertEqual(result['state'],'reclaimed')
        self.assertFalse((tree/'.git').exists())
        manifest=resource.retention.load(self.directory/'retention/worktree-archives/ops-self-settled.manifest.json')
        self.assertTrue(manifest['proof']['source_acceptance']['live_required'])

    def test_allocated_ops_tree_accepts_exact_adopted_leaves_and_retains_source_branch(self):
        tree=self.root/'.worktrees/ops-leaf-settled'
        checkout.create(self.root,self.directory,tree,'main')
        (tree/'agent/src/example.ts').write_text('export const fixed = 21;\n')
        self.git('add','agent/src/example.ts',tree=tree)
        self.git('commit','-m','source fix',tree=tree)
        source=self.git('rev-parse','HEAD',tree=tree).strip()
        for target in (self.root,self.live):
            (target/'agent/src/example.ts').write_text('export const fixed = 21;\n')
            self.git('add','agent/src/example.ts',tree=target)
            self.git('commit','-m','actual adopted leaf',tree=target)
        self.assertFalse(resource.retention.ancestor(self.root,source))
        self.assertEqual(resource.reclaim(self.root,self.directory,tree.name,True)['state'],'reclaimed')
        self.assertEqual(self.git('rev-parse',tree.name).strip(),source)

    def test_allocated_ops_unpublished_report_is_not_automatically_completed(self):
        tree=self.root/'.worktrees/ops-unpublished-report'
        checkout.create(self.root,self.directory,tree,'main')
        (tree/'README.md').write_text('unfinished unpublished report\n')
        self.git('add','README.md',tree=tree); self.git('commit','-m','unfinished report',tree=tree)
        with self.assertRaisesRegex(ValueError,'unpublished in main'):
            resource.reclaim(self.root,self.directory,tree.name,True)
        self.assertTrue((tree/'.git').exists())

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
