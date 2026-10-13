import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('module_health', Path(__file__).resolve().parents[2] / 'ops/module_health.py')
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
CONFIG = {'run_id': 'SILENT1', 'character': 'SILENT', 'construction': {'architecture': 'V5', 'mode': 'shadow'},
          'loop': {'boss_sim_build': 'on'}}
METRIC = {'quantitative_fight': {'effective_damage_per_turn': {'n': 320, 'mean': 8}}}


def row(i, error='只跑完 24 次模拟（不足 300 次）', **extra):
    return {'run_id': 'SILENT1', 'mode': 'play', 'ts': f'2026-10-13T13:0{i}:00+00:00', 'decision_id': str(i),
            'label': 'reward/card', 'questions': {'pick': {'type': 'choice', 'criteria': {'skip': json.dumps(METRIC if not error else {})}}},
            'boss_sim': {'error': error} if error else {'samples': 320, 'ms': 11_000}, **extra}


class Health(unittest.TestCase):
    def summary(self, rows, **kw):
        return h.summarize(CONFIG, rows, kw.get('brains', []), {'decisions_complete': True})

    def test_threshold_and_duplicate_records(self):
        r = self.summary([row(1), row(2), row(2), row(3)])
        self.assertTrue(r['alert'])
        self.assertEqual(r['b3']['attempts'], 3)
        self.assertEqual(r['b3']['failures'], {'below_minimum_samples': 3})
        self.assertEqual(r['b3']['paired_samples_min'], 24)
        self.assertFalse(self.summary([row(1), row(2)])['alert'])

    def test_recovery_preserves_failure_and_distinguishes_delivery(self):
        rows = [row(1), row(2), row(3), row(4, None)]
        b = {'run_id': 'SILENT1', 'label': 'reward/card', 'question_id': 'q', 'options': {'skip': json.dumps(METRIC)}, 'accepted': True}
        r = self.summary(rows, brains=[b, b])
        self.assertEqual(r['b3']['trailing_failure_streak'], 0)
        self.assertEqual(r['b3']['produced_dpr'], 1)
        self.assertEqual(r['brain']['accepted_with_dpr'], 1)
        self.assertIn('unknown', r['brain']['decision_use'])
        self.assertTrue(r['alert'])

    def test_skips_do_not_create_incidents(self):
        rows = [row(1, boss_sim={'skipped': 'boss defeated'}), row(2, questions=None), row(3, label='combat/plan')]
        r = self.summary(rows)
        self.assertEqual(r['b3']['attempts'], 0)
        self.assertEqual(r['b3']['skipped'], 1)
        self.assertFalse(r['alert'])
        self.assertIsNone(h.summarize({**CONFIG, 'character': 'REGENT'}, rows, [], {}))
        self.assertIsNone(h.summarize({**CONFIG, 'construction': {'architecture': 'V4'}}, rows, [], {}))
        off = {**CONFIG, 'loop': {'boss_sim_build': 'off'}}
        self.assertFalse(h.summarize(off, [row(1), row(2), row(3)], [], {})['alert'])

    def test_zero_censored_and_structured_failures(self):
        r = self.summary([row(1, '11000 ms 内没有跑完一个样本'), row(2, None, questions={'pick': {'type': 'choice', 'criteria': {}}}),
                          row(3, boss_sim={'diagnostics': {'reason': 'below_minimum_samples', 'samples': 16}})])
        self.assertEqual(r['b3']['failures'], {'zero_paired_samples': 1, 'no_complete_dpr': 1, 'below_minimum_samples': 1})
        self.assertEqual(h.dpr_count({'x': {'quantitative_fight': {'effective_damage_per_turn': {'n': 0, 'mean': None}}}}), 0)

    def test_explicit_unsupported_candidates_are_separate_from_missing_dpr(self):
        # WA7FRJ7UABCV F22: 1000 paired samples, both actual candidates explicitly unsupported.
        reason = '这个选项的效果没有换算成牌组或血量的变化：不模拟'
        criteria = {'o0': json.dumps({'boss_sim': reason}), 'o1': {'boss_sim': reason}}
        unsupported = row(1, None, floor=22, label='event/choose',
                          questions={'pick': {'type': 'choice', 'criteria': criteria}},
                          boss_sim={'samples': 1000, 'requested': 1000, 'not_simulated': dict.fromkeys(criteria, reason)})
        r = self.summary([unsupported])
        self.assertEqual(r['b3']['failures'], {})
        self.assertEqual(r['b3']['unsupported_only'], 1)
        self.assertEqual(r['b3']['attempts'], 1)
        self.assertEqual(r['b3']['produced_dpr'], 0)
        self.assertEqual(r['b3']['coverage'], 0)
        self.assertEqual(r['b3']['paired_samples_min'], 1000)
        self.assertEqual(r['b3']['candidates'], {'observed': 2, 'unsupported': 2, 'with_dpr': 0, 'missing_dpr': 0})
        self.assertFalse(r['alert'])
        # An intentional absence breaks a consecutive service-failure streak without erasing failures.
        r = self.summary([row(0), unsupported, row(2), row(3)])
        self.assertEqual(r['b3']['failures'], {'below_minimum_samples': 3})
        self.assertEqual(r['b3']['longest_failure_streak'], 2)
        self.assertFalse(r['alert'])

    def test_missing_candidate_dpr_is_not_hidden_by_another_candidate_or_exclusion(self):
        def candidate(criteria, exclusions):
            return row(1, None, questions={'pick': {'type': 'choice', 'criteria': criteria}},
                       boss_sim={'samples': 1000, 'not_simulated': exclusions})
        r = self.summary([candidate({'o0': METRIC, 'o1': {}}, {'o1': 'not supported'})])
        self.assertEqual(r['b3']['failures'], {})
        self.assertEqual(r['b3']['produced_dpr'], 1)
        self.assertEqual(r['b3']['unsupported_only'], 0)
        self.assertEqual(r['b3']['candidates']['unsupported'], 1)
        r = self.summary([candidate({'o0': METRIC, 'o1': {}}, {'other': 'not supported'})])
        self.assertEqual(r['b3']['failures'], {'incomplete_candidate_dpr': 1})
        self.assertEqual(r['failures'][0]['candidates']['missing_dpr'], 1)
        for exclusions in ({}, {'o0': True}, {'o0': ''}, {'other': 'not supported'}):
            with self.subTest(exclusions=exclusions):
                r = self.summary([candidate({'o0': {}}, exclusions)])
                self.assertEqual(r['b3']['failures'], {'no_complete_dpr': 1})
        grouped = {'quantitative_fight_by_card': {'card': METRIC['quantitative_fight']}}
        r = self.summary([candidate({'o0': grouped, 'unavailable': None}, {})])
        self.assertEqual(r['b3']['candidates']['with_dpr'], 1)
        self.assertEqual(r['b3']['candidates']['observed'], 1)
        self.assertEqual(r['b3']['produced_dpr'], 1)

    def test_unsupported_metadata_never_masks_failed_or_absent_sampling(self):
        question = {'pick': {'type': 'choice', 'criteria': {'o0': {}}}}
        exclusion = {'not_simulated': {'o0': 'not supported'}}
        cases = [(dict(exclusion, error='只跑完 16 次模拟（不足 300 次）'), 'below_minimum_samples'),
                 (dict(exclusion, error='11000 ms 内没有跑完一个样本'), 'zero_paired_samples'),
                 (dict(exclusion, samples=0), 'no_complete_dpr'),
                 (dict(exclusion, samples=True), 'no_complete_dpr'),
                 (exclusion, 'missing_simulation_record')]
        for sim, reason in cases:
            with self.subTest(reason=reason):
                r = self.summary([row(1, boss_sim=sim, questions=question)])
                self.assertEqual(r['b3']['failures'], {reason: 1})
                self.assertEqual(r['b3']['unsupported_only'], 0)
                self.assertEqual(r['b3']['produced_dpr'], 0)

    def test_queue_dedup_crash_retry_and_immutable_evidence(self):
        with tempfile.TemporaryDirectory() as d:
            directory = Path(d)
            report = self.summary([row(1), row(2), row(3)])
            h.persist(report, directory)
            alert = directory / 'module-health/SILENT1-alert.json'
            original = alert.read_bytes()
            queue = list((directory / 'queue').glob('*.md'))
            self.assertEqual(len(queue), 1)
            self.assertRegex(queue[0].name, r'^\d+-module-health\.md$')
            # Simulate interruption after queue creation but before delivery marker.
            (directory / 'module-health/SILENT1-queued.json').unlink()
            h.persist(report, directory)
            self.assertEqual(len(list((directory / 'queue').glob('*.md'))), 1)
            queue[0].unlink()  # Scheduler consumed it; no repeat event on later ticks.
            h.persist({**report, 'complete': False}, directory)
            self.assertFalse(list((directory / 'queue').glob('*.md')))
            self.assertEqual(alert.read_bytes(), original)
            saved = json.loads((directory / 'module-health/SILENT1.json').read_text())
            self.assertTrue(saved['complete'])

    def test_tail_incomplete_and_malformed_lines(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'log.jsonl'
            path.write_bytes(b'{"ts":"a"}\ninvalid\n{"ts":"b"}\n{"ts":')
            rows, source = h.read_tail(path)
            self.assertEqual([r['ts'] for r in rows], ['a', 'b'])
            self.assertEqual(source['malformed'], 1)
            self.assertFalse(source['complete'])
            rows, source = h.read_tail(path, 20)
            self.assertGreater(source['start'], 0)
            self.assertFalse(source['complete'])
            self.assertTrue(all('sha256' in r['_source'] for r in rows))


if __name__ == '__main__':
    unittest.main()
