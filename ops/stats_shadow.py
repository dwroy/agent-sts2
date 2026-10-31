"""Bounded five-natural-run acceptance. Read-only; ops owns the boundary switch."""
import argparse
import json
from pathlib import Path

from stats_runtime import ordinary, packed, sha


def complete_audit(events, binding):
    sessions = {}
    for event in events:
        if (event.get('run_key') != binding['run_key'] or event.get('bundle_sha') != binding['bundle_sha']
                or not isinstance(event.get('session'), str) or not event['session']):
            return False
        sessions.setdefault(event['session'], []).append(event)
    if not sessions:
        return False
    for rows in sessions.values():
        reads, end = rows[:-1], rows[-1]
        if (not reads or end.get('schema') != 'stats-shadow-session-v1' or end.get('write_failures') != 0
                or end.get('reads') != len(reads)):
            return False
        for index, event in enumerate(reads, 1):
            if (event.get('schema') != 'stats-resource-shadow-v1' or event.get('sequence') != index
                    or event.get('equal') is not True or event.get('error_type') is not None
                    or int(event.get('json_ns', -1)) < 0 or int(event.get('sqlite_ns', -1)) < 0):
                return False
    return True


def assess(runs, configs, read_audit, latency, capabilities):
    """Every intervening failed/unknown run breaks the consecutive window."""
    latency_ok = (latency.get('schema') == 'stats-latency-v1' and latency.get('capabilities_sha') == capabilities
                  and latency.get('exact_values') is True and latency.get('independent_cases', 0) >= 200
                  and 0 <= latency.get('noise_ms', -1) <= 1
                  and latency.get('p95_increment_upper_ms', float('inf')) <= latency['noise_ms']
                  and latency.get('p99_increment_upper_ms', float('inf')) <= latency['noise_ms'])
    streak, failures, seen = [], [], set()
    for run in runs:
        rid = run.get('run_id')
        if not run.get('ended') or rid in seen:
            continue
        seen.add(rid)
        rows = configs.get(rid, [])
        selected = rows[-1].get('knowledge', {}).get('assets') if rows else None
        reason = None
        if (not selected or selected.get('mode') != 'shadow' or rows[-1].get('loop', {}).get('mode') != 'play'
                or selected.get('binding', {}).get('bundle', {}).get('capabilities_sha') != capabilities
                or any(row.get('knowledge', {}).get('assets') != selected for row in rows)):
            reason = 'not_same_natural_shadow_binding'
        else:
            try:
                events = read_audit(selected)
                binding = selected['binding']
                if not complete_audit(events, binding):
                    reason = 'difference_or_incomplete_audit'
            except (OSError, ValueError, KeyError, TypeError):
                reason = 'unavailable_audit'
        if reason:
            streak = []
            failures.append({'run_id': rid, 'reason': reason})
        else:
            streak = (streak + [rid])[-5:]
    return {'schema': 'stats-shadow-acceptance-v1', 'capabilities_sha': capabilities,
            'consecutive_zero_difference_runs': streak, 'consecutive_count': len(streak),
            'latency_passed': latency_ok, 'eligible_for_ops_boundary_switch': len(streak) == 5 and latency_ok,
            'failures': failures[-20:], 'production_switch_performed': False}


def rows(path, limit):
    path = Path(path)
    with path.open('rb') as stream:
        stream.seek(0, 2)
        size = stream.tell()
        stream.seek(max(0, size - limit))
        if size > limit:
            stream.readline()
        data = stream.read()
    if data and not data.endswith(b'\n'):
        raise ValueError('incomplete original shadow evidence tail')
    return [json.loads(line) for line in data.splitlines() if line]


def report(root, latency_path, capabilities):
    root = Path(root).resolve()
    configs = {}
    for row in rows(root / 'logs/run-config.jsonl', 8 * 1024 * 1024):
        configs.setdefault(row['run_id'], []).append(row)

    def audit(selection):
        key = selection['binding']['run_key']
        expected = root / 'logs/stats-shadow' / (sha(key.encode()) + '.jsonl')
        if selection.get('shadow_log') != str(expected):
            raise ValueError('original shadow audit redirected')
        raw = ordinary(expected, 64 * 1024 * 1024)
        if raw and not raw.endswith(b'\n'):
            raise ValueError('incomplete original shadow audit')
        return [json.loads(line) for line in raw.splitlines() if line]
    latency = json.loads(ordinary(Path(latency_path).resolve(), 1024 * 1024))
    return assess(rows(root / 'logs/runs.jsonl', 2 * 1024 * 1024), configs, audit, latency, capabilities)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True)
    parser.add_argument('--latency', required=True)
    parser.add_argument('--capabilities', required=True)
    args = parser.parse_args()
    print(packed(report(args.root, args.latency, args.capabilities)))
