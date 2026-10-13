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
        (self.root / '.gitignore').write_text('learner/runs/\nops/codex-ops/\n.worktrees/\nlogs/\n')
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
        self.assertEqual(self.run_cleanup()['state'], 'already_reclaimed')

    def test_unpublished_source_or_incomplete_check_is_retained(self):
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

    def test_legacy_report_does_not_abort_sweep_or_delete_its_data(self):
        self.report['fixes'] = ['historical natural-language fix']
        self.save()
        result = retention.sweep(self.root, self.directory, True, 4)
        self.assertFalse(result['results'])
        self.assertEqual(result['retained']['legacy/malformed fixes report retained'], 1)
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)

    def test_original_thread_even_completed_is_protected(self):
        folder = self.root / 'notes/learning-requests'
        folder.mkdir()
        retention.atomic(folder / 'original.json', {'state': 'completed', 'original_batch': self.bid, 'worktree': str(self.tree)})
        with self.assertRaisesRegex(ValueError, 'original request/thread'):
            self.run_cleanup()

    def test_dirty_worktree_unknown_ignored_file_and_other_role_are_retained(self):
        (self.tree / 'README.md').write_text('uncommitted new source')
        with self.assertRaisesRegex(ValueError, 'dirty'):
            self.run_cleanup()
        (self.tree / 'README.md').write_text('fixture source\n')
        unknown = self.tree / 'learner/runs/another-owner.bin'
        unknown.write_bytes(b'unknown owner')
        with self.assertRaisesRegex(ValueError, 'outside bound scratch'):
            self.run_cleanup()
        unknown.unlink()
        self.batch['character'] = 'ironclad'
        self.save()
        with self.assertRaisesRegex(ValueError, 'other-character'):
            self.run_cleanup()

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

    def test_report_only_reclaims_checkout_but_keeps_pending_process_data(self):
        self.report.update(commit=None, merged=None)
        self.save()
        result = self.run_cleanup()
        self.assertEqual(result['state'], 'checkout_reclaimed')
        self.assertFalse((self.tree / '.git').exists())
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)
        self.assertEqual(retention.restore(self.root, self.directory, self.bid)['state'], 'checkout_restored')

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
            self.run_cleanup()
        self.state['batches']['experience'] = {'task': 'experience-update', 'character': 'silent',
                                              'checks': {'rc': 0, 'merged': self.head}}
        self.save()
        self.assertEqual(self.run_cleanup()['state'], 'reclaimed')
        self.assertFalse((self.scratch / 'raw.jsonl').exists())
        self.assertTrue((self.root / '.git').exists())


if __name__ == '__main__':
    unittest.main()
