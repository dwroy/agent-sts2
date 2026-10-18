"""C2 shadow readback only; a passing snapshot never activates adaptive sampling."""
from collections import Counter
import math


def _valid_indifferent(value, sim, candidates, completion):
    """Read back the R394 contract; a new stop label alone is not completion."""
    rule = value.get('rule')
    if not isinstance(rule, dict) or not isinstance(candidates, list) or not candidates:
        return False
    lane, low = value.get('lane'), rule.get('lowTrust')
    if (value.get('schema') != 'sim-adaptive-v1' or value.get('status') != 'complete_adaptive'
            or value.get('stop_reason') != 'indifferent' or lane not in ('b2', 'b3')
            or rule.get('version') != 'adaptive-v1' or rule.get('profile') != 'silent-human-pace-v2'
            or type(low) is not bool or sim.get('error') or value.get('error')
            or completion.get('budgeted') is not True or completion.get('required') is not True
            or completion.get('failure') is not False or completion.get('status') != 'complete_budget'):
        return False
    first = 50 if low or lane == 'b2' else 100
    cap = 100 if low else 200 if lane == 'b2' else 300
    requested, spread = rule.get('requested'), value.get('indifference_spread')
    if (rule.get('first') != first or rule.get('batch') != first or rule.get('indifference') != .03
            or type(requested) is not int or not 1 <= requested <= cap
            or type(spread) not in (int, float) or not math.isfinite(spread) or not 0 <= spread < .03):
        return False
    keys, active, largest = set(), [], 0
    for candidate in candidates:
        if not isinstance(candidate, dict):
            return False
        key, n, rounds = candidate.get('key'), candidate.get('samples'), candidate.get('rounds')
        if (not isinstance(key, str) or not key or key in keys
                or type(n) is not int or not min(first, requested) <= n <= requested
                or (n != requested and (n - first) % first != 0)
                or type(rounds) is not int or rounds != 1 + max(0, math.ceil((n - first) / first))
                or candidate.get('stop') not in ('eliminated', 'indifferent')):
            return False
        keys.add(key)
        largest = max(largest, n)
        if candidate['stop'] == 'indifferent':
            active.append(candidate)
    # The baseline is not a selectable option; every survivor uses the same prefix.
    return (sum(c.get('baseline') is not True for c in active) > 1
            and all(c['samples'] == largest for c in active)
            and (lane != 'b3' or any(c['key'] == '@current' and c.get('baseline') is True for c in active)))


