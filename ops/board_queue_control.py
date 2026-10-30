#!/usr/bin/env python3
"""Project lifecycle decisions for the original queue tick; never a second tick."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid

import board_queue_custody as custody
import board_refresh_queue as refresh
from board_queue_pin import local, sha

SCHEMA = 'sts2-queue-control-v1'


def busy(path):
    import fcntl
    with Path(path).open('a') as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return False
        except BlockingIOError:
            return True


def failed_cleanup(root, path, row):
    from publication_gate import present, directory, MARKER
    if present(directory(root) / MARKER):
        raise ValueError('original publication unfinished; preserve its owner/method recovery before K release')
    if row.get('k_identity'):
        custody.canonical(row)
    if custody.alive(row['worker']) or busy(path.parent / 'worker.lock'):
        return False
    if row.get('k_identity') and custody.other_holders(row):
        return False
    for child in (path.parent / 'check-children').glob('*.json'):
        value = json.loads(child.read_text())
        if not value.get('finished'):
            try:
                actor = custody.identity(value['pid'])
                if value.get('start') is None or actor['start'] == value['start']:
                    return False
            except (FileNotFoundError, ProcessLookupError):
                pass
    outcome = path.parent / 'custody-outcome.json'
    previous = json.loads(outcome.read_text()) if outcome.exists() else None
    if previous is not None and not isinstance(previous, dict):
        raise custody.CustodyError('unknown original outcome retained')
    if previous is None or previous.get('kind') == 'adopted':
        result = path.parent / 'result.json'
        custody.save_outcome(outcome, dict(schema='sts2-custody-outcome-v1', epoch=row['epoch'],
            job=row['job_sha256'], candidate=row['candidate'], kind='failed', failure=row['failure'],
            original_result_sha256=sha(result.read_bytes()) if result.exists() else None))
    if row.get('keeper') and custody.alive(row['keeper']):
        custody.request(path, 'release', job=row['job_sha256'], outcome=str(outcome))
    else:
        import fcntl
        # Probe before the final R section. A surviving inherited OFD keeps the
        # old failure pending; never force-unlock or adopt somebody else's K.
        with local(root, 'ops/knowledge-refresh.lock').open('a') as key:
            fcntl.flock(key, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with refresh.releasing(root, row['epoch']) as drainage:
                key.close()
                row.update(phase='failed-released', cleanup_pending=False, released_at=time.time(),
                           outcome_sha256=custody.outcome(row, outcome), drainage=drainage)
                custody.atomic(path, row)
    return True


def replay_debts(root):
    """One ordered replacement at a time, with original aliases retained."""
    base = refresh.directory(root)
    if (base / 'hold.json').exists():
        return None
    paths = sorted((base / 'debts').glob('*.json'))
    debts = [(path, json.loads(path.read_text())) for path in paths]
    for path, debt in debts:
        if debt['state'] != 'replaying':
            continue
        request = base / 'requests' / (debt['replacement'] + '.json')
        if not request.exists():
            return dict(state='replacement-intent-unresolved', debt=debt['id'])
        row = json.loads(request.read_text())
        if not refresh.retired(row):
            return dict(state='replacement-running', request=row['id'])
        if row.get('exit_code') != 0:
            return dict(state='replacement-failed-or-unknown', request=row['id'])
        for alias_path, alias in debts:
            if alias.get('replacement') == row['id'] and alias['state'] == 'replaying':
                alias.update(state='paid', completed_at=time.time(), receipt_sha256=custody.digest(row))
                custody.atomic(alias_path, alias)
    pending = [(path, debt) for path, debt in debts if debt['state'] == 'pending' and debt.get('kind') in ('all', 'cost', 'funnel')]
    pending.sort(key=lambda item: (('all', 'cost', 'funnel').index(item[1]['kind']), item[1]['created_at']))
    if not pending:
        return None
    _, first = pending[0]
    ordinary = first['original']['ordinary']
    command = first['original']['command']
    current = refresh.classify(root, command)
    keys = ('kind', 'character', 'source')
    if not current or any(current[k] != ordinary[k] for k in keys):
        return dict(state='replacement-source-unknown', debt=first['id'])
    selected = [(path, debt) for path, debt in pending
                if all(debt['original']['ordinary'][k] == ordinary[k] for k in keys)]
    ident = uuid.uuid4().hex
    environment = {key: value for key, value in os.environ.items()
                   if not key.startswith(('STS2_REFRESH_', 'STS2_FIXED_', 'MAS_QUEUE_'))
                   and key != 'STS2_BOARD_CHECK_CONTEXT'}
    environment['STS2_REFRESH_REPLAY_ID'] = ident
    if ordinary['kind'] == 'all':
        command = [arg for arg in command if arg != '--queue-entered']
    else:
        command = refresh.queued_argv(root, command)
    for path, debt in selected:
        debt.update(state='replaying', replacement=ident, replay_intent_at=time.time())
        custody.atomic(path, debt)
    # An ambiguous spawn intent is retained above; no automatic duplicate launch.
    with (base / 'compensation.log').open('ab') as output:
        process = subprocess.Popen(command, env=environment, stdin=subprocess.DEVNULL,
                                   stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
    return dict(state='replacement-launched', request=ident, pid=process.pid)


def resume_download(root):
    from board_download import higher_priority
    if higher_priority(root):
        return None
    for path in sorted(local(root, 'ops/codex-ops/download-yields').glob('*.json')):
        row = json.loads(path.read_text())
        if row.get('state') != 'yielded' or not refresh.retired(row):
            continue
        source = local(root, row['command'][1])
        if sha(source.read_bytes()) != row['source_sha256']:
            return dict(state='download-source-changed', id=row['id'])
        row.update(state='resume-intent', resume_intent_at=time.time())
        row['resume_nonce'] = uuid.uuid4().hex
        custody.atomic(path, row)
        environment = dict(os.environ, STS2_DOWNLOAD_YIELD_ID=row['id'], STS2_DOWNLOAD_RESUME_NONCE=row['resume_nonce'])
        with (path.parent / 'resume.log').open('ab') as output:
            process = subprocess.Popen(row['command'], env=environment, stdin=subprocess.DEVNULL, stdout=output,
                                       stderr=subprocess.STDOUT, start_new_session=True)
        fresh = json.loads(path.read_text())
        if fresh.get('state') == 'resume-intent' and fresh.get('resume_nonce') == row['resume_nonce']:
            fresh.update(state='resuming', resumer=custody.identity(process.pid))
            custody.atomic(path, fresh)
        return dict(state='download-resumed', id=row['id'])
    return None


def evaluate(root, event):
    root = Path(root).resolve()
    result = dict(schema=SCHEMA, event=event, root=str(root), decision='allow')
    if not refresh.enabled(root):
        return dict(result, enabled=False)
    if event == 'tick':
        from board_download import starvation
        result['recovered_admissions'] = refresh.recover_requests(root)
        result['alerts'] = starvation(root)
    current = custody.observe(root)
    if current:
        result['custody'] = current
        if current['phase'] in custody.TERMINAL and event != 'before-seal':
            result['decision'] = 'failed-custody' if current['phase'] == 'failed-released' else 'settled'
            if current['phase'] == 'failed-released':
                result['cleanup_complete'] = True
    if current is None and (refresh.directory(root) / 'hold.json').exists():
        return dict(result, decision='defer', reason='unbound refresh hold retained')
    if current and current['phase'] not in custody.TERMINAL:
        path, private = custody.active(root)
        result.update(custody=current, decision='defer')
        if current['phase'] == 'failed':
            result['decision'] = 'failed-custody'
            try:
                result['cleanup_complete'] = failed_cleanup(root, path, private)
                if result['cleanup_complete']:
                    result['custody'] = custody.public(custody.load(path))
            except (OSError, ValueError) as error:
                result.update(cleanup_complete=False, cleanup_reason=str(error))
        elif current['phase'] == 'awaiting-adoption':
            receipt = path.parent / 'custody-outcome.json'
            if receipt.exists():
                try:
                    reply, _ = custody.request(path, 'release', job=private['job_sha256'], outcome=str(receipt))
                    result.update(decision='settled', custody=reply['custody'])
                except (OSError, ValueError) as error:
                    result['reason'] = str(error)
            else:
                result['decision'] = 'protected'
                if event == 'tick':
                    result['maintenance'] = resume_download(root)
        return result
    if event == 'tick':
        from board_download import higher_priority
        if higher_priority(root):
            return dict(result, maintenance='higher-priority merge pending')
        result['maintenance'] = replay_debts(root) or resume_download(root)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('event', choices=('before-seal', 'post-result', 'tick'))
    args = parser.parse_args()
    os.setpriority(os.PRIO_PROCESS, 0, 19)
    try:
        with custody.guard(args.root):
            result = evaluate(args.root, args.event)
    except (OSError, ValueError, KeyError) as error:
        result = dict(schema=SCHEMA, decision='defer', reason=str(error))
    print(json.dumps(result, sort_keys=True))


if __name__ == '__main__':
    main()
