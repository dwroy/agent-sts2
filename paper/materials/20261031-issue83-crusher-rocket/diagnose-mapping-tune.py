#!/usr/bin/env python3
"""Execute the committed first-tune-only mapping diagnostic, never select on val."""
import hashlib
import json
import math
from pathlib import Path
import statistics
import sys

TREE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(TREE / 'agent/tools/boss-sim'))
from calib import logit, sigmoid
from silent_calibration import fit


def both(rows):
    return len({r['actual']['won'] for r in rows}) == 2


def ridge(rows, lam):
    if not both(rows):
        return None
    a, b = 0., 1.
    converged = False
    for iteration in range(100):
        ga, gb, haa, hab, hbb = lam*a, lam*(b-1), lam, 0., lam
        for r in rows:
            x = logit(r['sim']['winProb'], r['sim']['samples'])
            y = int(r['actual']['won'])
            p = sigmoid(a+b*x)
            w = p*(1-p)
            ga += p-y
            gb += (p-y)*x
            haa += w
            hab += w*x
            hbb += w*x*x
        det = haa*hbb-hab*hab
        if det <= 1e-12:
            return None
        da, db = (hbb*ga-hab*gb)/det, (haa*gb-hab*ga)/det
        scale = max(1., abs(da), abs(db))
        da, db = da/scale, db/scale
        a, b = a-da, max(0., b-db)
        if abs(da)+abs(db) < 1e-9:
            converged = True
            break
    return {'a': a, 'b': b, 'c': 0., 'lambda': lam,
            'converged': converged, 'iterations': iteration+1}


def predict(r, model):
    return r['sim']['winProb'] if model == 'identity' else sigmoid(
        model['a']+model['b']*logit(r['sim']['winProb'], r['sim']['samples']))


def metrics(rows, model):
    if model is None:
        return None
    ps = [predict(r, model) for r in rows]
    ys = [int(r['actual']['won']) for r in rows]
    return {'n': len(rows), 'brier': statistics.fmean((p-y)**2 for p, y in zip(ps, ys)),
            'logloss': statistics.fmean(-y*math.log(max(1e-15, p))-(1-y)*math.log(max(1e-15, 1-p))
                                       for p, y in zip(ps, ys)),
            'mean_prediction': statistics.fmean(ps), 'actual_win': statistics.fmean(ys)}


def main():
    material = TREE / 'paper/materials/20261031-issue83-crusher-rocket'
    manifest = json.loads((material / 'mapping-step2-input-manifest.json').read_text())
    raw = (TREE / manifest['input']).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == manifest['sha256']
    rows = [json.loads(line) for line in raw.splitlines()]
    keys = set(manifest['tune_keys'])
    assert len(rows) == 140 and len(keys) == 70
    assert {(r['key'], r['start']) for r in rows} == {(k, s) for k in keys for s in ('t1', 'pre')}
    assert all(r.get('sim') and r['sim']['samples'] == 200 and ':1:' in r['key'] for r in rows)
    runs = sorted({r['run'] for r in rows})
    fold_of = {r: i % 3 for i, r in enumerate(runs)}
    result = {'schema': 'issue83-tune-mapping-diagnostic-v1', 'input_sha256': manifest['sha256'],
              'preregistration_commit': '0be0880ef95eb7e0b5d8a31c0981deb2bbc4f1e2',
              'tune_only': True, 'validation_used': False, 'production_admitted': False,
              'selected_candidate': None, 'conclusion': 'not_identifiable', 'runs': len(runs), 'starts': {}}
    names = ['identity', 'platt', 'ridge-1', 'ridge-10', 'ridge-100']
    for start in ('t1', 'pre'):
        mine = [r for r in rows if r['start'] == start]
        models = {'identity': 'identity', 'platt': fit(mine), **{
            f'ridge-{lam}': ridge(mine, lam) for lam in (1, 10, 100)}}
        scope = {'first_n': len(mine), 'wins': sum(r['actual']['won'] for r in mine),
                 'crab_n': sum(r['enc'] == 'CRUSHER+ROCKET' for r in mine),
                 'crab_losses': sum(r['enc'] == 'CRUSHER+ROCKET' and not r['actual']['won'] for r in mine),
                 'descriptive_full_fit': {}, 'folds': []}
        for name, model in models.items():
            scope['descriptive_full_fit'][name] = {'model': model, 'metrics': metrics(mine, model),
                'mapped_raw_zero': 0 if model == 'identity' else None if model is None else
                    sigmoid(model['a']+model['b']*logit(0, 200))}
        for fold in range(3):
            train = [r for r in mine if fold_of[r['run']] != fold]
            check = [r for r in mine if fold_of[r['run']] == fold]
            models = {'identity': 'identity', 'platt': fit(train) if both(train) else None, **{
                f'ridge-{lam}': ridge(train, lam) for lam in (1, 10, 100)}}
            scope['folds'].append({'fold': fold,
                'train_keys': [r['key'] for r in train], 'check_keys': [r['key'] for r in check],
                'train_n': len(train), 'train_wins': sum(r['actual']['won'] for r in train),
                'check_n': len(check), 'check_wins': sum(r['actual']['won'] for r in check),
                'train_both_classes': both(train), 'check_both_classes': both(check),
                'results': {name: {'model': models[name], 'check': metrics(check, models[name]),
                                   'admissible': False} for name in names}})
        scope['failed_identification_gates'] = ['crab_tune_has_no_negative',
            'at_least_one_training_fold_has_no_negative', 'at_least_one_check_fold_has_no_negative']
        assert scope['crab_losses'] == 0 and any(not f['train_both_classes'] for f in scope['folds'])
        result['starts'][start] = scope
    out = TREE / '.artifacts/issue83/crusher-rocket/mapping-step2/result.json'
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'conclusion': result['conclusion'], 'selected': None, 'runs': len(runs)}))


if __name__ == '__main__':
    main()
