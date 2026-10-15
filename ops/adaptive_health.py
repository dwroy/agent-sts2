"""C2 shadow readback only; a passing snapshot never activates adaptive sampling."""
from collections import Counter


def adaptive_health(config, records):
    mode = (config.get('loop') or {}).get('sim_adaptive', 'off')
    admission_state = (config.get('loop') or {}).get('sim_adaptive_admission', 'unknown')
    counts = Counter(observed=0, produced=0, errors=0, evaluable=0, matched=0, unknown=0, complete_adaptive=0,
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
            if (value.get('status') != 'complete_adaptive' or not candidates
                    or any(not isinstance(c, dict) or type(c.get('samples')) is not int or c['samples'] < 1
                           or c.get('stop') not in ('eliminated', 'leader', 'max') for c in candidates)):
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
