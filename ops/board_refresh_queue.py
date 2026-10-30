#!/usr/bin/env python3
"""Register refresh admission before CPU/K; retain cancellation and replay debts."""
import argparse
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import sys
import time
import uuid

from board_queue_custody import atomic, alive, descriptor, digest, identity, settings
from board_queue_pin import local, sha

SCHEMA = 'sts2-refresh-admission-v1'
ENV = 'STS2_REFRESH_ADMISSION'
K_ENV = 'STS2_REFRESH_K_FD'
TERMINAL = ('finished', 'cancelled', 'deferred', 'replayed')


def directory(root):
    return local(root, 'ops/codex-ops/refresh-queue')


@contextmanager
def barrier(root):
    base = directory(root)
    base.mkdir(parents=True, exist_ok=True)
    with (base / 'admission.lock').open('a') as handle:
        # Metadata only: never wait for heavy admission or a business lock here.
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield base


def enabled(root):
    value = settings(root).get('enabled', False)
    if not value:
        from board_queue_custody import active, TERMINAL
        current = active(root)
        if (current and current[1]['phase'] not in TERMINAL) or (directory(root) / 'hold.json').exists():
            raise ValueError('unfinished custody/refresh hold cannot be bypassed by disabling control')
    return value


def bindings(root):
    return {name: sha(local(root, name).read_bytes()) if local(root, name).exists() else None
            for name in ('ops/codex-ops/learning-runtime.json', 'ops/fixed-producer-dependencies.json')}


def hold(root, epoch):
    with barrier(root) as base:
        path = base / 'hold.json'
        if path.exists() and json.loads(path.read_text())['epoch'] != epoch:
            raise ValueError('original refresh hold remains unsettled')
        atomic(path, dict(epoch=epoch, created_at=time.time()))


def classify(root, command):
    """A closed argv grammar; explicit producer/cutoff/research work is never cancelled."""
    root = Path(root).resolve()
    command = list(map(str, command))
    if len(command) < 2:
        return None
    source = Path(command[1]).resolve()
    args = command[2:]
    kind = {'refresh_driver.py': 'all', 'refresh-costs.py': 'cost',
            'global_build_funnel.py': 'funnel'}.get(source.name)
    if not kind or source.is_symlink() or not source.is_file():
        return None
    if source not in (root / 'knowledge/builders/refresh_driver.py',
                       root / '.worktrees/live/knowledge/builders/refresh_driver.py',
                       root / 'ops/refresh-costs.py', root / '.worktrees/live/ops/refresh-costs.py',
                       root / 'ops/global_build_funnel.py'):
        return None
    allowed = ({'--ops-root': str(root)} if kind == 'all' else
               {'--root': str(root), **({'--code-root': str(root / '.worktrees/live')} if kind == 'cost' else {})})
    flags = []
    character = None
    index = 0
    while index < len(args):
        flag = args[index]
        if flag in ('--all', '--queue-entered') and kind == 'all':
            flags.append(flag)
            index += 1
        elif flag in allowed and index + 1 < len(args) and args[index + 1] == allowed[flag]:
            flags.append(flag)
            index += 2
        elif flag == '--character' and kind in ('all', 'funnel') and index + 1 < len(args):
            character = args[index + 1]
            if not character or not character.isascii() or not character.replace('_', '').isalnum():
                return None
            flags.append(flag)
            index += 2
        else:
            return None
    if len(set(flags)) != len(flags) or (kind == 'all' and '--all' not in flags):
        return None
    required = {'all': {'--all', '--ops-root'}, 'cost': {'--root', '--code-root'},
                'funnel': {'--root', '--character'}}[kind]
    if not required <= set(flags):
        return None
    if kind == 'funnel' and character != 'silent':
        return None
    return dict(kind=kind, character=character, source=str(source), source_sha256=sha(source.read_bytes()))


def queued_argv(root, command):
    if not enabled(root):
        from board_heavy import queued_argv as original
        return original(root, 'other', command)
    return [sys.executable, '-B', str(local(root, 'ops/board_refresh_queue.py')),
            '--root', str(Path(root).resolve()), 'submit', '--', *map(str, command)]


