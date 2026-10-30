#!/usr/bin/env python3
"""Batch-scoped custody of the original refresh FLOCK, never a main writer."""
import argparse
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import select
import signal
import socket
import struct
import subprocess
import sys
import time
import uuid

from board_queue_pin import local

SCHEMA = 'sts2-k-custody-v1'
TERMINAL = ('released', 'failed-released')


class CustodyError(ValueError):
    pass


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def identity(pid=None):
    pid = os.getpid() if pid is None else pid
    fields = Path('/proc', str(pid), 'stat').read_text().rsplit(')', 1)[1].split()
    if fields[0] in ('Z', 'X'):
        raise ProcessLookupError('process is retired')
    return dict(pid=pid, start=fields[19], boot_id=Path('/proc/sys/kernel/random/boot_id').read_text().strip())


def alive(row):
    try:
        return identity(row['pid']) == row
    except (FileNotFoundError, ProcessLookupError, KeyError):
        return False


def atomic(path, value, exclusive=False):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, 'w') as handle:
            json.dump(value, handle, sort_keys=True)
            handle.write('\n')
            handle.flush()
            os.fsync(handle.fileno())
        if exclusive:
            os.link(temporary, path)
            temporary.unlink()
        else:
            os.replace(temporary, path)
        directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        temporary.unlink(missing_ok=True)


def settings(root):
    path = local(root, '.agents/merge-queue.json')
    value = json.loads(path.read_text()).get('custody', {}) if path.exists() else {}
    if not isinstance(value, dict) or type(value.get('enabled', False)) is not bool:
        raise CustodyError('invalid custody control')
    if value.get('enabled') and (value.get('schema') != SCHEMA
            or type(value.get('handshake_seconds')) is not int or not 1 <= value['handshake_seconds'] <= 30):
        raise CustodyError('explicit bounded custody contract required')
    if value.get('enabled'):
        pin = json.loads(local(root, '.agents/board-kit-pin.json').read_text())
        commit = pin.get('commit', '')
        if (len(commit) != 40 or any(c not in '0123456789abcdef' for c in commit)
                or commit == '51c289c573c59ac0c0b7ecda1d7ae035712927bd'
                or 'sts2-queue-control-v1' not in pin.get('project_control_contracts', [])):
            raise CustodyError('reviewed fixed-kit lifecycle capability required; old engine cannot enable custody')
    return value


def directory(root):
    return local(root, 'ops/codex-ops/queue-custody')


@contextmanager
def guard(root):
    path = directory(root) / 'control.lock'
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def public(row):
    return {name: value for name, value in row.items() if name != 'token'}


def load(path):
    path = Path(path)
    if path.is_symlink():
        raise CustodyError('custody record replaced by a symlink')
    value = json.loads(path.read_text())
    if not isinstance(value, dict) or value.get('schema') != SCHEMA:
        raise CustodyError('unknown custody record')
    return value


def active(root):
    pointer = directory(root) / 'active.json'
    if not pointer.exists():
        return None
    row = json.loads(pointer.read_text())
    path = local(root, row['record'])
    saved = load(path)
    if saved['root'] != str(Path(root).resolve()) or row['epoch'] != saved['epoch']:
        raise CustodyError('foreign custody binding')
    return path, saved


def descriptor(fd, expected=None, pid=None):
    proc = Path('/proc', str(os.getpid() if pid is None else pid))
    path = proc / 'fd' / str(fd)
    info = path.stat()
    locks = (proc / 'fdinfo' / str(fd)).read_text()
    if not any(' FLOCK ' in line and ' WRITE ' in line and '->' not in line for line in locks.splitlines()):
        raise CustodyError('K descriptor does not hold an actual kernel FLOCK')
    value = dict(device=info.st_dev, inode=info.st_ino)
    if expected is not None and value != expected:
        raise CustodyError('K descriptor identity changed')
    return value


def address(value):
    return chr(0) + value[1:]


def canonical(row):
    info = local(row['root'], 'ops/knowledge-refresh.lock').stat()
    if dict(device=info.st_dev, inode=info.st_ino) != row['k_identity']:
        raise CustodyError('canonical K path rebound')


def send(sock, value, descriptors=()):
    raw = json.dumps(value, sort_keys=True).encode()
    if len(raw) > 60000:
        raise CustodyError('oversized custody message')
    socket.send_fds(sock, [raw], list(descriptors))


