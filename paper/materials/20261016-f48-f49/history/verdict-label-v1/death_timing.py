#!/usr/bin/env python3
"""Retain original final action records where an actual death has no saved verdict."""
import csv
import gzip
import json
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OLD = ROOT/'paper/materials/20261016-v5s-regression-diagnosis'


def main():
    attempts = list(csv.DictReader((HERE/'attempts.csv').open()))
    targets = {(a['run_id'], int(a['floor']), int(a['attempt'])): a for a in attempts
               if a['cohort'] == 'post' and a['result'] == 'died' and not a['judge_tier']}
    selected = defaultdict(list)
    for line in gzip.open(OLD/'inputs-lean/decisions.jsonl.gz', 'rt'):
        row = json.loads(line)
        key = row['run_id'], row['floor'], row.get('sl_attempt')
        if key in targets:
            selected[key].append(row)
    output = []
    for key, attempt in targets.items():
        rows = sorted(selected[key], key=lambda row: row['ts'])
        output.append(dict(run_id=key[0], floor=key[1], attempt=key[2], end_turn=attempt['turns'],
                           last_decisions=[{k: r.get(k) for k in ['ts', 'turn', 'label', 'chosen', 'result', 'rationale', '_source']} for r in rows[-8:]],
                           source=json.loads(attempt['source'])))
    (HERE/'death-without-saved-verdict.json').write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(dict(cases=len(output), runs=[x['run_id'] for x in output])))


if __name__ == '__main__':
    main()
