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
    def test_computation_failures_and_degraded_b2_are_counted_once_and_alerted(self):
        def attempt(i, status, failure):
            return row(i, label='combat/plan', boss_sim={'completion': {
                'key': 'same', 'attempt_id': str(i), 'attempts': i, 'status': status,
                'failure': failure, 'reasons': ['worker stalled'], 'samples': 320 if i == 3 else 0, 'requested': 600}})
        rows = [attempt(1, 'pending', True), attempt(2, 'pending', True), attempt(3, 'degraded', False)]
        r = self.summary(rows + rows)
        self.assertEqual({k: r['computation'][k] for k in ('attempts', 'failures', 'degraded')},
                         {'attempts': 3, 'failures': 2, 'degraded': 1})
        self.assertTrue(r['alert'])
        self.assertEqual(r['b3']['attempts'], 0)
        self.assertTrue(self.summary(rows[:1])['computation']['alert'])
        again = attempt(4, 'pending', True)
        again['boss_sim']['completion']['attempts'] = 1
        self.assertEqual(self.summary(rows + [again])['computation']['failures'], 3)

    def test_readiness_shadow_and_actual_payload_readback(self):
        config = {**CONFIG, 'loop': {**CONFIG['loop'], 's_readiness': 'shadow'}}
        ready = {'schema': 'boss-readiness-v1', 'ms': 7,
                 'trust': {'rankingEligible': True, 'sign_audit': {'rankingEligible': True}}}
        records = [row(1, None, boss_sim={'samples': 1000, 'readiness': ready})]
        shadow = h.summarize(config, records, [], {})['s_readiness']
        self.assertEqual((shadow['expected'], shadow['produced'], shadow['brain_delivered']), (1, 1, 0))
        self.assertEqual(shadow['ms_max'], 7)
        brain = {'run_id': 'SILENT1', 'label': 'reward/card', 'question_id': 'q', 'accepted': True,
                 'payload': {'facts': {'boss_readiness': '当前牌组Boss模拟胜率50%（固定夹具）'}}}
        on = h.summarize(config, records, [brain, brain], {})['s_readiness']
        self.assertEqual((on['brain_delivered'], on['brain_accepted']), (1, 1))
        missing = h.summarize(config, [row(i, None) for i in range(3)], [], {})
        self.assertTrue(missing['alert'])
        self.assertTrue(missing['s_readiness']['alert'])
        self.assertFalse(h.summarize(CONFIG, [row(i, None) for i in range(3)], [], {})['s_readiness']['alert'])
        low = {**ready, 'trust': {'rankingEligible': False, 'bossTrustReason': 'fixture low trust',
                                'sign_audit': {'rankingEligible': True}}}
        actual = h.summarize(config, [row(1, None, boss_sim={'samples': 1000, 'readiness': low})], [], {})['s_readiness']
        self.assertEqual((actual['low_trust'], actual['sign_rejected']), (1, 0))
        self.assertFalse(actual['alert'])

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

    def test_explicit_unsupported_candidates_preserve_observed_denominator(self):
        # WA7FRJ7UABCV F22 event/choose: 1000 samples, both options excluded.
        options = {'o0': json.dumps({'option': '学习杀灭的技巧'}),
                   'o1': json.dumps({'option': '学习压扁的技巧'}), 'inactive': None}
        sim = {'samples': 1000, 'ms': 10801, 'options': {},
               'not_simulated': {'o0': '效果没有换算：不模拟', 'o1': '效果没有换算：不模拟'}}
        unsupported = row(2, None, label='event/choose', floor=22, boss_sim=sim,
                          questions={'pick': {'type': 'choice', 'criteria': options}})
        report = self.summary([row(1), unsupported, row(3), row(4, None)])
        self.assertEqual(report['b3']['attempts'], 4)
        self.assertEqual(report['b3']['failures'], {'below_minimum_samples': 2})
        self.assertEqual(report['b3']['unsupported'], 1)
        self.assertEqual(report['b3']['applicable_attempts'], 3)
        self.assertEqual(report['b3']['coverage'], 1 / 4)
        self.assertEqual(report['b3']['applicable_coverage'], 1 / 3)
        self.assertEqual(report['b3']['produced_dpr'], 1)
        self.assertEqual(report['b3']['longest_failure_streak'], 2)
        self.assertFalse(report['alert'])
        self.assertEqual(report['b3']['ms_max'], 11000)
        self.assertEqual(report['unsupported'][0]['not_simulated'], sim['not_simulated'])
        alone = self.summary([unsupported])
        self.assertIsNone(alone['b3']['applicable_coverage'])
        self.assertEqual(alone['b3']['paired_samples_min'], 1000)
        self.assertEqual(alone['b3']['produced_dpr'], 0)

    def test_unsupported_labels_do_not_hide_missing_supported_candidates(self):
        options = {'o0': '{}', 'o1': '{}'}
        sim = {'samples': 1000, 'options': {}, 'not_simulated': {'o0': '不模拟', 'o1': '不模拟'}}
        for change in ({'not_simulated': {'o0': '不模拟'}},
                       {'not_simulated': {'o0': '', 'o1': '不模拟'}},
                       {'samples': 0}, {'samples': None},
                       {'options': {'o1': {'win': 0}}},
                       {'options': {'o1|card': {'win': 0}}}):
            with self.subTest(change=change):
                report = self.summary([row(1, None, label='event/choose', boss_sim={**sim, **change},
                    questions={'pick': {'type': 'choice', 'criteria': options}})])
                self.assertEqual(report['b3']['unsupported'], 0)
                self.assertEqual(report['b3']['failures'], {'no_complete_dpr': 1})
        for criteria in ({}, {'o0': None}, {'o2': '{}'}, {'o0': 'invalid-json', 'o2': '{}'}):
            with self.subTest(criteria=criteria):
                report = self.summary([row(1, None, boss_sim=sim,
                    questions={'pick': {'type': 'choice', 'criteria': criteria}})])
                self.assertEqual(report['b3']['failures'], {'no_complete_dpr': 1})

    def test_unsupported_choices_keep_sampling_and_transport_failures(self):
        options = {'o0': '{}'}
        for sim, reason in (
                ({'not_simulated': {'o0': '不模拟'}}, 'missing_simulation_record'),
                ({'samples': 0, 'error': '11000 ms 内没有跑完一个样本',
                  'not_simulated': {'o0': '不模拟'}}, 'zero_paired_samples'),
                ({'diagnostics': {'reason': 'below_minimum_samples', 'samples': 16},
                  'not_simulated': {'o0': '不模拟'}}, 'below_minimum_samples')):
            with self.subTest(reason=reason):
                report = self.summary([row(1, None, boss_sim=sim,
                    questions={'pick': {'type': 'choice', 'criteria': options}})])
                self.assertEqual(report['b3']['unsupported'], 0)
                self.assertEqual(report['b3']['failures'], {reason: 1})

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
        # Unsupported choices do not break a streak of consecutive applicable failures.
        r = self.summary([row(0), unsupported, row(2), row(3)])
        self.assertEqual(r['b3']['failures'], {'below_minimum_samples': 3})
        self.assertEqual(r['b3']['longest_failure_streak'], 3)
        self.assertTrue(r['alert'])

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
        # An actual simulation result overrides contradictory exclusion metadata.
        mixed = candidate({'o0': METRIC, 'o1': {}}, {'o1': 'not supported'})
        mixed['boss_sim']['options'] = {'o1|card': {'win': 0}}
        r = self.summary([mixed])
        self.assertEqual(r['b3']['failures'], {'incomplete_candidate_dpr': 1})
        self.assertEqual(r['b3']['candidates']['missing_dpr'], 1)
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

    def test_construction_delivery_plan_persistence_and_readback_are_distinct(self):
        config = {**CONFIG, 'construction': {**CONFIG['construction'], 'evaluation': 'same-question-combat-facts'}}
        evaluation = {'schema': 'construction-evaluation-v1', 'run': 'SILENT1', 'floor': 2, 'coreCatalog': [{'id': 'P'}]}
        direction = {'primary': 'P', 'alternatives': [], 'checkpoint': 5, 'reason': 'fixture', 'pivot_if': 'fixture'}
        brain = {'run_id': 'SILENT1', 'question_id': 'q1', 'ts': '2026-10-14T00:00:00Z', 'label': 'reward/card', 'accepted': True,
                 'payload': {'facts': {'construction_evaluation': evaluation}, 'run_plan_task': {}},
                 'answer': {'choice': 'skip', 'run_plan': {'construction': direction}}}
        plan = {'ts': '2026-10-14T00:00:01Z', 'plan': {'runId': 'SILENT1', 'floor': 2, 'construction': direction}}
        next_question = {'run_id': 'SILENT1', 'question_id': 'q2', 'ts': '2026-10-14T00:05:00Z', 'label': 'reward/card',
                         'payload': {'facts': {'floor': 5, 'your_run_plan': {'made_on_floor': 2, 'construction': direction}},
                                     'run_plan_task': {'trigger': 'review'}}}
        decision = row(1, None, boss_sim={'samples': 320, 'construction': {'evaluation': evaluation,
            'evaluation_delivery': 'attached', 'admission': {'admitted': [], 'reason': 'missing_calibration'}}})
        result = h.summarize(config, [decision], [brain, next_question, brain], {}, [plan])['construction_pipeline']
        for key in ('evaluation_attached', 'accepted_evaluation', 'accepted_choice_with_evaluation',
                    'accepted_structured_plan', 'saved_structured_plan', 'plan_readback', 'checkpoint_review_due'):
            self.assertEqual(result[key], 1, key)
        self.assertEqual(result['probability_delivered'], 0)
        self.assertFalse(result['alert'])
        without_save = h.summarize(config, [decision], [brain, next_question], {}, [])['construction_pipeline']
        self.assertEqual(without_save['plan_readback'], 0)
        self.assertEqual(without_save['saved_structured_plan'], 0)
        # A requested flag or accepted answer does not prove the construction payload or plan arrived.
        broken = [row(i, None, boss_sim={'samples': 320, 'construction': {'evaluation': evaluation}}) for i in range(3)]
        failure = h.summarize(config, broken, [], {})['construction_pipeline']
        self.assertTrue(failure['alert'])
        self.assertEqual(failure['evaluation_missing'], 3)
        self.assertEqual(failure['accepted_evaluation'], 0)
        shopping = {**brain, 'label': 'shop/plan', 'answer': {'plan': [], 'run_plan': {'construction': direction}}}
        self.assertEqual(h.summarize(config, [], [shopping], {})['construction_pipeline']['accepted_choice_with_evaluation'], 1)
        malformed = {**brain, 'answer': {'choice': 'skip', 'run_plan': {'construction': {'primary': []}}}}
        self.assertEqual(h.summarize(config, [], [malformed], {})['construction_pipeline']['missing_structured_plan'], 1)


if __name__ == '__main__':
    unittest.main()
