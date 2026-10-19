"""Fixed mechanical migration checks; no game or inference calls."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('catalog', Path(__file__).with_name('build-catalog.py'))
CAT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CAT)

class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'knowledge'
        self.write('common/monster-db.json', {'meta': {'unknown': True}, 'monsters': {'ENEMY': {'hp_by_asc': {'10': [535]}, 'provenance': {'n_runs': 2}}, 'unknown': None}})
        self.write('common/move-model.json', {'ENEMY': {'next': {'A': {'B': 1}}, 'damage': {'A': 4}}, '_unknown': {'retain': True}})
        self.write('characters/silent/experience.json', {'entries': [{'id': 'local', 'scope': {'asc': 10}, 'n_support': 3, 'evidence': ['ABCDEFGHIJKL F17 T2']}]})
    def write(self, name, obj):
        p = self.root / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(obj, ensure_ascii=False))
    def test_preserves_sources_and_payloads_and_is_idempotent(self):
        original = {p: p.read_bytes() for p in self.root.rglob('*.json')}
        first = CAT.build(self.root)
        self.assertTrue(first['original_source_bytes_unchanged'])
        self.assertEqual(original, {p: p.read_bytes() for p in original})
        doc = json.loads((self.root / 'common/enemies/ENEMY/mechanics-observed.json').read_text())
        self.assertEqual(doc['payload'], json.loads(original[self.root / 'common/monster-db.json'])['monsters']['ENEMY'])
        frozen = {p: p.read_bytes() for p in self.root.rglob('*.json')}
        second = CAT.build(self.root)
        self.assertEqual(first['catalog_sha256'], second['catalog_sha256'])
        self.assertEqual(second['new_curated_stubs'], 0)
        self.assertEqual(frozen, {p: p.read_bytes() for p in frozen})
        catalog = json.loads((self.root / 'catalog.json').read_text())
        self.assertEqual(catalog['sources']['characters/silent/experience.json']['source_character'], 'silent')
        self.assertNotIn('n_support', catalog)
        metadata = json.loads((self.root / 'common/enemies/_legacy-meta.json').read_text())
        self.assertEqual(metadata['views']['monster-db.json']['container_fields'], {'unknown': None})
    def test_curator_edit_survives_rebuild(self):
        CAT.build(self.root)
        p = self.root / 'common/enemies/ENEMY/mechanics.json'
        self.write('common/enemies/ENEMY/mechanics.json', {'rules': [{'scope': {'asc': 10}, 'unknown': True}]})
        original = p.read_bytes()
        CAT.build(self.root)
        self.assertEqual(original, p.read_bytes())
    def test_rejects_alias_source(self):
        outside = Path(self.temp.name) / 'outside.json'
        outside.write_text('{}')
        (self.root / 'common/alias.json').symlink_to(outside)
        with self.assertRaises(ValueError): CAT.build(self.root)
        self.assertFalse((self.root / 'catalog.json').exists())
    def test_escaped_ids_cannot_collide_with_literal_ids(self):
        self.assertNotEqual(CAT.encoded("/"), CAT.encoded("id-Lw"))
        self.assertNotEqual(CAT.encoded("/"), CAT.encoded("~Lw"))
        self.assertNotIn("/", CAT.encoded("../outside"))
    def test_malformed_source_not_published(self):
        (self.root / 'common/monster-db.json').write_text('{bad')
        with self.assertRaises(json.JSONDecodeError): CAT.build(self.root)
        self.assertFalse((self.root / 'catalog.json').exists())

if __name__ == '__main__': unittest.main()
