#!/usr/bin/env python3
"""Independently check source offsets, aggregates, and timing/fallback edge cases."""
import ast
import collections
import csv
import datetime as dt
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys

OUT = Path(__file__).resolve().parent
LOG = Path(sys.argv[1])
data = json.loads(gzip.decompress((OUT / 'projected-evidence.json.gz').read_bytes()))
summary = json.loads((OUT / 'summary.json').read_text())
manifest = json.loads((OUT / 'input-manifest.json').read_text())
checks = []


def check(name, condition):
    checks.append({'name': name, 'passed': bool(condition)})
    assert condition, name


# Load only pure functions, without executing the report writer.
tree = ast.parse((OUT / 'summarize.py').read_text())
env = {'math': math, 'dt': dt}
for node in tree.body:
    if isinstance(node, ast.FunctionDef) and node.name in ['stamp', 'quantiles', 'step_ms', 'actual_fallback']:
        exec(compile(ast.Module(body=[node], type_ignores=[]), '<aggregation helpers>', 'exec'), env)
check('nearest-rank handles empty, singleton, even sample and p90',
      env['quantiles']([]) == {'p50': None, 'p90': None, 'max': None}
      and env['quantiles']([3]) == {'p50': 3, 'p90': 3, 'max': 3}
      and env['quantiles']([4, 1, 3, 2]) == {'p50': 2, 'p90': 4, 'max': 4})
check('step includes action, does not double-count nested LLM/plan timings',
      env['step_ms']({'observed_ts': '2026-10-21T00:00:00Z', 'ts': '2026-10-21T00:01:30Z',
                      'latency_ms': {'action': 100, 'plan': 1000, 'deepseek': 89000}, 'decision_id': 'fixture'}) == 90100)
base = {'fallback': False, 'time_budget': {'timed_out': True}, 'decider': 'code'}
check('budget timeout alone is not counted as actual fallback', not env['actual_fallback'](base))
check('three explicit fallback signals form a union',
      all(env['actual_fallback'](r) for r in [dict(base, fallback=True), dict(base, decider='code-fallback'),
                                            dict(base, time_budget={'fallback': 'L2_deadline_existing_L1'})]))

sampled = 0
for name, kind, fields in [('decisions.jsonl', 'decisions', ['decision_id', 'ts', 'label', 'decider', 'fallback']),
                           ('brain.jsonl', 'brain', ['question_id', 'latency_ms', 'accepted']),
                           ('codex-calls.jsonl', 'calls', ['question_id', 'ms', 'call_ms', 'outcome']),
                           ('v6-build.jsonl', 'v6', ['kind', 'elapsed_ms', 'fallback']),
                           ('sl-attempts.jsonl', 'sl', ['floor', 'attempt', 'result'])]:
    with (LOG / name).open('rb') as f:
        for rid, run in data.items():
            records = run[kind]
            for i in sorted({0, len(records) // 2, len(records) - 1}) if records else []:
                record = records[i]
                f.seek(record['offset'])
                raw = f.readline()
                assert f.tell() <= manifest['files'][name]['bytes']
                source = json.loads(raw)
                assert source['run_id'] == rid
                assert all(source.get(k) == record.get(k) for k in fields)
                sampled += 1
check('first/middle/last projected records match raw source offsets', sampled > 400)

for g, expected_n, expected_floor_sum in [('V5', 20, 631), ('V6-brain', 16, 542), ('V6-Jev', 7, 106)]:
    runs = [r for r in data.values() if r['group'] == g]
    m = summary['groups'][g]
    check(g + ' sample size and independently totaled floors', len(runs) == expected_n
          and sum(r['terminal']['floor'] for r in runs) == expected_floor_sum
          and m['floor_mean'] == expected_floor_sum / expected_n)
    check(g + ' timing and card totals reconcile across run/group levels',
          math.isclose(sum(summary['runs'][r['run_id']]['brain_total_s'] for r in runs), m['brain_total_s'])
          and sum(summary['runs'][r['run_id']]['card_records'] for r in runs) == m['card_records'])
check('CSV preserves all 43 unique run IDs',
      {r['run_id'] for r in csv.DictReader((OUT / 'per-run.csv').open())} == set(data))

locations = json.loads((OUT / 'console-error-locations.json').read_text())
by_file = collections.defaultdict(list)
for loc in locations:
    by_file[loc['file']].append(loc)
for name, locs in by_file.items():
    raw = (LOG / name).open('rb').read(manifest['console'][Path(name).name])
    lines = raw.splitlines()
    for loc in locs:
        assert hashlib.sha256(lines[loc['line'] - 1]).hexdigest() == loc['line_sha256']
check('all console evidence line hashes match bounded source', bool(locations))

result = {'passed': True, 'checks': checks, 'raw_offset_samples': sampled,
          'console_location_records_verified': len(locations),
          'typescript_tests': 'not required: analysis artifacts and decision record only'}
(OUT / 'independent-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False, indent=2))
