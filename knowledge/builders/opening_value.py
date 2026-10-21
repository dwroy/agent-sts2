"""Whole-fight opening-state predictor; separate labels/features from the turn model.

All card descriptors and encounter frequencies are observations, not card values.
The exported trees have the same strict-less-than evaluator in Python and TS.
"""
import argparse
import collections
import hashlib
import json
import math
import os
from pathlib import Path
import re
import time


def number(x, default=0.0):
    return float(x) if isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x) else default


def card_key(c):
    return str(c.get('card_id', '')) + ('+' if c.get('upgraded') else '')


def descriptor(c):
    # Linguistic counts describe observed rules; they assign no effectiveness/value.
    text = str(c.get('rules_text') or c.get('resolved_rules_text') or '').lower()
    out = {'count': 1, 'upgraded': int(bool(c.get('upgraded'))),
           'cost': number(c.get('energy_cost')), 'x_cost': int(bool(c.get('costs_x')))}
    out['type:' + str(c.get('card_type', 'unknown'))] = 1
    for value in c.get('dynamic_values') or []:
        name = value.get('name')
        if isinstance(name, str):
            out['dynamic:' + name] = out.get('dynamic:' + name, 0) + number(value.get('current_value'))
    for label, pattern in [('poison', r'poison|中毒'), ('discard', r'discard|丢弃|弃牌'),
                           ('shiv', r'shiv|小刀'), ('draw', r'draw|抽\w*张|抽牌'),
                           ('exhaust', r'exhaust|消耗'), ('retain', r'retain|保留')]:
        out['text:' + label] = len(re.findall(pattern, text))
    return out


def compact_run(run, hp):
    return {'hp': hp, 'max_hp': number(run.get('max_hp')), 'max_energy': number(run.get('max_energy')),
            'ascension': number(run.get('ascension')), 'floor': number(run.get('floor')),
            'act': int(str(run.get('act_id', 0))) + 1,
            'deck': [dict(c) for c in run.get('deck') or [] if isinstance(c, dict) and c.get('card_id')],
            'relics': sorted(r['relic_id'] for r in run.get('relics') or [] if isinstance(r, dict) and r.get('relic_id')),
            'potions': sorted(p['potion_id'] for p in run.get('potions') or [] if isinstance(p, dict) and p.get('occupied') and p.get('potion_id'))}


