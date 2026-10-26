import fcntl
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("retention", Path(__file__).parents[1] / "learner_retention.py")
retention = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(retention)


class LearnerRetention(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.directory = self.root / 'ops/codex-ops'
        self.directory.mkdir(parents=True)
        self.bid = '20261013-010000-fix-batch'
        self.tree = self.root / '.worktrees/codex-fix-silent-20261013-010000'
        self.live = self.root / '.worktrees/live'
        self.git('init', '-b', 'main')
        (self.root / '.gitignore').write_text('learner/runs/\nops/codex-ops/\nops/live-merge.lock\n.worktrees/\nlogs/\n')
        (self.root / 'README.md').write_text('fixture source\n')
        (self.root / 'notes').mkdir()
        (self.root / 'notes/lessons.md').write_text('## AAAAAAAAAAAA\nfixture\n')
        exp = self.root / 'knowledge/characters/silent/experience.json'
        exp.parent.mkdir(parents=True)
        exp.write_text(json.dumps({'version': 'fixture-1', 'entries': [{'id': 'learned', 'evidence': ['AAAAAAAAAAAA']}]}))
        self.git('add', '.')
        self.git('commit', '-m', 'fixed fixture')
        self.head = self.git('rev-parse', 'HEAD').strip()
        self.git('worktree', 'add', '-b', 'live', str(self.live))
        self.git('worktree', 'add', '-b', self.tree.name, str(self.tree))
        self.scratch = self.tree / 'learner/runs/20261013-010001-fix-batch'
        self.scratch.mkdir(parents=True)
        self.raw = b'reconstructible frozen process sample\n' * 18000
        (self.scratch / 'raw-states.jsonl').write_bytes(self.raw)
        (self.scratch / 'report.md').write_text('learned outcome and source evidence\n')
        (self.scratch / 'proposal.md').write_text('original proposal remains at its path\n')
        (self.scratch / 'probe.json').write_text('{"observed": true}\n')
        self.original_stream = self.scratch.with_name(self.scratch.name + '.jsonl')
        self.original_stream.write_text('original launcher stream and accounting\n')
        learner = self.directory / 'learner'
        learner.mkdir()
        self.log = learner / (self.bid + '.checks.log')
        self.log.write_text('Test Files  1 passed (1)\nTests 2 passed (2)\n')
        self.report = {'task': 'fix-batch', 'commit': self.head, 'merged': self.head, 'fixes': [], 'report': str(self.scratch / 'report.md')}
        self.batch = {'task': 'fix-batch', 'state': 'done', 'rc': 0, 'character': 'silent', 'worktree': str(self.tree),
                      'runs': [], 'checks': {'rc': 0, 'merged': self.head, 'log': str(self.log)}}
        self.state = {'batches': {self.bid: self.batch}}
        self.save()
        (self.root / 'logs').mkdir()
        (self.root / 'logs/states.jsonl').write_text('primary original evidence\n')

    def git(self, *args):
        result = subprocess.run(['git', '-C', str(self.root), *args], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def save(self):
        retention.atomic(self.directory / 'learn.json', self.state)
        (self.directory / 'learner' / (self.bid + '.out')).write_text('```json\n' + json.dumps(self.report) + '\n```\n')

    def run_cleanup(self, apply=True):
        return retention.reclaim(self.root, self.directory, self.bid, apply)

    def test_published_source_reclaims_copies_and_restores_exact_bytes_and_branch(self):
        plan = self.run_cleanup(False)
        self.assertEqual(plan['state'], 'eligible')
        self.assertTrue((self.scratch / 'raw-states.jsonl').exists())
        result = self.run_cleanup()
        self.assertEqual(result['state'], 'reclaimed')
        self.assertFalse((self.tree / '.git').exists())
        self.assertFalse((self.scratch / 'raw-states.jsonl').exists())
        self.assertTrue((self.scratch / 'proposal.md').exists())
        self.assertEqual(self.git('rev-parse', self.tree.name).strip(), self.head)
        self.assertEqual((self.root / 'logs/states.jsonl').read_text(), 'primary original evidence\n')
        self.assertTrue(self.log.exists())
        self.assertEqual(self.original_stream.read_text(), 'original launcher stream and accounting\n')
        manifest = retention.load(self.directory / 'retention/archives' / (self.bid + '.manifest.json'))
        self.assertLess(manifest['archive_bytes'], len(self.raw) // 8)
        restored = retention.restore(self.root, self.directory, self.bid)
        self.assertEqual(restored['state'], 'scratch_restored')
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)
        self.assertEqual(self.git('-C', str(self.tree), 'rev-parse', 'HEAD').strip(), self.head)
        self.assertEqual(self.run_cleanup()['state'], 'reclaimed')

    def uuid_scratch(self):
        scratch = self.scratch.with_name('20261013-010001-01e4191f-d865-4ede-96cc-6135ca85542b-fix-batch')
        self.scratch.rename(scratch)
        self.original_stream.rename(scratch.with_name(scratch.name + '.jsonl'))
        self.scratch = scratch
        self.original_stream = scratch.with_name(scratch.name + '.jsonl')
        self.report['report'] = str(scratch / 'report.md')
        self.save()

    def test_numeric_uuid_scratch_reclaims_and_restores_verified_bytes(self):
        self.uuid_scratch()
        self.assertEqual(self.run_cleanup()['state'], 'reclaimed')
        self.assertTrue((self.scratch / 'report.md').exists())
        self.assertTrue(self.original_stream.exists())
        retention.restore(self.root, self.directory, self.bid)
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)
        for name in ['20261013-010001-123-fix-batch',
                     '20261013-010001-01e4191f-d865-4ede-96cc-6135ca85542b',
                     '20261013-010001-01e4191f-d865-4ede-96cc-6135ca85542x-fix-batch']:
            self.assertIsNone(retention.SCRATCH.fullmatch(name))

    def test_numeric_uuid_keeps_publication_active_owner_and_path_guards(self):
        self.uuid_scratch()
        self.report['commit'] = 'a' * 40
        self.save()
        with self.assertRaisesRegex(ValueError, 'not published'):
            retention.admission(self.root, self.directory, self.state, self.bid)
        self.report['commit'] = self.head
        self.save()
        with patch.object(retention, 'active_cwd', return_value=True):
            with self.assertRaisesRegex(ValueError, 'active process'):
                self.run_cleanup()
        self.report['report'] = str(self.root / 'learner/runs' / self.scratch.name / 'report.md')
        self.save()
        with self.assertRaisesRegex(ValueError, 'scratch ownership'):
            self.run_cleanup()
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)

    def test_unpublished_source_or_incomplete_check_is_retained(self):
        self.batch['state'] = 'failed'  # Historical rc=0 fallback still needs publication.
        self.save()
        self.log.write_text('Test running; truncated output')
        with self.assertRaisesRegex(ValueError, 'completion summary'):
            self.run_cleanup()
        self.log.write_text('Test Files 1 passed\n')
        self.report['commit'] = 'a' * 40
        self.save()
        with self.assertRaisesRegex(ValueError, 'not published'):
            self.run_cleanup()
        self.assertTrue((self.scratch / 'raw-states.jsonl').exists())

    def test_failed_lost_and_active_batches_are_not_deleted(self):
        for state, rc in [('failed', 1), ('lost', None), ('running', None), ('rejected', 0)]:
            self.batch.update(state=state, rc=rc)
            self.save()
            with self.assertRaises(ValueError):
                self.run_cleanup()
        self.assertTrue((self.tree / '.git').exists())

    def test_legacy_done_report_compacts_without_accepting_source(self):
        self.report['fixes'] = ['historical natural-language fix']
        self.save()
        result = retention.sweep(self.root, self.directory, True, 4)
        self.assertEqual(result['results'][0]['state'], 'reclaimed')
        self.assertTrue((self.tree / '.git').exists())
        self.assertFalse((self.scratch / 'raw-states.jsonl').exists())
        manifest = retention.load(self.directory / 'retention/archives' / (self.bid + '.manifest.json'))
        self.assertTrue(manifest['proof']['no_acceptance_claim'])
        retention.restore(self.root, self.directory, self.bid)
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)

    def test_pending_report_data_does_not_consume_reclamation_limit(self):
        pending = ['20261013-02000' + str(i) + '-strategy-proposal' for i in range(4)]
        for ident in pending:
            self.state['batches'][ident] = {'task': 'strategy-proposal'}
        self.save()
        original = retention.reclaim

        def retain_pending(root, directory, ident, apply, state):
            if ident in pending:
                return {'batch': ident, 'state': 'retained-report'}
            return original(root, directory, ident, apply, state)

        with patch.object(retention, 'reclaim', side_effect=retain_pending):
            for apply, expected in [(False, 'eligible'), (True, 'reclaimed')]:
                result = retention.sweep(self.root, self.directory, apply, 1)
                self.assertEqual([item['batch'] for item in result['results']], [self.bid])
                self.assertEqual(result['results'][0]['state'], expected)
                self.assertEqual(result['retained']['report-only scratch awaits experience ingestion'], 4)

    def test_original_thread_keeps_checkout_and_request_but_compacts_scratch(self):
        folder = self.root / 'notes/learning-requests'
        folder.mkdir()
        retention.atomic(folder / 'original.json', {'state': 'completed', 'original_batch': self.bid, 'worktree': str(self.tree)})
        self.assertEqual(self.run_cleanup()['state'], 'reclaimed')
        self.assertTrue((self.tree / '.git').exists())
        self.assertEqual(retention.load(folder / 'original.json')['state'], 'completed')
        retention.restore(self.root, self.directory, self.bid)
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)

    def test_learner_requests_cleanup_idempotently_and_full_admission_controls_deletion(self):
        with patch.object(retention, 'kick', return_value='started'):
            request = retention.request_cleanup(self.root, self.directory, self.bid)
            path = self.root / request['request']
            original = path.read_bytes()
            self.assertEqual(request['state'], 'pending_verification')
            self.assertEqual(retention.request_cleanup(self.root, self.directory, self.bid)['worker'], 'started')
            self.assertEqual(path.read_bytes(), original)
            self.assertTrue((self.tree / '.git').exists())
            self.batch['state'] = 'failed'
            self.save()
            self.log.write_text('unfinished check')
            retention.sweep(self.root, self.directory, True, 1)
            self.assertEqual(retention.load(path)['state'], 'deferred')
            self.assertTrue((self.scratch / 'raw-states.jsonl').exists())
            self.log.write_text('Test Files 1 passed\n')
            retention.sweep(self.root, self.directory, True, 1)
            self.assertEqual(retention.load(path)['state'], 'reclaimed')
            self.assertFalse((self.tree / '.git').exists())

    def test_unfinished_or_failed_exit_never_requests_self_cleanup(self):
        for state, rc in [('running', None), ('failed', 1), ('lost', 0)]:
            self.batch.update(state=state, rc=rc)
            self.save()
            with self.assertRaisesRegex(ValueError, 'no recorded successful exit'):
                retention.request_cleanup(self.root, self.directory, self.bid)
        self.assertFalse((self.directory / 'retention/requests').exists())

    def test_dirty_worktree_unknown_ignored_file_and_other_role_are_retained(self):
        (self.tree / 'README.md').write_text('uncommitted new source')
        with self.assertRaisesRegex(ValueError, 'dirty'):
            self.run_cleanup()
        (self.tree / 'README.md').write_text('fixture source\n')
        unknown = self.tree / 'learner/runs/another-owner.bin'
        unknown.write_bytes(b'unknown owner')
        with self.assertRaisesRegex(ValueError, 'outside bound scratch'):
            retention.admission(self.root, self.directory, self.state, self.bid)
        unknown.unlink()
        self.batch['character'] = 'ironclad'
        self.save()
        with self.assertRaisesRegex(ValueError, 'other-character'):
            retention.admission(self.root, self.directory, self.state, self.bid)

    def test_symlink_and_secret_named_file_are_never_read_or_deleted(self):
        link = self.scratch / 'alias.jsonl'
        link.symlink_to(self.root / 'logs/states.jsonl')
        with self.assertRaisesRegex(ValueError, 'symlink'):
            self.run_cleanup()
        link.unlink()
        protected = self.scratch / '.env'
        protected.write_text('opaque test sentinel')
        with patch.object(retention, 'sha_file', side_effect=AssertionError('no protected reads')):
            with self.assertRaisesRegex(ValueError, 'credential-named'):
                self.run_cleanup()
        self.assertTrue(protected.exists())

    def test_leases_capacity_and_archive_corruption_prevent_unsafe_cleanup(self):
        lease = self.directory / 'learner' / (self.tree.name + '.lock')
        with lease.open('a') as handle:
            fcntl.flock(handle, fcntl.LOCK_EX)
            with self.assertRaises(BlockingIOError):
                self.run_cleanup()
        usage = retention.shutil.disk_usage(self.root)
        with patch.object(retention.shutil, 'disk_usage', return_value=usage._replace(free=0)):
            with self.assertRaisesRegex(ValueError, 'staging capacity'):
                self.run_cleanup()
        self.run_cleanup()
        archive = self.directory / 'retention/archives' / (self.bid + '.tar.gz')
        with archive.open('ab') as handle:
            handle.write(b'corrupted fixture archive')
        with self.assertRaisesRegex(ValueError, 'archive hash'):
            retention.restore(self.root, self.directory, self.bid)

    def test_report_only_compacts_scratch_and_restores_checkout(self):
        self.report.update(commit=None, merged=None)
        self.save()
        result = self.run_cleanup()
        self.assertEqual(result['state'], 'reclaimed')
        self.assertFalse((self.tree / '.git').exists())
        self.assertFalse((self.scratch / 'raw-states.jsonl').exists())
        self.assertEqual(retention.restore(self.root, self.directory, self.bid)['state'], 'scratch_restored')
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)

    def test_postmortem_requires_experience_ingestion_and_not_just_a_done_report(self):
        self.bid = '20261013-020000'
        self.batch = {'state': 'done', 'rc': 0, 'character': 'silent', 'runs': ['AAAAAAAAAAAA']}
        self.scratch = self.root / 'learner/runs/20261013-020001-postmortem'
        self.scratch.mkdir(parents=True)
        (self.scratch / 'report.md').write_text('postmortem report')
        (self.scratch / 'raw.jsonl').write_bytes(self.raw)
        self.report = {'task': 'postmortem', 'appended': ['AAAAAAAAAAAA'], 'bugs': [], 'report': str(self.scratch / 'report.md')}
        self.state = {'batches': {self.bid: self.batch}}
        self.save()
        with self.assertRaisesRegex(ValueError, 'not entered'):
            retention.admission(self.root, self.directory, self.state, self.bid)
        self.state['batches']['experience'] = {'task': 'experience-update', 'character': 'silent',
                                              'checks': {'rc': 0, 'merged': self.head, 'log': str(self.log)}}
        self.log.write_text('check started but no completion summary')
        self.save()
        with self.assertRaisesRegex(ValueError, 'not entered'):
            retention.admission(self.root, self.directory, self.state, self.bid)
        self.log.write_text('Test Files 1 passed\n')
        self.save()
        self.assertEqual(self.run_cleanup()['state'], 'reclaimed')
        self.assertFalse((self.scratch / 'raw.jsonl').exists())
        self.assertTrue((self.root / '.git').exists())


if __name__ == '__main__':
    unittest.main()
