#!/usr/bin/env python3
"""Release and fixed-ten-run funnels from immutable logdb exports, without model calls."""
import argparse
import collections
import datetime as dt
import functools
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'eval'))
from metrics import boss_fights, first_attempt, passed_boss

V5_ROOT = '4391d1d38bf658747c37ab1d56d53e648ae97167'
S_PHASES = [('P2/C2-on', 'fad271855a515e229c7022f5049cc870f95a8d69'),
            ('P1/P3-on', '67863fac6d97452a235cb11fb2bd10c749880a3f')]
EXCLUDED = {'W1YY8PEWGUF9'}


def exported(path):
    data = json.loads(Path(path).read_text())
    if data.get('error') or data.get('truncated') or len(data['rows']) != data['row_count']:
        raise ValueError(f'incomplete export: {path}')
    return [dict(zip(data['columns'], row)) for row in data['rows']]


@functools.lru_cache(maxsize=None)
def resolved(commit):
    proc = subprocess.run(['git', '-C', str(ROOT), 'rev-parse', '--verify', f'{commit}^{{commit}}'],
                          capture_output=True)
    if proc.returncode:
        raise ValueError(f'unresolvable commit {commit}: {proc.stderr.decode().strip()}')
    return proc.stdout.decode().strip()


@functools.lru_cache(maxsize=None)
def ancestors(commit):
    proc = subprocess.run(['git', '-C', str(ROOT), 'rev-list', resolved(commit)], capture_output=True)
    if proc.returncode:
        raise ValueError(f'cannot read ancestry {commit}')
    return set(proc.stdout.decode().splitlines())


def ancestor(base, commit):
    return resolved(base) in ancestors(commit)


def stamp(value):
    result = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    return result.replace(tzinfo=dt.timezone.utc) if result.tzinfo is None else result


def cohort(runs, configurations, versions, is_ancestor=ancestor):
    cfg = collections.defaultdict(list)
    for row in configurations:
        cfg[row['run_id']].append(row)
    selected, excluded = [], []
    for row in runs:
        rid = row['run_id']
        if row.get('character') != 'SILENT' or row.get('ascension') != 10 or not row.get('finished'):
            continue
        configs = sorted(cfg[rid], key=lambda r: r.get('off', 0))
        commit = row.get('cfg_commit') or (configs[0].get('commit') if configs else None)
        reason = 'original_gap_exclusion' if rid in EXCLUDED else ('missing_initial_commit' if not commit else None)
        if not reason and not is_ancestor(V5_ROOT, commit):
            reason = 'before_V5'
        if reason:
            excluded.append({'run_id': rid, 'reason': reason})
            continue
        phase = next((name for name, base in S_PHASES if is_ancestor(base, commit)), 'V5-S-before')
        releases = [v for v in versions if v.get('commit') and v.get('release_id') and is_ancestor(v['commit'], commit)]
        release = releases[-1].get('release_id') if releases else 'unregistered'
        snapshot = json.loads(configs[0].get('config') or '{}') if configs else {}
        loop = snapshot.get('loop') or {}
        selected.append({**row, 'cfg_commit': commit, 's_phase': phase, 'release': release,
                         'config_changed': len({(r.get('commit'), r.get('config_sha')) for r in configs}) > 1,
                         'configuration_offsets': [r.get('off') for r in configs],
                         'initial_config_sha': configs[0].get('config_sha') if configs else None,
                         'initial_switches': {k: loop.get(k) for k in ('s_combat_rank', 's_build_rank', 'sim_adaptive', 's_readiness', 'global_build_eval')},
                         'source_identity_gate': 'descriptive gap cohort; native model/account not audited'})
    selected.sort(key=lambda r: (stamp(r['started']), r['run_id']))
    if len({r['run_id'] for r in selected}) != len(selected):
        raise ValueError('duplicate finished run IDs')
    return selected, excluded


def group_rows(rows):
    result = collections.defaultdict(list)
    for row in rows:
        result[row['run_id']].append(row)
    return result


def outcome(result):
    return True if result == 'won' else False if result in ('died', 'predicted_death') else None


def boss_result(fights, sl):
    """One actual encounter, with retries collapsed; unknown is not a loss or a win."""
    final = True if any(f.get('outcome') == 'won' for f in fights) else (
        False if any(f.get('outcome') == 'died' for f in fights) else None)
    opening = [r for r in sl if r.get('attempt') == 1]
    if opening:
        values = {outcome(r.get('result')) for r in opening}
        first = next(iter(values)) if len(values) == 1 else None
    else:
        # Retry records without their first attempt cannot establish first-attempt success.
        first = None if sl else outcome(fights[0].get('outcome'))
    return final, first