def extract(states, game_data, out, character):
    """A bounded byte-prefix scan, first attempt only; missing openings/ends stay censored.

    The terminal label uses combat HP before reward healing, matching the existing
    reducer. Repeated snapshots never add independent fights or card observations.
    """
    data = json.loads(Path(game_data).read_text())
    monsters = data.get('collections', data)
    kinds = {m['id']: str(m.get('type', '')).lower() for m in monsters.get('monsters', [])}
    length = os.path.getsize(states)
    sha = hashlib.sha256()
    opened, seen, rows = {}, set(), []
    rejected = collections.Counter()
    offset, lines = 0, 0

    def finish(f, state=None, closing=None):
        if f is None:
            return
        if state is None or closing not in ('REWARD', 'MAP', 'GAME_OVER', 'EVENT'):
            rejected['censored_end'] += 1
            return
        run = state.get('run') or {}
        if run.get('floor') != f['input']['floor']:
            rejected['different_floor_end'] += 1
            return
        hp = (state.get('combat') or {}).get('player', {}).get('current_hp')
        if isinstance(hp, (int, float)):
            f['last_hp'] = min(f['last_hp'], hp)
        died = number(run.get('current_hp'), 1) <= 0 or (closing == 'GAME_OVER' and not (state.get('game_over') or {}).get('is_victory'))
        final_hp = 0 if died else min(f['last_hp'], number(run.get('current_hp'), f['last_hp']))
        if f['opening_missing'] or f['turns'] < 1:
            rejected['opening_missing'] += 1
            return
        if f['kind'] not in ('hallway', 'elite', 'boss'):
            rejected['kind_unknown'] += 1
            return
        f.update(ended=state.get('_ts'), hp_loss=max(0, f['input']['hp'] - final_hp), win=int(not died), final_hp=final_hp)
        for key in ('last_hp', 'opening_missing'):
            f.pop(key)
        rows.append(f)

    with open(states, 'rb') as source:
        while offset < length:
            line = source.readline(length - offset)
            if not line:
                break
            start = offset
            offset += len(line)
            sha.update(line)
            lines += 1
            try:
                entry = json.loads(line)
            except (ValueError, UnicodeDecodeError):
                rejected['bad_json'] += 1
                continue
            state = entry.get('state') or {}
            run = state.get('run') or {}
            role = str(run.get('character_id') or 'IRONCLAD').lower()
            if role != character:
                continue
            rid = state.get('run_id')
            if not rid or rid == 'run_unknown':
                continue
            key = (rid, run.get('act_id'), run.get('floor'))
            screen = state.get('screen') or entry.get('screen')
            combat = state.get('combat') or {}
            if screen == 'COMBAT' and state.get('in_combat') and combat.get('enemies'):
                if rid in opened and opened[rid]['key'] != list(key):
                    finish(opened.pop(rid))
                if rid not in opened:
                    if key in seen:
                        continue
                    seen.add(key)
                    player = combat.get('player') or {}
                    hp = number(player.get('current_hp'), number(run.get('current_hp')))
                    enemies = sorted(e['enemy_id'] for e in combat['enemies'] if e.get('enemy_id'))
                    enemy_types = {kinds.get(e) for e in enemies}
                    boss = str(run.get('boss_id') or '').replace('_BOSS', '')
                    kind = 'boss' if 'boss' in enemy_types or any(e.replace('_BOSS', '') == boss for e in enemies) else 'elite' if 'elite' in enemy_types else 'hallway' if enemy_types <= {'normal', 'monster'} else 'unknown'
                    opened[rid] = {'key': list(key), 'run': rid, 'ts': entry.get('ts'), 'offset': start,
                        'frame_sha256': hashlib.sha256(line).hexdigest(), 'input': compact_run(run, hp),
                        'encounter': '+'.join(enemies), 'boss_id': run.get('boss_id'), 'kind': kind,
                        'last_hp': hp, 'turns': 0,
                        'opening_missing': state.get('turn') not in (0, 1) or number(player.get('cards_played_this_turn')) > 0}
                f = opened[rid]
                f['last_hp'] = number(combat.get('player', {}).get('current_hp'), f['last_hp'])
                f['turns'] = max(f['turns'], number(state.get('turn')))
            elif rid in opened and not state.get('in_combat'):
                state['_ts'] = entry.get('ts')
                finish(opened.pop(rid), state, screen)
            if lines % 100000 == 0:
                print(json.dumps({'bytes': offset, 'of': length, 'fights': len(rows)}), flush=True)
    for f in opened.values():
        finish(f)
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w') as dest:
        for row in rows:
            dest.write(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n')
    receipt = {'schema': 'opening-extraction-v1', 'source': str(Path(states).resolve()), 'bytes': length,
               'sha256': sha.hexdigest(), 'lines': lines, 'fights': len(rows), 'runs': len({r['run'] for r in rows}),
               'rejected': dict(rejected), 'character': character, 'first_attempt_only': True,
               'rows_sha256': hashlib.sha256(Path(out).read_bytes()).hexdigest()}
    Path(out + '.source.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt), flush=True)


def vocabulary(rows):
    cards, relics, potions, encounters, components = collections.Counter(), set(), set(), set(), set()
    for row in rows:
        run = row['input']
        cards.update(set(card_key(c) for c in run['deck']))
        for c in run['deck']:
            components.update(descriptor(c))
        relics.update(run['relics'])
        potions.update(run['potions'])
        encounters.add(row['encounter'])
    names = ['hp', 'max_hp', 'hp_fraction', 'max_energy', 'ascension', 'act', 'floor', 'relic_count', 'potion_count']
    names += ['deck:' + k for k in sorted(components)] + ['per_card:' + k for k in sorted(components) if k != 'count']
    names += ['card:' + k for k, n in sorted(cards.items()) if n >= 5]
    names += ['relic:' + k for k in sorted(relics)] + ['potion:' + k for k in sorted(potions)]
    names += ['encounter:' + k for k in sorted(encounters)] + ['kind:hallway', 'kind:elite', 'kind:boss']
    return names


def features(run, encounter, kind, names):
    vals = {k: number(run.get(k)) for k in ['hp', 'max_hp', 'max_energy', 'ascension', 'act', 'floor']}
    vals.update(hp_fraction=number(run.get('hp')) / max(1, number(run.get('max_hp'))),
                relic_count=len(run['relics']), potion_count=len(run['potions']))
    totals = collections.Counter()
    for c in run['deck']:
        totals.update(descriptor(c))
        vals['card:' + card_key(c)] = vals.get('card:' + card_key(c), 0) + 1
    for k, v in totals.items():
        vals['deck:' + k] = v
        if k != 'count':
            vals['per_card:' + k] = v / max(1, len(run['deck']))
    for k in run['relics']:
        vals['relic:' + k] = 1
    for k in run['potions']:
        vals['potion:' + k] = 1
    vals['encounter:' + encounter] = 1
    vals['kind:' + kind] = 1
    return [vals.get(k, 0.0) for k in names]


def predict(model, x):
    def node(t):
        while isinstance(t, list):
            t = t[2] if x[t[0]] < t[1] else t[3]
        return t
    value = model['base'] + model['lr'] * sum(node(t) for t in model['trees'])
    return 1 / (1 + math.exp(-max(-35, min(35, value)))) if model['loss'] == 'logloss' else value


def errors(rows, predictions):
    by = {}
    for kind in ['all', 'hallway', 'elite', 'boss']:
        group = [(r, p) for r, p in zip(rows, predictions) if kind == 'all' or r['kind'] == kind]
        if not group:
            continue
        losses = [p['hp_loss'] - r['hp_loss'] for r, p in group]
        by[kind] = {'n': len(group), 'runs': len({r['run'] for r, p in group}),
            'hp_mae': sum(abs(v) for v in losses) / len(group),
            'hp_rmse': math.sqrt(sum(v*v for v in losses) / len(group)),
            'hp_bias': sum(losses) / len(group),
            'win_brier': sum((p['win'] - r['win'])**2 for r, p in group) / len(group),
            'turns_mae': sum(abs(p['turns'] - r['turns']) for r, p in group) / len(group)}
    return by


def train(rows_path, out, report, character, legacy, trees=150, cutoff=None):
    with open(rows_path) as source:
        rows = [json.loads(line) for line in source if line.strip()]
    eligible = [r for r in rows if not cutoff or r['ts'] < cutoff]
    # Grouping by run prevents turn/fight leakage; vocabularies and error scales
    # are learned exclusively from train/calibration, never the held-out test.
    split = {k: [] for k in ('train', 'calibration', 'test')}
    for r in eligible:
        h = legacy.run_hash(r['run'])
        split['train' if h < .65 else 'calibration' if h < .82 else 'test'].append(r)
    if min(map(len, split.values())) < 20:
        raise ValueError('insufficient run-held-out fights')
    names = vocabulary(split['train'])
    X = [features(r['input'], r['encounter'], r['kind'], names) for r in split['train']]
    models = {}
    for name in ['hp_loss', 'win', 'turns']:
        model = legacy.GBM('logloss' if name == 'win' else 'l2', trees=trees, depth=3, min_leaf=20, seed=7)
        model.fit(X, [r[name] for r in split['train']], names)
        models[name] = model.export()
        print('fit', name, len(X), len(names), flush=True)
    def predicted(r):
        x = features(r['input'], r['encounter'], r['kind'], names)
        raw = {k: predict(m, x) for k, m in models.items()}
        return {**raw, 'hp_loss': max(0, min(r['input']['hp'], raw['hp_loss'])), 'turns': max(1, raw['turns'])}
    reports = {k: errors(v, [predicted(r) for r in v]) for k, v in split.items()}
    averages = {}
    for kind in ('hallway', 'elite', 'boss'):
        group = [r for r in split['train'] if r['kind'] == kind]
        averages[kind] = {k: sum(r[k] for r in group) / max(1, len(group)) for k in models}
    reports['baseline_test'] = errors(split['test'], [averages[r['kind']] for r in split['test']])
    catalog = {}
    for r in split['train']:
        for c in r['input']['deck']:
            catalog[card_key(c)] = c
    encounters = collections.defaultdict(list)
    for act in sorted({r['input']['act'] for r in split['train']}):
        for kind in ('hallway', 'elite', 'boss'):
            group = [r for r in split['train'] if r['kind'] == kind and r['input']['act'] == act]
            counts = collections.Counter(r['encounter'] for r in group)
            for enc, n in sorted(counts.items()):
                matches = [r for r in group if r['encounter'] == enc]
                encounters[str(act)].append({'id': enc, 'kind': kind, 'n': n, 'weight': n / len(group),
                    'runs': len({r['run'] for r in matches}), 'floor_mean': sum(r['input']['floor'] for r in matches)/n,
                    'boss_ids': sorted({r['boss_id'] for r in matches if r.get('boss_id')})})
    remaining = {}
    for act in sorted({r['input']['act'] for r in split['train']}):
        group = [r for r in split['train'] if r['input']['act'] == act]
        runs = {r['run'] for r in group}
        for floor in range(min(int(r['input']['floor']) for r in group), max(int(r['input']['floor']) for r in group) + 1):
            # Only runs observed alive at this floor enter the opportunity denominator.
            alive = {rid for rid in runs if max(r['input']['floor'] for r in group if r['run'] == rid) >= floor}
            remaining[f'{act}:{floor}'] = {kind: sum(r['kind'] == kind and r['input']['floor'] > floor and r['run'] in alive for r in group) / max(1, len(alive)) for kind in ('hallway', 'elite', 'boss')}
    packet = {'schema': 'opening-value-v1', 'character': character, 'features': names, 'models': models,
        'catalog': catalog, 'encounters': dict(encounters), 'remaining': remaining,
        'errors': reports['calibration'], 'support': {k: {'fights': len(v), 'runs': sorted({r['run'] for r in v})} for k,v in split.items()},
        'training_cutoff': cutoff, 'rows_sha256': hashlib.sha256(Path(rows_path).read_bytes()).hexdigest(),
        'limitations': ['observational predictor, not causal card effect', 'error is held-out fight RMSE, not Monte Carlo SE',
                         'future targets assume current HP/resources; route counts do not forecast survival', 'no cross-character fallback'],
        'golden': [{'input': r['input'], 'encounter': r['encounter'], 'kind': r['kind'],
                    'features': features(r['input'], r['encounter'], r['kind'], names), 'prediction': predicted(r)} for r in split['test'][:6]]}
    packet['model_id'] = hashlib.sha256(json.dumps(packet, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    legacy.write_whole_json(out, packet)
    detail = {'schema': 'opening-backtest-v1', 'reports': reports, 'features': names, 'support': packet['support'],
              'post_cutoff_excluded': len(rows)-len(eligible), 'model_id': packet['model_id'], 'limitations': packet['limitations'],
              'held_out_predictions': [{**{k:r[k] for k in ['run','ts','kind','encounter','hp_loss','win','turns']}, 'predicted':predicted(r)} for r in split['test']]}
    Path(report).parent.mkdir(parents=True, exist_ok=True)
    Path(report).write_text(json.dumps(detail, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'reports': reports, 'support': {k: len(v) for k,v in split.items()}, 'model_id': packet['model_id']}), flush=True)


def main(legacy, argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('stage', choices=['opening-extract', 'opening-train'])
    parser.add_argument('--states', default=os.path.join(legacy.bmd._default_logs(), 'states.jsonl'))
    parser.add_argument('--game-data', default=os.path.join(legacy.ROOT, 'data/game-data.json'))
    parser.add_argument('--character', required=True)
    parser.add_argument('--rows', required=True)
    parser.add_argument('--out')
    parser.add_argument('--notes')
    parser.add_argument('--trees', type=int, default=150)
    parser.add_argument('--cutoff', help='Exclude this timestamp and later from fitting/calibration/test')
    args = parser.parse_args(argv)
    if args.stage == 'opening-extract':
        extract(args.states, args.game_data, args.rows, args.character)
    else:
        if not args.out or not args.notes:
            parser.error('opening-train requires --out and --notes')
        train(args.rows, args.out, args.notes, args.character, legacy, args.trees, args.cutoff)
    return 0
