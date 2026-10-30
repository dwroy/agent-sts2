"""Durable refresh outcomes and deduplicated alerts on the original refresh/stall cadence."""
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import time

from learning_runtime_store import Store, atomic, checked_file, packed, sha

STALE_SECONDS = 12 * 3600


def timestamp(value):
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc).timestamp()
    except (ValueError, OverflowError):
        return None


def directory(root):
    return Path(os.environ.get('CODEX_OPS_DIR') or Path(root) / 'ops/codex-ops')


def alert(dest, state, step, reason, detail, now):
    key = step + ':' + reason
    if key in state['alerts']:
        return
    # Write ahead prevents automatic duplicate sends after an uncertain append.
    state['alerts'][key] = dict(at=now, delivery='prepared', detail=detail)
    atomic(dest / 'refresh-health.json', (packed(state) + '\n').encode())
    with (dest / 'inbox-claude.md').open('a') as out:
        out.write(f"\n{datetime.fromtimestamp(now, timezone.utc).isoformat()} [refresh-health] {step} {reason}: {detail}; receipt=refresh-health.json\n")
        out.flush()
        os.fsync(out.fileno())
    state['alerts'][key]['delivery'] = 'appended'


def initial_watermarks(root, chosen):
    """Use original D1 bytes/receipts, never deployment or observation time."""
    from learning_runtime_data import OUTPUTS
    if not chosen.get('enabled'):
        return {}
    store = Store(chosen['directory'], readonly=True)
    result = {}
    try:
        releases = store.db.execute('SELECT version,manifest,provenance FROM data_releases WHERE version=?', (store.current(),)).fetchall()
        for version, manifest, provenance in releases:
            provenance = json.loads(provenance)
            for producer in chosen.get('refresh', []):
                for name, digest in json.loads(manifest).items():
                    if not any(name == pattern.replace('{character}', name.split('/')[1]) for pattern in OUTPUTS[producer]):
                        continue
                    raw = store.db.execute('SELECT body FROM objects WHERE digest=?', (digest,)).fetchone()
                    if raw is None or sha(raw[0]) != digest:
                        raise ValueError('historical refresh watermark object unavailable')
                    body = json.loads(raw[0])
                    value = timestamp(body.get('generated')) or timestamp(body.get('meta', {}).get('generated'))
                    step = producer + (':' + name.split('/')[1] if name.startswith('characters/') else '')
                    if value is not None:
                        prior = result.get(step)
                        if prior is None or value > prior['at']:
                            result[step] = dict(at=value, version=version, origin='original-D1-output')
        # Completion records are authoritative when an original producer has no generated field.
        for row, in store.db.execute('SELECT payload FROM data_attempts ORDER BY rowid'):
            body = json.loads(row)
            value = timestamp(body.get('completed_at'))
            if value is not None and body.get('status') == 'published':
                producer = body['producer']
                if producer not in chosen.get('refresh', []):
                    continue
                prov = json.loads(store.db.execute('SELECT provenance FROM data_releases WHERE version=?', (body['version'],)).fetchone()[0])
                for char in prov.get('characters', ['']):
                    name = producer + (':' + char if any('{character}' in p for p in OUTPUTS[producer]) else '')
                    if name not in result or value > result[name]['at']:
                        result[name] = dict(at=value, version=body['version'], origin='original-D1-completion')
        return result
    finally:
        store.close()


