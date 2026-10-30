"""The original outcome reducer receives fixed raw evidence through real LogDB shards."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'knowledge/builders'))
sys.path.insert(0, str(ROOT / 'agent/tools/logdb'))
sys.path.insert(0, str(ROOT / 'ops'))
sys.path.insert(0, str(ROOT))
import sync as logsync
from outcome_logdb import IndexedOutcome

spec = importlib.util.spec_from_file_location('outcome_indexed_fixture', ROOT / 'knowledge/builders/build-outcome-stats.py')
outcome = importlib.util.module_from_spec(spec)
spec.loader.exec_module(outcome)


class IndexedTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='outcome-logdb-fixture-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.logs, self.db = self.root / 'logs', self.root / 'data/logdb'
        self.logs.mkdir()
        self.env = patch.dict(os.environ, {'STS2_REFRESH_CACHE_DIR': ''})
        self.env.start()
        self.addCleanup(self.env.stop)
        runs, states, decisions = [], [], []
        for i, character in enumerate(('SILENT', 'SILENT', 'IRONCLAD')):
            rid = 'FIXED' + str(i)
            runs.append(dict(run_id=rid, character=character, ascension=10, floor=18 + i, victory=i == 0,
                             ended=f'2026-10-{25 + i:02d}T02:00:00Z'))
            def state(screen, floor, act=0, **extra):
                run = dict(floor=floor, act_id=act, character_id=character, ascension=10, current_hp=30, max_hp=80,
                           deck=[dict(card_id='TEST_CARD', name='固定卡', upgraded=False)], relics=[])
                states.append(dict(ts=f'2026-10-{25 + i:02d}T01:{floor:02d}:00Z', screen=screen,
                                   state=dict(run_id=rid, screen=screen, run=run, **extra)))
            state('MAP', 1)
            state('REWARD', 2, reward=dict(card_options=[dict(card_id='OFFERED', name='固定候选')]))
            state('EVENT', 3, event=dict(event_id='FIXED_EVENT', options=[dict(index=0, text_key='FIXED.GAIN', title='固定选项')]))
            state('REST', 4, rest=dict(options=[dict(index=0, option_id='HEAL')]))
            state('MAP', 5, act=1)
            for floor, action, label in ((3, 'choose_event_option', 'event/FIXED_EVENT'), (4, 'choose_rest_option', 'rest/choose'), (5, 'proceed', 'map/route')):
                decisions.append(dict(ts=f'2026-10-{25 + i:02d}T01:{floor:02d}:01Z', mode='play', floor=floor, label=label,
                    fingerprint=json.dumps(dict(run=rid, hp=25 + floor, maxHp=80, gold=20 + floor)), chosen=dict(action=action, option_index=0)))
        for name, rows in (('runs', runs), ('states', states), ('decisions', decisions)):
            (self.logs / (name + '.jsonl')).write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows))
        writer = logsync.LogDb(str(self.logs), str(self.db), quiet=True, shard_rows=4)
        try:
            writer.run()
        finally:
            if writer.con:
                writer.con.close()

    def indexed(self):
        return IndexedOutcome(self.logs, self.db, '2026-10-26T01:47:00Z')

    def test_original_estimator_and_indexed_inputs_are_equal_with_separate_coverage(self):
        expected = outcome.build(str(self.logs), 'band', 'silent')
        indexed = self.indexed()
        with indexed.frozen():
            actual = outcome.build(str(self.logs), 'band', 'silent', indexed)
        expected.pop('generated')
        actual.pop('generated')
        self.assertEqual(actual, expected)
        self.assertEqual(actual['by_ascension']['10']['baseline']['runs'], 2)
        self.assertTrue(actual['by_ascension']['10']['events'])
        self.assertTrue(actual['by_ascension']['10']['rest'])
        self.assertEqual(indexed.receipt['finished_runs'], 2)
        self.assertEqual(indexed.receipt['finished_since'], 1)
        self.assertEqual(indexed.receipt['finished_since_ids'], ['FIXED1'])

    def test_behind_index_refuses_to_omit_new_finished_evidence(self):
        with (self.logs / 'runs.jsonl').open('a') as out:
            out.write(json.dumps(dict(run_id='UNSYNCED', character='SILENT', ascension=10, ended='2026-10-30T00:00:00Z')) + '\n')
        with self.assertRaisesRegex(ValueError, 'behind raw logs'):
            with self.indexed().frozen():
                self.fail('must not produce partial output')

    def test_source_change_during_reduction_is_retained(self):
        with self.assertRaisesRegex(ValueError, 'changed during reduction'):
            with self.indexed().frozen() as indexed:
                outcome.build(str(self.logs), 'band', 'silent', indexed)
                path = self.logs / 'states.jsonl'
                path.write_bytes(path.read_bytes().replace(b'OFFERED', b'ALTERED'))

    def test_missing_shard_and_wrong_index_denominator_refuse_publication(self):
        path = self.db / 'manifest.json'
        body = json.loads(path.read_text())
        body['sources']['states']['rows'] += 1
        path.write_text(json.dumps(body))
        with self.assertRaisesRegex(ValueError, 'index denominator'):
            with self.indexed().frozen() as indexed:
                outcome.build(str(self.logs), 'band', 'silent', indexed)
        shard = self.db / body['sources']['states']['table'] / body['sources']['states']['shards'][0]
        shard.unlink()
        with self.assertRaises(OSError):
            with self.indexed().frozen():
                self.fail('must not read an incomplete original index')

    def test_indexed_backfill_adds_d1_keeps_three_original_publications_and_reads_consumer(self):
        from ops.tests.fixed_producer_fixture import install
        from fixed_producer_methods import method
        import learning_runtime_data as data
        from learning_runtime_store import Store, packed
        install(self.root)
        dest = self.root / 'ops/codex-ops'
        dest.mkdir(parents=True)
        runtime = self.root / 'data/runtime'
        store = Store(runtime)
        originals = []
        name = 'characters/silent/outcome-stats.json'
        output = self.root / 'knowledge' / name
        output.parent.mkdir(parents=True)
        for i in range(3):
            raw = packed(dict(generated=f'2026-10-26T01:{45 + i}:00Z', by_ascension={})).encode()
            version = store.publish('original-' + str(i), store.current(), {name: raw}, dict(producer='outcome'))
            originals.append((version, raw))
            with store.transaction():
                store.db.execute('INSERT INTO data_attempts VALUES(?,?,?)', ('original-' + str(i), version,
                    packed(dict(status='published', version=version, producer='outcome'))))
        output.write_bytes(originals[-1][1])
        store.close()
        (dest / 'learning-runtime.json').write_text(packed(dict(schema='operational-runtime-control-v1', root=str(self.root),
            enabled=True, directory=str(runtime), entries=[], refresh=['outcome'], methods={'outcome': method(self.root, 'outcome', self.root)})))
        with patch.dict(os.environ, {'CODEX_OPS_DIR': str(dest), 'STS2_REFRESH_SELECTION_FILE': ''}):
            with data.refresh_step(self.root, self.root, 'outcome:silent', ['silent'], 'indexed-backfill') as result:
                with self.indexed().frozen() as indexed:
                    body = outcome.build(str(self.logs), 'band', 'silent', indexed)
                body['_source_logdb'] = indexed.receipt
                output.write_text(packed(body))
                result['rc'] = 0
            selected = data.current_file(self.root, dest, name)
            readback = json.loads(selected.read_bytes())
        self.assertEqual(result['status'], 'published')
        self.assertEqual(readback['by_ascension']['10']['baseline']['runs'], 2)
        self.assertEqual(readback['_source_logdb']['finished_since'], 1)
        store = Store(runtime, readonly=True)
        try:
            self.assertEqual(store.db.execute('SELECT count(*) FROM data_releases').fetchone()[0], 4)
            self.assertEqual(store.db.execute('SELECT count(*) FROM data_attempts').fetchone()[0], 4)
            for version, raw in originals:
                self.assertEqual((Path(store.snapshot(version)) / name).read_bytes(), raw)
        finally:
            store.close()


if __name__ == '__main__':
    unittest.main()
