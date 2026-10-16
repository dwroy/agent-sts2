import json
import unittest
from unittest.mock import patch

import test_learner_retention as fixtures

retention = fixtures.retention


class LegacyRetention(fixtures.LearnerRetention):
    def legacy_fixture(self):
        self.bid = '20261007-052654-experience-update'
        scratch = self.root / 'learner/runs' / self.bid
        scratch.parent.mkdir(parents=True)
        self.scratch.rename(scratch)
        self.original_stream.unlink()
        self.scratch = scratch
        tree = self.root / '.worktrees/exp'
        self.git('worktree', 'move', str(self.tree), str(tree))
        self.tree = tree
        self.original_stream = scratch.with_suffix('.jsonl')
        self.thread = '01a1131c-c66e-77f2-8098-baa45f17d82a'
        self.launch = {'type': 'learner_launch', 'task': 'experience-update', 'cwd': str(tree), 'params': {
            'worktree': str(tree), 'scratch': str(scratch), 'project_root': str(self.root), 'character': 'silent',
            'merge': 'live', 'merge_dir': str(self.live), 'runs': 'AAAAAAAAAAAA'}}
        self.write_event()
        self.report = {'task': 'experience-update', 'commit': self.head, 'merged': self.head,
                       'version': 'fixture-1', 'tests': {'tsc': 0, 'vitest': 0, 'cases': 2}}
        (scratch / 'report.json').write_text(json.dumps(self.report))
        (scratch / 'commit.txt').write_text(self.head + '\n')
        self.batch.update(task='experience-update', worktree=str(tree), runs=['AAAAAAAAAAAA'])
        self.state = {'batches': {self.bid: self.batch}}
        self.save()
        self.output = self.directory / 'learner' / (self.bid + '.out')
        with self.output.open('a') as handle:
            handle.write('会话：' + self.thread + '\n日志：' + str(self.original_stream) + '\n')

    def write_event(self):
        self.original_stream.write_text(json.dumps(self.launch) + '\n' + json.dumps({
            'type': 'thread.started', 'thread_id': self.thread}) + '\n')

    def save_state(self):
        retention.atomic(self.directory / 'learn.json', self.state)

    def test_legacy_root_scratch_archives_and_restores_without_retiring_shared_tree(self):
        self.legacy_fixture()
        event, output = self.original_stream.read_bytes(), self.output.read_bytes()
        # The original final answer shortened descriptive text; identity fields remain exact.
        saved = dict(self.report, mechanisms=['longer original description'])
        (self.scratch / 'report.json').write_text(json.dumps(saved))
        self.assertEqual(self.run_cleanup()['state'], 'reclaimed')
        self.assertTrue((self.tree / '.git').exists())
        self.assertFalse((self.scratch / 'raw-states.jsonl').exists())
        self.assertEqual(self.original_stream.read_bytes(), event)
        self.assertEqual(self.output.read_bytes(), output)
        self.assertEqual(retention.load(self.scratch / 'report.json'), saved)
        manifest = retention.load(self.directory / 'retention/archives' / (self.bid + '.manifest.json'))
        binding = manifest['proof']['legacy_binding']
        self.assertEqual(binding['thread'], self.thread)
        self.assertEqual(binding['launch_sha256'], retention.hashlib.sha256(event.splitlines(keepends=True)[0]).hexdigest())
        retention.restore(self.root, self.directory, self.bid)
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)

    def test_legacy_rejects_foreign_launch_thread_and_report_sources(self):
        self.legacy_fixture()
        original = json.loads(json.dumps(self.launch))
        for key, value in [('character', 'ironclad'), ('worktree', str(self.root)), ('scratch', str(self.root)),
                           ('project_root', str(self.tree)), ('merge_dir', str(self.tree)), ('runs', 'BBBBBBBBBBBB')]:
            with self.subTest(key=key):
                self.launch = json.loads(json.dumps(original))
                self.launch['params'][key] = value
                self.write_event()
                with self.assertRaisesRegex(ValueError, 'launch binding'):
                    self.run_cleanup(False)
        for key, value in [('task', 'strategy-proposal'), ('cwd', str(self.root))]:
            with self.subTest(key=key):
                self.launch = json.loads(json.dumps(original))
                self.launch[key] = value
                self.write_event()
                with self.assertRaisesRegex(ValueError, 'launch binding'):
                    self.run_cleanup(False)
        self.launch = original
        self.write_event()
        original_output = self.output.read_text()
        for marker in ['会话：', '日志：']:
            self.output.write_text(original_output.replace(marker, 'quoted: '))
            with self.assertRaisesRegex(ValueError, 'thread/output binding'):
                self.run_cleanup(False)
        self.output.write_text(original_output)
        self.thread = '01a1131c-c66e-77f2-8098-baa45f17d82b'
        self.write_event()
        with self.assertRaisesRegex(ValueError, 'thread/output binding'):
            self.run_cleanup(False)
        self.thread = '01a1131c-c66e-77f2-8098-baa45f17d82a'
        self.write_event()
        (self.scratch / 'commit.txt').write_text('a' * 40)
        with self.assertRaisesRegex(ValueError, 'report/source binding'):
            self.run_cleanup(False)
        (self.scratch / 'commit.txt').write_text(self.head)
        (self.scratch / 'report.json').write_text(json.dumps(dict(self.report, commit='a' * 40)))
        with self.assertRaisesRegex(ValueError, 'report/source binding'):
            self.run_cleanup(False)
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)

    def test_legacy_requires_checks_ingestion_and_inactive_original_owner(self):
        self.legacy_fixture()
        self.assertEqual(self.run_cleanup(False)['state'], 'eligible')
        with patch.object(retention, 'active_cwd', return_value=True):
            with self.assertRaisesRegex(ValueError, 'active process'):
                self.run_cleanup()
        with patch.object(retention, 'active_cwd', side_effect=lambda path: path == self.tree):
            with self.assertRaisesRegex(ValueError, 'active process'):
                self.run_cleanup()
        self.state['batches']['other'] = {'state': 'running', 'worktree': str(self.tree)}
        self.save_state()
        with self.assertRaisesRegex(ValueError, 'active shared owner'):
            self.run_cleanup()
        del self.state['batches']['other']
        self.batch['learning_request'] = 'original-request'
        self.save_state()
        with self.assertRaisesRegex(ValueError, 'continuation/research'):
            self.run_cleanup()
        del self.batch['learning_request']
        self.batch['checks']['rc'] = 1
        self.save_state()
        with self.assertRaisesRegex(ValueError, 'not published'):
            self.run_cleanup()
        self.batch['checks']['rc'] = 0
        self.save_state()
        self.log.write_text('Test running; incomplete output')
        with self.assertRaisesRegex(ValueError, 'completion summary'):
            self.run_cleanup()
        self.log.write_text('Test Files 1 passed\n')
        self.batch['runs'] = ['BBBBBBBBBBBB']
        self.launch['params']['runs'] = 'BBBBBBBBBBBB'
        self.write_event()
        self.save_state()
        with self.assertRaisesRegex(ValueError, 'missing from published experience'):
            self.run_cleanup()
        self.assertTrue((self.scratch / 'raw-states.jsonl').exists())

    def test_legacy_rejects_symlinked_launch_and_detects_changed_proof_before_deletion(self):
        self.legacy_fixture()
        event_raw = self.original_stream.read_bytes()
        moved = self.scratch / 'original-event.jsonl'
        self.original_stream.rename(moved)
        self.original_stream.symlink_to(moved)
        with self.assertRaisesRegex(ValueError, 'symlink'):
            self.run_cleanup()
        self.original_stream.unlink()
        self.original_stream.write_bytes(event_raw)
        real_archive = retention.archive

        def changed_report(*args):
            result = real_archive(*args)
            with (self.scratch / 'report.json').open('a') as handle:
                handle.write('\n')
            return result

        with patch.object(retention, 'archive', side_effect=changed_report):
            with self.assertRaisesRegex(ValueError, 'owner changed before deletion'):
                self.run_cleanup()
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)


    def test_legacy_rechecks_tree_activity_after_archival(self):
        self.legacy_fixture()
        appeared = False
        real_archive = retention.archive

        def activate_after_archive(*args):
            nonlocal appeared
            result = real_archive(*args)
            appeared = True
            return result

        with patch.object(retention, 'archive', side_effect=activate_after_archive), patch.object(
                retention, 'active_cwd', side_effect=lambda path: appeared and path == self.tree):
            with self.assertRaisesRegex(ValueError, 'owner changed before deletion'):
                self.run_cleanup()
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)
        self.assertTrue(self.original_stream.exists())


if __name__ == '__main__':
    unittest.main()
