"""Failure episodes and historical D1 age, without production refreshes or clocks."""
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'ops'))
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'knowledge/builders'))
import refresh_health as health
from learning_runtime_store import Store, packed


class HealthTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='refresh-health-fixture-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.dest = self.root / 'ops/codex-ops'
        self.dest.mkdir(parents=True)
        self.runtime = self.root / 'data/runtime'
        self.now = datetime(2026, 10, 30, tzinfo=timezone.utc).timestamp()
        self.store = Store(self.runtime)
        self.addCleanup(self.store.close)
        self.versions = []
        for i in range(3):
            raw = packed(dict(character='silent', generated=f'2026-10-26T0{i}:00:00+00:00', by_ascension={})).encode()
            self.versions.append(self.store.publish('original-' + str(i), self.store.current(),
                {'characters/silent/outcome-stats.json': raw}, dict(producer='outcome', characters=['silent'])))
        (self.dest / 'learning-runtime.json').write_text(packed(dict(schema='operational-runtime-control-v1',
            root=str(self.root), enabled=True, directory=str(self.runtime), entries=[], refresh=['outcome'], methods={'outcome': 'a' * 64})))
        self.env = patch.dict(os.environ, {'CODEX_OPS_DIR': str(self.dest)})
        self.env.start()
        self.addCleanup(self.env.stop)

    def observe(self, step=None, cycle=None, status=None, **kwargs):
        return health.observe(self.root, step, cycle, status, now=self.now, **kwargs)

    def inbox(self):
        path = self.dest / 'inbox-claude.md'
        return path.read_text() if path.exists() else ''

    def test_stall_only_observation_uses_original_age_and_keeps_three_releases(self):
        state = self.observe()
        self.assertIn('publication-older-than-12h', self.inbox())
        self.assertEqual(state['steps']['outcome:silent']['publication']['at'],
            datetime(2026, 10, 26, 2, tzinfo=timezone.utc).timestamp())
        before = self.inbox()
        self.observe()
        self.assertEqual(self.inbox(), before)
        self.assertEqual([r[0] for r in self.store.db.execute('SELECT version FROM data_releases ORDER BY rowid')], self.versions)

    def test_exact_third_cycle_and_persistent_duplicate_suppression(self):
        self.observe()
        for i in range(2):
            self.observe('catalog', str(i), 'running')
            self.observe('catalog', str(i), 'failed')
        self.assertNotIn('three-failed-cycles', self.inbox())
        self.observe('catalog', '2', 'running')
        self.observe('catalog', '2', 'failed')
        self.assertEqual(self.inbox().count('three-failed-cycles'), 1)
        self.observe('catalog', '2', 'failed')
        self.observe('catalog', '3', 'failed')
        self.observe()
        self.assertEqual(self.inbox().count('three-failed-cycles'), 1)

    def test_unknown_terminal_breaks_proof_of_consecutive_failure(self):
        self.observe('outcome:silent', 'a', 'failed')
        self.observe('outcome:silent', 'b', 'running')
        self.observe('outcome:silent', 'c', 'failed')
        self.observe('outcome:silent', 'd', 'failed')
        self.assertNotIn('three-failed-cycles', self.inbox())
        self.observe('outcome:silent', 'e', 'failed')
        self.assertIn('three-failed-cycles', self.inbox())

    def test_step_character_isolation_and_recovery_episode(self):
        for c in ('a', 'b', 'c'):
            self.observe('outcome:silent', c, 'failed')
        self.assertEqual(self.inbox().count('three-failed-cycles'), 1)
        self.observe('outcome:ironclad', 'a', 'failed')
        self.observe('outcome:silent', 'ok', 'succeeded', version=self.versions[-1])
        for c in ('d', 'e', 'f'):
            self.observe('outcome:silent', c, 'failed')
        self.assertEqual(self.inbox().count('three-failed-cycles'), 2)

    def test_successful_retry_keeps_original_failure_and_ends_episode_without_new_cycle(self):
        for cycle in ('one', 'two', 'three'):
            self.observe('catalog', cycle, 'failed')
        state = self.observe('catalog', 'three', 'succeeded')
        self.assertNotIn('catalog:three-failed-cycles', state['alerts'])
        self.assertEqual(len(state['steps']['catalog']['recent']), 3)
        events = [json.loads(p.read_text()) for p in (self.dest / 'refresh-health-events').glob('*.json')]
        recovered = next(e for e in events if e['cycle'] == 'three')
        self.assertEqual(recovered['status'], 'failed')
        self.assertEqual(recovered['recovery']['status'], 'succeeded')
        for cycle in ('four', 'five', 'six'):
            self.observe('catalog', cycle, 'failed')
        self.assertEqual(self.inbox().count('three-failed-cycles'), 2)
        state = self.observe('catalog', 'three', 'succeeded')
        self.assertIn('catalog:three-failed-cycles', state['alerts'])  # Cached old success cannot hide a new failure episode.

    def test_unchanged_success_does_not_reset_publication_age(self):
        state = self.observe('outcome:silent', 'unchanged', 'succeeded', version=self.versions[-1], published=False)
        self.assertLess(state['steps']['outcome:silent']['publication']['at'], self.now - health.STALE_SECONDS)
        self.assertIn('publication-older-than-12h', self.inbox())

    def test_twelve_hour_threshold_and_new_release_recovery(self):
        raw = packed(dict(character='silent', generated=datetime.fromtimestamp(self.now, timezone.utc).isoformat())).encode()
        version = self.store.publish('new-publication', self.store.current(), {'characters/silent/outcome-stats.json': raw},
            dict(producer='outcome', characters=['silent']))
        self.observe('outcome:silent', 'published', 'succeeded', version=version, published=True)
        self.now += health.STALE_SECONDS
        before = self.inbox()
        self.observe()
        self.assertEqual(self.inbox(), before)
        self.now += 1
        self.observe()
        self.assertEqual(self.inbox().count('publication-older-than-12h'), before.count('publication-older-than-12h') + 1)

    def test_status_flag_does_not_replace_durable_publication_time_with_observation_time(self):
        state = self.observe('outcome:silent', 'late-observer', 'succeeded', version=self.versions[-1], published=True)
        self.assertEqual(state['steps']['outcome:silent']['publication']['at'],
            datetime(2026, 10, 26, 2, tzinfo=timezone.utc).timestamp())
        self.assertIn('publication-older-than-12h', self.inbox())

    def test_completion_after_pointer_becomes_visible_refreshes_watermark(self):
        version = self.store.publish('completion-race', self.store.current(), {'characters/silent/outcome-stats.json': b'{}'},
            dict(producer='outcome', characters=['silent']))
        self.observe()  # A stall read can see the release just before its completion receipt.
        with self.store.transaction():
            self.store.db.execute('INSERT INTO data_attempts VALUES(?,?,?)', ('completion-race', version, packed(dict(
                status='published', producer='outcome', version=version,
                completed_at=datetime.fromtimestamp(self.now, timezone.utc).isoformat()))))
        state = self.observe()
        self.assertEqual(state['steps']['outcome:silent']['publication']['at'], self.now)
        self.assertEqual(state['steps']['outcome:silent']['publication']['version'], version)

    def test_non_d1_step_staleness_uses_original_completion(self):
        self.observe('logdb-sync', 'finished', 'succeeded')
        self.now += health.STALE_SECONDS + 1
        self.observe()
        self.assertIn('logdb-sync step-completion-older-than-12h', self.inbox())

    def test_actual_driver_records_admission_failure_before_any_builder_runs(self):
        from ops.tests.fixed_producer_fixture import install
        install(self.root)
        spec = importlib.util.spec_from_file_location('fixed_refresh_driver_fixture', ROOT / 'knowledge/builders/refresh_driver.py')
        driver = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(driver)
        argv = ['refresh_driver.py', '--queue-entered', '--ops-root', str(self.root), '--character', 'silent', '--only-producer', 'outcome']
        with patch.object(driver, 'ROOT', self.root), patch.object(driver, 'BUILDERS', self.root / 'knowledge/builders'), \
                patch.object(sys, 'argv', argv), patch.object(driver, 'step', return_value=0) as step:
            for i in range(3):
                with patch.dict(os.environ, {'STS2_REFRESH_CYCLE': 'actual-driver-' + str(i), 'STS2_REFRESH_SELECTION_FILE': ''}):
                    self.assertEqual(driver.main(), 1)
        self.assertEqual([call.args[1] for call in step.call_args_list], ['catalog'] * 3)
        self.assertIn('outcome:silent three-failed-cycles', self.inbox())
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM data_releases').fetchone()[0], 3)

    def test_driver_cancellation_retains_unknown_terminal(self):
        from ops.tests.fixed_producer_fixture import install
        install(self.root)
        spec = importlib.util.spec_from_file_location('fixed_cancel_driver_fixture', ROOT / 'knowledge/builders/refresh_driver.py')
        driver = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(driver)
        argv = ['refresh_driver.py', '--queue-entered', '--ops-root', str(self.root), '--character', 'silent', '--only-producer', 'outcome']
        with patch.object(driver, 'ROOT', self.root), patch.object(driver, 'BUILDERS', self.root / 'knowledge/builders'), \
                patch.object(sys, 'argv', argv), patch.object(driver, 'step', side_effect=KeyboardInterrupt), \
                patch.dict(os.environ, {'STS2_REFRESH_CYCLE': 'cancelled-driver', 'STS2_REFRESH_SELECTION_FILE': ''}):
            with self.assertRaises(KeyboardInterrupt):
                driver.main()
        state = json.loads((self.dest / 'refresh-health.json').read_text())
        self.assertEqual(state['steps']['catalog']['recent'][-1]['status'], 'running')


if __name__ == '__main__':
    unittest.main()
