"""Fixed export/closure checks; no database, game, or model."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'eval'))
import global_build_funnel as funnel
spec = importlib.util.spec_from_file_location('funnel_ops', ROOT / 'ops/global_build_funnel.py')
ops = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ops)


def run(i=1, **extra):
    return {'run_id': str(i), 'character': 'SILENT', 'ascension': 10, 'finished': True,
            'started': f'2026-10-12T00:{i:02d}:00', 'floor': 23, 'max_act': 2,
            'victory': False, 'cfg_commit': 'v5', 'release': 'V5-R1', 's_phase': 'before',
            'death_room': 'hallway', **extra}


def fight(no, act, floor, encounter, result):
    return {'run_id': '1', 'fight_no': no, 'act': act, 'floor': floor,
            'encounter': encounter, 'room': 'boss', 'outcome': result}


class FunnelTest(unittest.TestCase):
    def test_fixed_ten_and_partial_tail_are_never_merged(self):
        rows = [funnel.run_record(run(i), [], [], []) for i in range(1, 24)]
        report = funnel.report(rows)
        self.assertEqual([(b['first'], b['last'], b['complete']) for b in report['blocks_of_ten']],
                         [(1, 10, True), (11, 20, True), (21, 23, False)])

    def test_first_attempt_matches_existing_ops_snapshot_algorithm(self):
        fs = [fight(1, 1, 16, 'A', 'won'), fight(2, 2, 31, 'B', 'won'), fight(3, 3, 48, 'C', 'won')]
        sl = [{'floor': 31, 'encounter': 'B', 'attempt': 1, 'result': 'predicted_death', 'ts': '2026-10-12'},
              {'floor': 31, 'encounter': 'B', 'attempt': 2, 'result': 'won', 'ts': '2026-10-13'}]
        record = funnel.run_record(run(max_act=3, floor=49), fs, [{'act': 1, 'floor': 1}, {'act': 2, 'floor': 18}, {'act': 3, 'floor': 34}], sl)
        self.assertEqual(record['first_attempt']['floor'], 31)
        self.assertTrue(record['first_attempt']['passed_act1'])
        self.assertFalse(record['first_attempt']['passed_act2'])
        report = funnel.summarize([record])
        self.assertEqual(report['first_attempt']['boss_pass_rates']['A2:B:F31']['passed'], 0)
        self.assertNotIn('A3:C:F48', report['first_attempt']['boss_pass_rates'])
        self.assertEqual(report['first_attempt']['act_road_reach_observed_boss']['3']['observed'], 0)

    def test_two_final_bosses_and_retries_are_distinct_units(self):
        fs = [fight(1, 3, 48, 'FIRST', 'won'), fight(2, 3, 49, 'SECOND', 'died'), fight(3, 3, 49, 'SECOND', 'won')]
        sl = [{'floor': 49, 'encounter': 'SECOND', 'attempt': 1, 'result': 'predicted_death'},
              {'floor': 49, 'encounter': 'SECOND', 'attempt': 2, 'result': 'won'}]
        record = funnel.run_record(run(floor=49, max_act=3, victory=True), fs, [], sl)
        self.assertEqual(len(record['bosses']), 2)
        self.assertEqual(record['bosses'][1]['observed_fight_segments'], 2)
        self.assertTrue(record['bosses'][1]['final'])
        self.assertFalse(record['bosses'][1]['first_attempt'])

    def test_unknowns_and_missing_first_retry_are_never_imputed(self):
        self.assertEqual(funnel.boss_result([fight(1, 1, 17, 'X', None)], []), (None, None))
        self.assertEqual(funnel.boss_result([fight(1, 1, 17, 'X', 'won')], [{'attempt': 2, 'result': 'won'}]), (True, None))
        self.assertEqual(funnel.share([True, None, False]), {'observed': 3, 'known': 2, 'unknown': 1, 'passed': 1, 'rate': .5})

    def test_road_death_after_sl_does_not_enter_later_first_attempt_act(self):
        record = funnel.run_record(run(max_act=3, floor=40), [], [{'act': 1, 'floor': 1}, {'act': 2, 'floor': 18}, {'act': 3, 'floor': 34}],
                                   [{'floor': 22, 'result': 'predicted_death'}])
        roads = funnel.summarize([record])['first_attempt']['act_road_reach_observed_boss']
        self.assertEqual(roads['2']['observed'], 1)
        self.assertEqual(roads['3']['observed'], 0)

    def test_missing_boss_room_is_progression_or_unknown_not_false_death(self):
        record = funnel.run_record(run(death_room='unknown_room'), [], [{'act': 1, 'floor': 1}, {'act': 2, 'floor': 18}], [])
        roads = funnel.summarize([record])['final']['act_road_reach_observed_boss']
        self.assertEqual(roads['1']['passed'], 1)
        self.assertEqual(roads['1']['reached_inferred_from_observed_progression'], 1)
        self.assertEqual(roads['2']['unknown'], 1)
        self.assertIsNone(roads['2']['rate'])

    def test_post_boss_next_act_frame_does_not_survive_failed_first_attempt(self):
        record = funnel.run_record(run(), [fight(1, 1, 17, 'A', 'won')], [{'act': 1, 'floor': 1}, {'act': 2, 'floor': 17}],
                                   [{'floor': 17, 'encounter': 'A', 'attempt': 1, 'result': 'predicted_death'}])
        roads = funnel.summarize([record])['first_attempt']['act_road_reach_observed_boss']
        self.assertEqual(roads['2']['observed'], 0)

    def test_explicit_cohort_exclusions_and_initial_code_boundary(self):
        calls = []
        def ancestry(base, commit):
            calls.append((base, commit))
            return base == funnel.V5_ROOT or commit == 'new'
        selected, excluded = funnel.cohort([run(cfg_commit='old'), run(2, run_id='W1YY8PEWGUF9')],
                                           [{'run_id': '1', 'off': 2, 'commit': 'new'}, {'run_id': '1', 'off': 1, 'commit': 'old'}], [], ancestry)
        self.assertEqual(selected[0]['s_phase'], 'V5-S-before')
        self.assertTrue(selected[0]['config_changed'])
        self.assertEqual(excluded[0]['reason'], 'original_gap_exclusion')
        self.assertEqual(selected[0]['cfg_commit'], 'old')

    def test_timestamp_offsets_and_truncated_input(self):
        self.assertEqual(funnel.stamp('2026-10-12T00:00:00'), funnel.stamp('2026-10-12T08:00:00+08:00'))
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'bad.json'
            path.write_text(json.dumps({'columns': [], 'rows': [], 'row_count': 0, 'truncated': True}))
            with self.assertRaises(ValueError):
                funnel.exported(path)


class CadenceTest(unittest.TestCase):
    def test_interrupted_notice_repairs_without_duplicate_export_or_log(self):
        data = funnel.report([funnel.run_record(run(i), [], [], []) for i in range(1, 11)])
        def freeze(root, target):
            (target / 'input-manifest.json').write_text('{}')
        with tempfile.TemporaryDirectory() as temp, patch.object(ops, 'quick_cohort', return_value=dict.fromkeys(range(10))), patch.object(ops, 'freeze', side_effect=freeze) as exported, patch.object(ops.funnel, 'from_exports', return_value=data):
            root = Path(temp)
            with patch.object(ops, 'append_decision', side_effect=OSError('interrupted record')):
                with self.assertRaisesRegex(OSError, 'interrupted record'):
                    ops.run(root, 'silent')
            state_path = root / 'ops/codex-ops/global-build-funnel/state.json'
            self.assertFalse(json.loads(state_path.read_text())['decision_notified'])
            self.assertEqual(ops.run(root, 'silent')['status'], 'waiting_for_ten')
            self.assertTrue(json.loads(state_path.read_text())['decision_notified'])
            state = json.loads(state_path.read_text())
            state['decision_notified'] = False
            state_path.write_text(json.dumps(state))
            ops.run(root, 'silent')
            exported.assert_called_once()
            self.assertEqual((root / 'paper/materials/decision-log.md').read_text().count('G1c 每10完局漏斗归档'), 1)

    def test_successful_archive_closes_each_ten_once_and_keeps_tail(self):
        data = funnel.report([funnel.run_record(run(i), [], [], []) for i in range(1, 24)])
        def freeze(root, target):
            (target / 'input-manifest.json').write_text('{}')
        with tempfile.TemporaryDirectory() as temp, patch.object(ops, 'quick_cohort', return_value=dict.fromkeys(range(23))), patch.object(ops, 'freeze', side_effect=freeze) as exported, patch.object(ops.funnel, 'from_exports', return_value=data):
            root = Path(temp)
            self.assertEqual(ops.run(root, 'silent')['status'], 'archived')
            state = json.loads((root / 'ops/codex-ops/global-build-funnel/state.json').read_text())
            self.assertEqual(state['last_completed_boundary'], 20)
            saved = json.loads((root / state['archive'] / 'funnel.json').read_text())
            self.assertEqual(saved['cadence_boundaries'], [10, 20])
            self.assertEqual(saved['blocks_of_ten'][-1]['n'], 3)
            self.assertEqual(ops.run(root, 'silent')['status'], 'waiting_for_ten')
            exported.assert_called_once()
            self.assertEqual((root / 'paper/materials/decision-log.md').read_text().count('G1c 每10完局漏斗归档'), 1)

    def test_no_work_until_next_completed_ten(self):
        self.assertIsNone(ops.next_boundary(19, 10))
        self.assertEqual(ops.next_boundary(20, 10), 20)
        self.assertIsNone(ops.next_boundary(23, 20))
        with tempfile.TemporaryDirectory() as temp, patch.object(ops, 'quick_cohort', return_value={'one': {}}), patch.object(ops, 'freeze') as freeze:
            self.assertEqual(ops.run(Path(temp), 'silent')['status'], 'waiting_for_ten')
            freeze.assert_not_called()
        self.assertEqual(ops.run(Path('/unused'), 'ironclad')['status'], 'other_character_unchanged')

    def test_failed_export_preserves_retry_boundary(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(ops, 'quick_cohort', return_value=dict.fromkeys(range(10))), patch.object(ops, 'freeze', side_effect=ValueError('incomplete')):
            root = Path(temp)
            with self.assertRaisesRegex(ValueError, 'incomplete'):
                ops.run(root, 'silent')
            self.assertFalse((root / 'ops/codex-ops/global-build-funnel/state.json').exists())
            self.assertEqual(len(list((root / 'paper/materials').glob('*incomplete*'))), 1)


if __name__ == '__main__':
    unittest.main()
