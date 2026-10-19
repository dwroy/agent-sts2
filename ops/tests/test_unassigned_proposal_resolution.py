"""Fixed completion evidence for CMS8QL9E3C5U F19 T1 / batch 20261012-104302."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]


def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, REPO / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


dispatch = load('unassigned_dispatch', 'ops/proposal_dispatch.py')
checks = load('unassigned_checks', 'ops/learner_checks.py')
proposals = dispatch.library(REPO / 'ops')
IDENT = 'silent-proposal-54bd844abc57bb62'
RUN = 'CMS8QL9E3C5U'


class Resolution(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='unassigned-proposal-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.live = self.root / '.worktrees/live'
        self.tree = self.root / '.worktrees/codex-strategy-silent-fixed'
        self.live.mkdir(parents=True)
        self.git(self.live, 'init', '-q')
        (self.live / 'fixed.txt').write_text('baseline')
        self.git(self.live, 'add', 'fixed.txt')
        self.git(self.live, 'commit', '-qm', 'Fixed baseline')
        self.base = self.git(self.live, 'rev-parse', 'HEAD')
        self.git(self.live, 'worktree', 'add', '-qb', 'source', str(self.tree))
        (self.tree / 'fixed.txt').write_text('fixed source')
        self.git(self.tree, 'commit', '-qam', 'Fixed source')
        self.source = self.git(self.tree, 'rev-parse', 'HEAD')
        self.git(self.live, 'merge', '--ff-only', 'source')
        original = self.root / 'learner/runs/postmortem/proposal.md'
        original.parent.mkdir(parents=True)
        original.write_text('固定来源；只验证机械接续，不增加游戏结论。')
        self.item = {'op': 'add', 'id': IDENT, 'character': 'silent', 'runs': [RUN],
                     'source_task': 'postmortem', 'target_task': 'strategy-proposal',
                     'ledger': ['silent-0425'], 'proposal': str(original),
                     'proposal_sha256': hashlib.sha256(original.read_bytes()).hexdigest(),
                     'state': 'pending', 'seen_runs': 7, 'batch': 'active-dispatched-batch'}
        self.queue = self.root / proposals.QUEUE
        self.queue.parent.mkdir(parents=True)
        self.queue.write_text(json.dumps(self.item) + '\n')
        self.report_path = self.tree / 'learner/runs/fixed/report.md'
        self.report_path.parent.mkdir(parents=True)
        self.batch = {'task': 'strategy-proposal', 'character': 'silent', 'runs': [RUN],
                      'key': 'ordinary-strategy', 'worktree': str(self.tree),
                      'proposal_policy': proposals.POLICY, 'attempts': 1, 'retry_at': 123}
        self.report = {'task': 'strategy-proposal', 'character': 'silent', 'runs': [RUN],
                       'base': self.base, 'merged': self.source, 'report': str(self.report_path),
                       'code_proposals': [IDENT], 'implementation_domains': ['combat'],
                       'fixes': [{'proposal_id': IDENT, 'commit': self.source}],
                       'proposal_results': [{'id': IDENT, 'state': 'implemented', 'commit': self.source,
                                             'reason': '仅核实原限定范围，其他组合与自然收益未知。'}]}
        self.save_report()

    def git(self, path, *args):
        return subprocess.check_output(['git', '-C', str(path), *args],
                                       text=True, stderr=subprocess.DEVNULL).strip()

    def save_report(self):
        self.report_path.write_text('```json\n' + json.dumps(self.report) + '\n```\n')

    def resolve(self):
        dispatch.resolve(self.report, self.batch, str(self.root), str(REPO / 'ops'))

    def test_resolves_original_id_and_preserves_active_lease_watermark_and_reason(self):
        before = copy.deepcopy(self.batch)
        self.resolve()
        item = proposals.fold(self.queue)[IDENT]
        self.assertEqual(item['state'], 'implemented')
        self.assertEqual(item['commit'], self.source)
        self.assertEqual(item['reason'], self.report['proposal_results'][0]['reason'])
        self.assertEqual(item['seen_runs'], 7)
        self.assertEqual(item['batch'], 'active-dispatched-batch')
        self.assertEqual(item['proposal_sha256'], self.item['proposal_sha256'])
        self.assertEqual(item['resolution_report_sha256'], hashlib.sha256(self.report_path.read_bytes()).hexdigest())
        self.assertEqual(self.batch, before)
        self.assertNotIn('proposal_ids', self.batch)
        self.assertEqual(list(proposals.fold(self.queue)), [IDENT])
        resolved = self.queue.read_bytes()
        self.resolve()
        self.assertEqual(self.queue.read_bytes(), resolved)

    def test_completion_records_resolution_before_marking_done(self):
        events, notices = [], []
        with patch.object(checks, 'read_report', return_value=self.report), \
                patch.object(checks, 'proposal_tools', return_value=dispatch):
            checks.finish_write_batch('fixed', self.batch, 0, str(self.root), str(self.root),
                                      lambda kind, msg: events.append(kind), notices.append, run_checks=False)
        self.assertEqual(self.batch['state'], 'done')
        self.assertEqual(proposals.fold(self.queue)[IDENT]['state'], 'implemented')
        self.assertEqual(events, ['strategy-done'])
        self.assertEqual(notices, [])
        self.assertEqual(self.batch['attempts'], 1)
        self.assertEqual(self.batch['retry_at'], 123)

    def test_rejects_foreign_missing_or_changed_original_registration(self):
        for changes in ({'character': 'other'}, {'source_task': 'unknown'}, {'target_task': 'fix-batch'},
                        {'runs': ['OTHER0000001']}, {'ledger': []}, {'proposal_sha256': 'f' * 64},
                        {'id': 'different-id'}):
            with self.subTest(changes=changes):
                self.queue.write_text(json.dumps({**self.item, **changes}) + '\n')
                before = self.queue.read_bytes()
                with self.assertRaises(ValueError):
                    self.resolve()
                self.assertEqual(self.queue.read_bytes(), before)

    def test_rejects_unbound_malformed_and_outside_report_without_any_append(self):
        good = copy.deepcopy(self.report)
        for scenario in ('missing_link', 'duplicate', 'invalid_rows', 'missing_reason', 'foreign_character',
                         'foreign_runs', 'wrong_fix', 'wrong_fix_id', 'unmerged', 'waiting', 'outside',
                         'changed_report', 'missing_report', 'foreign_worktree', 'invalid_merge'):
            with self.subTest(scenario=scenario):
                self.report = copy.deepcopy(good)
                self.batch['worktree'] = str(self.tree)
                row = self.report['proposal_results'][0]
                if scenario == 'missing_link': self.report['code_proposals'] = []
                if scenario == 'duplicate': self.report['proposal_results'].append(copy.deepcopy(row))
                if scenario == 'invalid_rows': self.report['proposal_results'] = {'id': IDENT}
                if scenario == 'missing_reason': row['reason'] = ' '
                if scenario == 'foreign_character': self.report['character'] = 'other'
                if scenario == 'foreign_runs': self.report['runs'] = ['OTHER0000001']
                if scenario == 'wrong_fix': self.report['fixes'][0]['commit'] = self.base
                if scenario == 'wrong_fix_id': self.report['fixes'][0]['proposal_id'] = 'different-id'
                if scenario == 'unmerged':
                    row['commit'] = self.report['fixes'][0]['commit'] = 'f' * 40
                if scenario == 'waiting': row['state'] = 'waiting'
                if scenario == 'outside': self.report['report'] = str(self.root / 'report.md')
                if scenario == 'foreign_worktree': self.batch['worktree'] = str(self.live)
                if scenario == 'invalid_merge': self.report['merged'] = '--all'
                self.save_report()
                if scenario == 'changed_report': self.report['fixes'][0]['commit'] = self.base
                if scenario == 'missing_report': self.report_path.unlink()
                before = self.queue.read_bytes()
                with self.assertRaises((ValueError, OSError)):
                    self.resolve()
                self.assertEqual(self.queue.read_bytes(), before)

    def test_verifies_all_dispositions_before_appending_any(self):
        other = 'silent-proposal-second'
        self.report['code_proposals'].append(other)
        self.report['fixes'].append({'proposal_id': other, 'commit': self.source})
        self.report['proposal_results'].append({**self.report['proposal_results'][0], 'id': other})
        self.save_report()
        before = self.queue.read_bytes()
        with self.assertRaises(ValueError): self.resolve()
        self.assertEqual(self.queue.read_bytes(), before)

    def test_failure_preserves_live_merge_fact_and_original_registry(self):
        self.report['fixes'][0]['commit'] = self.base
        self.save_report()
        before = self.queue.read_bytes()
        with patch.object(checks, 'read_report', return_value=self.report), \
                patch.object(checks, 'proposal_tools', return_value=dispatch):
            checks.finish_write_batch('fixed', self.batch, 0, str(self.root), str(self.root),
                                      lambda *args: None, lambda *args: None, run_checks=False)
        self.assertEqual(self.batch['state'], 'failed')
        self.assertEqual(self.batch['merged'], self.source)
        self.assertTrue(self.batch['proposal_audit_errors'])
        self.assertEqual(self.queue.read_bytes(), before)

    def test_inflight_dispatched_waiting_cannot_reopen_verified_resolution(self):
        self.resolve()
        before = self.queue.read_bytes()
        assigned = {**self.batch, 'proposal_ids': [IDENT], 'key': 'active-dispatched-batch'}
        waiting = {'proposal_results': [{'id': IDENT, 'state': 'waiting', 'reason': 'Still lacks new evidence.'}]}
        dispatch.resolve(waiting, assigned, str(self.root), str(REPO / 'ops'))
        self.assertEqual(self.queue.read_bytes(), before)

    def test_legacy_empty_and_dispatched_strict_coverage_are_unchanged(self):
        self.assertEqual(dispatch.results({}, self.batch), [])
        assigned = {**self.batch, 'proposal_ids': [IDENT, 'another-proposal']}
        with self.assertRaises(ValueError): dispatch.results(self.report, assigned)

    def test_preserves_output_scope_when_markdown_has_equivalent_prose(self):
        self.report['proposal_results'][0]['reason'] = '限定范围的另一种表述，未知项仍保留。'
        self.resolve()
        self.assertEqual(proposals.fold(self.queue)[IDENT]['reason'], self.report['proposal_results'][0]['reason'])

    def narrow_publication(self):
        # Reproduce 20261018-011241: prose fixes, source_commit and a different live commit.
        self.git(self.live, 'reset', '--hard', self.base)
        (self.live / 'record.txt').write_text('unrelated preserved record')
        self.git(self.live, 'add', 'record.txt')
        self.git(self.live, 'commit', '-qm', 'Independent live history')
        self.git(self.live, 'cherry-pick', self.source)
        published = self.git(self.live, 'rev-parse', 'HEAD')
        self.assertNotEqual(published, self.source)
        self.report.update(source_commit=self.source, merged=published, fixes=['原限定来源的窄合提交。'])
        self.report.pop('runs')
        self.report.pop('base')
        self.report['proposal_results'][0]['commit'] = published
        self.save_report()
        proof = checks.descriptive_publication(self.report, self.batch, self.root, self.live)
        log = self.root / 'ops/codex-ops/learner/fixed.checks.log'
        log.parent.mkdir(parents=True)
        log.write_text('Fixed successful host receipt; no real test runner or game.\n')
        self.batch['fallback_checks'] = [{'rc': 0, 'tree': self.git(self.live, 'rev-parse', 'HEAD^{tree}'),
                                          'source_publications': [proof], 'commits': [published], 'log': str(log)}]
        return published

    def test_resolves_narrow_publication_without_inventing_source_ancestry(self):
        published = self.narrow_publication()
        before_batch, before_report = copy.deepcopy(self.batch), self.report_path.read_bytes()
        self.resolve()
        item = proposals.fold(self.queue)[IDENT]
        self.assertEqual((item['state'], item['commit']), ('implemented', published))
        proof = item['resolution_publication']
        self.assertEqual(proof['publication']['source'], self.source)
        self.assertEqual(proof['publication']['published'], published)
        self.assertEqual(proof['host_log_sha256'], hashlib.sha256(Path(proof['host_log']).read_bytes()).hexdigest())
        self.assertEqual((item['seen_runs'], item['batch']), (7, 'active-dispatched-batch'))
        self.assertEqual(self.batch, before_batch)
        self.assertEqual(self.report_path.read_bytes(), before_report)
        raw = self.queue.read_bytes()
        self.resolve()
        self.assertEqual(self.queue.read_bytes(), raw)

    def test_rejects_narrow_publication_without_matching_host_receipt(self):
        self.narrow_publication()
        original = copy.deepcopy(self.batch['fallback_checks'])
        for change in ({'rc': 1}, {'rc': False}, {'tree': self.base}, {'commits': [self.source]},
                       {'source_publications': []}, {'log': str(self.root / 'missing.log')}):
            with self.subTest(change=change):
                self.batch['fallback_checks'] = [{**original[0], **change}]
                before = self.queue.read_bytes()
                with self.assertRaises(ValueError): self.resolve()
                self.assertEqual(self.queue.read_bytes(), before)
        self.batch['fallback_checks'] = []
        with self.assertRaises(ValueError): self.resolve()

    def test_rejects_narrow_source_or_live_drift_before_any_resolution(self):
        self.narrow_publication()
        for tree in (self.tree, self.live):
            path = tree / 'fixed.txt'
            original = path.read_bytes()
            path.write_text('changed source')
            before = self.queue.read_bytes()
            with self.assertRaises(ValueError): self.resolve()
            self.assertEqual(self.queue.read_bytes(), before)
            path.write_bytes(original)
        self.git(self.live, 'commit', '--allow-empty', '-qm', 'Later host input')
        (self.live / 'agent').mkdir()
        (self.live / 'agent/untracked.txt').write_text('not an executable leaf')
        (self.live / 'fixed.txt').chmod(0o755)
        with self.assertRaises(ValueError): self.resolve()

    def test_rejects_narrow_registration_report_and_proposal_identity_changes(self):
        self.narrow_publication()
        good = copy.deepcopy(self.report)
        for scenario in ('runs', 'source', 'commit', 'another_id', 'markdown'):
            with self.subTest(scenario=scenario):
                self.report = copy.deepcopy(good)
                if scenario == 'runs': self.report['runs'] = ['OTHER0000001']
                if scenario == 'source': self.report['source_commit'] = self.base
                if scenario == 'commit': self.report['proposal_results'][0]['commit'] = self.source
                if scenario == 'another_id': self.report['code_proposals'].append('silent-proposal-another')
                self.save_report()
                if scenario == 'markdown': self.report['source_commit'] = self.base
                before = self.queue.read_bytes()
                with self.assertRaises(ValueError): self.resolve()
                self.assertEqual(self.queue.read_bytes(), before)
        self.report = copy.deepcopy(good)
        self.save_report()
        original = Path(self.item['proposal'])
        original.write_text('changed registered proposal')
        before = self.queue.read_bytes()
        with self.assertRaises(ValueError): self.resolve()
        self.assertEqual(self.queue.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
