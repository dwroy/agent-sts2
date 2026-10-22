#!/usr/bin/env python3
"""Verify assembly inputs without executing a game, builder, or test."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import stat
import subprocess
import sys

from issue_session_support import Board, atomic, locks, safe_path, secret_name, stamp


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def file_value(root, name):
    if secret_name(name): raise ValueError('secret input is not a release proof')
    path = safe_path(root, name)
    if not path.is_file(): raise ValueError('required assembly input missing')
    return dict(sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                mode='100755' if path.stat().st_mode & stat.S_IXUSR else '100644')


def inventory(worktree):
    subprocess.run(['git', 'diff', '--quiet'], cwd=worktree, check=True)
    untracked = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '-z'], cwd=worktree).decode().split('\0')
    if any(p.startswith(('agent/src/', 'agent/tests/', 'agent/tools/', 'ops/', 'learner/', 'knowledge/builders/'))
           and (p.endswith(('.ts', '.tsx', '.js', '.mjs', '.cjs', '.py', '.sh', '.json', '.yaml', '.yml'))
                or safe_path(worktree, p).stat().st_mode & 0o111)
           for p in filter(None, untracked)):
        raise ValueError('untracked runtime or test input outside the checked tree')
    rows = subprocess.check_output(['git', 'ls-files', '-s', '-z'], cwd=worktree).decode().split('\0')
    result = {}
    for row in filter(None, rows):
        info, name = row.split('\t', 1); mode, blob, stage = info.split()
        if stage != '0': raise ValueError('unmerged assembly index')
        result[name] = dict(mode=mode, blob=blob)
    return result


def data_only(name):
    # Conservative whitelist: no source, tests, startup policy or dependencies qualify.
    return (name.startswith('knowledge/') and not name.startswith('knowledge/builders/') and name.endswith('.json')
            or name in ('eval/versions.json', 'paper/materials/decision-log.md', 'notes/for-roy.md', 'ops/inbox-dev.md'))


def source_fingerprint(files):
    return digest({p: v for p, v in files.items() if not data_only(p)})


def knowledge(root):
    return {p.relative_to(root).as_posix(): file_value(root, p.relative_to(root))
            for p in sorted((root / 'knowledge').rglob('*.json')) if 'builders' not in p.relative_to(root).parts}


def snapshot(root, live, destination):
    board = Board(root)
    common = lambda path: subprocess.check_output(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], cwd=path)
    if common(root) != common(live): raise ValueError('foreign live snapshot')
    # This is an ops action at a natural boundary; no resource or model work inside these short locks.
    with locks([root / 'ops/knowledge-refresh.lock', root / 'ops/live-merge.lock']):
        value = dict(schema='release-knowledge-v1', root=str(root), repo=board.repo,
                     baseline=subprocess.check_output(['git', '-C', str(live), 'rev-parse', 'HEAD'], text=True).strip(),
                     created_at=stamp(), files=knowledge(live))
        path = safe_path(root, destination)
        if path.exists(): raise ValueError('snapshot must not overwrite an original')
        atomic(path, value)
    return value


def baseline_value(worktree, baseline, name):
    if not re.fullmatch('[0-9a-f]{40}', baseline) or secret_name(name): raise ValueError('invalid baseline proof')
    safe_path(worktree, name)
    row = subprocess.check_output(['git', 'ls-tree', baseline, '--', name], cwd=worktree, text=True).strip()
    if not row: return None
    info, actual = row.split('\t', 1); mode, kind, blob = info.split()
    if actual != name or kind != 'blob' or mode not in ('100644', '100755'): raise ValueError('invalid delivery preimage')
    raw = subprocess.check_output(['git', 'cat-file', 'blob', blob], cwd=worktree)
    return dict(sha256=hashlib.sha256(raw).hexdigest(), mode=mode)


def baseline_inventory(worktree, baseline):
    rows = subprocess.check_output(['git', 'ls-tree', '-r', '-z', baseline], cwd=worktree).decode().split('\0')
    result = {}
    for row in filter(None, rows):
        info, name = row.split('\t', 1); mode, kind, blob = info.split()
        result[name] = dict(mode=mode, blob=blob)
    return result


def script_dependencies(worktree, files):
    result = set()
    for name in files:
        if not name.startswith('agent/tests/') or not name.endswith(('.ts', '.mts', '.js')): continue
        text = safe_path(worktree, name).read_text()
        for path in re.findall(r'[\x22\x27]((?:\.\./)?(?:ops/tests|knowledge/builders|agent/tests)/[A-Za-z0-9_./-]+\.py)[\x22\x27]', text):
            result.add(path.removeprefix('../'))
        if '../ops/tests/' in text:
            result.update('ops/tests/' + p for p in re.findall(r'[\x22\x27](test_[a-zA-Z0-9_]+\.py)[\x22\x27]', text))
    return result


def validate(root, worktree, plan_path, *, live=None):
    board = Board(root); path = safe_path(root, plan_path); raw = path.read_bytes(); plan = json.loads(raw)
    if (plan.get('schema') != 'release-assembly-v1' or plan.get('root') != str(root)
            or plan.get('repo') != board.repo or not re.fullmatch('[0-9a-f]{40}', plan.get('baseline', ''))):
        raise ValueError('assembly plan identity mismatch')
    files = inventory(worktree)
    deliveries = plan.get('deliveries')
    if not isinstance(deliveries, dict) or not deliveries: raise ValueError('explicit delivery leaves required')
    preimages = {}
    for name, proof in deliveries.items():
        if name not in files or file_value(worktree, name) != proof['value']: raise ValueError('delivery source mismatch')
        preimages[name] = baseline_value(worktree, plan['baseline'], name)
        if preimages[name] != proof['preimage']: raise ValueError('delivery preimage mismatch')
    dependencies = plan.get('test_dependencies')
    if not isinstance(dependencies, dict) or not script_dependencies(worktree, files) <= dependencies.keys():
        raise ValueError('called test script absent from dependency inventory')
    for name, proof in dependencies.items():
        if name not in files or file_value(worktree, name) != proof: raise ValueError('test dependency missing or changed')
    prerequisites = plan.get('prerequisites')
    exclusions = plan.get('excluded_tests')
    if not isinstance(prerequisites, list) or not isinstance(exclusions, list): raise ValueError('prerequisite review required')
    for item in prerequisites:
        if type(item.get('issue')) is not int or not item.get('files'): raise ValueError('prerequisite leaf proof required')
        for name, proof in item['files'].items():
            if name not in files or file_value(worktree, name) != proof: raise ValueError('prerequisite issue missing from combination')
    for item in exclusions:
        if not item.get('reason') or not item.get('prerequisite_issue') or item.get('path') in files:
            raise ValueError('excluded test must be absent with prerequisite and original-rule reason')
    covered = set(deliveries) | set(dependencies) | {p for item in prerequisites for p in item['files']}
    covered.update(item['path'] for item in exclusions)
    base_files = baseline_inventory(worktree, plan['baseline'])
    if any(not data_only(p) and p not in covered and files.get(p) != base_files.get(p)
           for p in files.keys() | base_files.keys()):
        raise ValueError('runtime assembly differs from baseline outside declared delivery inputs')
    snapshot_path = safe_path(root, plan['knowledge_snapshot']); snapshot_raw = snapshot_path.read_bytes()
    frozen = json.loads(snapshot_raw)
    expected_knowledge = dict(frozen.get('files', {}))
    for name, proof in deliveries.items():
        if name.startswith('knowledge/') and data_only(name): expected_knowledge[name] = proof['value']
    if (frozen.get('schema') != 'release-knowledge-v1' or frozen.get('root') != str(root)
            or frozen.get('repo') != board.repo or frozen.get('baseline') != plan['baseline']
            or expected_knowledge != knowledge(worktree)):
        raise ValueError('candidate differs from ops frozen knowledge snapshot')
    if live is not None:
        head = subprocess.check_output(['git', '-C', str(live), 'rev-parse', 'HEAD'], text=True).strip()
        if head != plan['baseline'] or knowledge(live) != frozen['files']:
            raise ValueError('latest live baseline/knowledge changed; reassemble explicitly')
    review = plan.get('review', {})
    evidence = file_value(root, review['path'])
    if evidence != review['value'] or review.get('dependencies_complete') is not True:
        raise ValueError('assembly review evidence incomplete')
    margins = review.get('timeout_margins')
    if not isinstance(margins, list): raise ValueError('fixed-timeout load review required')
    timed = {name for name in files if name.startswith('agent/tests/') and name.endswith('.ts')
             and re.search(r'\btimeout\s*:\s*[0-9]', safe_path(worktree, name).read_text())}
    if not timed <= {row.get('test') for row in margins}:
        raise ValueError('literal fixed timeouts missing from load margin review')
    if not margins and not review.get('no_fixed_timeouts_reason'):
        raise ValueError('explicit reason required when no fixed timeouts exist')
    for row in margins:
        if (row.get('test') not in files or type(row.get('timeout_ms')) is not int
                or type(row.get('observed_max_ms')) is not int or not row.get('load_evidence')
                or not 0 <= row['observed_max_ms'] < row['timeout_ms']):
            raise ValueError('timeout margin insufficient; retain failure for issue41-style repair')
    return dict(passed=True, plan=dict(path=str(path.relative_to(root)), sha256=hashlib.sha256(raw).hexdigest()),
                baseline=plan['baseline'], delivery_preimages=preimages, deliveries=deliveries,
                runtime_source_sha256=source_fingerprint(files), inventory=files,
                test_dependencies=dependencies, prerequisites=prerequisites, excluded_tests=exclusions,
                knowledge=dict(path=str(snapshot_path.relative_to(root)), sha256=hashlib.sha256(snapshot_raw).hexdigest(),
                               files=expected_knowledge, baseline_files=frozen['files']), review=dict(path=review['path'], value=evidence,
                               timeout_margins=margins), input_unchanged=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True); parser.add_argument('--live', required=True)
    parser.add_argument('--snapshot', required=True)
    args = parser.parse_args()
    try:
        root = Path(args.root).resolve(); live = safe_path(root, Path(args.live).resolve())
        snapshot(root, live, args.snapshot); return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        print('snapshot retained; check original knowledge and baseline under ops locks', file=sys.stderr); return 1


if __name__ == '__main__': sys.exit(main())
