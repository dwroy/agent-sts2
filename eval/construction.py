#!/usr/bin/env python3
"""Score matched construction forecasts; unknown outcomes and policy/route deviations stay excluded.

Input JSONL has prediction/outcome objects. This does not invent a counterfactual outcome from a won run.
"""
import argparse
import json
from collections import defaultdict
from pathlib import Path


def evaluate(rows):
    groups, seen, excluded = defaultdict(list), set(), []
    for i, row in enumerate(rows):
        p, o = row.get('prediction', {}), row.get('outcome', {})
        fields = ('character', 'run', 'decision', 'core', 'metric', 'horizon', 'model', 'policy', 'attempt')
        identity = tuple(p.get(k) for k in fields)
        why = None
        if any(p.get(k) is None or p.get(k) != o.get(k) for k in fields):
            why = 'identity mismatch'
        elif identity in seen:
            why = 'duplicate prediction'
        elif not o.get('complete') or not o.get('followed_policy') or not o.get('followed_route'):
            why = 'censored or policy/route changed'
        elif not o.get('evidence') or not isinstance(o.get('value'), bool):
            why = 'no observed binary outcome/evidence'
        elif not isinstance(p.get('value'), (float, int)) or isinstance(p['value'], bool) or not 0 <= p['value'] <= 1:
            why = 'unknown probability'
        elif not p.get('as_of') or not o.get('observed_at') or p['as_of'] >= o['observed_at']:
            why = 'not a prospective prediction'
        if why:
            excluded.append({'row': i, 'reason': why})
            continue
        seen.add(identity)
        key = (p['character'], p['core'], p['metric'], p['horizon'], p['model'], p['policy'])
        groups[key].append((p['value'], int(o['value']), p['run']))
    out = []
    for key, values in sorted(groups.items(), key=lambda pair: str(pair[0])):
        n = len(values)
        bins = []
        for band in range(5):
            xs = [(p, y) for p, y, _ in values if min(4, int(p * 5)) == band]
            if xs:
                bins.append({'range': [band / 5, (band + 1) / 5], 'n': len(xs),
                             'predicted': sum(p for p, _ in xs) / len(xs), 'observed': sum(y for _, y in xs) / len(xs)})
        out.append(dict(zip(('character', 'core', 'metric', 'horizon', 'model', 'policy'), key)) |
                   {'n': n, 'independent_runs': len({r for _, _, r in values}),
                    'brier': sum((p-y)**2 for p, y, _ in values)/n, 'bias': sum(p-y for p, y, _ in values)/n, 'bins': bins})
    return {'schema': 'construction-calibration-v1', 'groups': out, 'excluded': excluded,
            'limits': ['同局多决策不是独立对局；此表不证明选牌因果收益。',
                       '机会重放、实际组件集齐、实战可运转、整局通关必须分别校准，不跨指标晋级。'],
            'automatic_promotion': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    result = evaluate(json.loads(line) for line in args.input.open() if line.strip())
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'groups': len(result['groups']), 'excluded': len(result['excluded'])}))