def run_record(run, fights, floors, sl):
    sl = sorted(sl, key=lambda r: (r.get('ts') or '', r.get('off', 0)))
    bosses = boss_fights(fights, run.get('max_act'), run.get('victory'))
    passed = {act: passed_boss(act, run.get('max_act'), run.get('victory'), bosses) for act in (1, 2)}
    first = first_attempt(sl, run['floor'], run['victory'], passed,
                          {act: boss['floor'] for act, boss in bosses.items()})
    by_encounter = collections.defaultdict(list)
    for fight in sorted(fights, key=lambda f: f['fight_no']):
        if fight.get('room') == 'boss':
            by_encounter[(fight['act'], fight['floor'], fight['encounter'])].append(fight)
    events = []
    for (act, floor, encounter), attempts in by_encounter.items():
        matching = [r for r in sl if r.get('floor') == floor and r.get('encounter') == encounter]
        final_result, first_result = boss_result(attempts, matching)
        events.append({'act': act, 'floor': floor, 'encounter': encounter, 'final': final_result,
                       'first_attempt': first_result, 'observed_fight_segments': len(attempts),
                       'first_ts': attempts[0].get('first_ts'), 'sl_offsets': [r.get('off') for r in matching]})
    return {**run, 'first_attempt': first, 'bosses': events,
            'entered_acts': sorted({f['act'] for f in floors if f.get('act') is not None}),
            'act_entry_floors': {str(act): min(f['floor'] for f in floors if f.get('act') == act)
                                 for act in {f['act'] for f in floors if f.get('act') is not None}},
            'first_death_room': next((f.get('room') for f in fights if f.get('floor') == first['death_floor']), None)
                                if first['death_floor'] is not None else run.get('death_room')}


def share(values):
    known = [v for v in values if v is not None]
    wins = sum(known)
    return {'observed': len(values), 'known': len(known), 'unknown': len(values) - len(known),
            'passed': wins, 'rate': wins / len(known) if known else None}


def summarize(rows):
    result = {'n': len(rows), 'run_ids': [r['run_id'] for r in rows]}
    for mode in ('final', 'first_attempt'):
        floors = [r['floor'] if mode == 'final' else r['first_attempt']['floor'] for r in rows]
        wins = [bool(r['victory']) if mode == 'final' else r['first_attempt']['victory'] for r in rows]
        result[mode] = {'floor_milestones_proxy': {str(f): sum(v is not None and v >= f for v in floors)
                       for f in (17, 18, 33, 34, 48, 49)}, 'victories': sum(wins),
                       'mean_floor': sum(v for v in floors if v is not None) / len(floors) if floors and all(v is not None for v in floors) else None,
                       'death_rooms': dict(collections.Counter((r.get('death_room') if mode == 'final' else r.get('first_death_room')) or 'unknown_room'
                                            for r, win in zip(rows, wins) if not win))}
        per_boss = collections.defaultdict(list)
        for r in rows:
            for boss in r['bosses']:
                # A first-attempt run stops at its earliest predicted death, even if SL later reaches another boss.
                if mode == 'first_attempt' and r['first_attempt']['death_floor'] is not None and boss['floor'] > r['first_attempt']['death_floor']:
                    continue
                per_boss[f"A{boss['act']}:{boss['encounter']}:F{boss['floor']}"] .append(boss[mode])
        result[mode]['boss_pass_rates'] = {k: share(v) for k, v in sorted(per_boss.items())}
        roads = {}
        for act in sorted({a for r in rows for a in r['entered_acts']}):
            entered = [r for r in rows if act in r['entered_acts'] and (mode == 'final' or
                       r['first_attempt']['death_floor'] is None or (r['act_entry_floors'][str(act)] <= r['first_attempt']['death_floor'] and
                       not any(b['act'] < act and b['floor'] >= r['first_attempt']['death_floor'] for b in r['bosses'])))]
            reached = []
            inferred = 0
            for r in entered:
                stop = r['first_attempt']['death_floor'] if mode == 'first_attempt' else None
                observed = any(b['act'] == act and (stop is None or b['floor'] <= stop) for b in r['bosses'])
                crossed = any(a > act and (stop is None or r['act_entry_floors'][str(a)] <= stop) for a in r['entered_acts'])
                won_act = (r['victory'] if mode == 'final' else r['first_attempt']['victory']) and (r.get('max_act') or 0) >= act
                death_room = r.get('death_room') if mode == 'final' else r.get('first_death_room')
                reached.append(True if observed or crossed or won_act else False if death_room in ('hallway', 'elite', 'event', 'rest', 'shop') else None)
                inferred += int(not observed and (crossed or won_act))
            roads[str(act)] = share(reached)
            roads[str(act)]['reached_inferred_from_observed_progression'] = inferred
        result[mode]['act_road_reach_observed_boss'] = roads
    return result


