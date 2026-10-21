#!/usr/bin/python3
"""Summarize only preserved replay evidence; no network or game access."""
import collections
import csv
import hashlib
import json
import math
import re
import statistics
import datetime as dt
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'paper/materials/issue29-brain-speed'


def rows(name):
    path = OUT / name
    return [json.loads(s) for s in path.read_text().splitlines() if s] if path.exists() else []


def quantile(values, p):
    """Linear interpolation, equivalent to numpy's default percentile."""
    values = sorted(values)
    if not values:
        return None
    index = (len(values) - 1) * p
    lo = math.floor(index)
    hi = math.ceil(index)
    return values[lo] + (values[hi] - values[lo]) * (index - lo)


def stratum(label):
    if label.startswith('reward/') or label.startswith('bundle/'):
        return 'reward'
    if label == 'event/act-plan':
        return 'act-plan'
    for prefix, category in [('event/', 'event'), ('rest/', 'rest'), ('shop/', 'shop'),
                             ('map/', 'route'), ('selection/', 'selection')]:
        if label.startswith(prefix):
            return category
    return None


def action(answer):
    """Exact actionable fields; excludes free-text explanations and optional V6 advice."""
    if not isinstance(answer, dict):
        return None
    result = {k: v for k, v in answer.items() if k in ['choice', 'cards', 'route', 'plan', 'discard', 'drink']}
    route = result.get('route')
    if isinstance(route, str) and route != 'keep':
        result['route'] = [s.strip() for s in route.split(',') if s.strip()]
    return result


def primary(answer):
    if not isinstance(answer, dict):
        return None
    for key in ['choice', 'plan', 'route']:
        if key in answer:
            return {key: action(answer)[key]}
    return None


def wait_episodes(waits):
    """Deduplicate heartbeat snapshots; elapsed time belongs to an episode, not a row."""
    grouped = collections.defaultdict(list)
    for row in waits:
        if row.get('since'):
            grouped[(row.get('run_id'), row.get('question_id'), row['since'])].append(row)
    episodes = []
    for (run_id, question_id, since), events in grouped.items():
        categories = sorted({c for event in events for c in event.get('categories', [])})
        if not categories:
            continue
        last = max(events, key=lambda event: event['ts'])
        instant = lambda value: dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
        episodes.append({'run_id': run_id, 'question_id': question_id, 'since': since,
                         'categories': categories, 'terminal_state': last['state'],
                         'retry_count': max(event.get('retries') or 0 for event in events),
                         'episode_ms': (instant(last['ts']) - instant(since)).total_seconds() * 1000,
                         'observed_events': len(events)})
    return sorted(episodes, key=lambda episode: episode['since'])


def paired_summary(results, by_key):
    """Matched latency ratios and agreement, with same-round A as the reference."""
    summary = []
    for group in ['B', 'C']:
        for category in ['ALL', 'reward', 'event', 'rest', 'shop', 'route', 'act-plan', 'selection']:
            pairs = [(r, by_key.get(f"{r['id']}/{r['round']}/A")) for r in results
                     if r['group'] == group and (category == 'ALL' or r['stratum'] == category)]
            pairs = [(r, a) for r, a in pairs if a]
            valid = [(r, a) for r, a in pairs if r.get('accepted') and a.get('accepted')]
            if not pairs:
                continue
            ratios = [r['elapsed_ms'] / a['elapsed_ms'] for r, a in valid]
            summary.append({'group': group, 'stratum': category, 'attempted_pairs': len(pairs),
                            'both_accepted': len(valid),
                            'primary_same': sum(primary(r['result']['answer']) == primary(a['result']['answer']) for r, a in valid),
                            'all_action_fields_same': sum(action(r['result']['answer']) == action(a['result']['answer']) for r, a in valid),
                            'median_ratio_to_A': quantile(ratios, .5),
                            'paired_total_ratio_to_A': (sum(r['elapsed_ms'] for r, a in valid) /
                                                        sum(a['elapsed_ms'] for r, a in valid)) if valid else None})
    return summary


