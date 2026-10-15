#!/usr/bin/env python3
"""V5-S evidence reports from frozen exports. Never scan raw production logs or fit new calibration."""
import argparse
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path


def load(path):
    return json.loads(Path(path).read_text())


def exported_rows(value):
    if value.get('truncated') or value.get('error'):
        raise ValueError('incomplete logdb export')
    return [dict(zip(value['columns'], row)) for row in value['rows']]


def instant(value):
    if not value:
        return None
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    return result.astimezone(timezone.utc) if result.tzinfo else result.replace(tzinfo=timezone.utc)


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0


def distribution(values):
    values = sorted(value for value in values if number(value))
    def quantile(p):
        if not values:
            return None
        at = (len(values) - 1) * p
        lo, hi = math.floor(at), math.ceil(at)
        return values[lo] + (values[hi] - values[lo]) * (at - lo)
    return {'n': len(values), 'p50': quantile(.5), 'p90': quantile(.9), 'max': max(values) if values else None,
            'sum': sum(values) if values else None}


def distinct_runtime(rows, identity_key):
    accepted, excluded, seen = [], [], set()
    for row in rows:
        identity = (row.get('run_id'), row.get(identity_key))
        if row.get('character') != 'SILENT' or not row.get('cohort') or not all(identity):
            excluded.append({'identity': identity, 'reason': 'missing native identity/cohort or other character'})
        elif identity in seen:
            excluded.append({'identity': identity, 'reason': 'duplicate actual record'})
        else:
            seen.add(identity)
            accepted.append(row)
    return accepted, excluded


def compute_summary(rows):
    rows, excluded = distinct_runtime(rows, 'attempt_id')
    groups, runs = defaultdict(list), defaultdict(list)
    for row in rows:
        if row.get('required') is not True or row.get('lane') not in ('b2', 'b3'):
            excluded.append({'identity': row['attempt_id'], 'reason': 'not explicitly mandatory B2/B3'})
            continue
        groups[(row['cohort'], row['lane'])].append(row)
        runs[(row['cohort'], row['run_id'])].append(row)
    return {'groups': [{'cohort': k[0], 'lane': k[1], 'attempts': len(v),
                        'wall_ms': distribution(row.get('elapsed_ms') for row in v),
                        'unknown_ms': sum(not number(row.get('elapsed_ms')) for row in v),
                        'degraded': sum(row.get('status') == 'degraded' for row in v),
                        'complete_adaptive': sum(row.get('status') == 'complete_adaptive' for row in v)} for k, v in sorted(groups.items())],
            'runs': [{'cohort': k[0], 'run_id': k[1], 'attempts': len(v),
                      'observed_wait_ms': distribution(row.get('elapsed_ms') for row in v)['sum'],
                      'unknown_ms': sum(not number(row.get('elapsed_ms')) for row in v)} for k, v in sorted(runs.items())],
            'excluded': excluded,
            'limits': 'Actual computation attempts, including retry failures and memo lookup wall time, deduplicated by actual attempt identity. A partial export is not the complete per-run wait total.'}


def jev_usage(rows):
    rows, excluded = distinct_runtime(rows, 'call_id')
    groups = defaultdict(list)
    for row in rows:
        if row.get('provider') != 'jev':
            excluded.append({'identity': row['call_id'], 'reason': 'not Jev'})
            continue
        groups[row['cohort']].append(row)
    return {'groups': [{'cohort': cohort, 'calls': len(items), 'runs': len({r['run_id'] for r in items}),
                        'input_tokens': distribution(r.get('input_tokens') for r in items),
                        'output_tokens': distribution(r.get('output_tokens') for r in items),
                        'total_tokens': distribution(r['input_tokens'] + r['output_tokens'] for r in items
                                                     if number(r.get('input_tokens')) and number(r.get('output_tokens'))),
                        'latency_ms': distribution(r.get('latency_ms') for r in items)} for cohort, items in sorted(groups.items())],
            'excluded': excluded, 'limits': 'Observed actual calls only. Missing token fields are unknown. P4 is excluded; cohort differences are descriptive, not the effect of changing Jev mode.'}


