#!/usr/bin/env python3
"""Preregistered grouped held-out S audit using frozen exports and Python's standard library."""
import collections
import hashlib
import gzip
import json
import math
import random
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / 'inputs'


def table(name):
    obj = json.loads((DATA / f'{name}.json').read_text())
    if obj.get('error') or obj.get('truncated') or len(obj['rows']) != obj['row_count']:
        raise ValueError(f'incomplete {name}')
    return [dict(zip(obj['columns'], row)) for row in obj['rows']]


def sigmoid(z):
    return 1 / (1 + math.exp(-max(-40, min(40, z))))


def solve(a, b):
    n = len(b)
    matrix = [list(row) + [value] for row, value in zip(a, b)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda k: abs(matrix[k][col]))
        matrix[col], matrix[pivot] = matrix[pivot], matrix[col]
        div = matrix[col][col]
        if abs(div) < 1e-12:
            raise ValueError('singular fit')
        matrix[col] = [v / div for v in matrix[col]]
        for k in range(n):
            if k != col:
                factor = matrix[k][col]
                matrix[k] = [x - factor * y for x, y in zip(matrix[k], matrix[col])]
    return [row[-1] for row in matrix]


def raw_features(row, use_s):
    p = max(1e-6, min(1 - 1e-6, row['p']))
    return [math.log(p / (1 - p))] + ([row['s']] if use_s else [])


def fit_predict(training, testing, use_s):
    if len({r['y'] for r in training}) < 2:
        return None
    features = [raw_features(r, use_s) for r in training]
    means = [statistics.mean(col) for col in zip(*features)]
    scales = [statistics.pstdev(col) or 1 for col in zip(*features)]
    def vector(row):
        return [1] + [(v - mean) / scale for v, mean, scale in zip(raw_features(row, use_s), means, scales)]
    design = [vector(row) for row in training]
    n = len(design[0])
    beta = [0.] * n
    converged = False
    for iteration in range(100):
        h = [[0.] * n for _ in range(n)]
        g = [0.] * n
        for x, row in zip(design, training):
            p = sigmoid(sum(a*b for a, b in zip(x, beta)))
            for j in range(n):
                g[j] += x[j] * (p - row['y'])
                for k in range(n):
                    h[j][k] += max(p*(1-p), 1e-10) * x[j]*x[k]
        for j in range(1, n):
            g[j] += beta[j]
            h[j][j] += 1.
        h[0][0] += 1e-10
        step = solve(h, g)
        beta = [b - d for b, d in zip(beta, step)]
        if max(abs(v) for v in step) < 1e-8:
            converged = True
            break
    if not converged:
        return None
    return [sigmoid(sum(a*b for a, b in zip(vector(row), beta))) for row in testing]


def quantile(values, q):
    values = sorted(values)
    p = (len(values) - 1)*q
    lo = int(p)
    return values[lo] + (values[min(lo+1, len(values)-1)] - values[lo]) * (p-lo)


def scores(rows):
    valid = [r for r in rows if r.get('p_only') is not None and r.get('p_s') is not None]
    result = {'n': len(rows), 'held_out_known': len(valid), 'unknown_folds': len(rows)-len(valid),
              'runs': len({r['run_id'] for r in rows}), 'wins': sum(r['y'] for r in rows)}
    if not valid:
        return result
    def loss(row, field, metric):
        p = max(1e-6, min(1-1e-6, row[field]))
        return (p-row['y'])**2 if metric == 'brier' else -(row['y']*math.log(p)+(1-row['y'])*math.log(1-p))
    for metric in ('brier', 'logloss'):
        delta = {rid: [loss(r, 'p_only', metric)-loss(r, 'p_s', metric) for r in valid if r['run_id'] == rid]
                 for rid in sorted({r['run_id'] for r in valid})}
        generator = random.Random(20261016)
        keys = sorted(delta)
        boots = []
        for _ in range(2000):
            sample = [v for rid in generator.choices(keys, k=len(keys)) for v in delta[rid]]
            boots.append(statistics.mean(sample))
        result[metric] = {'p_only': statistics.mean(loss(r, 'p_only', metric) for r in valid),
                          'p_plus_s': statistics.mean(loss(r, 'p_s', metric) for r in valid),
                          'increment': statistics.mean(v for vs in delta.values() for v in vs),
                          'paired_run_bootstrap_ci95': [quantile(boots, .025), quantile(boots, .975)] if len(keys) >= 3 else None,
                          'small_stratum': len(keys) < 3 or len({r['y'] for r in valid}) < 2,
                          'interval_scope': 'conditional paired held-out losses; folds not re-fitted per bootstrap'}
    return result