def report(rows):
    blocks = [{'first': i + 1, 'last': min(i + 10, len(rows)), 'complete': len(rows[i:i+10]) == 10,
               **summarize(rows[i:i+10])} for i in range(0, len(rows), 10)]
    groups = {}
    for field in ('release', 's_phase'):
        grouped = collections.defaultdict(list)
        for row in rows:
            grouped[row[field]].append(row)
        groups[field] = {k: summarize(v) for k, v in grouped.items()}
    return {'schema': 'global-build-funnel-v1', 'cohort': 'approved gap descriptive Silent A10 V5; not native-source admission',
            'first_attempt_definition': 'eval.metrics.first_attempt / ops snapshot: earliest predicted_death stops run',
            'boss_definition': 'actual boss room + exact encounter; retries collapsed; unknown retained',
            'blocks_of_ten': blocks, 'segments': groups, 'total': summarize(rows), 'per_run': rows}


def markdown(data):
    out = ['# V5 固定分段漏斗', '', '描述性 gap 局集合；账号/原生模型门槛未在此验收。首试沿 ops 战绩快照；固定层仅为历史漏斗代理，各 Boss 率按实际战斗。未知不作零，路上到达可由实际跨幕记录推出，单独计数。', '']
    groups = [('全部', data['total'])] + [(f"第{b['first']}–{b['last']}局" + ('' if b['complete'] else '（尾段待满）'), b) for b in data['blocks_of_ten']]
    groups += [(f'{field}:{key}', value) for field, values in data['segments'].items() for key, value in values.items()]
    for mode, label in [('final', '最终（含SL）'), ('first_attempt', '首试停止口径')]:
        out += [f'## {label}', '', '| 分段 | n | ≥F17 | ≥F18 | ≥F33 | ≥F34 | ≥F48 | ≥F49 | 通关 | 均层 |',
                '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
        for name, item in groups:
            value = item[mode]
            out.append(f"| {name} | {item['n']} | " + ' | '.join(str(value['floor_milestones_proxy'][str(f)]) for f in (17,18,33,34,48,49)) + f" | {value['victories']} | {value['mean_floor']} |")
        out += ['', '| 实际Boss身份 | 已过/已知 | 未知 |', '|---|---:|---:|']
        for key, value in data['total'][mode]['boss_pass_rates'].items():
            out.append(f"| {key} | {value['passed']}/{value['known']} | {value['unknown']} |")
        out += ['', '| 幕路上到达Boss | 到达/已知 | 未知 | 跨幕推得 |', '|---|---:|---:|---:|']
        for key, value in data['total'][mode]['act_road_reach_observed_boss'].items():
            out.append(f"| A{key} | {value['passed']}/{value['known']} | {value['unknown']} | {value['reached_inferred_from_observed_progression']} |")
        out += ['', '死因房间：' + json.dumps(data['total'][mode]['death_rooms'], ensure_ascii=False), '']
    out += ['分段逐Boss/路上指标、局身份、开局开关及配置混用见同名 JSON。', '']
    return '\n'.join(out)


def from_exports(directory, versions):
    directory = Path(directory)
    runs = exported(directory / 'runs-since-20261012.json')
    configs = exported(directory / 'run_config.json')
    selected, excluded = cohort(runs, configs, versions)
    fights, floors, sl = [group_rows(exported(directory / f'{name}.json')) for name in ('fights', 'floors', 'sl_attempts')]
    data = report([run_record(r, fights[r['run_id']], floors[r['run_id']], sl[r['run_id']]) for r in selected])
    data['excluded'] = excluded
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    data = from_exports(args.inputs, json.loads((ROOT / 'eval/versions.json').read_text())['versions'])
    output = Path(args.output)
    output.with_suffix('.json').write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n')
    output.with_suffix('.md').write_text(markdown(data))


if __name__ == '__main__':
    main()
