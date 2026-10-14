#!/usr/bin/env python3
"""Score matched construction forecasts; unknown outcomes and policy/route deviations stay excluded.

Input JSONL has prediction/outcome objects. This does not invent a counterfactual outcome from a won run.
"""
import argparse
import json
import hashlib
from collections import defaultdict
from datetime import datetime
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
        elif not prospective(p.get('as_of'), o.get('observed_at')):
            why = 'not a prospective prediction'
        elif p.get('metric') == 'conditionalSignature' and (
                type(p.get('ascension')) is not int or p['ascension'] != o.get('ascension')
                or not isinstance(p.get('template_sha256'), str) or len(p['template_sha256']) != 64
                or any(c not in '0123456789abcdef' for c in p['template_sha256'])
                or p['template_sha256'] != o.get('template_sha256')):
            why = 'missing or mismatched ascension/template binding'
        if why:
            excluded.append({'row': i, 'reason': why})
            continue
        seen.add(identity)
        key = (p['character'], p['core'], p['metric'], p['horizon'], p['model'], p['policy'], p.get('ascension'), p.get('template_sha256'))
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
        out.append(dict(zip(('character', 'core', 'metric', 'horizon', 'model', 'policy', 'ascension', 'template_sha256'), key)) |
                   {'n': n, 'independent_runs': len({r for _, _, r in values}),
                    'brier': sum((p-y)**2 for p, y, _ in values)/n, 'bias': sum(p-y for p, y, _ in values)/n,
                    'positives': sum(y for _, y, _ in values), 'negatives': sum(1-y for _, y, _ in values),
                    'baseline_brier': (sum(y for _, y, _ in values)/n) * (1-sum(y for _, y, _ in values)/n), 'bins': bins})
    return {'schema': 'construction-calibration-v1', 'groups': out, 'excluded': excluded,
            'limits': ['同局多决策不是独立对局；此表不证明选牌因果收益。',
                       '机会重放、实际组件集齐、实战可运转、整局通关必须分别校准，不跨指标晋级。'],
            'automatic_promotion': False}


def prospective(before, after):
    try:
        a, b = (datetime.fromisoformat(s.replace('Z', '+00:00')) for s in (before, after))
        return a.tzinfo is not None and b.tzinfo is not None and a < b
    except (ValueError, TypeError, AttributeError):
        return False


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    raw = args.input.read_bytes()
    result = evaluate(json.loads(line) for line in raw.splitlines() if line.strip())
    result['input_sha256'] = hashlib.sha256(raw).hexdigest()
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'groups': len(result['groups']), 'excluded': len(result['excluded'])}))
