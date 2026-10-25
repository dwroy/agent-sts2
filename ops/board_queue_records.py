#!/usr/bin/env python3
"""Serialize post-deployment main records under the SAME queue writer authority.

This is a bounded metadata transaction, not a second source merge queue or a
knowledge publisher. It reuses the pinned primary synchronization/recovery code.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys

from board_heavy import unlocked
from board_queue_pin import local, sha, verify
from issue_session_support import Board
from publication_gate import source_locks

ALLOWED = {'eval/versions.json', 'paper/materials/decision-log.md', 'notes/for-roy.md', 'ops/inbox-dev.md'}


def validate(root, value):
    if (value.get('schema') != 'sts2-main-record-request-v1'
            or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,95}', value.get('id', ''))
            or not isinstance(value.get('epoch'), str) or not value['epoch']):
        raise ValueError('bound metadata request required')
    for name in ('expected_main', 'head'):
        if not re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', value.get(name, '')):
            raise ValueError('fixed metadata commits required')
    ref = value.get('head_ref', '')
    if not ref.startswith('refs/heads/'):
        raise ValueError('retained metadata source branch required')
    run = lambda *args: subprocess.check_output(['git', '-C', str(root), *args], stderr=subprocess.PIPE)
    run('check-ref-format', ref)
    if run('rev-parse', ref).decode().strip() != value['head']:
        raise ValueError('metadata source branch moved')
    parents = run('rev-list', '--parents', '-n', '1', value['head']).decode().split()
    if parents != [value['head'], value['expected_main']]:
        raise ValueError('metadata must be one fixed commit based on expected main')
    paths = run('diff', '--name-only', '-z', value['expected_main'], value['head']).decode().split('\0')
    paths = [name for name in paths if name]
    if not paths or any(name not in ALLOWED for name in paths):
        raise ValueError('source/knowledge/unclassified data cannot use the metadata transaction')
    receipt = value.get('deployment')
    if (not isinstance(receipt, dict) or not re.fullmatch(r'[0-9a-f]{40}', receipt.get('live_commit', ''))
            or not re.fullmatch(r'V[0-9]+-R[0-9]+', receipt.get('release_id', ''))
            or not re.fullmatch(r'[0-9a-f]{64}', receipt.get('sha256', ''))):
        raise ValueError('actual deployment receipt binding required')
    document = local(root, receipt['path'])
    if sha(document.read_bytes()) != receipt['sha256']:
        raise ValueError('original deployment receipt changed')
    subprocess.run(['git', '-C', str(local(root, '.worktrees/live')), 'merge-base', '--is-ancestor',
                    receipt['live_commit'], 'HEAD'], check=True, capture_output=True)
    for name in paths:
        before = subprocess.run(['git', '-C', str(root), 'show', value['expected_main'] + ':' + name], capture_output=True)
        after = run('show', value['head'] + ':' + name)
        if name == 'eval/versions.json':
            old, new = json.loads(before.stdout), json.loads(after)
            if (not isinstance(old.get('versions'), list) or not isinstance(new.get('versions'), list)
                    or new['versions'][:len(old['versions'])] != old['versions']
                    or {k: v for k, v in old.items() if k != 'versions'} != {k: v for k, v in new.items() if k != 'versions'}):
                raise ValueError('version history must be preserved exactly')
            for row in new['versions'][len(old['versions']):]:
                if row.get('release_id') != receipt['release_id'] or row.get('commit') != receipt['live_commit']:
                    raise ValueError('version append must match the actual deployment receipt')
        elif before.returncode == 0 and not after.startswith(before.stdout):
            raise ValueError('parallel notes and decision history must be preserved; append only')
    patch = run('diff', '--binary', value['expected_main'], value['head'], '--', *paths)
    if len(patch) > 1 << 20:
        raise ValueError('metadata delta exceeds bounded record transaction')
    scan = subprocess.run(['gitleaks', 'stdin', '--redact', '--no-banner'], input=patch, capture_output=True)
    if scan.returncode:
        raise ValueError('metadata secret scan did not pass; no main mutation')
    return dict(paths=paths, patch_sha256=sha(patch), deployment=receipt)


def record(root, value):
    root = Path(root).resolve()
    board = Board(root)
    verify(root, board.data['dispatcher']['install'])
    unlocked(root)
    sys.path.insert(0, str(local(root, board.data['dispatcher']['install'])))
    from merge_queue import Queue, atomic, digest, guard
    import queue_workspace
    facts = validate(root, value)  # Scan and receipt reads happen outside business locks.
    initial = Queue(root)
    with source_locks(root):
        common = Path(subprocess.check_output(['git', '-C', str(root), 'rev-parse', '--path-format=absolute',
                                               '--git-common-dir'], text=True).strip())
        with guard(common / 'mas-merge-writer.lock'), guard(initial.at('queue.lock')):
            queue = Queue(root)
            if queue.directory != initial.directory:
                raise ValueError('queue state binding changed before metadata transaction')
            authority = queue.authority()
            if queue.mode != 'active' or queue.data['active'] is not None:
                raise ValueError('active exclusive authority and drained source batch required')
            owner = json.loads((common / 'mas-merge-authority.json').read_text())
            if owner['epoch'] != value['epoch']:
                raise ValueError('stale metadata authority epoch')
            if queue_workspace.git(root, 'rev-parse', value['head_ref']) != value['head']:
                raise ValueError('metadata source ref changed before synchronization')
            directory = queue.at('records', value['id'])
            request_path = directory / 'request.json'
            if request_path.exists():
                if json.loads(request_path.read_text()) != value:
                    raise ValueError('record ID reused with different content; original retained')
            else:
                if queue.main() != value['expected_main']:
                    raise ValueError('metadata expected main advanced')
                directory.mkdir(parents=True)
                atomic(request_path, value)
            job_path = directory / 'sync-job.json'
            if job_path.exists():
                job = json.loads(job_path.read_text())
                if (job['authority'] != authority or job['record_request'] != digest(value)
                        or job['config_sha256'] != digest(queue.options)):
                    raise ValueError('record authority/policy binding changed; inspect original intent')
            else:
                job = dict(schema='sts2-main-record-sync-v1', **queue.binding, batch='record-' + value['id'],
                           baseline=value['expected_main'], candidate=value['head'], workspace=queue.workspace(),
                           policy_sha256=queue.policy(), authority=authority, record_request=digest(value),
                           config_sha256=digest(queue.options))
                atomic(job_path, job)
            for name, checksum in job['policy_sha256'].items():
                if sha(local(root, name).read_bytes()) != checksum:
                    raise ValueError('metadata sync policy changed; original transaction retained')
            # The receipt is immutable across the unlocked/locked boundary.
            if sha(local(root, facts['deployment']['path']).read_bytes()) != facts['deployment']['sha256']:
                raise ValueError('deployment receipt changed before synchronization')
            queue_workspace.sync(job, directory)
            result = dict(schema='sts2-main-record-result-v1', request=digest(value), authority=authority,
                          main=value['head'], deployment=facts['deployment'], checks=facts,
                          code_full_runs=0, source_or_knowledge_publication=False)
            atomic(directory / 'record-result.json', result)
            return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--request', required=True)
    args = parser.parse_args()
    os.setpriority(os.PRIO_PROCESS, 0, 19)
    value = json.loads(local(args.root.resolve(), args.request).read_text())
    print(json.dumps(record(args.root, value)))


if __name__ == '__main__':
    main()
