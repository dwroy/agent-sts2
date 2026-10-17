import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('global_build_health', Path(__file__).resolve().parents[2] / 'ops/global_build_health.py')
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
CONFIG = {'loop': {'global_build_eval': 'shadow'}}
LABELS = {'reward/card'}


def row(i, ms=10, **extra):
    value = {'schema': 'global-build-v1', 'mode': 'shadow', 'delivered': False, 'primary': 'paired_win_probability',
             's_sort': False, 'status': 'partial', 'observation_id': f'fixed:{i}', 'wall_ms': ms, 'memo_hit': False,
             'targets': [{'status': 'unknown', 'rows': [{'unknown': 'Act3_quality_gate_and_production_trust_unknown'}]}], **extra}
    return {'decision_id': str(i), 'label': 'reward/card', 'boss_sim': {'completion': {'required': True}, 'global_build': value}}


class Health(unittest.TestCase):
    def test_unknown_is_not_a_failure_or_zero_prediction(self):
        value = h.global_build_health(CONFIG, [row(1)], LABELS)
        self.assertEqual((value['covered'], value['partial'], value['service_failures']), (1, 1, 0))
        self.assertEqual(value['unknown_reasons'], {'Act3_quality_gate_and_production_trust_unknown': 1})
        self.assertFalse(value['alert'])

    def test_duplicate_answers_are_not_new_computations_and_memo_is_separate(self):
        first = row(1, 10)
        copied = {**first, 'decision_id': 'copied'}
        value = h.global_build_health(CONFIG, [first, copied, row(2, 30), row(3, 1, memo_hit=True)], LABELS)
        self.assertEqual((value['expected'], value['covered'], value['observations'], value['memo_hits']), (4, 4, 3, 1))
        self.assertEqual(value['computation_wall_ms'], {'n': 2, 'p50': 20.0, 'p90': 28.0, 'max': 30})
        self.assertEqual(value['memo_wall_ms']['n'], 1)

    def test_unintended_shadow_consumption_and_missing_coverage_alert(self):
        self.assertTrue(h.global_build_health(CONFIG, [row(1, delivered=True)], LABELS)['alert'])
        missing = [dict(row(i), boss_sim={'completion': {'required': True}}) for i in range(3)]
        value = h.global_build_health(CONFIG, missing, LABELS)
        self.assertEqual(value['missing'], 3)
        self.assertTrue(value['alert'])
        self.assertEqual(h.global_build_health({'loop': {'global_build_eval': 'off'}}, missing, LABELS)['expected'], 0)

    def test_budget_prefixes_remain_incomplete_without_hiding_real_worker_errors(self):
        target = {'status': 'budgeted_partial', 'reused_current': False, 'wall_ms': 12,
                  'completion': {'budgeted': True, 'failure': False, 'status': 'partial', 'samples': 260},
                  'rows': [{'samples': 260, 'delta_win': {'mean': .1, 'se': .02}, 'unknown': 'budgeted_prefix_incomplete'}]}
        value = h.global_build_health(CONFIG, [row(i, targets=[target]) for i in range(4)], LABELS)
        self.assertEqual((value['covered'], value['budgeted_partial'], value['service_failures']), (4, 4, 0))
        self.assertEqual(value['unknown_reasons'], {'budgeted_prefix_incomplete': 4})
        self.assertEqual(value['future_target_wall_ms']['n'], 4)
        self.assertFalse(value['alert'])
        failed = {'status': 'unknown', 'rows': [{'unknown': 'global_computation_failed:fixed resource'}]}
        mixed = h.global_build_health(CONFIG, [row(i, targets=[target, failed]) for i in range(3)], LABELS)
        self.assertEqual((mixed['budgeted_partial'], mixed['service_failures']), (3, 3))
        self.assertTrue(mixed['alert'])

    def test_service_failures_stay_distinct_from_quality_gaps(self):
        failed = [{'status': 'unknown', 'rows': [{'unknown': 'global_computation_failed:fixed worker'}]}]
        value = h.global_build_health(CONFIG, [row(i, targets=failed) for i in range(3)], LABELS)
        self.assertEqual(value['service_failures'], 3)
        self.assertTrue(value['alert'])


if __name__ == '__main__':
    unittest.main()