def override_summary(rows):
    rows, excluded = distinct_runtime(rows, 'question_id')
    groups = defaultdict(list)
    for row in rows:
        if row.get('mode') != 'on' or type(row.get('deviated')) is not bool or row.get('target_pending') is True:
            excluded.append({'identity': row['question_id'], 'reason': 'not an actual on-mode resolved selection'})
            continue
        groups[(row['cohort'], row.get('boss'), row.get('ascension'))].append(row)
    result = []
    for key, items in groups.items():
        outcomes = []
        for deviated in (False, True):
            selected = [r for r in items if r['deviated'] is deviated]
            actual = [r for r in selected if r.get('outcome') in ('won', 'died')
                      and r.get('outcome_binding') in ('exact_boss_attempt', 'same_run_act_first_boss_attempt')
                      and r.get('outcome_id')]
            labels = defaultdict(set)
            for row in actual:
                labels[row['outcome_id']].add(row['outcome'])
            unique = {identity: next(iter(values)) for identity, values in labels.items() if len(values) == 1}
            outcomes.append({'deviated': deviated, 'choices': len(selected), 'outcome_bound_choices': len(actual),
                             'unknown_outcome_choices': len(selected) - len(actual), 'conflicting_outcome_ids': [identity for identity, values in labels.items() if len(values) > 1],
                             'distinct_boss_attempts': len(unique),
                             'won': sum(v == 'won' for v in unique.values()), 'died': sum(v == 'died' for v in unique.values()),
                             'win_rate': sum(v == 'won' for v in unique.values()) / len(unique) if unique else None})
        result.append({'cohort': key[0], 'boss': key[1], 'ascension': key[2], 'choices': len(items),
                       'overrides': sum(r['deviated'] is True for r in items),
                       'override_rate': sum(r['deviated'] is True for r in items) / len(items),
                       'missing_override_reason': sum(r['deviated'] is True and not str(r.get('reason') or '').strip() for r in items),
                       'outcomes': outcomes})
    return {'groups': result, 'excluded': excluded,
            'limits': 'Descriptive associations only; one Boss attempt may appear in both choice groups. No later SL win is substituted for a first attempt, and shadow choices do not count as instructed overrides.'}


def runtime_report(value):
    if value.get('schema') != 's-decision-runtime-v1' or not isinstance(value.get('coverage'), dict):
        raise ValueError('runtime input requires explicit schema and coverage boundary')
    refs = value.get('source_refs')
    if not isinstance(refs, list) or not refs:
        raise ValueError('runtime input has no frozen sources')
    for ref in refs:
        if hashlib.sha256(Path(ref['path']).read_bytes()).hexdigest() != ref['sha256']:
            raise ValueError('runtime frozen source changed: ' + ref['path'])
    return {'coverage': value['coverage'], 'cohorts': value.get('cohorts', []), 'sources': refs,
            'calibration': calibration(value.get('predictions', []), require_native=True), 'overrides': override_summary(value.get('overrides', [])),
            'jev': jev_usage(value.get('jev_calls', [])), 'computation': compute_summary(value.get('computations', [])),
            'excluded_from_goal': ['P4', 'P5'], 'acceptance': 'A report does not close publication or natural-consumer gates.'}


def link_outcome(row, fights, attempts):
    """An SL attempt never borrows the eventual result of a later attempt on the same floor."""
    ts = instant(row.get('ts'))
    if ts is None:
        return {'outcome': None, 'reason': 'missing question timestamp'}
    same = lambda item: item['run_id'] == row['run_id'] and item['floor'] == row['floor']
    sl = [item for item in attempts if same(item) and item['attempt'] == row.get('attempt')
          and instant(item.get('started_at')) and instant(item.get('ended_at'))
          and instant(item['started_at']) <= ts <= instant(item['ended_at'])]
    if sl:
        if len(sl) != 1:
            return {'outcome': None, 'reason': 'ambiguous attempt identity'}
        result = sl[0]['result']
        return {'outcome': result if result in ('won', 'died') else None,
                'reason': 'actual attempt' if result in ('won', 'died') else 'censored attempt: ' + result,
                'source': sl[0], 'first_or_sl': 'first' if row['attempt'] == 1 else 'sl'}
    if any(same(item) for item in attempts):
        return {'outcome': None, 'reason': 'SL floor without an exact attempt/time match'}
    matched = [item for item in fights if same(item) and instant(item.get('first_ts')) and instant(item.get('last_ts'))
               and instant(item['first_ts']) <= ts <= instant(item['last_ts'])]
    if len(matched) != 1:
        return {'outcome': None, 'reason': 'no unique fight/time match'}
    return {'outcome': matched[0]['outcome'] if matched[0]['outcome'] in ('won', 'died') else None,
            'reason': 'fight frame interval', 'source': matched[0], 'first_or_sl': 'first'}


