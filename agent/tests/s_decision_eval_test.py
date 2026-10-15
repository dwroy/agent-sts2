import importlib.util
from pathlib import Path
import unittest
import hashlib
import json
import tempfile

spec = importlib.util.spec_from_file_location('s_decision', Path(__file__).resolve().parents[2] / 'eval/s_decision.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class Evaluation(unittest.TestCase):
    def test_offsets_are_normalized_without_relabeling_wall_clock(self):
        self.assertEqual(m.instant('2026-10-15T08:00:00+08:00'), m.instant('2026-10-15T00:00:00Z'))

    def test_compute_attempts_deduplicate_and_keep_unknown_timing(self):
        a = {'character': 'SILENT', 'cohort': 'R341', 'run_id': 'A', 'attempt_id': 'one',
             'required': True, 'lane': 'b3', 'elapsed_ms': 100, 'status': 'complete'}
        rows = [a, a, {**a, 'attempt_id': 'two', 'elapsed_ms': 300, 'status': 'degraded'},
                {**a, 'attempt_id': 'unknown', 'elapsed_ms': None}, {**a, 'character': 'IRONCLAD'}]
        result = m.compute_summary(rows)
        self.assertEqual(result['groups'][0]['wall_ms'], {'n': 2, 'p50': 200, 'p90': 280, 'max': 300, 'sum': 400})
        self.assertEqual(result['groups'][0]['unknown_ms'], 1)
        self.assertEqual(result['runs'][0]['observed_wait_ms'], 400)
        self.assertEqual(len(result['excluded']), 2)

    def test_jev_tokens_are_actual_and_missing_fields_are_not_zero(self):
        row = {'character': 'SILENT', 'cohort': 'V5-S', 'run_id': 'A', 'call_id': 'one', 'provider': 'jev',
               'input_tokens': 20, 'output_tokens': 10, 'latency_ms': 200}
        result = m.jev_usage([row, row, {**row, 'call_id': 'two', 'input_tokens': None}])['groups'][0]
        self.assertEqual(result['calls'], 2)
        self.assertEqual(result['total_tokens']['sum'], 30)
        self.assertEqual(result['total_tokens']['n'], 1)

    def test_overrides_exclude_shadow_pending_targets_and_conflicting_outcomes(self):
        row = {'character': 'SILENT', 'cohort': 'V5-S', 'run_id': 'A', 'question_id': 'q1', 'mode': 'on',
               'deviated': True, 'reason': 'resource', 'boss': 'B', 'ascension': 10,
               'outcome': 'won', 'outcome_id': 'first', 'outcome_binding': 'same_run_act_first_boss_attempt'}
        result = m.override_summary([row, {**row, 'question_id': 'q2'}, {**row, 'question_id': 'q3', 'outcome': 'died'},
                                     {**row, 'question_id': 'q4', 'mode': 'shadow'}, {**row, 'question_id': 'q5', 'target_pending': True}])
        self.assertEqual(result['groups'][0]['overrides'], 3)
        group = result['groups'][0]['outcomes'][1]
        self.assertEqual(group['distinct_boss_attempts'], 0)
        self.assertIsNone(group['win_rate'])
        self.assertEqual(group['conflicting_outcome_ids'], ['first'])
        self.assertEqual(len(result['excluded']), 2)

    def test_runtime_requires_real_frozen_sources_and_explicit_coverage(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'export.json'; path.write_text('{}')
            data = {'schema': 's-decision-runtime-v1', 'coverage': {'complete': False},
                    'source_refs': [{'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}]}
            result = m.runtime_report(data)
            self.assertEqual(result['excluded_from_goal'], ['P4', 'P5'])
            self.assertEqual(result['computation']['groups'], [])
            path.write_text('{"changed":true}')
            with self.assertRaises(ValueError):
                m.runtime_report(data)

    def test_censored_sl_never_borrows_later_win(self):
        row = {'run_id': 'FIXTURE', 'floor': 17, 'attempt': 1, 'ts': '2026-10-14T12:01:00Z'}
        attempts = [{'run_id': 'FIXTURE', 'floor': 17, 'attempt': 1, 'result': 'predicted_death',
                     'started_at': '2026-10-14T12:00:00Z', 'ended_at': '2026-10-14T12:02:00Z'},
                    {'run_id': 'FIXTURE', 'floor': 17, 'attempt': 2, 'result': 'won',
                     'started_at': '2026-10-14T12:02:00Z', 'ended_at': '2026-10-14T12:04:00Z'}]
        fights = [{'run_id': 'FIXTURE', 'floor': 17, 'outcome': 'won',
                   'first_ts': '2026-10-14T12:00:00Z', 'last_ts': '2026-10-14T12:04:00Z'}]
        self.assertIsNone(m.link_outcome(row, fights, attempts)['outcome'])
        self.assertEqual(m.link_outcome({**row, 'attempt': 2, 'ts': '2026-10-14T12:03:00Z'}, fights, attempts)['outcome'], 'won')

    def test_exact_prediction_groups_dedup_and_unknowns(self):
        row = {'character': 'SILENT', 'run_id': 'FIXTURE', 'floor': 17, 'boss': 'FIXTURE_BOSS', 'ascension': 1,
               'attempt': 1, 'prediction_id': 'p', 'binding': 'exact_boss_attempt', 'probability': .8, 'outcome': 'won'}
        result = m.calibration([row, row, {**row, 'attempt': 2, 'outcome': 'died'},
                                {**row, 'prediction_id': 'censored', 'outcome': 'predicted_death'},
                                {**row, 'character': 'IRONCLAD'}])
        self.assertEqual(len(result['groups']), 2)
        self.assertAlmostEqual(result['groups'][0]['brier'], .04)
        self.assertAlmostEqual(result['groups'][1]['brier'], .64)
        self.assertEqual(len(result['excluded']), 3)

    def test_runtime_calibration_never_merges_different_native_models(self):
        row = {'character': 'SILENT', 'run_id': 'A', 'floor': 17, 'boss': 'B', 'ascension': 10, 'attempt': 1,
               'prediction_id': 'p1', 'binding': 'exact_boss_attempt', 'probability': .7, 'outcome': 'won',
               'cohort': 'V5-S', 'native_commit': 'model-one'}
        result = m.calibration([row, {**row, 'prediction_id': 'p2', 'native_commit': 'model-two'},
                                {**row, 'prediction_id': 'unknown', 'native_commit': None}], require_native=True)
        self.assertEqual(len(result['groups']), 2)
        self.assertEqual({v['native_commit'] for v in result['groups']}, {'model-one', 'model-two'})
        self.assertEqual(len(result['excluded']), 1)

    def test_truncated_logdb_export_is_rejected(self):
        with self.assertRaises(ValueError):
            m.exported_rows({'columns': [], 'rows': [], 'truncated': True})


if __name__ == '__main__':
    unittest.main()
