"""Frozen manual research fixtures; no engines, production state or gameplay facts."""
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
RUN = 'SILENT000001'
OTHER = 'SILENT000002'
SECTIONS = ['size_outcome', 'marginal_value', 'construction_guidance', 'counterexamples', 'limitations']


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, REPO / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


dispatch = load('research_dispatch', 'ops/proposal_dispatch.py')
checks = load('research_checks', 'ops/learner_checks.py')


class StrategyResearch(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.batch_id = '20261010-130001-strategy-proposal'
        self.tree = self.root / '.worktrees/codex-strategy-silent-20261010-130001'
        self.tree.mkdir(parents=True)
        self.git('init', '-q')
        (self.tree / '.gitignore').write_text('learner/runs/\n')
        (self.tree / 'fixed.txt').write_text('Fixed baseline; no gameplay facts.\n')
        self.git('add', '.gitignore', 'fixed.txt')
        self.git('commit', '-q', '-m', 'Fixed research fixture')
        self.base = self.git('rev-parse', 'HEAD')
        self.report_path = self.write(self.tree / 'learner/runs/research/report.md', 'Fixed research report.\n')
        self.spec_path = self.write(self.root / 'paper/materials/fixed/task.md', 'Authorized fixture objective.\n')
        self.manifest_path = self.root / 'paper/materials/fixed/input.json'
        self.manifest = {'request_id': 'roy-fixed-research', 'character': 'silent',
                         'runs': [{'run_id': RUN}, {'run_id': OTHER}], 'log_byte_limits': {'runs.jsonl': 100}}
        self.write_json(self.manifest_path, self.manifest)
        self.request_path = self.root / 'notes/strategy-research-silent.json'
        self.request = {'request_id': self.manifest['request_id'], 'authorized_by': 'Roy', 'state': 'running',
                        'task': 'strategy-proposal', 'character': 'silent', 'batch': self.batch_id,
                        'dispatch_base': self.base,
                        'dispatch_runs': [RUN], 'required_sections': SECTIONS,
                        'work_spec': str(self.spec_path), 'work_spec_sha256': self.digest(self.spec_path),
                        'input_manifest': str(self.manifest_path), 'input_manifest_sha256': self.digest(self.manifest_path)}
        self.write_json(self.request_path, self.request)
        self.batch = {'task': 'strategy-proposal', 'character': 'silent', 'state': 'running', 'reason': 'ops',
                      'runs': [RUN], 'worktree': str(self.tree), 'proposal_policy': 'Roy-2026-10-07-learning'}
        self.report = {'task': 'strategy-proposal', 'character': 'silent', 'batch': self.batch_id,
                       'base': self.base, 'fixes': [], 'merged': None, 'report': str(self.report_path),
                       'request_id': self.request['request_id'], 'input_sha256': self.request['input_manifest_sha256'],
                       'research_complete': True, 'coverage': {key: True for key in SECTIONS},
                       'objective_conclusions': 'Fixed fixture conclusion, not gameplay knowledge.',
                       'limitations': ['Fixture evidence only.'], 'evidence_runs': [RUN, OTHER], 'runs': [RUN],
                       'covered_runs': [RUN, OTHER], 'exclusions': [],
                       'tests': {'tsc': None, 'vitest': None, 'cases': None},
                       'code_proposals': [], 'implementation_domains': []}

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.tree), *args], text=True, stderr=subprocess.DEVNULL).strip()

    def write(self, path, value):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value)
        return path

    def write_json(self, path, value):
        return self.write(path, json.dumps(value) + '\n')

    def digest(self, path):
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def accept(self, report=None, batch=None):
        return dispatch.no_change(self.report if report is None else report,
                                  self.batch if batch is None else batch, str(self.root))

    def test_bound_clean_report_is_accepted_with_frozen_proof(self):
        proof = self.accept()
        self.assertIsNotNone(proof)
        self.assertEqual(proof['research']['request_id'], self.request['request_id'])
        self.assertEqual(proof['research']['input_sha256'], self.digest(self.manifest_path))
        self.assertEqual(proof['research']['report_sha256'], self.digest(self.report_path))
        self.assertEqual(proof['dispositions'], [])
        self.assertIsNotNone(self.accept(report={**self.report, 'covered_runs': [RUN], 'evidence_runs': [RUN],
            'exclusions': [{'run_id': OTHER, 'reason': 'Fixed evidence unavailable.'}]}))
        self.assertIsNotNone(self.accept(report={**self.report, 'covered_runs': [], 'evidence_runs': [],
            'objective_conclusions': 'No fixture evidence available; no gameplay conclusion.',
            'exclusions': [{'run_id': run, 'reason': 'Fixed evidence unavailable.'} for run in (RUN, OTHER)]}))
        self.write_json(self.request_path, {**self.request, 'work_spec': 'paper/materials/fixed/task.md',
                                           'input_manifest': 'paper/materials/fixed/input.json'})
        self.assertIsNotNone(self.accept())

    def test_request_and_batch_identity_mismatches_are_rejected(self):
        original = copy.deepcopy(self.request)
        for update in ({'authorized_by': 'Other'}, {'state': 'pending', 'batch': None},
                       {'batch': '20261010-130002-strategy-proposal'}, {'character': 'ironclad'},
                       {'task': 'fix-batch'}, {'dispatch_runs': [OTHER]}, {'dispatch_runs': [RUN, RUN]},
                       {'required_sections': []}, {'required_sections': [SECTIONS[0], SECTIONS[0]]},
                       {'request_id': ''}, {'dispatch_runs': 'not-an-array'},
                       {'dispatch_base': None}, {'dispatch_base': self.base[:7]}, {'dispatch_base': '0' * 40}):
            with self.subTest(update=update):
                self.write_json(self.request_path, {**original, **update})
                self.assertIsNone(self.accept())
        self.write_json(self.request_path, original)
        for update in ({'reason': 'tick'}, {'proposal_ids': []}, {'proposal_repair': None},
                       {'character': 'ironclad'}, {'task': 'fix-batch'}, {'runs': [OTHER]},
                       {'worktree': None}, {'worktree': 123}, {'worktree': ''}, {'worktree': '.worktrees/relative'}):
            with self.subTest(update=update):
                self.assertIsNone(self.accept(batch={**self.batch, **update}))

    def test_report_identity_coverage_evidence_and_null_tests_are_required(self):
        updates = ({'request_id': 'other'}, {'batch': 'other'}, {'character': 'ironclad'},
                   {'task': 'fix-batch'}, {'research_complete': 1}, {'input_sha256': 'f' * 64},
                   {'coverage': {SECTIONS[0]: True}}, {'coverage': {key: 1 for key in SECTIONS}},
                   {'evidence_runs': ['FOREIGN00001']}, {'evidence_runs': [RUN, RUN]}, {'covered_runs': []},
                   {'runs': [OTHER]}, {'objective_conclusions': ''}, {'limitations': []},
                   {'covered_runs': [RUN]}, {'covered_runs': [RUN, RUN]},
                   {'exclusions': [{'run_id': OTHER, 'reason': 'Overlaps covered evidence.'}]},
                   {'covered_runs': [RUN], 'exclusions': [{'run_id': OTHER, 'reason': ''}]},
                   {'covered_runs': [RUN], 'exclusions': [{'run_id': OTHER, 'reason': 'Fixed missing data.'}]},
                   {'base': self.base[:7]}, {'fixes': [{'commit': self.base}]}, {'merged': self.base},
                   {'tests': {'tsc': 0, 'vitest': 0, 'cases': 0}})
        for update in updates:
            with self.subTest(update=update):
                self.assertIsNone(self.accept(report={**self.report, **update}))

    def test_input_and_spec_actual_sha_role_and_paths_are_checked(self):
        original = copy.deepcopy(self.request)
        for update in ({'input_manifest_sha256': '0' * 64}, {'work_spec_sha256': '0' * 64},
                       {'input_manifest': '/tmp/foreign-input.json'}, {'work_spec': '/tmp/foreign-task.md'}):
            with self.subTest(update=update):
                self.write_json(self.request_path, {**original, **update})
                self.assertIsNone(self.accept())
        for update in ({'request_id': 'other'}, {'character': 'ironclad'}, {'runs': [{'run_id': 'bad'}]},
                       {'runs': [{'run_id': RUN, 'character': 'ironclad'}]},
                       {'runs': [{'run_id': RUN}, {'run_id': RUN}]}):
            with self.subTest(update=update):
                self.write_json(self.manifest_path, {**self.manifest, **update})
                digest = self.digest(self.manifest_path)
                self.write_json(self.request_path, {**original, 'input_manifest_sha256': digest})
                self.assertIsNone(self.accept(report={**self.report, 'input_sha256': digest}))

    def test_report_path_escape_and_noncanonical_batch_tree_are_rejected(self):
        outside = self.write(self.root / 'outside.md', 'Preserved outside the dispatched tree.\n')
        alias = self.tree / 'learner/runs/research/alias.md'
        alias.symlink_to(outside)
        for path in (outside, alias, self.spec_path):
            with self.subTest(path=path):
                self.assertIsNone(self.accept(report={**self.report, 'report': str(path)}))
        self.assertIsNone(self.accept(batch={**self.batch, 'worktree': str(self.root / '.worktrees/live')}))

    def test_dirty_tree_or_changed_head_never_passes_as_pure_report(self):
        (self.tree / 'dirty.txt').write_text('Uncommitted source candidate.\n')
        self.assertIsNone(self.accept())
        (self.tree / 'dirty.txt').unlink()
        (self.tree / 'fixed.txt').write_text('Changed source.\n')
        self.git('add', 'fixed.txt')
        self.git('commit', '-q', '-m', 'Changed fixture source')
        self.assertIsNone(self.accept())
        self.write(self.tree / 'notes/fixed.md', 'Record-only fixture update.\n')
        self.git('add', 'notes/fixed.md')
        self.git('commit', '-q', '-m', 'Fixed record-only fast-forward')
        self.assertIsNotNone(self.accept(report={**self.report, 'base': self.git('rev-parse', 'HEAD')}))
        for path in ('ops/tests/fixed.py', 'tools/fixed.sh', 'agent/src/fixed.ts', 'knowledge/characters/other/fixed.json'):
            self.write(self.tree / path, 'Committed implementation fixture.\n')
            self.git('add', path)
            self.git('commit', '-q', '-m', 'Fixed implementation change')
            self.assertIsNone(self.accept(report={**self.report, 'base': self.git('rev-parse', 'HEAD')}))
            self.git('reset', '--hard', 'HEAD^')

    def test_legacy_manual_stays_rejected_and_queue_dispositions_keep_original_path(self):
        self.request_path.unlink()
        self.assertIsNone(self.accept())
        queued = {**self.batch, 'reason': 'proposal', 'proposal_ids': ['fixed-proposal']}
        report = {**self.report, 'research_complete': False,
                  'proposal_results': [{'id': 'fixed-proposal', 'state': 'waiting', 'reason': 'Fixed missing data.'}]}
        proof = self.accept(report=report, batch=queued)
        self.assertIsNotNone(proof)
        self.assertNotIn('research', proof)
        repaired = {**self.batch, 'reason': 'proposal', 'proposal_repair': 'old'}
        self.assertIsNone(self.accept(batch=repaired))
        self.assertIsNotNone(self.accept(report={**self.report, 'code_proposals': ['fixed-link']}, batch=repaired))

    def test_valid_research_finishes_done_with_event_without_fake_merge_checks_or_resolution(self):
        out = self.write(self.root / 'state/learner' / (self.batch_id + '.out'),
                         '```json\n' + json.dumps(self.report) + '\n```\n')
        notices, events = [], []
        request_before = self.request_path.read_bytes()
        with patch.object(checks, 'proposal_tools', return_value=dispatch):
            checks.finish_write_batch(self.batch_id, self.batch, 0, str(self.root), str(out.parent),
                                      lambda kind, message: events.append((kind, message)), notices.append)
        self.assertEqual(self.batch['state'], 'done')
        self.assertIsNone(self.batch['merged'])
        self.assertEqual(events[0][0], 'strategy-done')
        self.assertEqual(notices, [])
        self.assertNotIn('checks_pending', self.batch)
        self.assertNotIn('proposal_repair_needed', self.batch)
        self.assertEqual(self.request_path.read_bytes(), request_before)


if __name__ == '__main__':
    unittest.main()