def evaluate(rows):
    for rid in sorted({r['run_id'] for r in rows}):
        train = [r for r in rows if r['run_id'] != rid]
        test = [r for r in rows if r['run_id'] == rid]
        for name, use_s in [('p_only', False), ('p_s', True)]:
            values = fit_predict(train, test, use_s)
            for row, value in zip(test, values if values is not None else [None]*len(test)):
                row[name] = value
    return {'overall': scores(rows), 'by_act': {str(a): scores([r for r in rows if r['act'] == a]) for a in sorted({r['act'] for r in rows})},
            'by_boss': {b: scores([r for r in rows if r['boss'] == b]) for b in sorted({r['boss'] for r in rows})}}


def b3_analysis(decisions, fights, sl):
    coverage = collections.Counter()
    chosen = {}
    excluded = []
    for row in decisions:
        bs = row['boss_sim']
        br = bs.get('build_ranking')
        if not br:
            continue
        coverage['recorded_questions'] += 1
        selection = br.get('selection') or {}
        choice = selection.get('choice')
        option = (bs.get('options') or {}).get(choice) or {}
        margin = (((bs.get('quantitative') or {}).get('options') or {}).get(choice) or {}).get('boss_relative_margin') or {}
        ref = '+'.join(sorted((margin.get('reference') or {}).get('enemyIds') or []))
        actual = sorted([f for f in fights if f['run_id'] == row['run_id'] and f['room'] == 'boss' and
                         f['floor'] > (row.get('floor') or 0) and f['encounter'] == ref], key=lambda f: f['first_ts'])
        reason = None
        if selection.get('target_pending') or not choice or not str(row.get('result') or '').startswith('completed:'):
            reason = 'choice_or_execution_not_bound'
        elif margin.get('status') != 'complete_conditional_model' or margin.get('missing') != 0 or not isinstance((margin.get('score') or {}).get('mean'), (int,float)):
            reason = 'absolute_s_unknown'
        elif not actual:
            reason = 'no_later_exact_actual_boss'
        elif not isinstance(option.get('win_cal'), (int,float)):
            reason = 'calibrated_p_unknown'
        if reason:
            coverage[reason] += 1
            excluded.append({'run_id': row['run_id'], 'decision_id': row.get('decision_id'), 'source': row['_source'], 'reason': reason})
            continue
        fight = actual[0]
        attempts = [r for r in sl if r['run_id'] == row['run_id'] and r['floor'] == fight['floor'] and r['encounter'] == ref and r['attempt'] == 1]
        outcomes = {r['result'] for r in attempts}
        outcome = next(iter(outcomes)) if len(outcomes) == 1 else fight['outcome'] if not attempts else None
        if outcome not in ('won','died','predicted_death'):
            coverage['actual_first_outcome_unknown'] += 1
            continue
        coverage['matched_executed_questions'] += 1
        key = (row['run_id'], fight['floor'], ref)
        # This secondary observation is the latest frozen pre-boss selected option, never all questions as independent outcomes.
        chosen[key] = {'run_id': row['run_id'], 'floor': row['floor'], 'boss_floor': fight['floor'], 'act': fight['act'],
                       'boss': ref, 'choice': choice, 'decision_id': row.get('decision_id'), 'source': row['_source'],
                       'p': option['win_cal'], 's': margin['score']['mean'], 'y': int(outcome == 'won'),
                       'actual_first_result': outcome, 'mode': br.get('mode'),
                       'limitation': 'later deck/policy may change; completed first action does not prove whole option effects'}
    observations = list(chosen.values())
    return {'coverage': dict(coverage), 'forecast': evaluate(observations), 'observations': observations, 'excluded': excluded,
            'analysis_scope': 'secondary latest matching pre-boss selected option; one outcome per actual boss; not a stable-deck prediction',
            'counterfactual_alternative_outcomes': 'unknown'}


