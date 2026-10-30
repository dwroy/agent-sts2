#!/usr/bin/env python3
"""After-run statistics: heavy admission, worker serialization, short publication."""
import argparse
from datetime import datetime, timezone
import fcntl
import hashlib
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
    adapter = ops_root / 'ops/board_refresh_queue.py'
    ordinary_adapter = adapter.is_file()
    if not ordinary_adapter:
        adapter = ops_root / 'ops/board_heavy.py'
    if not adapter.is_file():
        return command, 'legacy: issue-20 adapter not deployed'
    sys.path.insert(0, str(ops_root / 'ops'))
    try:
        spec = importlib.util.spec_from_file_location('refresh_board_heavy', adapter)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        queued = module.queued_argv(ops_root, command) if ordinary_adapter else module.queued_argv(ops_root, 'other', command)
        return queued, 'enabled' if queued != command else 'disabled'
    finally:
        sys.path.pop(0)


def logdb_sync_steps(ops_root):
    """Refresh both deployed readers when live and ops do not share a cache."""
    roots = [ROOT]
    if (ops_root / 'data/logdb').resolve() != (ROOT / 'data/logdb').resolve():
        roots.append(ops_root)
    return [('logdb-sync' if i == 0 else 'logdb-sync-ops-root',
             [root / 'data/logdb-venv/bin/python', ROOT / 'agent/tools/logdb/sync.py',
              '--logs', root / 'logs', '--db', root / 'data/logdb', '--no-wait'])
            for i, root in enumerate(roots)]


