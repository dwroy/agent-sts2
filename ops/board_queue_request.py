#!/usr/bin/env python3
"""Write a fixed source delivery; submitting/revising/withdrawing stays in the kit."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess

from board_queue_pin import local


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args], text=True, stderr=subprocess.PIPE).strip()


def delivery(root, ident, issue, head, head_ref, priority, depends, report):
    valid_id = lambda value: isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,95}', value)
    if (not valid_id(ident) or type(issue) is not int or not 1 <= issue <= 999999999
            or type(priority) is not int or priority not in range(4)
            or not isinstance(depends, list) or any(not valid_id(item) for item in depends)
            or ident in depends or len(set(depends)) != len(depends)
            or not isinstance(report, str) or not report.strip()):
        raise ValueError('invalid fixed delivery metadata')
    if not re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', head):
        raise ValueError('full fixed SHA required; symbolic or abbreviated heads rejected')
    if not head_ref.startswith('refs/heads/'):
        raise ValueError('retained source branch required')
    git(root, 'check-ref-format', head_ref)
    if git(root, 'rev-parse', '--verify', head + '^{commit}') != head:
        raise ValueError('fixed commit unavailable')
    if git(root, 'rev-parse', '--verify', head_ref) != head:
        raise ValueError('source branch no longer points at the fixed delivery')
    base = git(root, 'merge-base', 'refs/heads/main', head)
    paths = git(root, 'diff', '--name-only', base, head, '--').splitlines()
    # Classify by executable capability, not by the learner task name. Unknown
    # extensions need owner classification instead of becoming code by default.
    code = [p for p in paths if p.endswith(('.py', '.sh', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.cs'))
            or p.startswith('.agents/') or p.endswith(('package.json', 'package-lock.json'))
            or '/tsconfig' in p or '/vitest.config' in p]
    if not code:
        raise ValueError('no executable source delta; use runtime for knowledge/operational data')
    return dict(id=ident, issue=issue, head=head, head_ref=head_ref, priority=priority,
                depends=depends, report=report)


def write(root, destination, value):
    path = local(root, destination)
    data = json.dumps(value, indent=2, ensure_ascii=False) + '\n'
    if path.exists():
        if path.read_text() == data:
            return dict(state='existing', id=value['id'])
        raise ValueError('existing delivery retained; use a new file and explicit kit revision')
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x') as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())
    return dict(state='prepared', id=value['id'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--id', required=True)
    parser.add_argument('--issue', type=int, required=True)
    parser.add_argument('--head', required=True)
    parser.add_argument('--head-ref', required=True)
    parser.add_argument('--priority', type=int, choices=range(4), required=True)
    parser.add_argument('--depends', action='append', default=[])
    parser.add_argument('--report', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    os.setpriority(os.PRIO_PROCESS, 0, 19)
    value = delivery(args.root, args.id, args.issue, args.head, args.head_ref,
                     args.priority, args.depends, args.report)
    print(json.dumps(write(args.root, args.output, value)))


if __name__ == '__main__':
    main()
