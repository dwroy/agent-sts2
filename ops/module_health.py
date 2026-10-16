#!/usr/bin/env python3
"""Read-only Silent V5 module acceptance, called by the existing tick and run report.

No game actions, model calls, knowledge edits, or learner dispatch. Alerts stay in the
original ops queue; routine snapshots are local records, not messages to Roy.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import re
import tempfile

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from adaptive_health import adaptive_health

LABELS = {'reward/card', 'shop/buy', 'shop/plan', 'rest/choose', 'rest/plan',
          'selection/upgrade', 'selection/remove', 'selection/transform', 'selection/add',
          'event/plan', 'event/choose'}
# A service-health trigger, not a new statistical or game-policy threshold.
FAIL_STREAK = 3
TAIL_BYTES = 32 * 1024 * 1024


def obj(value):
    return value if isinstance(value, dict) else {}


def run_of(row):
    if row.get('run_id'):
        return row['run_id']
    try:
        return json.loads(row.get('fingerprint', '{}')).get('run')
    except (ValueError, TypeError):
        return None


def read_tail(path, limit=TAIL_BYTES):
    """Frozen byte end; ignore incomplete final lines and disclose truncation/errors."""
    if not path.exists():
        return [], {'path': str(path), 'missing': True, 'complete': False}
    rows, bad = [], 0
    with path.open('rb') as handle:
        end = os.fstat(handle.fileno()).st_size
        start = max(0, end - limit)
        handle.seek(start)
        if start:
            handle.readline()
        start = handle.tell()
        while handle.tell() < end:
            offset = handle.tell()
            line = handle.readline(end - offset)
            if not line.endswith(b'\n'):
                break
            try:
                row = json.loads(line)
                if not isinstance(row, dict):
                    raise ValueError('not an object')
                row['_source'] = {'offset': offset, 'length': len(line), 'sha256': hashlib.sha256(line).hexdigest()}
                rows.append(row)
            except (ValueError, UnicodeDecodeError):
                bad += 1
    return rows, {'path': str(path), 'start': start, 'end': end, 'complete': start == 0 and bad == 0,
                  'malformed': bad, 'first_ts': rows[0].get('ts') if rows else None}


def dpr_count(options):
    """Count actual finite whole-fight DPR metrics; null/empty samples are absent."""
    count = 0
    for value in obj(options).values():
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except ValueError:
                continue
        value = obj(value)
        metrics = [value.get('quantitative_fight')] + list(obj(value.get('quantitative_fight_by_card')).values())
        for metric in metrics:
            stat = obj(obj(metric).get('effective_damage_per_turn'))
            mean = stat.get('mean')
            if stat.get('n', 0) > 0 and isinstance(mean, (int, float)) and math.isfinite(mean):
                count += 1
    return count


def failure(sim):
    if sim.get('skipped'):
        return None
    diagnostic = obj(sim.get('diagnostics'))
    if diagnostic.get('reason'):
        return diagnostic['reason']
    message = str(sim.get('error') or '')
    if '没有跑完一个样本' in message:
        return 'zero_paired_samples'
    if re.search(r'只跑完 \d+ 次模拟', message):
        return 'below_minimum_samples'
    if message:
        return 'unknown_boss' if '不知道本幕 boss' in message else 'simulation_error'
    return None


def unsupported_candidates(options, sim):
    """Require explicit exclusions for every offered candidate, not just a label."""
    offered = {key for key, value in obj(options).items() if value is not None}
    excluded = obj(sim.get('not_simulated'))
    simulated = obj(sim.get('options'))
    samples = obj(sim.get('diagnostics')).get('samples', sim.get('samples'))
    return (isinstance(samples, (int, float)) and not isinstance(samples, bool)
            and math.isfinite(samples) and samples > 0 and bool(offered)) and all(
        isinstance(excluded.get(key), str) and excluded[key].strip()
        and not any(result == key or result.startswith(key + '|') for result in simulated)
        for key in offered)


def candidate_dpr_coverage(options, sim):
    """Retain strict exclusion proof while checking every offered candidate."""
    counts = Counter(observed=0, unsupported=0, with_dpr=0, missing_dpr=0)
    for key, value in obj(options).items():
        if value is None:
            continue
        counts['observed'] += 1
        if dpr_count({key: value}):
            counts['with_dpr'] += 1
        elif unsupported_candidates({key: value}, sim):
            counts['unsupported'] += 1
        else:
            counts['missing_dpr'] += 1
    return dict(counts)


def construction_pipeline(config, records, brains, plans):
    """Observe actual payload/answer/persistence separately; no inference from a requested mode."""
    rid = config['run_id']
    enabled = obj(config.get('construction')).get('evaluation') == 'same-question-combat-facts'
    counts = Counter(evaluation_expected=0, evaluation_attached=0, evaluation_missing=0,
                     brain_evaluation=0, accepted_evaluation=0, accepted_choice_with_evaluation=0,
                     plan_due=0, accepted_structured_plan=0, missing_structured_plan=0,
                     saved_structured_plan=0, plan_readback=0, checkpoint_review_due=0,
                     probability_delivered=0)
    admissions, evidence = Counter(), []
    for row in records:
        c = obj(obj(row.get('boss_sim')).get('construction'))
        if c.get('admission'):
            admissions[obj(c['admission']).get('reason') or 'admitted'] += 1
        if enabled and c.get('evaluation'):
            counts['evaluation_expected'] += 1
            attached = c.get('evaluation_delivery') == 'attached'
            counts['evaluation_attached' if attached else 'evaluation_missing'] += 1
            if not attached:
                evidence.append({'kind': 'evaluation_not_attached', 'source': row.get('_source'),
                                 'decision': row.get('decision_id')})
    saved = [r for r in plans if obj(r.get('plan')).get('runId') == rid and obj(obj(r.get('plan')).get('construction'))]
    counts['saved_structured_plan'] = len(saved)
    for row in brains:
        payload, answer = obj(row.get('payload')), obj(row.get('answer'))
        facts, task = obj(payload.get('facts')), obj(payload.get('run_plan_task'))
        evaluation = obj(facts.get('construction_evaluation'))
        delivered = evaluation.get('schema') == 'construction-evaluation-v1' and evaluation.get('run') == rid
        accepted = row.get('accepted') is True
        counts['brain_evaluation'] += delivered
        counts['accepted_evaluation'] += delivered and accepted
        counts['accepted_choice_with_evaluation'] += delivered and accepted and (
            bool(answer.get('choice')) or isinstance(answer.get('plan'), list) or isinstance(answer.get('steps'), list))
        counts['probability_delivered'] += bool(obj(facts.get('construction')).get('forecasts'))
        context = evaluation or obj(task.get('construction_context')) or obj(payload.get('construction_context'))
        due = bool(context) and ('run_plan_task' in payload or row.get('label') == 'run-plan')
        if due:
            counts['plan_due'] += 1
            plan = answer if row.get('label') == 'run-plan' else obj(answer.get('run_plan'))
            c = obj(plan.get('construction'))
            catalog = {obj(core).get('id') for core in context.get('coreCatalog', []) if isinstance(obj(core).get('id'), str)}
            primary, alternatives, floor = c.get('primary'), c.get('alternatives'), context.get('floor')
            valid = (isinstance(primary, str) and primary in catalog | {'uncommitted'}
                     and isinstance(alternatives, list) and len(alternatives) <= 3
                     and all(isinstance(x, str) and x in catalog and x != primary for x in alternatives)
                     and len(set(alternatives)) == len(alternatives)
                     and type(c.get('checkpoint')) is int and type(floor) is int and floor < c['checkpoint'] <= 100
                     and all(isinstance(c.get(key), str) and c[key].strip() for key in ('reason', 'pivot_if')))
            if accepted:
                counts['accepted_structured_plan' if valid else 'missing_structured_plan'] += 1
                if not valid:
                    evidence.append({'kind': 'accepted_without_structured_plan', 'source': row.get('_source'),
                                     'question': row.get('question_id')})
        previous = obj(facts.get('your_run_plan'))
        pc = obj(previous.get('construction'))
        matched = [r for r in saved if obj(r['plan']).get('construction') == pc
                   and obj(r['plan']).get('floor') == previous.get('made_on_floor') and r.get('ts', '') <= row.get('ts', '')]
        if pc and matched:
            counts['plan_readback'] += 1
            if task and isinstance(pc.get('checkpoint'), int) and facts.get('floor', -1) >= pc['checkpoint']:
                counts['checkpoint_review_due'] += 1
    return {'enabled': enabled, **dict(counts), 'admission': dict(admissions), 'evidence': evidence,
            'alert': enabled and (counts['evaluation_missing'] >= FAIL_STREAK or counts['missing_structured_plan'] >= FAIL_STREAK),
            'limits': 'Payload delivery, accepted output and saved/read-back plans are distinct observations, not causal win-rate evidence. Missing calibration is pending, not a service failure.'}


def readiness_pipeline(config, records, brains):
    """Measure P1 shadow production and actual brain payloads separately."""
    mode = obj(config.get('loop')).get('s_readiness', 'off')
    counts = Counter(expected=0, produced=0, missing=0, eligible=0, low_trust=0,
                     sign_rejected=0, brain_delivered=0, brain_accepted=0)
    times, streak, longest = [], 0, 0
    for row in records:
        if mode == 'off' or row.get('ts', '') < config.get('ts', '') or row.get('label') not in LABELS:
            continue
        sim = obj(row.get('boss_sim'))
        if not sim.get('samples') or sim.get('error') or sim.get('skipped'):
            continue
        counts['expected'] += 1
        value = obj(sim.get('readiness'))
        if value.get('schema') != 'boss-readiness-v1':
            counts['missing'] += 1
            streak += 1
            longest = max(longest, streak)
            continue
        streak = 0
        counts['produced'] += 1
        trust = obj(value.get('trust'))
        counts['eligible'] += trust.get('rankingEligible') is True
        counts['low_trust'] += bool(trust.get('bossTrustReason'))
        counts['sign_rejected'] += obj(trust.get('sign_audit')).get('rankingEligible') is False
        if isinstance(value.get('ms'), (float, int)) and math.isfinite(value['ms']):
            times.append(value['ms'])
    for row in brains:
        if run_of(row) != config['run_id'] or row.get('ts', '') < config.get('ts', ''):
            continue
        value = obj(obj(row.get('payload')).get('facts')).get('boss_readiness')
        if isinstance(value, str) and value.startswith('当前牌组Boss模拟胜率'):
            counts['brain_delivered'] += 1
            counts['brain_accepted'] += row.get('accepted') is True
    return {'mode': mode, **dict(counts), 'ms_max': max(times) if times else None,
            'longest_missing_streak': longest, 'alert': mode != 'off' and longest >= FAIL_STREAK,
            'limits': 'Shadow is not brain delivery. Low trust and failed sign audit suppress facts without changing mandatory computation or old ranking.'}


def combat_s_ranking_health(config, records):
    """Count actual P3 consumption; low trust and rejected attribution are explicit fallbacks."""
    mode = obj(config.get('loop')).get('s_combat_rank', 'off')
    counts = Counter(expected=0, produced=0, used=0, fallback=0, missing=0, shadow_produced=0, shadow_invalid=0)
    reasons, seen = Counter(), set()
    streak = longest = 0
    for row in records:
        if mode not in ('on', 'shadow') or row.get('ts', '') < config.get('ts', ''):
            continue
        sim = obj(row.get('boss_sim'))
        if sim.get('available') is not True:
            continue
        key = row.get('decision_id') or (row.get('ts'), row.get('label'))
        if key in seen:
            continue
        seen.add(key)
        counts['expected'] += 1
        value = obj(sim.get('s_ranking'))
        if value.get('schema') != 's-combat-ranking-v1':
            counts['missing'] += 1
            streak += 1
            longest = max(longest, streak)
            continue
        streak = 0
        counts['produced'] += 1
        if mode == 'shadow':
            valid = value.get('mode') == 'shadow' and value.get('used') is False
            counts['shadow_produced'] += valid
            counts['shadow_invalid'] += not valid
            if value.get('reason'):
                reasons[value['reason']] += 1
            continue
        counts['used'] += value.get('used') is True
        counts['fallback'] += value.get('used') is not True
        if value.get('reason'):
            reasons[value['reason']] += 1
    return {'mode': mode, **dict(counts), 'fallback_reasons': dict(reasons),
            'longest_missing_streak': longest, 'alert': longest >= FAIL_STREAK or counts['shadow_invalid'] > 0,
            'limits': 'S tie ranking is conditional on paired samples, sign audit and existing model trust; not game calibration or causal benefit.'}


def build_ranking_health(config, records, brains):
    """P2 shadow production, actual brain delivery and override receipts are different observations."""
    mode = obj(config.get('loop')).get('s_build_rank', 'off')
    counts = Counter(expected=0, produced=0, missing=0, brain_delivered=0, brain_accepted=0,
                     choices=0, overrides=0, reasons_present=0, missing_reasons=0, target_pending=0)
    seen = set()
    streak = longest = 0
    for row in records:
        if mode == 'off' or row.get('ts', '') < config.get('ts', '') or row.get('label') not in LABELS:
            continue
        sim = obj(row.get('boss_sim'))
        if not sim.get('samples') or sim.get('error') or sim.get('skipped'):
            continue
        key = row.get('decision_id') or (row.get('ts'), row.get('label'))
        if key in seen:
            continue
        seen.add(key)
        counts['expected'] += 1
        value = obj(sim.get('build_ranking'))
        if value.get('schema') != 'build-ranking-v1' or value.get('status') != 'produced':
            counts['missing'] += 1
            streak += 1
            longest = max(longest, streak)
            continue
        streak = 0
        counts['produced'] += 1
        selection = obj(value.get('selection'))
        counts['choices'] += bool(selection)
        counts['target_pending'] += selection.get('target_pending') is True
        if selection.get('deviated') is True:
            counts['overrides'] += 1
            reason = selection.get('ranking_override_reason')
            has_reason = isinstance(reason, str) and bool(reason.strip())
            counts['reasons_present'] += has_reason
            counts['missing_reasons'] += not has_reason
    for row in brains:
        if run_of(row) != config['run_id'] or row.get('ts', '') < config.get('ts', ''):
            continue
        value = obj(obj(obj(row.get('payload')).get('facts')).get('build_ranking'))
        if value.get('schema') == 'build-ranking-v1':
            counts['brain_delivered'] += 1
            counts['brain_accepted'] += row.get('accepted') is True
    return {'mode': mode, **dict(counts), 'longest_missing_streak': longest,
            'alert': longest >= FAIL_STREAK or (mode == 'on' and counts['missing_reasons'] > 0),
            'limits': 'Shadow choices do not require override reasons. Pending card targets and first shop actions do not certify complete plans or causal benefit.'}


def computation_health(records):
    counts = Counter(attempts=0, failures=0, degraded=0)
    evidence = []
    seen = set()
    for row in records:
        completion = obj(obj(row.get('boss_sim')).get('completion'))
        if not isinstance(completion.get('attempts'), int):
            continue
        # A reused answer can carry the old completion; count the actual attempt only.
        identity = completion.get('attempt_id') or (row.get('ts'), row.get('label'), completion.get('key'))
        if identity in seen:
            continue
        seen.add(identity)
        counts['attempts'] += 1
        counts['failures'] += completion.get('failure') is True
        counts['degraded'] += completion.get('status') == 'degraded'
        if completion.get('failure') or completion.get('status') == 'degraded':
            evidence.append({'ts': row.get('ts'), 'label': row.get('label'), 'floor': row.get('floor'),
                             'source': row.get('_source'), 'completion': completion})
    return {**counts, 'evidence': evidence, 'alert': bool(counts['failures'] or counts['degraded']),
            'scope': 'B2/B3 computation service failures; degradation permits continuation, not fault resolution.'}


def summarize(config, decisions, brains, coverage, plans=()):
    if str(config.get('character', '')).upper() != 'SILENT' or obj(config.get('construction')).get('architecture') != 'V5':
        return None
    rid = config['run_id']
    enabled = obj(config.get('loop')).get('boss_sim_build') == 'on'
    records = sorted((r for r in decisions if run_of(r) == rid and r.get('mode') == 'play'), key=lambda r: r.get('ts', ''))
    faults, samples, times, evidence, phases, unsupported = Counter(), [], [], [], [], []
    produced = attempts = skipped = streak = longest = 0
    candidates = Counter(observed=0, unsupported=0, with_dpr=0, missing_dpr=0)
    seen = set()
    construction = Counter()
    unique_records = []
    for row in records:
        identity = row.get('decision_id') or (row.get('ts'), row.get('label'))
        if identity in seen:
            continue
        seen.add(identity)
        unique_records.append(row)
        sim = obj(row.get('boss_sim'))
        status = obj(sim.get('construction')).get('status')
        if status:
            construction[status] += 1
        if (row.get('label') not in LABELS or not enabled
                or obj(obj(row.get('questions')).get('pick')).get('type') != 'choice'):
            continue
        if sim.get('skipped'):
            skipped += 1
            continue
        attempts += 1
        reason = failure(sim)
        options = obj(obj(obj(row.get('questions')).get('pick')).get('criteria'))
        metrics = dpr_count(options)
        candidate_counts = candidate_dpr_coverage(options, sim)
        candidates.update(candidate_counts)
        # A finished decision with no B3 record is a pipeline gap, not a game result.
        if not sim or not any(k in sim for k in ('samples', 'error', 'diagnostics')):
            reason = 'missing_simulation_record'
        elif not reason and candidate_counts['missing_dpr']:
            reason = 'incomplete_candidate_dpr' if metrics else 'no_complete_dpr'
        elif not reason and not metrics:
            if unsupported_candidates(options, sim):
                # Retain the observed attempt and its samples, but do not count an
                # explicitly unsupported choice as a missing service result.
                unsupported.append({'ts': row.get('ts'), 'decision': row.get('decision_id'),
                                    'floor': row.get('floor'), 'label': row.get('label'),
                                    'source': row.get('_source'), 'not_simulated': sim['not_simulated']})
            else:
                reason = 'no_complete_dpr'
        if reason:
            faults[reason] += 1
            streak += 1
            longest = max(longest, streak)
            evidence.append({'ts': row.get('ts'), 'decision': row.get('decision_id'), 'floor': row.get('floor'),
                             'label': row.get('label'), 'reason': reason, 'source': row.get('_source'),
                             'diagnostics': sim.get('diagnostics'), 'error': sim.get('error'),
                             'candidates': candidate_counts})
        elif metrics:
            produced += 1
            streak = 0
        diagnostic = obj(sim.get('diagnostics'))
        n = diagnostic.get('samples', sim.get('samples'))
        if n is None:
            match = re.search(r'只跑完 (\d+) 次模拟', str(sim.get('error', '')))
            n = int(match[1]) if match else (0 if reason == 'zero_paired_samples' else None)
        if isinstance(n, (int, float)):
            samples.append(n)
        if isinstance(sim.get('ms'), (int, float)):
            times.append(sim['ms'])
        if diagnostic:
            phases.append({'ts': row.get('ts'), **diagnostic})
    brain_rows = [r for r in brains if run_of(r) == rid and r.get('label') in LABELS]
    brain_rows = list({r.get('question_id') or (r.get('ts'), r.get('label')): r for r in brain_rows}.values())
    delivered = sum(dpr_count(r.get('options')) > 0 for r in brain_rows)
    complete = bool(coverage.get('decisions_complete'))
    all_brains = list({r.get('question_id') or (r.get('ts'), r.get('label')): r for r in brains if run_of(r) == rid}.values())
    pipeline = construction_pipeline(config, unique_records, all_brains, plans)
    readiness = readiness_pipeline(config, unique_records, all_brains)
    computation = computation_health(unique_records)
    adaptive = adaptive_health(config, unique_records)
    s_combat = combat_s_ranking_health(config, unique_records)
    build_ranking = build_ranking_health(config, unique_records, all_brains)
    return {'schema': 'module-health-v1', 'at': datetime.now(timezone.utc).isoformat(), 'run_id': rid,
            'character': 'SILENT', 'architecture': 'V5', 'construction_mode': obj(config.get('construction')).get('mode'),
            'simulation_enabled': enabled, 'coverage': coverage, 'complete': complete,
            'construction': dict(construction), 'construction_pipeline': pipeline, 's_readiness': readiness, 's_combat_rank': s_combat, 'build_ranking': build_ranking, 'computation': computation, 'adaptive': adaptive, 'b3': {'attempts': attempts, 'skipped': skipped, 'produced_dpr': produced,
              'coverage': produced / attempts if attempts else None, 'failures': dict(faults),
              'unsupported': len(unsupported), 'applicable_attempts': attempts - len(unsupported),
              'unsupported_only': len(unsupported), 'candidates': dict(candidates),
              'applicable_coverage': produced / (attempts - len(unsupported)) if attempts > len(unsupported) else None,
              'longest_failure_streak': longest, 'trailing_failure_streak': streak,
              'paired_samples_min': min(samples) if samples else None,
              'ms_max': max(times) if times else None},
            'brain': {'observed_questions': len(brain_rows), 'questions_with_dpr': delivered,
                      'accepted_with_dpr': sum(r.get('accepted') is True and dpr_count(r.get('options')) > 0 for r in brain_rows),
                      'decision_use': 'unknown; delivery is not evidence of reasoning or a fixed DPR weight'},
            'alert': (enabled and longest >= FAIL_STREAK) or pipeline['alert'] or readiness['alert'] or s_combat['alert'] or build_ranking['alert'] or computation['alert'] or adaptive['alert'], 'failures': evidence, 'diagnostics': phases,
            'unsupported': unsupported,
            'scope': 'Service availability only; sample threshold, simulator validity and game policy unchanged.'}


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='.' + path.name, dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def persist(report, directory, notify=True):
    """One durable alert per run; repeated ticks and the final report share the lock."""
    if report is None:
        return
    rid = report['run_id']
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,80}', rid):
        raise ValueError('invalid run id')
    health = directory / 'module-health'
    health.mkdir(parents=True, exist_ok=True)
    with (health / 'audit.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        destination = health / f'{rid}.json'
        previous = json.loads(destination.read_text()) if destination.exists() else None
        # A bounded tick must not overwrite a complete run report.
        if not (previous and previous.get('complete') and not report.get('complete')):
            atomic_json(destination, report)
        alert_path = health / f'{rid}-alert.json'
        if report['alert'] and notify:
            # The immutable evidence is durable before the queue message. Retry a crash
            # between these writes with the same filename, never create another event.
            if not alert_path.exists():
                event_ns = int(datetime.fromisoformat(report['at']).timestamp() * 1_000_000_000)
                atomic_json(alert_path, {**report, 'queue_name': f'{event_ns}-module-health.md'})
            alert = json.loads(alert_path.read_text())
            queue = directory / 'queue'
            queue.mkdir(parents=True, exist_ok=True)
            event = queue / alert['queue_name']
            sent = health / f'{rid}-queued.json'
            if not sent.exists():
                message = (f'Silent V5 {rid} 模块验收异常：检查必需计算失败/故障降级、影子采样诊断、DPR缺失与construction_pipeline接线计数。证据：{alert_path}。\n'
                           '这是模块服务健康异常，请原ops自主核对样本/耗时/阶段诊断及当前owner，沿既有修复链去重处理；'
                           '不要降低300样本门槛、自动重启对局或新建重复学习。按Roy要求无需常规回报watcher/Roy。\n')
                # Exclusive creation keeps a queued event's bytes stable across retries.
                try:
                    with event.open('x') as handle:
                        handle.write(message)
                except FileExistsError:
                    pass
                atomic_json(sent, {'event': str(event), 'at': report['at']})


def audit(root, directory, run_id=None, decisions=None, character=None, notify=True):
    configs, config_source = read_tail(root / 'logs/run-config.jsonl', 4 * 1024 * 1024)
    config = next((r for r in reversed(configs) if not run_id or r.get('run_id') == run_id), None)
    if not config or (character and character.lower() != 'silent'):
        return None
    if decisions is None:
        decisions, source = read_tail(root / 'logs/decisions.jsonl')
        complete = bool(source.get('complete') or (source.get('first_ts') and source['first_ts'] <= config['ts'] and not source.get('malformed')))
    else:
        source = {'path': str(root / 'logs/decisions.jsonl'), 'source': 'report.py full run records'}
        complete = True
    brains, brain_source = read_tail(root / 'logs/brain.jsonl')
    plans, plan_source = read_tail(root / 'logs/run-plans.jsonl', 4 * 1024 * 1024)
    report = summarize(config, decisions, brains, {'decisions_complete': complete, 'decisions': source,
                         'brain': brain_source, 'plans': plan_source, 'config': config_source}, plans)
    persist(report, directory, notify)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(os.environ.get('CODEX_OPS_ROOT') or Path(__file__).resolve().parents[1]))
    parser.add_argument('--directory', type=Path)
    parser.add_argument('--run')
    parser.add_argument('--no-notify', action='store_true')
    args = parser.parse_args()
    directory = args.directory or Path(os.environ.get('CODEX_OPS_DIR') or args.root / 'ops/codex-ops')
    report = audit(args.root, directory, args.run, notify=not args.no_notify)
    print(json.dumps({k: report[k] for k in ('run_id', 'b3', 'brain', 'complete', 'alert')} if report else {'skipped': True}, ensure_ascii=False))


if __name__ == '__main__':
    main()
