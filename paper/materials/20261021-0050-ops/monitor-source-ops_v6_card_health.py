"""Read-only V6 reward service receipts; never infer simulator accuracy or policy use."""
from collections import Counter
import math


def obj(value):
    return value if isinstance(value, dict) else {}


def finite(value, minimum=None):
    return (isinstance(value, (int, float)) and not isinstance(value, bool)
            and math.isfinite(value) and (minimum is None or value >= minimum))


def routed(config, row):
    v6 = obj(config.get('v6'))
    return (v6.get('mode') == 'on' and obj(v6.get('deciders')).get('card') == 'jev'
            and row.get('label') == 'reward/card' and isinstance(row.get('v6_card'), dict)
            and row.get('decider') in ('jev', 'code-fallback'))


def sampled(row):
    # Mirror cardResultKnown's current-Boss availability, not the legacy B3 minimum.
    metrics = obj(row.get('metrics'))
    required = [metrics.get(k) for k in ('hp_loss', 'turns', 'damage_per_turn', 'death_rate')]
    required.append(obj(row.get('paired_delta')).get('death_rate'))
    return (finite(row.get('samples'), 2) and not row.get('unknown_reasons') and not row.get('error')
            and all(finite(obj(m).get('mean')) and finite(obj(m).get('n'), 2)
                    and finite(obj(m).get('se'), 0) for m in required))


def v6_card_health(config, records, results, builds, failure_streak=3):
    counts = Counter(expected=0, computed=0, available=0, consumed=0, partial=0)
    failures, evidence, used = Counter(), [], set()
    streak = longest = 0
    for row in records:
        if not routed(config, row):
            continue
        counts['expected'] += 1
        options = {k for k, v in obj(obj(obj(row.get('questions')).get('pick')).get('criteria')).items() if v is not None}
        # Old computation rows lack a decision ID: disclose the temporal association.
        matches = [r for r in results if r.get('run_id') == config['run_id']
                   and type(r.get('floor')) is int and r['floor'] == row.get('floor')
                   and isinstance(r.get('ts'), str) and r['ts'] <= row.get('ts', '')]
        receipt = max(matches, key=lambda r: r['ts']) if matches else {}
        table = obj(receipt.get('table'))
        identity = (receipt.get('ts'), receipt.get('floor'))
        reasons = []
        if table.get('schema') != 'v6-card-combat-results-v1' or identity in used:
            reasons.append('missing_computation_receipt')
        else:
            used.add(identity)
            counts['computed'] += 1
            targets = [t for t in table.get('targets', []) if obj(t).get('kind') == 'current']
            immediate = [r for r in table.get('immediate', []) if isinstance(r, dict)]
            current = targets[0] if len(targets) == 1 else {}
            current_rows = [r for r in immediate if r.get('target_id') == current.get('id')]
            known = (bool(options) and bool(current.get('id')) and not current.get('unknown')
                     and {r.get('option_id') for r in current_rows} == options
                     and len(current_rows) == len(options) and all(sampled(r) for r in current_rows))
            if table.get('error'):
                reasons.append('computation_error')
            elif not known:
                reasons.append('unavailable_current_outcomes')
            else:
                counts['available'] += 1
                counts['partial'] += any(finite(r.get('requested_samples')) and r['samples'] < r['requested_samples'] for r in current_rows)
        deliveries = [r for r in builds if r.get('schema') == 'v6-build-log-v1'
                      and r.get('run_id') == config['run_id'] and r.get('question_id') == row.get('decision_id')
                      and r.get('kind') == 'card_pick' and r.get('mode') == 'on'
                      and isinstance(r.get('ts'), str) and receipt.get('ts', '') <= r['ts'] <= row.get('ts', '')]
        delivery = deliveries[-1] if deliveries else {}
        answer = obj(obj(row.get('answers')).get('pick'))
        unknown = obj(delivery.get('unknown'))
        consumed = (bool(row.get('decision_id')) and row.get('decider') == 'jev'
                    and row.get('fallback') is False and delivery.get('fallback') is None
                    and obj(delivery.get('jev_answer')).get('choice') == answer.get('choice')
                    and answer.get('choice') in options and unknown.get('count') == 0
                    and unknown.get('total') == len(options) and bool(options)
                    and str(row.get('result', '')).startswith('completed:'))
        counts['consumed'] += consumed
        if not consumed:
            reasons.append('missing_or_failed_consumption')
        if reasons:
            failures.update(reasons)
            streak += 1
            longest = max(longest, streak)
        else:
            streak = 0
        evidence.append({'decision': row.get('decision_id'), 'floor': row.get('floor'), 'reasons': reasons,
                         'source': row.get('_source'), 'computation_source': receipt.get('_source'),
                         'consumption_source': delivery.get('_source')})
    return {**counts, 'failures': dict(failures), 'longest_failure_streak': longest,
            'evidence': evidence, 'alert': longest >= failure_streak,
            'limits': 'Results are associated by latest preceding run/floor timestamp and offered IDs; '
                      'the historical computation stream has no decision ID. Availability and completed Jev '
                      'consumption are separate receipts, not proof of candidate correctness, reasoning, '
                      '300-sample completion, calibration or benefit. Partial sample coverage remains explicit.'}
