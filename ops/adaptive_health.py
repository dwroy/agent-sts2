"""C2 shadow readback only; a passing snapshot never activates adaptive sampling."""
from collections import Counter


def adaptive_health(config, records):
    mode = (config.get('loop') or {}).get('sim_adaptive', 'off')
    counts = Counter(observed=0, produced=0, errors=0, evaluable=0, matched=0, unknown=0)
    mismatches, saved, seen = [], [], set()
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
        if value.get('status') != 'produced':
            counts['errors'] += 1
            continue
        counts['produced'] += 1
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
    saved.sort()
    def quantile(p):
        if not saved:
            return None
        at = (len(saved) - 1) * p
        lo = int(at)
        hi = min(lo + 1, len(saved) - 1)
        return saved[lo] + (saved[hi] - saved[lo]) * (at - lo)
    return {'mode': mode, **counts, 'agreement': counts['matched'] / counts['evaluable'] if counts['evaluable'] else None,
            'saved_fraction': {'p50': quantile(.5), 'p90': quantile(.9)}, 'mismatches': mismatches,
            'alert': mode == 'shadow' and counts['errors'] >= 3,
            'admission': 'pending offline coverage and at least two completed natural shadow runs; never auto-enable',
            'limits': 'Estimated option-sample work only. Full samples actually ran; no elapsed-time saving or game benefit measured.'}
