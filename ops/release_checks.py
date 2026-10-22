#!/usr/bin/env python3
"""Queued full checks and exact-tree reuse for integration/publication."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

from board_heavy import admission
from issue_session_support import Board, atomic, safe_path, stamp
import release_plan
from release_queue import Queue


def tree(worktree):
    subprocess.run(['git', 'diff', '--quiet'], cwd=worktree, check=True)
    return subprocess.check_output(['git', 'write-tree'], cwd=worktree, text=True).strip()


def generated_outputs(worktree, *receipts):
    paths = set()
    for name in filter(None, receipts):
        path = Path(name).resolve()
        if path.suffix != '.json': raise ValueError('JSON receipt required')
        for item in (path, *[path.with_suffix('.' + part + '.log') for part in ('tsc', 'vitest', 'consumers')]):
            if item.is_relative_to(worktree): paths.add(item.relative_to(worktree).as_posix())
    return sorted(paths)


def reusable(path, root, repo, expected, inputs=None):
    path = safe_path(root, path)
    if not path.exists():
        return None
    raw = path.read_bytes()
    value = json.loads(raw)
    if not isinstance(value, dict):
        return None
    if (value.get('schema') != 'board-full-checks-v1' or value.get('root') != str(root)
            or value.get('repo') != repo or value.get('tree') != expected
            or value.get('full_suite') is not True or value.get('input_unchanged') is not True
            or value.get('state') not in ('passed', 'reused')
            or value.get('role') not in ('ops', 'integrator')
            or not isinstance(value.get('results'), dict)
            or any(type(value.get('results', {}).get(k)) is not int for k in ('tsc','vitest'))
            or value.get('results') != {'tsc': 0, 'vitest': 0}):
        return None
    if (inputs is None or value.get('input_policy') != release_plan.INPUT_POLICY
            or value.get('input_files') != inputs): return None
    return dict(path=str(Path(path)), sha256=hashlib.sha256(raw).hexdigest(), tree=expected)


def legacy_check(root, worktree, receipt, role='ops', reuse=None, runner=subprocess.run):
    root, worktree = Path(root).resolve(), Path(worktree).resolve()
    board = Board(root)
    worktree = safe_path(root, worktree)
    receipt = safe_path(root, receipt)
    common = lambda p: Path(subprocess.check_output(['git','rev-parse','--path-format=absolute','--git-common-dir'], cwd=p, text=True).strip()).resolve()
    if common(root) != common(worktree):
        raise ValueError('check worktree belongs to another repository')
    if role not in ('ops', 'integrator') or receipt.exists():
        raise ValueError('new receipt and check role required')
    value = dict(schema='board-full-checks-v1', root=str(root), repo=board.repo,
        worktree=str(worktree), role=role, full_suite=True, state='queued', queued_at=stamp(), results={})
    receipt.parent.mkdir(parents=True, exist_ok=True)
    with receipt.open('x') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write('\n'); handle.flush(); os.fsync(handle.fileno())
    try:
        # Admission precedes the original publication lock: no lock inversion while waiting.
        with admission(root, role, 'exact-tree-full-checks'):
            with (root / 'ops/live-merge.lock').open('a') as lock:
                fcntl.flock(lock, fcntl.LOCK_EX)
                expected = tree(worktree); value['tree'] = expected
                outputs = generated_outputs(worktree, receipt, safe_path(root, reuse) if reuse else None)
                def current_inputs():
                    return dict(files=release_plan.inventory(worktree, proven_metadata=outputs), knowledge=release_plan.knowledge(worktree))
                inputs = current_inputs()
                value.update(input_policy=release_plan.INPUT_POLICY, input_files=inputs)
                proof = reusable(reuse, root, board.repo, expected, inputs) if reuse else None
                if proof:
                    value.update(state='reused', results=dict(tsc=0, vitest=0), input_unchanged=True, reused_from=proof)
                else:
                    value.update(state='running', started_at=stamp()); atomic(receipt, value)
                    env = {**os.environ, 'PATH': str(Path.home()/'.local/node/bin')+':'+os.environ.get('PATH','')}
                    commands = [('tsc', ['node','node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit']),
                        ('vitest', ['node','node_modules/vitest/vitest.mjs','run','--pool=forks','--maxWorkers=1','--no-file-parallelism'])]
                    for name, argv in commands:
                        with receipt.with_suffix('.'+name+'.log').open('wb') as log:
                            result = runner(['nice','-n','19', *argv], cwd=worktree/'agent', env=env,
                                stdout=log, stderr=subprocess.STDOUT)
                        value['results'][name] = result.returncode; atomic(receipt, value)
                        if result.returncode:
                            raise ValueError('full check failed; original output retained')
                    value['input_unchanged'] = tree(worktree) == expected and current_inputs() == inputs
                    if not value['input_unchanged']:
                        raise ValueError('checked tree changed')
                    value['state'] = 'passed'
                if current_inputs() != inputs: raise ValueError('checked inputs changed')
                value['ended_at'] = stamp(); atomic(receipt, value)
        return 0
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        value.update(state='failed-retain-original', error=type(error).__name__, ended_at=stamp())
        atomic(receipt, value)
        return 1


def full_proof(path, root, repo, depth=0):
    """Follow immutable full-result provenance; targeted results alone never qualify."""
    if depth > 8: return None
    path = safe_path(root, path); raw = path.read_bytes(); value = json.loads(raw)
    if (value.get('schema') != 'board-full-checks-v2' or value.get('root') != str(root)
            or value.get('repo') != repo or value.get('state') not in ('passed', 'reused')
            or value.get('full_suite') is not True or value.get('input_unchanged') is not True
            or value.get('checklist', {}).get('passed') is not True
            or value.get('checklist', {}).get('input_policy') != release_plan.INPUT_POLICY
            or value.get('role') not in ('ops', 'integrator') or not isinstance(value.get('results'), dict)
            or any(type(v) is not int for v in value['results'].values())):
        return None
    if value.get('mode') == 'full':
        if value.get('results') != {'tsc': 0, 'vitest': 0} or any(type(v) is not int for v in value['results'].values()):
            return None
        for name in ('tsc', 'vitest'):
            log = safe_path(root, value['logs'][name]['path'])
            if hashlib.sha256(log.read_bytes()).hexdigest() != value['logs'][name]['sha256']: return None
    else:
        if value.get('mode') not in ('exact-reuse', 'data-rebase-reuse'): return None
        origin = value['reused_from']; origin_path = safe_path(root, origin['path'])
        if hashlib.sha256(origin_path.read_bytes()).hexdigest() != origin['sha256']: return None
        if not full_proof(origin_path, root, repo, depth + 1): return None
        if value['mode'] == 'data-rebase-reuse' and value.get('results') != {'tsc': 0, 'consumers': 0}: return None
        for name in value.get('executed', []):
            log = safe_path(root, value['logs'][name]['path'])
            if hashlib.sha256(log.read_bytes()).hexdigest() != value['logs'][name]['sha256']: return None
    return value, dict(path=str(path.relative_to(root)), sha256=hashlib.sha256(raw).hexdigest(), tree=value['tree'])


def reuse_mode(previous, checklist, worktree):
    old = previous['checklist']; changed = {p for p in old['inventory'].keys() | checklist['inventory'].keys()
                                         if old['inventory'].get(p) != checklist['inventory'].get(p)}
    changed.update(p for p in old['knowledge']['files'].keys() | checklist['knowledge']['files'].keys()
                   if old['knowledge']['files'].get(p) != checklist['knowledge']['files'].get(p))
    if (old['runtime_source_sha256'] != checklist['runtime_source_sha256']
            or old['delivery_preimages'] != checklist['delivery_preimages'] or old['deliveries'] != checklist['deliveries']):
        return None, changed
    baseline_changes = subprocess.check_output(['git', 'diff', '--name-only', '-z', old['baseline'], checklist['baseline'], '--'],
                                               cwd=worktree).decode().split('\0')
    if any(not release_plan.data_only(p) for p in filter(None, baseline_changes)):
        return None, changed
    if not changed: return 'exact-reuse', changed
    return ('data-rebase-reuse' if all(release_plan.data_only(p) for p in changed) else None), changed


def check(root, worktree, receipt, role='ops', reuse=None, runner=subprocess.run, *, release_id=None, issues=None, plan=None):
    root, worktree = Path(root).resolve(), Path(worktree).resolve()
    queue = Queue(root)
    if not queue.enabled:
        return legacy_check(root, worktree, receipt, role, reuse, runner)
    if not release_id or not plan: raise ValueError('release identity and assembly plan required')
    receipt = safe_path(root, receipt); worktree = safe_path(root, worktree)
    if role not in ('ops', 'integrator') or receipt.exists(): raise ValueError('new receipt and check role required')
    common = lambda p: subprocess.check_output(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], cwd=p)
    if common(root) != common(worktree): raise ValueError('foreign check worktree')
    if not queue.request(release_id, issues or []):
        atomic(receipt, dict(schema='board-full-checks-v2', state='queued-release', release_id=release_id,
                             root=str(root), repo=queue.board.repo, blocked_by=queue.status()['active']))
        return 75
    value = dict(schema='board-full-checks-v2', root=str(root), repo=queue.board.repo, worktree=str(worktree),
                 release_id=release_id, role=role, state='preflight', results={}, full_suite=False, executed=[], queued_at=stamp())
    atomic(receipt, value)
    with queue.execution(release_id):
        queue.transition(release_id, {'reserved', 'frozen'}, 'checking', receipt=str(receipt.relative_to(root)))
        try:
            live = root / '.worktrees/live'
            def preflight():
                # Knowledge and live locks cover snapshots only, never queue waits or full tests.
                with release_plan.locks([root / 'ops/knowledge-refresh.lock', root / 'ops/live-merge.lock']):
                    return release_plan.validate(root, worktree, plan, live=live,
                        generated_outputs=generated_outputs(worktree, receipt, safe_path(root, reuse) if reuse else None))
            checklist = preflight(); expected = tree(worktree)
            value.update(checklist=checklist, tree=expected, state='queued-resources')
            original = full_proof(reuse, root, queue.board.repo) if reuse else None
            mode, changed = reuse_mode(original[0], checklist, worktree) if original else (None, set())
            mode = mode or 'full'; value['mode'] = mode
            env = {**os.environ, 'PATH': str(Path.home()/'.local/node/bin')+':'+os.environ.get('PATH','')}
            commands = [] if mode == 'exact-reuse' else [('tsc', ['node', 'node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--noEmit'])]
            if mode == 'full':
                commands += [('vitest', ['node', 'node_modules/vitest/vitest.mjs', 'run', '--pool=forks', '--maxWorkers=1', '--no-file-parallelism'])]
            elif mode == 'data-rebase-reuse':
                plan_data = json.loads(safe_path(root, plan).read_text())
                coverage = plan_data.get('data_consumers', {})
                data_changes = [p for p in changed if p.startswith('knowledge/')]
                if not data_changes or any(not coverage.get(p) for p in data_changes):
                    raise ValueError('explicit consumers for every changed knowledge file required')
                consumers = sorted({p for name in data_changes for p in coverage[name]})
                if any(not p.startswith('agent/tests/') or not p.endswith('.test.ts') or p not in checklist['inventory'] for p in consumers):
                    raise ValueError('fixed consumer tests must be in the candidate tree')
                value['data_changes'] = sorted(changed); value['consumer_tests'] = consumers
                commands += [('consumers', ['node', 'node_modules/vitest/vitest.mjs', 'run',
                                           *[p.removeprefix('agent/') for p in consumers],
                                           '--pool=forks', '--maxWorkers=1', '--no-file-parallelism'])]
            if original and mode != 'full': value['reused_from'] = original[1]
            atomic(receipt, value)
            with admission(root, role, 'release-' + release_id):
                if preflight() != checklist or tree(worktree) != expected: raise ValueError('assembly changed while queued')
                value.update(state='running', started_at=stamp()); atomic(receipt, value)
                value['logs'] = {}
                for name, argv in commands:
                    log_path = receipt.with_suffix('.' + name + '.log')
                    with log_path.open('wb') as log:
                        result = runner(['nice', '-n', '19', *argv], cwd=worktree / 'agent', env=env, stdout=log, stderr=subprocess.STDOUT)
                    value['executed'].append(name); value['results'][name] = result.returncode
                    value['logs'][name] = dict(path=str(log_path.relative_to(root)), sha256=hashlib.sha256(log_path.read_bytes()).hexdigest())
                    atomic(receipt, value)
                    if result.returncode: raise ValueError('check failed; no retry-to-green')
                after = preflight()
                if after != checklist or tree(worktree) != expected: raise ValueError('inputs changed during checks')
                value.update(state='passed' if mode == 'full' else 'reused', full_suite=True, input_unchanged=True, ended_at=stamp())
                value['checklist']['input_unchanged'] = True; atomic(receipt, value)
            queue.transition(release_id, {'checking'}, 'frozen', receipt=str(receipt.relative_to(root)))
            return 0
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
            value.update(state='failed-retain-original', error=type(error).__name__, ended_at=stamp()); atomic(receipt, value)
            queue.transition(release_id, {'checking'}, 'failed-retained', receipt=str(receipt.relative_to(root)))
            return 1


def publication_proof(root, receipt):
    proof = full_proof(receipt, root, Board(root).repo)
    if proof: return proof[0]
    value = json.loads(safe_path(root, receipt).read_text())
    if (value.get('schema') == 'board-data-publication-v1' and value.get('root') == str(root)
            and value.get('repo') == Board(root).repo and value.get('input_unchanged') is True
            and value.get('checklist', {}).get('passed') is True
            and value.get('checklist', {}).get('input_policy') == release_plan.INPUT_POLICY):
        if release_plan.file_value(root, value['evidence']['path']) == value['evidence']['value']:
            return value
    return None


def publication_ready(root, worktree, receipt, identity):
    proof = publication_proof(root, receipt)
    if not proof or proof.get('release_id') != identity or tree(worktree) != proof['tree']:
        raise ValueError('publication lacks passing exact candidate checks')
    original = proof['checklist']; plan = safe_path(root, original['plan']['path'])
    with release_plan.locks([root / 'ops/knowledge-refresh.lock', root / 'ops/live-merge.lock']):
        current = release_plan.validate(root, worktree, plan, live=root / '.worktrees/live',
                                        generated_outputs=original.get('generated_outputs', ()))
    current['input_unchanged'] = True
    if current != original: raise ValueError('publication inputs changed since check')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True); parser.add_argument('--worktree', required=True)
    parser.add_argument('--receipt', required=True); parser.add_argument('--reuse')
    parser.add_argument('--role', choices=['ops','integrator'], default='ops')
    parser.add_argument('--release-id'); parser.add_argument('--issue', type=int, action='append')
    parser.add_argument('--plan')
    args = parser.parse_args()
    try:
        return check(args.root,args.worktree,args.receipt,args.role,args.reuse,
                     release_id=args.release_id, issues=args.issue, plan=args.plan)
    except (OSError, ValueError, KeyError, subprocess.SubprocessError):
        print('release checks retained; inspect original receipt, queue and tree', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
