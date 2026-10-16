"""G2 shadow coverage, actual observation timing and explicit unknowns; no admission writes."""
from collections import Counter
import math


def obj(value):
    return value if isinstance(value, dict) else {}


def wall_stats(values):
    values = sorted(v for v in values if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v >= 0)
    def q(p):
        if not values:
            return None
        at = (len(values) - 1) * p
        lo, hi = math.floor(at), math.ceil(at)
        return values[lo] + (values[hi] - values[lo]) * (at - lo)
    return {'n': len(values), 'p50': q(.5), 'p90': q(.9), 'max': max(values) if values else None}


def global_build_health(config, records, labels, failure_streak=3):
    mode = obj(config.get('loop')).get('global_build_eval', 'off')
    counts = Counter(expected=0, covered=0, missing=0, invalid_shadow=0, observations=0, memo_hits=0,
                     current_dependency_unknown=0, service_failures=0, partial=0, unknown=0)
    reasons, seen_questions, seen_observations = Counter(), set(), set()
    all_ms, compute_ms, memo_ms, future_ms, evidence = [], [], [], [], []
    streak = longest = 0
    for row in records:
        if mode == 'off' or row.get('ts', '') < config.get('ts', '') or row.get('label') not in labels:
            continue
        sim = obj(row.get('boss_sim'))
        completion = obj(sim.get('completion'))
        if not completion.get('required'):
            continue
        identity = row.get('decision_id') or (row.get('ts'), row.get('label'))
        if identity in seen_questions:
            continue
        seen_questions.add(identity)
        counts['expected'] += 1
        value = obj(sim.get('global_build'))
        if value.get('schema') != 'global-build-v1':
            counts['missing'] += 1
            streak += 1
            longest = max(longest, streak)
            continue
        streak = 0
        counts['covered'] += 1
        invalid = (mode == 'shadow' and (value.get('mode') != 'shadow' or value.get('delivered') is not False
                                       or value.get('s_sort') is not False or value.get('primary') != 'paired_win_probability'))
        counts['invalid_shadow'] += invalid
        counts['partial'] += value.get('status') == 'partial'
        counts['unknown'] += value.get('status') == 'unknown'
        reason = value.get('reason')
        if reason:
            reasons[reason] += 1
            counts['current_dependency_unknown'] += reason in ('current_B3_failed', 'current_B3_skipped')
        observation = value.get('observation_id')
        # Copied answers can carry the same result again; neither their time nor their worker errors are new work.
        if observation and observation in seen_observations:
            continue
        if observation:
            seen_observations.add(observation)
            counts['observations'] += 1
            memo = value.get('memo_hit') is True
            counts['memo_hits'] += memo
            all_ms.append(value.get('wall_ms'))
            (memo_ms if memo else compute_ms).append(value.get('wall_ms'))
        for target in value.get('targets') or []:
            if not isinstance(target, dict):
                continue
            unknown = {r.get('unknown') for r in target.get('rows') or [] if isinstance(r, dict) and r.get('unknown')}
            reasons.update(unknown)
            failed = any(r.startswith('global_computation_failed:') for r in unknown)
            if failed:
                counts['service_failures'] += 1
                evidence.append({'source': row.get('_source'), 'observation_id': observation, 'target': target})
            if observation and not value.get('memo_hit') and target.get('status') == 'computed':
                future_ms.append(target.get('wall_ms'))
        if isinstance(reason, str) and reason.startswith('global_observer_failed:'):
            counts['service_failures'] += 1
            evidence.append({'source': row.get('_source'), 'reason': reason})
    return {'mode': mode, **counts, 'unknown_reasons': dict(reasons), 'longest_missing_streak': longest,
            'wall_ms': wall_stats(all_ms), 'computation_wall_ms': wall_stats(compute_ms),
            'memo_wall_ms': wall_stats(memo_ms), 'future_target_wall_ms': wall_stats(future_ms),
            'evidence': evidence, 'alert': longest >= failure_streak or counts['invalid_shadow'] > 0 or counts['service_failures'] >= failure_streak,
            'admission': 'pending two complete natural shadow runs and real later-Boss comparison report; never auto-enable',
            'limits': 'Declared Act3/final unknowns are coverage limitations, not zero predictions or service failures. '
                      'Times are observed wall clocks with duplicate observation IDs excluded, not CPU time or a causal speedup. '
                      'No calibration, whole-run win probability or role ACK inferred.'}
