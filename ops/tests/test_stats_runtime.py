import json
from pathlib import Path
import tempfile
import subprocess
import unittest
from unittest.mock import patch
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import stats_runtime as control
import stats_refresh as refresh


class StatsRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.state = self.root / 'ops/codex-ops'
        self.state.mkdir(parents=True)
        self.path = self.state / 'stats-runtime.json'
        self.body = dict(schema=control.SCHEMA, root=str(self.root), enabled=True,
                         directory=str(self.root / 'data/stats'), backend='shadow',
                         methods={'outcome': 'a' * 64, 'catalog': 'b' * 64}, retired_git_data=False)

    def save(self):
        self.path.write_text(json.dumps(self.body))

    def test_control_is_explicit_and_rejects_unknown_fields_wrong_roots_links_and_paths(self):
        self.assertFalse(control.capture(self.root, self.state)['enabled'])
        self.save()
        first = control.capture(self.root, self.state)
        self.assertTrue(first['enabled'])
        self.assertEqual(first['control_sha256'], control.sha(self.path.read_bytes()))
        for key, value in [('extra', True), ('root', '/different-root'), ('enabled', 1),
                           ('directory', str(self.root / 'outside')), ('backend', 'fallback')]:
            original = self.body.copy()
            self.body[key] = value
            self.save()
            with self.assertRaises(ValueError):
                control.capture(self.root, self.state)
            self.body = original
        self.save()
        saved = self.path.with_name('saved.json')
        self.path.rename(saved)
        self.path.symlink_to(saved)
        with self.assertRaises(ValueError):
            control.capture(self.root, self.state)

    def test_queued_refresh_captures_original_control_and_rejects_changed_retry_options(self):
        self.save()
        with patch.dict('os.environ', {'CODEX_OPS_DIR': str(self.state)}):
            a = control.bind_refresh(self.root, self.root, 'request', {'all': True})
            self.body['enabled'] = False
            self.save()
            self.assertEqual(control.bind_refresh(self.root, self.root, 'request', {'all': True}), a)
            with self.assertRaises(ValueError):
                control.bind_refresh(self.root, self.root, 'request', {'all': False})
            self.assertFalse(control.bind_refresh(self.root, self.root, 'next', {'all': False})['enabled'])

    def test_resource_registry_covers_inventory_and_never_admits_formal_or_pending_content(self):
        root = Path(__file__).resolve().parents[2]
        # The approved inventory is a fixed Git object, even after cold-cache thinning.
        rows = json.loads(subprocess.check_output(['git', '-C', str(root), 'cat-file', 'blob',
                                                   '344c5ef80fe409d88e235bc09a6a48fb7ccd8119']))
        for row in rows:
            name = row['path']
            key = 'reports/monster-db-check.md' if name == 'notes/monster-db-check.md' else name.removeprefix('knowledge/')
            self.assertEqual(refresh.resource_key(key), row['class'] == 'A', name)
        for key in ['../secret.json', 'characters/silent/pending/fixture.json', 'common/enemies/A/mechanics.json',
                    'characters/silent/experience.json', '/common/monster-db.json', 'common/outcome-stats.json',
                    'characters/silent/monster-db.json']:
            self.assertFalse(refresh.resource_key(key))

    def test_selected_pipeline_keeps_original_cadences_and_b_requires_separate_path(self):
        a = refresh.producers({'all': True}, ['silent'])
        self.assertIn('v6-history', a)
        self.assertIn('fight-value', a)
        self.assertIn('catalog', a)
        self.assertNotIn('v6-history', refresh.producers({}, ['ironclad']))
        self.assertEqual(refresh.producers({'only_producer': 'outcome'}, ['silent']), ['catalog', 'outcome'])
        with self.assertRaises(ValueError):
            refresh.producers({'only_producer': 'event-pages'}, ['silent'])

    def test_code_freeze_rejects_an_unreviewed_dispatcher_before_starting_a_child(self):
        stage = self.root / 'stage'
        stage.mkdir()
        with self.assertRaisesRegex(ValueError, 'dispatcher missing'):
            refresh.freeze_code(self.root, self.root, stage, {})

    def test_published_request_returns_original_version_without_rerunning_producers(self):
        self.save()
        directory = Path(self.body['directory'])
        directory.mkdir(parents=True)
        (directory / 'stats.sqlite').write_bytes(b'fixture-placeholder-never-opened')
        with patch.dict('os.environ', {'CODEX_OPS_DIR': str(self.state)}), \
                patch('fixed_producer_methods.method', side_effect=lambda _code, name, _root: self.body['methods'][name]), \
                patch.object(refresh, 'call', return_value={'state': 'published', 'version': 'S1-' + 'c' * 64}), \
                patch.object(refresh, 'freeze_code', side_effect=AssertionError('must not run')):
            value = refresh.execute(self.root, self.root, 'finished', {'only_producer': 'outcome'}, ['silent'])
        self.assertEqual(value['status'], 'already_published')


if __name__ == '__main__':
    unittest.main()
