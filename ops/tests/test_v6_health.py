"""Fixed V6 supervision fixtures; never opens production logs or calls models/the game."""
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'ops'))
from v6_health import markdown, read_rows, report


def timestamp(seconds):
    return (datetime(2026, 10, 1, tzinfo=timezone.utc) + timedelta(seconds=seconds)).isoformat()


def config(run='V6', seconds=100, mode='on', character='silent', ascension=10):
    return {'run_id': run, 'ts': timestamp(seconds), 'character': character, 'ascension': ascension,
            'v6': {'mode': mode, 'budgets': {'jev_ms': 5000, 'pick_ms': 5000, 'act_ms': 60000, 'brain_soft_cap': 15}}}


def build(run='V6', seconds=101, **kwargs):
    return {'run_id': run, 'ts': timestamp(seconds), 'question_id': 'q', 'kind': 'card_pick', 'mode': 'on',
            'stage': 'decision', 'elapsed_ms': 1000, 'jev_answer': {'choice': 'skip'}, 'fallback': None,
            'unknown': {'count': 1, 'total': 2}, **kwargs}


def decision(run='V6', seconds=160, **kwargs):
    return {'ts': timestamp(seconds), 'fingerprint': json.dumps({'run': run}), 'mode': 'play',
            'decider': 'jev', 'screen': 'GAME_OVER', 'label': 'reward/card', **kwargs}


def inputs(**kwargs):
    return {'configs': [config()], 'build': [], 'decisions': [decision()], 'plans': [], 'brains': [], **kwargs}


