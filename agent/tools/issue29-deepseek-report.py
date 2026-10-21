#!/usr/bin/python3
"""Offline analysis of frozen issue #29 streaming evidence. Never reads credentials."""
import collections
import csv
import hashlib
import importlib.util
import json
import statistics as stats
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ORIGINAL = ROOT / 'paper/materials/issue29-brain-speed'
OUT = ORIGINAL / 'deepseek-followup'
LOCAL = ROOT / 'data/issue29-followup'
spec = importlib.util.spec_from_file_location('original_report', Path(__file__).with_name('issue29-brain-speed-report.py'))
old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)
quantile = old.quantile
TYPES = ['ALL', 'reward', 'event', 'rest', 'shop', 'route', 'act-plan', 'selection']


def rows(path):
    return [json.loads(s) for s in path.read_text().splitlines() if s]


def distribution(values):
    values = [x for x in values if x is not None]
    return {'n': len(values), 'mean': stats.mean(values) if values else None,
            'p50': quantile(values, .5), 'p90': quantile(values, .9)}


def tokens(row):
    usage = row.get('usage') or {}
    reason = (usage.get('completion_tokens_details') or {}).get('reasoning_tokens')
    completion = usage.get('completion_tokens')
    cached = usage.get('prompt_cache_hit_tokens')
    if cached is None:
        cached = (usage.get('prompt_tokens_details') or {}).get('cached_tokens')
    return {'input': usage.get('prompt_tokens'), 'cached': cached, 'output': completion,
            'reasoning': reason, 'answer': completion - reason if reason is not None and completion is not None else None}


def rates(row):
    output = tokens(row)['output']
    first = row.get('first_token_ms')
    last = max([v for v in [row.get('last_reasoning_ms'), row.get('last_content_ms')] if v is not None], default=None)
    return {'wall_tps': output * 1000 / row['elapsed_ms'] if output is not None else None,
            # SSE chunks may contain multiple tokens. This measures delivered generation, not native decoder speed.
            'stream_tps': output * 1000 / (last - first) if output is not None and first is not None and last is not None and last > first else None}


def pearson(pairs):
    if len(pairs) < 2:
        return None
    x, y = zip(*pairs)
    mx, my = stats.mean(x), stats.mean(y)
    xx = sum((v - mx) ** 2 for v in x)
    yy = sum((v - my) ** 2 for v in y)
    return sum((a - mx) * (b - my) for a, b in pairs) / (xx * yy) ** .5 if xx and yy else None


def summarize(selected):
    token_rows = [tokens(r) for r in selected]
    return {'n': len(selected), 'accepted': sum(bool(r.get('accepted')) for r in selected),
            'strict_raw_valid': sum(bool(r.get('first_raw_valid')) for r in selected),
            'stream_complete': sum(bool(r.get('stream_complete')) for r in selected),
            'recovered': sum(bool(r.get('recovered')) for r in selected),
            'timeouts': sum(r.get('error_class') in ['AbortError', 'TimeoutError'] or r['elapsed_ms'] >= r['timeout_ms'] - 1000 and not r['accepted'] for r in selected),
            'errors': dict(collections.Counter(r.get('error_code', 'no_error') for r in selected)),
            'repair_requests_blocked': sum(r['repair_requests_blocked'] for r in selected),
            'latency_s': distribution([r['elapsed_ms'] / 1000 for r in selected]),
            'ttft_s': distribution([r['first_token_ms'] / 1000 if r.get('first_token_ms') is not None else None for r in selected]),
            'first_answer_s': distribution([r['first_content_ms'] / 1000 if r.get('first_content_ms') is not None else None for r in selected]),
            'wall_tps': distribution([rates(r)['wall_tps'] for r in selected]),
            'stream_tps': distribution([rates(r)['stream_tps'] for r in selected]),
            'token_totals_known': {k: sum(t[k] or 0 for t in token_rows) for k in ['input', 'cached', 'output', 'reasoning', 'answer']},
            'token_missing_rows': {k: sum(t[k] is None for t in token_rows) for k in ['input', 'cached', 'output', 'reasoning', 'answer']},
            'reasoning_tokens': distribution([t['reasoning'] for t in token_rows]),
            'over_30s': sum(r['elapsed_ms'] > 30000 for r in selected),
            'elapsed_reasoning_pearson': pearson([(tokens(r)['reasoning'], r['elapsed_ms']) for r in selected if tokens(r)['reasoning'] is not None])}


