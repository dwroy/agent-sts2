import copy
import json
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('adaptive_health', Path(__file__).resolve().parents[2] / 'ops/adaptive_health.py')
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)


class AdaptiveHealth(unittest.TestCase):
    def test_actual_sampling_does_not_fabricate_full_counterfactual_agreement(self):
        row = {'decision_id': 'a', 'label': 'combat/plan', 'boss_sim': {'adaptive': {
            'mode': 'on', 'status': 'complete_adaptive', 'work': {'savedFraction': .5},
            'candidates': [{'key': 'a', 'samples': 200, 'rounds': 1, 'stop': 'leader'},
                           {'key': 'b', 'samples': 200, 'rounds': 1, 'stop': 'eliminated'}]}}}
        value = h.adaptive_health({'loop': {'sim_adaptive': 'on', 'sim_adaptive_admission': 'accepted'}}, [row, row])
        self.assertEqual((value['observed'], value['complete_adaptive'], value['errors']), (1, 1, 0))
        self.assertIsNone(value['agreement'])
        self.assertIsNone(value['saved_fraction']['p50'])
        self.assertEqual(value['actual_saved_fraction']['p50'], .5)
        self.assertEqual(value['stop_counts'], {'leader': 1, 'eliminated': 1})
        self.assertEqual(value['admission_state'], 'accepted')
        self.assertNotIn('pending', value['admission'])

    def test_h1_budget_prefixes_are_unknown_without_fabricating_completion_or_errors(self):
        fixture = json.loads((Path(__file__).parent / 'fixtures/h1-budget-completion.json').read_text())
        rows = fixture['cases']
        value = h.adaptive_health({'loop': {'sim_adaptive': 'on'}}, rows + rows)
        self.assertEqual((value['observed'], value['produced'], value['budgeted_partial'], value['errors']), (4, 4, 4, 0))
        self.assertEqual((value['complete_adaptive'], value['evaluable'], value['unknown']), (0, 0, 4))
        self.assertIsNone(value['agreement'])
        self.assertIsNone(value['actual_saved_fraction']['p50'])
        self.assertEqual(value['candidate_samples'], [c['samples'] for r in rows for c in r['boss_sim']['adaptive']['candidates']])
        self.assertFalse(value['alert'])
        self.assertIn('budget', value['stop_counts'])
        for patch in ({'budgeted': False}, {'failure': True}, {'failure': None}, {'status': 'pending'}, {'required': False}):
            with self.subTest(patch=patch):
                bad = copy.deepcopy(rows)
                for row in bad:
                    row['boss_sim']['completion'].update(patch)
                rejected = h.adaptive_health({'loop': {'sim_adaptive': 'on'}}, bad)
                self.assertEqual((rejected['errors'], rejected['budgeted_partial']), (4, 0))
                self.assertTrue(rejected['alert'])
        for key in ('worker', 'resource', 'C1'):
            bad = copy.deepcopy(rows)
            for row in bad:
                row['boss_sim']['error'] = key
            self.assertEqual(h.adaptive_health({}, bad)['errors'], 4)
        for invalid in (-1, True, '838'):
            bad = copy.deepcopy(rows)
            for row in bad:
                row['boss_sim']['adaptive']['candidates'][0]['samples'] = invalid
            self.assertEqual(h.adaptive_health({}, bad)['errors'], 4)

    def test_admitted_source_rollback_stays_shadow(self):
        value = h.adaptive_health({'loop': {'sim_adaptive': 'shadow', 'sim_adaptive_admission': 'accepted'}}, [])
        self.assertEqual(value['mode'], 'shadow')
        self.assertEqual(value['admission_state'], 'accepted')
        self.assertIn('never auto-enable', value['admission'])
        self.assertIsNone(value['actual_saved_fraction']['p50'])

    def test_unique_input_readback_does_not_claim_game_benefit_or_activation(self):
        def row(key, agreement, **extra):
            return {'ts': key, 'label': 'combat/plan', 'boss_sim': {'adaptive': {'input_key': key,
                'status': 'produced', 'evaluable': True, 'agreement': agreement,
                'work': {'savedFraction': .5}, **extra}}}
        a, b = row('1', True), row('2', False)
        value = h.adaptive_health({'loop': {'sim_adaptive': 'shadow'}}, [a, a, b, row('3', None, evaluable=False)])
        self.assertEqual((value['observed'], value['evaluable'], value['matched'], value['unknown']), (3, 2, 1, 1))
        self.assertEqual(value['agreement'], .5)
        self.assertEqual(len(value['mismatches']), 1)
        self.assertIn('pending', value['admission'])
        self.assertEqual(value['saved_fraction'], {'p50': .5, 'p90': .5})
        self.assertFalse(value['alert'])


if __name__ == '__main__':
    unittest.main()
