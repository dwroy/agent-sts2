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

from combo_normalization import normalized, offset_fit, unique_runs
from combo_pooled import finalize
from incremental_evidence import FrozenLogIndex
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
    def test_cached_run_contributions_equal_full_and_append_only_recomputes_new_run(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory); limits = write_logs(path)
            index = FrozenLogIndex(path / 'cache', path)
            try:
                def calculate():
                    for name, limit in limits.items(): index.update(Path(name).stem, limit)
                    runs, _ = extract(path, 'silent', limits, source_index=index, cache=index)
                    keys = {r['run_id']: index.run_signature(r['run_id'], ['runs', 'states', 'sl-attempts', 'decisions']) for r in runs}
                    return compute_combo(SPEC, runs, dict(activation=RULE, _cache=index, _algorithm='fixed', _run_keys=keys))
                full = compute_combo(SPEC, extract(path, 'silent', limits)[0], dict(activation=RULE))
                self.assertEqual(calculate(), full)
                misses = index.stats['cache_misses']
                self.assertEqual(calculate(), full)
                self.assertEqual(index.stats['cache_misses'], misses)
                for name in limits:
                    target = path / name
                    extra = target.read_bytes().replace(b'FIXTURE', b'NEW_RUN')
                    with target.open('ab') as out: out.write(extra)
                    limits[name] = target.stat().st_size
                full = compute_combo(SPEC, extract(path, 'silent', limits)[0], dict(activation=RULE))
                self.assertEqual(calculate(), full)
                self.assertEqual(index.stats['cache_misses'] - misses, 3)
            finally:
                index.close()

    def test_non_null_prerequisite_cannot_be_silently_ignored(self):
        spec = dict(SPEC, prerequisites={'op': 'contains', 'field': 'player.relics', 'value': 'FIXTURE_RELIC'})
        with self.assertRaisesRegex(ValueError, 'source-verified'):
            compute_combo(spec, corpus(), {'activation': RULE})
        for value in (True, False, None):
            runs = corpus()
            results = {s['_source']['sha256']: dict(value=value, unavailable={'fixture': 'not observed'} if value is None else {}) for s in runs[0]['states']}
            metrics, audit = compute_combo(spec, runs, dict(activation=RULE, prerequisite_results=results))
            formed = metrics[1]['observed']['formed_runs']
            self.assertEqual((formed['n'], formed['value']), (0, None) if value is None else (1, int(value)))
            if value is not True:
                self.assertTrue(all(b['win_rate']['n'] == 0 for b in metrics[1]['bosses'].values()))
                self.assertTrue(any(a.get('excluded') == ('prerequisite_unknown' if value is None else 'prerequisite_false') for a in audit))

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

    def test_version_and_ascension_pool_unknown_ascension_too(self):
        runs = corpus()
        def clone(value,version,rid):
            run = copy.deepcopy(runs[0]); run.update(run_id=rid,ascension=value,version=version)
            for row in run['states']: row['state']['run_id']=rid
            for fight in run['fights']:
                fight['run_id']=rid
                for row in fight['frames']: row['state']['run_id']=rid
            return run
        results, _ = compute_combo(SPEC, runs+[clone(10,'other','SECOND'),clone(None,'unknown','THIRD')], {'activation': RULE})
        self.assertEqual(len(results),2)
        self.assertTrue(all(r['observed']['formed_runs']['n']==3 for r in results))
        self.assertTrue(all('ascension' not in r and 'version' not in r for r in results))

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