def records(root):
    for path in sorted(directory(root).glob('requests/*.json')):
        row = json.loads(path.read_text())
        if (row.get('schema') != SCHEMA or row.get('root') != str(Path(root).resolve())
                or path.stem != row.get('id')):
            raise ValueError('unknown refresh admission record')
        yield path, row


def debt(base, row, reason):
    path = base / 'debts' / (row['id'] + '.json')
    if not path.exists():
        atomic(path, dict(schema=SCHEMA, id=row['id'], kind=(row['ordinary'] or {}).get('kind'),
                         original=row, reason=reason, state='pending', created_at=time.time()))


def submit(root, command):
    root = Path(root).resolve()
    command = list(map(str, command))
    from board_heavy import queued_argv as heavy
    ident = os.environ.pop('STS2_REFRESH_REPLAY_ID', None) or uuid.uuid4().hex
    if len(ident) != 32 or any(c not in '0123456789abcdef' for c in ident):
        raise ValueError('invalid fresh replay identity')
    runner = [sys.executable, '-B', str(local(root, 'ops/board_refresh_queue.py')),
              '--root', str(root), '--id', ident, 'run']
    # Admission construction does no allocation; still outside R and business locks.
    queued = heavy(root, 'other', runner)
    row = dict(schema=SCHEMA, root=str(root), id=ident, actor=identity(), command=command,
               ordinary=classify(root, command), stage='queued', requested_at=time.time(),
               admission_argv=queued, runner_argv=runner, command_started=False,
               source_cycle=os.environ.get('STS2_REFRESH_CYCLE'), bindings=bindings(root))
    path = directory(root) / 'requests' / (ident + '.json')
    with barrier(root) as base:
        if path.exists():
            raise ValueError('original request retained; identity must not be replayed')
        if (base / 'hold.json').exists():
            row.update(stage='deferred', deferred_at=time.time())
            debt(base, row, 'custody hold; no CPU claim or K wait')
        atomic(path, row)
    if row['stage'] == 'deferred':
        return 75
    os.environ[ENV] = str(path)
    os.execvp(queued[0], queued)


def own(root, ident):
    path = local(root, directory(root) / 'requests' / (ident + '.json'))
    row = json.loads(path.read_text())
    if row['actor'] != identity() or row['id'] != ident or row['root'] != str(Path(root).resolve()):
        raise ValueError('refresh request is not owned by the original process')
    return path, row


def run(root, ident):
    path, row = own(root, ident)
    from board_heavy import inherited as resource_fds
    claims = [os.readlink('/proc/self/fd/' + str(fd)) for fd in resource_fds(root)]
    row['claims'] = claims
    with barrier(root) as base:
        if row['stage'] != 'queued':
            raise ValueError('refresh request already executed or settled')
        if (base / 'hold.json').exists():
            row.update(stage='deferred', deferred_at=time.time())
            debt(base, row, 'custody hold before K wait')
            atomic(path, row)
            return 75
        row.update(stage='waiting-k', waiting_at=time.time(), claims=claims)
        atomic(path, row)
    with local(root, 'ops/knowledge-refresh.lock').open('a') as key:
        fcntl.flock(key, fcntl.LOCK_EX)
        with barrier(root):
            # A holder raced a new custody hold: do not start the producer.
            if (directory(root) / 'hold.json').exists():
                row.update(stage='deferred', deferred_at=time.time())
                debt(directory(root), row, 'custody hold at K acquisition')
                atomic(path, row)
                return 75
            row.update(stage='acquired', command_started=True, acquired_at=time.time(),
                       k_fd=key.fileno(), k_identity=descriptor(key.fileno()))
            atomic(path, row)
        os.environ[ENV] = str(path)
        os.environ[K_ENV] = str(key.fileno())
        os.set_inheritable(key.fileno(), True)
        os.execvp('ionice', ['ionice', '-c', '3', *row['command']])


def inherited(root):
    raw = os.environ.get(ENV)
    if not raw and K_ENV not in os.environ:
        return None
    path = Path(raw or '')
    row = json.loads(path.read_text())
    fd = int(os.environ[K_ENV])
    if (row['root'] != str(Path(root).resolve()) or row['actor'] != identity()
            or row['stage'] != 'acquired' or not row['command_started'] or row['k_fd'] != fd):
        raise ValueError('foreign refresh K delegation')
    descriptor(fd, row['k_identity'])
    return fd


