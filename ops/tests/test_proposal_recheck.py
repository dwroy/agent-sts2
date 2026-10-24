"""Fixed queue/clock fixtures; never allocate a production tree or start a learner."""
import copy
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import learner_jobs as jobs
import proposal_dispatch as dispatch
import worktree_allocation_report as allocations


class ProposalRecheck(unittest.TestCase):
    def setUp(self):
        self.state = {'batches': {}}
        self.items = {f'p{i:02}': {'id': f'p{i:02}', 'character': 'silent', 'target_task': 'strategy-proposal',
                      'state': 'waiting', 'seen_runs': 100, 'runs': ['SILENT000001'],
                      'ts': '2026-01-01T00:00:00+00:00'} for i in range(40)}
        self.clock = 100000
        self.count = 101
        self.calls = []

    def start(self, argv, *args):
        self.calls.append(argv)
        return 100 + len(self.calls), None

    def consume(self, stamp='20261023-010000'):
        lib = SimpleNamespace(QUEUE='unused', fold=lambda _: self.items)
        with patch.object(dispatch, 'library', return_value=lib), \
             patch.object(dispatch, 'finished_count', return_value=self.count), \
             patch.object(dispatch.time, 'time', return_value=self.clock), \
             patch.object(jobs, 'available', return_value=True), \
             patch.object(jobs, 'start_learner', side_effect=self.start):
            return dispatch.dispatch(self.state, '/fixture', str(Path(jobs.__file__).parent), 'silent',
                                     lambda pid: True, stamp, jobs.dispatch_write)

    def settle(self):
        for batch in self.state['batches'].values():
            if batch['state'] != 'running':
                continue
            batch.update(state='done')
            for ident in batch.get('proposal_ids', []):
                self.items[ident].update(seen_runs=self.count, ts='2026-01-02T00:00:00+00:00')

    def test_two_slots_keep_disjoint_ids_trees_and_batch_scratch_owners(self):
        self.consume()
        first, second = self.state['batches'].values()
        self.assertFalse(set(first['proposal_ids']) & set(second['proposal_ids']))
        self.assertNotEqual(first['worktree'], second['worktree'])
        self.assertTrue(second['worktree'].endswith('-s2'))
        self.assertEqual(len(self.state['proposal_rechecks']['silent']['batches']), 2)
        before = copy.deepcopy(self.state)
        self.assertIsNone(self.consume())
        self.assertEqual(self.state, before)

    def test_one_new_run_does_not_allocate_but_ten_open_one_round(self):
        self.consume()
        self.settle()
        before = copy.deepcopy(self.state)
        self.count += 1
        self.clock += 1800
        self.assertIsNone(self.consume('20261023-013000'))
        self.assertEqual(self.state, before)
        self.count = 111
        self.consume('20261023-020000')
        self.assertEqual(len(self.calls), 4)

    def test_time_boundary_and_oldest_first_prevent_starvation(self):
        self.consume()
        self.settle()
        self.count += 1
        self.clock += dispatch.WAITING_SECONDS - 1
        self.assertIsNone(self.consume('20261023-065959'))
        self.clock += 1
        self.consume('20261023-070000')
        new = list(self.state['batches'].values())[2:]
        self.assertEqual(set(p for b in new for p in b['proposal_ids']), set(list(self.items)[20:]))

    def test_time_alone_cannot_repeat_identical_evidence(self):
        self.items = dict(list(self.items.items())[:20])
        self.consume()
        self.settle()
        self.clock += dispatch.WAITING_SECONDS
        self.assertIsNone(self.consume('20261023-070000'))
        self.assertEqual(len(self.calls), 2)

    def test_new_pending_and_link_repairs_bypass_waiting_gate(self):
        self.consume()
        self.settle()
        watermark = copy.deepcopy(self.state['proposal_rechecks'])
        self.items['p39']['state'] = 'pending'
        self.state['proposal_repairs'] = {'repair': {'character': 'silent', 'state': 'pending',
                                                    'runs': ['SILENT000001']}}
        self.consume('20261023-013000')
        new = list(self.state['batches'].values())[2:]
        self.assertEqual(new[0]['proposal_repair'], 'repair')
        self.assertEqual(new[1]['proposal_ids'], ['p39'])
        self.assertEqual(self.state['proposal_rechecks'], watermark)

    def test_busy_or_failed_dispatch_does_not_consume_round(self):
        with patch.object(jobs, 'busy', return_value=True):
            self.assertIsNone(self.consume())
        self.assertNotIn('proposal_rechecks', self.state)
        self.consume('20261023-013000')
        self.assertEqual(len(self.calls), 2)

    def test_foreign_character_claims_and_failed_candidates_are_preserved(self):
        self.items['foreign'] = dict(self.items['p00'], id='foreign', character='regent', state='pending')
        old = {'task': 'strategy-proposal', 'character': 'silent', 'state': 'failed', 'pid': 77,
               'proposal_ids': ['p00'], 'worktree': '/failed-candidate', 'key': 'old'}
        active = dict(old, state='running', pid=78, worktree='/active-candidate')
        self.state['batches'].update(failed=copy.deepcopy(old), active=copy.deepcopy(active))
        self.consume()
        self.assertEqual(self.state['batches']['failed'], old)
        self.assertEqual(self.state['batches']['active'], active)
        new = list(self.state['batches'].values())[2:]
        self.assertEqual(len(new), 1)
        self.assertNotIn('p00', new[0]['proposal_ids'])
        self.assertNotIn('foreign', new[0]['proposal_ids'])

    def test_clock_counter_rollback_and_corrupt_watermark_do_not_reopen(self):
        self.consume()
        self.settle()
        self.clock -= 1
        self.count += dispatch.WAITING_RUNS
        self.assertIsNone(self.consume('20261023-020000'))
        self.clock += dispatch.WAITING_SECONDS
        self.count = 100
        self.assertIsNone(self.consume('20261023-020000'))
        self.state['proposal_rechecks']['silent']['at'] = 'corrupt'
        self.count = 102
        with self.assertRaisesRegex(ValueError, 'watermark'):
            self.consume('20261023-020000')


