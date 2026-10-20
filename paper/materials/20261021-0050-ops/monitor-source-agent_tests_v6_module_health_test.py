"""Fixed RBMEQGXPE9Z2 F2/3/4/6 service contract; no live knowledge inputs."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('module_health', Path(__file__).resolve().parents[2] / 'ops/module_health.py')
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
CONFIG = {'run_id': 'RBMEQGXPE9Z2', 'character': 'SILENT',
          'construction': {'architecture': 'V5'}, 'loop': {'boss_sim_build': 'on'},
          'v6': {'mode': 'on', 'deciders': {'card': 'jev'}}}


def fixture(floor=2):
    # Four actual current-Boss sample counts were 34/26/26/42, below the V5 gate.
    options = ('skip', 'card0', 'card1', 'card2')
    ts = f'2026-10-20T15:58:{floor:02d}.000Z'
    later = f'2026-10-20T15:58:{floor:02d}.100Z'
    decision = {'run_id': CONFIG['run_id'], 'mode': 'play', 'ts': later, 'floor': floor,
                'decision_id': f'd{floor}', 'label': 'reward/card', 'decider': 'jev',
                'v6_card': {'entries': []}, 'fallback': False, 'result': 'completed: Action completed.',
                'questions': {'pick': {'type': 'choice', 'criteria': dict.fromkeys(options, 'fixed offer')}},
                'answers': {'pick': {'choice': 'card1'}}}
    n = {2: 34, 3: 26, 4: 26, 6: 42}.get(floor, 34)
    metrics = {k: {'mean': 1, 'se': 0, 'n': n} for k in ('hp_loss', 'turns', 'damage_per_turn', 'death_rate')}
    result = {'run_id': CONFIG['run_id'], 'floor': floor, 'ts': ts,
              'table': {'schema': 'v6-card-combat-results-v1', 'targets': [{'kind': 'current', 'id': 'boss'}],
                        'immediate': [{'option_id': key, 'target_id': 'boss', 'samples': n,
                                       'requested_samples': 100, 'metrics': deepcopy(metrics),
                                       'paired_delta': deepcopy(metrics), 'unknown_reasons': []} for key in options]}}
    build = {'schema': 'v6-build-log-v1', 'run_id': CONFIG['run_id'], 'ts': later,
             'question_id': f'd{floor}', 'kind': 'card_pick', 'mode': 'on',
             'jev_answer': {'choice': 'card1'}, 'fallback': None, 'unknown': {'count': 0, 'total': 4}}
    return decision, result, build


def summary(decisions, results=(), builds=(), config=CONFIG):
    return h.summarize(config, decisions, [], {'decisions_complete': True}, card_results=results, v6_builds=builds)


class V6Health(unittest.TestCase):
    def test_real_v6_route_uses_computation_and_consumption_not_legacy_b3(self):
        decisions, results, builds = map(list, zip(*(fixture(f) for f in (2, 3, 4, 6))))
        report = summary(decisions + decisions, results, builds)
        self.assertEqual(report['b3']['attempts'], 0)
        self.assertEqual(report['b3']['failures'], {})
        self.assertFalse(report['alert'])
        self.assertEqual({k: report['v6_card'][k] for k in ('expected', 'computed', 'available', 'consumed', 'partial')},
                         dict(expected=4, computed=4, available=4, consumed=4, partial=4))
        self.assertIn('not proof of candidate correctness', report['v6_card']['limits'])

    def test_v6_marker_or_switch_alone_does_not_exempt_v5(self):
        for changes, config in (({'v6_card': None}, CONFIG), ({'decider': 'brain'}, CONFIG),
                                ({}, {**CONFIG, 'v6': {'mode': 'off'}}),
                                ({}, {**CONFIG, 'v6': {'mode': 'on', 'deciders': {'card': 'brain'}}})):
            with self.subTest(changes=changes, config=config):
                decisions = [{**fixture(f)[0], **changes} for f in (2, 3, 4)]
                report = summary(decisions, config=config)
                self.assertEqual(report['b3']['failures'], {'missing_simulation_record': 3})
                self.assertTrue(report['alert'])
                self.assertEqual(report['v6_card']['expected'], 0)

    def test_missing_unknown_incomplete_and_error_receipts_stay_failures(self):
        def mutate(result, change):
            table = result['table']
            if change == 'missing': return None
            if change == 'schema': table['schema'] = 'wrong'
            if change == 'floor': result['floor'] = 99
            if change == 'run': result['run_id'] = 'OTHER'
            if change == 'future': result['ts'] = '2099-01-01T00:00:00Z'
            if change == 'unknown': table['targets'][0]['unknown'] = 'not observed'
            if change == 'error': table['error'] = 'worker failed'
            if change == 'candidate': table['immediate'].pop()
            if change == 'duplicate': table['immediate'].append(deepcopy(table['immediate'][0]))
            if change == 'samples': table['immediate'][0]['samples'] = 0
            if change == 'metric': table['immediate'][0]['metrics']['damage_per_turn'] = None
            if change == 'nan': table['immediate'][0]['metrics']['damage_per_turn']['mean'] = float('nan')
            if change == 'paired': table['immediate'][0]['paired_delta']['death_rate']['n'] = 0
            if change == 'reasons': table['immediate'][0]['unknown_reasons'] = ['insufficient_samples']
            return result
        for change in ('missing', 'schema', 'floor', 'run', 'future', 'unknown', 'error', 'candidate',
                       'duplicate', 'samples', 'metric', 'nan', 'paired', 'reasons'):
            with self.subTest(change=change):
                fixtures = [fixture(f) for f in (2, 3, 4)]
                results = [r for _, result, _ in fixtures if (r := mutate(result, change)) is not None]
                report = summary([d for d, _, _ in fixtures], results, [b for _, _, b in fixtures])
                self.assertEqual(report['v6_card']['available'], 0)
                self.assertTrue(report['v6_card']['failures'])
                self.assertTrue(report['alert'])

    def test_calculated_is_not_consumed_and_receipts_cannot_cross_decisions(self):
        for change in ('missing', 'other_id', 'other_run', 'unknown', 'fallback', 'answer', 'failed_action'):
            with self.subTest(change=change):
                fixtures = [fixture(f) for f in (2, 3, 4)]
                for d, _, b in fixtures:
                    if change == 'other_id': b['question_id'] = 'other'
                    if change == 'other_run': b['run_id'] = 'other'
                    if change == 'unknown': b['unknown']['count'] = 1
                    if change == 'fallback': b['fallback'] = 'Jev unavailable'
                    if change == 'answer': b['jev_answer']['choice'] = 'skip'
                    if change == 'failed_action': d['result'] = 'failed: rejected'
                report = summary([d for d, _, _ in fixtures], [r for _, r, _ in fixtures],
                                 [] if change == 'missing' else [b for _, _, b in fixtures])
                self.assertEqual(report['v6_card']['available'], 3)
                self.assertEqual(report['v6_card']['consumed'], 0)
                self.assertEqual(report['v6_card']['failures'], {'missing_or_failed_consumption': 3})
                self.assertTrue(report['alert'])

    def test_audit_reads_formal_streams_and_retains_immutable_incidents(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'logs').mkdir()
            fixtures = [fixture(f) for f in (2, 3, 4)]
            streams = {'run-config': [CONFIG], 'decisions': [d for d, _, _ in fixtures],
                       'v6-card-results': [r for _, r, _ in fixtures], 'v6-build': [b for _, _, b in fixtures]}
            for name, rows in streams.items():
                (root / f'logs/{name}.jsonl').write_text(''.join(json.dumps(r) + '\n' for r in rows))
            directory = root / 'ops'
            report = h.audit(root, directory, CONFIG['run_id'], notify=False)
            self.assertFalse(report['alert'])
            self.assertEqual(report['v6_card']['available'], 3)
            self.assertTrue(report['coverage']['v6_card_results']['complete'])
            self.assertIsNotNone(report['v6_card']['evidence'][0]['computation_source'])
            self.assertIsNotNone(report['v6_card']['evidence'][0]['consumption_source'])
            (root / 'logs/v6-card-results.jsonl').unlink()
            failed = h.audit(root, directory, CONFIG['run_id'], notify=False)
            self.assertTrue(failed['alert'])
            h.persist(failed, directory)
            alert = directory / 'module-health' / f'{CONFIG["run_id"]}-alert.json'
            saved = alert.read_bytes()
            h.persist(report, directory, notify=False)
            self.assertEqual(alert.read_bytes(), saved)


if __name__ == '__main__':
    unittest.main()
