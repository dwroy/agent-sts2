#!/usr/bin/env python3
"""Persistent project publication order; reservations survive checks and process exit."""
import argparse
from contextlib import contextmanager
import json
from pathlib import Path
import re
import subprocess
import sys

from issue_session_support import Board, atomic, locks, safe_path, stamp

ACTIVE = {'reserved', 'checking', 'frozen', 'publishing', 'awaiting-completion', 'failed-retained'}
TERMINAL = {'completed', 'abandoned'}


class Queue:
    def __init__(self, root):
        self.board = Board(Path(root).resolve())
        self.root = self.board.root
        self.config = self.board.data['dispatcher'].get('release', {})
        if not isinstance(self.config, dict) or type(self.config.get('enabled', False)) is not bool:
            raise ValueError('invalid release queue configuration')
        self.enabled = self.config.get('enabled', False)
        self.path = safe_path(self.root, self.config.get('state', 'ops/codex-ops/release-queue.json'))

    def read(self):
        data = (json.loads(self.path.read_text()) if self.path.exists() else
                dict(schema='project-release-queue-v1', root=str(self.root), repo=self.board.repo, entries=[]))
        if (data.get('schema') != 'project-release-queue-v1' or data.get('root') != str(self.root)
                or data.get('repo') != self.board.repo or not isinstance(data.get('entries'), list)):
            raise ValueError('invalid release queue; retain original')
        ids = set()
        for row in data['entries']:
            if (not isinstance(row, dict) or not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}', row.get('id', ''))
                    or row['id'] in ids or row.get('state') not in ACTIVE | TERMINAL | {'queued'}
                    or not isinstance(row.get('issues'), list)
                    or not isinstance(row.get('history'), list)
                    or not all(type(n) is int and 1 <= n <= 999999999 for n in row['issues'])):
                raise ValueError('invalid release reservation')
            ids.add(row['id'])
        if sum(r['state'] in ACTIVE for r in data['entries']) > 1:
            raise ValueError('multiple active releases; retain original')
        return data

    def status(self):
        data = self.read()
        return dict(schema=data['schema'], root=str(self.root), repo=self.board.repo, enabled=self.enabled,
                    active=next((r for r in data['entries'] if r['state'] in ACTIVE), None),
                    queued=[r for r in data['entries'] if r['state'] == 'queued'])

    def request(self, identity, issues):
        if (not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}', identity)
                or not issues or not all(type(n) is int and 1 <= n <= 999999999 for n in issues)):
            raise ValueError('release id and explicit issue list required')
        with locks([self.path.with_suffix('.lock')]):
            data = self.read()
            row = next((r for r in data['entries'] if r['id'] == identity), None)
            if row is None:
                row = dict(id=identity, issues=sorted(set(issues)), state='queued', requested_at=stamp(), history=[])
                data['entries'].append(row)
            if row['issues'] != sorted(set(issues)) or row['state'] in TERMINAL:
                raise ValueError('release identity cannot be rebound or replayed')
            active = next((r for r in data['entries'] if r['state'] in ACTIVE), None)
            first = next((r for r in data['entries'] if r['state'] == 'queued'), None)
            if active is None and first is row:
                row['state'] = 'reserved'
            atomic(self.path, data)
            return row['state'] != 'queued'

    def transition(self, identity, expected, state, **proof):
        with locks([self.path.with_suffix('.lock')]):
            data = self.read()
            row = next((r for r in data['entries'] if r['id'] == identity), None)
            if row is None or row['state'] not in expected:
                raise ValueError('release state mismatch; explicit reconciliation required')
            row['history'].append(dict(state=row['state'], at=stamp(), **proof))
            row.update(state=state, **proof)
            atomic(self.path, data)

    @contextmanager
    def execution(self, identity):
        # A separate execution lease prevents concurrent invocations for the same reservation.
        with locks([self.path.with_suffix('.execution.lock')]):
            active = self.status()['active']
            if active is None or active['id'] != identity:
                raise ValueError('another release is active or this release is queued')
            yield


