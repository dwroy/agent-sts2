#!/usr/bin/env python3
"""Describe frozen SL action receipts; never run a game, model, or simulation."""
import csv
import datetime as dt
import gzip
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OLD = ROOT / 'paper/materials/20261016-v5s-regression-diagnosis'


def rows(path):
    with gzip.open(path, 'rt') as stream:
        return [json.loads(line) for line in stream]


def stamp(value):
    if not value:
        return None
    return dt.datetime.fromisoformat(value.replace('Z', '+00:00')).replace(tzinfo=dt.timezone.utc).timestamp()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def write_csv(name, data):
    if not data:
        return
    keys = list(dict.fromkeys(k for row in data for k in row))
    with (HERE / name).open('w') as stream:
        out = csv.DictWriter(stream, keys)
        out.writeheader()
        out.writerows({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v for k, v in row.items()} for row in data)


def plays(attempt):
    return [(turn['turn'], turn.get('plays', [])) for turn in (attempt.get('summary') or {}).get('turns', [])]


def first_difference(reference, attempt):
    a = dict(plays(reference))
    b = dict(plays(attempt))
    for turn in sorted(a.keys() & b.keys()):
        if a[turn] != b[turn]:
            return turn
    return None


def main():
    freeze = json.loads((OLD / 'freeze.json').read_text())
    bosses = list(csv.DictReader((OLD / 'bosses.csv').open()))
    by_boss = {(b['run_id'], int(b['floor'])): b for b in bosses}
    inputs = HERE / 'inputs'
    inputs.mkdir(exist_ok=True)
    original = OLD / 'inputs/sl.jsonl.gz'
    target = inputs / 'sl.original.jsonl.gz'
    if target.exists():
        assert digest(target) == digest(original)
    else:
        target.write_bytes(original.read_bytes())
    sl = [s for s in rows(target) if (s['run_id'], s['floor']) in by_boss]
    grouped = defaultdict(list)
    for s in sl:
        grouped[s['run_id'], s['floor']].append(s)
    for values in grouped.values():
        values.sort(key=lambda s: s['attempt'])
        assert len({s['attempt'] for s in values}) == len(values)
    frames = defaultdict(list)
    for f in rows(OLD / 'inputs-lean/frames.jsonl.gz'):
        key = f['run_id'], f['floor']
        if key in by_boss:
            frames[key].append(f)
    for values in frames.values():
        values.sort(key=lambda f: stamp(f['observed_ts'] or f['ts']))
    attempts, retries, cases, frame_refs = [], [], [], {}
    for key, b in sorted(by_boss.items()):
        values = grouped.get(key, [])
        if not values:
            continue
        first = values[0]
        for i, s in enumerate(values):
            ex = s.get('explore') or {}
            judge = s.get('judge') or {}
            potion_uses = (s.get('summary') or {}).get('potions', [])
            start, end = stamp(s['started_at']), stamp(s['ended_at'])
            observed = [f for f in frames[key] if f['observed'] is not False and start - .05 <= stamp(f['observed_ts'] or f['ts']) <= end]
            boundary = [observed[0], observed[-1]] if observed else []
            for f in boundary:
                frame_refs[f['off']] = f
            devs = [ex[k] for k in ('deviation', 'fallback') if ex.get(k)]
            reached = [v for v in devs if v.get('reached')]
            row = dict(cohort=b['cohort'], epoch=b['epoch'], run_id=key[0], floor=key[1], encounter=b['encounter'],
                       first_failed=b['first_completed_win'] == '0', final_won=b['final_outcome'] == 'won',
                       attempt=s['attempt'], result=s['result'], turns=s['turns'], end_hp=s.get('end_hp'),
                       judge_tier=judge.get('tier'), judge_reason=judge.get('reason'), judge_saved=s.get('judge') is not None,
                       judge_early='at the least-loss verdict, before its line' in judge.get('reason', ''),
                       reload_ok=(s.get('reload') or {}).get('ok') is True,
                       give_up_reason=s.get('give_up_reason'), potion_uses=len(potion_uses), potions=potion_uses,
                       potion_T1=sum(p.startswith('T1 ') for p in potion_uses),
                       draws_clean=(s.get('draws') or {}).get('clean'), draws_broke=(s.get('draws') or {}).get('broke'),
                       explore_target=ex.get('target'), deviation_reached=bool(reached),
                       explicit_actual_turn_differs=any(v.get('differs') is True for v in reached),
                       explicit_actual_turn_same=bool(reached) and all(v.get('differs') is False for v in reached),
                       first_actual_turn_diff_vs_first=first_difference(first, s) if i else None,
                       first_actual_turn_diff_vs_previous=first_difference(values[i-1], s) if i else None,
                       same_T1_as_first=dict(plays(first)).get(1) == dict(plays(s)).get(1),
                       potion_schedule_diff_vs_first=potion_uses != (first.get('summary') or {}).get('potions', []),
                       start_frame_off=boundary[0]['off'] if boundary else None,
                       last_observed_frame_off=boundary[-1]['off'] if boundary else None,
                       source=s['_source'])
            attempts.append(row)
            if i:
                retries.append(row)
        if b['first_completed_win'] == '0':
            r = [r for r in attempts if r['run_id'] == key[0] and r['floor'] == key[1]]
            cases.append(dict(cohort=b['cohort'], epoch=b['epoch'], run_id=key[0], floor=key[1], encounter=b['encounter'],
                              entry_hp=b['entry_hp'], final_outcome=b['final_outcome'], first_result=first['result'],
                              attempts=len(values), retried=len(values) > 1,
                              rescued=b['final_outcome'] == 'won',
                              first_early=r[0]['judge_early'], retry_T1_changes=sum(not x['same_T1_as_first'] for x in r[1:]),
                              actual_sequence_changes=sum(x['first_actual_turn_diff_vs_first'] is not None for x in r[1:]),
                              actual_differs_flags=sum(x['explicit_actual_turn_differs'] for x in r[1:]),
                              potion_schedule_changes=sum(x['potion_schedule_diff_vs_first'] for x in r[1:]),
                              potion_uses_by_attempt=[x['potion_uses'] for x in r],
                              results=[x['result'] for x in r],
                              turns=[x['turns'] for x in r],
                              first_source=first['_source']))
    # Preserve selected physical frame hashes, raw occupied slots and observed hand previews.
    # No reconstruction of unknown relic charges or inferred unplayed continuations.
    frame_payloads = []
    states = ROOT / freeze['sources']['states']['path']
    with states.open('rb') as stream:
        for off, f in sorted(frame_refs.items()):
            assert off + f['len'] <= freeze['sources']['states']['complete_prefix_bytes']
            stream.seek(off)
            raw = stream.read(f['len'])
            parsed = json.loads(raw)
            state = parsed['state']
            assert state['run_id'] == f['run_id'] and state['run']['floor'] == f['floor']
            payload = {k: f[k] for k in ['run_id', 'floor', 'turn', 'hp', 'max_hp', 'potions', 'relics']}
            payload.update(source=dict(path='logs/states.jsonl', off=off, len=f['len'], sha256=hashlib.sha256(raw).hexdigest()),
                           observed_ts=f['observed_ts'], potions_raw=state['run'].get('potions'), relics_raw=state['run'].get('relics'),
                           hand=(state.get('combat') or {}).get('hand'))
            frame_payloads.append(payload)
    with gzip.open(inputs / 'resource-boundary-frames.jsonl.gz', 'wt') as stream:
        for item in frame_payloads:
            stream.write(json.dumps(item, ensure_ascii=False) + '\n')
    write_csv('attempts.csv', attempts)
    write_csv('retries.csv', retries)
    write_csv('initial-noncompletion-cases.csv', cases)
    write_json('attempt-details.json', [dict(source=s['_source'], run_id=s['run_id'], floor=s['floor'], attempt=s['attempt'],
                                             result=s['result'], summary=s.get('summary'), explore=s.get('explore'),
                                             judge=s.get('judge'), reload=s.get('reload')) for s in sl])
    groups = []
    for cohort in ('pre', 'post'):
        for floor in (None, 17, 33, 48, 49):
            c = [c for c in cases if c['cohort'] == cohort and (floor is None or c['floor'] == floor)]
            rs = [r for r in retries if r['cohort'] == cohort and r['first_failed'] and (floor is None or r['floor'] == floor)]
            aa = [r for r in attempts if r['cohort'] == cohort and (floor is None or r['floor'] == floor)]
            groups.append(dict(cohort=cohort, floor=floor, initial_noncompletion=len(c), rescued=sum(c['rescued'] for c in c),
                               actually_retried=sum(c['retried'] for c in c), no_retry=sum(not c['retried'] for c in c),
                               retry_attempts=len(rs), retry_T1_changes=sum(not r['same_T1_as_first'] for r in rs),
                               retry_sequence_changes=sum(r['first_actual_turn_diff_vs_first'] is not None for r in rs),
                               retry_target_reached=sum(r['deviation_reached'] for r in rs),
                               retry_explicit_differs=sum(r['explicit_actual_turn_differs'] for r in rs),
                               retry_explicit_same=sum(r['explicit_actual_turn_same'] for r in rs),
                               retry_potion_schedule_changes=sum(r['potion_schedule_diff_vs_first'] for r in rs),
                               predicted_death_attempts=sum(r['result'] == 'predicted_death' for r in aa),
                               early_exits=sum(r['result'] == 'predicted_death' and r['judge_early'] for r in aa),
                               deaths_without_certain_verdict=sum(r['result'] == 'died' and not r['judge_tier'] for r in aa),
                               deaths_without_saved_verdict=sum(r['result'] == 'died' and not r['judge_saved'] for r in aa)))
    write_json('summary.json', dict(groups=groups, bosses=len(bosses), SL_rows=len(sl), cases=len(cases),
                                    units='unique run/floor and actual attempts; potion uses on retries are replayed uses, never independent games',
                                    scope='same immutable 17:15:44 CST cutoff; source/account sensitivity retained in original report'))
    manifest = dict(schema='f48-f49-frozen-analysis-v1', original_cutoff=freeze['at'], original_commit='492a87d0bebc3503cdbad9ac3a66cf066f563352',
                    source_bounds=freeze['sources'], root_snapshot='no new game outcomes added',
                    files={str(p.relative_to(ROOT)): digest(p) for p in [OLD/'freeze.json', OLD/'bosses.csv', OLD/'inputs-lean/frames.jsonl.gz', target, inputs/'resource-boundary-frames.jsonl.gz']})
    write_json('freeze.json', manifest)
    print(json.dumps(dict(bosses=len(bosses), attempts=len(sl), cases=len(cases), retries=len(retries), frames=len(frame_payloads))))


if __name__ == '__main__':
    main()
