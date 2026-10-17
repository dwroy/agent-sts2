#!/usr/bin/env python3
"""Freeze logged construction predictions, never infer gameplay outcomes or rerun forecasts."""
import datetime as dt
import gzip
import hashlib
import json
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / 'inputs'
START = 1283926113  # Original no-sync logdb min(off), ts >= actual R328 registration time.
R328 = '4391d1d38bf658747c37ab1d56d53e648ae97167'
METRICS = ('conditionalSignature', 'signature', 'aliveAndFunctional', 'terminalWin')


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cutoff(path):
    with path.open('rb') as stream:
        stat = path.stat()
        at = stat.st_size
        if at:
            stream.seek(max(0, at - 1024 * 1024))
            tail = stream.read(at - stream.tell())
            at = at - len(tail) + tail.rfind(b'\n') + 1
    return {'path': str(path.relative_to(ROOT)), 'size_at_freeze': stat.st_size,
            'complete_prefix_bytes': at, 'device': stat.st_dev, 'inode': stat.st_ino}


def prefix_rows(name, bounds):
    with (ROOT / bounds[name]['path']).open('rb') as stream:
        while stream.tell() < bounds[name]['complete_prefix_bytes']:
            off = stream.tell()
            raw = stream.readline()
            assert raw.endswith(b'\n') and stream.tell() <= bounds[name]['complete_prefix_bytes']
            try:
                row = json.loads(raw)
            except (ValueError, UnicodeError):
                continue
            yield row, {'off': off, 'len': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if (OUT / 'manifest.json').exists():
        raise SystemExit('already frozen; preserve this input and choose a new revision if necessary')
    names = ['decisions', 'states', 'runs', 'run-config', 'run-plans', 'sl-attempts', 'brain']
    bounds = {name: cutoff(ROOT / f'logs/{name}.jsonl') for name in names}
    frozen_at = dt.datetime.now(dt.timezone.utc).isoformat()
    configs = defaultdict(list)
    for row, source in prefix_rows('run-config', bounds):
        configs[row.get('run_id')].append((row, source))
    for rows in configs.values():
        rows.sort(key=lambda value: value[0].get('ts', ''))
    ancestor = {}
    counts, statuses, gaps = Counter(), Counter(), Counter()
    groups = defaultdict(lambda: {'records': 0, 'numeric': 0, 'runs': set(), 'bound_runs': set()})
    selected_runs = set()
    window_hash = hashlib.sha256()
    raw_index = []
    with (OUT / 'construction-records.jsonl.gz').open('wb') as f, gzip.GzipFile(fileobj=f, mode='wb', mtime=0) as records, (OUT / 'predictions.jsonl.gz').open('wb') as g, gzip.GzipFile(fileobj=g, mode='wb', mtime=0) as predictions, (ROOT / 'logs/decisions.jsonl').open('rb') as stream:
        stream.seek(START)
        while stream.tell() < bounds['decisions']['complete_prefix_bytes']:
            off = stream.tell()
            raw = stream.readline()
            assert raw.endswith(b'\n') and stream.tell() <= bounds['decisions']['complete_prefix_bytes']
            window_hash.update(raw)
            counts['scanned_rows'] += 1
            if b'"construction"' not in raw:
                continue
            row = json.loads(raw)
            construction = (row.get('boss_sim') or {}).get('construction')
            if not isinstance(construction, dict):
                continue
            run = row.get('run_id')
            possible = [value for value in configs.get(run, []) if value[0].get('ts', '') <= row.get('ts', '')]
            config, config_source = possible[-1] if possible else ({}, None)
            commit = (config.get('code') or {}).get('commit')
            if commit not in ancestor:
                ancestor[commit] = bool(commit) and subprocess.run(['git', 'merge-base', '--is-ancestor', R328, commit], cwd=ROOT,
                                                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
            source = {'path': 'logs/decisions.jsonl', 'off': off, 'len': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
            envelope = {key: row.get(key) for key in ['ts', 'run_id', 'floor', 'turn', 'label', 'decision_id',
                        'fingerprint', 'sl_attempt', 'sl_reloads', 'chosen', 'result', 'decider', 'journal']}
            envelope.update(construction=construction, config=config, config_source=config_source,
                            code_descends_R328=ancestor[commit], _source=source)
            records.write(encoded(envelope))
            raw_index.append(source)
            selected_runs.add(run)
            statuses[str(construction.get('status'))] += 1
            counts['construction_records'] += 1
            if construction.get('mode') != 'shadow':
                counts['non_shadow_records'] += 1
                continue
            for option, forecasts in (construction.get('forecasts') or {}).items():
                if not isinstance(forecasts, list):
                    counts['unsupported_option_records'] += 1
                    continue
                for forecast in forecasts:
                    for metric in METRICS:
                        probability = forecast.get(metric) or {}
                        p = {'character': str(config.get('character', '')).lower() or None, 'run': run,
                             'decision': row.get('decision_id'), 'core': forecast.get('core'), 'metric': metric,
                             'horizon': construction.get('horizon'), 'model': construction.get('forecast_model'),
                             'policy': construction.get('forecast_policy'), 'ascension': config.get('ascension'),
                             'template_sha256': construction.get('template_sha256'), 'as_of': construction.get('as_of'),
                             # Out-of-combat sl_attempt is explicitly null, not an assumed first fight.
                             'attempt': json.dumps([row['sl_attempt'], row['sl_reloads']], separators=(',', ':'))
                                if 'sl_attempt' in row and isinstance(row.get('sl_reloads'), int) else None,
                             'value': probability.get('estimate')}
                        missing = [key for key in ['character', 'run', 'decision', 'core', 'metric', 'horizon',
                                   'model', 'policy', 'ascension', 'template_sha256', 'as_of', 'attempt'] if p.get(key) is None]
                        if not ancestor[commit]:
                            missing.append('R328_code_ancestry_unknown')
                        if p['character'] != 'silent':
                            missing.append('not_verified_silent')
                        for key in missing:
                            gaps[key] += 1
                        item = {'prediction': p, 'option': option, 'source': source, 'record_floor': row.get('floor'),
                                'config_source': config_source, 'logged_sl_context': {'sl_attempt': row.get('sl_attempt'),
                                'sl_reloads': row.get('sl_reloads')}, 'probability_record': probability,
                                'preparation_gaps': missing, 'outcome': None}
                        predictions.write(encoded(item))
                        key = tuple(p[k] for k in ['core', 'ascension', 'metric', 'horizon', 'model', 'policy', 'template_sha256'])
                        group = groups[key]
                        group['records'] += 1
                        group['runs'].add(run)
                        numeric = isinstance(p['value'], (int, float)) and not isinstance(p['value'], bool)
                        group['numeric'] += numeric
                        if numeric and not missing:
                            group['bound_runs'].add(run)
                        counts['forecast_rows'] += 1
    for name in ['runs', 'run-config', 'run-plans', 'sl-attempts']:
        selected = []
        for row, source in prefix_rows(name, bounds):
            if row.get('run_id') in selected_runs:
                selected.append({'row': row, '_source': source})
        (OUT / f'{name}.json').write_text(json.dumps(selected, ensure_ascii=False, indent=1) + '\n')
    table = [dict(zip(['core', 'ascension', 'metric', 'horizon', 'model', 'policy', 'template_sha256'], key)) |
             {'forecast_rows': value['records'], 'numeric_rows': value['numeric'], 'observed_runs': sorted(value['runs']),
              'bound_numeric_runs': sorted(value['bound_runs'])} for key, value in sorted(groups.items(), key=lambda item: str(item[0]))]
    (OUT / 'prediction-groups.json').write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n')
    manifest = {'at': frozen_at, 'source_bounds': bounds, 'decision_window': [START, bounds['decisions']['complete_prefix_bytes']],
                'decision_window_sha256': window_hash.hexdigest(), 'R328': R328, 'code_ancestry': ancestor,
                'selected_runs': sorted(selected_runs), 'counts': dict(counts), 'statuses': dict(statuses),
                'binding_gaps': dict(gaps), 'raw_construction_record_index': raw_index,
                'artifacts': {p.name: {'bytes': p.stat().st_size, 'sha256': sha(p)} for p in OUT.iterdir() if p.is_file()},
                'outcomes': 'not derived by watcher; original learner must verify same-run route/policy/SL/signature endpoints',
                'attempt_encoding': 'JSON text [logged_sl_attempt,logged_sl_reloads]; null fight means no active fight, not first attempt',
                'no_models_games_new_forecasts_sync': True}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')
    print(json.dumps({'counts': dict(counts), 'runs': len(selected_runs), 'groups': len(table), 'binding_gaps': dict(gaps)}), flush=True)


if __name__ == '__main__':
    main()