class HealthTests(unittest.TestCase):
    def test_latency_stages_fallback_denominators_and_duplicate_rows(self):
        rows = [build(seconds=101 + n, question_id=f'q{n}', elapsed_ms=1000 * n,
                      fallback='fixed_timeout' if n == 4 else None) for n in range(5)]
        projection = build(stage='projection', elapsed_ms=4400, jev_answer=None)
        trigger = build(kind='act', stage='trigger', elapsed_ms=0, jev_answer=None,
                        triggers=['T1', 'T1', 'T6'], merged_triggers=['T6'], skipped_triggers=['T1'])
        repeated_poll = {**trigger, 'ts': timestamp(110)}
        result = report(inputs(build=rows + [rows[0], projection, trigger, repeated_poll]))['runs'][0]
        card = result['kinds']['card_pick']
        self.assertEqual(card['logged_jev_questions'], 5)
        self.assertEqual(card['fallback_rate'], .2)
        self.assertEqual(card['jev_ms'], {'n': 5, 'p50_ms': 2000., 'p90_ms': 3600., 'max_ms': 4000})
        self.assertEqual(card['projection_ms']['max_ms'], 4400)
        self.assertEqual(result['kinds']['act']['projection_ms']['n'], 0)
        self.assertEqual(result['triggers']['T1'], 1)
        self.assertEqual(result['unknown'], {'count': 6, 'total': 12, 'fraction': .5, 'measured_rows': 6})
        self.assertIn('V6_CARD_DECIDER=brain', [a['action'] for a in result['advice']])

    def test_missing_measurements_remain_unknown_and_legacy_trigger_is_not_latency(self):
        trigger = build(kind='replan', stage=None, elapsed_ms=0, jev_answer=None, triggers=['T7'])
        row = report(inputs(build=[trigger]))['runs'][0]
        self.assertIsNone(row['unknown']['fraction'])
        self.assertIsNone(row['brain']['v6_reserved_max'])
        self.assertIsNone(row['brain']['logged_questions'])
        self.assertEqual(row['triggers']['T7'], 1)
        self.assertEqual(row['kinds']['replan']['projection_ms']['n'], 0)
        self.assertEqual(row['completion'], 'terminal_observed')
        self.assertEqual(row['observed_window_s'], 60)

    def test_brain_latency_is_not_projection_or_jev_and_projection_errors_are_reported(self):
        row = report(inputs(build=[build(kind='replan', stage='brain', elapsed_ms=91001, jev_answer=None,
                                        fallback='brain_request_failed', triggers=['T7'])],
                            plans=[{'run': 'V6', 'v6_projection_error': 'fixed failure'}]))['runs'][0]
        measured = row['kinds']['replan']
        self.assertEqual(measured['brain_ms']['max_ms'], 91001)
        self.assertEqual(measured['projection_ms']['n'], 0)
        self.assertEqual(measured['logged_jev_questions'], 0)
        self.assertIsNone(row['unknown']['fraction'])
        self.assertEqual(row['triggers']['T7'], 0)
        self.assertEqual(row['errors']['v6_projection_error'], 1)
        self.assertIn('replan:brain_ms:budget_overrun', [a['reason'] for a in row['advice']])

    def test_brain_reservations_are_distinct_from_journal_questions_and_errors(self):
        row = report(inputs(plans=[{'run': 'V6', 'v6_brain_calls': 17}, {'run': 'V6', 'v6_brain_calls': 16},
                                   {'run': 'V6', 'v6_error': 'fixed failure'}],
                            brains=[{'run_id': 'V6', 'question_id': 'q', 'ts': timestamp(103), 'engine': 'codex'},
                                    {'run_id': 'V6', 'question_id': 'q', 'ts': timestamp(104), 'engine': 'codex', 'error': 'retry'}],
                            decisions=[decision(decider='codex', gate_reject=True), decision(seconds=161, reused_answer=True, decider='codex')]))['runs'][0]
        self.assertEqual(row['brain'], {'v6_reserved_max': 17, 'logged_questions': 1, 'decision_observations_lower_bound': 1})
        self.assertEqual(row['errors']['v6_planner_error'], 1)
        self.assertEqual(row['errors']['brain_error'], 1)
        self.assertIn('brain_soft_cap_exceeded', [a['reason'] for a in row['advice']])
        self.assertIn('dispatch_error_or_gate_rejection', [a['reason'] for a in row['advice']])

    def test_batches_do_not_deduplicate_identical_question_ids_across_runs(self):
        configs = [config(f'V6-{n}', seconds=100 + n) for n in range(11)]
        value = report(inputs(configs=configs, build=[build(run=f'V6-{n}') for n in range(11)],
                              decisions=[decision(run=f'V6-{n}', seconds=200 + n) for n in range(11)],
                              brains=[{'run_id': f'V6-{n}', 'question_id': 'same', 'ts': timestamp(101), 'engine': 'codex'} for n in range(11)]))
        first, second = value['batches_of_ten']
        self.assertTrue(first['complete_ten']); self.assertFalse(second['complete_ten'])
        self.assertEqual(first['kinds']['card_pick']['logged_jev_questions'], 10)
        self.assertEqual(first['brain']['logged_questions'], 10)
        self.assertEqual(len(second['runs']), 1)

    def test_comparison_uses_explicit_existing_earlier_same_scope_only(self):
        configurations = [config(), config('V5', 0, 'off'), config('OTHER', 0, 'off', 'ironclad'),
                          config('LATER', 200, 'off'), config('A0', 0, 'off', ascension=0)]
        decisions = [decision(), decision('V5', 30), decision('OTHER', 10), decision('LATER', 250), decision('A0', 10)]
        data = inputs(configs=configurations, decisions=decisions + [decision(seconds=999, mode='shadow')])
        self.assertEqual(len(report(data)['runs']), 1)
        own = next(r for r in report(data, ['V5', 'OTHER', 'LATER', 'A0'])['runs'] if r['run_id'] == 'V6')
        self.assertEqual(own['baseline'], {'selected_pre_v6_n': 1, 'median_observed_window_s': 30, 'ratio': 2})

    def test_ten_run_reports_retain_planner_errors_and_human_readable_metrics(self):
        value = report(inputs(build=[build()], plans=[{'run': 'V6', 'v6_projection_error': 'fixed'}]))
        self.assertEqual(value['batches_of_ten'][0]['errors']['v6_projection_error'], 1)
        rendered = markdown(value)
        self.assertIn('已有 V5 基线 0 局', rendered)
        self.assertIn('### 第 1 组', rendered)
        self.assertEqual(rendered.count('| card_pick |'), 2)

    def test_partial_invalid_logs_keep_digest_and_discard_prompt_bodies(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'input.jsonl'
            raw = (json.dumps({'run_id': 'V6', 'payload': 'private prompt', 'system': 'private', 'question': 'private', 'elapsed_ms': 3}) + '\n{broken\n{"ts":').encode()
            path.write_bytes(raw)
            rows, info = read_rows(path)
            self.assertEqual(rows, [{'run_id': 'V6', 'elapsed_ms': 3}])
            self.assertEqual(info['invalid_lines'], 2); self.assertTrue(info['partial_tail'])
            self.assertEqual(info['sha256'], hashlib.sha256(raw).hexdigest())
            value = report(inputs()); value['sources'] = {'fixture': info}
            self.assertIn('无效行 2', markdown(value))

    def test_cli_reads_plural_plan_file_and_preserves_source_logs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = {'run-config': [config()], 'decisions': [decision()], 'v6-build': [build()],
                    'run-plans': [{'run': 'V6', 'v6_brain_calls': 4}]}
            for name, rows in data.items():
                (root / f'{name}.jsonl').write_text(''.join(json.dumps(r) + '\n' for r in rows))
            before = {p: p.read_bytes() for p in root.glob('*.jsonl')}
            command = [sys.executable, str(ROOT / 'ops/v6_health.py'), '--logs', str(root), '--out', str(root / 'report')]
            subprocess.run(command, check=True, capture_output=True)
            result = json.loads((root / 'report.json').read_text())
            self.assertEqual(result['runs'][0]['brain']['v6_reserved_max'], 4)
            self.assertTrue((root / 'report.md').is_file())
            self.assertEqual(before, {p: p.read_bytes() for p in before})
            failed = subprocess.run(command[:-1] + [str(root / 'decisions.jsonl')], capture_output=True)
            self.assertNotEqual(failed.returncode, 0)
            self.assertEqual(before, {p: p.read_bytes() for p in before})
