import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('adaptive_health', Path(__file__).resolve().parents[2] / 'ops/adaptive_health.py')
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)


class AdaptiveHealth(unittest.TestCase):
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
