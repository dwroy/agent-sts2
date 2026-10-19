#!/usr/bin/env python3
"""Compare pinned learner statistics; this never modifies knowledge or evidence."""
import argparse
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIELDS = ['n', 'value', 'p25', 'p75', 'se', 'distribution', 'small_sample', 'unit']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--generated', type=Path, default=HERE/'comparison-generated.json')
    args = parser.parse_args()
    generated = json.loads(args.generated.read_text())['combos'][0]['metrics']
    expected = json.loads((HERE/'comparison-metrics.v2.json').read_text())
    differences = []
    counts = dict(observed=0, boss_statistics=0, availability_statistics=0)

    def compare(where, actual, wanted, kind):
        counts[kind] += 1

        def equal(a, b):
            if isinstance(a, (int, float)) and isinstance(b, (int, float)):
                return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
            return a == b

        delta = {key: [actual.get(key), wanted.get(key)] for key in FIELDS if not equal(actual.get(key), wanted.get(key))}
        if delta:
            differences.append(dict(where=where, differences=delta))

    for actual in generated:
        wanted = next(row for row in expected if all(row[k] == actual[k] for k in ('ascension', 'attempt', 'version')))
        for key in actual['observed']:
            compare(actual['attempt']+'.observed.'+key, actual['observed'][key], wanted['observed'][key], 'observed')
        for boss, stats in actual['bosses'].items():
            for key in stats:
                compare(actual['attempt']+'.bosses.'+boss+'.'+key, stats[key], wanted['bosses'][boss][key], 'boss_statistics')
        for row in actual['availability']:
            old = next(item for item in wanted['availability'] if item['card'] == row['card'] and item['act'] == row['act'])
            compare(actual['attempt']+'.availability.'+row['card']+'.'+str(row['act']), row['offered_rate'], old['offered_rate'], 'availability_statistics')
    print(json.dumps(dict(compared=sum(counts.values()), **counts, fields=FIELDS, differences=differences), ensure_ascii=False, indent=2))
    if differences or sum(counts.values()) != 96:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