def receive(sock, maximum=2):
    raw, descriptors, flags, _ = socket.recv_fds(sock, 65536, maximum)
    if not raw or flags & (socket.MSG_TRUNC | socket.MSG_CTRUNC):
        for fd in descriptors:
            os.close(fd)
        raise CustodyError('custody channel closed or truncated')
    try:
        value = json.loads(raw)
        if not isinstance(value, dict):
            raise CustodyError('custody message must be an object')
        return value, descriptors
    except ValueError:
        for fd in descriptors:
            os.close(fd)
        raise


def request(path, action, **fields):
    row = load(path)
    with socket.socket(socket.AF_UNIX, socket.SOCK_SEQPACKET) as channel:
        channel.settimeout(3)
        channel.connect(address(row['address']))
        send(channel, dict(action=action, epoch=row['epoch'], token=row['token'], **fields))
        reply, descriptors = receive(channel)
    if not reply.get('ok'):
        for fd in descriptors:
            os.close(fd)
        raise CustodyError(reply.get('reason', 'custody request rejected'))
    return reply, descriptors


def fail(path, reason):
    row = load(path)
    if row['phase'] in ('failed', *TERMINAL):
        return public(row)
    row.update(phase='failed', failure=reason, failed_at=time.time(), cleanup_pending=True)
    atomic(path, row)
    atomic(Path(path).parent / 'custody-failure.json', public(row))
    return public(row)


def observe(root):
    current = active(root)
    if current is None:
        return None
    path, row = current
    if row['phase'] == 'failed':
        return public(row)
    if row['phase'] == 'starting' and alive(row['worker']) and time.time() - row['created_at'] < settings(root)['handshake_seconds']:
        return public(row)
    if row['phase'] not in TERMINAL and (not row.get('keeper') or not alive(row['keeper'])):
        return fail(path, 'custodian interrupted')
    if row['phase'] not in TERMINAL:
        try:
            canonical(row)
            descriptor(row['keeper_fd'], row['k_identity'], row['keeper']['pid'])
        except (FileNotFoundError, ProcessLookupError, CustodyError):
            return fail(path, 'custodian kernel lock lost')
    return public(row)


def verify(context):
    lease = context.get('custody')
    if not lease:
        return
    row = load(lease['record'])
    if (row['epoch'] != lease['epoch'] or row['job_sha256'] != digest(context['job'])
            or row['candidate'] != context['job']['candidate'] or row['phase'] in ('failed', *TERMINAL)
            or not alive(row['keeper'])):
        fail(lease['record'], 'custodian interrupted or rebound')
        raise CustodyError('custodian interrupted or rebound; batch failed')
    try:
        canonical(row)
        descriptor(lease['k_fd'], row['k_identity'])
        descriptor(row['keeper_fd'], row['k_identity'], row['keeper']['pid'])
    except (OSError, CustodyError) as error:
        fail(lease['record'], 'custody kernel descriptor lost: ' + str(error))
        raise CustodyError('custody kernel descriptor lost; batch failed') from error
    if select.select([lease['life_fd']], [], [], 0)[0] and os.read(lease['life_fd'], 1) == b'':
        fail(lease['record'], 'custodian lifeline closed')
        raise CustodyError('custodian lifeline closed; batch failed')


def fds(context):
    lease = context.get('custody')
    return (lease['k_fd'], lease['life_fd']) if lease else ()


def light(root, pid):
    current = active(root)
    if current is None:
        return False
    path, row = current
    if (row['phase'] not in ('awaiting-adoption', 'failed') or row.get('keeper', {}).get('pid') != pid
            or not alive(row['keeper']) or alive(row['worker'])):
        return False
    descriptor(row['keeper_fd'], row['k_identity'], pid)
    # The keeper received only its handshake socket. It must never inherit a
    # compute lease or full lock; an unknown extra descriptor keeps legacy accounting.
    for fd in Path('/proc', str(pid), 'fd').iterdir():
        target = os.readlink(fd)
        if int(fd.name) > 2 and int(fd.name) != row['keeper_fd'] and not target.startswith(('pipe:[', 'socket:[')):
            return False
    for child in (path.parent / 'check-children').glob('*.json'):
        value = json.loads(child.read_text())
        if not value.get('finished'):
            try:
                actor = identity(value['pid'])
                if value.get('start') is None or actor['start'] == value['start']:
                    return False
            except (FileNotFoundError, ProcessLookupError):
                pass
    return not other_holders(row)


