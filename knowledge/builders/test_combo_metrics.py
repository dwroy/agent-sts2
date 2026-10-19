#!/usr/bin/env python3
"""Fixed-data tests: fictitious IDs, no game evidence or credentials."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from combo_metrics import (activation, activation_frame, compute_combo, digest, enemy_delta, extract, holding,
                          METRICS, rate, read_rows, statistic, turn_observations)

HERE = Path(__file__).resolve().parent
SPEC = {'id': 'fixture-combo', 'cards': [{'id': 'ALPHA', 'count': 1, 'upgraded': False}]}
RULE = {'player_power': {'id': 'FIXTURE_ACTIVE', 'at_least': 1}}


def stamp(i):
    return f'2026-01-01T00:{i//60:02d}:{i%60:02d}.000Z'


def frame(i, floor=48, turn=1, enemy_hp=100, block=0, hp=50, active=True, in_combat=True, deck=True, played=0):
    state = dict(run_id='FIXTURE', turn=turn, screen='COMBAT' if in_combat else 'MAP', in_combat=in_combat,
                 run=dict(character_id='SILENT', floor=floor, act_id=2, ascension=0, current_hp=hp,
                          deck=[dict(card_id='ALPHA', upgraded=True)] if deck else [], relics=[]))
    if in_combat:
        state['combat'] = dict(player=dict(current_hp=hp, block=block, energy=3, cards_played_this_turn=played,
                                          powers=[dict(power_id='FIXTURE_ACTIVE', amount=1)] if active else []),
                               action_readiness=dict(snapshot_stable=True), hand=[],
                               enemies=[dict(index=0, enemy_id='FIXTURE_ENEMY', current_hp=enemy_hp,
                                             max_hp=100, block=0, is_alive=enemy_hp > 0, powers=[])])
    return dict(ts=stamp(i), state=state)


def write_logs(root):
    rows = [frame(1), frame(2, turn=2), frame(3, turn=2, enemy_hp=90, block=5, hp=47, played=1),
            frame(4, turn=3, enemy_hp=80, hp=45), frame(5, turn=3, enemy_hp=0, hp=45, played=1),
            frame(6, in_combat=False, hp=45), frame(7, floor=49), frame(8, floor=49, turn=2),
            frame(9, floor=49, turn=3, enemy_hp=60, hp=44), frame(10, floor=49, turn=3, enemy_hp=0, hp=44, played=1),
            frame(11, floor=49, in_combat=False, hp=44)]
    offer = frame(12, floor=49, in_combat=False)
    offer['state'].update(screen='REWARD', reward=dict(card_options=[dict(card_id='ALPHA', upgraded=True)]))
    rows.extend([offer, copy.deepcopy(offer)])
    runs = [dict(run_id='FIXTURE', character='SILENT', ascension=0, code='fixture-v1', ended=stamp(20), floor=49, victory=True)]
    summaries = [dict(run_id='FIXTURE', ts=stamp(end), started_at=stamp(start), ended_at=stamp(end),
                      floor=floor, fight_kind='boss', encounter='FIXTURE_ENEMY', attempt=1, result='won', summary=dict(potions=[]))
                 for floor, start, end in [(48, 1, 6), (49, 7, 11)]]
    streams = {'states.jsonl': rows, 'runs.jsonl': runs, 'sl-attempts.jsonl': summaries, 'decisions.jsonl': []}
    for name, values in streams.items():
        (root/name).write_bytes(b''.join((json.dumps(r)+'\n').encode() for r in values))
    return {name: (root/name).stat().st_size for name in streams}


def corpus():
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory)
        limits = write_logs(path)
        return extract(path, 'silent', limits)[0]


class ComboMetricsTests(unittest.TestCase):
    def test_upgrade_false_accepts_upgraded(self):
        self.assertTrue(holding(SPEC['cards'], [dict(card_id='ALPHA', upgraded=True)]))

    def test_upgrade_true_does_not_assume_missing_flag(self):
        req = [dict(id='ALPHA', count=1, upgraded=True)]
        self.assertFalse(holding(req, [dict(card_id='ALPHA')]))
        self.assertTrue(holding(req, [dict(card_id='ALPHA', upgraded=True)]))

    def test_alternatives_need_distinct_copies(self):
        req = [dict(any_of=['ALPHA', 'BETA'], count=1, upgraded=False), dict(id='ALPHA', count=1, upgraded=False)]
        self.assertFalse(holding(req, [dict(card_id='ALPHA')]))
        self.assertTrue(holding(req, [dict(card_id='ALPHA'), dict(card_id='BETA')]))

    def test_unknown_deck(self):
        self.assertIsNone(holding(SPEC['cards'], None))

    def test_invalid_card_count(self):
        with self.assertRaises(ValueError):
            holding([dict(id='ALPHA', count=0, upgraded=False)], [])

    def test_three_valued_activation(self):
        self.assertIsNone(activation(RULE, {}, {}))
        self.assertFalse(activation(RULE, frame(1, active=False)['state'], {}))
        self.assertTrue(activation(RULE, frame(1)['state'], {}))

    def test_activation_rejects_code_and_empty_conditions(self):
        for rule in [{'eval': 'x'}, {'all': []}, {'player_power': []}, {'player_power': {'id': 'X', 'at_least': 0}}]:
            with self.assertRaises(ValueError):
                activation(rule, {}, {})

    def test_activation_depth_bound(self):
        rule = RULE
        for _ in range(14):
            rule = {'all': [rule]}
        with self.assertRaises(ValueError):
            activation(rule, {}, {})

    def test_unknown_is_not_zero(self):
        stat = statistic([], 'independent_run', 'fixture', reason='not observed')
        self.assertEqual((stat['n'], stat['value'], stat['se'], stat['evidence']), (0, None, None, []))
        self.assertEqual(stat['unknown_reason'], 'not observed')

    def test_independent_runs_not_pseudo_replication(self):
        obs = dict(run_id='X', floor=1)
        with self.assertRaises(ValueError):
            statistic([(1, obs), (2, obs)], 'independent_run', 'fixture')

    def test_statistics_seed_quartiles_and_small_sample(self):
        samples = [(x, dict(run_id=str(x), floor=1)) for x in (1, 3, 8)]
        first = statistic(samples, 'independent_run', 'fixture')
        self.assertEqual(first, statistic(samples, 'independent_run', 'fixture'))
        self.assertEqual((first['n'], first['value'], first['p25'], first['p75']), (3, 3, 2, 5.5))
        self.assertGreater(first['se'], 0)
        self.assertTrue(first['small_sample'])
        self.assertIsNone(statistic(samples[:2], 'independent_run', 'fixture')['se'])

    def test_rate_includes_observed_zero(self):
        stat = rate([(0, dict(run_id='A', floor=1)), (1, dict(run_id='B', floor=1))], 'fixture')
        self.assertEqual(stat['value'], .5)

    def test_enemy_phase_heal_and_disappearance_unknown(self):
        a = frame(1); b = frame(2, enemy_hp=90)
        self.assertEqual(sum(enemy_delta(a, b).values()), 10)
        b['state']['combat']['enemies'][0]['max_hp'] = 200
        self.assertIsNone(enemy_delta(a, b))
        self.assertIsNone(enemy_delta(frame(1, enemy_hp=90), frame(2, enemy_hp=100)))
        b['state']['combat']['enemies'] = []
        self.assertIsNone(enemy_delta(a, b))

    def test_duplicate_enemy_identity_is_unknown_even_with_target_indices(self):
        a, b = frame(1), frame(2, enemy_hp=90)
        a['state']['combat']['enemies'].append(dict(a['state']['combat']['enemies'][0], index=1))
        b['state']['combat']['enemies'].append(dict(b['state']['combat']['enemies'][0], index=1))
        self.assertIsNone(enemy_delta(a, b))
        b['state']['combat']['enemies'][1]['index'] = 0
        self.assertIsNone(enemy_delta(a, b))

    def test_raw_metrics_and_chain(self):
        result, audit = compute_combo(SPEC, corpus(), {'activation': RULE})
        self.assertEqual(len(result), 2)
        for stratum in result:
            obs = stratum['observed']
            self.assertEqual(set(obs), set(METRICS))
            self.assertEqual(obs['formed_runs']['value'], 1)
            self.assertEqual(obs['cleared_runs']['value'], 1)
            self.assertEqual(obs['dpr_boss']['value'], 30)  # Mean(20, 40) in the one run.
            self.assertEqual(obs['dpr_boss']['n'], 1)
            self.assertEqual(obs['block_per_turn']['value'], 2.5)
            self.assertEqual(obs['hp_loss_per_turn']['value'], 5.5)
            self.assertEqual(obs['chain_win_rate']['value'], 1)
            self.assertEqual(obs['peak_turn_damage']['value'], 40)
            self.assertEqual(len(stratum['availability']), 3)
            self.assertEqual(stratum['availability'][0]['offered_rate']['n'], 0)
            self.assertEqual(stratum['availability'][2]['offered_rate']['n'], 1)
            for name in ('startup_energy', 'startup_draw', 'aoe_damage', 'deck_size_scaling', 'potion_dependency', 'sl_dependency', 'key_relic_dependency'):
                self.assertEqual(obs[name]['n'], 0, name)
                self.assertIsNone(obs[name]['value'], name)
                self.assertTrue(obs[name]['unknown_reason'], name)
        self.assertTrue(audit)

    def test_deck_size_association_is_observational_and_needs_varying_sizes(self):
        runs = corpus()
        for row in runs[0]['fights'][1]['frames']:
            row['state']['run']['deck'] += [dict(card_id='BETA'), dict(card_id='GAMMA')]
        result, audit = compute_combo(SPEC, runs, {'activation': RULE})
        for stratum in result:
            stat = stratum['observed']['deck_size_scaling']
            self.assertEqual(stat['value'], 10)  # (40-20)/(3-1), not a causal benefit.
            self.assertEqual(stat['n'], 1)
            self.assertIn('不是加牌收益', stat['method'])
        self.assertTrue(any(a.get('deck_size_association') for a in audit))

    def test_holding_does_not_imply_activation(self):
        result, _ = compute_combo(SPEC, corpus())
        for r in result:
            self.assertEqual(r['observed']['formed_runs']['n'], 0)
            self.assertEqual(r['observed']['dpr_boss']['n'], 0)

    def test_planned_or_failed_plays_do_not_activate_and_identity_needs_exact_hand(self):
        fight = corpus()[0]['fights'][0]
        row = fight['frames'][0]
        row['state']['combat']['hand'] = [dict(index=0, card_id='ALPHA')]
        action = dict(ts=row['ts'], chosen=dict(action='play_card', card_index=0), result='failed')
        fight['actions'] = [action]
        rule = {'played': {'id': 'ALPHA', 'at_least': 1}}
        self.assertIsNone(activation_frame(fight, SPEC['cards'], rule))
        action['result'] = 'completed: fixture'
        self.assertIsNotNone(activation_frame(fight, SPEC['cards'], rule))
        row['state']['combat']['hand'] = []
        self.assertIsNone(activation_frame(fight, SPEC['cards'], rule))

    def test_known_condition_not_observed_is_lower_bound_zero(self):
        result, _ = compute_combo(SPEC, corpus(), {'activation': {'player_power': {'id': 'MISSING', 'at_least': 1}}})
        self.assertEqual(result[0]['observed']['formation_rate']['value'], 0)

    def test_actual_string_act_identity_and_unstocked_shop_cards(self):
        runs = corpus()
        for row in runs[0]['states']:
            row['state']['run']['act_id'] = '2'
        results, _ = compute_combo(SPEC, runs, {'activation': RULE})
        self.assertEqual(results[0]['availability'][2]['offered_rate']['value'], 1)
        for row in runs[0]['states']:
            if row['state'].get('reward'):
                row['state']['screen'] = 'SHOP'
                row['state']['shop'] = dict(cards=[dict(card_id='ALPHA', upgraded=True, is_stocked=False),
                                                   dict(card_id='BETA', upgraded=False, is_stocked=True)])
        results, _ = compute_combo(SPEC, runs, {'activation': RULE})
        self.assertEqual(results[0]['availability'][2]['offered_rate']['value'], 0)

    def test_formation_does_not_backfill_prior_fights(self):
        runs = corpus()
        for row in runs[0]['fights'][0]['frames']:
            row['state']['run']['deck'] = []
        result, _ = compute_combo(SPEC, runs, {'activation': RULE})
        self.assertEqual(result[0]['observed']['first_completed_floor']['value'], 49)
        self.assertEqual(result[0]['observed']['dpr_boss']['value'], 40)

    def test_first_trial_censoring_does_not_use_later_clear(self):
        runs = corpus()
        run = runs[0]; run['first_cut'] = stamp(6); run['first_cut_floor'] = 48
        results, _ = compute_combo(SPEC, runs, {'activation': RULE})
        self.assertEqual(results[0]['observed']['cleared_runs']['value'], 0)
        self.assertEqual(results[0]['observed']['mean_reached_floor']['value'], 48)
        self.assertEqual(results[0]['observed']['chain_win_rate']['n'], 0)
        self.assertEqual(results[1]['observed']['cleared_runs']['value'], 1)

    def test_version_and_ascension_stay_separate(self):
        runs = corpus()
        extra = copy.deepcopy(runs[0]); extra['ascension'] = 1; extra['version'] = 'other'
        results, _ = compute_combo(SPEC, runs+[extra], {'activation': RULE})
        self.assertEqual({(r['ascension'], r['version']) for r in results}, {(0, 'runs.code:fixture-v1'), (1, 'other')})

    def test_sl_repetition_does_not_inflate_runs_or_boss_denominator(self):
        runs = corpus(); run = runs[0]
        run['fights'].append(copy.deepcopy(run['fights'][0]))
        results, _ = compute_combo(SPEC, runs, {'activation': RULE})
        observed = results[1]['observed']
        self.assertEqual((observed['formed_runs']['n'], observed['formed_runs']['value']), (1, 1))
        self.assertEqual(observed['dpr_boss']['value'], 30)
        boss = results[1]['bosses']['FIXTURE_ENEMY-F48']
        self.assertEqual((boss['reached']['n'], boss['reached']['value'], boss['win_rate']['n']), (1, 1, 1))

    def test_no_future_result_in_censored_audit(self):
        runs = corpus(); runs[0]['first_cut'] = stamp(4); runs[0]['first_cut_floor'] = 48
        _, audit = compute_combo(SPEC, runs, {'activation': RULE})
        first = next(a for a in audit if a['attempt'] == 'first' and a.get('floor') == 48)
        self.assertIsNone(first['outcome'])

    def test_identical_duplicate_run_rows_allowed_but_conflicts_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory); limits = write_logs(path)
            original = (path/'runs.jsonl').read_bytes()
            (path/'runs.jsonl').write_bytes(original+original)
            limits['runs.jsonl'] = len(original)*2
            self.assertEqual(len(extract(path, 'silent', limits)[0]), 1)
            conflict = json.loads(original); conflict['victory'] = False
            with (path/'runs.jsonl').open('ab') as out:
                out.write((json.dumps(conflict)+'\n').encode())
            limits['runs.jsonl'] = (path/'runs.jsonl').stat().st_size
            with self.assertRaises(ValueError):
                extract(path, 'silent', limits)

    def test_row_cut_hash_and_partial_row_rejection(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'rows.jsonl'; raw = b'{"x":1}\n'; path.write_bytes(raw+b'{"x":2}\n')
            audit = []
            rows = list(read_rows(path, len(raw), audit=audit))
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0][1]['sha256'], digest(raw))
            self.assertEqual(audit[0]['sha256'], digest(raw))
            with self.assertRaises(ValueError):
                list(read_rows(path, len(raw)-1))
            with self.assertRaises(ValueError):
                list(read_rows(path, 1000))

    def test_raw_first_death_and_wrong_character(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory); limits = write_logs(path)
            row = dict(run_id='FIXTURE', floor=48, ts=stamp(6), ended_at=stamp(6), result='died')
            with (path/'sl-attempts.jsonl').open('a') as out:
                out.write(json.dumps(row)+'\n')
            limits['sl-attempts.jsonl'] = (path/'sl-attempts.jsonl').stat().st_size
            runs, _ = extract(path, 'silent', limits)
            self.assertEqual(runs[0]['first_cut'], stamp(6))
            text = (path/'states.jsonl').read_text().replace('SILENT', 'IRONCLAD')
            (path/'states.jsonl').write_text(text); limits['states.jsonl'] = len(text.encode())
            with self.assertRaises(ValueError):
                extract(path, 'silent', limits)

    def test_cut_floor_belongs_to_earliest_time_not_lowest_later_floor(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory); limits = write_logs(path)
            rows = [dict(run_id='FIXTURE', floor=floor, ts=stamp(time), ended_at=stamp(time), result='died')
                    for time, floor in [(6, 48), (15, 40)]]
            with (path/'sl-attempts.jsonl').open('a') as out:
                out.writelines(json.dumps(row)+'\n' for row in rows)
            limits['sl-attempts.jsonl'] = (path/'sl-attempts.jsonl').stat().st_size
            runs, _ = extract(path, 'silent', limits)
            self.assertEqual((runs[0]['first_cut'], runs[0]['first_cut_floor']), (stamp(6), 48))

    def test_cli_rejects_formal_output(self):
        result = subprocess.run([sys.executable, str(HERE/'build-combo-metrics.py'), '--logs', '/unused', '--spec', '/unused', '--character', 'silent', '--output', '/tmp/knowledge/characters/silent/build-cores.json'], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b'formal character knowledge output is forbidden', result.stderr)

    def test_cli_and_raw_witness_tampering(self):
        spec = importlib.util.spec_from_file_location('combo_cli', HERE/'build-combo-metrics.py')
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory); limits = write_logs(path)
            raw, ref = next(read_rows(path/'states.jsonl', limits['states.jsonl']))
            witness = dict(combo='fixture-combo', run_id='FIXTURE', activation_witnesses=[dict(activation=dict(source=ref, ts=raw['ts'], floor=48, turn=1, definition='fixed fixture', witness=[]))])
            file = path/'witness.json'; file.write_text(json.dumps([witness]))
            self.assertEqual(len(module.verified_witnesses(file, {SPEC['id']: SPEC}, path, limits, {'FIXTURE'})[SPEC['id']]), 1)
            file.write_text('[]')
            with self.assertRaises(ValueError):
                module.verified_witnesses(file, {SPEC['id']: SPEC}, path, limits, {'FIXTURE'})
            witness['activation_witnesses'][0]['activation']['source']['sha256'] = '0'*64
            file.write_text(json.dumps([witness]))
            with self.assertRaises(ValueError):
                module.verified_witnesses(file, {SPEC['id']: SPEC}, path, limits, {'FIXTURE'})


def contract_fixture():
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory); write_logs(path)
        (path/'spec.json').write_text(json.dumps(SPEC))
        (path/'rules.json').write_text(json.dumps({SPEC['id']: dict(activation=RULE, evidence=[dict(run_id='FIXTURE', floor=48)])}))
        output = path/'report.json'
        subprocess.run([sys.executable, str(HERE/'build-combo-metrics.py'), '--logs', str(path), '--spec', str(path/'spec.json'), '--rules', str(path/'rules.json'), '--character', 'silent', '--output', str(output)], check=True, capture_output=True)
        print(json.dumps(json.loads(output.read_text())['combos'][0]['metrics']))


if __name__ == '__main__':
    if '--contract-fixture' in sys.argv:
        contract_fixture()
    else:
        unittest.main()
