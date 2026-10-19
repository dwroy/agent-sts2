#!/usr/bin/env python3
"""Read-only V6 supervision. Missing observations remain unknown; no model or game calls."""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import statistics

KINDS = ('act', 'replan', 'card_pick', 'potion', 'shop', 'rest', 'combat_line')
JEV_KINDS = set(KINDS[2:])
# Retain measurements only, never prompt/answer bodies or embedded state snapshots.
FIELDS = set(('ts run_id run fingerprint kind stage mode question_id decision_id label screen character ascension '
              'v6 elapsed_ms jev_answer fallback degradation unknown triggers merged_triggers skipped_triggers '
              'v6_brain_calls v6_error v6_projection_error engine error latency_ms primary_ms reused_answer decider deepseek '
              'escalation deepseek_fallback gate_reject result').split())


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def instant(value):
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return parsed.timestamp() if parsed.tzinfo else None
    except (AttributeError, TypeError, ValueError):
        return None


def percentile(values, q):
    values = sorted(v for v in values if number(v) and v >= 0)
    if not values:
        return None
    at = (len(values) - 1) * q
    lo, hi = math.floor(at), math.ceil(at)
    return values[lo] + (values[hi] - values[lo]) * (at - lo)


def timing(values):
    values = [v for v in values if number(v) and v >= 0]
    return {'n': len(values), 'p50_ms': percentile(values, .5), 'p90_ms': percentile(values, .9),
            'max_ms': max(values) if values else None}


def run_id(row):
    value = row.get('run_id') or row.get('run')
    if not value:
        try:
            value = json.loads(row.get('fingerprint', '{}')).get('run')
        except (ValueError, TypeError, AttributeError):
            pass
    return str(value) if value else None


def read_rows(path):
    """Bound to the initial byte length; a growing log is safe to observe without locking its writer."""
    path = Path(path)
    info = {'path': str(path), 'present': path.is_file(), 'bytes': 0, 'sha256': None, 'invalid_lines': 0, 'partial_tail': False}
    rows, digest = [], hashlib.sha256()
    if not info['present']:
        return rows, info
    with path.open('rb') as handle:
        remaining = path.stat().st_size
        while remaining:
            line = handle.readline(remaining)
            if not line:
                break
            remaining -= len(line)
            digest.update(line)
            info['bytes'] += len(line)
            if not line.endswith(b'\n'):
                info['partial_tail'] = True
            try:
                row = json.loads(line)
                if not isinstance(row, dict):
                    raise ValueError('row is not an object')
                rows.append({k: v for k, v in row.items() if k in FIELDS})
            except (ValueError, UnicodeDecodeError):
                info['invalid_lines'] += 1
    info['sha256'] = digest.hexdigest()
    return rows, info


def unique(rows, fields):
    seen, out = set(), []
    for row in rows:
        # Timestamp participates: identical question IDs in later rooms are separate calls.
        key = tuple(json.dumps(row.get(f), sort_keys=True) for f in ('run_id', 'run') + fields)
        if key not in seen:
            seen.add(key)
            out.append(row)
    return out


def stage(row):
    if row.get('stage') in ('projection', 'trigger', 'decision', 'brain'):
        return row['stage']
    if row.get('kind') in ('act', 'replan') and row.get('elapsed_ms') == 0 and not row.get('jev_answer'):
        return 'trigger'
    if row.get('kind') in JEV_KINDS and (row.get('jev_answer') is not None or row.get('fallback')):
        return 'decision'
    return 'projection'