def step(ops_root, name, argv):
    started = time.monotonic()
    stamp = datetime.now(timezone.utc).isoformat()
    before = resource.getrusage(resource.RUSAGE_CHILDREN)
    try:
        lease_fd = os.environ.get('STS2_FIXED_DATA_LOCK_FD')
        inherited = ()
        if (ops_root / 'ops/board_heavy.py').is_file():
            sys.path.insert(0, str(ops_root / 'ops'))
            from board_heavy import resource_fds
            inherited = resource_fds(ops_root)
        key_fd = os.environ.get('STS2_REFRESH_K_FD')
        inherited = (*inherited, *((int(lease_fd),) if lease_fd else ()), *((int(key_fd),) if key_fd else ()))
        code = subprocess.run([str(a) for a in argv], check=False,
                              env={**os.environ, 'STS2_REFRESH_STEP': name},
                              pass_fds=inherited).returncode
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
    p.add_argument('--only-producer', choices=['monster-db', 'card-upgrades', 'outcome', 'construction-opportunities', 'room-costs', 'boss-damage', 'potion-equivalents', 'v6-history', 'fight-value', 'event-pages', 'move-model'], help='explicit original fixed producer; no new cadence')
    p.add_argument('--request', help='stable identity for a newly authorized explicit data refresh')
    p.add_argument('--outcome-logdb', action='store_true', help='one explicit indexed outcome backfill')
    p.add_argument('--outcome-since', help='original D1 publication cutoff for separate backfill coverage')
    p.add_argument('--queue-entered', action='store_true', help=argparse.SUPPRESS)
    args = p.parse_args()
    if args.request and (len(args.request) > 120 or not args.request.isascii() or not all(c.isalnum() or c in '_.:+-' for c in args.request)):
        p.error('invalid data request identity')
    if args.outcome_logdb and (args.only_producer != 'outcome' or not args.request or not args.character or not args.outcome_since):
        p.error('--outcome-logdb requires --only-producer outcome, --request, --character and --outcome-since')
    if args.outcome_since and not args.outcome_logdb:
        p.error('--outcome-since requires --outcome-logdb')
    root = args.ops_root.resolve()
    if args.character and (not args.character.isascii() or not args.character.replace('_', '').isalnum()):
        p.error('invalid character id')
    if not args.queue_entered:
        # The exec/queue boundary can change PID. Keep the report hook's PID
        # and a cycle identity so natural per-run receipts remain joinable.
        os.environ['STS2_REFRESH_CYCLE'] = args.request or uuid.uuid4().hex
        os.environ['STS2_REFRESH_ORIGIN_PID'] = str(os.getpid())
        os.environ['STS2_REFRESH_REQUESTED_MONOTONIC'] = str(time.monotonic())
        os.environ['STS2_REFRESH_REQUESTED_AT'] = datetime.now(timezone.utc).isoformat()
        control = Path(os.environ.get('CODEX_OPS_DIR') or root / 'ops/codex-ops') / 'learning-runtime.json'
        receipt = root / 'data/learning-runtime-launches' / (hashlib.sha256(os.environ['STS2_REFRESH_CYCLE'].encode()).hexdigest() + '.json')
        if control.exists() or receipt.exists():
            sys.path.insert(0, str(root / 'ops'))
            from learning_runtime_data import bind_launch
            bind_launch(root, ROOT, os.environ['STS2_REFRESH_CYCLE'],
                        dict(character=args.character, fight_value=args.fight_value, all=args.all, idle=args.idle, only_producer=args.only_producer, **(dict(outcome_logdb=True, outcome_since=args.outcome_since) if args.outcome_logdb else {})))
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
        sys.path.insert(0, str(root / 'ops'))
        if (root / 'ops/board_refresh_queue.py').is_file():
            from board_refresh_queue import inherited
            held = inherited(root)
        else:
            held = None
        if held is None:
            fcntl.flock(worker, fcntl.LOCK_EX)
        acquired = time.monotonic()
        failed = []
        def run(name, argv):
            if args.only_producer and name not in ('catalog',) and name.split(':')[0] != args.only_producer and not (args.outcome_logdb and name.startswith('logdb-sync')):
                return
            sys.path.insert(0, str(root / 'ops'))
            from refresh_health import observe
            cycle = os.environ.get('STS2_REFRESH_CYCLE') or 'legacy-' + str(os.getpid())
            def health(status, **details):
                try:
                    observe(root, name, cycle, status, **details)
                except (OSError, ValueError, RuntimeError) as error:
                    failed.append('refresh-health:' + name)
                    print('refresh health retained: ' + name + ' (' + type(error).__name__ + ')', file=sys.stderr)
            health('running')
            receipt = None
            code = 1
            terminal_known = False
            try:
                control = Path(os.environ.get('CODEX_OPS_DIR') or root / 'ops/codex-ops') / 'learning-runtime.json'
                if not control.exists() and not os.environ.get('STS2_REFRESH_SELECTION_FILE'):
                    code = step(root, name, argv)
                else:
                    from learning_runtime_data import refresh_step, OUTPUTS
                    producer = name.split(':')[0]
                    own = name.split(':')[1:] or characters
                    if producer in OUTPUTS:
                        identity = cycle + ':' + name
                        with refresh_step(root, ROOT, name, own, identity) as receipt:
                            code = 0 if receipt and receipt.get('already_completed') else step(root, name, argv)
                            if receipt is not None:
                                receipt['rc'] = code
                    else:
                        code = step(root, name, argv)
                terminal_known = True
                if code:
                    failed.append(name)
            except Exception as error:
                failed.append(name)
                code = 1
                terminal_known = True
                print('fixed refresh retained: ' + name + ' (' + type(error).__name__ + ')', file=sys.stderr)
            finally:
                if terminal_known:
                    health('failed' if code else 'succeeded', version=receipt.get('version') if receipt else None,
                           published=bool(receipt and receipt.get('status') == 'published' and not receipt.get('already_completed')))
        def build(name, *argv):
            return [sys.executable, BUILDERS / (name + '.py'), *argv]
        if not args.fight_value or args.all or args.only_producer:
            run('monster-db', build('build-monster-db', '--quiet', '--move-model-out', ROOT / 'knowledge/common/move-model.json'))
            run('monster-db-check', build('monster-db-check'))
            run('card-upgrades', build('build-card-upgrades'))
            run('report-state-index', [sys.executable, ROOT / 'ops/report_log_cache.py', '--warm-states', ROOT / 'logs/states.jsonl'])
            for name, command in logdb_sync_steps(root):
                run(name, command)
            for c in characters:
                outcome = build('build-outcome-stats', '--character', c)
                if args.outcome_logdb:
                    outcome[0] = ROOT / 'data/logdb-venv/bin/python'
                    outcome += ['--logdb', ROOT / 'data/logdb', '--since', args.outcome_since]
                run('outcome:'+c, outcome)
                if c == 'silent':
                    run('construction-opportunities:'+c, [ROOT / 'data/logdb-venv/bin/python', BUILDERS / 'build-construction-opportunities.py', '--character', c])
                run('room-costs:'+c, build('build-room-costs', '--character', c))
                run('boss-damage:'+c, build('build-boss-damage', '--character', c))
                run('potion-equivalents:'+c, ['bash', BUILDERS / 'refresh-potion-equivalents.sh', '--character', c])
                if c == 'silent':
                    run('v6-history:'+c, build('refresh-v6-history', '--root', ROOT, '--ops-root', root, '--character', c))
        if args.fight_value or args.all or args.only_producer == 'fight-value':
            for c in characters:
                run('fight-value:'+c, build('build-fight-value', 'all', '--character', c, *(['--idle'] if args.idle else [])))
        if args.only_producer == 'event-pages':
            run('event-pages', [ROOT / 'data/logdb-venv/bin/python', BUILDERS / 'build-event-pages.py'])
        elif args.only_producer == 'move-model':
            run('move-model', build('build-move-model'))
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
    code = 1 if failed else 0
    if os.environ.get('STS2_REFRESH_ADMISSION'):
        from board_refresh_queue import finish
        finish(root, code)
    return code


if __name__ == '__main__':
    raise SystemExit(main())
