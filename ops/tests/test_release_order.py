import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
import release_checks as checks
import release_plan as plan
from release_queue import Queue, publish
import release_queue


class ReleaseOrder(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup); self.root = Path(temp.name)
        for directory in ('.agents', '.state', 'ops', 'agent/src', 'agent/tests', 'knowledge/common'):
            (self.root / directory).mkdir(parents=True)
        import yaml
        config = yaml.safe_load((Path(__file__).parents[2] / '.agents/board.yaml').read_text())
        config['dispatcher']['release']['enabled'] = True
        (self.root / '.agents/board.yaml').write_text(json.dumps(config))
        (self.root / '.gitignore').write_text('.state/\n.worktrees/\nreceipts/\nops/codex-ops/\n')
        self.source = self.root / 'agent/src/fixed.ts'; self.source.write_text('old source\n')
        self.consumer = 'agent/tests/catalog-consumer.test.ts'
        (self.root / self.consumer).write_text('fixed catalog consumer\n')
        (self.root / 'knowledge/common/catalog.json').write_text('{"version":1}\n')
        self.git('init', '-q', '-b', 'main'); self.git('add', '.')
        self.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture baseline')
        self.live = self.root / '.worktrees/live'
        self.git('worktree', 'add', '-q', '-b', 'live', str(self.live))
        self.source.write_text('new source\n'); self.git('add', 'agent/src/fixed.ts')
        self.calls = []; self.queue = Queue(self.root); self.sequence = 0
        self.first = self.root / '.state/full.json'; self.manifest = self.make_plan()

    def git(self, *args, cwd=None):
        return subprocess.check_output(['git', '-C', str(cwd or self.root), *args], stderr=subprocess.DEVNULL).decode().strip()

    def make_plan(self):
        self.sequence += 1
        snapshot = f'.state/knowledge-{self.sequence}.json'
        frozen = plan.snapshot(self.root, self.live, snapshot)
        review = self.root / '.state/review.md'; review.write_text('Fixed source/prerequisite/dependency and current-load review.\n')
        name = 'agent/src/fixed.ts'
        value = dict(schema='release-assembly-v1', root=str(self.root), repo=self.queue.board.repo,
                     baseline=frozen['baseline'], knowledge_snapshot=snapshot,
                     deliveries={name: dict(value=plan.file_value(self.root, name),
                         preimage=plan.baseline_value(self.root, frozen['baseline'], name))},
                     test_dependencies={}, prerequisites=[], excluded_tests=[],
                     review=dict(path='.state/review.md', value=plan.file_value(self.root, '.state/review.md'),
                         dependencies_complete=True, timeout_margins=[], no_fixed_timeouts_reason='No child timeouts in this fixed fixture.'),
                     data_consumers={p: [self.consumer] for p in frozen['files']})
        path = self.root / f'.state/plan-{self.sequence}.json'; path.write_text(json.dumps(value)); return path

    def runner(self, argv, **kwargs):
        self.calls.append(argv); return SimpleNamespace(returncode=0)

    def check(self, receipt=None, identity='high40', issues=None, reuse=None, runner=None):
        return checks.check(self.root, self.root, receipt or self.first, 'ops', reuse, runner or self.runner,
                            release_id=identity, issues=issues or [33, 40], plan=self.manifest)

    def rebase_data(self):
        for root in (self.live, self.root):
            (root / 'knowledge/common/catalog.json').write_text('{"version":2}\n')
            (root / 'knowledge/common/strategy.json').write_text('{"entries":["fixed"]}\n')
        self.git('add', 'knowledge', cwd=self.live)
        self.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'data-only baseline', cwd=self.live)
        self.git('add', 'knowledge'); self.manifest = self.make_plan()

    def test_second_release_is_queued_while_checks_execute_and_after_frozen(self):
        def during(argv, **kwargs):
            self.assertEqual(self.queue.status()['active']['state'], 'checking')
            second = self.root / f'.state/second-during-{len(self.calls)}.json'
            self.assertEqual(self.check(second, 'data27', [27]), 75)
            with self.assertRaises((ValueError, BlockingIOError)):
                publish(self.queue, 'data27', self.first, self.root, ['must-not-run'], self.runner)
            return self.runner(argv, **kwargs)
        self.assertEqual(self.check(runner=during), 0)
        self.assertEqual(self.queue.status()['active']['state'], 'frozen')
        self.assertFalse(Queue(self.root).request('data27', [27]))
        self.assertEqual(self.queue.status()['queued'][0]['id'], 'data27')
        self.assertEqual(len(self.calls), 2)

    def test_failed_or_exited_owner_does_not_release_reservation_and_explicit_abandon_does(self):
        self.assertEqual(self.check(runner=lambda *a, **k: SimpleNamespace(returncode=1)), 1)
        self.assertEqual(Queue(self.root).status()['active']['state'], 'failed-retained')
        self.assertFalse(self.queue.request('data27', [27]))
        with self.queue.execution('high40'):
            self.queue.transition('high40', {'failed-retained'}, 'abandoned', evidence='fixed local failure reconciliation')
        self.assertTrue(self.queue.request('data27', [27]))

    def test_data_only_rebase_reuses_full_and_runs_only_tsc_and_consumers(self):
        self.assertEqual(self.check(), 0); before = self.first.read_bytes()
        self.rebase_data(); output = self.root / '.state/rebased.json'
        self.assertEqual(self.check(output, reuse=self.first), 0)
        value = json.loads(output.read_text())
        self.assertEqual(value['mode'], 'data-rebase-reuse')
        self.assertEqual(value['executed'], ['tsc', 'consumers'])
        self.assertEqual(len(self.calls), 4); self.assertEqual(self.first.read_bytes(), before)
        self.assertEqual(value['checklist']['knowledge']['files'], plan.knowledge(self.live))
        self.assertTrue(value['checklist']['input_unchanged'])

    def test_runtime_change_requires_full_even_on_data_rebase(self):
        self.assertEqual(self.check(), 0); self.rebase_data()
        extra = self.root / 'agent/src/another.ts'; extra.write_text('changed runtime\n'); self.git('add', 'agent/src/another.ts')
        value = json.loads(self.manifest.read_text())
        value['deliveries']['agent/src/another.ts'] = dict(value=plan.file_value(self.root, 'agent/src/another.ts'), preimage=None)
        self.manifest.write_text(json.dumps(value))
        self.assertEqual(self.check(self.root / '.state/runtime.json', reuse=self.first), 0)
        self.assertEqual(len(self.calls), 4)
        self.assertIn('vitest.mjs', self.calls[-1][4]); self.assertNotIn(self.consumer, self.calls[-1])

    def test_changed_delivery_preimage_disallows_reuse(self):
        self.assertEqual(self.check(), 0)
        (self.live / 'agent/src/fixed.ts').write_text('different preimage\n')
        self.git('add', '.', cwd=self.live); self.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'runtime baseline', cwd=self.live)
        self.manifest = self.make_plan()
        self.assertEqual(self.check(self.root / '.state/preimage.json', reuse=self.first), 0)
        self.assertEqual(json.loads((self.root / '.state/preimage.json').read_text())['mode'], 'full')

    def test_missing_called_script_prerequisite_and_stale_snapshot_fail_before_tests(self):
        wrapper = self.root / 'agent/tests/wrapper.test.ts'
        wrapper.write_text('const file = "knowledge/builders/test_missing.py";\n'); self.git('add', str(wrapper))
        self.assertEqual(self.check(), 1); self.assertEqual(self.calls, [])
        self.queue.transition('high40', {'failed-retained'}, 'reserved', evidence='fixed dependency inventory')
        wrapper.unlink(); self.git('add', str(wrapper))
        value = json.loads(self.manifest.read_text())
        value['prerequisites'] = [dict(issue=99, files={'ops/missing.py': dict(sha256='0'*64, mode='100644')})]
        self.manifest.write_text(json.dumps(value))
        self.assertEqual(self.check(self.root / '.state/prerequisite.json'), 1); self.assertEqual(self.calls, [])
        self.queue.transition('high40', {'failed-retained'}, 'reserved', evidence='fixed prerequisite review')
        value['prerequisites'] = []; self.manifest.write_text(json.dumps(value))
        (self.root / 'knowledge/common/catalog.json').write_text('{"stale":true}\n'); self.git('add', 'knowledge')
        self.assertEqual(self.check(self.root / '.state/knowledge.json'), 1); self.assertEqual(self.calls, [])

    def test_timeout_margin_and_input_drift_are_not_retried_to_green(self):
        test = self.root / self.consumer; test.write_text('spawnSync("fixed", [], {timeout: 5000});\n'); self.git('add', str(test))
        self.assertEqual(self.check(), 1); self.assertEqual(self.calls, [])
        self.queue.transition('high40', {'failed-retained'}, 'reserved', evidence='reviewed timeout margin')
        value = json.loads(self.manifest.read_text()); value['review']['timeout_margins'] = [
            dict(test=self.consumer, timeout_ms=5000, observed_max_ms=5000, load_evidence='fixed constrained load')]
        self.manifest.write_text(json.dumps(value))
        self.assertEqual(self.check(self.root / '.state/margin.json'), 1); self.assertEqual(self.calls, [])
        self.queue.transition('high40', {'failed-retained'}, 'reserved', evidence='fixed timeout repair')
        value['review']['timeout_margins'][0]['observed_max_ms'] = 1000; self.manifest.write_text(json.dumps(value))
        def changed(argv, **kwargs):
            self.source.write_text('dirty input\n'); return self.runner(argv, **kwargs)
        self.assertEqual(self.check(self.root / '.state/drift.json', runner=changed), 1)
        self.assertEqual(self.queue.status()['active']['state'], 'failed-retained')

    def test_failed_or_modified_original_full_is_never_reused(self):
        self.assertEqual(self.check(), 0); self.rebase_data()
        self.first.with_suffix('.vitest.log').write_text('changed original log')
        self.assertEqual(self.check(self.root / '.state/untrusted.json', reuse=self.first), 0)
        self.assertEqual(json.loads((self.root / '.state/untrusted.json').read_text())['mode'], 'full')

    def test_publish_guard_keeps_slot_until_explicit_completion_and_rechecks_latest_inputs(self):
        self.assertEqual(self.check(), 0)
        self.assertEqual(publish(self.queue, 'high40', self.first, self.root, ['fixed'], self.runner), 0)
        self.assertEqual(self.queue.status()['active']['state'], 'awaiting-completion')
        self.assertFalse(self.queue.request('data27', [27]))
        self.queue.transition('high40', {'awaiting-completion'}, 'frozen', evidence='fixed prepublication replay')
        (self.live / 'knowledge/common/catalog.json').write_text('{"changed":true}\n')
        count = len(self.calls)
        with self.assertRaises(ValueError): publish(self.queue, 'high40', self.first, self.root, ['must-not-run'], self.runner)
        self.assertEqual(len(self.calls), count)

    def test_execution_lease_prevents_same_release_concurrent_use_and_status_is_read_only(self):
        before = set(self.root.rglob('*')); self.queue.status(); self.assertEqual(before, set(self.root.rglob('*')))
        self.queue.request('high40', [33, 40])
        with self.queue.execution('high40'):
            with self.assertRaises(BlockingIOError):
                with Queue(self.root).execution('high40'): self.fail('parallel execution')

    def test_completion_requires_actual_checked_runtime_and_evidence_before_next_release(self):
        self.assertEqual(self.check(), 0)
        self.assertEqual(publish(self.queue, 'high40', self.first, self.root, ['fixed'], self.runner), 0)
        def complete():
            source = self.git('rev-parse', 'HEAD', cwd=self.live)
            with patch.object(sys, 'argv', ['release_queue', '--root', str(self.root), 'complete', '--id', 'high40',
                    '--source', source, '--evidence', '.state/review.md']), \
                    patch('sys.stdout', new_callable=io.StringIO), patch('sys.stderr', new_callable=io.StringIO):
                return release_queue.main()
        self.assertEqual(complete(), 1)
        self.assertFalse(self.queue.request('data27', [27]))
        (self.live / 'agent/src/fixed.ts').write_bytes(self.source.read_bytes())
        self.git('add', '.', cwd=self.live); self.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'checked publication', cwd=self.live)
        self.assertEqual(complete(), 0)
        self.assertTrue(self.queue.request('data27', [27]))

    def test_missing_runtime_baseline_input_cannot_be_disguised_as_data_only_rebase(self):
        self.assertEqual(self.check(), 0)
        (self.live / 'agent/src/hidden.ts').write_text('new live runtime\n')
        self.git('add', '.', cwd=self.live); self.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'runtime prerequisite', cwd=self.live)
        self.manifest = self.make_plan()
        self.assertEqual(self.check(self.root / '.state/omitted-runtime.json', reuse=self.first), 1)

    def test_data_publication_uses_same_slot_without_claiming_a_full_test(self):
        self.source.write_text('old source\n'); self.git('add', str(self.source))
        name = 'knowledge/common/catalog.json'
        (self.root / name).write_text('{"version":2}\n'); self.git('add', name)
        self.manifest = self.make_plan(); value = json.loads(self.manifest.read_text())
        value['deliveries'][name] = dict(value=plan.file_value(self.root, name),
                                        preimage=plan.baseline_value(self.root, value['baseline'], name))
        self.manifest.write_text(json.dumps(value)); self.queue.request('data27', [27])
        output = self.root / '.state/data.json'
        self.assertEqual(publish(self.queue, 'data27', output, self.root, ['fixed-data-publish'], self.runner,
                                 data_plan=self.manifest, evidence='.state/review.md'), 0)
        self.assertEqual(self.calls, [['fixed-data-publish']])
        self.assertEqual(json.loads(output.read_text())['schema'], 'board-data-publication-v1')
        self.assertFalse(self.queue.request('next35', [35]))

    def test_failed_data_consumers_preserve_full_origin_and_hold_publication(self):
        self.assertEqual(self.check(), 0); before = self.first.read_bytes(); self.rebase_data()
        def failed(argv, **kwargs):
            self.calls.append(argv)
            return SimpleNamespace(returncode=1 if 'vitest.mjs' in argv[4] else 0)
        output = self.root / '.state/consumer-failure.json'
        self.assertEqual(self.check(output, reuse=self.first, runner=failed), 1)
        self.assertEqual(self.first.read_bytes(), before)
        self.assertEqual(self.queue.status()['active']['state'], 'failed-retained')
        self.assertIsNone(checks.full_proof(output, self.root, self.queue.board.repo))

    def test_untracked_frozen_knowledge_change_still_requires_consumer_checks(self):
        self.assertEqual(self.check(), 0)
        for root in (self.live, self.root):
            (root / 'knowledge/common/new.json').write_text('{"new":true}\n')
        self.manifest = self.make_plan(); output = self.root / '.state/untracked-data.json'
        self.assertEqual(self.check(output, reuse=self.first), 0)
        self.assertEqual(json.loads(output.read_text())['mode'], 'data-rebase-reuse')
        self.assertEqual(len(self.calls), 4)

    def test_untracked_runtime_cannot_hide_outside_tree_fingerprint(self):
        (self.root / 'agent/src/untracked.ts').write_text('untracked executable input\n')
        self.assertEqual(self.check(), 1); self.assertEqual(self.calls, [])


if __name__ == '__main__': unittest.main()
