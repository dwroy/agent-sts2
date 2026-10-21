"""Fixed offline cache, provenance and bounded ops-refresh regressions."""
import base64
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


builder = module('open_book_test_builder', ROOT / 'knowledge/builders/build-open-book.py')
refresh = module('open_book_test_refresh', ROOT / 'ops/open_book_refresh.py')


class OpenBookTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def request(self, ident='ABRASIVE'):
        path = self.root / f'data/external/open-book/pending/cards-{ident}.json'
        builder.save(path, {'schema': 'open-book-missing-v1', 'kind': 'cards', 'id': ident, 'game_version': builder.VERSION})
        return path

    def stub_builder(self):
        path = self.root / 'knowledge/builders/build-open-book.py'
        path.parent.mkdir(parents=True)
        # Only the adapter is synthetic; tick, receipt handling and overlay paths are production code.
        path.write_text('''import json
REV = "fixed-reviewed-revision"
VERSION = "v0.111.0"
KINDS = ("cards", "relics", "monsters", "events")
def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value))
def build(root, network=False, output=None):
    assert network is True
    assert output == root / "data/external/open-book/catalog/knowledge"
    save(output / "common/open-book.json", {"entries": [{"kind": "cards", "id": "ABRASIVE"}]})
    return [{"kind": "cards", "id": "ABRASIVE"}]
''')
        return self.root / 'data/external/open-book/receipts/fixed-reviewed-revision'

    def test_existing_source_is_never_downloaded_again(self):
        (self.root / 'fixed.json').write_text('[{"id":"A"}]')
        with patch.object(builder.urllib.request, 'urlopen', side_effect=AssertionError('network forbidden')):
            first, a = builder.cached(self.root, 'fixed.json', 'https://example.invalid/fixed', True)
            second, b = builder.cached(self.root, 'fixed.json', 'https://example.invalid/fixed', False)
        self.assertEqual(first, second)
        self.assertEqual(a, b)
        self.assertEqual(a['sha256'], builder.sha((self.root / 'fixed.json').read_bytes()))

    def test_license_mismatch_fails_before_sources_or_output(self):
        builder.save(self.root / 'data/external/spire-codex/license.json', {'content': base64.b64encode(b'changed terms').decode()})
        with patch.object(builder.urllib.request, 'urlopen', side_effect=AssertionError('network forbidden')):
            with self.assertRaisesRegex(RuntimeError, 'license differs'):
                builder.build(self.root, network=True)
        self.assertFalse((self.root / 'knowledge').exists())

    def test_event_filter_removes_story_and_art(self):
        row = {'id': 'FIXED_EVENT', 'name': 'Fixed', 'description': 'long story', 'image': 'art.png',
               'options': [{'id': 'LEAVE', 'title': 'Leave', 'description': 'Lose 1 HP.', 'story': 'private narrative'}],
               'pages': [{'id': 'NEXT', 'description': 'long narrative', 'options': [{'id': 'OK', 'description': 'Gain 2 gold.'}]}]}
        normalized = builder.normalize('events', row, row, ['events:eng'])
        self.assertEqual(normalized['facts']['options'][0]['description'], 'Lose 1 HP.')
        self.assertNotIn('story', json.dumps(normalized))
        self.assertNotIn('art.png', json.dumps(normalized))
        self.assertNotIn('narrative', json.dumps(normalized))

    def test_running_game_defers_without_consuming_request(self):
        receipts = self.stub_builder()
        path = self.request()
        with patch.object(refresh, 'playing', return_value=True):
            self.assertEqual(refresh.tick(self.root)['status'], 'deferred-playing')
        self.assertFalse((receipts / path.name).exists())
        self.assertFalse((self.root / 'data/external/open-book/catalog').exists())

    def test_overlay_writeback_separates_available_from_unresolved_and_preserves_tracked_data(self):
        receipts = self.stub_builder()
        existing = self.root / 'knowledge/common/open-book.json'
        builder.save(existing, {'unchanged': True})
        original = existing.read_bytes()
        known, missing = self.request(), self.request('MISSING')
        with patch.object(refresh, 'playing', return_value=False):
            self.assertEqual(refresh.tick(self.root), {'status': 'checked', 'checked': 2, 'available': 1, 'unresolved': 1})
            self.assertEqual(refresh.tick(self.root)['status'], 'empty-or-already-checked')
        self.assertEqual(existing.read_bytes(), original)
        self.assertEqual(json.loads((receipts / known.name).read_text())['status'], 'available')
        self.assertEqual(json.loads((receipts / missing.name).read_text())['status'], 'unresolved-in-reviewed-snapshot')

    def test_completed_first_batch_cannot_starve_later_ids_and_bad_json_does_not_block(self):
        receipts = self.stub_builder()
        for i in range(256):
            path = self.request(f'A{i:03}')
            builder.save(receipts / path.name, {'status': 'available'})
        self.request()
        invalid = self.request('BAD_JSON')
        invalid.write_text('[')
        with patch.object(refresh, 'playing', return_value=False):
            result = refresh.tick(self.root)
        self.assertEqual(result['available'], 1)
        self.assertEqual(result['checked'], 1)
        self.assertEqual(json.loads((receipts / invalid.name).read_text())['status'], 'invalid-request')


if __name__ == '__main__':
    unittest.main()
