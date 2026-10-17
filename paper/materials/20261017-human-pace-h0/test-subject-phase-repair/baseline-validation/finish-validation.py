"""Aggregate the new frozen object's validation using its previously frozen tune-only fit."""
import collections
import copy
import datetime as dt
import hashlib
import json
from pathlib import Path
import shutil
import sys

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
OUT = HERE.parent
WORK = OUT.parents[2]
OLD = WORK / 'experiments/boss-sim/silent/995fbdbd421116fc5aff5c375c35623cb939dcdb1f72a5877b6c03b8e91f3a7b'
PLAN = json.loads((OUT / 'validation-resume-plan-v2.json').read_text())
CACHE = WORK / 'experiments/boss-sim/silent' / PLAN['artifact']
sys.path.insert(0, str(OUT / 'frozen-model/agent/tools/boss-sim'))
import silent_calibration as calibration
from calib import block, turns_of
from trust import BOSS_KEYS


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()


def read_rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def save(path, value):
    assert not path.exists(), f'Preserve previous output: {path}'
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def main():
    assert hashlib.sha256(json.dumps(PLAN['frozen_inputs'], sort_keys=True).encode()).hexdigest() == PLAN['model_sha256']
    for rel, digest in PLAN['frozen_inputs'].items():
        path = CACHE / 'source-repair' / Path(rel).name if rel in ('agent/src/reflex/rollout.ts', 'agent/src/reflex/rollout-live.ts') else OUT / 'frozen-model' / rel
        assert sha(path) == digest, rel
    modules = json.loads((OUT / 'compiled-v2-manifest.json').read_text())['files']
    assert len(modules) == 241
    for module in modules:
        assert sha(OUT / 'repaired-v2-compiled' / module['path']) == module['sha256'], module['path']
    tuning = read_rows(CACHE / 'tuning-results.jsonl')
    fit = json.loads((CACHE / 'tuning-fit.json').read_text())
    fights = read_rows(OLD / 'fights.jsonl')
    split = json.loads((CACHE / 'split.json').read_text())
    turns = turns_of(str(CACHE / 'turns-original.jsonl'))
    assert sha(CACHE / 'tuning-results.jsonl') == PLAN['tuning_results_sha256']
    assert sha(CACHE / 'tuning-fit.json') == PLAN['tuning_fit_sha256']
    assert sha(OLD / 'fights.jsonl') == PLAN['dataset_sha256']
    assert sha(CACHE / 'split.json') == PLAN['split_sha256']
    assert len(tuning) == 214 and len(split['tune']) == 107 and len(split['val']) == 481
    tune_keys, val_keys = set(split['tune']), set(split['val'])
    assert not tune_keys & val_keys
    assert not {k.split(':')[0] for k in tune_keys} & {k.split(':')[0] for k in val_keys}
    validation = []
    exits = []
    read_guards = []
    for shard in range(4):
        terminal = json.loads((HERE / f'exit-{shard}.json').read_text())
        assert terminal['exit_code'] == 0, terminal
        exits.append(terminal)
        rows = read_rows(OUT / f'new-object-validation/results-{shard}.jsonl')
        expected = {(r['key'], start) for index, r in enumerate(fights)
                    if index % 4 == shard and r['key'] in val_keys for start in ('t1', 'pre')}
        assert len(rows) == len(expected) and {(r['key'], r['start']) for r in rows} == expected
        validation.extend(rows)
        guard_path = OUT / f'validation-read-guard-{shard}.json'
        guard = json.loads(guard_path.read_text())
        for read in guard:
            path = Path(read['path'])
            assert '/knowledge/characters/' not in str(path) or '/knowledge/characters/silent/' in str(path)
            if read['status'] == 'read':
                rel = str(path.relative_to(OUT / 'repaired-v2-compiled'))
                assert read['sha256'] == PLAN['frozen_inputs'][rel], rel
        read_guards.append({'path': str(guard_path), 'sha256': sha(guard_path), 'reads': len(guard)})
    assert len(validation) == 962
    assert all(r.get('character') == 'silent' for r in tuning + validation)
    assert all(r['sim']['samples'] == 200 for r in tuning + validation if r.get('sim'))
    assert len({(r['run_id'], r['encounter']) for r in fights if r['key'] in val_keys}) == 481
    order = {r['key']: index for index, r in enumerate(fights)}
    results = sorted(tuning + validation, key=lambda r: (order[r['key']], r['start'] != 't1'))
    frozen_fit_calls = []

    def forbidden_fit(*args, **kwargs):
        raise AssertionError('No new fit is allowed in validation aggregation')

    def frozen_model(rows, _turns):
        starts = {r['start'] for r in rows}
        assert len(starts) == 1
        start = next(iter(starts))
        expected = [r for r in tuning if r['start'] == start and r.get('sim')]
        assert canonical(rows) == canonical(expected), 'Only unchanged original tuning rows may request the frozen fit'
        frozen_fit_calls.append({'start': start, 'rows': len(rows), 'validation_used': False})
        return copy.deepcopy(fit[start]['platt']), copy.deepcopy(fit[start]['selection'])

    calibration.select_model = frozen_model
    calibration.fit = forbidden_fit
    calibration.fit_platt = forbidden_fit
    provenance = json.loads((CACHE / 'model-provenance.json').read_text())
    provenance.update(status='fixed-validation-complete', validation_pending=[],
                      tuning_fit_sha256=PLAN['tuning_fit_sha256'], validation_fit_performed=False,
                      compiled_manifest_sha256=PLAN['compiled_manifest_sha256'],
                      repair_source_commit='fe7952b44911a65c0c50c39f48be2e28ef5a38ff',
                      old_fixed_comparison='Old 7e1193 calibration is a different source/data object. Metric changes cannot be attributed solely to the A2 Paper Krane repair.',
                      production_applicability='Frozen full 200-sample object only; no equivalence or calibration claim for current H1 finite-prefix production, refreshed knowledge, later repairs, natural play or F48-to-F49 joint probability.')
    metrics = calibration.calibrate(results, fights, turns, split, provenance)
    for start in ('t1', 'pre'):
        assert metrics['overall'][start]['platt'] == fit[start]['platt']
        assert metrics['residuals'][start]['tune'] == fit[start]['tuning_residuals']
    frozen_old = json.loads((WORK / 'paper/materials/20261017-human-pace-h0/inputs-r1/live-boss-trust.json').read_text())
    old_predictions = {(r['key'], r['start']): r for r in read_rows(OLD / 'results.jsonl')}
    comparison = {}
    for enc, boss in BOSS_KEYS.items():
        source = [r for r in fights if r['key'] in val_keys and r['encounter'] == enc]
        by_start = {}
        for start in ('t1', 'pre'):
            success = [r for r in validation if r['start'] == start and r['enc'] == enc and r.get('sim')]
            assert len(success) == len({r['run'] for r in success}), 'SL does not create independent runs'
            new = metrics['bosses'][boss][start]
            old = frozen_old['bosses'][boss][start]
            common = [r for r in success if old_predictions.get((r['key'], start), {}).get('sim')]
            old_common = [old_predictions[(r['key'], start)] for r in common]
            assert all(before['actual']['won'] == after['actual']['won'] for before, after in zip(old_common, common))
            paired = {'n': len(common),
                      'old_fixed': block(calibration.mapped(old_common, frozen_old['overall'][start]['platt']), turns),
                      'new_fixed': block(calibration.mapped(common, fit[start]['platt']), turns),
                      'scope': 'Same available key/start pairs and original labels; different source/data objects, not an isolated causal estimate of the A2 repair.'}
            by_start[start] = {'old_fixed': old, 'new_fixed': new,
                               'independent_validation_runs': len({r['run'] for r in success}),
                               'candidate_independent_runs': len({r['run_id'] for r in source}),
                               'simulation_missing': len(source) - len(success),
                               'quantity_deficit_to_10': max(0, 10 - len(success)),
                               'quality_additional_data_needed': 'unknown; sample count alone cannot repair failed quality gates',
                               'brier_delta': round(new['brier'] - old['brier'], 4),
                               'prediction_gap': round(new['mean_pred'] - new['actual_win'], 3),
                               'common_key_comparison': paired}
        comparison[boss] = by_start
    identity_input = {'model_sha256': PLAN['model_sha256'], 'dataset_sha256': PLAN['dataset_sha256'],
                      'split_sha256': PLAN['split_sha256'], 'frozen_tuning_fit_sha256': PLAN['tuning_fit_sha256'],
                      'validation_results': {str(i): sha(OUT / f'new-object-validation/results-{i}.jsonl') for i in range(4)},
                      'stage': 'H0-r1-full-validation-completed'}
    identity = hashlib.sha256(canonical(identity_input)).hexdigest()
    archive = WORK / 'experiments/boss-sim/silent' / identity
    assert not archive.exists(), 'Never overwrite an existing fingerprint archive'
    archive.mkdir()
    (archive / 'results.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in results))
    for filename in ('tuning-fit.json', 'tuning-results.jsonl', 'split.json', 'turns-original.jsonl', 'repair-reuse-certificate.json'):
        shutil.copyfile(CACHE / filename, archive / filename)
    save(archive / 'identity.json', identity_input)
    save(archive / 'model-provenance.json', provenance)
    save(archive / 'boss-trust-candidate.json', metrics)
    save(archive / 'before-after.json', comparison)
    save(archive / 'execution.json', {'exits': exits, 'read_guards': read_guards, 'frozen_fit_calls': frozen_fit_calls,
                                     'old_tuning_simulations_rerun': 0, 'old_validation_simulations_rerun': 0,
                                     'new_validation_rows': 962, 'labels_or_gates_changed': False,
                                     'production_trust_published': False})
    receipt = {'request_id': PLAN['request_id'], 'revision': 1, 'status': 'fixed-validation-complete',
               'created_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'artifact': identity,
               'model_sha256': PLAN['model_sha256'], 'tuning_keys': 107, 'validation_keys': 481,
               'rows': len(results), 'successful_validation_by_start': {s: sum(r['start'] == s and bool(r.get('sim')) for r in validation) for s in ('t1', 'pre')},
               'missing': metrics['errors'], 'trusted_b2_fixed_only': metrics['trusted_b2'],
               'trusted_b3_fixed_only': metrics['trusted_b3'], 'files_sha256': {str(f.relative_to(archive)): sha(f) for f in archive.iterdir() if f.is_file()},
               'previous_tuning_archive': PLAN['artifact'], 'no_production_equivalence_claim': True}
    save(archive / 'completed.json', receipt)
    save(HERE / 'validation-completed.json', {'archive': str(archive), 'artifact': identity, 'receipt_sha256': sha(archive / 'completed.json'), 'receipt': receipt})
    print(json.dumps({'archive': str(archive), 'successful': receipt['successful_validation_by_start'],
                      'trusted_b2_fixed_only': metrics['trusted_b2'], 'trusted_b3_fixed_only': metrics['trusted_b3']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