class AllocationReport(unittest.TestCase):
    def test_fixed_window_counts_allocated_attempts_and_categories_without_mutation(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            receipts = directory / 'retention/allocations'
            receipts.mkdir(parents=True)
            for name, at, state in (('codex-strategy-silent-s2', '2026-01-01T08:00:00+08:00', 'allocated'),
                                    ('codex-fix-silent-fixed', '2026-01-01T01:00:00Z', 'allocation_failed'),
                                    ('issue-46-task', '2026-01-02T00:00:00Z', 'allocated')):
                (receipts / (name + '.json')).write_text(json.dumps({'schema': 'workspace-allocation-v1',
                    'worktree': '/fixture/' + name, 'at': at, 'state': state}))
            before = {p.name: p.read_bytes() for p in receipts.iterdir()}
            result = allocations.report(directory, allocations.timestamp('2026-01-01T00:00:00Z'),
                                         allocations.timestamp('2026-01-02T00:00:00Z'))
            self.assertEqual((result['hours'], result['allocated'], result['attempts']), (24, 1, 2))
            self.assertEqual(result['by_category'], {'strategy-proposal': 1})
            self.assertTrue(result['complete'])
            self.assertEqual(before, {p.name: p.read_bytes() for p in receipts.iterdir()})
            (receipts / 'corrupt.json').write_text('{')
            self.assertFalse(allocations.report(directory, allocations.timestamp('2026-01-01T00:00:00Z'),
                                                allocations.timestamp('2026-01-02T00:00:00Z'))['complete'])

    def test_missing_receipts_and_ambiguous_timezone_cannot_claim_zero(self):
        with self.assertRaises(ValueError):
            allocations.timestamp('2026-01-01T00:00:00')
        with tempfile.TemporaryDirectory() as temp, self.assertRaises(ValueError):
            allocations.report(Path(temp), allocations.timestamp('2026-01-01T00:00:00Z'),
                               allocations.timestamp('2026-01-02T00:00:00Z'))


if __name__ == '__main__':
    unittest.main()