def children(pid):
    return any(Path('/proc', str(pid), 'task', task.name, 'children').read_text().strip()
               for task in Path('/proc', str(pid), 'task').iterdir())


def retired(row):
    if alive(row['actor']):
        return False
    for name in row.get('claims', []):
        with Path(name).open('r') as handle:
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                return False
    return True


def finish(root, code):
    if not os.environ.get(ENV):
        return
    path = Path(os.environ[ENV])
    row = json.loads(path.read_text())
    if row['root'] != str(Path(root).resolve()) or row['actor'] != identity() or row['stage'] != 'acquired':
        raise ValueError('foreign refresh terminal receipt')
    row.update(stage='finished', exit_code=code, ended_at=time.time())
    atomic(path, row)


def cancellable(root, row):
    """All facts are re-read immediately before TERM; uncertainty retains the task."""
    if (not row.get('ordinary') or row.get('command_started')
            or row.get('stage') not in ('queued', 'waiting-k') or not alive(row['actor'])):
        return False
    if classify(root, row['command']) != row['ordinary']:
        return False
    if row.get('bindings') != bindings(root):
        return False
    pid = row['actor']['pid']
    if children(pid):
        return False
    argv = Path('/proc', str(pid), 'cmdline').read_bytes().decode().rstrip('\0').split('\0')
    if argv not in (row['admission_argv'], row['runner_argv']):
        # board_heavy replaces itself with the verified engine; compare its exact argv.
        from board_heavy import settings as heavy_settings
        board, _ = heavy_settings(root)
        kit = local(root, board.data['dispatcher']['install'])
        engine = [sys.executable, str(kit / 'heavy.py'), '--root', str(Path(root).resolve()),
                  'other', '--', *row['runner_argv']]
        if argv != engine:
            return False
    key = local(root, 'ops/knowledge-refresh.lock').stat()
    target = f'{os.major(key.st_dev):02x}:{os.minor(key.st_dev):02x}:{key.st_ino}'
    locks = Path('/proc/locks').read_text().splitlines()
    owned = [line for line in locks if '->' not in line and line.split()[4:5] == [str(pid)]]
    permitted = []
    lease_count, slot_count = 0, 0
    from board_heavy import settings as heavy_settings
    _, config = heavy_settings(root)
    machine = Path(config['machine_state'])
    for fd in Path('/proc', str(pid), 'fd').iterdir():
        try:
            link = Path(os.readlink(fd))
            if link.parent in (machine / 'leases', machine / 'slots'):
                info = fd.stat()
                permitted.append(f'{os.major(info.st_dev):02x}:{os.minor(info.st_dev):02x}:{info.st_ino}')
                if link.parent == machine / 'leases':
                    lease_count += 1
                    claim = json.loads((machine / 'records' / (link.name + '.json')).read_text())
                    if (claim.get('root') != str(Path(root).resolve()) or claim.get('role') != 'other'
                            or claim.get('runner_pid') != pid or str(claim.get('runner_start')) != row['actor']['start']
                            or claim.get('boot_id') != row['actor']['boot_id']
                            or claim.get('command_sha256') != hashlib.sha256(json.dumps(row['runner_argv']).encode()).hexdigest()):
                        return False
                else:
                    slot_count += 1
            info = fd.stat()
            held = Path('/proc', str(pid), 'fdinfo', fd.name).read_text()
            if any('lock:' in line and '->' not in line for line in held.splitlines()):
                target_inode = f'{os.major(info.st_dev):02x}:{os.minor(info.st_dev):02x}:{info.st_ino}'
                if target_inode not in permitted:
                    return False
        except FileNotFoundError:
            continue
    if any(line.split()[5] not in permitted for line in owned):
        return False
    if lease_count > 1 or slot_count > 1 or slot_count > lease_count:
        return False
    if row['stage'] == 'waiting-k':
        if lease_count != 1 or slot_count != 1:
            return False
        if Path('/proc', str(pid), 'wchan').read_text().strip() != 'locks_lock_inode_wait':
            return False
        if not any('->' in line and str(pid) in line.split() and target in line.split() for line in locks):
            return False
    return alive(row['actor']) and not children(pid)


