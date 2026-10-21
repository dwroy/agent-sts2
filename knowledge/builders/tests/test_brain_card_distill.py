import argparse
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('distill', Path(__file__).parents[1] / 'brain_card_distill.py')
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


def row(run='train', ts='2026-01-01T00:00:00Z', choice='card0'):
    return {'id': run + '/1/2', 'run': run, 'ts': ts, 'label_available_at': '2026-01-01T01:00:00Z',
            'choice': choice, 'reason': 'observed reason', 'split': 'train',
            'question': {'act': 1, 'ascension': 10, 'floor': 2, 'hp': '30/70', 'boss': 'OBSERVED',
                         'deck': '牌甲 (Attack, 1E): 日志中的牌面',
                         'options': {'card0': {'card': '甲'}, 'card1': {'card': '乙'}, 'skip': {'card': 'skip'}}},
            'outcome': {'boss_pass': True, 'remaining_hp_loss': None, 'final_floor': 50}}


class DistillTests(unittest.TestCase):
    def test_projection_excludes_answers_and_inherited_statistics(self):
        raw = {'payload': {'run_brief': {'character': '静默猎手', 'act': '1', 'floor': 2, 'ascension': 10, 'hp': '30/70'},
                           'deck': '原始牌面', 'facts': {'act_boss': 'B', 'act_boss_sim': 'secret model', 'outcome_stats_basis': 'future'}},
               'options': {'card0': json.dumps({'card': '甲', 'text': '牌面', 'outcome_stats': 'future', 'boss_sim': 'future'}), 'skip': {'card': 'skip'}},
               'answer': {'choice': 'card0', 'reason': 'target'}}
        projected = m.project(raw)
        self.assertEqual(projected['options']['card0'], {'card': '甲', 'text': '牌面'})
        self.assertNotIn('future', m.dumps(projected))
        self.assertNotIn('target', m.dumps(projected))

    def test_no_future_same_run_wrong_act_or_wrong_ascension(self):
        query = row('test', '2026-01-05T00:00:00Z')
        good = row()
        same = row('test')
        future = row('future', '2026-01-06T00:00:00Z')
        late_label = row('label'); late_label['label_available_at'] = '2026-01-06T00:00:00Z'
        other_act = row('act'); other_act['question']['act'] = 2
        other_a = row('ascension'); other_a['question']['ascension'] = 0
        self.assertEqual(m.training_pool([good, same, future, late_label, other_act, other_a], query), [good])

    def test_unique_case_runs_and_separate_question_run_denominators(self):
        train = [row(), row(), row('second', choice='card1')]
        train[1]['id'] = 'train/1/3'
        query = row('test', '2026-01-05T00:00:00Z')
        result = m.entries(train, query)
        self.assertEqual(len(result['cases']), 2)
        stats = result['card_stats']['card0']
        self.assertEqual(stats['seen']['questions'], 3)
        self.assertEqual(stats['seen']['runs'], 2)
        self.assertEqual(stats['taken']['questions'], 2)
        self.assertIsNone(stats['taken']['mean_remaining_hp_loss'])
        self.assertEqual(stats['not_taken']['boss_known'], 1)

    def test_similarity_uses_observed_multisets_and_baseline_offered_choices(self):
        query = row('test', '2026-01-05T00:00:00Z')
        same = row()
        other = row('other'); other['question']['deck'] = '另一牌 (Skill): 日志'
        self.assertGreater(m.similarity(query['question'], same['question']), m.similarity(query['question'], other['question']))
        self.assertEqual(m.baseline([row(), row('two'), row('three', choice='skip')], query), 'card0')
        payload = m.payload_for([same], query, 'bare')
        self.assertNotIn('truth', m.dumps(payload))
        self.assertNotIn('final_floor', m.dumps(payload))
        self.assertNotIn('historical_entries', payload['state'])
        self.assertIn('historical_entries', m.payload_for([same], query, 'entries')['state'])

    def test_intervals_and_nullable_missing_outcomes(self):
        self.assertIsNone(m.wilson(0, 0))
        low, high = m.wilson(5, 10)
        self.assertLess(low, .5); self.assertGreater(high, .5)
        self.assertEqual(m.cluster_interval({'a': [1, 1], 'b': [1]}), [1, 1])
        self.assertIsNone(m.cluster_interval({'a': [], 'b': []}))
        self.assertIsNone(m.stats_group([row()])['mean_remaining_hp_loss'])

    def test_replay_invalid_choice_is_an_error_without_fallback_and_resume_is_bound(self):
        import io
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            train, query = row(), row('test', '2026-01-05T00:00:00Z')
            query['split'] = 'test'
            dataset = root / 'dataset.jsonl'
            dataset.write_text(m.dumps(train) + '\n' + m.dumps(query) + '\n')
            key = root / 'key'
            key.write_text('test-fixture-only')
            args = argparse.Namespace(dataset=dataset, out=root/'result.jsonl', limit=99,
                                      key_file=key, endpoint='https://fixture.invalid/decisions')
            class FakeOpener:
                def open(self, request, timeout):
                    return io.BytesIO(b'{"answers":{"pick":{"choice":"unoffered"}},"usage":{"input_tokens":1}}')
            with patch.object(m.urllib.request, 'build_opener', return_value=FakeOpener()) as opener:
                m.replay(args)
                self.assertEqual(opener.call_count, 2)
                actual = list(m.rows(args.out))
                self.assertEqual(len(actual), 2)
                self.assertTrue(all(r['error'] == 'invalid_choice' and r['choice'] is None for r in actual))
                self.assertNotIn('test-fixture-only', args.out.read_text())
                m.replay(args)
                self.assertEqual(opener.call_count, 2)
                dataset.write_text(dataset.read_text() + '\n')
                with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                    m.replay(args)

    def test_extraction_dispatch_dedup_censoring_and_run_split(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            brain, decisions, runs, configs, fights = [], [], [], [], []
            for day in range(1, 6):
                rid = 'run' + str(day)
                ts = f'2026-01-0{day}T00:00:00Z'
                end = f'2026-01-0{day}T01:00:00Z'
                brain.append({'ts': ts, 'run_id': rid, 'engine': 'codex', 'answer': {'choice': 'card0'}, 'problems': [],
                              'payload': {'run_brief': {'character': '静默猎手', 'act': '1', 'floor': 2, 'ascension': 10, 'hp': '30/70'}, 'deck': '甲'},
                              'options': {'card0': {'card': '甲'}, 'skip': {'card': 'skip'}}})
                decisions.append({'ts': ts, 'mode': 'play', 'result': 'completed: Action completed.', 'floor': 2,
                                  'fingerprint': m.dumps({'run': rid}), 'chosen': {'action': 'choose_reward_card', 'option_index': 0}})
                runs.append({'run_id': rid, 'ended': end, 'floor': 5, 'victory': False})
                configs.append({'run_id': rid, 'ts': ts, 'code': {'commit': 'fixed'}})
                fights.append({'run': rid, 'ts': ts, 'ended': end, 'input': {'act': 1, 'floor': 5}, 'kind': 'boss', 'hp_loss': 10, 'win': 0})
            brain.append(copy.deepcopy(brain[0]))
            iron = copy.deepcopy(brain[0])
            iron['run_id'] = 'iron'
            iron['payload']['run_brief']['character'] = '铁甲战士'
            brain.append(iron)
            iron_dispatch = copy.deepcopy(decisions[0])
            iron_dispatch['fingerprint'] = m.dumps({'run': 'iron'})
            decisions.append(iron_dispatch)
            for name, data in [('brain', brain), ('decisions', decisions), ('runs', runs), ('run-config', configs), ('openings', fights), ('sl-attempts', [])]:
                (root / (name + '.jsonl')).write_text(''.join(m.dumps(r)+'\n' for r in data))
            inventory = {'run'+str(d): {'2': f'2025-12-{20+d}T23:59:00Z', '5': f'2026-01-0{d}T00:30:00Z'} for d in range(1, 6)}
            inventory['iron'] = inventory['run1']
            m.write(root / 'inventory.json', inventory)
            args = argparse.Namespace(brain=root/'brain.jsonl', decisions=root/'decisions.jsonl', logs=root,
                                      openings=root/'openings.jsonl', inventory=root/'inventory.json', out=root/'out')
            m.build(args)
            actual = list(m.rows(root/'out/dataset.jsonl.gz'))
            self.assertEqual(len(actual), 5)
            self.assertEqual([r['split'] for r in actual], ['train']*4 + ['test'])
            self.assertEqual(actual[0]['outcome']['remaining_hp_loss'], 10)
            self.assertFalse(actual[0]['outcome']['boss_pass'])
            # A missing opening from the decision inventory must censor HP.
            inventory['run1']['3'] = '2026-01-01T00:30:00Z'
            m.write(root / 'inventory.json', inventory)
            m.build(args)
            self.assertIsNone(next(m.rows(root/'out/dataset.jsonl.gz'))['outcome']['remaining_hp_loss'])
            del inventory['run1']['2']
            m.write(root / 'inventory.json', inventory)
            m.build(args)
            self.assertNotIn('run1', {r['run'] for r in m.rows(root/'out/dataset.jsonl.gz')})
            # Later post-SL rewards and the eventual run ending cannot rewrite the first trajectory.
            inventory['run1']['2'] = '2025-12-21T23:59:00Z'
            inventory['run1']['4'] = '2026-01-01T00:40:00Z'
            m.write(root / 'inventory.json', inventory)
            later = copy.deepcopy(brain[0])
            later['ts'] = '2026-01-01T00:45:00Z'
            later['payload']['run_brief']['floor'] = 4
            later_dispatch = copy.deepcopy(decisions[0])
            later_dispatch.update(ts=later['ts'], floor=4)
            (root / 'brain.jsonl').write_text(''.join(m.dumps(r)+'\n' for r in brain+[later]))
            (root / 'decisions.jsonl').write_text(''.join(m.dumps(r)+'\n' for r in decisions+[later_dispatch]))
            (root / 'sl-attempts.jsonl').write_text(m.dumps({'run_id': 'run1', 'result': 'died', 'act': 0,
                                                          'floor': 3, 'ended_at': '2026-01-01T00:30:00Z'})+'\n')
            m.build(args)
            first = next(r for r in m.rows(root/'out/dataset.jsonl.gz') if r['run'] == 'run1')
            self.assertEqual(first['outcome']['final_floor'], 3)
            self.assertEqual(first['outcome']['terminal_kind'], 'first_sl_death')
            self.assertFalse(first['outcome']['boss_pass'])
            self.assertEqual(first['outcome']['observed_fights'], 0)
            self.assertIsNone(first['outcome']['remaining_hp_loss'])
            self.assertEqual(json.loads((root/'out/manifest.json').read_text())['rejected']['after_first_sl_death'], 1)


if __name__ == '__main__':
    unittest.main()
