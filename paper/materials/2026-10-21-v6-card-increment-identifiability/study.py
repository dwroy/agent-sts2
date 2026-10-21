"""Offline cluster bootstrap of the unchanged v2 HP-loss learner; never calls APIs."""
import argparse
import collections
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import random
import sys
import time

HERE = Path(__file__).resolve().parent
# Worktrees share a repository parent, not a nested worktree directory.
SOURCE = HERE.parents[3] / 'v6-card-value-v2-20261021'
MATERIALS = SOURCE / 'paper/materials/2026-10-21-v6-card-value-v2'
EPS = 1e-8


def read(path):
    return json.loads(gzip.decompress(path.read_bytes())) if path.suffix == '.gz' else json.loads(path.read_text())


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = (json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n').encode()
    if path.suffix == '.gz':
        data = gzip.compress(data, mtime=0)
    path.write_bytes(data)


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def load():
    sys.path.insert(0, str(SOURCE / 'knowledge/builders'))
    ov = module('opening_value', SOURCE / 'knowledge/builders/opening_value.py')
    legacy = module('legacy_fight', SOURCE / 'knowledge/builders/build-fight-value.py')
    model = read(SOURCE / 'knowledge/characters/silent/opening-value.json')
    questions = sum((read(MATERIALS / d / 'questions.json.gz') for d in ['frozen', 'frozen-extra']), [])
    results = {r['key']: r for d in ['results', 'results-extra'] for p in sorted((MATERIALS / d).glob('*.json.gz')) for r in [read(p)]}
    raw_rows = gzip.decompress((MATERIALS / 'frozen/training-opening-rows.jsonl.gz').read_bytes())
    rows = [json.loads(line) for line in raw_rows.splitlines() if line.strip()]
    train = [r for r in rows if r['ts'] < model['training_cutoff'] and legacy.run_hash(r['run']) < .65]
    assert len(train) == 3535 and len({r['run'] for r in train}) == 260
    assert ov.vocabulary(train) == model['features']
    assert len(questions) == len(results) == 146
    assert not {q['run'] for q in questions} & {r['run'] for r in train}
    return ov, legacy, model, questions, results, train


def cases(ov, model, questions, results):
    output = []
    for q in sorted(questions, key=lambda q: q['key']):
        state = q['frame']['state']
        inp = ov.compact_run(state['run'], state['run']['current_hp'])
        offers = {f"card{c['index']}": c for c in state['reward']['card_options']}
        table = results[q['key']]['table']
        for option in table['options']:
            if option['id'] == 'skip':
                continue
            card = offers[option['id']]
            # Mirror silent-reward-addition.ts, including its active-relic gate.
            active = {r['relic_id'] for r in state['run']['relics'] if not r.get('is_melted')}
            copies = 2 if {'BING_BONG', 'BOOK_OF_FIVE_RINGS', 'PAELS_TOOTH'} <= active else 1
            item = {'key': q['key'], 'run': q['run'], 'floor': q['floor'], 'act': inp['act'],
                    'id': option['id'], 'card': option['card'], 'card_type': card['card_type'],
                    'brain': q['brain_choice'], 'deck_n': len(inp['deck']), 'input': inp, 'offer': card,
                    'copies': copies, 'original_delta': option['saved_hp'], 'targets': []}
            for target in option['targets']:
                future = {**inp, 'floor': target['floor']}
                item['targets'].append({'x0': ov.features(future, target['id'], target['kind'], model['features']),
                    'x1': ov.features({**future, 'deck': inp['deck'] + [card]*copies}, target['id'], target['kind'], model['features']),
                    'weight': target['weight']*target['count'], 'kind': target['kind'], 'encounter': target['id']})
            output.append(item)
    return output


def delta(ov, hp_model, item, override=None):
    total = 0.0
    for t in item['targets']:
        x0, x1 = t['x0'], t['x1']
        if override is not None:
            x1 = override(x0, x1)
        p0 = max(0, min(item['input']['hp'], ov.predict(hp_model, x0)))
        p1 = max(0, min(item['input']['hp'], ov.predict(hp_model, x1)))
        total += t['weight'] * (p0-p1)
    return total


def fit(start, end):
    ov, legacy, original, questions, results, train = load()
    items = cases(ov, original, questions, results)
    # Every reward's Python paired delta must match the retained TypeScript evaluator.
    mismatch = [{'key': c['key'], 'id': c['id'], 'difference': delta(ov, original['models']['hp_loss'], c)-c['original_delta']}
                for c in items if abs(delta(ov, original['models']['hp_loss'], c)-c['original_delta']) > 1e-7]
    write(HERE / 'checks/original-replay.json', {'candidates': len(items), 'mismatches': mismatch})
    assert not mismatch, mismatch[:3]
    names = original['features']
    X = [ov.features(r['input'], r['encounter'], r['kind'], names) for r in train]
    groups = collections.defaultdict(list)
    for i, row in enumerate(train):
        groups[row['run']].append(i)
    runs = sorted(groups)
    for index in range(start, end+1):
        dest = HERE / f'bootstrap/replicate-{index:02}.json.gz'
        if dest.exists():
            raise ValueError(f'Refusing to overwrite an existing result: {dest}')
        started = time.monotonic()
        rng = random.Random(120000+index)
        draw = [rng.choice(runs) for _ in runs]
        ids = [i for run in draw for i in groups[run]]
        predictor = legacy.GBM('l2', trees=150, depth=3, min_leaf=20, seed=7)
        predictor.fit([X[i] for i in ids], [train[i]['hp_loss'] for i in ids], names)
        exported = predictor.export()
        values = [{'key': c['key'], 'id': c['id'], 'delta': delta(ov, exported, c)} for c in items]
        write(dest, {'replicate': index, 'cluster_seed': 120000+index, 'run_draw': draw,
            'unique_runs': len(set(draw)), 'fights_including_duplicates': len(ids),
            'feature_sha256': hashlib.sha256(json.dumps(names).encode()).hexdigest(),
            'model': exported, 'delta': values, 'elapsed_seconds': time.monotonic()-started})
        print(json.dumps({'replicate': index, 'fights': len(ids), 'elapsed_seconds': time.monotonic()-started}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--start', type=int, default=1)
    parser.add_argument('--end', type=int, default=20)
    args = parser.parse_args()
    fit(args.start, args.end)
