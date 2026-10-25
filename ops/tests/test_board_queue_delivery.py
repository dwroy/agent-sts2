"""Fixed deliveries and complete kit fingerprints use isolated repositories only."""
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import board_queue_pin as pin
import board_queue_request as request


PROJECT = Path(__file__).resolve().parents[2]


class Delivery(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.env = patch.dict(os.environ, dict(GIT_AUTHOR_NAME='Fixed fixture', GIT_COMMITTER_NAME='Fixed fixture',
                             GIT_AUTHOR_EMAIL='fixture@localhost', GIT_COMMITTER_EMAIL='fixture@localhost'))
        self.env.start()
        self.addCleanup(self.env.stop)
        self.git('init', '-q', '-b', 'main')
        (self.root / 'notes').mkdir()
        (self.root / 'notes/original.md').write_text('fixed baseline\n')
        self.commit()
        self.git('checkout', '-q', '-b', 'delivery')

    def git(self, *args):
        return request.git(self.root, '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', *args)

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-q', '-m', 'fixture')
        return self.git('rev-parse', 'HEAD')

    def source(self):
        (self.root / 'ops').mkdir()
        (self.root / 'ops/fixture.py').write_text('answer = 42\n')
        return self.commit()

    def deliver(self, head, **extra):
        args = dict(ident='issue-68-r1', issue=68, head=head, head_ref='refs/heads/delivery',
                    priority=1, depends=[], report='fixed fixture report')
        args.update(extra)
        return request.delivery(self.root, **args)

    def test_fixed_source_is_prepared_without_submit_or_ref_change(self):
        head = self.source()
        before = self.git('for-each-ref')
        value = self.deliver(head, depends=['issue-66-r1'])
        self.assertEqual(value['head'], head)
        self.assertEqual(value['depends'], ['issue-66-r1'])
        self.assertEqual(request.write(self.root, '.state/request.json', value)['state'], 'prepared')
        self.assertEqual(request.write(self.root, '.state/request.json', value)['state'], 'existing')
        self.assertEqual(self.git('for-each-ref'), before)
        self.assertFalse((self.root / '.state/merge-queue').exists())

    def test_existing_different_delivery_is_retained_for_explicit_revision(self):
        value = self.deliver(self.source())
        request.write(self.root, '.state/request.json', value)
        original = (self.root / '.state/request.json').read_bytes()
        with self.assertRaises(ValueError):
            request.write(self.root, '.state/request.json', {**value, 'priority': 0})
        self.assertEqual((self.root / '.state/request.json').read_bytes(), original)

    def test_pure_runtime_data_and_proposal_records_do_not_enter_source_queue(self):
        (self.root / 'notes/proposal.md').write_text('unimplemented code proposal\n')
        (self.root / 'knowledge').mkdir()
        (self.root / 'knowledge/fixture.json').write_text('{"fixture":true}\n')
        with self.assertRaisesRegex(ValueError, 'runtime'):
            self.deliver(self.commit())

    def test_abbreviated_symbolic_moved_and_wrong_branch_heads_are_rejected(self):
        head = self.source()
        for value in (head[:8], 'HEAD', 'main'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.deliver(value)
        with self.assertRaises(ValueError):
            self.deliver(head, head_ref='refs/heads/main')
        (self.root / 'ops/fixture.py').write_text('answer = 43\n')
        self.commit()
        with self.assertRaises(ValueError):
            self.deliver(head)

    def test_invalid_dependency_and_priority_are_rejected_before_git(self):
        head = self.source()
        for change in (dict(depends=['issue-68-r1']), dict(depends=['same', 'same']),
                       dict(depends=['../escape']), dict(priority=True), dict(issue=True), dict(report='')):
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.deliver(head, **change)

    def test_paths_do_not_follow_symlinks_or_leave_project(self):
        target = self.root / 'notes/original.md'
        (self.root / 'alias').symlink_to(self.root / 'notes', target_is_directory=True)
        for name in ('alias/request.json', '../request.json', '/outside/request.json'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                request.write(self.root, name, dict(id='fixture'))
        self.assertEqual(target.read_text(), 'fixed baseline\n')


class KitPin(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / '.agents').mkdir()
        self.value = json.loads((PROJECT / '.agents/board-kit-pin.json').read_text())
        (self.root / '.agents/board-kit-pin.json').write_text(json.dumps(self.value))

    def fake_objects(self, argv, **kwargs):
        name = argv[-1].split(':', 1)[1]
        return ('fixed object ' + name).encode()

    def fixture_manifest(self):
        for name in self.value['files']:
            self.value['files'][name] = pin.sha(('fixed object ' + name).encode())
        (self.root / '.agents/board-kit-pin.json').write_text(json.dumps(self.value))

    def export(self):
        with patch.object(pin.subprocess, 'check_output', side_effect=self.fake_objects):
            return pin.export(self.root, '/unread-original-kit', '.state/new-kit')

    def test_export_reads_fixed_objects_and_verifies_every_module(self):
        self.fixture_manifest()
        result = self.export()
        self.assertTrue(result['verified'])
        self.assertEqual(result['commit'], self.value['commit'])
        self.assertEqual(pin.verify(self.root, '.state/new-kit'), result)

    def test_corrupt_object_does_not_create_staging_directory(self):
        with patch.object(pin.subprocess, 'check_output', return_value=b'corrupt'):
            with self.assertRaisesRegex(ValueError, 'fingerprint'):
                pin.export(self.root, '/unread-original-kit', '.state/new-kit')
        self.assertFalse((self.root / '.state/new-kit').exists())

    def test_existing_install_is_never_overwritten(self):
        self.fixture_manifest()
        self.export()
        before = (self.root / '.state/new-kit/board.py').read_bytes()
        with self.assertRaises(ValueError):
            self.export()
        self.assertEqual((self.root / '.state/new-kit/board.py').read_bytes(), before)

    def test_missing_modified_and_mixed_modules_are_rejected(self):
        self.fixture_manifest()
        self.export()
        kit = self.root / '.state/new-kit'
        for name in ('board.py', 'polling.py', 'conversation.py', 'queue_workspace.py'):
            original = (kit / name).read_bytes()
            (kit / name).unlink()
            with self.subTest(name=name), self.assertRaises(ValueError):
                pin.verify(self.root, '.state/new-kit')
            (kit / name).write_bytes(original + b'edited')
            with self.assertRaises(ValueError):
                pin.verify(self.root, '.state/new-kit')
            (kit / name).write_bytes(original)
        (kit / 'unexpected_adapter.py').write_text('# mixed install\n')
        with self.assertRaisesRegex(ValueError, 'mixed'):
            pin.verify(self.root, '.state/new-kit')

    def test_manifest_cannot_silently_drop_an_original_module(self):
        value = copy.deepcopy(self.value)
        del value['files']['conversation.py']
        (self.root / '.agents/board-kit-pin.json').write_text(json.dumps(value))
        with self.assertRaisesRegex(ValueError, 'complete'):
            pin.manifest(self.root)


if __name__ == '__main__':
    unittest.main()
