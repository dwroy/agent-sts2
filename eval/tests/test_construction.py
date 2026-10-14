import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


calibration = module('construction_eval', ROOT / 'eval/construction.py')
opportunities = module('construction_opportunities', ROOT / 'knowledge/builders/build-construction-opportunities.py')


class ConstructionChecks(unittest.TestCase):
    def test_observation_time_precedes_the_answer_even_when_log_write_is_later(self):
        try:
            import duckdb
        except ImportError:
            self.skipTest('run with the existing logdb venv for this fixed Parquet fixture')
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'data/logdb/frames').mkdir(parents=True)
            (root / 'logs').mkdir()
            (root / 'data/game-data.json').write_text(json.dumps({'collections': {'cards': [dict(id='A', name='Alpha')]}}))
            (root / 'logs/runs.jsonl').write_text(json.dumps(dict(run_id='r', character='SILENT', ascension=10))+'\n')
            frame = json.dumps({'state': {'reward': {'card_options': [dict(index=0, card_id='A', upgraded=True)]}}})+'\n'
            (root / 'logs/states.jsonl').write_text(frame)
            db = duckdb.connect(config={'threads': 1})
            db.execute('CREATE TABLE frame(run_id VARCHAR,floor INT,ts TIMESTAMP,observed_ts TIMESTAMP,off BIGINT,len INT,character VARCHAR,screen VARCHAR)')
            db.execute("INSERT INTO frame VALUES ('r',5,'2026-01-01 00:00:21','2026-01-01 00:00:00',0,?,'SILENT','REWARD')", [len(frame.encode())])
            db.execute('COPY frame TO ? (FORMAT PARQUET)', [str(root/'data/logdb/frames/fixed.parquet')])
            db.close()
            brain = dict(run_id='r',ts='2026-01-01T00:00:20.000Z',engine='codex',accepted=True,label='reward/card',
                         payload={'facts': {'act': 1,'floor': 5}},options={'card0':json.dumps({'card':'Alpha'})})
            (root/'logs/brain.jsonl').write_text(json.dumps(brain)+'\n')
            result=opportunities.extract(root,root/'logs','silent')
            self.assertEqual(len(result['rows']),1)
            self.assertTrue(result['rows'][0]['offers'][0]['upgraded'])
            self.assertIsNotNone(result['rows'][0]['state_source'])

    def test_only_matched_prospective_policy_results_count(self):
        identity = dict(character='silent', run='r', decision='d', core='c', metric='signature', horizon=17,
                        model='m', policy='p', attempt=1)
        p = identity | dict(value=.8, as_of='2026-01-01T00:00:00Z')
        o = identity | dict(value=True, observed_at='2026-01-02T00:00:00Z', complete=True,
                            followed_policy=True, followed_route=True, evidence=['frame-sha'])
        rows = [dict(prediction=p, outcome=o), dict(prediction=p, outcome=o)]
        for i, change in enumerate([dict(followed_policy=False), dict(followed_route=False), dict(value=None),
                                     dict(evidence=[]), dict(observed_at='2025-01-01T00:00:00Z')]):
            rows.append(dict(prediction=p | dict(decision=str(i)), outcome=o | dict(decision=str(i)) | change))
        result = calibration.evaluate(rows)
        self.assertEqual(result['groups'][0]['n'], 1)
        self.assertAlmostEqual(result['groups'][0]['brier'], .04)
        self.assertEqual(len(result['excluded']), 6)
        self.assertFalse(result['automatic_promotion'])

    def test_calibration_keeps_ascensions_and_templates_separate_and_compares_real_time(self):
        identity = dict(character='silent', run='r', decision='d', core='c', metric='conditionalSignature', horizon=17,
                        model='m', policy='p', attempt=1, ascension=10, template_sha256='a'*64)
        p = identity | dict(value=.8, as_of='2026-01-01T08:00:00+08:00')
        o = identity | dict(value=True, observed_at='2026-01-01T00:01:00Z', complete=True,
                            followed_policy=True, followed_route=True, evidence=['frame-sha'])
        lower = {**identity, 'run': 'r2', 'ascension': 9, 'decision': 'd2'}
        report = calibration.evaluate([dict(prediction=p, outcome=o),
            dict(prediction=p | lower, outcome=o | lower | dict(value=False)),
            dict(prediction=p | dict(decision='d3', template_sha256=None), outcome=o | dict(decision='d3'))])
        self.assertEqual(len(report['groups']), 2)
        self.assertEqual({g['ascension'] for g in report['groups']}, {9, 10})
        self.assertEqual(len(report['excluded']), 1)
        self.assertFalse(calibration.prospective('2026-01-01T00:00:00', '2026-01-02T00:00:00Z'))
        self.assertFalse(calibration.prospective('not a date', '2026-01-02T00:00:00Z'))

    def test_offers_include_unchosen_cards_and_deduplicate_repeated_visits(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'data').mkdir()
            (root / 'logs').mkdir()
            (root / 'data/game-data.json').write_text(json.dumps({'collections': {'cards': [
                dict(id='A', name='Alpha'), dict(id='B', name='Beta')]}}))
            (root / 'logs/runs.jsonl').write_text(json.dumps(dict(run_id='r', character='SILENT', ascension=10)) + '\n')
            base = dict(run_id='r', ts='2026-01-01T00:00:00Z', engine='codex', accepted=True,
                        payload={'facts': {'act': 1, 'floor': 5}})
            reward = base | dict(label='reward/card', answer={'choice': 'card0'}, options={
                'card0': json.dumps(dict(card='Alpha', upgraded=False)), 'card1': json.dumps(dict(card='Beta', upgraded=True)), 'skip': json.dumps(dict(card='skip'))})
            shop = base | dict(label='shop/plan', options={'buy_card0': json.dumps(dict(buy='Alpha', price=90, upgraded=False))})
            unknown = base | dict(label='shop/plan', payload={'facts': {'act': 1, 'floor': 6}},
                                 options={'buy_card0': json.dumps(dict(buy='Alpha'))})
            foreign = reward | dict(run_id='other')
            (root / 'logs/brain.jsonl').write_text(''.join(json.dumps(r) + '\n' for r in [reward, reward, shop, shop, unknown, foreign]))
            result = opportunities.extract(root, root / 'logs', 'silent')
            self.assertEqual(len(result['rows']), 2)
            self.assertEqual([o['id'] for o in result['rows'][0]['offers']], ['A', 'B'])
            self.assertEqual(result['rows'][1]['offers'][0]['price'], 90)
            self.assertEqual(result['excluded'], {'incomplete_offers': 1, 'repeat_shop_visit': 1, 'unknown_upgrade': 0})


if __name__ == '__main__':
    unittest.main()