class PooledNormalizationTests(unittest.TestCase):
    def rows(self):
        return [dict(combo=c, direction='P', run_id=f'{c}-{i}', ascension=a, version=f'old-{i}', target='BOSS',
                     value=base+.5*(a-10), evidence=dict(run_id=f'{c}-{i}',floor=17))
                for c,base in [('X',20),('Y',40)] for i,a in enumerate([0,4,8,10])]

    def test_common_offset_and_parent_shrink_with_uncertainty(self):
        rows=self.rows(); result,detail=normalized(rows,'X','P',target='BOSS')
        self.assertAlmostEqual(detail['offset'],.5)
        self.assertAlmostEqual(detail['unshrunk'],20)
        self.assertAlmostEqual(detail['parent'],30)
        self.assertAlmostEqual(result['value'],(4*20+10*30)/14)
        self.assertEqual((result['n'],detail['parent_n']),(4,8))
        self.assertIsNotNone(result['se'])
        self.assertEqual((result,detail),normalized(rows,'X','P',target='BOSS'))

    def test_no_within_combo_ascension_variation_is_unknown(self):
        rows=self.rows()
        for r in rows: r['ascension']=0 if r['combo']=='X' else 10
        stat,detail=normalized(rows,'X','P',target='BOSS')
        self.assertIsNone(stat['value']); self.assertIsNone(detail['offset'])
        self.assertIn('跨组合差异',stat['unknown_reason'])

    def test_offset_shared_across_targets_not_target_strength(self):
        rows=self.rows()
        extra=[dict(r,target='OTHER',value=r['value']+50) for r in rows]
        self.assertAlmostEqual(offset_fit(rows+extra)['offset'],.5)

    def test_ascension_unknown_excluded_only_from_regression(self):
        rows=self.rows(); rows[0]['ascension']=None
        stat,detail=normalized(rows,'X','P',target='BOSS')
        self.assertEqual(stat['n'],3)
        self.assertEqual(detail['excluded_ascension_runs'],['X-0'])
        plain,_=normalized(rows,'X','P',target='BOSS',regression=False)
        self.assertEqual(plain['n'],4)

    def test_direction_union_does_not_double_count_overlapping_combos(self):
        rows=self.rows()[:4]
        overlaps=[dict(r,combo='Y') for r in rows]
        stat,detail=normalized(rows+overlaps,'X','P',target='BOSS')
        self.assertEqual((stat['n'],detail['parent_n']),(4,4))
        self.assertEqual(len(unique_runs(rows+overlaps)),4)

    def test_linear_probability_out_of_range_is_unknown_not_clipped(self):
        rows=[dict(combo='X',direction='P',target='BOSS',run_id=str(a),ascension=a,value=1-a,
                   evidence=dict(run_id=str(a),floor=1)) for a in [0,1]]
        stat,detail=normalized(rows,'X','P',target='BOSS',probability=True)
        self.assertIsNone(stat['value']); self.assertIn('越界',stat['unknown_reason'])

    def test_small_sample_does_not_invent_error_or_direction(self):
        rows=self.rows()[:1]
        stat,detail=normalized(rows,'X',None,target='BOSS',regression=False)
        self.assertIsNone(stat['se']); self.assertIsNone(detail['parent'])
        self.assertEqual(detail['weight'],1)

    def test_raw_counts_sources_reconcile_and_missing_a10_is_explicit(self):
        runs=corpus();metrics,audit=compute_combo(SPEC,runs,{'activation':RULE})
        outputs=[dict(id=SPEC['id'],metrics=metrics,audit=audit)]
        finalize(outputs,runs,{SPEC['id']:'P'})
        for m in metrics:
            self.assertEqual(m['raw_counts']['runs'],sum(len(s['run_ids']) for s in m['sources']))
            self.assertEqual(m['raw_counts']['formed_runs'],1)
            self.assertEqual(m['observed']['formed_runs']['value'],1)
            self.assertEqual(m['target_ascension'],10)
            self.assertEqual(len(m['regression']),2)
            self.assertEqual(m['simulation'][0]['win_rate']['n'],0)
            self.assertIsNone(m['simulation'][0]['win_rate']['value'])
            self.assertTrue(m['simulation'][0]['win_rate']['unknown_reason'])
            self.assertIsNone(m['regression'][0]['win_rate']['value'])


def contract_fixture():
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory); write_logs(path)
        (path/'spec.json').write_text(json.dumps(SPEC))
        (path/'rules.json').write_text(json.dumps({SPEC['id']: dict(activation=RULE, evidence=[dict(run_id='FIXTURE', floor=48)])}))
        output = path/'report.json'
        proc = subprocess.run([sys.executable, str(HERE/'build-combo-metrics.py'), '--logs', str(path), '--spec', str(path/'spec.json'), '--rules', str(path/'rules.json'), '--character', 'silent', '--simulation', 'off', '--output', str(output)], capture_output=True)
        if proc.returncode: raise RuntimeError(proc.stderr.decode())
        print(json.dumps(json.loads(output.read_text())['combos'][0]['metrics']))


if __name__ == '__main__':
    if '--contract-fixture' in sys.argv:
        contract_fixture()
    else:
        unittest.main()