def metrics(build, decisions, plans, brains):
    build = unique(build, ('ts', 'question_id', 'kind', 'stage'))
    decisions = unique(decisions, ('ts', 'decision_id', 'fingerprint', 'label'))
    brains = unique(brains, ('ts', 'question_id', 'engine'))
    kinds, triggers, merged, skipped, degradation, errors = {}, Counter(), Counter(), Counter(), Counter(), Counter()
    unknown_count = unknown_total = measured_rows = 0
    trigger_seen = set()
    for kind in KINDS:
        rows = [r for r in build if r.get('kind') == kind]
        attempted = [r for r in rows if stage(r) == 'decision' and kind in JEV_KINDS]
        fallbacks = sum(bool(r.get('fallback')) for r in attempted)
        kinds[kind] = {'rows': len(rows), 'projection_ms': timing([r.get('elapsed_ms') for r in rows if stage(r) == 'projection']),
                       'brain_ms': timing([r.get('elapsed_ms') for r in rows if stage(r) == 'brain']),
                       'jev_ms': timing([r.get('elapsed_ms') for r in attempted]),
                       'logged_jev_questions': len(attempted), 'fallbacks': fallbacks,
                       'fallback_rate': fallbacks / len(attempted) if attempted else None}
    for row in build:
        if stage(row) == 'trigger':
            for name, target in (('triggers', triggers), ('merged_triggers', merged), ('skipped_triggers', skipped)):
                for signal in set(str(v) for v in row.get(name, [])):
                    key = (run_id(row), row.get('question_id') or row.get('ts'), name, signal)
                    if key not in trigger_seen:
                        target[signal] += 1
                        trigger_seen.add(key)
        degradation.update(set(str(v) for v in row.get('degradation', [])))
        unknown = row.get('unknown') or {}
        count, total = unknown.get('count'), unknown.get('total')
        if number(count) and number(total) and 0 <= count <= total and total > 0 and stage(row) not in ('trigger', 'brain'):
            unknown_count += count
            unknown_total += total
            measured_rows += 1
        if row.get('fallback'):
            errors[str(row['fallback'])] += 1
    for row in decisions:
        if row.get('mode') not in (None, 'play'):
            continue
        for name in ('deepseek_fallback', 'gate_reject'):
            if row.get(name):
                errors[name] += 1
        result = str(row.get('result', ''))
        if any(s in result.lower() for s in ('error', 'failed', 'refused')):
            errors['decision_dispatch_error'] += 1
    for row in plans:
        if row.get('v6_error'):
            errors['v6_planner_error'] += 1
        if row.get('v6_projection_error'):
            errors['v6_projection_error'] += 1
    for row in brains:
        if row.get('error'):
            errors['brain_error'] += 1
    calls = [r.get('v6_brain_calls') for r in plans if number(r.get('v6_brain_calls'))]
    observed_brain = [r for r in decisions if not r.get('reused_answer') and
                      (r.get('decider') in ('codex', 'claude', 'deepseek') or r.get('deepseek') or r.get('escalation'))]
    # Auxiliary journals cover plans which have no dispatched decision row, and count reservations before a failed call.
    brain_questions = len({(run_id(r), r['question_id']) for r in brains if r.get('question_id')}) if brains else None
    return {'kinds': kinds, 'unknown': {'count': unknown_count, 'total': unknown_total,
            'fraction': unknown_count / unknown_total if unknown_total else None, 'measured_rows': measured_rows},
            'degradation': {'events': sum(bool(r.get('degradation')) for r in build), 'reasons': dict(degradation)},
            'triggers': {t: triggers[t] for t in ('act_start', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7')},
            'merged_triggers': dict(merged), 'skipped_triggers': dict(skipped),
            'brain': {'v6_reserved_max': max(calls) if calls else None, 'logged_questions': brain_questions,
                      'decision_observations_lower_bound': len(observed_brain)},
            'errors': dict(errors), 'decision_rows': len(decisions)}


def advice(m, budgets, thresholds):
    """Operational suggestions only. Unknown coverage is separate from service faults."""
    out = []
    for kind, value in m['kinds'].items():
        if value['logged_jev_questions'] >= thresholds['min_questions'] and value['fallback_rate'] >= thresholds['fallback_rate']:
            switch = {'card_pick': 'V6_CARD_DECIDER=brain', 'potion': 'V6_POTION_DECIDER=brain',
                      'shop': 'V6_SHOP_DECIDER=brain', 'rest': 'V6_REST_DECIDER=brain',
                      'combat_line': 'V6_COMBAT_ENTRIES=off'}.get(kind)
            out.append({'reason': f'{kind}:fallback_rate', 'action': switch, 'severity': 'consider_rollback'})
        for name, allowance in (('jev_ms', budgets.get('combat_jev_ms') if kind == 'combat_line' else budgets.get('jev_ms', 5000)), ('projection_ms', budgets.get('act_ms', 60000) if kind in ('act', 'replan') else budgets.get('pick_ms', 5000)), ('brain_ms', budgets.get('brain_ms', 90000))):
            if allowance is not None and value[name]['n'] and value[name]['max_ms'] > allowance + thresholds['overrun_ms']:
                out.append({'reason': f'{kind}:{name}:budget_overrun', 'action': 'inspect bounded in-flight work; consider V6_BUILD=off', 'severity': 'investigate'})
    fraction = m['unknown']['fraction']
    if fraction is None or fraction >= thresholds['unknown_rate']:
        out.append({'reason': 'projection_coverage_unknown', 'action': 'verify own-character knowledge/hash/trust/route inputs; do not infer decision quality', 'severity': 'coverage'})
    calls = m['brain']['v6_reserved_max']
    if calls is not None and calls > budgets.get('brain_soft_cap', 15):
        out.append({'reason': 'brain_soft_cap_exceeded', 'action': 'inspect retained act_start/T5/T7 calls; excess alone is allowed', 'severity': 'investigate'})
    if any(m['errors'].get(k) for k in ('decision_dispatch_error', 'gate_reject', 'v6_planner_error', 'v6_projection_error', 'brain_request_failed')):
        out.append({'reason': 'dispatch_error_or_gate_rejection', 'action': 'ops inspect original decision receipt; consider V6_BUILD=off and V6_COMBAT_ENTRIES=off', 'severity': 'consider_rollback'})
    return out


def report(inputs, v5_runs=(), thresholds=None):
    thresholds = thresholds or {'min_questions': 5, 'fallback_rate': .2, 'unknown_rate': .5, 'overrun_ms': 1000}
    grouped = {name: defaultdict(list) for name in inputs}
    for name, rows in inputs.items():
        for row in rows:
            if name == 'decisions' and row.get('mode') not in (None, 'play'):
                continue
            rid = run_id(row)
            if rid:
                grouped[name][rid].append(row)
    ids = set().union(*(set(g) for g in grouped.values()))
    results = []
    for rid in ids:
        own = {k: grouped[k].get(rid, []) for k in grouped}
        configs = sorted(own.get('configs', []), key=lambda r: instant(r.get('ts')) or 0)
        config = configs[-1] if configs else {}
        modes = sorted({(r.get('v6') or {}).get('mode', 'off') for r in configs} | {r.get('mode') for r in own.get('build', []) if r.get('mode') in ('on', 'shadow')})
        v6 = any(mode != 'off' for mode in modes)
        if not v6 and rid not in v5_runs:
            continue
        decisions = own.get('decisions', [])
        starts = [instant(r.get('ts')) for r in configs + decisions]
        starts = [v for v in starts if v is not None]
        ends = [instant(r.get('ts')) for r in decisions]
        ends = [v for v in ends if v is not None]
        start, end = min(starts) if starts else None, max(ends) if ends else None
        m = metrics(own.get('build', []), decisions, own.get('plans', []), own.get('brains', []))
        results.append({'run_id': rid, 'v6': v6, 'modes': modes, 'config_restarts': max(0, len(configs) - 1),
                        'character': config.get('character'), 'ascension': config.get('ascension'), 'start_epoch': start,
                        'observed_window_s': end - start if start is not None and end is not None and end >= start else None,
                        'completion': 'terminal_observed' if any(r.get('screen') == 'GAME_OVER' for r in decisions) else 'completion_unverified',
                        **m, 'advice': advice(m, (config.get('v6') or {}).get('budgets', {}), thresholds),
                        'baseline': None})
    results.sort(key=lambda r: (r['start_epoch'] if r['start_epoch'] is not None else math.inf, r['run_id']))
    baseline = [r for r in results if r['run_id'] in v5_runs and not r['v6']]
    for row in results:
        values = [b['observed_window_s'] for b in baseline if b['character'] == row['character'] and b['ascension'] == row['ascension']
                  and b['start_epoch'] is not None and row['start_epoch'] is not None and b['start_epoch'] < row['start_epoch']
                  and b['observed_window_s'] is not None]
        med = statistics.median(values) if values else None
        row['baseline'] = {'selected_pre_v6_n': len(values), 'median_observed_window_s': med,
                           'ratio': row['observed_window_s'] / med if med and row['observed_window_s'] is not None else None}
    v6_runs = [r for r in results if r['v6']]
    batches = []
    for offset in range(0, len(v6_runs), 10):
        batch = v6_runs[offset:offset + 10]
        batch_ids = {r['run_id'] for r in batch}
        own = {name: [r for rid in batch_ids for r in grouped[name].get(rid, [])] for name in grouped}
        m = metrics(own.get('build', []), own.get('decisions', []), own.get('plans', []), own.get('brains', []))
        counts = [r['brain']['v6_reserved_max'] for r in batch if r['brain']['v6_reserved_max'] is not None]
        m['brain']['v6_reserved_sum'] = sum(counts) if counts else None
        m['brain']['runs_with_reservations'] = len(counts)
        batches.append({'batch': offset // 10 + 1, 'runs': [r['run_id'] for r in batch], 'complete_ten': len(batch) == 10,
                        'observed_window_s': {'n': sum(r['observed_window_s'] is not None for r in batch),
                          'median': statistics.median([r['observed_window_s'] for r in batch if r['observed_window_s'] is not None]) if any(r['observed_window_s'] is not None for r in batch) else None}, **m})
    return {'schema': 'v6-health-v1', 'thresholds': thresholds, 'runs': results, 'batches_of_ten': batches,
            'limits': ['Read-only operational telemetry; no game actions or automatic rollback.',
                       'Observed windows include pauses/restarts and may omit run boundaries; they are not complete-run or causal speed measurements.',
                       'Jev counts are logged question outcomes, not HTTP attempts/retries; legacy stages are inferred.',
                       'Unknown fractions are row-weighted recorded entry occurrences, not unique cards or simulation quality.',
                       'Brain journal reservations include failures, exclude retries; decision-only observations are a lower bound.',
                       'V5 comparisons use only explicitly selected earlier runs of the same character and ascension; none are started.']}


def markdown(value):
    def show(v):
        return 'unknown' if v is None else f'{v:.3f}' if isinstance(v, float) else str(v)
    def table(kinds):
        lines = ['| 题型 | 计算 p50/p90/max ms | Jev p50/p90/max ms | 大脑 p50/p90/max ms | 题数/兜底/率 |', '|---|---|---|---|---|']
        for kind, m in kinds.items():
            if not m['rows']:
                continue
            span = lambda name: '/'.join(show(m[name][k]) for k in ('p50_ms', 'p90_ms', 'max_ms'))
            lines.append(f"| {kind} | {span('projection_ms')} | {span('jev_ms')} | {span('brain_ms')} | {m['logged_jev_questions']}/{m['fallbacks']}/{show(m['fallback_rate'])} |")
        return lines
    lines = ['# V6 每局健康报告', '', '只读监督；建议不执行回退。完整分母与原件哈希见 JSON。', '']
    for run in value['runs']:
        if not run['v6']:
            continue
        lines += [f"## {run['run_id']}", '', f"角色 {run['character']} A{run['ascension']}；模式 {','.join(run['modes'])}；观测时长 {show(run['observed_window_s'])} 秒（{run['completion']}）。", '']
        lines += table(run['kinds'])
        baseline = run['baseline']
        lines += ['', f"已有 V5 基线 {baseline['selected_pre_v6_n']} 局，观测时长中位数 {show(baseline['median_observed_window_s'])} 秒，本局/基线 {show(baseline['ratio'])}；缺基线保持 unknown。"]
        lines += ['', f"未知 {run['unknown']['count']}/{run['unknown']['total']}（{show(run['unknown']['fraction'])}）；降级 {run['degradation']['events']}；大脑预约 {show(run['brain']['v6_reserved_max'])}，日志题数 {show(run['brain']['logged_questions'])}。",
                  '', f"触发：{json.dumps(run['triggers'], ensure_ascii=False)}；报错：{json.dumps(run['errors'], ensure_ascii=False)}。", '']
        lines += [f"- {a['severity']}: {a['reason']} → {a['action']}" for a in run['advice']]
        lines.append('')
    lines += ['## 每十局汇总', '']
    for batch in value['batches_of_ten']:
        lines += [f"### 第 {batch['batch']} 组", '', f"{len(batch['runs'])}/10 局，观测时长中位数 {show(batch['observed_window_s']['median'])} 秒，未知 {show(batch['unknown']['fraction'])}，降级 {batch['degradation']['events']}，大脑预约总数 {show(batch['brain']['v6_reserved_sum'])}。", '']
        lines += table(batch['kinds'])
        lines += ['', f"触发：{json.dumps(batch['triggers'], ensure_ascii=False)}；报错：{json.dumps(batch['errors'], ensure_ascii=False)}。", '']
    lines += ['', '## 输入检查', '']
    for name, source in value.get('sources', {}).items():
        if not source['present'] or source['invalid_lines'] or source['partial_tail']:
            lines.append(f"- {name}: present={source['present']}，无效行 {source['invalid_lines']}，末行未封口 {source['partial_tail']}。缺失或坏行未计入分母，请核原件。")
    lines += ['', '## 测量限制', ''] + [f'- {s}' for s in value['limits']]
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--logs', type=Path, default=Path('logs'))
    parser.add_argument('--plans', type=Path, help='Override RUN_PLAN_LOG path')
    parser.add_argument('--brains', type=Path, help='Override BRAIN_LOG path')
    parser.add_argument('--run', action='append', default=[], help='Report selected runs; omission reports all recorded V6 runs')
    parser.add_argument('--v5-run', action='append', default=[], help='Existing pre-release baseline only; no new V5 games')
    parser.add_argument('--out', type=Path, required=True, help='Writes .json and .md; never overwrites source logs')
    args = parser.parse_args()
    inputs, sources = {}, {}
    for name, file in (('build', 'v6-build.jsonl'), ('decisions', 'decisions.jsonl'), ('configs', 'run-config.jsonl'),
                       ('plans', 'run-plans.jsonl'), ('brains', 'brain.jsonl')):
        path = args.plans if name == 'plans' and args.plans else args.brains if name == 'brains' and args.brains else args.logs / file
        inputs[name], sources[name] = read_rows(path)
    value = report(inputs, args.v5_run)
    if args.run:
        value['runs'] = [r for r in value['runs'] if r['run_id'] in args.run]
    value.update({'generated_at': datetime.now(timezone.utc).isoformat(), 'sources': sources})
    if args.out.resolve() in {Path(s['path']).resolve() for s in sources.values()} or any(args.out.with_suffix(suffix).resolve() in {Path(s['path']).resolve() for s in sources.values()} for suffix in ('.json', '.md')):
        parser.error('output must not overwrite input logs')
    for suffix, data in (('.json', json.dumps(value, ensure_ascii=False, indent=2) + '\n'), ('.md', markdown(value))):
        target = args.out.with_suffix(suffix)
        if target.resolve() in {Path(s['path']).resolve() for s in sources.values()}:
            parser.error('output must not overwrite input logs')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(data, encoding='utf8')
    print(f"{len(value['runs'])} runs; {args.out.with_suffix('.json')}; {args.out.with_suffix('.md')}")


if __name__ == '__main__':
    main()