def describe_jev(rows):
    groups = defaultdict(list)
    for row in rows:
        groups[(row['fight'], row['confidence_band'], row['potion_in_comparison'])].append(row)
    return [{'fight': key[0], 'confidence': key[1], 'potions': key[2], 'n': len(items),
             'deviated': sum(item['deviated'] is True for item in items),
             'deviation_rate': sum(item['deviated'] is True for item in items) / len(items),
             'actual_won': sum(item['outcome_binding']['outcome'] == 'won' for item in items),
             'actual_died': sum(item['outcome_binding']['outcome'] == 'died' for item in items),
             'actual_unknown': sum(item['outcome_binding']['outcome'] is None for item in items)}
            for key, items in groups.items()]


def calibration(predictions, require_native=False):
    """Only explicit attempt-bound predictions; unknown and censored labels remain excluded."""
    groups, excluded, seen = defaultdict(list), [], set()
    for row in predictions:
        identity = (row.get('run_id'), row.get('boss'), row.get('floor'), row.get('attempt'), row.get('prediction_id'))
        p = row.get('probability')
        if (row.get('character') != 'SILENT' or row.get('outcome') not in ('won', 'died')
                or row.get('binding') != 'exact_boss_attempt' or any(value is None for value in identity)
                or (require_native and (not row.get('cohort') or not row.get('native_commit')))
                or not isinstance(p, (int, float)) or isinstance(p, bool) or not 0 <= p <= 1
                or not isinstance(row.get('attempt'), int) or row['attempt'] < 1):
            excluded.append({'prediction_id': row.get('prediction_id'), 'reason': 'missing explicit identity, probability or actual outcome'})
            continue
        if identity in seen:
            excluded.append({'prediction_id': row['prediction_id'], 'reason': 'duplicate'})
            continue
        seen.add(identity)
        groups[(row['boss'], row.get('ascension'), 'first' if row['attempt'] == 1 else 'sl',
                row.get('cohort'), row.get('native_commit'))].append(row)
    result = []
    for key, rows in groups.items():
        bins = []
        for index in range(5):
            items = [row for row in rows if min(4, int(row['probability'] * 5)) == index]
            bins.append({'lower': index / 5, 'upper': (index + 1) / 5, 'n': len(items),
                         'predicted': sum(row['probability'] for row in items) / len(items) if items else None,
                         'actual': sum(row['outcome'] == 'won' for row in items) / len(items) if items else None})
        result.append({'boss': key[0], 'ascension': key[1], 'attempt': key[2], 'cohort': key[3], 'native_commit': key[4], 'n': len(rows),
                       'brier': sum((row['probability'] - (row['outcome'] == 'won')) ** 2 for row in rows) / len(rows), 'buckets': bins})
    return {'groups': result, 'excluded': excluded}


