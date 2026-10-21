"""Frozen R409 shadow audit. No simulation, network, live reads, or actions."""
import csv
import gzip
import json
import math
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP, localcontext
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIELDS = ('death_rate', 'hp_loss', 'damage_per_turn', 'turns', 'losing_enemy_hp_fraction')
EPS = 1e-9


def load(path):
    return json.load(gzip.open(path, 'rt'))


def quantiles(values):
    xs = sorted(values)
    if not xs:
        return None
    def q(p):
        i = (len(xs)-1)*p
        a = int(i)
        return xs[a] + (xs[min(a+1, len(xs)-1)]-xs[a])*(i-a)
    return {'n': len(xs), 'p50': q(.5), 'p90': q(.9), 'max': xs[-1], 'over_5000': sum(x > 5000 for x in xs)}


def cells_equal(shown, original):
    if shown is None or original is None:
        return shown is None and original is None
    mean, se, n = shown
    def rounded(v, digits):
        if v is None or v == 0:
            return v
        d = Decimal.from_float(v)
        with localcontext() as ctx:
            ctx.prec = 100
            return float(d.quantize(Decimal(1).scaleb(d.adjusted()-digits+1), rounding=ROUND_HALF_UP))
    # Exact formatter contract, rather than a floating half-ULP tolerance.
    return mean == rounded(original['mean'], 5) and se == rounded(original['se'], 3) and n == original['n']


