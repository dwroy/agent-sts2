#!/usr/bin/python3
"""Fixed accounting boundaries; no network, account or game access."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('report', Path(__file__).with_name('issue29-deepseek-report.py'))
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


class AccountingTests(unittest.TestCase):
    def test_missing_usage_stays_unknown(self):
        self.assertEqual(report.tokens({}), dict.fromkeys(['input', 'cached', 'output', 'reasoning', 'answer']))
        self.assertIsNone(report.peak_tariff_estimate({}))

    def test_both_cache_schemas_and_reasoning_subset(self):
        common = {'prompt_tokens': 1000, 'completion_tokens': 100, 'completion_tokens_details': {'reasoning_tokens': 90}}
        nova = {'usage': common | {'prompt_tokens_details': {'cached_tokens': 800}}}
        official = {'usage': common | {'prompt_cache_hit_tokens': 800}}
        self.assertEqual(report.tokens(nova), report.tokens(official))
        self.assertEqual(report.tokens(nova)['answer'], 10)
        self.assertAlmostEqual(report.peak_tariff_estimate(nova), .0001848)

    def test_stream_and_wall_rates_have_distinct_denominators(self):
        row = {'usage': {'completion_tokens': 100}, 'elapsed_ms': 2000, 'first_token_ms': 500, 'last_content_ms': 1500}
        self.assertEqual(report.rates(row), {'wall_tps': 50, 'stream_tps': 100})
        row['last_content_ms'] = 500
        self.assertIsNone(report.rates(row)['stream_tps'])

    def test_account_delta_does_not_export_balances(self):
        with tempfile.TemporaryDirectory() as directory:
            for stage, value in [('before', '10.123456'), ('after', '10.100000')]:
                (Path(directory) / f'balance-{stage}.json').write_text(json.dumps({'ts': stage, 'raw': {'balance_infos': [{'currency': 'USD', 'total_balance': value}]}}))
            with patch.object(report, 'LOCAL', Path(directory)):
                result = report.balance_change()
            self.assertEqual(result['net_account_debit'], {'USD': '0.023456'})
            self.assertNotIn('10.123456', json.dumps(result))
            self.assertNotIn('10.100000', json.dumps(result))


if __name__ == '__main__':
    unittest.main()