def publish(queue, identity, receipt, worktree, command, runner=subprocess.run, *, data_plan=None, evidence=None):
    """Guard the original finite publication command, including data-only publications."""
    from release_checks import publication_ready
    worktree = safe_path(queue.root, Path(worktree).resolve())
    common = lambda path: subprocess.check_output(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], cwd=path)
    if common(worktree) != common(queue.root): raise ValueError('foreign publication worktree')
    with queue.execution(identity):
        if data_plan is not None:
            from release_plan import validate, baseline_inventory, data_only, file_value
            from release_checks import tree, generated_outputs
            receipt = safe_path(queue.root, receipt)
            if receipt.exists(): raise ValueError('new data publication receipt required')
            with locks([queue.root / 'ops/knowledge-refresh.lock', queue.root / 'ops/live-merge.lock']):
                checklist = validate(queue.root, worktree, data_plan, live=queue.root / '.worktrees/live',
                                      generated_outputs=generated_outputs(worktree, receipt))
            baseline = baseline_inventory(worktree, checklist['baseline'])
            files = checklist['inventory']
            if any(not data_only(p) and baseline.get(p) != files.get(p) for p in baseline.keys() | files.keys()):
                raise ValueError('data-only publication changes runtime/validation inputs')
            checklist['input_unchanged'] = True
            atomic(receipt, dict(schema='board-data-publication-v1', root=str(queue.root), repo=queue.board.repo,
                release_id=identity, tree=tree(worktree), checklist=checklist, input_unchanged=True,
                evidence=dict(path=str(safe_path(queue.root, evidence).relative_to(queue.root)), value=file_value(queue.root, evidence))))
        publication_ready(queue.root, Path(worktree).resolve(), receipt, identity)
        queue.transition(identity, {'reserved'} if data_plan is not None else {'frozen'}, 'publishing',
                         checks=str(safe_path(queue.root, receipt)))
        try:
            result = runner(command, cwd=queue.root)
            queue.transition(identity, {'publishing'}, 'awaiting-completion' if result.returncode == 0 else 'failed-retained',
                             command_exit=result.returncode)
            return result.returncode
        except BaseException:
            queue.transition(identity, {'publishing'}, 'failed-retained', reason='publication command interrupted')
            raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True)
    sub = parser.add_subparsers(dest='action', required=True)
    sub.add_parser('status')
    request = sub.add_parser('request'); request.add_argument('--id', required=True)
    request.add_argument('--issue', type=int, action='append', required=True)
    for name in ('abandon', 'retry', 'complete'):
        item = sub.add_parser(name); item.add_argument('--id', required=True); item.add_argument('--evidence', required=True)
        if name == 'complete': item.add_argument('--source', required=True)
    run = sub.add_parser('publish'); run.add_argument('--id', required=True)
    run.add_argument('--checks', required=True); run.add_argument('--worktree', required=True)
    run.add_argument('--data-plan'); run.add_argument('--evidence')
    run.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    try:
        queue = Queue(args.root)
        if args.action == 'request':
            granted = queue.request(args.id, args.issue)
            print(json.dumps(queue.status())); return 0 if granted else 75
        if args.action == 'status':
            print(json.dumps(queue.status())); return 0
        if args.action == 'publish':
            command = args.command[1:] if args.command[:1] == ['--'] else args.command
            if not command: raise ValueError('publication command required')
            return publish(queue, args.id, args.checks, Path(args.worktree).resolve(), command,
                           data_plan=args.data_plan, evidence=args.evidence)
        evidence = safe_path(queue.root, args.evidence)
        if not evidence.is_file(): raise ValueError('existing local reconciliation evidence required')
        with queue.execution(args.id):
            if args.action == 'complete':
                if not re.fullmatch('[0-9a-f]{40}', args.source): raise ValueError('exact live source required')
                live = queue.root / '.worktrees/live'
                source = subprocess.check_output(['git', '-C', str(live), 'rev-parse', 'HEAD'], text=True).strip()
                if source != args.source: raise ValueError('actual live source mismatch')
                from release_checks import publication_proof
                from release_plan import inventory, source_fingerprint, knowledge
                active = queue.status()['active']
                proof = publication_proof(queue.root, active.get('checks', ''))
                if (not proof or proof.get('release_id') != args.id
                        or source_fingerprint(inventory(live)) != proof['checklist']['runtime_source_sha256']
                        or knowledge(live) != proof['checklist']['knowledge']['files']):
                    raise ValueError('actual publication differs from checked runtime or frozen knowledge')
                queue.transition(args.id, {'awaiting-completion'}, 'completed', source=source, evidence=str(evidence))
            else:
                queue.transition(args.id, ACTIVE, 'abandoned' if args.action == 'abandon' else 'reserved',
                                 evidence=str(evidence))
        print(json.dumps(queue.status())); return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        print('release retained; inspect queue, original checks and publication evidence', file=sys.stderr)
        return 1


if __name__ == '__main__': sys.exit(main())
