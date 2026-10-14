import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('s_decision', Path(__file__).resolve().parents[2] / 'eval/s_decision.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class Evaluation(unittest.TestCase):
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

    def test_truncated_logdb_export_is_rejected(self):
        with self.assertRaises(ValueError):
            m.exported_rows({'columns': [], 'rows': [], 'truncated': True})


if __name__ == '__main__':
    unittest.main()