def analyse(r):
    table, prompt = r['table'], r['prompt']
    criteria = {k: json.loads(v) for k, v in prompt['questions']['pick']['criteria'].items()}
    targets = prompt['state']['targets']
    def target_id(i):
        return targets[i]['id'] if isinstance(i, int) else i
    shown = {k: {target_id(row['target']): row for row in v['A_vs_skip']} for k, v in criteria.items()}
    raw = {(row['option_id'], row['target_id']): row for row in table['immediate']}
    mismatches = []
    for key, rows in shown.items():
        assert criteria[key]['columns'] == list(FIELDS)
        for tid, row in rows.items():
            for m, value in zip(FIELDS, row['delta']):
                if not cells_equal(value, raw[key, tid]['paired_delta'][m]):
                    mismatches.append([key, tid, m])
        for core in criteria[key]['B_progress']:
            for row in core['results']:
                orig = next(v for v in table['long_term'] if v['direction_id'] == core['direction'] and v['combo_id'] == core['core'] and v['target_id'] == target_id(row['target']))
                for dest, src in [('result', 'metrics'), ('vs_current_deck', 'paired_delta')]:
                    for m, value in zip(FIELDS, row[dest]):
                        if not cells_equal(value, orig[src][m]):
                            mismatches.append([key, core['core'], orig['target_id'], dest, m])
    current = [t['id'] for t in targets if t['kind'] == 'current']
    elites = [t['id'] for t in targets if t['kind'] == 'elite']
    choice = (r.get('jev') or {}).get('validated', {}).get('choice')
    brain = r['brain_choice']

    def target_dominates(better, worse):
        # A stricter, weight-free screen: no target can be traded against another.
        if better == worse or better not in criteria or worse not in criteria or len(current) != 1 or not elites:
            return False
        diffs = []
        for target in current + elites:
            deaths = [raw.get((k, target), {}).get('metrics', {}).get('death_rate') for k in criteria]
            active = [('death_rate', 1), ('hp_loss', 1), ('damage_per_turn', -1)]
            if all(v is not None and v['mean'] == 1 for v in deaths):
                active += [('turns', -1), ('losing_enemy_hp_fraction', 1)]
            elif all(v is not None and v['mean'] == 0 for v in deaths):
                active += [('turns', 1)]
            for metric, sign in active:
                i = FIELDS.index(metric)
                a = shown[better].get(target, {}).get('delta', [None]*5)[i]
                b = shown[worse].get(target, {}).get('delta', [None]*5)[i]
                if a is None or b is None or min(a[2], b[2]) < 2:
                    return False
                diffs.append(sign*(a[0]-b[0]))
        return all(d <= EPS for d in diffs) and any(d < -EPS for d in diffs)

    def diagnose(boss_weight):
        if len(current) != 1 or not elites:
            return {'best': None, 'reason': 'missing_current_boss_or_elite_pool'}
        weights = {current[0]: boss_weight, **{t: (1-boss_weight)/len(elites) for t in elites}}
        weights = {t: w for t, w in weights.items() if w > 0}
        death = [raw.get((k, t), {}).get('metrics', {}).get('death_rate') for k in criteria for t in weights]
        all_loss = all(v is not None and v['mean'] == 1 for v in death)
        all_win = all(v is not None and v['mean'] == 0 for v in death)
        # Turns have opposite interpretations in uniformly lost and won fights.
        # Conditional loss HP and turns never become fabricated zero in mixed outcomes.
        order = [('death_rate', 1), ('hp_loss', 1)]
        if all_loss:
            order += [('losing_enemy_hp_fraction', 1), ('damage_per_turn', -1), ('turns', -1)]
        elif all_win:
            order += [('damage_per_turn', -1), ('turns', 1)]
        else:
            order += [('damage_per_turn', -1)]
        options = {}
        for key in criteria:
            metrics = {}
            for i, m in enumerate(FIELDS):
                values = [(w, shown[key].get(t, {}).get('delta', [None]*5)[i]) for t, w in weights.items()]
                metrics[m] = None if any(v is None or v[2] < 2 for _, v in values) else {
                    'mean': sum(w*v[0] for w, v in values),
                    'se_upper_bound': None if any(v[1] is None for _, v in values) else sum(w*v[1] for w, v in values),
                    'n_min': min(v[2] for _, v in values)}
            score = [round(sign*metrics[m]['mean'], 10) for m, sign in order] if all(metrics[m] is not None for m, _ in order) else None
            options[key] = {'metrics': metrics, 'score': score}
        complete = all(v['score'] is not None for v in options.values())
        best = [k for k, v in options.items() if v['score'] == min(o['score'] for o in options.values())] if complete else None

        def dominates(better, worse, uncertainty=False, active=None):
            if better == worse or better not in options or worse not in options:
                return False
            diffs = []
            for m, sign in (order if active is None else active):
                a, b = options[better]['metrics'][m], options[worse]['metrics'][m]
                if a is None or b is None:
                    return False
                d = sign*(a['mean']-b['mean'])
                if uncertainty:
                    if a['se_upper_bound'] is None or b['se_upper_bound'] is None:
                        return False
                    # Candidate-vs-candidate paired covariance is unavailable.
                    # Sum of SEs is a conservative bound, not an inferred paired SE.
                    d += 2*(a['se_upper_bound']+b['se_upper_bound'])
                diffs.append(d)
            return all(d <= EPS for d in diffs) and any(d < -EPS for d in diffs)

        pareto = [k for k, v in options.items() if v['score'] is not None and not any(dominates(b, k) for b in options)]
        dominators = [k for k in options if dominates(k, choice)] if choice else []
        strong = [k for k in options if dominates(k, choice, True)] if choice else []
        relation = None
        if choice:
            if choice == brain:
                relation = 'same_choice'
            elif dominates(choice, brain):
                relation = 'jev_mean_better'
            elif dominates(brain, choice):
                relation = 'brain_mean_better'
            elif options.get(choice, {}).get('score') is None or options.get(brain, {}).get('score') is None:
                relation = 'unknown'
            elif all(abs(options[choice]['metrics'][m]['mean']-options[brain]['metrics'][m]['mean']) <= EPS for m, _ in order):
                relation = 'equal_active_means'
            else:
                relation = 'metric_tradeoff'
        return {'best': best, 'complete': complete, 'all_loss': all_loss, 'all_win': all_win,
                'active_order': order, 'options': options, 'pareto': pareto,
                'jev_is_best': None if best is None or not choice else choice in best,
                'brain_is_best': None if best is None else brain in best,
                'jev_mean_dominated_by': dominators, 'jev_two_se_dominated_by': strong,
                'jev_three_metric_dominated_by': [k for k in options if dominates(k, choice, active=[('death_rate', 1), ('hp_loss', 1), ('damage_per_turn', -1)])] if choice else [],
                'brain_vs_jev': relation,
                'better_than_skip': [k for k in options if dominates(k, 'skip')],
                'two_se_better_than_skip': [k for k in options if dominates(k, 'skip', True)]}

    b_numeric = [v for v in table['long_term'] if v['samples'] >= 2 and v['metrics']['hp_loss'] is not None]
    b_core_targets = {(v['direction_id'], v['combo_id'], v['target_id']) for v in b_numeric}
    shown_b = {(c['direction'], c['core'], target_id(row['target'])) for v in criteria.values() for c in v['B_progress'] for row in c['results']}
    reasons = Counter(reason for v in table['immediate'] for reason in v['unknown_reasons'])
    b_reasons = Counter(reason for v in table['long_term'] for reason in v['unknown_reasons'])
    return {'key': r['key'], 'run': r['run'], 'floor': r['floor'], 'nova_selected': r['nova_selected'],
            'brain_choice': brain, 'jev_choice': choice, 'jev_error': (r.get('jev') or {}).get('error'),
            'confidence': (r.get('jev') or {}).get('validated', {}).get('confidence'),
            'targetwise_mean_dominated_by': [k for k in criteria if target_dominates(k, choice)] if choice else [],
            'known': r['coverage']['coverage']['known'], 'production_would_use_jev': r['coverage']['coverage']['reason'] is None,
            'wire_bytes': len(json.dumps({'model': 'typesafe/jev-1.14', **prompt}, ensure_ascii=False, separators=(',', ':')).encode()),
            'display_mismatches': mismatches, 'A_unknown_reasons': dict(reasons), 'B_unknown_reasons': dict(b_reasons),
            'A_ms': r['a_ms'], 'packing_ms': r['packing_ms'], 'foreground_ms': r['foreground_ms'],
            'background_ms': r['background_ms'], 'jev_ms': r.get('jev_wall_ms'),
            'B_numeric': len(b_core_targets), 'B_rows': len(table['long_term']),
            'B_expected': r['table']['telemetry'].get('long_term_total'), 'B_shown_numeric': len(shown_b),
            'B_future_targets': sum(t['kind'] in ('future', 'chain') for t in table['targets']),
            'B_cache': table['telemetry'].get('long_term_cache'),
            'A_current_boss_n': {k: raw[k, current[0]]['samples'] for k in criteria} if len(current) == 1 else {},
            'A_current_boss_all_dead': len(current) == 1 and all(raw[k, current[0]]['metrics']['death_rate'] is not None and raw[k, current[0]]['metrics']['death_rate']['mean'] == 1 for k in criteria),
            'telemetry': table['telemetry'],
            'primary': diagnose(.5), 'sensitivity': {str(w): diagnose(w)['best'] for w in (0, .25, .5, .75, 1)}}


