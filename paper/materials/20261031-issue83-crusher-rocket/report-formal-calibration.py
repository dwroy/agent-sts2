#!/usr/bin/env python3
"""Approved first-only training and val; keep 107-training strictly diagnostic."""
import hashlib
import json
from pathlib import Path
import sys

TREE = Path(__file__).resolve().parents[3]
ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = TREE / '.artifacts/issue83/crusher-rocket/formal-model'
sys.path.insert(0, str(TREE / 'agent/tools/boss-sim'))
from silent_calibration import calibrate, mapped
from calib import block
from trust import judge


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines()]


def main():
    inputs = json.loads((OUT / 'input-manifest.json').read_text())
    for name, ref in inputs['files'].items():
        raw = (OUT / name).read_bytes()
        assert len(raw) == ref['bytes'] and hashlib.sha256(raw).hexdigest() == ref['sha256']
    fights = rows(OUT / 'formal-fights.jsonl')
    split = json.loads((OUT / 'formal-split.json').read_text())
    raw_files = [TREE / '.artifacts/issue83/model-pair/before-first/results-0.jsonl',
                 OUT / 'original-tune37/results-0.jsonl', OUT / 'new-val30/results-0.jsonl']
    results = [r for p in raw_files for r in rows(p)]
    expected = {(r['key'], start) for r in fights for start in ('t1', 'pre')}
    actual = [(r['key'], r['start']) for r in results]
    assert len(set(actual)) == len(actual) and set(actual) == expected, 'Incomplete or duplicate outputs'
    turns = {r['key']: {int(t[0]): t for t in r['turns']} for r in rows(OUT / 'formal-turns.jsonl')}
    val = set(split['val'])
    assert all(r['attempt'] == 1 for r in fights if r['key'] in val)
    val_fights = [r for r in fights if r['key'] in val]
    assert len({(r['run_id'], r['floor']) for r in val_fights}) == len(val_fights), 'Conflicting own first ordinals'
    provenance = {'completed_max_asc': 10, 'simulator_source': inputs['simulation_source'],
                  'samples': 200, 'seed': 1, 'original_tune_preserved': True,
                  'tune_first': 70, 'tune_retry': 37, 'validation_first_only': True,
                  'input_manifest_sha256': hashlib.sha256((OUT / 'input-manifest.json').read_bytes()).hexdigest(),
                  'raw_results': {str(p.relative_to(TREE)): {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
                      'bytes': p.stat().st_size} for p in raw_files}, 'production_admitted': False}
    diagnostic = calibrate(results, fights, turns, split, {**provenance, 'sensitivity_only': True,
        'not_admissible': 'Approved plan requires original tune FIRST attempts only'})
    (OUT / 'diagnostic-all107-training.json').write_text(json.dumps(diagnostic, ensure_ascii=False, indent=2) + '\n')
    sensitivity_split = json.loads((TREE / '.artifacts/issue83/model-pair/first-split.json').read_text())
    first_tune = set(sensitivity_split['tune'])
    sensitivity_fights = [r for r in fights if r['key'] in first_tune | val]
    sensitivity_results = [r for r in results if r['key'] in first_tune | val]
    primary = calibrate(sensitivity_results, sensitivity_fights, turns,
        {**split, 'tune': sorted(first_tune)}, {**provenance, 'approved_plan': 'plan.md item 25: first tune only',
                                            'primary': True, 'tune_retry': 0})
    (OUT / 'approved-first70-calibration.json').write_text(json.dumps(primary, ensure_ascii=False, indent=2) + '\n')
    engine = json.loads((OUT.parent / 'engine-strata-global.json').read_text())
    cohorts = engine['run_cohorts']
    ops = json.loads((TREE / '.artifacts/issue83/own/ops-manifest.json').read_text())
    original_val = set(json.loads((ROOT / ops['files']['split.json']['path']).read_text())['val'])
    latest = {r['key'] for r in rows(OUT / 'new-first-val.jsonl')}
    windows = {'original': val & original_val, 'later_to_20261030': val - original_val - latest,
               'latest_to_20261031': latest}
    strata = {}
    for start in ('t1', 'pre'):
        model = primary['overall'][start]['platt']
        good = [r for r in results if r['start'] == start and r['key'] in val and r.get('sim')]
        calibrated = mapped(good, model or {'a': 0, 'b': 1, 'c': 0})
        overall = block(calibrated, turns, exact=True)
        overall_brier = overall['brier']
        codex_a10 = [r for r in calibrated if r['asc'] == 10 and cohorts[r['run']]['source'] == 'codex']
        codex_overall = block(codex_a10, turns, exact=True)
        strata[start] = {'overall_exact': overall, 'bosses': {}, 'codex_a10_overall': codex_overall,
                        'codex_a10_bosses': {}}
        for enc in ('CRUSHER+ROCKET', 'KNOWLEDGE_DEMON'):
            mine = [r for r in calibrated if r['enc'] == enc and r['asc'] == 10]
            metrics = block(mine, turns, exact=True)
            failed = [f[0] for f in judge(metrics, overall_brier, exact=True)]
            if metrics['leak'].get('enemy_ratio') is None:
                failed.append('leak_missing')
            if model is None:
                failed.append('calibration')
            strata[start]['bosses'][enc] = {'metrics': metrics, 'failed': failed,
                'brier_limit': overall_brier * 1.25,
                'by_window': {name: block([r for r in mine if r['key'] in keys], turns, exact=True)
                              for name, keys in windows.items()}}
            codex_rows = [r for r in codex_a10 if r['enc'] == enc]
            codex_metrics = block(codex_rows, turns, exact=True)
            strata[start]['codex_a10_bosses'][enc] = {'metrics': codex_metrics,
                'brier_limit': codex_overall['brier'] * 1.25,
                'failed': [f[0] for f in judge(codex_metrics, codex_overall['brier'], exact=True)],
                'by_window': {name: block([r for r in codex_rows if r['key'] in keys], turns, exact=True)
                              for name, keys in windows.items()}}
    (OUT / 'approved-a10-first-strata.json').write_text(json.dumps(strata, ensure_ascii=False, indent=2) + '\n')
    for start, s in strata.items():
        print(start, 'overall', s['overall_exact']['n'], s['overall_exact']['brier'],
              'platt', primary['overall'][start]['platt'])
        for enc, d in s['bosses'].items():
            print(enc, {k: d['metrics'][k] for k in ['n', 'actual_win', 'mean_pred', 'brier']},
                  'limit', d['brier_limit'], 'leak', d['metrics']['leak']['enemy_ratio'], 'fails', d['failed'])


if __name__ == '__main__':
    main()