def main():
    with gzip.open(DATA / 'decisions.jsonl.gz', 'rt') as handle:
        decisions = [json.loads(line) for line in handle]
    fights = table('fights')
    sl = table('sl_attempts')
    runs = {r['run_id']: r for r in table('runs-since-20261012')}
    actual = collections.defaultdict(list)
    for fight in fights:
        if fight['room'] == 'boss':
            actual[(fight['run_id'], fight['floor'])].append(fight)
    coverage = collections.Counter()
    observations, excluded = {}, []
    b3 = collections.Counter()
    for row in decisions:
        bs = row['boss_sim']
        if not bs.get('s_ranking'):
            b3['recorded_rows'] += 1
            if bs.get('build_ranking'):
                b3['with_ranking'] += 1
            continue
        coverage['b2_recorded_rows'] += 1
        if row.get('turn') != 1 or row.get('sl_attempt') != 1:
            coverage['not_opening_first_attempt'] += 1
            continue
        coverage['opening_first_attempt_rows'] += 1
        key = (row['run_id'], row['floor'])
        record = {'run_id': row['run_id'], 'floor': row['floor'], 'source': row['_source']}
        def reject(reason):
            excluded.append({**record, 'reason': reason})
            coverage[reason] += 1
        if key in observations:
            reject('duplicate_opening_same_fight')
            continue
        candidates = sorted(actual[key], key=lambda f: (f['first_ts'], f['fight_no']))
        if not candidates:
            reject('no_actual_boss_room')
            continue
        fight = candidates[0]
        if row['run_id'] == 'W1YY8PEWGUF9':
            reject('original_gap_run_exclusion')
            continue
        choice = ((row.get('answers') or {}).get('plan') or {}).get('choice')
        line = (bs.get('lines') or {}).get(choice)
        if not isinstance(line, dict):
            reject('selected_line_missing')
            continue
        audit = row.get('selection_audit') or {}
        if not str(row.get('result') or '').startswith('completed:'):
            reject('first_action_not_completed')
            continue
        if audit.get('answer') != audit.get('after_sl') or not audit.get('answer'):
            reject('selected_plan_changed_or_unbound')
            continue
        margin = line.get('boss_relative_margin') or {}
        reference = margin.get('reference') or {}
        if '+'.join(sorted(reference.get('enemyIds') or [])) != fight['encounter']:
            reject('simulation_actual_boss_identity_mismatch')
            continue
        s = (margin.get('score') or {}).get('mean')
        p = line.get('cal')
        if margin.get('status') != 'complete_conditional_model' or margin.get('missing') != 0 or not isinstance(s, (int, float)):
            reject('absolute_s_incomplete_or_unknown')
            continue
        if not isinstance(p, (int, float)) or not 0 <= p <= 1:
            reject('calibrated_probability_missing')
            continue
        first = [r for r in sl if r['run_id'] == key[0] and r['floor'] == key[1] and r['encounter'] == fight['encounter'] and r['attempt'] == 1]
        results = {r['result'] for r in first}
        outcome = next(iter(results)) if len(results) == 1 else (fight['outcome'] if not first else None)
        if outcome not in ('won', 'died', 'predicted_death'):
            reject('actual_first_attempt_unknown_or_conflicting')
            continue
        sr = bs['s_ranking']
        candidate_keys = sr.get('candidate_keys') or list(bs['lines'])
        selected_index = candidate_keys.index(choice) if choice in candidate_keys else None
        observations[key] = {**record, 'boss': fight['encounter'], 'act': fight['act'], 'choice': choice,
                            'p': p, 's': s, 'y': int(outcome == 'won'), 'actual_first_result': outcome,
                            'low_trust': bool(bs.get('low_trust')), 's_policy_used': bool(sr.get('used')),
                            'selected_in_win_tie': selected_index in (sr.get('win_group') or []),
                            'multiple_win_tie': len(sr.get('win_group') or []) > 1,
                            'selected_s_best': selected_index == sr.get('best'),
                            's_changed_top': sr.get('best') != sr.get('old_best'),
                            'first_action_completed_only': True, 'whole_plan_execution': 'not established',
                            'sl_source_offsets': [r['off'] for r in first],
                            'cfg_commit': runs.get(key[0], {}).get('cfg_commit')}
    rows = list(observations.values())
    result = {'schema': 'global-build-s-increment-v1', 'coverage': dict(coverage),
              'primary': evaluate(rows), 'trusted_subset': scores([r for r in rows if not r['low_trust']]),
              'actual_terminal_only_sensitivity': evaluate([dict(r) for r in rows if r['actual_first_result'] in ('won','died')]),
              'first_result_counts': dict(collections.Counter(r['actual_first_result'] for r in rows)),
              'tie_selected_observations': {str(k): scores([r for r in rows if r['s_policy_used'] and r['multiple_win_tie'] and r['selected_s_best'] == k]) for k in (False, True)},
              'tie_without_s_policy': sum(r['multiple_win_tie'] and not r['s_policy_used'] for r in rows),
              'b3_coverage': dict(b3), 'b3_prediction_analysis': b3_analysis(decisions, fights, sl),
              'counterfactual_alternative_outcomes': 'unknown: unexecuted candidate has no real outcome',
              'observations': rows, 'excluded': excluded,
              'input_manifest_sha256': hashlib.sha256((DATA/'manifest.json').read_bytes()).hexdigest(),
              'preregistration_sha256': hashlib.sha256((HERE/'preregistration.md').read_bytes()).hexdigest(),
              'primary_limits': ['descriptive approved gap cohort; mixed-source HLAW not a native-source admission',
                                 'predicted_death is a censored SL policy stop, not an observed terminal death; terminal-only sensitivity separately reported',
                                 'earliest valid T1 forecast may follow other T1 actions; no later-turn or retry samples',
                                 'selected-plan forecast; actual initial action only, later policy/deck can differ',
                                 'S and p from one conditional simulator, not randomized causal effects',
                                 'small clustered sample; bootstrap conditional on held-out fitted predictions']}
    (HERE/'analysis.json').write_text(json.dumps(result, ensure_ascii=False, indent=1)+'\n')
    print(json.dumps({k:result[k] for k in ('coverage','primary','b3_coverage')},ensure_ascii=False))


if __name__ == '__main__':
    main()
