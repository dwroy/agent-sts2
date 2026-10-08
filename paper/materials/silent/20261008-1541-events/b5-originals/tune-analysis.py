import importlib.util
import json
import statistics
import sys
from pathlib import Path

S = Path(__file__).resolve().parent
ROOT = S.parents[2]
sys.path.insert(0, str(ROOT / 'agent/tools/boss-sim'))
from calib import block, turns_of
from silent_calibration import fit, prediction, select_model, mapped

split = json.loads((S / 'split.json').read_text())
keys = set(split['tune'])
baseline = [json.loads(l) for l in (S / 'before-authoritative-results/results-0.jsonl').read_text().splitlines() if l.strip()]
baseline = [r for r in baseline if r['key'] in keys]
assert {(r['key'], r['start']) for r in baseline} == {(k, s) for k in keys for s in ('t1', 'pre')}
turns = turns_of(str(S / 'dataset/turns.jsonl'))
output = {'character': 'silent', 'boss': 'QUEEN', 'scope': 'tune only; no validation row participates',
    'release_selection': None, 'reason': 'B5 validation coverage is 7, below the immutable 10-fight criterion', 'configurations': {}}
for setting in (0, 1, 2):
    replacements = [] if setting == 0 else [json.loads(l) for l in (S / f'tune-threat{setting}-results/results-0.jsonl').read_text().splitlines() if l.strip()]
    assert not replacements or len(replacements) == 16
    assert all(r['key'] in keys and r['enc'] == 'QUEEN+TORCH_HEAD_AMALGAM' and r['sim']['samples'] == 200 for r in replacements)
    by = {(r['key'], r['start']): r for r in replacements}
    rows = [by.get((r['key'], r['start']), r) for r in baseline]
    assert all(r['actual'] == old['actual'] for r, old in zip(rows, baseline))
    output['configurations'][str(setting)] = {}
    for start in ('t1', 'pre'):
        good = [r for r in rows if r['start'] == start and r.get('sim')]
        queen = [r for r in good if r['enc'] == 'QUEEN+TORCH_HEAD_AMALGAM']
        model, selection = select_model(good, turns)
        folds = {run: i % 3 for i, run in enumerate(sorted({r['run'] for r in good}))}
        all_errors, queen_errors, models = [], [], []
        for fold in range(3):
            train = [r for r in good if folds[r['run']] != fold]
            check = [r for r in good if folds[r['run']] == fold]
            m, choice = select_model(train, turns)
            if m is None:
                models.append({'fold': fold, 'missing': True})
                continue
            models.append({'fold': fold, 'model': m, 'train_runs': sorted({r['run'] for r in train}), 'check_runs': sorted({r['run'] for r in check})})
            for r in check:
                error = (prediction(r, m) - int(r['actual']['won']))**2
                all_errors.append(error)
                if r['enc'] == 'QUEEN+TORCH_HEAD_AMALGAM':
                    queen_errors.append(error)
        output['configurations'][str(setting)][start] = {'global_tune_n': len(good), 'queen_n': len(queen),
            'raw_queen': block(queen, turns), 'calibrated_queen': block(mapped(queen, model), turns) if model else None,
            'model': model, 'model_selection': selection, 'oof_n': len(all_errors), 'queen_oof_n': len(queen_errors),
            'global_oof_brier': statistics.fmean(all_errors) if all_errors else None,
            'queen_oof_brier': statistics.fmean(queen_errors) if queen_errors else None, 'folds': models}
(S / 'tune-analysis.json').write_text(json.dumps(output, ensure_ascii=False, indent=1)+'\n')
for setting, starts in output['configurations'].items():
    for start, r in starts.items():
        print(setting, start, 'n', r['queen_n'], 'raw Brier', r['raw_queen']['brier'], 'OOF Brier', r['queen_oof_brier'], 'leak', r['raw_queen']['leak']['enemy_ratio'])
