#!/usr/bin/env python3
"""After-run statistics: heavy admission, worker serialization, short publication."""
import argparse
from datetime import datetime, timezone
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import resource
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
BUILDERS = ROOT / 'knowledge/builders'


def queue_command(ops_root, command):
    """Use #20's exact public adapter when deployed; old installations stay explicit."""
    adapter = ops_root / 'ops/board_heavy.py'
    if not adapter.is_file():
        return command, 'legacy: issue-20 adapter not deployed'
    sys.path.insert(0, str(ops_root / 'ops'))
    try:
        spec = importlib.util.spec_from_file_location('refresh_board_heavy', adapter)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        queued = module.queued_argv(ops_root, 'other', command)
        return queued, 'enabled' if queued != command else 'disabled'
    finally:
        sys.path.pop(0)


def step(ops_root, name, argv):
    started = time.monotonic()
    stamp = datetime.now(timezone.utc).isoformat()
    before = resource.getrusage(resource.RUSAGE_CHILDREN)
    try:
        code = subprocess.run([str(a) for a in argv], check=False,
                              env={**os.environ, 'STS2_REFRESH_STEP': name}).returncode
    except OSError:
        code = 127
        print('knowledge-refresh step could not start: ' + name, file=sys.stderr)
    after = resource.getrusage(resource.RUSAGE_CHILDREN)
    row = dict(schema='knowledge-refresh-step-v1', started_at=stamp,
               ended_at=datetime.now(timezone.utc).isoformat(), name=name,
               seconds=time.monotonic()-started, worker_pid=os.getpid(),
               cycle=os.environ.get('STS2_REFRESH_CYCLE'),
               exit_code=code, nice=os.nice(0),
               cpu_user_seconds=after.ru_utime-before.ru_utime,
               cpu_system_seconds=after.ru_stime-before.ru_stime, peak_child_rss_kib=after.ru_maxrss)
    with (ops_root / 'ops/refresh-timing.jsonl').open('a') as out:
        out.write(json.dumps(row)+'\n')
    return code


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--ops-root', type=Path, default=ROOT)
    p.add_argument('--character')
    p.add_argument('--fight-value', action='store_true')
    p.add_argument('--all', action='store_true', help='normal and fight-value in one serialized worker')
    p.add_argument('--idle', action='store_true', help='ops-verified idle training boundary')
    p.add_argument('--queue-entered', action='store_true', help=argparse.SUPPRESS)
    args = p.parse_args()
    root = args.ops_root.resolve()
    if args.character and (not args.character.isascii() or not args.character.replace('_', '').isalnum()):
        p.error('invalid character id')
    if not args.queue_entered:
        # The exec/queue boundary can change PID. Keep the report hook's PID
        # and a cycle identity so natural per-run receipts remain joinable.
        os.environ['STS2_REFRESH_CYCLE'] = uuid.uuid4().hex
        os.environ['STS2_REFRESH_ORIGIN_PID'] = str(os.getpid())
        os.environ['STS2_REFRESH_REQUESTED_MONOTONIC'] = str(time.monotonic())
        os.environ['STS2_REFRESH_REQUESTED_AT'] = datetime.now(timezone.utc).isoformat()
        command = [sys.executable, str(Path(__file__).resolve()), *sys.argv[1:], '--queue-entered']
        queued, status = queue_command(root, command)
        print('knowledge-refresh heavy queue: ' + status, flush=True)
        # Exec preserves the original task identity. Admission precedes all locks.
        os.execv(queued[0], queued)
    from characters import characters_with_runs
    characters = [args.character.lower()] if args.character else characters_with_runs(ROOT / 'logs/runs.jsonl')
    os.environ['STS2_REFRESH_CACHE_DIR'] = str(root / 'ops/legacy-refresh-cache')
    os.environ['STS2_REFRESH_OPS_ROOT'] = str(root)
    for key in ('OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'NUMEXPR_NUM_THREADS'):
        os.environ[key] = '1'
    (root / 'ops').mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    requested = float(os.environ.get('STS2_REFRESH_REQUESTED_MONOTONIC', started))
    with (root / 'ops/knowledge-refresh.lock').open('a') as worker:
        fcntl.flock(worker, fcntl.LOCK_EX)
        acquired = time.monotonic()
        failed = []
        def run(name, argv):
            if step(root, name, argv):
                failed.append(name)
        def build(name, *argv):
            return [sys.executable, BUILDERS / (name + '.py'), *argv]
        if not args.fight_value or args.all:
            run('monster-db', build('build-monster-db', '--quiet', '--move-model-out', ROOT / 'knowledge/common/move-model.json'))
            run('monster-db-check', build('monster-db-check'))
            run('card-upgrades', build('build-card-upgrades'))
            run('report-state-index', [sys.executable, ROOT / 'ops/report_log_cache.py', '--warm-states', ROOT / 'logs/states.jsonl'])
            run('logdb-sync', [ROOT / 'data/logdb-venv/bin/python', ROOT / 'agent/tools/logdb/sync.py'])
            for c in characters:
                run('outcome:'+c, build('build-outcome-stats', '--character', c))
                if c == 'silent':
                    run('construction-opportunities:'+c, [ROOT / 'data/logdb-venv/bin/python', BUILDERS / 'build-construction-opportunities.py', '--character', c])
                run('room-costs:'+c, build('build-room-costs', '--character', c))
                run('boss-damage:'+c, build('build-boss-damage', '--character', c))
                run('potion-equivalents:'+c, ['bash', BUILDERS / 'refresh-potion-equivalents.sh', '--character', c])
                if c == 'silent':
                    run('v6-history:'+c, build('refresh-v6-history', '--root', ROOT, '--ops-root', root, '--character', c))
        if args.fight_value or args.all:
            for c in characters:
                run('fight-value:'+c, build('build-fight-value', 'all', '--character', c, *(['--idle'] if args.idle else [])))
        run('catalog', build('build-catalog', '--knowledge-root', ROOT / 'knowledge'))
        held = time.monotonic()-acquired
    with (root / 'ops/refresh-timing.jsonl').open('a') as out:
        out.write(json.dumps(dict(schema='knowledge-refresh-cycle-v1', pid=os.getpid(),
            cycle=os.environ.get('STS2_REFRESH_CYCLE'), characters=characters,
            origin_pid=int(os.environ.get('STS2_REFRESH_ORIGIN_PID', os.getpid())),
            requested_at=os.environ.get('STS2_REFRESH_REQUESTED_AT'), queue_wait_seconds=started-requested,
            wall_seconds=time.monotonic()-requested,
            ended_at=datetime.now(timezone.utc).isoformat(), seconds=time.monotonic()-started,
            worker_wait_seconds=acquired-started, worker_held_seconds=held, failed_steps=failed))+'\n')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
