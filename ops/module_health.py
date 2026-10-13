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


def summarize(config, decisions, brains, coverage):
    if str(config.get('character', '')).upper() != 'SILENT' or obj(config.get('construction')).get('architecture') != 'V5':
        return None
    rid = config['run_id']
    enabled = obj(config.get('loop')).get('boss_sim_build') == 'on'
    records = sorted((r for r in decisions if run_of(r) == rid and r.get('mode') == 'play'), key=lambda r: r.get('ts', ''))
    faults, samples, times, evidence, phases = Counter(), [], [], [], []
    produced = attempts = skipped = streak = longest = 0
    seen = set()
    construction = Counter()
    for row in records:
        identity = row.get('decision_id') or (row.get('ts'), row.get('label'))
        if identity in seen:
            continue
        seen.add(identity)
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
        # A finished decision with no B3 record is a pipeline gap, not a game result.
        if not sim or not any(k in sim for k in ('samples', 'error', 'diagnostics')):
            reason = 'missing_simulation_record'
        elif not reason and not metrics:
            reason = 'no_complete_dpr'
        if reason:
            faults[reason] += 1
            streak += 1
            longest = max(longest, streak)
            evidence.append({'ts': row.get('ts'), 'decision': row.get('decision_id'), 'floor': row.get('floor'),
                             'label': row.get('label'), 'reason': reason, 'source': row.get('_source'),
                             'diagnostics': sim.get('diagnostics'), 'error': sim.get('error')})
        else:
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
    return {'schema': 'module-health-v1', 'at': datetime.now(timezone.utc).isoformat(), 'run_id': rid,
            'character': 'SILENT', 'architecture': 'V5', 'construction_mode': obj(config.get('construction')).get('mode'),
            'simulation_enabled': enabled, 'coverage': coverage, 'complete': complete,
            'construction': dict(construction), 'b3': {'attempts': attempts, 'skipped': skipped, 'produced_dpr': produced,
              'coverage': produced / attempts if attempts else None, 'failures': dict(faults),
              'longest_failure_streak': longest, 'trailing_failure_streak': streak,
              'paired_samples_min': min(samples) if samples else None,
              'ms_max': max(times) if times else None},
            'brain': {'observed_questions': len(brain_rows), 'questions_with_dpr': delivered,
                      'accepted_with_dpr': sum(r.get('accepted') is True and dpr_count(r.get('options')) > 0 for r in brain_rows),
                      'decision_use': 'unknown; delivery is not evidence of reasoning or a fixed DPR weight'},
            'alert': enabled and longest >= FAIL_STREAK, 'failures': evidence, 'diagnostics': phases,
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
                message = (f'Silent V5 {rid} 连续至少{FAIL_STREAK}道适用题缺少完整DPR。证据：{alert_path}。\n'
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
    report = summarize(config, decisions, brains, {'decisions_complete': complete, 'decisions': source,
                         'brain': brain_source, 'config': config_source})
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