def summary(rows):
    selected = [r for r in rows if r['nova_selected']]
    answered = [r for r in selected if r['jev_choice']]
    rankable = [r for r in answered if r['primary']['best'] is not None]
    eligible = [r for r in answered if r['production_would_use_jev']]
    disagree = [r for r in answered if r['brain_choice'] != r['jev_choice']]
    def count(counter):
        return dict(sum((Counter(r[counter]) for r in rows), Counter()))
    return {'situations': len(rows), 'nova_selected': len(selected), 'nova_answered': len(answered),
            'nova_errors': [dict(key=r['key'], error=r['jev_error']) for r in selected if r['jev_error']],
            'production_eligible_all': sum(r['production_would_use_jev'] for r in rows), 'production_eligible_selected': len(eligible),
            'rankable_answered': len(rankable), 'jev_best': sum(r['primary']['jev_is_best'] for r in rankable),
            'jev_pareto_compatible': sum(r['jev_choice'] in r['primary'].get('pareto', []) for r in rankable),
            'all_loss_rankable': sum(r['primary'].get('all_loss', False) for r in rankable),
            'A_current_boss_all_dead': sum(r['A_current_boss_all_dead'] for r in rows),
            'brain_best_same_answered_cohort': sum(r['primary']['brain_is_best'] for r in rankable),
            'jev_mean_dominated': [r['key'] for r in answered if r['primary'].get('jev_mean_dominated_by')],
            'jev_two_se_dominated': [r['key'] for r in answered if r['primary'].get('jev_two_se_dominated_by')],
            'jev_three_metric_dominated': [r['key'] for r in answered if r['primary'].get('jev_three_metric_dominated_by')],
            'jev_targetwise_mean_dominated': [r['key'] for r in answered if r['targetwise_mean_dominated_by']],
            'same_brain_choice': sum(r['brain_choice'] == r['jev_choice'] for r in answered),
            'disagreement_relations': dict(Counter(r['primary']['brain_vs_jev'] for r in disagree)),
            'jev_skip': sum(r['jev_choice'] == 'skip' for r in answered),
            'brain_skip_paired': sum(r['brain_choice'] == 'skip' for r in answered),
            'brain_skip_all': sum(r['brain_choice'] == 'skip' for r in rows),
            'jev_skips_with_mean_better_card': [r['key'] for r in answered if r['jev_choice'] == 'skip' and r['primary'].get('better_than_skip')],
            'jev_skips_with_two_se_better_card': [r['key'] for r in answered if r['jev_choice'] == 'skip' and r['primary'].get('two_se_better_than_skip')],
            'B_numeric_questions': sum(r['B_numeric'] > 0 for r in rows),
            'B_shown_numeric_questions': sum(r['B_shown_numeric'] > 0 for r in rows),
            'B_numeric_rows': sum(r['B_numeric'] for r in rows), 'B_expected_rows': sum(r['B_expected'] or 0 for r in rows),
            'A_simulation_ms': quantiles([r['telemetry']['simulation_ms'] for r in rows]),
            'A_opening_preparation_ms': quantiles([r['telemetry']['preparation_ms'] for r in rows]),
            'A_unknown_reasons': count('A_unknown_reasons'), 'B_unknown_reasons': count('B_unknown_reasons'),
            'timing_ms': {k: quantiles([r[k] for r in rows if r.get(k) is not None]) for k in ('A_ms', 'packing_ms', 'foreground_ms', 'background_ms', 'jev_ms')},
            'wire_max_bytes': max((r['wire_bytes'] for r in rows), default=0),
            'display_mismatches': sum(len(r['display_mismatches']) for r in rows)}