def drain(root, epoch):
    with barrier(root) as base:
        held = json.loads((base / 'hold.json').read_text())
        if held['epoch'] != epoch:
            raise ValueError('foreign refresh hold')
        pending, cancelled, unknown = [], [], []
        for path, row in records(root):
            if row['stage'] in ('deferred', 'cancelled', 'replayed'):
                if row.get('claims') and not retired(row):
                    pending.append(row['id'])
                continue
            if retired(row):
                row.update(stage='cancelled' if row.get('cancel_intent') else 'finished', ended_at=time.time())
                atomic(path, row)
                continue
            try:
                safe = cancellable(root, row)
            except (OSError, ValueError, KeyError):
                safe = False
            if safe:
                debt(base, row, 'approved ordinary refresh cancellation before command/K acquisition')
                row['cancel_intent'] = dict(epoch=epoch, signal='TERM', at=time.time())
                atomic(path, row)
                # pidfd prevents a PID-reuse race between the final fact check and TERM.
                fd = os.pidfd_open(row['actor']['pid'])
                try:
                    if not alive(row['actor']):
                        raise ValueError('refresh identity retired before TERM')
                    signal.pidfd_send_signal(fd, signal.SIGTERM)
                finally:
                    os.close(fd)
                cancelled.append(row['id'])
            else:
                unknown.append(row['id'])
            pending.append(row['id'])
        from board_heavy import claims
        registered = {(r['actor']['pid'], r['actor']['start'], r['actor']['boot_id']): r
                      for _, r in records(root)}
        for claim in claims(root):
            if claim['root'] != str(Path(root).resolve()):
                continue
            actor = (claim['runner_pid'], str(claim['runner_start']), claim['boot_id'])
            row = registered.get(actor)
            if row and claim['command_sha256'] == hashlib.sha256(json.dumps(row['runner_argv']).encode()).hexdigest():
                if not retired(row) and row['id'] not in pending:
                    pending.append(row['id'])
                continue
            # An old/unregistered project claim may be queued before reaching K.
            # Only the exact offline download is independently known not to write K data.
            import shlex
            argv = shlex.split(claim['task'])
            downloader = str(Path(root).resolve() / 'eval/spire_codex.py')
            if downloader in argv and 'download' in argv and not any(name in argv for name in ('sh', 'bash', '-c')):
                continue
            if claim['role'] == 'other' or any('refresh' in arg or 'global_build_funnel.py' in arg for arg in argv):
                unknown.append('unregistered-machine-claim:' + claim['id'])
        # Pre-contract waiters cannot be silently excluded from the barrier.
        key = local(root, 'ops/knowledge-refresh.lock').stat()
        inode = (os.major(key.st_dev), os.minor(key.st_dev), key.st_ino)
        registered = {r['actor']['pid'] for _, r in records(root) if r['stage'] not in TERMINAL}
        for line in Path('/proc/locks').read_text().splitlines():
            fields = line.split()
            if '->' not in fields:
                continue
            fields = [part for part in fields if part != '->']
            device = fields[5].split(':')
            if len(device) == 3 and (int(device[0], 16), int(device[1], 16), int(device[2])) == inode:
                if int(fields[4]) not in registered:
                    unknown.append('unregistered-k-waiter:' + fields[4])
        return dict(clear=not pending and not unknown, pending=pending, cancelled=cancelled, unknown=unknown)


@contextmanager
def releasing(root, epoch):
    # Drain uses a separate short R section; the hold prevents any new executable
    # admission in between. Final close + hold removal share the same R section.
    status = drain(root, epoch)
    if not status['clear']:
        raise ValueError('refresh admission not drained: ' + json.dumps(status))
    with barrier(root) as base:
        if json.loads((base / 'hold.json').read_text())['epoch'] != epoch:
            raise ValueError('refresh hold rebound')
        yield status
        (base / 'hold.json').unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('action', choices=('submit', 'run'))
    parser.add_argument('--id')
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    os.setpriority(os.PRIO_PROCESS, 0, 19)
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    return submit(args.root, command) if args.action == 'submit' else run(args.root, args.id)


if __name__ == '__main__':
    raise SystemExit(main())
