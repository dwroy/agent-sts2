#!/usr/bin/env python3
"""Join original-learner outcomes to immutable forecasts, then call the existing evaluator."""
import collections
import datetime as dt
import gzip
import hashlib
import json
import subprocess
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]
FIELDS = ('character', 'core', 'metric', 'horizon', 'model', 'policy', 'ascension', 'template_sha256')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def group_key(row):
    return tuple(row.get(k) for k in FIELDS)


def main():
    results = BASE / 'learner-results'
    outcome_path = results / 'outcomes.jsonl'
    coverage_path = results / 'coverage.json'
    assert outcome_path.exists() and coverage_path.exists(), 'Original learner delivery required; never fabricate missing labels.'
    manifest = json.loads((BASE / 'inputs/manifest.json').read_bytes())
    coverage = json.loads(coverage_path.read_bytes())
    assert coverage['input_manifest_sha256'] == digest(BASE / 'inputs/manifest.json')
    labels = {}
    for line in outcome_path.read_bytes().splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        key = (row['source_off'], row['option'], row['core'], row['metric'])
        assert key not in labels, f'duplicate learner key {key}'
        labels[key] = row
    out = BASE / 'evaluation'
    out.mkdir(exist_ok=True)
    input_path = out / 'matched-input.jsonl'
    assert not input_path.exists(), 'Preserve prior evaluation input/results; use a separate revision directory.'
    totals, dispositions = collections.Counter(), collections.Counter()
    forecast_groups = {}
    for row in json.loads((BASE / 'inputs/prediction-groups.json').read_bytes()):
        row['character'] = 'silent'
        forecast_groups[group_key(row)] = row
    used = set()
    verified_refs = set()

    def evidence_check(ref):
        if not isinstance(ref, dict) or not all(k in ref for k in ('path', 'off', 'len', 'sha256')):
            raise ValueError('Original raw evidence must specify path/off/len/sha256')
        key = tuple(ref[k] for k in ('path', 'off', 'len', 'sha256'))
        if key in verified_refs:
            return
        bounds = [v for v in manifest['source_bounds'].values() if v['path'] == ref['path']]
        if len(bounds) != 1 or ref['off'] < 0 or ref['len'] <= 0 or ref['off'] + ref['len'] > bounds[0]['complete_prefix_bytes']:
            raise ValueError(f'evidence outside frozen source: {ref}')
        with (ROOT / ref['path']).open('rb') as stream:
            stream.seek(ref['off'])
            raw = stream.read(ref['len'])
        assert hashlib.sha256(raw).hexdigest() == ref['sha256'], ref
        verified_refs.add(key)

    with input_path.open('w') as output, gzip.open(out / 'match-ledger.jsonl.gz', 'wt') as ledger, gzip.open(BASE / 'inputs/predictions.jsonl.gz', 'rt') as source:
        for index, item in enumerate(map(json.loads, source)):
            p = item['prediction']
            key = (item['source']['off'], item['option'], p['core'], p['metric'])
            label = labels.get(key)
            disposition = label.get('disposition', 'unverified') if label else 'unverified'
            o = {}
            if label:
                used.add(key)
            if disposition == 'matched':
                assert not item['preparation_gaps'], key
                o = label.get('outcome') or {}
                assert o, key
                for field in ('character', 'run', 'decision', 'core', 'metric', 'horizon', 'model', 'policy', 'attempt', 'ascension', 'template_sha256'):
                    assert p[field] == o.get(field), (key, field)
                assert all(o.get(field) is True for field in ('complete', 'followed_route', 'followed_policy')), key
                assert type(o.get('value')) is bool, key
                assert isinstance(p['value'], (int, float)) and not isinstance(p['value'], bool), key
                assert o.get('evidence'), key
                for ref in o['evidence']:
                    evidence_check(ref)
                verification = label.get('verification') or {}
                for field in ('initial_option', 'route', 'policy', 'sl', 'endpoint'):
                    assert verification.get(field), (key, field)
                    for ref in verification[field]:
                        evidence_check(ref)
                assert dt.datetime.fromisoformat(o['observed_at'].replace('Z', '+00:00')) <= dt.datetime.fromisoformat(manifest['at'])
            normalized = {'prediction': p, 'outcome': o}
            output.write(json.dumps(normalized, ensure_ascii=False, separators=(',', ':')) + '\n')
            ledger.write(json.dumps({'row': index, 'key': key, 'group': group_key(p), 'disposition': disposition,
                                     'preparation_gaps': item['preparation_gaps'], 'reason': label.get('reason') if label else 'No matched original-learner outcome supplied'},
                                    ensure_ascii=False, separators=(',', ':')) + '\n')
            totals['forecast_rows'] += 1
            dispositions[disposition] += 1
    assert used == labels.keys(), 'Learner labels not found in frozen predictions'
    current = ROOT / 'eval/construction.py'
    snapshot = BASE / 'protocol-snapshot/eval/construction.py'
    assert digest(current) == digest(snapshot), 'Evaluator changed after preregistration; reconcile without silently changing gate.'
    command = ['nice', '-n', '19', 'python3', str(current), str(input_path), '--out', str(out / 'evaluator-report.json')]
    run = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
    (out / 'command.json').write_text(json.dumps({'command': command, 'rc': run.returncode, 'stdout': run.stdout, 'stderr': run.stderr,
                                                'evaluator_sha256': digest(current), 'input_sha256': digest(input_path)}, ensure_ascii=False, indent=2) + '\n')
    assert run.returncode == 0, run.stderr
    report = json.loads((out / 'evaluator-report.json').read_bytes())
    assert report['input_sha256'] == digest(input_path)
    scored = {group_key(row): row for row in report['groups']}
    rows = []
    for key, original in sorted(forecast_groups.items(), key=lambda pair: str(pair[0])):
        s = scored.get(key, {})
        n = s.get('independent_runs', 0)
        failures = []
        if original['metric'] != 'conditionalSignature':
            failures.append('metric_not_eligible_for_advisory')
        if original['numeric_rows'] == 0:
            failures.append('all_logged_probabilities_unknown')
        if any(original.get(k) is None for k in ('model', 'policy', 'template_sha256')):
            failures.append('missing_prospective_binding')
        if n < 10:
            failures.append('fewer_than_10_qualified_independent_runs')
        if not s.get('positives') or not s.get('negatives'):
            failures.append('missing_positive_or_negative_outcomes')
        if not s:
            failures.append('no_qualified_labels_to_score')
        else:
            if s['brier'] >= s['baseline_brier']:
                failures.append('brier_not_better_than_constant_baseline')
            if abs(s['bias']) > 0.1:
                failures.append('absolute_bias_exceeds_0.1')
        rows.append({**{k: original.get(k) for k in FIELDS}, 'forecast_rows': original['forecast_rows'],
                     'numeric_prediction_rows': original['numeric_rows'], 'potential_bound_runs': len(original['bound_numeric_runs']),
                     'n': s.get('n', 0), 'independent_runs': n, 'positives': s.get('positives', 0), 'negatives': s.get('negatives', 0),
                     'brier': s.get('brier'), 'baseline_brier': s.get('baseline_brier'), 'bias': s.get('bias'),
                     'minimum_more_qualified_independent_runs': max(0, 10 - n), 'admitted': not failures,
                     'failures': failures, 'missing_data_limit': 'Minimum count deficit only; further data cannot guarantee both outcome classes or performance gates.'})
    result = {'at': dt.datetime.now(dt.timezone.utc).isoformat(), 'schema': 'g3b-admission-audit-v1',
              'input_manifest_sha256': digest(BASE / 'inputs/manifest.json'), 'matched_input_sha256': report['input_sha256'],
              'learner_outcomes_sha256': digest(outcome_path), 'learner_coverage_sha256': digest(coverage_path),
              'forecast_rows': totals['forecast_rows'], 'dispositions': dict(dispositions), 'verified_raw_references': len(verified_refs),
              'scored_groups': len(scored), 'admitted_groups': sum(row['admitted'] for row in rows), 'groups': rows,
              'publication_file_created': False, 'publication_authority': 'Original ops only; this is an offline analysis report',
              'gameplay_truth_author': 'Original learner; watcher checks source and prediction bindings only'}
    (out / 'admission-audit.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'groups'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