def adaptive_health(config, records):
    mode = (config.get('loop') or {}).get('sim_adaptive', 'off')
    admission_state = (config.get('loop') or {}).get('sim_adaptive_admission', 'unknown')
    counts = Counter(observed=0, produced=0, errors=0, evaluable=0, matched=0, unknown=0, complete_adaptive=0, budgeted_partial=0,
                     production_evaluable=0, production_matched=0)
    mismatches, saved, seen = [], [], set()
    actual_saved, sample_counts, rounds = [], [], []
    stops = Counter()
    for row in records:
        sim = row.get('boss_sim') or {}
        if not isinstance(sim, dict):
            continue
        value = sim.get('adaptive')
        if not isinstance(value, dict):
            continue
        identity = (row.get('label'), value.get('input_key') or row.get('decision_id') or row.get('ts'))
        if identity in seen:
            continue
        seen.add(identity)
        counts['observed'] += 1
        if value.get('mode') == 'on':
            candidates = value.get('candidates') or []
            completion = sim.get('completion')
            completion = completion if isinstance(completion, dict) else {}
            indifferent = (value.get('stop_reason') == 'indifferent' or isinstance(candidates, list)
                           and any(isinstance(c, dict) and c.get('stop') == 'indifferent' for c in candidates))
            if indifferent and not _valid_indifferent(value, sim, candidates, completion):
                counts['errors'] += 1
                continue
            # A normal H1 deadline preserves a prefix, not an adaptive completion or a C1 failure.
            budgeted_partial = (value.get('status') == 'partial'
                                and completion.get('budgeted') is True and completion.get('failure') is False
                                and completion.get('status') == 'partial' and completion.get('required') is True
                                and not sim.get('error') and not value.get('error'))
            if budgeted_partial and isinstance(candidates, list) and candidates and all(
                    isinstance(c, dict) and type(c.get('samples')) is int and c['samples'] >= 0
                    and c.get('stop') in ('budget', 'eliminated', 'leader', 'max') for c in candidates):
                counts['produced'] += 1
                counts['budgeted_partial'] += 1
                counts['unknown'] += 1
                for candidate in candidates:
                    sample_counts.append(candidate['samples'])
                    rounds.append(candidate.get('rounds'))
                    stops[candidate['stop']] += 1
                continue
            if (value.get('status') != 'complete_adaptive' or not candidates
                    or any(not isinstance(c, dict) or type(c.get('samples')) is not int or c['samples'] < 1
                           or c.get('stop') not in ('eliminated', 'leader', 'max', 'indifferent') for c in candidates)):
                counts['errors'] += 1
                continue
            counts['produced'] += 1
            counts['complete_adaptive'] += 1
            for candidate in candidates:
                sample_counts.append(candidate['samples'])
                rounds.append(candidate.get('rounds'))
                stops[candidate['stop']] += 1
            fraction = (value.get('work') or {}).get('savedFraction')
            if isinstance(fraction, (int, float)) and 0 <= fraction <= 1:
                actual_saved.append(fraction)
            # Early-stopped production has no counterfactual full run on this question.
            continue
        if value.get('status') != 'produced':
            counts['errors'] += 1
            continue
        counts['produced'] += 1
        production = value.get('production_comparison') or {}
        if type(production.get('agreement')) is bool:
            counts['production_evaluable'] += 1
            counts['production_matched'] += production['agreement']
            if not production['agreement']:
                mismatches.append({'decision': row.get('decision_id'), 'ts': row.get('ts'), 'floor': row.get('floor'),
                                   'label': row.get('label'), 'input_key': value.get('input_key'),
                                   'metric': 'deployed-ranking-first-group', **production, 'source': row.get('_source')})
        if value.get('evaluable') is not True or type(value.get('agreement')) is not bool:
            counts['unknown'] += 1
            continue
        counts['evaluable'] += 1
        counts['matched'] += value['agreement']
        if not value['agreement']:
            mismatches.append({'decision': row.get('decision_id'), 'ts': row.get('ts'), 'floor': row.get('floor'),
                               'label': row.get('label'), 'input_key': value.get('input_key'),
                               'full': value.get('full'), 'shadow': value.get('shadow'), 'source': row.get('_source')})
        fraction = (value.get('work') or {}).get('savedFraction')
        if isinstance(fraction, (int, float)) and 0 <= fraction <= 1:
            saved.append(fraction)
    def quantile(p, values=saved):
        values = sorted(values)
        if not values:
            return None
        at = (len(values) - 1) * p
        lo = int(at)
        hi = min(lo + 1, len(values) - 1)
        return values[lo] + (values[hi] - values[lo]) * (at - lo)
    return {'mode': mode, **counts, 'agreement': counts['matched'] / counts['evaluable'] if counts['evaluable'] else None,
            'production_agreement': counts['production_matched'] / counts['production_evaluable'] if counts['production_evaluable'] else None,
            'saved_fraction': {'p50': quantile(.5), 'p90': quantile(.9)}, 'mismatches': mismatches,
            'actual_saved_fraction': {'p50': quantile(.5, actual_saved), 'p90': quantile(.9, actual_saved)},
            'candidate_samples': sample_counts, 'candidate_rounds': rounds, 'stop_counts': dict(stops),
            'alert': mode in ('shadow', 'on') and counts['errors'] >= 3,
            'admission_state': admission_state,
            'admission': (f'accepted source; runtime mode={mode}; never auto-enable' if admission_state == 'accepted'
                          else 'not applicable to this character; never auto-enable' if admission_state == 'not_applicable'
                          else 'pending offline coverage and at least two completed natural shadow runs; never auto-enable'),
            'limits': 'Shadow estimates and actual on-mode sample work are separate. On-mode cannot observe full-run agreement; no elapsed-time saving or game benefit inferred.'}
