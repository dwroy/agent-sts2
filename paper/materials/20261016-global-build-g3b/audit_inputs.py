#!/usr/bin/env python3
"""Check immutable prediction projections and source bindings; do not adjudicate gameplay."""
import collections
import datetime as dt
import gzip
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]
INPUTS = BASE / json.loads((BASE / 'active-input.json').read_bytes())['directory']


def main():
    manifest = json.loads((INPUTS / 'manifest.json').read_bytes())
    checks = []
    for name, expected in manifest['artifacts'].items():
        path = INPUTS / name
        actual = {'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        assert actual == expected, name
        checks.append({'path': str(path.relative_to(ROOT)), **actual})
    index = manifest['raw_construction_record_index']
    record_sources = []
    modes, config_modes, roles, statuses = (collections.Counter() for _ in range(4))
    option_counts, duplicate_decisions = collections.Counter(), collections.Counter()
    numeric = collections.Counter()
    pred_count = 0
    raw_sha_errors = []
    with (ROOT / 'logs/decisions.jsonl').open('rb') as original, gzip.open(INPUTS / 'construction-records.jsonl.gz', 'rt') as stream:
        for record in map(json.loads, stream):
            source = record['_source']
            original.seek(source['off'])
            raw = original.read(source['len'])
            if hashlib.sha256(raw).hexdigest() != source['sha256']:
                raw_sha_errors.append(source)
            assert source['off'] + source['len'] <= manifest['source_bounds']['decisions']['complete_prefix_bytes']
            raw_row = json.loads(raw)
            assert raw_row['boss_sim']['construction'] == record['construction']
            record_sources.append(source)
            c = record['construction']
            modes[c.get('mode')] += 1
            config_modes[record['config'].get('construction', {}).get('mode')] += 1
            roles[(record['config'].get('character'), record['config'].get('ascension'))] += 1
            statuses[c.get('status')] += 1
            duplicate_decisions[(record['run_id'], record['decision_id'])] += 1
            for option, forecasts in c.get('forecasts', {}).items():
                option_counts['supported' if isinstance(forecasts, list) else 'unsupported'] += 1
    assert not raw_sha_errors, raw_sha_errors
    assert record_sources == index
    prediction_groups = collections.defaultdict(lambda: {'rows': 0, 'numeric': 0, 'runs': set(), 'bound_runs': set(), 'as_of_after_freeze': 0})
    with gzip.open(INPUTS / 'predictions.jsonl.gz', 'rt') as stream:
        for item in map(json.loads, stream):
            p = item['prediction']
            key = tuple(p.get(k) for k in ['core', 'ascension', 'metric', 'horizon', 'model', 'policy', 'template_sha256'])
            group = prediction_groups[key]
            group['rows'] += 1
            group['runs'].add(p['run'])
            is_numeric = isinstance(p['value'], (int, float)) and not isinstance(p['value'], bool)
            if is_numeric:
                assert 0 <= p['value'] <= 1
                numeric[p['metric']] += 1
                group['numeric'] += 1
                if not item['preparation_gaps']:
                    group['bound_runs'].add(p['run'])
            if p['as_of']:
                as_of = dt.datetime.fromisoformat(p['as_of'].replace('Z', '+00:00'))
                assert as_of.tzinfo
                group['as_of_after_freeze'] += as_of > dt.datetime.fromisoformat(manifest['at'])
            assert item['outcome'] is None
            pred_count += 1
    groups = json.loads((INPUTS / 'prediction-groups.json').read_bytes())
    for g in groups:
        key = tuple(g.get(k) for k in ['core', 'ascension', 'metric', 'horizon', 'model', 'policy', 'template_sha256'])
        actual = prediction_groups[key]
        assert actual['rows'] == g['forecast_rows']
        assert actual['numeric'] == g['numeric_rows']
        assert sorted(actual['runs']) == g['observed_runs']
        assert sorted(actual['bound_runs']) == g['bound_numeric_runs']
        assert actual['as_of_after_freeze'] == 0
    assert pred_count == manifest['counts']['forecast_rows']
    result = {'at': dt.datetime.now(dt.timezone.utc).isoformat(),
              'manifest_sha256': hashlib.sha256((INPUTS / 'manifest.json').read_bytes()).hexdigest(),
              'artifact_checks': checks, 'original_construction_rows_sha_verified': len(index),
              'forecast_rows': pred_count, 'groups': len(groups), 'modes': dict(modes), 'config_modes': dict(config_modes),
              'roles_and_ascensions': [{'character': k[0], 'ascension': k[1], 'n': v} for k, v in roles.items()],
              'statuses': dict(statuses), 'option_records': dict(option_counts), 'numeric_by_metric': dict(numeric),
              'repeated_native_decision_identities': [{'run': k[0], 'decision': k[1], 'rows': v} for k, v in duplicate_decisions.items() if v > 1],
              'projection_consistent': True, 'source_prefix_references_valid': True,
              'gameplay_outcomes_or_policy_truth_inferred': False,
              'future_data_or_binding_backfill': False}
    (BASE / 'input-audit-r2.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k not in ('artifact_checks', 'repeated_native_decision_identities')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
