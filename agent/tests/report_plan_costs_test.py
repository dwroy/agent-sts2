"""silent-0459: fixed 4U3WNL3JRRCX F32 accounting, no live data or API calls."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'ops'))
source = ROOT / 'ops/report.py'
spec = importlib.util.spec_from_file_location('report_plan_costs', source)
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


class ReportPlanCostsTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.logs = self.root / 'logs'
        self.logs.mkdir()
        self.run = '4U3WNL3JRRCX'
        self.plan = {'run_id': self.run, 'label': 'run-plan', 'question_id': 'mv6t2svo-509097-32',
                     'engine': 'codex', 'accepted': True, 'latency_ms': 79521,
                     'usage': {'inputTokens': 145142, 'outputTokens': 1755, 'cacheHitTokens': 0}}
        self.brain = self.logs / 'brain.jsonl'
        self.brain.write_text(json.dumps(self.plan) + '\n')

    def test_fixed_complete_report_adds_the_independent_request_without_an_extra_action_or_jev_call(self):
        # Fixed aggregate counters distributed over synthetic action rows; no inferred gameplay facts.
        records = []
        states = {}
        for i in range(647):
            ts = f'2026-10-13T15:40:33.{i:03d}Z'
            row = {'id': f'action-{i}', 'ts': ts, 'mode': 'play', 'label': 'fixture', 'floor': 32,
                   'screen': 'GAME_OVER' if i == 646 else 'MAP', 'decider': 'code',
                   'fingerprint': json.dumps({'run': self.run, 'combat': False, 'hp': 20}),
                   'usage': {'input_tokens': 0, 'output_tokens': 0}, 'rationale': 'fixed accounting'}
            if i < 31:
                row.update(decider='codex', deepseek={'input_tokens': 4806356 if i == 0 else 0,
                    'output_tokens': 25160 if i == 0 else 0, 'cache_hit_tokens': 2870016 if i == 0 else 0})
            elif i < 182:
                row.update(decider='jev', usage={'input_tokens': 1224264 if i == 31 else 1, 'output_tokens': 0})
            records.append(row)
            states[ts] = {'run': {'character_id': 'SILENT', 'ascension': 10, 'floor': 32},
                          'in_combat': False, **({'game_over': {'is_victory': False}} if i == 646 else {})}
        decisions = self.logs / 'decisions.jsonl'
        decisions.write_text(''.join(json.dumps(row) + '\n' for row in records))
        runs = self.logs / 'runs.jsonl'
        old = json.dumps({'run_id': 'OLDER', 'ds_tokens_in': 123}) + '\n'
        runs.write_text(old)
        original = {path: path.read_bytes() for path in (self.brain, decisions)}
        output = io.StringIO()
        with patch.multiple(report, ROOT=str(self.root), DEC=str(decisions), STATES='fixed-states', RUNS=str(runs)), \
             patch.object(sys, 'argv', ['report', self.run]), \
             patch.object(report, 'load_run_states', return_value=states), \
             patch.object(report, 'ablation_arm', return_value={}), \
             patch.dict(sys.modules, {'module_health': types.SimpleNamespace(audit=lambda *args: None)}), \
             contextlib.redirect_stdout(output):
            self.assertEqual(report.main(code='f' * 40), 'silent')
            first = runs.read_bytes()
            report.main(code='f' * 40)
            self.assertEqual(runs.read_bytes(), first, 'rerenders must not rewrite historical run rows')
        self.assertTrue(runs.read_text().startswith(old))
        summary = json.loads(runs.read_text().splitlines()[-1])
        self.assertEqual((summary['deepseek_calls'], summary['ds_tokens_in'], summary['ds_tokens_out'], summary['ds_cache_hit']),
                         (32, 4951498, 26915, 2870016))
        self.assertEqual((summary['decisions'], summary['jev_calls'], summary['tokens']), (647, 151, 1224414))
        self.assertIn('大脑 32 次', output.getvalue())
        self.assertIn('4,951,498', output.getvalue())
        self.assertEqual(summary['brain_cost_accounting']['question_ids'], [self.plan['question_id']])
        self.assertEqual({path: path.read_bytes() for path in original}, original)

    def test_duplicates_merged_plans_reuse_foreign_runs_and_ambiguous_identity_preserve_the_baseline(self):
        rows = [self.plan, self.plan,
                {**self.plan, 'run_id': 'OTHER', 'question_id': 'foreign'},
                {**self.plan, 'question_id': 'reused', 'reused': True},
                {**self.plan, 'question_id': 'merged', 'merged_into': 'action-0'},
                *[{**self.plan, 'label': 'rest/choose', 'question_id': f'merged-action-{i}'} for i in range(4)],
                {**self.plan, 'question_id': 'represented'},
                {**self.plan, 'question_id': 'conflict'},
                {**self.plan, 'question_id': 'conflict', 'usage': {'inputTokens': 2, 'outputTokens': 1}},
                {**self.plan, 'question_id': ''}]
        self.brain.write_text(''.join(json.dumps(row) + '\n' for row in rows))
        costs = report.standalone_plan_costs(self.brain, self.run, {'represented'})
        self.assertEqual((costs['calls'], costs['input_tokens'], costs['output_tokens']), (1, 145142, 1755))
        self.assertEqual(costs['by_engine'], {'codex': 1})
        self.assertEqual(len(costs['unresolved']), 2)
        self.assertEqual(report.standalone_plan_costs(self.logs / 'missing.jsonl', self.run)['calls'], 0)
        self.assertEqual(report.standalone_plan_costs(self.brain, 'UNKNOWN')['calls'], 0)


if __name__ == '__main__':
    unittest.main()