def start(context):
    root = Path(context['job']['root']).resolve()
    config = settings(root)
    if not config.get('enabled', False):
        return
    if context['job'].get('project_control_contract') != 'sts2-queue-control-v1':
        raise CustodyError('undeclared legacy job retained; new custody requires a frozen project contract')
    from publication_gate import present, directory as publication_directory, MARKER
    if present(publication_directory(root) / MARKER):
        raise CustodyError('original publication must settle before a new custody batch')
    from board_refresh_queue import hold
    job_path = local(root, context['job_path'])
    epoch = uuid.uuid4().hex
    record = job_path.parent / 'custody.json'
    row = dict(schema=SCHEMA, root=str(root), job_path=str(job_path), job_sha256=digest(context['job']),
               candidate=context['job']['candidate'], epoch=epoch, token=uuid.uuid4().hex,
               address='@sts2-custody-' + digest([str(root), epoch])[:32], phase='starting',
               worker=identity(), created_at=time.time(), borrowers=[])
    with guard(root):
        previous = active(root)
        if previous is not None and previous[1]['phase'] not in TERMINAL:
            raise CustodyError('another custody epoch remains unsettled')
        if record.exists():
            raise CustodyError('original custody record retained; do not start a second keeper')
        hold(root, epoch)
        atomic(record, row)
        atomic(directory(root) / 'active.json', dict(epoch=epoch, record=str(record.relative_to(root))))
    parent, child = socket.socketpair(socket.AF_UNIX, socket.SOCK_SEQPACKET)
    received = []
    try:
        with (job_path.parent / 'custody.log').open('ab') as log:
            process = subprocess.Popen([sys.executable, '-B', str(Path(__file__).resolve()), 'keeper',
                                        '--record', str(record), '--channel', str(child.fileno())],
                                       pass_fds=(child.fileno(),), stdin=subprocess.DEVNULL, stdout=log,
                                       stderr=subprocess.STDOUT, start_new_session=True)
        child.close()
        parent.settimeout(config['handshake_seconds'])
        reply, descriptors = receive(parent)
        received = descriptors
        if not reply.get('ok') or len(descriptors) != 2:
            raise CustodyError(reply.get('reason', 'custody handshake failed'))
        row = load(record)
        if row['keeper'] != identity(process.pid) or reply['receipt_sha256'] != digest(public(row)):
            raise CustodyError('custody handshake receipt differs from original process')
        context['custody'] = dict(record=str(record), epoch=epoch, k_fd=descriptors[0], life_fd=descriptors[1],
                                   keeper=row['keeper'], k_identity=row['k_identity'], held_at=row['held_at'])
        verify(context)
    except (OSError, ValueError) as error:
        for fd in received:
            os.close(fd)
        context.pop('custody', None)
        fail(record, 'before-full handshake: ' + str(error))
        raise CustodyError('K custody unavailable; full must not start: ' + str(error)) from error
    finally:
        parent.close()
        child.close()


@contextmanager
def source_locks(context):
    root = Path(context['job']['root'])
    if not context.get('custody'):
        from publication_gate import source_locks as original
        with original(root):
            yield
        return
    verify(context)
    with local(root, 'ops/live-merge.lock').open('a') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


@contextmanager
def borrow(root, record_path, expected_job, marker, repair=False):
    record_path = local(root, record_path)
    row = load(record_path)
    if row['root'] != str(Path(root).resolve()) or row['job_sha256'] != expected_job:
        raise CustodyError('foreign adoption custody')
    from board_heavy import inherited
    if not inherited(root):
        raise CustodyError('strict borrower requires original managed admission')
    reply, descriptors = request(record_path, 'borrow', job=expected_job, marker=str(marker), repair=repair)
    if len(descriptors) != 1:
        for fd in descriptors:
            os.close(fd)
        raise CustodyError('exactly one original K descriptor required')
    fd = descriptors[0]
    try:
        descriptor(fd, row['k_identity'])
        request(record_path, 'borrowed', job=expected_job, fd=fd, marker=str(marker), repair=repair)
        yield fd
    finally:
        os.close(fd)