def report(args):
    baseline, trust, signs = load(args.jev), load(args.trust), load(args.sign)
    fights, attempts = exported_rows(load(args.fights)), exported_rows(load(args.attempts))
    rows = [{**row, 'outcome_binding': link_outcome(row, fights, attempts)} for row in baseline['rows']]
    trust_rows = []
    for boss, item in trust['bosses'].items():
        for lane, key in [('b2', 't1'), ('b3', 'pre')]:
            value = item.get(key, {})
            trust_rows.append({'boss': boss, 'lane': lane, 'trusted': boss in trust.get('trusted_' + lane, []),
                               **{name: value.get(name) for name in ('n', 'brier', 'mean_pred', 'actual_win', 'failed')},
                               'buckets': value.get('buckets')})
    runtime_path = getattr(args, 'runtime', None)
    runtime = runtime_report(load(runtime_path)) if runtime_path else None
    result = {'schema': 's-decision-evaluation-v1', 'generated_at': datetime.now(timezone.utc).isoformat(),
              'request_id': 'roy-20261014-s-decision', 'stage': 'runtime observation; P4/P5 excluded' if runtime else 'P0 baseline; P1 shadow awaiting natural games',
              'sources': {key: {'path': getattr(args, key), 'sha256': hashlib.sha256(Path(getattr(args, key)).read_bytes()).hexdigest()}
                          for key in ('jev', 'trust', 'sign', 'fights', 'attempts')},
              'sign': signs, 'jev': {'rows': rows, 'groups': describe_jev(rows)},
              'boss_trust': {'rows': trust_rows, 'source': trust['source'], 'overall': trust['overall'],
                             'ascension_low': trust.get('ascension_low'), 'stage_low': trust.get('stage_low')},
              'new_calibration': calibration(load(args.predictions) if args.predictions else []),
              'limits': ['Selected frozen cases do not estimate the all-history deviation rate.',
                         'Actual outcomes are descriptive, not causal; censored SL is not a loss.',
                         'Existing trust validates its pinned model, not later production changes.',
                         'Missing per-boss buckets and paired SE remain unknown.',
                         'Publication and natural-consumer acceptance are tracked independently; P4/P5 excluded from the current goal.']}
    for name in ('predictions', 'runtime'):
        path = getattr(args, name, None)
        if path:
            result['sources'][name] = {'path': path, 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}
    if runtime:
        result['runtime'] = runtime
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    (out / 'evaluation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    sign_lines = ['# P0.1 S 符号审计', '', '固定历史输入在当前模型下重算；不是当时逐样本的恢复，也不是实盘胜率校准。', '',
                  '| Boss | 进阶 | 来源 | 样本 | 有效 | 缺失 | 不一致 | 通过 |', '|---|---:|---|---:|---:|---:|---:|---|']
    for group in signs['groups']:
        a = group['audit']
        sign_lines.append(f"| {group['boss']} | {group['ascension']} | {group['lane']} | {a['samples']} | {a['valid']} | {a['missing']} | {a['mismatches']} | {a['rankingEligible']} |")
    sign_lines += ['', '未出现的 Boss/进阶/B2 分组尚未审计，不能推广本表的通过结论。零分、复活后反号、混合归属、截断与连续 Boss 的固定测试分别覆盖；历史未记录的回血状态保留 unknown。',
                   'P1 每次在原样本上重做符号检查，未知和失败仅记录、不给大脑诊断；shadow 不改变排序。P3 发布和自然使用以对应阶段回执为准。']
    (out / 'p0-sign-audit.md').write_text('\n'.join(sign_lines) + '\n')
    jev_lines = ['# P0.2 Jev 与代码第一名', '',
                 f"复用原 ablation 冻结 {len(rows)} 题；其中 {sum(row['deviated'] is True for row in rows)} 题偏离原代码顺序 plan1。原样本特意包含 override/tie/potion 等分层，比例不能冒作生产总体比例。", '',
                 '逐题四项、配对差、标准误、实际动作回执及战斗结局见 evaluation.json。原代码第一名、rollout 第一名、B2 第一名分开；仅有首动作回执不能声称整方案执行。', '',
                 '| 战斗 | 置信度段 | 涉药 | 题数 | 偏离 | 实胜 | 实死 | 未知/截断 |', '|---|---|---|---:|---:|---:|---:|---:|']
    for g in result['jev']['groups']:
        jev_lines.append(f"| {g['fight']} | {g['confidence']} | {g['potions']} | {g['n']} | {g['deviated']} | {g['actual_won']} | {g['actual_died']} | {g['actual_unknown']} |")
    jev_lines += ['', '模式建议：保持 full；P4/P5排除在本轮目标之外。旧题没有 S 逐样本/掉血配对标准误，不能把未知解释成“无显著差异”，也不足以支持 off。无新增 Jev 请求或全历史重跑。']
    (out / 'p0-jev-vs-code.md').write_text('\n'.join(jev_lines) + '\n')
    lines = ['# P0.3 现有 Boss 模拟可信度', '', '只整理现有 boss-trust.json 与已发布校准报告。固定模型 7e1193cef 的结论不推广到后续生产模型；首试和 SL 的实际结果保持分账。', '',
             '| Boss | 通道 | 已可信 | n | Brier | 预测 | 实际 | 失败项 |', '|---|---|---|---:|---:|---:|---:|---|']
    for row in trust_rows:
        lines.append(f"| {row['boss']} | {row['lane']} | {row['trusted']} | {row['n']} | {row['brier']} | {row['mean_pred']} | {row['actual_win']} | {','.join(row['failed'] or [])} |")
    lines += ['', '原整体胜率分桶完整保存在 evaluation.json 的 boss_trust.overall；原文件没有的逐 Boss 分桶留空，不重拟合。A0–4/A5–9 独立验证不足及 F49 低可信仍以原 ascension_low/stage_low 为准。',
              '现有 eval/calibration.py 测的是 rollout/路线/Boss 时钟误差，不是 B2/B3 胜率 Platt 验证；两套统计没有合并。']
    (out / 'p0-boss-trust.md').write_text('\n'.join(lines) + '\n')
    if runtime:
        lines = ['# V5-S 运行评估（P4/P5 除外）', '',
                 '本报告只整理冻结窗口内的实测记录。缺失是未知；发布、自然使用和因果收益分别判断。', '',
                 '覆盖边界：`' + json.dumps(runtime['coverage'], ensure_ascii=False) + '`', '',
                 '## 必需计算耗时', '', '| 窗口 | 通道 | 实际尝试 | p50 ms | p90 ms | 最大 ms | 未知耗时 |', '|---|---|---:|---:|---:|---:|---:|']
        for row in runtime['computation']['groups']:
            v = row['wall_ms']
            lines.append(f"| {row['cohort']} | {row['lane']} | {row['attempts']} | {v['p50']} | {v['p90']} | {v['max']} | {row['unknown_ms']} |")
        lines += ['', '逐局累计观察等待与原始尝试计数在 evaluation.json；窗口不完整时不能称整局总等待。', '',
                  '## Jev 实际调用', '', '| 窗口 | 调用 | 局数 | 已知总 token | token 完整调用 | 延迟 p50 ms | 延迟 p90 ms |', '|---|---:|---:|---:|---:|---:|---:|']
        for row in runtime['jev']['groups']:
            lines.append(f"| {row['cohort']} | {row['calls']} | {row['runs']} | {row['total_tokens']['sum']} | {row['total_tokens']['n']} | {row['latency_ms']['p50']} | {row['latency_ms']['p90']} |")
        lines += ['', 'Jev 模式未因本报告改变；不同窗口局面不同，不将 token 或延迟差解释为架构因果。', '',
                  '## 排序偏离与真实 Boss 结果', '',
                  json.dumps(runtime['overrides'], ensure_ascii=False, indent=2), '',
                  '只纳入实际 on 题面之后、目标已确定的选择。相同 Boss 尝试在组内去重；一战可出现在两个选择组，不把它当独立对照。', '',
                  '## 首试与 SL 校准', '',
                  json.dumps(runtime['calibration'], ensure_ascii=False, indent=2), '',
                  '只纳入明确绑定原 Boss 尝试的预测；SL 截断不算死亡，后续胜利不倒填首试。原固定模型可信度整理另见 p0-boss-trust.md。', '',
                  '完整源 SHA、未知、重复和排除原因均保存在 evaluation.json；本报告不关闭发布与自然消费者验收。']
        (out / 'runtime-report.md').write_text('\n'.join(lines) + '\n')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('jev', 'trust', 'sign', 'fights', 'attempts', 'out'):
        parser.add_argument('--' + name, required=True)
    parser.add_argument('--predictions', help='Optional frozen exact-attempt prediction rows')
    parser.add_argument('--runtime', help='Optional frozen runtime cohorts with explicit source SHA and coverage')
    report(parser.parse_args())