def observe(root, step=None, cycle=None, status=None, version=None, published=False, now=None):
    """start/terminal belongs to one actual selected step; a replay never adds a cycle."""
    root, now = Path(root).resolve(), time.time() if now is None else now
    dest = directory(root)
    dest.relative_to(root)
    if dest.resolve() != dest or dest.is_symlink():
        raise ValueError('linked/foreign refresh health namespace')
    dest.mkdir(parents=True, exist_ok=True)
    with (dest / 'refresh-health.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        path = dest / 'refresh-health.json'
        state = json.loads(checked_file(root, path)) if path.exists() else dict(schema='refresh-health-v1', root=str(root), steps={}, alerts={})
        if state.get('schema') != 'refresh-health-v1' or state.get('root') != str(root):
            raise ValueError('invalid refresh health state')
        from learning_runtime import capture
        chosen = capture(root)
        head, serial = None, None
        if chosen.get('enabled'):
            store = Store(chosen['directory'], readonly=True)
            try:
                head = store.current()
                serial = store.db.execute('SELECT max(rowid) FROM data_attempts').fetchone()[0]
            finally:
                store.close()
        binding = [chosen.get('control_sha256'), head, serial]
        if state.get('watermark_binding') != binding:
            for name, watermark in initial_watermarks(root, chosen).items():
                row = state['steps'].setdefault(name, dict(recent=[]))
                if watermark['at'] > row.get('publication', {}).get('at', 0):
                    row['publication'] = watermark
            state['watermark_binding'] = binding
        if not state.get('legacy_timings_checked'):
            timings = root / 'ops/refresh-timing.jsonl'
            if timings.exists():
                for line in checked_file(root, timings, 64 * 1024 * 1024).splitlines():
                    try:
                        item = json.loads(line)
                    except ValueError:
                        continue
                    value = timestamp(item.get('ended_at'))
                    if item.get('schema') == 'knowledge-refresh-step-v1' and item.get('exit_code') == 0 and value:
                        row = state['steps'].setdefault(item['name'], dict(recent=[]))
                        row['completion'] = dict(at=value, origin='original-refresh-timing')
            state['legacy_timings_checked'] = True
        if step is not None:
            if status not in ('running', 'failed', 'succeeded') or not isinstance(cycle, str) or not cycle:
                raise ValueError('invalid refresh health event')
            row = state['steps'].setdefault(step, dict(recent=[]))
            event_path = dest / 'refresh-health-events' / (sha(packed([step, cycle]).encode()) + '.json')
            event = json.loads(checked_file(root, event_path)) if event_path.exists() else None
            if event is None:
                event = dict(step=step, cycle=cycle, status='running', started_at=now)
                row['recent'] = (row['recent'] + [dict(cycle=cycle, status='running')])[-3:]
            terminal = event['status'] == 'running' and status != 'running'
            recovered = event['status'] == 'failed' and status == 'succeeded' and 'recovery' not in event
            if terminal:
                event.update(status=status, ended_at=now, version=version, published=published)
            elif recovered:
                # Keep the original failed terminal; its successful retry is a separate fact.
                event['recovery'] = dict(status=status, ended_at=now, version=version, published=published)
            if terminal or recovered:
                for recent in row['recent']:
                    if recent['cycle'] == cycle:
                        recent['status'] = status
                if status == 'succeeded':
                    row['recent'] = ([e for e in row['recent'] if e['cycle'] != cycle] + [dict(cycle=cycle, status=status)])[-3:]
                    row['completion'] = dict(at=now, origin='refresh-terminal')
                # Publication time comes exclusively from durable D1 input/receipts
                # above. A delayed observer/replay must never move that clock.
            atomic(event_path, (packed(event) + '\n').encode())
        for name, row in state['steps'].items():
            recent = row['recent']
            failing = len(recent) == 3 and all(e['status'] == 'failed' for e in recent)
            if failing:
                alert(dest, state, name, 'three-failed-cycles', 'cycles=' + ','.join(e['cycle'] for e in recent), now)
            elif recent and recent[-1]['status'] == 'succeeded':
                state['alerts'].pop(name + ':three-failed-cycles', None)
            watermark = row.get('publication') or row.get('completion')
            reason = 'publication-older-than-12h' if row.get('publication') else 'step-completion-older-than-12h'
            if watermark and now - watermark['at'] > STALE_SECONDS:
                alert(dest, state, name, reason, 'last=' + str(watermark), now)
            elif watermark:
                state['alerts'].pop(name + ':' + reason, None)
        atomic(path, (packed(state) + '\n').encode())
        return state


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    args = parser.parse_args()
    os.setpriority(os.PRIO_PROCESS, 0, 19)
    observe(args.root)