def main():
    rows = [analyse(load(p)) for p in sorted((HERE/'results').glob('*.json.gz'))]
    out = {'all': summary(rows), 'production_eligible': summary([r for r in rows if r['production_would_use_jev']]),
           'per_run': {run: summary([r for r in rows if r['run'] == run]) for run in sorted({r['run'] for r in rows})}}
    (HERE/'analysis-results.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2)+'\n')
    (HERE/'analysis-summary.json').write_text(json.dumps(out, ensure_ascii=False, indent=2)+'\n')
    with (HERE/'per-question.csv').open('w') as f:
        w = csv.writer(f)
        w.writerow(['key', 'known', 'nova_selected', 'brain', 'jev', 'best', 'mean_dominated_by', 'two_se_dominated_by', 'relation', 'B_numeric', 'B_shown', 'A_ms', 'packing_ms', 'Nova_ms'])
        for r in rows:
            d = r['primary']
            w.writerow([r['key'], r['known'], r['nova_selected'], r['brain_choice'], r['jev_choice'], json.dumps(d['best']), json.dumps(d.get('jev_mean_dominated_by')), json.dumps(d.get('jev_two_se_dominated_by')), d.get('brain_vs_jev'), r['B_numeric'], r['B_shown_numeric'], r['A_ms'], r['packing_ms'], r['jev_ms']])
    print(json.dumps(out['all'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
