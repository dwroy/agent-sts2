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