def authorized(row, actor, marker):
    from publication_gate import read
    marker = local(row['root'], marker)
    if marker.name != 'PUBLICATION_ADMISSION.json':
        raise CustodyError('original publication marker required')
    value = read(row['root'], marker.parent)
    binding = (value or {}).get('custody', {})
    if (not value or not value.get('owner_alive') or binding.get('epoch') != row['epoch']
            or binding.get('job') != row['job_sha256'] or binding.get('record') != str(Path(row['job_path']).parent / 'custody.json')
            or binding.get('marker') != str(marker)):
        raise CustodyError('publication custody authority changed')
    pid = actor['pid']
    for _ in range(128):
        fields = Path('/proc', str(pid), 'stat').read_text().rsplit(')', 1)[1].split()
        if pid == value['pid'] and fields[19] == value['pid_birth']:
            break
        if pid <= 1:
            raise CustodyError('custody actor is not the original publication owner/child')
        pid = int(fields[1])
    else:
        raise CustodyError('publication actor ancestry unknown')
    for lock in ('learn.lock', 'game-admission.lock'):
        info = (marker.parent / lock).stat()
        wanted = dict(device=info.st_dev, inode=info.st_ino)
        held = False
        for path in Path('/proc', str(actor['pid']), 'fd').iterdir():
            try:
                if path.stat().st_ino == info.st_ino and path.stat().st_dev == info.st_dev:
                    descriptor(int(path.name), wanted, actor['pid'])
                    held = True
            except (FileNotFoundError, CustodyError):
                continue
        if not held:
            raise CustodyError('borrower does not hold original learn/game lock order')


def other_holders(row):
    holders = []
    for proc in Path('/proc').glob('[0-9]*'):
        try:
            if proc.stat().st_uid != os.getuid():
                continue
            actor = identity(int(proc.name))
            for path in (proc / 'fd').iterdir():
                try:
                    info = path.stat()
                    if dict(device=info.st_dev, inode=info.st_ino) == row['k_identity']:
                        descriptor(int(path.name), row['k_identity'], int(proc.name))
                        if actor != row['keeper']:
                            holders.append(dict(actor=actor, fd=int(path.name)))
                except (FileNotFoundError, CustodyError):
                    continue
        except (FileNotFoundError, ProcessLookupError):
            continue
    return holders


def outcome(row, path):
    path = local(row['root'], path)
    expected = Path(row['job_path']).parent / 'custody-outcome.json'
    value = json.loads(path.read_text())
    if (path != expected or value.get('schema') != 'sts2-custody-outcome-v1'
            or value.get('job') != row['job_sha256'] or value.get('epoch') != row['epoch']
            or value.get('candidate') != row['candidate']
            or value.get('kind') != ('failed' if row['phase'] == 'failed' else 'adopted')):
        raise CustodyError('original durable terminal outcome required')
    return digest(value)


def save_outcome(path, value):
    path = Path(path)
    if path.exists():
        previous = json.loads(path.read_text())
        if previous == value:
            return
        if not isinstance(previous, dict) or any(previous.get(key) != value.get(key)
                for key in ('schema', 'epoch', 'job', 'candidate')):
            raise CustodyError('foreign prior outcome retained')
        if previous.get('kind') == 'failed' and value.get('kind') == 'adopted':
            raise CustodyError('failed custody cannot be revived')
        checksum = digest(previous)
        archive = path.parent / 'custody-outcome-history' / (checksum + '.json')
        if archive.exists() and json.loads(archive.read_text()) != previous:
            raise CustodyError('original outcome history changed')
        if not archive.exists():
            atomic(archive, previous)
        value = dict(value, prior_outcome_sha256=checksum)
    atomic(path, value)


