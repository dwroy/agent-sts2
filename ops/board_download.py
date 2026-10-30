#!/usr/bin/env python3
"""Cooperative page-boundary yielding for the existing offline downloader."""
import json
import os
from pathlib import Path
import sys
import time
from datetime import datetime, timezone

from board_heavy import inherited, queued_argv
from board_queue_custody import atomic, digest, identity
from board_refresh_queue import enabled
from board_queue_pin import local
from board_queue_pin import sha


def higher_priority(root):
    from board_heavy import claims
    return [dict(id=r['id'], root=r['root'], state=r['state']) for r in claims(root)
            if r['role'] == 'integrator']


def admit(root, command):
    if not enabled(root):
        return
    if inherited(root):
        return
    argv = queued_argv(root, 'other', command)
    if argv != command:
        os.execvp(argv[0], argv)


def record_path(root, command, raw_root):
    ident = os.environ.get('STS2_DOWNLOAD_YIELD_ID') or digest([str(Path(raw_root).resolve()), list(map(str, command))])
    if len(ident) != 64 or any(c not in '0123456789abcdef' for c in ident):
        raise ValueError('invalid download continuation identity')
    return local(root, 'ops/codex-ops/download-yields') / (ident + '.json')


def continuation(row, command):
    if os.environ.get('STS2_DOWNLOAD_YIELD_ID'):
        if (row.get('command') != list(map(str, command))
                or row.get('resume_nonce') != os.environ.get('STS2_DOWNLOAD_RESUME_NONCE')):
            raise ValueError('download continuation command/intent changed')


def boundary(root, command, raw_root, checkpoint):
    if not enabled(root):
        return False
    try:
        pending = higher_priority(root)
        reason = 'integrator priority'
    except (OSError, ValueError, KeyError):
        pending, reason = [], 'priority observation unknown'
    if not pending and reason != 'priority observation unknown':
        return False
    # The downloader supplies only public counters/cursor and an opaque index SHA.
    # Raw replay identifiers and source rows never leave its private directory.
    path = record_path(root, command, raw_root)
    previous = json.loads(path.read_text()) if path.exists() else {}
    continuation(previous, command)
    remaining = checkpoint.get('remaining_pages')
    resume = list(map(str, command))
    if remaining is not None:
        if type(remaining) is not int or remaining <= 0:
            raise ValueError('priority yield cannot increase or restart a page budget')
        for index, arg in enumerate(resume):
            if arg == '--max-pages':
                resume[index + 1] = str(remaining)
            elif arg.startswith('--max-pages='):
                resume[index] = '--max-pages=' + str(remaining)
    unchanged = previous.get('checkpoint', {}).get('index_sha256') == checkpoint['index_sha256']
    since = previous.get('no_progress_since', time.time()) if unchanged else time.time()
    row = dict(schema='sts2-download-yield-v1', root=str(Path(root).resolve()), id=path.stem,
               command=resume, actor=identity(), checkpoint=checkpoint,
               reason=reason, pending=pending, state='yielded', yielded_at=time.time(),
               no_progress_since=since, starvation_alert=time.time() - since >= 86400)
    row['source_sha256'] = sha(local(root, command[1]).read_bytes())
    row['claims'] = [os.readlink('/proc/self/fd/' + str(fd)) for fd in inherited(root)]
    atomic(path, row)
    return True


def completed(root, command, raw_root, result):
    if not enabled(root):
        return
    path = record_path(root, command, raw_root)
    if path.exists():
        row = json.loads(path.read_text())
        continuation(row, command)
        row.update(state='completed' if result.get('complete') else 'budget-exhausted',
                   result=result, ended_at=time.time())
        atomic(path, row)


def starvation(root):
    alerts = []
    for path in local(root, 'ops/codex-ops/download-yields').glob('*.json'):
        row = json.loads(path.read_text())
        if row['state'] not in ('yielded', 'resuming', 'resume-intent') or time.time() - row['no_progress_since'] < 86400:
            continue
        key = 'download-starvation:' + row['id'] + ':' + str(row['no_progress_since'])
        alerts.append(key)
        inbox = local(root, 'ops/inbox-dev.md')
        if not inbox.exists() or key not in inbox.read_text():
            line = f"{datetime.now(timezone.utc).isoformat()} [dev #68] {key} 下载24h无页推进，请主管沿原队列排期；不扩槽。\n"
            inbox.parent.mkdir(parents=True, exist_ok=True)
            fd = os.open(inbox, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
            try:
                os.write(fd, line.encode())
                os.fsync(fd)
            finally:
                os.close(fd)
    return alerts