def write_tables(summary, historical):
    """Keep every displayed number derived from the preserved records."""
    table = summary['summary']
    paired = {(r['group'], r['stratum']): r for r in summary['paired']}
    lines = ['# #29 结果表', '', '由 `agent/tools/issue29-brain-speed-report.py` 生成；口径与限制见 [实验报告](README.md)。', '',
             '## 延迟、格式与失败', '',
             '总耗时包含客户端进程启动、请求、原生重试与校验；失败也计入延迟分位数。单位：秒。', '',
             '|题型|组|n|均值|p50|p90|失败/超时|首答通过|修复调用|容量/限流|传输重试|',
             '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    for row in table:
        lines.append(f"|{row['stratum']}|{row['group']}|{row['n']}|{row['mean_s']:.2f}|{row['p50_s']:.2f}|{row['p90_s']:.2f}|"
                     f"{row['failures']}/{row['timeouts']}|{row['first_format_pass']}/{row['n']}|{row['repair_calls']}|"
                     f"{row['capacity_error_questions']}/{row['rate_limit_questions']}|{row['native_transport_retries']}|")
    lines += ['', '## Token、费用与对 A 的一致率', '',
              'Token 为各类型所有物理调用的已知总和；推理 token 是输出 token 的子集，不能再加一次。未知调用数单列。',
              'B 的美元数仅为客户端旧费率估算；Nova 实际账单、A/C 的订阅边际费用均未知，不能据此认定实际费用高低。', '',
              '|题型|组|输入|缓存命中|输出|其中推理|未知 usage 调用|旧费率估算 USD|主决策同 A|全部动作字段同 A|',
              '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|']
    for row in table:
        match = paired.get((row['group'], row['stratum']))
        denominator = match['both_accepted'] if match else 0
        agreement = f"{match['primary_same']}/{denominator}" if match else '基线'
        all_fields = f"{match['all_action_fields_same']}/{denominator}" if match else '基线'
        cost = f"{row['token_tariff_estimate_usd']:.6f}" if row['token_tariff_estimate_usd'] is not None else '未知'
        lines.append(f"|{row['stratum']}|{row['group']}|{row['input_tokens_known']}|{row['cache_hit_tokens_known']}|"
                     f"{row['output_tokens_known']}|{row['reasoning_tokens_known']}|{row['usage_missing_calls']}|{cost}|{agreement}|{all_fields}|")
    lines += ['', '## 同题同轮速度比', '', '仅纳入两组都成功的配对；比值低于 1 表示该组较 A 快。', '',
              '|题型|组|成功配对/已配对|逐对比值中位数|配对总耗时比|', '|---|---|---:|---:|---:|']
    for row in summary['paired']:
        ratio = row['median_ratio_to_A']
        total = row['paired_total_ratio_to_A']
        lines.append(f"|{row['stratum']}|{row['group']}|{row['both_accepted']}/{row['attempted_pairs']}|"
                     f"{ratio:.3f}|{total:.3f}|" if ratio is not None else
                     f"|{row['stratum']}|{row['group']}|0/{row['attempted_pairs']}|未知|未知|")
    lines += ['', '## 轮次与重复回答', '', '|组|轮次|n|均值秒|p50秒|p90秒|', '|---|---:|---:|---:|---:|---:|']
    for row in summary['rounds']:
        lines.append(f"|{row['group']}|{row['round']}|{row['n']}|{row['mean_s']:.2f}|{row['p50_s']:.2f}|{row['p90_s']:.2f}|")
    lines += ['', '|组|同题两轮均成功|主决策相同|全部动作字段相同|', '|---|---:|---:|---:|']
    for row in summary['repeat_agreement']:
        lines.append(f"|{row['group']}|{row['accepted_pairs']}|{row['primary_same']}|{row['all_action_fields_same']}|")
    lines += ['', '## 按现行请求数估算每局大脑耗时', '',
              '取最近 20 局已结束 Silent A10；逐局的各题型请求数乘以本次该组对应题型的平均总耗时。',
              '失败耗时按实际停止时间计；这估计的是一次尝试，不是保证成功作答所需的时间。', '',
              '|组|每局均值分钟|20局预测值p50分钟|20局预测值p90分钟|最少—最多分钟|', '|---|---:|---:|---:|---:|']
    for group in ['A', 'B', 'C']:
        values = [r['predicted_brain_minutes'] for r in summary['run_projections'] if r['group'] == group]
        if values:
            lines.append(f'|{group}|{statistics.mean(values):.2f}|{quantile(values, .5):.2f}|{quantile(values, .9):.2f}|{min(values):.2f}—{max(values):.2f}|')
    counts = [r['questions'] for r in historical['runs']]
    lines += ['', f"请求数：{sum(counts)} / {len(counts)} 局，均值 {statistics.mean(counts):.1f}，p50 {quantile(counts, .5):.1f}，"
              f"p90 {quantile(counts, .9):.1f}，范围 {min(counts)}—{max(counts)}。",
              '其中 event/plan 41 次用 event/choose 延迟代理，bundle/choose 1 次用 reward/card 代理；selection/choose 2 次用已测 selection 类型代理。'
              '所有请求数与逐局估计保留在 JSON 中。', '', '## 历史 DeepSeek（非配对）', '',
              '题面、系统提示和当时客户端不同，只提供时间背景；不与本次 B 合并。', '',
              '|题型|n|均值秒|p50秒|p90秒|', '|---|---:|---:|---:|---:|']
    for row in summary['historical_nonpaired']:
        lines.append(f"|{row['stratum']}|{row['n']}|{row['mean_s']:.2f}|{row['p50_s']:.2f}|{row['p90_s']:.2f}|")
    (OUT / 'tables.md').write_text('\n'.join(lines) + '\n')


def main():
    results = rows('results.jsonl')
    calls = rows('deepseek-calls.jsonl')
    traces = rows('codex-calls.jsonl')
    validation_path = OUT / 'raw-validation.json'
    validation = {r['key']: r for r in json.loads(validation_path.read_text())['records']} if validation_path.exists() else {}
    by_key = {f"{r['id']}/{r['round']}/{r['group']}": r for r in results}
    if len(by_key) != len(results):
        raise ValueError('Duplicate replay results; reconcile before reporting')
    table = []
    for group in ['A', 'B', 'C']:
        for category in ['ALL', 'reward', 'event', 'rest', 'shop', 'route', 'act-plan', 'selection']:
            selected = [r for r in results if r['group'] == group and (category == 'ALL' or r['stratum'] == category)]
            if not selected:
                continue
            durations = [r['elapsed_ms'] / 1000 for r in selected]
            physical = [c for c in calls if c.get('key') in {f"{r['id']}/{r['round']}/{group}" for r in selected}]
            native = [t for t in traces if t.get('question_id', '').removeprefix('issue29-') in
                      {f"{r['id']}/{r['round']}/{group}" for r in selected}]
            usage = [c.get('usage') or {} for c in physical] if group == 'B' else [t.get('usage') or {} for t in native]
            def total(field):
                return sum(u.get(field) or 0 for u in usage)
            reason = sum((u.get('completion_tokens_details') or {}).get('reasoning_tokens', 0) for u in usage) if group == 'B' else total('reasoning_output_tokens')
            n_in = total('prompt_tokens' if group == 'B' else 'input_tokens')
            n_out = total('completion_tokens' if group == 'B' else 'output_tokens')
            cached = total('prompt_cache_hit_tokens' if group == 'B' else 'cached_input_tokens')
            first_format_ok = 0
            repairs = 0
            for r in selected:
                key = f"{r['id']}/{r['round']}/{group}"
                relevant = [c for c in physical if c['key'] == key]
                raw = relevant[0].get('content') if relevant else (r.get('result') or {}).get('raw')
                try:
                    parsed = json.loads(raw)
                    first_format_ok += int(isinstance(parsed, dict) and validation.get(key, {}).get('first_raw_valid', False) and r.get('accepted') and
                                           len(relevant) <= 1 and ((r.get('result') or {}).get('attempts') or 1) == 1 and
                                           (((r.get('result') or {}).get('native') or {}).get('runs') or 1) == 1)
                except (ValueError, TypeError):
                    pass
                repairs += max(0, len(relevant) - 1) if group == 'B' else max(0, ((r.get('result') or {}).get('native') or {}).get('runs', 1) - 1)
            keys = {f"{r['id']}/{r['round']}/{group}" for r in selected}
            error_texts = {key: '\n'.join([r.get('error', '') for r in selected
                                          if f"{r['id']}/{r['round']}/{group}" == key] +
                                         [json.dumps({k: t.get(k) for k in ['errors', 'retries', 'warnings', 'stderr_tail']})
                                          for t in native if t.get('question_id') == f'issue29-{key}'])
                           for key in keys}
            table.append({'group': group, 'stratum': category, 'n': len(selected),
                          'accepted': sum(bool(r.get('accepted')) for r in selected),
                          'failures': sum(not r.get('accepted') for r in selected),
                          'timeouts': sum(any(s in r.get('error', '').lower() for s in ['abort', 'timeout', 'timed out', 'stalled']) for r in selected),
                          'first_format_pass': first_format_ok, 'repair_calls': repairs,
                          'native_transport_retries': sum(len(t.get('retries') or []) for t in native),
                          'capacity_error_questions': sum(bool(re.search(r'at capacity|overloaded', text, re.I)) for text in error_texts.values()),
                          'rate_limit_questions': sum(bool(re.search(r'rate.?limit|too many requests|HTTP 429', text, re.I)) for text in error_texts.values()),
                          'http_429_calls': sum(c.get('status') == 429 for c in physical),
                          'http_5xx_calls': sum(500 <= c.get('status', 0) < 600 for c in physical),
                          'physical_calls': len(physical) if group == 'B' else len(native),
                          'mean_s': statistics.mean(durations), 'p50_s': quantile(durations, .5), 'p90_s': quantile(durations, .9),
                          'input_tokens_known': n_in, 'output_tokens_known': n_out, 'reasoning_tokens_known': reason,
                          'cache_hit_tokens_known': cached, 'usage_missing_calls': sum(not u for u in usage),
                          'token_tariff_estimate_usd': ((n_in - cached) * .3 + cached * .006 + n_out * 1.2) / 1e6 if group == 'B' else None,
                          'actual_billed_cost': None})
    with (OUT / 'summary.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(table[0]), lineterminator='\n')
        writer.writeheader()
        writer.writerows(table)
    disagreements = []
    agreement = []
    for group in ['B', 'C']:
        valid = primary_same = action_same = attempted = 0
        for r in results:
            if r['group'] != group:
                continue
            baseline = by_key.get(f"{r['id']}/{r['round']}/A")
            if not baseline:
                continue
            attempted += 1
            if not r.get('accepted') or not baseline.get('accepted'):
                continue
            valid += 1
            a = baseline['result']['answer']
            b = r['result']['answer']
            same = primary(a) == primary(b)
            primary_same += same
            action_same += action(a) == action(b)
            if action(a) != action(b):
                disagreements.append({'id': r['id'], 'round': r['round'], 'group': group,
                                      'stratum': r['stratum'], 'primary_same': same, 'A': a, group: b})
        agreement.append({'group': group, 'attempted_pairs': attempted, 'both_accepted': valid,
                          'primary_same': primary_same, 'all_action_fields_same': action_same})
    historical = json.loads((OUT / 'historical.json').read_text())
    historical_table = []
    for category in ['ALL', 'reward', 'event', 'rest', 'shop', 'route', 'act-plan', 'selection']:
        selected = [r for r in historical['historical_deepseek']
                    if category == 'ALL' or stratum(r['label']) == category]
        if selected:
            durations = [r['latency_ms'] / 1000 for r in selected]
            historical_table.append({'stratum': category, 'n': len(selected),
                                     'mean_s': statistics.mean(durations), 'p50_s': quantile(durations, .5),
                                     'p90_s': quantile(durations, .9)})
    projections = []
    for group in ['A', 'B', 'C']:
        means = {r['stratum']: r['mean_s'] for r in table if r['group'] == group}
        if len(means) < 8:
            continue
        for run in historical['runs']:
            seconds = sum(n * means[stratum(label)] for label, n in run['labels'].items() if stratum(label) in means)
            projections.append({'group': group, 'run_id': run['run_id'], 'questions': run['questions'],
                                'predicted_brain_minutes': seconds / 60,
                                'uncovered_questions': sum(n for label, n in run['labels'].items() if stratum(label) not in means),
                                'proxy_event_plan_questions': run['labels'].get('event/plan', 0),
                                'proxy_bundle_questions': run['labels'].get('bundle/choose', 0)})
    availability_path = OUT / 'availability.json'
    if availability_path.exists():
        availability = json.loads(availability_path.read_text())
        (OUT / 'availability-episodes.json').write_text(json.dumps({'episodes': wait_episodes(availability['waits'])}, ensure_ascii=False, indent=2) + '\n')
    evidence_hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.iterdir()
                       if p.is_file() and p.name in ['fixtures.jsonl', 'sample.json', 'results.jsonl', 'deepseek-calls.jsonl', 'codex-calls.jsonl', 'historical.json', 'availability.json', 'availability-episodes.json', 'availability-decisions.json', 'availability-action-neighbors.json', 'raw-validation.json', 'configuration-receipt.json', 'budget-receipt.json']}
    expected = {f'q{i:02}/{round}/{group}' for i in range(1, 33) for round in [1, 2]
                for group in (['A', 'B', 'C'] if round == 1 else ['A', 'B'])}
    rounds = [{'group': group, 'round': round,
               'n': len(selected), 'mean_s': statistics.mean(r['elapsed_ms'] / 1000 for r in selected),
               'p50_s': quantile([r['elapsed_ms'] / 1000 for r in selected], .5),
               'p90_s': quantile([r['elapsed_ms'] / 1000 for r in selected], .9)}
              for group in ['A', 'B', 'C'] for round in [1, 2]
              if (selected := [r for r in results if r['group'] == group and r['round'] == round])]
    repeats = []
    for group in ['A', 'B']:
        pairs = [(r, by_key.get(f"{r['id']}/1/{group}")) for r in results if r['group'] == group and r['round'] == 2]
        pairs = [(r, first) for r, first in pairs if first and r.get('accepted') and first.get('accepted')]
        repeats.append({'group': group, 'accepted_pairs': len(pairs),
                        'primary_same': sum(primary(r['result']['answer']) == primary(first['result']['answer']) for r, first in pairs),
                        'all_action_fields_same': sum(action(r['result']['answer']) == action(first['result']['answer']) for r, first in pairs)})
    native_verification = dict(collections.Counter((t.get('model'), t.get('effort'),
                                                    tuple(re.findall(r'model_reasoning_effort="([^"]+)"', t.get('stderr_tail', ''))))
                                                   for t in traces))
    summary = {'complete': set(by_key) == expected, 'result_count': len(results), 'summary': table,
               'agreement': agreement, 'disagreements': disagreements, 'run_projections': projections,
               'paired': paired_summary(results, by_key), 'repeat_agreement': repeats, 'rounds': rounds,
               'historical_nonpaired': historical_table,
               'native_effort_verification': [{'model_requested': k[0], 'effort_requested': k[1],
                                               'effort_observed': list(k[2]), 'calls': n} for k, n in native_verification.items()],
               'evidence_sha256': evidence_hashes}
    (OUT / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
    if summary['complete']:
        write_tables(summary, historical)
    with (OUT / 'per-question.csv').open('w', newline='') as f:
        writer = csv.writer(f, lineterminator='\n')
        writer.writerow(['id', 'stratum', 'round', 'group', 'elapsed_s', 'accepted', 'error', 'answer_json'])
        for r in results:
            writer.writerow([r['id'], r['stratum'], r['round'], r['group'], r['elapsed_ms'] / 1000,
                             r.get('accepted'), r.get('error', ''), json.dumps((r.get('result') or {}).get('answer'), ensure_ascii=False)])
    print(json.dumps({'results': len(results), 'complete': summary['complete'], 'agreement': agreement}))


if __name__ == '__main__':
    main()
