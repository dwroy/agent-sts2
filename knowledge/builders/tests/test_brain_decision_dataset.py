#!/usr/bin/env python3
"""Fixed synthetic records only. No live logs or model calls."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from brain_decision_dataset import Outcomes, option_facts, project, question_types

class DatasetTests(unittest.TestCase):
    def test_question_facts_and_all_types(self):
        p = {'run_brief': {'character': '静默猎手', 'act': '1', 'floor': 4, 'hp': '35/70'},
             'facts': {'deck': ['FIXTURE'], 'act_boss': 'FIXTURE_BOSS', 'stats': {'future': 999}},
             'memory': 'not a fact', 'run_plan_task': {'trigger': 'start'}}
        q = project({'payload': p, 'question': 'fixture', 'options': {'o0': 'fixture'}})
        self.assertEqual(q['act'], 1)
        self.assertEqual(q['floor'], 4)
        self.assertEqual(q['deck'], ['FIXTURE'])
        self.assertNotIn('stats', q)
        self.assertNotIn('memory', q)
        self.assertEqual(option_facts({'o': json.dumps({'card': 'FIXTURE', 'quantitative_fight': {'n': 99}, 'outcome_stats': 'not fact'})}), {'o': {'card': 'FIXTURE'}})
        for label, kind in [('reward/card', 'card_reward'), ('event/plan', 'event'), ('rest/plan', 'rest'), ('shop/plan', 'shop'), ('event/act-plan', 'act_plan')]:
            self.assertIn(kind, question_types(label, p))
        self.assertEqual(question_types('run-plan', {'run_state': {'trigger': 'act'}}), ['act_plan'])
        self.assertEqual(question_types('run-plan', {'run_state': {'trigger': 'hp_drop'}}), [])

    def test_censoring_inventory_and_timestamp_coverage(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            def write(name, rows): (root/name).write_text(''.join(json.dumps(r)+'\n' for r in rows))
            write('runs.jsonl', [{'run_id': 'FIXTURE', 'ended': '2026-01-01T00:05:00Z', 'floor': 6, 'victory': False}])
            write('run-config.jsonl', [{'run_id': 'FIXTURE', 'ts': '2026-01-01T00:00:00Z', 'code': {'commit': 'before'}}, {'run_id': 'FIXTURE', 'ts': '2026-01-01T00:04:00Z', 'code': {'commit': 'future'}}])
            write('sl-attempts.jsonl', [{'run_id': 'FIXTURE', 'result': 'died', 'act': 0, 'floor': 5, 'ended_at': '2026-01-01T00:03:00Z'}])
            fight = {'run': 'FIXTURE', 'ts': '2026-01-01T00:02:00Z', 'ended': '2026-01-01T00:02:30Z', 'input': {'act': 1, 'floor': 4}, 'kind': 'normal', 'win': True, 'hp_loss': 7}
            write('openings.jsonl', [fight, {**fight, 'input': {'act': 1, 'floor': 6}, 'ts': '2026-01-01T00:04:00Z', 'ended': '2026-01-01T00:04:30Z', 'hp_loss': 50}])
            (root/'inventory.json').write_text(json.dumps({'FIXTURE': {'4': '', '5': '', '6': ''}}))
            o = Outcomes(root, root/'openings.jsonl', root/'inventory.json')
            q = {'act': 1, 'floor': 3}
            result, available = o.outcome('FIXTURE', q, '2026-01-01T00:01:00Z')
            self.assertEqual(result['observed_hp_loss'], 7)
            forced, _ = o.outcome('FIXTURE', {'act': 1, 'floor': 4}, '2026-01-01T00:01:00Z')
            self.assertEqual(forced['observed_hp_loss'], 7)
            self.assertIsNone(result['remaining_hp_loss'])  # F5 missing, not zero.
            self.assertEqual(result['final_floor'], 5)
            self.assertFalse(result['boss_pass'])
            self.assertEqual(result['terminal_kind'], 'first_sl_death')
            self.assertEqual(available, '2026-01-01T00:03:00Z')
            self.assertEqual(o.config('FIXTURE', '2026-01-01T00:01:00Z')['code']['commit'], 'before')
            missing, _ = o.outcome('UNKNOWN', q, '2026-01-01T00:01:00Z')
            self.assertIsNone(missing['remaining_hp_loss'])
            self.assertIsNone(missing['boss_pass'])
            self.assertIsNone(missing['final_floor'])
            o.endings['UNKNOWN'] = {'ended': '2026-01-01T00:05:00Z', 'floor': 40, 'victory': False}
            unknown_act, _ = o.outcome('UNKNOWN', q, '2026-01-01T00:01:00Z')
            self.assertIsNone(unknown_act['boss_pass'])  # A loss with no act evidence is not a failed current boss.
            same_floor, _ = o.outcome('FIXTURE', {'act': 1, 'floor': 4}, '2026-01-01T00:02:31Z')
            self.assertEqual(same_floor['observed_hp_loss'], 0)

if __name__ == '__main__': unittest.main()
