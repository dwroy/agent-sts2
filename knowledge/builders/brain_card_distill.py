#!/usr/bin/env python3
"""Offline-only reward imitation dataset, leakage-safe entries and Nova replay.

No live imports, configuration changes, paid-key fallback, or game knowledge.
Run under nice 19. Inputs must be frozen grep -F reward/card prefilters.
"""
import argparse
import collections
import concurrent.futures
import functools
import gzip
import hashlib
import json
import math
import os
import random
import re
import statistics
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path


def dumps(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), sort_keys=True)


def rows(path):
    opener = gzip.open if str(path).endswith('.gz') else open
    with opener(path, 'rt') as source:
        for line in source:
            try:
                yield json.loads(line)
            except (ValueError, UnicodeDecodeError):
                yield {'_bad_json': True}


def write(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def make_inventory(args):
    """C grep prefilter of a fixed byte prefix; three processes including Python."""
    length = Path(args.decisions).stat().st_size
    head = subprocess.Popen(['head', '-c', str(length), args.decisions], stdout=subprocess.PIPE)
    grep = subprocess.Popen(['grep', '-F', '-e', '"screen":"COMBAT"', '-e', '"screen": "COMBAT"'], stdin=head.stdout, stdout=subprocess.PIPE)
    head.stdout.close()
    inventory = collections.defaultdict(dict)
    sha, count, bad = hashlib.sha256(), 0, 0
    for line in grep.stdout:
        sha.update(line)
        count += 1
        try:
            row = json.loads(line)
        except ValueError:
            bad += 1
            continue
        fp = fingerprint(row)
        run = row.get('run_id') or fp.get('run')
        if run and row.get('screen') == 'COMBAT' and row.get('floor') is not None:
            floor, ts = str(row['floor']), row['ts']
            inventory[run][floor] = min(inventory[run].get(floor, ts), ts)
    if grep.wait() not in (0, 1) or head.wait() != 0:
        raise RuntimeError('prefilter failed')
    write(args.out, dict(inventory))
    write(args.out + '.source.json', {'source_bytes': length, 'filtered_sha256': sha.hexdigest(), 'filtered_lines': count, 'bad_json': bad})
    print(dumps({'runs': len(inventory), 'combat_floors': sum(map(len, inventory.values())), 'bad_json': bad}))


def fingerprint(row):
    if isinstance(row.get('fingerprint'), dict):
        return row['fingerprint']
    try:
        return json.loads(row.get('fingerprint') or '{}')
    except (TypeError, ValueError):
        return {}


def choice_of(row):
    action = row.get('chosen') or {}
    if action.get('action') == 'skip_reward_cards':
        return 'skip'
    if action.get('action') == 'choose_reward_card':
        return 'card' + str(action.get('option_index'))
    return None


def successful(row):
    return bool(row.get('answer')) and not row.get('error') and (
        row['accepted'] if isinstance(row.get('accepted'), bool) else not row.get('problems'))


def project(row):
    """Allowlist facts; historical aggregate stats/models and answers are withheld."""
    payload = row['payload']
    brief = payload['run_brief']
    facts = payload.get('facts') or {}
    options = {}
    for key, raw in row['options'].items():
        option = json.loads(raw) if isinstance(raw, str) else raw
        options[key] = {k: option[k] for k in ('card', 'type', 'rarity', 'cost', 'text', 'in_deck', 'note') if k in option}
    return {'character': brief['character'], 'act': int(brief['act']), 'floor': brief['floor'],
            'ascension': brief['ascension'], 'hp': brief['hp'], 'gold': brief.get('gold'),
            'boss': facts.get('act_boss'), 'deck': payload.get('deck') or facts.get('deck'),
            'relics': brief.get('relic_effects') or brief.get('relics'), 'potions': brief.get('potions'),
            'options': options}


def deck_counts(question):
    deck = question.get('deck') or ''
    return deck_counts_text(deck if isinstance(deck, str) else '\n'.join(map(str, deck)))


@functools.lru_cache(maxsize=10000)
def deck_counts_text(deck):
    lines = deck.splitlines()
    result = collections.Counter()
    for line in lines:
        match = re.match(r'(?:(\d+)x )?(.+?)(?: \(|:|$)', str(line))
        if match:
            result[match[2]] += int(match[1] or 1)
    return result


def hp_bucket(question):
    match = re.search(r'(\d+)\s*/\s*(\d+)', str(question['hp']))
    return min(3, int(4 * int(match[1]) / max(1, int(match[2])))) if match else None


def option_names(question):
    return {o['card'] for k, o in question['options'].items() if k != 'skip'}


def similarity(a, b):
    da, db = deck_counts(a), deck_counts(b)
    union = sum((da | db).values())
    deck = sum((da & db).values()) / union if union else 0
    oa, ob = option_names(a), option_names(b)
    overlap = len(oa & ob) / max(1, len(oa | ob))
    return 2 * deck + overlap + (a.get('boss') == b.get('boss') and a.get('boss') is not None) + (hp_bucket(a) == hp_bucket(b))


def training_pool(train, query):
    # Both decision AND label must predate the query; no same-run leakage.
    return [r for r in train if r['run'] != query['run'] and r['ts'] < query['ts']
            and r['question']['act'] == query['question']['act']
            and r['question']['ascension'] == query['question']['ascension']
            and r.get('label_available_at') and r['label_available_at'] < query['ts']]


def stats_group(group):
    known_boss = [r['outcome']['boss_pass'] for r in group if r['outcome']['boss_pass'] is not None]
    known_hp = [r['outcome']['remaining_hp_loss'] for r in group if r['outcome']['remaining_hp_loss'] is not None]
    return {'questions': len(group), 'runs': len({r['run'] for r in group}),
            'boss_known': len(known_boss), 'boss_pass_rate': statistics.mean(known_boss) if known_boss else None,
            'hp_known': len(known_hp), 'mean_remaining_hp_loss': statistics.mean(known_hp) if known_hp else None}


def entries(train, query, k=5):
    pool = training_pool(train, query)
    ranked = sorted(pool, key=lambda r: (similarity(query['question'], r['question']), r['ts'], r['id']), reverse=True)
    # Multiple floors from one run are not independent cases.
    selected, seen = [], set()
    for row in ranked:
        if row['run'] in seen:
            continue
        selected.append(row)
        seen.add(row['run'])
        if len(selected) == k:
            break
    cases = [{'evidence': r['id'], 'state': {key: r['question'][key] for key in ('act', 'floor', 'hp', 'boss', 'deck')},
              'options': r['question']['options'], 'brain_choice': r['choice'],
              'reason': r['reason'], 'outcome': r['outcome']} for r in selected]
    card_stats = {}
    for key, option in query['question']['options'].items():
        name = option['card']
        seen_rows = [r for r in pool if name in {o['card'] for o in r['question']['options'].values()}]
        taken = [r for r in seen_rows if r['question']['options'][r['choice']]['card'] == name]
        taken_ids = {r['id'] for r in taken}
        not_taken = [r for r in seen_rows if r['id'] not in taken_ids]
        card_stats[key] = {'card': name, 'seen': stats_group(seen_rows), 'taken': stats_group(taken), 'not_taken': stats_group(not_taken)}
    return {'schema': 'brain-card-entries-v1', 'warning': '仅历史观察相关，非拿牌因果效果；同局多题相关，缺失结局不补零。',
            'cases': cases, 'card_stats': card_stats}


def baseline(train, query):
    # Most frequently chosen offered card (including skip), not outcome ranking.
    pool = training_pool(train, query)
    counts = collections.Counter(r['question']['options'][r['choice']]['card'] for r in pool)
    return max(query['question']['options'], key=lambda key: (counts[query['question']['options'][key]['card']], key == 'skip', key))


def build(args):
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    rejected = collections.Counter()
    receipts = collections.defaultdict(list)
    for row in rows(args.decisions):
        if row.get('_bad_json'):
            rejected['bad_decision_json'] += 1
            continue
        if row.get('mode') != 'play' or not str(row.get('result', '')).startswith('completed:'):
            continue
        fp = fingerprint(row)
        run = row.get('run_id') or fp.get('run')
        if run and choice_of(row):
            receipts[(run, row.get('floor'))].append((row['ts'], choice_of(row)))
    endings, configs, stops, stop_rows = {}, collections.defaultdict(list), {}, {}
    for row in rows(Path(args.logs) / 'runs.jsonl'):
        rid = row.get('run_id')
        if rid and row.get('ended') and (rid not in endings or row['ended'] < endings[rid]['ended']):
            endings[rid] = row
    for row in rows(Path(args.logs) / 'run-config.jsonl'):
        if row.get('run_id') and row.get('ts'):
            configs[row['run_id']].append(row)
    for row in rows(Path(args.logs) / 'sl-attempts.jsonl'):
        if row.get('result') == 'died':
            ts = row.get('ended_at') or row.get('ts')
            rid = row.get('run_id')
            if rid and ts:
                if rid not in stops or ts < stops[rid]:
                    stops[rid], stop_rows[rid] = ts, row
    fights = collections.defaultdict(dict)
    for row in rows(args.openings):
        if row.get('run') and row.get('ended'):
            key = (int(row['input']['act']), int(row['input']['floor']))
            previous = fights[row['run']].get(key)
            if previous is None or row['ts'] < previous['ts']:
                fights[row['run']][key] = row
    inventory = json.loads(Path(args.inventory).read_text()) if args.inventory else {}
    dataset, seen = [], set()
    for raw in sorted(rows(args.brain), key=lambda r: r.get('ts', '')):
        if raw.get('_bad_json'):
            rejected['bad_brain_json'] += 1
            continue
        brief = raw.get('payload', {}).get('run_brief', {})
        if raw.get('engine') != 'codex' or brief.get('character') != '静默猎手':
            continue
        if not successful(raw):
            rejected['unsuccessful_brain'] += 1
            continue
        try:
            q = project(raw)
        except (KeyError, TypeError, ValueError):
            rejected['malformed_question'] += 1
            continue
        rid, ts = raw['run_id'], raw['ts']
        combat_ts = inventory.get(rid, {}).get(str(q['floor']))
        if not combat_ts or combat_ts >= ts:
            rejected['not_verified_postcombat'] += 1
            continue
        key = (rid, q['act'], q['floor'])
        choice = raw['answer'].get('choice')
        if choice not in q['options']:
            rejected['invalid_choice'] += 1
            continue
        # The brain timestamp is completion time; dispatch must follow shortly.
        matches = [(t, c) for t, c in receipts[(rid, q['floor'])] if t >= ts and c == choice and iso_seconds(t) - iso_seconds(ts) <= 120]
        if not matches:
            rejected['no_matching_dispatch'] += 1
            continue
        if key in seen:
            rejected['repeat_floor'] += 1
            continue
        if rid in stops and ts >= stops[rid]:
            rejected['after_first_sl_death'] += 1
            continue
        seen.add(key)
        end = endings.get(rid)
        end_ts = end['ended'] if end else None
        stop = min(t for t in (end_ts, stops.get(rid), '9999') if t)
        future = [f for (act, floor), f in fights[rid].items() if act == q['act'] and floor > q['floor'] and f['ended'] <= stop]
        boss = next((f for f in future if f['kind'] == 'boss'), None)
        past_boss = any(act == q['act'] and floor <= q['floor'] and f['kind'] == 'boss' and f['win'] for (act, floor), f in fights[rid].items())
        death = stop_rows.get(rid) if stops.get(rid) == stop else None
        death_act = int(death['act']) + 1 if death and death.get('act') is not None else None
        next_act = any(act > q['act'] and f['ts'] <= stop for (act, _), f in fights[rid].items()) or bool(death_act and death_act > q['act'])
        boss_pass = None if past_boss else bool(boss['win']) if boss else True if next_act else False if (death_act == q['act'] or (end and end_ts <= stop and not end.get('victory'))) else None
        end_floor = end.get('floor') if end and end_ts <= stop else death.get('floor') if death else None
        available = end_ts if end and end_ts <= stop else stops.get(rid)
        inventory_floors = {int(f) for f in inventory.get(rid, []) if q['floor'] < int(f) <= (boss['input']['floor'] if boss else end_floor or 999)}
        observed_floors = {int(f['input']['floor']) for f in future}
        # Full remaining-act label needs a terminal/Boss endpoint AND inventory coverage.
        complete = bool(args.inventory and available and not past_boss and (boss or (end_floor is not None and not next_act)) and inventory_floors <= observed_floors)
        hp = sum(f['hp_loss'] for f in future) if complete else None
        versions = [c for c in configs[rid] if c['ts'] <= ts]
        config = max(versions, key=lambda c: c['ts']) if versions else {}
        code = config.get('code') or {}
        dataset.append({'id': f'{rid}/{q["act"]}/{q["floor"]}', 'run': rid, 'ts': ts,
                        'question': q, 'choice': choice, 'reason': raw['answer'].get('reason', ''),
                        'outcome': {'boss_pass': boss_pass, 'boss_already_passed': past_boss,
                                    'remaining_hp_loss': hp, 'observed_hp_loss': sum(f['hp_loss'] for f in future),
                                    'observed_fights': len(future), 'hp_complete': complete, 'final_floor': end_floor,
                                    'terminal_kind': 'first_sl_death' if death else 'run_end' if end_floor is not None else 'censored'},
                        'label_available_at': available, 'version': code.get('commit') or code.get('code'),
                        'brain_model': raw.get('model'), 'source_sha256': hashlib.sha256(dumps(raw).encode()).hexdigest(),
                        'dispatch_ts': min(matches)[0]})
    starts = {}
    for row in dataset:
        starts[row['run']] = min(starts.get(row['run'], row['ts']), row['ts'])
    ordered = sorted(starts, key=lambda rid: (starts[rid], rid))
    if len(ordered) < 2:
        raise ValueError('at least two verified runs required for chronological split')
    split = max(1, int(len(ordered) * .8))
    test_runs = set(ordered[split:])
    cutoff = starts[ordered[split]]
    for row in dataset:
        # A run crossing the cutoff cannot contribute future questions/labels to training.
        row['split'] = 'test' if row['run'] in test_runs else 'train' if row['ts'] < cutoff and row.get('label_available_at') and row['label_available_at'] < cutoff else 'embargo'
    with gzip.open(out / 'dataset.jsonl.gz', 'wt') as dest:
        for row in dataset:
            dest.write(dumps(row) + '\n')
    manifest = {'schema': 'brain-card-distill-v1', 'cutoff': cutoff, 'split_by': 'first eligible reward timestamp; entire runs; 80/20',
                'rows': len(dataset), 'runs': len(ordered), 'rejected': dict(rejected),
                'coverage': dict(collections.Counter(f"A{r['question']['ascension']}/act{r['question']['act']}/{r['split']}" for r in dataset)),
                'missing': {k: sum(r['outcome'][k] is None for r in dataset) for k in ('boss_pass', 'remaining_hp_loss', 'final_floor')},
                'unknown_version': sum(not r['version'] for r in dataset), 'versions': dict(collections.Counter(str(r['version']) for r in dataset)),
                'inputs': {str(Path(p).name): {'sha256': digest(p), 'bytes': Path(p).stat().st_size} for p in (args.brain, args.decisions, args.openings, args.inventory, Path(args.logs)/'runs.jsonl', Path(args.logs)/'run-config.jsonl', Path(args.logs)/'sl-attempts.jsonl') if p},
                'dataset_sha256': digest(out / 'dataset.jsonl.gz')}
    write(out / 'manifest.json', manifest)
    print(dumps({k: v for k, v in manifest.items() if k not in ('versions', 'inputs')}))


def iso_seconds(ts):
    from datetime import datetime
    return datetime.fromisoformat(ts.replace('Z', '+00:00')).timestamp()


def payload_for(train, query, arm):
    state = dict(query['question'])
    options = state.pop('options')
    if arm == 'entries':
        state['historical_entries'] = entries(train, query)
    return {'model': 'typesafe/jev-1.14', 'state': state,
            'questions': {'pick': {'type': 'choice', 'instructions': '选择本次战斗奖励的一张牌或skip。依据当前状态判断；历史条目仅为观察相关，缺失结果未知。',
                                   'criteria': {k: dumps(v) for k, v in options.items()}}}}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def replay(args):
    existing = list(rows(args.out)) if Path(args.out).exists() else []
    dataset_sha = digest(args.dataset)
    if any(r.get('dataset_sha256') != dataset_sha for r in existing):
        raise ValueError('resume dataset hash mismatch')
    if len({(r['id'], r['arm']) for r in existing}) != len(existing):
        raise ValueError('duplicate resume records')
    dataset = list(rows(args.dataset))
    train = [r for r in dataset if r['split'] == 'train']
    test = [r for r in dataset if r['split'] == 'test' and r['question']['ascension'] == 10]
    if args.limit:
        # Evenly spaced pilot questions, selected before observing Nova responses.
        if args.limit < 0:
            raise ValueError('limit must be nonnegative')
        count = min(args.limit, len(test))
        test = [test[int(i * len(test) / count)] for i in range(count)]
    done = {(r['id'], r['arm']) for r in existing}
    key = Path(args.key_file).read_text().strip()
    if not key:
        raise ValueError('empty Nova key file')
    if not args.endpoint or not args.endpoint.startswith('https://'):
        raise ValueError('explicit HTTPS Nova endpoint required')
    jobs = [(q, arm) for q in test for arm in ('bare', 'entries') if (q['id'], arm) not in done]
    def call(job):
        query, arm = job
        before = time.monotonic()
        payload = payload_for(train, query, arm)
        encoded = dumps(payload).encode()
        prep_ms = (time.monotonic() - before) * 1000
        request = urllib.request.Request(args.endpoint, data=encoded, headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
        start = time.monotonic()
        result = {'id': query['id'], 'run': query['run'], 'arm': arm, 'truth': query['choice'],
                  'baseline': baseline(train, query), 'payload_bytes': len(encoded), 'payload_sha256': hashlib.sha256(encoded).hexdigest(),
                  'prep_ms': round(prep_ms, 2), 'dataset_sha256': dataset_sha}
        try:
            opener = urllib.request.build_opener(NoRedirect)
            with opener.open(request, timeout=20) as response:
                body = json.load(response)
            choice = body.get('answers', {}).get('pick', {}).get('choice')
            result.update(choice=choice if choice in query['question']['options'] else None,
                          usage=body.get('usage'))
            if result['choice'] is None:
                result['error'] = 'invalid_choice'
        except urllib.error.HTTPError as error:
            # Never retain exception/request headers or gateway error body.
            result.update(choice=None, error='http_' + str(error.code))
        except Exception as error:
            result.update(choice=None, error=type(error).__name__)
        result['latency_ms'] = round((time.monotonic() - start) * 1000, 2)
        return result
    with open(args.out, 'a') as dest, concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(call, job) for job in jobs]
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            dest.write(dumps(result) + '\n')
            dest.flush()
            print(dumps({k: result.get(k) for k in ('id', 'arm', 'choice', 'error', 'latency_ms')}), flush=True)


def wilson(successes, total):
    if not total:
        return None
    z = 1.959963984540054
    p = successes / total
    center = (p + z*z/(2*total)) / (1 + z*z/total)
    half = z * math.sqrt(p*(1-p)/total + z*z/(4*total*total)) / (1+z*z/total)
    return [center-half, center+half]


def cluster_interval(values, seed=16):
    if not values or not any(values.values()):
        return None
    rng = random.Random(seed)
    clusters = list(values.values())
    estimates = []
    for _ in range(2000):
        sample = [x for group in rng.choices(clusters, k=len(clusters)) for x in group]
        if sample:
            estimates.append(statistics.mean(sample))
    estimates.sort()
    return [estimates[int(.025 * len(estimates))], estimates[min(len(estimates)-1, int(.975 * len(estimates)))]]


def summarize(args):
    data = {r['id']: r for r in rows(args.dataset)}
    results = list(rows(args.results))
    report = {}
    for arm in ('baseline', 'bare', 'entries'):
        subset = [r for r in results if r['arm'] == ('bare' if arm == 'baseline' else arm)]
        groups = collections.defaultdict(list)
        skip_groups = collections.defaultdict(list)
        skip_decision_groups = collections.defaultdict(list)
        correct, skip_truth, skip_hit, predicted_skip, errors = 0, 0, 0, 0, 0
        confusion = collections.Counter()
        act = collections.defaultdict(lambda: [0, 0])
        for row in subset:
            choice = row['baseline'] if arm == 'baseline' else row.get('choice')
            hit = choice == row['truth']
            correct += hit
            errors += choice is None
            groups[row['run']].append(int(hit))
            skip_groups[row['run']]  # Keep zero-skip runs in cluster resampling.
            skip_decision_groups[row['run']].append(int(choice is not None and (row['truth'] == 'skip') == (choice == 'skip')))
            if row['truth'] == 'skip':
                skip_groups[row['run']].append(int(choice == 'skip'))
            skip_truth += row['truth'] == 'skip'
            skip_hit += row['truth'] == 'skip' and choice == 'skip'
            predicted_skip += choice == 'skip'
            confusion[f"{'skip' if row['truth'] == 'skip' else 'take'}→{'skip' if choice == 'skip' else 'error' if choice is None else 'take'}"] += 1
            a = str(data[row['id']]['question']['act'])
            act[a][0] += hit
            act[a][1] += 1
        n = len(subset)
        report[arm] = {'n': n, 'runs': len(groups), 'correct': correct, 'agreement': correct/n if n else None,
                       'wilson_95': wilson(correct, n), 'run_cluster_95': cluster_interval(groups),
                       'brain_skip': skip_truth, 'skip_correct': skip_hit, 'skip_recall': skip_hit/skip_truth if skip_truth else None,
                       'skip_recall_wilson_95': wilson(skip_hit, skip_truth), 'predicted_skip': predicted_skip,
                       'skip_recall_run_cluster_95': cluster_interval(skip_groups),
                       'skip_decision_agreement': statistics.mean([x for v in skip_decision_groups.values() for x in v]) if n else None,
                       'skip_decision_run_cluster_95': cluster_interval(skip_decision_groups),
                       'skip_precision': skip_hit/predicted_skip if predicted_skip else None,
                       'errors': errors, 'confusion': dict(confusion), 'by_act_correct_total': dict(act)}
        if arm != 'baseline' and subset:
            for key in ('payload_bytes', 'latency_ms', 'prep_ms'):
                vals = sorted(r[key] for r in subset)
                report[arm][key] = {'mean': statistics.mean(vals), 'p50': statistics.median(vals), 'p95': vals[min(len(vals)-1, int(.95*len(vals)))]}
            report[arm]['usage_examples'] = [r.get('usage') for r in subset[:2]]
    paired = collections.defaultdict(dict)
    for row in results:
        paired[row['id']][row['arm']] = row
    delta = collections.defaultdict(list)
    for pair in paired.values():
        if 'bare' in pair and 'entries' in pair:
            b, e = pair['bare'], pair['entries']
            delta[b['run']].append(int(e.get('choice') == e['truth']) - int(b.get('choice') == b['truth']))
    report['paired_entries_minus_bare'] = {'mean': statistics.mean([x for v in delta.values() for x in v]) if delta else None,
                                          'run_cluster_95': cluster_interval(delta)}
    write(args.out, report)
    print(dumps(report))


def audit(args):
    dataset = list(rows(args.dataset))
    train = [r for r in dataset if r['split'] == 'train']
    test = [r for r in dataset if r['split'] == 'test' and r['question']['ascension'] == 10]
    results = list(rows(args.results))
    expected = {(r['id'], a) for r in test for a in ('bare', 'entries')}
    actual = {(r['id'], r['arm']): r for r in results}
    if set(actual) != expected or len(actual) != len(results):
        raise ValueError('incomplete or duplicate replay')
    cutoff = min(r['ts'] for r in test)
    if {r['run'] for r in train} & {r['run'] for r in test}:
        raise ValueError('run leakage')
    if any(r['ts'] >= cutoff or not r.get('label_available_at') or r['label_available_at'] >= cutoff for r in train):
        raise ValueError('training time leakage')
    dataset_sha = digest(args.dataset)
    mismatches, examples, confusion = [], collections.defaultdict(list), collections.Counter()
    usage = collections.defaultdict(collections.Counter)
    coverage = collections.Counter()
    by_act = {}
    for query in test:
        candidates = entries(train, query)
        coverage[len(candidates['cases'])] += 1
        b, e = actual[(query['id'], 'bare')], actual[(query['id'], 'entries')]
        category = 'entry_fixes' if e['choice'] == query['choice'] and b['choice'] != query['choice'] else 'entry_harms' if b['choice'] == query['choice'] and e['choice'] != query['choice'] else 'both_wrong' if b['choice'] != query['choice'] and e['choice'] != query['choice'] else 'both_right'
        if len(examples[category]) < 3:
            examples[category].append({'id': query['id'], 'question': query['question'], 'brain_choice': query['choice'],
                                       'brain_reason': query['reason'], 'bare': b['choice'], 'entries': e['choice'],
                                       'historical_entries': candidates, 'outcome': query['outcome']})
        for arm in ('bare', 'entries'):
            result = actual[(query['id'], arm)]
            payload = payload_for(train, query, arm)
            encoded = dumps(payload).encode()
            if (hashlib.sha256(encoded).hexdigest() != result['payload_sha256'] or len(encoded) != result['payload_bytes']
                    or result['dataset_sha256'] != dataset_sha or result['truth'] != query['choice']
                    or result['run'] != query['run'] or result['baseline'] != baseline(train, query)):
                mismatches.append((query['id'], arm))
            for key, value in (result.get('usage') or {}).items():
                if isinstance(value, (int, float)):
                    usage[arm][key] += value
            if result.get('choice') != query['choice']:
                options = query['question']['options']
                truth = options[query['choice']]['card']
                choice = options.get(result.get('choice'), {}).get('card', 'ERROR')
                confusion[f'{arm}: {truth}→{choice}'] += 1
        by_act[str(query['question']['act'])] = by_act.get(str(query['question']['act']), 0) + 1
    if mismatches:
        raise ValueError('payload provenance mismatches: ' + str(mismatches[:5]))
    write(args.out, {'complete_pairs': len(test), 'payload_hashes_verified': len(results), 'no_run_or_time_leakage': True,
                     'case_count_distribution': dict(coverage), 'test_by_act': by_act, 'tokens': {k: dict(v) for k, v in usage.items()},
                     'top_disagreements': confusion.most_common(20), 'examples': dict(examples)})
    print(dumps({'complete_pairs': len(test), 'payload_hashes_verified': len(results), 'tokens': {k: dict(v) for k, v in usage.items()}}))


def main():
    parser = argparse.ArgumentParser(__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    inventory_parser = sub.add_parser('inventory')
    inventory_parser.add_argument('--decisions', required=True)
    inventory_parser.add_argument('--out', required=True)
    build_parser = sub.add_parser('build')
    for name in ('brain', 'decisions', 'logs', 'openings', 'out'):
        build_parser.add_argument('--' + name, required=True)
    build_parser.add_argument('--inventory', required=True)
    replay_parser = sub.add_parser('replay')
    replay_parser.add_argument('--dataset', required=True)
    replay_parser.add_argument('--out', required=True)
    replay_parser.add_argument('--limit', type=int, default=0)
    replay_parser.add_argument('--key-file', default=str(Path.home() / '.config/nova-game-agents/api.key'))
    replay_parser.add_argument('--endpoint', default=os.environ.get('NOVA_DECISIONS_ENDPOINT'))
    summary_parser = sub.add_parser('summarize')
    for name in ('dataset', 'results', 'out'):
        summary_parser.add_argument('--' + name, required=True)
    audit_parser = sub.add_parser('audit')
    for name in ('dataset', 'results', 'out'):
        audit_parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    {'inventory': make_inventory, 'build': build, 'replay': replay, 'summarize': summarize, 'audit': audit}[args.command](args)


if __name__ == '__main__':
    main()
