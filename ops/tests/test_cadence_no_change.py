"""Fixed cadence identities, real Git and a tiny dataset fixture; no live inputs."""
import copy
import json
import sys
import unittest
from unittest.mock import patch

import test_ordinary_close as ordinary
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import learner_checks
import learner_retention
import proposal_dispatch as dispatch


class CadenceNoChange(unittest.TestCase):
    def setUp(self):
        self.f = ordinary.OrdinaryClose(methodName='runTest')
        self.addCleanup(self.f.doCleanups)
        self.f.setUp()
        f = self.f
        self.bid = '20261020-064302-strategy-proposal'
        self.tree = f.root / '.worktrees/codex-strategy-silent-20261020-064302'
        f.git('worktree', 'add', '-qb', 'cadence', str(self.tree))
        f.git('worktree', 'add', '-qb', 'live', str(f.root / '.worktrees/live'))
        self.path = self.tree / 'learner/runs/20261020-064307-strategy-proposal/report.md'
        self.path.parent.mkdir(parents=True)
        self.batch = {**f.batch, 'task': 'strategy-proposal', 'worktree': str(self.tree),
                      'key': 'silent:A11:366', 'reason': 'tick',
                      'strategy_progress': {'ascension': 11, 'runs': 366}, 'state': 'running'}
        self.report = {'task': 'strategy-proposal', 'character': 'silent', 'batch': self.bid,
                       'base': f.head, 'runs': ['SILENT000001'], 'fixes': [], 'merged': None,
                       'tests': {'tsc': None, 'vitest': None, 'cases': None}, 'proposal_results': [],
                       'code_proposals': [], 'implementation_domains': [], 'report': str(self.path)}
        self.save()

    def save(self):
        raw = '固定 tick 审计；无提案领取，无代码或知识发布。\n```json\n' + json.dumps(self.report) + '\n```\n'
        self.path.write_text(raw)
        out = self.f.directory / 'learner'
        out.mkdir(exist_ok=True)
        (out / (self.bid + '.out')).write_text(raw)

    def test_tick_finishes_without_proposal_resolution_and_uses_one_guarded_dataset(self):
        f = self.f
        original = self.path.read_bytes()
        tools = learner_checks.proposal_tools()
        with patch.object(learner_checks, 'proposal_tools', return_value=tools), \
                patch.object(tools, 'resolve', wraps=tools.resolve) as resolve:
            learner_checks.finish_write_batch(self.bid, self.batch, 0, str(f.root),
                str(f.directory / 'learner'), lambda *args: f.events.append(args), self.fail, run_checks=False)
        self.assertEqual(self.batch['state'], 'done', self.batch)
        self.assertEqual(self.batch['no_change_proposals']['dispositions'], [])
        self.assertTrue(self.batch['no_change_proposals']['cadence']['no_proposal_resolution'])
        self.assertEqual(resolve.call_count, 1)
        self.assertNotIn('seen_runs', self.batch)
        self.assertEqual(self.path.read_bytes(), original)
        self.assertEqual(self.report['tests'], {'tsc': None, 'vitest': None, 'cases': None})
        self.assertEqual(f.events, [])
        # An offered receipt must retain the original checkout until its record commit exists.
        state = {'batches': {self.bid: self.batch}}
        with self.assertRaisesRegex(ValueError, 'ordinary completion'):
            learner_retention.admission(f.root, f.directory, state, self.bid, check_ignored=False)
        f.process()
        receipt = f.receipt(self.bid)
        self.assertEqual(receipt['state'], 'closed', receipt)
        self.assertEqual((f.root / 'dataset.counter').read_text(), '1')
        self.assertEqual(f.git('rev-parse', 'HEAD'), receipt['records']['commit'])
        proof = learner_retention.admission(f.root, f.directory, state, self.bid, check_ignored=False)[3]
        self.assertEqual(proof['kind'], 'settled-report-only')
        self.assertTrue(proof['no_experience_claim'])
        f.process()
        self.assertEqual((f.root / 'dataset.counter').read_text(), '1')
        self.assertEqual(self.path.read_bytes(), original)
        self.assertEqual((f.root / 'paper/materials/learning/code-proposals.jsonl').read_bytes(), b'')
        self.assertEqual(f.events, [])

    def test_cross_tree_fake_assignment_source_changes_and_scientific_scope_reject(self):
        for changes in ({'reason': 'ops'}, {'key': 'silent:A11:365'},
                        {'strategy_progress': {'ascension': True, 'runs': 366}},
                        {'strategy_progress': {'ascension': 11, 'runs': 0}},
                        {'research_request': 'h0'}, {'implementation_request': 'special'},
                        {'feature_request': 'feature'}, {'learning_request': 'parent'},
                        {'proposal_ids': ['silent-proposal-' + 'a' * 16]},
                        {'proposal_repair': 'repair'}, {'character': 'ironclad'},
                        {'worktree': str(self.f.root)}, {'ordinary_baseline': {}}):
            with self.subTest(changes=changes):
                self.assertIsNone(dispatch.no_change(self.report, {**self.batch, **changes}, str(self.f.root)))
        for changes in ({'batch': '20261020-051302-strategy-proposal'}, {'runs': ['FOREIGN00001']},
                        {'tests': {'tsc': 0, 'vitest': 0, 'cases': 1}},
                        {'source_commit': self.f.head}, {'needs_decision': True},
                        {'proposal_results': [{'id': 'silent-proposal-' + 'a' * 16, 'state': 'waiting', 'reason': 'fixed'}]},
                        {'fixes': [{'commit': self.f.head}]}, {'merged': self.f.head},
                        {'report': str(self.f.report_path)}):
            with self.subTest(changes=changes):
                self.assertIsNone(dispatch.no_change({**self.report, **changes}, self.batch, str(self.f.root)))
        (self.tree / 'agent/src/fixed.ts').write_text('dirty source')
        self.assertIsNone(dispatch.no_change(self.report, self.batch, str(self.f.root)))

    def test_preserved_report_and_reclaimed_git_marker_cannot_be_forged(self):
        self.path.write_text('```json\n' + json.dumps({**self.report, 'runs': ['FOREIGN00001']}) + '\n```\n')
        self.assertIsNone(dispatch.no_change(self.report, self.batch, str(self.f.root)))
        self.save()
        marker = self.tree / '.git'
        raw = marker.read_bytes()
        marker.unlink()
        try:
            # Git would otherwise fall back to the enclosing main checkout.
            self.assertIsNone(dispatch.no_change(self.report, self.batch, str(self.f.root)))
        finally:
            marker.write_bytes(raw)

    def test_retention_never_removes_an_unfinished_ordinary_candidate(self):
        f = self.f
        self.batch.update(state='done', rc=0, no_change_proposals={'base': f.head})
        state = {'batches': {self.bid: self.batch}}
        path = f.directory / f'ordinary-close/{self.bid}.json'
        path.parent.mkdir()
        for status in ('pending', 'running', 'attention'):
            ordinary.ops_current.save(path, {'schema': 'ordinary-close-v1', 'batch': self.bid, 'state': status})
            with self.subTest(status=status), self.assertRaisesRegex(ValueError, 'ordinary completion'):
                learner_retention.admission(f.root, f.directory, state, self.bid, check_ignored=False)
            self.assertTrue((self.tree / '.git').is_file())


if __name__ == '__main__':
    unittest.main()