def keeper(record_path, channel_fd):
    record_path = Path(record_path)
    row = load(record_path)
    root = Path(row['root'])
    bootstrap = socket.socket(fileno=channel_fd)
    key = local(root, 'ops/knowledge-refresh.lock').open('a')
    read_life, write_life = os.pipe()
    server = socket.socket(socket.AF_UNIX, socket.SOCK_SEQPACKET)
    try:
        peer = struct.unpack('3i', bootstrap.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, 12))
        if peer[:2] != (row['worker']['pid'], os.getuid()) or not alive(row['worker']):
            raise CustodyError('original worker identity changed before K acquisition')
        fcntl.flock(key, fcntl.LOCK_EX | fcntl.LOCK_NB)
        row.update(phase='holding', keeper=identity(), keeper_fd=key.fileno(),
                   k_identity=descriptor(key.fileno()), held_at=time.time())
        server.bind(address(row['address']))
        server.listen(8)
        server.settimeout(1)
        atomic(record_path, row)
        send(bootstrap, dict(ok=True, receipt_sha256=digest(public(row))), (key.fileno(), read_life))
        bootstrap.close()
        os.close(read_life)
        read_life = None
        def interrupted(_number, _frame):
            fail(record_path, 'custodian interrupted by signal')
            raise SystemExit(143)
        signal.signal(signal.SIGTERM, interrupted)
        signal.signal(signal.SIGINT, interrupted)
        while True:
            saved = load(record_path)
            if saved.get('failure'):
                row.update(phase='failed', failure=saved['failure'], cleanup_pending=True)
                if write_life is not None:
                    os.close(write_life)
                    write_life = None
            result_path = record_path.parent / 'result.json'
            if not alive(row['worker']) and row['phase'] not in ('failed', *TERMINAL):
                result = json.loads(result_path.read_text()) if result_path.is_file() else None
                if result and result.get('job') == row['job_sha256'] and result.get('outcome') == 'passed':
                    row.update(phase='awaiting-adoption', checks_ended_at=time.time())
                else:
                    row.update(phase='failed', failure='worker failed or interrupted', cleanup_pending=True)
                atomic(record_path, row)
            try:
                connection, _ = server.accept()
            except socket.timeout:
                continue
            with connection:
                connection.settimeout(3)
                try:
                    caller, uid, _gid = struct.unpack('3i', connection.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, 12))
                    message, extra = receive(connection, 0)
                    if extra or uid != os.getuid() or message.get('token') != row['token'] or message.get('epoch') != row['epoch']:
                        raise CustodyError('foreign custody actor/epoch')
                    actor = identity(caller)
                    action = message.get('action')
                    if action in ('full-start', 'borrow', 'borrowed', 'release'):
                        canonical(row)
                    if action == 'status':
                        send(connection, dict(ok=True, custody=public(row)))
                    elif action == 'full-start':
                        if actor != row['worker'] or row['phase'] != 'holding':
                            raise CustodyError('full start lacks original worker/custody')
                        row.update(phase='checking', full_started_at=time.time())
                        atomic(record_path, row)
                        send(connection, dict(ok=True, custody=public(row)))
                    elif action in ('borrow', 'borrowed'):
                        ready = row['phase'] == 'awaiting-adoption' or row['phase'] == 'failed' and message.get('repair') is True
                        if not ready or message.get('job') != row['job_sha256']:
                            raise CustodyError('custody not ready for strict adoption')
                        authorized(row, actor, message['marker'])
                        if action == 'borrow':
                            send(connection, dict(ok=True, custody=public(row)), (key.fileno(),))
                        else:
                            descriptor(message['fd'], row['k_identity'], caller)
                            row['borrowers'] = [b for b in row['borrowers'] if alive(b['actor'])]
                            row['borrowers'].append(dict(actor=actor, fd=message['fd']))
                            atomic(record_path, row)
                            send(connection, dict(ok=True))
                    elif action == 'release':
                        if row['phase'] not in ('awaiting-adoption', 'failed') or message.get('job') != row['job_sha256']:
                            raise CustodyError('original terminal outcome required before release')
                        from board_refresh_queue import releasing
                        if alive(row['worker']):
                            raise CustodyError('original worker still owns custody descriptors')
                        for borrower in row['borrowers']:
                            if not alive(borrower['actor']):
                                continue
                            try:
                                descriptor(borrower['fd'], row['k_identity'], borrower['actor']['pid'])
                            except (FileNotFoundError, CustodyError):
                                continue
                            raise CustodyError('strict borrower still owns K')
                        checksum = outcome(row, message['outcome'])
                        if other_holders(row):
                            raise CustodyError('actual K descendants/borrowers still hold the lock')
                        with releasing(root, row['epoch']) as drainage:
                            row['release_intent'] = dict(outcome_sha256=checksum, drainage=drainage, at=time.time())
                            atomic(record_path, row)
                            row.update(phase='failed-released' if row['phase'] == 'failed' else 'released', cleanup_pending=False,
                                       outcome_sha256=checksum, released_at=time.time(), drainage=drainage)
                            key.close()
                            atomic(record_path, row)
                        send(connection, dict(ok=True, custody=public(row)))
                        return 0
                    else:
                        raise CustodyError('unknown custody action')
                except (OSError, ValueError, KeyError) as error:
                    send(connection, dict(ok=False, reason=str(error)))
    except (OSError, ValueError) as error:
        fail(record_path, str(error))
        try:
            send(bootstrap, dict(ok=False, reason=str(error)))
        except OSError:
            pass
        return 1
    finally:
        bootstrap.close()
        server.close()
        key.close()
        if read_life is not None:
            os.close(read_life)
        if write_life is not None:
            os.close(write_life)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('keeper', 'status'))
    parser.add_argument('--record', type=Path)
    parser.add_argument('--root', type=Path)
    parser.add_argument('--channel', type=int)
    args = parser.parse_args()
    os.setpriority(os.PRIO_PROCESS, 0, 19)
    if args.action == 'keeper':
        return keeper(args.record, args.channel)
    print(json.dumps(observe(args.root)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