def peak_tariff_estimate(row):
    t = tokens(row)
    if any(t[k] is None for k in ['input', 'cached', 'output']):
        return None
    return ((t['input'] - t['cached']) * .3 + t['cached'] * .006 + t['output'] * 1.2) / 1e6


def balance_change():
    paths = [LOCAL / f'balance-{stage}.json' for stage in ['before', 'after']]
    if not all(p.exists() for p in paths):
        return None
    before, after = [json.loads(p.read_text()) for p in paths]
    balances = lambda r: {b['currency']: Decimal(str(b['total_balance'])) for b in r['raw']['balance_infos']}
    b, a = balances(before), balances(after)
    return {'before_ts': before['ts'], 'after_ts': after['ts'],
            'net_account_debit': {currency: str(b[currency] - a[currency]) for currency in b.keys() & a.keys()},
            'private_receipt_sha256': [hashlib.sha256(p.read_bytes()).hexdigest() for p in paths],
            'attribution_limit': 'Net account balance change over the test window; concurrent account use is not excluded. Balances remain private.'}


def main():
    samples = json.loads((OUT / 'sample.json').read_text())['samples']
    results = rows(OUT / 'results.jsonl')
    keys = {f"{s['sample']}/{p}" for s in samples for p in s['order']}
    if len(results) != 50 or {r['key'] for r in results} != keys:
        raise ValueError('Require exactly all 50 unique frozen physical results')
    captures = {r['key']: r for r in rows(OUT / 'streams.jsonl')}
    if set(captures) != keys:
        raise ValueError('Missing stream evidence')
    requests = {r['sample']: r for r in json.loads((OUT / 'requests.json').read_text())}
    for row in results:
        frozen = requests[row['sample']]
        # JS JSON.stringify preserves insertion order; ASCII fixtures contain normal UTF-8 strings.
        body = frozen['body'] | {'model': row['model_requested'], 'stream': True, 'stream_options': {'include_usage': True}}
        wire = json.dumps(body, ensure_ascii=False, separators=(',', ':'))
        if hashlib.sha256(wire.encode()).hexdigest() != row['request_sha256']:
            raise ValueError('Wire request does not match frozen production messages/settings')
        capture = captures[row['key']]
        # JS .length counts UTF-16 code units, including two units for astral characters.
        units = lambda text: len(text.encode('utf-16-le')) // 2
        if units(capture['reasoning']) != row['reasoning_chars'] or units(capture['content']) != row['content_chars']:
            raise ValueError('Captured stream text length mismatch')
        if sum(e['reasoning_chars'] for e in capture['events']) != row['reasoning_chars'] or sum(e['content_chars'] for e in capture['events']) != row['content_chars']:
            raise ValueError('Captured chunk lengths do not reconstruct stream')
    previous = rows(ORIGINAL / 'results.jsonl')
    baseline = {f"{r['id']}/{r['round']}/{r['group']}": r for r in previous}
    by_key = {r['key']: r for r in results}
    table, cohorts = [], []
    for provider in ['nova', 'official']:
        for category in TYPES:
            selected = [r for r in results if r['provider'] == provider and (category == 'ALL' or r['stratum'] == category)]
            table.append({'provider': provider, 'stratum': category, **summarize(selected)})
        for cohort in ['previous-timeout', 'previous-success']:
            selected = [r for r in results if r['provider'] == provider and r['cohort'] == cohort]
            cohorts.append({'provider': provider, 'cohort': cohort, **summarize(selected)})
    pairs = []
    for sample in samples:
        n, o = [by_key[f"{sample['sample']}/{p}"] for p in ['nova', 'official']]
        pairs.append({'sample': sample['sample'], 'id': sample['id'], 'stratum': sample['stratum'],
                      'both_accepted': n['accepted'] and o['accepted'],
                      'official_over_nova_latency': o['elapsed_ms'] / n['elapsed_ms'],
                      'nova_primary_same': old.primary(n.get('answer')) == old.primary(o.get('answer')) if n['accepted'] and o['accepted'] else None,
                      'all_action_fields_same': old.action(n.get('answer')) == old.action(o.get('answer')) if n['accepted'] and o['accepted'] else None,
                      'nova_reasoning': tokens(n)['reasoning'], 'official_reasoning': tokens(o)['reasoning']})
    gpt_comparisons = []
    for provider in ['nova', 'official']:
        for group in ['A', 'C']:
            comparisons = []
            for row in results:
                if row['provider'] != provider:
                    continue
                prior_round = row['previous_key'].split('/')[1] if group == 'A' else '1'
                ref = baseline[f"{row['id']}/{prior_round}/{group}"]
                if row['accepted'] and ref['accepted']:
                    comparisons.append((row, ref))
            gpt_comparisons.append({'provider': provider, 'baseline': group, 'accepted_pairs': len(comparisons),
                                    'latency_ratio_of_totals': sum(r['elapsed_ms'] for r, a in comparisons) / sum(a['elapsed_ms'] for r, a in comparisons) if comparisons else None,
                                    'primary_same': sum(old.primary(r['answer']) == old.primary(a['result']['answer']) for r, a in comparisons),
                                    'all_action_fields_same': sum(old.action(r['answer']) == old.action(a['result']['answer']) for r, a in comparisons)})
    unique = []
    for provider in ['nova', 'official']:
        for fixture in sorted({r['id'] for r in results}):
            selected = [r for r in results if r['provider'] == provider and r['id'] == fixture]
            unique.append({'provider': provider, 'id': fixture, 'occurrences': len(selected),
                           'mean_s': stats.mean(r['elapsed_ms'] / 1000 for r in selected),
                           'mean_reasoning_tokens': stats.mean(tokens(r)['reasoning'] for r in selected if tokens(r)['reasoning'] is not None) if any(tokens(r)['reasoning'] is not None for r in selected) else None})
    historical = json.loads((ORIGINAL / 'historical.json').read_text())
    projections = []
    projection_means = {provider: {r['stratum']: r['latency_s']['mean'] for r in table if r['provider'] == provider} for provider in ['nova', 'official']}
    matched_gpt = []
    for group, provider in [('A', 'gpt-xhigh-frozen'), ('C', 'gpt-high-frozen')]:
        matched = [baseline[f"{s['id']}/{s['previous_key'].split('/')[1] if group == 'A' else '1'}/{group}"] for s in samples]
        projection_means[provider] = {}
        for category in TYPES:
            durations = [r['elapsed_ms'] / 1000 for r in matched if category == 'ALL' or r['stratum'] == category]
            matched_gpt.append({'provider': provider, 'stratum': category, 'latency_s': distribution(durations)})
            projection_means[provider][category] = stats.mean(durations)
    for provider, means in projection_means.items():
        for run in historical['runs']:
            seconds = sum(count * means[old.stratum(label)] for label, count in run['labels'].items() if old.stratum(label))
            projections.append({'provider': provider, 'run_id': run['run_id'], 'questions': run['questions'], 'minutes': seconds / 60})
    per_request = []
    for row in results:
        capture = captures[row['key']]
        positive = [e['t_ms'] for e in capture['events'] if e['reasoning_chars'] or e['content_chars']]
        gaps = [b - a for a, b in zip(positive, positive[1:])]
        per_request.append({k: row.get(k) for k in ['key', 'id', 'stratum', 'cohort', 'provider', 'ts', 'effort_requested', 'status', 'elapsed_ms', 'headers_ms', 'first_token_ms', 'first_reasoning_ms', 'first_content_ms', 'accepted', 'first_raw_valid', 'recovered', 'error_code', 'repair_requests_blocked']} |
                           tokens(row) | rates(row) |
                           {'max_content_chunk_gap_ms': max(gaps, default=None), 'delivered_events_before_30s': sum(t <= 30000 for t in positive),
                            'peak_tariff_reference_usd': peak_tariff_estimate(row)})
    # Freeze only public accounting fields once; later offline recomputation needs no local account files.
    accounting_path = OUT / 'accounting.json'
    if not accounting_path.exists():
        debit = balance_change()
        if debit is None:
            raise ValueError('Collect final private balance receipt before exporting accounting')
        claims = rows(LOCAL / 'claims.jsonl')
        allowed = {'claim', 'ts', 'kind', 'key', 'provider', 'model', 'request_sha256'}
        accounting = {'claims': [{k: v for k, v in c.items() if k in allowed} for c in claims],
                      'official_balance_change': debit,
                      'private_claims_sha256': hashlib.sha256((LOCAL / 'claims.jsonl').read_bytes()).hexdigest()}
        with accounting_path.open('x') as handle:
            handle.write(json.dumps(accounting, indent=2) + '\n')
    accounting = json.loads(accounting_path.read_text())
    claims = accounting['claims']
    if len(claims) > 60 or {c['key'] for c in claims if c['kind'] == 'completion'} != keys or sum(c['kind'] == 'completion' for c in claims) != 50:
        raise ValueError('Physical claims do not match 50 frozen completions or exceed budget')
    if any(c['request_sha256'] != by_key[c['key']]['request_sha256'] for c in claims if c['kind'] == 'completion'):
        raise ValueError('Physical claim differs from result request')
    fee = {'official_balance_change': accounting['official_balance_change'], 'nova_actual_billed_cost': None,
           'peak_tariff_reference_usd': {p: sum(peak_tariff_estimate(r) or 0 for r in results if r['provider'] == p) for p in ['nova', 'official']},
           'peak_tariff_reference_usage_missing_calls': {p: sum(peak_tariff_estimate(r) is None for r in results if r['provider'] == p) for p in ['nova', 'official']},
           'note': 'Uniform peak list tariff reference only, not invoiced cost; cache formats normalized. Test straddles the 10:00 UTC off-peak boundary. No exchange conversion.'}
    public_calls = {'physical_api_calls': len(claims), 'completion_calls': sum(c['kind'] == 'completion' for c in claims),
                    'non_completion_calls': dict(collections.Counter(c['kind'] for c in claims if c['kind'] != 'completion')),
                    'private_claims_sha256': accounting['private_claims_sha256'], 'new_codex_calls': 0}
    summary = {'complete': True, 'table': table, 'cohorts': cohorts, 'pairs': pairs,
               'gpt_comparisons_noncontemporaneous': gpt_comparisons, 'matched_gpt_by_type': matched_gpt, 'unique_fixtures': unique,
               'run_projections': projections, 'fees': fee, 'calls': public_calls,
               'evidence_sha256': {name: hashlib.sha256((OUT / name).read_bytes()).hexdigest() for name in ['sample.json', 'requests.json', 'models.jsonl', 'sources.json', 'results.jsonl', 'streams.jsonl', 'accounting.json']},
               'baseline_sha256': {name: hashlib.sha256((ORIGINAL / name).read_bytes()).hexdigest() for name in ['results.jsonl', 'historical.json', 'summary.json']}}
    (OUT / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
    (OUT / 'call-counts.json').write_text(json.dumps(public_calls, indent=2) + '\n')
    (OUT / 'costs.json').write_text(json.dumps(fee, ensure_ascii=False, indent=2) + '\n')
    with (OUT / 'per-request.csv').open('w') as handle:
        writer = csv.DictWriter(handle, fieldnames=per_request[0].keys(), lineterminator='\n')
        writer.writeheader()
        writer.writerows(per_request)
    fmt = lambda v: f'{v:.2f}' if v is not None else '未知'
    lines = ['# #29 DeepSeek 流式复测结果', '', '由 `agent/tools/issue29-deepseek-report.py` 离线生成。限制和方法见 [报告](README.md)。', '',
             '延迟包含失败停止时间；p50/p90 用线性插值。流式 token/s 是 usage 输出 token 除以首个至最后一个内容 chunk 的时长，受分块/缓冲影响；非原生解码速度。', '',
             '|端点|题型|n|通过/严格首答|超时|均值秒|p50秒|p90秒|首token p50/p90秒|流式/总耗时tps p50|推理token p50|',
             '|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|']
    for r in table:
        lines.append(f"|{r['provider']}|{r['stratum']}|{r['n']}|{r['accepted']}/{r['strict_raw_valid']}|{r['timeouts']}|{fmt(r['latency_s']['mean'])}|{fmt(r['latency_s']['p50'])}|{fmt(r['latency_s']['p90'])}|{fmt(r['ttft_s']['p50'])}/{fmt(r['ttft_s']['p90'])}|{fmt(r['stream_tps']['p50'])}/{fmt(r['wall_tps']['p50'])}|{fmt(r['reasoning_tokens']['p50'])}|")
    lines += ['', '|端点|旧记录分组|n|通过|超过30秒|p50秒|p90秒|推理token p50|', '|---|---|---:|---:|---:|---:|---:|---:|']
    for r in cohorts:
        lines.append(f"|{r['provider']}|{r['cohort']}|{r['n']}|{r['accepted']}|{r['over_30s']}|{fmt(r['latency_s']['p50'])}|{fmt(r['latency_s']['p90'])}|{fmt(r['reasoning_tokens']['p50'])}|")
    lines += ['', '## Token 总量', '', '已知 usage 的合计；输出包含推理，答案=输出−推理。缓存是输入子集。缺失不补零。', '',
              '|端点|输入|缓存命中|输出|其中推理|答案|缺失输出/推理 usage 次数|', '|---|---:|---:|---:|---:|---:|---:|']
    for r in table:
        if r['stratum'] != 'ALL':
            continue
        t, missing = r['token_totals_known'], r['token_missing_rows']
        lines.append(f"|{r['provider']}|{t['input']}|{t['cached']}|{t['output']}|{t['reasoning']}|{t['answer']}|{missing['output']}/{missing['reasoning']}|")
    lines += ['', '## 相同样本权重的旧 GPT 延迟', '', '沿用旧回执，不是与本次同时重跑；首 token 和流式吞吐没有采样，保持未知。', '',
              '|旧基线|题型|n|均值秒|p50秒|p90秒|', '|---|---|---:|---:|---:|---:|']
    for r in matched_gpt:
        d = r['latency_s']
        lines.append(f"|{r['provider']}|{r['stratum']}|{d['n']}|{fmt(d['mean'])}|{fmt(d['p50'])}|{fmt(d['p90'])}|")
    lines += ['', '## 与旧 GPT 结果配对', '', 'A=xhigh、C=high；沿用旧结果，没有新增 Codex 调用。A 同旧轮次，C 只有第1轮。时间不同；重复题会重复计权。动作一致不表示对局质量相同。', '',
              '|端点|旧基线|成功配对|总耗时比|主动作相同|全部动作字段相同|', '|---|---|---:|---:|---:|---:|']
    for r in gpt_comparisons:
        lines.append(f"|{r['provider']}|{r['baseline']}|{r['accepted_pairs']}|{fmt(r['latency_ratio_of_totals'])}|{r['primary_same']}|{r['all_action_fields_same']}|")
    lines += ['', '## 每局耗时估算', '', '按原20局题型请求数加权；每局平均27.8问。各题型内部偏重旧超时题，样本很小，属于本次样本条件下的一次尝试估计。', '',
              '|端点|题型加权均值分钟|20局p50/p90分钟|直接28×样本均值分钟|独立题均值秒|', '|---|---:|---|---:|---:|']
    for provider in projection_means:
        values = [r['minutes'] for r in projections if r['provider'] == provider]
        unique_mean = stats.mean(r['mean_s'] for r in unique if r['provider'] == provider) if provider in ['nova', 'official'] else None
        lines.append(f"|{provider}|{fmt(stats.mean(values))}|{fmt(quantile(values,.5))}/{fmt(quantile(values,.9))}|{fmt(28 * projection_means[provider]['ALL'] / 60)}|{fmt(unique_mean)}|")
    lines += ['', 'Token 明细、逐请求指标、调用计数、费用与哈希见 `summary.json`、`per-request.csv`、`call-counts.json`、`costs.json`。']
    (OUT / 'tables.md').write_text('\n'.join(lines) + '\n')
    print(json.dumps({'complete': True, 'rows': len(results), 'calls': public_calls['physical_api_calls']}))


if __name__ == '__main__':
    main()
