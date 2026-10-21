#!/usr/bin/python3
"""Fixed-data checks for the replay's budget and reporting boundaries. No API calls."""
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load(name):
    spec = importlib.util.spec_from_file_location(name, HERE / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


report = load('issue29-brain-speed-report')
availability = load('issue29-availability')


class EvidenceBoundaries(unittest.TestCase):
    def test_quantiles_and_empty_measurements(self):
        self.assertIsNone(report.quantile([], .9))
        self.assertEqual(report.quantile([40, 10, 20, 30], .5), 25)
        self.assertEqual(report.quantile([40, 10, 20, 30], .9), 37)

    def test_wait_heartbeats_are_not_additive(self):
        common = {'run_id': 'run', 'question_id': 'q', 'since': '2026-10-20T00:00:00Z'}
        waits = [dict(common, ts='2026-10-20T00:00:10Z', state='heartbeat', retries=1,
                      categories=['capacity'], suspended_ms=500000),
                 dict(common, ts='2026-10-20T00:00:30Z', state='resumed', retries=1,
                      categories=[], suspended_ms=520000)]
        episodes = report.wait_episodes(waits)
        self.assertEqual(len(episodes), 1)
        self.assertEqual(episodes[0]['episode_ms'], 30000)
        self.assertEqual(episodes[0]['retry_count'], 1)
        self.assertEqual(episodes[0]['terminal_state'], 'resumed')

    def test_pairing_uses_same_round_and_success_denominator(self):
        def row(group, round, accepted, ms, choice):
            return {'id': 'q01', 'group': group, 'round': round, 'stratum': 'reward',
                    'accepted': accepted, 'elapsed_ms': ms, 'result': {'answer': {'choice': choice}}}
        results = [row('A', 1, True, 1000, 'a'), row('A', 2, True, 4000, 'b'),
                   row('B', 1, False, 500, 'b'), row('B', 2, True, 2000, 'b')]
        by_key = {f"{r['id']}/{r['round']}/{r['group']}": r for r in results}
        value = report.paired_summary(results, by_key)[0]
        self.assertEqual(value['attempted_pairs'], 2)
        self.assertEqual(value['both_accepted'], 1)
        self.assertEqual(value['primary_same'], 1)
        self.assertEqual(value['median_ratio_to_A'], .5)

    def test_agreement_ignores_prose_but_keeps_card_selection(self):
        self.assertEqual(report.action({'route': 'a,b', 'reason': 'first'}),
                         report.action({'route': ['a', 'b'], 'reason': 'second'}))
        self.assertNotEqual(report.action({'choice': 'smith', 'cards': ['a']}),
                            report.action({'choice': 'smith', 'cards': ['b']}))

    def test_capacity_quota_and_rate_limit_are_distinct(self):
        self.assertEqual(availability.classify('Selected model is at capacity'), ['capacity'])
        self.assertEqual(availability.classify('Codex usage guard refused'), ['quota_guard'])
        self.assertEqual(availability.classify('HTTP 429: too many requests'), ['rate_limit'])

    def test_persisted_budget_refuses_before_exec_across_restarts(self):
        source = (HERE / 'issue29-brain-speed.ts').read_text()
        wrapper = re.search(r'writeFileSync\(wrapper, `(.*?)`, \{ mode:', source, re.S).group(1)
        # The guard exits before os.execv, so this test cannot dispatch a model request.
        scratch = HERE.parents[1] / 'data/issue29-test'
        scratch.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as name:
            folder = Path(name)
            script = folder / 'codex-budget'
            script.write_text(wrapper)
            for n in range(1, 101):
                (folder / f'claim-{n}.json').write_text('{}')
            for _ in range(2):
                result = subprocess.run([sys.executable, str(script), 'exec'], capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('100-call budget exhausted', result.stderr)
                self.assertEqual(len(list(folder.glob('claim-*.json'))), 100)


if __name__ == '__main__':
    unittest.main()
